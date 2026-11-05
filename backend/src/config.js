import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, '..');

// Carga .env del directorio backend sin depender del cwd desde donde se ejecute.
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

function parseOrigins(value) {
  if (!value || value.trim() === '') {
    return [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173'
    ];
  }
  if (value.trim() === '*') return '*';
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  dbPath: path.isAbsolute(process.env.DB_PATH || '')
    ? process.env.DB_PATH
    : path.join(rootDir, process.env.DB_PATH || 'data/techservice.sqlite'),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  appVersion: process.env.APP_VERSION || '1.0.0',
  logRequests: process.env.LOG_REQUESTS !== 'false'
};
