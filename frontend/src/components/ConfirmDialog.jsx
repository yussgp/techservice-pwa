import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  loading = false,
  icon: Icon = AlertTriangle,
  onConfirm,
  onCancel,
  children
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmRef.current?.focus();

    const handleKey = (event) => {
      if (event.key === 'Escape' && !loading) onCancel?.();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const dialog = (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel?.();
      }}
    >
      <div
        className={`modal modal--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? 'confirm-dialog-description' : undefined}
      >
        <span className="modal__icon" aria-hidden="true">
          <Icon size={24} />
        </span>
        <h2 id="confirm-dialog-title">{title}</h2>
        {description ? <p id="confirm-dialog-description">{description}</p> : null}
        {children ? <div className="modal__body">{children}</div> : null}

        <div className="modal__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? null : createPortal(dialog, document.body);
}
