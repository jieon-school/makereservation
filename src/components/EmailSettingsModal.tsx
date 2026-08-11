import React, { useState } from 'react';
import { X, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import type { EmailConfig, EmailLog } from '../types/reservation';
import { StorageService } from '../services/storage';
import { sendReservationNotificationEmail } from '../services/emailService';

interface EmailSettingsModalProps {
  onClose: () => void;
  onConfigSaved: (config: EmailConfig) => void;
}

export const EmailSettingsModal: React.FC<EmailSettingsModalProps> = ({
  onClose,
  onConfigSaved
}) => {
  const [config, setConfig] = useState<EmailConfig>(StorageService.getEmailConfig());
  const [logs, setLogs] = useState<EmailLog[]>(StorageService.getEmailLogs());
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'guide'>('config');
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveEmailConfig(config);
    onConfigSaved(config);
    setTestResult({ success: true, message: '이메일 알림 설정이 성공적으로 저장되었습니다.' });
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const testReservation = {
      id: 'test-123',
      studentName: '홍길동 (테스트)',
      applicantType: '학생' as const,
      studentGradeClass: '3학년 1반 1번',
      topic: '수시 상담' as const,
      notes: '지메일 알림 발송 테스트입니다.',
      passwordHash: '0000',
      date: new Date().toISOString().split('T')[0],
      timeSlot: '14:00',
      status: 'confirmed' as const,
      createdAt: new Date().toISOString()
    };

    const res = await sendReservationNotificationEmail(testReservation, config);
    setIsTesting(false);
    setTestResult({ success: res.success, message: res.message });
    setLogs(StorageService.getEmailLogs());
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 60,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="glass-modal" style={{
        width: '100%',
        maxWidth: '640px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: '#F1F5F9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748B'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Title */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={22} color="#0D9488" />
            교사 지메일(Gmail) 알림 설정
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.2rem' }}>
            학생이 새 상담을 예약했을 때 지정하신 Gmail로 실시간 알림 메일을 전송합니다.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E2E8F0', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('config')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              background: activeTab === 'config' ? '#0D9488' : 'transparent',
              color: activeTab === 'config' ? '#FFFFFF' : '#64748B'
            }}
          >
            알림 연동 설정
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              background: activeTab === 'logs' ? '#0D9488' : 'transparent',
              color: activeTab === 'logs' ? '#FFFFFF' : '#64748B'
            }}
          >
            알림 이력 ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              background: activeTab === 'guide' ? '#0D9488' : 'transparent',
              color: activeTab === 'guide' ? '#FFFFFF' : '#64748B'
            }}
          >
            Gmail 연동 방법 가이드
          </button>
        </div>

        {testResult && (
          <div style={{
            background: testResult.success ? '#ECFDF5' : '#FEF2F2',
            border: `1.5px solid ${testResult.success ? '#A7F3D0' : '#FCA5A5'}`,
            color: testResult.success ? '#065F46' : '#991B1B',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {testResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Tab 1: Config Form */}
        {activeTab === 'config' && (
          <form onSubmit={handleSave}>
            <div className="form-group" style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#0D9488' }}
                />
                <span>학생 상담 예약 시 자동 이메일 알림 활성화</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">알림을 받을 교사 Gmail 주소 *</label>
              <input
                type="email"
                className="form-input"
                placeholder="teacher@gmail.com"
                value={config.adminEmail}
                onChange={(e) => setConfig({ ...config, adminEmail: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">발송 연동 방식 선택</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, provider: 'emailjs' })}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: config.provider === 'emailjs' ? '2px solid #0D9488' : '1.5px solid #E2E8F0',
                    background: config.provider === 'emailjs' ? '#F0FDF4' : '#FFF',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  EmailJS 연동 (권장)
                </button>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, provider: 'webhook' })}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: config.provider === 'webhook' ? '2px solid #0D9488' : '1.5px solid #E2E8F0',
                    background: config.provider === 'webhook' ? '#F0FDF4' : '#FFF',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Google Apps Script URL
                </button>
              </div>
            </div>

            {config.provider === 'emailjs' ? (
              <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.8rem', color: '#0F172A' }}>
                  EmailJS API 서비스 설정 (계정 설정 후 입력)
                </h4>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Service ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="service_xxxxx"
                    value={config.serviceId}
                    onChange={(e) => setConfig({ ...config, serviceId: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Template ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="template_xxxxx"
                    value={config.templateId}
                    onChange={(e) => setConfig({ ...config, templateId: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Public Key (User Key)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="public_key_xxxxx"
                    value={config.publicKey}
                    onChange={(e) => setConfig({ ...config, publicKey: e.target.value })}
                  />
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  💡 키를 입력하지 않아도 <strong>[시뮬레이션 테스트]</strong>로 발송 로그 및 동작 테스트가 가능합니다.
                </p>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Google Apps Script Webhook URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://script.google.com/macros/s/xxxx/exec"
                  value={config.webhookUrl}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSendTest}
                disabled={isTesting}
              >
                <Send size={16} />
                {isTesting ? '발송 중...' : '테스트 메일 발송'}
              </button>
              <button type="submit" className="btn-primary">
                설정 저장
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Logs */}
        {activeTab === 'logs' && (
          <div>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                아직 알림 이력이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {logs.map((log) => (
                  <div key={log.id} style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
                        {log.studentName} 학생 ({log.date} {log.timeSlot})
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                        {log.message || log.recipient}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background: log.status === 'success' ? '#ECFDF5' : log.status === 'simulated' ? '#EFF6FF' : '#FEF2F2',
                      color: log.status === 'success' ? '#10B981' : log.status === 'simulated' ? '#3B82F6' : '#EF4444'
                    }}>
                      {log.status === 'success' ? '발송 완료' : log.status === 'simulated' ? '시뮬레이션' : '발송 실패'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Guide */}
        {activeTab === 'guide' && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#334155' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0D9488', marginBottom: '0.5rem' }}>
              ✉️ EmailJS로 교사 Gmail 직접 연동 3단계
            </h4>
            <ol style={{ paddingLeft: '1.2rem', marginBottom: '1.5rem' }}>
              <li><strong>EmailJS 가입 (emailjs.com)</strong>: 무료 회원가입 (월 200건 무료 제공).</li>
              <li><strong>Gmail 서비스 추가</strong>: EmailJS 대시보드 ➔ Email Services ➔ Gmail 연결 ➔ Service ID 복사.</li>
              <li><strong>템플릿 작성 및 Public Key 복사</strong>: Email Templates ➔ 새 템플릿 작성 후 Template ID 및 Account Public Key를 위 설정창에 입력하시면 끝입니다!</li>
            </ol>

            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#6366F1', marginBottom: '0.5rem' }}>
              ⚡ Google Apps Script 웹앱 연동 (핵심 4단계)
            </h4>
            <ol style={{ paddingLeft: '1.2rem', marginBottom: '0.8rem' }}>
              <li><strong>script.google.com</strong> 접속 ➔ [새 프로젝트] 생성 후 아래 코드를 전체 붙여넣기.</li>
              <li><strong>⚠️ 최초 권한 승인 (필수)</strong>: 상단 함수 선택에서 <code>testRun</code> 선택 후 <strong>[실행 ▶]</strong> 클릭 ➔ '권한 검토' ➔ '고급' ➔ '이동' ➔ '허용' 클릭! (테스트 메일 수신 확인)</li>
              <li><strong>웹앱 배포 설정</strong>: 우측 상단 <strong>[배포] ➔ [새 배포] ➔ 유형: [웹 앱]</strong> 선택:
                <ul style={{ marginTop: '4px', color: '#4F46E5', fontWeight: 600 }}>
                  <li>• 다음 사용자로 실행: <strong>나(내 계정 - your@gmail.com)</strong></li>
                  <li>• 액세스 권한이 있는 사용자: <strong>모든 사용자 (Anyone)</strong> ⭐️ (중요)</li>
                </ul>
              </li>
              <li>배포 완료 후 나오는 <strong>웹 앱 URL (https://script.google.com/macros/s/.../exec)</strong>을 복사하여 위 Webhook URL 칸에 넣고 [설정 저장]!</li>
            </ol>
            <pre style={{
              background: '#0F172A',
              color: '#F8FAFC',
              padding: '0.85rem',
              borderRadius: '10px',
              fontSize: '0.73rem',
              lineHeight: 1.45,
              marginTop: '0.5rem',
              overflowX: 'auto'
            }}>
{`function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    
    var recipient = data.to_email || "${config.adminEmail}";
    var applicantType = data.applicant_type || "학생";
    var studentName = data.student_name || "이름 없음";
    var gradeClass = data.student_grade_class || "-";
    var topic = data.topic || "-";
    var date = data.reservation_date || "-";
    var time = data.reservation_time || "-";
    var notes = data.notes || "없음";
    var createdAt = data.created_at || new Date().toLocaleString("ko-KR");
    
    var subject = "[상담 예약 알림] (" + applicantType + ") " + studentName + " - " + date + " " + time;
    
    var body = "🔔 새로운 상담 예약이 접수되었습니다.\\n\\n"
             + "▪ 신청자 구분: " + applicantType + "\\n"
             + "▪ 신청자 이름: " + studentName + "\\n"
             + "▪ 학년/반/번호: " + gradeClass + "\\n"
             + "▪ 상담 일시: " + date + " " + time + "\\n"
             + "▪ 상담 주제: " + topic + "\\n"
             + "▪ 전하고 싶은 말: " + notes + "\\n"
             + "▪ 접수 일시: " + createdAt + "\\n\\n"
             + "웹 상담 관리자 페이지에서 예약 현황을 확인하실 수 있습니다.";
             
    MailApp.sendEmail(recipient, subject, body);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ⚠️ 최초 1회 권한 승인을 위한 테스트 함수 (에디터 상단에서 testRun 선택 후 [실행 ▶] 클릭!)
function testRun() {
  MailApp.sendEmail("${config.adminEmail}", "[테스트] 상담 예약 시스템 연동 확인", "Google Apps Script 메일 발송 권한이 정상적으로 승인되었습니다.");
  Logger.log("테스트 메일이 전송되었습니다.");
}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
