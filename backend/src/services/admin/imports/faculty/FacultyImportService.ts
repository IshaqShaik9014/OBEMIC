import { FacultyWorkbookReader } from './FacultyWorkbookReader';
import { FacultyImportValidator, FacultyImportPayload } from './FacultyImportValidator';
import prisma from '../../../../database';
import { ImportStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ImportLifecycleService } from '../ImportLifecycleService';

export class BatchNotFoundError extends Error {}
export class BatchAlreadyConfirmedError extends Error {}
export class BatchExpiredError extends Error {}
export class BatchInvalidStateError extends Error {}
export class StaleDataError extends Error {}

export interface ConfirmOptions {
  injectFailure?: boolean; // For transaction rollback tests
  validEmployeeIds?: string[];
  excludedEmployeeIds?: string[];
}

export class FacultyImportService {
  private reader = new FacultyWorkbookReader();
  private validator = new FacultyImportValidator();
  private lifecycle = new ImportLifecycleService();

  public async preview(filePath: string, adminUserId: string) {
    const rawRecords = await this.reader.parse(filePath);
    const payload = await this.validator.validate(rawRecords);

    // 30 minutes expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const batch = await prisma.importBatch.create({
      data: {
        importType: 'FACULTY_IMPORT',
        status: ImportStatus.PREVIEWED,
        importedBy: adminUserId,
        details: JSON.stringify(payload),
        expiresAt
      }
    });

    return {
      batchId: batch.id,
      ...payload,
      expiresAt
    };
  }

  public async confirm(batchId: string, adminUserId: string, options?: ConfirmOptions) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Lock on ImportBatch
        const batchList = await tx.$queryRaw<any[]>`SELECT * FROM "ImportBatch" WHERE id = ${batchId} FOR UPDATE NOWAIT`;
        
        if (batchList.length === 0) throw new BatchNotFoundError();
        const batch = batchList[0];
        
        if (batch.status === ImportStatus.CONFIRMED) throw new BatchAlreadyConfirmedError();
        if (batch.status === ImportStatus.EXPIRED) throw new BatchExpiredError();
        if (batch.status !== ImportStatus.PREVIEWED) throw new BatchInvalidStateError();
        if (new Date() >= batch.expiresAt) throw new BatchExpiredError();

        // 2. Mark CONFIRMING
        await tx.importBatch.update({ 
          where: { id: batchId }, 
          data: { status: ImportStatus.CONFIRMING } 
        });

        const payload: FacultyImportPayload = JSON.parse(batch.details || '{}');
        
        // Filter out excluded records if specified
        if (options?.validEmployeeIds && Array.isArray(options.validEmployeeIds)) {
          payload.validRecords = payload.validRecords.filter(r => options.validEmployeeIds!.includes(r.employeeId));
        } else if (options?.excludedEmployeeIds && Array.isArray(options.excludedEmployeeIds)) {
          payload.validRecords = payload.validRecords.filter(r => !options.excludedEmployeeIds!.includes(r.employeeId));
        }

        // 3. Roles lookup map
        const roles = await tx.role.findMany();
        const roleMap = new Map<string, string>();
        roles.forEach(r => roleMap.set(r.roleName, r.id));
        const defaultFacultyRoleId = roleMap.get('FACULTY') || roles[0]?.id;

        let processed = 0;
        for (const record of payload.validRecords) {
          const targetRoleId = (record.roleName && roleMap.get(record.roleName)) || defaultFacultyRoleId;
          const userEmail = (record.email || `${record.employeeId}@mictech.ac.in`).toLowerCase().trim();

          // Check if user already exists by employeeId OR by email
          const existingUser = await tx.user.findFirst({
            where: {
              OR: [
                { employeeId: record.employeeId },
                { email: userEmail }
              ]
            }
          });

          if (existingUser) {
            // Update existing user profile, keeping password intact
            await tx.user.update({
              where: { id: existingUser.id },
              data: {
                name: record.facultyName || record.name || existingUser.name,
                employeeId: record.employeeId,
                email: userEmail,
                departmentId: record.departmentId || existingUser.departmentId,
                roleId: targetRoleId,
                status: 'ACTIVE'
              }
            });

            // Ensure faculty profile exists
            const existingProfile = await tx.facultyProfile.findUnique({ where: { userId: existingUser.id } });
            if (!existingProfile) {
              await tx.facultyProfile.create({
                data: { userId: existingUser.id }
              });
            }

            processed++;
          } else {
            // Create brand new user with real institutional email
            const tempPassword = 'password123';
            const passwordHash = await bcrypt.hash(tempPassword, 10);

            const newUser = await tx.user.create({
              data: {
                employeeId: record.employeeId,
                name: record.facultyName || record.name,
                email: userEmail,
                passwordHash,
                departmentId: record.departmentId!,
                roleId: targetRoleId,
                status: 'ACTIVE',
                mustChangePassword: true
              }
            });

            // Create Faculty Profile
            await tx.facultyProfile.create({
              data: { userId: newUser.id }
            });

            processed++;
          }

          if (options?.injectFailure) {
            throw new Error('Injected failure during business write');
          }
        }

        // 4. Audit Log
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'CONFIRM_FACULTY_IMPORT',
            entity: 'ImportBatch',
            entityId: batchId
          }
        });
        
        // 5. Final State
        await tx.importBatch.update({ 
          where: { id: batchId }, 
          data: { status: ImportStatus.CONFIRMED } 
        });

        return { success: true, processed };
      }, { maxWait: 10000, timeout: 60000 });
    } catch (error) {
      if (error instanceof StaleDataError) {
        await this.lifecycle.safelyMarkTerminal(batchId, ImportStatus.STALE);
      } else if (error instanceof BatchExpiredError) {
        await this.lifecycle.safelyMarkTerminal(batchId, ImportStatus.EXPIRED);
      } else if (error instanceof BatchNotFoundError || error instanceof BatchAlreadyConfirmedError || error instanceof BatchInvalidStateError) {
        // State is already terminal
      } else {
        await this.lifecycle.safelyMarkTerminal(batchId, ImportStatus.FAILED);
      }
      throw error;
    }
  }
}
