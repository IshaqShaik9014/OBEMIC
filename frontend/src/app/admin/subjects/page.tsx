'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { adminService } from '@/services/admin.service';
import { authService } from '@/services/auth.service';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  

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

  

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Manage Subjects</h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Overview of academic subjects in your department</p>
        </div>
      </div>

      <Card glow>
        {isLoading ? (
          <p style={{ color: '#64748B' }}>Loading subjects...</p>
        ) : subjects.length === 0 ? (
          <p style={{ color: '#64748B' }}>No subjects found in your department.</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#0F172A' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Code</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Subject Name</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Semester</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Credits</th>
                <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      {s.subjectCode}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{s.subjectName}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>Sem {s.semesterLevel || '?'}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{s.credits || '-'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Button variant="secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => alert('Edit subject coming soon!')}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
