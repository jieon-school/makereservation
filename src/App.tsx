import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { DatePicker } from './components/DatePicker';
import { TimeSlotGrid } from './components/TimeSlotGrid';
import { BookingModal } from './components/BookingModal';
import { LookupModal } from './components/LookupModal';
import { AdminPanel } from './components/AdminPanel';
import { EmailSettingsModal } from './components/EmailSettingsModal';
import { Toast } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import { StorageService, getTodayString } from './services/storage';
import { sendReservationNotificationEmail } from './services/emailService';
import type { CounselingTopic, ApplicantType } from './types/reservation';
import { Clock, CheckCircle2, Sparkles } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'booking' | 'lookup' | 'admin'>('booking');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Toast state
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Refresh trigger for state updates
  const [, setRefreshCount] = useState(0);
  const triggerRefresh = () => setRefreshCount(c => c + 1);

  // Fetch slots for selected date
  const slots = StorageService.getSlotsForDate(selectedDate);
  const daySchedules = StorageService.getDaySchedules();
  const isClosedDay = !!daySchedules[selectedDate]?.isClosedDay;
  const isGuardianEnabled = StorageService.isGuardianBookingEnabled();

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({
      id: `toast-${Date.now()}`,
      type,
      message
    });
  };

  // Student/Parent completes reservation
  const handleBookingSubmit = async (data: {
    studentName: string;
    applicantType: ApplicantType;
    studentGradeClass: string;
    topic: CounselingTopic;
    notes: string;
    passwordHash: string;
  }) => {
    if (!selectedSlot) return;

    // 1. Add reservation to storage
    const newReservation = StorageService.addReservation({
      studentName: data.studentName,
      applicantType: data.applicantType,
      studentGradeClass: data.studentGradeClass,
      topic: data.topic,
      notes: data.notes,
      passwordHash: data.passwordHash,
      date: selectedDate,
      timeSlot: selectedSlot,
    });

    setIsBookingModalOpen(false);
    setSelectedSlot(null);
    triggerRefresh();

    // 2. Trigger Gmail Notification
    const emailConfig = StorageService.getEmailConfig();
    const emailRes = await sendReservationNotificationEmail(newReservation, emailConfig);

    // 3. Show Toast
    showToast(
      'success',
      `[${selectedDate} ${newReservation.timeSlot}] (${data.applicantType}) 상담 예약이 완료되었습니다! 비밀번호는 ${newReservation.passwordHash} 입니다. (${emailRes.message})`
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1, padding: '2rem 1.5rem' }}>
        {activeTab === 'booking' && (
          <div className="animate-fade-in">
            {/* Banner Section */}
            <div className="glass-card" style={{
              padding: '2rem',
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
              border: '1px solid rgba(13, 148, 136, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Sparkles size={20} color="#0D9488" />
                  <span style={{ fontWeight: 800, color: '#0D9488', fontSize: '0.875rem' }}>
                    {isGuardianEnabled ? '1:1 맞춤형 학생 / 보호자 상담' : '1:1 맞춤형 학생 상담 (보호자 예약 마감)'}
                  </span>
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                  상담을 원하는 날짜와 시간을 선택해주세요
                </h1>
                <p style={{ fontSize: '0.95rem', color: '#64748B', marginTop: '0.3rem' }}>
                  {isGuardianEnabled
                    ? '학생 및 보호자 모두 신청 가능하며, 주간부터 야간(야자 3교시)까지 편한 시간을 선택하실 수 있습니다.'
                    : '현재 학생(및 기타) 상담 예약만 접수 중이며, 주간부터 야간(야자 3교시)까지 편한 시간을 선택하실 수 있습니다.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ background: '#FFFFFF', padding: '0.75rem 1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>신청 대상</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isGuardianEnabled ? '#0F172A' : '#D97706' }}>
                    {isGuardianEnabled ? '학생 / 보호자 / 기타' : '학생 / 기타 (보호자 마감)'}
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '0.75rem 1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>상담 주제</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0D9488' }}>수시 / 정시 / 생활 / 기타</div>
                </div>
              </div>
            </div>

            {/* Date Carousel & Selector */}
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={(d) => {
                setSelectedDate(d);
                setSelectedSlot(null);
              }}
            />

            {/* Time Slot Grid */}
            <TimeSlotGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={(time) => setSelectedSlot(time)}
              isClosedDay={isClosedDay}
            />

            {/* Bottom Action Footer for Slot Selection */}
            {selectedSlot && (
              <div style={{
                position: 'sticky',
                bottom: '2rem',
                zIndex: 30,
                background: '#0F172A',
                color: '#FFFFFF',
                padding: '1rem 1.5rem',
                borderRadius: '20px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: '#0D9488', padding: '0.5rem', borderRadius: '10px' }}>
                    <Clock size={20} color="#FFF" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>선택하신 상담 일시</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                      {selectedDate} <span style={{ color: '#2DD4BF' }}>{selectedSlot}</span>
                    </div>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => setIsBookingModalOpen(true)}
                  style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}
                >
                  <CheckCircle2 size={18} />
                  이 시간에 상담 신청하기
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Reservation Lookup */}
        {activeTab === 'lookup' && (
          <LookupModal
            onClose={() => setActiveTab('booking')}
            onReservationCancelled={(res) => {
              showToast('info', `${res.studentName} 님의 [${res.date} ${res.timeSlot}] 상담 예약이 취소되었습니다.`);
              triggerRefresh();
            }}
            onReservationUpdated={(res) => {
              showToast('success', `${res.studentName} 님의 상담 예약 정보가 수정되었습니다.`);
              triggerRefresh();
            }}
          />
        )}

        {/* Tab 3: Admin Mode */}
        {activeTab === 'admin' && (
          <AdminPanel
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            isAdminLoggedIn={isAdminLoggedIn}
            setIsAdminLoggedIn={setIsAdminLoggedIn}
            onOpenEmailSettings={() => setIsEmailSettingsOpen(true)}
            onDataChanged={triggerRefresh}
          />
        )}
      </main>

      {/* Booking Form Modal */}
      {isBookingModalOpen && selectedSlot && (
        <BookingModal
          date={selectedDate}
          timeSlot={selectedSlot}
          onClose={() => setIsBookingModalOpen(false)}
          onSubmit={handleBookingSubmit}
        />
      )}

      {/* Email Settings Modal */}
      {isEmailSettingsOpen && (
        <EmailSettingsModal
          onClose={() => setIsEmailSettingsOpen(false)}
          onConfigSaved={() => showToast('success', '이메일 알림 설정이 저장되었습니다.')}
        />
      )}

      {/* Toast Notification Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '1.5rem',
        fontSize: '0.825rem',
        color: '#64748B',
        borderTop: '1px solid rgba(226, 232, 240, 0.8)',
        background: 'rgba(255, 255, 255, 0.5)'
      }}>
        © 2026 학생 및 보호자 상담 예약 시스템 • 교사 1:1 맞춤형 상담 지원
      </footer>
    </div>
  );
}

export default App;
