import type { Reservation, DaySchedule, TimeSlotConfig, EmailConfig, EmailLog } from '../types/reservation';

const STORAGE_KEYS = {
  RESERVATIONS: 'counseling_reservations_v2',
  DAY_SCHEDULES: 'counseling_day_schedules_v2',
  EMAIL_CONFIG: 'counseling_email_config',
  EMAIL_LOGS: 'counseling_email_logs',
  ADMIN_PIN: 'counseling_admin_pin_v2',
};

// 기본 표준 시간 슬롯 목록 (09:00 ~ 21:30)
export const DEFAULT_TIME_SLOTS: string[] = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30'
];

export function isNightSlot(time: string): boolean {
  const hour = parseInt(time.split(':')[0], 10);
  return hour >= 18;
}

// 오늘 날짜 YYYY-MM-DD 형식 반환
export function getTodayString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 기본 이메일 설정
const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  serviceId: '',
  templateId: '',
  publicKey: '',
  adminEmail: 'teacher@school.ed.kr',
  webhookUrl: '',
  enabled: true,
  provider: 'emailjs',
};

// LocalStorage Helper
export const StorageService = {
  // --- Reservations ---
  getReservations(): Reservation[] {
    const raw = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveReservations(reservations: Reservation[]): void {
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations));
  },

  addReservation(reservation: Omit<Reservation, 'id' | 'createdAt' | 'status'>): Reservation {
    const reservations = this.getReservations();
    const newRes: Reservation = {
      ...reservation,
      id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };
    reservations.push(newRes);
    this.saveReservations(reservations);
    return newRes;
  },

  updateReservation(id: string, updates: Partial<Reservation>): Reservation | null {
    const reservations = this.getReservations();
    const index = reservations.findIndex(r => r.id === id);
    if (index === -1) return null;

    reservations[index] = { ...reservations[index], ...updates };
    this.saveReservations(reservations);
    return reservations[index];
  },

  cancelReservation(id: string): boolean {
    const reservations = this.getReservations();
    const index = reservations.findIndex(r => r.id === id);
    if (index === -1) return false;

    reservations[index].status = 'cancelled';
    this.saveReservations(reservations);
    return true;
  },

  // 비밀번호 검증으로 본인 예약 찾기
  findReservationByPassword(studentName: string, passwordInput: string): Reservation | null {
    const reservations = this.getReservations();
    return reservations.find(r => 
      r.studentName.trim() === studentName.trim() && 
      r.passwordHash === passwordInput.trim() &&
      r.status !== 'cancelled'
    ) || null;
  },

  // --- Day Schedules (관리자 시간 설정) ---
  getDaySchedules(): Record<string, DaySchedule> {
    const raw = localStorage.getItem(STORAGE_KEYS.DAY_SCHEDULES);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  saveDaySchedules(schedules: Record<string, DaySchedule>): void {
    localStorage.setItem(STORAGE_KEYS.DAY_SCHEDULES, JSON.stringify(schedules));
  },

  // 특정 날짜의 타임슬롯 상태 조회 (예약 정보와 병합)
  getSlotsForDate(date: string): TimeSlotConfig[] {
    const daySchedules = this.getDaySchedules();
    const dayConfig = daySchedules[date];
    const reservations = this.getReservations().filter(r => r.date === date && r.status !== 'cancelled');
    const bookedTimes = new Set(reservations.map(r => r.timeSlot));

    // 기본 슬롯 목록 기반 생성
    const baseTimes = dayConfig?.customSlots?.length 
      ? dayConfig.customSlots 
      : DEFAULT_TIME_SLOTS.map(t => ({ time: t, status: 'available' as const, isNight: isNightSlot(t) }));

    return baseTimes.map(slot => {
      let status: 'available' | 'booked' | 'blocked' = slot.status;
      if (dayConfig?.isClosedDay) {
        status = 'blocked';
      } else if (bookedTimes.has(slot.time)) {
        status = 'booked';
      }
      return {
        ...slot,
        status,
        isNight: isNightSlot(slot.time)
      };
    });
  },

  // 특정 날짜의 시간 슬롯 설정 변경
  updateSlotForDate(date: string, time: string, status: 'available' | 'blocked'): void {
    const schedules = this.getDaySchedules();
    if (!schedules[date]) {
      schedules[date] = {
        date,
        isClosedDay: false,
        customSlots: DEFAULT_TIME_SLOTS.map(t => ({ time: t, status: 'available', isNight: isNightSlot(t) }))
      };
    }

    const customSlots = schedules[date].customSlots || DEFAULT_TIME_SLOTS.map(t => ({ time: t, status: 'available', isNight: isNightSlot(t) }));
    const slotIdx = customSlots.findIndex(s => s.time === time);
    if (slotIdx !== -1) {
      customSlots[slotIdx].status = status;
    } else {
      customSlots.push({ time, status, isNight: isNightSlot(time) });
      customSlots.sort((a, b) => a.time.localeCompare(b.time));
    }

    schedules[date].customSlots = customSlots;
    this.saveDaySchedules(schedules);
  },

  // 특정 날짜 전체 마감/해제
  toggleClosedDay(date: string, isClosed: boolean): void {
    const schedules = this.getDaySchedules();
    if (!schedules[date]) {
      schedules[date] = { date, isClosedDay: isClosed };
    } else {
      schedules[date].isClosedDay = isClosed;
    }
    this.saveDaySchedules(schedules);
  },

  // --- Email Config & Logs ---
  getEmailConfig(): EmailConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.EMAIL_CONFIG);
    if (!raw) return DEFAULT_EMAIL_CONFIG;
    try {
      return { ...DEFAULT_EMAIL_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_EMAIL_CONFIG;
    }
  },

  saveEmailConfig(config: EmailConfig): void {
    localStorage.setItem(STORAGE_KEYS.EMAIL_CONFIG, JSON.stringify(config));
  },

  getEmailLogs(): EmailLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EMAIL_LOGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addEmailLog(log: Omit<EmailLog, 'id' | 'timestamp'>): void {
    const logs = this.getEmailLogs();
    const newLog: EmailLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('ko-KR')
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEYS.EMAIL_LOGS, JSON.stringify(logs.slice(0, 50)));
  },

  // --- Admin PIN ---
  getAdminPin(): string {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) || 'skan123';
  },

  saveAdminPin(pin: string): void {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, pin);
  }
};
