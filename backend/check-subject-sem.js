const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const subs = await prisma.subject.findMany({ select: { subjectCode: true, semesterLevel: true } });
  console.log(subs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
