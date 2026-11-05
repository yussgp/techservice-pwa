import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Plus, WifiOff } from 'lucide-react';
import { Sidebar } from '../components/Sidebar.jsx';
import { MobileNav } from '../components/MobileNav.jsx';
import { ConnectionBadge } from '../components/ConnectionBadge.jsx';
import { SyncButton } from '../components/SyncButton.jsx';
import { Logo } from '../components/Logo.jsx';
import { useSync } from '../context/SyncContext.jsx';

function resolveSectionTitle(pathname) {
  if (pathname === '/') return 'Panel de control';
  if (pathname === '/reports/new') return 'Nuevo reporte';
  if (pathname === '/reports') return 'Historial';
  if (pathname.startsWith('/reports/')) return 'Detalle del reporte';
  if (pathname === '/settings') return 'Ajustes';
  return 'TechService';
}

export function AppLayout() {
  const { pathname } = useLocation();
  const { isOnline } = useSync();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>

      <Sidebar />

      <div className="app-body">
        <header className="topbar">
          <div className="topbar__left">
            <Link to="/" className="topbar__brand" aria-label="TechService, ir al inicio">
              <Logo compact />
            </Link>
            <span className="topbar__divider" aria-hidden="true" />
            <span className="topbar__section">{resolveSectionTitle(pathname)}</span>
          </div>

          <div className="topbar__actions">
            <ConnectionBadge compact />
            <SyncButton compact variant="secondary" />
            <Link to="/reports/new" className="btn btn-primary btn-sm topbar__new">
              <Plus size={16} aria-hidden="true" />
              <span>Nuevo</span>
            </Link>
          </div>
        </header>

        {!isOnline ? (
          <div className="offline-banner" role="status">
            <WifiOff size={16} aria-hidden="true" />
            <span>
              <strong>Modo offline.</strong> Los reportes se guardan en este dispositivo y se
              sincronizarán al recuperar la conexión.
            </span>
          </div>
        ) : null}

        <main id="main-content" className="app-main">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
