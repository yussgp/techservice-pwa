import Dexie from 'dexie';

/**
 * Base de datos local (IndexedDB) gestionada con Dexie.
 * IMPORTANTE: el esquema debe coincidir con el que usa sw.js para la
 * sincronización en segundo plano (nombre de BD y store "reports").
 */
export const db = new Dexie('techservice-db');

db.version(1).stores({
  reports:
    'id, folio, syncStatus, createdAt, clientName, technicianName, serviceType, priority, status',
  meta: 'key'
});

export const REPORTS_STORE = 'reports';
