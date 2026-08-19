const XlsxPopulate = require('xlsx-populate');
const path = require('path');

async function inspect(fileName) {
    try {
        console.log(`\n--- Inspecting ${fileName} ---`);
        const filePath = path.join(__dirname, fileName);
        const workbook = await XlsxPopulate.fromFileAsync(filePath);
        const sheet = workbook.sheet(0);
        
        for (let r = 1; r <= 20; r++) {
            let rowData = [];
            for (let c = 1; c <= 35; c++) {
                const val = sheet.row(r).cell(c).value();
                rowData.push(val === undefined ? '' : val);
            }
            if (rowData.some(v => v !== '')) {
                console.log(`Row ${r}:`, rowData);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

async function main() {
    await inspect('INTERNAL MARKS TEMPLATE.xlsx');
    await inspect('EXTERNAL MARKS TEMPLATE.xlsx');
}

main();
