import { ExternalColumnMap } from './ExternalHeaderMapper';

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

export class ExternalAttainmentVerifier {
    public verify(
        sheet: any, 
        range: { startRow: number, endRow: number, count: number }, 
        courseOutcomes: { coCode: string }[], 
        threshold: number,
        colMap: ExternalColumnMap,
        startColIndex: number
    ): VerificationReport {
        
        const summaryStartRow = range.endRow + 2;

        const report: VerificationReport = {
            subjectName: sheet.name(),
            studentCount: range.count,
            startRow: range.startRow,
            endRow: range.endRow,
            summaryStartRow,
            threshold,
            firstStudentFormulas: {},
            lastStudentFormulas: {},
            success: true
        };

        // Extract first and last student formulas to verify they exist
        courseOutcomes.forEach((co, idx) => {
            const colIndex = startColIndex + idx;
            report.firstStudentFormulas[co.coCode] = sheet.cell(range.startRow, colIndex).formula() || '';
            report.lastStudentFormulas[co.coCode] = sheet.cell(range.endRow, colIndex).formula() || '';
        });

        // Basic verification
        courseOutcomes.forEach(co => {
            if (!report.firstStudentFormulas[co.coCode] || !report.lastStudentFormulas[co.coCode]) {
                console.log(`Failed basic verification: Missing first or last formula for ${co.coCode}`);
                report.success = false;
            }
        });

        return report;
    }
}
