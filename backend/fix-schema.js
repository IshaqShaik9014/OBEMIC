const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');
code = code.replace(/surveys\s+Survey\[\]\n/g, '');
code = code.replace(/courseOutcomes CourseOutcome\[\]/g, 'courseOutcomes CourseOutcome[]\n  surveys      Survey[]');
code = code.replace(/sections\s+Section\[\]/g, 'sections    Section[]\n  surveys     Survey[]');
fs.writeFileSync('prisma/schema.prisma', code);
console.log('Fixed schema relationships');
