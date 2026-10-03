/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL JUEGO COMO APP DEL MÓVIL (una «PWA»): se instala en la pantalla de inicio
 * desde el navegador, se abre a pantalla completa como cualquier app y
 * funciona SIN INTERNET después de la primera vez.
 *
 * Para eso, además de la página del juego (index.html), hacen falta tres cosas:
 *
 *   manifest.webmanifest   la «ficha» de la app: su nombre, su icono, sus colores
 *                          y si se juega tumbado o de pie.
 *   sw.js                  un programa pequeño (un «service worker») que guarda
 *                          los archivos del juego en el aparato la primera vez
 *                          y luego los sirve desde ahí, aunque no haya internet.
 *   icono-192.png, icono-512.png   el icono de la app.
 *
 * SEGURIDAD: el service worker es lo más delicado, porque se queda instalado.
 * Este solo sabe hacer una cosa: devolver los archivos de SU juego, de una
 * lista fija. No guarda nada de otros sitios, no recibe órdenes de la página,
 * no carga más código y no toca lo que no esté en su carpeta.
 */
import type { DefProyecto } from '../proyecto/formato';
import { codificarPNG } from '../recursos/png';
import { resolverColor } from '../motor/Color';
import { sha256 } from '../utilidades/sha256';
import type { ArchivoZip } from './zip';

/** Los archivos de la app (además de index.html). */
export const ARCHIVO_MANIFIESTO = 'manifest.webmanifest';
export const ARCHIVO_SERVICIO = 'sw.js';
export const LADOS_ICONO = [192, 512] as const;
export const archivoIcono = (lado: number): string => `icono-${lado}.png`;

const FONDO_APP = '#12141c';

/** El color de fondo del juego (el de su primera escena), como #rrggbb. Si no vale, el oscuro de Chispa. */
export function colorDeLaApp(proyecto: DefProyecto): string {
  const escena = proyecto.escenas[proyecto.escenaInicial] ?? Object.values(proyecto.escenas)[0];
  const color = escena?.colorFondo ? resolverColor(escena.colorFondo) : '';
  return /^#[0-9a-f]{6}$/i.test(color) ? color : FONDO_APP;
}

/** La ficha de la app. Todo lo que sale del proyecto es texto o uno de unos pocos valores fijos. */
export function manifiestoDelJuego(proyecto: DefProyecto): string {
  const nombre = proyecto.nombre.trim() || 'Mi juego';
  return JSON.stringify({
    name: nombre,
    // (en la pantalla de inicio caben unas 12 letras)
    short_name: [...nombre].slice(0, 12).join(''),
    lang: 'es',
    start_url: './',
    scope: './',
    // «fullscreen»: sin la barra del navegador ni la de arriba del móvil; si el aparato no sabe, «standalone» (como una app)
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    orientation: proyecto.orientacion === 'horizontal' ? 'landscape' : proyecto.orientacion === 'vertical' ? 'portrait' : 'any',
    background_color: FONDO_APP,
    theme_color: colorDeLaApp(proyecto),
    categories: ['games'],
    icons: LADOS_ICONO.map((lado) => ({ src: archivoIcono(lado), sizes: `${lado}x${lado}`, type: 'image/png', purpose: 'any maskable' })),
  }, null, 1);
}

/** Una huella corta de unos textos (para saber si el juego ha cambiado y hay que guardar la versión nueva). */
export function huellaCorta(...textos: string[]): string {
  const bytes = sha256(new TextEncoder().encode(textos.join('\u0000')));
  return [...bytes.slice(0, 6)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * El service worker. `version` cambia cuando cambia el juego: al subir una versión nueva,
 * se guarda entera y se tira la vieja.
 *
 * Cómo sirve cada petición:
 *   - Solo las de SU carpeta, y solo de la lista de archivos del juego. Todo lo demás
 *     (otras carpetas del mismo sitio, otros sitios) ni lo toca: lo hace el navegador como siempre.
 *   - Primero lo guardado (así va sin internet y abre al instante). El navegador mira él solo, de
 *     vez en cuando, si sw.js ha cambiado: si se ha subido una versión nueva del juego, la guarda
 *     entera y la usa la próxima vez que se abra.
 */
export function servicioDelJuego(version: string, archivos: string[]): string {
  return servicioSinInternet({ version, archivos, prefijo: 'chispa-juego', enSeguida: true });
}

export interface OpcionesServicio {
  version: string;
  /** Los archivos que se guardan (rutas relativas a la carpeta, sin «./»). */
  archivos: string[];
  /** Con qué empieza el nombre de la caja: 'chispa-juego' (un juego exportado) o 'chispa-editor'. */
  prefijo: string;
  /**
   * verdadero: una versión nueva se queda con la página en cuanto está guardada (un juego es UN archivo: no hay lío).
   * falso: espera a que se cierren las pestañas abiertas con la versión vieja. El editor va en varios archivos
   * que se cargan cuando hacen falta: si se cambiaran a media sesión, la página vieja pediría trozos que ya no están.
   */
  enSeguida: boolean;
}

/** El service worker de «funciona sin internet», para un juego exportado o para el editor. */
export function servicioSinInternet({ version, archivos, prefijo, enSeguida }: OpcionesServicio): string {
  if (!/^[a-z-]+$/.test(prefijo)) throw new Error('prefijo de caja no válido');
  const lista = JSON.stringify(['./', ...archivos.map((a) => `./${a}`)]);
  return `/* Chispa: funcionar sin internet (ver exportar/pwa.ts). Version ${version.replace(/[^\w.-]/g, '')} */
'use strict';
const VERSION = ${JSON.stringify(version)};
const ARCHIVOS = ${lista};
/* Cada app tiene su caja, con el sitio donde esta en el nombre: dos en el mismo sitio web no se pisan */
const PREFIJO = '${prefijo}:' + self.registration.scope + ':';
const CAJA = PREFIJO + VERSION;
const PERMITIDOS = new Set(ARCHIVOS.map((a) => new URL(a, self.registration.scope).href));

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CAJA).then((caja) => caja.addAll(ARCHIVOS))${enSeguida ? '.then(() => self.skipWaiting())' : ''});
});

self.addEventListener('activate', (e) => {
  /* Se tiran las versiones viejas de ESTA app (las cajas de otras no se tocan) */
  e.waitUntil(caches.keys().then((cajas) => Promise.all(cajas.filter((c) => c.startsWith(PREFIJO) && c !== CAJA).map((c) => caches.delete(c)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const peticion = e.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  url.search = '';
  url.hash = '';
  const clave = url.href;
  if (!PERMITIDOS.has(clave)) return;
  e.respondWith(caches.open(CAJA).then((caja) => caja.match(clave).then((guardado) => guardado || fetch(peticion))));
});
`;
}

/** La ficha del EDITOR como app (se hace al compilar: ver vite.config.ts). */
export function manifiestoDelEditor(): string {
  return JSON.stringify({
    name: 'Chispa: haz tus juegos',
    short_name: 'Chispa',
    description: 'Editor y motor de juegos 2D en español.',
    lang: 'es',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'any',
    background_color: FONDO_APP,
    theme_color: FONDO_APP,
    categories: ['education', 'games'],
    icons: LADOS_ICONO.map((lado) => ({ src: archivoIcono(lado), sizes: `${lado}x${lado}`, type: 'image/png', purpose: 'any maskable' })),
  }, null, 1);
}

/**
 * Un icono por defecto, para los juegos que no han elegido el suyo: un cuadrado redondeado
 * oscuro con una chispa amarilla de cuatro puntas. Se pinta píxel a píxel (sin lienzo).
 */
export function iconoPorDefecto(lado: number, fondo = FONDO_APP): Uint8Array {
  const rgba = new Uint8Array(lado * lado * 4);
  const [fr, fg, fb] = [1, 3, 5].map((i) => parseInt(fondo.slice(i, i + 2), 16) || 0);
  const c = (lado - 1) / 2;
  const radio = lado * 0.34;
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const i = (y * lado + x) * 4;
      // La chispa: un astroide (|x|^(2/3) + |y|^(2/3) <= r^(2/3)), que es una estrella de cuatro puntas
      const dx = Math.abs(x - c) / radio;
      const dy = Math.abs(y - c) / radio;
      const dentro = Math.pow(dx, 2 / 3) + Math.pow(dy, 2 / 3) <= 1;
      rgba[i] = dentro ? 0xf1 : fr;
      rgba[i + 1] = dentro ? 0xc4 : fg;
      rgba[i + 2] = dentro ? 0x0f : fb;
      rgba[i + 3] = 255;
    }
  }
  return codificarPNG(lado, lado, rgba);
}

export type IconosDeApp = Record<(typeof LADOS_ICONO)[number], Uint8Array>;

/**
 * Los archivos de la app, además de index.html: la ficha, el service worker y los iconos.
 * `iconos`: los hechos con el icono del juego (en el editor); si no hay, el de por defecto.
 */
export function archivosDeApp(proyecto: DefProyecto, pagina: string, iconos?: IconosDeApp | null): ArchivoZip[] {
  const manifiesto = manifiestoDelJuego(proyecto);
  const fondo = colorDeLaApp(proyecto);
  const imagenes = LADOS_ICONO.map((lado) => ({ nombre: archivoIcono(lado), contenido: iconos?.[lado] ?? iconoPorDefecto(lado, fondo) }));
  const nombres = ['index.html', ARCHIVO_MANIFIESTO, ...imagenes.map((i) => i.nombre)];
  const version = huellaCorta(pagina, manifiesto, ...imagenes.map((i) => String(i.contenido.length)));
  return [
    { nombre: ARCHIVO_MANIFIESTO, contenido: manifiesto },
    { nombre: ARCHIVO_SERVICIO, contenido: servicioDelJuego(version, nombres) },
    ...imagenes,
  ];
}
