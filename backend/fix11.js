const fs = require('fs');
let code = fs.readFileSync('tests/services/admin/imports/course-outcomes/COImportConcurrency.test.ts', 'utf8');
code = code.replace(/semesterId:/g, 'semesterLevel:');
fs.writeFileSync('tests/services/admin/imports/course-outcomes/COImportConcurrency.test.ts', code);
console.log('Fixed test file');
