import sys

with open('backend/src/controllers/admin/admin.faculty.controller.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(\"import fs from 'fs';\", \"import fs from 'fs';\\nimport bcrypt from 'bcryptjs';\")

fn = '''
  public createFaculty = async (req: Request, res: Response): Promise<void> => {
    try {
      const { employeeId, name, email, departmentId } = req.body;
      if (!employeeId || !name || !email || !departmentId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Check if user exists
      const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { employeeId }] } });
      if (existing) {
        res.status(400).json({ error: 'User with this email or employee ID already exists' });
        return;
      }

      const role = await prisma.role.findUnique({ where: { roleName: 'FACULTY' } });
      if (!role) throw new Error('FACULTY role not found in database');

      // Generate temporary password based on employeeId and department
      const plainPassword = employeeId + '@' + departmentId;
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      const user = await prisma.user.create({
        data: {
          employeeId,
          name,
          email,
          passwordHash,
          departmentId,
          roleId: role.id,
          mustChangePassword: true
        }
      });

      res.status(201).json({ message: 'Faculty created successfully', user });
    } catch (error: any) {
      console.error('Error creating faculty:', error);
      res.status(500).json({ error: 'Failed to create faculty' });
    }
  };
'''

# insert before public previewImport
content = content.replace('  public previewImport = async', fn + '\\n  public previewImport = async')

with open('backend/src/controllers/admin/admin.faculty.controller.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
