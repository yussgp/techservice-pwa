# 02 · Compatibilidad y alcance por plataforma

**Proyecto:** TechService PWA  
**Objetivo:** documentar en qué navegadores y dispositivos funciona la aplicación, qué características son opcionales y qué pruebas siguen pendientes.

---

## 1. Principio de diseño: detección de capacidades

La aplicación no asume un navegador concreto. Comprueba capacidades antes de usarlas:

| Capacidad | Detección en código | Comportamiento si no existe |
| --- | --- | --- |
| Service Worker | `'serviceWorker' in navigator` | La app funciona en línea; no hay caché offline. |
| Background Sync | `'SyncManager' in window` | Se usan los disparadores normales (inicio, `online`, visibilidad, intervalo). |
| `beforeinstallprompt` | Evento del navegador | Se muestran instrucciones manuales de instalación. |
| `navigator.storage.persist` | `navigator.storage?.persist` | Se informa que no está disponible; los datos siguen en IndexedDB. |
| `navigator.storage.estimate` | `navigator.storage?.estimate` | El diagnóstico muestra 0/0. |
| `navigator.clipboard` | `navigator.clipboard?.writeText` | Se avisa que no se pudo copiar el UUID. |
| `IndexedDB.databases()` | `typeof indexedDB.databases === 'function'` | Background Sync se declara no disponible. |
| `Cache API` | `typeof caches !== 'undefined'` | El diagnóstico reporta sin cachés. |

Esta estrategia es la razón por la que la app puede considerarse **progresiva**: mejora cuando el navegador lo permite, pero conserva el flujo esencial cuando no.

---

## 2. Entorno realmente probado

| Elemento | Valor |
| --- | --- |
| Sistema operativo | Windows (entorno de desarrollo) |
| Navegador de pruebas | Chromium integrado en la herramienta de navegador del entorno OpenCode |
| Node.js | 24.21.0 |
| npm | 11.19.0 |
| Backend | `http://localhost:4000` |
| Frontend de producción | `http://localhost:4173` (`vite preview`) |
| Viewport de escritorio | 912 × 670 CSS px |
| Viewport móvil | 800 × 656 CSS px (verificado en una prueba previa) |
| Fecha de pruebas | 5 de noviembre de 2026 |

> **Importante:** las pruebas se ejecutaron en Chromium de escritorio. No se realizaron instalaciones ni pruebas en teléfonos Android/iOS físicos. Todo lo marcado como “pendiente” en este documento no debe presentarse como validado.

---

## 3. Matriz de compatibilidad

Leyenda:

- **Probado:** se ejecutó en este proyecto.
- **Esperado:** la plataforma documenta soporte para la capacidad; no se probó en dispositivo físico.
- **Parcial:** funciona con limitaciones conocidas.
- **No:** la plataforma no ofrece la capacidad.

| Capacidad | Chromium escritorio | Android Chrome | Safari macOS | iOS / iPadOS Safari | Firefox | Samsung Internet |
| --- | --- | --- | --- | --- | --- | --- |
| SPA React | Probado | Esperado | Esperado | Esperado | Esperado | Esperado |
| IndexedDB | Probado | Esperado | Esperado | Esperado | Esperado | Esperado |
| Service Worker | Probado | Esperado | Esperado | Esperado | Esperado | Esperado |
| Instalación PWA | Esperado* | Esperado | No aplica | Parcial** | No aplica | Esperado |
| `beforeinstallprompt` | Esperado* | Esperado | No | No | No | Esperado |
| Background Sync | Esperado*** | Esperado*** | No | No | No | Esperado*** |
| `storage.persist()` | Probado (consulta) | Esperado | Esperado | Parcial | Esperado | Esperado |
| Notificaciones push | No implementado | No implementado | No implementado | No implementado | No implementado | No implementado |

\* La instalación en escritorio depende del navegador y del soporte del sistema; en la prueba automatizada no se completó el flujo de instalación nativo.  
\** En iOS la instalación es manual desde Safari (“Añadir a pantalla de inicio”); no existe `beforeinstallprompt`.  
\*** Background Sync requiere navegador Chromium y que el sistema decida ejecutar el evento; no está garantizado. La app no depende de ello.

### 3.1 Características por navegador

#### Chrome / Edge / Chromium (escritorio y Android)

- Soporte completo de Service Worker, Cache API e IndexedDB.
- Instalación mediante el icono de la barra de direcciones o el menú.
- `beforeinstallprompt` permite mostrar un botón propio.
- Background Sync disponible en Chromium; su ejecución real depende del sistema operativo y de la política de batería.
- `navigator.storage.persist()` puede concederse o denegarse según el compromiso de uso del sitio.

#### Safari (macOS) y Safari en iOS/iPadOS

- Service Worker e IndexedDB disponibles, con cuotas y políticas de desalojo más agresivas que Chromium.
- **No** hay `beforeinstallprompt`; la instalación se realiza manualmente desde Compartir → “Añadir a pantalla de inicio”.
- **No** hay Background Sync. La sincronización ocurre cuando la app está abierta o al volver a primer plano.
- El modo standalone puede cambiar la altura útil de la ventana; la interfaz usa `safe-area-inset` y `viewport-fit=cover`.
- El acceso al portapapeles puede requerir interacción explícita del usuario.
- La app no usa APIs que Safari bloquee; el flujo principal es compatible.

#### Firefox

- Service Worker e IndexedDB disponibles.
- No ofrece instalación PWA de escritorio equivalente a Chromium ni `beforeinstallprompt`.
- No hay Background Sync.
- La app funciona en línea y offline con el Service Worker; la instalación no aplica.

#### Samsung Internet

- Basado en Chromium; se espera un comportamiento similar a Chrome Android.
- No se probó en dispositivo físico.

---

## 4. Diferencias funcionales y fallbacks

### 4.1 Instalación

| Plataforma | Cómo se instala | Qué muestra la app |
| --- | --- | --- |
| Android Chrome | Botón “Instalar” o menú ⋮ → “Instalar aplicación”. | Botón propio si `beforeinstallprompt` fue capturado. |
| iOS Safari | Compartir → “Añadir a pantalla de inicio”. | Instrucciones paso a paso; no hay botón automático. |
| Escritorio Chrome/Edge | Icono de instalación en la barra de direcciones o menú. | Botón propio cuando el navegador lo permite. |
| Firefox escritorio | No aplica. | Instrucciones y aviso de que el navegador no ofrece instalación. |

### 4.2 Sincronización

| Escenario | Chromium | iOS Safari |
| --- | --- | --- |
| App abierta y en línea | Sincroniza al iniciar, cada 60 s y manualmente. | Igual. |
| Se recupera la conexión | Evento `online` + reintento. | Evento `online` + reintento. |
| App vuelve a primer plano | `visibilitychange` dispara sync. | Igual. |
| App cerrada | Background Sync puede ejecutarse si el sistema lo permite. | No se ejecuta; se sincroniza al abrir. |
| Sin conexión | Cola local persistente. | Cola local persistente. |

### 4.3 Almacenamiento

IndexedDB puede ser desalojado por el navegador si el dispositivo tiene poco espacio. La app:

1. Muestra el uso estimado y la cuota en **Ajustes**.
2. Permite solicitar almacenamiento persistente.
3. Ofrece exportación JSON como respaldo manual.
4. No promete persistencia absoluta: ningún navegador la garantiza al 100 %.

### 4.4 Portapapeles

Copiar el UUID usa `navigator.clipboard.writeText`. Si el navegador lo bloquea (contexto no seguro o falta de gesto), se muestra un aviso y el UUID sigue visible para copiarlo manualmente.

### 4.5 Impresión / PDF

`window.print()` abre el diálogo del navegador. La hoja de estilos de impresión oculta navegación y acciones, y deja el reporte legible. En iOS se usa “Compartir → Imprimir” o “Guardar en Archivos” como PDF.

---

## 5. Requisitos de contexto seguro

El Service Worker y muchas APIs modernas requieren **HTTPS** o un origen considerado seguro:

- `http://localhost`
- `http://127.0.0.1`
- `https://...`

Si la app se abre por `http://192.168.x.x` (IP de la red local), el Service Worker **no se registrará** y no habrá offline. Para probar en un teléfono físico contra la computadora se recomienda:

1. Desplegar el frontend en un dominio HTTPS (Vercel/Netlify), o
2. Usar un túnel HTTPS (por ejemplo ngrok) y añadir ese origen a `CORS_ORIGINS` del backend, o
3. Usar `localhost` mediante redirección de puertos si el entorno lo permite.

Este punto es una causa frecuente de “la PWA no funciona en el celular” y debe verificarse antes de cualquier demostración.

---

## 6. Responsive y ergonomía móvil

La interfaz se adapta con puntos de corte CSS:

- **Escritorio:** sidebar fija, tabla de reportes, panel lateral de sincronización.
- **Tablet:** sidebar compacta y grids que colapsan.
- **Móvil:** barra superior, navegación inferior con cinco acciones, tarjetas en lugar de tabla, formularios a una columna y botones de tamaño táctil.

Verificaciones realizadas:

- 912 × 670: tabla de escritorio visible, sin desbordamiento horizontal (`body.scrollWidth` menor que el viewport).
- 800 × 656: tabla oculta y lista de tarjetas móviles visible.
- Los formularios usan `inputMode` adecuado (`tel`), `autocomplete` y etiquetas asociadas.
- La navegación inferior respeta `env(safe-area-inset-bottom)`.

Pendiente: validación visual y táctil en dispositivos reales, incluyendo rotación, teclado en pantalla y notch.

---

## 7. Limitaciones conocidas

| Limitación | Impacto | Mitigación |
| --- | --- | --- |
| Sin Background Sync en iOS | La sincronización sólo ocurre con la app abierta. | Disparadores al abrir/volver a primer plano y botón manual. |
| Cuotas de IndexedDB variables | El navegador podría desalojar datos. | `storage.persist()`, exportación JSON y aviso en Ajustes. |
| Instalación manual en iOS | El usuario debe conocer el flujo de Compartir. | Instrucciones dentro de Ajustes. |
| `beforeinstallprompt` no estándar | No se puede forzar el diálogo de instalación. | Botón condicional + instrucciones. |
| HTTP en red local | Sin Service Worker. | HTTPS, túnel o despliegue. |
| Sin autenticación | Cualquiera con la URL puede acceder. | Fuera de alcance; documentado como riesgo. |
| SQLite en serverless | Pérdida de datos entre despliegues. | Disco persistente o PostgreSQL. |
| Navegadores antiguos | Sin SW/IndexedDB modernos. | La app muestra errores controlados; no se soportan versiones obsoletas. |

---

## 8. Plan de pruebas en dispositivos pendiente

Estas pruebas **no se han ejecutado** y deben realizarse antes de afirmar compatibilidad física:

1. **Android**
   - Instalar desde Chrome en HTTPS.
   - Verificar icono, splash y modo standalone.
   - Crear un reporte en modo avión, cerrar Chrome, reabrir y comprobar persistencia.
   - Recuperar conexión y verificar sincronización.
   - Probar Background Sync cerrando la pestaña/app.
   - Revisar uso de batería y comportamiento del sistema al suspender.

2. **iOS / iPadOS**
   - Instalar desde Safari con “Añadir a pantalla de inicio”.
   - Verificar que el modo standalone mantiene la sesión y el almacenamiento.
   - Crear un reporte sin red y comprobar persistencia tras cerrar la app.
   - Verificar que la sincronización ocurre al volver a primer plano.
   - Revisar el comportamiento del teclado y del área segura.

3. **Escritorio**
   - Instalar en Chrome y Edge.
   - Verificar actualización del Service Worker tras un nuevo despliegue.
   - Probar impresión/PDF.

4. **Accesibilidad**
   - Navegación completa con teclado.
   - Lector de pantalla (NVDA/VoiceOver/TalkBack).
   - Zoom al 200 %.

5. **Rendimiento**
   - Lighthouse con throttling móvil (categoría Performance).
   - First Contentful Paint, Largest Contentful Paint e Interactive.
   - Prueba con red 3G lenta.

---

## 9. Conclusión

TechService PWA está diseñada para funcionar en navegadores modernos con un núcleo común: React, IndexedDB y Service Worker. Las diferencias entre plataformas se manejan con detección de capacidades y degradación controlada. La compatibilidad con Chromium de escritorio está verificada; Android, iOS y el resto de navegadores requieren la validación física descrita en la sección 8 antes de considerarse probados.
