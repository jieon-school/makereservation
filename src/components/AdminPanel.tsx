import React, { useState } from 'react';
import { ShieldCheck, Lock, Clock, Mail } from 'lucide-react';
import { StorageService, DEFAULT_TIME_SLOTS, isNightSlot } from '../services/storage';

interface AdminPanelProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (val: boolean) => void;
  onOpenEmailSettings: () => void;
  onDataChanged: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  selectedDate,
  isAdminLoggedIn,
  setIsAdminLoggedIn,
  onOpenEmailSettings,
  onDataChanged
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<'schedule' | 'reservations'>('schedule');

  // Filter state for reservations
  const [searchName, setSearchName] = useState('');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Reservations list
  const reservations = StorageService.getReservations();
  const daySlots = StorageService.getSlotsForDate(selectedDate);
  const daySchedules = StorageService.getDaySchedules();
  const isClosedDay = !!daySchedules[selectedDate]?.isClosedDay;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = StorageService.getAdminPin();
    if (pinInput.trim() === correctPin) {
      setIsAdminLoggedIn(true);
      setPinError('');
    } else {
      setPinError('관리자 비밀번호가 올바르지 않습니다.');
    }
  };

  // 슬롯 개별 토글
  const handleToggleSlot = (time: string, currentStatus: string) => {
    if (currentStatus === 'booked') {
      alert('이미 학생이 예약을 완료한 슬롯입니다.');
      return;
    }
    const newStatus = currentStatus === 'blocked' ? 'available' : 'blocked';
    StorageService.updateSlotForDate(selectedDate, time, newStatus);
    onDataChanged();
  };

  // 일괄 토글
  const handleBulkSet = (type: 'all_available' | 'all_blocked' | 'day_only' | 'night_only') => {
    DEFAULT_TIME_SLOTS.forEach(time => {
      let targetStatus: 'available' | 'blocked' = 'available';
      if (type === 'all_blocked') targetStatus = 'blocked';
      else if (type === 'day_only') targetStatus = isNightSlot(time) ? 'blocked' : 'available';
      else if (type === 'night_only') targetStatus = !isNightSlot(time) ? 'blocked' : 'available';

      StorageService.updateSlotForDate(selectedDate, time, targetStatus);
    });
    onDataChanged();
  };

  // 특정 날짜 전체 휴무 토글
  const handleToggleClosedDay = () => {
    StorageService.toggleClosedDay(selectedDate, !isClosedDay);
    onDataChanged();
  };

  // 예약 상태 변경
  const handleStatusChange = (id: string, newStatus: any) => {
    StorageService.updateReservation(id, { status: newStatus });
    onDataChanged();
  };

  // 필터링된 예약 목록
  const filteredReservations = reservations.filter(r => {
    const matchName = !searchName || r.studentName.toLowerCase().includes(searchName.toLowerCase());
    const matchTopic = filterTopic === 'all' || r.topic === filterTopic;
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchName && matchTopic && matchStatus;
  });

  if (!isAdminLoggedIn) {
    return (
      <div className="glass-card" style={{ maxWidth: '420px', margin: '3rem auto', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
          boxShadow: '0 6px 16px rgba(99, 102, 241, 0.3)'
        }}>
          <ShieldCheck size={28} />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
          교사 관리자 로그인
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.3rem', marginBottom: '1.5rem' }}>
          상담 일정 설정 및 학생 예약 관리를 위한 관리자 인증이 필요합니다.
        </p>

        {pinError && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            padding: '0.65rem',
            borderRadius: '10px',
            fontSize: '0.8rem',
            marginBottom: '1rem'
          }}>
            {pinError}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input
              type="password"
              className="form-input"
              placeholder="관리자 비밀번호 입력"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '0.2em' }}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.85rem', background: '#6366F1' }}>
            <Lock size={16} />
            관리자 접속하기
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '3rem' }}>
      {/* Admin Top Banner */}
      <div className="glass-card" style={{
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
        color: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={24} color="#818CF8" />
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>교사 전용 관리자 모드</div>
            <div style={{ fontSize: '0.8rem', color: '#A5B4FC' }}>
              상담 일정 및 학생 예약 현황을 실시간 관리합니다.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={onOpenEmailSettings}
            className="btn-secondary"
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.15)', color: '#FFF', border: 'none' }}
          >
            <Mail size={16} />
            Gmail 알림 설정
          </button>
          <button
            onClick={() => setIsAdminLoggedIn(false)}
            className="btn-secondary"
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', background: 'transparent', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Admin Mode Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('schedule')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            background: activeTab === 'schedule' ? '#6366F1' : '#FFFFFF',
            color: activeTab === 'schedule' ? '#FFFFFF' : '#64748B',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          📅 날짜별 상담 시간대 설정 ({selectedDate})
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            background: activeTab === 'reservations' ? '#6366F1' : '#FFFFFF',
            color: activeTab === 'reservations' ? '#FFFFFF' : '#64748B',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          📋 전체 예약 목록 및 관리 ({reservations.length}건)
        </button>
      </div>

      {/* Tab 1: Schedule Manager */}
      {activeTab === 'schedule' && (
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                {selectedDate} 시간 슬롯 관리
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#64748B' }}>
                클릭하여 특정 시간대의 학생 예약 가능 여부를 토글합니다.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleBulkSet('all_available')}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}
              >
                전체 열기
              </button>
              <button
                onClick={() => handleBulkSet('day_only')}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}
              >
                주간만 열기
              </button>
              <button
                onClick={() => handleBulkSet('night_only')}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}
              >
                야간만 열기
              </button>
              <button
                onClick={handleToggleClosedDay}
                className={isClosedDay ? "btn-primary" : "btn-danger"}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}
              >
                {isClosedDay ? '해당 날짜 마감 해제' : '해당 날짜 전체 휴무 마감'}
              </button>
            </div>
          </div>

          {isClosedDay ? (
            <div style={{ background: '#FEF2F2', padding: '2rem', borderRadius: '14px', textAlign: 'center', color: '#991B1B', fontWeight: 700 }}>
              🚫 현재 {selectedDate} 날짜 전체가 예약 마감(휴무) 상태로 설정되어 있습니다.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '0.75rem'
            }}>
              {daySlots.map((slot) => {
                const isBooked = slot.status === 'booked';
                const isBlocked = slot.status === 'blocked';

                return (
                  <button
                    key={slot.time}
                    onClick={() => handleToggleSlot(slot.time, slot.status)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '14px',
                      border: isBooked ? '1.5px solid #FCA5A5' : isBlocked ? '1.5px solid #CBD5E1' : '1.5px solid #6EE7B7',
                      background: isBooked ? '#FEF2F2' : isBlocked ? '#F1F5F9' : '#ECFDF5',
                      color: isBooked ? '#991B1B' : isBlocked ? '#64748B' : '#065F46',
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 700
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '1rem' }}>
                      <Clock size={14} />
                      <span>{slot.time}</span>
                      {slot.isNight && <span style={{ fontSize: '0.65rem', color: '#8B5CF6' }}>야간</span>}
                    </div>
                    <span style={{ fontSize: '0.72rem' }}>
                      {isBooked ? '🔒 예약완료' : isBlocked ? '❌ 차단됨' : '✅ 오픈 상태'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Reservations List */}
      {activeTab === 'reservations' && (
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="학생 이름 검색..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
            >
              <option value="all">전체 상담 주제</option>
              <option value="수시 상담">수시 상담</option>
              <option value="정시 상담">정시 상담</option>
              <option value="학교 생활">학교 생활</option>
              <option value="기타">기타</option>
            </select>

            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">전체 예약 상태</option>
              <option value="confirmed">예약 확정</option>
              <option value="completed">상담 완료</option>
              <option value="cancelled">예약 취소됨</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569' }}>일시</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569' }}>학생 이름</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569' }}>학년/반/번호</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569' }}>상담 주제</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569' }}>상담 내용</th>
                  <th style={{ padding: '0.75rem 1rem', color: '#475569' }}>상태 관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                      조건에 일치하는 학생 예약 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => (
                    <tr key={res.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                        {res.date} <span style={{ color: '#0D9488' }}>{res.timeSlot}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0F172A' }}>
                        {res.studentName}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {res.studentGradeClass}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '99px',
                          background: res.topic === '수시 상담' ? '#CCFBF1' : res.topic === '정시 상담' ? '#EEF2FF' : '#F3E8FF',
                          color: res.topic === '수시 상담' ? '#0F766E' : res.topic === '정시 상담' ? '#4338CA' : '#7E22CE'
                        }}>
                          {res.topic}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748B', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {res.notes || '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <select
                          value={res.status}
                          onChange={(e) => handleStatusChange(res.id, e.target.value)}
                          style={{
                            padding: '0.3rem 0.5rem',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: res.status === 'confirmed' ? '#ECFDF5' : res.status === 'completed' ? '#EFF6FF' : '#FEF2F2',
                            color: res.status === 'confirmed' ? '#047857' : res.status === 'completed' ? '#1D4ED8' : '#B91C1C'
                          }}
                        >
                          <option value="confirmed">예약 확정</option>
                          <option value="completed">상담 완료</option>
                          <option value="cancelled">예약 취소</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
