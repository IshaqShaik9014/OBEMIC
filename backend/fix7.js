const fs = require('fs');
let code = fs.readFileSync('src/services/report.service.ts', 'utf8');

const findSubjectStr = \const subject = await prisma.subject.findUnique({
      where: { subjectCode },
      include: { 
        department: true, 
        semester: { include: { academicYear: true } },
        courseOutcomes: true
      }
    });\;

const newFindSubjectStr = \const subject = await prisma.subject.findUnique({
      where: { subjectCode },
      include: { 
        department: true, 
        courseOutcomes: true
      }
    });

    if (!subject) throw new Error(\\\Subject Code '\\\' found in Excel does not exist in the database. Please contact Admin.\\\);

    const assignment = await prisma.facultyAssignment.findFirst({
      where: { facultyId, subjectId: subject.id },
      include: { semester: { include: { academicYear: true } }, section: true }
    });

    if (!assignment) throw new Error('You are not assigned to this subject. Please contact Admin.');
    
    subject.semester = assignment.semester;\;

// Also we need to fix the duplicate if(!subject) block
code = code.replace(/const subject = await prisma\.subject\.findUnique\(\{\s*where: \{ subjectCode \},\s*include: \{ \s*department: true, \s*semester: \{ include: \{ academicYear: true \} \},\s*courseOutcomes: true\s*\}\s*\}\);\s*if \(!subject\) \{\s*throw new Error\(Subject Code '\$\{subjectCode\}' found in Excel does not exist in the database\. Please contact Admin\.\);\s*\}/g, newFindSubjectStr);

fs.writeFileSync('src/services/report.service.ts', code);
console.log('Fixed report.service.ts');
