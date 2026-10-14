'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsLoading(true);
      await authService.changePassword(oldPassword, newPassword);
      // Once successfully changed, clear local storage and redirect to login
      await authService.logout();
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#F1F5F9' }}>
      <Card style={{ maxWidth: '420px', width: '100%', padding: '36px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#0F172A', marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>
          Change Password
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '24px', textAlign: 'center' }}>
          Secure your account by updating your password.
        </p>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: '#334155', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              Current Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: '#FFFFFF', border: '1px solid #CBD5E1',
                color: '#0F172A', fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#334155', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: '#FFFFFF', border: '1px solid #CBD5E1',
                color: '#0F172A', fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#334155', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: '#FFFFFF', border: '1px solid #CBD5E1',
                color: '#0F172A', fontSize: '1rem'
              }}
            />
          </div>

          <Button type="submit" disabled={isLoading} style={{ marginTop: '8px', padding: '14px', width: '100%' }}>
            {isLoading ? 'Updating...' : 'Update Password & Re-login'}
          </Button>
          <button type="button" onClick={() => router.back()} style={{ marginTop: '8px', padding: '12px', width: '100%', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
            Cancel / Back
          </button>
        </form>
      </Card>
    </div>
  );
}
