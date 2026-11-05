# 05 · Pruebas y auditoría

**Proyecto:** TechService PWA  
**Fecha de ejecución:** 5 de noviembre de 2026  
**Entorno:** Windows · Node.js 24.21.0 · npm 11.19.0 · Chromium de escritorio · backend en `localhost:4000` · frontend de producción en `localhost:4173`

> Este documento registra únicamente resultados ejecutados. Las pruebas que requieren dispositivos físicos, hardware o herramientas no disponibles se marcan como **pendientes** y no se presentan como aprobadas.

---

## 1. Estrategia de pruebas

La estrategia combina cuatro niveles:

| Nivel | Herramienta | Qué cubre |
| --- | --- | --- |
| Unitarias de frontend | `node:test` | Validación, formato, UUID, catálogos. |
| Integración de backend | `node:test` + SQLite temporal | Endpoints, idempotencia, validación, CORS, errores. |
| Build de producción | Vite | Compilación, hashing, inyección de precache. |
| E2E manual asistido por navegador | Chromium + API real | Alta, sincronización, offline, filtros, detalle, ajustes, borrado. |
| Auditoría | Lighthouse integrado | Accesibilidad, buenas prácticas y SEO. |

### Cobertura y límites

- Los tests automatizados **no montan componentes React** (no se usa jsdom/Testing Library). La UI se validó con pruebas E2E en navegador.
- El backend se prueba contra SQLite temporal, no contra la base de desarrollo.
- Las pruebas E2E se ejecutaron en Chromium de escritorio; no sustituyen una matriz de dispositivos.
- No se inventaron credenciales, URLs, capturas ni puntuaciones.

---

## 2. Pruebas automatizadas del backend

Comando:

```bash
cd backend
npm test
```

Resultado real:

```text
tests 10
pass 10
fail 0
duration_ms 710.8478
```

| # | Prueba | Resultado |
| --- | --- | --- |
| 1 | `GET /api/health` responde con estado ok | ✅ |
| 2 | `POST /api/reports` crea un reporte y `GET /:id` lo recupera | ✅ |
| 3 | `POST /api/reports` es idempotente con el mismo UUID | ✅ |
| 4 | `POST /api/reports` valida campos obligatorios | ✅ |
| 5 | `POST /api/reports/sync` procesa lotes e informa duplicados y rechazos | ✅ |
| 6 | `PUT /api/reports/:id` actualiza campos y rechaza datos inválidos | ✅ |
| 7 | `POST /api/reports` rechaza folio duplicado con otro UUID | ✅ |
| 8 | `DELETE /api/reports/:id` elimina y luego responde 404 | ✅ |
| 9 | CORS permite el origen configurado y bloquea otros | ✅ |
| 10 | Rutas inexistentes devuelven JSON consistente | ✅ |

### Evidencia de códigos HTTP observados

```text
GET  /api/health              → 200
POST /api/reports             → 201 (nuevo)
POST /api/reports             → 200 (duplicado por UUID)
POST /api/reports             → 422 (validación)
POST /api/reports/sync        → 200
PUT  /api/reports/:id         → 200
PUT  /api/reports/:id         → 422 (datos inválidos)
POST /api/reports             → 409 (folio duplicado con otro UUID)
DELETE /api/reports/:id       → 200
GET  /api/reports/:id         → 404 (tras borrar)
GET  /api/no-existe           → 404 (JSON consistente)
```

---

## 3. Pruebas automatizadas del frontend

Comando:

```bash
cd frontend
npm test
```

Resultado real:

```text
tests 18
pass 18
fail 0
duration_ms 162.1687
```

| # | Prueba | Resultado |
| --- | --- | --- |
| 1 | Los catálogos contienen los valores acordados con la API | ✅ |
| 2 | Los helpers devuelven la etiqueta en español | ✅ |
| 3 | Los helpers conservan el valor original como fallback | ✅ |
| 4 | `normalizeText` elimina acentos, mayúsculas y espacios extremos | ✅ |
| 5 | `initials` genera iniciales para nombres de una o varias palabras | ✅ |
| 6 | `formatBytes` usa unidades legibles y valores límite | ✅ |
| 7 | `formatNumber` usa separadores de la configuración `es-MX` | ✅ |
| 8 | `formatDate` devuelve un guion para valores inválidos | ✅ |
| 9 | `createUuid` genera un UUID v4 válido | ✅ |
| 10 | `createUuid` no repite identificadores en una muestra amplia | ✅ |
| 11 | `normalizeReportValues` recorta espacios de todos los campos de texto | ✅ |
| 12 | Un reporte completo y válido no produce errores | ✅ |
| 13 | Detecta todos los campos obligatorios vacíos | ✅ |
| 14 | `validatePhone` acepta entre 7 y 15 dígitos e ignora separadores | ✅ |
| 15 | Rechaza teléfonos con menos de 7 dígitos | ✅ |
| 16 | Rechaza enums desconocidos de servicio, prioridad y estado | ✅ |
| 17 | Valida longitudes máximas de los textos opcionales | ✅ |
| 18 | Permite los textos opcionales vacíos | ✅ |

**Hallazgo durante el desarrollo:** una prueba de `normalizeText` falló al inicio porque la función sólo recortaba espacios extremos y no colapsaba espacios internos. Se corrigió a `replace(/\s+/g, ' ')`. Este es un ejemplo real de una prueba que guió una mejora de comportamiento.

---

## 4. Build de producción

Comando:

```bash
cd frontend
npm run build
```

Resultado real del build de verificación final (rebuild posterior a la documentación):

```text
dist/index.html                   1.78 kB │ gzip: 0.76 kB
dist/assets/index-DOE13QlC.css   52.58 kB │ gzip: 10.88 kB
dist/assets/index-Bso7a3yV.js   461.93 kB │ gzip: 140.83 kB
[sw-precache] Build mw3ymrcx: 2 assets inyectados en dist/sw.js
```

El build auditado con Lighthouse fue `mw3y8egd`. El rebuild posterior sólo añadió los documentos 06 y 07; los hashes de los assets no cambiaron (`index-Bso7a3yV.js` e `index-DOE13QlC.css`), por lo que la interfaz auditada es la misma. El `BUILD_ID` cambia en cada build; la lista de precache se mantiene estable mientras no cambie el código del frontend.

Verificaciones:

- `dist/sw.js` contiene el `BUILD_ID` generado.
- La lista `BUILD_PRECACHE` contiene los assets hashed.
- `dist/robots.txt` existe.
- El manifest y los iconos se copian a `dist`.
- No hay errores de compilación.

---

## 5. Pruebas E2E en navegador (producción)

Las pruebas se ejecutaron con `vite preview` en `http://localhost:4173` y la API real en `http://localhost:4000`.

### 5.1 Carga inicial y Service Worker

| Verificación | Resultado |
| --- | --- |
| La app carga en producción | ✅ |
| Título y metadatos correctos | ✅ |
| Sin errores de consola | ✅ |
| Service Worker registrado, activo y controlando | ✅ |
| Manifest e iconos disponibles | ✅ |
| Cachés creadas | ✅ `techservice-shell-*`, `techservice-runtime-*`, `techservice-config` |

### 5.2 Alta en línea y sincronización automática

| Dato | Valor |
| --- | --- |
| Cliente | María González |
| Folio | `TS-20261105-132818W9` |
| UUID | `27e0d6fc-8262-4ed3-ac03-7e36b7a267ec` |
| Estado local final | `synced` |
| `syncedAt` local | `2026-11-05T19:28:19.017Z` |
| Confirmación del backend | `GET /api/reports/:id` → 200 con el mismo UUID y folio |

**Resultado:** ✅ El reporte se guardó en IndexedDB y se sincronizó automáticamente sin intervención manual.

### 5.3 Alta sin conexión, persistencia y reconexión

Procedimiento:

1. Detener el servidor de preview (la API siguió activa).
2. Recargar la app: el shell se sirvió desde caché.
3. Crear un reporte sin red.
4. Recargar completamente.
5. Reiniciar el preview y esperar la sincronización.

| Dato | Valor |
| --- | --- |
| Cliente | Cliente Offline Prueba |
| Folio | `TS-20261105-133221QD` |
| UUID | `509c6a22-40d7-4980-bf5c-636337e182dc` |
| Estado inicial | `pending` |
| Persistencia tras recarga | ✅ Visible en IndexedDB y en el historial |
| Sincronización al reconectar | ✅ `syncedAt = 2026-11-05T19:33:23.852Z` |
| Confirmación del backend | ✅ Registro recuperable por UUID |

**Resultado:** ✅ La app cargó offline con **cero errores de consola**; el reporte sobrevivió a una recarga completa y se sincronizó al recuperar la conexión.

**Observación adicional:** en una prueba intermedia, la reconexión ocurrió antes de que el backend estuviera listo. El cliente aplicó reintentos y el reporte terminó sincronizado. Esto valida el backoff y la tolerancia a fallos transitorios.

### 5.4 Historial: búsqueda y filtros

Datos de partida: 2 reportes, ambos sincronizados.

| Acción | Resultado observado |
| --- | --- |
| Sin filtros | `2 de 2 reportes` |
| Buscar `maría` | `1 de 2 reportes` |
| Buscar `zzz-no-existe` | `0 de 2 reportes` + estado vacío |
| Servicio `correctivo` | `0 de 2 reportes` |
| Prioridad `urgente` | `1 de 2 reportes` |
| Estado `cerrado` | `0 de 2 reportes` |
| Sincronización `pending` | `0 de 2 reportes` |
| Sincronización `synced` | `2 de 2 reportes` |
| “Limpiar” | Vuelve a `2 de 2` y desaparece el indicador de filtros |

**Resultado:** ✅ Búsqueda normalizada (acentos/mayúsculas) y filtros combinables funcionando.

### 5.5 Detalle del reporte

| Verificación | Resultado |
| --- | --- |
| Título `Reporte TS-...` | ✅ |
| Badges de sincronización, prioridad y estado | ✅ |
| Secciones: cliente, servicio, detalle técnico, materiales, observaciones | ✅ |
| Trazabilidad: creado, modificado, sincronizado, servidor, UUID | ✅ |
| Botón Imprimir | ✅ Presente; abre `window.print()` |
| Botón Eliminar | ✅ Presente |

### 5.6 Ajustes y diagnóstico

| Verificación | Resultado observado |
| --- | --- |
| Salud de la API | `Servidor disponible`, versión 1.0.0, entorno development, base `ok` |
| Service Worker | Soportado, registrado, activo, controlando |
| Scope | `http://localhost:4173/` |
| Cachés | `techservice-config`, `techservice-shell-*`, `techservice-runtime-*` |
| Almacenamiento | ~2.0 MB de ~2.2 GB (valores del navegador) |
| Contadores | 2 totales, 0 pendientes, 2 sincronizados, 0 con error |
| URL de API | `/api`, configurable y persistida |
| Instalación | Instrucciones Android/iOS visibles |

### 5.7 Sincronización manual sin pendientes

| Acción | Resultado |
| --- | --- |
| Pulsar “Sincronizar” sin reportes pendientes | Toast “Todo al día · No hay reportes pendientes de sincronización.” |
| `lastSyncAt` | Se actualizó tras verificar la salud de la API |

### 5.8 Idempotencia y duplicados con API real

Se reenvió dos veces el mismo reporte mediante `POST /api/reports/sync`:

| Intento | Resultado | Total en servidor |
| --- | --- | --- |
| Antes | — | 3 |
| Primer envío | `duplicate` | 3 |
| Segundo envío | `duplicate` | 3 |

**Resultado:** ✅ No se crearon registros adicionales. El servidor devolvió `200` con `summary.duplicates: 1` en ambos casos.

### 5.9 Actualización (PUT)

Se actualizaron `status` y `notes` del reporte de prueba:

```http
PUT /api/reports/a1a8d11f-94e9-4a47-aa00-a72e64ce5a93
Content-Type: application/json

{ "status": "resuelto", "notes": "Actualizado por prueba PUT" }
```

Resultado: `200`; `GET` posterior confirmó `status: resuelto` y la nota actualizada. `PUT` con datos inválidos devuelve `422` (cubierto también por el test automatizado).

### 5.10 Eliminación desde la interfaz

Se creó un reporte temporal (`TS-20261105-133600GW`, UUID `a1a8d11f-94e9-4a47-aa00-a72e64ce5a93`), se sincronizó y se eliminó desde el detalle:

| Verificación | Resultado |
| --- | --- |
| Diálogo de confirmación | ✅ “Eliminar del servidor” |
| Redirección al historial | ✅ `/reports` |
| `DELETE /api/reports/:id` | ✅ 200 |
| `GET` posterior | ✅ 404 |
| Total local | ✅ Volvió a 2 |
| Total en servidor | ✅ Volvió a 2 |
| Toast | ✅ “Se eliminó del servidor y de este dispositivo.” |

**Resultado:** ✅ El borrado es consistente entre IndexedDB y SQLite. Si el reporte ya está sincronizado y no hay red, la interfaz bloquea el borrado para no dejar el servidor con un registro huérfano.

---

## 6. Auditoría Lighthouse

Herramienta: `browser.lighthouse` del navegador integrado. Audita **Accesibilidad, Buenas prácticas y SEO**. No ejecuta la categoría **Performance** ni emula un dispositivo móvil.

### 6.1 Primera auditoría (historial)

| Categoría | Puntuación |
| --- | --- |
| Accesibilidad | 96 |
| Buenas prácticas | 100 |
| SEO | 80 |

Fallos:

1. **Contraste insuficiente** en `.table-sub`: `#94A3B8` sobre blanco = 2.56:1; se exige 4.5:1.
2. **`robots.txt` no válido**: el servidor SPA devolvía `index.html` para `/robots.txt`.

### 6.2 Correcciones aplicadas

- Se añadió `frontend/public/robots.txt` con `User-agent: *` y `Allow: /`.
- Se ajustaron los tokens de texto secundario:
  - `--muted: #5F6F84`
  - `--muted-light: #5F6F84`
- Se verificó el contraste en fondos `#FFFFFF`, `#F8FAFC` y `#F1F5F9` (≥ 4.5:1).

### 6.3 Auditoría final (build corregido)

| Pantalla | Accesibilidad | Buenas prácticas | SEO |
| --- | --- | --- | --- |
| Historial (`/reports`) | **100** | **100** | **100** |
| Panel (`/`) | **100** | **100** | **100** |
| Ajustes (`/settings`) | **100** | **100** | **100** |

Fallos restantes: **ninguno** en las tres pantallas.

> Estas puntuaciones corresponden a Lighthouse en escritorio, servidor local, sin throttling. No equivalen a una auditoría de rendimiento móvil ni a PageSpeed Insights.

---

## 7. Matriz resumida de resultados

| Área | Prueba | Resultado |
| --- | --- | --- |
| Backend | 10 pruebas de integración | ✅ 10/10 |
| Frontend | 18 pruebas unitarias | ✅ 18/18 |
| Build | Compilación y precache | ✅ |
| PWA | Registro y control del SW | ✅ |
| PWA | Estrategias de caché | ✅ |
| Offline | Carga del shell sin red | ✅ |
| Offline | Persistencia en IndexedDB | ✅ |
| Offline | Sincronización al reconectar | ✅ |
| Sync | Idempotencia por UUID | ✅ |
| Sync | Prevención de duplicados | ✅ |
| API | CRUD completo | ✅ |
| API | Validación y errores consistentes | ✅ |
| UI | Búsqueda y filtros | ✅ |
| UI | Detalle, impresión y borrado | ✅ |
| UI | Ajustes y diagnóstico | ✅ |
| Accesibilidad | Lighthouse | ✅ 100 en pantallas auditadas |
| SEO | Lighthouse | ✅ 100 en pantallas auditadas |
| Rendimiento | Lighthouse Performance | ⏳ No ejecutado |
| Instalación | Android físico | ⏳ Pendiente |
| Instalación | iOS físico | ⏳ Pendiente |
| Background Sync | App cerrada | ⏳ Pendiente |

---

## 8. Pruebas pendientes y justificación

| Prueba | Por qué no se ejecutó | Cómo realizarla |
| --- | --- | --- |
| Instalación en Android | Requiere dispositivo físico. | Abrir el sitio HTTPS en Chrome Android → Instalar. Verificar standalone e iconos. |
| Instalación en iOS | Requiere iPhone/iPad. | Safari → Compartir → Añadir a pantalla de inicio. |
| Background Sync con app cerrada | Depende del navegador/SO y de un dispositivo real. | Crear reporte offline, cerrar la app, reconectar y comprobar el envío. |
| Persistencia tras cerrar el proceso del navegador | La prueba automatizada cubrió recarga, no cierre total. | Crear reporte offline, cerrar Chrome, reabrir y verificar IndexedDB. |
| Rendimiento con throttling móvil | La herramienta Lighthouse integrada no ejecuta Performance. | Chrome DevTools → Lighthouse → Performance, modo móvil. |
| Navegadores Firefox/Safari | No disponibles en el entorno de prueba. | Ejecutar la checklist en cada navegador. |
| Lector de pantalla | Requiere software y revisión manual. | NVDA (Windows), VoiceOver (iOS/macOS), TalkBack (Android). |
| Concurrencia multi-pestaña | No se probó con dos pestañas simultáneas. | Abrir dos pestañas, crear en ambas y verificar el estado del SW y de la cola. |
| Volumen alto | No se probaron miles de reportes. | Sembrar datos y medir listado, filtros y sincronización por lotes. |
| Recuperación ante cuota llena | Difícil de reproducir de forma fiable. | Llenar el almacenamiento del origen y verificar el mensaje `QuotaExceededError`. |

---

## 9. Reproducir las pruebas

```bash
# 1. Backend
cd backend
npm test

# 2. Frontend
cd ../frontend
npm test

# 3. Build de producción
npm run build

# 4. Servir la PWA
npm run preview
```

Para las pruebas E2E:

1. Abrir `http://localhost:4173`.
2. Verificar en DevTools → Application el manifest, el Service Worker y las cachés.
3. Crear un reporte en línea y confirmar el estado `Sincronizado`.
4. Detener `vite preview` (mantener la API) y recargar.
5. Crear un reporte offline; recargar; verificar persistencia.
6. Reiniciar el preview; esperar la sincronización.
7. Reenviar el mismo lote por API y comprobar `duplicate`.
8. Ejecutar Lighthouse en `/`, `/reports` y `/settings`.

---

## 10. Conclusión

Las pruebas automatizadas (28 en total) y las pruebas E2E en Chromium confirman los comportamientos centrales: persistencia offline, sincronización automática, idempotencia y CRUD completo. La auditoría Lighthouse final alcanzó 100 en accesibilidad, buenas prácticas y SEO en las pantallas auditadas. Las casillas pendientes son honestas: requieren hardware físico, otros navegadores o la categoría de rendimiento, y se documentan con su procedimiento para que puedan completarse antes de una defensa o despliegue real.
