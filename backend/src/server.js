import { config } from './config.js';
import { createDatabase } from './database/database.js';
import { createApp } from './app.js';

const db = createDatabase(config.dbPath);
const app = createApp({
  db,
  corsOrigins: config.corsOrigins,
  nodeEnv: config.nodeEnv
});

const server = app.listen(config.port, config.host, () => {
  console.log('');
  console.log('  TechService API');
  console.log(`  Entorno:    ${config.nodeEnv}`);
  console.log(`  Escuchando: http://localhost:${config.port}`);
  console.log(`  Health:     http://localhost:${config.port}/api/health`);
  console.log(`  SQLite:     ${config.dbPath}`);
  console.log(`  CORS:       ${Array.isArray(config.corsOrigins) ? config.corsOrigins.join(', ') : config.corsOrigins}`);
  console.log('');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${config.port} ya está en uso. Cambia PORT en backend/.env.`);
  } else {
    console.error('No se pudo iniciar el servidor:', error);
  }
  process.exit(1);
});

function shutdown(signal) {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    db.close();
    console.log('Servidor y base de datos cerrados.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
