import prisma from '../../database';
import { ScriptStorageService, FileTreeNode } from './script.storage.service';
import { ScriptAssignmentStatus } from '@prisma/client';

export interface CreateBundleDTO {
  bundleName: string;
  academicYearId: string;
  regulationId?: string;
  departmentId: string;
  yearLevel: string;
  semesterLevel: string;
  month: string;
  subjectId: string;
  uploadedById: string;
}

export interface UploadedFileInfo {
  fileName: string;
  relativePath: string;
  tempFilePath: string;
  fileSize: number;
  mimeType: string;
}

export class ScriptService {
  private storageService = new ScriptStorageService();

  /**
   * Retrieves academic metadata for filter dropdowns
   */
  public async getMetadataOptions() {
    const [academicYears, regulations, departments] = await Promise.all([
      prisma.academicYear.findMany({ orderBy: { year: 'desc' } }),
      prisma.regulation.findMany({ orderBy: { name: 'asc' } }),
      prisma.department.findMany({ orderBy: { departmentName: 'asc' } })
    ]);

    const yearLevels = ['I', 'II', 'III', 'IV'];
    const semesterLevels = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return {
      academicYears,
      regulations,
      departments,
      yearLevels,
      semesterLevels,
      months
    };
  }

  /**
   * Retrieves subjects matching selected filter criteria
   */
  public async getFilteredSubjects(filters: {
    departmentId?: string;
    regulationId?: string;
    semesterLevel?: string;
  }) {
    const where: any = { isDeleted: false };
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.regulationId) where.regulationId = filters.regulationId;
    if (filters.semesterLevel) where.semesterLevel = filters.semesterLevel;

    return prisma.subject.findMany({
      where,
      include: {
        department: true,
        regulation: true,
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            faculty: {
              select: { id: true, name: true, email: true, employeeId: true }
            }
          }
        },
        _count: {
          select: { scriptBundles: { where: { isDeleted: false } } }
        }
      },
      orderBy: { subjectCode: 'asc' }
    });
  }

  /**
   * Retrieves faculty members linked to a subject (or in the same department)
   */
  public async getSubjectLinkedFaculty(subjectId: string) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            faculty: {
              select: { id: true, name: true, email: true, employeeId: true }
            }
          }
        }
      }
    });

    if (!subject) throw new Error('Subject not found');

    // Extract actively assigned faculty
    const linkedFacultyMap = new Map<string, any>();
    for (const a of subject.assignments) {
      if (a.faculty) {
        linkedFacultyMap.set(a.faculty.id, {
          ...a.faculty,
          isDirectlyAssigned: true
        });
      }
    }

    // Also fetch other faculty in this department for assignment flexibility
    const deptFaculty = await prisma.user.findMany({
      where: {
        departmentId: subject.departmentId,
        status: 'ACTIVE',
        isDeleted: false,
        role: { roleName: 'FACULTY' }
      },
      select: { id: true, name: true, email: true, employeeId: true }
    });

    for (const f of deptFaculty) {
      if (!linkedFacultyMap.has(f.id)) {
        linkedFacultyMap.set(f.id, {
          ...f,
          isDirectlyAssigned: false
        });
      }
    }

    return Array.from(linkedFacultyMap.values());
  }

  /**
   * Retrieves Branch Coordinators (users with COORDINATOR or ADMIN role) for a department
   */
  public async getBranchCoordinators(departmentId?: string) {
    const where: any = {
      status: 'ACTIVE',
      isDeleted: false,
      role: {
        roleName: { in: ['COORDINATOR', 'ADMIN'] }
      }
    };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const coordinators = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        departmentId: true,
        department: {
          select: { id: true, departmentName: true }
        },
        role: {
          select: { roleName: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return coordinators;
  }

  /**
   * Retrieves all script bundles allocated to a branch (for Branch Coordinator / HOD)
   * along with Subject Coordinator assignment info.
   */
  public async getBranchBundles(departmentId: string) {
    const bundles = await prisma.scriptBundle.findMany({
      where: {
        departmentId,
        isDeleted: false
      },
      include: {
        subject: {
          select: { id: true, subjectCode: true, subjectName: true }
        },
        department: {
          select: { id: true, departmentName: true }
        },
        academicYear: {
          select: { id: true, year: true }
        },
        regulation: {
          select: { id: true, name: true }
        },
        assignments: {
          where: { status: { not: ScriptAssignmentStatus.REVOKED } },
          include: {
            faculty: {
              select: { id: true, name: true, email: true, employeeId: true, role: { select: { roleName: true } } }
            },
            assignedBy: {
              select: { id: true, name: true, role: { select: { roleName: true } } }
            }
          },
          orderBy: { assignedAt: 'desc' }
        },
        files: {
          select: { id: true, fileName: true, relativePath: true, fileSize: true, mimeType: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return bundles.map((b) => {
      // Find assignment to faculty (Subject Coordinator) vs assignment to Coordinator
      const subjectCoordinatorAssignment = b.assignments.find(a => a.faculty.role.roleName === 'FACULTY');
      const branchCoordinatorAssignment = b.assignments.find(a => a.faculty.role.roleName === 'COORDINATOR');

      return {
        id: b.id,
        bundleName: b.bundleName,
        subject: b.subject,
        department: b.department,
        academicYear: b.academicYear,
        regulation: b.regulation,
        yearLevel: b.yearLevel,
        semesterLevel: b.semesterLevel,
        month: b.month,
        totalFiles: b.totalFiles,
        totalSizeBytes: b.totalSizeBytes.toString(),
        createdAt: b.createdAt,
        fileTree: this.storageService.buildFileTree(b.files),
        branchCoordinatorAssignment: branchCoordinatorAssignment ? {
          id: branchCoordinatorAssignment.id,
          coordinatorName: branchCoordinatorAssignment.faculty.name,
          assignedAt: branchCoordinatorAssignment.assignedAt
        } : null,
        subjectCoordinatorAssignment: subjectCoordinatorAssignment ? {
          id: subjectCoordinatorAssignment.id,
          facultyId: subjectCoordinatorAssignment.faculty.id,
          facultyName: subjectCoordinatorAssignment.faculty.name,
          facultyEmail: subjectCoordinatorAssignment.faculty.email,
          visibleFrom: subjectCoordinatorAssignment.visibleFrom,
          visibleUntil: subjectCoordinatorAssignment.visibleUntil,
          status: subjectCoordinatorAssignment.status,
          notes: subjectCoordinatorAssignment.notes
        } : null
      };
    });
  }

  /**
   * Branch Coordinator delegates a bundle to a Subject Coordinator with scheduled visibility
   */
  public async assignToSubjectCoordinator(
    bundleId: string,
    subjectCoordinatorId: string,
    branchCoordinatorId: string,
    visibleFrom: string,
    visibleUntil?: string,
    notes?: string
  ) {
    const bundle = await prisma.scriptBundle.findUnique({
      where: { id: bundleId }
    });
    if (!bundle) throw new Error('Script bundle not found');

    const faculty = await prisma.user.findUnique({
      where: { id: subjectCoordinatorId }
    });
    if (!faculty) throw new Error('Subject coordinator faculty member not found');

    const parsedVisibleFrom = new Date(visibleFrom);
    const parsedVisibleUntil = visibleUntil ? new Date(visibleUntil) : null;
    const now = new Date();

    // 2-minute tolerance for client-server clock skew so current assignments are immediately active
    const initialStatus = (now.getTime() + 120000) >= parsedVisibleFrom.getTime()
      ? ScriptAssignmentStatus.ACTIVE
      : ScriptAssignmentStatus.SCHEDULED;

    const assignment = await prisma.facultyScriptAssignment.upsert({
      where: {
        bundleId_facultyId: {
          bundleId,
          facultyId: subjectCoordinatorId
        }
      },
      update: {
        assignedById: branchCoordinatorId,
        visibleFrom: parsedVisibleFrom,
        visibleUntil: parsedVisibleUntil,
        status: initialStatus,
        notes: notes || null,
        unassignedAt: null
      },
      create: {
        bundleId,
        facultyId: subjectCoordinatorId,
        assignedById: branchCoordinatorId,
        visibleFrom: parsedVisibleFrom,
        visibleUntil: parsedVisibleUntil,
        status: initialStatus,
        notes: notes || null
      },
      include: {
        faculty: { select: { id: true, name: true, email: true } },
        bundle: { select: { id: true, bundleName: true, subjectId: true } }
      }
    });

    return assignment;
  }

  /**
   * Creates a new script bundle with multiple files preserving relative folder paths
   */
  public async createScriptBundle(bundleData: CreateBundleDTO, files: UploadedFileInfo[]) {
    if (!files || files.length === 0) {
      throw new Error('At least one script file must be uploaded');
    }

    // 1. Resolve subject and its primary department
    const subject = await prisma.subject.findUnique({
      where: { id: bundleData.subjectId }
    });
    if (!subject) throw new Error('Selected subject not found in database');

    const departmentId = subject.departmentId || bundleData.departmentId;

    // 2. Validate Academic Year
    let validAcademicYearId = bundleData.academicYearId;
    const ay = await prisma.academicYear.findUnique({
      where: { id: bundleData.academicYearId }
    });
    if (!ay) {
      const defaultAy = await prisma.academicYear.findFirst();
      if (!defaultAy) throw new Error('No academic year configured in database');
      validAcademicYearId = defaultAy.id;
    }

    // 3. Validate Regulation if provided
    let validRegulationId: string | null = null;
    if (bundleData.regulationId && bundleData.regulationId !== 'undefined' && bundleData.regulationId.trim() !== '') {
      const reg = await prisma.regulation.findUnique({
        where: { id: bundleData.regulationId }
      });
      if (reg) validRegulationId = reg.id;
    }

    // 4. Create the ScriptBundle record in database
    const bundle = await prisma.scriptBundle.create({
      data: {
        bundleName: bundleData.bundleName,
        academicYearId: validAcademicYearId,
        regulationId: validRegulationId,
        departmentId: departmentId,
        yearLevel: bundleData.yearLevel,
        semesterLevel: bundleData.semesterLevel,
        month: bundleData.month,
        subjectId: bundleData.subjectId,
        uploadedById: bundleData.uploadedById,
        totalFiles: files.length,
        totalSizeBytes: BigInt(files.reduce((acc, f) => acc + f.fileSize, 0))
      }
    });

    // 5. Persist files to disk in batches of 15 to avoid Windows filesystem concurrency locks
    const fileRecordsData: any[] = [];
    const BATCH_SIZE = 15;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          const destinationPath = await this.storageService.saveFileToBundle(
            bundle.id,
            file.tempFilePath,
            file.relativePath
          );
          return {
            bundleId: bundle.id,
            fileName: file.fileName,
            relativePath: this.storageService.sanitizeRelativePath(file.relativePath),
            fileSize: Math.floor(file.fileSize || 0),
            mimeType: file.mimeType || 'application/octet-stream',
            storagePath: destinationPath
          };
        })
      );
      fileRecordsData.push(...batchResults);
    }

    // 6. Fast batch insert into database in a single round-trip
    await prisma.scriptFile.createMany({
      data: fileRecordsData
    });

    return {
      bundle: {
        ...bundle,
        totalSizeBytes: bundle.totalSizeBytes.toString()
      },
      filesCount: fileRecordsData.length
    };
  }

  /**
   * Ingests and extracts a compressed ZIP bundle, preserving all nested folders and script images
   */
  public async createScriptBundleFromZip(bundleData: CreateBundleDTO, tempZipPath: string) {
    // 1. Resolve subject and its primary department
    const subject = await prisma.subject.findUnique({
      where: { id: bundleData.subjectId }
    });
    if (!subject) throw new Error('Selected subject not found in database');

    const departmentId = subject.departmentId || bundleData.departmentId;

    // 2. Validate Academic Year
    let validAcademicYearId = bundleData.academicYearId;
    const ay = await prisma.academicYear.findUnique({
      where: { id: bundleData.academicYearId }
    });
    if (!ay) {
      const defaultAy = await prisma.academicYear.findFirst();
      if (!defaultAy) throw new Error('No academic year configured in database');
      validAcademicYearId = defaultAy.id;
    }

    // 3. Validate Regulation if provided
    let validRegulationId: string | null = null;
    if (bundleData.regulationId && bundleData.regulationId !== 'undefined' && bundleData.regulationId.trim() !== '') {
      const reg = await prisma.regulation.findUnique({
        where: { id: bundleData.regulationId }
      });
      if (reg) validRegulationId = reg.id;
    }

    // 4. Create placeholder bundle record to get bundle.id
    const bundle = await prisma.scriptBundle.create({
      data: {
        bundleName: bundleData.bundleName,
        academicYearId: validAcademicYearId,
        regulationId: validRegulationId,
        departmentId: departmentId,
        yearLevel: bundleData.yearLevel,
        semesterLevel: bundleData.semesterLevel,
        month: bundleData.month,
        subjectId: bundleData.subjectId,
        uploadedById: bundleData.uploadedById,
        totalFiles: 0,
        totalSizeBytes: BigInt(0)
      }
    });

    // 5. Extract the ZIP archive directly into the bundle's directory
    const extractedFiles = await this.storageService.extractZipArchive(bundle.id, tempZipPath);

    if (extractedFiles.length === 0) {
      await prisma.scriptBundle.delete({ where: { id: bundle.id } });
      await this.storageService.deleteBundleDirectory(bundle.id);
      throw new Error('The uploaded ZIP archive did not contain any valid script files or images.');
    }

    // 6. Batch insert extracted file records into database
    const fileRecordsData = extractedFiles.map((file) => ({
      bundleId: bundle.id,
      fileName: file.fileName,
      relativePath: file.relativePath,
      fileSize: Math.floor(file.fileSize || 0),
      mimeType: file.mimeType,
      storagePath: file.storagePath
    }));

    await prisma.scriptFile.createMany({
      data: fileRecordsData
    });

    // 7. Update bundle with accurate total files and size
    const totalSizeBytes = BigInt(extractedFiles.reduce((acc, f) => acc + Math.floor(f.fileSize || 0), 0));
    const updatedBundle = await prisma.scriptBundle.update({
      where: { id: bundle.id },
      data: {
        totalFiles: extractedFiles.length,
        totalSizeBytes
      }
    });

    return {
      bundle: {
        ...updatedBundle,
        totalSizeBytes: updatedBundle.totalSizeBytes.toString()
      },
      filesCount: extractedFiles.length
    };
  }

  /**
   * Retrieves script bundles with assignment status
   */
  public async getBundles(filters: {
    subjectId?: string;
    departmentId?: string;
    academicYearId?: string;
  }) {
    const where: any = { isDeleted: false };
    if (filters.subjectId) where.subjectId = filters.subjectId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.academicYearId) where.academicYearId = filters.academicYearId;

    const bundles = await prisma.scriptBundle.findMany({
      where,
      include: {
        subject: {
          select: { id: true, subjectCode: true, subjectName: true }
        },
        department: {
          select: { id: true, departmentName: true }
        },
        academicYear: {
          select: { id: true, year: true }
        },
        regulation: {
          select: { id: true, name: true }
        },
        uploadedBy: {
          select: { id: true, name: true, email: true }
        },
        assignments: {
          where: { status: { not: ScriptAssignmentStatus.REVOKED } },
          include: {
            faculty: {
              select: { id: true, name: true, email: true, employeeId: true }
            }
          }
        },
        _count: {
          select: { files: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return bundles.map((b) => ({
      ...b,
      totalSizeBytes: b.totalSizeBytes.toString()
    }));
  }

  /**
   * Retrieves bundle details with full directory tree structure
   */
  public async getBundleDetails(bundleId: string) {
    const bundle = await prisma.scriptBundle.findUnique({
      where: { id: bundleId },
      include: {
        subject: true,
        department: true,
        academicYear: true,
        regulation: true,
        files: {
          select: {
            id: true,
            fileName: true,
            relativePath: true,
            fileSize: true,
            mimeType: true,
            createdAt: true
          }
        },
        assignments: {
          where: { status: { not: ScriptAssignmentStatus.REVOKED } },
          include: {
            faculty: {
              select: { id: true, name: true, email: true, employeeId: true }
            }
          }
        }
      }
    });

    if (!bundle) throw new Error('Script bundle not found');

    const tree = this.storageService.buildFileTree(bundle.files);

    return {
      ...bundle,
      totalSizeBytes: bundle.totalSizeBytes.toString(),
      fileTree: tree
    };
  }

  /**
   * Assigns a script bundle to a faculty member with a visibility timestamp
   */
  public async assignBundle(params: {
    bundleId: string;
    facultyId: string;
    assignedById: string;
    visibleFrom: string | Date;
    visibleUntil?: string | Date;
    notes?: string;
  }) {
    const { bundleId, facultyId, assignedById, visibleFrom, visibleUntil, notes } = params;

    const parsedVisibleFrom = new Date(visibleFrom);
    const parsedVisibleUntil = visibleUntil ? new Date(visibleUntil) : null;
    const now = new Date();

    const initialStatus = parsedVisibleFrom <= now
      ? ScriptAssignmentStatus.ACTIVE
      : ScriptAssignmentStatus.SCHEDULED;

    const assignment = await prisma.facultyScriptAssignment.upsert({
      where: {
        bundleId_facultyId: { bundleId, facultyId }
      },
      update: {
        assignedById,
        visibleFrom: parsedVisibleFrom,
        visibleUntil: parsedVisibleUntil,
        status: initialStatus,
        notes: notes || null,
        unassignedAt: null
      },
      create: {
        bundleId,
        facultyId,
        assignedById,
        visibleFrom: parsedVisibleFrom,
        visibleUntil: parsedVisibleUntil,
        status: initialStatus,
        notes: notes || null
      },
      include: {
        faculty: { select: { id: true, name: true, email: true } },
        bundle: { select: { id: true, bundleName: true, subjectId: true } }
      }
    });

    return assignment;
  }

  /**
   * Deassigns (revokes) a script assignment from a faculty member
   */
  public async deassignBundle(assignmentId: string) {
    const assignment = await prisma.facultyScriptAssignment.update({
      where: { id: assignmentId },
      data: {
        status: ScriptAssignmentStatus.REVOKED,
        unassignedAt: new Date()
      },
      include: {
        faculty: { select: { id: true, name: true } },
        bundle: { select: { bundleName: true } }
      }
    });

    return assignment;
  }

  /**
   * Retrieves scripts assigned to the logged-in faculty with time-gated access control
   */
  public async getFacultyScripts(facultyId: string) {
    const assignments = await prisma.facultyScriptAssignment.findMany({
      where: {
        facultyId,
        status: { not: ScriptAssignmentStatus.REVOKED }
      },
      include: {
        bundle: {
          include: {
            subject: {
              select: { id: true, subjectCode: true, subjectName: true }
            },
            department: {
              select: { id: true, departmentName: true }
            },
            academicYear: {
              select: { id: true, year: true }
            },
            regulation: {
              select: { id: true, name: true }
            },
            files: {
              select: {
                id: true,
                fileName: true,
                relativePath: true,
                fileSize: true,
                mimeType: true
              }
            }
          }
        },
        assignedBy: {
          select: { id: true, name: true }
        }
      },
      orderBy: { visibleFrom: 'desc' }
    });

    const now = new Date();

    return assignments.map((a) => {
      // 2-minute tolerance for client-server clock skew so newly assigned scripts are immediately unlocked
      const isUnlocked = (now.getTime() + 120000) >= new Date(a.visibleFrom).getTime();
      const isExpired = a.visibleUntil ? now > new Date(a.visibleUntil) : false;

      // Update DB status if it was SCHEDULED and is now unlocked
      if (isUnlocked && a.status === ScriptAssignmentStatus.SCHEDULED && !isExpired) {
        prisma.facultyScriptAssignment.update({
          where: { id: a.id },
          data: { status: ScriptAssignmentStatus.ACTIVE }
        }).catch(console.error);
      }

      // If unlocked, build full file tree
      const fileTree = isUnlocked && !isExpired
        ? this.storageService.buildFileTree(a.bundle.files)
        : [];

      return {
        assignmentId: a.id,
        status: isExpired ? 'EXPIRED' : isUnlocked ? 'ACTIVE' : 'SCHEDULED',
        isLocked: !isUnlocked || isExpired,
        visibleFrom: a.visibleFrom,
        visibleUntil: a.visibleUntil,
        notes: a.notes,
        assignedBy: a.assignedBy.name,
        assignedByRole: (a.assignedBy as any).role?.roleName || 'COORDINATOR',
        bundle: {
          id: a.bundle.id,
          bundleName: a.bundle.bundleName,
          subject: a.bundle.subject,
          department: a.bundle.department,
          academicYear: a.bundle.academicYear,
          regulation: a.bundle.regulation,
          yearLevel: a.bundle.yearLevel,
          semesterLevel: a.bundle.semesterLevel,
          month: a.bundle.month,
          totalFiles: a.bundle.totalFiles,
          totalSizeBytes: a.bundle.totalSizeBytes.toString(),
          fileTree: fileTree,
          files: isUnlocked && !isExpired ? a.bundle.files : []
        }
      };
    });
  }

  /**
   * Retrieves a file for download/viewing with strict time-gate validation
   */
  public async getFileForDownload(fileId: string, userId: string, userRole: string) {
    const file = await prisma.scriptFile.findUnique({
      where: { id: fileId },
      include: {
        bundle: {
          include: {
            assignments: {
              where: { facultyId: userId }
            }
          }
        }
      }
    });

    if (!file) throw new Error('File not found');

    // OBE In-charge, Admin, and Branch Coordinator can view anytime
    if (userRole === 'OBE_INCHARGE' || userRole === 'ADMIN' || userRole === 'COORDINATOR') {
      return file;
    }

    // For Faculty: verify active assignment and timestamp schedule
    const assignment = file.bundle.assignments.find((a) => a.facultyId === userId);
    if (!assignment || assignment.status === ScriptAssignmentStatus.REVOKED) {
      throw new Error('Access denied: You are not assigned to this script bundle');
    }

    const now = new Date();
    // 2-minute tolerance for client-server clock skew
    if ((now.getTime() + 120000) < new Date(assignment.visibleFrom).getTime()) {
      throw new Error(`Scripts are scheduled and locked until ${assignment.visibleFrom.toISOString()}`);
    }

    if (assignment.visibleUntil && now > new Date(assignment.visibleUntil)) {
      throw new Error('Access expired: The scheduled evaluation window has closed');
    }

    return file;
  }
}
