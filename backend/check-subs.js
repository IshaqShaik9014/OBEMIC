const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const subs = await prisma.subject.findMany();
  console.log('Subjects:', subs.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
