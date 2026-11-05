import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  FilterX,
  Plus,
  Search
} from 'lucide-react';
import { db } from '../database/db.js';
import { useSync } from '../context/SyncContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { SyncButton } from '../components/SyncButton.jsx';
import { SyncBadge } from '../components/SyncBadge.jsx';
import { PriorityBadge, ReportStatusBadge } from '../components/Badges.jsx';
import { ServiceIcon } from '../components/ServiceIcon.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import {
  PRIORITIES,
  REPORT_STATUSES,
  SERVICE_TYPES,
  serviceTypeLabel
} from '../constants.js';
import { formatDate, normalizeText } from '../utils/format.js';

const SYNC_FILTERS = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'synced', label: 'Sincronizados' },
  { value: 'error', label: 'Con error' }
];

export function History() {
  useDocumentTitle('Historial de reportes');
  const { unsyncedCount } = useSync();
  const [search, setSearch] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [syncFilter, setSyncFilter] = useState('');

  const reports = useLiveQuery(
    () => db.reports.orderBy('createdAt').reverse().toArray(),
    []
  );

  const filtered = useMemo(() => {
    if (!reports) return [];
    const term = normalizeText(search);

    return reports.filter((report) => {
      if (serviceType && report.serviceType !== serviceType) return false;
      if (priority && report.priority !== priority) return false;
      if (status && report.status !== status) return false;
      if (syncFilter && report.syncStatus !== syncFilter) return false;

      if (!term) return true;
      return (
        normalizeText(report.folio).includes(term) ||
        normalizeText(report.clientName).includes(term) ||
        normalizeText(report.technicianName).includes(term) ||
        normalizeText(report.equipment).includes(term) ||
        normalizeText(report.location).includes(term)
      );
    });
  }, [reports, search, serviceType, priority, status, syncFilter]);

  const hasFilters = Boolean(search || serviceType || priority || status || syncFilter);

  function clearFilters() {
    setSearch('');
    setServiceType('');
    setPriority('');
    setStatus('');
    setSyncFilter('');
  }

  return (
    <div className="page history-page">
      <PageHeader
        title="Historial de reportes"
        description="Consulta, filtra y da seguimiento a todos los reportes registrados en este dispositivo."
      >
        <SyncButton variant="secondary" />
        <Link to="/reports/new" className="btn btn-primary">
          <Plus size={16} aria-hidden="true" />
          Nuevo reporte
        </Link>
      </PageHeader>

      {unsyncedCount > 0 ? (
        <div className="alert alert--warning alert--compact" role="status">
          <span className="alert__icon" aria-hidden="true">
            <ClipboardList size={18} />
          </span>
          <div className="alert__content">
            <strong>
              {unsyncedCount} reporte{unsyncedCount === 1 ? '' : 's'} sin sincronizar
            </strong>
            <p>Se conservan en IndexedDB aunque cierres el navegador.</p>
          </div>
          <SyncButton variant="warning" size="sm" label="Sincronizar" />
        </div>
      ) : null}

      <section className="card toolbar-card" aria-label="Búsqueda y filtros">
        <div className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por folio, cliente, técnico, equipo o ubicación…"
            aria-label="Buscar reportes"
          />
        </div>

        <div className="filters">
          <label className="filter-control">
            <span>Tipo de servicio</span>
            <select value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
              <option value="">Todos</option>
              {SERVICE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-control">
            <span>Prioridad</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value="">Todas</option>
              {PRIORITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-control">
            <span>Estado</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos</option>
              {REPORT_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-control">
            <span>Sincronización</span>
            <select value={syncFilter} onChange={(event) => setSyncFilter(event.target.value)}>
              <option value="">Todas</option>
              {SYNC_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {hasFilters ? (
            <button type="button" className="btn btn-ghost btn-sm clear-filters" onClick={clearFilters}>
              <FilterX size={15} aria-hidden="true" />
              Limpiar
            </button>
          ) : null}
        </div>
      </section>

      <div className="results-bar">
        <p>
          {reports === undefined
            ? 'Cargando reportes…'
            : `${filtered.length} de ${reports.length} reporte${reports.length === 1 ? '' : 's'}`}
        </p>
        {hasFilters ? <span className="results-bar__filtered">Filtros activos</span> : null}
      </div>

      {reports === undefined ? (
        <section className="card">
          <div className="skeleton-list">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="skeleton-row">
                <span className="skeleton skeleton--avatar" />
                <div>
                  <span className="skeleton skeleton--line" />
                  <span className="skeleton skeleton--line skeleton--short" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : reports.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={ClipboardList}
            title="Todavía no hay reportes"
            description="Crea el primer reporte técnico. Se guardará en el dispositivo y aparecerá aquí al instante."
            actionLabel="Crear reporte"
            actionTo="/reports/new"
          />
        </section>
      ) : filtered.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={Search}
            title="No encontramos resultados"
            description="Prueba con otro término de búsqueda o elimina algunos filtros."
            actionLabel="Limpiar filtros"
            onAction={clearFilters}
          />
        </section>
      ) : (
        <>
          <section className="card table-card desktop-table" aria-label="Tabla de reportes">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reporte</th>
                    <th>Cliente / Técnico</th>
                    <th>Servicio</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Sincronización</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <Link to={`/reports/${report.id}`} className="table-folio">
                          {report.folio}
                        </Link>
                        <span className="table-sub">{formatDate(report.createdAt)}</span>
                      </td>
                      <td>
                        <strong className="table-strong">{report.clientName}</strong>
                        <span className="table-sub">{report.technicianName}</span>
                      </td>
                      <td>
                        <span className="table-service">
                          <ServiceIcon type={report.serviceType} size={15} />
                          {serviceTypeLabel(report.serviceType)}
                        </span>
                      </td>
                      <td>
                        <PriorityBadge value={report.priority} />
                      </td>
                      <td>
                        <ReportStatusBadge value={report.status} />
                      </td>
                      <td>
                        <SyncBadge status={report.syncStatus} />
                      </td>
                      <td>
                        <Link
                          to={`/reports/${report.id}`}
                          className="icon-link"
                          aria-label={`Ver detalle de ${report.folio}`}
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mobile-report-list" aria-label="Lista de reportes">
            {filtered.map((report) => (
              <Link key={report.id} to={`/reports/${report.id}`} className="mobile-report-card">
                <div className="mobile-report-card__top">
                  <ServiceIcon type={report.serviceType} />
                  <div className="mobile-report-card__title">
                    <strong>{report.clientName}</strong>
                    <span>{report.folio}</span>
                  </div>
                  <SyncBadge status={report.syncStatus} />
                </div>
                <p className="mobile-report-card__service">
                  {serviceTypeLabel(report.serviceType)}
                  <span>·</span>
                  {formatDate(report.createdAt)}
                </p>
                <div className="mobile-report-card__footer">
                  <div className="mobile-report-card__badges">
                    <PriorityBadge value={report.priority} />
                    <ReportStatusBadge value={report.status} />
                  </div>
                  <span className="mobile-report-card__link">
                    Ver detalle
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
