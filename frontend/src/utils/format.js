const DATE_FORMAT = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const TIME_FORMAT = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const LONG_DATE_FORMAT = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = asDate(value);
  return date ? DATE_FORMAT.format(date) : '—';
}

export function formatDateTime(value) {
  const date = asDate(value);
  return date ? DATE_TIME_FORMAT.format(date) : '—';
}

export function formatTime(value) {
  const date = asDate(value);
  return date ? TIME_FORMAT.format(date) : '—';
}

export function formatLongDate(value = new Date()) {
  const date = asDate(value);
  if (!date) return '—';
  const text = LONG_DATE_FORMAT.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function timeAgo(value) {
  const date = asDate(value);
  if (!date) return 'Nunca';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'Ahora';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 45) return 'Hace unos segundos';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} d`;
  return formatDate(date);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('es-MX').format(Number(value) || 0);
}

export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return `${amount.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function initials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'TS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function excelDate(value) {
  const date = asDate(value);
  if (!date) return '';
  return date.toISOString();
}
