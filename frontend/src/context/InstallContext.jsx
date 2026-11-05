import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

const InstallContext = createContext(null);

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function detectIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPhoneLike = /iphone|ipad|ipod/i.test(ua);
  const iPadOS = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return iPhoneLike || iPadOS;
}

export function InstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(detectStandalone);
  const [isIOS] = useState(detectIOS);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const media = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayMode = () => setIsInstalled(detectStandalone());

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    media?.addEventListener?.('change', handleDisplayMode);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      media?.removeEventListener?.('change', handleDisplayMode);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice?.outcome ?? null;
  }, [deferredPrompt]);

  const value = useMemo(
    () => ({
      canInstall: Boolean(deferredPrompt),
      isInstalled,
      isIOS,
      promptInstall
    }),
    [deferredPrompt, isInstalled, isIOS, promptInstall]
  );

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

export function useInstall() {
  const context = useContext(InstallContext);
  if (!context) throw new Error('useInstall debe usarse dentro de InstallProvider');
  return context;
}
