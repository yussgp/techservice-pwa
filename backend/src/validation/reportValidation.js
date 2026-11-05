export const SERVICE_TYPES = ['preventivo', 'correctivo', 'instalacion', 'reparacion', 'inspeccion'];
export const PRIORITIES = ['baja', 'media', 'alta', 'urgente'];
export const REPORT_STATUSES = ['abierto', 'en_proceso', 'resuelto', 'cerrado'];

export const SERVICE_TYPE_LABELS = {
  preventivo: 'Mantenimiento preventivo',
  correctivo: 'Mantenimiento correctivo',
  instalacion: 'Instalación',
  reparacion: 'Reparación',
  inspeccion: 'Inspección'
};

export const PRIORITY_LABELS = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente'
};

export const REPORT_STATUS_LABELS = {
  abierto: 'Abierto',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado'
};

const TEXT_FIELDS = {
  technicianName: { label: 'El nombre del técnico', required: true, min: 2, max: 120 },
  clientName: { label: 'El nombre del cliente', required: true, min: 2, max: 150 },
  clientPhone: { label: 'El teléfono del cliente', required: true, min: 7, max: 30 },
  location: { label: 'La ubicación del servicio', required: true, min: 3, max: 250 },
  equipment: { label: 'El equipo atendido', required: true, min: 2, max: 150 },
  problemDescription: {
    label: 'La descripción del problema',
    required: true,
    min: 5,
    max: 2000
  },
  diagnosis: { label: 'El diagnóstico técnico', required: false, max: 2000 },
  workPerformed: { label: 'El trabajo realizado', required: false, max: 2000 },
  materials: { label: 'Los materiales utilizados', required: false, max: 1000 },
  notes: { label: 'Las observaciones adicionales', required: false, max: 1500 }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FOLIO_REGEX = /^TS-\d{8}-[A-Z0-9]{4,8}$/;

export function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateDate(value) {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Valida y normaliza un reporte.
 * - partial=true valida únicamente los campos enviados (para PUT).
 * - requireIdentity=true exige id y folio (para el endpoint de sincronización).
 */
export function sanitizeReport(input, { partial = false, requireIdentity = false } = {}) {
  const value = {};
  const errors = [];

  if (!isPlainObject(input)) {
    return { value, errors: [{ field: '_body', message: 'El cuerpo debe ser un objeto JSON.' }] };
  }

  for (const [field, rules] of Object.entries(TEXT_FIELDS)) {
    const raw = input[field];

    if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
      if (!partial && rules.required) {
        errors.push({ field, message: `${rules.label} es obligatorio.` });
      } else if (raw !== undefined && raw !== null && typeof raw !== 'string') {
        errors.push({ field, message: `${rules.label} debe ser texto.` });
      } else if (raw === '') {
        value[field] = '';
      }
      continue;
    }

    if (typeof raw !== 'string') {
      errors.push({ field, message: `${rules.label} debe ser texto.` });
      continue;
    }

    const text = raw.trim();
    if (rules.min && text.length < rules.min) {
      errors.push({
        field,
        message: `${rules.label} debe tener al menos ${rules.min} caracteres.`
      });
      continue;
    }
    if (rules.max && text.length > rules.max) {
      errors.push({
        field,
        message: `${rules.label} no debe superar los ${rules.max} caracteres.`
      });
      continue;
    }
    if (field === 'clientPhone' && !normalizePhone(text)) {
      errors.push({
        field,
        message: 'El teléfono debe contener entre 7 y 15 dígitos.'
      });
      continue;
    }
    value[field] = text;
  }

  const enums = {
    serviceType: { values: SERVICE_TYPES, label: 'El tipo de servicio', required: true },
    priority: { values: PRIORITIES, label: 'La prioridad', required: true },
    status: { values: REPORT_STATUSES, label: 'El estado del reporte', required: true }
  };

  for (const [field, rule] of Object.entries(enums)) {
    const raw = input[field];
    if (raw === undefined || raw === null || raw === '') {
      if (!partial && rule.required) {
        errors.push({ field, message: `${rule.label} es obligatorio.` });
      }
      continue;
    }
    if (!rule.values.includes(raw)) {
      errors.push({
        field,
        message: `${rule.label} debe ser uno de: ${rule.values.join(', ')}.`
      });
      continue;
    }
    value[field] = raw;
  }

  if (input.id !== undefined && input.id !== null) {
    if (!isUuid(input.id)) {
      errors.push({ field: 'id', message: 'El identificador debe ser un UUID válido.' });
    } else {
      value.id = input.id.toLowerCase();
    }
  } else if (requireIdentity) {
    errors.push({ field: 'id', message: 'El identificador UUID es obligatorio.' });
  }

  if (input.folio !== undefined && input.folio !== null) {
    if (typeof input.folio !== 'string' || !FOLIO_REGEX.test(input.folio)) {
      errors.push({
        field: 'folio',
        message: 'El folio debe tener el formato TS-AAAAMMDD-XXXX.'
      });
    } else {
      value.folio = input.folio;
    }
  } else if (requireIdentity) {
    errors.push({ field: 'folio', message: 'El folio es obligatorio.' });
  }

  for (const field of ['createdAt', 'updatedAt']) {
    if (input[field] === undefined || input[field] === null || input[field] === '') continue;
    const iso = validateDate(input[field]);
    if (!iso) {
      errors.push({ field, message: `${field} debe ser una fecha ISO 8601 válida.` });
    } else {
      value[field] = iso;
    }
  }

  return { value, errors };
}

export function validateCompleteReport(report) {
  return sanitizeReport(report, { partial: false });
}
