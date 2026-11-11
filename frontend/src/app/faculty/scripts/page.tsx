'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { scriptService } from '@/services/script.service';
import { FacultyAssignedScript, FileTreeNode } from '@/types/script';
import { FolderTreeViewer } from '@/components/scripts/FolderTreeViewer';
import { ScriptViewerModal } from '@/components/scripts/ScriptViewerModal';

export default function FacultyScriptsPage() {
  const [assignedScripts, setAssignedScripts] = useState<FacultyAssignedScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [activeScriptFile, setActiveScriptFile] = useState<FileTreeNode | null>(null);

  useEffect(() => {
    loadFacultyScripts();
  }, []);

  const loadFacultyScripts = async () => {
    try {
      setIsLoading(true);
      const data = await scriptService.getFacultyScripts();
      setAssignedScripts(data);
      if (data.length > 0) {
        // Auto-select first available bundle if any
        const activeOne = data.find(d => !d.isLocked);
        setSelectedBundleId(activeOne ? activeOne.assignmentId : data[0].assignmentId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned scripts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilePreview = (node: FileTreeNode) => {
    if (!node.fileId && !node.path) return;
    setActiveScriptFile(node);
  };

  const calculateCountdown = (visibleFrom: string) => {
    const target = new Date(visibleFrom).getTime();
    const now = new Date().getTime();
    const diff = target - now;

    if (diff <= 0) return 'Unlocking now...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  };

  const selectedItem = assignedScripts.find(s => s.assignmentId === selectedBundleId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
          Assigned Evaluation Scripts (Subject Coordinator)
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '4px 0 0 0' }}>
          Browse, inspect, and evaluate question answer scripts delegated to you as Subject Coordinator by the Branch Coordinator.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <p style={{ color: '#64748B', padding: '16px', margin: 0 }}>Loading assigned scripts...</p>
        </Card>
      ) : error ? (
        <Card>
          <p style={{ color: '#DC2626', padding: '16px', margin: 0 }}>⚠️ {error}</p>
        </Card>
      ) : assignedScripts.length === 0 ? (
        <Card glow>
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📂</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
              No Scripts Assigned Yet
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '460px', margin: '0 auto' }}>
              When the Branch Coordinator delegates evaluation scripts for your subject, they will appear here automatically according to their release schedule.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Script Bundles List (Scrollable) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '78vh', overflowY: 'auto', paddingRight: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Your Script Bundles ({assignedScripts.length})
            </h3>

            {assignedScripts.map((item) => {
              const isSelected = item.assignmentId === selectedBundleId;
              const isLocked = item.isLocked;

              return (
                <div
                  key={item.assignmentId}
                  onClick={() => setSelectedBundleId(item.assignmentId)}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '18px',
                    border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 16px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{
                      background: '#EFF6FF',
                      color: '#2563EB',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}>
                      {item.bundle.subject.subjectCode}
                    </span>

                    {/* Status Badge */}
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: isLocked ? '#FEF3C7' : '#DCFCE7',
                      color: isLocked ? '#B45309' : '#15803D'
                    }}>
                      {isLocked ? '🔒 Scheduled' : '🟢 Available'}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                    {item.bundle.bundleName}
                  </h4>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#475569' }}>
                    {item.bundle.subject.subjectName}
                  </p>

                  <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      {item.bundle.semesterLevel} &bull; {item.bundle.month} &bull; {item.bundle.totalFiles} files
                    </div>
                    {isLocked ? (
                      <div style={{ color: '#D97706', fontWeight: 600 }}>
                        ⏳ Unlocks: {new Date(item.visibleFrom).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#B45309' }}>
                          ({calculateCountdown(item.visibleFrom)})
                        </span>
                      </div>
                    ) : (
                      <div style={{ color: '#16A34A', fontWeight: 600 }}>
                        ✓ Unlocked on {new Date(item.visibleFrom).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Bundle Details & Folder Explorer */}
          <div>
            {selectedItem && (
              <Card glow>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      {selectedItem.bundle.subject.subjectCode}
                    </span>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '8px 0 4px 0' }}>
                      {selectedItem.bundle.bundleName}
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                      {selectedItem.bundle.subject.subjectName} &bull; Assigned by {selectedItem.assignedBy}
                    </p>
                  </div>

                  <div>
                    {selectedItem.isLocked ? (
                      <span style={{
                        background: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        color: '#92400E',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>🔒</span> Access Scheduled
                      </span>
                    ) : (
                      <span style={{
                        background: '#DCFCE7',
                        border: '1px solid #BBF7D0',
                        color: '#166534',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>🟢</span> Ready for Evaluation
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes from In-charge */}
                {selectedItem.notes && (
                  <div style={{ background: '#F8FAFC', borderLeft: '4px solid #3B82F6', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>
                      Instructions from OBE In-charge:
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#334155', marginTop: '2px' }}>
                      {selectedItem.notes}
                    </div>
                  </div>
                )}

                {/* Locked State Display */}
                {selectedItem.isLocked ? (
                  <div style={{
                    padding: '40px 24px',
                    textAlign: 'center',
                    background: '#FFFBEB',
                    border: '1.5px dashed #FDE68A',
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔒</div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800, color: '#92400E' }}>
                      Scripts Locked Until Scheduled Release Time
                    </h3>
                    <p style={{ fontSize: '0.92rem', color: '#B45309', maxWidth: '480px', margin: '0 auto 16px auto' }}>
                      The OBE In-charge has scheduled this script bundle to be visible to you starting on:
                    </p>
                    <div style={{
                      display: 'inline-block',
                      background: '#FFFFFF',
                      border: '2px solid #F59E0B',
                      padding: '12px 24px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: '#78350F'
                    }}>
                      🗓️ {new Date(selectedItem.visibleFrom).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
                    </div>
                    <p style={{ margin: '14px 0 0 0', fontSize: '0.85rem', color: '#92400E', fontWeight: 600 }}>
                      Countdown: {calculateCountdown(selectedItem.visibleFrom)}
                    </p>
                  </div>
                ) : (
                  /* Unlocked Folder Explorer */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                        Interactive Folder Structure ({selectedItem.bundle.totalFiles} files)
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                        Click on any file to view (view-only mode)
                      </span>
                    </div>

                    <FolderTreeViewer
                      nodes={selectedItem.bundle.fileTree}
                      onFileSelect={handleFilePreview}
                    />
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* In-Browser Script Viewer with Forward/Backward & Arrow Key Navigation */}
      {activeScriptFile && selectedItem && (
        <ScriptViewerModal
          files={selectedItem.bundle.fileTree || []}
          activeFile={activeScriptFile}
          onSelectFile={setActiveScriptFile}
          onClose={() => setActiveScriptFile(null)}
          bundleTitle={selectedItem.bundle.bundleName}
        />
      )}
    </div>
  );
}
