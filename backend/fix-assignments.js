const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const assignments = await prisma.facultyAssignment.findMany({ where: { sectionId: null } });
  if(assignments.length === 0) return console.log('No unassigned sections.');
  
  for (const a of assignments) {
     let section = await prisma.section.findFirst({
         where: { academicYearId: a.academicYearId } // Just grabbing any section for testing
     });
     if(!section) {
         const dept = await prisma.department.findFirst();
         section = await prisma.section.create({
             data: { sectionName: 'A', academicYearId: a.academicYearId, departmentId: dept.id }
         });
     }
     await prisma.facultyAssignment.update({
         where: { id: a.id },
         data: { sectionId: section.id }
     });
     console.log('Fixed assignment ' + a.id + ' to section ' + section.sectionName);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
