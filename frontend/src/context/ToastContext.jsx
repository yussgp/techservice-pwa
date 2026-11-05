import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const sequence = useRef(0);

  const removeToast = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title, message, duration = DEFAULT_DURATION }) => {
      sequence.current += 1;
      const id = `toast-${Date.now()}-${sequence.current}`;
      const toast = { id, type, title, message };

      setToasts((current) => [...current.slice(-3), toast]);

      if (duration > 0) {
        const timer = setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      for (const timer of currentTimers.values()) clearTimeout(timer);
      currentTimers.clear();
    };
  }, []);

  const value = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  const viewport = (
    <div className="toast-viewport" role="region" aria-label="Notificaciones">
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.type] || Info;
          return (
            <div key={toast.id} className={`toast toast--${toast.type}`} role="status">
              <span className="toast__icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <div className="toast__content">
                {toast.title ? <strong>{toast.title}</strong> : null}
                {toast.message ? <p>{toast.message}</p> : null}
              </div>
              <button
                type="button"
                className="toast__close"
                onClick={() => removeToast(toast.id)}
                aria-label="Cerrar notificación"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' ? createPortal(viewport, document.body) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider');
  return context;
}
