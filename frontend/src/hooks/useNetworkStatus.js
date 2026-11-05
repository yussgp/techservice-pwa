import { useEffect, useState } from 'react';

/**
 * Estado de conexión del navegador. navigator.onLine no es infalible (puede
 * indicar "online" en una red sin salida), por eso la app además valida las
 * respuestas HTTP y conserva la cola local hasta que el servidor confirme.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
