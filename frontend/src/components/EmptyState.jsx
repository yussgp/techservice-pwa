import { Link } from 'react-router-dom';

export function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }) {
  return (
    <div className="empty-state">
      {Icon ? (
        <span className="empty-state__icon" aria-hidden="true">
          <Icon size={26} />
        </span>
      ) : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {actionTo && actionLabel ? (
        <Link to={actionTo} className="btn btn-primary">
          {actionLabel}
        </Link>
      ) : null}
      {onAction && actionLabel ? (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
