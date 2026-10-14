'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';

export default function ManagementDashboardPage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#0F172A', margin: 0, fontWeight: 700 }}>Management Dashboard</h1>
          <p style={{ color: '#64748B', margin: '4px 0 0 0' }}>Overall View of the Process</p>
        </div>
        <Button onClick={() => authService.logout()} variant="secondary">Logout</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        <Card glow>
          <h3 style={{ color: '#475569', marginTop: 0, fontSize: '1rem', fontWeight: 600 }}>Total Subjects</h3>
          <p style={{ color: '#2563EB', fontSize: '2.2rem', fontWeight: 'bold', margin: '8px 0 0 0' }}>142</p>
        </Card>
        <Card glow>
          <h3 style={{ color: '#475569', marginTop: 0, fontSize: '1rem', fontWeight: 600 }}>Reports Generated</h3>
          <p style={{ color: '#10B981', fontSize: '2.2rem', fontWeight: 'bold', margin: '8px 0 0 0' }}>87</p>
        </Card>
        <Card glow>
          <h3 style={{ color: '#475569', marginTop: 0, fontSize: '1rem', fontWeight: 600 }}>Pending Submissions</h3>
          <p style={{ color: '#F59E0B', fontSize: '2.2rem', fontWeight: 'bold', margin: '8px 0 0 0' }}>55</p>
        </Card>
      </div>
      
      <Card>
         <h3 style={{ color: '#0F172A', marginTop: 0, fontWeight: 700 }}>Department Wise Progress</h3>
         <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
            [Attainment Overview Analytics]
         </div>
      </Card>
    </div>
  );
}
