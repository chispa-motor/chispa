/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * «Enseñar un dato» en un texto, sin escribir código: qué datos se pueden
 * enseñar y cómo queda el texto al elegir uno.
 */
import type { DefObjeto, DefProyecto } from '../../proyecto/formato';

/** Grupos de datos para el menú: [grupo, [hueco, texto que se ve en el menú][]]. */
export function datosParaTextos(proyecto: DefProyecto, objetosEscena: DefObjeto[], def: DefObjeto): [string, [string, string][]][] {
  const grupos: [string, [string, string][]][] = [];
  // Los datos de juego que ya usan los scripts (juego.puntos, juego.vidas...)
  const deJuego = new Set<string>(Object.keys(proyecto.datos ?? {}));
  for (const codigo of Object.values(proyecto.scripts)) {
    for (const m of codigo.matchAll(/\bjuego\.([\p{L}_][\p{L}\p{N}_]*)/gu)) deJuego.add(m[1]);
  }
  if (deJuego.size) grupos.push(['Datos del juego', [...deJuego].sort().map((n) => [`{juego.${n}}`, `juego.${n}`])]);
  // Los de este objeto
  const propios: [string, string][] = Object.keys(def.propiedades ?? {}).map((n) => [`{yo.${n}}`, `${n} (de este objeto)`]);
  propios.push(['{yo.nombre}', 'su nombre']);
  grupos.push(['Este objeto', propios]);
  // Propiedades propias de otros objetos de la escena (la vida del jugador...)
  const otros: [string, string][] = [];
  for (const o of objetosEscena) {
    if (o === def || !o.nombre) continue;
    for (const n of Object.keys(o.propiedades ?? {})) otros.push([`{buscar("${o.nombre}").${n}}`, `${n} de ${o.nombre}`]);
  }
  if (otros.length) grupos.push(['Otros objetos', otros]);
  grupos.push(['Tiempo', [['{redondear(tiempo.total)}', 'segundos jugados']]]);
  return grupos;
}

/**
 * Pone el hueco en el texto. Si el texto no dice nada todavía ("Texto"), se
 * crea uno con nombre: {juego.puntos} → "Puntos: {juego.puntos}".
 */
export function insertarDato(textoActual: string | undefined, hueco: string): string {
  const actual = (textoActual ?? '').trim();
  if (!actual || actual === 'Texto' || actual === 'Boton') {
    const nombre = /\.([\p{L}_][\p{L}\p{N}_]*)\}$/u.exec(hueco)?.[1] ?? (hueco.includes('tiempo') ? 'tiempo' : '');
    return nombre ? `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}: ${hueco}` : hueco;
  }
  return `${actual} ${hueco}`;
}
