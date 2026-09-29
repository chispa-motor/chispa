/**
 * ════════════════════════════════════════════════════════════════════
 *  ETAPA 1 de 3 · LÉXICO — El lexer: texto → lista de tokens
 * ════════════════════════════════════════════════════════════════════
 *
 * Recorre cada línea carácter a carácter y decide qué es cada trozo:
 * un número, un texto entre comillas, una palabra, un símbolo...
 *
 * Lo más interesante es la SANGRÍA, como en Python. Guardamos una pila con
 * los niveles de sangría abiertos, por ejemplo [0, 4, 8]:
 *   - Si una línea tiene MÁS espacios que el último nivel → token INDENTAR
 *   - Si tiene MENOS → uno o varios DESINDENTAR (se cierran bloques)
 *   - Si no coincide con ningún nivel anterior → error amable
 *
 * Dentro de ( ), [ ] o { } ignoramos los saltos de línea, para poder
 * escribir listas y tablas largas en varias líneas.
 *
 * ── Recuperación de errores ──
 * Si una línea tiene un error (un símbolo raro, un texto sin cerrar...), lo
 * apuntamos, nos saltamos el resto de ESA línea y seguimos con la siguiente.
 * Así se pueden enseñar todos los errores a la vez y no solo el primero.
 */
import { ErrorChispa } from '../errores/ErrorChispa';
import { PALABRAS_CLAVE, SIMBOLOS_DOBLES, SIMBOLOS_SIMPLES, type Token } from './tokens';
import { normalizar } from '../../utilidades/texto';

const ESPACIOS_POR_TABULADOR = 4;
/** Comillas aceptadas: las normales y las "tipográficas" que ponen Word o el móvil. */
const COMILLAS_CIERRE: Record<string, string> = { '"': '"', "'": "'", '“': '”', '«': '»', '‘': '’' };
const CIERRE_DE: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

/**
 * @param errores Si se pasa una lista, los errores se apuntan en ella y se
 *                sigue analizando. Si no, se lanza el primero.
 */
export function analizarLexico(codigo: string, errores?: ErrorChispa[]): Token[] {
  const tokens: Token[] = [];
  const pilaSangria = [0];
  /** Paréntesis, corchetes y llaves abiertos (con su posición, para avisar si alguno no se cierra). */
  const abiertos: { simbolo: string; linea: number; columna: number }[] = [];
  const lineas = codigo.replace(/\r\n?/g, '\n').split('\n');

  const agregar = (tipo: Token['tipo'], valor: string, linea: number, columna: number, original = valor, numero?: number) =>
    tokens.push({ tipo, valor, original, linea, columna, numero });
  /** Error en la columna `col` (índice que empieza en 0) de la línea `linea`. */
  const error = (linea: number, col: number, longitud: number, mensaje: string, pista?: string): never => {
    throw new ErrorChispa({ linea, columna: col + 1, longitud }, mensaje, pista);
  };
  /** Un error que no impide seguir analizando la línea (la sangría rara se "redondea" al nivel anterior). */
  const errorSinParar = (linea: number, col: number, longitud: number, mensaje: string, pista?: string) => {
    const e = new ErrorChispa({ linea, columna: col + 1, longitud }, mensaje, pista);
    if (!errores) throw e;
    errores.push(e);
  };

  for (let i = 0; i < lineas.length; i++) {
    const texto = lineas[i];
    const nLinea = i + 1;
    try {
      analizarLinea(texto, nLinea);
    } catch (e) {
      if (!(e instanceof ErrorChispa) || !errores) throw e;
      errores.push(e);
      // Recuperación: olvidamos lo que se abrió en esta línea y la cerramos.
      while (abiertos.length && abiertos[abiertos.length - 1].linea === nLinea) abiertos.pop();
      if (abiertos.length === 0 && tokens.length && tokens[tokens.length - 1].tipo !== 'nuevaLinea') agregar('nuevaLinea', '', nLinea, texto.length + 1);
    }
  }

  function analizarLinea(texto: string, nLinea: number): void {
    let col = 0;

    // ── 1. Sangría (solo si no estamos dentro de un paréntesis) ──
    if (abiertos.length === 0) {
      let ancho = 0;
      while (col < texto.length && (texto[col] === ' ' || texto[col] === '\t')) {
        ancho += texto[col] === '\t' ? ESPACIOS_POR_TABULADOR : 1;
        col++;
      }
      const resto = texto.slice(col);
      if (resto === '' || resto.startsWith('#')) return; // línea vacía o comentario: no cuenta

      const actual = pilaSangria[pilaSangria.length - 1];
      if (ancho > actual) {
        pilaSangria.push(ancho);
        agregar('indentar', '', nLinea, 1);
      } else if (ancho < actual) {
        while (ancho < pilaSangria[pilaSangria.length - 1]) {
          pilaSangria.pop();
          agregar('desindentar', '', nLinea, 1);
        }
        if (ancho !== pilaSangria[pilaSangria.length - 1]) {
          errorSinParar(
            nLinea,
            0,
            Math.max(1, col),
            'la sangría (los espacios del principio) de esta línea no coincide con la de ninguna línea anterior.',
            'Las líneas de un mismo bloque deben empezar exactamente en la misma columna. Usa siempre 4 espacios por nivel.',
          );
        }
      }
    }

    // ── 2. Tokens de la línea ──
    while (col < texto.length) {
      const c = texto[col];

      if (c === ' ' || c === '\t') {
        col++;
        continue;
      }
      if (c === '#') break; // comentario hasta el final de la línea

      // Números: 12, 3.5
      if (/[0-9]/.test(c)) {
        let fin = col;
        while (fin < texto.length && /[0-9]/.test(texto[fin])) fin++;
        if (texto[fin] === '.' && /[0-9]/.test(texto[fin + 1] ?? '')) {
          fin++;
          while (fin < texto.length && /[0-9]/.test(texto[fin])) fin++;
        }
        const t = texto.slice(col, fin);
        agregar('numero', t, nLinea, col + 1, t, parseFloat(t));
        col = fin;
        continue;
      }

      // Textos entre comillas
      if (c in COMILLAS_CIERRE) {
        const cierre = COMILLAS_CIERRE[c];
        let valor = '';
        let j = col + 1;
        let cerrado = false;
        while (j < texto.length) {
          const d = texto[j];
          if (d === '\\' && j + 1 < texto.length) {
            const sig = texto[j + 1];
            valor += sig === 'n' ? '\n' : sig === 't' ? '\t' : sig;
            j += 2;
            continue;
          }
          if (d === cierre || (c === '“' && d === '"')) {
            cerrado = true;
            break;
          }
          valor += d;
          j++;
        }
        if (!cerrado) {
          error(
            nLinea,
            col,
            texto.length - col,
            'hay un texto que empieza con comillas pero nunca se cierra.',
            `Añade ${cierre} al final del texto. Por ejemplo: mostrar("Hola")`,
          );
        }
        agregar('texto', valor, nLinea, col + 1, texto.slice(col, j + 1));
        col = j + 1;
        continue;
      }

      // Palabras: identificadores y palabras clave (acepta ñ, tildes, ü...)
      if (/[\p{L}_]/u.test(c)) {
        let fin = col;
        while (fin < texto.length && /[\p{L}\p{N}_]/u.test(texto[fin])) fin++;
        const original = texto.slice(col, fin);
        const valor = normalizar(original); // "Función" → "funcion"
        agregar(PALABRAS_CLAVE.has(valor) ? 'palabraClave' : 'identificador', valor, nLinea, col + 1, original);
        col = fin;
        continue;
      }

      // Símbolos de dos caracteres: ==, <=, +=...
      const dos = texto.slice(col, col + 2);
      if (SIMBOLOS_DOBLES.includes(dos)) {
        agregar('simbolo', dos, nLinea, col + 1);
        col += 2;
        continue;
      }

      // Símbolos de un carácter
      if (SIMBOLOS_SIMPLES.includes(c)) {
        if (c in CIERRE_DE) abiertos.push({ simbolo: c, linea: nLinea, columna: col });
        if (c === ')' || c === ']' || c === '}') {
          const ultimo = abiertos.pop();
          if (!ultimo || CIERRE_DE[ultimo.simbolo] !== c) {
            error(
              nLinea,
              col,
              1,
              `hay un '${c}' que cierra algo que no se había abierto.`,
              ultimo
                ? `Antes se abrió un '${ultimo.simbolo}' en la línea ${ultimo.linea}; ciérralo con '${CIERRE_DE[ultimo.simbolo]}'.`
                : `Borra este '${c}' o añade el símbolo de apertura que le falta.`,
            );
          }
        }
        agregar('simbolo', c, nLinea, col + 1);
        col++;
        continue;
      }

      // Cualquier otra cosa: error amable
      error(nLinea, col, 1, `no entiendo el símbolo '${c}'.`, pistaSimbolo(c, texto.slice(col, col + 2)));
    }

    if (abiertos.length === 0) agregar('nuevaLinea', '', nLinea, texto.length + 1);
  }

  if (abiertos.length > 0) {
    const a = abiertos[abiertos.length - 1];
    const e = new ErrorChispa({ linea: a.linea, columna: a.columna + 1, longitud: 1 }, `abriste un '${a.simbolo}' que nunca se cierra.`, `Añade '${CIERRE_DE[a.simbolo]}' donde termine.`);
    if (!errores) throw e;
    errores.push(e);
    abiertos.length = 0;
    agregar('nuevaLinea', '', a.linea, 1);
  }

  const ultima = lineas.length;
  if (tokens.length && tokens[tokens.length - 1].tipo !== 'nuevaLinea') agregar('nuevaLinea', '', ultima, 1);
  while (pilaSangria.length > 1) {
    pilaSangria.pop();
    agregar('desindentar', '', ultima, 1);
  }
  agregar('fin', '', ultima, 1);
  return tokens;
}

function pistaSimbolo(c: string, dos: string): string {
  if (dos === '&&') return "Para decir 'y' en una condición escribe la palabra y. Ejemplo: si vida > 0 y puntos > 10:";
  if (dos === '||') return "Para decir 'o' en una condición escribe la palabra o. Ejemplo: si x < 0 o x > 100:";
  if (c === '¿' || c === '¡' || c === '?' || c === '!')
    return `Los signos como '${c}' solo pueden ir dentro de un texto entre comillas, por ejemplo: mostrar("¡Hola!"). Para "distinto de" usa !=`;
  if (c === ';') return 'En Chispa no hace falta poner ; al final de las líneas. Bórralo.';
  if (c === '&' || c === '|') return "Para combinar condiciones usa las palabras 'y' / 'o'. Ejemplo: si vida > 0 y puntos > 10:";
  if (c === '^') return 'Chispa no tiene el símbolo ^. Para multiplicar un número por sí mismo usa *, por ejemplo: x * x';
  return 'Revisa si se ha colado un carácter raro o si falta poner comillas a un texto.';
}
