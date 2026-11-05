import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[TechService] Error no controlado en la interfaz:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fatal-error">
        <div className="fatal-error__card">
          <span className="fatal-error__icon" aria-hidden="true">
            <AlertTriangle size={28} />
          </span>
          <h1>Algo salió mal</h1>
          <p>
            La aplicación encontró un error inesperado. Tus reportes guardados en este
            dispositivo no se han perdido.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Recargar aplicación
          </button>
        </div>
      </div>
    );
  }
}
