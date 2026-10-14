import prisma from '../src/database/index';
import {
  DEFAULT_PROGRAM_OUTCOMES,
  DEFAULT_PROGRAM_EDUCATIONAL_OBJECTIVES,
  getDepartmentPSOs
} from '../src/database/outcomeSeeds';

async function main() {
  console.log('Seeding POs, PEOs, and PSOs...');

  for (const po of DEFAULT_PROGRAM_OUTCOMES) {
    await prisma.programOutcome.upsert({
      where: { code: po.code },
      update: { title: po.title, description: po.description },
      create: po
    });
  }

  for (const peo of DEFAULT_PROGRAM_EDUCATIONAL_OBJECTIVES) {
    await prisma.programEducationalObjective.upsert({
      where: { code: peo.code },
      update: { title: peo.title, description: peo.description },
      create: peo
    });
  }

  const depts = await prisma.department.findMany();
  for (const dept of depts) {
    const psoList = getDepartmentPSOs(dept.departmentName);
    for (const pso of psoList) {
      await prisma.programSpecificObjective.upsert({
        where: { code_departmentId: { code: pso.code, departmentId: dept.id } },
        update: { title: pso.title, description: pso.description },
        create: {
          code: pso.code,
          title: pso.title,
          description: pso.description,
          departmentId: dept.id
        }
      });
    }
  }

  console.log('Successfully seeded outcomes!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
