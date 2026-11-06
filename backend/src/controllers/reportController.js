import { config } from '../config.js';
import {
  SERVICE_TYPES,
  PRIORITIES,
  REPORT_STATUSES
} from '../validation/reportValidation.js';
import { ApiError } from '../utils/ApiError.js';

function sendData(res, data, status = 200, meta = undefined) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * Express 4 no captura rechazos de promesas. Este wrapper convierte cualquier
 * error asíncrono en `next(error)` para que lo procese el manejador central.
 */
function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createReportController({ service, db }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { serviceType, priority, status } = req.query;
      if (serviceType && !SERVICE_TYPES.includes(serviceType)) {
        throw new ApiError(400, 'INVALID_FILTER', 'Filtro serviceType no válido.');
      }
      if (priority && !PRIORITIES.includes(priority)) {
        throw new ApiError(400, 'INVALID_FILTER', 'Filtro priority no válido.');
      }
      if (status && !REPORT_STATUSES.includes(status)) {
        throw new ApiError(400, 'INVALID_FILTER', 'Filtro status no válido.');
      }

      const result = await service.list(req.query);
      return sendData(res, result.items, 200, {
        total: result.total,
        count: result.items.length,
        limit: result.limit,
        offset: result.offset
      });
    }),

    get: asyncHandler(async (req, res) => {
      return sendData(res, await service.getById(req.params.id));
    }),

    create: asyncHandler(async (req, res) => {
      const result = await service.create(req.body);
      if (result.duplicate) {
        return res.status(200).json({
          success: true,
          data: result.report,
          meta: { created: false, duplicate: true }
        });
      }
      return res.status(201).json({
        success: true,
        data: result.report,
        meta: { created: true, duplicate: false }
      });
    }),

    update: asyncHandler(async (req, res) => {
      return sendData(res, await service.update(req.params.id, req.body));
    }),

    remove: asyncHandler(async (req, res) => {
      return sendData(res, await service.remove(req.params.id));
    }),

    sync: asyncHandler(async (req, res) => {
      const result = await service.sync(req.body?.reports);
      return sendData(res, result);
    }),

    health: asyncHandler(async (req, res) => {
      // Comprueba de verdad la base (local o Turso), no solo el proceso HTTP.
      await db.execute('SELECT 1');

      return sendData(res, {
        status: 'ok',
        service: 'techservice-api',
        version: config.appVersion,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        database: 'ok',
        databaseEngine: config.tursoDatabaseUrl ? 'turso' : 'sqlite-local'
      });
    })
  };
}
