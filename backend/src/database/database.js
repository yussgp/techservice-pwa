import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

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

function isLocalUrl(url) {
  return url === ':memory:' || url.startsWith('file:');
}

/**
 * Crea el cliente libSQL y aplica las migraciones pendientes.
 *
 * - Producción: URL remota de Turso (`libsql://...` o `https://...`) + token.
 * - Desarrollo/pruebas: archivo local (`file:///...`) o `:memory:`.
 *
 * Las migraciones se registran en `schema_migrations`, portable entre SQLite
 * local y Turso (no depende de `PRAGMA user_version`).
 */
export async function createDatabase({ url, authToken } = {}) {
  if (!url) {
    throw new Error('createDatabase requiere la URL de la base de datos.');
  }

  if (url.startsWith('file:')) {
    const filePath = fileURLToPath(url);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  const client = createClient({
    url,
    authToken: authToken || undefined
  });

  if (isLocalUrl(url) && url !== ':memory:') {
    // WAL y claves foráneas solo tienen sentido en el archivo local.
    await client.execute('PRAGMA journal_mode = WAL');
    await client.execute('PRAGMA foreign_keys = ON');
  }

  await migrate(client);

  return client;
}

async function migrate(client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = await client.execute('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(applied.rows.map((row) => Number(row.version)));

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    await client.executeMultiple(migration.sql);
    await client.execute({
      sql: 'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      args: [migration.version, new Date().toISOString()]
    });
  }
}
