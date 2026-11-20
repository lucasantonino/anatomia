import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/styles/tokens.css';
import { App } from './ui/App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento raiz "#root" não encontrado no documento HTML.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
