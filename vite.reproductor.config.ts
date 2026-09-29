/**
 * Compila el REPRODUCTOR (el motor sin el editor) en un único archivo,
 * public/reproductor.js. El editor lo mete dentro de la página al exportar.
 *
 * Se ejecuta solo antes de "npm run dev" y "npm run build" (ver package.json).
 */
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'public',
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: 'src/reproductor/reproductor.ts',
      name: 'ChispaReproductor',
      formats: ['iife'],
      fileName: () => 'reproductor.js',
    },
  },
  logLevel: 'warn',
});
