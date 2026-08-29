import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { registerServiceWorker } from './register-sw';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Elemento #root não encontrado no documento.');
}

registerServiceWorker();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
