const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.semester.create({
    data: {
      semester: '2-1',
      academicYearId: '716a874d-f2bb-45a0-b239-32d91b369bae'
    }
  });
  console.log('Created Semester 2-1');
}
main().catch(console.error).finally(() => prisma.$disconnect());
