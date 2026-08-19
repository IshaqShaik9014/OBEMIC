const fs = require('fs');
let code = fs.readFileSync('src/config/branch-codes.ts', 'utf8');
code = code.replace(/'MECHANICAL ENGINEERING'\]/g, '\\'MECHANICAL ENGINEERING\\', \\'MECHANICAL\\']');
fs.writeFileSync('src/config/branch-codes.ts', code);
console.log('Fixed branch-codes.ts');
