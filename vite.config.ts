/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ARCHIVO_MANIFIESTO, ARCHIVO_SERVICIO, LADOS_ICONO, archivoIcono, iconoPorDefecto, manifiestoDelEditor, servicioSinInternet } from './src/exportar/pwa';

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

/**
 * EL EDITOR COMO APP (Chispa 1.2): se puede instalar en la pantalla de inicio del móvil o de la tablet
 * y funciona SIN INTERNET después de la primera vez. Al compilar se añaden a `dist`:
 *   manifest.webmanifest, icono-192.png, icono-512.png   la ficha y el icono de la app
 *   sw.js   el service worker: guarda los archivos del editor (una lista fija, hecha aquí) y los sirve
 *           desde el aparato. Es el mismo que el de los juegos exportados (src/exportar/pwa.ts).
 * No cambia la política de seguridad: todo sale de la propia carpeta ('self').
 */
function archivosDe(carpeta: string, raiz = carpeta): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivosDe(ruta, raiz) : [relative(raiz, ruta).split(sep).join('/')];
  });
}

function appDelEditor(): Plugin {
  let salida = 'dist';
  return {
    name: 'chispa-app',
    apply: 'build',
    configResolved: (c) => void (salida = join(c.root, c.build.outDir)),
    transformIndexHtml: (html) => html.replace('</head>', `  <link rel="manifest" href="${ARCHIVO_MANIFIESTO}" />\n    <link rel="apple-touch-icon" href="${archivoIcono(192)}" />\n    <meta name="mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-title" content="Chispa" />\n    <meta name="theme-color" content="#12141c" />\n  </head>`),
    closeBundle() {
      writeFileSync(join(salida, ARCHIVO_MANIFIESTO), manifiestoDelEditor());
      for (const lado of LADOS_ICONO) writeFileSync(join(salida, archivoIcono(lado)), iconoPorDefecto(lado));
      const archivos = archivosDe(salida).filter((a) => a !== ARCHIVO_SERVICIO).sort();
      // La versión es la huella de TODO lo que hay: si cambia un solo archivo, el navegador guarda la versión nueva
      const huella = createHash('sha256');
      for (const a of archivos) huella.update(a).update('\0').update(readFileSync(join(salida, a)));
      writeFileSync(join(salida, ARCHIVO_SERVICIO), servicioSinInternet({ version: huella.digest('hex').slice(0, 12), archivos, prefijo: 'chispa-editor', enSeguida: false }));
    },
  };
}

export default defineConfig({
  // base: './' hace que las rutas del juego compilado sean relativas.
  // Lo necesitaremos en la Fase 5 para exportar el juego como página independiente.
  base: './',
  plugins: [politicaDeSeguridad(), appDelEditor()],
  server: { open: true },
  // El editor (con CodeMirror) ocupa unos 500 KB: es normal, no hace falta avisar
  build: { chunkSizeWarningLimit: 1000 },
  // Tests del lenguaje (npm run pruebas). happy-dom simula un navegador sin ventana.
  test: {
    environment: 'happy-dom',
    include: ['pruebas/**/*.test.ts'],
  },
});
