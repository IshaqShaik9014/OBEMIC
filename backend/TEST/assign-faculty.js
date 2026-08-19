const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const fac = await prisma.user.findFirst({ where: { email: 'faculty@college.edu' } });
  if (!fac) return console.log('Faculty not found');
  
  // reset password
  const hash = await bcrypt.hash('password123', 10);
  await prisma.user.update({ where: { id: fac.id }, data: { passwordHash: hash } });
  console.log('Password reset to password123');

  // get ME subject
  let sub = await prisma.subject.findFirst({ where: { subjectCode: '23ME5T01' } });
  if (!sub) {
    console.log('23ME5T01 not found, finding any MECH subject...');
    const dept = await prisma.department.findFirst({ where: { departmentName: 'Mechanical' } });
    sub = await prisma.subject.findFirst({ where: { departmentId: dept.id } });
  }
  if (!sub) return console.log('No subject found');

  // assign
  const sem = await prisma.semester.findFirst({ include: { academicYear: true } });
  
  await prisma.facultyAssignment.create({
    data: {
      facultyId: fac.id,
      subjectId: sub.id,
      semesterId: sem.id,
      academicYearId: sem.academicYearId,
      status: 'ACTIVE'
    }
  });
  console.log('Assigned ' + fac.email + ' to ' + sub.subjectCode);
}
main().catch(console.error).finally(() => prisma.$disconnect());
