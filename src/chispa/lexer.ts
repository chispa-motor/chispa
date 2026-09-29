/**
 * LEXER (analizador léxico): texto → lista de tokens.
 *
 * Lo más interesante es la SANGRÍA (indentación), como en Python.
 * Guardamos una pila con los niveles de sangría abiertos, por ejemplo [0, 4]:
 *   - Si una línea tiene más espacios que el último nivel → token INDENTAR
 *   - Si tiene menos → uno o varios DESINDENTAR (cerramos bloques)
 *   - Si no coincide con ningún nivel anterior → error amable
 * Dentro de paréntesis o corchetes ignoramos los saltos de línea, para
 * poder escribir listas largas en varias líneas.
 */
import { ErrorChispa } from './errores';
import { PALABRAS_CLAVE, SIMBOLOS_DOBLES, SIMBOLOS_SIMPLES, type Token } from './tokens';
import { normalizar } from '../utilidades/texto';

const ESPACIOS_POR_TABULADOR = 4;
/** Comillas aceptadas: normales y las "tipográficas" que ponen Word o el móvil. */
const COMILLAS_CIERRE: Record<string, string> = { '"': '"', "'": "'", '“': '”', '«': '»', '‘': '’' };

export function analizarLexico(codigo: string): Token[] {
  const tokens: Token[] = [];
  const pilaSangria = [0];
  /** Paréntesis y corchetes abiertos (con su línea, para avisar si alguno no se cierra). */
  const abiertos: { simbolo: string; linea: number }[] = [];
  const lineas = codigo.replace(/\r\n?/g, '\n').split('\n');

  const agregar = (tipo: Token['tipo'], valor: string, linea: number, original = valor, numero?: number) =>
    tokens.push({ tipo, valor, original, linea, numero });

  for (let i = 0; i < lineas.length; i++) {
    const texto = lineas[i];
    const nLinea = i + 1;
    let col = 0;

    // ── 1. Sangría (solo si no estamos dentro de un paréntesis) ──
    if (abiertos.length === 0) {
      let ancho = 0;
      while (col < texto.length && (texto[col] === ' ' || texto[col] === '\t')) {
        ancho += texto[col] === '\t' ? ESPACIOS_POR_TABULADOR : 1;
        col++;
      }
      const resto = texto.slice(col);
      if (resto === '' || resto.startsWith('#')) continue; // línea vacía o comentario: no cuenta

      const actual = pilaSangria[pilaSangria.length - 1];
      if (ancho > actual) {
        pilaSangria.push(ancho);
        agregar('indentar', '', nLinea);
      } else if (ancho < actual) {
        while (ancho < pilaSangria[pilaSangria.length - 1]) {
          pilaSangria.pop();
          agregar('desindentar', '', nLinea);
        }
        if (ancho !== pilaSangria[pilaSangria.length - 1]) {
          throw new ErrorChispa(
            nLinea,
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
        agregar('numero', t, nLinea, t, parseFloat(t));
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
          throw new ErrorChispa(
            nLinea,
            'hay un texto que empieza con comillas pero nunca se cierra.',
            `Añade ${cierre} al final del texto. Por ejemplo: mostrar "Hola"`,
          );
        }
        agregar('texto', valor, nLinea, texto.slice(col, j + 1));
        col = j + 1;
        continue;
      }

      // Palabras: identificadores y palabras clave (acepta ñ, tildes, ü...)
      if (/[\p{L}_]/u.test(c)) {
        let fin = col;
        while (fin < texto.length && /[\p{L}\p{N}_]/u.test(texto[fin])) fin++;
        const original = texto.slice(col, fin);
        const valor = normalizar(original); // "Función" → "funcion"
        agregar(PALABRAS_CLAVE.has(valor) ? 'palabraClave' : 'identificador', valor, nLinea, original);
        col = fin;
        continue;
      }

      // Símbolos de dos caracteres: ==, <=, +=...
      const dos = texto.slice(col, col + 2);
      if (SIMBOLOS_DOBLES.includes(dos)) {
        agregar('simbolo', dos, nLinea);
        col += 2;
        continue;
      }

      // Símbolos de un carácter
      if (SIMBOLOS_SIMPLES.includes(c)) {
        if (c === '(' || c === '[') abiertos.push({ simbolo: c, linea: nLinea });
        if (c === ')' || c === ']') {
          const esperado = c === ')' ? '(' : '[';
          const ultimo = abiertos.pop();
          if (!ultimo || ultimo.simbolo !== esperado) {
            throw new ErrorChispa(
              nLinea,
              `hay un '${c}' que cierra algo que no se había abierto.`,
              ultimo
                ? `Antes se abrió un '${ultimo.simbolo}' en la línea ${ultimo.linea}; ciérralo con '${ultimo.simbolo === '(' ? ')' : ']'}'.`
                : `Borra este '${c}' o añade el '${esperado}' que le falta.`,
            );
          }
        }
        agregar('simbolo', c, nLinea);
        col++;
        continue;
      }

      // Cualquier otra cosa: error amable
      throw new ErrorChispa(nLinea, `no entiendo el símbolo '${c}'.`, pistaSimbolo(c));
    }

    if (abiertos.length === 0) agregar('nuevaLinea', '', nLinea);
  }

  if (abiertos.length > 0) {
    const a = abiertos[abiertos.length - 1];
    throw new ErrorChispa(
      a.linea,
      `abriste un '${a.simbolo}' que nunca se cierra.`,
      `Añade '${a.simbolo === '(' ? ')' : ']'}' donde termine.`,
    );
  }

  const ultima = lineas.length;
  if (tokens.length && tokens[tokens.length - 1].tipo !== 'nuevaLinea') agregar('nuevaLinea', '', ultima);
  while (pilaSangria.length > 1) {
    pilaSangria.pop();
    agregar('desindentar', '', ultima);
  }
  agregar('fin', '', ultima);
  return tokens;
}

function pistaSimbolo(c: string): string {
  if (c === '¿' || c === '¡' || c === '?' || c === '!')
    return `Los signos como '${c}' solo pueden ir dentro de un texto entre comillas, por ejemplo: mostrar "¡Hola!". Para "distinto de" usa !=`;
  if (c === ';') return 'En Chispa no hace falta poner ; al final de las líneas. Bórralo.';
  if (c === '{' || c === '}')
    return 'Chispa no usa llaves { }. Los bloques se marcan con ":" al final de la línea y sangría (4 espacios) en las de dentro.';
  if (c === '&' || c === '|') return "Para combinar condiciones usa las palabras 'y' / 'o'. Ejemplo: si vida > 0 y puntos > 10:";
  return 'Revisa si se ha colado un carácter raro o si falta poner comillas a un texto.';
}
