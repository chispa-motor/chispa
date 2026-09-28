import { defineConfig } from 'vite';

// base: './' hace que las rutas del juego compilado sean relativas.
// Lo necesitaremos en la Fase 5 para exportar el juego como página independiente.
export default defineConfig({
  base: './',
  server: { open: true },
});
