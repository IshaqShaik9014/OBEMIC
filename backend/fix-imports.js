const fs = require('fs');
let code = fs.readFileSync('src/services/academic.service.ts', 'utf8');
code = 'import { SubjectCodeParser } from \\'./academic/SubjectCodeParser\\';\\nimport { resolveDepartmentConfigBySubjectToken } from \\'../config/branch-codes\\';\\nimport { PrismaClient } from \\'@prisma/client\\';\\nconst prisma = new PrismaClient();\\n' + code;
fs.writeFileSync('src/services/academic.service.ts', code);
