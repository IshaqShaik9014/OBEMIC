const fs = require('fs');
let code = fs.readFileSync('src/services/report.service.ts', 'utf8');
code = code.replace(/\.sort\(\(a, b\)/g, '.sort((a: any, b: any)');
fs.writeFileSync('src/services/report.service.ts', code);
console.log('Fixed report.service.ts TS errors');
