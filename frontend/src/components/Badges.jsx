import { PRIORITIES, REPORT_STATUSES, labelFrom } from '../constants.js';

export function PriorityBadge({ value, className = '' }) {
  return (
    <span className={`badge badge--priority badge--priority-${value} ${className}`.trim()}>
      <span className="priority-dot" aria-hidden="true" />
      {labelFrom(PRIORITIES, value)}
    </span>
  );
}

export function ReportStatusBadge({ value, className = '' }) {
  return (
    <span className={`badge badge--status badge--status-${value} ${className}`.trim()}>
      {labelFrom(REPORT_STATUSES, value)}
    </span>
  );
}
