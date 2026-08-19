const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const depts = await prisma.department.findMany();
  const regs = await prisma.regulation.findMany();
  const sems = await prisma.semester.findMany();
  const subjs = await prisma.subject.findMany({ include: { department: true, regulation: true, semester: true } });
  console.log('Departments:', depts.map(d => d.departmentName));
  console.log('Regulations:', regs.map(r => r.name));
  console.log('Semesters:', sems.map(s => s.semester));
  console.log('Subjects:', subjs.map(s => ({ code: s.subjectCode, dept: s.department?.departmentName, reg: s.regulation?.name, sem: s.semester?.semester })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
