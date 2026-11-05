import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Home } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export function NotFound() {
  useDocumentTitle('Página no encontrada');

  return (
    <div className="page not-found-page">
      <section className="card not-found">
        <span className="not-found__icon" aria-hidden="true">
          <Compass size={30} />
        </span>
        <span className="not-found__code">404</span>
        <h1>No encontramos esta página</h1>
        <p>
          La dirección que abriste no existe en TechService o fue movida. Tus reportes
          guardados en este dispositivo siguen disponibles.
        </p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn-primary">
            <Home size={16} aria-hidden="true" />
            Ir al panel de control
          </Link>
          <Link to="/reports" className="btn btn-secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            Ver historial
          </Link>
        </div>
      </section>
    </div>
  );
}
