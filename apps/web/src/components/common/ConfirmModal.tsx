'use client';

import React from 'react';
import { AlertTriangle, Trash2, Info, LogOut, X, AlertCircle } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 size={24} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={24} color="#F59E0B" />;
      case 'info':
      default:
        return <Info size={24} color="#3B82F6" />;
    }
  };

  const getBadgeBg = () => {
    switch (type) {
      case 'danger':
        return '#FEE2E2';
      case 'warning':
        return '#FEF3C7';
      case 'info':
      default:
        return '#DBEAFE';
    }
  };

  const getConfirmBtnStyle = (): React.CSSProperties => {
    switch (type) {
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
        };
      case 'info':
      default:
        return {
          background: 'linear-gradient(135deg, #FF7244 0%, #FF4D29 100%)',
          color: '#FFFFFF',
          boxShadow: '0 4px 14px rgba(255, 90, 54, 0.25)',
        };
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel} style={styles.overlay}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={styles.modalCard}
      >
        {/* Close Button */}
        <button onClick={onCancel} style={styles.closeBtn} aria-label="Close modal">
          <X size={18} color="#8A94A6" />
        </button>

        {/* Icon Badge */}
        <div style={{ ...styles.iconBadge, backgroundColor: getBadgeBg() }}>
          {getIcon()}
        </div>

        {/* Text Content */}
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>

        {/* Action Buttons */}
        <div style={styles.actionRow}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={styles.cancelBtn}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{ ...styles.confirmBtn, ...getConfirmBtnStyle() }}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
    animation: 'fadeIn 0.2s ease-out',
  },
  modalCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    padding: '28px 24px 24px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.2), 0 0 1px 1px rgba(0,0,0,0.05)',
    animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  closeBtn: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  iconBadge: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1C2024',
    margin: '0 0 8px 0',
  },
  message: {
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#64748B',
    margin: '0 0 24px 0',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    fontWeight: 600,
    fontSize: '14px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  confirmBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '14px',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, box-shadow 0.15s ease',
  },
};
