'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { User } from '@/types/auth';

interface NavItem {
  label: string;
  href: string;
  iconType: string;
  tabKey?: string;
}

function SidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'dashboard':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
          </svg>
        );
      case 'database':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
        );
      case 'book':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
        );
      case 'check':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        );
      case 'settings':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        );
      case 'survey':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        );
      case 'faculty':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        );
      case 'link':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        );
      case 'script':
      case 'file':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        );
      case 'upload':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        );
    }
  };

  let navItems: NavItem[] = [];

  if (user?.role === 'ADMIN') {
    navItems = [
      { label: 'HOD Dashboard', href: '/admin/dashboard', iconType: 'dashboard' },
      { label: 'Review Reports', href: '/admin/review', iconType: 'check' },
      { label: 'Branch Scripts', href: '/admin/scripts', iconType: 'script' },
      { label: 'Faculty Management', href: '/admin/faculty', iconType: 'faculty' },
      { label: 'System Setup', href: '/admin/setup', iconType: 'settings' },
      { label: 'Survey Management', href: '/admin/surveys', iconType: 'survey' },
      { label: 'Subjects', href: '/admin/subjects', iconType: 'book' },
      { label: 'Assignments', href: '/admin/assignments', iconType: 'link' }
    ];
  } else if (user?.role === 'COORDINATOR') {
    navItems = [
      { label: 'Branch Coordinator Dashboard', href: '/admin/dashboard', iconType: 'dashboard' },
      { label: 'Branch Scripts', href: '/admin/scripts', iconType: 'script' },
      { label: 'Review Reports', href: '/admin/review', iconType: 'check' }
    ];
  } else if (user?.role === 'OBE_INCHARGE') {
    navItems = [
      { label: 'OBE Dashboard', href: '/obe/dashboard', tabKey: 'dashboard', iconType: 'dashboard' },
      { label: 'Database Hub', href: '/obe/dashboard?tab=database', tabKey: 'database', iconType: 'database' },
      { label: 'Staff Onboarding', href: '/obe/dashboard?tab=staff', tabKey: 'staff', iconType: 'faculty' },
      { label: 'Upload Scripts', href: '/obe/dashboard?tab=upload', tabKey: 'upload', iconType: 'upload' },
      { label: 'Assign Scripts', href: '/obe/dashboard?tab=assign', tabKey: 'assign', iconType: 'link' },
      { label: 'Script Bundles', href: '/obe/dashboard?tab=bundles', tabKey: 'bundles', iconType: 'script' }
    ];
  } else if (user?.role === 'FACULTY') {
    navItems = [
      { label: 'My Dashboard', href: '/faculty/dashboard', iconType: 'dashboard' },
      { label: 'Assigned Subjects', href: '/faculty/dashboard#subjects', iconType: 'book' },
      { label: 'Scripts', href: '/faculty/scripts', iconType: 'script' }
    ];
  } else if (user?.role === 'MANAGEMENT') {
    navItems = [
      { label: 'Dashboard', href: '/management/dashboard', iconType: 'dashboard' },
      { label: 'Verify Marks', href: '/management/verify', iconType: 'check' }
    ];
  }

  const currentTab = searchParams.get('tab');

  return (
    <aside
      style={{
        width: '260px',
        minHeight: '100vh',
        background: '#0B1D33',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '4px 0 16px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div>
        {/* Brand Header */}
        <div
          style={{
            padding: '4px 12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <img
            src="/logo.png"
            alt="OBE MicTech"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.85)',
              background: '#ffffff',
              objectFit: 'contain',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}
          />
          <div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '800',
                color: '#ffffff',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.2
              }}
            >
              OBE MicTech
            </h2>
          </div>
        </div>

        {/* Section Title: MENU */}
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: '700',
            color: '#64748B',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '0 12px',
            marginTop: '24px',
            marginBottom: '10px'
          }}
        >
          MENU
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const isActive = (() => {
              if (user?.role === 'OBE_INCHARGE' && pathname.startsWith('/obe/dashboard')) {
                const effectiveTab = (!currentTab || currentTab === 'dashboard') ? 'dashboard' : currentTab;
                return item.tabKey === effectiveTab;
              }
              if (item.href.includes('#')) {
                const [base, hash] = item.href.split('#');
                return pathname === base && typeof window !== 'undefined' && window.location.hash === `#${hash}`;
              }
              return (
                pathname === item.href ||
                (item.href !== '/admin/dashboard' &&
                  item.href !== '/faculty/dashboard' &&
                  item.href !== '/obe/dashboard' &&
                  pathname.startsWith(item.href))
              );
            })();

            return (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#ffffff' : '#94A3B8',
                  background: isActive ? '#2563EB' : 'transparent',
                  boxShadow: isActive ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#94A3B8';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {renderIcon(item.iconType)}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Sign Out */}
      <div>
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#475569',
            marginBottom: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            paddingTop: '12px'
          }}
        >
          Institutional OBE Core &bull; v2.4
        </div>
        <button
          onClick={() => authService.logout()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.88rem',
            fontWeight: '600',
            color: '#F87171',
            background: 'rgba(239, 68, 68, 0.08)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export const Sidebar: React.FC = () => {
  return (
    <Suspense fallback={<aside style={{ width: '260px', minHeight: '100vh', background: '#0B1D33' }} />}>
      <SidebarInner />
    </Suspense>
  );
};
