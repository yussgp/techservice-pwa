import { RefreshCw } from 'lucide-react';
import { useSync } from '../context/SyncContext.jsx';
import { cn } from '../utils/classNames.js';

export function SyncButton({
  variant = 'primary',
  size = 'md',
  label,
  compact = false,
  className = ''
}) {
  const { syncNow, isSyncing, isOnline, unsyncedCount } = useSync();

  return (
    <button
      type="button"
      className={cn('btn', `btn-${variant}`, `btn-${size}`, compact && 'btn-icon', className)}
      onClick={() => syncNow(true)}
      disabled={isSyncing}
      aria-busy={isSyncing}
      aria-label={label || 'Sincronizar reportes'}
      title={
        isOnline
          ? 'Enviar reportes pendientes al servidor'
          : 'Sin conexión: se reintentará al recuperarla'
      }
    >
      <RefreshCw size={compact ? 18 : 16} className={isSyncing ? 'spin' : undefined} aria-hidden="true" />
      {!compact ? <span>{label || (isSyncing ? 'Sincronizando…' : 'Sincronizar')}</span> : null}
      {!compact && unsyncedCount > 0 ? (
        <span className="btn__badge" aria-label={`${unsyncedCount} sin sincronizar`}>
          {unsyncedCount}
        </span>
      ) : null}
    </button>
  );
}
