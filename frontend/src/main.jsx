import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.jsx';
import { AppProviders } from './context/AppProviders.jsx';
import { registerServiceWorker } from './services/pwa.js';
import './styles/index.css';

const container = document.getElementById('root');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>
);

// El registro es idempotente y silencioso si el navegador no lo soporta.
void registerServiceWorker();
