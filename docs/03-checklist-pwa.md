# 03 · Checklist PWA

**Proyecto:** TechService PWA  
**Fecha de verificación:** 5 de noviembre de 2026  
**Entorno de verificación:** build de producción (`vite build` + `vite preview`, puerto 4173) y Chromium de escritorio.

Leyenda:

- ✅ **Verificado:** se ejecutó y se obtuvo evidencia en este proyecto.
- 🟡 **Parcial:** implementado, pero depende del navegador o no se probó en todas las plataformas.
- ⏳ **Pendiente:** no se ha ejecutado; no debe afirmarse como completado.
- ❌ **No aplica / fuera de alcance.**

---

## 1. Manifest

| # | Requisito | Estado | Evidencia / observación |
| --- | --- | --- | --- |
| 1.1 | `manifest.webmanifest` enlazado desde `index.html` | ✅ | `<link rel="manifest" href="/manifest.webmanifest" />`. |
| 1.2 | `name` y `short_name` | ✅ | “TechService PWA” / “TechService”. |
| 1.3 | `start_url` y `scope` | ✅ | Ambos `/`. |
| 1.4 | `display: standalone` | ✅ | Incluye `display_override` con `standalone`, `minimal-ui`, `browser`. |
| 1.5 | `theme_color` y `background_color` | ✅ | `#17324D` y `#F8FAFC`. |
| 1.6 | `lang` y `dir` | ✅ | `es`, `ltr`. |
| 1.7 | Icono 192×192 | ✅ | `/icons/icon-192.png` (PNG real, 3.4 KB). |
| 1.8 | Icono 512×512 | ✅ | `/icons/icon-512.png` (PNG real, 9.1 KB). |
| 1.9 | Icono maskable 512×512 | ✅ | `/icons/icon-maskable-512.png` con `purpose: "maskable"`. |
| 1.10 | Apple touch icon | ✅ | `/icons/apple-touch-icon.png` 180×180. |
| 1.11 | Favicon | ✅ | `/icons/favicon-32.png` 32×32. |
| 1.12 | Atajos de aplicación | ✅ | “Nuevo reporte” (`/reports/new`) e “Historial” (`/reports`). |
| 1.13 | Manifest servido con MIME correcto | 🟡 | Vite lo sirve como `application/manifest+json`; Vercel/Netlify tienen cabecera explícita. Verificar tras desplegar. |
| 1.14 | Instalación real en Android/iOS | ⏳ | Requiere dispositivo físico. |

**Verificación rápida del manifest:**

```bash
curl http://localhost:4173/manifest.webmanifest
```

Debe devolver JSON válido y los tres iconos deben responder `200`.

---

## 2. Service Worker: ciclo de vida

| # | Requisito | Estado | Evidencia / observación |
| --- | --- | --- | --- |
| 2.1 | Registro condicional | ✅ | `registerServiceWorker()` con detección de soporte. |
| 2.2 | Desactivado en desarrollo por defecto | ✅ | `VITE_ENABLE_SW=false`; limpia cachés de desarrollo al arrancar. |
| 2.3 | Activación en producción | ✅ | `vite preview` registra `/sw.js` con scope `/`. |
| 2.4 | Evento `install` | ✅ | Abre `SHELL_CACHE` y precarga `PRECACHE_URLS`. |
| 2.5 | `skipWaiting()` | ✅ | Se invoca tras precargar. |
| 2.6 | Evento `activate` | ✅ | Limpia cachés antiguas y llama a `clients.claim()`. |
| 2.7 | `navigationPreload` cuando existe | ✅ | Se habilita dentro de `try/catch`. |
| 2.8 | Evento `fetch` | ✅ | Intercepta sólo GET same-origin; nunca `/api`. |
| 2.9 | Control de la página | ✅ | Diagnóstico en Ajustes: “Controlando la página: Sí”. |
| 2.10 | Actualización de versión | ✅ | Nuevo `BUILD_ID` y precache inyectado por Vite; se verificó el cambio de caché entre builds. |

**Evidencia de ciclo de vida:** en la prueba real, Ajustes mostró:

```text
Soportado        Sí
Registrado       Sí
Activo           Sí
Controlando      Sí
Scope            http://localhost:4173/
Cachés           techservice-config, techservice-shell-<build>, techservice-runtime-<build>
```

---

## 3. Estrategias de caché

| # | Requisito | Estado | Implementación |
| --- | --- | --- | --- |
| 3.1 | Precache del app shell | ✅ | `/`, `/index.html`, manifest, iconos y assets hashed inyectados. |
| 3.2 | Cache First para estáticos | ✅ | `cacheFirst()` consulta shell → runtime → red. |
| 3.3 | Stale While Revalidate para imágenes/UI | ✅ | `staleWhileRevalidate()` con actualización en segundo plano. |
| 3.4 | Network First para navegación | ✅ | `networkFirstNavigation()` con timeout de 5 s. |
| 3.5 | Fallback offline | ✅ | `/index.html` cacheado o HTML de emergencia con botón “Reintentar”. |
| 3.6 | No cachear la API | ✅ | `url.pathname.startsWith('/api')` retorna sin `respondWith`. |
| 3.7 | No cachear respuestas de error | ✅ | `isCacheable()` exige `response.ok && status === 200`. |
| 3.8 | No cachear orígenes externos | ✅ | Se compara `url.origin` con `self.location.origin`. |
| 3.9 | Limpieza de cachés antiguas | ✅ | `activate` elimina claves `techservice-*` no incluidas en `keep`. |
| 3.10 | Timeout de red | ✅ | `fetchWithTimeout` para navegación y Background Sync. |
| 3.11 | Fallback ante 502 del proxy | ✅ | La navegación sólo usa la respuesta de red si es OK; si no, sirve el shell cacheado. |

**Prueba real de fallback:** con el servidor de preview detenido, la app siguió cargando desde caché. El proxy devolvía `502`; el Service Worker lo trató como respuesta no válida y sirvió `index.html` cacheado, sin pantalla de error.

---

## 4. Funcionamiento offline

| # | Requisito | Estado | Evidencia |
| --- | --- | --- | --- |
| 4.1 | La app carga sin red tras la primera visita | ✅ | Shell cacheado servido con el preview detenido. |
| 4.2 | Consola sin errores al cargar offline | ✅ | Cero errores de consola en la prueba real. |
| 4.3 | Guardado del reporte en IndexedDB | ✅ | El registro apareció en el store `reports` con `syncStatus: pending`. |
| 4.4 | Persistencia tras recargar | ✅ | El reporte offline siguió disponible tras recarga completa. |
| 4.5 | Persistencia tras cerrar el navegador | 🟡 | IndexedDB es persistente por diseño; la prueba automatizada cubrió recarga, no cierre total del proceso. Verificar en dispositivo. |
| 4.6 | Cola de sincronización | ✅ | Candidatos `pending`/`error` con backoff. |
| 4.7 | UUID idempotente | ✅ | UUID generado en cliente y reutilizado en reintentos. |
| 4.8 | Sincronización al reconectar | ✅ | Evento `online` + reintento exitoso. |
| 4.9 | Sincronización al iniciar | ✅ | `setTimeout` de 1.2 s tras el arranque. |
| 4.10 | Sincronización manual | ✅ | Botón “Sincronizar” y resultado “Todo al día” sin pendientes. |
| 4.11 | Prevención de duplicados | ✅ | Dos envíos del mismo UUID devolvieron `duplicate`; el total del servidor no cambió. |
| 4.12 | Errores de validación no se reintentan indefinidamente | ✅ | `permanentError: true` y estado `error`. |
| 4.13 | Exportación de respaldo | ✅ | “Exportar JSON” descarga todos los reportes locales. |

**Evidencia de la prueba offline real:**

| Dato | Valor |
| --- | --- |
| Folio creado sin red | `TS-20261105-133221QD` |
| UUID | `509c6a22-40d7-4980-bf5c-636337e182dc` |
| Estado inicial | `pending` |
| Persistencia | Visible tras recarga completa |
| Sincronización | `syncedAt = 2026-11-05T19:33:23.852Z` |

---

## 5. Background Sync (mejora progresiva)

| # | Requisito | Estado | Evidencia / observación |
| --- | --- | --- | --- |
| 5.1 | Detección de `SyncManager` | ✅ | `isBackgroundSyncSupported()`. |
| 5.2 | Registro de etiqueta | ✅ | `registration.sync.register('techservice-report-sync')`. |
| 5.3 | Handler `sync` en el SW | ✅ | `runBackgroundSync()` lee IndexedDB y envía el lote. |
| 5.4 | No crear la BD con esquema incorrecto | ✅ | `openExistingDb()` aborta si la BD no existe. |
| 5.5 | Notificación a las pestañas | ✅ | Mensajes `BACKGROUND_SYNC_COMPLETE`, `EMPTY`, `FAILED`. |
| 5.6 | La app no depende de Background Sync | ✅ | Disparadores independientes en `SyncContext`. |
| 5.7 | Ejecución real con app cerrada | ⏳ | Depende del navegador/SO; no se probó en dispositivo físico. |

---

## 6. Instalación y experiencia standalone

| # | Requisito | Estado | Evidencia / observación |
| --- | --- | --- | --- |
| 6.1 | HTTPS o localhost | ✅ | Pruebas en `http://localhost:4173`. |
| 6.2 | `beforeinstallprompt` capturado | 🟡 | Implementado en `InstallContext`; no se completó el diálogo nativo en la prueba automatizada. |
| 6.3 | Instrucciones para iOS | ✅ | Ajustes muestra el flujo de Compartir → Añadir a pantalla de inicio. |
| 6.4 | Detección de modo standalone | ✅ | `display-mode: standalone` y `navigator.standalone`. |
| 6.5 | Icono y splash | 🟡 | Manifest e iconos presentes; el splash lo genera el sistema. Verificar en dispositivo. |
| 6.6 | Instalación real Android | ⏳ | Pendiente. |
| 6.7 | Instalación real iOS | ⏳ | Pendiente. |

---

## 7. Calidad, accesibilidad y SEO

| # | Requisito | Estado | Evidencia |
| --- | --- | --- | --- |
| 7.1 | Lighthouse Accesibilidad | ✅ | 100/100 en historial, panel y ajustes (build final). |
| 7.2 | Lighthouse Buenas prácticas | ✅ | 100/100 en las tres pantallas auditadas. |
| 7.3 | Lighthouse SEO | ✅ | 100/100 en las tres pantallas auditadas. |
| 7.4 | `robots.txt` válido | ✅ | Añadido en `frontend/public/robots.txt`. |
| 7.5 | Contraste de color | ✅ | Se corrigió el token de texto secundario a `#5F6F84`; Lighthouse sin fallos. |
| 7.6 | Navegación por teclado | 🟡 | Landmarks, foco visible y controles nativos; falta prueba manual completa. |
| 7.7 | Lector de pantalla | ⏳ | Pendiente de prueba con NVDA/VoiceOver/TalkBack. |
| 7.8 | Lighthouse Performance | ⏳ | La herramienta integrada no ejecuta la categoría Performance. Usar Chrome DevTools/PageSpeed con throttling móvil. |

---

## 8. Seguridad y despliegue

| # | Requisito | Estado | Evidencia |
| --- | --- | --- | --- |
| 8.1 | CORS restringido | ✅ | Lista explícita; origen no autorizado devuelve 403. |
| 8.2 | Validación en cliente y servidor | ✅ | `validateReport` y `sanitizeReport`. |
| 8.3 | SQL parametrizado | ✅ | `better-sqlite3` con placeholders. |
| 8.4 | Cabeceras de seguridad | ✅ | `nosniff`, `DENY`, `no-referrer`, HSTS en producción. |
| 8.5 | `sw.js` sin caché HTTP | ✅ | Configurado en `vercel.json` y `netlify.toml`. |
| 8.6 | Assets con caché inmutable | ✅ | `Cache-Control: public, max-age=31536000, immutable`. |
| 8.7 | Disco persistente para SQLite | ✅ (documentado) | `render.yaml` y `Dockerfile` usan `/var/data`. |
| 8.8 | Autenticación | ❌ | Fuera de alcance; documentado como limitación. |

---

## 9. Checklist de verificación manual (para repetir)

```text
[ ] npm run build
[ ] npm run preview
[ ] Abrir http://localhost:4173
[ ] DevTools → Application → Manifest: sin errores, 3 iconos
[ ] Application → Service Workers: activated and running
[ ] Application → Cache Storage: techservice-shell-<build>
[ ] Crear reporte en línea → verificar estado Sincronizado
[ ] Application → IndexedDB → techservice-db → reports
[ ] Detener el preview (o modo avión) → recargar
[ ] La app debe cargar desde caché
[ ] Crear reporte offline → estado Pendiente
[ ] Recargar → el reporte sigue ahí
[ ] Reconectar → esperar sincronización automática
[ ] Verificar el registro en la API (GET /api/reports/:id)
[ ] Reenviar el mismo lote → estado duplicate, sin nuevos registros
[ ] Revisar Ajustes: SW, cachés, almacenamiento y salud de la API
[ ] Ejecutar Lighthouse (Accesibilidad, Buenas prácticas, SEO)
```

---

## 10. Resultado global

| Área | Estado |
| --- | --- |
| Manifest e iconos | ✅ Implementado y verificado en build |
| Service Worker y estrategias | ✅ Implementado y verificado |
| Offline real | ✅ Verificado en Chromium de escritorio |
| Sincronización e idempotencia | ✅ Verificado con API real |
| Background Sync | 🟡 Implementado; ejecución en segundo plano pendiente en dispositivo |
| Instalación | 🟡 Implementada; instalación física pendiente |
| Accesibilidad/SEO | ✅ Lighthouse 100/100/100 en las pantallas auditadas |
| Rendimiento | ⏳ Pendiente de auditoría con throttling |

La PWA cumple los requisitos técnicos del alcance académico. Las casillas pendientes se refieren a validaciones que requieren hardware o herramientas externas y se declaran explícitamente para no atribuir resultados no ejecutados.
