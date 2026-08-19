'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';

export default function AdminDashboardPage() {
  const router = useRouter();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#f8fafc', margin: 0 }}>Admin / Coordinator Dashboard</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Manage System Data & Review Reports</p>
        </div>
        <Button onClick={() => authService.logout()}>Logout</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card glow>
          <h3 style={{ color: '#f8fafc', marginTop: 0 }}>Review Reports (Coordinator)</h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
             Review and approve reports submitted by faculty members.
          </p>
          <Button style={{ marginTop: '16px' }} onClick={() => router.push('/admin/review')}>Go to Review Section</Button>
        </Card>

        <Card glow>
          <h3 style={{ color: '#f8fafc', marginTop: 0 }}>System Configuration (Admin)</h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
             Upload Course Outcomes, update PO mappings, and manage users.
          </p>
          <Button style={{ marginTop: '16px' }} onClick={() => router.push('/admin/setup')}>Manage Setup</Button>
        </Card>

        <Card glow>
          <h3 style={{ color: '#f8fafc', marginTop: 0 }}>Survey Management</h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
             Create Indirect Surveys, define timeframes, and toggle OPEN/CLOSE status.
          </p>
          <Button style={{ marginTop: '16px' }} onClick={() => router.push('/admin/surveys')}>Manage Surveys</Button>
        </Card>

        <Card glow>
          <h3 style={{ color: '#f8fafc', marginTop: 0 }}>Faculty Management</h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
             Onboard new faculty members and assign subjects & sections.
          </p>
          <Button style={{ marginTop: '16px' }} onClick={() => router.push('/admin/faculty')}>Manage Faculty</Button>
        </Card>
      </div>
    </div>
  );
}
