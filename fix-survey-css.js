const fs = require('fs');
const path = 'C:\\Users\\shaik\\.gemini\\antigravity\\brain\\a12c05b7-2e38-4e8a-8765-67729337df6d\\scratch\\survey\\style.css';
let css = fs.readFileSync(path, 'utf8');

// Replace body with .survey-nexus
css = css.replace(/body\s*\{/g, '.survey-nexus {');
// For any html, body, replace
css = css.replace(/html,\s*body\s*\{/g, '.survey-nexus {');

fs.writeFileSync('frontend/src/app/survey/[id]/survey.css', css, 'utf8');
