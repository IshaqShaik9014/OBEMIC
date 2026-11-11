'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import { FileTreeNode } from '@/types/script';
import { scriptService } from '@/services/script.service';

interface ScriptViewerModalProps {
  /**
   * The tree or flat list of files in the current bundle
   */
  files: FileTreeNode[];
  /**
   * Currently active/opened file node
   */
  activeFile: FileTreeNode | null;
  /**
   * Callback when switching to another file
   */
  onSelectFile: (file: FileTreeNode) => void;
  /**
   * Callback to close the modal
   */
  onClose: () => void;
  /**
   * Optional bundle title / metadata to show in header
   */
  bundleTitle?: string;
}

/**
 * Recursively extracts all individual file nodes (non-directories with fileId)
 */
function flattenFiles(nodes: FileTreeNode[]): FileTreeNode[] {
  const result: FileTreeNode[] = [];
  function traverse(list: FileTreeNode[]) {
    if (!list || !Array.isArray(list)) return;
    for (const node of list) {
      if (node.isDirectory && node.children && node.children.length > 0) {
        traverse(node.children);
      } else if (!node.isDirectory && (node.fileId || node.path)) {
        result.push(node);
      }
    }
  }
  traverse(nodes);
  return result;
}

export const ScriptViewerModal: React.FC<ScriptViewerModalProps> = ({
  files,
  activeFile,
  onSelectFile,
  onClose,
  bundleTitle
}) => {
  // 1. Flatten all files in the current bundle
  const flatFiles = useMemo(() => flattenFiles(files), [files]);

  // 2. Identify the active index
  const currentIndex = useMemo(() => {
    if (!activeFile) return 0;
    const idx = flatFiles.findIndex(
      (f) => (f.fileId && f.fileId === activeFile.fileId) || f.path === activeFile.path
    );
    return idx >= 0 ? idx : 0;
  }, [flatFiles, activeFile]);

  const currentFile = flatFiles[currentIndex] || activeFile;
  const hasFiles = flatFiles.length > 0;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < flatFiles.length - 1;

  // 3. Navigation handlers
  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onSelectFile(flatFiles[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, flatFiles, onSelectFile]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onSelectFile(flatFiles[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, flatFiles, onSelectFile]);

  // 4. Keyboard Arrow Listeners (Left Arrow = Prev, Right Arrow = Next, Esc = Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is focused inside a text input
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  // 5. Build View-Only URL with auth token
  const fileUrl = useMemo(() => {
    if (!currentFile?.fileId) return '';
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    const base = scriptService.getFileViewUrl(currentFile.fileId);
    return token ? `${base}?token=${token}` : base;
  }, [currentFile]);

  if (!activeFile && !currentFile) return null;

  const fileName = currentFile?.name || 'Examination Script';
  const isImage = fileName.match(/\.(png|jpe?g|webp|gif|bmp|tiff?)$/i);
  const isPdf = fileName.match(/\.pdf$/i);

  const formatFileSize = (bytes?: number) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(8px)',
        padding: '16px'
      }}
      onClick={(e) => {
        // Close if clicking outside modal box
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#0F172A',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1240px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.65)',
          border: '1px solid #334155'
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            background: '#1E293B',
            borderBottom: '1px solid #334155',
            color: '#F8FAFC',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {/* File Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '1.25rem' }}>{isPdf ? '📄' : isImage ? '🖼️' : '📝'}</span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#F8FAFC',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '380px'
                }}
                title={fileName}
              >
                {fileName}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94A3B8', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {bundleTitle && <span>{bundleTitle}</span>}
                {bundleTitle && currentFile?.size && <span>&bull;</span>}
                {currentFile?.size && <span>{formatFileSize(currentFile.size)}</span>}
                {currentFile?.path && currentFile.path !== fileName && (
                  <>
                    <span>&bull;</span>
                    <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentFile.path}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center Navigation Controls (Prev, Counter, Next) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Previous Button */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev}
              title="Previous Script (Left Arrow: ←)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: hasPrev ? '#334155' : '#1E293B',
                color: hasPrev ? '#F8FAFC' : '#64748B',
                border: '1px solid',
                borderColor: hasPrev ? '#475569' : '#334155',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: hasPrev ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (hasPrev) e.currentTarget.style.background = '#2563EB';
              }}
              onMouseLeave={(e) => {
                if (hasPrev) e.currentTarget.style.background = '#334155';
              }}
            >
              <span>◀</span>
              <span>Prev</span>
              <kbd
                style={{
                  background: '#0F172A',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  color: '#94A3B8',
                  fontFamily: 'monospace'
                }}
              >
                ←
              </kbd>
            </button>

            {/* Counter Badge */}
            <div
              style={{
                background: '#0F172A',
                border: '1px solid #334155',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#38BDF8',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Script</span>
              <span style={{ color: '#FFFFFF' }}>{hasFiles ? currentIndex + 1 : 0}</span>
              <span style={{ color: '#64748B' }}>/</span>
              <span style={{ color: '#94A3B8' }}>{flatFiles.length}</span>
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNext}
              title="Next Script (Right Arrow: →)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: hasNext ? '#334155' : '#1E293B',
                color: hasNext ? '#F8FAFC' : '#64748B',
                border: '1px solid',
                borderColor: hasNext ? '#475569' : '#334155',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: hasNext ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (hasNext) e.currentTarget.style.background = '#2563EB';
              }}
              onMouseLeave={(e) => {
                if (hasNext) e.currentTarget.style.background = '#334155';
              }}
            >
              <span>Next</span>
              <kbd
                style={{
                  background: '#0F172A',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  color: '#94A3B8',
                  fontFamily: 'monospace'
                }}
              >
                →
              </kbd>
              <span>▶</span>
            </button>
          </div>

          {/* Right Meta & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid #475569',
                color: '#CBD5E1',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Institutional Policy: Script download is disabled. View-only evaluation mode."
            >
              🔒 View-Only Mode
            </span>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close Viewer (Esc)"
              style={{
                background: '#334155',
                border: '1px solid #475569',
                color: '#F8FAFC',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#EF4444')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#334155')}
            >
              <span>✕</span>
              <kbd
                style={{
                  background: '#0F172A',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  color: '#94A3B8',
                  fontFamily: 'monospace'
                }}
              >
                Esc
              </kbd>
            </button>
          </div>
        </div>

        {/* Main Document Canvas with Floating Side Arrows */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#0B132B',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Floating Left Arrow Button */}
          {hasPrev && (
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Script (Left Arrow)"
              title="Previous Script (Left Arrow: ←)"
              style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '1.6rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(6px)',
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563EB';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              &#10094;
            </button>
          )}

          {/* Floating Right Arrow Button */}
          {hasNext && (
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Script (Right Arrow)"
              title="Next Script (Right Arrow: →)"
              style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '1.6rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(6px)',
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563EB';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              &#10095;
            </button>
          )}

          {/* The Document Viewer */}
          {isImage ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                overflow: 'auto'
              }}
            >
              <img
                src={fileUrl}
                alt={fileName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)',
                  userSelect: 'none'
                }}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          ) : (
            <iframe
              src={`${fileUrl}#toolbar=0&navpanes=0`}
              title={fileName}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#FFFFFF'
              }}
            />
          )}
        </div>

        {/* Bottom Helpful Navigation Strip */}
        <div
          style={{
            padding: '8px 20px',
            background: '#0F172A',
            borderTop: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: '#64748B'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⌨️ Keyboard Navigation:</span>
            <span>
              Press <kbd style={{ background: '#1E293B', color: '#38BDF8', padding: '1px 5px', borderRadius: '3px' }}>←</kbd> / <kbd style={{ background: '#1E293B', color: '#38BDF8', padding: '1px 5px', borderRadius: '3px' }}>→</kbd> to flip between student scripts
            </span>
            <span>&bull;</span>
            <span>
              Press <kbd style={{ background: '#1E293B', color: '#CBD5E1', padding: '1px 5px', borderRadius: '3px' }}>Esc</kbd> to exit
            </span>
          </div>
          <div>
            Showing <strong>{currentIndex + 1}</strong> of <strong>{flatFiles.length}</strong> scripts in bundle
          </div>
        </div>
      </div>
    </div>
  );
};
