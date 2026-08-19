'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { adminService } from '@/services/admin.service';
import { authService } from '@/services/auth.service';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newSubject, setNewSubject] = useState({ subjectCode: '', subjectName: '', semesterLevel: '3-1', credits: 3 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const user = authService.getCurrentUser();
      const data = await adminService.getSubjects(user?.departmentId);
      setSubjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = authService.getCurrentUser();
      await adminService.createSubject({
        ...newSubject,
        departmentId: user?.departmentId || undefined
      });
      setShowModal(false);
      setNewSubject({ subjectCode: '', subjectName: '', semesterLevel: '3-1', credits: 3 });
      fetchSubjects();
    } catch (err: any) {
      alert(err.message || 'Failed to create subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#f8fafc', margin: 0 }}>Manage Subjects</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Overview of academic subjects in your department</p>
        </div>
        <Button onClick={() => setShowModal(true)}>Add Subject</Button>
      </div>

      <Card glow>
        {isLoading ? (
          <p style={{ color: '#94a3b8' }}>Loading subjects...</p>
        ) : subjects.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No subjects found in your department.</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#f8fafc' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '12px' }}>Code</th>
                <th style={{ padding: '12px' }}>Subject Name</th>
                <th style={{ padding: '12px' }}>Semester</th>
                <th style={{ padding: '12px' }}>Credits</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                      {s.subjectCode}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{s.subjectName}</td>
                  <td style={{ padding: '12px' }}>Sem {s.semesterLevel || '?'}</td>
                  <td style={{ padding: '12px' }}>{s.credits || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <Button style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => alert('Edit subject coming soon!')}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Add Subject Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', width: '400px', border: '1px solid #334155' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#f8fafc' }}>Add Subject</h2>
            <form onSubmit={handleAddSubject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Subject Code (e.g. 23ME5T01)</label>
                <input required value={newSubject.subjectCode} onChange={e => setNewSubject({...newSubject, subjectCode: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Subject Name</label>
                <input required value={newSubject.subjectName} onChange={e => setNewSubject({...newSubject, subjectName: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Semester Level (e.g. 3-1)</label>
                <input required value={newSubject.semesterLevel} onChange={e => setNewSubject({...newSubject, semesterLevel: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', color: '#94a3b8' }}>Credits</label>
                <input type="number" required value={newSubject.credits} onChange={e => setNewSubject({...newSubject, credits: Number(e.target.value)})} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: '1px solid #334155' }}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Add Subject'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
