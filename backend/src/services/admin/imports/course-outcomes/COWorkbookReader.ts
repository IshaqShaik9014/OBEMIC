// @ts-ignore
import xlsx from 'xlsx-populate';
import { SubjectCodeParser, ParsedSubjectCode } from '../../../academic/SubjectCodeParser';

export interface RawCORecord {
  coCode: string;
  description: string;
  poMatrix?: Record<string, number>;
}

export interface RawSubjectBlock {
  workbookDepartment: string | null;
  workbookRegulation: string | null;
  workbookSemester: string | null;
  parsedSubjectCode: ParsedSubjectCode;
  subjectName: string | null;
  courseOutcomes: RawCORecord[];
  worksheetName: string;
}

export class COWorkbookReader {
  public async parse(filePath: string): Promise<RawSubjectBlock[]> {
    const workbook = await xlsx.fromFileAsync(filePath);
    const subjectBlocks: RawSubjectBlock[] = [];

    for (const sheet of workbook.sheets()) {
      const usedRange = sheet.usedRange();
      if (!usedRange) continue;
      
      const rows = usedRange.value();
      if (!rows) continue;

      let currentDept: string | null = null;
      let currentReg: string | null = null;
      let currentSem: string | null = null;
      let currentSubject: RawSubjectBlock | null = null;
      let activePoColMap: Map<number, string> | null = null;

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !Array.isArray(row)) continue;

        // Find the first non-empty cell in the row
        let firstIdx = -1;
        for (let c = 0; c < row.length; c++) {
          if (row[c] !== null && row[c] !== undefined && String(row[c]).trim() !== '') {
            firstIdx = c;
            break;
          }
        }
        if (firstIdx === -1) continue;

        const firstVal = String(row[firstIdx]).trim();
        const upperFirst = firstVal.toUpperCase();

        // 1. Context Detectors
        if (upperFirst.startsWith('DEPARTMENT')) {
          currentDept = firstVal.replace(/department(\s+of)?[:\s]*/i, '').trim();
          continue;
        }
        if (upperFirst.includes('COURSE OUTCOMES') || upperFirst.startsWith('REGULATION')) {
          const m = upperFirst.match(/MIC[- ]?(\d{2})/i);
          if (m) {
            currentReg = `MIC-${m[1]}`;
          } else {
            currentReg = firstVal.replace(/regulation[:\s]*/i, '').trim();
          }
          continue;
        }
        if (upperFirst.includes('SEMESTER') && !upperFirst.startsWith('CO')) {
          currentSem = firstVal;
          continue;
        }

        // Skip statistical or table footer rows like Average
        if (upperFirst === 'AVERAGE' || upperFirst.startsWith('AVERAGE') || upperFirst === 'S.NO' || upperFirst === 'SL.NO') {
          continue;
        }

        // 2. Check for Course Outcome row: CO 1, CO1, CO2, etc.
        const coMatch = upperFirst.match(/^CO\s*(\d)$/i);
        if (coMatch && currentSubject) {
          const coNumber = coMatch[1];
          let desc = '';
          let nextIdx = firstIdx + 1;
          while (nextIdx < row.length && (row[nextIdx] === null || row[nextIdx] === undefined || String(row[nextIdx]).trim() === '')) {
            nextIdx++;
          }
          if (nextIdx < row.length && row[nextIdx]) {
            desc = String(row[nextIdx]).trim();
          }

          // Check for PO matrix numbers in mapped columns or subsequent columns
          const poMatrix: Record<string, number> = {};
          if (activePoColMap && activePoColMap.size > 0) {
            for (const [colIdx, poName] of activePoColMap.entries()) {
              const val = row[colIdx];
              if (val !== undefined && val !== null && val !== '') {
                const num = Number(val);
                if (!isNaN(num) && num >= 1 && num <= 3) {
                  poMatrix[poName] = num;
                }
              }
            }
          } else {
            let colOffset = nextIdx + 1;
            for (let i = 1; i <= 12; i++) {
              const val = row[colOffset];
              if (val !== undefined && val !== null && val !== '') {
                const num = Number(val);
                if (!isNaN(num) && num >= 1 && num <= 3) {
                  poMatrix[`PO${i}`] = num;
                }
              }
              colOffset++;
            }
            for (let i = 1; i <= 2; i++) {
              const val = row[colOffset];
              if (val !== undefined && val !== null && val !== '') {
                const num = Number(val);
                if (!isNaN(num) && num >= 1 && num <= 3) {
                  poMatrix[`PSO${i}`] = num;
                }
              }
              colOffset++;
            }
          }

          currentSubject.courseOutcomes.push({
            coCode: `CO${coNumber}`,
            description: desc,
            poMatrix: Object.keys(poMatrix).length > 0 ? poMatrix : undefined
          });
          continue;
        }

        // 3. Check for Subject Code
        let possibleCodeStr = firstVal;
        let possibleNameStr = '';

        if (upperFirst.includes('SUBJECT CODE')) {
          for (let nextC = firstIdx + 1; nextC < row.length; nextC++) {
            if (row[nextC] !== null && row[nextC] !== undefined && String(row[nextC]).trim() !== '') {
              possibleCodeStr = String(row[nextC]).trim();
              break;
            }
          }
        }

        try {
          const parsedCode = SubjectCodeParser.parse(possibleCodeStr);
          // If valid subject code:
          let nextIdx = firstIdx + 1;
          while (nextIdx < row.length && (row[nextIdx] === null || row[nextIdx] === undefined || String(row[nextIdx]).trim() === '')) {
            nextIdx++;
          }
          if (nextIdx < row.length && row[nextIdx]) {
            const rawName = String(row[nextIdx]).trim();
            if (!rawName.toUpperCase().startsWith('PO1')) {
              possibleNameStr = rawName;
            }
          }

          // Scan row for PO headers (e.g. PO1..PO12, PSO1..PSO2)
          const newPoMap = new Map<number, string>();
          for (let c = 0; c < row.length; c++) {
            const cellStr = String(row[c] || '').trim().toUpperCase();
            const poMatch = cellStr.match(/^(PO\d+|PSO\d+)$/i);
            if (poMatch) {
              newPoMap.set(c, poMatch[1].toUpperCase());
            }
          }
          activePoColMap = newPoMap.size > 0 ? newPoMap : null;

          if (currentSubject) {
            subjectBlocks.push(currentSubject);
          }

          currentSubject = {
            workbookDepartment: currentDept,
            workbookRegulation: currentReg,
            workbookSemester: currentSem,
            parsedSubjectCode: parsedCode,
            subjectName: possibleNameStr || 'Unknown Subject',
            courseOutcomes: [],
            worksheetName: sheet.name()
          };
        } catch {
          // Check if this standalone row is a PO header row for subsequent COs
          const headerPoMap = new Map<number, string>();
          for (let c = 0; c < row.length; c++) {
            const cellStr = String(row[c] || '').trim().toUpperCase();
            const poMatch = cellStr.match(/^(PO\d+|PSO\d+)$/i);
            if (poMatch) {
              headerPoMap.set(c, poMatch[1].toUpperCase());
            }
          }
          if (headerPoMap.size > 0) {
            activePoColMap = headerPoMap;
          }
        }
      }
      
      if (currentSubject) {
        subjectBlocks.push(currentSubject);
      }
    }

    return subjectBlocks;
  }
}
