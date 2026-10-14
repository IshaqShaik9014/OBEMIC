import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, style, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          style={{
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#334155',
            letterSpacing: '0.02em'
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <div
            style={{
              position: 'absolute',
              left: '14px',
              display: 'flex',
              alignItems: 'center',
              color: '#64748b'
            }}
          >
            {icon}
          </div>
        )}
        <input
          style={{
            width: '100%',
            padding: icon ? '12px 14px 12px 42px' : '12px 14px',
            background: '#ffffff',
            border: error ? '1px solid #ef4444' : '1px solid #cbd5e1',
            borderRadius: '10px',
            color: '#0f172a',
            fontSize: '0.95rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            ...style
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#ef4444' : '#cbd5e1';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  );
};
