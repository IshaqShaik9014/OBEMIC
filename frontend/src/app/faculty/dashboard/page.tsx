'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { facultyService } from '@/services/faculty.service';
import { scriptService } from '@/services/script.service';
import { FacultyDashboardData, AssignedSubject } from '@/types/faculty';
import { FacultyAssignedScript, FileTreeNode } from '@/types/script';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AttainmentDonutChart } from '@/components/ui/Charts';
import { authService } from '@/services/auth.service';
import { FolderTreeViewer } from '@/components/scripts/FolderTreeViewer';
import { ScriptViewerModal } from '@/components/scripts/ScriptViewerModal';

export default function FacultyDashboard() {
  const router = useRouter();
  const [data, setData] = useState<FacultyDashboardData | null>(null);
  const [subjects, setSubjects] = useState<AssignedSubject[]>([]);
  const [scripts, setScripts] = useState<FacultyAssignedScript[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [inspectScript, setInspectScript] = useState<FacultyAssignedScript | null>(null);
  const [activeScriptFile, setActiveScriptFile] = useState<FileTreeNode | null>(null);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
    async function loadData() {
      try {
        const [dashData, subjectList, scriptList] = await Promise.all([
          facultyService.getDashboardData(),
          facultyService.getAssignedSubjects(),
          scriptService.getFacultyScripts().catch(() => [])
        ]);
        setData(dashData);
        setSubjects(subjectList);
        setScripts(scriptList);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleFilePreview = (node: FileTreeNode) => {
    if (!node.fileId && !node.path) return;
    setActiveScriptFile(node);
  };

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

        {/* Assigned Scripts Metric Card */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
              Evaluation Scripts
            </h3>
            <button
              type="button"
              onClick={() => router.push('/faculty/scripts')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Open Scripts Portal &rarr;
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '170px', alignItems: 'center' }}>
            <h2 style={{ fontSize: '3.75rem', color: '#16A34A', margin: '0 0 8px 0', fontWeight: 900, letterSpacing: '-0.03em' }}>
              {scripts.filter(s => !s.isLocked).length}
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>
              Available now &bull; {scripts.filter(s => s.isLocked).length} scheduled for release
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

      {/* Assigned Scripts Section (Subject Coordinator) */}
      <Card id="scripts-section" glow>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                📁 Assigned Examination Scripts (Subject Coordinator)
              </h3>
              <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                {scripts.length} Total Bundles
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
              Examination script bundles delegated to you by the Branch Coordinator for assessment &amp; grading.
            </p>
          </div>
          <Button variant="secondary" onClick={() => router.push('/faculty/scripts')} style={{ fontSize: '0.82rem' }}>
            Open Dedicated Scripts Portal &rarr;
          </Button>
        </div>

        {/* Scrollable Scripts Table Container */}
        <div style={{
          maxHeight: '380px',
          overflowY: 'auto',
          overflowX: 'auto',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CODE</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>SUBJECT</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>BUNDLE</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>DELEGATED BY</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>RELEASE SCHEDULE</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>VISIBILITY STATUS</th>
                <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {scripts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>
                    No evaluation scripts assigned yet. When your Branch Coordinator delegates bundles for your subjects, they will appear here.
                  </td>
                </tr>
              ) : (
                scripts.map((item) => {
                  const isSelected = inspectScript?.assignmentId === item.assignmentId;
                  return (
                    <tr
                      key={item.assignmentId}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: isSelected ? '#EFF6FF' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                          {item.bundle.subject.subjectCode}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A', fontSize: '0.92rem' }}>
                        {item.bundle.subject.subjectName}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155', fontSize: '0.88rem', fontWeight: 500 }}>
                        <div>{item.bundle.bundleName}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748B' }}>{item.bundle.totalFiles} files &bull; {item.bundle.semesterLevel}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.assignedBy}</span>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Branch Coordinator</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#0F172A', fontSize: '0.85rem' }}>
                        {new Date(item.visibleFrom).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: item.isLocked ? '#FEF3C7' : '#DCFCE7',
                          color: item.isLocked ? '#B45309' : '#15803D'
                        }}>
                          {item.isLocked ? '🔒 Scheduled' : '🟢 Ready / Visible'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <Button
                          variant={isSelected ? 'primary' : 'secondary'}
                          style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                          onClick={() => {
                            if (isSelected) {
                              setInspectScript(null);
                              setActiveScriptFile(null);
                            } else {
                              setInspectScript(item);
                              setActiveScriptFile(null);
                            }
                          }}
                        >
                          {isSelected ? 'Close' : 'View Scripts'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Inline Direct Script Inspection & File Viewer */}
        {inspectScript && (
          <div style={{ marginTop: '24px', borderTop: '2px solid #E2E8F0', paddingTop: '20px', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '3px 8px', borderRadius: '5px', fontSize: '0.8rem', fontWeight: 700 }}>
                    {inspectScript.bundle.subject.subjectCode}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                    {inspectScript.bundle.semesterLevel} &bull; {inspectScript.bundle.month} &bull; {inspectScript.bundle.totalFiles} files
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  {inspectScript.bundle.bundleName}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#475569' }}>
                  {inspectScript.bundle.subject.subjectName} &bull; Delegated by Branch Coordinator: <strong>{inspectScript.assignedBy}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setInspectScript(null); setActiveScriptFile(null); }}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748B', cursor: 'pointer', lineHeight: 1 }}
                title="Close inspection"
              >
                &times;
              </button>
            </div>

            {inspectScript.notes && (
              <div style={{ background: '#F8FAFC', borderLeft: '4px solid #3B82F6', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.88rem', color: '#334155' }}>
                <strong>Instructions from Branch Coordinator:</strong> {inspectScript.notes}
              </div>
            )}

            {inspectScript.isLocked ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', background: '#FFFBEB', border: '1.5px dashed #FDE68A', borderRadius: '12px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔒</div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: '#92400E' }}>
                  Scripts Locked Until Scheduled Release Time
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#B45309' }}>
                  Available on {new Date(inspectScript.visibleFrom).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                    📁 Script Folder Hierarchy &amp; Files ({inspectScript.bundle.totalFiles} files)
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 700 }}>
                    🟢 Visible &amp; Ready for Evaluation
                  </span>
                </div>
                
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', background: '#FFFFFF', maxHeight: '340px', overflowY: 'auto' }}>
                  <FolderTreeViewer
                    nodes={inspectScript.bundle.fileTree || []}
                    onFileSelect={handleFilePreview}
                  />
                </div>

                {activeScriptFile && (
                  <ScriptViewerModal
                    files={inspectScript.bundle.fileTree || []}
                    activeFile={activeScriptFile}
                    onSelectFile={setActiveScriptFile}
                    onClose={() => setActiveScriptFile(null)}
                    bundleTitle={inspectScript.bundle.bundleName}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
