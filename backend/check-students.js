const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.student.findMany();
  console.log('Students:', students.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
