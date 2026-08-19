
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const rollNumber = '22ME002';
  const newPassword = '22ME002';
  
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  
  const updatedStudent = await prisma.student.update({
    where: { rollNumber },
    data: { passwordHash }
  });
  
  console.log('Password successfully updated for:', updatedStudent.rollNumber);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

