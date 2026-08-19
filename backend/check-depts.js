const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const depts = await prisma.department.findMany();
  console.log('Departments in DB:');
  depts.forEach(d => console.log(d.departmentName));
}
main().catch(console.error).finally(() => prisma.$disconnect());
