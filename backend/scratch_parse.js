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
             // Match basic patterns like 23ME3T01, 23CSE3T01
             if (/^[0-9]{2}[A-Z]{2,4}[0-9]{1}[A-Z]{1,2}[0-9]{2}$/i.test(trimmed)) {
                subjectCodes.add(trimmed.toUpperCase());
             }
             
             if (trimmed.toUpperCase() === 'SUBJECT CODE' || trimmed.toUpperCase() === 'SUBJECT CODE:') {
                for (let nextC = c + 1; nextC < row.length; nextC++) {
                   if (typeof row[nextC] === 'string' && row[nextC].trim()) {
                      subjectCodes.add(row[nextC].trim().toUpperCase());
                      break;
                   }
                }
             }
          }
       }
    }
  }
  
  console.log("Found unique potential subject codes:");
  Array.from(subjectCodes).sort().forEach(code => console.log(code));
}

inspectCodes().catch(console.error);
