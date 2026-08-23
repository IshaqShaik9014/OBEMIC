const ExcelJS = require('exceljs');
async function read() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('backend/TEST/Excel_Templates_and_Samples/Printable Summary.xlsx');
  workbook.eachSheet((worksheet, sheetId) => {
    console.log('--- Sheet: ' + worksheet.name + ' ---');
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber <= 25) {
        console.log('Row ' + rowNumber + ': ' + JSON.stringify(row.values));
      }
    });
  });
}
read();
