const fs = require('fs');
let code = fs.readFileSync('src/app/admin/assignments/page.tsx', 'utf8');
code = code.replace(/sub\.semester\?\.semester/g, 'sub.semesterLevel');
fs.writeFileSync('src/app/admin/assignments/page.tsx', code);

code = fs.readFileSync('src/app/admin/subjects/page.tsx', 'utf8');
code = code.replace(/s\.semester\?\.semester/g, 's.semesterLevel');
fs.writeFileSync('src/app/admin/subjects/page.tsx', code);
console.log('Fixed frontend');
