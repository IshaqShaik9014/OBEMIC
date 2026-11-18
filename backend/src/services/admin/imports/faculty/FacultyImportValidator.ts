import { UserRepository } from '../../../../repositories/user.repository';
import { RawFacultyRecord } from './FacultyWorkbookReader';
import prisma from '../../../../database';

export type FacultyRecordAction = 
  | 'CREATE' 
  | 'UPDATE'
  | 'UNCHANGED' 
  | 'FACULTY_NAME_CONFLICT' 
  | 'FACULTY_DEPARTMENT_CONFLICT' 
  | 'FACULTY_PROFILE_CONFLICT';

export interface ValidatedFacultyRecord {
  employeeId: string;
  facultyName: string;
  name: string; // Expose 'name' for frontend table compatibility
  email: string; // Expose 'email' for frontend table compatibility
  department: string; // Expose 'department' for frontend table compatibility
  roleName: string;
  canonicalDepartmentCode: string | null;
  departmentId: string | null; // Resolved database ID
  action: FacultyRecordAction;
  issues: string[];
}

export function resolveRoleName(rawRole: string | null | undefined): string {
  if (!rawRole) return 'FACULTY';
  // Strip non-alphabetical characters (e.g. 'CO-ORDINATOR' -> 'COORDINATOR')
  const clean = rawRole.toUpperCase().replace(/[^A-Z]/g, '');
  if (clean.includes('HOD') || clean.includes('ADMIN')) {
    return 'ADMIN'; // HOD = Admin
  }
  if (clean.includes('OBE')) {
    return 'OBE_INCHARGE';
  }
  if (clean.includes('BRANCH') || clean.includes('COORD')) {
    return 'COORDINATOR'; // Branch Coordinator
  }
  if (clean.includes('MANAGEMENT')) {
    return 'MANAGEMENT';
  }
  return 'FACULTY';
}

export interface FacultyImportPayload {
  validRecords: ValidatedFacultyRecord[];
  invalidRecords: ValidatedFacultyRecord[];
  creates: number;
  unchanged: number;
  conflicts: number;
  canConfirm: boolean;
}

export class FacultyImportValidator {
  private userRepo = new UserRepository();

  public async validate(records: RawFacultyRecord[]): Promise<FacultyImportPayload> {
    const payload: FacultyImportPayload = {
      validRecords: [],
      invalidRecords: [],
      creates: 0,
      unchanged: 0,
      conflicts: 0,
      canConfirm: false
    };

    let departments: any[] = [];
    try {
      departments = await prisma.department.findMany();
    } catch (err) {
      console.warn('Could not query departments from DB, using fallback list:', err);
    }

    const employeeIdMap = new Map<string, RawFacultyRecord>();
    const excelDuplicates = new Set<string>();

    for (const record of records) {
      if (employeeIdMap.has(record.employeeId)) {
        excelDuplicates.add(record.employeeId);
      } else {
        employeeIdMap.set(record.employeeId, record);
      }
    }

    for (const [empId, record] of employeeIdMap.entries()) {
      const canonicalCode = record.canonicalDepartmentCode || record.departmentRaw?.toUpperCase() || null;
      const facultyEmail = record.email ? record.email.trim().toLowerCase() : `${empId}@mictech.ac.in`;

      const validated: ValidatedFacultyRecord = {
        employeeId: empId,
        facultyName: record.facultyName,
        name: record.facultyName,
        email: facultyEmail,
        department: canonicalCode || 'Assigned',
        roleName: resolveRoleName(record.roleRaw),
        canonicalDepartmentCode: canonicalCode,
        departmentId: null,
        action: 'CREATE',
        issues: []
      };

      if (excelDuplicates.has(empId)) {
        validated.issues.push('Warning: Duplicate Employee ID found in the workbook. First occurrence processed.');
      }

      // 1. Resolve Department from DB
      let dbDept = departments.find(d => {
        const allowedNames = resolveDbDeptName(canonicalCode || '');
        return allowedNames.includes(d.departmentName.toUpperCase()) || d.departmentName.toUpperCase() === canonicalCode;
      });

      // 2. Fallback to BED for foundational wings (TNP, DIPLOMA, PD, BSH, H&S)
      if (!dbDept && ['BED', 'TNP', 'DIPLOMA', 'PD', 'SPORTS', 'H&S', 'BSH'].includes((record.departmentRaw || '').toUpperCase())) {
        dbDept = departments.find(d => d.departmentName.toUpperCase() === 'BED');
      }

      // 3. Fallback to direct raw match
      if (!dbDept && record.departmentRaw) {
        dbDept = departments.find(d => d.departmentName.toUpperCase() === record.departmentRaw!.toUpperCase());
      }

      // 4. If still not found, auto-create the department so the record is not dropped
      if (!dbDept && record.departmentRaw) {
        const deptName = (canonicalCode || record.departmentRaw).toUpperCase();
        try {
          dbDept = await prisma.department.upsert({
            where: { departmentName: deptName },
            update: {},
            create: { departmentName: deptName }
          });
          departments.push(dbDept);
        } catch {
          // Fallback to BED or CSE
          dbDept = departments.find(d => d.departmentName.toUpperCase() === 'BED') || departments[0];
        }
      }

      if (!dbDept) {
        // Fallback to first available department or virtual department
        dbDept = departments[0] || ({ id: 'dept-bed', departmentName: canonicalCode || 'BED' } as any);
      }

      validated.departmentId = dbDept ? dbDept.id : null;
      validated.department = dbDept ? dbDept.departmentName : (canonicalCode || 'Assigned');

      // Check existing user by employeeId OR by institutional email
      let existingUser: any = null;
      try {
        existingUser = (await this.userRepo.findByEmployeeId(empId)) ||
          (facultyEmail ? await this.userRepo.findByEmail(facultyEmail) : null);
      } catch {
        existingUser = null;
      }

      if (existingUser) {
        const nameDiffers = existingUser.name.toUpperCase() !== record.facultyName.toUpperCase();
        const deptDiffers = dbDept && existingUser.departmentId !== dbDept.id;

        if (nameDiffers || deptDiffers) {
          validated.action = 'UPDATE';
          validated.issues.push(`Will synchronize profile with uploaded roster (Dept: ${dbDept?.departmentName}).`);
        } else {
          validated.action = 'UNCHANGED';
        }
        payload.unchanged++;
      } else {
        validated.action = 'CREATE';
        payload.creates++;
      }

      payload.validRecords.push(validated);
    }

    payload.canConfirm = payload.validRecords.length > 0;
    return payload;
  }
}

function resolveDbDeptName(code: string): string[] {
  const map: Record<string, string[]> = {
    'CSE': ['COMPUTER SCIENCE AND ENGINEERING', 'CSE'],
    'MECH': ['MECHANICAL ENGINEERING', 'MECHANICAL', 'MECH'],
    'ECE': ['ELECTRONICS AND COMMUNICATION ENGINEERING', 'ECE'],
    'IT': ['INFORMATION TECHNOLOGY', 'IT'],
    'CIVIL': ['CIVIL ENGINEERING', 'CIVIL'],
    'EEE': ['ELECTRICAL AND ELECTRONICS ENGINEERING', 'EEE'],
    'AIDS': ['ARTIFICIAL INTELLIGENCE AND DATA SCIENCE', 'AIDS', 'AI&DS', 'AI'],
    'AIML': ['ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING', 'AIML', 'AI&ML'],
    'BED': ['BASIC ENGINEERING DEPARTMENT', 'BED', 'B.ED', 'B.ED.', 'BASIC ENGINEERING'],
    'MBA': ['MANAGEMENT STUDIES', 'MBA', 'MS']
  };
  return map[code] || [code];
}
