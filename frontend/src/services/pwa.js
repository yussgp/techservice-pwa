import { SYNC_TAG } from '../constants.js';
import { getApiBase } from './api.js';

const SW_PATH = '/sw.js';

export function isServiceWorkerSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function isBackgroundSyncSupported() {
  return isServiceWorkerSupported() && 'SyncManager' in window;
}

async function clearDevelopmentCaches() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('techservice-'))
        .map((key) => caches.delete(key))
    );
  } catch {
    // Sin consecuencias: sólo es limpieza del entorno de desarrollo.
  }
}

/**
 * Registra el Service Worker. En desarrollo se desactiva por defecto para no
 * interferir con el HMR; se puede activar con VITE_ENABLE_SW=true.
 */
export async function registerServiceWorker() {
  if (!isServiceWorkerSupported()) return null;

  const devDisabled =
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_SW !== 'true';

  if (devDisabled) {
    await clearDevelopmentCaches();
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });

    registration.addEventListener('updatefound', () => {
      window.dispatchEvent(new CustomEvent('techservice:sw-update-found'));
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      sendApiBaseToServiceWorker();
    });

    await sendApiBaseToServiceWorker();
    return registration;
  } catch (error) {
    console.warn('[PWA] No se pudo registrar el Service Worker:', error);
    return null;
  }
}

/**
 * Comparte la URL base de la API con el Service Worker para que la
 * sincronización en segundo plano use el mismo destino que la app.
 */
export async function sendApiBaseToServiceWorker() {
  if (!isServiceWorkerSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const target = registration?.active || navigator.serviceWorker.controller;
    if (!target) return false;
    target.postMessage({ type: 'SET_API_BASE', apiBase: getApiBase() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Registra la etiqueta de Background Sync cuando el navegador la soporta.
 * Es un mecanismo oportunista: la app también sincroniza al iniciar, al
 * recuperar conexión, al volver a primer plano y de forma manual.
 */
export async function requestBackgroundSync() {
  if (!isBackgroundSyncSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}

export async function getServiceWorkerState() {
  if (!isServiceWorkerSupported()) {
    return { supported: false, registered: false, active: false, waiting: false, scope: null };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      supported: true,
      registered: Boolean(registration),
      active: Boolean(registration?.active),
      waiting: Boolean(registration?.waiting),
      installing: Boolean(registration?.installing),
      scope: registration?.scope ?? null,
      controlled: Boolean(navigator.serviceWorker.controller)
    };
  } catch {
    return { supported: true, registered: false, active: false, waiting: false, scope: null };
  }
}

export async function getCacheNames() {
  if (typeof caches === 'undefined') return [];
  try {
    const keys = await caches.keys();
    return keys.filter((key) => key.startsWith('techservice-'));
  } catch {
    return [];
  }
}

export async function updateServiceWorker() {
  if (!isServiceWorkerSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    await registration.update();
    return true;
  } catch {
    return false;
  }
}
