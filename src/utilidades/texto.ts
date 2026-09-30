/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Utilidades de texto compartidas por todo el motor.
 *
 * quitarTildes() es clave para el lenguaje Chispa: queremos que "función" y
 * "funcion" signifiquen lo mismo, y que "izquierda" funcione aunque alguien
 * escriba "Izquierda". Lo usaremos en el teclado, en los colores y más
 * adelante en el lexer.
 */

/**
 * Quita tildes y diéresis (á→a, é→e, ü→u...) pero CONSERVA la ñ.
 *
 * Cómo funciona:
 * 1. normalize('NFD') separa cada letra de su acento: "á" pasa a ser "a" + "´".
 * 2. Borramos los acentos sueltos (rango Unicode U+0300–U+036F), excepto
 *    U+0303, que es la virgulilla de la ñ.
 * 3. normalize('NFC') vuelve a juntar "n" + "~" en "ñ".
 */
export function quitarTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u0302\u0304-\u036f]/g, '').normalize('NFC');
}

/**
 * Pasa a minúsculas, quita espacios de los lados y quita tildes.
 *
 * Se llama MUCHÍSIMO (cada vez que se busca un objeto por su nombre, en cada
 * fotograma y para cada enemigo), y quitar tildes es lento. Como los textos
 * que se normalizan son casi siempre los mismos (nombres de objetos, de
 * teclas, de propiedades), se recuerdan. Lo encontró la Arena de Habilidades:
 * era un tercio de todo el tiempo del juego.
 */
const recordados = new Map<string, string>();
const MAXIMO_RECORDADOS = 20000;
export function normalizar(texto: string): string {
  let r = recordados.get(texto);
  if (r === undefined) {
    r = quitarTildes(texto.trim().toLowerCase());
    if (recordados.size >= MAXIMO_RECORDADOS) recordados.clear();
    recordados.set(texto, r);
  }
  return r;
}
