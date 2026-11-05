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

export function createReportController({ service }) {
  return {
    list(req, res) {
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

      const result = service.list(req.query);
      return sendData(res, result.items, 200, {
        total: result.total,
        count: result.items.length,
        limit: result.limit,
        offset: result.offset
      });
    },

    get(req, res) {
      return sendData(res, service.getById(req.params.id));
    },

    create(req, res) {
      const result = service.create(req.body);
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
    },

    update(req, res) {
      return sendData(res, service.update(req.params.id, req.body));
    },

    remove(req, res) {
      return sendData(res, service.remove(req.params.id));
    },

    sync(req, res) {
      const result = service.sync(req.body?.reports);
      return sendData(res, result);
    },

    health(req, res) {
      return sendData(res, {
        status: 'ok',
        service: 'techservice-api',
        version: config.appVersion,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        database: 'ok'
      });
    }
  };
}
