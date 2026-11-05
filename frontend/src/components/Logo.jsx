import { Wrench } from 'lucide-react';
import { cn } from '../utils/classNames.js';

export function Logo({ compact = false, className = '' }) {
  return (
    <span className={cn('brand', compact && 'brand--compact', className)}>
      <span className="brand__mark" aria-hidden="true">
        <Wrench size={compact ? 19 : 21} strokeWidth={2.4} />
      </span>
      {!compact ? (
        <span className="brand__text">
          <strong>TechService</strong>
          <small>Gestión técnica de campo</small>
        </span>
      ) : (
        <span className="brand__text brand__text--compact">
          <strong>TechService</strong>
        </span>
      )}
    </span>
  );
}
