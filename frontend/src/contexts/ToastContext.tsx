import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

type ToastInput = {
  type?: ToastType;
  title: string;
  message?: string;
  details?: string;
  durationMs?: number;
};

type ToastItem = Required<Pick<ToastInput, 'type' | 'title'>> &
  Omit<ToastInput, 'type' | 'title'> & {
    id: string;
  };

type ToastContextValue = {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle2,
  warning: TriangleAlert,
  error: XCircle,
  info: Info
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = 'info', title, message, details, durationMs = 4200 }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast: ToastItem = { id, type, title, message, details, durationMs };
      setToasts((current) => [toast, ...current].slice(0, 5));
      if (durationMs > 0) {
        window.setTimeout(() => dismissToast(id), durationMs);
      }
      return id;
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <div className={`toast toast-${toast.type}`} key={toast.id} role="status">
              <Icon size={18} />
              <div className="toast-body">
                <strong>{toast.title}</strong>
                {toast.message && <span>{toast.message}</span>}
                {toast.details && (
                  <details>
                    <summary>상세</summary>
                    <pre>{toast.details}</pre>
                  </details>
                )}
              </div>
              <button className="icon-button toast-close" onClick={() => dismissToast(toast.id)} title="닫기">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
