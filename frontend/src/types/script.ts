export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  mimeType?: string;
  fileId?: string;
  children?: FileTreeNode[];
}

export interface ScriptFile {
  id: string;
  fileName: string;
  relativePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface ScriptBundle {
  id: string;
  bundleName: string;
  yearLevel: string;
  semesterLevel: string;
  month: string;
  totalFiles: number;
  totalSizeBytes: string;
  createdAt: string;
  subject: {
    id: string;
    subjectCode: string;
    subjectName: string;
  };
  department: {
    id: string;
    departmentName: string;
  };
  academicYear: {
    id: string;
    year: string;
  };
  regulation?: {
    id: string;
    name: string;
  };
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
  assignments?: FacultyAssignmentInfo[];
  fileTree?: FileTreeNode[];
}

export interface FacultyAssignmentInfo {
  id: string;
  facultyId: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'REVOKED';
  visibleFrom: string;
  visibleUntil?: string;
  notes?: string;
  faculty: {
    id: string;
    name: string;
    email: string;
    employeeId?: string;
  };
}

export interface FacultyAssignedScript {
  assignmentId: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED';
  isLocked: boolean;
  visibleFrom: string;
  visibleUntil?: string;
  notes?: string;
  assignedBy: string;
  bundle: {
    id: string;
    bundleName: string;
    subject: {
      id: string;
      subjectCode: string;
      subjectName: string;
    };
    department: {
      id: string;
      departmentName: string;
    };
    academicYear: {
      id: string;
      year: string;
    };
    regulation?: {
      id: string;
      name: string;
    };
    yearLevel: string;
    semesterLevel: string;
    month: string;
    totalFiles: number;
    totalSizeBytes: string;
    fileTree: FileTreeNode[];
    files: ScriptFile[];
  };
}

export interface MetadataOptions {
  academicYears: { id: string; year: string }[];
  regulations: { id: string; name: string }[];
  departments: { id: string; departmentName: string }[];
  yearLevels: string[];
  semesterLevels: string[];
  months: string[];
}
