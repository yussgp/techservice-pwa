# 04 · Entorno de desarrollo

**Proyecto:** TechService PWA  
**Sistema verificado:** Windows, Node.js 24.21.0, npm 11.19.0  
**Fecha:** 5 de noviembre de 2026

---

## 1. Requisitos previos

| Herramienta | Versión mínima | Versión usada en el desarrollo |
| --- | --- | --- |
| Node.js | 20 LTS | 24.21.0 |
| npm | 10 | 11.19.0 |
| Navegador | Chromium/Firefox/Safari modernos | Chromium integrado del entorno |
| Git | 2.x | Recomendado para publicar |
| Docker | Opcional | Para probar la imagen del backend |

`better-sqlite3` incluye binarios precompilados para las versiones soportadas. Si npm debe compilarlo:

- **Windows:** instalar Visual Studio Build Tools con la carga “Desktop development with C++”.
- **Linux:** instalar `build-essential` y `python3`.
- **macOS:** instalar Xcode Command Line Tools.

---

## 2. Estructura de trabajo

```text
Proyecto predeterminado/
├── backend/     API Express + SQLite
├── frontend/    React + Vite + PWA
└── docs/        Documentación académica
```

Cada carpeta tiene su propio `package.json`, `node_modules` y variables de entorno. No hay un monorepo con workspaces; esto simplifica el despliegue independiente de frontend y backend.

---

## 3. Variables de entorno

### 3.1 Backend (`backend/.env`)

Copiar desde `backend/.env.example`.

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` activa HSTS y otros comportamientos. |
| `PORT` | `4000` | Puerto HTTP. |
| `HOST` | `0.0.0.0` | Interfaz de escucha. |
| `DB_PATH` | `data/techservice.sqlite` | Ruta relativa a `backend/` o absoluta. |
| `CORS_ORIGINS` | localhost 5173/4173 | Orígenes permitidos, separados por coma; `*` sólo en desarrollo. |
| `LOG_REQUESTS` | `true` | Log de peticiones en consola. |
| `APP_VERSION` | `1.0.0` | Versión mostrada por `/api/health`. |

Ejemplo:

```dotenv
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
DB_PATH=data/techservice.sqlite
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
LOG_REQUESTS=true
APP_VERSION=1.0.0
```

### 3.2 Frontend (`frontend/.env`)

Copiar desde `frontend/.env.example`.

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | URL base de la API. Relativa con proxy o absoluta. |
| `VITE_PROXY_TARGET` | `http://localhost:4000` | Destino del proxy de Vite en desarrollo. |
| `VITE_ENABLE_SW` | `false` | Activa el Service Worker también en `npm run dev`. |
| `VITE_APP_VERSION` | `1.0.0` | Versión mostrada en Ajustes. |

Ejemplo:

```dotenv
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:4000
VITE_ENABLE_SW=false
VITE_APP_VERSION=1.0.0
```

> Las variables `VITE_*` se embeben en el bundle durante el build. Cambiarlas en producción requiere reconstruir el frontend. La URL de API también se puede cambiar en **Ajustes** sin reconstruir, porque se guarda en `localStorage`.

---

## 4. Instalación paso a paso

### 4.1 Backend

```bash
cd backend
npm install
```

Crear el archivo de entorno:

```powershell
# PowerShell
Copy-Item .env.example .env
```

```bash
# Bash
cp .env.example .env
```

Iniciar:

```bash
npm run dev
```

Salida esperada:

```text
TechService API escuchando en http://0.0.0.0:4000
Base de datos: .../backend/data/techservice.sqlite
```

Verificar:

```bash
curl http://localhost:4000/api/health
```

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "techservice-api",
    "version": "1.0.0",
    "environment": "development",
    "database": "ok"
  }
}
```

### 4.2 Frontend

En otra terminal:

```bash
cd frontend
npm install
```

```powershell
Copy-Item .env.example .env
```

```bash
npm run dev
```

Abrir `http://localhost:5173`. Vite aplica el proxy:

```text
/api/*  →  http://localhost:4000/api/*
```

Esto evita problemas de CORS en desarrollo y permite usar `VITE_API_URL=/api`.

---

## 5. Comandos

### Backend

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | `node --watch src/server.js`. Reinicia al guardar. |
| `npm start` | `node src/server.js`. Sin watch. |
| `npm test` | `node --test`. 10 pruebas de integración. |
| `npm run check` | `node --check src/server.js`. |

### Frontend

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Vite con HMR en 5173. Service Worker desactivado. |
| `npm run build` | Build de producción + inyección de precache en `dist/sw.js`. |
| `npm run preview` | Sirve `dist` en 4173. |
| `npm test` | 18 pruebas unitarias con `node:test`. |

### Secuencia recomendada antes de entregar

```bash
cd backend && npm test
cd ../frontend && npm test
npm run build
npm run preview
```

---

## 6. Probar la PWA en condiciones reales

El Service Worker está desactivado en desarrollo para no cachear el HMR. Para probar offline:

```bash
cd frontend
npm run build
npm run preview
```

Abrir `http://localhost:4173`.

1. La primera carga registra el Service Worker.
2. Recargar una vez si la pestaña aún no está controlada.
3. En DevTools → Application:
   - **Manifest:** sin errores.
   - **Service Workers:** estado `activated and is running`.
   - **Cache Storage:** `techservice-shell-<build>` y `techservice-runtime-<build>`.
4. Simular offline con DevTools o deteniendo el servidor de preview.
5. Recargar: la app debe cargar desde caché.
6. Crear un reporte: debe quedar `Pendiente`.
7. Recargar: debe seguir ahí.
8. Volver a conectar: debe pasar a `Sincronizado`.

### Alternativa: activar el SW en desarrollo

```dotenv
VITE_ENABLE_SW=true
```

Requiere recargar dos veces y puede interferir con el HMR. Para la demostración final se recomienda `build` + `preview`.

### Probar en un teléfono físico

El Service Worker exige contexto seguro. Opciones:

1. **Desplegar** el frontend en Vercel/Netlify (HTTPS) y la API en Render.
2. **Túnel HTTPS** con ngrok:

   ```bash
   ngrok http 4173
   ```

   Añadir el dominio del túnel a `CORS_ORIGINS` del backend.

3. **Red local con HTTP:** el Service Worker no se registrará. No es una opción válida para offline.

---

## 7. Estructura de datos y reinicio

### 7.1 Backend

La base se crea automáticamente en `backend/data/techservice.sqlite`. Para reiniciar desde cero:

```bash
# Detener el servidor y eliminar el archivo
rm backend/data/techservice.sqlite*
```

En Windows PowerShell:

```powershell
Remove-Item backend/data/techservice.sqlite* -Force
```

Al arrancar de nuevo se aplican las migraciones.

### 7.2 Frontend

Los datos viven en IndexedDB, no en el sistema de archivos. Para limpiarlos:

- **Ajustes → Borrar datos locales**, o
- DevTools → Application → Storage → Clear site data.

El botón de Ajustes elimina los reportes locales, pero **no** los del servidor. Para borrar también los del servidor, usar el detalle del reporte (si está sincronizado) o la API.

---

## 8. Solución de problemas

### 8.1 `better-sqlite3` no instala

**Síntomas:** error de compilación `node-gyp`, `Python not found`, `MSBuild not found`.

**Solución:**

- Usar Node 20/22/24 LTS.
- Windows: instalar Build Tools de Visual Studio con C++.
- Linux: `sudo apt install build-essential python3`.
- Borrar `node_modules` y `package-lock.json`, reinstalar.
- Verificar que no haya una versión de Node sin binario precompilado.

### 8.2 El puerto 4000 o 4173 está ocupado

**Windows:**

```powershell
Get-NetTCPConnection -LocalPort 4000 | Select-Object OwningProcess
Stop-Process -Id <PID>
```

**Linux/macOS:**

```bash
lsof -i :4000
kill <PID>
```

También se puede cambiar `PORT` en backend y el puerto de preview en `vite.config.js`.

### 8.3 Error de CORS

**Síntomas:** el navegador bloquea `http://localhost:4000/api/...`.

**Solución:**

- Añadir el origen exacto (esquema + host + puerto) a `CORS_ORIGINS`.
- No incluir barra final.
- Reiniciar el backend tras cambiar `.env`.
- Recordar que `file://` no es un origen válido para la API.

### 8.4 El Service Worker no se registra

Causas frecuentes:

- Se está usando `http://` en una IP de red local.
- Se abrió el `dist/index.html` con `file://`.
- El navegador tiene el sitio bloqueado para cookies/almacenamiento.
- Se está en `npm run dev` con `VITE_ENABLE_SW=false`.

**Solución:** usar `npm run build && npm run preview` en `localhost`, o desplegar con HTTPS.

### 8.5 La app sigue mostrando una versión antigua

El Service Worker sirve el shell cacheado. Para forzar la actualización:

1. Ajustes → “Buscar actualización del SW”.
2. Recargar dos veces.
3. DevTools → Application → Service Workers → Update / Unregister.
4. Como último recurso: Clear site data.

En producción, cada build inyecta un `BUILD_ID` nuevo y `activate` elimina las cachés anteriores.

### 8.6 El proxy devuelve 502 al probar offline

Es el comportamiento esperado cuando el servidor de preview está detenido. El Service Worker detecta que la respuesta no es OK y sirve el app shell cacheado. Si aparece una pantalla 502, verificar que el SW esté activo y que la primera visita online haya precargado el shell.

### 8.7 `navigator.onLine` sigue en `true` sin Internet

Los navegadores no siempre detectan la pérdida real de conectividad. La app no depende sólo de `navigator.onLine`: si el `fetch` falla, el reporte queda pendiente y se reintenta. Para pruebas controladas se puede simular offline desde DevTools.

### 8.8 Los acentos se ven mal en la consola de Windows

Es un problema de codificación de la consola (`chcp`), no de los datos. Verificar con:

```powershell
chcp 65001
```

Los archivos del proyecto se guardan en UTF-8. La API y SQLite conservan los caracteres correctamente.

### 8.9 La instalación PWA no aparece

- Debe ser HTTPS o localhost.
- El manifest debe ser válido y los iconos deben responder 200.
- El navegador debe considerar que la app cumple los criterios de instalación.
- En iOS no existe aviso automático: es manual desde Safari.

---

## 9. Convenciones de código

- **JavaScript ESM** en frontend y backend (`"type": "module"`).
- Nombres de API en **camelCase**; columnas SQL en **snake_case**.
- Funciones y variables en inglés; textos de interfaz en español.
- Componentes React en `PascalCase`; hooks con prefijo `use`.
- Errores de API con código estable en mayúsculas (`VALIDATION_ERROR`).
- No se usan clases de utilidad externas; el CSS es propio y centralizado.
- Los cambios de esquema local deben reflejarse también en `public/sw.js` si afectan al store `reports`.

---

## 10. Flujo de trabajo recomendado

```text
1. Crear rama:            git checkout -b feat/mi-cambio
2. Desarrollar frontend:  npm run dev
3. Desarrollar backend:   npm run dev
4. Pruebas:               npm test (ambos)
5. Build:                 npm run build
6. Prueba PWA:            npm run preview
7. Verificar Lighthouse y offline
8. Commit y push
```

Antes de cada commit, revisar que `.env`, `data/` y `node_modules/` no estén en el índice de Git.

---

## 11. Recursos de referencia

- [Vite — Documentación](https://vite.dev/)
- [React — Documentación](https://react.dev/)
- [Dexie.js](https://dexie.org/)
- [MDN — Service Worker API](https://developer.mozilla.org/es/docs/Web/API/Service_Worker_API)
- [web.dev — PWA](https://web.dev/learn/pwa/)
- [Express](https://expressjs.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

---

## 12. Conclusión

El entorno se levanta con dos comandos (`npm install` y `npm run dev`) por cada proyecto. La complejidad real está en probar la PWA: debe hacerse sobre un build de producción y en contexto seguro. Esta guía cubre los errores más comunes observados durante el desarrollo y la forma de reproducir las condiciones de campo.
