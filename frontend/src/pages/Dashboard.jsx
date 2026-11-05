import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  CloudOff,
  CloudUpload,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { db } from '../database/db.js';
import { useSync } from '../context/SyncContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { SyncBadge } from '../components/SyncBadge.jsx';
import { SyncButton } from '../components/SyncButton.jsx';
import { ConnectionBadge } from '../components/ConnectionBadge.jsx';
import { ServiceIcon } from '../components/ServiceIcon.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { InstallButton } from '../components/InstallButton.jsx';
import { serviceTypeLabel } from '../constants.js';
import { formatDate, formatDateTime, formatLongDate, timeAgo } from '../utils/format.js';

export function Dashboard() {
  useDocumentTitle('Panel de control');
  const {
    counts,
    unsyncedCount,
    lastSyncAt,
    isSyncing,
    isOnline,
    syncNow
  } = useSync();

  const recentReports = useLiveQuery(
    () => db.reports.orderBy('createdAt').reverse().limit(5).toArray(),
    []
  );

  const loading = recentReports === undefined;

  return (
    <div className="page dashboard-page">
      <PageHeader
        title="Panel de control"
        description={`${formatLongDate()} · Bienvenido a TechService`}
      >
        <SyncButton variant="secondary" />
        <Link to="/reports/new" className="btn btn-primary">
          <Plus size={16} aria-hidden="true" />
          Nuevo reporte
        </Link>
      </PageHeader>

      {unsyncedCount > 0 ? (
        <div className="alert alert--warning" role="status">
          <span className="alert__icon" aria-hidden="true">
            <Clock3 size={20} />
          </span>
          <div className="alert__content">
            <strong>
              {unsyncedCount} reporte{unsyncedCount === 1 ? '' : 's'} pendiente
              {unsyncedCount === 1 ? '' : 's'} de sincronizar
            </strong>
            <p>
              Están guardados de forma segura en este dispositivo. Se enviarán
              automáticamente cuando haya conexión.
            </p>
          </div>
          <SyncButton variant="warning" size="sm" label="Sincronizar ahora" />
        </div>
      ) : null}

      <section className="hero">
        <div className="hero__content">
          <span className="eyebrow">
            <ShieldCheck size={15} aria-hidden="true" />
            Operación de campo · Offline first
          </span>
          <h2>Tu trabajo en campo no se detiene por falta de señal.</h2>
          <p>
            Registra visitas, diagnósticos y materiales desde el smartphone. Cada reporte se
            guarda primero en el dispositivo y se sincroniza con el servidor al recuperar
            Internet.
          </p>
          <div className="hero__actions">
            <Link to="/reports/new" className="btn btn-light">
              <Plus size={17} aria-hidden="true" />
              Crear reporte
            </Link>
            <Link to="/reports" className="btn btn-ghost-light">
              Consultar historial
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="hero__panel" aria-hidden="true">
          <div className="hero__panel-row">
            <span className={`hero__signal ${isOnline ? 'is-online' : 'is-offline'}`} />
            <div>
              <small>Estado actual</small>
              <strong>{isOnline ? 'Conectado' : 'Modo offline'}</strong>
            </div>
            {isOnline ? <CloudUpload size={20} /> : <CloudOff size={20} />}
          </div>
          <div className="hero__panel-divider" />
          <div className="hero__panel-stats">
            <div>
              <strong>{counts.pending}</strong>
              <span>En cola</span>
            </div>
            <div>
              <strong>{counts.synced}</strong>
              <span>Sincronizados</span>
            </div>
            <div>
              <strong>{counts.total}</strong>
              <span>Totales</span>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Resumen de reportes">
        <StatCard
          icon={ClipboardList}
          label="Total de reportes"
          value={counts.total}
          hint="Registrados en este dispositivo"
          tone="blue"
          loading={counts.total === undefined}
        />
        <StatCard
          icon={Clock3}
          label="Pendientes"
          value={counts.pending}
          hint="Esperando conexión"
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Sincronizados"
          value={counts.synced}
          hint="Guardados en el servidor"
          tone="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="Con error"
          value={counts.error}
          hint="Requieren reintento"
          tone="red"
        />
      </section>

      <div className="dashboard-grid">
        <section className="card recent-card">
          <div className="card__header">
            <div>
              <h2>Reportes recientes</h2>
              <p>Últimos registros creados desde este dispositivo</p>
            </div>
            <Link to="/reports" className="link-arrow">
              Ver todos
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <div className="skeleton-list" aria-label="Cargando reportes">
              {[0, 1, 2].map((item) => (
                <div key={item} className="skeleton-row">
                  <span className="skeleton skeleton--avatar" />
                  <div>
                    <span className="skeleton skeleton--line" />
                    <span className="skeleton skeleton--line skeleton--short" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentReports.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Aún no hay reportes"
              description="Registra tu primera visita técnica. Podrás hacerlo incluso sin conexión a Internet."
              actionLabel="Crear el primer reporte"
              actionTo="/reports/new"
            />
          ) : (
            <ul className="recent-list">
              {recentReports.map((report) => (
                <li key={report.id}>
                  <Link to={`/reports/${report.id}`} className="recent-item">
                    <ServiceIcon type={report.serviceType} />
                    <div className="recent-item__main">
                      <div className="recent-item__title">
                        <strong>{report.clientName}</strong>
                        <SyncBadge status={report.syncStatus} />
                      </div>
                      <span className="recent-item__sub">
                        {report.folio} · {serviceTypeLabel(report.serviceType)}
                      </span>
                    </div>
                    <div className="recent-item__meta">
                      <time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
                      <ChevronRight size={16} aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="dashboard-side">
          <section className="card sync-card">
            <div className="card__header">
              <div>
                <h2>Sincronización</h2>
                <p>Estado de la cola local</p>
              </div>
              <ConnectionBadge compact />
            </div>

            <div className="sync-card__hero">
              <span
                className={`sync-orb ${isSyncing ? 'sync-orb--syncing' : isOnline ? 'sync-orb--online' : 'sync-orb--offline'}`}
                aria-hidden="true"
              >
                {isOnline ? <CloudUpload size={24} /> : <CloudOff size={24} />}
              </span>
              <div>
                <strong>
                  {isSyncing
                    ? 'Sincronizando…'
                    : isOnline
                      ? 'Conexión disponible'
                      : 'Esperando conexión'}
                </strong>
                <p title={lastSyncAt ? formatDateTime(lastSyncAt) : undefined}>
                  Última sincronización: {timeAgo(lastSyncAt)}
                </p>
              </div>
            </div>

            <dl className="mini-stats">
              <div>
                <dt>Pendientes</dt>
                <dd>{counts.pending}</dd>
              </div>
              <div>
                <dt>Sincronizados</dt>
                <dd>{counts.synced}</dd>
              </div>
              <div>
                <dt>Errores</dt>
                <dd>{counts.error}</dd>
              </div>
            </dl>

            <SyncButton className="btn-block" />
            <p className="card__hint">
              La app sincroniza al iniciar, al recuperar la conexión, al volver al primer plano
              y cada 60 segundos si hay pendientes.
            </p>
          </section>

          <section className="card quick-card">
            <div className="card__header">
              <div>
                <h2>Acciones rápidas</h2>
                <p>Atajos de operación</p>
              </div>
            </div>
            <div className="quick-actions">
              <button type="button" className="quick-action" onClick={() => syncNow(true)}>
                <span className="quick-action__icon quick-action__icon--blue">
                  <CloudUpload size={18} />
                </span>
                <span>
                  <strong>Sincronizar ahora</strong>
                  <small>Forzar envío de pendientes</small>
                </span>
              </button>
              <Link to="/reports/new" className="quick-action">
                <span className="quick-action__icon quick-action__icon--green">
                  <Plus size={18} />
                </span>
                <span>
                  <strong>Nuevo reporte</strong>
                  <small>Registrar una visita técnica</small>
                </span>
              </Link>
            </div>
            <InstallButton variant="ghost" size="sm" full />
          </section>
        </div>
      </div>
    </div>
  );
}
