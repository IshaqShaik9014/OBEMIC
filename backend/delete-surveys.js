const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.surveyRating.deleteMany();
  await prisma.surveyResponse.deleteMany();
  await prisma.survey.deleteMany();
}
main().catch(console.error).finally(() => prisma.$disconnect());
