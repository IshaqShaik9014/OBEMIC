import { InternalFormulaBuilder } from './InternalFormulaBuilder';
import { StudentRange } from './StudentRangeDetector';

export class COSummaryWriter {
    private builder = new InternalFormulaBuilder();

    public write(sheet: any, range: StudentRange, threshold: number = 1.8): void {
        const summaryStartRow = range.endRow + 2;

        // 1. Write Headers
        const headers = ['CO', 'Appeared', 'Attained', '3-Point Scale', 'Attainment%'];
        const cols = ['AC', 'AD', 'AE', 'AF', 'AG'];
        
        for (let i = 0; i < 5; i++) {
            const cell = sheet.cell(`${cols[i]}${summaryStartRow}`);
            cell.value(headers[i]);
            cell.style('bold', true);
        }

        // 2. Write CO Rows
        const coLabels = ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'];
        const dataCols = ['AC', 'AD', 'AE', 'AF', 'AG']; // Source cols for CO scores

        for (let i = 0; i < 5; i++) {
            const r = summaryStartRow + 1 + i;
            const sourceCol = dataCols[i];
            
            // CO Label (AC)
            sheet.cell(`AC${r}`).value(coLabels[i]);
            
            // Appeared (AD)
            sheet.cell(`AD${r}`).formula(this.builder.getAppearedFormula(sourceCol, range.startRow, range.endRow));
            
            // Attained (AE)
            sheet.cell(`AE${r}`).formula(this.builder.getAttainedFormula(sourceCol, range.startRow, range.endRow, threshold));
            
            // 3-Point Scale (AF)
            sheet.cell(`AF${r}`).formula(this.builder.get3PointScaleFormula(`AE${r}`, `AD${r}`));
            
            // Attainment Percentage (AG)
            sheet.cell(`AG${r}`).formula(this.builder.getAttainmentPercentageFormula(`AE${r}`, `AD${r}`));
        }

        // 3. Add borders
        sheet.range(`AC${summaryStartRow}:AG${summaryStartRow + 5}`).style('border', true);
    }

    public clear(sheet: any, range: StudentRange): void {
        const summaryStartRow = range.endRow + 2;
        
        const markerCell = sheet.cell(`AC${summaryStartRow}`).value();
        if (markerCell === 'CO') {
            // We know it's at most 6 rows (header + 5 COs)
            for (let r = summaryStartRow; r <= summaryStartRow + 5; r++) {
                for (let c = 29; c <= 33; c++) {
                    sheet.cell(r, c).formula(undefined);
                    sheet.cell(r, c).value(undefined);
                }
            }
        }
    }
}
