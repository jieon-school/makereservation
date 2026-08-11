import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTodayString, StorageService } from '../services/storage';

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateChange
}) => {
  // 오늘 날짜부터 14일간의 날짜 목록 생성
  const dates: { dateStr: string; dayName: string; dayNum: number; isWeekend: boolean; isSunday: boolean; isSaturday: boolean }[] = [];
  const today = new Date();
  
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[d.getDay()];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    
    dates.push({
      dateStr,
      dayName,
      dayNum: d.getDate(),
      isWeekend,
      isSunday: d.getDay() === 0,
      isSaturday: d.getDay() === 6
    });
  }

  const handlePrevDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() - 1);
    const dateStr = cur.toISOString().split('T')[0];
    onDateChange(dateStr);
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + 1);
    const dateStr = cur.toISOString().split('T')[0];
    onDateChange(dateStr);
  };

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})`;
  };

  const isCurrentDateClosed = StorageService.isClosedDay(selectedDate);

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Calendar Header Title Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CalendarIcon size={20} color="#0D9488" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
            {formatDateDisplay(selectedDate)}
          </h2>
          {selectedDate === getTodayString() && (
            <span style={{
              background: '#0D9488',
              color: '#FFFFFF',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '99px'
            }}>
              오늘
            </span>
          )}
          {isCurrentDateClosed && (
            <span style={{
              background: '#FEE2E2',
              color: '#DC2626',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '99px'
            }}>
              예약 마감/휴무
            </span>
          )}
        </div>

        {/* Date Selector Native Pick & Arrows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handlePrevDay}
            title="이전 날짜"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B'
            }}
          >
            <ChevronLeft size={18} />
          </button>
          
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer'
            }}
          />

          <button
            onClick={handleNextDay}
            title="다음 날짜"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Date Horizontal Carousel Cards */}
      <div style={{
        display: 'flex',
        gap: '0.6rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        {dates.map((item) => {
          const isSelected = item.dateStr === selectedDate;
          const isItemClosed = StorageService.isClosedDay(item.dateStr);

          return (
            <button
              key={item.dateStr}
              onClick={() => onDateChange(item.dateStr)}
              style={{
                flex: '0 0 auto',
                minWidth: '64px',
                padding: '0.75rem 0.5rem',
                borderRadius: '14px',
                border: isSelected ? '2px solid #0D9488' : '1px solid #E2E8F0',
                background: isSelected 
                  ? 'linear-gradient(180deg, #0D9488 0%, #0F766E 100%)' 
                  : isItemClosed ? '#FEF2F2' : item.isWeekend ? '#F8FAFC' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : isItemClosed ? '#DC2626' : item.isSunday ? '#EF4444' : item.isSaturday ? '#2563EB' : '#0F172A',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: isSelected ? '0 4px 12px rgba(13, 148, 136, 0.3)' : 'none',
                position: 'relative'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: isSelected ? 0.9 : 0.7 }}>
                {item.dayName}
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0' }}>
                {item.dayNum}
              </span>
              {isItemClosed && (
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: '4px',
                  background: isSelected ? 'rgba(255,255,255,0.25)' : '#FEE2E2',
                  color: isSelected ? '#FFF' : '#DC2626',
                  marginTop: '2px'
                }}>
                  마감
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
