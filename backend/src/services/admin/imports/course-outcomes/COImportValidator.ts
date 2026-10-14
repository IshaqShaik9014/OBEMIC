import { RawSubjectBlock } from './COWorkbookReader';
import { resolveDepartmentConfigBySubjectToken, resolveDepartmentCodeByAlias, isInterdepartmentalToken } from '../../../../config/branch-codes';
import prisma from '../../../../database';
import { Subject, CourseOutcome, Department, Regulation } from '@prisma/client';

export type SubjectRecordAction = 'CREATE' | 'UNCHANGED' | 'DATABASE_CONFLICT' | 'CONTEXT_CONFLICT';
export type CORecordAction = 'CREATE' | 'UNCHANGED' | 'CO_CONTENT_CONFLICT';

export interface ValidatedCO {
  coCode: string;
  description: string;
  action: CORecordAction;
  issues: string[];
  poMatrix?: Record<string, number>;
  isExistingInDb?: boolean;
  existingDbDescription?: string;
}

export interface ValidatedSubjectBlock {
  normalizedSubjectCode: string;
  subjectName: string;
  departmentId: string | null;
  regulationId: string | null;
  semesterLevel: string | null;
  action: SubjectRecordAction;
  courseOutcomes: ValidatedCO[];
  issues: string[];
  isExistingInDb?: boolean;
  existingDbSubjectName?: string;
}

export interface COImportPayload {
  validBlocks: ValidatedSubjectBlock[];
  invalidBlocks: ValidatedSubjectBlock[];
  creates: { subjects: number, cos: number };
  unchanged: { subjects: number, cos: number };
  conflicts: { subjects: number, cos: number };
  canConfirm: boolean;
}

export class COImportValidator {
  public async validate(blocks: RawSubjectBlock[]): Promise<COImportPayload> {
    const payload: COImportPayload = {
      validBlocks: [],
      invalidBlocks: [],
      creates: { subjects: 0, cos: 0 },
      unchanged: { subjects: 0, cos: 0 },
      conflicts: { subjects: 0, cos: 0 },
      canConfirm: false
    };

    // Prefetch all data
    const dbDepts = await prisma.department.findMany();
    const dbRegulations = await prisma.regulation.findMany();
    // Assuming Semesters can be looked up or checked dynamically.
    const dbSemesters = await prisma.semester.findMany();

    const uniqueSubjectsMap = new Map<string, RawSubjectBlock>();
    
    // De-duplicate blocks in excel
    for (const block of blocks) {
      if (!uniqueSubjectsMap.has(block.parsedSubjectCode.normalizedSubjectCode)) {
        uniqueSubjectsMap.set(block.parsedSubjectCode.normalizedSubjectCode, block);
      } else {
         // Duplicate subject in excel
      }
    }

    const subjectCodes = Array.from(uniqueSubjectsMap.keys());
    const existingSubjects = await prisma.subject.findMany({
      where: { subjectCode: { in: subjectCodes } },
      include: { courseOutcomes: true, department: true, regulation: true }
    });
    const existingSubjectMap = new Map(existingSubjects.map(s => [s.subjectCode, s]));

    for (const [subjCode, block] of uniqueSubjectsMap.entries()) {
      const validated: ValidatedSubjectBlock = {
        normalizedSubjectCode: subjCode,
        subjectName: block.subjectName || 'Unknown Subject',
        departmentId: null,
        regulationId: null,
        semesterLevel: null,
        action: 'CREATE',
        courseOutcomes: [],
        issues: []
      };

      // 1. Resolve Target Department (Workbook Context Takes Priority!)
      const wbDeptConfig = block.workbookDepartment ? resolveDepartmentCodeByAlias(block.workbookDepartment) : null;
      const deptConfig = resolveDepartmentConfigBySubjectToken(block.parsedSubjectCode.subjectBranchToken);
      const isInterDept = isInterdepartmentalToken(block.parsedSubjectCode.subjectBranchToken);

      let targetDept: any = null;

      // Priority 1: Match from Workbook Department (Admin is uploading for their branch!)
      if (wbDeptConfig) {
        targetDept = dbDepts.find(d => {
          const dbName = d.departmentName.toUpperCase();
          return dbName === wbDeptConfig.departmentCode || 
                 dbName === wbDeptConfig.departmentName.toUpperCase() ||
                 wbDeptConfig.aliases.includes(dbName);
        });
      }

      // Priority 2: Match directly by raw workbook string if alias didn't catch it
      if (!targetDept && block.workbookDepartment) {
        const rawWb = block.workbookDepartment.trim().toUpperCase();
        targetDept = dbDepts.find(d => 
          d.departmentName.trim().toUpperCase() === rawWb ||
          d.departmentName.toUpperCase().includes(rawWb)
        );
      }

      // Priority 3: Fall back to subject code's department if workbook has no department header
      if (!targetDept && deptConfig) {
        targetDept = dbDepts.find(d => {
          const dbName = d.departmentName.toUpperCase();
          return dbName === deptConfig.departmentCode || 
                 dbName === deptConfig.departmentName.toUpperCase() ||
                 deptConfig.aliases.includes(dbName);
        });
      }

      if (targetDept) {
        validated.departmentId = targetDept.id;

        // If it's a cross-branch subject (e.g. MECH subject taken in CSE) or interdepartmental (HS/MB)
        if (wbDeptConfig && deptConfig && wbDeptConfig.departmentCode !== deptConfig.departmentCode) {
          if (isInterDept) {
            validated.issues.push(`Info: Foundational subject '${subjCode}' (${deptConfig.departmentCode}) linked to ${targetDept.departmentName}.`);
          } else {
            validated.issues.push(`Info: Inter-departmental/Open course '${subjCode}' (${deptConfig.departmentCode}) linked to ${targetDept.departmentName} curriculum.`);
          }
        }
      } else {
        // If neither workbook nor subject code could resolve any existing department
        validated.issues.push(`Error: Could not resolve department for subject '${subjCode}'. Please verify the department name.`);
        validated.action = 'CONTEXT_CONFLICT';
      }

      // 2. Resolve Regulation
      const dbReg = dbRegulations.find(r => 
        (block.workbookRegulation && (r.name === block.workbookRegulation || r.name.includes(block.workbookRegulation))) ||
        r.name === block.parsedSubjectCode.regulationCode || 
        r.name.includes(block.parsedSubjectCode.regulationCode)
      );
      if (dbReg) {
         validated.regulationId = dbReg.id;
      } else {
         // Don't flag as conflict, just leave it null (it is optional in Prisma)
         validated.regulationId = null;
      }

      // 3. Resolve Semester (map absolute number to Y-S format, e.g. 3 -> 2-1)
      const absoluteSem = block.parsedSubjectCode.semesterNumber;
      const year = Math.ceil(absoluteSem / 2);
      const sem = (absoluteSem % 2 === 0) ? 2 : 1;
      const mappedSemName = `${year}-${sem}`;
      
      // Since subjects are completely decoupled from Semester records, we just assign the level
      validated.semesterLevel = mappedSemName;

      // Check existing Subject from in-memory pre-fetched map
      const existingSubject = existingSubjectMap.get(subjCode);

      if (existingSubject) {
         validated.isExistingInDb = true;
         validated.existingDbSubjectName = existingSubject.subjectName;
         // Clear context conflicts from parsing since we will use the existing DB context
         validated.issues = [];
         validated.departmentId = existingSubject.departmentId;
         validated.regulationId = existingSubject.regulationId;
         validated.semesterLevel = existingSubject.semesterLevel;
         validated.action = 'UNCHANGED';

         // Identity checks
         if (existingSubject.subjectName.toUpperCase() !== validated.subjectName.toUpperCase()) {
            validated.action = 'DATABASE_CONFLICT';
            validated.issues.push(`Database Conflict: Subject Name differs. DB: '${existingSubject.subjectName}', Upload: '${validated.subjectName}'`);
         }
      } else {
         // It doesn't exist, so we must have a valid department and semester to CREATE it
         if (!validated.departmentId) {
            validated.action = 'CONTEXT_CONFLICT';
            validated.issues.push('Context Conflict: Department could not be resolved for new subject.');
         }
      }

      // Process COs
      const uniqueCosMap = new Map<string, any>();
      for (const co of block.courseOutcomes) {
         if (!uniqueCosMap.has(co.coCode)) {
            uniqueCosMap.set(co.coCode, co);
         }
      }

      for (const [coCode, coBlock] of uniqueCosMap.entries()) {
         const description = coBlock.description;
         const poMatrix = coBlock.poMatrix;
         const vCo: ValidatedCO = { coCode, description, poMatrix, action: 'CREATE', issues: [] };

         // Check PO mapping for this outcome
         if (!poMatrix || Object.keys(poMatrix).length === 0) {
            vCo.issues.push(`PO Mapping Missing: Outcome ${coCode} has no linked Program Outcome correlations.`);
         }

         if (existingSubject) {
            const exCo = existingSubject.courseOutcomes.find((c: any) => c.coCode === coCode);
            if (exCo) {
               vCo.isExistingInDb = true;
               vCo.existingDbDescription = exCo.description;
               if (exCo.description !== description) {
                  vCo.action = 'CO_CONTENT_CONFLICT';
                  vCo.issues.push(`CO Conflict: Description differs from existing DB record.`);
               } else {
                  vCo.action = 'UNCHANGED';
               }
            }
         }
         validated.courseOutcomes.push(vCo);
      }

      // Check if subject has at least some PO mapping
      const hasAnyPo = validated.courseOutcomes.some(c => c.poMatrix && Object.keys(c.poMatrix).length > 0);
      if (!hasAnyPo) {
        validated.issues.push('PO Mapping Missing: No Program Outcome (PO) mapping columns (PO1-PO12, PSO1-PSO2) found for this subject.');
        if (validated.action === 'CREATE' || validated.action === 'UNCHANGED') {
          validated.action = 'CONTEXT_CONFLICT';
        }
      }

      // Tabulate metrics
      if (validated.action === 'CREATE') payload.creates.subjects++;
      if (validated.action === 'UNCHANGED') payload.unchanged.subjects++;
      if (validated.action === 'DATABASE_CONFLICT' || validated.action === 'CONTEXT_CONFLICT') {
         payload.conflicts.subjects++;
         payload.invalidBlocks.push(validated);
      } else {
         payload.validBlocks.push(validated);
      }

      for (const co of validated.courseOutcomes) {
         if (co.action === 'CREATE') payload.creates.cos++;
         if (co.action === 'UNCHANGED') payload.unchanged.cos++;
         if (co.action === 'CO_CONTENT_CONFLICT') payload.conflicts.cos++;
      }
    }
    
    // Only can confirm if there are no invalid blocks and no CO conflicts in valid blocks
    payload.canConfirm = payload.invalidBlocks.length === 0 && payload.validBlocks.length > 0 && 
                         payload.validBlocks.every(b => b.courseOutcomes.every(c => c.action !== 'CO_CONTENT_CONFLICT'));

    return payload;
  }
}
