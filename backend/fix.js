
const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');
content = content.replace('studentEnrollments StudentEnrollment[]\\\\n  surveys        Survey[]', 'studentEnrollments StudentEnrollment[]');
content = content.replace('studentEnrollments StudentEnrollment[]\\\\n  surveys        Survey[]', 'studentEnrollments StudentEnrollment[]');
fs.writeFileSync('prisma/schema.prisma', content);

