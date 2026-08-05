import React from 'react';
import { Calendar, Search, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'booking' | 'lookup' | 'admin';
  setActiveTab: (tab: 'booking' | 'lookup' | 'admin') => void;
  isAdminLoggedIn: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isAdminLoggedIn
}) => {
  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px'
      }}>
        {/* Logo & Title */}
        <div 
          onClick={() => setActiveTab('booking')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0D9488 0%, #0D9488 60%, #6366F1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
          }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
                학생 상담 예약 System
              </span>
              <span style={{
                background: '#CCFBF1',
                color: '#0D9488',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '99px'
              }}>
                주·야간
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748B' }}>
              선생님과 1:1 개인 상담 시간 예약
            </p>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <nav style={{ display: 'flex', gap: '0.5rem', background: '#F1F5F9', padding: '4px', borderRadius: '14px' }}>
          <button
            onClick={() => setActiveTab('booking')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'booking' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'booking' ? '#0D9488' : '#64748B',
              boxShadow: activeTab === 'booking' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Calendar size={16} />
            <span>상담 예약</span>
          </button>

          <button
            onClick={() => setActiveTab('lookup')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'lookup' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'lookup' ? '#0D9488' : '#64748B',
              boxShadow: activeTab === 'lookup' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Search size={16} />
            <span>예약 조회/취소</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'admin' ? (isAdminLoggedIn ? '#6366F1' : '#FFFFFF') : 'transparent',
              color: activeTab === 'admin' ? (isAdminLoggedIn ? '#FFFFFF' : '#4F46E5') : '#64748B',
              boxShadow: activeTab === 'admin' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <ShieldCheck size={16} />
            <span>교사 관리자</span>
            {isAdminLoggedIn && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10B981'
              }} />
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
