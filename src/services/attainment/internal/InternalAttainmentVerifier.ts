import { StudentRange } from '../shared/DynamicStudentRangeDetector';
import { InternalColumnMap } from './InternalHeaderMapper';
import { TablePlacementService } from '../shared/TablePlacementService';

export interface VerificationReport {
    subjectName: string;
    studentCount: number;
    startRow: number;
    endRow: number;
    summaryStartRow: number;
    threshold: number;
    firstStudentFormulas: Record<string, string>;
    lastStudentFormulas: Record<string, string>;
    success: boolean;
}

export class InternalAttainmentVerifier {
    private placement = new TablePlacementService();

    public verify(sheet: any, range: StudentRange, courseOutcomes: { coCode: string }[], threshold: number, colMap: InternalColumnMap, startColIndex: number): VerificationReport {
        const numCOs = courseOutcomes.length;
        
        const cols: string[] = [];
        for (let i = 0; i < numCOs; i++) {
            cols.push(this.placement.getColLetter(startColIndex + i));
        }
        const firstCol = cols.length > 0 ? cols[0] : '';
        
        const firstStudentFormulas: Record<string, string> = {};
        const lastStudentFormulas: Record<string, string> = {};

        for (let i = 0; i < numCOs; i++) {
            const co = courseOutcomes[i].coCode;
            firstStudentFormulas[co] = sheet.cell(`${cols[i]}${range.startRow}`).formula();
            lastStudentFormulas[co] = sheet.cell(`${cols[i]}${range.endRow}`).formula();
        }

        const report: VerificationReport = {
            subjectName: sheet.name(),
            studentCount: range.count,
            startRow: range.startRow,
            endRow: range.endRow,
            summaryStartRow: range.endRow + 2,
            threshold,
            firstStudentFormulas,
            lastStudentFormulas,
            success: true
        };

        // Basic verification
        if (numCOs > 0) {
            const firstCO = courseOutcomes[0].coCode;
            const lastCO = courseOutcomes[numCOs - 1].coCode;
            if (!report.firstStudentFormulas[firstCO] || !report.lastStudentFormulas[lastCO]) {
                console.log("Failed basic verification: Missing first or last formula");
                console.log(report.firstStudentFormulas);
                console.log(report.lastStudentFormulas);
                report.success = false;
            }
        }

        // Verify no formula below last student in the first output column (unless it's the summary table)
        if (firstCol) {
            const gapCell = sheet.cell(`${firstCol}${range.endRow + 1}`).value();
            if (gapCell !== undefined && gapCell !== null && gapCell !== '') {
                console.log("Failed gap verification: Gap cell is not empty", gapCell, "Range was", range);
                report.success = false;
            }
        }

        return report;
    }
}
