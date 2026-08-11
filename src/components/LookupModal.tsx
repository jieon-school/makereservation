import React, { useState } from 'react';
import { Search, Lock, Calendar, Clock, User, AlertCircle, Trash2, Edit3, X, CheckCircle } from 'lucide-react';
import type { Reservation, CounselingTopic } from '../types/reservation';
import { StorageService } from '../services/storage';
import { GoogleSheetService } from '../services/googleSheetService';

interface LookupModalProps {
  onClose: () => void;
  onReservationCancelled: (res: Reservation) => void;
  onReservationUpdated: (res: Reservation) => void;
}

export const LookupModal: React.FC<LookupModalProps> = ({
  onClose,
  onReservationCancelled,
  onReservationUpdated
}) => {
  const [studentName, setStudentName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [foundReservation, setFoundReservation] = useState<Reservation | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTopic, setEditTopic] = useState<CounselingTopic>('수시 상담');
  const [editNotes, setEditNotes] = useState('');

  const topics: CounselingTopic[] = ['수시 상담', '정시 상담', '학교 생활', '기타'];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!studentName.trim()) {
      setErrorMsg('신청자 이름을 입력해주세요.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('예약 비밀번호를 입력해주세요.');
      return;
    }

    const res = StorageService.findReservationByPassword(studentName, password);
    if (!res) {
      setErrorMsg('일치하는 예약 정보를 찾을 수 없습니다. 이름과 비밀번호를 확인해 주세요.');
      setFoundReservation(null);
    } else {
      setFoundReservation(res);
      setEditTopic(res.topic);
      setEditNotes(res.notes);
    }
  };

  const handleCancelClick = async () => {
    if (!foundReservation) return;
    if (window.confirm(`${foundReservation.studentName} 님의 [${foundReservation.date} ${foundReservation.timeSlot}] 상담 예약을 취소하시겠습니까?`)) {
      const success = StorageService.cancelReservation(foundReservation.id);
      if (success) {
        GoogleSheetService.cancelReservation(foundReservation.id);
        onReservationCancelled(foundReservation);
        onClose();
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!foundReservation) return;
    const updated = StorageService.updateReservation(foundReservation.id, {
      topic: editTopic,
      notes: editNotes
    });

    if (updated) {
      GoogleSheetService.updateReservation(foundReservation.id, {
        topic: editTopic,
        notes: editNotes
      });
      setFoundReservation(updated);
      setIsEditing(false);
      onReservationUpdated(updated);
    }
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
      <div className="glass-modal modal-dialog-content" style={{
        width: '100%',
        maxWidth: '540px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '1.75rem',
        position: 'relative'
      }}>
        {/* Close button */}
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
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={22} color="#0D9488" />
            예약 조회 및 수정 / 취소
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.2rem' }}>
            예약 시 입력한 신청자 이름과 비밀번호를 입력하여 내역을 확인합니다.
          </p>
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

        {!foundReservation ? (
          /* Search Form */
          <form onSubmit={handleSearch}>
            <div className="form-group">
              <label className="form-label">
                <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                신청자 이름
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="예: 김민준 또는 홍길동"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                예약 비밀번호
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="예약 시 작성한 비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}>
              <Search size={18} />
              본인 예약 조회하기
            </button>
          </form>
        ) : (
          /* Found Reservation Details */
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              padding: '1.25rem',
              borderRadius: '16px',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <span style={{ background: '#0D9488', color: '#FFF', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>
                    예약 확정됨
                  </span>
                  <span style={{ background: '#3B82F6', color: '#FFF', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>
                    {foundReservation.applicantType || '학생'}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  예약 ID: {foundReservation.id}
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {foundReservation.studentName} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#CBD5E1' }}>({foundReservation.studentGradeClass})</span>
              </h3>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', color: '#E2E8F0', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={16} color="#2DD4BF" />
                  <span>{foundReservation.date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={16} color="#2DD4BF" />
                  <span style={{ fontWeight: 700 }}>{foundReservation.timeSlot}</span>
                </div>
              </div>
            </div>

            {/* Display / Edit details */}
            {!isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>상담 주제</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0D9488', marginTop: '2px' }}>
                    {foundReservation.topic}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>상담 요청 내용</div>
                  <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '2px', whiteSpace: 'pre-wrap' }}>
                    {foundReservation.notes || '작성된 내용이 없습니다.'}
                  </div>
                </div>
              </div>
            ) : (
              /* Editing Form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">상담 주제 수정</label>
                  <select
                    className="form-select"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value as CounselingTopic)}
                  >
                    {topics.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">상담 요청 내용 수정</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setFoundReservation(null);
                  setPassword('');
                }}
              >
                다른 예약 조회
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!isEditing ? (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 size={16} />
                      수정하기
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={handleCancelClick}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Trash2 size={16} />
                      예약 취소
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsEditing(false)}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSaveEdit}
                    >
                      <CheckCircle size={16} />
                      수정 저장
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
