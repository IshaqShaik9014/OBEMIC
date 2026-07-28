import { AcademicRepository } from '../repositories/academic.repository';

export class AcademicService {
  private repo = new AcademicRepository();

  async getDepartments() {
    return this.repo.getAllDepartments();
  }

  async createAcademicYear(year: string) {
    if (!year.match(/^\d{4}-\d{4}$/)) {
      throw new Error('Invalid academic year format. Use YYYY-YYYY');
    }
    return this.repo.createAcademicYear(year);
  }

  async getAcademicYears() {
    return this.repo.getAllAcademicYears();
  }

  async createSemester(semester: string, academicYearId: string) {
    return this.repo.createSemester(semester, academicYearId);
  }

  async createSubject(data: { subjectCode: string; subjectName: string; credits?: number; semesterId: string; departmentId: string }) {
    // We could add business validation here, e.g. checking if subjectCode exists
    return this.repo.createSubject(data);
  }

  async getAllSubjects() {
    return this.repo.getAllSubjects();
  }

  async createSection(data: { sectionName: string; departmentId: string; academicYearId: string }) {
    return this.repo.createSection(data);
  }

  async assignFaculty(facultyId: string, subjectId: string, academicYearId: string, sectionId?: string | null, assignedBy?: string) {
    return this.repo.assignFacultyToSubject(facultyId, subjectId, academicYearId, sectionId, assignedBy);
  }

  async unassignFaculty(assignmentId: string) {
    return this.repo.unassignFacultyFromSubject(assignmentId);
  }

  async getFacultyAssignments(facultyId: string) {
    return this.repo.getFacultyAssignments(facultyId);
  }
}
