const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const assignments = await prisma.facultyAssignment.findMany({
    include: { faculty: true, subject: { include: { department: true } } }
  });
  console.log('Assignments:');
  assignments.forEach(a => {
    console.log('Faculty: ' + a.faculty.name + ', Email: ' + a.faculty.email + ', Subject: ' + a.subject.subjectCode);
  });
  
  if (assignments.length === 0) {
    console.log('No assignments found! Checking all users...');
    const users = await prisma.user.findMany({ include: { role: true } });
    users.filter(u => u.role.roleName === 'FACULTY').forEach(f => console.log('Faculty: ' + f.name + ', Email: ' + f.email));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
