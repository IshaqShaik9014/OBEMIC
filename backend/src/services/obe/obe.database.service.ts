import prisma from '../../database';
import bcrypt from 'bcrypt';
import { logger } from '../../logs/logger';

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'password';
  optionsKey?: string;
  required?: boolean;
  editable?: boolean;
  creatable?: boolean;
  showInTable?: boolean;
}

export interface EntityDefinition {
  key: string;
  label: string;
  singularLabel: string;
  description: string;
  icon: string;
  fields: FieldDefinition[];
  searchableColumns: string[];
}

export class ObeDatabaseService {
  /**
   * Return schema metadata & lookup tables for smart dropdowns
   */
  public async getMetadata() {
    // Ensure all standard roles exist in DB
    const standardRoles = ['FACULTY', 'ADMIN', 'COORDINATOR', 'MANAGEMENT', 'OBE_INCHARGE'] as const;
    for (const r of standardRoles) {
      await prisma.role.upsert({
        where: { roleName: r as any },
        update: {},
        create: { roleName: r as any }
      });
    }

    const [
      departments,
      academicYears,
      semesters,
      sections,
      regulations,
      roles,
      facultyUsers,
      subjects
    ] = await Promise.all([
      prisma.department.findMany({ orderBy: { departmentName: 'asc' } }),
      prisma.academicYear.findMany({ orderBy: { year: 'desc' } }),
      prisma.semester.findMany({
        include: { academicYear: { select: { year: true } } },
        orderBy: { semester: 'asc' }
      }),
      prisma.section.findMany({
        include: {
          department: { select: { departmentName: true } },
          academicYear: { select: { year: true } }
        },
        orderBy: { sectionName: 'asc' }
      }),
      prisma.regulation.findMany({ orderBy: { name: 'asc' } }),
      prisma.role.findMany({ orderBy: { roleName: 'asc' } }),
      prisma.user.findMany({
        where: { role: { roleName: { in: ['FACULTY', 'COORDINATOR', 'ADMIN'] } } },
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
          department: { select: { departmentName: true } }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.subject.findMany({
        select: {
          id: true,
          subjectCode: true,
          subjectName: true,
          semesterLevel: true,
          department: { select: { departmentName: true } }
        },
        orderBy: { subjectCode: 'asc' }
      })
    ]);

    const lookups = {
      departments: departments.map(d => ({ value: d.id, label: d.departmentName })),
      academicYears: academicYears.map(y => ({ value: y.id, label: y.year })),
      semesters: semesters.map(s => ({
        value: s.id,
        label: `${s.semester} (${s.academicYear?.year || 'Unknown Year'})`,
        academicYearId: s.academicYearId
      })),
      sections: sections.map(sec => ({
        value: sec.id,
        label: `Section ${sec.sectionName} - ${sec.department?.departmentName || ''} (${sec.academicYear?.year || ''})`,
        departmentId: sec.departmentId,
        academicYearId: sec.academicYearId
      })),
      regulations: regulations.map(r => ({ value: r.id, label: r.name })),
      roles: roles.map(r => ({ value: r.id, label: r.roleName })),
      facultyUsers: facultyUsers.map(f => ({
        value: f.id,
        label: `${f.name} (${f.employeeId || f.email}) - ${f.department?.departmentName || 'No Dept'}`
      })),
      subjects: subjects.map(sub => ({
        value: sub.id,
        label: `[${sub.subjectCode}] ${sub.subjectName} (${sub.department?.departmentName || ''} Sem ${sub.semesterLevel || ''})`
      })),
      rolesStatic: [
        { value: 'FACULTY', label: 'Faculty' },
        { value: 'COORDINATOR', label: 'Branch Coordinator' },
        { value: 'ADMIN', label: 'HOD / Admin' },
        { value: 'OBE_INCHARGE', label: 'OBE In-charge' },
        { value: 'MANAGEMENT', label: 'Management' }
      ],
      semesterLevels: [
        { value: '1-1', label: '1-1 (Year I, Sem 1)' },
        { value: '1-2', label: '1-2 (Year I, Sem 2)' },
        { value: '2-1', label: '2-1 (Year II, Sem 1)' },
        { value: '2-2', label: '2-2 (Year II, Sem 2)' },
        { value: '3-1', label: '3-1 (Year III, Sem 1)' },
        { value: '3-2', label: '3-2 (Year III, Sem 2)' },
        { value: '4-1', label: '4-1 (Year IV, Sem 1)' },
        { value: '4-2', label: '4-2 (Year IV, Sem 2)' }
      ]
    };

    const entities: EntityDefinition[] = [
      {
        key: 'departments',
        label: 'Departments',
        singularLabel: 'Department',
        description: 'Academic branches/departments (CSE, MECH, ECE, etc.)',
        icon: '🏛️',
        searchableColumns: ['departmentName'],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'departmentName', label: 'Department Name / Code', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'createdAt', label: 'Created At', type: 'text', editable: false, creatable: false, showInTable: true }
        ]
      },
      {
        key: 'subjects',
        label: 'Subjects / Courses',
        singularLabel: 'Subject',
        description: 'Curriculum subjects mapped to departments and semesters',
        icon: '📚',
        searchableColumns: ['subjectCode', 'subjectName'],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'subjectCode', label: 'Subject Code', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'subjectName', label: 'Subject Name', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'credits', label: 'Credits', type: 'number', required: false, editable: true, creatable: true, showInTable: true },
          { name: 'semesterLevel', label: 'Semester Level', type: 'select', optionsKey: 'semesterLevels', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'departmentId', label: 'Department', type: 'select', optionsKey: 'departments', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'regulationId', label: 'Regulation', type: 'select', optionsKey: 'regulations', required: false, editable: true, creatable: true, showInTable: true }
        ]
      },
      {
        key: 'users',
        label: 'Staff & Faculty Accounts',
        singularLabel: 'Staff Account',
        description: 'User accounts across all roles (HOD, Coordinator, Faculty, OBE)',
        icon: '👥',
        searchableColumns: ['name', 'email', 'employeeId'],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'name', label: 'Full Name', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'email', label: 'Email Address', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'employeeId', label: 'Employee ID', type: 'text', required: false, editable: true, creatable: true, showInTable: true },
          { name: 'password', label: 'Password', type: 'password', required: false, editable: true, creatable: true, showInTable: false },
          { name: 'roleId', label: 'Role', type: 'select', optionsKey: 'roles', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'departmentId', label: 'Department', type: 'select', optionsKey: 'departments', required: false, editable: true, creatable: true, showInTable: true }
        ]
      },
      {
        key: 'faculty-assignments',
        label: 'Faculty Subject Assignments',
        singularLabel: 'Subject Assignment',
        description: 'Allocation of faculty members to teach subjects by section & semester',
        icon: '🔗',
        searchableColumns: [],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'facultyId', label: 'Faculty Member', type: 'select', optionsKey: 'facultyUsers', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'subjectId', label: 'Subject', type: 'select', optionsKey: 'subjects', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'academicYearId', label: 'Academic Year', type: 'select', optionsKey: 'academicYears', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'semesterId', label: 'Semester', type: 'select', optionsKey: 'semesters', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'sectionId', label: 'Section', type: 'select', optionsKey: 'sections', required: false, editable: true, creatable: true, showInTable: true },
          { name: 'status', label: 'Status', type: 'text', required: false, editable: true, creatable: false, showInTable: true }
        ]
      },
      {
        key: 'academic-years',
        label: 'Academic Years',
        singularLabel: 'Academic Year',
        description: 'Institutional academic years (e.g. 2024-2025, 2025-2026)',
        icon: '📅',
        searchableColumns: ['year'],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'year', label: 'Year (e.g. 2025-2026)', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'createdAt', label: 'Created At', type: 'text', editable: false, creatable: false, showInTable: true }
        ]
      },
      {
        key: 'semesters',
        label: 'Semesters',
        singularLabel: 'Semester',
        description: 'Semester periods tied to academic years',
        icon: '⏳',
        searchableColumns: ['semester'],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'semester', label: 'Semester (e.g. 3-1)', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'academicYearId', label: 'Academic Year', type: 'select', optionsKey: 'academicYears', required: true, editable: true, creatable: true, showInTable: true }
        ]
      },
      {
        key: 'sections',
        label: 'Sections',
        singularLabel: 'Section',
        description: 'Department sections (A, B, C, D) per academic year',
        icon: '🔠',
        searchableColumns: ['sectionName'],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'sectionName', label: 'Section Name (e.g. A)', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'departmentId', label: 'Department', type: 'select', optionsKey: 'departments', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'academicYearId', label: 'Academic Year', type: 'select', optionsKey: 'academicYears', required: true, editable: true, creatable: true, showInTable: true }
        ]
      },
      {
        key: 'regulations',
        label: 'Regulations',
        singularLabel: 'Regulation',
        description: 'Curriculum frameworks (R20, R23, etc.)',
        icon: '📜',
        searchableColumns: ['name'],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'name', label: 'Regulation Name (e.g. R23)', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'startYear', label: 'Start Year', type: 'number', required: false, editable: true, creatable: true, showInTable: true },
          { name: 'endYear', label: 'End Year', type: 'number', required: false, editable: true, creatable: true, showInTable: true }
        ]
      },
      {
        key: 'course-outcomes',
        label: 'Course Outcomes (COs)',
        singularLabel: 'Course Outcome',
        description: 'Subject course outcomes (CO1 - CO5) and statements',
        icon: '🎯',
        searchableColumns: ['coCode', 'description'],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'subjectId', label: 'Subject', type: 'select', optionsKey: 'subjects', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'coCode', label: 'CO Code (e.g. CO1)', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'description', label: 'Description', type: 'text', required: true, editable: true, creatable: true, showInTable: true }
        ]
      },
      {
        key: 'students',
        label: 'Students',
        singularLabel: 'Student',
        description: 'Student enrollments and credentials',
        icon: '🎓',
        searchableColumns: ['rollNumber', 'name'],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'rollNumber', label: 'Roll Number / Reg No', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'name', label: 'Student Name', type: 'text', required: true, editable: true, creatable: true, showInTable: true },
          { name: 'password', label: 'Initial Password', type: 'password', required: false, editable: true, creatable: true, showInTable: false }
        ]
      },
      {
        key: 'script-bundles',
        label: 'Exam Script Bundles',
        singularLabel: 'Script Bundle',
        description: 'Uploaded script batch archives and metadata',
        icon: '📦',
        searchableColumns: ['title', 'department', 'semester'],
        fields: [
          { name: 'id', label: 'ID', type: 'text', editable: false, creatable: false, showInTable: false },
          { name: 'title', label: 'Bundle Title', type: 'text', required: true, editable: true, creatable: false, showInTable: true },
          { name: 'department', label: 'Department', type: 'text', required: true, editable: true, creatable: false, showInTable: true },
          { name: 'semester', label: 'Semester', type: 'text', required: true, editable: true, creatable: false, showInTable: true },
          { name: 'academicYear', label: 'Academic Year', type: 'text', required: true, editable: true, creatable: false, showInTable: true },
          { name: 'examType', label: 'Exam Type', type: 'text', required: true, editable: true, creatable: false, showInTable: true },
          { name: 'createdAt', label: 'Uploaded At', type: 'text', editable: false, creatable: false, showInTable: true }
        ]
      }
    ];

    return { entities, lookups };
  }

  /**
   * Paginated list of records for a given entity
   */
  public async getRecords(entity: string, query: { page?: number; limit?: number; search?: string; filterKey?: string; filterValue?: string }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(10, Number(query.limit || 25)));
    const skip = (page - 1) * limit;
    const search = (query.search || '').trim();

    let data: any[] = [];
    let total = 0;

    switch (entity) {
      case 'departments': {
        const where = search ? { departmentName: { contains: search, mode: 'insensitive' as const } } : {};
        [total, data] = await Promise.all([
          prisma.department.count({ where }),
          prisma.department.findMany({
            where,
            skip,
            take: limit,
            orderBy: { departmentName: 'asc' },
            include: {
              _count: { select: { subjects: true, users: true, sections: true } }
            }
          })
        ]);
        break;
      }

      case 'subjects': {
        const where: any = search
          ? {
              OR: [
                { subjectCode: { contains: search, mode: 'insensitive' as const } },
                { subjectName: { contains: search, mode: 'insensitive' as const } }
              ]
            }
          : {};
        if (query.filterKey === 'departmentId' && query.filterValue) {
          where.departmentId = query.filterValue;
        }
        [total, data] = await Promise.all([
          prisma.subject.count({ where }),
          prisma.subject.findMany({
            where,
            skip,
            take: limit,
            orderBy: { subjectCode: 'asc' },
            include: {
              department: { select: { departmentName: true } },
              regulation: { select: { name: true } },
              _count: { select: { courseOutcomes: true, assignments: true } }
            }
          })
        ]);
        break;
      }

      case 'users': {
        const where: any = search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { employeeId: { contains: search, mode: 'insensitive' as const } }
              ]
            }
          : {};
        if (query.filterKey === 'departmentId' && query.filterValue) {
          where.departmentId = query.filterValue;
        }
        [total, data] = await Promise.all([
          prisma.user.count({ where }),
          prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: 'asc' },
            include: {
              role: { select: { roleName: true } },
              department: { select: { departmentName: true } },
              _count: { select: { assignments: true } }
            }
          })
        ]);
        break;
      }

      case 'faculty-assignments': {
        const where: any = {};
        if (search) {
          where.OR = [
            { faculty: { name: { contains: search, mode: 'insensitive' as const } } },
            { subject: { subjectCode: { contains: search, mode: 'insensitive' as const } } },
            { subject: { subjectName: { contains: search, mode: 'insensitive' as const } } }
          ];
        }
        [total, data] = await Promise.all([
          prisma.facultyAssignment.count({ where }),
          prisma.facultyAssignment.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              faculty: { select: { name: true, email: true, employeeId: true } },
              subject: { select: { subjectCode: true, subjectName: true } },
              academicYear: { select: { year: true } },
              semester: { select: { semester: true } },
              section: { select: { sectionName: true } }
            }
          })
        ]);
        break;
      }

      case 'academic-years': {
        const where = search ? { year: { contains: search, mode: 'insensitive' as const } } : {};
        [total, data] = await Promise.all([
          prisma.academicYear.count({ where }),
          prisma.academicYear.findMany({
            where,
            skip,
            take: limit,
            orderBy: { year: 'desc' },
            include: {
              _count: { select: { semesters: true, sections: true, assignments: true } }
            }
          })
        ]);
        break;
      }

      case 'semesters': {
        const where = search ? { semester: { contains: search, mode: 'insensitive' as const } } : {};
        [total, data] = await Promise.all([
          prisma.semester.count({ where }),
          prisma.semester.findMany({
            where,
            skip,
            take: limit,
            orderBy: { semester: 'asc' },
            include: {
              academicYear: { select: { year: true } },
              _count: { select: { assignments: true } }
            }
          })
        ]);
        break;
      }

      case 'sections': {
        const where = search ? { sectionName: { contains: search, mode: 'insensitive' as const } } : {};
        [total, data] = await Promise.all([
          prisma.section.count({ where }),
          prisma.section.findMany({
            where,
            skip,
            take: limit,
            orderBy: { sectionName: 'asc' },
            include: {
              department: { select: { departmentName: true } },
              academicYear: { select: { year: true } }
            }
          })
        ]);
        break;
      }

      case 'regulations': {
        const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {};
        [total, data] = await Promise.all([
          prisma.regulation.count({ where }),
          prisma.regulation.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: 'asc' },
            include: {
              _count: { select: { subjects: true } }
            }
          })
        ]);
        break;
      }

      case 'course-outcomes': {
        const where: any = search
          ? {
              OR: [
                { coCode: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
                { subject: { subjectCode: { contains: search, mode: 'insensitive' as const } } }
              ]
            }
          : {};
        [total, data] = await Promise.all([
          prisma.courseOutcome.count({ where }),
          prisma.courseOutcome.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ subjectId: 'asc' }, { coCode: 'asc' }],
            include: {
              subject: { select: { subjectCode: true, subjectName: true } },
              _count: { select: { copoMappings: true } }
            }
          })
        ]);
        break;
      }

      case 'students': {
        const where: any = search
          ? {
              OR: [
                { rollNumber: { contains: search, mode: 'insensitive' as const } },
                { name: { contains: search, mode: 'insensitive' as const } }
              ]
            }
          : {};
        [total, data] = await Promise.all([
          prisma.student.count({ where }),
          prisma.student.findMany({
            where,
            skip,
            take: limit,
            orderBy: { rollNumber: 'asc' },
            include: {
              enrollments: {
                include: {
                  department: { select: { departmentName: true } },
                  academicYear: { select: { year: true } },
                  semester: { select: { semester: true } },
                  section: { select: { sectionName: true } }
                }
              }
            }
          })
        ]);
        break;
      }

      case 'script-bundles': {
        const where: any = search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                { department: { contains: search, mode: 'insensitive' as const } },
                { semester: { contains: search, mode: 'insensitive' as const } }
              ]
            }
          : {};
        [total, data] = await Promise.all([
          prisma.scriptBundle.count({ where }),
          prisma.scriptBundle.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              _count: { select: { files: true, assignments: true } }
            }
          })
        ]);
        break;
      }

      default:
        throw new Error(`Unsupported entity: ${entity}`);
    }

    return {
      entity,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Create a new record in the selected entity
   */
  public async createRecord(entity: string, payload: any, userId: string) {
    let createdItem: any;

    switch (entity) {
      case 'departments': {
        if (!payload.departmentName) throw new Error('Department name is required');
        createdItem = await prisma.department.create({
          data: { departmentName: payload.departmentName.trim().toUpperCase() }
        });
        break;
      }

      case 'subjects': {
        if (!payload.subjectCode || !payload.subjectName || !payload.departmentId) {
          throw new Error('Subject code, name, and department are required');
        }
        createdItem = await prisma.subject.create({
          data: {
            subjectCode: payload.subjectCode.trim(),
            subjectName: payload.subjectName.trim(),
            credits: payload.credits ? parseFloat(payload.credits) : null,
            semesterLevel: payload.semesterLevel || null,
            departmentId: payload.departmentId,
            regulationId: payload.regulationId || null
          }
        });
        break;
      }

      case 'users': {
        if (!payload.email || !payload.name || !payload.roleId) {
          throw new Error('Name, email, and role are required');
        }
        const existing = await prisma.user.findFirst({ where: { email: payload.email.trim().toLowerCase() } });
        if (existing) throw new Error(`User with email "${payload.email}" already exists`);

        const rawPassword = payload.password || 'MicTech@123';
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        createdItem = await prisma.user.create({
          data: {
            name: payload.name.trim(),
            email: payload.email.trim().toLowerCase(),
            employeeId: payload.employeeId ? payload.employeeId.trim() : null,
            passwordHash,
            roleId: payload.roleId,
            departmentId: payload.departmentId || null,
            mustChangePassword: false
          }
        });
        break;
      }

      case 'faculty-assignments': {
        if (!payload.facultyId || !payload.subjectId || !payload.academicYearId || !payload.semesterId) {
          throw new Error('Faculty, subject, academic year, and semester are required');
        }
        createdItem = await prisma.facultyAssignment.create({
          data: {
            facultyId: payload.facultyId,
            subjectId: payload.subjectId,
            academicYearId: payload.academicYearId,
            semesterId: payload.semesterId,
            sectionId: payload.sectionId || null,
            status: 'ACTIVE'
          }
        });
        break;
      }

      case 'academic-years': {
        if (!payload.year) throw new Error('Academic year (e.g. 2025-2026) is required');
        createdItem = await prisma.academicYear.create({
          data: { year: payload.year.trim() }
        });
        break;
      }

      case 'semesters': {
        if (!payload.semester || !payload.academicYearId) {
          throw new Error('Semester and Academic Year are required');
        }
        createdItem = await prisma.semester.create({
          data: {
            semester: payload.semester.trim(),
            academicYearId: payload.academicYearId
          }
        });
        break;
      }

      case 'sections': {
        if (!payload.sectionName || !payload.departmentId || !payload.academicYearId) {
          throw new Error('Section name, department, and academic year are required');
        }
        createdItem = await prisma.section.create({
          data: {
            sectionName: payload.sectionName.trim().toUpperCase(),
            departmentId: payload.departmentId,
            academicYearId: payload.academicYearId
          }
        });
        break;
      }

      case 'regulations': {
        if (!payload.name) throw new Error('Regulation name is required');
        createdItem = await prisma.regulation.create({
          data: {
            name: payload.name.trim(),
            startYear: payload.startYear ? parseInt(payload.startYear, 10) : null,
            endYear: payload.endYear ? parseInt(payload.endYear, 10) : null
          }
        });
        break;
      }

      case 'course-outcomes': {
        if (!payload.subjectId || !payload.coCode || !payload.description) {
          throw new Error('Subject, CO code, and description are required');
        }
        createdItem = await prisma.courseOutcome.create({
          data: {
            subjectId: payload.subjectId,
            coCode: payload.coCode.trim().toUpperCase(),
            description: payload.description.trim()
          }
        });
        break;
      }

      case 'students': {
        if (!payload.rollNumber || !payload.name) {
          throw new Error('Roll number and name are required');
        }
        const rawPassword = payload.password || 'student123';
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        createdItem = await prisma.student.create({
          data: {
            rollNumber: payload.rollNumber.trim().toUpperCase(),
            name: payload.name.trim(),
            passwordHash
          }
        });
        break;
      }

      default:
        throw new Error(`Creating records for entity "${entity}" is not supported`);
    }

    // Write audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: `CREATE_${entity.toUpperCase().replace('-', '_')}`,
          entity,
          entityId: createdItem.id
        }
      });
    } catch (e: any) {
      logger.warn('Failed to write audit log: ' + (e?.message || e));
    }

    return createdItem;
  }

  /**
   * Update an existing record
   */
  public async updateRecord(entity: string, id: string, payload: any, userId: string) {
    let updatedItem: any;

    switch (entity) {
      case 'departments': {
        updatedItem = await prisma.department.update({
          where: { id },
          data: {
            departmentName: payload.departmentName ? payload.departmentName.trim().toUpperCase() : undefined
          }
        });
        break;
      }

      case 'subjects': {
        updatedItem = await prisma.subject.update({
          where: { id },
          data: {
            subjectCode: payload.subjectCode ? payload.subjectCode.trim() : undefined,
            subjectName: payload.subjectName ? payload.subjectName.trim() : undefined,
            credits: payload.credits !== undefined ? (payload.credits ? parseFloat(payload.credits) : null) : undefined,
            semesterLevel: payload.semesterLevel !== undefined ? payload.semesterLevel : undefined,
            departmentId: payload.departmentId || undefined,
            regulationId: payload.regulationId !== undefined ? payload.regulationId : undefined
          }
        });
        break;
      }

      case 'users': {
        const updateData: any = {};
        if (payload.name) updateData.name = payload.name.trim();
        if (payload.email) updateData.email = payload.email.trim().toLowerCase();
        if (payload.employeeId !== undefined) updateData.employeeId = payload.employeeId ? payload.employeeId.trim() : null;
        if (payload.roleId) updateData.roleId = payload.roleId;
        if (payload.departmentId !== undefined) updateData.departmentId = payload.departmentId || null;
        if (payload.password && payload.password.trim().length > 0) {
          updateData.passwordHash = await bcrypt.hash(payload.password.trim(), 10);
        }

        updatedItem = await prisma.user.update({
          where: { id },
          data: updateData
        });
        break;
      }

      case 'faculty-assignments': {
        updatedItem = await prisma.facultyAssignment.update({
          where: { id },
          data: {
            facultyId: payload.facultyId || undefined,
            subjectId: payload.subjectId || undefined,
            academicYearId: payload.academicYearId || undefined,
            semesterId: payload.semesterId || undefined,
            sectionId: payload.sectionId !== undefined ? payload.sectionId : undefined,
            status: payload.status || undefined
          }
        });
        break;
      }

      case 'academic-years': {
        updatedItem = await prisma.academicYear.update({
          where: { id },
          data: { year: payload.year ? payload.year.trim() : undefined }
        });
        break;
      }

      case 'semesters': {
        updatedItem = await prisma.semester.update({
          where: { id },
          data: {
            semester: payload.semester ? payload.semester.trim() : undefined,
            academicYearId: payload.academicYearId || undefined
          }
        });
        break;
      }

      case 'sections': {
        updatedItem = await prisma.section.update({
          where: { id },
          data: {
            sectionName: payload.sectionName ? payload.sectionName.trim().toUpperCase() : undefined,
            departmentId: payload.departmentId || undefined,
            academicYearId: payload.academicYearId || undefined
          }
        });
        break;
      }

      case 'regulations': {
        updatedItem = await prisma.regulation.update({
          where: { id },
          data: {
            name: payload.name ? payload.name.trim() : undefined,
            startYear: payload.startYear !== undefined ? (payload.startYear ? parseInt(payload.startYear, 10) : null) : undefined,
            endYear: payload.endYear !== undefined ? (payload.endYear ? parseInt(payload.endYear, 10) : null) : undefined
          }
        });
        break;
      }

      case 'course-outcomes': {
        updatedItem = await prisma.courseOutcome.update({
          where: { id },
          data: {
            coCode: payload.coCode ? payload.coCode.trim().toUpperCase() : undefined,
            description: payload.description ? payload.description.trim() : undefined,
            subjectId: payload.subjectId || undefined
          }
        });
        break;
      }

      case 'students': {
        const updateData: any = {};
        if (payload.rollNumber) updateData.rollNumber = payload.rollNumber.trim().toUpperCase();
        if (payload.name) updateData.name = payload.name.trim();
        if (payload.password && payload.password.trim().length > 0) {
          updateData.passwordHash = await bcrypt.hash(payload.password.trim(), 10);
        }
        updatedItem = await prisma.student.update({
          where: { id },
          data: updateData
        });
        break;
      }

      case 'script-bundles': {
        updatedItem = await prisma.scriptBundle.update({
          where: { id },
          data: {
            title: payload.title ? payload.title.trim() : undefined,
            department: payload.department ? payload.department.trim() : undefined,
            semester: payload.semester ? payload.semester.trim() : undefined,
            academicYear: payload.academicYear ? payload.academicYear.trim() : undefined,
            examType: payload.examType ? payload.examType.trim() : undefined
          }
        });
        break;
      }

      default:
        throw new Error(`Updating records for entity "${entity}" is not supported`);
    }

    // Write audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: `UPDATE_${entity.toUpperCase().replace('-', '_')}`,
          entity,
          entityId: id
        }
      });
    } catch (e: any) {
      logger.warn('Failed to write audit log: ' + (e?.message || e));
    }

    return updatedItem;
  }

  /**
   * Delete a record with relational safety / cascade options
   */
  public async deleteRecord(entity: string, id: string, userId: string, forceCascade = false) {
    switch (entity) {
      case 'departments': {
        const counts = await prisma.department.findUnique({
          where: { id },
          include: {
            _count: { select: { subjects: true, users: true, sections: true } }
          }
        });
        if (!counts) throw new Error('Department not found');

        const totalDeps = (counts._count.subjects || 0) + (counts._count.users || 0) + (counts._count.sections || 0);
        if (totalDeps > 0 && !forceCascade) {
          return {
            requiresConfirmation: true,
            dependencyCount: totalDeps,
            message: `Department has ${counts._count.subjects} subjects, ${counts._count.users} users, and ${counts._count.sections} sections. Deleting will cascade or orphan them. Are you sure you want to proceed?`
          };
        }

        // If forceCascade, delete connected data
        if (forceCascade) {
          await prisma.section.deleteMany({ where: { departmentId: id } });
          await prisma.subject.deleteMany({ where: { departmentId: id } });
          await prisma.user.updateMany({ where: { departmentId: id }, data: { departmentId: null } });
        }

        await prisma.department.delete({ where: { id } });
        break;
      }

      case 'subjects': {
        const counts = await prisma.subject.findUnique({
          where: { id },
          include: {
            _count: { select: { courseOutcomes: true, assignments: true } }
          }
        });
        if (!counts) throw new Error('Subject not found');

        const totalDeps = (counts._count.courseOutcomes || 0) + (counts._count.assignments || 0);
        if (totalDeps > 0 && !forceCascade) {
          return {
            requiresConfirmation: true,
            dependencyCount: totalDeps,
            message: `Subject has ${counts._count.courseOutcomes} Course Outcomes and ${counts._count.assignments} Faculty Assignments. Proceed with cascade deletion?`
          };
        }

        // Clean dependencies
        const cos = await prisma.courseOutcome.findMany({ where: { subjectId: id }, select: { id: true } });
        const coIds = cos.map(c => c.id);
        if (coIds.length > 0) {
          await prisma.coPoMapping.deleteMany({ where: { courseOutcomeId: { in: coIds } } });
          await prisma.courseOutcome.deleteMany({ where: { id: { in: coIds } } });
        }
        await prisma.facultyAssignment.deleteMany({ where: { subjectId: id } });
        await prisma.subject.delete({ where: { id } });
        break;
      }

      case 'users': {
        const counts = await prisma.user.findUnique({
          where: { id },
          include: { _count: { select: { assignments: true } } }
        });
        if (!counts) throw new Error('User not found');

        if (counts._count.assignments > 0 && !forceCascade) {
          return {
            requiresConfirmation: true,
            dependencyCount: counts._count.assignments,
            message: `User has ${counts._count.assignments} active teaching assignments. Deleting will unassign these subjects.`
          };
        }

        await prisma.facultyAssignment.deleteMany({ where: { facultyId: id } });
        await prisma.facultyScriptAssignment.deleteMany({ where: { facultyId: id } });
        await prisma.user.delete({ where: { id } });
        break;
      }

      case 'faculty-assignments': {
        await prisma.facultyAssignment.delete({ where: { id } });
        break;
      }

      case 'academic-years': {
        await prisma.semester.deleteMany({ where: { academicYearId: id } });
        await prisma.section.deleteMany({ where: { academicYearId: id } });
        await prisma.academicYear.delete({ where: { id } });
        break;
      }

      case 'semesters': {
        await prisma.facultyAssignment.deleteMany({ where: { semesterId: id } });
        await prisma.semester.delete({ where: { id } });
        break;
      }

      case 'sections': {
        await prisma.facultyAssignment.updateMany({ where: { sectionId: id }, data: { sectionId: null } });
        await prisma.section.delete({ where: { id } });
        break;
      }

      case 'regulations': {
        await prisma.subject.updateMany({ where: { regulationId: id }, data: { regulationId: null } });
        await prisma.regulation.delete({ where: { id } });
        break;
      }

      case 'course-outcomes': {
        await prisma.coPoMapping.deleteMany({ where: { courseOutcomeId: id } });
        await prisma.courseOutcome.delete({ where: { id } });
        break;
      }

      case 'students': {
        await prisma.surveyRating.deleteMany({
          where: { surveyResponse: { studentId: id } }
        });
        await prisma.surveyResponse.deleteMany({ where: { studentId: id } });
        await prisma.studentEnrollment.deleteMany({ where: { studentId: id } });
        await prisma.student.delete({ where: { id } });
        break;
      }

      case 'script-bundles': {
        await prisma.facultyScriptAssignment.deleteMany({ where: { bundleId: id } });
        await prisma.scriptFile.deleteMany({ where: { bundleId: id } });
        await prisma.scriptBundle.delete({ where: { id } });
        break;
      }

      default:
        throw new Error(`Deleting records for entity "${entity}" is not supported`);
    }

    // Write audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: `DELETE_${entity.toUpperCase().replace('-', '_')}`,
          entity,
          entityId: id
        }
      });
    } catch (e: any) {
      logger.warn('Failed to write audit log: ' + (e?.message || e));
    }

    return { success: true, message: `Successfully deleted record from ${entity}` };
  }
}
