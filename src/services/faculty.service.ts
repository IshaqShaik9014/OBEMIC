import prisma from '../database';

export class FacultyService {
  /**
   * Retrieves all subjects assigned to a specific faculty member
   */
  public async getAssignedSubjects(facultyId: string) {
    const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId },
      include: {
        subject: {
          include: {
            semester: true,
            department: true
          }
        },
        academicYear: true
      }
    });

    return assignments.map(a => ({
      assignmentId: a.id,
      academicYear: a.academicYear.year,
      subjectCode: a.subject.subjectCode,
      subjectName: a.subject.subjectName,
      credits: a.subject.credits,
      semester: a.subject.semester.semester,
      department: a.subject.department.departmentName
    }));
  }

  /**
   * Aggregates stats and recent activity for the faculty dashboard
   */
  public async getDashboardStats(facultyId: string) {
    const [assignmentsCount, reportsCount, recentReports] = await Promise.all([
      prisma.facultyAssignment.count({ where: { facultyId } }),
      prisma.reportHistory.count({ where: { facultyId, isDeleted: false } }),
      prisma.reportHistory.findMany({
        where: { facultyId, isDeleted: false },
        orderBy: { generatedAt: 'desc' },
        take: 5,
        include: { subject: true }
      })
    ]);

    return {
      stats: {
        totalSubjects: assignmentsCount,
        totalReportsGenerated: reportsCount
      },
      recentReports: recentReports.map(r => ({
        id: r.id,
        subjectCode: r.subject.subjectCode,
        reportType: r.reportType,
        status: r.status,
        generatedAt: r.generatedAt
      }))
    };
  }
}
