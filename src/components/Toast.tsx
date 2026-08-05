import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 100,
      background: isSuccess ? '#0F766E' : isError ? '#991B1B' : '#1E293B',
      color: '#FFFFFF',
      padding: '0.85rem 1.25rem',
      borderRadius: '14px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      animation: 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      maxWidth: '400px'
    }}>
      {isSuccess && <CheckCircle2 size={20} color="#2DD4BF" />}
      {isError && <AlertCircle size={20} color="#FCA5A5" />}
      {!isSuccess && !isError && <Info size={20} color="#60A5FA" />}

      <span style={{ fontSize: '0.9rem', fontWeight: 600, flex: 1, lineHeight: 1.4 }}>
        {toast.message}
      </span>

      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.7)',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
