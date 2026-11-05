import crypto from 'node:crypto';
import { ApiError } from '../utils/ApiError.js';
import {
  sanitizeReport,
  validateCompleteReport,
  isUuid
} from '../validation/reportValidation.js';

const FOLIO_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_SYNC_BATCH = 200;

function localDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function randomFolioCode(length = 4) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += FOLIO_ALPHABET[bytes[index] % FOLIO_ALPHABET.length];
  }
  return code;
}

/**
 * Servicio con la lógica de negocio de reportes: validación, idempotencia,
 * generación de folios y sincronización por lotes.
 */
export function createReportService({ db, repo }) {
  const now = () => new Date().toISOString();

  function generateFolio() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const folio = `TS-${localDateStamp()}-${randomFolioCode(4)}`;
      if (!repo.findByFolio(folio)) return folio;
    }
    throw new ApiError(500, 'FOLIO_GENERATION_FAILED', 'No fue posible generar un folio único.');
  }

  function list(query) {
    const limit = Math.min(Math.max(Number.parseInt(query.limit ?? '100', 10) || 100, 1), 500);
    const offset = Math.max(Number.parseInt(query.offset ?? '0', 10) || 0, 0);
    const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';
    const result = repo.list({
      search: search || undefined,
      serviceType: query.serviceType || undefined,
      priority: query.priority || undefined,
      status: query.status || undefined,
      limit,
      offset
    });
    return { ...result, limit, offset };
  }

  function getById(id) {
    if (!isUuid(id)) {
      throw new ApiError(400, 'INVALID_ID', 'El identificador debe ser un UUID válido.');
    }
    const report = repo.findById(id);
    if (!report) {
      throw new ApiError(404, 'REPORT_NOT_FOUND', 'El reporte solicitado no existe.');
    }
    return report;
  }

  function create(body) {
    const { value, errors } = sanitizeReport(body, { partial: false });
    if (errors.length > 0) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Los datos del reporte no son válidos.', errors);
    }

    value.id = value.id || crypto.randomUUID();
    value.folio = value.folio || generateFolio();
    value.createdAt = value.createdAt || now();
    value.updatedAt = value.updatedAt || value.createdAt;

    // Idempotencia: el mismo UUID no crea un segundo registro.
    const existing = repo.findById(value.id);
    if (existing) {
      return { report: existing, created: false, duplicate: true };
    }

    if (repo.findByFolio(value.folio)) {
      throw new ApiError(
        409,
        'FOLIO_CONFLICT',
        'Ya existe un reporte con ese folio pero con otro identificador.'
      );
    }

    const report = repo.insert(value);
    return { report, created: true, duplicate: false };
  }

  function update(id, body) {
    const existing = getById(id);
    const { value, errors } = sanitizeReport(body, { partial: true });
    if (errors.length > 0) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Los datos del reporte no son válidos.', errors);
    }

    if (value.id && value.id !== existing.id) {
      throw new ApiError(400, 'IMMUTABLE_FIELD', 'El identificador del reporte no se puede modificar.');
    }
    if (value.folio && value.folio !== existing.folio) {
      throw new ApiError(400, 'IMMUTABLE_FIELD', 'El folio del reporte no se puede modificar.');
    }
    if (Object.keys(value).length === 0) {
      throw new ApiError(400, 'NO_FIELDS', 'Debe enviar al menos un campo para actualizar.');
    }

    const merged = {
      ...existing,
      ...value,
      id: existing.id,
      folio: existing.folio,
      createdAt: existing.createdAt,
      updatedAt: value.updatedAt || now()
    };

    const validated = validateCompleteReport(merged);
    if (validated.errors.length > 0) {
      throw new ApiError(
        422,
        'VALIDATION_ERROR',
        'Los datos del reporte no son válidos.',
        validated.errors
      );
    }
    validated.value.id = existing.id;
    validated.value.folio = existing.folio;
    validated.value.createdAt = existing.createdAt;

    return repo.update(validated.value);
  }

  function remove(id) {
    getById(id);
    repo.remove(id);
    return { id, deleted: true };
  }

  /**
   * Sincroniza un lote de reportes de forma atómica y idempotente.
   * Cada item se procesa por separado para devolver un resultado detallado.
   */
  function sync(reports) {
    if (!Array.isArray(reports) || reports.length === 0) {
      throw new ApiError(
        400,
        'INVALID_BATCH',
        'El campo "reports" debe ser un arreglo con al menos un reporte.'
      );
    }
    if (reports.length > MAX_SYNC_BATCH) {
      throw new ApiError(
        400,
        'BATCH_TOO_LARGE',
        `El lote no puede superar los ${MAX_SYNC_BATCH} reportes.`
      );
    }

    const results = [];

    const run = db.transaction(() => {
      for (const raw of reports) {
        const { value, errors } = sanitizeReport(raw, {
          partial: false,
          requireIdentity: true
        });

        if (errors.length > 0) {
          results.push({
            id: isUuid(raw?.id) ? raw.id : null,
            folio: typeof raw?.folio === 'string' ? raw.folio : null,
            status: 'rejected',
            error: {
              code: 'VALIDATION_ERROR',
              message: 'El reporte no es válido.',
              details: errors
            }
          });
          continue;
        }

        const existing = repo.findById(value.id);

        if (existing) {
          const incomingUpdatedAt = value.updatedAt ? new Date(value.updatedAt) : null;
          const existingUpdatedAt = new Date(existing.updatedAt);
          const isNewer = incomingUpdatedAt && incomingUpdatedAt > existingUpdatedAt;

          if (!isNewer) {
            results.push({
              id: existing.id,
              folio: existing.folio,
              status: 'duplicate',
              serverUpdatedAt: existing.serverUpdatedAt
            });
            continue;
          }

          const merged = {
            ...existing,
            ...value,
            id: existing.id,
            folio: existing.folio,
            createdAt: existing.createdAt,
            updatedAt: value.updatedAt
          };
          const saved = repo.update(merged);
          results.push({
            id: saved.id,
            folio: saved.folio,
            status: 'updated',
            serverUpdatedAt: saved.serverUpdatedAt
          });
          continue;
        }

        const folioOwner = repo.findByFolio(value.folio);
        if (folioOwner) {
          results.push({
            id: value.id,
            folio: value.folio,
            status: 'rejected',
            error: {
              code: 'FOLIO_CONFLICT',
              message: 'El folio ya pertenece a otro reporte.'
            }
          });
          continue;
        }

        value.createdAt = value.createdAt || now();
        value.updatedAt = value.updatedAt || value.createdAt;
        const saved = repo.insert(value);
        results.push({
          id: saved.id,
          folio: saved.folio,
          status: 'created',
          serverUpdatedAt: saved.serverUpdatedAt
        });
      }
    });

    run();

    const summary = {
      received: reports.length,
      created: results.filter((item) => item.status === 'created').length,
      updated: results.filter((item) => item.status === 'updated').length,
      duplicates: results.filter((item) => item.status === 'duplicate').length,
      rejected: results.filter((item) => item.status === 'rejected').length,
      syncedAt: now()
    };

    return { summary, results };
  }

  return { list, getById, create, update, remove, sync };
}