/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL EDITOR EN UN SOLO ARCHIVO: chispa-editor.html, con todo dentro (el código, los estilos, el icono
 * y el reproductor que se mete en los juegos al exportar). Se abre con doble clic en un ordenador o
 * tocándolo en la app Archivos de una tableta, sin servidor y sin internet.
 *
 *     npm run reproductor && node herramientas/editor-un-archivo.mjs [salida.html]
 *
 * Lo que NO tiene respecto al editor publicado en una web: no se instala como app (eso necesita https)
 * y no hay service worker (no le hace falta: ya está entero en el aparato).
 *
 * La política de seguridad es la misma, salvo que el único código que se deja ejecutar es el de dentro
 * de la página, identificado por su huella (sha256): nada que se cuele después se ejecuta.
 */
import { build } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARPETA = join(RAIZ, 'dist-un-archivo');
const salida = resolve(process.argv[2] ?? join(RAIZ, 'chispa-editor.html'));

await build({
  root: RAIZ,
  configFile: join(RAIZ, 'vite.config.ts'),
  logLevel: 'warn',
  build: { outDir: 'dist-un-archivo', emptyOutDir: true, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true } } },
});

const leer = (...ruta) => readFileSync(join(CARPETA, ...ruta), 'utf8');
/** Para meter texto dentro de una etiqueta <script> sin que la cierre antes de tiempo. */
const paraScript = (codigo) => codigo.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const archivos = readdirSync(join(CARPETA, 'assets'));
const js = archivos.filter((a) => a.endsWith('.js'));
const css = archivos.filter((a) => a.endsWith('.css'));
if (js.length !== 1) throw new Error(`Se esperaba un solo archivo de código y hay ${js.length}: ${js.join(', ')}`);

const estrella = 'data:image/svg+xml;base64,' + readFileSync(join(CARPETA, 'imagenes', 'estrella.svg')).toString('base64');
const codigo = paraScript(leer('assets', js[0]).replaceAll('imagenes/estrella.svg', estrella));
const estilos = css.map((a) => leer('assets', a)).join('\n').replace(/<\/style/gi, '<\\/style');
const reproductor = paraScript(leer('reproductor.js'));
const huella = createHash('sha256').update(codigo).digest('base64');

let html = leer('index.html');
const quitar = (patron, que) => {
  if (!patron.test(html)) throw new Error(`No encuentro en index.html: ${que}`);
  html = html.replace(patron, '');
};
quitar(/\s*<script type="module"[^>]*src="[^"]*"><\/script>/, 'el código');
quitar(/\s*<link rel="stylesheet"[^>]*>/g, 'los estilos');
quitar(/\s*<link rel="manifest"[^>]*>/, 'la ficha de la app');
quitar(/\s*<link rel="apple-touch-icon"[^>]*>/, 'el icono de la app');
// (siempre con una función: en un texto de reemplazo, los «$» del código se entenderían como órdenes)
html = html.replace(/<link rel="icon" href="[^"]*" \/>/, () => `<link rel="icon" href="${estrella}" />`);
if (!html.includes("script-src 'self'")) throw new Error('No encuentro la política de seguridad en index.html');
html = html.replace("script-src 'self'", () => `script-src 'sha256-${huella}'`);
html = html.replace('</head>', () => `  <style>${estilos}</style>\n  </head>`);
// El reproductor va como texto (no se ejecuta aquí: el editor lo copia dentro de los juegos que exporta)
html = html.replace('</body>', () => `  <script type="text/plain" id="reproductor-chispa">${reproductor}</script>\n    <script type="module">${codigo}</script>\n  </body>`);
if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html)) throw new Error('La página sigue pidiendo archivos de fuera');
writeFileSync(salida, html);
rmSync(CARPETA, { recursive: true, force: true });
console.log(`Hecho ${salida} (${Math.round(html.length / 1024)} KB): el editor entero en un archivo.`);
