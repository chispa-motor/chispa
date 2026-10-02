/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LA LETRA «PIXEL» DE CHISPA: una letra de puntos dibujada a mano, como las
 * de las consolas antiguas. Cada letra es una rejilla de 5 puntos de ancho
 * por 7 de alto (más 2 filas arriba para las tildes de las mayúsculas).
 *
 * Está hecha para Chispa (no es una copia de ningún archivo de letra) y va
 * dentro del motor: se ve IGUAL en todos los ordenadores y no ocupa casi nada.
 * Tiene las letras, los números, los signos y lo que hace falta en español:
 * á é í ó ú ü ñ ç ¿ ¡ y sus mayúsculas.
 *
 * Cada letra se escribe con sus 7 filas separadas por espacios; «#» es un
 * punto pintado y «.» uno vacío. Así se puede leer (y corregir) a simple vista.
 */

const LETRAS: Record<string, string> = {
  ' ': '..... ..... ..... ..... ..... ..... .....',
  A: '.###. #...# #...# ##### #...# #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
  J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# ##..# #.#.# #..## #...# #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# ##.## #...#',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',
  a: '..... ..... .###. ....# .#### #...# .####',
  b: '#.... #.... #.##. ##..# #...# #...# ####.',
  c: '..... ..... .###. #.... #.... #...# .###.',
  d: '....# ....# .##.# #..## #...# #...# .####',
  e: '..... ..... .###. #...# ##### #.... .###.',
  f: '..##. .#..# .#... ###.. .#... .#... .#...',
  g: '..... .#### #...# #...# .#### ....# .###.',
  h: '#.... #.... #.##. ##..# #...# #...# #...#',
  i: '..#.. ..... .##.. ..#.. ..#.. ..#.. .###.',
  j: '...#. ..... ..##. ...#. ...#. #..#. .##..',
  k: '#.... #.... #..#. #.#.. ##... #.#.. #..#.',
  l: '.##.. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
  m: '..... ..... ##.#. #.#.# #.#.# #...# #...#',
  n: '..... ..... #.##. ##..# #...# #...# #...#',
  o: '..... ..... .###. #...# #...# #...# .###.',
  p: '..... ..... ####. #...# ####. #.... #....',
  q: '..... ..... .##.# #..## .#### ....# ....#',
  r: '..... ..... #.##. ##..# #.... #.... #....',
  s: '..... ..... .###. #.... .###. ....# ####.',
  t: '.#... .#... ###.. .#... .#... .#..# ..##.',
  u: '..... ..... #...# #...# #...# #..## .##.#',
  v: '..... ..... #...# #...# #...# .#.#. ..#..',
  w: '..... ..... #...# #...# #.#.# #.#.# .#.#.',
  x: '..... ..... #...# .#.#. ..#.. .#.#. #...#',
  y: '..... ..... #...# #...# .#### ....# .###.',
  z: '..... ..... ##### ...#. ..#.. .#... #####',
  0: '.###. #...# #..## #.#.# ##..# #...# .###.',
  1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  2: '.###. #...# ....# ...#. ..#.. .#... #####',
  3: '##### ...#. ..#.. ...#. ....# #...# .###.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  5: '##### #.... ####. ....# ....# #...# .###.',
  6: '..##. .#... #.... ####. #...# #...# .###.',
  7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.',
  9: '.###. #...# #...# .#### ....# ...#. .##..',
  '!': '..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..',
  '"': '.#.#. .#.#. .#.#. ..... ..... ..... .....',
  '#': '.#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.',
  $: '..#.. .#### #.#.. .###. ..#.# ####. ..#..',
  '%': '##... ##..# ...#. ..#.. .#... #..## ...##',
  '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#',
  "'": '.##.. ..#.. .#... ..... ..... ..... .....',
  '(': '...#. ..#.. .#... .#... .#... ..#.. ...#.',
  ')': '.#... ..#.. ...#. ...#. ...#. ..#.. .#...',
  '*': '..... ..#.. #.#.# .###. #.#.# ..#.. .....',
  '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
  ',': '..... ..... ..... ..... .##.. ..#.. .#...',
  '-': '..... ..... ..... ##### ..... ..... .....',
  '.': '..... ..... ..... ..... ..... .##.. .##..',
  '/': '..... ....# ...#. ..#.. .#... #.... .....',
  ':': '..... .##.. .##.. ..... .##.. .##.. .....',
  ';': '..... .##.. .##.. ..... .##.. ..#.. .#...',
  '<': '...#. ..#.. .#... #.... .#... ..#.. ...#.',
  '=': '..... ..... ##### ..... ##### ..... .....',
  '>': '.#... ..#.. ...#. ....# ...#. ..#.. .#...',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  '@': '.###. #...# ....# .##.# #.#.# #.#.# .###.',
  '[': '.###. .#... .#... .#... .#... .#... .###.',
  '\\': '..... #.... .#... ..#.. ...#. ....# .....',
  ']': '.###. ...#. ...#. ...#. ...#. ...#. .###.',
  '^': '..#.. .#.#. #...# ..... ..... ..... .....',
  _: '..... ..... ..... ..... ..... ..... #####',
  '`': '.#... ..#.. ...#. ..... ..... ..... .....',
  '{': '...#. ..#.. ..#.. .#... ..#.. ..#.. ...#.',
  '|': '..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  '}': '.#... ..#.. ..#.. ...#. ..#.. ..#.. .#...',
  '~': '..... ..... .#... #.#.# ...#. ..... .....',
  '¡': '..#.. ..... ..#.. ..#.. ..#.. ..#.. ..#..',
  '¿': '..#.. ..... ..#.. .#... #.... #...# .###.',
  '°': '.##.. #..#. #..#. .##.. ..... ..... .....',
  '·': '..... ..... ..... ..#.. ..... ..... .....',
  '€': '..##. .#..# ###.. .#... ###.. .#..# ..##.',
  '«': '..... ..... .#..# #..#. .#..# ..... .....',
  '»': '..... ..... #..#. .#..# #..#. ..... .....',
  ç: '..... .###. #.... #.... .###. ..#.. .#...',
  Ç: '.###. #...# #.... #...# .###. ..#.. .#...',
  '♥': '..... .#.#. ##### ##### .###. ..#.. .....',
  '★': '..#.. ..#.. ##### .###. .###. #...# .....',
  '←': '..... ..#.. .#... ##### .#... ..#.. .....',
  '→': '..... ..#.. ...#. ##### ...#. ..#.. .....',
  '↑': '..#.. .###. #.#.# ..#.. ..#.. ..#.. .....',
  '↓': '..#.. ..#.. ..#.. #.#.# .###. ..#.. .....',
};

/** Tildes y demás: letra con tilde → [letra sin tilde, qué se le pone encima]. */
const CON_TILDE: Record<string, [string, 'aguda' | 'grave' | 'dieresis' | 'virgulilla']> = {
  á: ['a', 'aguda'], é: ['e', 'aguda'], í: ['i', 'aguda'], ó: ['o', 'aguda'], ú: ['u', 'aguda'],
  à: ['a', 'grave'], è: ['e', 'grave'], ì: ['i', 'grave'], ò: ['o', 'grave'], ù: ['u', 'grave'],
  ü: ['u', 'dieresis'], ï: ['i', 'dieresis'], ñ: ['n', 'virgulilla'],
  Á: ['A', 'aguda'], É: ['E', 'aguda'], Í: ['I', 'aguda'], Ó: ['O', 'aguda'], Ú: ['U', 'aguda'],
  À: ['A', 'grave'], È: ['E', 'grave'], Ì: ['I', 'grave'], Ò: ['O', 'grave'], Ù: ['U', 'grave'],
  Ü: ['U', 'dieresis'], Ï: ['I', 'dieresis'], Ñ: ['N', 'virgulilla'],
};
/** Las dos filas de cada tilde (la de arriba y la de abajo). */
const TILDES = {
  aguda: ['...#.', '..#..'],
  grave: ['.#...', '..#..'],
  dieresis: ['.#.#.', '.....'],
  virgulilla: ['.###.', '.....'],
};

/** Ancho y alto de una letra, en puntos (el alto incluye las 2 filas de las tildes de las mayúsculas). */
export const ANCHO_LETRA_PIXEL = 5;
export const ALTO_LETRA_PIXEL = 9;
/** Las filas que hay por encima de la letra (para las tildes de las mayúsculas). */
export const FILAS_DE_TILDE = 2;

const hechas = new Map<string, string[] | null>();

/** Las 9 filas de una letra (2 de tildes + 7), o null si la letra pixel no la tiene. */
export function filasDeLetra(letra: string): string[] | null {
  const ya = hechas.get(letra);
  if (ya !== undefined) return ya;
  let filas: string[] | null = null;
  const tilde = Object.prototype.hasOwnProperty.call(CON_TILDE, letra) ? CON_TILDE[letra] : null;
  const base = Object.prototype.hasOwnProperty.call(LETRAS, tilde ? tilde[0] : letra) ? LETRAS[tilde ? tilde[0] : letra].split(' ') : null;
  if (base) {
    filas = ['.....', '.....', ...base];
    if (tilde) {
      const [arriba, abajo] = TILDES[tilde[1]];
      // En las minúsculas la tilde va en las dos primeras filas de la letra (que están vacías,
      // o tienen el punto de la i, que se quita); en las mayúsculas, en las dos de encima
      const desde = tilde[0] === tilde[0].toUpperCase() ? 0 : FILAS_DE_TILDE;
      filas[desde] = arriba;
      filas[desde + 1] = abajo;
    }
  }
  hechas.set(letra, filas);
  return filas;
}

/** ¿Se puede escribir entero con la letra pixel? (si no, se usa la letra del ordenador en píxeles gordos) */
export function sePuedeEscribir(texto: string): boolean {
  for (const letra of texto) if (!filasDeLetra(letra)) return false;
  return true;
}

/**
 * Un texto en puntos: sus filas («#» pintado, «.» vacío), con una columna
 * vacía entre letra y letra. null si alguna letra no está.
 */
export function puntosDeTexto(texto: string): string[] | null {
  const filas = Array.from({ length: ALTO_LETRA_PIXEL }, () => '');
  let primera = true;
  for (const letra of texto) {
    const f = filasDeLetra(letra);
    if (!f) return null;
    for (let i = 0; i < ALTO_LETRA_PIXEL; i++) filas[i] += (primera ? '' : '.') + f[i];
    primera = false;
  }
  return filas;
}

/** Todas las letras que tiene (para las pruebas y la documentación). */
export function letrasDeLaLetraPixel(): string[] {
  return [...Object.keys(LETRAS), ...Object.keys(CON_TILDE)];
}
