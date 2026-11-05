import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PageHeader({ title, description, backTo, backLabel = 'Volver', children }) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {backTo ? (
          <Link to={backTo} className="back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            {backLabel}
          </Link>
        ) : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {children ? <div className="page-header__actions">{children}</div> : null}
    </header>
  );
}
