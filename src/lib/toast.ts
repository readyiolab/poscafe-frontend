import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

type ToastType = 'success' | 'error' | 'info';

const styles: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: 'linear-gradient(135deg, #059669, #10b981)', icon: '✓' },
  error: { bg: 'linear-gradient(135deg, #dc2626, #ef4444)', icon: '✕' },
  info: { bg: 'linear-gradient(135deg, #d97706, #f59e0b)', icon: 'ℹ' },
};

export function toast(message: string, type: ToastType = 'info') {
  const { bg, icon } = styles[type];
  Toastify({
    text: `${icon}  ${message}`,
    duration: type === 'error' ? 5000 : 3500,
    gravity: 'top',
    position: 'center',
    style: {
      background: bg,
      borderRadius: '16px',
      fontSize: '15px',
      fontWeight: '600',
      padding: '14px 24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      maxWidth: '90vw',
    },
  }).showToast();
}
