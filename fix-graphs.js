const fs = require('fs');
const file = 'frontend/src/app/faculty/subjects/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Lift combinedData up
const renderStart = '  const renderTabContent = () => {';
const combinedDataCalc = 
  const combinedData: any[] = [];
  if (cos && indirectData && directData) {
    cos.map((c: any) => c.coCode).forEach(co => {
        let sum = 0;
        indirectData.forEach(stu => sum += (stu.scores[co] || 5));
        const avg5Scale = sum / (indirectData.length || 1);
        const ind = (avg5Scale / 5) * 3;
        const dir = directData?.data[co]?.direct3Scale || 0;
        const final = (0.6 * dir) + (0.4 * ind);
        combinedData.push({ co, dir, ind, final, tgt: directData?.data[co]?.target3Scale || 0 });
    });
  }
;

if (!content.includes('const combinedData: any[] = [];\n  if (cos')) {
  content = content.replace(renderStart, combinedDataCalc + '\n' + renderStart);
}

// 2. Remove the old combinedData calculation from case 'overall_attainment':
content = content.replace(
  /case 'overall_attainment':\s*\/\/ Math to combine Direct and Indirect for the table[\s\S]*?const final = \(0\.6 \* dir\) \+ \(0\.4 \* ind\);\s*combinedData\.push\(\{ co, dir, ind, final, tgt: directData\?\.data\[co\]\?\.target3Scale \|\| 0 \}\);\s*}\);/,
  "case 'overall_attainment':"
);

// 3. Replace the printable Final Overall Assessment table and add the graphs
const oldPrintableTable = /<h3 style=\{\{ borderBottom: '1px solid #ccc' \}\}>3\. Final Overall Assessment<\/h3>[\s\S]*?<\/table>/;
const newPrintableTableAndGraphs = 
      <h3 style={{ borderBottom: '1px solid #ccc' }}>3. Final Overall Assessment</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #000', textAlign: 'center' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '8px' }}>CO</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Direct Attainment (60%)</th>
            <th style={{ border: '1px solid #000', padding: '8px' }}>Indirect Attainment (40%)</th>
            <th style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Final Attainment</th>
          </tr>
        </thead>
        <tbody>
          {combinedData.map((row) => (
            <tr key={row.co}>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{row.co}</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{row.dir.toFixed(2)}</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>{row.ind.toFixed(2)}</td>
              <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{row.final.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #ccc', marginTop: '30px' }}>4. Visual Attainment Analysis Graphs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '40px' }}>
        <div style={{ height: '350px', padding: '16px', borderRadius: '8px', border: '1px solid #000' }}>
          <h4 style={{ textAlign: 'center', margin: '0 0 16px 0' }}>PO Attainment (3-Scale)</h4>
          <AttainmentBarChart 
            labels={Array.from({length: 12}, (_, i) => \PO\\).concat(['PSO1', 'PSO2'])}
            datasets={[{ label: 'PO Attainment', data: [1.9, 1.9, 1.8, 2.3, 0, 2.0, 0, 0, 0, 0, 0, 0, 1.9, 2.0], backgroundColor: '#3b82f6' }]}
          />
        </div>
        <div style={{ height: '350px', padding: '16px', borderRadius: '8px', border: '1px solid #000' }}>
          <h4 style={{ textAlign: 'center', margin: '0 0 16px 0' }}>CO Attainment Summary (3-Scale)</h4>
          <AttainmentBarChart 
            labels={cos.map((c: any) => c.coCode)}
            datasets={[
              { label: 'Direct', data: combinedData.map(d => d.dir), backgroundColor: '#ef4444' },
              { label: 'Indirect', data: combinedData.map(d => d.ind), backgroundColor: '#3b82f6' },
              { label: 'Final', data: combinedData.map(d => d.final), backgroundColor: '#10b981' },
            ]}
          />
        </div>
      </div>
;
content = content.replace(oldPrintableTable, newPrintableTableAndGraphs.trim());

fs.writeFileSync(file, content, 'utf8');
console.log('Script executed');
