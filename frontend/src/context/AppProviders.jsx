import { InstallProvider } from './InstallContext.jsx';
import { SyncProvider } from './SyncContext.jsx';
import { ToastProvider } from './ToastContext.jsx';

export function AppProviders({ children }) {
  return (
    <ToastProvider>
      <InstallProvider>
        <SyncProvider>{children}</SyncProvider>
      </InstallProvider>
    </ToastProvider>
  );
}
