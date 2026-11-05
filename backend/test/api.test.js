import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/database/database.js';
import { createApp } from '../src/app.js';

let db;
let server;
let baseUrl;
let tempDir;

function sampleReport(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    folio: `TS-20261105-${Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X')}`,
    technicianName: 'Luis Ramírez',
    clientName: 'María González',
    clientPhone: '+52 55 1234 5678',
    location: 'Av. Reforma 123, CDMX',
    serviceType: 'correctivo',
    equipment: 'Bomba de agua 1.5 HP',
    problemDescription: 'La bomba no enciende desde ayer.',
    diagnosis: 'Capacitor dañado.',
    workPerformed: 'Se reemplazó el capacitor.',
    materials: 'Capacitor 40 µF',
    priority: 'alta',
    status: 'resuelto',
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'techservice-test-'));
  db = createDatabase(path.join(tempDir, 'test.sqlite'));
  const app = createApp({
    db,
    corsOrigins: ['http://localhost:5173'],
    nodeEnv: 'test'
  });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('GET /api/health responde con estado ok', async () => {
  const { response, body } = await api('/api/health');
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ok');
  assert.equal(body.data.database, 'ok');
});

test('POST /api/reports crea un reporte y GET /:id lo recupera', async () => {
  const report = sampleReport();
  const created = await api('/api/reports', {
    method: 'POST',
    body: JSON.stringify(report)
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.id, report.id);
  assert.equal(created.body.meta.duplicate, false);
  assert.ok(created.body.data.syncedAt);

  const fetched = await api(`/api/reports/${report.id}`);
  assert.equal(fetched.response.status, 200);
  assert.equal(fetched.body.data.clientName, report.clientName);
});

test('POST /api/reports es idempotente con el mismo UUID', async () => {
  const report = sampleReport();
  const first = await api('/api/reports', {
    method: 'POST',
    body: JSON.stringify(report)
  });
  assert.equal(first.response.status, 201);

  const second = await api('/api/reports', {
    method: 'POST',
    body: JSON.stringify({ ...report, diagnosis: 'Otro texto' })
  });
  assert.equal(second.response.status, 200);
  assert.equal(second.body.meta.duplicate, true);
  assert.equal(second.body.data.diagnosis, report.diagnosis);
});

test('POST /api/reports valida campos obligatorios', async () => {
  const { response, body } = await api('/api/reports', {
    method: 'POST',
    body: JSON.stringify({ technicianName: 'A' })
  });
  assert.equal(response.status, 422);
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.ok(body.error.details.length >= 5);
});

test('POST /api/reports/sync procesa lotes e informa duplicados y rechazos', async () => {
  const first = sampleReport();
  const second = sampleReport();
  const third = sampleReport();

  const created = await api('/api/reports', {
    method: 'POST',
    body: JSON.stringify(third)
  });
  assert.equal(created.response.status, 201);

  const batch = [first, second, third, { id: 'no-es-uuid', folio: 'X' }];
  const firstSync = await api('/api/reports/sync', {
    method: 'POST',
    body: JSON.stringify({ reports: batch })
  });
  assert.equal(firstSync.response.status, 200);
  assert.deepEqual(firstSync.body.data.summary, {
    received: 4,
    created: 2,
    updated: 0,
    duplicates: 1,
    rejected: 1,
    syncedAt: firstSync.body.data.summary.syncedAt
  });

  const secondSync = await api('/api/reports/sync', {
    method: 'POST',
    body: JSON.stringify({ reports: [first, second, third] })
  });
  assert.equal(secondSync.response.status, 200);
  assert.equal(secondSync.body.data.summary.created, 0);
  assert.equal(secondSync.body.data.summary.duplicates, 3);
});

test('PUT /api/reports/:id actualiza campos y rechaza datos inválidos', async () => {
  const report = sampleReport();
  await api('/api/reports', { method: 'POST', body: JSON.stringify(report) });

  const updated = await api(`/api/reports/${report.id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'cerrado', notes: 'Cliente conforme.' })
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.data.status, 'cerrado');
  assert.equal(updated.body.data.notes, 'Cliente conforme.');
  assert.equal(updated.body.data.folio, report.folio);

  const invalid = await api(`/api/reports/${report.id}`, {
    method: 'PUT',
    body: JSON.stringify({ priority: 'inventada' })
  });
  assert.equal(invalid.response.status, 422);
});

test('POST /api/reports rechaza folio duplicado con otro UUID', async () => {
  const first = sampleReport();
  const second = sampleReport({ folio: first.folio });
  const created = await api('/api/reports', { method: 'POST', body: JSON.stringify(first) });
  assert.equal(created.response.status, 201);

  const conflict = await api('/api/reports', {
    method: 'POST',
    body: JSON.stringify(second)
  });
  assert.equal(conflict.response.status, 409);
  assert.equal(conflict.body.error.code, 'FOLIO_CONFLICT');
});

test('DELETE /api/reports/:id elimina y luego responde 404', async () => {
  const report = sampleReport();
  await api('/api/reports', { method: 'POST', body: JSON.stringify(report) });

  const deleted = await api(`/api/reports/${report.id}`, { method: 'DELETE' });
  assert.equal(deleted.response.status, 200);
  assert.equal(deleted.body.data.deleted, true);

  const missing = await api(`/api/reports/${report.id}`);
  assert.equal(missing.response.status, 404);
});

test('CORS permite el origen configurado y bloquea otros', async () => {
  const allowed = await fetch(`${baseUrl}/api/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'GET'
    }
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');

  const blocked = await fetch(`${baseUrl}/api/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://sitio-no-autorizado.example',
      'Access-Control-Request-Method': 'GET'
    }
  });
  assert.equal(blocked.status, 403);
});

test('Rutas inexistentes devuelven JSON consistente', async () => {
  const { response, body } = await api('/api/no-existe');
  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'NOT_FOUND');
});
