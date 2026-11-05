import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `La ruta ${req.method} ${req.originalUrl} no existe.`
    }
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'El cuerpo de la petición no es JSON válido.' }
    });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo de la petición es demasiado grande.' }
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    });
  }

  console.error(`[${req.id || '-'}] Error no controlado:`, err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error interno en el servidor.'
    }
  });
}
