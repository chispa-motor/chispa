/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EXPORTAR: convierte un proyecto en UNA página web que funciona sola.
 *
 * La página lleva dentro TODO:
 *   - el reproductor (el motor + el intérprete de Chispa, sin el editor),
 *   - el proyecto en JSON, con las imágenes y sonidos como "data URL",
 *   - los estilos.
 * No necesita internet ni ningún otro archivo: se puede abrir con doble clic,
 * mandar por correo o subir tal cual a itch.io, GitHub Pages, Netlify...
 */
import type { DefProyecto } from '../proyecto/formato';
import { ESTILOS_TACTILES } from '../reproductor/ControlesTactiles';
import { huellaCSP } from '../utilidades/sha256';
import { CONFIGURACION, LICENCIA } from '../configuracion';
import { VERSION } from '../version';

/**
 * El aviso que lleva cada juego exportado (como comentario: no se ve al jugar).
 * El juego es de quien lo hace; lo único que la MPL 2.0 pide es decir que el
 * motor de dentro es Chispa y dónde está su código (ver EMPIEZA_AQUI.md,
 * «¿De quién son mis juegos?»).
 */
export function avisoDeLicencia(): string {
  return `<!--
  Hecho con Chispa ${VERSION}, el motor de juegos en español.
  EL JUEGO (su proyecto, sus scripts, sus imágenes y sus sonidos) es de quien lo ha hecho.
  EL MOTOR Chispa que va dentro tiene licencia ${LICENCIA.nombre}: ${LICENCIA.enlace}
  El código de Chispa está en ${CONFIGURACION.repositorio}
-->`;
}

/** Estilos de la página del juego (pantalla completa, bandas negras, panel de errores). */
const ESTILOS = `
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:system-ui,"Segoe UI",sans-serif}
#contenedor-juego{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center}
#lienzo{display:block;touch-action:none;outline:none}
#panel-error{position:fixed;left:50%;top:24px;transform:translateX(-50%);max-width:min(680px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;padding:16px 20px;background:#3a1216;border:2px solid #e74c3c;border-radius:10px;color:#ffe9e9;box-shadow:0 10px 30px rgba(0,0,0,.5)}
#panel-error h2{margin:0 0 8px;font-size:18px;color:#ff8a80}
#panel-error p{margin:6px 0;line-height:1.45;white-space:pre-wrap}
#panel-error .pista{color:#ffd98a}
#panel-error pre{margin:8px 0;padding:8px 10px;background:#1c0709;border-radius:6px;color:#ffd98a;font:14px ui-monospace,Consolas,monospace;white-space:pre-wrap}
#panel-error{z-index:20}
#cargando{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:#12141c;color:#e8ebf2;text-align:center;transition:opacity .35s}
#cargando.fuera{opacity:0;pointer-events:none}
#cargando .caja-carga{display:flex;flex-direction:column;align-items:center;gap:14px;padding:24px;max-width:90vw}
#cargando img{width:96px;height:96px;object-fit:contain}
#cargando img.pixel{image-rendering:pixelated}
#cargando h1{margin:0;font-size:clamp(22px,5vw,36px);overflow-wrap:anywhere}
#cargando .barra-carga{width:min(220px,60vw);height:6px;border-radius:3px;background:#2a2f3d;overflow:hidden}
#cargando .barra-carga i{display:block;width:40%;height:100%;border-radius:3px;background:#f1c40f;animation:carga 1s ease-in-out infinite alternate}
#cargando p{margin:6px 0 0;font-size:14px;color:#8e97ab}
#cargando b{color:#f1c40f}
@keyframes carga{from{transform:translateX(-20%)}to{transform:translateX(170%)}}
@media (prefers-reduced-motion:reduce){#cargando .barra-carga i{animation:none;width:100%}}
`;

/** El icono del juego (la "data URL" de la imagen elegida), o null si no tiene o ya no existe. */
export function iconoDelJuego(proyecto: DefProyecto): string | null {
  const nombre = proyecto.icono;
  if (!nombre || !Object.prototype.hasOwnProperty.call(proyecto.imagenes, nombre)) return null;
  const datos = proyecto.imagenes[nombre];
  return typeof datos === 'string' && datos.startsWith('data:image/') ? datos : null;
}

/**
 * La pantalla de carga: el icono y el nombre del juego, y «Hecho con Chispa».
 * Va en la página (no la pinta el motor), así que se ve desde el primer
 * instante, antes de que arranque nada. El reproductor la quita al empezar.
 */
export function pantallaDeCarga(proyecto: DefProyecto): string {
  if (proyecto.pantallaDeCarga === false) return '';
  const icono = iconoDelJuego(proyecto);
  const imagen = icono ? `<img${proyecto.pixelArt ? ' class="pixel"' : ''} src="${escaparHTML(icono)}" alt="">` : '';
  return `<div id="cargando" role="status" aria-label="Cargando"><div class="caja-carga">${imagen}<h1>${escaparHTML(proyecto.nombre)}</h1><div class="barra-carga"><i></i></div><p>Hecho con <b>Chispa</b></p></div></div>\n`;
}

/** Escapa un texto para meterlo en HTML (el título). */
export function escaparHTML(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * JSON seguro dentro de <script>: cambiamos "<" por su código "\u003c". Así
 * ningún texto del juego (por ejemplo, un mostrar("</script>")) puede cerrar
 * la etiqueta antes de tiempo. Al leerlo, JSON.parse lo convierte otra vez en "<".
 */
export function jsonParaScript(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/**
 * POLÍTICA DE SEGURIDAD (CSP) de la página del juego. Le dice al navegador:
 *   - solo se ejecuta EL código de Chispa que va dentro (por su huella sha256);
 *     cualquier otro script, aunque alguien lo colara, no se ejecuta;
 *   - solo se usan LOS estilos que van dentro (también por su huella);
 *   - las imágenes y los sonidos solo pueden salir del propio archivo (data:);
 *   - la página no puede conectarse a ningún sitio de internet, ni cargar
 *     fuentes, ni enviar formularios, ni meter otras páginas dentro.
 */
export function politicaDeSeguridad(codigo: string, estilos: string[]): string {
  return [
    "default-src 'none'",
    `script-src ${huellaCSP(codigo)}`,
    `style-src ${estilos.map(huellaCSP).join(' ')}`,
    'img-src data: blob:',
    'media-src data: blob:',
    "connect-src 'none'",
    "font-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "manifest-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

/** Genera la página completa. `reproductor` es el código de public/reproductor.js. */
export function generarPaginaJuego(proyecto: DefProyecto, reproductor: string): string {
  const codigo = reproductor.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  const csp = politicaDeSeguridad(codigo, [ESTILOS, ESTILOS_TACTILES]);
  const icono = iconoDelJuego(proyecto);
  return `<!doctype html>
${avisoDeLicencia()}
<html lang="es">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${escaparHTML(csp)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Chispa ${VERSION}">
<meta name="referrer" content="no-referrer">
<title>${escaparHTML(proyecto.nombre)}</title>${icono ? `\n<link rel="icon" href="${escaparHTML(icono)}">` : ''}
<style>${ESTILOS}</style>
<style data-controles-tactiles>${ESTILOS_TACTILES}</style>
</head>
<body>
<div id="contenedor-juego"><canvas id="lienzo" tabindex="0"></canvas></div>
${pantallaDeCarga(proyecto)}<div id="panel-error" hidden></div>
<script type="application/json" id="proyecto-chispa">${jsonParaScript(proyecto)}</script>
<script>${codigo}</script>
</body>
</html>
`;
}
