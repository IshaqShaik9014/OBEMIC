import fs from 'fs';
// @ts-ignore
import xlsx from 'xlsx-populate';
import { resolveDepartmentCodeByAlias } from '../../../../config/branch-codes';

export interface RawFacultyRecord {
  employeeId: string;
  facultyName: string;
  email: string | null;
  roleRaw: string | null;
  departmentRaw: string | null;
  canonicalDepartmentCode: string | null;
  statusRaw?: string | null;
  worksheetName: string;
  rowIndex: number;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export class FacultyWorkbookReader {
  public async parse(filePath: string): Promise<RawFacultyRecord[]> {
    const records: RawFacultyRecord[] = [];

    // Check if the file is a CSV or plain-text file
    const isCsv = filePath.toLowerCase().endsWith('.csv');
    if (isCsv) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
        const rows = lines.map(line => parseCsvLine(line));
        this.extractRecordsFromRows(rows, 'CSV_DATA', records);
        return records;
      } catch (csvError) {
        console.warn('Failed reading as plain CSV, attempting Excel workbook parsing:', csvError);
      }
    }

    try {
      const workbook = await xlsx.fromFileAsync(filePath);
      for (const sheet of workbook.sheets()) {
        const usedRange = sheet.usedRange();
        if (!usedRange) continue;
        const rows = usedRange.value();
        if (!rows || !Array.isArray(rows)) continue;

        this.extractRecordsFromRows(rows, sheet.name(), records);
      }
    } catch (excelError: any) {
      // Fallback: If xlsx parsing failed (e.g. CSV was uploaded with .xlsx extension or vice-versa)
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (fileContent.includes(',') || fileContent.includes('\n')) {
          const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
          const rows = lines.map(line => parseCsvLine(line));
          this.extractRecordsFromRows(rows, 'TEXT_SHEET', records);
        }
      } catch {
        throw new Error(`Failed to parse staff file: ${excelError?.message || 'Unsupported format'}`);
      }
    }

    return records;
  }

  private extractRecordsFromRows(rows: any[][], worksheetName: string, records: RawFacultyRecord[]): void {
    let currentDepartmentContext: string | null = null;
    let headerRowIndex = -1;
    let employeeIdColIndex = -1;
    let nameColIndex = -1;
    let emailColIndex = -1;
    let departmentColIndex = -1;
    let roleColIndex = -1;
    let statusColIndex = -1;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;

      // Scan for department context blocks (e.g., "Department: CSE" or standalone "CSE")
      for (let c = 0; c < row.length; c++) {
        const val = row[c];
        if (typeof val === 'string') {
          const trimmed = val.trim().toUpperCase();
          if (trimmed.startsWith('DEPARTMENT:')) {
            currentDepartmentContext = val.replace(/department:/i, '').trim();
          } else if (trimmed === 'DEPARTMENT' && typeof row[c + 1] === 'string' && row[c + 1].trim()) {
            currentDepartmentContext = row[c + 1].trim();
          } else if (['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML', 'BED', 'MBA'].includes(trimmed)) {
            currentDepartmentContext = trimmed;
          }
        }
      }

      // If headers not yet identified, scan this row
      if (headerRowIndex === -1) {
        let tempIdCol = -1;
        let tempNameCol = -1;
        let tempEmailCol = -1;
        let tempDeptCol = -1;
        let tempRoleCol = -1;
        let tempStatusCol = -1;

        for (let c = 0; c < row.length; c++) {
          const val = row[c];
          if (val == null) continue;
          const normalized = String(val).trim().toUpperCase();

          // 1. Employee ID / Faculty ID (Strict match so EMAILID does not collide)
          if (
            normalized === 'FAC_ID' ||
            normalized === 'FACULTY_ID' ||
            normalized === 'FACULTY ID' ||
            normalized === 'FAC ID' ||
            normalized === 'EMP_ID' ||
            normalized === 'EMPID' ||
            normalized === 'EMP ID' ||
            normalized === 'EMPLOYEE_ID' ||
            normalized === 'EMPLOYEEID' ||
            normalized === 'EMPLOYEE ID' ||
            normalized === 'EMP. NO' ||
            normalized === 'EMP NO' ||
            normalized === 'EMP_NO' ||
            normalized === 'STAFF_ID' ||
            normalized === 'STAFF ID' ||
            normalized === 'ID'
          ) {
            tempIdCol = c;
          }

          // 2. Name column
          if (
            normalized === 'FAC_NAME' ||
            normalized === 'FACULTY_NAME' ||
            normalized === 'FACULTY NAME' ||
            normalized === 'FAC NAME' ||
            normalized === 'NAME' ||
            normalized === 'STAFF NAME' ||
            normalized === 'STAFF_NAME' ||
            normalized === 'EMPLOYEE NAME' ||
            normalized === 'EMPLOYEE_NAME' ||
            normalized.includes('FACULTY NAME') ||
            normalized.includes('NAME OF THE FACULTY') ||
            normalized.includes('NAME OF FACULTY')
          ) {
            tempNameCol = c;
          }

          // 3. Email column
          if (
            normalized === 'EMAILID' ||
            normalized === 'EMAIL_ID' ||
            normalized === 'EMAIL ID' ||
            normalized === 'EMAIL' ||
            normalized.includes('EMAIL') ||
            normalized.includes('MAIL')
          ) {
            tempEmailCol = c;
          }

          // 4. Department column
          if (
            normalized === 'DEPT' ||
            normalized === 'DEPT.' ||
            normalized === 'DEPT_NAME' ||
            normalized === 'DEPT NAME' ||
            normalized === 'DEPARTMENT' ||
            normalized === 'BRANCH' ||
            normalized.includes('DEPARTMENT') ||
            normalized.includes('BRANCH') ||
            normalized === 'STREAM'
          ) {
            tempDeptCol = c;
          }

          // 5. Role / Designation column
          if (
            normalized === 'ROLE' ||
            normalized === 'DESIGNATION' ||
            normalized.includes('ROLE') ||
            normalized.includes('DESIGNATION')
          ) {
            tempRoleCol = c;
          }

          // 6. Status column
          if (
            normalized === 'STATUS' ||
            normalized === 'STATE' ||
            normalized === 'ACTIVE'
          ) {
            tempStatusCol = c;
          }
        }

        // Must have at least an ID column and a Name column to qualify as header row
        if (tempIdCol !== -1 && tempNameCol !== -1) {
          headerRowIndex = r;
          employeeIdColIndex = tempIdCol;
          nameColIndex = tempNameCol;
          emailColIndex = tempEmailCol;
          departmentColIndex = tempDeptCol;
          roleColIndex = tempRoleCol;
          statusColIndex = tempStatusCol;
          continue; // Move to data rows
        }
      }

      // Read data if past the header row
      if (headerRowIndex !== -1 && r > headerRowIndex) {
        const rawId = row[employeeIdColIndex];
        const rawName = row[nameColIndex];

        if (rawId != null && rawName != null && String(rawId).trim() !== '' && String(rawName).trim() !== '') {
          const employeeIdStr = String(rawId).trim();
          const facultyNameStr = String(rawName).trim();

          // Extract inline email
          const rawEmail = emailColIndex !== -1 && row[emailColIndex] ? String(row[emailColIndex]).trim() : null;

          // Prefer inline department if it exists, fallback to block context
          let rowDept = currentDepartmentContext;
          if (departmentColIndex !== -1 && row[departmentColIndex]) {
            rowDept = String(row[departmentColIndex]).trim();
          }

          // Extract inline role if column was present
          const rowRole = roleColIndex !== -1 && row[roleColIndex] ? String(row[roleColIndex]).trim() : 'FACULTY';

          // Extract inline status if present
          const rowStatus = statusColIndex !== -1 && row[statusColIndex] ? String(row[statusColIndex]).trim() : '1';

          // Resolve using centralized config
          const deptConfig = rowDept ? resolveDepartmentCodeByAlias(rowDept) : null;

          if (employeeIdStr) {
            records.push({
              employeeId: employeeIdStr,
              facultyName: facultyNameStr,
              email: rawEmail,
              roleRaw: rowRole,
              departmentRaw: rowDept,
              canonicalDepartmentCode: deptConfig ? deptConfig.departmentCode : (rowDept?.toUpperCase() || null),
              statusRaw: rowStatus,
              worksheetName,
              rowIndex: r + 1
            });
          }
        }
      }
    }
  }
}
