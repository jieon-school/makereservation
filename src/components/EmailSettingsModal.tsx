import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Database, RefreshCw, Copy, Check } from 'lucide-react';
import type { EmailConfig, EmailLog } from '../types/reservation';
import { StorageService } from '../services/storage';
import { GoogleSheetService } from '../services/googleSheetService';
import { sendReservationNotificationEmail } from '../services/emailService';

interface EmailSettingsModalProps {
  onClose: () => void;
  onConfigSaved: (config: EmailConfig) => void;
  onSyncCompleted?: () => void;
  initialTab?: 'config' | 'logs' | 'guide';
}

export const EmailSettingsModal: React.FC<EmailSettingsModalProps> = ({
  onClose,
  onConfigSaved,
  onSyncCompleted,
  initialTab = 'config'
}) => {
  const [config, setConfig] = useState<EmailConfig>(StorageService.getEmailConfig());
  const [gasUrl, setGasUrl] = useState<string>(StorageService.getGasUrl());
  const [logs, setLogs] = useState<EmailLog[]>(StorageService.getEmailLogs());
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'guide'>(initialTab);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveGasUrl(gasUrl.trim());
    StorageService.saveEmailConfig({
      ...config,
      webhookUrl: gasUrl.trim(),
      provider: gasUrl.trim() ? 'webhook' : config.provider
    });
    onConfigSaved(config);
    setTestResult({ success: true, message: '클라우드 연동 및 이메일 알림 설정이 성공적으로 저장되었습니다.' });
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setTestResult(null);
    StorageService.saveGasUrl(gasUrl.trim());

    const res = await GoogleSheetService.fetchCloudData();
    setIsSyncing(false);
    if (res.success) {
      setTestResult({
        success: true,
        message: `구글 시트 실시간 연결 성공! (동기화된 예약: ${res.data?.reservations.length || 0}건)`
      });
      if (onSyncCompleted) onSyncCompleted();
    } else {
      setTestResult({
        success: false,
        message: `구글 시트 응답 확인 필요: 이전 이메일 전용 스크립트이거나 권한 설정이 필요합니다. [가이드] 탭의 코드를 복사하여 구글 시트의 [Apps Script]에 붙여넣고 [새 배포]를 해주세요!`
      });
    }
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
      notes: '구글 시트 및 Gmail 실시간 알림 발송 테스트입니다.',
      passwordHash: '0000',
      date: new Date().toISOString().split('T')[0],
      timeSlot: '14:00',
      status: 'confirmed' as const,
      createdAt: new Date().toISOString()
    };

    const res = await sendReservationNotificationEmail(testReservation, {
      ...config,
      webhookUrl: gasUrl.trim(),
      provider: gasUrl.trim() ? 'webhook' : config.provider
    });
    setIsTesting(false);
    setTestResult({ success: res.success, message: res.message });
    setLogs(StorageService.getEmailLogs());
  };

  const scriptCode = `// ==========================================
// 🎓 학생/보호자 상담 예약 웹앱 구글 시트 연동 스크립트
// ==========================================

function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#EEF2FF");
    }
  }
  return sheet;
}

// 1. GET 요청: 전체 예약 목록 및 일정 설정 실시간 조회
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var resSheet = getOrCreateSheet("예약목록", ["예약ID", "일시", "시간", "신청자구분", "학생이름", "학년반번호", "상담주제", "상담내용", "비밀번호", "상태", "접수일시"]);
    var schedSheet = getOrCreateSheet("일정설정", ["날짜", "휴무여부", "커스텀슬롯JSON"]);
    var configSheet = getOrCreateSheet("설정", ["설정키", "설정값"]);

    // 예약 목록 읽기
    var resData = resSheet.getDataRange().getValues();
    var reservations = [];
    for (var i = 1; i < resData.length; i++) {
      var row = resData[i];
      if (row[0]) {
        reservations.push({
          id: String(row[0]),
          date: String(row[1]),
          timeSlot: String(row[2]),
          applicantType: String(row[3] || '학생'),
          studentName: String(row[4]),
          studentGradeClass: String(row[5]),
          topic: String(row[6]),
          notes: String(row[7]),
          passwordHash: String(row[8]),
          status: String(row[9]),
          createdAt: String(row[10])
        });
      }
    }

    // 일정 설정 읽기
    var schedData = schedSheet.getDataRange().getValues();
    var daySchedules = {};
    for (var j = 1; j < schedData.length; j++) {
      var sRow = schedData[j];
      if (sRow[0]) {
        var dStr = String(sRow[0]);
        var isClosed = sRow[1] === true || String(sRow[1]) === 'true';
        var customSlots = [];
        try {
          if (sRow[2]) customSlots = JSON.parse(sRow[2]);
        } catch(e){}
        daySchedules[dStr] = {
          date: dStr,
          isClosedDay: isClosed,
          customSlots: customSlots
        };
      }
    }

    // 설정 읽기 (보호자 예약 여부 등)
    var confData = configSheet.getDataRange().getValues();
    var guardianBookingEnabled = true;
    for (var k = 1; k < confData.length; k++) {
      if (confData[k][0] === "guardianBookingEnabled") {
        guardianBookingEnabled = confData[k][1] === true || String(confData[k][1]) === 'true';
      }
    }

    var result = {
      status: "success",
      reservations: reservations,
      daySchedules: daySchedules,
      guardianBookingEnabled: guardianBookingEnabled
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. POST 요청: 예약 등록, 취소, 수정, 일정 변경 및 Gmail 알림 발송
function doPost(e) {
  try {
    var raw = e.postData.contents;
    var req = JSON.parse(raw);
    var action = req.action || "create_reservation";

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var resSheet = getOrCreateSheet("예약목록", ["예약ID", "일시", "시간", "신청자구분", "학생이름", "학년반번호", "상담주제", "상담내용", "비밀번호", "상태", "접수일시"]);
    var schedSheet = getOrCreateSheet("일정설정", ["날짜", "휴무여부", "커스텀슬롯JSON"]);
    var configSheet = getOrCreateSheet("설정", ["설정키", "설정값"]);

    if (action === "create_reservation") {
      var r = req.reservation || req;
      resSheet.appendRow([
        r.id,
        r.date,
        r.timeSlot,
        r.applicantType || '학생',
        r.studentName,
        r.studentGradeClass,
        r.topic,
        r.notes || '',
        r.passwordHash,
        r.status || 'confirmed',
        r.createdAt || new Date().toISOString()
      ]);

      // Gmail 알림 자동 발송
      try {
        var toEmail = req.to_email || Session.getActiveUser().getEmail();
        var subject = "[상담 예약 접수] (" + (r.applicantType || '학생') + ") " + r.studentName + " - " + r.date + " " + r.timeSlot;
        var body = "🔔 새로운 상담 예약이 구글 시트에 실시간 접수되었습니다.\\n\\n"
                 + "▪ 신청자 구분: " + (r.applicantType || '학생') + "\\n"
                 + "▪ 신청자 이름: " + r.studentName + "\\n"
                 + "▪ 학년/반/번호: " + r.studentGradeClass + "\\n"
                 + "▪ 상담 일시: " + r.date + " " + r.timeSlot + "\\n"
                 + "▪ 상담 주제: " + r.topic + "\\n"
                 + "▪ 전하고 싶은 말: " + (r.notes || '없음') + "\\n"
                 + "▪ 예약 번호: " + r.id + "\\n\\n"
                 + "연동된 구글 스프레드시트에서 실시간 예약 내역을 확인하실 수 있습니다.";
        MailApp.sendEmail(toEmail, subject, body);
      } catch (mailErr) {
        Logger.log("Mail send error: " + mailErr);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "예약 등록 및 이메일 발송 완료" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "cancel_reservation") {
      var cancelId = req.id;
      var data = resSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(cancelId)) {
          resSheet.getRange(i + 1, 10).setValue("cancelled");
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "update_reservation") {
      var updateId = req.id;
      var updates = req.updates || {};
      var uData = resSheet.getDataRange().getValues();
      for (var u = 1; u < uData.length; u++) {
        if (String(uData[u][0]) === String(updateId)) {
          if (updates.topic) resSheet.getRange(u + 1, 7).setValue(updates.topic);
          if (updates.notes !== undefined) resSheet.getRange(u + 1, 8).setValue(updates.notes);
          if (updates.status) resSheet.getRange(u + 1, 10).setValue(updates.status);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "save_schedules") {
      var daySchedules = req.daySchedules || {};
      schedSheet.clearContents();
      schedSheet.appendRow(["날짜", "휴무여부", "커스텀슬롯JSON"]);
      for (var dateKey in daySchedules) {
        var sObj = daySchedules[dateKey];
        schedSheet.appendRow([
          dateKey,
          !!sObj.isClosedDay,
          JSON.stringify(sObj.customSlots || [])
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "save_guardian_setting") {
      var gEnabled = req.enabled !== false;
      configSheet.clearContents();
      configSheet.appendRow(["설정키", "설정값"]);
      configSheet.appendRow(["guardianBookingEnabled", gEnabled]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ⚠️ 최초 1회 권한 승인을 위한 테스트 함수 (에디터 상단에서 testRun 선택 후 [실행 ▶] 클릭!)
function testRun() {
  getOrCreateSheet("예약목록", ["예약ID", "일시", "시간", "신청자구분", "학생이름", "학년반번호", "상담주제", "상담내용", "비밀번호", "상태", "접수일시"]);
  getOrCreateSheet("일정설정", ["날짜", "휴무여부", "커스텀슬롯JSON"]);
  getOrCreateSheet("설정", ["설정키", "설정값"]);
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "[테스트] 구글 시트 & Gmail 연동 승인 완료", "구글 시트 실시간 데이터베이스 및 Gmail 발송 권한이 정상 승인되었습니다.");
  Logger.log("시트 생성 및 테스트 메일 발송 완료!");
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConnected = !!gasUrl.trim();

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
        maxWidth: '680px',
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
            <Database size={24} color="#0D9488" />
            구글 시트(Google Sheets) 실시간 연동 & Gmail 설정
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.2rem' }}>
            구글 시트를 클라우드 데이터베이스로 연동하여 모든 학생·교사 기기 간 예약을 실시간 공유합니다.
          </p>
        </div>

        {/* Connection Status Badge */}
        <div style={{
          background: isConnected ? '#ECFDF5' : '#F8FAFC',
          border: isConnected ? '1.5px solid #A7F3D0' : '1.5px solid #E2E8F0',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isConnected ? '#10B981' : '#94A3B8'
            }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isConnected ? '#065F46' : '#64748B' }}>
              {isConnected ? '🟢 구글 시트 클라우드 연동 활성화됨 (실시간 공유 중)' : '⚪ 로컬 모드 (구글 시트 URL 미설정)'}
            </span>
          </div>
          {isConnected && (
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              style={{
                background: '#FFFFFF',
                border: '1px solid #A7F3D0',
                color: '#0D9488',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={14} className={isSyncing ? "spin" : ""} />
              {isSyncing ? '동기화 중...' : '지금 즉시 동기화'}
            </button>
          )}
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
            연동 설정
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
            📋 구글 시트 2분 연동 가이드 (스크립트 복사)
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
            발송 이력 ({logs.length})
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
                <span>학생 예약 시 교사 Gmail 알림 자동 발송 활성화</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">알림을 수신할 교사 Gmail 주소 *</label>
              <input
                type="email"
                className="form-input"
                placeholder="teacher@gmail.com"
                value={config.adminEmail}
                onChange={(e) => setConfig({ ...config, adminEmail: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ background: '#EEF2FF', border: '1.5px solid #C7D2FE', padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ color: '#3730A3', fontWeight: 800 }}>
                ⭐️ Google Apps Script 웹 앱 URL (구글 시트 실시간 DB URL)
              </label>
              <input
                type="url"
                className="form-input"
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                style={{ background: '#FFFFFF' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#4F46E5', marginTop: '0.4rem' }}>
                💡 구글 스프레드시트에서 <strong>[확장 프로그램 ➔ Apps Script]</strong>로 생성한 웹 앱 URL을 입력하면 실시간 동기화됩니다.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSyncNow}
                  disabled={isSyncing || !gasUrl.trim()}
                >
                  <RefreshCw size={16} className={isSyncing ? "spin" : ""} />
                  {isSyncing ? '연결 중...' : '시트 연결 테스트'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSendTest}
                  disabled={isTesting}
                >
                  <Send size={16} />
                  {isTesting ? '발송 중...' : '테스트 메일'}
                </button>
              </div>

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
              📊 구글 스프레드시트 실시간 연동 4단계 (딱 2분 소요)
            </h4>
            <ol style={{ paddingLeft: '1.2rem', marginBottom: '1rem' }}>
              <li><strong>구글 드라이브</strong>에서 새 <strong>[Google 스프레드시트]</strong>를 하나 만듭니다 (제목: `상담 예약 관리`).</li>
              <li>상단 메뉴에서 <strong>[확장 프로그램] ➔ [Apps Script]</strong>를 클릭합니다.</li>
              <li>기존 코드를 모두 지우고 아래의 <strong>[코드 복사]</strong> 버튼을 눌러 그대로 붙여넣습니다.</li>
              <li>
                <strong>⚠️ 최초 1회 권한 승인 (필수)</strong>:
                상단 툴바에서 <code>testRun</code> 선택 후 <strong>[실행 ▶]</strong> 클릭 ➔ '권한 검토' ➔ 계정 선택 ➔ '고급' ➔ '이동' ➔ '허용' 클릭!
              </li>
              <li>
                <strong>웹 앱 배포하기</strong>:
                우측 상단 <strong>[배포] ➔ [새 배포] ➔ 유형: [웹 앱]</strong> 선택:
                <ul style={{ color: '#4F46E5', fontWeight: 700, margin: '4px 0' }}>
                  <li>• 다음 사용자로 실행: <strong>나(내 계정)</strong></li>
                  <li>• 액세스 권한이 있는 사용자: <strong>모든 사용자 (Anyone)</strong> ⭐️</li>
                </ul>
              </li>
              <li>완료 후 생성된 <strong>웹 앱 URL (`https://script.google.com/macros/s/.../exec`)</strong>을 복사하여 위 설정창에 넣고 [설정 저장]을 누르면 끝입니다!</li>
            </ol>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>Google Apps Script 백엔드 소스 코드:</span>
              <button
                onClick={handleCopyCode}
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', background: '#0D9488', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '복사 완료!' : '전체 코드 복사하기'}
              </button>
            </div>

            <pre style={{
              background: '#0F172A',
              color: '#F8FAFC',
              padding: '0.85rem',
              borderRadius: '10px',
              fontSize: '0.73rem',
              lineHeight: 1.45,
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {scriptCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
