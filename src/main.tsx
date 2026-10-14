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
