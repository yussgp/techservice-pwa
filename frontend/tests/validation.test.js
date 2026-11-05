import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasErrors,
  normalizeReportValues,
  validatePhone,
  validateReport
} from '../src/utils/validation.js';

function validReport(overrides = {}) {
  return {
    technicianName: 'Luis Ramírez',
    clientName: 'María González',
    clientPhone: '+52 55 1234 5678',
    location: 'Av. Reforma 123, CDMX',
    serviceType: 'preventivo',
    equipment: 'Bomba centrífuga 1.5 HP',
    problemDescription: 'La bomba presenta ruido y vibración.',
    diagnosis: 'Rodamiento desgastado.',
    workPerformed: 'Se reemplazó el rodamiento.',
    materials: '1 rodamiento 6203',
    priority: 'alta',
    status: 'resuelto',
    notes: '',
    ...overrides
  };
}

test('normalizeReportValues recorta espacios de todos los campos de texto', () => {
  const normalized = normalizeReportValues({
    technicianName: '  Ana  ',
    clientName: '\tCliente\n',
    priority: 'media',
    extra: 42
  });

  assert.equal(normalized.technicianName, 'Ana');
  assert.equal(normalized.clientName, 'Cliente');
  assert.equal(normalized.priority, 'media');
  assert.equal(normalized.extra, 42);
});

test('un reporte completo y válido no produce errores', () => {
  const errors = validateReport(validReport());
  assert.deepEqual(errors, {});
  assert.equal(hasErrors(errors), false);
});

test('detecta todos los campos obligatorios vacíos', () => {
  const errors = validateReport({});

  for (const field of [
    'technicianName',
    'clientName',
    'clientPhone',
    'location',
    'serviceType',
    'equipment',
    'problemDescription',
    'priority',
    'status'
  ]) {
    assert.ok(errors[field], `Se esperaba un error para ${field}`);
  }

  assert.equal(hasErrors(errors), true);
});

test('validatePhone acepta entre 7 y 15 dígitos e ignora separadores', () => {
  assert.equal(validatePhone('55 1234 5678'), true);
  assert.equal(validatePhone('+52 (55) 1234-5678'), true);
  assert.equal(validatePhone('1234567'), true);
  assert.equal(validatePhone('123456789012345'), true);
  assert.equal(validatePhone('123456'), false);
  assert.equal(validatePhone('1234567890123456'), false);
  assert.equal(validatePhone(''), false);
  assert.equal(validatePhone(null), false);
});

test('rechaza teléfonos con menos de 7 dígitos', () => {
  const errors = validateReport(validReport({ clientPhone: '12345' }));
  assert.match(errors.clientPhone, /7 y 15 dígitos/);
});

test('rechaza enums desconocidos de servicio, prioridad y estado', () => {
  const errors = validateReport(
    validReport({ serviceType: 'otro', priority: 'crítica', status: 'pendiente' })
  );

  assert.ok(errors.serviceType);
  assert.ok(errors.priority);
  assert.ok(errors.status);
});

test('valida longitudes máximas de los textos opcionales', () => {
  const errors = validateReport(
    validReport({
      diagnosis: 'd'.repeat(2001),
      workPerformed: 'w'.repeat(2001),
      materials: 'm'.repeat(1001),
      notes: 'n'.repeat(1501)
    })
  );

  assert.ok(errors.diagnosis);
  assert.ok(errors.workPerformed);
  assert.ok(errors.materials);
  assert.ok(errors.notes);
});

test('permite los textos opcionales vacíos', () => {
  const errors = validateReport(
    validReport({ diagnosis: '', workPerformed: '', materials: '', notes: '' })
  );
  assert.deepEqual(errors, {});
});
