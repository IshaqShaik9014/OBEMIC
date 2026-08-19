const fs = require('fs');
let code = fs.readFileSync('src/repositories/academic.repository.ts', 'utf8');
const replacement = \sync assignFacultyToSubject(facultyId: string, subjectId: string, academicYearId: string, sectionId?: string | null, assignedBy?: string) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new Error('Subject not found');
    let targetSemesterId = 'fallback-semester-id';
    if (subject.semesterLevel) {
       let tempSem = await prisma.semester.findFirst({
          where: { semester: subject.semesterLevel, academicYearId }
       });
       if (!tempSem) {
          tempSem = await prisma.semester.create({
             data: { semester: subject.semesterLevel, academicYearId }
          });
       }
       targetSemesterId = tempSem.id;
    } else {
       throw new Error('Subject has no semesterLevel defined, cannot assign temporal semester.');
    }

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
        semesterId: targetSemesterId,
        updatedAt: new Date()
      },
      create: {
        facultyId,
        subjectId,
        academicYearId,
        sectionId: sectionId || null,
        semesterId: targetSemesterId,
        status: 'ACTIVE',
        assignedBy: assignedBy
      }
    });
  }\;
code = code.replace(/async assignFacultyToSubject[\s\S]*?create: \{[\s\S]*?\}[\s\S]*?\}\);[\s\S]*?\}/, replacement);
fs.writeFileSync('src/repositories/academic.repository.ts', code);
console.log('Fixed assignFacultyToSubject');
