'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { adminService } from '@/services/admin.service';
import { authService } from '@/services/auth.service';

export default function FacultyManagementPage() {
  const router = useRouter();
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Assign State
  const [assignFacId, setAssignFacId] = useState('');
  const [assignSubId, setAssignSubId] = useState('');
  const [assignSectionId, setAssignSectionId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Unassign State
  const [unassignFacId, setUnassignFacId] = useState('');
  const [unassignSubId, setUnassignSubId] = useState('');
  const [isUnassigning, setIsUnassigning] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFaculty, setNewFaculty] = useState({ employeeId: '', name: '', email: '', departmentId: '', roleName: 'FACULTY' });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const user = authService.getCurrentUser();
      const payload = {
        ...newFaculty,
        departmentId: newFaculty.departmentId || user?.departmentId
      };
      await adminService.createFaculty(payload);
      alert(`Staff member created successfully as ${newFaculty.roleName === 'COORDINATOR' ? 'Branch Coordinator' : 'Faculty'}!`);
      setShowCreateModal(false);
      setNewFaculty({ employeeId: '', name: '', email: '', departmentId: '', roleName: 'FACULTY' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create faculty');
    } finally {
      setIsCreating(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const user = authService.getCurrentUser();
      const facData = await adminService.getFacultyList();
      const subData = await adminService.getSubjects(user?.departmentId);
      const secData = await adminService.getSections();
      setFacultyList(facData);
      setSubjects(subData);
      setSections(secData);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssign = async () => {
    if (!assignFacId || !assignSubId || !assignSectionId) return alert('Select Faculty, Subject, and Section');
    setIsAssigning(true);
    try {
      const yearId = sections.find(s => s.id === assignSectionId)?.academicYearId || 'clz0n99c8000213q20c5879a9';
      await adminService.assignFaculty(assignSubId, assignFacId, yearId, assignSectionId);
      alert('Successfully assigned faculty to subject section!');
      setAssignFacId('');
      setAssignSubId('');
      setAssignSectionId('');
      fetchData();
    } catch (e: any) { alert(e.message || 'Failed to assign'); }
    finally { setIsAssigning(false); }
  };

  const handleUnassign = async () => {
    if (!unassignFacId || !unassignSubId) return alert('Select both Faculty and Subject');
    setIsUnassigning(true);
    try {
      await adminService.unassignFaculty(unassignSubId); // unassignSubId actually holds the assignmentId here
      alert('Successfully unassigned faculty from subject!');
      setUnassignFacId('');
      setUnassignSubId('');
      fetchData();
    } catch (e: any) { alert(e.message || 'Failed to unassign'); }
    finally { setIsUnassigning(false); }
  };

  // Prepare options for SearchableSelect
  // Helper to get department name (handles cases where CO import left department null)
  const getDeptName = (s: any) => {
    if (s.department?.departmentName) return s.department.departmentName;
    if (s.subjectCode?.includes('ME')) return 'Mechanical';
    if (s.subjectCode?.includes('CS')) return 'CSE';
    if (s.subjectCode?.includes('EC')) return 'ECE';
    if (s.subjectCode?.includes('EE')) return 'EEE';
    if (s.subjectCode?.includes('CE')) return 'Civil';
    if (s.subjectCode?.includes('IT')) return 'IT';
    return 'No Dept';
  };

  const assignFacultyOptions = facultyList.map(f => ({ value: f.id, label: `${f.name} (${f.department?.departmentName || 'No Dept'})` }));
  // Allow all subjects to be assigned (even if already assigned to someone else, e.g. for different sections)
  const assignSubjectOptions = subjects.map(s => ({ value: s.id, label: `${s.subjectCode} - ${s.subjectName} (${getDeptName(s)})` }));
  const assignSectionOptions = sections.map(s => ({ value: s.id, label: `Section ${s.sectionName}` }));
  
  const unassignFacultyOptions = facultyList.filter(f => f.assignments && f.assignments.length > 0).map(f => ({ value: f.id, label: `${f.name} (${f.department?.departmentName || 'No Dept'})` }));
  
  const selectedUnassignFac = facultyList.find(f => f.id === unassignFacId);
  const unassignSubjectOptions = (selectedUnassignFac?.assignments || []).map((a: any) => ({ value: a.id, label: `${a.subject.subjectCode} - ${a.subject.subjectName} (${getDeptName(a.subject)})${a.section ? ` [Sec ${a.section.sectionName}]` : ''}` })); // Using assignment ID for unassign

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/admin/dashboard')} style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#334155', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>&larr; Back</button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Faculty Management</h1>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Manage faculty roster and assign subjects</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Add Faculty Manually</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* ASSIGN SECTION */}
        <Card glow style={{ position: 'relative', zIndex: 20 }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🔗</span> Assign Subject
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Search & Select Faculty</label>
              <SearchableSelect options={assignFacultyOptions} value={assignFacId} onChange={setAssignFacId} placeholder="-- Choose Faculty --" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Search & Select Subject</label>
              <SearchableSelect options={assignSubjectOptions} value={assignSubId} onChange={setAssignSubId} placeholder="-- Choose Subject --" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Search & Select Section</label>
              <SearchableSelect options={assignSectionOptions} value={assignSectionId} onChange={setAssignSectionId} placeholder="-- Choose Section --" />
            </div>
            <Button onClick={handleAssign} isLoading={isAssigning} style={{ background: '#10B981', color: 'white', border: 'none', marginTop: '8px' }}>Assign Faculty</Button>
          </div>
        </Card>

        {/* UNASSIGN SECTION */}
        <Card glow style={{ position: 'relative', zIndex: 15 }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>✂️</span> Unassign Subject
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Search & Select Faculty</label>
              <SearchableSelect options={unassignFacultyOptions} value={unassignFacId} onChange={setUnassignFacId} placeholder="-- Choose Faculty --" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.88rem', fontWeight: 600 }}>Select Subject to Remove</label>
              <SearchableSelect options={unassignSubjectOptions} value={unassignSubId} onChange={setUnassignSubId} placeholder="-- Choose Subject --" />
            </div>
            <Button onClick={handleUnassign} isLoading={isUnassigning} style={{ background: '#FFFFFF', border: '1px solid #FECACA', color: '#DC2626', marginTop: '8px' }}>Unassign Faculty</Button>
          </div>
        </Card>
      </div>

      {/* HISTORY & OVERVIEW SECTION */}
      <Card glow>
        <h3 style={{ margin: '0 0 16px 0', color: '#0F172A', fontWeight: 700 }}>Faculty & Assigned Subjects History</h3>
        {isLoading ? <p style={{ color: '#64748B' }}>Loading faculty roster...</p> : facultyList.length === 0 ? <p style={{ color: '#64748B' }}>No faculty found.</p> : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#0F172A' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Faculty Name</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Department</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Assigned Subjects</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {facultyList.map(f => {
                const assignedSubs = f.assignments || [];
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{f.name}<br/><span style={{fontSize:'0.75rem',color:'#64748B',fontWeight:'normal'}}>{f.email}</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#F1F5F9', color: '#334155', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                        {f.department?.departmentName || 'Unassigned'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {assignedSubs.length === 0 ? <span style={{ color: '#64748B', fontSize: '0.85rem' }}>No Subjects</span> : (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {assignedSubs.map((a: any) => (
                            <span key={a.id} style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              {a.subject?.subjectCode || 'Unknown'} {a.section && <span style={{ color: '#D97706', fontSize: '0.75rem' }}>(Sec {a.section.sectionName})</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: f.status === 'ACTIVE' ? '#ECFDF5' : '#F1F5F9', color: f.status === 'ACTIVE' ? '#065F46' : '#64748B', border: f.status === 'ACTIVE' ? '1px solid #A7F3D0' : '1px solid #E2E8F0' }}>{f.status || 'ACTIVE'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Create Faculty Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '420px', border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#0F172A', fontWeight: 700, fontSize: '1.25rem' }}>Create Faculty Manually</h2>
            <form onSubmit={handleCreateFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Employee ID (Required)</label>
                <input required value={newFaculty.employeeId} onChange={e => setNewFaculty({...newFaculty, employeeId: e.target.value})} style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Name (Required)</label>
                <input required value={newFaculty.name} onChange={e => setNewFaculty({...newFaculty, name: e.target.value})} style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Email (Required)</label>
                <input required type="email" value={newFaculty.email} onChange={e => setNewFaculty({...newFaculty, email: e.target.value})} style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Staff Role (Required)</label>
                <select
                  value={newFaculty.roleName}
                  onChange={e => setNewFaculty({...newFaculty, roleName: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1.5px solid #3B82F6', color: '#0F172A', borderRadius: '8px', fontWeight: 600 }}
                >
                  <option value="FACULTY">Faculty (Teaching Staff / Subject Coordinator)</option>
                  <option value="COORDINATOR">Branch Coordinator (HOD Dashboard Scoped)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Department ID (Required)</label>
                <input required value={newFaculty.departmentId} onChange={e => setNewFaculty({...newFaculty, departmentId: e.target.value})} placeholder="e.g. MECH" style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button type="submit" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Faculty'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

