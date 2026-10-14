import prisma from '../../database';
import bcrypt from 'bcrypt';
import { RoleName, UserStatus, ConfigScope } from '@prisma/client';
import {
  DEFAULT_PROGRAM_OUTCOMES,
  DEFAULT_PROGRAM_EDUCATIONAL_OBJECTIVES,
  getDepartmentPSOs
} from '../../database/outcomeSeeds';

export class DatabaseMaintenanceService {
  /**
   * Clears all uploaded/transient records while preserving and restoring the master seed data.
   */
  public async clearUploadedData(currentAdminUserId?: string) {
    // 1. Truncate all dynamic tables to guarantee zero orphan FK relationships or conflict leftovers
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        "SurveyRating",
        "SurveyResponse",
        "Survey",
        "AttainmentThresholdHistory",
        "AttainmentConfiguration",
        "ReportHistory",
        "AuditLog",
        "ImportBatch",
        "CoPoMapping",
        "CourseOutcome",
        "FacultyAssignment",
        "StudentEnrollment",
        "Student",
        "FacultyProfile",
        "Subject",
        "Section",
        "Semester",
        "AcademicYear",
        "Regulation",
        "ProgramSpecificObjective",
        "ProgramEducationalObjective",
        "ProgramOutcome",
        "User",
        "Department",
        "Role"
      CASCADE;
    `);

    // 2. Roles
    const roles = [RoleName.ADMIN, RoleName.FACULTY, RoleName.COORDINATOR, RoleName.MANAGEMENT];
    const roleMap: Record<string, string> = {};
    for (const roleName of roles) {
      const r = await prisma.role.create({ data: { roleName } });
      roleMap[roleName] = r.id;
    }

    // 3. Master Departments (including all multi-token branches)
    const deptNames = ['CSE', 'IT', 'Mechanical', 'ECE', 'EEE', 'CIVIL', 'AIDS', 'AIML', 'H&S', 'MBA'];
    const deptMap: Record<string, string> = {};
    for (const d of deptNames) {
      const dept = await prisma.department.create({ data: { departmentName: d } });
      deptMap[d] = dept.id;
    }

    // 4. Academic Year & Semesters (Master Seed: 2025-2026, 3-1 + full progression)
    const academicYear = await prisma.academicYear.create({
      data: { year: '2025-2026' }
    });

    const semList = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
    const semMap: Record<string, string> = {};
    for (const sem of semList) {
      const s = await prisma.semester.create({
        data: {
          semester: sem,
          academicYearId: academicYear.id
        }
      });
      semMap[sem] = s.id;
    }

    // 5. Regulations
    const regulations = ['23', 'MIC23', 'VR20'];
    const regMap: Record<string, string> = {};
    for (const reg of regulations) {
      const r = await prisma.regulation.create({ data: { name: reg } });
      regMap[reg] = r.id;
    }

    // 6. Master Outcomes: Program Outcomes (PO1-PO12), PEOs (PEO1-PEO4), and PSOs
    for (const po of DEFAULT_PROGRAM_OUTCOMES) {
      await prisma.programOutcome.create({ data: po });
    }

    for (const peo of DEFAULT_PROGRAM_EDUCATIONAL_OBJECTIVES) {
      await prisma.programEducationalObjective.create({ data: peo });
    }

    for (const [deptName, deptId] of Object.entries(deptMap)) {
      const psoList = getDepartmentPSOs(deptName);
      for (const pso of psoList) {
        await prisma.programSpecificObjective.create({
          data: {
            code: pso.code,
            title: pso.title,
            description: pso.description,
            departmentId: deptId
          }
        });
      }
    }

    // 7. Master Seed Users (Password: password123)
    const passwordHash = await bcrypt.hash('password123', 10);

    // System Admin (Use current admin user ID if available so session token stays valid!)
    const adminUser = await prisma.user.create({
      data: {
        id: currentAdminUserId || undefined,
        name: 'System Admin',
        email: 'admin@college.edu',
        passwordHash,
        roleId: roleMap[RoleName.ADMIN],
        departmentId: deptMap['CSE'],
        status: UserStatus.ACTIVE
      }
    });

    // Master Faculty: John Doe
    await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'faculty@college.edu',
        passwordHash,
        roleId: roleMap[RoleName.FACULTY],
        departmentId: deptMap['CSE'],
        status: UserStatus.ACTIVE
      }
    });

    // Master Faculty: Dr. Kumar (employeeId: 2225)
    const drKumar = await prisma.user.create({
      data: {
        name: 'Dr. Kumar',
        email: 'kumar@college.edu',
        employeeId: '2225',
        passwordHash,
        roleId: roleMap[RoleName.FACULTY],
        departmentId: deptMap['Mechanical'],
        status: UserStatus.ACTIVE
      }
    });

    // Master Faculty: Dr. Ravi (employeeId: 2226)
    const drRavi = await prisma.user.create({
      data: {
        name: 'Dr. Ravi',
        email: 'ravi@college.edu',
        employeeId: '2226',
        passwordHash,
        roleId: roleMap[RoleName.FACULTY],
        departmentId: deptMap['Mechanical'],
        status: UserStatus.ACTIVE
      }
    });

    // 8. Master Sections: Mechanical A & B
    const secMechA = await prisma.section.create({
      data: { sectionName: 'A', departmentId: deptMap['Mechanical'], academicYearId: academicYear.id }
    });
    const secMechB = await prisma.section.create({
      data: { sectionName: 'B', departmentId: deptMap['Mechanical'], academicYearId: academicYear.id }
    });

    // 9. Master Subjects: CS301 (Operating Systems) & 23ME3T01 (NM&TT)
    await prisma.subject.create({
      data: {
        subjectCode: 'CS301',
        subjectName: 'Operating Systems',
        credits: 3,
        semesterLevel: '3-1',
        departmentId: deptMap['CSE'],
        regulationId: regMap['23']
      }
    });

    const subjectNMTT = await prisma.subject.create({
      data: {
        subjectCode: '23ME3T01',
        subjectName: 'NM&TT',
        credits: 3,
        semesterLevel: '3-1',
        departmentId: deptMap['Mechanical'],
        regulationId: regMap['23']
      }
    });

    // 10. Master Course Outcomes for 23ME3T01
    const cos = [
      { coCode: 'CO1', description: 'Determine efficiency of jet' },
      { coCode: 'CO2', description: 'Determine efficiencies of turbines' },
      { coCode: 'CO3', description: 'Determine efficiencies of pumps' },
      { coCode: 'CO4', description: 'Determine discharge coefficient' },
      { coCode: 'CO5', description: 'Determine friction factor' }
    ];
    const createdCOs: any[] = [];
    for (const co of cos) {
      const created = await prisma.courseOutcome.create({
        data: { coCode: co.coCode, description: co.description, subjectId: subjectNMTT.id }
      });
      createdCOs.push(created);
    }

    // 11. Master Faculty Assignments
    const assignmentKumar = await prisma.facultyAssignment.create({
      data: {
        facultyId: drKumar.id,
        subjectId: subjectNMTT.id,
        academicYearId: academicYear.id,
        semesterId: semMap['3-1'],
        sectionId: secMechA.id
      }
    });

    await prisma.facultyAssignment.create({
      data: {
        facultyId: drRavi.id,
        subjectId: subjectNMTT.id,
        academicYearId: academicYear.id,
        semesterId: semMap['3-1'],
        sectionId: secMechB.id
      }
    });

    // 12. Master Students (22ME001 to 22ME005) & Enrollments
    const dummyStudents = [
      { rollNumber: '22ME001', name: 'Rahul Kumar' },
      { rollNumber: '22ME002', name: 'Priya Sharma' },
      { rollNumber: '22ME003', name: 'Arjun Reddy' },
      { rollNumber: '22ME004', name: 'Sneha Patel' },
      { rollNumber: '22ME005', name: 'Vikram Singh' }
    ];

    const studentPasswordHash = await bcrypt.hash('student@123', 10);
    const createdStudents: any[] = [];
    for (const s of dummyStudents) {
      const student = await prisma.student.create({
        data: {
          rollNumber: s.rollNumber,
          name: s.name,
          passwordHash: studentPasswordHash
        }
      });
      createdStudents.push(student);

      await prisma.studentEnrollment.create({
        data: {
          studentId: student.id,
          departmentId: deptMap['Mechanical'],
          semesterId: semMap['3-1'],
          academicYearId: academicYear.id,
          sectionId: secMechA.id
        }
      });
    }

    // 13. Master Open Survey & Sample Ratings
    const survey = await prisma.survey.create({
      data: {
        title: 'Mid-Sem Course Outcome Survey',
        academicYearId: academicYear.id,
        semesterId: semMap['3-1'],
        status: 'OPEN',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    const rahulRatings = [5, 4, 4, 5, 5];
    const priyaRatings = [4, 4, 5, 4, 5];
    const arjunRatings = [3, 4, 4, 5, 4];
    const sampleRatings = [rahulRatings, priyaRatings, arjunRatings];

    for (let i = 0; i < 3; i++) {
      const student = createdStudents[i];
      const response = await prisma.surveyResponse.create({
        data: {
          surveyId: survey.id,
          studentId: student.id,
          facultyAssignmentId: assignmentKumar.id
        }
      });

      for (let j = 0; j < createdCOs.length; j++) {
        await prisma.surveyRating.create({
          data: {
            surveyResponseId: response.id,
            courseOutcomeId: createdCOs[j].id,
            rating: sampleRatings[i][j]
          }
        });
      }
    }

    // 14. Master Attainment Configuration
    await prisma.attainmentConfiguration.create({
      data: {
        scopeType: ConfigScope.GLOBAL,
        threshold: 65,
        isActive: true,
        updatedBy: adminUser.id
      }
    });

    return {
      success: true,
      message: 'All uploaded and non-seed records cleared successfully! Master seed data (departments, regulations, core subjects CS301 & 23ME3T01, faculty & students) preserved intact.',
      preservedAdmin: 'admin@college.edu',
      masterSubjects: ['CS301 (Operating Systems)', '23ME3T01 (NM&TT)'],
      sessionPreserved: !!currentAdminUserId
    };
  }
}
