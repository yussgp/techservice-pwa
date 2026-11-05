import { API_BASE_STORAGE_KEY } from '../constants.js';

const ENV_API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details = undefined } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Normaliza la URL base de la API:
 * - Acepta rutas relativas (/api).
 * - Acepta URLs absolutas y añade /api si no está presente.
 * - Elimina barras finales, query y hash.
 */
export function normalizeApiBase(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return normalizeApiBase(ENV_API_BASE);

  if (raw.startsWith('/')) {
    const cleaned = raw.replace(/\/+$/, '');
    return cleaned || '/api';
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('La URL de la API no es válida.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('La URL de la API debe usar http o https.');
  }

  url.search = '';
  url.hash = '';
  let pathname = url.pathname.replace(/\/+$/, '');
  if (!pathname.endsWith('/api')) pathname = `${pathname}/api`;
  return `${url.origin}${pathname}`;
}

export function getDefaultApiBase() {
  try {
    return normalizeApiBase(ENV_API_BASE);
  } catch {
    return '/api';
  }
}

export function getApiBase() {
  try {
    const stored = localStorage.getItem(API_BASE_STORAGE_KEY);
    return stored ? normalizeApiBase(stored) : getDefaultApiBase();
  } catch {
    return getDefaultApiBase();
  }
}

export function setApiBase(value) {
  const normalized = normalizeApiBase(value);
  localStorage.setItem(API_BASE_STORAGE_KEY, normalized);
  window.dispatchEvent(new CustomEvent('techservice:api-changed', { detail: normalized }));
  return normalized;
}

export function resetApiBase() {
  localStorage.removeItem(API_BASE_STORAGE_KEY);
  const value = getDefaultApiBase();
  window.dispatchEvent(new CustomEvent('techservice:api-changed', { detail: value }));
  return value;
}

export function hasCustomApiBase() {
  try {
    return Boolean(localStorage.getItem(API_BASE_STORAGE_KEY));
  } catch {
    return false;
  }
}

function buildUrl(path) {
  const base = getApiBase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/+$/, '')}${cleanPath}`;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Petición JSON con timeout y errores homogéneos.
 */
async function request(path, { method = 'GET', body, timeout = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('La solicitud tardó demasiado. Verifica tu conexión.', {
        code: 'TIMEOUT'
      });
    }
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión a Internet.', {
      code: 'NETWORK_ERROR'
    });
  } finally {
    clearTimeout(timer);
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      error?.message || `El servidor respondió con el estado ${response.status}.`,
      {
        status: response.status,
        code: error?.code || 'HTTP_ERROR',
        details: error?.details
      }
    );
  }

  return payload;
}

export async function getHealth() {
  const payload = await request('/health', { timeout: 8000 });
  return payload?.data;
}

export async function listReports() {
  const payload = await request('/reports');
  return payload?.data ?? [];
}

export async function syncReports(reports) {
  const payload = await request('/reports/sync', {
    method: 'POST',
    body: { reports },
    timeout: 25000
  });
  return payload?.data;
}

export async function deleteReport(id) {
  const payload = await request(`/reports/${id}`, { method: 'DELETE' });
  return payload?.data;
}

export async function updateReport(id, data) {
  const payload = await request(`/reports/${id}`, {
    method: 'PUT',
    body: data
  });
  return payload?.data;
}

export async function createReport(data) {
  const payload = await request('/reports', { method: 'POST', body: data });
  return payload?.data;
}
