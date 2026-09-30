/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';

/**
 * POLÍTICA DE SEGURIDAD (CSP) del editor compilado (ver AUDITORIA_SEGURIDAD.md).
 * Aunque un proyecto de otra persona consiguiera colar algo en la página:
 *   - solo se ejecuta el código del propio editor (script-src 'self');
 *   - no se puede cargar nada de internet: imágenes, sonidos y conexiones
 *     solo del propio editor o de dentro del proyecto (data:, blob:).
 * Los estilos sí pueden ir "en línea" porque el editor de código (CodeMirror)
 * los necesita; un estilo no puede ejecutar código ni, con esta política,
 * cargar nada de fuera. Solo al compilar: en `npm run dev` Vite necesita más
 * libertad para recargar al momento.
 */
export const CSP_EDITOR = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function politicaDeSeguridad(): Plugin {
  return {
    name: 'chispa-csp',
    apply: 'build',
    transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP_EDITOR}" />\n    <meta name="referrer" content="no-referrer" />`),
  };
}

export default defineConfig({
  // base: './' hace que las rutas del juego compilado sean relativas.
  // Lo necesitaremos en la Fase 5 para exportar el juego como página independiente.
  base: './',
  plugins: [politicaDeSeguridad()],
  server: { open: true },
  // El editor (con CodeMirror) ocupa unos 500 KB: es normal, no hace falta avisar
  build: { chunkSizeWarningLimit: 1000 },
  // Tests del lenguaje (npm run pruebas). happy-dom simula un navegador sin ventana.
  test: {
    environment: 'happy-dom',
    include: ['pruebas/**/*.test.ts'],
  },
});
