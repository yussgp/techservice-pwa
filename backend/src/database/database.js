import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        folio TEXT NOT NULL UNIQUE,
        technician_name TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        location TEXT NOT NULL,
        service_type TEXT NOT NULL CHECK (service_type IN ('preventivo','correctivo','instalacion','reparacion','inspeccion')),
        equipment TEXT NOT NULL,
        problem_description TEXT NOT NULL,
        diagnosis TEXT NOT NULL DEFAULT '',
        work_performed TEXT NOT NULL DEFAULT '',
        materials TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL CHECK (priority IN ('baja','media','alta','urgente')),
        status TEXT NOT NULL CHECK (status IN ('abierto','en_proceso','resuelto','cerrado')),
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        server_updated_at TEXT NOT NULL,
        synced_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reports_sync_client ON reports (client_name);
      CREATE INDEX IF NOT EXISTS idx_reports_technician ON reports (technician_name);
      CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports (priority);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
      CREATE INDEX IF NOT EXISTS idx_reports_service_type ON reports (service_type);
    `
  }
];

/**
 * Abre (o crea) la base SQLite, asegura el directorio y aplica migraciones.
 * La ruta se inyecta para poder probar con bases temporales.
 */
export function createDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  const currentVersion = db.pragma('user_version', { simple: true });
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      const apply = db.transaction(() => {
        db.exec(migration.sql);
        db.pragma(`user_version = ${migration.version}`);
      });
      apply();
    }
  }

  return db;
}
