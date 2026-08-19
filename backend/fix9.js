const fs = require('fs');
let code = fs.readFileSync('src/services/faculty.service.ts', 'utf8');
code = code.replace(/subject: \{\n\s*include: \{\n\s*semester: true,\n\s*department: true\n\s*\}\n\s*\}/g, 'subject: { include: { department: true } }, semester: true');
code = code.replace(/semester: a\.subject\.semester\.semester/g, 'semester: a.semester.semester');
fs.writeFileSync('src/services/faculty.service.ts', code);
console.log('Fixed faculty.service.ts');
