import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ClipboardCheck,
  HardDrive,
  Save,
  Trash2,
  UserRound,
  Wrench,
  X
} from 'lucide-react';
import { useSync } from '../context/SyncContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { ServiceIcon } from '../components/ServiceIcon.jsx';
import { createLocalReport } from '../database/reportRepository.js';
import { requestBackgroundSync } from '../services/pwa.js';
import {
  LAST_TECHNICIAN_STORAGE_KEY,
  PRIORITIES,
  REPORT_STATUSES,
  SERVICE_TYPES
} from '../constants.js';
import { formatDateTime } from '../utils/format.js';
import { hasErrors, normalizeReportValues, validateReport } from '../utils/validation.js';
import { cn } from '../utils/classNames.js';

function emptyForm() {
  let technician = '';
  try {
    technician = localStorage.getItem(LAST_TECHNICIAN_STORAGE_KEY) || '';
  } catch {
    technician = '';
  }
  return {
    technicianName: technician,
    clientName: '',
    clientPhone: '',
    location: '',
    serviceType: 'preventivo',
    equipment: '',
    problemDescription: '',
    diagnosis: '',
    workPerformed: '',
    materials: '',
    priority: 'media',
    status: 'abierto',
    notes: ''
  };
}

function FormField({ label, name, required = false, error, hint, className = '', children }) {
  return (
    <div className={cn('form-field', className)}>
      <label htmlFor={name} className="field-label">
        {label}
        {required ? (
          <span className="required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? <p className="field-hint">{hint}</p> : null}
      {error ? (
        <p className="field-error" id={`${name}-error`} role="alert">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function NewReport() {
  useDocumentTitle('Nuevo reporte');
  const navigate = useNavigate();
  const { isOnline, syncNow } = useSync();
  const { addToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const createdAtLabel = useMemo(() => formatDateTime(new Date()), []);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setDirty(true);
    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  }

  function resetForm() {
    setForm(emptyForm());
    setErrors({});
    setDirty(false);
    setConfirmAction(null);
    addToast({ type: 'info', title: 'Formulario limpiado', message: 'Puedes capturar un nuevo reporte.' });
  }

  function requestClear() {
    if (dirty) setConfirmAction('clear');
    else resetForm();
  }

  function requestCancel() {
    if (dirty) setConfirmAction('cancel');
    else navigate('/reports');
  }

  function handleConfirm() {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === 'clear') resetForm();
    if (action === 'cancel') navigate('/reports');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const normalized = normalizeReportValues(form);
    const validationErrors = validateReport(normalized);
    setForm(normalized);
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      const firstField = Object.keys(validationErrors)[0];
      const element = document.getElementById(firstField);
      element?.focus();
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addToast({
        type: 'error',
        title: 'Revisa el formulario',
        message: 'Hay campos obligatorios vacíos o con formato incorrecto.'
      });
      return;
    }

    setSaving(true);
    try {
      const report = await createLocalReport(normalized);
      try {
        localStorage.setItem(LAST_TECHNICIAN_STORAGE_KEY, normalized.technicianName);
      } catch {
        // Sin consecuencias para el guardado del reporte.
      }

      setDirty(false);
      addToast({
        type: 'success',
        title: 'Reporte guardado en este dispositivo',
        message: isOnline
          ? `Folio ${report.folio}. Se enviará al servidor en unos segundos.`
          : `Folio ${report.folio}. Quedó pendiente y se sincronizará al recuperar la conexión.`
      });

      navigate(`/reports/${report.id}`);

      if (isOnline) {
        void syncNow(false);
      } else {
        void requestBackgroundSync();
      }
    } catch (error) {
      console.error('[TechService] Error al guardar el reporte local:', error);
      addToast({
        type: 'error',
        title: 'No se pudo guardar el reporte',
        message:
          error?.name === 'QuotaExceededError'
            ? 'El almacenamiento del dispositivo está lleno. Libera espacio e inténtalo de nuevo.'
            : 'Ocurrió un error al escribir en IndexedDB. Inténtalo de nuevo.'
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page new-report-page">
      <PageHeader
        title="Nuevo reporte técnico"
        description="Registra la visita de servicio. El reporte se guarda primero en el dispositivo, incluso sin Internet."
        backTo="/reports"
        backLabel="Volver al historial"
      >
        <button
          type="submit"
          form="report-form"
          className="btn btn-primary"
          disabled={saving}
        >
          <Save size={16} aria-hidden="true" />
          {saving ? 'Guardando…' : 'Guardar reporte'}
        </button>
      </PageHeader>

      <div className="callout callout--info">
        <span className="callout__icon" aria-hidden="true">
          <HardDrive size={19} />
        </span>
        <div>
          <strong>Guardado local inmediato</strong>
          <p>
            El reporte se almacena en IndexedDB antes de enviarse. Si cierras el navegador o
            pierdes la señal, permanecerá en la cola de sincronización.
          </p>
        </div>
        <span className={`callout__status ${isOnline ? 'is-online' : 'is-offline'}`}>
          {isOnline ? 'En línea' : 'Offline'}
        </span>
      </div>

      <form id="report-form" onSubmit={handleSubmit} noValidate>
        <section className="card form-section">
          <div className="form-section__header">
            <span className="form-section__icon" aria-hidden="true">
              <UserRound size={20} />
            </span>
            <div>
              <h2>Datos del servicio</h2>
              <p>Identifica al técnico, al cliente y el lugar de la visita.</p>
            </div>
          </div>

          <div className="auto-meta">
            <div>
              <span>Folio</span>
              <strong>Se generará automáticamente</strong>
            </div>
            <div>
              <span>Fecha y hora de creación</span>
              <strong>{createdAtLabel}</strong>
            </div>
          </div>

          <div className="form-grid">
            <FormField label="Nombre del técnico" name="technicianName" required error={errors.technicianName}>
              <input
                id="technicianName"
                name="technicianName"
                className={cn('input', errors.technicianName && 'is-invalid')}
                value={form.technicianName}
                onChange={handleChange}
                autoComplete="name"
                placeholder="Ej. Luis Ramírez"
                aria-invalid={Boolean(errors.technicianName)}
                aria-describedby={errors.technicianName ? 'technicianName-error' : undefined}
              />
            </FormField>

            <FormField label="Nombre del cliente" name="clientName" required error={errors.clientName}>
              <input
                id="clientName"
                name="clientName"
                className={cn('input', errors.clientName && 'is-invalid')}
                value={form.clientName}
                onChange={handleChange}
                autoComplete="off"
                placeholder="Ej. María González"
                aria-invalid={Boolean(errors.clientName)}
                aria-describedby={errors.clientName ? 'clientName-error' : undefined}
              />
            </FormField>

            <FormField label="Teléfono del cliente" name="clientPhone" required error={errors.clientPhone} hint="Incluye lada. Se aceptan espacios, guiones y +.">
              <input
                id="clientPhone"
                name="clientPhone"
                type="tel"
                inputMode="tel"
                className={cn('input', errors.clientPhone && 'is-invalid')}
                value={form.clientPhone}
                onChange={handleChange}
                autoComplete="tel"
                placeholder="Ej. +52 55 1234 5678"
                aria-invalid={Boolean(errors.clientPhone)}
                aria-describedby={errors.clientPhone ? 'clientPhone-error' : undefined}
              />
            </FormField>

            <FormField label="Tipo de servicio" name="serviceType" required error={errors.serviceType}>
              <select
                id="serviceType"
                name="serviceType"
                className={cn('input', errors.serviceType && 'is-invalid')}
                value={form.serviceType}
                onChange={handleChange}
              >
                {SERVICE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Ubicación o dirección del servicio" name="location" required error={errors.location} className="form-field--full">
              <input
                id="location"
                name="location"
                className={cn('input', errors.location && 'is-invalid')}
                value={form.location}
                onChange={handleChange}
                autoComplete="street-address"
                placeholder="Calle, número, colonia, comunidad o referencia"
                aria-invalid={Boolean(errors.location)}
                aria-describedby={errors.location ? 'location-error' : undefined}
              />
            </FormField>

            <FormField label="Equipo atendido" name="equipment" required error={errors.equipment} className="form-field--full">
              <input
                id="equipment"
                name="equipment"
                className={cn('input', errors.equipment && 'is-invalid')}
                value={form.equipment}
                onChange={handleChange}
                placeholder="Ej. Bomba centrífuga 1.5 HP, marca Evans"
                aria-invalid={Boolean(errors.equipment)}
                aria-describedby={errors.equipment ? 'equipment-error' : undefined}
              />
            </FormField>
          </div>
        </section>

        <section className="card form-section">
          <div className="form-section__header">
            <span className="form-section__icon form-section__icon--green" aria-hidden="true">
              <Wrench size={20} />
            </span>
            <div>
              <h2>Diagnóstico y trabajo realizado</h2>
              <p>Documenta el problema, la causa y la solución aplicada en campo.</p>
            </div>
          </div>

          <div className="form-grid">
            <FormField
              label="Descripción del problema"
              name="problemDescription"
              required
              error={errors.problemDescription}
              className="form-field--full"
              hint={`${form.problemDescription.length}/2000 caracteres`}
            >
              <textarea
                id="problemDescription"
                name="problemDescription"
                rows={4}
                className={cn('input textarea', errors.problemDescription && 'is-invalid')}
                value={form.problemDescription}
                onChange={handleChange}
                placeholder="¿Qué reportó el cliente? Síntomas, fallas observadas, condiciones del equipo…"
                maxLength={2000}
                aria-invalid={Boolean(errors.problemDescription)}
                aria-describedby={errors.problemDescription ? 'problemDescription-error' : undefined}
              />
            </FormField>

            <FormField label="Diagnóstico técnico" name="diagnosis" error={errors.diagnosis} className="form-field--full">
              <textarea
                id="diagnosis"
                name="diagnosis"
                rows={3}
                className={cn('input textarea', errors.diagnosis && 'is-invalid')}
                value={form.diagnosis}
                onChange={handleChange}
                placeholder="Causa raíz identificada, mediciones, pruebas realizadas…"
                maxLength={2000}
                aria-invalid={Boolean(errors.diagnosis)}
                aria-describedby={errors.diagnosis ? 'diagnosis-error' : undefined}
              />
            </FormField>

            <FormField label="Trabajo realizado" name="workPerformed" error={errors.workPerformed} className="form-field--full">
              <textarea
                id="workPerformed"
                name="workPerformed"
                rows={3}
                className={cn('input textarea', errors.workPerformed && 'is-invalid')}
                value={form.workPerformed}
                onChange={handleChange}
                placeholder="Actividades ejecutadas, ajustes, pruebas de funcionamiento…"
                maxLength={2000}
                aria-invalid={Boolean(errors.workPerformed)}
                aria-describedby={errors.workPerformed ? 'workPerformed-error' : undefined}
              />
            </FormField>

            <FormField
              label="Materiales utilizados"
              name="materials"
              error={errors.materials}
              className="form-field--full"
              hint="Puedes escribir una lista, un elemento por línea."
            >
              <textarea
                id="materials"
                name="materials"
                rows={3}
                className={cn('input textarea', errors.materials && 'is-invalid')}
                value={form.materials}
                onChange={handleChange}
                placeholder={'Ej.\n1 capacitor 40 µF\n2 m de cable calibre 12'}
                maxLength={1000}
                aria-invalid={Boolean(errors.materials)}
                aria-describedby={errors.materials ? 'materials-error' : undefined}
              />
            </FormField>
          </div>
        </section>

        <section className="card form-section">
          <div className="form-section__header">
            <span className="form-section__icon form-section__icon--amber" aria-hidden="true">
              <ClipboardCheck size={20} />
            </span>
            <div>
              <h2>Clasificación y observaciones</h2>
              <p>Define la prioridad, el estado y cualquier nota adicional.</p>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field form-field--full">
              <span className="field-label" id="priority-label">
                Prioridad
                <span className="required" aria-hidden="true">
                  *
                </span>
              </span>
              <div className="priority-options" role="radiogroup" aria-labelledby="priority-label">
                {PRIORITIES.map((priority) => (
                  <label
                    key={priority.value}
                    className={cn(
                      'priority-option',
                      `priority-option--${priority.value}`,
                      form.priority === priority.value && 'is-selected'
                    )}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={form.priority === priority.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="priority-option__dot" aria-hidden="true" />
                    {priority.label}
                  </label>
                ))}
              </div>
              {errors.priority ? (
                <p className="field-error" role="alert">
                  <AlertCircle size={13} aria-hidden="true" />
                  {errors.priority}
                </p>
              ) : null}
            </div>

            <FormField label="Estado del reporte" name="status" required error={errors.status}>
              <select
                id="status"
                name="status"
                className={cn('input', errors.status && 'is-invalid')}
                value={form.status}
                onChange={handleChange}
              >
                {REPORT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Observaciones adicionales" name="notes" error={errors.notes} className="form-field--full" hint="Información para seguimiento, pendientes o acuerdos con el cliente.">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className={cn('input textarea', errors.notes && 'is-invalid')}
                value={form.notes}
                onChange={handleChange}
                placeholder="Ej. Cliente solicita seguimiento la próxima semana."
                maxLength={1500}
                aria-invalid={Boolean(errors.notes)}
                aria-describedby={errors.notes ? 'notes-error' : undefined}
              />
            </FormField>
          </div>
        </section>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={requestCancel} disabled={saving}>
            <X size={16} aria-hidden="true" />
            Cancelar
          </button>
          <button type="button" className="btn btn-ghost" onClick={requestClear} disabled={saving}>
            <Trash2 size={16} aria-hidden="true" />
            Limpiar formulario
          </button>
          <span className="form-actions__spacer" />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} aria-hidden="true" />
            {saving ? 'Guardando…' : 'Guardar reporte'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmAction === 'cancel'}
        title="¿Descartar este reporte?"
        description="Los datos capturados en el formulario se perderán. Los reportes ya guardados no se modifican."
        confirmLabel="Descartar y salir"
        cancelLabel="Seguir editando"
        tone="danger"
        icon={AlertCircle}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'clear'}
        title="¿Limpiar el formulario?"
        description="Se borrarán todos los campos capturados, incluidos los opcionales."
        confirmLabel="Limpiar campos"
        cancelLabel="Cancelar"
        tone="danger"
        icon={Trash2}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      <p className="form-footnote">
        Los campos marcados con <span className="required">*</span> son obligatorios. También
        puedes <Link to="/reports">volver al historial</Link> sin guardar.
      </p>
    </div>
  );
}
