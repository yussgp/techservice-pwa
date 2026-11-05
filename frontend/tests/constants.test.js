import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRIORITIES,
  REPORT_STATUSES,
  SERVICE_TYPES,
  SYNC_STATUSES,
  labelFrom,
  priorityLabel,
  reportStatusLabel,
  serviceTypeLabel,
  syncStatusLabel
} from '../src/constants.js';

test('los catálogos contienen los valores acordados con la API', () => {
  assert.deepEqual(
    SERVICE_TYPES.map((item) => item.value),
    ['preventivo', 'correctivo', 'instalacion', 'reparacion', 'inspeccion']
  );
  assert.deepEqual(
    PRIORITIES.map((item) => item.value),
    ['baja', 'media', 'alta', 'urgente']
  );
  assert.deepEqual(
    REPORT_STATUSES.map((item) => item.value),
    ['abierto', 'en_proceso', 'resuelto', 'cerrado']
  );
  assert.deepEqual(Object.keys(SYNC_STATUSES).sort(), ['error', 'pending', 'synced']);
});

test('los helpers devuelven la etiqueta en español', () => {
  assert.equal(serviceTypeLabel('preventivo'), 'Mantenimiento preventivo');
  assert.equal(priorityLabel('urgente'), 'Urgente');
  assert.equal(reportStatusLabel('en_proceso'), 'En proceso');
  assert.equal(syncStatusLabel('synced'), 'Sincronizado');
});

test('los helpers conservan el valor original como fallback', () => {
  assert.equal(serviceTypeLabel('desconocido'), 'desconocido');
  assert.equal(labelFrom([], 'x'), 'x');
});
