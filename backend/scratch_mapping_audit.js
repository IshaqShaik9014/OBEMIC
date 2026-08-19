const XlsxPopulate = require('xlsx-populate');
const path = require('path');

function getColLetter(colIndex) {
    let letter = '';
    while (colIndex > 0) {
        let temp = (colIndex - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        colIndex = (colIndex - temp - 1) / 26;
    }
    return letter;
}

async function audit(fileName) {
    try {
        console.log(`\n\n=== Mapping Audit: ${fileName} ===`);
        const filePath = path.join(__dirname, fileName);
        const workbook = await XlsxPopulate.fromFileAsync(filePath);
        const sheet = workbook.sheet(0);
        
        for (let r = 1; r <= 15; r++) {
            for (let c = 1; c <= 40; c++) {
                const val = sheet.row(r).cell(c).value();
                if (val !== undefined && val !== null && val !== '') {
                    console.log(`Row ${r} Col ${getColLetter(c)} (${c}): ${val}`);
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}

async function main() {
    await audit('INTERNAL MARKS TEMPLATE.xlsx');
    await audit('EXTERNAL MARKS TEMPLATE.xlsx');
}

main();
