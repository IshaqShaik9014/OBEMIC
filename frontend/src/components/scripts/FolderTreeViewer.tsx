'use client';

import React, { useState } from 'react';
import { FileTreeNode } from '@/types/script';

interface FolderTreeViewerProps {
  nodes: FileTreeNode[];
  onFileSelect?: (node: FileTreeNode) => void;
  downloadBaseUrl?: string;
}

export const FolderTreeViewer: React.FC<FolderTreeViewerProps> = ({
  nodes,
  onFileSelect,
  downloadBaseUrl
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    '': true // Root open by default
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return (
        <span style={{ color: '#DC2626', fontSize: '1rem' }} title="PDF Document">
          📄
        </span>
      );
    }
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      return (
        <span style={{ color: '#2563EB', fontSize: '1rem' }} title="Image File">
          🖼️
        </span>
      );
    }
    return (
      <span style={{ color: '#64748B', fontSize: '1rem' }} title="Document">
        📝
      </span>
    );
  };

  const renderNodes = (nodeList: FileTreeNode[], depth: number = 0) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {nodeList.map((node) => {
          const isDir = node.isDirectory;
          const isExpanded = !!expandedFolders[node.path];
          const paddingLeft = `${depth * 22 + 10}px`;

          if (isDir) {
            return (
              <div key={node.path || node.name}>
                <div
                  onClick={() => toggleFolder(node.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    paddingLeft,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    background: isExpanded ? '#EFF6FF' : 'transparent',
                    color: isExpanded ? '#1D4ED8' : '#334155',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '0.8rem', width: '14px', textAlign: 'center' }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span style={{ fontSize: '1.1rem' }}>📁</span>
                  <span style={{ flex: 1 }}>{node.name}</span>
                  {node.children && (
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
                      {node.children.length} {node.children.length === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
                {isExpanded && node.children && (
                  <div style={{ borderLeft: '1.5px solid #E2E8F0', marginLeft: `${depth * 22 + 16}px` }}>
                    {renderNodes(node.children, depth + 1)}
                  </div>
                )}
              </div>
            );
          }

          // Individual File Node
          return (
            <div
              key={node.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                paddingLeft,
                borderRadius: '6px',
                background: '#FFFFFF',
                border: '1px solid #F1F5F9',
                margin: '2px 0',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  minWidth: 0,
                  flex: 1,
                  cursor: onFileSelect ? 'pointer' : 'default'
                }}
                onClick={() => onFileSelect && onFileSelect(node)}
              >
                {renderFileIcon(node.name)}
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    color: '#0F172A',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {node.name}
                </span>
                {node.size !== undefined && (
                  <span style={{ fontSize: '0.75rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                    ({formatFileSize(node.size)})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: '#64748B',
                    fontWeight: 600,
                    padding: '2px 6px',
                    background: '#F1F5F9',
                    borderRadius: '4px',
                    letterSpacing: '0.3px'
                  }}
                  title="Script download disabled by institutional policy. View-only access."
                >
                  🔒 View Only
                </span>
                {onFileSelect && (
                  <button
                    type="button"
                    onClick={() => onFileSelect(node)}
                    style={{
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#2563EB',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="View script file"
                  >
                    <span>👁️</span> View
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
        No files in this folder structure.
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        padding: '16px',
        maxHeight: '480px',
        overflowY: 'auto'
      }}
    >
      {renderNodes(nodes)}
    </div>
  );
};
