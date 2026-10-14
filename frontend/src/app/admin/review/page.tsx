'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { adminService } from '@/services/admin.service';
import toast from 'react-hot-toast';

export default function AdminReviewPage() {
  const router = useRouter();
  
  // Data State
  const [subjects, setSubjects] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Master Filters State
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedSem, setSelectedSem] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subData, facData, surData, repData] = await Promise.all([
        adminService.getSubjects(),
        adminService.getFacultyList(),
        adminService.getSurveys(),
        adminService.getPendingReports()
      ]);
      setSubjects(subData);
      setFaculty(facData);
      setSurveys(surData);
      setReports(repData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await adminService.approveReport(id);
      toast.success('Report Approved and Officially Published!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve report');
    }
  };

  // Advanced Filtering Logic
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

  const subjectOptions = filteredSubjects.map(s => ({ value: s.id, label: `${s.subjectCode} - ${s.subjectName}` }));
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
  // Get Assignment Data for real progress state
  let currentAssignment: any = null;
  if (selectedSubject) {
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

  const submittedReport = subjectReports.find(r => r.status === 'SUBMITTED');
  const approvedReport = subjectReports.find(r => r.status === 'APPROVED');
  const generatedReport = subjectReports.find(r => r.status === 'GENERATED');
  const pendingReport = submittedReport || (generatedReport && directUploaded && indirectUploaded ? generatedReport : null);

  // Survey status
  const activeSurvey = surveys.find(s => s.subjectId === selectedSubject) || (surveys.length > 0 ? surveys[0] : null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
        <button onClick={() => router.push('/admin/dashboard')} style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#334155', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
           &larr; Back
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Review Reports Dashboard</h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Track attainment progress and approve final reports</p>
        </div>
      </div>

      {/* MASTER FILTERS */}
      <Card style={{ position: 'relative', zIndex: 20 }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0F172A', fontWeight: 700, fontSize: '1.1rem' }}>Master Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Select Subject</label>
            <SearchableSelect options={subjectOptions} value={selectedSubject} onChange={setSelectedSubject} placeholder="-- All Subjects --" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Select Faculty</label>
            <SearchableSelect options={facultyOptions} value={selectedFaculty} onChange={setSelectedFaculty} placeholder="-- All Faculty --" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Select Semester</label>
            <SearchableSelect options={semOptions} value={selectedSem} onChange={setSelectedSem} placeholder="-- All Semesters --" />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <p style={{ color: '#64748B', textAlign: 'center', padding: '40px' }}>Loading progress data...</p>
      ) : !selectedSubject ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h3 style={{ color: '#0F172A', margin: '0 0 8px 0', fontWeight: 700 }}>No Subject Selected</h3>
            <p style={{ color: '#64748B', margin: 0 }}>Please select a subject from the Master Filters above to view its detailed attainment progress.</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ color: '#0F172A', margin: '0 0 -8px 0', fontSize: '1.4rem', fontWeight: 800 }}>
            Attainment Progress: <span style={{ color: '#2563EB' }}>{currentSubject?.subjectName} ({currentSubject?.subjectCode})</span>
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* 1. DIRECT ATTAINMENT */}
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0F172A', fontWeight: 700, fontSize: '1.1rem' }}>1. Direct Attainment</h3>
                <span style={{ background: directUploaded ? '#ECFDF5' : '#FEF2F2', color: directUploaded ? '#065F46' : '#DC2626', border: directUploaded ? '1px solid #A7F3D0' : '1px solid #FECACA', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700 }}>
                  {directUploaded ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B' }}>Marks Data</span>
                  <span style={{ color: directUploaded ? '#10B981' : '#EF4444', fontSize: '0.9rem', fontWeight: 600 }}>
                    {directUploaded ? '✓ Uploaded' : 'Not Uploaded'}
                  </span>
                </div>
              </div>
              <Button variant="secondary" style={{ width: '100%' }} disabled={!directUploaded}>View Uploads</Button>
            </Card>

            {/* 2. INDIRECT ATTAINMENT */}
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0F172A', fontWeight: 700, fontSize: '1.1rem' }}>2. Indirect Attainment</h3>
                <span style={{ background: indirectUploaded ? '#ECFDF5' : '#FEF2F2', color: indirectUploaded ? '#065F46' : '#DC2626', border: indirectUploaded ? '1px solid #A7F3D0' : '1px solid #FECACA', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700 }}>
                  {indirectUploaded ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B' }}>Survey Data</span>
                  <span style={{ color: indirectUploaded ? '#10B981' : '#EF4444', fontSize: '0.9rem', fontWeight: 600 }}>
                    {indirectUploaded ? '✓ Evaluated' : 'Not Uploaded'}
                  </span>
                </div>
              </div>
              <Button variant="secondary" style={{ width: '100%' }} onClick={() => router.push('/admin/surveys')}>Manage Surveys</Button>
            </Card>

            {/* 3. FINAL REVIEW STATUS */}
            <Card glow>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: '#0F172A', fontWeight: 700, fontSize: '1.1rem' }}>3. Final Review</h3>
                <span style={{ 
                  background: approvedReport ? '#ECFDF5' : pendingReport ? '#FEF3C7' : '#F1F5F9', 
                  color: approvedReport ? '#065F46' : pendingReport ? '#92400E' : '#475569', 
                  border: approvedReport ? '1px solid #A7F3D0' : pendingReport ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                  padding: '4px 10px', 
                  borderRadius: '9999px', 
                  fontSize: '0.78rem',
                  fontWeight: '700'
                }}>
                  {approvedReport ? 'Approved & Published' : pendingReport ? 'Awaiting Review' : 'Not Ready'}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', flexGrow: 1 }}>
                <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
                  {approvedReport 
                    ? 'The final attainment report has been verified, approved, and officially published.'
                    : pendingReport 
                      ? `Faculty ${pendingReport.faculty?.name || ''} has finalized attainment calculations. Ready for Admin approval.`
                      : directUploaded && indirectUploaded 
                        ? 'Faculty has completed Direct and Indirect milestones. Final attainment report is ready for submission.'
                        : 'The final attainment report cannot be generated until both Direct and Indirect attainments are completed by the faculty.'}
                </p>
              </div>

              {approvedReport ? (
                <Button style={{ width: '100%', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontWeight: 'bold' }} disabled>
                  ✓ Approved & Published
                </Button>
              ) : pendingReport ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button style={{ flex: 1, background: '#10B981', color: 'white', border: 'none', fontWeight: 'bold' }} onClick={() => handleApprove(pendingReport.id)}>
                    Approve Report
                  </Button>
                  <Button style={{ flex: 1, background: '#FFFFFF', border: '1px solid #FECACA', color: '#DC2626' }}>
                    Reject
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" style={{ width: '100%' }} disabled>
                  Awaiting Submission
                </Button>
              )}
            </Card>

          </div>
        </div>
      )}
    </div>
  );
}
