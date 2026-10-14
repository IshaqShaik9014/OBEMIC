'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { adminService } from '@/services/admin.service';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboardStats()
      .then(data => {
        setStats(data);
      })
      .catch(err => {
        console.error('Failed to load stats', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Admin / Coordinator Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Manage System Data & Review Course Outcome Attainment Reports
          </p>
        </div>
        <Button variant="secondary" onClick={() => authService.logout()}>Sign Out</Button>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Faculty</p>
          <h2 style={{ margin: '8px 0 0 0', color: '#0f172a', fontSize: '2rem', fontWeight: 800 }}>{isLoading ? '-' : stats?.totalFaculty || 0}</h2>
        </Card>
        <Card>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Subjects</p>
          <h2 style={{ margin: '8px 0 0 0', color: '#0f172a', fontSize: '2rem', fontWeight: 800 }}>{isLoading ? '-' : stats?.totalSubjects || 0}</h2>
        </Card>
        <Card>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending Reports</p>
          <h2 style={{ margin: '8px 0 0 0', color: '#ef4444', fontSize: '2rem', fontWeight: 800 }}>{isLoading ? '-' : stats?.pendingReports || 0}</h2>
        </Card>
        <Card>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Surveys</p>
          <h2 style={{ margin: '8px 0 0 0', color: '#10b981', fontSize: '2rem', fontWeight: 800 }}>{isLoading ? '-' : stats?.activeSurveys || 0}</h2>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <Card glow>
          <h3 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>Review Reports (Coordinator)</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Review, evaluate, and formally approve attainment reports submitted by faculty members.
          </p>
          <Button style={{ marginTop: '16px' }} onClick={() => router.push('/admin/review')}>Go to Review Section</Button>
        </Card>

        <Card glow>
          <h3 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>System Configuration (Admin)</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Upload Course Outcomes, staff rosters, PO/PSO mappings, and manage database targets.
          </p>
          <Button style={{ marginTop: '16px' }} onClick={() => router.push('/admin/setup')}>Manage Setup</Button>
        </Card>

        <Card glow>
          <h3 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>Survey Management</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Create Indirect Surveys, configure timeframes, and toggle OPEN/CLOSE access status.
          </p>
          <Button style={{ marginTop: '16px' }} onClick={() => router.push('/admin/surveys')}>Manage Surveys</Button>
        </Card>

        <Card glow>
          <h3 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>Faculty Management</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Onboard new faculty members, manage roles, and link subjects & course sections.
          </p>
          <Button style={{ marginTop: '16px' }} onClick={() => router.push('/admin/faculty')}>Manage Faculty</Button>
        </Card>
      </div>
    </div>
  );
}
