import prisma from '../database';
import { ReportType, ReportStatus } from '@prisma/client';

export class FacultyService {
  /**
   * Retrieves all subjects assigned to a specific faculty member
   */
  public async getAssignedSubjects(facultyId: string) {
    const assignments = await prisma.facultyAssignment.findMany({
      where: { facultyId },
      include: {
        subject: { include: { department: true } }, semester: true,
        academicYear: true
      }
    });

    return assignments.map(a => ({
      assignmentId: a.id,
      academicYear: a.academicYear.year,
      subjectId: a.subject.id,
      subjectCode: a.subject.subjectCode,
      subjectName: a.subject.subjectName,
      credits: a.subject.credits,
      semester: a.semester.semester,
      department: a.subject.department.departmentName,
      departmentId: a.subject.departmentId,
      progressState: a.progressState || { indirect: false, direct: false, copo: false, overall: false }
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

  // ==========================================
  // WIZARD ENDPOINTS
  // ==========================================

  public async getSubjectCOs(subjectId: string) {
    const cos = await prisma.courseOutcome.findMany({
      where: { subjectId },
      orderBy: { coCode: 'asc' }
    });
    return cos;
  }

  public async getPOs(departmentId: string) {
    const pos = await prisma.programOutcome.findMany({ orderBy: { code: 'asc' } });
    const peos = await prisma.programEducationalObjective.findMany({ orderBy: { code: 'asc' } });
    const psos = await prisma.programSpecificObjective.findMany({
      where: { departmentId },
      orderBy: { code: 'asc' }
    });
    return { pos, peos, psos };
  }

  public async getIndirectAssessment(subjectId: string, facultyId: string) {
    // Attempt to fetch actual survey ratings from database
    const assignment = await prisma.facultyAssignment.findFirst({
      where: { subjectId, facultyId }
    });
    if (!assignment) throw new Error("Assignment not found");

    const responses = await prisma.surveyResponse.findMany({
      where: { facultyAssignmentId: assignment.id },
      include: {
        student: true,
        ratings: { include: { courseOutcome: true } }
      }
    });

    if (responses.length > 0) {
      // Process real data
      const studentScores: any[] = [];
      responses.forEach((r, idx) => {
        const scores: any = { CO1: 5, CO2: 5, CO3: 5, CO4: 5, CO5: 5 }; // default
        r.ratings.forEach(rating => {
          scores[rating.courseOutcome.coCode] = rating.rating;
        });
        studentScores.push({
          id: r.student.id,
          rollNo: r.student.rollNumber,
          name: r.student.name,
          scores
        });
      });
      return studentScores;
    }

    // If no real data, generate 5 dummy students for presentation purposes
    const dummyStudents = [
      { id: '1', rollNo: '21A1A0301', name: 'John Doe', scores: { CO1: 5, CO2: 4, CO3: 5, CO4: 5, CO5: 5 } },
      { id: '2', rollNo: '21A1A0302', name: 'Jane Smith', scores: { CO1: 4, CO2: 4, CO3: 4, CO4: 4, CO5: 4 } },
      { id: '3', rollNo: '21A1A0303', name: 'Bob Wilson', scores: { CO1: 5, CO2: 5, CO3: 5, CO4: 5, CO5: 5 } },
      { id: '4', rollNo: '21A1A0304', name: 'Alice Brown', scores: { CO1: 3, CO2: 4, CO3: 3, CO4: 4, CO5: 4 } },
      { id: '5', rollNo: '21A1A0305', name: 'Charlie Davis', scores: { CO1: 5, CO2: 4, CO3: 4, CO4: 4, CO5: 5 } },
    ];
    return dummyStudents;
  }

  public async getDirectAssessment(subjectId: string, facultyId: string) {
    // In a fully integrated system, the `data` field of ReportHistory contains the JSON percentages
    // Currently, since we bypass complex excel formula extraction, we will return standard mock direct data for the dashboard wizard.
    // If the database has `data` field populated from a real upload, we use it.
    const internalReport = await prisma.reportHistory.findFirst({
      where: { subjectId, facultyId, reportType: ReportType.INTERNAL, status: { in: [ReportStatus.GENERATED, ReportStatus.SUBMITTED, ReportStatus.APPROVED] } },
      orderBy: { generatedAt: 'desc' }
    });

    const externalReport = await prisma.reportHistory.findFirst({
      where: { subjectId, facultyId, reportType: ReportType.EXTERNAL, status: { in: [ReportStatus.GENERATED, ReportStatus.SUBMITTED, ReportStatus.APPROVED] } },
      orderBy: { generatedAt: 'desc' }
    });

    // Fallback Mock Data matching the UI
    const defaultData: any = {
      CO1: { internalPct: 60.33, internal3Scale: 1.81, externalPct: 18.67, external3Scale: 0.56, directPct: 31.17, direct3Scale: 0.94, target3Scale: 1.95 },
      CO2: { internalPct: 67.33, internal3Scale: 2.02, externalPct: 62.67, external3Scale: 1.88, directPct: 64.07, direct3Scale: 1.92, target3Scale: 1.95 },
      CO3: { internalPct: 80.67, internal3Scale: 2.42, externalPct: 16.67, external3Scale: 0.50, directPct: 35.87, direct3Scale: 1.08, target3Scale: 1.95 },
      CO4: { internalPct: 81.67, internal3Scale: 2.45, externalPct: 28.00, external3Scale: 0.84, directPct: 44.10, direct3Scale: 1.32, target3Scale: 1.95 },
      CO5: { internalPct: 85.67, internal3Scale: 2.57, externalPct: 8.33,  external3Scale: 0.25, directPct: 31.53, direct3Scale: 0.95, target3Scale: 1.95 }
    };

    let computedData: any = {};
    if (internalReport?.data && externalReport?.data) {
        const intData = internalReport.data as any;
        const extData = externalReport.data as any;

        const keys = new Set([...Object.keys(intData), ...Object.keys(extData)]);
        keys.forEach(key => {
            const intCO = intData[key] || { pct: 0, scale3: 0 };
            const extCO = extData[key] || { pct: 0, scale3: 0 };
            
            // Recalculate 3-scale linearly on-the-fly using the database percentages
            const internal3Scale = (intCO.pct / 100) * 3;
            const external3Scale = (extCO.pct / 100) * 3;

            const directPct = (0.7 * extCO.pct) + (0.3 * intCO.pct);
            const direct3Scale = (directPct / 100) * 3;
            
            computedData[key] = {
                internalPct: intCO.pct,
                internal3Scale: internal3Scale,
                externalPct: extCO.pct,
                external3Scale: external3Scale,
                directPct,
                direct3Scale,
                target3Scale: 1.8 
            };
        });
    }

    return {
      hasInternal: !!internalReport,
      hasExternal: !!externalReport,
      data: Object.keys(computedData).length > 0 ? computedData : defaultData
    };
  }

  public async getCOPOAttainment(subjectId: string, facultyId: string) {
    const cos = await prisma.courseOutcome.findMany({
      where: { subjectId },
      include: { copoMappings: true },
      orderBy: { coCode: 'asc' }
    });

    const mapping: any = {};
    for (const co of cos) {
      mapping[co.coCode] = {};
      // Initialize empty
      for (let i = 1; i <= 12; i++) mapping[co.coCode][`PO${i}`] = '';
      mapping[co.coCode]['PSO1'] = '';
      mapping[co.coCode]['PSO2'] = '';
      
      for (const m of co.copoMappings) {
        mapping[co.coCode][m.poCode] = m.correlationLevel;
      }
    }
    
    // Fallback if empty DB mapping
    if (cos.length === 0 || cos.every(co => co.copoMappings.length === 0)) {
       const mockMapping: any = {
         CO1: { PO1: 3, PO2: 3, PO3: '', PO4: '', PO5: '', PO6: 2, PO7: '', PO8: '', PO9: '', PO10: '', PO11: '', PO12: '', PSO1: 3, PSO2: 2 },
         CO2: { PO1: 3, PO2: 3, PO3: '', PO4: 1, PO5: '', PO6: 3, PO7: '', PO8: '', PO9: '', PO10: '', PO11: '', PO12: '', PSO1: 3, PSO2: 3 },
         CO3: { PO1: 3, PO2: 3, PO3: 3, PO4: '', PO5: '', PO6: '', PO7: '', PO8: '', PO9: '', PO10: '', PO11: '', PO12: '', PSO1: 3, PSO2: 1 },
         CO4: { PO1: 3, PO2: 3, PO3: 2, PO4: '', PO5: '', PO6: '', PO7: '', PO8: '', PO9: '', PO10: '', PO11: '', PO12: '', PSO1: 3, PSO2: 2 },
         CO5: { PO1: 3, PO2: 3, PO3: 2, PO4: '', PO5: '', PO6: 1, PO7: '', PO8: '', PO9: '', PO10: '', PO11: '', PO12: '', PSO1: 3, PSO2: 1 }
       };
       return mockMapping;
    }

    return mapping;
  }

  public async updateProgress(subjectId: string, facultyId: string, progressUpdates: any) {
    const assignment = await prisma.facultyAssignment.findFirst({
      where: { subjectId, facultyId }
    });
    if (!assignment) throw new Error("Assignment not found");

    const currentProgress = assignment.progressState ? (assignment.progressState as object) : {};
    const newProgress = { ...currentProgress, ...progressUpdates };

    await prisma.facultyAssignment.update({
      where: { id: assignment.id },
      data: { progressState: newProgress }
    });

    return newProgress;
  }
}
