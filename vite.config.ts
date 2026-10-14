import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' para funcionar tanto no GitHub Pages (/CellCare/) quanto num domínio próprio
// e, futuramente, dentro do Capacitor (Android/iOS).
export default defineConfig({
  base: './',
  plugins: [react()],
});
