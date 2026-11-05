import { NavLink, Link } from 'react-router-dom';
import {
  ClipboardList,
  Home,
  Plus,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { useSync } from '../context/SyncContext.jsx';
import { timeAgo } from '../utils/format.js';
import { cn } from '../utils/classNames.js';
import { Logo } from './Logo.jsx';
import { ConnectionBadge } from './ConnectionBadge.jsx';
import { SyncButton } from './SyncButton.jsx';
import { InstallButton } from './InstallButton.jsx';

const MAIN_NAV = [
  { to: '/', label: 'Panel de control', icon: Home, end: true },
  { to: '/reports/new', label: 'Nuevo reporte', icon: Plus, accent: true },
  { to: '/reports', label: 'Historial', icon: ClipboardList, showBadge: true },
  { to: '/settings', label: 'Ajustes', icon: Settings }
];

export function Sidebar() {
  const { lastSyncAt, unsyncedCount, isSyncing } = useSync();

  return (
    <aside className="sidebar" aria-label="Barra lateral">
      <div className="sidebar__brand">
        <Link to="/" className="brand-link" aria-label="TechService, ir al inicio">
          <Logo />
        </Link>
      </div>

      <nav className="sidebar__nav" aria-label="Navegación principal">
        <span className="sidebar__section-label">Operación</span>
        {MAIN_NAV.slice(0, 3).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'nav-link',
                  item.accent && 'nav-link--accent',
                  isActive && 'is-active'
                )
              }
            >
              <Icon size={19} aria-hidden="true" />
              <span>{item.label}</span>
              {item.showBadge && unsyncedCount > 0 ? (
                <span className="nav-link__badge">{unsyncedCount}</span>
              ) : null}
            </NavLink>
          );
        })}

        <span className="sidebar__section-label sidebar__section-label--spaced">Sistema</span>
        {MAIN_NAV.slice(3).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn('nav-link', isActive && 'is-active')}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <div className="connection-card">
          <div className="connection-card__top">
            <ConnectionBadge compact />
            {isSyncing ? <span className="connection-card__syncing">Sincronizando…</span> : null}
          </div>
          <p className="connection-card__meta">
            Última sincronización
            <strong>{timeAgo(lastSyncAt)}</strong>
          </p>
          {unsyncedCount > 0 ? (
            <p className="connection-card__pending">
              <span className="connection-card__pending-dot" aria-hidden="true" />
              {unsyncedCount} reporte{unsyncedCount === 1 ? '' : 's'} sin sincronizar
            </p>
          ) : (
            <p className="connection-card__ok">
              <ShieldCheck size={14} aria-hidden="true" />
              Todo sincronizado
            </p>
          )}
          <SyncButton variant="secondary" size="sm" className="btn-block" />
        </div>

        <InstallButton variant="ghost" size="sm" full />

        <p className="sidebar__version">v{__APP_VERSION__} · Funciona sin conexión</p>
      </div>
    </aside>
  );
}
