const fs = require('fs');
let code = fs.readFileSync('src/services/admin.survey.service.ts', 'utf8');
code = code.replace(/assignmentWhere\.subject\.semesterId = filters\.semesterId/g, 'assignmentWhere.semesterId = filters.semesterId');
fs.writeFileSync('src/services/admin.survey.service.ts', code);
console.log('Fixed admin.survey.service.ts');
