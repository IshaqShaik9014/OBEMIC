import sys

with open('frontend/src/app/admin/review/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will use replace for the filters and UI.

import re

# Replace the Filter Options
filter_options = '''  // Filter Options
  const subjectOptions = subjects.map(s => ({ value: s.id, label: ${s.subjectCode} -  }));
  const facultyOptions = faculty.map(f => ({ value: f.id, label: f.name }));
  const semOptions = [
    { value: '1-1', label: '1st Year - 1st Sem' },
    { value: '1-2', label: '1st Year - 2nd Sem' },
    { value: '2-1', label: '2nd Year - 1st Sem' },
    { value: '2-2', label: '2nd Year - 2nd Sem' },
    { value: '3-1', label: '3rd Year - 1st Sem' },
    { value: '3-2', label: '3rd Year - 2nd Sem' },
    { value: '4-1', label: '4th Year - 1st Sem' },
    { value: '4-2', label: '4th Year - 2nd Sem' },
  ];

  // Derived progress data based on selected subject
  const currentSubject = subjects.find(s => s.id === selectedSubject);
  const subjectReports = reports.filter(r => r.subjectId === selectedSubject);
  const pendingReport = subjectReports.find(r => r.status === 'SUBMITTED');
  
  // For survey status, we'll map generically or use the first active survey as a proxy for the UI visualization
  const activeSurvey = surveys.length > 0 ? surveys[0] : null;'''

new_filter_options = '''  // Advanced Filtering Logic
  let filteredSubjects = subjects;
  
  if (selectedFaculty) {
    const fac = faculty.find(f => f.id === selectedFaculty);
    if (fac && fac.assignments) {
      const facSubjectIds = fac.assignments.map((a: any) => a.subjectId);
      filteredSubjects = filteredSubjects.filter(s => facSubjectIds.includes(s.id));
    }
  }

  if (selectedSem) {
    filteredSubjects = filteredSubjects.filter(s => s.semesterLevel === selectedSem);
  }

  const subjectOptions = filteredSubjects.map(s => ({ value: s.id, label: ${s.subjectCode} -  }));
  const facultyOptions = faculty.map(f => ({ value: f.id, label: f.name }));
  const semOptions = [
    { value: '1-1', label: '1st Year - 1st Sem' },
    { value: '1-2', label: '1st Year - 2nd Sem' },
    { value: '2-1', label: '2nd Year - 1st Sem' },
    { value: '2-2', label: '2nd Year - 2nd Sem' },
    { value: '3-1', label: '3rd Year - 1st Sem' },
    { value: '3-2', label: '3rd Year - 2nd Sem' },
    { value: '4-1', label: '4th Year - 1st Sem' },
    { value: '4-2', label: '4th Year - 2nd Sem' },
  ];

  // Derived progress data based on selected subject & faculty
  const currentSubject = subjects.find(s => s.id === selectedSubject);
  
  let subjectReports = reports.filter(r => r.subjectId === selectedSubject);
  if (selectedFaculty) {
    subjectReports = subjectReports.filter(r => r.facultyId === selectedFaculty);
  }
  const pendingReport = subjectReports.find(r => r.status === 'SUBMITTED');
  
  // Get Assignment Data for real progress state
  let currentAssignment = null;
  if (selectedSubject) {
    // If a faculty is selected, use theirs, otherwise find first faculty that teaches this subject
    const facList = selectedFaculty ? faculty.filter(f => f.id === selectedFaculty) : faculty;
    for (const fac of facList) {
      if (fac.assignments) {
        const assignment = fac.assignments.find((a: any) => a.subjectId === selectedSubject);
        if (assignment) {
          currentAssignment = assignment;
          break;
        }
      }
    }
  }

  const progressState = currentAssignment?.progressState || { direct: false, indirect: false, copo: false, overall: false };
  const directUploaded = progressState.direct;
  const indirectUploaded = progressState.indirect;

  // Survey status
  const activeSurvey = surveys.find(s => s.subjectId === selectedSubject) || (surveys.length > 0 ? surveys[0] : null);'''

content = content.replace(filter_options, new_filter_options)

# Replace the Dummy UI parts
dummy_direct = '''            {/* 1. DIRECT ATTAINMENT */}
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>1. Direct Attainment</h3>
                <span style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>In Progress</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8' }}>Internal Marks</span>
                  <span style={{ color: '#10B981', fontSize: '0.9rem' }}>o" Uploaded</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8' }}>External Marks</span>
                  <span style={{ color: '#fbbf24', fontSize: '0.9rem' }}>Pending</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Lab Marks</span>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>N/A</span>
                </div>
              </div>
              <Button style={{ width: '100%', background: 'transparent', border: '1px solid #3b82f6', color: '#60a5fa' }}>View Uploads</Button>
            </Card>'''

real_direct = '''            {/* 1. DIRECT ATTAINMENT */}
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>1. Direct Attainment</h3>
                <span style={{ background: directUploaded ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: directUploaded ? '#10B981' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  {directUploaded ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8' }}>Marks Data</span>
                  <span style={{ color: directUploaded ? '#10B981' : '#ef4444', fontSize: '0.9rem' }}>
                    {directUploaded ? '? Uploaded' : 'Not Uploaded'}
                  </span>
                </div>
              </div>
              <Button style={{ width: '100%', background: 'transparent', border: '1px solid #3b82f6', color: '#60a5fa' }} disabled={!directUploaded}>View Uploads</Button>
            </Card>'''

content = content.replace(dummy_direct, real_direct)

dummy_indirect = '''            {/* 2. INDIRECT ATTAINMENT */}
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>2. Indirect Attainment</h3>
                <span style={{ background: activeSurvey ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: activeSurvey ? '#10B981' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  {activeSurvey ? 'Active' : 'Missing'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8' }}>Course Exit Survey</span>
                  <span style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{activeSurvey ? activeSurvey.status || 'OPEN' : 'Not Created'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Responses</span>
                  <span style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{activeSurvey ? '14 / 60' : '0 / 0'}</span>
                </div>
              </div>
              <Button style={{ width: '100%', background: 'transparent', border: '1px solid #3b82f6', color: '#60a5fa' }} onClick={() => router.push('/admin/survey')}>Manage Surveys</Button>
            </Card>'''

real_indirect = '''            {/* 2. INDIRECT ATTAINMENT */}
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>2. Indirect Attainment</h3>
                <span style={{ background: indirectUploaded ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: indirectUploaded ? '#10B981' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  {indirectUploaded ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#94a3b8' }}>Survey Data</span>
                  <span style={{ color: indirectUploaded ? '#10B981' : '#ef4444', fontSize: '0.9rem' }}>
                    {indirectUploaded ? '? Evaluated' : 'Not Uploaded'}
                  </span>
                </div>
              </div>
              <Button style={{ width: '100%', background: 'transparent', border: '1px solid #3b82f6', color: '#60a5fa' }} onClick={() => router.push('/admin/survey')}>Manage Surveys</Button>
            </Card>'''

content = content.replace(dummy_indirect, real_indirect)

with open('frontend/src/app/admin/review/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done review page')
