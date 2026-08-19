const fs = require('fs');
let code = fs.readFileSync('src/services/student.survey.service.ts', 'utf8');
code = code.replace(/subject: \{\n\s*semesterId: currentEnrollment.semesterId,\n\s*departmentId: currentEnrollment.departmentId,\n\s*\}/g, 'semesterId: currentEnrollment.semesterId,\n          subject: { departmentId: currentEnrollment.departmentId }');
code = code.replace(/semesterId: assignment\.subject\.semesterId/g, 'semesterId: assignment.semesterId');
fs.writeFileSync('src/services/student.survey.service.ts', code);
console.log('Fixed student.survey.service.ts');
