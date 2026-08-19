const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const roll = '23H71A0405';
  const student = await prisma.student.findUnique({ where: { rollNumber: roll } });
  
  const activeEnrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: student.id },
    orderBy: { updatedAt: 'desc' }
  });
  console.log('Active Enrollment:', activeEnrollment);

  const survey = await prisma.survey.findFirst({
    where: {
      academicYearId: activeEnrollment.academicYearId,
      semesterId: activeEnrollment.semesterId,
      status: 'OPEN'
    }
  });
  console.log('Open Survey:', survey ? survey.id : 'NONE');

  const assignments = await prisma.facultyAssignment.findMany({
    where: {
      academicYearId: activeEnrollment.academicYearId,
      semesterId: activeEnrollment.semesterId,
      sectionId: activeEnrollment.sectionId,
      status: 'ACTIVE'
    },
    include: { subject: true }
  });
  console.log('Assignments matching Enrolled Section:', assignments.length);
  assignments.forEach(a => console.log(' -> ' + a.subject.subjectCode));

  // Check if they already submitted!
  if (assignments.length > 0 && survey) {
      for (const a of assignments) {
          const res = await prisma.surveyResponse.findFirst({
              where: { surveyId: survey.id, studentId: student.id, facultyAssignmentId: a.id }
          });
          console.log(' -> Has submitted ' + a.subject.subjectCode + '? ' + (res ? 'YES' : 'NO'));
      }
  }

}
main().catch(console.error).finally(() => prisma.$disconnect());
