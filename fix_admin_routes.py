import sys

with open('backend/src/routes/admin/faculty.routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('router.post(\'/upload/confirm\', controller.confirmImport);', 'router.post(\'/upload/confirm\', controller.confirmImport);\nrouter.post(\'/create\', controller.createFaculty);')

with open('backend/src/routes/admin/faculty.routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
