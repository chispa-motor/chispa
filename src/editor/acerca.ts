/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * «ACERCA DE CHISPA» y «APOYA CHISPA», los dos en el menú Ayuda.
 *
 * DECISIÓN: el botón de apoyo solo hace algo cuando alguien lo pulsa. Chispa
 * nunca enseña un aviso de donaciones por su cuenta (ni al abrir, ni al
 * exportar, ni después de un rato): el editor es para hacer juegos.
 */
import { h, icono } from './interfaz/dom';
import { abrirDialogo } from './interfaz/dialogos';
import { AUTOR, CONFIGURACION, LICENCIA } from '../configuracion';
import { VERSION } from '../version';
import { VERSION_PROYECTO } from '../proyecto/formato';

/** Un enlace que se abre en otra pestaña, sin que la otra página sepa de dónde vienes. */
function enlace(texto: string, url: string): HTMLElement {
  return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, texto);
}

/** El enlace a un archivo del repositorio de Chispa (CREDITOS.md, LICENSE...). */
export function enlaceAlRepositorio(archivo: string): string {
  return `${CONFIGURACION.repositorio.replace(/\/$/, '')}/blob/main/${archivo}`;
}

export function abrirAcercaDe(): void {
  abrirDialogo('Acerca de Chispa', h('div', { class: 'acerca-de' },
    h('div', { class: 'acerca-cabecera' },
      icono('estrella', 40),
      h('div', {},
        h('div', { class: 'acerca-nombre' }, 'Chispa'),
        h('div', { class: 'acerca-version' }, `Versión ${VERSION}`),
      ),
    ),
    h('p', {}, 'El motor para hacer videojuegos 2D programando en español.'),
    h('dl', { class: 'acerca-datos' },
      h('dt', {}, 'Creado por'), h('dd', {}, AUTOR, ' y los colaboradores de Chispa (', enlace('ver todos los créditos', enlaceAlRepositorio('CREDITOS.md')), ')'),
      h('dt', {}, 'Licencia'), h('dd', {}, enlace(LICENCIA.nombre, LICENCIA.enlace), '. Es de código abierto: ', enlace('ver el código de Chispa', CONFIGURACION.repositorio), '.'),
      h('dt', {}, 'En la web'), h('dd', {}, enlace(CONFIGURACION.web.replace(/^https:\/\//, '').replace(/\/$/, ''), CONFIGURACION.web), ', sin instalar nada.'),
      h('dt', {}, 'Tus juegos'), h('dd', {}, h('strong', {}, 'Son tuyos.'), ' La licencia es para el motor, no para lo que haces con él: puedes regalarlos, venderlos o guardarlos sin enseñar su código.'),
      h('dt', {}, 'Usa'), h('dd', {}, enlace('CodeMirror', 'https://codemirror.net'), ' (el editor de código), de Marijn Haverbeke. ', enlace('Licencias de terceros', 'licencias-de-terceros.txt'), '.'),
      h('dt', {}, 'Formato de proyecto'), h('dd', {}, `Versión ${VERSION_PROYECTO}`),
    ),
  ), [
    { texto: '💛 Apoya Chispa', alPulsar: () => void abrirApoyo() },
    { texto: 'Cerrar', clase: 'principal' },
  ]);
}

/**
 * «Apoya Chispa»: abre el enlace de donaciones (src/configuracion.ts) en otra
 * pestaña. Si todavía no hay enlace, da las gracias y cuenta otras formas de ayudar.
 */
export function abrirApoyo(): void {
  const url = CONFIGURACION.donaciones;
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  abrirDialogo('Apoya Chispa', h('div', {},
    h('p', {}, '¡Gracias por querer apoyar Chispa! 💛'),
    h('p', {}, 'Todavía no hay una forma de donar, pero pronto la habrá. Mientras tanto, lo que más ayuda es:'),
    h('ul', {},
      h('li', {}, 'hacer juegos y enseñárselos a tus amigos;'),
      h('li', {}, 'contar a otras personas que Chispa existe;'),
      h('li', {}, 'avisar cuando algo no se entiende o no funciona (', enlace('en GitHub', `${CONFIGURACION.repositorio.replace(/\/$/, '')}/issues`), ').'),
    ),
  ), [{ texto: 'Cerrar', clase: 'principal' }]);
}
