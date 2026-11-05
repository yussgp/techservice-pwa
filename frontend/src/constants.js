export const SERVICE_TYPES = [
  { value: 'preventivo', label: 'Mantenimiento preventivo', shortLabel: 'Preventivo' },
  { value: 'correctivo', label: 'Mantenimiento correctivo', shortLabel: 'Correctivo' },
  { value: 'instalacion', label: 'Instalación', shortLabel: 'Instalación' },
  { value: 'reparacion', label: 'Reparación', shortLabel: 'Reparación' },
  { value: 'inspeccion', label: 'Inspección', shortLabel: 'Inspección' }
];

export const PRIORITIES = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' }
];

export const REPORT_STATUSES = [
  { value: 'abierto', label: 'Abierto' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'cerrado', label: 'Cerrado' }
];

export const SYNC_STATUSES = {
  pending: {
    value: 'pending',
    label: 'Pendiente',
    longLabel: 'Pendiente de sincronización'
  },
  synced: {
    value: 'synced',
    label: 'Sincronizado',
    longLabel: 'Sincronizado con el servidor'
  },
  error: {
    value: 'error',
    label: 'Error',
    longLabel: 'Error de sincronización'
  }
};

export const API_BASE_STORAGE_KEY = 'techservice.apiBase';
export const LAST_SYNC_STORAGE_KEY = 'techservice.lastSyncAt';
export const LAST_TECHNICIAN_STORAGE_KEY = 'techservice.lastTechnician';

export const SYNC_TAG = 'techservice-report-sync';
export const AUTO_SYNC_INTERVAL_MS = 60_000;
export const SYNC_BATCH_SIZE = 50;
export const MAX_AUTO_RETRIES = 5;
export const RETRY_BASE_DELAY_MS = 30_000;
export const RETRY_MAX_DELAY_MS = 15 * 60_000;

export function labelFrom(list, value, fallback = value) {
  return list.find((item) => item.value === value)?.label ?? fallback;
}

export function serviceTypeLabel(value) {
  return labelFrom(SERVICE_TYPES, value, value);
}

export function priorityLabel(value) {
  return labelFrom(PRIORITIES, value, value);
}

export function reportStatusLabel(value) {
  return labelFrom(REPORT_STATUSES, value, value);
}

export function syncStatusLabel(value) {
  return SYNC_STATUSES[value]?.label ?? value;
}
