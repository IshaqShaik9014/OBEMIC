const fs = require('fs');
let code = fs.readFileSync('src/repositories/academic.repository.ts', 'utf8');
code = code.replace(/semesterId/g, 'semesterLevel');
fs.writeFileSync('src/repositories/academic.repository.ts', code);

code = fs.readFileSync('src/services/academic.service.ts', 'utf8');
code = code.replace(/semesterId/g, 'semesterLevel');
fs.writeFileSync('src/services/academic.service.ts', code);

code = fs.readFileSync('src/controllers/academic.controller.ts', 'utf8');
code = code.replace(/semesterId/g, 'semesterLevel');
fs.writeFileSync('src/controllers/academic.controller.ts', code);
console.log('Fixed academic endpoints');
