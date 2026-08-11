import type { Reservation, DaySchedule } from '../types/reservation';
import { StorageService } from './storage';

export interface CloudSyncData {
  reservations: Reservation[];
  daySchedules: Record<string, DaySchedule>;
  guardianBookingEnabled?: boolean;
}

export function normalizeDateKey(rawDate: any): string {
  if (!rawDate) return '';
  const trimmed = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return trimmed;
}

export const GoogleSheetService = {
  getScriptUrl(): string {
    return StorageService.getGasUrl();
  },

  isConfigured(): boolean {
    const url = this.getScriptUrl();
    return !!url && url.trim().startsWith('https://script.google.com/');
  },

  // 클라우드(구글 시트)에서 최신 예약 및 일정 데이터 조회
  async fetchCloudData(): Promise<{ success: boolean; data?: CloudSyncData; message?: string }> {
    const url = this.getScriptUrl();
    if (!this.isConfigured()) {
      return { success: false, message: '구글 앱스 스크립트 URL이 설정되지 않았습니다.' };
    }

    try {
      const fetchUrl = `${url.trim()}?action=get_data&t=${Date.now()}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const json = await response.json();
      if (json && json.status === 'success') {
        const guardianBookingEnabled: boolean | undefined = json.guardianBookingEnabled !== undefined ? !!json.guardianBookingEnabled : undefined;

        // 1. 예약 목록 정규화
        const normalizedReservations: Reservation[] = [];
        if (Array.isArray(json.reservations)) {
          json.reservations.forEach((r: any) => {
            if (r && r.id) {
              normalizedReservations.push({
                ...r,
                date: normalizeDateKey(r.date)
              });
            }
          });
        }

        // 2. 일정 설정(마감일, 슬롯) 정규화
        const normalizedDaySchedules: Record<string, DaySchedule> = {};
        if (json.daySchedules && typeof json.daySchedules === 'object') {
          for (const rawKey of Object.keys(json.daySchedules)) {
            const normalizedKey = normalizeDateKey(rawKey);
            if (normalizedKey) {
              const item = json.daySchedules[rawKey];
              let customSlots = item.customSlots;
              if (typeof customSlots === 'string') {
                try {
                  customSlots = JSON.parse(customSlots);
                } catch {
                  customSlots = [];
                }
              }
              normalizedDaySchedules[normalizedKey] = {
                date: normalizedKey,
                isClosedDay: item.isClosedDay === true || String(item.isClosedDay).toLowerCase() === 'true',
                customSlots: Array.isArray(customSlots) ? customSlots : []
              };
            }
          }
        }

        // 스마트 병합 수행 (로컬 마감 일정이 비어있는 클라우드 데이터로 덮어씌워지는 문제 방지)
        StorageService.mergeCloudData({
          reservations: normalizedReservations,
          daySchedules: normalizedDaySchedules,
          guardianBookingEnabled
        });

        return {
          success: true,
          data: {
            reservations: StorageService.getReservations(),
            daySchedules: StorageService.getDaySchedules(),
            guardianBookingEnabled: StorageService.isGuardianBookingEnabled()
          }
        };
      } else {
        throw new Error(json.message || '데이터 파싱 오류');
      }
    } catch (err: any) {
      console.warn('Google Sheet fetch error (using local cache):', err);
      return {
        success: false,
        message: err.message || '구글 시트 데이터 불러오기 실패'
      };
    }
  },

  // 예약 등록 (구글 시트 추가 + 교사 Gmail 발송)
  async createReservation(reservation: Reservation): Promise<{ success: boolean; message: string }> {
    const url = this.getScriptUrl();
    if (!this.isConfigured()) {
      return { success: true, message: '로컬에 저장되었습니다.' };
    }

    const payload = {
      action: 'create_reservation',
      reservation,
      to_email: StorageService.getEmailConfig().adminEmail
    };

    try {
      await fetch(url.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      return { success: true, message: '구글 시트 및 Gmail로 실시간 전송되었습니다.' };
    } catch (err: any) {
      console.error('Google Sheet create error:', err);
      return { success: false, message: '클라우드 전송 중 오류 발생' };
    }
  },

  // 예약 취소 (구글 시트 취소 상태 변경)
  async cancelReservation(id: string): Promise<{ success: boolean; message: string }> {
    const url = this.getScriptUrl();
    if (!this.isConfigured()) {
      return { success: true, message: '로컬에서 취소되었습니다.' };
    }

    const payload = {
      action: 'cancel_reservation',
      id
    };

    try {
      await fetch(url.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      return { success: true, message: '구글 시트에 취소 내역이 반영되었습니다.' };
    } catch (err: any) {
      console.error('Google Sheet cancel error:', err);
      return { success: false, message: '클라우드 취소 전송 실패' };
    }
  },

  // 예약 내용/주제 수정
  async updateReservation(id: string, updates: Partial<Reservation>): Promise<{ success: boolean; message: string }> {
    const url = this.getScriptUrl();
    if (!this.isConfigured()) {
      return { success: true, message: '로컬에서 수정되었습니다.' };
    }

    const payload = {
      action: 'update_reservation',
      id,
      updates
    };

    try {
      await fetch(url.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      return { success: true, message: '구글 시트에 수정 내용이 반영되었습니다.' };
    } catch (err: any) {
      console.error('Google Sheet update error:', err);
      return { success: false, message: '클라우드 수정 전송 실패' };
    }
  },

  // 일정/슬롯 설정 변경사항 구글 시트 저장
  async saveSchedules(daySchedules: Record<string, DaySchedule>): Promise<{ success: boolean; message: string }> {
    const url = this.getScriptUrl();
    if (!this.isConfigured()) {
      return { success: true, message: '로컬에 저장되었습니다.' };
    }

    const payload = {
      action: 'save_schedules',
      daySchedules
    };

    try {
      await fetch(url.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      return { success: true, message: '구글 시트에 일정 설정이 반영되었습니다.' };
    } catch (err: any) {
      console.error('Google Sheet save schedules error:', err);
      return { success: false, message: '클라우드 일정 저장 실패' };
    }
  },

  // 보호자 예약 활성화 설정 동기화
  async saveGuardianSetting(enabled: boolean): Promise<{ success: boolean; message: string }> {
    const url = this.getScriptUrl();
    if (!this.isConfigured()) {
      return { success: true, message: '로컬에 저장되었습니다.' };
    }

    const payload = {
      action: 'save_guardian_setting',
      enabled
    };

    try {
      await fetch(url.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      return { success: true, message: '구글 시트에 보호자 예약 설정이 반영되었습니다.' };
    } catch (err: any) {
      console.error('Google Sheet guardian setting error:', err);
      return { success: false, message: '보호자 설정 클라우드 저장 실패' };
    }
  }
};
