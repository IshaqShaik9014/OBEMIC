'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import LoginPage from './login/page';

export default function RootPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      if (user?.role === 'ADMIN' || user?.role === 'COORDINATOR') {
        router.replace('/admin/dashboard');
      } else if (user?.role === 'MANAGEMENT') {
        router.replace('/management/dashboard');
      } else {
        router.replace('/faculty/dashboard');
      }
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="login-page">
        <div style={{ color: '#FFFFFF', fontSize: '1rem', fontWeight: 600 }}>
          Loading OBE MicTech Portal...
        </div>
      </div>
    );
  }

  return <LoginPage initialModalOpen={false} />;
}
