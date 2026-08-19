const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.reportHistory.deleteMany({});
  await prisma.surveyRating.deleteMany({});
  await prisma.surveyResponse.deleteMany({});
  await prisma.facultyAssignment.deleteMany({});
  await prisma.coPoMapping.deleteMany({});
  await prisma.courseOutcome.deleteMany({});
  const deleted = await prisma.subject.deleteMany({});
  console.log('Deleted subjects:', deleted.count);
  
  // Create Regulation 23 just in case
  const reg = await prisma.regulation.upsert({
    where: { name: '23' },
    update: {},
    create: { name: '23' }
  });
  console.log('Ensured Regulation 23 exists:', reg.name);
}
main().catch(console.error).finally(() => prisma.$disconnect());
