const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const years = await prisma.academicYear.findMany();
  console.log('Academic Years:', years);
  const sems = await prisma.semester.findMany();
  console.log('Semesters:', sems);
}
main().catch(console.error).finally(() => prisma.$disconnect());
