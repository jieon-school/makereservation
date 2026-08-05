import React from 'react';
import { Clock, Sun, Moon, CheckCircle2, Lock, XCircle } from 'lucide-react';
import type { TimeSlotConfig } from '../types/reservation';

interface TimeSlotGridProps {
  slots: TimeSlotConfig[];
  selectedSlot: string | null;
  onSelectSlot: (time: string) => void;
  isClosedDay?: boolean;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
  isClosedDay
}) => {
  if (isClosedDay) {
    return (
      <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', margin: '1rem 0' }}>
        <XCircle size={48} color="#EF4444" style={{ marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A' }}>선택하신 날짜는 예약이 마감되었습니다</h3>
        <p style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '0.4rem' }}>
          선생님 사정 또는 학교 일정으로 인해 전체 상담 예약이 불가능합니다. 다른 날짜를 선택해주세요.
        </p>
      </div>
    );
  }

  const daySlots = slots.filter(s => !s.isNight);
  const nightSlots = slots.filter(s => s.isNight);

  const renderSlotCard = (slot: TimeSlotConfig) => {
    const isSelected = selectedSlot === slot.time;
    const isAvailable = slot.status === 'available';
    const isBooked = slot.status === 'booked';

    let bgColor = '#FFFFFF';
    let borderColor = '#E2E8F0';
    let textColor = '#0F172A';
    let statusText = '예약 가능';
    let statusBg = '#ECFDF5';
    let statusColor = '#10B981';

    if (isBooked) {
      bgColor = '#FEF2F2';
      borderColor = '#FCA5A5';
      textColor = '#991B1B';
      statusText = '예약 완료';
      statusBg = '#FEE2E2';
      statusColor = '#EF4444';
    } else if (slot.status === 'blocked') {
      bgColor = '#F8FAFC';
      borderColor = '#E2E8F0';
      textColor = '#94A3B8';
      statusText = '마감/불가';
      statusBg = '#F1F5F9';
      statusColor = '#64748B';
    }

    if (isSelected) {
      bgColor = '#0D9488';
      borderColor = '#0D9488';
      textColor = '#FFFFFF';
      statusBg = 'rgba(255,255,255,0.2)';
      statusColor = '#FFFFFF';
    }

    return (
      <button
        key={slot.time}
        disabled={!isAvailable}
        onClick={() => isAvailable && onSelectSlot(slot.time)}
        style={{
          padding: '1rem',
          borderRadius: '16px',
          border: isSelected ? '2px solid #0D9488' : `1.5px solid ${borderColor}`,
          background: bgColor,
          color: textColor,
          cursor: isAvailable ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          position: 'relative',
          boxShadow: isSelected 
            ? '0 8px 20px rgba(13, 148, 136, 0.35)' 
            : isAvailable ? '0 2px 8px rgba(0,0,0,0.03)' : 'none',
          transform: isSelected ? 'scale(1.03)' : 'none',
          opacity: slot.status === 'blocked' ? 0.75 : 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={16} opacity={isSelected ? 1 : 0.7} />
          <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {slot.time}
          </span>
        </div>

        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '99px',
          background: statusBg,
          color: statusColor,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px'
        }}>
          {isAvailable && <CheckCircle2 size={10} />}
          {isBooked && <Lock size={10} />}
          {statusText}
        </span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginBottom: '2rem' }}>
      {/* 주간 상담 타임 슬롯 (09:00 ~ 17:00) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <Sun size={18} color="#F59E0B" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B' }}>
            주간 상담 시간 (09:00 ~ 17:00)
          </h3>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '0.85rem'
        }}>
          {daySlots.map(renderSlotCard)}
        </div>
      </div>

      {/* 야간 상담 타임 슬롯 (18:30 ~ 21:30) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <Moon size={18} color="#8B5CF6" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B' }}>
            야간 상담 시간 (18:30 ~ 21:30)
          </h3>
          <span style={{
            background: '#F3E8FF',
            color: '#8B5CF6',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '99px'
          }}>
            야간 야자 시간
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '0.85rem'
        }}>
          {nightSlots.map(renderSlotCard)}
        </div>
      </div>
    </div>
  );
};
