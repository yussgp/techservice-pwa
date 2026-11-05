import { db } from './db.js';
import {
  MAX_AUTO_RETRIES,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS
} from '../constants.js';
import { createUuid } from '../utils/uuid.js';
import { normalizeReportValues } from '../utils/validation.js';

const FOLIO_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function pad(value, length = 2) {
  return String(value).padStart(length, '0');
}

function randomSuffix(length = 2) {
  let suffix = '';
  for (let index = 0; index < length; index += 1) {
    suffix += FOLIO_ALPHABET[Math.floor(Math.random() * FOLIO_ALPHABET.length)];
  }
  return suffix;
}

/**
 * Folio generado en el dispositivo: TS-AAAAMMDD-HHMMSSXX.
 * No depende de Internet ni del servidor, e incluye segundos y dos caracteres
 * aleatorios para reducir colisiones entre dispositivos.
 */
export function buildFolio(date = new Date()) {
  const dateStamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const timeStamp = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `TS-${dateStamp}-${timeStamp}${randomSuffix(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export async function createLocalReport(values) {
  const normalized = normalizeReportValues(values);
  const timestamp = nowIso();
  const report = {
    id: createUuid(),
    folio: buildFolio(new Date()),
    technicianName: normalized.technicianName,
    clientName: normalized.clientName,
    clientPhone: normalized.clientPhone,
    location: normalized.location,
    serviceType: normalized.serviceType,
    equipment: normalized.equipment,
    problemDescription: normalized.problemDescription,
    diagnosis: normalized.diagnosis || '',
    workPerformed: normalized.workPerformed || '',
    materials: normalized.materials || '',
    priority: normalized.priority,
    status: normalized.status,
    notes: normalized.notes || '',
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: 'pending',
    syncError: null,
    retryCount: 0,
    lastAttemptAt: null,
    nextRetryAt: null,
    permanentError: false,
    syncedAt: null,
    serverUpdatedAt: null
  };

  await db.reports.add(report);
  return report;
}

export function getReport(id) {
  return db.reports.get(id);
}

export function listReportsLocal() {
  return db.reports.orderBy('createdAt').reverse().toArray();
}

export async function getCounts() {
  const [total, pending, synced, error] = await Promise.all([
    db.reports.count(),
    db.reports.where('syncStatus').equals('pending').count(),
    db.reports.where('syncStatus').equals('synced').count(),
    db.reports.where('syncStatus').equals('error').count()
  ]);
  return { total, pending, synced, error };
}

/**
 * Reportes que deben intentarse sincronizar.
 * En modo automático respeta backoff y no insiste con errores permanentes.
 */
export async function getSyncCandidates({ manual = false } = {}) {
  const reports = await db.reports
    .where('syncStatus')
    .anyOf('pending', 'error')
    .toArray();

  const now = Date.now();
  return reports
    .filter((report) => {
      if (manual) return true;
      if (report.permanentError) return false;
      if (report.nextRetryAt && new Date(report.nextRetryAt).getTime() > now) return false;
      return true;
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 50);
}

export async function markSyncAttempt(id, attemptedAt = nowIso()) {
  await db.reports.update(id, { lastAttemptAt: attemptedAt });
}

export async function markReportSynced(id, serverUpdatedAt) {
  const timestamp = nowIso();
  await db.reports.update(id, {
    syncStatus: 'synced',
    syncedAt: timestamp,
    serverUpdatedAt: serverUpdatedAt || timestamp,
    syncError: null,
    retryCount: 0,
    lastAttemptAt: timestamp,
    nextRetryAt: null,
    permanentError: false
  });
}

export async function markReportTransientFailure(id, message) {
  const report = await db.reports.get(id);
  if (!report) return;

  const retryCount = (report.retryCount || 0) + 1;
  const permanent = retryCount >= MAX_AUTO_RETRIES;
  const delay = Math.min(
    RETRY_BASE_DELAY_MS * 2 ** Math.max(0, retryCount - 1),
    RETRY_MAX_DELAY_MS
  );

  await db.reports.update(id, {
    syncStatus: permanent ? 'error' : 'pending',
    syncError: message,
    retryCount,
    lastAttemptAt: nowIso(),
    nextRetryAt: permanent ? null : new Date(Date.now() + delay).toISOString(),
    permanentError: permanent
  });
}

export async function markReportRejected(id, message) {
  const report = await db.reports.get(id);
  if (!report) return;
  await db.reports.update(id, {
    syncStatus: 'error',
    syncError: message,
    retryCount: (report.retryCount || 0) + 1,
    lastAttemptAt: nowIso(),
    nextRetryAt: null,
    permanentError: true
  });
}

/**
 * Fuerza a Dexie a observar cambios hechos por el Service Worker (que escribe
 * directamente en IndexedDB) para que useLiveQuery refresque la interfaz.
 */
export async function touchReportsSynced(ids = []) {
  if (ids.length === 0) return;
  await db.reports.where('id').anyOf(ids).modify((report) => {
    report.syncStatus = 'synced';
    report.permanentError = false;
    report.syncError = null;
  });
}

export async function touchReportsFailed(ids = []) {
  if (ids.length === 0) return;
  await db.reports.where('id').anyOf(ids).modify((report) => {
    report.syncStatus = 'error';
    report.permanentError = true;
  });
}

export async function deleteReportLocal(id) {
  await db.reports.delete(id);
}

export async function clearLocalReports() {
  await db.reports.clear();
}

export async function exportLocalReports() {
  const reports = await listReportsLocal();
  return {
    app: 'TechService PWA',
    exportedAt: nowIso(),
    count: reports.length,
    reports
  };
}

export function toApiPayload(report) {
  return {
    id: report.id,
    folio: report.folio,
    technicianName: report.technicianName,
    clientName: report.clientName,
    clientPhone: report.clientPhone,
    location: report.location,
    serviceType: report.serviceType,
    equipment: report.equipment,
    problemDescription: report.problemDescription,
    diagnosis: report.diagnosis || '',
    workPerformed: report.workPerformed || '',
    materials: report.materials || '',
    priority: report.priority,
    status: report.status,
    notes: report.notes || '',
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
}
