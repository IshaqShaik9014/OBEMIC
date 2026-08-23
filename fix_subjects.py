import sys

with open('frontend/src/app/admin/subjects/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Remove the Add Subject button
content = re.sub(r'<Button onClick=\{.*?setShowModal\(true\).*?\}.*?</Button>', '', content, flags=re.DOTALL)
content = re.sub(r'<Button.*?Add Subject.*?</Button>', '', content, flags=re.DOTALL)

# Remove the modal
modal_pattern = r'\{/\* Add Subject Modal \*/\}.*?showModal && \(.*?</div>\s*\)\}'
content = re.sub(modal_pattern, '', content, flags=re.DOTALL)

# Remove unused states and imports if they cause lint errors, but TypeScript doesn't care much about unused states in this case, 
# although eslint might. I'll just remove the state declarations.

state_pattern = r'// Modal State.*?const \[isSubmitting, setIsSubmitting\] = useState\(false\);'
content = re.sub(state_pattern, '', content, flags=re.DOTALL)

handler_pattern = r'const handleAddSubject = async.*?};'
content = re.sub(handler_pattern, '', content, flags=re.DOTALL)

with open('frontend/src/app/admin/subjects/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
