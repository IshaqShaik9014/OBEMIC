const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const depts = ['ECE', 'EEE', 'CIVIL', 'AIDS', 'AIML'];
  for (const d of depts) {
    await prisma.department.upsert({
      where: { departmentName: d },
      update: {},
      create: { departmentName: d }
    });
  }
  console.log('Added standard departments');
}
main().catch(console.error).finally(() => prisma.$disconnect());
