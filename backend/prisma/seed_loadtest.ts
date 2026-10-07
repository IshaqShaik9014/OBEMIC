import prisma from '../src/database';
import bcrypt from 'bcrypt';
import { SurveyStatus } from '@prisma/client';

async function main() {
  console.log('🚀 Seeding 1,000 Virtual Students and Test Environment...');
  const startTime = Date.now();

  const passwordHash = await bcrypt.hash('student123', 10);

  // 1. Department
  let dept = await prisma.department.findFirst({
    where: { departmentName: { in: ['CSE', 'Computer Science and Engineering'] } }
  });
  if (!dept) {
    dept = await prisma.department.create({ data: { departmentName: 'CSE' } });
  }

  // 2. Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { year: '2025-2026' },
    update: {},
    create: { year: '2025-2026' }
  });

  // 3. Semester
  const semester = await prisma.semester.upsert({
    where: {
      semester_academicYearId: {
        semester: '3-1',
        academicYearId: academicYear.id
      }
    },
    update: {},
    create: {
      semester: '3-1',
      academicYearId: academicYear.id
    }
  });

  // 4. Section
  const section = await prisma.section.upsert({
    where: {
      sectionName_departmentId_academicYearId: {
        sectionName: 'A',
        departmentId: dept.id,
        academicYearId: academicYear.id
      }
    },
    update: {},
    create: {
      sectionName: 'A',
      departmentId: dept.id,
      academicYearId: academicYear.id
    }
  });

  // 5. Subject
  const subject = await prisma.subject.upsert({
    where: { subjectCode: '23CS3T01_TEST' },
    update: {},
    create: {
      subjectCode: '23CS3T01_TEST',
      subjectName: 'Cloud & Distributed Systems (Load Test)',
      credits: 3,
      semesterId: semester.id,
      departmentId: dept.id
    }
  });

  // 6. Course Outcomes (CO1 - CO5)
  const coDefs = [
    { coCode: 'CO1', description: 'Analyze distributed system models' },
    { coCode: 'CO2', description: 'Design consensus algorithms' },
    { coCode: 'CO3', description: 'Implement fault-tolerant storage' },
    { coCode: 'CO4', description: 'Evaluate distributed transactions' },
    { coCode: 'CO5', description: 'Measure cloud system performance' },
  ];

  for (const co of coDefs) {
    const item = await prisma.courseOutcome.upsert({
      where: { coCode_subjectId: { coCode: co.coCode, subjectId: subject.id } },
      update: { description: co.description },
      create: { coCode: co.coCode, description: co.description, subjectId: subject.id }
    });

    for (let p = 1; p <= 5; p++) {
      await prisma.coPoMapping.upsert({
        where: { courseOutcomeId_poCode: { courseOutcomeId: item.id, poCode: `PO${p}` } },
        update: { correlationLevel: 3 },
        create: { courseOutcomeId: item.id, poCode: `PO${p}`, correlationLevel: 3 }
      });
    }
  }

  // 7. Faculty
  let faculty = await prisma.user.findFirst({
    where: { email: 'faculty@college.edu' }
  });
  if (!faculty) {
    const facRole = await prisma.role.findUnique({ where: { roleName: 'FACULTY' } });
    faculty = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'faculty@college.edu',
        passwordHash: await bcrypt.hash('password123', 10),
        roleId: facRole!.id,
        departmentId: dept.id
      }
    });
  }

  // 8. Assignment
  await prisma.facultyAssignment.upsert({
    where: {
      facultyId_subjectId_academicYearId_semesterId_sectionId: {
        facultyId: faculty.id,
        subjectId: subject.id,
        academicYearId: academicYear.id,
        semesterId: semester.id,
        sectionId: section.id
      }
    },
    update: { status: 'ACTIVE' },
    create: {
      facultyId: faculty.id,
      subjectId: subject.id,
      academicYearId: academicYear.id,
      semesterId: semester.id,
      sectionId: section.id,
      status: 'ACTIVE'
    }
  });

  // 9. Survey
  let survey = await prisma.survey.findFirst({
    where: {
      academicYearId: academicYear.id,
      semesterId: semester.id,
      status: SurveyStatus.OPEN
    }
  });
  if (!survey) {
    await prisma.survey.create({
      data: {
        title: 'Load Test Course End Survey 2025-2026',
        academicYearId: academicYear.id,
        semesterId: semester.id,
        status: SurveyStatus.OPEN
      }
    });
  }

  // 10. 1,000 Students
  const count = 1000;
  const studentBatch = [];
  for (let i = 1; i <= count; i++) {
    const pad = String(i).padStart(4, '0');
    studentBatch.push({
      rollNumber: `STU_TEST_${pad}`,
      name: `Virtual Student ${pad}`,
      passwordHash: passwordHash
    });
  }

  await prisma.student.createMany({
    data: studentBatch,
    skipDuplicates: true
  });

  const testStudents = await prisma.student.findMany({
    where: { rollNumber: { startsWith: 'STU_TEST_' } },
    select: { id: true }
  });

  const enrollments = testStudents.map(s => ({
    studentId: s.id,
    departmentId: dept!.id,
    academicYearId: academicYear.id,
    semesterId: semester.id,
    sectionId: section.id,
    isActive: true
  }));

  await prisma.studentEnrollment.createMany({
    data: enrollments,
    skipDuplicates: true
  });

  console.log(`✅ Finished seeding ${testStudents.length} virtual students in ${((Date.now() - startTime)/1000).toFixed(2)}s!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
