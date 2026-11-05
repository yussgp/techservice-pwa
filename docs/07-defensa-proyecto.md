# 07 · Defensa del proyecto

**Proyecto:** TechService PWA  
**Versión:** 1.0.0  
**Fecha:** 5 de noviembre de 2026  
**Duración objetivo:** 12–15 minutos de demostración + preguntas.

> Este documento es una guía de preparación. No contiene resultados inventados. Todas las cifras citadas provienen de ejecuciones reales registradas en [`05-pruebas-auditoria.md`](05-pruebas-auditoria.md). Las pruebas físicas y de rendimiento que no se ejecutaron se declaran como pendientes.

---

## 1. Idea central que debe quedar clara

TechService PWA no es “una web con un formulario”. Su propuesta es:

> **El reporte se guarda primero en el dispositivo y la red es un detalle posterior.**

Esa frase resume la arquitectura:

- IndexedDB es la fuente de verdad local.
- El Service Worker permite abrir la aplicación sin red.
- El UUID generado en el cliente hace que reintentar sea seguro.
- El servidor valida, deduplica y persiste en SQLite.
- La sincronización es automática, reintentable y observable.

Si el jurado recuerda una sola idea, debe ser: **la captura nunca depende de la conexión**.

---

## 2. Preparación previa a la demostración

### 2.1 Checklist técnico

```text
[ ] Backend encendido y healthy en http://localhost:4000/api/health
[ ] Frontend de producción compilado (npm run build)
[ ] Preview activo en http://localhost:4173
[ ] Navegador Chromium con perfil limpio o al menos sin datos corruptos
[ ] Service Worker activo y controlando la página
[ ] Ajustes → Servidor disponible
[ ] Pestañas de apoyo: /, /reports, /reports/new, /settings
[ ] Consola del navegador abierta y sin errores
[ ] Zoom al 100 %
[ ] Notificaciones del sistema silenciadas
[ ] Batería y conexión estables
[ ] Respaldo JSON exportado antes de la demo
[ ] Datos de demostración listos (ver 2.2)
```

### 2.2 Datos de demostración

La base local y el backend pueden estar vacíos en un entorno nuevo. Antes de la defensa:

1. Crea un reporte en línea con datos ficticios y espera el estado **Sincronizado**.
2. Crea un reporte offline y déjalo **Pendiente** para demostrar la cola.
3. Vuelve a conectar y confirma que se sincroniza.
4. Deja al menos **dos reportes sincronizados** para mostrar historial y filtros.

Ejemplo de datos ficticios:

| Campo | Valor |
| --- | --- |
| Técnico | Luis Ramírez |
| Cliente | María González |
| Teléfono | +52 55 1234 5678 |
| Servicio | Mantenimiento preventivo |
| Ubicación | Av. Reforma 100, Ciudad de México |
| Equipo | Bomba centrífuga 1.5 HP |
| Problema | Vibración y ruido al arrancar |
| Diagnóstico | Rodamiento desgastado |
| Trabajo | Reemplazo de rodamiento y balanceo |
| Materiales | Rodamiento 6205, grasa industrial |
| Prioridad | Alta |
| Estado | Resuelto |

> No uses datos personales reales. La aplicación no tiene autenticación y un despliegue público sería accesible para cualquiera que conozca la URL.

### 2.3 Ensayo de tiempos

| Bloque | Tiempo |
| --- | --- |
| Apertura y problema | 1 min |
| Panel de control | 1.5 min |
| Alta en línea | 2 min |
| Historial y detalle | 2 min |
| Demostración offline | 4 min |
| Sincronización e idempotencia | 2 min |
| Ajustes y diagnóstico | 1.5 min |
| Cierre y limitaciones | 1 min |
| **Total** | **15 min** |

Para una exposición de 8 minutos, usa la ruta corta de la sección 4.

---

## 3. Guion de demostración (15 minutos)

### 3.1 Apertura — 1 minuto

**Qué decir:**

> “TechService PWA resuelve un problema concreto: un técnico en campo necesita registrar una visita aunque no tenga señal. Si la aplicación dependiera del servidor para guardar, el reporte se perdería o el técnico tendría que anotarlo en papel. La solución invierte el orden: primero se guarda en el dispositivo y después se sincroniza.”

**Qué mostrar:**

- Página del panel.
- Indicador de conexión.
- Barra lateral o navegación móvil.

**No decir:** “funciona en cualquier dispositivo” ni “está probado en Android e iOS”. Todavía no se ejecutó esa prueba.

---

### 3.2 Panel de control — 1.5 minutos

**Qué mostrar:**

- Totales: reportes, pendientes, sincronizados y con error.
- Últimos reportes.
- Estado de conexión.
- Botón **Sincronizar ahora**.

**Qué decir:**

> “El panel es una vista derivada de IndexedDB. No hace una consulta al servidor para pintar los totales. Eso permite que el panel funcione offline. Los contadores se actualizan de forma reactiva con Dexie.”

**Punto técnico para el jurado:**

- `useLiveQuery` observa el store `reports`.
- Los contadores se calculan localmente.
- El estado de conexión es una capa de UI, no la fuente de verdad: si `navigator.onLine` dice `true` pero el `fetch` falla, el reporte queda pendiente igual.

---

### 3.3 Alta en línea — 2 minutos

**Qué hacer:**

1. Pulsa **Nuevo reporte**.
2. Completa los campos con datos ficticios.
3. Muestra brevemente la validación: intenta guardar con un campo obligatorio vacío o un teléfono inválido.
4. Corrige y pulsa **Guardar reporte**.
5. Observa la navegación al detalle y el estado **Sincronizado**.

**Qué decir:**

> “El formulario valida en el cliente, pero el servidor vuelve a validar. El cliente no es confiable por definición. Además, el guardado local ocurre antes de cualquier llamada de red: si la API está caída, el reporte ya existe en el dispositivo.”

**Qué destacar en el detalle:**

- Folio generado localmente.
- UUID visible y copiable.
- Fechas de creación, modificación y sincronización.
- Estado de sincronización.

**Evidencia real de referencia:**

```text
Folio: TS-20261105-132818W9
UUID:  27e0d6fc-8262-4ed3-ac03-7e36b7a267ec
syncedAt: 2026-11-05T19:28:19.017Z
```

---

### 3.4 Historial, búsqueda y filtros — 2 minutos

**Qué hacer:**

1. Ve a **Historial de reportes**.
2. Busca `maría` y muestra cómo encuentra el reporte aunque se escriba sin acento.
3. Busca un término inexistente y muestra el estado vacío.
4. Filtra por prioridad **Urgente**.
5. Filtra por sincronización **Pendientes** y luego **Sincronizados**.
6. Pulsa **Limpiar**.

**Qué decir:**

> “La búsqueda normaliza acentos y mayúsculas. Los filtros son combinables y se aplican en memoria sobre los registros locales. Para el volumen de un técnico en campo es suficiente; para miles de registros habría que paginar o consultar al servidor.”

**Evidencia real:**

| Acción | Resultado |
| --- | --- |
| Sin filtros | `2 de 2 reportes` |
| Buscar `maría` | `1 de 2` |
| Buscar `zzz-no-existe` | `0 de 2` |
| Prioridad `urgente` | `1 de 2` |
| Sincronización `synced` | `2 de 2` |

---

### 3.5 Demostración offline — 4 minutos

Esta es la parte central. Hazla despacio.

#### Opción A (recomendada para la demo): modo offline del navegador

1. Abre DevTools → **Network**.
2. Activa **Offline**.
3. Recarga la página.
4. Muestra que la app sigue cargando.
5. Crea un reporte.
6. Verifica el estado **Pendiente**.
7. Recarga de nuevo.
8. Muestra que el reporte persiste.
9. Desactiva **Offline**.
10. Espera la sincronización automática o pulsa **Sincronizar**.
11. Muestra el estado **Sincronizado**.

#### Opción B (prueba más dura): detener el servidor de preview

1. Detén `npm run preview`.
2. Recarga la pestaña.
3. El Service Worker debe servir el shell cacheado, no una pantalla 502.
4. Crea el reporte offline.
5. Reinicia `npm run preview`.
6. Sincroniza.

> Si el navegador queda mostrando un error de proxy, no entres en pánico: recarga una vez con el preview levantado, verifica que el Service Worker controle la página y repite. La prueba real ya validó este caso; en vivo puede fallar por una pestaña no controlada.

#### Qué decir

> “El Service Worker usa Network First para navegación con timeout de 5 segundos. Si la red falla o devuelve un 502, sirve el `index.html` cacheado. Los assets usan Cache First. Las imágenes, Stale While Revalidate. La API no se intercepta: la cola la maneja la aplicación, no el Service Worker.”

> “El reporte se escribe en IndexedDB antes de intentar la red. Por eso sobrevive a una recarga completa.”

**Evidencia real de referencia:**

```text
Folio offline: TS-20261105-133221QD
UUID:          509c6a22-40d7-4980-bf5c-636337e182dc
Estado inicial: pending
Persistencia:   visible tras recarga completa
Sincronización: 2026-11-05T19:33:23.852Z
Consola:        cero errores al cargar offline
```

#### Punto clave para el jurado

No digas “el Service Worker guarda los reportes”. Es incorrecto. **IndexedDB guarda los reportes**; el Service Worker cachea el shell y, opcionalmente, colabora con Background Sync.

---

### 3.6 Sincronización e idempotencia — 2 minutos

**Qué hacer:**

1. Muestra el estado **Pendiente** antes de reconectar.
2. Reconecta.
3. Muestra la transición a **Sincronizado**.
4. Abre una pestaña auxiliar con la respuesta de la API o muestra el registro en el servidor.

**Qué decir:**

> “Cada reporte nace con un UUID v4 generado en el dispositivo. Ese UUID es la clave primaria y la clave de idempotencia. Si el envío se reintenta, el servidor busca el UUID antes de insertar. Si ya existe, devuelve `duplicate` y no crea otro registro.”

**Prueba de duplicados ya ejecutada:**

| Intento | Resultado | Total en servidor |
| --- | --- | --- |
| Antes | — | 3 |
| Primer reenvío | `duplicate` | 3 |
| Segundo reenvío | `duplicate` | 3 |

**Si el jurado pide verlo en vivo:**

```powershell
# Reenviar el mismo lote dos veces con el UUID de un reporte existente
# (sustituye el UUID y el folio por los de tu demo)
$body = @{
  reports = @(@{
    id = "509c6a22-40d7-4980-bf5c-636337e182dc"
    folio = "TS-20261105-133221QD"
    technicianName = "Cliente Offline Prueba"
    clientName = "Cliente Offline Prueba"
    clientPhone = "+52 55 0000 0000"
    location = "Prueba"
    serviceType = "inspeccion"
    equipment = "Equipo de prueba"
    problemDescription = "Prueba de idempotencia"
    priority = "media"
    status = "abierto"
    createdAt = "2026-11-05T19:32:21.000Z"
    updatedAt = "2026-11-05T19:32:21.000Z"
  })
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post `
  -Uri http://localhost:4000/api/reports/sync `
  -ContentType "application/json" `
  -Body $body
```

El resultado debe incluir `"status": "duplicate"` y el total del servidor no debe cambiar.

> No inventes un UUID nuevo para esta prueba: si lo haces, el servidor creará otro reporte y parecerá que la idempotencia falló.

---

### 3.7 Detalle, impresión y ajustes — 1.5 minutos

**Qué mostrar:**

- Detalle completo del reporte.
- Botón **Imprimir** (abre el diálogo; no imprimas en vivo salvo que sea necesario).
- **Ajustes → Servidor disponible**.
- **Ajustes → Service Worker**: soportado, registrado, activo, controlando, scope y cachés.
- **Ajustes → Almacenamiento**: uso, cuota, persistencia.
- **Ajustes → Exportar JSON**.

**Qué decir:**

> “Los ajustes son también una herramienta de diagnóstico. Permiten cambiar la URL de la API sin reconstruir, comprobar la salud del backend y ver el estado real del Service Worker y de las cachés. Eso reduce el tiempo de soporte en campo.”

---

### 3.8 Cierre — 1 minuto

**Qué decir:**

> “El proyecto cumple el flujo completo: captura offline, persistencia, sincronización automática, idempotencia, CRUD en la API, documentación y pruebas. Las validaciones que requieren hardware físico, otros navegadores o auditoría de rendimiento quedaron declaradas como pendientes, con su procedimiento. Prefiero entregar un estado honesto que afirmar pruebas que no ejecuté.”

---

## 4. Ruta corta de 8 minutos

Si el tiempo se reduce:

1. **1 min:** problema y propuesta.
2. **1 min:** panel y estado de conexión.
3. **2 min:** crear reporte online y mostrar sincronización.
4. **2 min:** modo offline, crear reporte y recargar.
5. **1 min:** reconectar y mostrar sincronización.
6. **1 min:** ajustes, Service Worker y cierre.

Omite la prueba de duplicados en vivo; cita la evidencia documentada.

---

## 5. Mapeo a criterios de evaluación

> La rúbrica varía entre instituciones. Esta tabla usa criterios habituales de proyectos web/PWA y debe adaptarse a la rúbrica oficial del curso.

| Criterio habitual | Evidencia en el proyecto | Dónde mostrarlo |
| --- | --- | --- |
| Funcionalidad del flujo principal | Alta, historial, detalle, sincronización y borrado. | Demo 3.3–3.7. |
| Persistencia offline | IndexedDB con Dexie; reporte sobrevive a recarga. | Demo 3.5. |
| PWA instalable | Manifest, iconos 192/512/maskable, Service Worker, standalone. | Ajustes y DevTools → Application. |
| Service Worker | Ciclo install/activate/fetch, tres estrategias, limpieza de cachés. | `frontend/public/sw.js`. |
| Sincronización | Disparadores, lotes, backoff, reintentos y estados. | `SyncContext`, `syncService`. |
| Prevención de duplicados | UUID + idempotencia + `duplicate`; evidencia real. | Demo 3.6 y tests. |
| API REST | 7 endpoints, envelope consistente, validación, errores. | `backend/src`. |
| Base de datos | SQLite, WAL, migraciones, índices, restricción única de folio. | `backend/src/database`. |
| Calidad de código | Separación por capas, funciones pequeñas, nombres claros. | Recorrido de archivos. |
| Pruebas | 10 backend + 18 frontend + E2E real. | `npm test` y doc 05. |
| Accesibilidad | Landmarks, foco, contraste, Lighthouse 100. | Ajustes/Lighthouse. |
| SEO | Metadatos, `robots.txt`, Lighthouse 100. | `index.html`, doc 05. |
| Documentación | 7 documentos + README + comentarios. | Carpeta `docs/`. |
| Despliegue | Vercel/Netlify, Render/Docker, variables y disco persistente. | `vercel.json`, `render.yaml`, README. |
| Limitaciones declaradas | Sin auth, LWW, SQLite monoinstancia, pendientes físicos. | Sección 8 y doc 05. |

---

## 6. Justificación técnica de las decisiones

### 6.1 ¿Por qué IndexedDB y no localStorage?

`localStorage` es síncrono, limitado a unos pocos MB y no tiene índices. IndexedDB es asíncrono, transaccional y permite indexar por `syncStatus`, `createdAt`, cliente, técnico y prioridad. Dexie añade una API manejable y consultas reactivas con `useLiveQuery`.

### 6.2 ¿Por qué un UUID generado en el cliente?

Porque el reporte debe existir antes de contactar al servidor. Un ID autogenerado en el servidor obligaría a esperar la red. El UUID v4 permite identificar el registro desde su creación, reutilizarlo en reintentos y aplicar idempotencia.

### 6.3 ¿Por qué un folio generado en el dispositivo?

El técnico necesita un identificador legible en campo, incluso sin red. El formato `TS-AAAAMMDD-HHMMSSXX` incluye fecha, hora, segundos y dos caracteres aleatorios. La probabilidad de colisión es baja, y el servidor tiene una restricción `UNIQUE` sobre `folio` para detectarla.

### 6.4 ¿Por qué Service Worker propio y no Workbox?

El alcance académico exige demostrar comprensión de las estrategias. Un Service Worker propio hace explícitos `install`, `activate`, `fetch`, el precache, el timeout de navegación, la limpieza de cachés y el handler de Background Sync. Workbox habría reducido código, pero también habría ocultado las decisiones que se quieren defender. Es una decisión didáctica, no una afirmación de que Workbox sea inferior.

### 6.5 ¿Por qué Cache First, Stale While Revalidate y Network First?

| Recurso | Estrategia | Motivo |
| --- | --- | --- |
| Navegación | Network First con timeout y fallback | Prioriza contenido fresco, pero nunca deja al usuario sin app. |
| Assets con hash | Cache First | Un asset hashed es inmutable; la caché es segura y rápida. |
| Imágenes/iconos | Stale While Revalidate | Respuesta inmediata y actualización en segundo plano. |
| API | Sin intercepción | La cola de negocio y los errores los maneja la app, no el SW. |
| Respuestas no-OK | No se cachean | Evita congelar un 502, 404 o 500 como si fuera la aplicación. |

### 6.6 ¿Por qué no cachear la API?

Porque un `GET /api/reports` cacheado podría devolver datos obsoletos y dar una falsa sensación de sincronización. La app ya tiene su propia copia local y su cola. Mezclar caché HTTP con estado de negocio complicaría la resolución de conflictos.

### 6.7 ¿Por qué lotes de 50?

El servidor acepta hasta 200. El cliente usa 50 para limitar el tamaño de la petición, facilitar el progreso y no bloquear una red móvil lenta. El número es configurable en `SYNC_BATCH_SIZE`.

### 6.8 ¿Cómo se resuelven los conflictos?

Last-write-wins por `updatedAt`:

- Si el UUID no existe → `created`.
- Si existe y el entrante es más nuevo → `updated`.
- Si existe y el entrante no es más nuevo → `duplicate` (se conserva el servidor).
- Si el folio pertenece a otro UUID → `rejected`.

Es suficiente para un técnico por reporte. No hay fusión por campo ni relojes vectoriales; se documenta como limitación.

### 6.9 ¿Por qué SQLite?

Cero configuración, transacciones ACID, WAL, migraciones simples y un archivo fácil de respaldar. Para una sola instancia y el volumen académico es adecuado. Para escalado horizontal habría que migrar a PostgreSQL, porque SQLite no soporta múltiples escritores distribuidos.

### 6.10 ¿Cómo se protege la API?

- CORS por lista explícita.
- Validación y normalización de todos los campos.
- SQL parametrizado.
- Límite de 1 MB en el cuerpo JSON.
- Cabeceras `nosniff`, `DENY`, `no-referrer` y HSTS en producción.
- `x-powered-by` deshabilitado.
- Errores sin stack en producción.

**Lo que falta:** autenticación y autorización. Es una exclusión consciente del alcance, no un olvido. Un despliegue real debe añadir API key/OAuth y permisos por técnico.

### 6.11 ¿Cómo se garantiza que no se pierde un reporte?

No se puede garantizar al 100 % en un navegador: el sistema puede desalojar IndexedDB bajo presión extrema o el usuario puede borrar los datos. Lo que sí se hace:

1. Guardar local antes de la red.
2. Persistir la cola con metadatos de reintento.
3. Solicitar almacenamiento persistente.
4. Exportar JSON como respaldo.
5. Reintentar al iniciar, reconectar, volver a primer plano y por intervalo.
6. Usar Background Sync cuando está disponible.

La garantía es **de diseño y de mitigación**, no absoluta.

### 6.12 ¿Qué pasa si el usuario cierra la pestaña durante la sincronización?

El reporte ya está en IndexedDB. Si la petición no llegó a completarse, el estado sigue siendo `pending` o vuelve a ser candidato. Al abrir la app se reintenta. Si el navegador ejecuta Background Sync, el Service Worker puede completar el envío; si no, se resuelve al volver a abrir. No hay pérdida por cerrar la pestaña, salvo que el guardado local no haya terminado.

---

## 7. Preguntas probables y respuestas

### 7.1 “¿Esto funciona sin Internet de verdad?”

Sí, después de la primera visita. El shell se precachea y los reportes viven en IndexedDB. Se verificó con el servidor de preview detenido y con recarga completa: la app cargó desde caché y el reporte persistió. La instalación en dispositivos físicos sigue pendiente y se declara así.

### 7.2 “¿Qué pasa si nunca abrió la app con Internet?”

No hay shell cacheado ni Service Worker registrado; no se puede abrir offline. Es una limitación inherente a las PWA. La app no puede instalarse a sí misma sin una primera carga.

### 7.3 “¿Por qué no usaron Firebase o una base de datos en la nube?”

Porque el requisito era Express + SQLite y porque el objetivo es demostrar el control del stack completo. Firebase habría resuelto la sincronización, pero habría ocultado las decisiones de idempotencia, cola y conflicto que son el núcleo del proyecto.

### 7.4 “¿Cómo evitan duplicados si el usuario pulsa Sincronizar varias veces?”

Con el UUID. El cliente reutiliza el mismo `id` en cada intento. El servidor consulta antes de insertar y devuelve `duplicate`. Se probó con dos envíos consecutivos: el total del servidor permaneció en 3.

### 7.5 “¿Qué pasa si dos técnicos crean el mismo folio?”

El servidor tiene `UNIQUE(folio)`. El segundo se rechaza con `FOLIO_CONFLICT` y no se sobrescribe. El cliente lo marca como error permanente para que el usuario lo revise.

### 7.6 “¿Qué pasa si el servidor tiene una versión más nueva que el dispositivo?”

El servidor compara `updatedAt`. Si el entrante no es más reciente, responde `duplicate` y conserva su versión. Es last-write-wins. No hay merge por campo; es una limitación documentada.

### 7.7 “¿Background Sync está garantizado?”

No. Es una mejora progresiva. Safari/iOS no lo soporta y el navegador decide cuándo ejecutarlo. Por eso la app sincroniza al iniciar, al reconectar, al volver a primer plano, por intervalo y manualmente. La ejecución real con la app cerrada está pendiente de prueba física.

### 7.8 “¿Por qué el Service Worker está desactivado en desarrollo?”

Para evitar que el HMR sirva versiones cacheadas y provoque confusión. La PWA real se prueba con `npm run build` y `npm run preview`. Se puede activar con `VITE_ENABLE_SW=true`, pero no es el flujo recomendado.

### 7.9 “¿Cómo actualizan el Service Worker?”

Cada build inyecta un `BUILD_ID` y la lista de assets hashed en `dist/sw.js`. Al activarse, se eliminan las cachés `techservice-*` que no pertenecen al build actual. En Ajustes hay un botón para buscar actualización. Si el navegador mantiene una pestaña antigua, se cierra y se vuelve a abrir.

### 7.10 “¿Por qué la app no muestra los reportes del servidor?”

Porque el historial se alimenta de IndexedDB. El servidor es el destino de la sincronización, no la fuente de lectura. Esto permite offline puro y evita mezclar datos locales con remotos. La contrapartida es que borrar los datos locales oculta los reportes sincronizados, aunque permanezcan en SQLite. Se documenta como limitación y trabajo futuro.

### 7.11 “¿Qué pasa si se llena el almacenamiento?”

Dexie lanza `QuotaExceededError`. El formulario muestra un mensaje específico y no guarda el reporte. La app no borra datos automáticamente. El usuario debe liberar espacio o exportar y limpiar. La prueba de cuota llena está pendiente porque es difícil de reproducir de forma fiable.

### 7.12 “¿La app es accesible?”

Se trabajó con landmarks, etiquetas, foco visible, contraste y controles nativos. Lighthouse dio 100 en accesibilidad en historial, panel y ajustes. Falta la prueba con lector de pantalla (NVDA/VoiceOver/TalkBack), que se declara pendiente.

### 7.13 “¿Cuál es el rendimiento?”

No se midió Performance con throttling móvil. La herramienta Lighthouse integrada sólo ejecutó Accesibilidad, Buenas prácticas y SEO. El bundle de producción ronda los 462 kB sin comprimir y 141 kB gzip, con CSS de 53 kB / 11 kB gzip. No se afirma una puntuación de rendimiento que no se ejecutó.

### 7.14 “¿Por qué React y Vite?”

React permite componentizar la UI y manejar estado derivado con hooks. Vite ofrece un build rápido, code splitting y un plugin sencillo para inyectar el precache en el Service Worker. React Router resuelve las rutas de la SPA. Lucide aporta iconos accesibles y consistentes.

### 7.15 “¿Por qué no hay login?”

No formaba parte del alcance. Se documenta como riesgo: cualquiera con la URL puede leer o escribir. Antes de un uso real se requiere autenticación, autorización por técnico, HTTPS obligatorio y auditoría. La aplicación ya aplica validación y CORS, pero eso no sustituye la autenticación.

### 7.16 “¿Qué pasa si la API devuelve 500?”

El Service Worker no cachea la respuesta. El cliente la trata como fallo transitorio, incrementa `retryCount` y aplica backoff. Tras 5 intentos automáticos queda en error y el usuario puede reintentar manualmente.

### 7.17 “¿Cómo sé que el reporte llegó al servidor?”

El estado local cambia a **Sincronizado** sólo cuando la respuesta del servidor confirma el UUID. Además se guarda `syncedAt` y `serverUpdatedAt`. En el detalle se muestran ambos. La API también permite verificar con `GET /api/reports/:id`.

### 7.18 “¿Qué pasa si se cae el servidor justo después de guardar localmente?”

El reporte queda pendiente. Al volver la API, el cliente reintenta. El UUID evita duplicados si la primera petición sí llegó pero la respuesta se perdió.

### 7.19 “¿Qué mejorarían con dos semanas más?”

Prioridades realistas:

1. Autenticación y roles.
2. Descarga/restauración del historial desde el servidor.
3. Edición de reportes en la interfaz.
4. Pruebas E2E automatizadas con Playwright.
5. Pruebas físicas Android/iOS y de lectores de pantalla.
6. Auditoría de rendimiento con throttling.
7. Adjuntos con compresión y cola de subida.
8. Migración a PostgreSQL si se requiere más de una instancia.

### 7.20 “¿Qué fue lo más difícil?”

La sincronización sin duplicados y la consistencia entre tres capas de estado: IndexedDB, cola de sincronización y SQLite. También el fallback offline ante un 502 del proxy: la primera versión mostraba la pantalla de error porque el Service Worker aceptaba cualquier respuesta de red. Se corrigió para exigir `response.ok` y recurrir al shell cacheado.

### 7.21 “¿Qué error encontraron durante el desarrollo?”

Una prueba de `normalizeText` falló porque la función no colapsaba espacios internos. Se corrigió a `replace(/\s+/g, ' ')`. Es un ejemplo de prueba que guió una mejora real, no un test escrito después para aprobar.

### 7.22 “¿Cómo se despliega?”

Frontend estático en Vercel o Netlify con `frontend` como root, `npm run build` y `dist`. Backend en Render o Docker con un disco persistente para SQLite y `CORS_ORIGINS` apuntando al dominio del frontend. La URL de la API se configura con `VITE_API_URL` o desde Ajustes. Los archivos `vercel.json`, `netlify.toml`, `render.yaml` y `Dockerfile` ya están incluidos.

### 7.23 “¿Por qué SQLite y no un archivo JSON?”

SQLite ofrece transacciones, índices, restricciones de unicidad, migraciones y consultas concurrentes de lectura con WAL. Un JSON requeriría reescribir todo el archivo y no tendría integridad referencial ni bloqueos seguros.

### 7.24 “¿La app funciona en Firefox o Safari?”

El código usa APIs estándar y tiene rutas de respaldo, pero la matriz de navegadores no se ejecutó. Safari/iOS no soporta Background Sync y tiene particularidades de almacenamiento e instalación. Se declara pendiente; no se afirma compatibilidad total.

---

## 8. Riesgos, limitaciones y cómo presentarlos

Nunca ocultes una limitación. Preséntala con su impacto y su mitigación.

| Limitación | Impacto | Mitigación actual | Trabajo futuro |
| --- | --- | --- | --- |
| Sin autenticación | Cualquiera con la URL puede leer/escribir. | CORS, validación, despliegue controlado. | OAuth/API key y roles. |
| Una sola instancia SQLite | No escala horizontalmente. | WAL y una instancia. | PostgreSQL. |
| Last-write-wins | No fusiona cambios por campo. | `updatedAt` y deduplicación. | Merge por campo o CRDT. |
| Sin edición en UI | Corregir un rechazo requiere API. | Mensaje de error y reintento. | Formulario de edición. |
| Historial sólo local | No ve reportes de otro dispositivo. | Exportación JSON. | Descarga desde servidor. |
| Background Sync no garantizado | Puede no ejecutarse con app cerrada. | Disparadores en primer plano. | Ninguna garantía posible; es del navegador. |
| Almacenamiento desalojable | Riesgo extremo de pérdida local. | `persist()` y exportación. | Respaldo automático. |
| Sin pruebas físicas | No se validó instalación real. | Documentación de pasos. | Matriz Android/iOS. |
| Sin Performance | No hay puntuación de rendimiento. | Bundle moderado y gzip. | Lighthouse móvil/PageSpeed. |
| Sin lector de pantalla | Accesibilidad no validada por usuarios. | Semántica y contraste. | NVDA/VoiceOver/TalkBack. |

**Frase útil:**

> “No es un producto listo para producción sin autenticación y sin pruebas físicas. Es un proyecto académico completo en su alcance, con las brechas identificadas y unplan claro para cerrarlas.”

---

## 9. Planes de contingencia en vivo

### 9.1 La API no responde

**Síntoma:** Ajustes muestra “No se pudo contactar al servidor”.

**Plan:**

1. Verifica que el backend esté encendido.
2. Comprueba `http://localhost:4000/api/health`.
3. Revisa `CORS_ORIGINS`.
4. Si no se recupera, continúa con la demo offline: sigue siendo válida y demuestra la propuesta principal.

### 9.2 El Service Worker no controla la página

**Síntoma:** Ajustes muestra “Controlando la página: No”.

**Plan:**

1. Recarga una vez.
2. Cierra y abre la pestaña.
3. **Ajustes → Buscar actualización del SW**.
4. DevTools → Application → Service Workers → Update.
5. Si persiste, usa un perfil limpio y abre de nuevo.

### 9.3 El modo offline muestra un error de proxy

**Causa:** la respuesta 502 se sirvió antes de que el shell estuviera cacheado o la pestaña no estaba controlada.

**Plan:**

1. Vuelve a online.
2. Recarga y confirma el control del SW.
3. Repite el modo offline.
4. Si el tiempo apremia, muestra el reporte offline ya creado y explica el fallback con la evidencia documentada.

### 9.4 No aparece el botón de instalación

**Plan:**

1. No intentes forzar el diálogo nativo.
2. Muestra **Ajustes → Instalación de la PWA** con las instrucciones.
3. Explica los criterios: HTTPS/localhost, manifest válido, iconos 192/512, Service Worker y modo standalone.
4. Aclara que la instalación física está pendiente.

### 9.5 Se borraron los datos de demostración

**Plan:**

1. Crea un reporte nuevo en 30 segundos.
2. Si no hay tiempo, muestra el estado vacío y explica que es intencional.
3. Usa el respaldo JSON exportado, si existe, para reenviar por API.

### 9.6 El proyector o la ventana no permiten leer

**Plan:**

- Aumenta el zoom del navegador al 125 %.
- Usa el modo de pantalla completa.
- Prioriza el detalle y los badges sobre la tabla completa.
- Ten a mano la ruta corta de 8 minutos.

### 9.7 Una pregunta no se puede responder

**Respuesta recomendada:**

> “No medí ese punto, así que no voy a afirmar un resultado. Está registrado como pendiente en la documentación, con el procedimiento para verificarlo.”

Es mejor que improvisar una cifra o una garantía falsa.

---

## 10. Evidencia que conviene tener a mano

### 10.1 Resultados reales

| Evidencia | Resultado |
| --- | --- |
| Pruebas backend | 10/10 |
| Pruebas frontend | 18/18 |
| Build de producción | Correcto; precache inyectado |
| Lighthouse historial | 100 accesibilidad / 100 buenas prácticas / 100 SEO |
| Lighthouse panel | 100 / 100 / 100 |
| Lighthouse ajustes | 100 / 100 / 100 |
| Reporte online | `TS-20261105-132818W9` |
| Reporte offline | `TS-20261105-133221QD` |
| Persistencia offline | Confirmada tras recarga |
| Duplicados | 3 → 3, ambos envíos `duplicate` |
| Borrado | `DELETE` 200, `GET` posterior 404 |

### 10.2 Archivos clave para abrir si preguntan

| Tema | Archivo |
| --- | --- |
| Service Worker | `frontend/public/sw.js` |
| Registro y mensajes del SW | `frontend/src/services/pwa.js` |
| Orquestación de sync | `frontend/src/context/SyncContext.jsx` |
| Cola y reintentos | `frontend/src/services/syncService.js` |
| Esquema IndexedDB | `frontend/src/database/db.js` |
| Folio, UUID y estados | `frontend/src/database/reportRepository.js` |
| API cliente | `frontend/src/services/api.js` |
| Validación cliente | `frontend/src/utils/validation.js` |
| Rutas backend | `backend/src/routes/` |
| Idempotencia y sync | `backend/src/services/reportService.js` |
| SQL y mapeo | `backend/src/database/reportRepository.js` |
| Validación servidor | `backend/src/validation/reportValidation.js` |
| Errores | `backend/src/middleware/errorHandler.js` |
| Pruebas backend | `backend/test/api.test.js` |
| Pruebas frontend | `frontend/tests/` |
| Pruebas y auditoría | `docs/05-pruebas-auditoria.md` |

### 10.3 Comandos para reproducir

```bash
# Backend
cd backend
npm test
npm run dev

# Frontend
cd ../frontend
npm test
npm run build
npm run preview
```

---

## 11. Frases que se deben evitar

| No decir | Por qué | Decir en su lugar |
| --- | --- | --- |
| “Funciona en todos los navegadores.” | No se ejecutó la matriz. | “Usa APIs estándar; la matriz completa está pendiente.” |
| “Está probado en Android e iOS.” | No se probó en hardware. | “La instalación física está pendiente; el flujo web sí se verificó.” |
| “El Service Worker guarda los reportes.” | Es incorrecto. | “IndexedDB guarda los reportes; el SW cachea el shell.” |
| “Background Sync garantiza el envío.” | No es garantía. | “Es una mejora progresiva; la app no depende de ella.” |
| “Lighthouse 100 en todo.” | Performance no se ejecutó. | “100 en accesibilidad, buenas prácticas y SEO; Performance pendiente.” |
| “Es seguro.” | No hay autenticación. | “Aplica validación, CORS y cabeceras; falta autenticación.” |
| “Nunca se pierde un dato.” | Ningún navegador lo garantiza. | “Se mitiga con guardado local, persistencia, reintentos y exportación.” |
| “La app descarga el historial del servidor.” | No existe esa función. | “El historial es local; el servidor recibe la sincronización.” |

---

## 12. Cierre sugerido

> “TechService PWA demuestra que una aplicación web puede sostener el flujo crítico de captura sin red, sin sacrificar validación ni consistencia. La combinación de IndexedDB, Service Worker, UUID idempotente y una cola con reintentos convierte el offline en una propiedad estructural. El proyecto entrega código, pruebas, documentación y despliegue; también declara con precisión qué falta: autenticación, pruebas físicas, matriz de navegadores y auditoría de rendimiento. Esas brechas no invalidan el trabajo: delimitan el siguiente paso.”

---

## 13. Anexo: preguntas de autoevaluación

Antes de la defensa, responde sin mirar:

1. ¿Dónde se guarda un reporte antes de sincronizarse?
2. ¿Qué estrategia usa la navegación y por qué?
3. ¿Qué recursos nunca se cachean?
4. ¿Cómo se evita un duplicado si se reintenta el envío?
5. ¿Qué diferencia hay entre `pending`, `synced` y `error`?
6. ¿Qué ocurre tras 5 fallos automáticos?
7. ¿Por qué el folio se genera en el cliente?
8. ¿Qué pasa si el folio ya existe con otro UUID?
9. ¿Qué hace `activate` con las cachés antiguas?
10. ¿Por qué el SW está desactivado en desarrollo?
11. ¿Qué limitación tiene Background Sync en iOS?
12. ¿Por qué el historial no consulta al servidor?
13. ¿Qué pasa al borrar datos locales con reportes sincronizados?
14. ¿Qué se exporta en el JSON?
15. ¿Cuáles son las tres pruebas que siguen pendientes y por qué?

Si alguna respuesta no es clara, vuelve a [`01-arquitectura.md`](01-arquitectura.md) y [`05-pruebas-auditoria.md`](05-pruebas-auditoria.md). La defensa debe apoyarse en evidencia, no en memoria.
