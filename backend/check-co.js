const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sub = await prisma.subject.findFirst({ where: { subjectCode: '23ME3T01' }, include: { courseOutcomes: true } });
  console.log('COs for ' + sub.subjectCode + ': ' + sub.courseOutcomes.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
