const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const roll = '23H71A0405';
  const student = await prisma.student.findUnique({
    where: { rollNumber: roll },
    include: { enrollments: { include: { semester: true, academicYear: true, section: true } } }
  });
  
  if (!student) return console.log('Student not found');
  console.log('Student Enrollments: ', student.enrollments.length);
  
  for (const enr of student.enrollments) {
    console.log('- AY: ' + enr.academicYear.year + ', Sem: ' + enr.semester.semester + ', Section: ' + enr.section.sectionName);
    
    const survey = await prisma.survey.findFirst({
      where: { academicYearId: enr.academicYearId, semesterId: enr.semesterId, status: 'OPEN' }
    });
    console.log('  > OPEN Survey? ' + (survey ? 'Yes (ID: ' + survey.id + ')' : 'NO'));
    
    const assignments = await prisma.facultyAssignment.findMany({
      where: { academicYearId: enr.academicYearId, semesterId: enr.semesterId, sectionId: enr.sectionId, status: 'ACTIVE' },
      include: { subject: true }
    });
    console.log('  > Active Faculty Assignments for this section: ' + assignments.length);
    assignments.forEach(a => console.log('    - Subject: ' + a.subject.subjectCode));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
