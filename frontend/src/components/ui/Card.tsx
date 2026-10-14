import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, glow = false, style, ...props }) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: glow ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: glow 
          ? '0 4px 20px rgba(59, 130, 246, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)' 
          : '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        color: '#0F172A',
        transition: 'all 0.25s ease',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};
