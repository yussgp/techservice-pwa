import { NavLink } from 'react-router-dom';
import {
  ClipboardList,
  Home,
  Plus,
  Settings
} from 'lucide-react';
import { useSync } from '../context/SyncContext.jsx';
import { cn } from '../utils/classNames.js';

const ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/reports', label: 'Historial', icon: ClipboardList },
  { to: '/settings', label: 'Ajustes', icon: Settings }
];

export function MobileNav() {
  const { unsyncedCount } = useSync();

  return (
    <nav className="mobile-nav" aria-label="Navegación principal">
      <NavLink
        to="/"
        end
        className={({ isActive }) => cn('mobile-nav__item', isActive && 'is-active')}
      >
        <Home size={21} aria-hidden="true" />
        <span>Inicio</span>
      </NavLink>

      <NavLink
        to="/reports"
        className={({ isActive }) => cn('mobile-nav__item', isActive && 'is-active')}
      >
        <span className="mobile-nav__icon-wrap">
          <ClipboardList size={21} aria-hidden="true" />
          {unsyncedCount > 0 ? <span className="mobile-nav__badge">{unsyncedCount}</span> : null}
        </span>
        <span>Historial</span>
      </NavLink>

      <NavLink
        to="/reports/new"
        className={({ isActive }) =>
          cn('mobile-nav__item mobile-nav__item--primary', isActive && 'is-active')
        }
        aria-label="Nuevo reporte"
      >
        <span className="mobile-nav__fab">
          <Plus size={24} aria-hidden="true" />
        </span>
        <span>Nuevo</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) => cn('mobile-nav__item', isActive && 'is-active')}
      >
        <Settings size={21} aria-hidden="true" />
        <span>Ajustes</span>
      </NavLink>
    </nav>
  );
}
