import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: '#10B981',
          iconBg: '#059669',
        };
      case 'error':
        return {
          bg: '#EF4444',
          iconBg: '#DC2626',
        };
      case 'warning':
        return {
          bg: '#F59E0B',
          iconBg: '#D97706',
        };
      case 'info':
        return {
          bg: '#3B82F6',
          iconBg: '#2563EB',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      style={{
        ...toastStyles.container,
        backgroundColor: styles.bg,
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div style={{ ...toastStyles.iconContainer, backgroundColor: styles.iconBg }}>
        {getIcon()}
      </div>
      <p style={toastStyles.message}>{message}</p>
      <button onClick={() => onClose(id)} style={toastStyles.closeButton}>
        <X size={18} />
      </button>
    </div>
  );
}

const toastStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    color: '#FFFFFF',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    minWidth: '320px',
    maxWidth: '480px',
    marginBottom: '12px',
  },
  iconContainer: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '1.5',
  },
  closeButton: {
    padding: '4px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
    flexShrink: 0,
    transition: 'background-color 0.15s',
  },
};
