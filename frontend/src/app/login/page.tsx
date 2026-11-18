'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';

interface LoginPageProps {
  initialModalOpen?: boolean;
}

export default function LoginPage({ initialModalOpen = true }: LoginPageProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(initialModalOpen);
  const [role, setRole] = useState('faculty');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter your Employee ID / Email and Password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isEmail = identifier.includes('@');
      const credentials = isEmail
        ? { email: identifier, password }
        : { employeeId: identifier, password };

      const res = await authService.login(credentials);

      // Route based on user role
      if (res.user.role === 'FACULTY') {
        router.push('/faculty/dashboard');
      } else if (res.user.role === 'OBE_INCHARGE') {
        router.push('/obe/dashboard');
      } else if (res.user.role === 'ADMIN' || res.user.role === 'COORDINATOR') {
        router.push('/admin/dashboard');
      } else if (res.user.role === 'MANAGEMENT') {
        router.push('/management/dashboard');
      } else {
        router.push('/faculty/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Hero Landing Content */}
      <div style={{ maxWidth: '580px', width: '100%', textAlign: 'center', zIndex: 10, position: 'relative' }}>
        {/* College Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: '#FFFFFF',
            padding: '6px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
            border: '2.5px solid rgba(255, 255, 255, 0.95)',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img
              src="/images/mic_logo.jpg"
              alt="MIC College Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div>
            <h1 style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
              margin: 0,
              lineHeight: 1.1,
              textShadow: '0 2px 14px rgba(0, 0, 0, 0.45)'
            }}>
              OBE <span style={{ color: '#3B82F6', textShadow: '0 0 30px rgba(59, 130, 246, 0.4)' }}>MicTech</span>
            </h1>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: 'clamp(0.85rem, 1.6vw, 0.98rem)',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500,
              letterSpacing: '0.2px',
              textShadow: '0 1px 6px rgba(0, 0, 0, 0.35)'
            }}>
              Outcome Based Education Management System
            </p>
          </div>
        </div>

        {/* Hero Content */}
        <div style={{ marginTop: '16px' }}>
          <p style={{
            fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)',
            color: 'rgba(226, 232, 240, 0.92)',
            maxWidth: '500px',
            margin: '0 auto 28px auto',
            lineHeight: 1.65,
            textShadow: '0 1px 6px rgba(0, 0, 0, 0.4)'
          }}>
            Streamline academic workflows, track subject progress, and manage outcome-based evaluation with precision.
          </p>

          <div>
            <button
              type="button"
              className="btn-glow"
              onClick={() => setIsModalOpen(true)}
            >
              Access Portal <span className="arrow">→</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          marginTop: '44px',
          fontSize: '0.82rem',
          color: 'rgba(148, 163, 184, 0.75)',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
          letterSpacing: '0.3px'
        }}>
          &copy; 2026 OBE MicTech &mdash; All rights reserved
        </p>
      </div>

      {/* Login Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          {/* Overlay with blur */}
          <div
            onClick={() => setIsModalOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(11, 29, 51, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          />

          {/* Modal Card */}
          <div
            className="login-modal-animate"
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: '430px',
              borderRadius: '18px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
              position: 'relative',
              zIndex: 10,
              overflow: 'hidden',
              borderTop: '4px solid #3B82F6'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                background: '#FFFFFF'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src="/images/mic_logo.jpg"
                  alt="MIC"
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'contain' }}
                />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  Login to Portal
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  lineHeight: '1',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'color 0.15s ease'
                }}
                title="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      color: '#DC2626',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Role Selection */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px'
                  }}>
                    Select Institutional Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#F8FAFC',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.92rem',
                      color: '#0F172A',
                      outline: 'none',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <option value="admin">HOD (Department Admin)</option>
                    <option value="coordinator">Branch Coordinator</option>
                    <option value="faculty">Faculty / Subject Coordinator</option>
                    <option value="obe_incharge">OBE In-charge</option>
                    <option value="management">Management</option>
                  </select>
                </div>

                {/* Username / Employee ID / Email */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px'
                  }}>
                    Username / Employee ID / Email
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      role === 'admin'
                        ? 'e.g. admin@mictech.ac.in or HOD Employee ID'
                        : role === 'coordinator'
                        ? 'e.g. coordinator@mictech.ac.in or Coordinator ID'
                        : role === 'obe_incharge'
                        ? 'e.g. obe@mictech.ac.in or OBE Employee ID'
                        : role === 'management'
                        ? 'e.g. management@mictech.ac.in'
                        : 'e.g. faculty@college.edu or Faculty ID'
                    }
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: '#F8FAFC',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.92rem',
                      color: '#0F172A',
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px'
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={{
                        width: '100%',
                        padding: '11px 44px 11px 14px',
                        background: '#F8FAFC',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '0.92rem',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: showPassword ? '#2563EB' : '#94A3B8',
                        borderRadius: '6px',
                        transition: 'color 0.15s ease'
                      }}
                    >
                      {showPassword ? (
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
