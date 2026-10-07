import prisma from '../src/database';

async function main() {
  console.log('🧹 Wiping all sandboxed load test data...');
  const startTime = Date.now();

  const testStudents = await prisma.student.findMany({
    where: { rollNumber: { startsWith: 'STU_TEST_' } },
    select: { id: true }
  });
  const studentIds = testStudents.map(s => s.id);

  if (studentIds.length > 0) {
    const responses = await prisma.surveyResponse.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true }
    });
    const respIds = responses.map(r => r.id);

    if (respIds.length > 0) {
      await prisma.surveyRating.deleteMany({
        where: { surveyResponseId: { in: respIds } }
      });
      await prisma.surveyResponse.deleteMany({
        where: { id: { in: respIds } }
      });
    }

    await prisma.studentEnrollment.deleteMany({
      where: { studentId: { in: studentIds } }
    });

    await prisma.student.deleteMany({
      where: { id: { in: studentIds } }
    });
  }

  const testSubject = await prisma.subject.findUnique({
    where: { subjectCode: '23CS3T01_TEST' }
  });

  if (testSubject) {
    await prisma.facultyAssignment.deleteMany({
      where: { subjectId: testSubject.id }
    });

    const cos = await prisma.courseOutcome.findMany({
      where: { subjectId: testSubject.id },
      select: { id: true }
    });
    const coIds = cos.map(c => c.id);

    await prisma.coPoMapping.deleteMany({
      where: { courseOutcomeId: { in: coIds } }
    });

    await prisma.courseOutcome.deleteMany({
      where: { id: { in: coIds } }
    });

    await prisma.subject.delete({
      where: { id: testSubject.id }
    });
  }

  await prisma.survey.deleteMany({
    where: { title: 'Load Test Course End Survey 2025-2026' }
  });

  console.log(`✅ Cleaned up ${studentIds.length} test students and test subject in ${((Date.now() - startTime)/1000).toFixed(2)}s. DB is clean!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
