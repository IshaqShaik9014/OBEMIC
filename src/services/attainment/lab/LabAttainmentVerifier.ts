import { LabStudentRange } from './LabStudentRangeDetector';

export interface LabVerificationReport {
    success: boolean;
    studentCount: number;
    startRow: number;
    endRow: number;
    internalMax: number;
    externalMax: number;
    thresholdPercentage: number;
}

export class LabAttainmentVerifier {
    public verify(sheet: any, range: LabStudentRange, thresholdPercentage: number, meta: any): LabVerificationReport {
        const report: LabVerificationReport = {
            success: true,
            studentCount: range.count,
            startRow: range.startRow,
            endRow: range.endRow,
            internalMax: meta.internalMaxMarks,
            externalMax: meta.externalMaxMarks,
            thresholdPercentage
        };

        // Check Summary table exists
        const summaryTitle = sheet.cell('H7').value();
        if (summaryTitle !== 'Lab Attainment Summary' && summaryTitle !== 'OBEMIC_LAB_ATTAINMENT_SUMMARY') {
            console.log("Verification Failed: Missing Summary title.");
            report.success = false;
        }

        // Check Direct Assessment table exists
        const directTitle = sheet.cell('L7').value();
        if (directTitle !== 'Lab CO Direct Assessment' && directTitle !== 'OBEMIC_LAB_CO_DIRECT_ASSESSMENT') {
            console.log("Verification Failed: Missing Direct Assessment title.");
            report.success = false;
        }

        // Check formulas are present in Direct Assessment
        if (!sheet.cell('O9').formula() || !sheet.cell('O13').formula()) {
            console.log("Verification Failed: Missing formulas in Direct Assessment table.");
            report.success = false;
        }

        // Check gap preservation (F and G should be blank)
        for (let r = 7; r <= 15; r++) {
            if (sheet.cell(`F${r}`).value() !== undefined || sheet.cell(`G${r}`).value() !== undefined) {
                console.log(`Verification Failed: Gap columns F or G are not blank at row ${r}.`);
                report.success = false;
            }
        }

        // Check gap column K
        for (let r = 7; r <= 15; r++) {
            if (sheet.cell(`K${r}`).value() !== undefined) {
                console.log(`Verification Failed: Gap column K is not blank at row ${r}.`);
                report.success = false;
            }
        }

        return report;
    }
}
