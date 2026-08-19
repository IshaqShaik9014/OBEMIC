const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subjects = await prisma.subject.findMany({ where: { semesterLevel: null } });
  for (const s of subjects) {
    await prisma.subject.update({
      where: { id: s.id },
      data: { semesterLevel: '2-2' }
    });
    console.log('Updated', s.subjectCode);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
