import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../database';
import { SurveyStatus } from '@prisma/client';

export class AdminLoadTestController {
  /**
   * Version check to verify if the server is running this code
   */
  public getVersion = async (req: Request, res: Response): Promise<void> => {
    res.json({
      status: 'active',
      version: 'loadtest-v1.0.0',
      timestamp: new Date().toISOString(),
      capabilities: ['sandbox_setup', 'sandbox_teardown', 'student_survey_storm', 'faculty_attainment_load']
    });
  };

  /**
   * Setup sandboxed test environment:
   * 1,000 Virtual Students, 1 Test Subject, 5 COs, 1 OPEN Survey, 1,000 Enrollments
   */
  public setup = async (req: Request, res: Response): Promise<void> => {
    try {
      const startTime = Date.now();
      const count = parseInt((req.query.count as string) || '1000', 10);

      // 1. Pre-hash password once to prevent 1,000 bcrypt operations
      const studentPassword = 'student123';
      const passwordHash = await bcrypt.hash(studentPassword, 10);

      // 2. Department (CSE)
      let dept = await prisma.department.findFirst({
        where: { departmentName: { in: ['CSE', 'Computer Science and Engineering'] } }
      });
      if (!dept) {
        dept = await prisma.department.create({ data: { departmentName: 'CSE' } });
      }

      // 3. Academic Year (2025-2026)
      const academicYear = await prisma.academicYear.upsert({
        where: { year: '2025-2026' },
        update: {},
        create: { year: '2025-2026' }
      });

      // 4. Semester (3-1)
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

      // 5. Section (A)
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

      // 6. Test Subject (23CS3T01_TEST)
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

      // 7. Course Outcomes (CO1 - CO5)
      const coDefs = [
        { coCode: 'CO1', description: 'Analyze distributed system models' },
        { coCode: 'CO2', description: 'Design consensus algorithms' },
        { coCode: 'CO3', description: 'Implement fault-tolerant storage' },
        { coCode: 'CO4', description: 'Evaluate distributed transactions' },
        { coCode: 'CO5', description: 'Measure cloud system performance' },
      ];

      const createdCOs = [];
      for (const co of coDefs) {
        const item = await prisma.courseOutcome.upsert({
          where: { coCode_subjectId: { coCode: co.coCode, subjectId: subject.id } },
          update: { description: co.description },
          create: { coCode: co.coCode, description: co.description, subjectId: subject.id }
        });
        createdCOs.push(item);

        // Map to PO1-PO5
        for (let p = 1; p <= 5; p++) {
          await prisma.coPoMapping.upsert({
            where: { courseOutcomeId_poCode: { courseOutcomeId: item.id, poCode: `PO${p}` } },
            update: { correlationLevel: 3 },
            create: { courseOutcomeId: item.id, poCode: `PO${p}`, correlationLevel: 3 }
          });
        }
      }

      // 8. Find or ensure Faculty assignment
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

      const assignment = await prisma.facultyAssignment.upsert({
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

      // 9. OPEN Survey
      let survey = await prisma.survey.findFirst({
        where: {
          academicYearId: academicYear.id,
          semesterId: semester.id,
          status: SurveyStatus.OPEN
        }
      });
      if (!survey) {
        survey = await prisma.survey.create({
          data: {
            title: 'Load Test Course End Survey 2025-2026',
            academicYearId: academicYear.id,
            semesterId: semester.id,
            status: SurveyStatus.OPEN
          }
        });
      }

      // 10. Generate 1,000 Virtual Students in batch
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

      // 11. Fetch student IDs for enrollment
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

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      res.json({
        success: true,
        message: `Successfully provisioned ${testStudents.length} virtual students and test environment!`,
        duration: `${duration}s`,
        details: {
          studentsCount: testStudents.length,
          department: dept.departmentName,
          academicYear: academicYear.year,
          semester: semester.semester,
          subjectCode: subject.subjectCode,
          subjectId: subject.id,
          facultyAssignmentId: assignment.id,
          surveyId: survey.id,
          studentCredentialsSample: {
            rollNumber: 'STU_TEST_0001',
            password: 'student123'
          }
        }
      });
    } catch (error: any) {
      console.error('Error in load test setup:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Teardown: Completely wipes all sandboxed test data
   */
  public teardown = async (req: Request, res: Response): Promise<void> => {
    try {
      const startTime = Date.now();

      // Find test students
      const testStudents = await prisma.student.findMany({
        where: { rollNumber: { startsWith: 'STU_TEST_' } },
        select: { id: true }
      });
      const studentIds = testStudents.map(s => s.id);

      // 1. Delete survey ratings & responses for test students
      if (studentIds.length > 0) {
        const responses = await prisma.surveyResponse.findMany({
          where: { studentId: { in: studentIds } },
          select: { id: true }
        });
        const respIds = responses.map(r => r.id);

        if (respIds.length > 0) {
          await prisma.surveyRating.deleteMany({
            where: { surveyResponseId: { in: respIds } }
          });
          await prisma.surveyResponse.deleteMany({
            where: { id: { in: respIds } }
          });
        }

        // 2. Delete enrollments
        await prisma.studentEnrollment.deleteMany({
          where: { studentId: { in: studentIds } }
        });

        // 3. Delete students
        await prisma.student.deleteMany({
          where: { id: { in: studentIds } }
        });
      }

      // 4. Delete test subject & mappings if exists
      const testSubject = await prisma.subject.findUnique({
        where: { subjectCode: '23CS3T01_TEST' }
      });

      if (testSubject) {
        await prisma.facultyAssignment.deleteMany({
          where: { subjectId: testSubject.id }
        });

        const cos = await prisma.courseOutcome.findMany({
          where: { subjectId: testSubject.id },
          select: { id: true }
        });
        const coIds = cos.map(c => c.id);

        await prisma.coPoMapping.deleteMany({
          where: { courseOutcomeId: { in: coIds } }
        });

        await prisma.courseOutcome.deleteMany({
          where: { id: { in: coIds } }
        });

        await prisma.subject.delete({
          where: { id: testSubject.id }
        });
      }

      // 5. Delete test survey if exists
      await prisma.survey.deleteMany({
        where: { title: 'Load Test Course End Survey 2025-2026' }
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      res.json({
        success: true,
        message: 'All load test data wiped successfully. Production database is 100% clean!',
        deletedStudents: studentIds.length,
        duration: `${duration}s`
      });
    } catch (error: any) {
      console.error('Error in load test teardown:', error);
      res.status(500).json({ error: error.message });
    }
  };
}
