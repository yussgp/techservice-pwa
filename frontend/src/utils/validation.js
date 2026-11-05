import { PRIORITIES, REPORT_STATUSES, SERVICE_TYPES } from '../constants.js';

const SERVICE_VALUES = SERVICE_TYPES.map((item) => item.value);
const PRIORITY_VALUES = PRIORITIES.map((item) => item.value);
const STATUS_VALUES = REPORT_STATUSES.map((item) => item.value);

export function normalizeReportValues(values) {
  const normalized = {};
  for (const [key, value] of Object.entries(values)) {
    normalized[key] = typeof value === 'string' ? value.trim() : value;
  }
  return normalized;
}

export function validatePhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validación espejo de la del backend. Devuelve un objeto { campo: mensaje }.
 */
export function validateReport(values) {
  const errors = {};
  const get = (field) => String(values[field] ?? '').trim();

  if (get('technicianName').length < 2) {
    errors.technicianName = 'Ingresa el nombre del técnico (mínimo 2 caracteres).';
  }
  if (get('clientName').length < 2) {
    errors.clientName = 'Ingresa el nombre del cliente (mínimo 2 caracteres).';
  }
  if (!get('clientPhone')) {
    errors.clientPhone = 'Ingresa el teléfono del cliente.';
  } else if (!validatePhone(get('clientPhone'))) {
    errors.clientPhone = 'El teléfono debe contener entre 7 y 15 dígitos.';
  }
  if (get('location').length < 3) {
    errors.location = 'Ingresa la ubicación o dirección del servicio.';
  }
  if (!SERVICE_VALUES.includes(values.serviceType)) {
    errors.serviceType = 'Selecciona un tipo de servicio.';
  }
  if (get('equipment').length < 2) {
    errors.equipment = 'Describe el equipo atendido.';
  }
  if (get('problemDescription').length < 5) {
    errors.problemDescription = 'Describe el problema (mínimo 5 caracteres).';
  }
  if (!PRIORITY_VALUES.includes(values.priority)) {
    errors.priority = 'Selecciona una prioridad.';
  }
  if (!STATUS_VALUES.includes(values.status)) {
    errors.status = 'Selecciona el estado del reporte.';
  }
  if (get('diagnosis').length > 2000) {
    errors.diagnosis = 'El diagnóstico no debe superar los 2000 caracteres.';
  }
  if (get('workPerformed').length > 2000) {
    errors.workPerformed = 'El trabajo realizado no debe superar los 2000 caracteres.';
  }
  if (get('materials').length > 1000) {
    errors.materials = 'Los materiales no deben superar los 1000 caracteres.';
  }
  if (get('notes').length > 1500) {
    errors.notes = 'Las observaciones no deben superar los 1500 caracteres.';
  }

  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
