/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // base: './' hace que las rutas del juego compilado sean relativas.
  // Lo necesitaremos en la Fase 5 para exportar el juego como página independiente.
  base: './',
  server: { open: true },
  // Tests del lenguaje (npm run pruebas). happy-dom simula un navegador sin ventana.
  test: {
    environment: 'happy-dom',
    include: ['pruebas/**/*.test.ts'],
  },
});
