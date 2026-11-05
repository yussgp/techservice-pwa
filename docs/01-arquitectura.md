# 01 · Arquitectura del sistema

**Proyecto:** TechService PWA  
**Tipo:** Aplicación web progresiva full stack con soporte offline y sincronización  
**Versión documentada:** 1.0.0  
**Fecha:** 5 de noviembre de 2026

---

## 1. Resumen ejecutivo

TechService PWA es una aplicación para que personal técnico registre visitas de servicio en campo. Su restricción de diseño principal es que **debe seguir operando sin conexión**: el reporte se escribe primero en el dispositivo y se envía después al servidor. La aplicación no bloquea el flujo de captura esperando a la red.

La solución se compone de:

- Un **cliente SPA** construido con React y Vite, instalable como PWA.
- Una **capa de persistencia local** en IndexedDB mediante Dexie.
- Un **Service Worker propio** que cachea el app shell y los assets.
- Una **API REST** en Express con validación y reglas de idempotencia.
- Una **base de datos SQLite** persistente en el servidor.
- Un **motor de sincronización** en el cliente que reintenta y evita duplicados.

La arquitectura prioriza tres propiedades:

1. **Disponibilidad local:** la captura funciona aunque la API esté caída.
2. **Consistencia eventual:** el servidor recibe los reportes cuando hay red.
3. **Idempotencia:** reintentar el envío no genera duplicados.

---

## 2. Objetivos y requisitos arquitectónicos

| Requisito | Decisión arquitectónica |
| --- | --- |
| Funcionar sin Internet | Persistencia en IndexedDB + Service Worker con app shell precacheado. |
| No perder reportes | Guardado local antes de cualquier llamada de red. |
| Sincronización automática | Disparadores por inicio, evento `online`, visibilidad, intervalo de 60 s y botón manual. |
| Evitar duplicados | UUID generado en el cliente + deduplicación en el servidor. |
| Reintentos seguros | Backoff exponencial y marca de error permanente para rechazos de validación. |
| PWA instalable | Manifest, iconos 192/512/maskable, `display: standalone`, HTTPS/localhost. |
| API consistente | Envelope `{ success, data, meta }` y errores `{ success:false, error:{...} }`. |
| Operación sencilla | SQLite con WAL, migraciones y despliegue en una sola instancia. |
| Uso académico | Documentación, pruebas automatizadas y trazabilidad de decisiones. |

### Fuera de alcance

- Autenticación y autorización de usuarios.
- Multiusuario con roles.
- Adjuntos fotográficos.
- Edición colaborativa en tiempo real.
- Escalado horizontal con múltiples réplicas de escritura.

Estas exclusiones son conscientes y se retoman en la sección 12.

---

## 3. Vista general

```text
┌──────────────────────────────────────────────────────────────────┐
│                         NAVEGADOR / DISPOSITIVO                  │
│                                                                  │
│  React 19 + React Router 7                                       │
│  ┌───────────────┐   ┌──────────────────┐   ┌────────────────┐   │
│  │  Páginas UI   │──▶│  SyncContext     │──▶│  syncService   │   │
│  │  Dashboard    │   │  (orquestador)   │   │  (cola/retry)  │   │
│  │  Historial    │   └────────┬─────────┘   └───────┬────────┘   │
│  │  Alta/Detalle │            │                     │            │
│  │  Ajustes      │            ▼                     ▼            │
│  └───────────────┘   ┌──────────────────┐   ┌────────────────┐   │
│                      │  Dexie / IDB     │   │  fetch /api    │   │
│                      │  store: reports  │   └───────┬────────┘   │
│                      └──────────────────┘           │            │
│  Service Worker: shell + assets + posible sync BG   │            │
└─────────────────────────────────────────────────────┼────────────┘
                                                      │ HTTPS/JSON
                                                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                         SERVIDOR NODE                            │
│  Express 4                                                       │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  Routes    │─▶│ Controllers │─▶│  Service    │─▶│Repository │ │
│  │ /api/...   │  │  HTTP       │  │  negocio    │  │  SQL      │ │
│  └────────────┘  └─────────────┘  └─────────────┘  └─────┬─────┘ │
│                                                          ▼       │
│                                                   SQLite (WAL)   │
└──────────────────────────────────────────────────────────────────┘
```

### Flujo de una petición HTTP

1. Express asigna un `X-Request-Id`, cabeceras de seguridad y aplica CORS.
2. `express.json` limita el cuerpo a 1 MB.
3. El router selecciona el controlador.
4. El controlador valida filtros de consulta y delega en el servicio.
5. El servicio valida/normaliza, aplica idempotencia y llama al repositorio.
6. El repositorio ejecuta SQL preparado.
7. El controlador responde con el envelope JSON.
8. Cualquier `ApiError` o excepción pasa por el middleware de errores.

---

## 4. Arquitectura del frontend

### 4.1 Rutas

| Ruta | Pantalla | Responsabilidad |
| --- | --- | --- |
| `/` | Dashboard | Métricas, reportes recientes, estado de sincronización. |
| `/reports` | Historial | Búsqueda, filtros, tabla desktop y tarjetas móviles. |
| `/reports/new` | Nuevo reporte | Formulario validado y guardado local inmediato. |
| `/reports/:id` | Detalle | Información completa, trazabilidad, impresión y borrado. |
| `/settings` | Ajustes | API configurable, salud, almacenamiento, SW e instalación. |
| `*` | 404 | Página de recuperación. |

`AppLayout` compone sidebar de escritorio, barra superior y navegación inferior móvil. `ErrorBoundary` captura errores de render y evita una pantalla en blanco.

### 4.2 Estado y contextos

- **`SyncContext`**: coordina la sincronización, el estado de conexión, los contadores locales y los avisos. Es el único lugar que decide *cuándo* sincronizar.
- **`ToastContext`**: notificaciones no bloqueantes y accesibles.
- **`InstallContext`**: captura `beforeinstallprompt`, detecta iOS y el modo standalone.

La lógica de sincronización no vive en las páginas. Esto evita duplicar temporizadores y permite que cualquier pantalla consulte un estado único.

### 4.3 Capa de datos local

`src/database/db.js` define Dexie:

```js
db.version(1).stores({
  reports:
    'id, folio, syncStatus, createdAt, clientName, technicianName, serviceType, priority, status',
  meta: 'key'
});
```

El store `reports` usa `id` como clave primaria. Los índices permiten filtrar por estado de sincronización y ordenar por fecha sin recorrer toda la colección. `meta` queda disponible para extensiones futuras.

`reportRepository.js` encapsula:

- Generación de folio local (`TS-AAAAMMDD-HHMMSSXX`).
- Creación del registro con UUID, `syncStatus: 'pending'` y metadatos de reintento.
- Consulta de candidatos a sincronizar.
- Transiciones de estado: `pending → synced`, `pending → error`, `error → synced`.
- Exportación y limpieza de datos.

### 4.4 Componentes de presentación

Los componentes (`Badges`, `StatCard`, `SyncButton`, `ConfirmDialog`, `EmptyState`, `PageHeader`, etc.) no conocen la API. Reciben datos y callbacks. Esto facilita las pruebas y mantiene las páginas enfocadas en el caso de uso.

### 4.5 Estilos y accesibilidad

`src/styles/index.css` contiene un sistema de diseño con variables CSS:

| Token | Valor | Uso |
| --- | --- | --- |
| `--navy` | `#17324D` | Marca, sidebar, títulos. |
| `--blue` | `#2563EB` | Acciones primarias. |
| `--blue-100` | `#DBEAFE` | Fondos informativos. |
| `--bg` | `#F8FAFC` | Fondo general. |
| `--text` | `#1E293B` | Texto principal. |
| `--green` | `#16A34A` | Éxito/sincronizado. |
| `--amber` | `#F59E0B` | Advertencia/pendiente. |
| `--red` | `#DC2626` | Error/peligro. |

Se usan landmarks, `aria-label`, foco visible, textos alternativos y contraste verificado con Lighthouse. La navegación móvil respeta `safe-area-inset`. Existe hoja de impresión para generar un PDF legible del reporte.

---

## 5. Arquitectura del backend

### 5.1 Capas

```text
routes → controllers → services → repositories → SQLite
                 ↘ middleware de errores
```

| Capa | Archivo | Responsabilidad |
| --- | --- | --- |
| Configuración | `src/config.js` | Carga `.env`, resuelve rutas, CORS y versión. |
| Composición | `src/app.js` | Express, seguridad, CORS, JSON, rutas y errores. |
| Arranque | `src/server.js` | Abre la base, escucha, cierra ordenadamente. |
| Rutas | `routes/*.js` | Declaración de endpoints. |
| Controladores | `controllers/reportController.js` | Traducen HTTP ↔ servicio. |
| Servicio | `services/reportService.js` | Validación, folios, idempotencia, sync. |
| Repositorio | `database/reportRepository.js` | SQL preparado y mapeo snake_case ↔ camelCase. |
| Validación | `validation/reportValidation.js` | Reglas de campos, enums, UUID, folio y fechas. |
| Errores | `middleware/errorHandler.js`, `utils/ApiError.js` | Respuestas homogéneas. |

### 5.2 Seguridad aplicada

- `x-powered-by` deshabilitado.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- `Referrer-Policy: no-referrer`.
- `Cross-Origin-Resource-Policy: cross-origin` para permitir el consumo desde el frontend.
- HSTS en producción.
- CORS por lista explícita de orígenes.
- Límite de cuerpo JSON de 1 MB.
- Consultas SQL parametrizadas (sin concatenación de valores).
- Validación y normalización de todos los campos.
- `trust proxy` para funcionar detrás de Render/Vercel.

### 5.3 Manejo de errores

`ApiError` transporta `status`, `code`, `message` y `details`. El middleware diferencia errores conocidos de errores inesperados:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos del reporte no son válidos.",
    "details": [
      { "field": "clientPhone", "message": "El teléfono debe contener entre 7 y 15 dígitos." }
    ]
  }
}
```

En producción no se filtra el stack al cliente; sí se registra en el servidor.

---

## 6. Modelo de datos

### 6.1 Entidad Reporte

| Campo API | Columna SQL | Tipo | Obligatorio | Regla |
| --- | --- | --- | --- | --- |
| `id` | `id` | TEXT/UUID | Sí en sync | UUID v4; clave primaria. |
| `folio` | `folio` | TEXT | Sí | `TS-AAAAMMDD-XXXX` (4–8 caracteres finales). Único. |
| `technicianName` | `technician_name` | TEXT | Sí | 2–120 caracteres. |
| `clientName` | `client_name` | TEXT | Sí | 2–150 caracteres. |
| `clientPhone` | `client_phone` | TEXT | Sí | 7–15 dígitos. |
| `location` | `location` | TEXT | Sí | 3–250 caracteres. |
| `serviceType` | `service_type` | TEXT | Sí | Enum de 5 valores. |
| `equipment` | `equipment` | TEXT | Sí | 2–150 caracteres. |
| `problemDescription` | `problem_description` | TEXT | Sí | 5–2000 caracteres. |
| `diagnosis` | `diagnosis` | TEXT | No | Máx. 2000. |
| `workPerformed` | `work_performed` | TEXT | No | Máx. 2000. |
| `materials` | `materials` | TEXT | No | Máx. 1000. |
| `priority` | `priority` | TEXT | Sí | `baja`, `media`, `alta`, `urgente`. |
| `status` | `status` | TEXT | Sí | `abierto`, `en_proceso`, `resuelto`, `cerrado`. |
| `notes` | `notes` | TEXT | No | Máx. 1500. |
| `createdAt` | `created_at` | TEXT ISO | No en alta | Se genera si falta. |
| `updatedAt` | `updated_at` | TEXT ISO | No en alta | Se genera si falta. |
| `serverUpdatedAt` | `server_updated_at` | TEXT ISO | Servidor | Marca de la última escritura del servidor. |
| `syncedAt` | `synced_at` | TEXT ISO | Servidor | Marca de recepción. |

### 6.2 Modelo local (IndexedDB)

Además de los campos anteriores, el registro local conserva metadatos de cola:

| Campo | Propósito |
| --- | --- |
| `syncStatus` | `pending`, `synced`, `error`. |
| `syncError` | Último mensaje de error. |
| `retryCount` | Intentos acumulados. |
| `lastAttemptAt` | Último intento de envío. |
| `nextRetryAt` | Momento earliest del próximo reintento automático. |
| `permanentError` | `true` si el servidor rechazó los datos; no se reintenta automáticamente. |
| `syncedAt` | Confirmación local de sincronización. |
| `serverUpdatedAt` | Marca devuelta por el servidor. |

### 6.3 Índices SQL

```sql
CREATE INDEX idx_reports_created_at   ON reports (created_at DESC);
CREATE INDEX idx_reports_sync_client  ON reports (client_name);
CREATE INDEX idx_reports_technician   ON reports (technician_name);
CREATE INDEX idx_reports_priority     ON reports (priority);
CREATE INDEX idx_reports_status       ON reports (status);
CREATE INDEX idx_reports_service_type ON reports (service_type);
```

SQLite se configura con `journal_mode = WAL`, `foreign_keys = ON` y `busy_timeout = 5000`. Las migraciones se aplican una sola vez usando `PRAGMA user_version`.

---

## 7. Contrato de la API

### 7.1 Endpoints

| Método | Ruta | Códigos esperados |
| --- | --- | --- |
| GET | `/api/health` | 200 |
| GET | `/api/reports` | 200, 400 |
| POST | `/api/reports` | 201 creado, 200 duplicado, 422 inválido, 409 folio en conflicto |
| GET | `/api/reports/:id` | 200, 400 UUID inválido, 404 |
| PUT | `/api/reports/:id` | 200, 400, 404, 422 |
| DELETE | `/api/reports/:id` | 200, 400, 404 |
| POST | `/api/reports/sync` | 200, 400 lote inválido |

### 7.2 Envelope

Éxito:

```json
{ "success": true, "data": {}, "meta": {} }
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "REPORT_NOT_FOUND",
    "message": "El reporte solicitado no existe."
  }
}
```

### 7.3 Códigos de error principales

| Código | HTTP | Significado |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | Campos inválidos o faltantes. |
| `INVALID_ID` | 400 | UUID con formato incorrecto. |
| `INVALID_FILTER` | 400 | Filtro de listado no permitido. |
| `REPORT_NOT_FOUND` | 404 | El UUID no existe. |
| `FOLIO_CONFLICT` | 409/200 sync | El folio pertenece a otro UUID. |
| `IMMUTABLE_FIELD` | 400 | Intento de cambiar `id`, `folio` o `createdAt`. |
| `INVALID_BATCH` | 400 | `reports` vacío o ausente. |
| `BATCH_TOO_LARGE` | 400 | Más de 200 reportes. |
| `CORS_NOT_ALLOWED` | 403 | Origen no autorizado. |
| `NOT_FOUND` | 404 | Ruta inexistente. |
| `INTERNAL_ERROR` | 500 | Error no controlado. |

---

## 8. Flujo offline y sincronización

### 8.1 Secuencia de captura sin red

```text
Usuario                UI                 Dexie              API
  │                     │                   │                 │
  │ completa formulario │                   │                 │
  ├────────────────────▶│ valida            │                 │
  │                     ├──────────────────▶│ add(report)     │
  │                     │◀──────────────────┤ OK              │
  │◀────────────────────┤ toast + navega    │                 │
  │                     │                   │                 │
  │                     │ syncService: navigator.onLine=false   │
  │                     │ no envía; queda pending               │
```

Puntos clave:

- El guardado local ocurre **antes** de intentar la red.
- El UUID y el folio se generan en el dispositivo, por lo que el reporte es identificable desde su creación.
- La navegación al detalle ocurre aunque la API esté caída.

### 8.2 Secuencia de sincronización

```text
SyncContext
  ├─ al iniciar (1.2 s de gracia)
  ├─ evento online
  ├─ visibilitychange → visible
  ├─ intervalo de 60 s si está visible
  └─ botón manual

        ▼
syncPendingReports()
  ├─ si navigator.onLine === false → resultado offline
  ├─ getSyncCandidates()
  │    ├─ pending y error
  │    ├─ excluye permanentError en modo automático
  │    └─ respeta nextRetryAt
  ├─ lotes de 50 (máximo servidor: 200)
  ├─ POST /api/reports/sync
  ├─ marca created/updated/duplicate como synced
  ├─ marca rejected como error permanente
  └─ fallo transitorio → retryCount + backoff
```

### 8.3 Política de conflictos

El servidor compara `updatedAt`:

- Si el registro no existe → `created`.
- Si existe y el entrante es más nuevo → `updated`.
- Si existe y el entrante no es más nuevo → `duplicate` (conserva la versión del servidor).
- Si el folio pertenece a otro `id` → `rejected` con `FOLIO_CONFLICT`.

Esta política es **last-write-wins por `updatedAt`** y es suficiente para el alcance de un técnico por reporte. No implementa fusión de campos ni relojes vectoriales.

### 8.4 Idempotencia

La idempotencia se apoya en dos barreras:

1. El cliente reutiliza el mismo UUID en cada reintento.
2. El servidor consulta `findById` antes de insertar y devuelve el registro existente como `duplicate`.

También existe una restricción `UNIQUE` sobre `folio`, lo que protege ante dos dispositivos que generen el mismo folio por casualidad. En ese caso el segundo se rechaza y el usuario puede corregirlo; no se sobrescribe silenciosamente.

### 8.5 Reintentos

| Situación | Tratamiento |
| --- | --- |
| `navigator.onLine === false` | No se llama a la API; queda pendiente. |
| Error de red / timeout / 5xx / 429 | Fallo transitorio: `retryCount++`, `nextRetryAt` con backoff. |
| 4xx de validación | Fallo permanente: `syncStatus: error`, `permanentError: true`. |
| Respuesta sin resultado para un ID | Fallo transitorio. |
| Más de 5 intentos automáticos | Pasa a `error`; el usuario puede reintentar manualmente. |

Backoff: `min(30 s × 2^(intento−1), 15 min)`.

### 8.6 Background Sync

`requestBackgroundSync()` registra la etiqueta `techservice-report-sync` si `SyncManager` existe. El Service Worker:

1. Abre la base existente sin crearla con un esquema distinto.
2. Lee reportes `pending`/`error` no permanentes.
3. Envía el lote a la URL de API guardada en la caché de configuración.
4. Actualiza IndexedDB y notifica a las pestañas.

Es una **mejora progresiva**. La app no depende de ella: si el navegador no la soporta o no se ejecuta, los disparadores normales siguen funcionando.

---

## 9. Service Worker y estrategias de caché

| Tipo de petición | Estrategia | Detalle |
| --- | --- | --- |
| Navegación | Network First | Timeout 5 s; fallback a `/index.html` cacheado; HTML offline si no hay caché. |
| Assets con hash | Cache First | Busca en shell, luego runtime, luego red. |
| Imágenes/iconos | Stale While Revalidate | Responde caché y actualiza en segundo plano. |
| API | Sin intercepción | La app controla la cola y los errores. |
| Respuestas no-OK | No se cachean | Evita guardar un 502 del proxy como si fuera la app. |
| Orígenes externos | Sin intercepción | La API puede estar en otro dominio. |

Cachés:

- `techservice-shell-<build>`
- `techservice-runtime-<build>`
- `techservice-images-<build>`
- `techservice-config` (URL de API para Background Sync)

En `activate` se eliminan las cachés `techservice-*` que no pertenezcan al build actual. El `BUILD_ID` y la lista de assets se inyectan en el build mediante un plugin de Vite (`closeBundle`).

---

## 10. Despliegue

### 10.1 Topología recomendada

```text
Usuario
  │ HTTPS
  ▼
Frontend estático (Vercel / Netlify)
  │ fetch HTTPS + CORS
  ▼
API Node (Render / Docker)
  │ volumen persistente
  ▼
SQLite (/var/data/techservice.sqlite)
```

- El frontend es estático: no necesita servidor Node en producción.
- La API requiere un proceso persistente y un disco para SQLite.
- El dominio del frontend debe declararse en `CORS_ORIGINS`.
- La URL de la API se configura con `VITE_API_URL` en build o desde **Ajustes** en tiempo de ejecución.

### 10.2 Variables críticas

| Variable | Dónde | Efecto |
| --- | --- | --- |
| `VITE_API_URL` | Frontend (build) | URL base por defecto de la API. |
| `CORS_ORIGINS` | Backend | Orígenes permitidos. |
| `DB_PATH` | Backend | Ruta absoluta al archivo SQLite. |
| `PORT` / `HOST` | Backend | Escucha del servidor. |
| `NODE_ENV` | Backend | HSTS y comportamiento de producción. |

---

## 11. Decisiones y justificación

| Decisión | Alternativas | Motivo |
| --- | --- | --- |
| Service Worker propio | Workbox | Control explícito de estrategias, menos dependencias y valor didáctico. |
| Dexie | `localStorage`, SQLite WASM | Índices, consultas reactivas y API robusta sobre IndexedDB. |
| UUID en cliente | ID autogenerado en servidor | Permite idempotencia y creación offline. |
| Folio en cliente | Folio sólo del servidor | El reporte necesita identidad legible aun sin red. |
| SQLite | PostgreSQL, MongoDB | Cero configuración, transacciones y suficiente para una instancia académica. |
| Sync por lotes | Una petición por reporte | Menos round-trips y mejor comportamiento en redes móviles. |
| Polling de 60 s | WebSockets | Simplicidad; el caso de uso no requiere tiempo real. |
| Sin autenticación | JWT/OAuth | No formaba parte del alcance; se documenta como riesgo. |

---

## 12. Limitaciones y trabajo futuro

1. **Autenticación:** cualquier cliente con la URL puede leer/escribir. Antes de producción se requiere API key/OAuth y autorización por técnico.
2. **Escalado de SQLite:** una sola instancia de escritura. Para varias réplicas, migrar a PostgreSQL.
3. **Conflictos:** last-write-wins por `updatedAt`; no hay merge por campo.
4. **Adjuntos:** no se almacenan fotos ni firmas.
5. **Background Sync en iOS:** no disponible; la app funciona con los disparadores en primer plano.
6. **Persistencia del navegador:** el sistema puede desalojar IndexedDB bajo presión extrema; se ofrece `navigator.storage.persist()` y exportación JSON.
7. **Observabilidad:** logs en consola y `X-Request-Id`; no hay trazas distribuidas ni métricas.
8. **Rendimiento:** no se ha ejecutado una auditoría Lighthouse de Performance con throttling móvil; queda como prueba pendiente.

---

## 13. Conclusión

La arquitectura separa con claridad las responsabilidades: la UI no sabe cómo se sincroniza, el cliente no confía en la red y el servidor no confía en los datos entrantes. La combinación de IndexedDB, Service Worker, UUID idempotente y una cola con reintentos convierte el requisito offline en una propiedad estructural del sistema, no en un parche. Las limitaciones están identificadas y tienen una ruta de evolución clara.
