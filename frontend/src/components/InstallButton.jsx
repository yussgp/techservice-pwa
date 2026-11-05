import { Link } from 'react-router-dom';
import { Download, Smartphone } from 'lucide-react';
import { useInstall } from '../context/InstallContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { cn } from '../utils/classNames.js';

export function InstallButton({ variant = 'secondary', size = 'sm', className = '', full = false }) {
  const { canInstall, isInstalled, promptInstall } = useInstall();
  const { addToast } = useToast();

  if (isInstalled) return null;

  if (canInstall) {
    return (
      <button
        type="button"
        className={cn('btn', `btn-${variant}`, `btn-${size}`, full && 'btn-block', className)}
        onClick={async () => {
          const outcome = await promptInstall();
          if (outcome === 'accepted') {
            addToast({
              type: 'success',
              title: 'Instalación iniciada',
              message: 'TechService se agregará a tu pantalla de inicio.'
            });
          }
        }}
      >
        <Download size={15} aria-hidden="true" />
        Instalar aplicación
      </button>
    );
  }

  return (
    <Link
      to="/settings"
      className={cn('btn', `btn-${variant}`, `btn-${size}`, full && 'btn-block', className)}
      title="Consulta los pasos para instalar la PWA en tu dispositivo"
    >
      <Smartphone size={15} aria-hidden="true" />
      Cómo instalar
    </Link>
  );
}
