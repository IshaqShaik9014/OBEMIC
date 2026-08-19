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
             // Broad matching: any string starting with 2 digits, some letters, digits, and letters
             const match = trimmed.match(/[0-9]{2}[A-Z]{2,4}[0-9A-Z]+/i);
             if (match) {
                subjectCodes.add(match[0].toUpperCase());
             }
          }
       }
    }
  }
  
  console.log("All extracted regex matches for subject codes:");
  Array.from(subjectCodes).sort().forEach(code => console.log(code));
}

inspectCodes().catch(console.error);
