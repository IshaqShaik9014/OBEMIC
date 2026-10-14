import React from 'react';
import { ReportStatus } from '@/types/faculty';

interface BadgeProps {
  status: ReportStatus | string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'APPROVED':
      case 'PUBLISHED':
        return {
          bg: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          dot: '#10B981'
        };
      case 'SUBMITTED':
      case 'REVIEWED':
        return {
          bg: '#EFF6FF',
          border: '1px solid #BFDBFE',
          color: '#1D4ED8',
          dot: '#3B82F6'
        };
      case 'GENERATED':
        return {
          bg: '#F5F3FF',
          border: '1px solid #DDD6FE',
          color: '#6D28D9',
          dot: '#8B5CF6'
        };
      case 'REJECTED':
        return {
          bg: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#B91C1C',
          dot: '#EF4444'
        };
      case 'DRAFT':
      default:
        return {
          bg: '#F1F5F9',
          border: '1px solid #E2E8F0',
          color: '#475569',
          dot: '#94A3B8'
        };
    }
  };

  const style = getStatusStyles();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        backgroundColor: style.bg,
        border: style.border,
        color: style.color,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: style.dot,
          boxShadow: `0 0 6px ${style.dot}`,
        }}
      />
      {status}
    </span>
  );
};
