const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const roll = '23H71A0405';
  const student = await prisma.student.findUnique({
    where: { rollNumber: roll },
    include: { enrollments: { include: { department: true } } }
  });
  console.log('Student Dept: ' + student.enrollments[0].department.departmentName);

  const assignments = await prisma.facultyAssignment.findMany({
    include: { subject: { include: { department: true } }, section: true, semester: true }
  });
  console.log('ALL Assignments in DB:');
  assignments.forEach(a => {
    console.log('- Subj: ' + a.subject.subjectCode + ', Dept: ' + a.subject.department.departmentName + ', Sem: ' + a.semester.semester + ', Section: ' + a.section?.sectionName);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
