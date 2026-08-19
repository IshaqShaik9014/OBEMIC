const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rollNumber = '22ME002';
  const student = await prisma.student.findUnique({ where: { rollNumber } });
  console.log('Student ID:', student.id);

  const enrollments = await prisma.studentEnrollment.findMany({ where: { studentId: student.id, isActive: true }, include: { semester: true, section: true } });
  console.log('Enrollments:', enrollments.length);
  if (enrollments.length === 0) return;
  const currentEnrollment = enrollments[0];
  console.log('Enrolled in AcademicYear:', currentEnrollment.academicYearId);
  console.log('Enrolled in Semester:', currentEnrollment.semesterId, 'Name:', currentEnrollment.semester?.semester);
  console.log('Enrolled in Section:', currentEnrollment.sectionId, 'Name:', currentEnrollment.section?.name);

  const surveys = await prisma.survey.findMany({ where: { status: 'OPEN' }});
  console.log('Open Surveys found:', surveys.map(s => ({ title: s.title, acYear: s.academicYearId, sem: s.semesterId })));

  const openSurvey = surveys.find(s => s.academicYearId === currentEnrollment.academicYearId && s.semesterId === currentEnrollment.semesterId);
  if (!openSurvey) {
     console.log('NO MATCHING SURVEY FOR ENROLLMENT!');
     return;
  }
  console.log('Found open survey:', openSurvey.title);

  const assignments = await prisma.facultyAssignment.findMany({
    where: { academicYearId: currentEnrollment.academicYearId, semesterId: currentEnrollment.semesterId, sectionId: currentEnrollment.sectionId }
  });
  console.log('Assignments for this section:', assignments.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
