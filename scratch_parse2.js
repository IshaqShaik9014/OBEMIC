const xlsx = require('xlsx-populate');
const path = require('path');

async function inspectCodes() {
  const filePath = path.join(__dirname, 'Co-upload.xlsx');
  const workbook = await xlsx.fromFileAsync(filePath);
  const subjectCodes = new Set();
  
  for (const sheet of workbook.sheets()) {
    const usedRange = sheet.usedRange();
    if (!usedRange) continue;
    
    const rows = usedRange.value();
    if (!rows) continue;
    
    for (let r = 0; r < rows.length; r++) {
       const row = rows[r];
       for (let c = 0; c < row.length; c++) {
          const val = row[c];
          if (typeof val === 'string') {
             const trimmed = val.trim();
             
             // Look for 'SUBJECT CODE' header
             if (trimmed.toUpperCase().includes('SUBJECT CODE')) {
                // The code is usually in the next non-empty cell
                for (let nextC = c + 1; nextC < row.length; nextC++) {
                   if (row[nextC] && typeof row[nextC] === 'string' && row[nextC].trim()) {
                      subjectCodes.add(row[nextC].trim().toUpperCase());
                      break;
                   }
                }
             }
          }
       }
    }
  }
  
  console.log("Explicitly marked Subject Codes:");
  Array.from(subjectCodes).sort().forEach(code => console.log(code));
}

inspectCodes().catch(console.error);
