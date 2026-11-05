import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Cloud,
  Copy,
  FileQuestion,
  FileText,
  Hash,
  MapPin,
  Package,
  Phone,
  Printer,
  RefreshCw,
  Server,
  StickyNote,
  Trash2,
  UserRound,
  Wrench
} from 'lucide-react';
import { db } from '../database/db.js';
import { deleteReportLocal } from '../database/reportRepository.js';
import { deleteReport } from '../services/api.js';
import { useSync } from '../context/SyncContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { SyncBadge } from '../components/SyncBadge.jsx';
import { PriorityBadge, ReportStatusBadge } from '../components/Badges.jsx';
import { SyncButton } from '../components/SyncButton.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { serviceTypeLabel } from '../constants.js';
import { formatDateTime, timeAgo } from '../utils/format.js';

function InfoItem({ label, children, icon: Icon, className = '' }) {
  return (
    <div className={`info-item ${className}`.trim()}>
      <dt>
        {Icon ? <Icon size={14} aria-hidden="true" /> : null}
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

export function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOnline, syncNow, isSyncing } = useSync();
  const { addToast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const report = useLiveQuery(() => db.reports.get(id), [id]);
  useDocumentTitle(report ? `Reporte ${report.folio}` : 'Detalle del reporte');

  if (report === undefined) {
    return (
      <div className="page detail-page">
        <div className="skeleton skeleton--title" />
        <div className="card">
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
        </div>
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="page detail-page">
        <PageHeader
          title="Reporte no encontrado"
          description="Es posible que se haya eliminado de este dispositivo."
          backTo="/reports"
          backLabel="Volver al historial"
        />
        <section className="card">
          <EmptyState
            icon={FileQuestion}
            title="No existe este reporte"
            description="El identificador no corresponde a ningún reporte guardado en IndexedDB."
            actionLabel="Ir al historial"
            actionTo="/reports"
          />
        </section>
      </div>
    );
  }

  const phoneHref = `tel:${report.clientPhone.replace(/[^\d+]/g, '')}`;
  const isSynced = report.syncStatus === 'synced';
  const isError = report.syncStatus === 'error';

  async function copyId() {
    try {
      await navigator.clipboard.writeText(report.id);
      addToast({ type: 'success', title: 'UUID copiado', message: report.id });
    } catch {
      addToast({
        type: 'warning',
        title: 'No se pudo copiar',
        message: 'Tu navegador no permitió acceder al portapapeles.'
      });
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);

    try {
      if (isSynced) {
        if (!isOnline) {
          addToast({
            type: 'error',
            title: 'Sin conexión',
            message:
              'Este reporte ya está en el servidor. Necesitas conexión para eliminarlo de forma segura.'
          });
          setDeleteOpen(false);
          return;
        }

        try {
          await deleteReport(report.id);
        } catch (error) {
          if (error?.status !== 404) throw error;
        }
      }

      await deleteReportLocal(report.id);
      addToast({
        type: 'success',
        title: 'Reporte eliminado',
        message: isSynced
          ? 'Se eliminó del servidor y de este dispositivo.'
          : 'Se eliminó del almacenamiento local.'
      });
      navigate('/reports', { replace: true });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'No se pudo eliminar',
        message: error?.message || 'Inténtalo de nuevo.'
      });
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page detail-page">
      <PageHeader
        title={`Reporte ${report.folio}`}
        description={`Creado el ${formatDateTime(report.createdAt)} · ${serviceTypeLabel(report.serviceType)}`}
        backTo="/reports"
        backLabel="Volver al historial"
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.print()}
          title="Imprimir o guardar como PDF"
        >
          <Printer size={16} aria-hidden="true" />
          Imprimir
        </button>
        {!isSynced ? <SyncButton /> : null}
        <button
          type="button"
          className="btn btn-danger-ghost"
          onClick={() => setDeleteOpen(true)}
          disabled={deleting}
        >
          <Trash2 size={16} aria-hidden="true" />
          Eliminar
        </button>
      </PageHeader>

      <div className="detail-badges">
        <SyncBadge status={report.syncStatus} />
        <PriorityBadge value={report.priority} />
        <ReportStatusBadge value={report.status} />
        {!isOnline ? <span className="badge badge--offline">Trabajando offline</span> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="card detail-section">
            <div className="detail-section__header">
              <span className="detail-section__icon" aria-hidden="true">
                <UserRound size={19} />
              </span>
              <h2>Cliente y ubicación</h2>
            </div>
            <dl className="info-grid">
              <InfoItem label="Cliente">{report.clientName}</InfoItem>
              <InfoItem label="Técnico responsable">{report.technicianName}</InfoItem>
              <InfoItem label="Teléfono" icon={Phone}>
                <a href={phoneHref} className="inline-link">
                  {report.clientPhone}
                </a>
              </InfoItem>
              <InfoItem label="Ubicación" icon={MapPin} className="info-item--full">
                {report.location}
              </InfoItem>
            </dl>
          </section>

          <section className="card detail-section">
            <div className="detail-section__header">
              <span className="detail-section__icon detail-section__icon--green" aria-hidden="true">
                <Wrench size={19} />
              </span>
              <h2>Servicio y equipo</h2>
            </div>
            <dl className="info-grid">
              <InfoItem label="Tipo de servicio">{serviceTypeLabel(report.serviceType)}</InfoItem>
              <InfoItem label="Equipo atendido">{report.equipment}</InfoItem>
              <InfoItem label="Prioridad" icon={AlertTriangle}>
                <PriorityBadge value={report.priority} />
              </InfoItem>
              <InfoItem label="Estado" icon={CheckCircle2}>
                <ReportStatusBadge value={report.status} />
              </InfoItem>
            </dl>
          </section>

          <section className="card detail-section">
            <div className="detail-section__header">
              <span className="detail-section__icon" aria-hidden="true">
                <FileText size={19} />
              </span>
              <h2>Detalle técnico</h2>
            </div>
            <div className="text-blocks">
              <div className="text-block">
                <h3>Descripción del problema</h3>
                <p>{report.problemDescription}</p>
              </div>
              <div className="text-block">
                <h3>Diagnóstico técnico</h3>
                <p className={!report.diagnosis ? 'is-empty' : undefined}>
                  {report.diagnosis || 'Sin diagnóstico registrado.'}
                </p>
              </div>
              <div className="text-block">
                <h3>Trabajo realizado</h3>
                <p className={!report.workPerformed ? 'is-empty' : undefined}>
                  {report.workPerformed || 'Sin trabajo registrado.'}
                </p>
              </div>
            </div>
          </section>

          <section className="card detail-section">
            <div className="detail-section__header">
              <span className="detail-section__icon detail-section__icon--amber" aria-hidden="true">
                <Package size={19} />
              </span>
              <h2>Materiales utilizados</h2>
            </div>
            <p className={`text-block text-block--plain ${!report.materials ? 'is-empty' : ''}`}>
              {report.materials || 'No se registraron materiales.'}
            </p>
          </section>

          <section className="card detail-section">
            <div className="detail-section__header">
              <span className="detail-section__icon" aria-hidden="true">
                <StickyNote size={19} />
              </span>
              <h2>Observaciones adicionales</h2>
            </div>
            <p className={`text-block text-block--plain ${!report.notes ? 'is-empty' : ''}`}>
              {report.notes || 'Sin observaciones adicionales.'}
            </p>
          </section>
        </div>

        <aside className="detail-side">
          <section className={`card sync-panel sync-panel--${report.syncStatus}`}>
            <div className="sync-panel__header">
              <span className="sync-panel__icon" aria-hidden="true">
                {isSynced ? (
                  <CheckCircle2 size={22} />
                ) : isError ? (
                  <AlertTriangle size={22} />
                ) : (
                  <Clock3 size={22} />
                )}
              </span>
              <div>
                <h2>Estado de sincronización</h2>
                <SyncBadge status={report.syncStatus} />
              </div>
            </div>

            {isSynced ? (
              <p className="sync-panel__message">
                Guardado en el servidor el{' '}
                <strong>{formatDateTime(report.syncedAt)}</strong>.
              </p>
            ) : isError ? (
              <p className="sync-panel__message">
                {report.syncError || 'El servidor rechazó este reporte.'}
              </p>
            ) : (
              <p className="sync-panel__message">
                {isOnline
                  ? 'Hay conexión disponible. Puedes enviarlo ahora o esperar la sincronización automática.'
                  : 'Sin conexión. El reporte permanece guardado en este dispositivo y se enviará al recuperar Internet.'}
              </p>
            )}

            {!isSynced ? (
              <SyncButton
                className="btn-block"
                label={isError ? 'Reintentar sincronización' : 'Sincronizar ahora'}
              />
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => syncNow(true)}
                disabled={isSyncing}
              >
                <RefreshCw size={16} className={isSyncing ? 'spin' : undefined} aria-hidden="true" />
                Verificar sincronización
              </button>
            )}

            <dl className="sync-panel__meta">
              <div>
                <dt>Intentos</dt>
                <dd>{report.retryCount || 0}</dd>
              </div>
              <div>
                <dt>Último intento</dt>
                <dd>{timeAgo(report.lastAttemptAt)}</dd>
              </div>
              {!isSynced && report.nextRetryAt ? (
                <div>
                  <dt>Próximo reintento</dt>
                  <dd>{formatDateTime(report.nextRetryAt)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="card metadata-card">
            <div className="detail-section__header">
              <span className="detail-section__icon" aria-hidden="true">
                <Server size={19} />
              </span>
              <h2>Trazabilidad</h2>
            </div>
            <dl className="meta-list">
              <div>
                <dt>
                  <CalendarDays size={14} aria-hidden="true" />
                  Creado
                </dt>
                <dd>{formatDateTime(report.createdAt)}</dd>
              </div>
              <div>
                <dt>
                  <Clock3 size={14} aria-hidden="true" />
                  Modificado
                </dt>
                <dd>{formatDateTime(report.updatedAt)}</dd>
              </div>
              <div>
                <dt>
                  <Cloud size={14} aria-hidden="true" />
                  Sincronizado
                </dt>
                <dd>{report.syncedAt ? formatDateTime(report.syncedAt) : 'Pendiente'}</dd>
              </div>
              <div>
                <dt>
                  <Server size={14} aria-hidden="true" />
                  Servidor
                </dt>
                <dd>
                  {report.serverUpdatedAt
                    ? formatDateTime(report.serverUpdatedAt)
                    : 'Aún no confirmado'}
                </dd>
              </div>
              <div className="meta-list__id">
                <dt>
                  <Hash size={14} aria-hidden="true" />
                  UUID
                </dt>
                <dd>
                  <code>{report.id}</code>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={copyId}
                    aria-label="Copiar UUID"
                    title="Copiar UUID"
                  >
                    <Copy size={14} aria-hidden="true" />
                  </button>
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="¿Eliminar este reporte?"
        description={
          isSynced
            ? 'El reporte ya está sincronizado. Se eliminará del servidor y también de este dispositivo. Esta acción no se puede deshacer.'
            : 'El reporte sólo existe en este dispositivo y todavía no se ha enviado al servidor. Se eliminará de la cola local.'
        }
        confirmLabel={isSynced ? 'Eliminar del servidor' : 'Eliminar reporte'}
        cancelLabel="Cancelar"
        tone="danger"
        icon={Trash2}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      >
        <p className="modal__folio">{report.folio}</p>
      </ConfirmDialog>
    </div>
  );
}
