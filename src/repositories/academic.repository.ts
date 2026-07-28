import prisma from '../database';

export class AcademicRepository {
  // Departments
  async getAllDepartments() {
    return prisma.department.findMany({
      include: { sections: true, subjects: true }
    });
  }

  // Academic Years
  async createAcademicYear(year: string) {
    return prisma.academicYear.create({ data: { year } });
  }

  async getAllAcademicYears() {
    return prisma.academicYear.findMany({
      include: { semesters: true, sections: true }
    });
  }

  // Semesters
  async createSemester(semester: string, academicYearId: string) {
    return prisma.semester.create({
      data: { semester, academicYearId }
    });
  }

  async getSemestersByYear(academicYearId: string) {
    return prisma.semester.findMany({
      where: { academicYearId },
      include: { subjects: true }
    });
  }

  // Subjects
  async createSubject(data: { subjectCode: string; subjectName: string; credits?: number; semesterId: string; departmentId: string }) {
    return prisma.subject.create({ data });
  }

  async getAllSubjects() {
    return prisma.subject.findMany({
      where: { isDeleted: false },
      include: { semester: true, department: true }
    });
  }

  // Sections
  async createSection(data: { sectionName: string; departmentId: string; academicYearId: string }) {
    return prisma.section.create({ data });
  }

  // Faculty Assignments
  async assignFacultyToSubject(facultyId: string, subjectId: string, academicYearId: string, sectionId?: string | null, assignedBy?: string) {
    return prisma.facultyAssignment.upsert({
      where: {
        facultyId_subjectId_academicYearId_sectionId: {
          facultyId,
          subjectId,
          academicYearId,
          sectionId: (sectionId || '') as string
        }
      },
      update: {
        status: 'ACTIVE',
        unassignedAt: null,
        assignedBy: assignedBy,
        updatedAt: new Date()
      },
      create: {
        facultyId,
        subjectId,
        academicYearId,
        sectionId: sectionId || null,
        status: 'ACTIVE',
        assignedBy: assignedBy
      }
    });
  }

  async unassignFacultyFromSubject(assignmentId: string) {
    return prisma.facultyAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'INACTIVE',
        unassignedAt: new Date()
      }
    });
  }

  async getFacultyAssignments(facultyId: string) {
    return prisma.facultyAssignment.findMany({
      where: { facultyId },
      include: { subject: true, academicYear: true }
    });
  }
}
