const fs = require('fs');
let code = fs.readFileSync('src/services/admin/imports/course-outcomes/COImportService.ts', 'utf8');
code = code.replace(/semesterId: block\.semesterId!,/g, 'semesterLevel: block.semesterLevel || null,');
code = code.replace(/existingSubject\.semesterId !== block\.semesterId/g, 'existingSubject.semesterLevel !== block.semesterLevel');
fs.writeFileSync('src/services/admin/imports/course-outcomes/COImportService.ts', code);
console.log('Fixed COImportService');
