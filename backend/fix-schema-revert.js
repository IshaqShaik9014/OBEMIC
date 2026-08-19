const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');
code = code.replace(/studentEnrollments StudentEnrollment\[\]\\\\n  surveys        Survey\[\]/g, 'studentEnrollments StudentEnrollment[]');
code = code.replace(/studentEnrollments StudentEnrollment\[\]\\\\n  surveys Survey\[\]/g, 'studentEnrollments StudentEnrollment[]');
code = code.replace(/studentEnrollments StudentEnrollment\[\]\\\\n/g, 'studentEnrollments StudentEnrollment[]');
fs.writeFileSync('prisma/schema.prisma', code);
console.log('Fixed schema correctly');
