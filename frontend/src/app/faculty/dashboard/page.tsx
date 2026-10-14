'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { facultyService } from '@/services/faculty.service';
import { FacultyDashboardData, AssignedSubject } from '@/types/faculty';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AttainmentDonutChart } from '@/components/ui/Charts';
import { authService } from '@/services/auth.service';

export default function FacultyDashboard() {
  const router = useRouter();
  const [data, setData] = useState<FacultyDashboardData | null>(null);
  const [subjects, setSubjects] = useState<AssignedSubject[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
    async function loadData() {
      try {
        const [dashData, subjectList] = await Promise.all([
          facultyService.getDashboardData(),
          facultyService.getAssignedSubjects()
        ]);
        setData(dashData);
        setSubjects(subjectList);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return <div style={{ color: '#94a3b8' }}>Loading dashboard...</div>;
  }

  if (error) {
    return <div style={{ color: '#ef4444' }}>{error}</div>;
  }

  const assignedCount = data?.stats.totalSubjects || 0;
  const reportsCount = data?.stats.totalReportsGenerated || 0;
  // Approximation of pending vs assigned based on reports vs subjects (simplified logic)
  const completedSubjects = Math.min(assignedCount, Math.floor(reportsCount / 2)); // assume internal+external per subject

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', animation: 'fadeIn 0.3s ease' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Welcome, {currentUser?.name || data?.facultyName || 'Dr. Rajesh Kumar'}
          </h1>
        </div>
        <div>
          <p style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 500, margin: 0 }}>
            {currentUser?.department || data?.department || 'Computer Science & Engineering'} &bull; Faculty Dashboard
          </p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Attainment Status Card */}
        <Card>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
            Attainment Status
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', height: '170px' }}>
            <div style={{ width: '130px', height: '130px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AttainmentDonutChart assigned={completedSubjects} pending={assignedCount - completedSubjects} />
            </div>
            <div style={{ flex: 1, fontSize: '0.92rem', color: '#334155', paddingLeft: '16px' }}>
              <p style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#3B82F6', borderRadius: '3px' }}></span>
                Assigned: <strong style={{ color: '#0F172A' }}>{completedSubjects}</strong>
              </p>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#EF4444', borderRadius: '3px' }}></span>
                Pending: <strong style={{ color: '#0F172A' }}>{assignedCount - completedSubjects}</strong>
              </p>
            </div>
          </div>
        </Card>

        {/* Syllabus Progress Card */}
        <Card>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
            Syllabus Progress
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '170px', alignItems: 'center' }}>
            <h2 style={{ fontSize: '3.75rem', color: '#2563EB', margin: '0 0 8px 0', fontWeight: 900, letterSpacing: '-0.03em' }}>
              {assignedCount > 0 ? Math.round((completedSubjects / assignedCount) * 100) : 0}%
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>
              Average syllabus progress across your subjects
            </p>
          </div>
        </Card>

      </div>

      {/* My Subjects Table Card (Pixel-Perfect from Reference Screenshot) */}
      <Card id="subjects">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
          My Subjects
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CODE</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>SUBJECT</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>SEMESTER</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CREDITS</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>MARKS STATUS</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>VERIFICATION</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>
                    No assigned subjects found.
                  </td>
                </tr>
              ) : (
                subjects.map((sub) => {
                  const hasMarks = sub.progressState?.direct || sub.progressState?.indirect;
                  return (
                    <tr
                      key={sub.assignmentId}
                      onClick={() => router.push(`/faculty/subjects/${sub.subjectId}`)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          background: '#EFF6FF',
                          color: '#2563EB',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          display: 'inline-block'
                        }}>
                          {sub.subjectCode}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontWeight: 600, color: '#0F172A', fontSize: '0.92rem' }}>
                        {sub.subjectName}
                      </td>
                      <td style={{ padding: '16px', color: '#475569', fontSize: '0.88rem' }}>
                        Sem {sub.semester}
                      </td>
                      <td style={{ padding: '16px', color: '#475569', fontSize: '0.88rem' }}>
                        {sub.credits}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#334155' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: hasMarks ? '#10B981' : '#EF4444'
                          }}></span>
                          {hasMarks ? 'Entered' : 'Not Entered'}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          background: '#F1F5F9',
                          color: '#64748B',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          display: 'inline-block'
                        }}>
                          Pending
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
