import { Download, Hammer, Search, Settings, Wrench } from 'lucide-react';

const ICONS = {
  preventivo: Settings,
  correctivo: Wrench,
  instalacion: Download,
  reparacion: Hammer,
  inspeccion: Search
};

export function ServiceIcon({ type, size = 18, className = '' }) {
  const Icon = ICONS[type] || Wrench;
  return (
    <span className={`service-icon service-icon--${type} ${className}`.trim()} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}
