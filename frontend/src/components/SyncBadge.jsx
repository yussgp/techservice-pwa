import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { SYNC_STATUSES } from '../constants.js';

const CONFIG = {
  pending: { icon: Clock3, className: 'badge--pending' },
  synced: { icon: CheckCircle2, className: 'badge--synced' },
  error: { icon: AlertTriangle, className: 'badge--error' }
};

export function SyncBadge({ status, className = '' }) {
  const config = CONFIG[status] || CONFIG.pending;
  const label = SYNC_STATUSES[status] || SYNC_STATUSES.pending;
  const Icon = config.icon;

  return (
    <span
      className={`badge badge--sync ${config.className} ${className}`.trim()}
      title={label.longLabel}
    >
      <Icon size={13} aria-hidden="true" />
      {label.label}
    </span>
  );
}
