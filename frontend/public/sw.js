/* ============================================================
   TechService PWA - Service Worker
   Estrategias:
   - Precache del app shell en install (build de producción inyecta assets).
   - Network First con fallback para navegación.
   - Cache First para assets estáticos con hash.
   - Stale While Revalidate para iconos e interfaz.
   - La API (/api) NO se intercepta: la app gestiona sus fallos y su cola.
   ============================================================ */

const BUILD_ID = 'dev';
const SHELL_CACHE = `techservice-shell-${BUILD_ID}`;
const RUNTIME_CACHE = `techservice-runtime-${BUILD_ID}`;
const IMAGE_CACHE = `techservice-images-${BUILD_ID}`;
const CONFIG_CACHE = 'techservice-config';
const CONFIG_URL = '/__techservice_config__';
const SYNC_TAG = 'techservice-report-sync';
const DB_NAME = 'techservice-db';
const REPORTS_STORE = 'reports';

const BASE_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png'
];

// Vite inyecta aquí los archivos con hash de /assets en tiempo de build.
const BUILD_PRECACHE = [/* INJECT:PRECACHE */];

const PRECACHE_URLS = [...new Set([...BASE_PRECACHE, ...BUILD_PRECACHE])];

const OFFLINE_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TechService · Sin conexión</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px;
    font-family: 'Segoe UI', system-ui, sans-serif; background:#F8FAFC; color:#1E293B; }
  .card { max-width:440px; width:100%; background:#fff; border:1px solid #E2E8F0; border-radius:20px;
    padding:36px 28px; text-align:center; box-shadow:0 20px 45px -25px rgba(23,50,77,.35); }
  .mark { width:64px; height:64px; margin:0 auto 18px; border-radius:18px; background:#2563EB;
    color:#fff; display:grid; place-items:center; font-weight:800; font-size:20px; letter-spacing:.5px; }
  h1 { font-size:22px; margin:0 0 8px; color:#17324D; }
  p { margin:0 0 22px; line-height:1.6; color:#475569; font-size:15px; }
  button { border:0; border-radius:10px; background:#2563EB; color:#fff; font-weight:600;
    padding:12px 20px; font-size:15px; cursor:pointer; }
  small { display:block; margin-top:16px; color:#94A3B8; font-size:12px; }
</style>
</head>
<body>
  <div class="card">
    <div class="mark">TS</div>
    <h1>Sin conexión</h1>
    <p>No hay una copia de la interfaz en caché todavía. Conéctate a Internet y abre TechService al menos una vez para poder trabajar offline.</p>
    <button onclick="location.reload()">Reintentar</button>
    <small>Los reportes ya guardados en este dispositivo no se pierden.</small>
  </div>
</body>
</html>`;

/* ----------------------------- install ----------------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
      await self.skipWaiting();
    })()
  );
});

/* ----------------------------- activate ----------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const keep = new Set([SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE, CONFIG_CACHE]);
      await Promise.all(
        keys
          .filter((key) => key.startsWith('techservice-') && !keep.has(key))
          .map((key) => caches.delete(key))
      );

      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          /* Algunos navegadores no permiten navigation preload. */
        }
      }

      await self.clients.claim();
    })()
  );
});

/* ------------------------- utilidades de red ------------------------- */
async function fetchWithTimeout(input, timeoutMs = 12000, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isCacheable(response) {
  return Boolean(response && response.ok && response.status === 200);
}

async function cacheFirst(request) {
  // Los assets con hash se precargan en la caché del shell durante install.
  // Se consulta también la caché de runtime por si un asset no estaba en la
  // lista inyectada (por ejemplo, un chunk generado después del build).
  const shell = await caches.open(SHELL_CACHE);
  const cachedShell = await shell.match(request);
  if (cachedShell) return cachedShell;

  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName = RUNTIME_CACHE) {
  const cache = await caches.open(cacheName);
  const cached = (await cache.match(request)) || (await caches.match(request));

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (isCacheable(response)) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Actualiza en segundo plano sin bloquear la respuesta.
    networkPromise.catch(() => {});
    return cached;
  }

  const networkResponse = await networkPromise;
  return networkResponse || Response.error();
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const networkResponse = await fetchWithTimeout(request, 5000);
    // Sólo se cachean respuestas correctas. Un 5xx de un proxy o servidor caído
    // debe caer al app shell en caché, nunca mostrarse como si fuera la app.
    if (isCacheable(networkResponse)) {
      await cache.put('/index.html', networkResponse.clone());
      return networkResponse;
    }
  } catch {
    // Sin red: se usa la copia local.
  }

  const cached =
    (await cache.match('/index.html')) ||
    (await cache.match('/')) ||
    (await caches.match('/index.html'));
  if (cached) return cached;

  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/* ------------------------------- fetch ------------------------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (!url.protocol.startsWith('http')) return;

  // Las llamadas a la API siempre van a la red y las gestiona la aplicación.
  if (url.pathname.startsWith('/api/') || url.pathname === '/api') return;

  // No interceptar orígenes externos (por ejemplo una API configurada en otro dominio).
  if (url.origin !== self.location.origin) return;

  // El propio service worker y recursos internos nunca se cachean.
  if (url.pathname === '/sw.js' || url.pathname.startsWith('/__')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    ['script', 'style', 'font'].includes(request.destination);

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  const isImage =
    request.destination === 'image' || url.pathname.startsWith('/icons/');

  if (isImage) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

/* --------------------- configuración de la API --------------------- */
function absoluteApiBase(value) {
  try {
    const url = new URL(value || '/api', self.location.origin);
    return url.href.replace(/\/+$/, '');
  } catch {
    return `${self.location.origin}/api`;
  }
}

async function saveApiBase(apiBase) {
  const cache = await caches.open(CONFIG_CACHE);
  const request = new Request(new URL(CONFIG_URL, self.location.origin));
  const body = JSON.stringify({
    apiBase: absoluteApiBase(apiBase),
    updatedAt: new Date().toISOString()
  });
  await cache.put(
    request,
    new Response(body, { headers: { 'Content-Type': 'application/json' } })
  );
}

async function readApiBase() {
  try {
    const cache = await caches.open(CONFIG_CACHE);
    const response = await cache.match(new URL(CONFIG_URL, self.location.origin));
    if (!response) return `${self.location.origin}/api`;
    const data = await response.json();
    return absoluteApiBase(data.apiBase);
  } catch {
    return `${self.location.origin}/api`;
  }
}

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'SET_API_BASE') {
    event.waitUntil(
      saveApiBase(data.apiBase).then(() => {
        event.source?.postMessage({ type: 'SW_CONFIG_SAVED', apiBase: data.apiBase });
      })
    );
  }

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'PING') {
    event.source?.postMessage({ type: 'SW_PONG', buildId: BUILD_ID });
  }
});

/* ------------------- Background Sync (progresivo) ------------------- */
function toApiPayload(report) {
  return {
    id: report.id,
    folio: report.folio,
    technicianName: report.technicianName,
    clientName: report.clientName,
    clientPhone: report.clientPhone,
    location: report.location,
    serviceType: report.serviceType,
    equipment: report.equipment,
    problemDescription: report.problemDescription,
    diagnosis: report.diagnosis || '',
    workPerformed: report.workPerformed || '',
    materials: report.materials || '',
    priority: report.priority,
    status: report.status,
    notes: report.notes || '',
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
}

function openExistingDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onupgradeneeded = () => {
      // La base no existía: se cancela para no crearla con un esquema distinto
      // al de Dexie. La app la creará al guardar el primer reporte.
      request.transaction?.abort();
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB bloqueada por otra pestaña.'));
  });
}

function readPendingReports(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPORTS_STORE, 'readonly');
    const store = transaction.objectStore(REPORTS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const reports = (request.result || [])
        .filter(
          (report) =>
            ['pending', 'error'].includes(report.syncStatus) &&
            !report.permanentError
        )
        .slice(0, 50);
      resolve(reports);
    };
    request.onerror = () => reject(request.error);
  });
}

function writeSyncResults(db, results, syncedAt) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPORTS_STORE, 'readwrite');
    const store = transaction.objectStore(REPORTS_STORE);

    for (const result of results) {
      if (!result?.id) continue;
      const getRequest = store.get(result.id);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) return;

        if (['created', 'updated', 'duplicate'].includes(result.status)) {
          record.syncStatus = 'synced';
          record.syncedAt = syncedAt;
          record.serverUpdatedAt = result.serverUpdatedAt || syncedAt;
          record.syncError = null;
          record.retryCount = 0;
          record.nextRetryAt = null;
          record.permanentError = false;
          record.lastAttemptAt = syncedAt;
        } else if (result.status === 'rejected') {
          record.syncStatus = 'error';
          record.syncError = result.error?.message || 'El servidor rechazó el reporte.';
          record.permanentError = true;
          record.retryCount = (record.retryCount || 0) + 1;
          record.lastAttemptAt = syncedAt;
          record.nextRetryAt = null;
        }

        store.put(record);
      };
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Transacción abortada.'));
  });
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  for (const client of clients) client.postMessage(message);
}

async function runBackgroundSync() {
  try {
    if (!self.indexedDB || typeof indexedDB.databases !== 'function') {
      await notifyClients({
        type: 'BACKGROUND_SYNC_UNAVAILABLE',
        reason: 'IndexedDB.databases no está disponible en este navegador.'
      });
      return;
    }

    const databases = await indexedDB.databases();
    if (!databases.some((database) => database.name === DB_NAME)) {
      await notifyClients({ type: 'BACKGROUND_SYNC_EMPTY' });
      return;
    }

    const db = await openExistingDb();
    if (!db.objectStoreNames.contains(REPORTS_STORE)) {
      db.close();
      await notifyClients({ type: 'BACKGROUND_SYNC_EMPTY' });
      return;
    }

    const pending = await readPendingReports(db);
    if (pending.length === 0) {
      db.close();
      await notifyClients({ type: 'BACKGROUND_SYNC_EMPTY' });
      return;
    }

    const apiBase = await readApiBase();
    let response;
    try {
      response = await fetchWithTimeout(`${apiBase}/reports/sync`, 15000, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ reports: pending.map(toApiPayload) })
      });
    } catch {      db.close();
      await notifyClients({
        type: 'BACKGROUND_SYNC_FAILED',
        message: 'No fue posible conectar con el servidor en segundo plano.'
      });
      return;
    }

    if (!response.ok) {
      db.close();
      await notifyClients({
        type: 'BACKGROUND_SYNC_FAILED',
        message: `El servidor respondió con estado ${response.status}.`
      });
      return;
    }

    const payload = await response.json();
    const results = payload?.data?.results || [];
    const syncedAt = new Date().toISOString();
    await writeSyncResults(db, results, syncedAt);
    db.close();

    const syncedIds = results
      .filter((result) => ['created', 'updated', 'duplicate'].includes(result.status))
      .map((result) => result.id);
    const failedIds = results
      .filter((result) => result.status === 'rejected')
      .map((result) => result.id);

    await notifyClients({
      type: 'BACKGROUND_SYNC_COMPLETE',
      syncedIds,
      failedIds,
      summary: payload?.data?.summary || null,
      syncedAt
    });
  } catch (error) {
    await notifyClients({
      type: 'BACKGROUND_SYNC_FAILED',
      message: error?.message || 'Error inesperado durante la sincronización en segundo plano.'
    });
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(runBackgroundSync());
});
