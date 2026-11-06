import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { ApiError } from './utils/ApiError.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createReportRepository } from './database/reportRepository.js';
import { createReportService } from './services/reportService.js';
import { createReportController } from './controllers/reportController.js';
import { createReportRoutes } from './routes/reportRoutes.js';
import { createHealthRoutes } from './routes/healthRoutes.js';

function buildCorsOptions({ corsOrigins, nodeEnv }) {
  const allowAll = corsOrigins === '*';
  const allowed = allowAll ? [] : corsOrigins;

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl, Postman, pruebas server-side
      if (allowAll) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      return callback(
        new ApiError(
          403,
          'CORS_NOT_ALLOWED',
          `El origen ${origin} no está autorizado. Configura CORS_ORIGINS en el backend.`
        )
      );
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
    optionsSuccessStatus: 204
  };
}

/**
 * Fábrica de la aplicación Express. Recibe la base de datos ya abierta para
 * facilitar pruebas con SQLite en memoria o temporal.
 */
export function createApp({ db, corsOrigins = ['http://localhost:5173'], nodeEnv = 'development' }) {
  const app = express();
  const repo = createReportRepository(db);
  const service = createReportService({ db, repo });
  const controller = createReportController({ service, db });

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.use(cors(buildCorsOptions({ corsOrigins, nodeEnv })));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger({ enabled: process.env.LOG_REQUESTS !== 'false' }));

  app.use('/api/health', createHealthRoutes({ controller }));
  app.use('/api/reports', createReportRoutes({ controller }));

  app.get('/api', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'TechService API',
        version: '1.0.0',
        endpoints: {
          health: 'GET /api/health',
          list: 'GET /api/reports',
          detail: 'GET /api/reports/:id',
          create: 'POST /api/reports',
          update: 'PUT /api/reports/:id',
          delete: 'DELETE /api/reports/:id',
          sync: 'POST /api/reports/sync'
        }
      }
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
