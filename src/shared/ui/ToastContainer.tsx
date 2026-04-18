import type { Toast } from '@/shared/types';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: number) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (!toasts.length) return null;

  return (
    <div className="sw-toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`sw-toast ${toast.fading ? 'fading' : ''}`}
          onClick={() => removeToast(toast.id)}
        >
          <span className="sw-toast-icon">{toast.icon}</span>
          <span className="sw-toast-message">{toast.msg}</span>
        </div>
      ))}
    </div>
  );
}