import React from 'react';
import { Toast, ToastProps } from './Toast';

interface ToastContainerProps {
  toasts: Omit<ToastProps, 'onClose'>[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
      <style>{keyframes}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
};

const keyframes = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
