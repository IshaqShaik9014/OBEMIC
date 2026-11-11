'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { scriptService } from '@/services/script.service';
import { FolderTreeViewer } from '@/components/scripts/FolderTreeViewer';
import { ScriptViewerModal } from '@/components/scripts/ScriptViewerModal';
import { authService } from '@/services/auth.service';
import { FileTreeNode } from '@/types/script';

export default function BranchScriptsPage() {
  const [bundles, setBundles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Inspect Modal
  const [inspectBundle, setInspectBundle] = useState<any | null>(null);
  const [activeScriptFile, setActiveScriptFile] = useState<FileTreeNode | null>(null);

  const handleFilePreview = (node: FileTreeNode) => {
    if (!node.fileId && !node.path) return;
    setActiveScriptFile(node);
  };

  // Delegation Modal State
  const [assigningBundle, setAssigningBundle] = useState<any | null>(null);
  const [subjectFaculty, setSubjectFaculty] = useState<any[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [visibleFrom, setVisibleFrom] = useState('');
  const [visibleUntil, setVisibleUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadBranchBundles();
  }, []);

  const loadBranchBundles = async () => {
    try {
      setIsLoading(true);
      const user = authService.getCurrentUser();
      const data = await scriptService.getBranchBundles(user?.departmentId);
      setBundles(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load branch scripts');
    } finally {
      setIsLoading(false);
    }
  };

  const openAssignModal = async (bundle: any) => {
    setAssigningBundle(bundle);
    setErrorMessage('');
    setSuccessMessage('');

    // Default visibleFrom to current date & time
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setVisibleFrom(localIso);
    setVisibleUntil('');
    setNotes(bundle.subjectCoordinatorAssignment?.notes || '');

    try {
      const facultyList = await scriptService.getSubjectFaculty(bundle.subject.id);
      setSubjectFaculty(facultyList);
      if (facultyList.length > 0) {
        setSelectedFacultyId(bundle.subjectCoordinatorAssignment?.facultyId || facultyList[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load faculty for subject:', err);
    }
  };

  const handleDelegationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningBundle || !selectedFacultyId || !visibleFrom) {
      alert('Please select a Subject Coordinator and scheduled visibility release time.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await scriptService.assignToSubjectCoordinator({
        bundleId: assigningBundle.id,
        facultyId: selectedFacultyId,
        visibleFrom: new Date(visibleFrom).toISOString(),
        visibleUntil: visibleUntil ? new Date(visibleUntil).toISOString() : undefined,
        notes: notes.trim() || undefined
      });

      setSuccessMessage(`Successfully delegated scripts for "${assigningBundle.bundleName}" to the Subject Coordinator.`);
      setAssigningBundle(null);
      await loadBranchBundles();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delegate scripts to Subject Coordinator');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const totalBundles = bundles.length;
  const delegatedCount = bundles.filter(b => b.subjectCoordinatorAssignment).length;
  const pendingCount = totalBundles - delegatedCount;
  const totalFiles = bundles.reduce((acc, b) => acc + (b.totalFiles || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
          Branch Evaluation Scripts Management
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '4px 0 0 0' }}>
          Review examination script bundles allocated by the OBE In-charge and delegate them to Subject Coordinators with scheduled release windows.
        </p>
      </div>

      {successMessage && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '14px 18px', borderRadius: '10px', fontWeight: 600, fontSize: '0.92rem' }}>
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '14px 18px', borderRadius: '10px', fontWeight: 600, fontSize: '0.92rem' }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Card>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Branch Bundles
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {isLoading ? '...' : totalBundles}
          </div>
        </Card>
        <Card>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Delegated to Subject Coordinator
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
            {isLoading ? '...' : delegatedCount}
          </div>
        </Card>
        <Card>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pending Subject Coordinator Allocation
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
            {isLoading ? '...' : pendingCount}
          </div>
        </Card>
        <Card>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Script Files / Scans
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
            {isLoading ? '...' : totalFiles}
          </div>
        </Card>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <Card>
          <p style={{ color: '#64748B', padding: '16px', margin: 0 }}>Loading branch scripts...</p>
        </Card>
      ) : bundles.length === 0 ? (
        <Card glow>
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📦</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
              No Script Bundles Allocated to This Branch Yet
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
              When the central OBE In-charge uploads and assigns evaluation script batches for your department, they will appear here for you to delegate to Subject Coordinators.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {bundles.map((bundle) => {
            const sc = bundle.subjectCoordinatorAssignment;
            const isAssigned = !!sc;

            return (
              <Card key={bundle.id} glow style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* Subject badge & date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      [{bundle.subject.subjectCode}] {bundle.subject.subjectName}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      {bundle.month}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
                    {bundle.bundleName}
                  </h3>

                  {/* Academic Context */}
                  <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', fontSize: '0.82rem', color: '#334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '12px 0 16px 0' }}>
                    <div>Year / Sem: <strong>{bundle.yearLevel} ({bundle.semesterLevel})</strong></div>
                    <div>Academic Year: <strong>{bundle.academicYear.year}</strong></div>
                    <div>Regulation: <strong>{bundle.regulation?.name || 'MIC23'}</strong></div>
                    <div>Total Files: <strong>{bundle.totalFiles}</strong></div>
                  </div>

                  {/* Delegation Status Card */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    background: isAssigned ? '#F0FDF4' : '#FEF2F2',
                    border: isAssigned ? '1px solid #BBF7D0' : '1px solid #FECACA'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem', color: isAssigned ? '#15803D' : '#DC2626' }}>
                      <span>{isAssigned ? '✓' : '⚠️'}</span>
                      <span>{isAssigned ? 'Delegated to Subject Coordinator' : 'Pending Subject Coordinator Allocation'}</span>
                    </div>
                    {isAssigned ? (
                      <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#166534', lineHeight: 1.4 }}>
                        <div><strong>Coordinator:</strong> {sc.facultyName} ({sc.facultyEmail})</div>
                        <div><strong>Scheduled Release:</strong> {new Date(sc.visibleFrom).toLocaleString()}</div>
                        {sc.visibleUntil && <div><strong>Deadline:</strong> {new Date(sc.visibleUntil).toLocaleString()}</div>}
                        {sc.notes && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>&ldquo;{sc.notes}&rdquo;</div>}
                      </div>
                    ) : (
                      <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#991B1B' }}>
                        Click &ldquo;Assign to Subject Coordinator&rdquo; below to select a faculty member and configure their evaluation release schedule.
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    style={{ flex: 1, fontSize: '0.82rem', padding: '10px' }}
                    onClick={() => setInspectBundle(bundle)}
                  >
                    📂 Browse Files
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    style={{ flex: 1.2, fontSize: '0.82rem', padding: '10px' }}
                    onClick={() => openAssignModal(bundle)}
                  >
                    {isAssigned ? '🔄 Reassign Coordinator' : '👤 Assign Coordinator'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Assign to Subject Coordinator */}
      {assigningBundle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(11, 29, 51, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Assign to Subject Coordinator
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                  [{assigningBundle.subject.subjectCode}] {assigningBundle.subject.subjectName} &bull; {assigningBundle.yearLevel} ({assigningBundle.semesterLevel})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningBundle(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748B', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleDelegationSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Select Subject Coordinator */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Select Subject Coordinator (Linked Faculty) *
                </label>
                {subjectFaculty.length === 0 ? (
                  <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', color: '#B45309', fontSize: '0.85rem' }}>
                    No faculty found for this subject or department.
                  </div>
                ) : (
                  <select
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '11px 14px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.92rem', color: '#0F172A', outline: 'none', fontWeight: 600 }}
                  >
                    {subjectFaculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.email}) {f.isDirectlyAssigned ? '★ Assigned to Subject' : ''}
                      </option>
                    ))}
                  </select>
                )}
                <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                  Faculty assigned to this subject are prioritized.
                </span>
              </div>

              {/* Scheduled Release Timestamp (visibleFrom) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Scheduled Release Timestamp (Visible From) *
                </label>
                <input
                  type="datetime-local"
                  value={visibleFrom}
                  onChange={(e) => setVisibleFrom(e.target.value)}
                  required
                  style={{ width: '100%', padding: '11px 14px', background: '#EFF6FF', border: '2px solid #3B82F6', borderRadius: '8px', fontSize: '0.92rem', color: '#0F172A', outline: 'none', fontWeight: 600 }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                  The Subject Coordinator will only be able to view & evaluate scripts after this time.
                </span>
              </div>

              {/* Optional Cutoff Timestamp (visibleUntil) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Evaluation Deadline (Optional Access Cutoff)
                </label>
                <input
                  type="datetime-local"
                  value={visibleUntil}
                  onChange={(e) => setVisibleUntil(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.92rem', color: '#0F172A', outline: 'none' }}
                />
              </div>

              {/* Notes / Instructions */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Instructions / Notes for Subject Coordinator
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Complete marks evaluation for Section A & B by Friday"
                  style={{ width: '100%', padding: '11px 14px', background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '0.92rem', color: '#0F172A', outline: 'none' }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <Button
                  type="button"
                  variant="secondary"
                  style={{ flex: 1 }}
                  onClick={() => setAssigningBundle(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={isSubmitting || !selectedFacultyId}
                  style={{ flex: 1.5 }}
                >
                  Confirm Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Inspect Bundle Files */}
      {inspectBundle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(11, 29, 51, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Bundle Folder Hierarchy: {inspectBundle.bundleName}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                  [{inspectBundle.subject.subjectCode}] {inspectBundle.subject.subjectName} &bull; {inspectBundle.totalFiles} files
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectBundle(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748B', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <FolderTreeViewer
                nodes={inspectBundle.fileTree || []}
                onFileSelect={handleFilePreview}
              />
            </div>
          </div>
        </div>
      )}

      {/* View-Only Script Inspection Modal with Forward/Backward & Arrow Key Navigation */}
      {activeScriptFile && inspectBundle && (
        <ScriptViewerModal
          files={inspectBundle.fileTree || []}
          activeFile={activeScriptFile}
          onSelectFile={setActiveScriptFile}
          onClose={() => setActiveScriptFile(null)}
          bundleTitle={inspectBundle.bundleName}
        />
      )}
    </div>
  );
}
