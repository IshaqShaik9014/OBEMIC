'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { adminService } from '@/services/admin.service';

export default function SurveyManagementPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [surveyData, yearData] = await Promise.all([
        adminService.getSurveys(),
        adminService.getAcademicYears()
      ]);
      setSurveys(surveyData);
      setAcademicYears(yearData);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggle = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === 'OPEN') await adminService.closeSurvey(id);
      else await adminService.openSurvey(id);
      fetchData();
    } catch (e: any) { alert(e.message || 'Error toggling survey'); }
  };

  const handleCreate = async () => {
    if (!newTitle || !selectedYear || !selectedSem) return alert('Please fill all fields');
    setIsCreating(true);
    try {
      await adminService.createSurvey({ title: newTitle, academicYearId: selectedYear, semesterId: selectedSem });
      setNewTitle('');
      setSelectedYear('');
      setSelectedSem('');
      alert('Survey created successfully!');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Error creating survey');
    } finally {
      setIsCreating(false);
    }
  };

  const copyShareLink = async (surveyId: string) => {
    try {
      const link = `${window.location.origin}/survey/${surveyId}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(surveyId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      // Fallback for older browsers or insecure contexts
      alert(`Share link: ${window.location.origin}/survey/${surveyId}`);
    }
  };

  // Prepare Dropdown Options
  const yearOptions = academicYears.map(y => ({ value: y.id, label: y.year }));
  
  // Find semesters for the selected academic year
  const activeYearObj = academicYears.find(y => y.id === selectedYear);
  const semOptions = activeYearObj?.semesters 
    ? activeYearObj.semesters.map((s: any) => ({ value: s.id, label: `Semester ${s.semester}` })) 
    : [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
        <button onClick={() => router.push('/admin/dashboard')} style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#334155', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>&larr; Back</button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Survey Management</h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Create and manage Course Exit Surveys</p>
        </div>
      </div>
      
      {/* CREATE SURVEY SECTION */}
      <Card glow style={{ position: 'relative', zIndex: 20 }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>📝</span> Create New Survey
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Survey Title</label>
            <input 
              type="text" 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Spring 2026 Course Exit Survey" 
              style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#0F172A', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Academic Year</label>
            <SearchableSelect options={yearOptions} value={selectedYear} onChange={setSelectedYear} placeholder="Select Year" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Semester</label>
            <SearchableSelect options={semOptions} value={selectedSem} onChange={setSelectedSem} placeholder="Select Sem" />
          </div>
          <div>
            <Button onClick={handleCreate} isLoading={isCreating} style={{ background: '#10B981', color: 'white', border: 'none', height: '42px' }}>
              Create Survey
            </Button>
          </div>
        </div>
      </Card>

      {/* SURVEYS LIST */}
      <Card glow>
        <h3 style={{ margin: '0 0 16px 0', color: '#0F172A', fontWeight: 700 }}>Active Surveys</h3>
        {isLoading ? <p style={{ color: '#64748B' }}>Loading surveys...</p> : surveys.length === 0 ? <p style={{ color: '#64748B' }}>No surveys found.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#0F172A' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Survey Title</th>
                  <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Semester (Year)</th>
                  <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Responses</th>
                  <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{s.title}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{s.semester?.semester} ({s.academicYear?.year})</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: s.status === 'OPEN' ? '#ECFDF5' : '#FEF2F2', color: s.status === 'OPEN' ? '#065F46' : '#DC2626', border: s.status === 'OPEN' ? '1px solid #A7F3D0' : '1px solid #FECACA' }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#2563EB', fontWeight: 'bold' }}>{s._count?.responses || 0}</td>
                    <td style={{ padding: '12px 16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => copyShareLink(s.id)}
                        title="Copy Share Link"
                        style={{ 
                          background: copiedId === s.id ? '#ECFDF5' : '#EFF6FF', 
                          border: copiedId === s.id ? '1px solid #A7F3D0' : '1px solid #BFDBFE', 
                          color: copiedId === s.id ? '#065F46' : '#2563EB', 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          cursor: 'pointer', 
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {copiedId === s.id ? '✓ Copied!' : '🔗 Share Link'}
                      </button>
                      <Button 
                        onClick={() => handleToggle(s.id, s.status)}
                        variant="secondary"
                        style={{ 
                          border: s.status === 'OPEN' ? '1px solid #FECACA' : '1px solid #A7F3D0', 
                          color: s.status === 'OPEN' ? '#DC2626' : '#059669',
                          padding: '6px 12px',
                          fontSize: '0.85rem'
                        }}
                      >
                        {s.status === 'OPEN' ? 'Close Survey' : 'Reopen Survey'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
