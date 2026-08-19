const fs = require('fs');
let code = fs.readFileSync('src/repositories/academic.repository.ts', 'utf8');
code = code.replace(/include: \{ subjects: true \}/g, '');
code = code.replace(/include: \{ semester: true, department: true \}/g, 'include: { department: true }');
code = code.replace(/include: \{ subject: \{ include: \{ semester: true \} \} \}/g, 'include: { subject: true, semester: true }');
fs.writeFileSync('src/repositories/academic.repository.ts', code);
console.log('Fixed academic.repository.ts');
