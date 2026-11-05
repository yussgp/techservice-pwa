export function requestLogger({ enabled = true } = {}) {
  return function logRequest(req, res, next) {
    if (!enabled || req.method === 'OPTIONS') return next();
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      console.log(
        `[${req.id?.slice(0, 8) || '-'}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs.toFixed(1)} ms)`
      );
    });
    return next();
  };
}
