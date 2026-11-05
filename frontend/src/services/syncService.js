import { LAST_SYNC_STORAGE_KEY } from '../constants.js';
import {
  getSyncCandidates,
  markReportRejected,
  markReportSynced,
  markReportTransientFailure,
  markSyncAttempt,
  toApiPayload
} from '../database/reportRepository.js';
import { ApiError, getHealth, syncReports } from './api.js';

export const LAST_SYNC_EVENT = 'techservice:last-sync';

let inFlight = null;

export function getLastSyncAt() {
  try {
    return localStorage.getItem(LAST_SYNC_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function recordLastSync(timestamp = new Date().toISOString()) {
  try {
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, timestamp);
    window.dispatchEvent(new CustomEvent(LAST_SYNC_EVENT, { detail: timestamp }));
  } catch {
    // localStorage puede no estar disponible en modo privado restrictivo.
  }
  return timestamp;
}

export function clearLastSync() {
  try {
    localStorage.removeItem(LAST_SYNC_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(LAST_SYNC_EVENT, { detail: null }));
  } catch {
    // Ignorar.
  }
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

function isTransient(error) {
  if (!(error instanceof ApiError)) return true;
  if (error.status === 0) return true; // red / timeout
  return error.status >= 500 || error.status === 429;
}

function formatError(error) {
  if (!error) return 'Error desconocido.';
  if (Array.isArray(error.details) && error.details.length > 0) {
    const fields = error.details
      .slice(0, 4)
      .map((detail) => detail.field || detail.message)
      .filter(Boolean)
      .join(', ');
    return fields ? `${error.message} (${fields})` : error.message;
  }
  return error.message || 'Error de sincronización.';
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function emptyResult(overrides = {}) {
  return {
    offline: false,
    noPending: false,
    attempted: 0,
    synced: 0,
    failed: 0,
    duplicates: 0,
    updated: 0,
    errorMessages: [],
    lastSyncAt: getLastSyncAt(),
    ...overrides
  };
}

/**
 * Sincroniza los reportes locales pendientes con POST /api/reports/sync.
 * - Idempotente: el backend deduplica por UUID.
 * - Reintentos con backoff exponencial para fallos transitorios.
 * - Errores de validación se marcan como permanentes y se muestran al usuario.
 * - Nunca envía reportes ya sincronizados.
 */
export async function syncPendingReports({ manual = false } = {}) {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!isOnline()) {
      return emptyResult({ offline: true });
    }

    const candidates = await getSyncCandidates({ manual });

    if (candidates.length === 0) {
      if (manual) {
        try {
          await getHealth();
          recordLastSync();
          return emptyResult({ noPending: true, lastSyncAt: getLastSyncAt() });
        } catch (error) {
          return emptyResult({ noPending: true, healthError: formatError(error) });
        }
      }
      return emptyResult({ noPending: true });
    }

    const result = emptyResult({ attempted: candidates.length });

    for (const batch of chunk(candidates, 50)) {
      const attemptedAt = new Date().toISOString();
      await Promise.all(batch.map((report) => markSyncAttempt(report.id, attemptedAt)));

      let response;
      try {
        response = await syncReports(batch.map(toApiPayload));
      } catch (error) {
        const message = formatError(error);
        const transient = isTransient(error);

        for (const report of batch) {
          if (transient) {
            await markReportTransientFailure(report.id, message);
          } else {
            await markReportRejected(report.id, message);
          }
        }

        result.failed += batch.length;
        result.errorMessages.push(message);
        // Si el servidor no está disponible se detiene el lote completo;
        // el backoff evita martillar la API.
        break;
      }

      const byId = new Map(
        (Array.isArray(response?.results) ? response.results : []).map((item) => [
          item.id,
          item
        ])
      );

      for (const report of batch) {
        const item = byId.get(report.id);

        if (!item) {
          await markReportTransientFailure(
            report.id,
            'El servidor no devolvió el resultado de este reporte.'
          );
          result.failed += 1;
          continue;
        }

        if (['created', 'updated', 'duplicate'].includes(item.status)) {
          await markReportSynced(report.id, item.serverUpdatedAt);
          result.synced += 1;
          if (item.status === 'duplicate') result.duplicates += 1;
          if (item.status === 'updated') result.updated += 1;
          continue;
        }

        const message = formatError(item.error);
        await markReportRejected(report.id, message);
        result.failed += 1;
        result.errorMessages.push(`${report.folio}: ${message}`);
      }
    }

    if (result.synced > 0) {
      recordLastSync();
    }
    result.lastSyncAt = getLastSyncAt();
    return result;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
