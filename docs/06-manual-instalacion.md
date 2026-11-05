# 06 · Manual de instalación y uso

**Proyecto:** TechService PWA  
**Versión documentada:** 1.0.0  
**Fecha:** 5 de noviembre de 2026  
**Dirigido a:** personal técnico, administradores del despliegue y evaluadores del proyecto.

> Este manual describe el uso de la aplicación y la instalación de la PWA. No incluye capturas de dispositivos reales porque la instalación en Android e iOS permanece **pendiente** en el entorno de desarrollo. Los pasos corresponden a los flujos oficiales de Chrome, Edge y Safari y deben validarse en hardware físico antes de una entrega en campo.

---

## 1. Qué es TechService PWA

TechService es una aplicación web instalable para registrar reportes de servicio técnico. Su característica principal es que **el reporte se guarda primero en el dispositivo** y se envía al servidor cuando hay conexión.

Esto permite:

- Capturar un reporte en una zona sin señal.
- Cerrar el navegador o la aplicación sin perder el reporte.
- Consultar el historial aunque la API esté caída.
- Sincronizar automáticamente al recuperar Internet, sin crear duplicados.

Lo que **no** hace:

- No descarga a un dispositivo los reportes creados en otro.
- No permite editar un reporte desde la interfaz (la API sí expone `PUT`).
- No incluye autenticación ni roles.
- No adjunta fotografías ni firmas.
- No sustituye un sistema de respaldo del servidor.

---

## 2. Antes de empezar

### 2.1 Requisitos

| Elemento | Requisito |
| --- | --- |
| Navegador | Chrome o Edge en Android/escritorio; Safari en iPhone/iPad; Firefox moderno en escritorio. |
| Conexión | Internet para la primera carga y para sincronizar. Después se puede trabajar offline. |
| Contexto seguro | **HTTPS** o `http://localhost`. Sin esto el Service Worker no se registra. |
| Backend | API Express accesible desde el navegador y con el origen del frontend en `CORS_ORIGINS`. |
| Almacenamiento | Espacio libre para IndexedDB y cachés del navegador. |

### 2.2 URL de acceso

Usa la URL donde se publicó el frontend. En este documento se representa como:

```text
https://TU-FRONTEND.example
```

No se incluye una URL real porque el proyecto se validó en local y aún no se ha desplegado en un dominio público. Para pruebas locales:

```text
http://localhost:4173
```

### 2.3 Comprobar que el despliegue está listo

Antes de instalar, verifica estos tres puntos.

**a) La app abre y no muestra una pantalla vacía.**

**b) La API responde.** Abre en el navegador:

```text
https://TU-API.example/api/health
```

Debe devolver un JSON con `"success": true` y `"database": "ok"`. Si la API está en otro dominio, el backend debe incluir el origen exacto del frontend en `CORS_ORIGINS`.

**c) El manifest y los iconos responden.** Abre:

```text
https://TU-FRONTEND.example/manifest.webmanifest
https://TU-FRONTEND.example/icons/icon-192.png
https://TU-FRONTEND.example/icons/icon-512.png
https://TU-FRONTEND.example/icons/icon-maskable-512.png
```

Los cuatro deben devolver `200`. Un icono faltante impide que el navegador ofrezca una instalación correcta.

### 2.4 Configurar la API desde la app

Si el frontend y la API están en dominios distintos, la URL se puede ajustar sin reconstruir:

1. Abre **Ajustes**.
2. En **Conexión con el servidor**, escribe la URL base, por ejemplo `https://TU-API.example/api`.
3. Pulsa **Guardar**.
4. Pulsa **Probar conexión**.
5. Confirma el mensaje **Servidor disponible**.

La URL se guarda en el almacenamiento local del navegador (`techservice.apiBase`), no en el servidor. Si omitas `/api`, la aplicación lo añade automáticamente.

> En un despliegue con reverse proxy se puede usar `/api` para que el frontend y la API compartan dominio. Esa es la opción recomendada para evitar CORS.

---

## 3. Instalación en Android

Navegador de referencia: **Chrome** (el flujo de Edge es equivalente).

1. Abre la URL de TechService en Chrome.
2. Espera a que termine la primera carga. El Service Worker se registra en segundo plano.
3. Pulsa el menú **⋮** de Chrome.
4. Selecciona **Instalar aplicación** o **Añadir a pantalla de inicio**.

   Si Chrome detecta que la app cumple los criterios, también puede mostrar un aviso o un icono de instalación en la barra de direcciones.

5. Confirma el nombre **TechService**.
6. Abre la app desde el icono de la pantalla de inicio.

### Verificación

| Comprobación | Resultado esperado |
| --- | --- |
| La app abre sin la barra de direcciones | Modo `standalone`. |
| El icono aparece en el cajón de aplicaciones | Icono de TechService. |
| **Ajustes → Instalación de la PWA** | “Aplicación instalada” si el modo standalone se detecta. |
| **Ajustes → Service Worker** | Soportado, registrado, activo y controlando: **Sí**. |

> Si la opción **Instalar aplicación** no aparece, revisa que la URL sea HTTPS, que el manifest responda y que no estés en una ventana de incógnito. En algunos fabricantes el menú puede llamarse **Añadir a pantalla de inicio**.

---

## 4. Instalación en iPhone y iPad

Navegador obligatorio: **Safari**. iOS no permite instalar PWA desde Chrome ni desde Firefox.

1. Abre la URL de TechService en Safari.
2. Espera a que cargue completamente.
3. Pulsa el botón **Compartir** (cuadrado con flecha hacia arriba).
4. Desplázate y elige **Añadir a pantalla de inicio**.
5. Verifica el nombre **TechService** y pulsa **Añadir**.
6. Abre la app desde el icono creado.

### Particularidades de iOS

- No existe el aviso automático `beforeinstallprompt`; la instalación siempre es manual.
- El ícono usa `apple-touch-icon.png`.
- La app se abre en modo standalone, pero el comportamiento del almacenamiento y del ciclo de vida lo controla iOS.
- **Background Sync no está disponible en Safari/iOS.** La sincronización ocurre cuando la app está abierta y vuelve a primer plano o recupera conexión.
- No asumas que los datos de Safari y los de la app instalada son intercambiables. Exporta un respaldo antes de cambiar de modo de uso.

> Si no ves **Añadir a pantalla de inicio**, comprueba que estás en Safari (no en una vista previa dentro de otra app) y que la página terminó de cargar.

---

## 5. Instalación en escritorio

### Chrome o Edge (Windows, macOS, Linux)

1. Abre la URL de TechService.
2. En la barra de direcciones, pulsa el icono de instalación (una pantalla con una flecha) si aparece.
3. También puedes usar el menú del navegador:
   - Chrome: **⋮ → Guardar y compartir → Instalar página como aplicación**.
   - Edge: **… → Aplicaciones → Instalar este sitio como una aplicación**.
4. Confirma la instalación.
5. La app quedará disponible en el menú de aplicaciones y, si se elige, en el escritorio.

### Verificación

- Se abre en una ventana propia sin pestañas.
- **Ajustes → Service Worker** reporta control activo.
- **Ajustes → Almacenamiento local y datos** muestra los contadores de reportes.

---

## 6. Primer arranque

### 6.1 Revisar la conexión

1. Entra en **Ajustes**.
2. Pulsa **Probar conexión**.
3. Debe aparecer **Servidor disponible**, con versión, entorno y estado de la base de datos.

Si aparece **No se pudo contactar al servidor**:

- Revisa la URL base de la API.
- Verifica que el backend esté encendido.
- Confirma que `CORS_ORIGINS` incluya el origen exacto del frontend, sin barra final.
- Comprueba que el certificado HTTPS sea válido.

### 6.2 Proteger el almacenamiento local

En **Ajustes → Almacenamiento local y datos**:

1. Pulsa **Solicitar persistencia**.
2. Si el navegador concede la solicitud, verás **Almacenamiento persistente: Concedido**.
3. Si no la concede, la app sigue funcionando; el navegador podría liberar espacio en condiciones extremas.

La persistencia reduce el riesgo de que el sistema borre IndexedDB, pero **no es una garantía** y no sustituye la exportación de respaldos.

### 6.3 Confirmar el Service Worker

En **Ajustes → Service Worker** verifica:

```text
Soportado            Sí
Registrado           Sí
Activo               Sí
Controlando la página Sí
Scope                https://TU-FRONTEND.example/
Cachés               techservice-config, techservice-shell-<build>, techservice-runtime-<build>
```

Si no está controlando, recarga una vez. La primera carga registra el Service Worker; el control total puede requerir una segunda carga.

---

## 7. Crear un reporte

1. Pulsa **Nuevo reporte** en el panel o en el historial.
2. Completa los campos. Los marcados con `*` son obligatorios.

### Datos del servicio

| Campo | Obligatorio | Observación |
| --- | --- | --- |
| Nombre del técnico | Sí | Se recuerda para el siguiente reporte. |
| Nombre del cliente | Sí | — |
| Teléfono del cliente | Sí | Entre 7 y 15 dígitos; acepta espacios, guiones y `+`. |
| Tipo de servicio | Sí | Preventivo, correctivo, instalación, reparación o inspección. |
| Ubicación o dirección | Sí | Calle, número, colonia o referencia. |
| Equipo atendido | Sí | Marca, modelo o identificación. |

### Diagnóstico y trabajo

| Campo | Obligatorio | Límite |
| --- | --- | --- |
| Descripción del problema | Sí | 2000 caracteres. |
| Diagnóstico técnico | No | 2000 caracteres. |
| Trabajo realizado | No | 2000 caracteres. |
| Materiales utilizados | No | 1000 caracteres. |

### Clasificación

| Campo | Obligatorio | Valores |
| --- | --- | --- |
| Prioridad | Sí | Baja, media, alta, urgente. |
| Estado del reporte | Sí | Abierto, en proceso, resuelto, cerrado. |
| Observaciones adicionales | No | 1500 caracteres. |

3. Pulsa **Guardar reporte**.

La aplicación:

- Valida y normaliza los datos.
- Genera un **folio** con formato `TS-AAAAMMDD-HHMMSSXX`.
- Genera un **UUID v4**.
- Guarda el registro en IndexedDB con estado **Pendiente**.
- Navega al detalle.
- Si hay conexión, intenta sincronizarlo de inmediato.

> El folio y el UUID se generan en el dispositivo. Por eso el reporte existe y es identificable incluso antes de llegar al servidor.

### Si el formulario tiene errores

Los campos inválidos se marcan en rojo y aparece un mensaje debajo. Corrige los datos y vuelve a guardar. El reporte **no** se guarda hasta que la validación local sea correcta.

### Si quieres descartar el formulario

- **Cancelar** pregunta si deseas descartar los cambios.
- **Limpiar formulario** borra todos los campos, incluidos los opcionales.

---

## 8. Consultar el historial

Entra en **Historial de reportes**.

### 8.1 Buscar

El buscador localiza coincidencias en:

- Folio.
- Cliente.
- Técnico.
- Equipo.
- Ubicación.

La búsqueda ignora acentos y mayúsculas. Por ejemplo, `maria` encuentra “María”.

### 8.2 Filtrar

Se pueden combinar estos filtros:

- **Tipo de servicio**.
- **Prioridad**.
- **Estado**.
- **Sincronización**: pendientes, sincronizados o con error.

El contador muestra `N de M reportes`. Pulsa **Limpiar** para quitar todos los filtros.

### 8.3 Abrir el detalle

Pulsa una fila o una tarjeta. El detalle muestra:

- Cliente, técnico, teléfono y ubicación.
- Servicio, equipo, prioridad y estado.
- Descripción, diagnóstico, trabajo y materiales.
- Observaciones.
- Estado de sincronización, intentos y próximo reintento.
- Trazabilidad: creado, modificado, sincronizado, servidor y UUID.

### 8.4 Imprimir o guardar como PDF

Pulsa **Imprimir**. Se abre el diálogo del navegador. Para guardar como PDF, elige esa opción en el destino de impresión. La hoja de impresión oculta la navegación y conserva el contenido del reporte.

---

## 9. Trabajar sin conexión

### 9.1 Condición previa

La app debe haberse abierto **al menos una vez con conexión** para que el Service Worker precachee el shell. Sin esa primera visita, no hay aplicación que mostrar offline.

### 9.2 Procedimiento recomendado

1. Abre la app con conexión y espera a que el Service Worker esté activo.
2. Activa el **modo avión** o desactiva Wi-Fi y datos móviles.
3. Comprueba que aparece el indicador **Sin conexión**.
4. Crea un reporte.
5. Confirma que se guarda con estado **Pendiente**.
6. Cierra la app o recarga la página.
7. Vuelve a abrirla: el reporte debe seguir en el historial.
8. Desactiva el modo avión.
9. Espera la sincronización automática o pulsa **Sincronizar**.

### 9.3 Qué funciona offline

| Función | ¿Disponible? |
| --- | --- |
| Abrir la app después de la primera visita | Sí. |
| Navegar entre panel, historial, alta, detalle y ajustes | Sí. |
| Crear reportes | Sí. |
| Consultar y filtrar reportes locales | Sí. |
| Imprimir un reporte local | Sí, con los recursos del sistema. |
| Exportar JSON | Sí. |
| Sincronizar con el servidor | No hasta recuperar conexión. |
| Consultar la salud de la API | No. |
| Recibir reportes de otro dispositivo | No. |

### 9.4 Qué ocurre al reconectar

La aplicación intenta sincronizar:

- Al iniciar.
- Cuando el navegador emite el evento `online`.
- Al volver la app a primer plano.
- Cada 60 segundos mientras está visible y hay conexión.
- Al pulsar **Sincronizar**.

Si el envío falla por un problema transitorio, se reintenta con backoff exponencial: 30 s, 60 s, 120 s, hasta un máximo de 15 minutos y 5 intentos automáticos. Después queda en **Error** y se puede reintentar manualmente desde el detalle.

---

## 10. Sincronización

### 10.1 Estados

| Estado | Significado | Acción recomendada |
| --- | --- | --- |
| **Pendiente** | Guardado en IndexedDB, aún no confirmado por el servidor. | Esperar la sincronización o pulsar **Sincronizar**. |
| **Sincronizado** | El servidor confirmó el registro. | Ninguna. |
| **Error** | El servidor rechazó los datos o se agotaron los reintentos automáticos. | Abrir el detalle, leer el mensaje y reintentar o corregir. |

### 10.2 Sincronización manual

- En el panel: **Sincronizar ahora**.
- En el historial: **Sincronizar**.
- En el detalle de un reporte no sincronizado: **Sincronizar ahora** o **Reintentar sincronización**.

Si no hay pendientes, aparece **Todo al día**. Si no hay red, aparece **Sin conexión** y los reportes permanecen guardados.

### 10.3 Idempotencia y duplicados

Cada reporte conserva el mismo UUID en todos los reintentos. El servidor:

- Crea el registro si el UUID no existe.
- Devuelve el registro existente como `duplicate` si el UUID ya existe.
- Actualiza si el `updatedAt` entrante es más reciente y el UUID coincide.
- Rechaza el reporte si el folio pertenece a otro UUID.

Por eso, pulsar **Sincronizar** varias veces **no crea duplicados**. En las pruebas reales, dos envíos del mismo lote devolvieron `duplicate` y el total del servidor no cambió.

### 10.4 Errores de validación

Si el servidor rechaza un reporte por datos inválidos, el estado pasa a **Error** y no se reintenta indefinidamente. En el detalle se muestra el mensaje. Como la interfaz no permite editar, el reporte rechazado debe corregirse mediante la API o eliminarse y volver a capturarse.

### 10.5 Background Sync

En navegadores compatibles (principalmente Chromium) la app registra la etiqueta `techservice-report-sync`. Si el navegador decide ejecutarla con la app cerrada, el Service Worker intenta enviar la cola y avisa a las pestañas al abrirse.

Esto es una **mejora progresiva**:

- No funciona en Safari/iOS.
- El navegador decide cuándo ejecutarla.
- No se garantiza su ejecución con la app cerrada.
- La app siempre sincroniza por sus propios medios al abrirse o reconectar.

---

## 11. Respaldo y recuperación

### 11.1 Exportar un respaldo

1. Entra en **Ajustes**.
2. Pulsa **Exportar JSON**.
3. Se descarga un archivo `techservice-reportes-AAAA-MM-DD.json`.

El archivo contiene:

```json
{
  "app": "TechService PWA",
  "exportedAt": "2026-11-05T19:35:00.000Z",
  "count": 2,
  "reports": []
}
```

Cada elemento de `reports` incluye los datos del reporte y sus metadatos locales (`syncStatus`, `retryCount`, `syncedAt`, etc.).

### 11.2 Limitaciones del respaldo

- **No existe importación automática** desde la interfaz.
- El JSON sirve como evidencia, auditoría y respaldo legible.
- Para restaurar en la app, un administrador puede reenviar los reportes a la API mediante `POST /api/reports` o `POST /api/reports/sync`, conservando el mismo `id` y `folio`.
- Si sólo se pega el JSON en otro dispositivo, la app no lo lee automáticamente.

### 11.3 Borrar datos locales

**Ajustes → Borrar datos locales** elimina todos los reportes de IndexedDB, incluidos los pendientes.

> **Importante:** los reportes ya sincronizados **permanecen en el servidor**, pero desaparecen del historial de este dispositivo. La app no tiene una función de “descargar todo del servidor”. Exporta un respaldo antes de borrar.

### 11.4 Borrar un reporte

En el detalle, pulsa **Eliminar**:

- Si está sincronizado, se elimina del servidor y del dispositivo.
- Si sólo existe localmente, se elimina de la cola local.
- Si está sincronizado y no hay red, la interfaz bloquea el borrado para no dejar un registro huérfano en el servidor.

---

## 12. Actualizar la aplicación

### 12.1 Actualización normal

Al publicar un build nuevo, el Service Worker descarga el shell actualizado y elimina las cachés antiguas al activarse. Para aplicarlo:

1. Abre **Ajustes**.
2. Pulsa **Buscar actualización del SW**.
3. Recarga la app.
4. Si sigue la versión anterior, cierra todas las pestañas y vuelve a abrir.

### 12.2 Forzar una actualización

En el navegador:

1. DevTools → **Application** → **Service Workers**.
2. Pulsa **Update** o **Unregister**.
3. Recarga.
4. Como último recurso, **Clear site data** (esto borra también IndexedDB; exporta antes).

### 12.3 Cómo saber la versión

En **Ajustes → Acerca de TechService** aparece la versión (`1.0.0`). El `BUILD_ID` real se puede consultar en `dist/sw.js` o en las herramientas de desarrollo.

---

## 13. Desinstalar

### Android

1. Mantén pulsado el icono de TechService.
2. Elige **Desinstalar** o **Quitar**.
3. Confirma.

Los datos del sitio pueden permanecer en Chrome. Para eliminarlos por completo: **Chrome → Configuración → Privacidad → Borrar datos de navegación → Almacenamiento de sitios**, o **Ajustes → Almacenamiento de sitios → TechService → Borrar**.

### iOS / iPadOS

1. Mantén pulsado el icono en la pantalla de inicio.
2. Elige **Eliminar app** o **Quitar de pantalla de inicio**.
3. Confirma.

> Según la versión de iOS, eliminar la app web puede borrar también sus datos locales. Exporta un respaldo antes de desinstalar.

### Escritorio

1. Abre la app instalada.
2. Menú del navegador → **Desinstalar TechService**.
3. Confirma.

Para borrar también los datos: DevTools → **Application** → **Storage** → **Clear site data**.

---

## 14. Preguntas frecuentes

### ¿Puedo usar la app sin Internet desde el primer momento?

No. La primera visita debe ser con conexión para descargar el shell y registrar el Service Worker. Después sí se puede trabajar offline.

### ¿Se pierden los reportes si cierro el navegador?

No, si ya se guardaron. IndexedDB es persistente. La prueba real confirmó persistencia tras una recarga completa; el cierre total del proceso y el desalojo por el sistema se documentan como pendientes de prueba física.

### ¿Los reportes se comparten entre dispositivos?

No automáticamente. Cada dispositivo guarda su propia copia local. El servidor recibe los reportes sincronizados, pero la app no descarga el historial del servidor. Para consultar desde otro dispositivo se requiere una evolución del producto o usar la API.

### ¿Por qué el historial no muestra un reporte que sí está en el servidor?

Porque el historial se alimenta de IndexedDB. Si se borraron los datos locales, el registro sigue en SQLite pero ya no aparece en la app.

### ¿Puedo crear dos reportes con el mismo folio?

El folio se genera con fecha, hora, segundos y dos caracteres aleatorios. Si dos dispositivos generan el mismo, el servidor rechaza el segundo con `FOLIO_CONFLICT`. No se sobrescribe silenciosamente.

### ¿Qué pasa si pulso Sincronizar muchas veces?

Nada se duplica. El UUID es la clave de idempotencia. Los envíos repetidos se resuelven como `duplicate`.

### ¿Funciona en modo incógnito?

Puede abrir, pero el almacenamiento y el Service Worker tienen limitaciones. No se recomienda para trabajo real: al cerrar la ventana se pueden borrar los datos.

### ¿Por qué no aparece el botón de instalar?

Porque el navegador no considera que se cumplan los criterios, porque la URL no es HTTPS/localhost, porque ya está instalada o porque el navegador no ofrece instalación (iOS). Usa el menú del navegador o el flujo manual de Safari.

### ¿Puedo cambiar la URL de la API después de instalar?

Sí. **Ajustes → URL base de la API → Guardar**. Se guarda localmente y se aplica sin reconstruir la app.

### ¿La app funciona si el backend está caído?

Sí para capturar, consultar y exportar. No para sincronizar ni para comprobar la salud del servidor. Los reportes quedan pendientes y se enviarán al recuperar la API.

### ¿Dónde se guardan los datos?

- Reportes y cola: IndexedDB del navegador, base `techservice-db`, store `reports`.
- URL de API y última sincronización: `localStorage`.
- Shell y assets: Cache Storage (`techservice-*`).
- Servidor: SQLite en `DB_PATH` (por defecto `backend/data/techservice.sqlite`).

### ¿Cómo reporto un problema?

Anota:

- Folio y UUID del reporte.
- Estado de sincronización.
- Mensaje de error.
- Navegador y versión.
- Si ocurrió online u offline.

Con eso se puede reproducir el caso y revisar los logs del backend.

---

## 15. Lista de verificación para el usuario

```text
[ ] La URL abre con HTTPS (o localhost).
[ ] El manifest y los iconos responden.
[ ] La app se instaló y abre en modo standalone.
[ ] Ajustes → Servidor disponible.
[ ] Ajustes → Service Worker activo y controlando.
[ ] Solicitar persistencia (si el navegador lo permite).
[ ] Crear un reporte en línea y verlo como Sincronizado.
[ ] Activar modo avión.
[ ] Crear un reporte offline y verlo como Pendiente.
[ ] Recargar y confirmar que el reporte sigue ahí.
[ ] Desactivar modo avión y confirmar la sincronización.
[ ] Exportar un respaldo JSON.
[ ] Probar búsqueda y filtros del historial.
[ ] Abrir el detalle e imprimir/guardar PDF.
```

---

## 16. Estado de validación

| Actividad | Estado |
| --- | --- |
| Instalación y uso en Chromium de escritorio (build de producción) | ✅ Verificado en el entorno de desarrollo. |
| Flujo offline con recarga y sincronización | ✅ Verificado. |
| Exportación JSON | ✅ Verificada. |
| Impresión/PDF | ✅ Botón y hoja de impresión implementados; revisión visual final recomendada. |
| Instalación real en Android | ⏳ Pendiente de dispositivo físico. |
| Instalación real en iPhone/iPad | ⏳ Pendiente de dispositivo físico. |
| Background Sync con la app cerrada | ⏳ Pendiente; depende del navegador y del sistema. |
| Persistencia tras cierre total del proceso | ⏳ Pendiente de prueba física. |
| Lectores de pantalla | ⏳ Pendiente (NVDA, VoiceOver, TalkBack). |

Para el detalle de pruebas y auditorías, consulta [`05-pruebas-auditoria.md`](05-pruebas-auditoria.md). Para el guion de demostración, consulta [`07-defensa-proyecto.md`](07-defensa-proyecto.md).
