import React, { useState } from 'react';
import { X, Calendar, Clock, CheckCircle2, User, BookOpen, AlertCircle, KeyRound, Users, Ban } from 'lucide-react';
import type { CounselingTopic, ApplicantType } from '../types/reservation';
import { StorageService } from '../services/storage';

interface BookingModalProps {
  date: string;
  timeSlot: string;
  onClose: () => void;
  onSubmit: (data: {
    studentName: string;
    applicantType: ApplicantType;
    studentGradeClass: string;
    topic: CounselingTopic;
    notes: string;
    passwordHash: string;
  }) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  date,
  timeSlot,
  onClose,
  onSubmit
}) => {
  const isGuardianEnabled = StorageService.isGuardianBookingEnabled();
  const [studentName, setStudentName] = useState('');
  const [applicantType, setApplicantType] = useState<ApplicantType>('학생');
  const [studentGradeClass, setStudentGradeClass] = useState('');
  const [topic, setTopic] = useState<CounselingTopic>('수시 상담');
  const [notes, setNotes] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const applicantOptions: ApplicantType[] = ['학생', '보호자', '기타'];

  const topics: { key: CounselingTopic; label: string; desc: string }[] = [
    { key: '수시 상담', label: '수시 상담', desc: '학생부, 교과/종합 전형 라인 및 자소서 상담' },
    { key: '정시 상담', label: '정시 상담', desc: '모의고사 성적표 분석 및 수능/정시 대비' },
    { key: '학교 생활', label: '학교 생활', desc: '교우관계, 학업 고민, 동아리 및 진로' },
    { key: '기타', label: '기타', desc: '기타 개인적인 고민 및 자유 주제' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (applicantType === '보호자' && !isGuardianEnabled) {
      setErrorMsg('현재 보호자 예약은 접수 마감 상태입니다. 학생으로 신청해주세요.');
      return;
    }
    if (!studentName.trim()) {
      setErrorMsg('신청자 이름을 입력해주세요.');
      return;
    }
    if (!studentGradeClass.trim()) {
      setErrorMsg('학년 / 반 / 번호를 입력해주세요 (예: 3학년 2반 15번).');
      return;
    }
    if (!password) {
      setErrorMsg('예약 확인 및 수정용 비밀번호를 입력해주세요.');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('비밀번호는 최소 4자리 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg('입력하신 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    onSubmit({
      studentName: studentName.trim(),
      applicantType,
      studentGradeClass: studentGradeClass.trim(),
      topic,
      notes: notes.trim(),
      passwordHash: password.trim()
    });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
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
        maxWidth: '560px',
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

        {/* Modal Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
            상담 예약 신청
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.2rem' }}>
            상담 일시를 확인하고 신청자 정보 및 비밀번호를 입력해주세요.
          </p>
        </div>

        {/* Time Summary Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
          color: '#FFFFFF',
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={20} />
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{date}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.2)', padding: '0.35rem 0.8rem', borderRadius: '99px' }}>
            <Clock size={16} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{timeSlot}</span>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            background: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            color: '#991B1B',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. Applicant Type Selection (학생 / 보호자 / 기타) */}
          <div className="form-group">
            <label className="form-label">
              <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
              신청자 구분 선택 *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {applicantOptions.map((type) => {
                const isSelected = applicantType === type;
                const isGuardianDisabled = type === '보호자' && !isGuardianEnabled;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (isGuardianDisabled) {
                        setErrorMsg('현재 선생님께서 보호자 상담 예약 접수를 마감하셨습니다. 학생 또는 기타로 신청해주세요.');
                        return;
                      }
                      setErrorMsg('');
                      setApplicantType(type);
                    }}
                    style={{
                      padding: '0.65rem 0.5rem',
                      borderRadius: '12px',
                      border: isGuardianDisabled
                        ? '1.5px dashed #CBD5E1'
                        : isSelected ? '2px solid #0D9488' : '1.5px solid #E2E8F0',
                      background: isGuardianDisabled
                        ? '#F8FAFC'
                        : isSelected ? '#CCFBF1' : '#FFFFFF',
                      color: isGuardianDisabled
                        ? '#94A3B8'
                        : isSelected ? '#0F766E' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: isGuardianDisabled ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      opacity: isGuardianDisabled ? 0.7 : 1
                    }}
                  >
                    {type === '학생' ? '🎓 학생' : type === '보호자' ? (isGuardianDisabled ? '🔒 보호자 (마감)' : '👨‍👩‍👧 보호자') : '👥 기타'}
                  </button>
                );
              })}
            </div>

            {!isGuardianEnabled && (
              <div style={{
                fontSize: '0.78rem',
                color: '#B45309',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Ban size={14} color="#B45309" />
                <span>현재 <strong>보호자 상담 예약은 마감</strong>되어 있습니다. 학생으로 신청해주세요.</span>
              </div>
            )}
          </div>

          {/* 2. Applicant Name & Grade/Class */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                {applicantType === '보호자' ? '보호자 이름 *' : '신청자 이름 *'}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={applicantType === '보호자' ? '예: 홍길동 (보호자)' : '예: 김민준'}
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">학생 학년 / 반 / 번호 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="예: 3학년 2반 15번"
                value={studentGradeClass}
                onChange={(e) => setStudentGradeClass(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 3. Counseling Topic Selection */}
          <div className="form-group">
            <label className="form-label">
              <BookOpen size={14} style={{ display: 'inline', marginRight: '4px' }} />
              상담 주제 선택 *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {topics.map((t) => {
                const isSelected = topic === t.key;
                return (
                  <div
                    key={t.key}
                    onClick={() => setTopic(t.key)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #0D9488' : '1.5px solid #E2E8F0',
                      background: isSelected ? '#F0FDF4' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? '#0D9488' : '#0F172A' }}>
                        {t.label}
                      </span>
                      {isSelected && <CheckCircle2 size={16} color="#0D9488" />}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px', lineHeight: 1.3 }}>
                      {t.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Detailed Notes */}
          <div className="form-group">
            <label className="form-label">미리 전하고 싶은 내용 (선택)</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="선생님께 전달하고 싶은 고민이나 미리 공유할 상담 주제가 있다면 편하게 작성해주세요."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* 5. Password & Password Confirmation */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <KeyRound size={18} color="#0D9488" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                예약 비밀번호 설정 (나중에 수정/취소 시 사용)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>비밀번호 (4자리 이상) *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="예약 비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>비밀번호 확인 *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="비밀번호 재입력"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  style={{
                    borderColor: passwordConfirm && password !== passwordConfirm ? '#EF4444' : undefined
                  }}
                  required
                />
              </div>
            </div>
            {passwordConfirm && password !== passwordConfirm && (
              <p style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '0.4rem' }}>
                비밀번호가 일치하지 않습니다.
              </p>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
              상담 예약 완료하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
