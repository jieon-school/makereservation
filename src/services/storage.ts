import type { Reservation, DaySchedule, TimeSlotConfig, EmailConfig, EmailLog } from '../types/reservation';
import { GLOBAL_GAS_URL } from '../config/backend';

const STORAGE_KEYS = {
  RESERVATIONS: 'counseling_reservations_v3',
  DAY_SCHEDULES: 'counseling_day_schedules_v3',
  EMAIL_CONFIG: 'counseling_email_config',
  EMAIL_LOGS: 'counseling_email_logs',
  ADMIN_PIN: 'counseling_admin_pin_v3',
};

// 8시 40분부터 50분 상담 + 10분 쉬는시간 (12:30까지), 점심시간 후 13:40~17:30, 야자 1/2/3교시
export const DEFAULT_TIME_SLOTS: string[] = [
  '08:40 ~ 09:30 (1교시)',
  '09:40 ~ 10:30 (2교시)',
  '10:40 ~ 11:30 (3교시)',
  '11:40 ~ 12:30 (4교시)',
  '13:40 ~ 14:30 (5교시)',
  '14:40 ~ 15:30 (6교시)',
  '15:40 ~ 16:30 (7교시)',
  '16:40 ~ 17:30 (8교시)',
  '18:30 ~ 19:20 (야자 1교시)',
  '19:30 ~ 20:20 (야자 2교시)',
  '20:30 ~ 21:20 (야자 3교시)'
];

export function isNightSlot(time: string): boolean {
  return time.includes('야자') || time.startsWith('18:') || time.startsWith('19:') || time.startsWith('20:');
}

export function isSunday(dateStr: string): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getDay() === 0;
}

export function isSaturday(dateStr: string): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getDay() === 6;
}

// 날짜별 기본 슬롯 목록 (토요일은 야간 상담 슬롯 아예 제외)
export function getDefaultSlotsForDate(dateStr: string): string[] {
  if (isSaturday(dateStr)) {
    return DEFAULT_TIME_SLOTS.filter(time => !isNightSlot(time));
  }
  return DEFAULT_TIME_SLOTS;
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

  addReservation(data: Omit<Reservation, 'id' | 'createdAt' | 'status'>): Reservation {
    const reservations = this.getReservations();
    const newReservation: Reservation = {
      ...data,
      id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    reservations.push(newReservation);
    this.saveReservations(reservations);

    // 해당 날짜/시간 슬롯 상태를 'booked'로 업데이트
    this.updateSlotForDate(data.date, data.timeSlot, 'booked');

    return newReservation;
  },

  cancelReservation(id: string): boolean {
    const reservations = this.getReservations();
    const target = reservations.find(r => r.id === id);
    if (!target) return false;

    // 예약 상태를 cancelled로 변경
    target.status = 'cancelled';
    this.saveReservations(reservations);

    // 해당 날짜/시간 슬롯을 다시 available로 해제
    this.updateSlotForDate(target.date, target.timeSlot, 'available');

    return true;
  },

  updateReservation(id: string, updates: Partial<Reservation>): Reservation | null {
    const reservations = this.getReservations();
    const index = reservations.findIndex(r => r.id === id);
    if (index === -1) return null;

    reservations[index] = { ...reservations[index], ...updates };
    this.saveReservations(reservations);
    return reservations[index];
  },

  findReservationByPassword(studentName: string, passwordHash: string): Reservation | undefined {
    const reservations = this.getReservations();
    return reservations.find(
      r => r.studentName.trim() === studentName.trim() &&
           r.passwordHash.trim() === passwordHash.trim() &&
           r.status !== 'cancelled'
    );
  },

  // --- Day Schedules & Slots ---
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

  // 클라우드(구글 시트) 데이터 스마트 병합 (로컬 마감 설정 보호)
  mergeCloudData(cloudData: {
    reservations?: Reservation[];
    daySchedules?: Record<string, DaySchedule>;
    guardianBookingEnabled?: boolean;
  }): void {
    // 1. 예약 목록 스마트 병합 (ID 기준 중복 제거)
    if (Array.isArray(cloudData.reservations)) {
      const localRes = this.getReservations();
      const map = new Map<string, Reservation>();
      
      localRes.forEach(r => map.set(r.id, r));
      cloudData.reservations.forEach(r => map.set(r.id, r));

      const mergedRes = Array.from(map.values()).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      this.saveReservations(mergedRes);
    }

    // 2. 일정 설정(마감일, 커스텀 슬롯) 타임스탬프 기반 스마트 병합
    if (cloudData.daySchedules && typeof cloudData.daySchedules === 'object') {
      const localSchedules = this.getDaySchedules();
      const cloudSchedules = cloudData.daySchedules;
      const cloudKeys = Object.keys(cloudSchedules);

      // 클라우드에 일정이 존재할 때만 병합 진행
      if (cloudKeys.length > 0) {
        const mergedSchedules: Record<string, DaySchedule> = { ...localSchedules };
        for (const key of cloudKeys) {
          const cloudItem = cloudSchedules[key];
          const localItem = localSchedules[key];

          if (cloudItem) {
            // 로컬 수정 시각이 클라우드 수정 시각보다 최신이면 로컬 설정 우선 유지!
            if (localItem && (localItem.updatedAt || 0) > (cloudItem.updatedAt || 0)) {
              mergedSchedules[key] = localItem;
            } else {
              mergedSchedules[key] = {
                ...mergedSchedules[key],
                ...cloudItem
              };
            }
          }
        }
        this.saveDaySchedules(mergedSchedules);
      }
    }

    // 3. 보호자 예약 활성화 여부
    if (cloudData.guardianBookingEnabled !== undefined) {
      this.setGuardianBookingEnabled(cloudData.guardianBookingEnabled);
    }
  },

  // 특정 날짜의 휴무(마감) 여부 (일요일은 기본 휴무)
  isClosedDay(dateStr: string): boolean {
    const daySchedules = this.getDaySchedules();
    if (daySchedules[dateStr]?.isClosedDay !== undefined) {
      return !!daySchedules[dateStr].isClosedDay;
    }
    // 관리자가 별도 설정하지 않은 경우: 일요일은 기본 휴무
    return isSunday(dateStr);
  },

  getSlotsForDate(dateStr: string): TimeSlotConfig[] {
    const daySchedules = this.getDaySchedules();
    const schedule = daySchedules[dateStr];
    const isSat = isSaturday(dateStr);

    let baseSlots: TimeSlotConfig[] = [];

    // 기존 커스텀 설정이 있는 경우
    if (schedule && schedule.customSlots && schedule.customSlots.length > 0) {
      baseSlots = schedule.customSlots;
    } else {
      // 기본 시간 슬롯 설정 생성
      const defaultSlots = getDefaultSlotsForDate(dateStr);
      baseSlots = defaultSlots.map(time => ({
        time,
        status: 'available',
        isNight: isNightSlot(time)
      }));
    }

    // 토요일의 경우 야간 슬롯은 완전 제외
    if (isSat) {
      baseSlots = baseSlots.filter(s => !isNightSlot(s.time));
    }

    // 해당 날짜에 확정된 실제 예약 목록을 슬롯에 강제 반영 (중복 예약 및 마감 오작동 방지)
    const confirmedReservations = this.getReservations().filter(
      r => r.date === dateStr && r.status === 'confirmed'
    );
    const bookedTimeSet = new Set(confirmedReservations.map(r => r.timeSlot));

    return baseSlots.map(slot => {
      if (bookedTimeSet.has(slot.time)) {
        return { ...slot, status: 'booked' };
      }
      return slot;
    });
  },

  updateSlotForDate(dateStr: string, time: string, status: 'available' | 'booked' | 'blocked'): void {
    const daySchedules = this.getDaySchedules();
    let currentSlots = this.getSlotsForDate(dateStr);

    const slotIndex = currentSlots.findIndex(s => s.time === time);
    if (slotIndex >= 0) {
      currentSlots[slotIndex].status = status;
    } else {
      currentSlots.push({
        time,
        status,
        isNight: isNightSlot(time)
      });
    }

    daySchedules[dateStr] = {
      ...daySchedules[dateStr],
      date: dateStr,
      customSlots: currentSlots,
      updatedAt: Date.now()
    };

    this.saveDaySchedules(daySchedules);
  },

  toggleClosedDay(dateStr: string, isClosed: boolean): void {
    const daySchedules = this.getDaySchedules();
    let currentSlots = this.getSlotsForDate(dateStr);

    // 마감 해제(isClosed === false)를 하는 경우, 모든 슬롯이 blocked 상태라면 기본적으로 available로 열어줌
    if (!isClosed) {
      const allBlocked = currentSlots.every(s => s.status === 'blocked');
      if (allBlocked) {
        currentSlots = currentSlots.map(s => ({
          ...s,
          status: s.status === 'booked' ? 'booked' : 'available'
        }));
      }
    } else {
      // 날짜 전체 마감 시 슬롯들도 'blocked' 처리
      currentSlots = currentSlots.map(s => ({
        ...s,
        status: s.status === 'booked' ? 'booked' : 'blocked'
      }));
    }

    daySchedules[dateStr] = {
      ...daySchedules[dateStr],
      date: dateStr,
      isClosedDay: isClosed,
      customSlots: currentSlots,
      updatedAt: Date.now()
    };
    this.saveDaySchedules(daySchedules);
  },

  // --- Email Config ---
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

  // --- Email Logs ---
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
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog); // 최신순
    localStorage.setItem(STORAGE_KEYS.EMAIL_LOGS, JSON.stringify(logs.slice(0, 50))); // 최근 50개 유지
  },

  // --- Admin PIN ---
  getAdminPin(): string {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) || 'skan123';
  },

  saveAdminPin(pin: string): void {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, pin);
  },

  // --- Guardian Booking Setting ---
  isGuardianBookingEnabled(): boolean {
    const raw = localStorage.getItem('counseling_allow_guardian_v1');
    return raw !== null ? raw === 'true' : true; // 기본값: true (허용)
  },

  setGuardianBookingEnabled(enabled: boolean): void {
    localStorage.setItem('counseling_allow_guardian_v1', String(enabled));
  },

  // --- Google Apps Script / Google Sheet URL ---
  getGasUrl(): string {
    const directUrl = localStorage.getItem('counseling_gas_url_v1');
    if (directUrl && directUrl.trim().startsWith('https://script.google.com/')) {
      return directUrl.trim();
    }

    // 기존 EmailConfig에 저장된 webhookUrl이 있다면 마이그레이션
    const emailConfig = this.getEmailConfig();
    if (emailConfig.webhookUrl && emailConfig.webhookUrl.trim().startsWith('https://script.google.com/')) {
      return emailConfig.webhookUrl.trim();
    }

    // 전역 배포된 백엔드 URL (모든 학생/학부모 기기 공통 자동 적용)
    if (GLOBAL_GAS_URL && GLOBAL_GAS_URL.trim().startsWith('https://script.google.com/')) {
      return GLOBAL_GAS_URL.trim();
    }

    return '';
  },

  saveGasUrl(url: string): void {
    localStorage.setItem('counseling_gas_url_v1', url.trim());
    // EmailConfig에도 동기화
    const emailConfig = this.getEmailConfig();
    emailConfig.webhookUrl = url.trim();
    if (url.trim()) {
      emailConfig.provider = 'webhook';
    }
    this.saveEmailConfig(emailConfig);
  }
};
