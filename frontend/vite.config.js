import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Inyecta en dist/sw.js la lista de assets con hash generados por Vite y un
 * identificador de build. Así el Service Worker precarga TODO el bundle y las
 * nuevas versiones invalidan las cachés anteriores.
 */
function injectServiceWorkerPrecache() {
  return {
    name: 'techservice-inject-sw-precache',
    apply: 'build',
    closeBundle() {
      const swPath = path.join(__dirname, 'dist', 'sw.js');
      const assetsDir = path.join(__dirname, 'dist', 'assets');

      if (!fs.existsSync(swPath)) {
        console.warn('[sw-precache] No se encontró dist/sw.js; se omite la inyección.');
        return;
      }

      const assets = fs.existsSync(assetsDir)
        ? fs
            .readdirSync(assetsDir, { recursive: true })
            .filter((file) => /\.(js|css|woff2?|png|svg|webp)$/i.test(file))
            .map((file) => `/assets/${String(file).replaceAll('\\', '/')}`)
        : [];

      const buildId = Date.now().toString(36);
      const list = assets.map((asset) => JSON.stringify(asset)).join(', ');

      let sw = fs.readFileSync(swPath, 'utf8');
      sw = sw.replace("const BUILD_ID = 'dev';", `const BUILD_ID = '${buildId}';`);
      sw = sw.replace('/* INJECT:PRECACHE */', list);
      fs.writeFileSync(swPath, sw, 'utf8');

      console.log(
        `[sw-precache] Build ${buildId}: ${assets.length} assets inyectados en dist/sw.js`
      );
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react(), injectServiceWorkerPrecache()],
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    },
    preview: {
      port: 4173,
      strictPort: false
    },
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0')
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 900
    }
  };
});
