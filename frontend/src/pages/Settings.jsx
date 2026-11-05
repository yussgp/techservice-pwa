import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cloud,
  Database,
  Download,
  HardDrive,
  Info,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { db } from '../database/db.js';
import {
  clearLocalReports,
  exportLocalReports
} from '../database/reportRepository.js';
import { useSync } from '../context/SyncContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useInstall } from '../context/InstallContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { ConnectionBadge } from '../components/ConnectionBadge.jsx';
import { SyncButton } from '../components/SyncButton.jsx';
import {
  getApiBase,
  getDefaultApiBase,
  getHealth,
  hasCustomApiBase,
  resetApiBase,
  setApiBase
} from '../services/api.js';
import { clearLastSync } from '../services/syncService.js';
import {
  getCacheNames,
  getServiceWorkerState,
  sendApiBaseToServiceWorker,
  updateServiceWorker
} from '../services/pwa.js';
import { formatBytes, formatDateTime, timeAgo } from '../utils/format.js';
import { cn } from '../utils/classNames.js';

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function Settings() {
  useDocumentTitle('Ajustes');
  const {
    counts,
    lastSyncAt,
    isOnline,
    isSyncing,
    syncNow
  } = useSync();
  const { addToast } = useToast();
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstall();

  const [apiInput, setApiInput] = useState(getApiBase);
  const [savingApi, setSavingApi] = useState(false);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [persisted, setPersisted] = useState(false);
  const [requestingPersistence, setRequestingPersistence] = useState(false);
  const [swState, setSwState] = useState(null);
  const [cacheNames, setCacheNames] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [updatingSw, setUpdatingSw] = useState(false);

  const refreshDiagnostics = useCallback(async () => {
    setRefreshing(true);
    const [sw, caches] = await Promise.all([getServiceWorkerState(), getCacheNames()]);
    setSwState(sw);
    setCacheNames(caches);

    if (navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        setStorage({ usage: estimate.usage || 0, quota: estimate.quota || 0 });
      } catch {
        setStorage({ usage: 0, quota: 0 });
      }
    }
    if (navigator.storage?.persisted) {
      try {
        setPersisted(await navigator.storage.persisted());
      } catch {
        setPersisted(false);
      }
    }
    setRefreshing(false);
  }, []);

  const testConnection = useCallback(
    async ({ silent = false } = {}) => {
      setTesting(true);
      setHealthError(null);
      try {
        const data = await getHealth();
        setHealth(data);
        if (!silent) {
          addToast({
            type: 'success',
            title: 'Servidor disponible',
            message: `API v${data?.version || '—'} · entorno ${data?.environment || '—'}.`
          });
        }
        return data;
      } catch (error) {
        setHealth(null);
        setHealthError(error?.message || 'No se pudo conectar con la API.');
        if (!silent) {
          addToast({
            type: 'error',
            title: 'Sin respuesta del servidor',
            message: error?.message || 'Revisa la URL de la API y que el backend esté encendido.'
          });
        }
        return null;
      } finally {
        setTesting(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    refreshDiagnostics();
    testConnection({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApiSubmit(event) {
    event.preventDefault();
    setSavingApi(true);
    try {
      const normalized = setApiBase(apiInput);
      setApiInput(normalized);
      await sendApiBaseToServiceWorker();
      addToast({
        type: 'success',
        title: 'URL de la API actualizada',
        message: normalized
      });
      await testConnection({ silent: true });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'URL no válida',
        message: error?.message || 'Escribe una URL http(s) válida.'
      });
    } finally {
      setSavingApi(false);
    }
  }

  async function handleApiReset() {
    const value = resetApiBase();
    setApiInput(value);
    await sendApiBaseToServiceWorker();
    addToast({
      type: 'info',
      title: 'Configuración restablecida',
      message: `Usando la URL por defecto: ${value}`
    });
    testConnection({ silent: true });
  }

  async function handleInstall() {
    if (!canInstall) return;
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      addToast({
        type: 'success',
        title: 'Instalación iniciada',
        message: 'TechService se agregará a tu pantalla de inicio.'
      });
    }
  }

  async function handleExport() {
    const data = await exportLocalReports();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `techservice-reportes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      title: 'Respaldo generado',
      message: `Se exportaron ${data.count} reportes en formato JSON.`
    });
  }

  async function handleRequestPersistence() {
    if (!navigator.storage?.persist) {
      addToast({
        type: 'warning',
        title: 'No disponible',
        message: 'Este navegador no permite solicitar almacenamiento persistente.'
      });
      return;
    }
    setRequestingPersistence(true);
    try {
      const granted = await navigator.storage.persist();
      setPersisted(granted);
      addToast({
        type: granted ? 'success' : 'warning',
        title: granted ? 'Almacenamiento persistente activado' : 'Solicitud no concedida',
        message: granted
          ? 'El navegador protegerá mejor los datos offline de TechService.'
          : 'El navegador decidió no conceder persistencia. La app seguirá funcionando, pero podría liberar espacio en condiciones extremas.'
      });
    } finally {
      setRequestingPersistence(false);
      refreshDiagnostics();
    }
  }

  async function handleClearData() {
    setClearing(true);
    try {
      await clearLocalReports();
      clearLastSync();
      setClearOpen(false);
      addToast({
        type: 'success',
        title: 'Datos locales eliminados',
        message: 'Los reportes guardados en el servidor no se modificaron.'
      });
      refreshDiagnostics();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'No se pudieron borrar los datos',
        message: error?.message || 'Inténtalo de nuevo.'
      });
    } finally {
      setClearing(false);
    }
  }

  async function handleSwUpdate() {
    setUpdatingSw(true);
    const ok = await updateServiceWorker();
    setUpdatingSw(false);
    addToast({
      type: ok ? 'info' : 'warning',
      title: ok ? 'Buscando actualización' : 'Service Worker no disponible',
      message: ok
        ? 'Si hay una versión nueva, se activará al recargar la aplicación.'
        : 'Registra el Service Worker ejecutando el build de producción.'
    });
    refreshDiagnostics();
  }

  const usagePercent =
    storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  const serverUp = Boolean(health) && !healthError;

  return (
    <div className="page settings-page">
      <PageHeader
        title="Ajustes y diagnóstico"
        description="Configura la conexión con la API, revisa el almacenamiento offline y verifica el Service Worker."
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={refreshDiagnostics}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'spin' : undefined} aria-hidden="true" />
          Actualizar diagnóstico
        </button>
      </PageHeader>

      <div className="settings-grid">
        <div className="settings-main">
          <section className="card settings-card">
            <div className="settings-card__header">
              <span className="settings-card__icon" aria-hidden="true">
                <Server size={20} />
              </span>
              <div>
                <h2>Conexión con el servidor</h2>
                <p>URL base de la API REST que recibe los reportes.</p>
              </div>
            </div>

            <form onSubmit={handleApiSubmit} className="settings-form">
              <label htmlFor="apiBase" className="field-label">
                URL base de la API
              </label>
              <div className="input-with-button">
                <input
                  id="apiBase"
                  name="apiBase"
                  className="input input--mono"
                  value={apiInput}
                  onChange={(event) => setApiInput(event.target.value)}
                  placeholder="http://localhost:4000/api"
                  autoComplete="url"
                  spellCheck={false}
                />
                <button type="submit" className="btn btn-primary" disabled={savingApi}>
                  <Save size={16} aria-hidden="true" />
                  {savingApi ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
              <p className="field-hint">
                Ejemplos: <code>/api</code> (mismo dominio con reverse proxy),{' '}
                <code>http://localhost:4000/api</code> (desarrollo local) o{' '}
                <code>https://tu-api.ejemplo.com/api</code> (producción). Si omites{' '}
                <code>/api</code>, se añade automáticamente.
              </p>

              <div className="settings-form__actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => testConnection()}
                  disabled={testing}
                >
                  <Activity size={15} className={testing ? 'spin' : undefined} aria-hidden="true" />
                  {testing ? 'Comprobando…' : 'Probar conexión'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleApiReset}
                  disabled={!hasCustomApiBase()}
                >
                  <RotateCcw size={15} aria-hidden="true" />
                  Restablecer
                </button>
                <span className="settings-form__default">
                  Por defecto: <code>{getDefaultApiBase()}</code>
                </span>
              </div>
            </form>

            <div
              className={cn(
                'server-status',
                serverUp && 'server-status--ok',
                healthError && 'server-status--error',
                !serverUp && !healthError && 'server-status--idle'
              )}
            >
              <span className="server-status__icon" aria-hidden="true">
                {serverUp ? (
                  <CheckCircle2 size={20} />
                ) : healthError ? (
                  <AlertTriangle size={20} />
                ) : (
                  <Clock3 size={20} />
                )}
              </span>
              <div className="server-status__content">
                <strong>
                  {serverUp
                    ? 'Servidor disponible'
                    : healthError
                      ? 'No se pudo contactar al servidor'
                      : 'Sin comprobar'}
                </strong>
                <p>
                  {serverUp
                    ? `La API respondió correctamente desde ${getApiBase()}.`
                    : healthError || 'Pulsa “Probar conexión” para verificar el backend.'}
                </p>
                {serverUp ? (
                  <dl className="server-meta">
                    <InfoRow label="Versión" value={health.version || '—'} />
                    <InfoRow label="Entorno" value={health.environment || '—'} />
                    <InfoRow label="Base de datos" value={health.database || '—'} />
                    <InfoRow
                      label="Actividad"
                      value={`${Math.floor((health.uptimeSeconds || 0) / 60)} min`}
                    />
                  </dl>
                ) : null}
              </div>
            </div>

            <div className="inline-note">
              {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
              <span>
                {isOnline
                  ? 'El dispositivo está en línea.'
                  : 'El dispositivo está sin conexión. La configuración se guarda localmente y se aplicará al volver Internet.'}
              </span>
            </div>
          </section>

          <section className="card settings-card" id="instalar">
            <div className="settings-card__header">
              <span className="settings-card__icon" aria-hidden="true">
                <Smartphone size={20} />
              </span>
              <div>
                <h2>Instalación de la PWA</h2>
                <p>Agrega TechService a la pantalla de inicio de tu dispositivo.</p>
              </div>
            </div>

            {isInstalled ? (
              <div className="install-status install-status--ok">
                <CheckCircle2 size={20} aria-hidden="true" />
                <div>
                  <strong>Aplicación instalada</strong>
                  <p>TechService se está ejecutando en modo standalone.</p>
                </div>
              </div>
            ) : (
              <>
                {canInstall ? (
                  <button type="button" className="btn btn-primary" onClick={handleInstall}>
                    <Download size={16} aria-hidden="true" />
                    Instalar TechService
                  </button>
                ) : null}

                <div className="install-steps">
                  <div className="install-steps__column">
                    <h3>Android / Escritorio (Chrome, Edge)</h3>
                    <ol>
                      <li>Abre la app con HTTPS o en localhost.</li>
                      <li>Pulsa el botón “Instalar” del navegador o el menú ⋮.</li>
                      <li>Selecciona “Instalar aplicación” o “Agregar a la pantalla principal”.</li>
                    </ol>
                  </div>
                  <div className="install-steps__column">
                    <h3>iPhone / iPad (Safari)</h3>
                    <ol>
                      <li>Abre la app en Safari.</li>
                      <li>Pulsa el botón Compartir.</li>
                      <li>Elige “Añadir a pantalla de inicio” y confirma.</li>
                    </ol>
                  </div>
                </div>

                <div className="inline-note">
                  <Info size={15} />
                  <span>
                    {isIOS
                      ? 'En iOS la instalación es manual desde Safari; no existe el aviso automático beforeinstallprompt.'
                      : 'La instalación requiere HTTPS (o localhost). Si el navegador no ofrece el botón, revisa el menú del navegador.'}
                  </span>
                </div>
              </>
            )}
          </section>

          <section className="card settings-card">
            <div className="settings-card__header">
              <span className="settings-card__icon settings-card__icon--green" aria-hidden="true">
                <Database size={20} />
              </span>
              <div>
                <h2>Almacenamiento local y datos</h2>
                <p>Reportes guardados en IndexedDB en este dispositivo.</p>
              </div>
            </div>

            <div className="storage-stats">
              <div>
                <strong>{counts.total}</strong>
                <span>Totales</span>
              </div>
              <div>
                <strong>{counts.pending}</strong>
                <span>Pendientes</span>
              </div>
              <div>
                <strong>{counts.synced}</strong>
                <span>Sincronizados</span>
              </div>
              <div>
                <strong>{counts.error}</strong>
                <span>Con error</span>
              </div>
            </div>

            <div className="storage-bar">
              <div className="storage-bar__header">
                <span>Uso estimado de almacenamiento</span>
                <strong>
                  {formatBytes(storage.usage)} de {formatBytes(storage.quota)}
                </strong>
              </div>
              <div
                className="storage-bar__track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(usagePercent)}
                aria-label="Uso de almacenamiento"
              >
                <span style={{ width: `${usagePercent}%` }} />
              </div>
              <p>
                Las cuotas dependen del navegador, del dispositivo y del espacio libre. No son
                un valor fijo garantizado.
              </p>
            </div>

            <dl className="settings-meta">
              <InfoRow label="Última sincronización" value={lastSyncAt ? `${timeAgo(lastSyncAt)} · ${formatDateTime(lastSyncAt)}` : 'Nunca'} />
              <InfoRow
                label="Almacenamiento persistente"
                value={persisted ? 'Concedido' : 'No concedido / no disponible'}
              />
              <InfoRow label="Estado de conexión" value={isOnline ? 'En línea' : 'Sin conexión'} />
            </dl>

            <div className="settings-actions">
              <SyncButton variant="secondary" size="sm" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleExport}>
                <Download size={15} aria-hidden="true" />
                Exportar JSON
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleRequestPersistence}
                disabled={requestingPersistence || persisted}
              >
                <ShieldCheck size={15} aria-hidden="true" />
                {persisted ? 'Almacenamiento protegido' : 'Solicitar persistencia'}
              </button>
              <button
                type="button"
                className="btn btn-danger-ghost btn-sm"
                onClick={() => setClearOpen(true)}
                disabled={counts.total === 0}
              >
                <Trash2 size={15} aria-hidden="true" />
                Borrar datos locales
              </button>
            </div>
          </section>
        </div>

        <aside className="settings-side">
          <section className="card settings-card">
            <div className="settings-card__header">
              <span className="settings-card__icon" aria-hidden="true">
                <Cloud size={20} />
              </span>
              <div>
                <h2>Service Worker</h2>
                <p>Control de caché y funcionamiento offline.</p>
              </div>
            </div>

            <div className="sw-status">
              <ConnectionBadge compact />
              {isSyncing ? <span className="sw-status__syncing">Sincronizando…</span> : null}
            </div>

            <dl className="settings-meta">
              <InfoRow label="Soportado" value={swState?.supported ? 'Sí' : 'No'} />
              <InfoRow label="Registrado" value={swState?.registered ? 'Sí' : 'No'} />
              <InfoRow label="Activo" value={swState?.active ? 'Sí' : 'No'} />
              <InfoRow label="Controlando la página" value={swState?.controlled ? 'Sí' : 'No'} />
              <InfoRow label="Scope" value={swState?.scope || '—'} />
              <InfoRow label="Cachés" value={cacheNames.length > 0 ? cacheNames.join(', ') : 'Sin cachés'} />
            </dl>

            <div className="settings-actions settings-actions--column">
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-block"
                onClick={handleSwUpdate}
                disabled={updatingSw}
              >
                <RefreshCw size={15} className={updatingSw ? 'spin' : undefined} aria-hidden="true" />
                Buscar actualización del SW
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-block"
                onClick={refreshDiagnostics}
                disabled={refreshing}
              >
                <HardDrive size={15} aria-hidden="true" />
                Refrescar diagnóstico
              </button>
            </div>

            <p className="card__hint">
              En desarrollo el Service Worker está desactivado por defecto para evitar caché
              durante el HMR. Usa <code>npm run build</code> y <code>npm run preview</code> para
              probar la PWA real.
            </p>
          </section>

          <section className="card settings-card">
            <div className="settings-card__header">
              <span className="settings-card__icon" aria-hidden="true">
                <Info size={20} />
              </span>
              <div>
                <h2>Acerca de TechService</h2>
                <p>Información técnica de la aplicación.</p>
              </div>
            </div>

            <div className="about-app">
              <span className="about-app__mark" aria-hidden="true">
                TS
              </span>
              <div>
                <strong>TechService PWA</strong>
                <p>Versión {__APP_VERSION__}</p>
              </div>
            </div>

            <ul className="tech-list">
              <li>React + Vite</li>
              <li>Service Worker + Cache API</li>
              <li>IndexedDB con Dexie.js</li>
              <li>Express + SQLite</li>
              <li>Background Sync progresivo</li>
            </ul>

            <div className="inline-note">
              <Clock3 size={15} />
              <span>
                Los datos offline se guardan únicamente en este navegador. Exporta un respaldo
                antes de borrar los datos del sitio.
              </span>
            </div>

            <p className="card__hint">
              Documentación académica disponible en la carpeta <code>/docs</code> del
              repositorio.
            </p>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={clearOpen}
        title="¿Borrar todos los datos locales?"
        description="Se eliminarán todos los reportes guardados en IndexedDB de este dispositivo, incluidos los pendientes de sincronizar. Los reportes ya sincronizados en el servidor NO se borran. Esta acción no se puede deshacer."
        confirmLabel="Borrar datos locales"
        cancelLabel="Cancelar"
        tone="danger"
        icon={Trash2}
        loading={clearing}
        onConfirm={handleClearData}
        onCancel={() => setClearOpen(false)}
      >
        <p className="modal__warning">
          {counts.pending + counts.error > 0
            ? `Atención: hay ${counts.pending + counts.error} reporte(s) sin sincronizar que se perderán.`
            : 'No hay reportes pendientes en la cola local.'}
        </p>
      </ConfirmDialog>
    </div>
  );
}
