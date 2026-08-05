import emailjs from '@emailjs/browser';
import type { Reservation, EmailConfig } from '../types/reservation';
import { StorageService } from './storage';

export async function sendReservationNotificationEmail(
  reservation: Reservation,
  config: EmailConfig
): Promise<{ success: boolean; simulated: boolean; message: string }> {
  if (!config.enabled) {
    return {
      success: true,
      simulated: true,
      message: '이메일 알림 기능이 비활성화되어 있습니다.'
    };
  }

  const emailData = {
    to_email: config.adminEmail,
    student_name: reservation.studentName,
    applicant_type: reservation.applicantType || '학생',
    student_grade_class: reservation.studentGradeClass,
    topic: reservation.topic,
    reservation_date: reservation.date,
    reservation_time: reservation.timeSlot,
    notes: reservation.notes || '없음',
    created_at: new Date(reservation.createdAt).toLocaleString('ko-KR')
  };

  // 1. EmailJS 전송 방식
  if (config.provider === 'emailjs' && config.serviceId && config.templateId && config.publicKey) {
    try {
      await emailjs.send(
        config.serviceId,
        config.templateId,
        emailData,
        config.publicKey
      );

      StorageService.addEmailLog({
        date: reservation.date,
        studentName: reservation.studentName,
        timeSlot: reservation.timeSlot,
        recipient: config.adminEmail,
        status: 'success',
        message: 'EmailJS를 통해 지메일로 정상 전송되었습니다.'
      });

      return {
        success: true,
        simulated: false,
        message: `${config.adminEmail}(으)로 알림 이메일이 전송되었습니다.`
      };
    } catch (error: any) {
      console.error('EmailJS Send Error:', error);
      StorageService.addEmailLog({
        date: reservation.date,
        studentName: reservation.studentName,
        timeSlot: reservation.timeSlot,
        recipient: config.adminEmail,
        status: 'failed',
        message: `발송 실패: ${error?.text || error?.message || '알 수 없는 오류'}`
      });

      return {
        success: false,
        simulated: false,
        message: `EmailJS 전송 실패: ${error?.text || '설정을 확인해주세요.'}`
      };
    }
  }

  // 2. Google Apps Script Webhook 방식
  if (config.provider === 'webhook' && config.webhookUrl) {
    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
        mode: 'no-cors'
      });

      StorageService.addEmailLog({
        date: reservation.date,
        studentName: reservation.studentName,
        timeSlot: reservation.timeSlot,
        recipient: config.adminEmail,
        status: 'success',
        message: 'Google Apps Script Webhook으로 알림 요청을 보냈습니다.'
      });

      return {
        success: true,
        simulated: false,
        message: 'Webhook으로 알림 이메일 발송 요청을 전달했습니다.'
      };
    } catch (error: any) {
      console.error('Webhook Send Error:', error);
      StorageService.addEmailLog({
        date: reservation.date,
        studentName: reservation.studentName,
        timeSlot: reservation.timeSlot,
        recipient: config.adminEmail,
        status: 'failed',
        message: `Webhook 실패: ${error?.message || '알 수 없는 오류'}`
      });

      return {
        success: false,
        simulated: false,
        message: 'Webhook 알림 요청 중 오류가 발생했습니다.'
      };
    }
  }

  // 3. 서비스 키가 없거나 시뮬레이션 모드일 때
  StorageService.addEmailLog({
    date: reservation.date,
    studentName: reservation.studentName,
    timeSlot: reservation.timeSlot,
    recipient: config.adminEmail,
    status: 'simulated',
    message: '시뮬레이션 모드: 이메일 설정이 완료되면 교사 Gmail로 전송됩니다.'
  });

  return {
    success: true,
    simulated: true,
    message: `[시뮬레이션] 새 예약 알림이 교사 Gmail(${config.adminEmail})로 전송 기록되었습니다.`
  };
}
