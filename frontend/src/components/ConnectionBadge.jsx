import { Wifi, WifiOff } from 'lucide-react';
import { useSync } from '../context/SyncContext.jsx';
import { cn } from '../utils/classNames.js';

export function ConnectionBadge({ compact = false, className = '' }) {
  const { isOnline } = useSync();
  const Icon = isOnline ? Wifi : WifiOff;

  return (
    <span
      className={cn(
        'connection-badge',
        isOnline ? 'connection-badge--online' : 'connection-badge--offline',
        compact && 'connection-badge--compact',
        className
      )}
      title={
        isOnline
          ? 'Conectado a Internet'
          : 'Sin conexión: los reportes se guardan en este dispositivo'
      }
    >
      <span className="connection-badge__dot" aria-hidden="true" />
      <Icon size={compact ? 14 : 15} aria-hidden="true" />
      <span>{isOnline ? 'En línea' : 'Sin conexión'}</span>
    </span>
  );
}
