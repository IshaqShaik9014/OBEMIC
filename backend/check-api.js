const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const roll = '23H71A0405';
  const student = await prisma.student.findUnique({ where: { rollNumber: roll } });
  
  const activeEnrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: student.id },
    orderBy: { updatedAt: 'desc' }
  });

  const survey = await prisma.survey.findFirst({
    where: {
      academicYearId: activeEnrollment.academicYearId,
      semesterId: activeEnrollment.semesterId,
      status: 'OPEN'
    }
  });

  if (!survey) return console.log('NO OPEN SURVEY');

  const assignments = await prisma.facultyAssignment.findMany({
    where: {
      academicYearId: activeEnrollment.academicYearId,
      semesterId: activeEnrollment.semesterId,
      sectionId: activeEnrollment.sectionId,
      status: 'ACTIVE'
    },
    include: {
      subject: true,
      faculty: { select: { name: true } }
    }
  });

  const pendingSubjects = [];
  for (const a of assignments) {
      const res = await prisma.surveyResponse.findFirst({
          where: { surveyId: survey.id, studentId: student.id, facultyAssignmentId: a.id }
      });
      if (!res) {
          pendingSubjects.push({
             assignmentId: a.id,
             subjectCode: a.subject.subjectCode,
             subjectName: a.subject.subjectName,
             facultyName: a.faculty.name
          });
      }
  }
  console.log('Result:', JSON.stringify({ survey, pendingSubjects }));
}
main().catch(console.error).finally(() => prisma.$disconnect());
