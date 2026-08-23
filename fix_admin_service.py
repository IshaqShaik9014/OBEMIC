import sys

with open('frontend/src/services/admin.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

fn = '''  async createFaculty(data: any): Promise<void> {
    const res = await api.post('/admin/faculty/create', data);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create faculty');
    }
  },'''

content = content.replace('  async assignFaculty(subjectId: string, facultyId: string, academicYearId: string, sectionId?: string): Promise<void> {', fn + '\n\n  async assignFaculty(subjectId: string, facultyId: string, academicYearId: string, sectionId?: string): Promise<void> {')

with open('frontend/src/services/admin.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
