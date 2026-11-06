# TechService PWA

Aplicación web progresiva (PWA) para registrar y gestionar reportes de servicio técnico en campo. Está diseñada con enfoque **offline first**: el reporte se guarda primero en el dispositivo, sobrevive al cierre del navegador y se sincroniza con la API cuando hay conexión.

> Proyecto académico full stack: React + Vite en el cliente, Express + SQLite en el servidor, IndexedDB para persistencia offline y un Service Worker propio para el funcionamiento sin red.

---

## 1. Características principales

- **Panel de control** con totales, pendientes, sincronizados, errores, últimos reportes y estado de conexión.
- **Alta de reportes** con validación en cliente y servidor, folio generado en el dispositivo y UUID idempotente.
- **Historial** con búsqueda por folio/cliente/técnico/equipo/ubicación y filtros por servicio, prioridad, estado y sincronización.
- **Detalle del reporte** con trazabilidad (UUID, fechas, estado de sincronización), impresión/PDF y eliminación segura.
- **Sincronización automática** al iniciar, al recuperar conexión, al volver a primer plano, cada 60 segundos y manual.
- **Cola offline persistente** en IndexedDB (Dexie), con reintentos y backoff exponencial.
- **Service Worker** con precache del app shell, Cache First, Stale While Revalidate y Network First para navegación.
- **Background Sync** como mejora progresiva cuando el navegador la soporta (no es requisito para que la app funcione).
- **Ajustes y diagnóstico**: URL de API configurable en tiempo de ejecución, salud del backend, uso de almacenamiento, estado del SW y exportación JSON.
- **PWA instalable** con manifest, iconos 192/512/maskable y atajos de aplicación.

---

## 2. Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| UI | React 19, React Router 7, Lucide React |
| Build | Vite 8 |
| Estilos | CSS3 propio, diseño responsive y paleta corporativa |
| Persistencia local | IndexedDB + Dexie 4 + `dexie-react-hooks` |
| PWA | Manifest, Service Worker propio (sin Workbox), Cache API, Background Sync |
| API | Node.js 20+, Express 4, CORS, dotenv |
| Base de datos | SQLite con libSQL (`@libsql/client`): archivo local en desarrollo y Turso en producción |
| Pruebas | `node:test` en backend y frontend |

---

## 3. Estructura del repositorio

```text
.
├── backend/
│   ├── src/
│   │   ├── config.js                 # Variables de entorno y rutas
│   │   ├── app.js                    # Composición de Express, CORS y seguridad
│   │   ├── server.js                 # Arranque y cierre ordenado
│   │   ├── controllers/              # Adaptación HTTP
│   │   ├── database/                 # Conexión libSQL (local/Turso), migraciones y repositorio
│   │   ├── middleware/               # Errores, 404 y logs
│   │   ├── routes/                   # /api/health y /api/reports
│   │   ├── services/                 # Reglas de negocio, idempotencia y sync
│   │   ├── utils/                    # ApiError
│   │   └── validation/               # Validación y normalización
│   ├── test/api.test.js              # 10 pruebas de integración
│   ├── data/                         # SQLite local (ignorado por git)
│   ├── Dockerfile
│   ├── render.yaml
│   └── .env.example
├── frontend/
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   ├── sw.js                     # Service Worker
│   │   ├── robots.txt
│   │   └── icons/
│   ├── scripts/generate-icons.mjs    # Generador de iconos sin dependencias
│   ├── src/
│   │   ├── components/               # Layout, badges, diálogos, navegación
│   │   ├── context/                  # Sync, toasts, instalación
│   │   ├── database/                 # Esquema y repositorio Dexie
│   │   ├── hooks/
│   │   ├── pages/                    # Dashboard, historial, alta, detalle, ajustes
│   │   ├── services/                 # API, PWA y sincronización
│   │   ├── styles/index.css          # Sistema de diseño
│   │   └── utils/                    # Validación, formato y UUID
│   ├── tests/                        # 18 pruebas unitarias
│   ├── vercel.json
│   ├── netlify.toml
│   └── .env.example
├── docs/                             # Documentación académica (7 documentos)
├── .env.example
└── README.md
```

---

## 4. Requisitos

- Node.js **20 o superior** (probado con Node 24.21 en Windows).
- npm 10 o superior.
- Navegador moderno con soporte de Service Worker e IndexedDB.
- Para instalación PWA: `https://` o `http://localhost`.

> `@libsql/client` incluye binarios nativos precompilados para las plataformas habituales. Si npm necesitara compilar, en Windows instala Visual Studio Build Tools con "Desktop development with C++".

---

## 5. Puesta en marcha

### 5.1 Backend

```bash
cd backend
npm install
copy .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

La API queda en `http://localhost:4000`. Comprobación:

```bash
curl http://localhost:4000/api/health
```

### 5.2 Frontend

En otra terminal:

```bash
cd frontend
npm install
copy .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Abre `http://localhost:5173`. El proxy de Vite envía `/api` al backend en el puerto 4000.

### 5.3 Probar la PWA real

El Service Worker está desactivado en `npm run dev` para no interferir con el HMR. Para validar offline, cache y manifest:

```bash
cd frontend
npm run build
npm run preview
```

Abre `http://localhost:4173`. La primera visita registra el Service Worker; recarga una vez si el navegador todavía no controla la página.

---

## 6. Scripts disponibles

### Backend

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor con recarga (`node --watch`). |
| `npm start` | Servidor de producción. |
| `npm test` | 10 pruebas de integración con libSQL en memoria. |
| `npm run check` | Verificación sintáctica del punto de entrada. |

### Frontend

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Vite en modo desarrollo (puerto 5173). |
| `npm run build` | Build de producción e inyección de precache en `dist/sw.js`. |
| `npm run preview` | Sirve `dist` en el puerto 4173. |
| `npm test` | 18 pruebas unitarias. |

---

## 7. API REST

Base local: `http://localhost:4000/api`

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Estado del servicio y de la base de datos. |
| `GET` | `/api/reports` | Lista con `search`, `serviceType`, `priority`, `status`, `limit`, `offset`. |
| `POST` | `/api/reports` | Crea un reporte. Idempotente por `id` (UUID). |
| `GET` | `/api/reports/:id` | Obtiene un reporte por UUID. |
| `PUT` | `/api/reports/:id` | Actualiza campos; `id`, `folio` y `createdAt` son inmutables. |
| `DELETE` | `/api/reports/:id` | Elimina un reporte. |
| `POST` | `/api/reports/sync` | Sincroniza un lote de hasta 200 reportes. |

Formato de respuesta:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Errores:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos del reporte no son válidos.",
    "details": [{ "field": "clientName", "message": "El nombre del cliente es obligatorio." }]
  }
}
```

### Idempotencia y sincronización

- El cliente genera un **UUID v4** antes de guardar. Ese UUID viaja como `id`.
- `POST /api/reports` devuelve `200` con `meta.duplicate: true` si el UUID ya existe; no crea otro registro.
- `POST /api/reports/sync` procesa cada reporte y devuelve un resultado:
  - `created`: no existía y se insertó.
  - `updated`: existía y el `updatedAt` entrante era más reciente.
  - `duplicate`: ya existía y no había cambios más nuevos.
  - `rejected`: falló la validación o el folio pertenece a otro UUID.
- El lote es transaccional a nivel SQLite; cada elemento se evalúa de forma independiente para informar el detalle.

### Ejemplo de sincronización

```bash
curl -X POST http://localhost:4000/api/reports/sync \
  -H "Content-Type: application/json" \
  -d "{\"reports\":[{\"id\":\"3f1c2a9e-8f4b-4c1a-9d2e-1a2b3c4d5e6f\",\"folio\":\"TS-20261105-120000AB\",\"technicianName\":\"Luis Ramírez\",\"clientName\":\"María González\",\"clientPhone\":\"+52 55 1234 5678\",\"location\":\"Av. Reforma 100\",\"serviceType\":\"preventivo\",\"equipment\":\"Bomba 1.5 HP\",\"problemDescription\":\"Mantenimiento programado\",\"diagnosis\":\"Sin hallazgos\",\"workPerformed\":\"Limpieza y ajuste\",\"materials\":\"Filtro\",\"priority\":\"media\",\"status\":\"resuelto\",\"notes\":\"\",\"createdAt\":\"2026-11-05T18:00:00.000Z\",\"updatedAt\":\"2026-11-05T18:00:00.000Z\"}]}"
```

---

## 8. Cómo funciona el modo offline

1. El formulario valida y normaliza los datos en el navegador.
2. `createLocalReport` genera folio + UUID y escribe en IndexedDB (Dexie).
3. La UI navega al detalle y muestra el estado **Pendiente**.
4. Si hay conexión, `syncPendingReports` envía el lote; si no, queda en cola.
5. Al volver la conexión, al iniciar la app, al recuperar visibilidad o cada 60 s se reintenta.
6. Los fallos transitorios usan backoff exponencial (30 s, 60 s, 120 s… hasta 15 min y 5 intentos automáticos). Los rechazos de validación se marcan como error permanente.
7. Cuando el servidor confirma, el registro local pasa a **Sincronizado** y se guarda `syncedAt`.

### Estrategias del Service Worker

| Recurso | Estrategia |
| --- | --- |
| Navegación (`mode: navigate`) | Network First con timeout de 5 s y fallback al app shell cacheado. |
| Assets con hash (`/assets/*`, scripts, estilos, fuentes) | Cache First (shell precache → runtime cache → red). |
| Imágenes e iconos | Stale While Revalidate. |
| `/api/*` | **No se intercepta**: la app gestiona la cola y los errores. |
| Respuestas no-OK (4xx/5xx) | Nunca se cachean. |

El build de Vite inyecta los assets hasheados y un `BUILD_ID` en `dist/sw.js`. Al activarse una versión nueva se eliminan las cachés `techservice-*` antiguas.

---

## 9. Pruebas y resultados reales

Resultados obtenidos el **5 de noviembre de 2026** en Windows, Node 24.21.0:

| Suite | Comando | Resultado |
| --- | --- | --- |
| Backend (integración) | `cd backend && npm test` | **10/10 aprobadas**, 0 fallidas |
| Frontend (unitarias) | `cd frontend && npm test` | **18/18 aprobadas**, 0 fallidas |
| Build de producción | `cd frontend && npm run build` | Correcto; precache inyectado |
| E2E manual en navegador (producción) | `npm run preview` | Alta, sincronización, filtros, detalle, ajustes y borrado verificados |
| Offline real | preview detenido + recarga | App shell desde caché, reporte persistido en IndexedDB y sincronizado al reconectar |
| Lighthouse (historial) | herramienta del navegador | Accesibilidad **100**, Buenas prácticas **100**, SEO **100** |
| Lighthouse (panel y ajustes) | herramienta del navegador | Accesibilidad **100**, Buenas prácticas **100**, SEO **100** |

> La herramienta Lighthouse integrada audita accesibilidad, buenas prácticas y SEO; **no ejecuta la categoría Performance**. La medición de rendimiento con throttling móvil queda pendiente y debe hacerse con Chrome DevTools o PageSpeed Insights.

Pruebas que requieren dispositivo físico y permanecen **pendientes**:

- Instalación real en Android (Chrome) y iOS/iPadOS (Safari).
- Comportamiento del navegador al suspender la app en segundo plano.
- Background Sync real tras cerrar la pestaña (depende del navegador y del sistema).
- Cuota y persistencia de almacenamiento en dispositivos de gama baja.

El detalle completo está en [`docs/05-pruebas-auditoria.md`](docs/05-pruebas-auditoria.md).

---

## 10. Despliegue

Orden recomendado: **GitHub → Render/Turso (backend) → Vercel (frontend) → CORS → verificación**.

### 10.1 Frontend en Vercel

1. Despliega primero el backend (10.3) para conocer su URL.
2. Importa el repositorio en Vercel.
3. Configura **Root Directory** = `frontend`.
4. Build Command: `npm run build`; Output Directory: `dist`.
5. Define `VITE_API_URL=https://tu-api.onrender.com/api` (sin barra final).
6. Despliega. `vercel.json` ya incluye rewrites de SPA y cabeceras para `sw.js`, manifest y assets.

> `VITE_API_URL` se embebe en el build. Si cambia la URL del backend, hay que redesplegar el frontend.

### 10.2 Frontend en Netlify

1. Conecta el repositorio y selecciona la carpeta `frontend`.
2. Netlify detecta `netlify.toml` (build `npm run build`, publish `dist`).
3. Define `VITE_API_URL` en *Site settings → Environment variables*.
4. Despliega; el redirect SPA y las cabeceras están en `netlify.toml`.

### 10.3 Backend en Render (plan Free) con Turso

El plan Free de Render usa un sistema de archivos **efímero** y no permite montar discos persistentes. Por eso la API no guarda SQLite en Render: usa **Turso**, que es SQLite gestionado (libSQL) con plan gratuito sin tarjeta (5 GB y 500 millones de lecturas al mes).

1. Crea una cuenta en [turso.tech](https://turso.tech) y una base de datos.
2. Obtén las credenciales desde el panel o con la CLI:
   ```bash
   turso db create techservice
   turso db show techservice --url
   turso db tokens create techservice
   ```
3. En Render crea un **Web Service** desde el repositorio.
4. Root Directory: `backend`; Build: `npm ci`; Start: `npm start`.
5. Define las variables:
   ```dotenv
   NODE_ENV=production
   NODE_VERSION=22
   TURSO_DATABASE_URL=libsql://tu-base.turso.io
   TURSO_AUTH_TOKEN=tu-token
   APP_VERSION=1.0.0
   LOG_REQUESTS=true
   CORS_ORIGINS=https://tu-frontend.vercel.app
   ```
6. **No añadas disco ni `DB_PATH`**: no son necesarios y `/var/data` no existe en Free.
7. Verifica `https://tu-api.onrender.com/api/health`:
   ```json
   { "success": true, "data": { "status": "ok", "database": "ok", "databaseEngine": "turso" } }
   ```

El archivo `backend/render.yaml` refleja esta configuración. Las migraciones se aplican solas al arrancar y se registran en `schema_migrations`, así que sobreviven a los redeploys.

> El plan Free de Render se suspende tras unos minutos de inactividad. La primera petición puede tardar 30–60 s (cold start), pero los datos siguen en Turso.

> Sin `TURSO_DATABASE_URL`, el backend usa `backend/data/techservice.sqlite` (útil en local y en Docker con volumen). Esa ruta **no** es persistente en Render Free.

### 10.4 Backend con Docker

```bash
cd backend
docker build -t techservice-api .
docker run -p 4000:4000 -v techservice-data:/data \
  -e CORS_ORIGINS=https://tu-frontend.vercel.app \
  techservice-api
```

Para usar Turso también en Docker:

```bash
docker run -p 4000:4000 \
  -e TURSO_DATABASE_URL=libsql://tu-base.turso.io \
  -e TURSO_AUTH_TOKEN=tu-token \
  -e CORS_ORIGINS=https://tu-frontend.vercel.app \
  techservice-api
```

---

## 11. Publicar en GitHub

```bash
git init
git add .
git commit -m "feat: TechService PWA offline-first"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/techservice-pwa.git
git push -u origin main
```

Antes de publicar:

- No subir `.env`, `backend/data/` ni `node_modules/`.
- Revisar que `.gitignore` esté incluido.
- Ejecutar `npm test` en backend y frontend, y `npm run build` en frontend.
- Verificar que la API desplegada responda en `/api/health` y que CORS incluya el dominio del frontend.

---

## 12. Documentación académica

| Documento | Contenido |
| --- | --- |
| [`docs/01-arquitectura.md`](docs/01-arquitectura.md) | Arquitectura, capas, modelo de datos, flujo de sincronización y decisiones. |
| [`docs/02-compatibilidad.md`](docs/02-compatibilidad.md) | Matriz de navegadores/dispositivos y limitaciones. |
| [`docs/03-checklist-pwa.md`](docs/03-checklist-pwa.md) | Checklist PWA con evidencia y pendientes. |
| [`docs/04-entorno-desarrollo.md`](docs/04-entorno-desarrollo.md) | Instalación, variables, comandos y solución de problemas. |
| [`docs/05-pruebas-auditoria.md`](docs/05-pruebas-auditoria.md) | Estrategia, resultados reales, Lighthouse y pruebas pendientes. |
| [`docs/06-manual-instalacion.md`](docs/06-manual-instalacion.md) | Manual de instalación y uso para Android, iOS y escritorio. |
| [`docs/07-defensa-proyecto.md`](docs/07-defensa-proyecto.md) | Guion de demostración, preguntas frecuentes y mapeo al rubric. |

---

## 13. Decisiones y limitaciones

- **Sin autenticación**: el alcance académico no incluye usuarios; la API debe protegerse antes de un uso real.
- **Folio generado en el cliente**: permite trabajar sin red. La probabilidad de colisión se reduce con fecha/hora, segundos y dos caracteres aleatorios; el servidor rechaza folios duplicados con otro UUID.
- **SQLite**: excelente para una sola instancia y bajo volumen; para escalado horizontal se recomienda PostgreSQL.
- **Background Sync** no está disponible en Safari/iOS. La app no depende de él: sincroniza al iniciar, al recuperar conexión, al volver a primer plano y manualmente.
- **Service Worker en desarrollo**: desactivado por defecto para evitar caché durante el HMR; se prueba con `build` + `preview`.
