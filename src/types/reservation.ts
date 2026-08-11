export type CounselingTopic = '정시 상담' | '수시 상담' | '학교 생활' | '기타';

export type ApplicantType = '학생' | '보호자' | '기타';

export type ReservationStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  studentName: string;       // 신청자 이름
  applicantType: ApplicantType; // 학생 | 보호자 | 기타
  studentGradeClass: string; // e.g. "3학년 2반 15번"
  topic: CounselingTopic;
  notes: string;             // 추가 상담 내용
  passwordHash: string;      // 비밀번호
  date: string;              // YYYY-MM-DD
  timeSlot: string;          // e.g. "14:00"
  status: ReservationStatus;
  createdAt: string;         // ISO String
  emailSent?: boolean;
}

export type SlotStatus = 'available' | 'booked' | 'blocked';

export interface TimeSlotConfig {
  time: string;              // e.g. "09:00", "09:30", ..., "21:30"
  status: SlotStatus;
  isNight?: boolean;         // 18:00 이후 야간 표시
}

export interface DaySchedule {
  date: string;              // YYYY-MM-DD
  isClosedDay?: boolean;     // 날짜 전체 마감 여부
  customSlots?: TimeSlotConfig[]; // 커스텀 설정된 슬롯 목록
  updatedAt?: number;        // 수정 시각 타임스탬프 (클라우드 동기화 충돌 방지)
}

export interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  adminEmail: string;        // 알림 받을 지메일 주소
  webhookUrl: string;        // Google Apps Script Webhook URL (선택)
  enabled: boolean;          // 이메일 알림 활성화 여부
  provider: 'emailjs' | 'webhook';
}

export interface EmailLog {
  id: string;
  date: string;
  studentName: string;
  timeSlot: string;
  recipient: string;
  status: 'success' | 'failed' | 'simulated';
  timestamp: string;
  message?: string;
}
