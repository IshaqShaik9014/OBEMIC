const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const s = await prisma.student.findUnique({ where: { rollNumber: '22ME002' } });
  console.log(s);
}
main().catch(console.error).finally(() => prisma.$disconnect());
