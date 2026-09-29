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

/** Pasa a minúsculas, quita espacios de los lados y quita tildes. */
export function normalizar(texto: string): string {
  return quitarTildes(texto.trim().toLowerCase());
}
