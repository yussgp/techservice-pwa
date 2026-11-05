import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AUTO_SYNC_INTERVAL_MS, LAST_SYNC_STORAGE_KEY } from '../constants.js';
import {
  getCounts,
  touchReportsFailed,
  touchReportsSynced
} from '../database/reportRepository.js';
import {
  LAST_SYNC_EVENT,
  getLastSyncAt,
  recordLastSync,
  syncPendingReports
} from '../services/syncService.js';
import {
  registerServiceWorker,
  requestBackgroundSync,
  sendApiBaseToServiceWorker
} from '../services/pwa.js';
import { useNetworkStatus } from '../hooks/useNetworkStatus.js';
import { useToast } from './ToastContext.jsx';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const isOnline = useNetworkStatus();
  const { addToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(getLastSyncAt);
  const [lastResult, setLastResult] = useState(null);
  const counts = useLiveQuery(() => getCounts(), [], {
    total: 0,
    pending: 0,
    synced: 0,
    error: 0
  });

  const runRef = useRef(null);
  const isOnlineRef = useRef(isOnline);
  const previousOnlineRef = useRef(isOnline);
  const lastBackgroundFailureRef = useRef(0);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const runSync = useCallback(
    (manual = false, reason = 'auto') => {
      if (runRef.current) return runRef.current;

      setIsSyncing(true);

      const promise = (async () => {
        const result = await syncPendingReports({ manual });
        setLastResult(result);
        if (result?.lastSyncAt) setLastSyncAt(result.lastSyncAt);

        if (manual) {
          if (result.offline) {
            addToast({
              type: 'warning',
              title: 'Sin conexión',
              message:
                'No es posible sincronizar ahora. Los reportes permanecen guardados en este dispositivo.'
            });
          } else if (result.noPending) {
            if (result.healthError) {
              addToast({
                type: 'error',
                title: 'No se pudo contactar al servidor',
                message: result.healthError
              });
            } else {
              addToast({
                type: 'info',
                title: 'Todo al día',
                message: 'No hay reportes pendientes de sincronización.'
              });
            }
          } else if (result.synced > 0 && result.failed === 0) {
            addToast({
              type: 'success',
              title: 'Sincronización completada',
              message: `${result.synced} reporte${result.synced === 1 ? '' : 's'} sincronizado${result.synced === 1 ? '' : 's'} correctamente.`
            });
          } else if (result.synced > 0 && result.failed > 0) {
            addToast({
              type: 'warning',
              title: 'Sincronización parcial',
              message: `${result.synced} sincronizado(s) y ${result.failed} con error. Revisa el historial.`
            });
          } else if (result.failed > 0) {
            addToast({
              type: 'error',
              title: 'No se pudo sincronizar',
              message: result.errorMessages[0] || 'Revisa la conexión con el servidor.'
            });
          }
        } else if (result.synced > 0) {
          addToast({
            type: 'success',
            title: 'Reportes sincronizados',
            message: `${result.synced} reporte${result.synced === 1 ? '' : 's'} enviado${result.synced === 1 ? '' : 's'} al servidor.`
          });
        } else if (reason === 'online' && result.failed > 0) {
          addToast({
            type: 'warning',
            title: 'Sincronización pendiente',
            message: 'No se pudo completar el envío. Se reintentará automáticamente.'
          });
        }

        return result;
      })()
        .catch((error) => {
          if (manual) {
            addToast({
              type: 'error',
              title: 'Error inesperado al sincronizar',
              message: error?.message || 'Inténtalo de nuevo.'
            });
          }
          return null;
        })
        .finally(() => {
          runRef.current = null;
          setIsSyncing(false);
        });

      runRef.current = promise;
      return promise;
    },
    [addToast]
  );

  // Registro del Service Worker y sincronización al iniciar la aplicación.
  useEffect(() => {
    let cancelled = false;

    registerServiceWorker()
      .then(() => sendApiBaseToServiceWorker())
      .catch(() => {});

    const timer = setTimeout(() => {
      if (!cancelled) {
        if (isOnlineRef.current) runSync(false, 'startup');
        else requestBackgroundSync();
      }
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runSync]);

  // Eventos online/offline.
  useEffect(() => {
    if (previousOnlineRef.current === isOnline) return;
    previousOnlineRef.current = isOnline;

    if (isOnline) {
      addToast({
        type: 'success',
        title: 'Conexión restablecida',
        message: 'Sincronizando los reportes guardados en el dispositivo.'
      });
      runSync(false, 'online');
    } else {
      addToast({
        type: 'warning',
        title: 'Sin conexión',
        message: 'Los nuevos reportes se guardarán localmente y se enviarán al recuperar la conexión.'
      });
      requestBackgroundSync();
    }
  }, [isOnline, addToast, runSync]);

  // Reintento periódico mientras haya conexión.
  useEffect(() => {
    if (!isOnline) return undefined;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') runSync(false, 'interval');
    }, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isOnline, runSync]);

  // Al volver a primer plano (móviles suspenden la app).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isOnlineRef.current) {
        runSync(false, 'visible');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [runSync]);

  // Sincronización realizada desde otra pestaña.
  useEffect(() => {
    const handleLastSync = (event) => {
      setLastSyncAt(event.detail ?? getLastSyncAt());
    };
    const handleStorage = (event) => {
      if (event.key === LAST_SYNC_STORAGE_KEY) setLastSyncAt(getLastSyncAt());
    };
    const handleApiChange = () => sendApiBaseToServiceWorker();

    window.addEventListener(LAST_SYNC_EVENT, handleLastSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('techservice:api-changed', handleApiChange);

    return () => {
      window.removeEventListener(LAST_SYNC_EVENT, handleLastSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('techservice:api-changed', handleApiChange);
    };
  }, []);

  // Mensajes del Service Worker (Background Sync).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return undefined;
    }

    const handleMessage = async (event) => {
      const data = event.data || {};

      if (data.type === 'BACKGROUND_SYNC_COMPLETE') {
        await touchReportsSynced(data.syncedIds || []);
        await touchReportsFailed(data.failedIds || []);

        if (data.syncedAt) {
          recordLastSync(data.syncedAt);
          setLastSyncAt(data.syncedAt);
        }

        const synced = data.syncedIds?.length || 0;
        const failed = data.failedIds?.length || 0;

        if (synced > 0) {
          addToast({
            type: 'success',
            title: 'Sincronización en segundo plano',
            message: `${synced} reporte${synced === 1 ? '' : 's'} sincronizado${synced === 1 ? '' : 's'} mientras la app estaba en segundo plano.`
          });
        } else if (failed === 0 && data.summary?.duplicates > 0) {
          addToast({
            type: 'info',
            title: 'Cola de sincronización al día',
            message: 'Los reportes ya existían en el servidor; no se crearon duplicados.'
          });
        }

        if (failed > 0) {
          addToast({
            type: 'warning',
            title: 'Algunos reportes requieren atención',
            message: `${failed} reporte${failed === 1 ? '' : 's'} fue${failed === 1 ? '' : 'ron'} rechazado${failed === 1 ? '' : 's'} por el servidor.`
          });
        }
      }

      if (data.type === 'BACKGROUND_SYNC_FAILED') {
        const now = Date.now();
        if (now - lastBackgroundFailureRef.current > 60_000) {
          lastBackgroundFailureRef.current = now;
          addToast({
            type: 'warning',
            title: 'Sincronización en segundo plano',
            message:
              data.message ||
              'No se pudo contactar al servidor. Se reintentará al abrir la aplicación.'
          });
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [addToast]);

  const syncNow = useCallback((manual = true) => runSync(manual, 'manual'), [runSync]);

  const value = useMemo(
    () => ({
      isOnline,
      isSyncing,
      lastSyncAt,
      lastResult,
      counts,
      total: counts.total,
      pendingCount: counts.pending,
      syncedCount: counts.synced,
      errorCount: counts.error,
      unsyncedCount: counts.pending + counts.error,
      syncNow,
      runSync
    }),
    [isOnline, isSyncing, lastSyncAt, lastResult, counts, syncNow, runSync]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync debe usarse dentro de SyncProvider');
  return context;
}
