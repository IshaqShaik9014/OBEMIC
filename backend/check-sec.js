const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sec = await prisma.section.findUnique({ where: { id: '46cb0fa9-476b-4960-94d1-b000846e723e' }, include: { department: true }});
  console.log(sec);
}
main().catch(console.error).finally(() => prisma.$disconnect());
