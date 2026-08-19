const fs = require('fs');
const file = 'frontend/src/app/faculty/subjects/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const injection = \
  // Calculate combined CO data globally
  const globalCOData: Record<string, { dir: number; ind: number; final: number }> = {};
  ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].forEach((co) => {
    const dir = directData?.data?.[co]?.direct3Scale || 0;
    let sum = 0;
    (indirectData || []).forEach((stu: any) => sum += (stu.scores?.[co] || 5));
    const avg5Scale = sum / (indirectData?.length || 1);
    const ind = (avg5Scale / 5) * 3;
    const final = (dir * 0.6) + (ind * 0.4);
    globalCOData[co] = { dir, ind, final };
  });

  const poLabels = Array.from({length: 12}, (_, i) => \\\PO\\\\).concat(['PSO1', 'PSO2']);
  const poAttainmentData = poLabels.map(po => {
    if (!copoMap) return 0;
    let sumAttainment = 0;
    let count = 0;
    ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'].forEach(co => {
       const weight = copoMap[co]?.[po];
       if (weight && weight !== '-' && weight !== 0 && weight !== '0') {
           sumAttainment += globalCOData[co].final;
           count++;
       }
    });
    return count > 0 ? (sumAttainment / count) : 0;
  });

  const handleUpload\;

if (!content.includes('const globalCOData')) {
  content = content.replace('  const handleUpload', injection);
}

// Replace dummy data 1
content = content.replace(
  /datasets=\{\[\{ label: 'PO Attainment', data: \[1\.9, 1\.9, 1\.8, 2\.3, 0, 2\.0, 0, 0, 0, 0, 0, 0, 1\.9, 2\.0\], backgroundColor: '#3b82f6' \}\]\}/g,
  "datasets={[{ label: 'PO Attainment', data: poAttainmentData, backgroundColor: '#3b82f6' }]}"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Script executed');
