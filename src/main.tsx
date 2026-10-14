import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { lastProfile } from './game/save';
import { login } from './game/store';
import './styles.css';

const last = lastProfile.get();
if (last) login(last);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker: permite instalar como app no computador/celular e abrir offline.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
