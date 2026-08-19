'use client';

import React, { useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';
import { User } from '@/types/auth';

export const Navbar: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  return (
    <header
      style={{
        height: '70px',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>
          Outcome-Based Education Management System
        </h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f8fafc' }}>
                {user.name || 'Faculty Member'}
              </p>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: '#60a5fa',
                  background: 'rgba(59, 130, 246, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                {user.role} {user.employeeId ? `• ${user.employeeId}` : ''}
              </span>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.9rem',
                boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)'
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : 'F'}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
