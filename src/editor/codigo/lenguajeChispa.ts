/**
 * COLOREADO DE CHISPA en el editor de código.
 *
 * CodeMirror necesita saber qué es cada trozo del texto para darle un color.
 * Usamos un "StreamLanguage": una función que va leyendo el texto trozo a
 * trozo (como nuestro lexer) y dice "esto es una palabra clave", "esto es un
 * texto", "esto es un número"...
 *
 * Colores:
 *   palabras clave (si, mientras...)       → morado
 *   eventos (cuando empieza...)            → morado también
 *   funciones y módulos de la API          → azul
 *   yo, otro, casilla, juego, delta        → naranja
 *   verdadero, falso, nulo                 → naranja
 *   textos → verde · números → amarillo · comentarios → gris
 */
import { StreamLanguage, HighlightStyle, syntaxHighlighting, indentService, type StreamParser } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { PALABRAS_CLAVE } from '../../chispa/lexico/tokens';
import { DOC_FUNCIONES, DOC_MODULOS } from '../../chispa/api/documentacion';
import { normalizar } from '../../utilidades/texto';

const VALORES = new Set(['verdadero', 'falso', 'nulo']);
const ESPECIALES = new Set(['yo', 'otro', 'casilla', 'juego', 'delta']);
const GLOBALES = new Set([...DOC_FUNCIONES.map((d) => normalizar(d.nombre)), ...DOC_MODULOS.map((m) => normalizar(m.nombre))]);
/** Palabras que solo son especiales después de "cuando" o en "repetir N veces". */
const PALABRAS_DE_EVENTO = new Set(['empieza', 'fotograma', 'segundos', 'segundo', 'se', 'pulsa', 'mantiene', 'suelta', 'toco', 'dejo', 'de', 'tocar', 'hago', 'clic', 'encima', 'pasen', 'termina', 'la', 'animacion', 'veces']);

interface Estado {
  /** ¿Estamos en una línea que empieza por "cuando" o "repetir"? */
  lineaEspecial: boolean;
  /** ¿El token anterior era un punto? (entonces esto es una propiedad) */
  trasPunto: boolean;
}

const parser: StreamParser<Estado> = {
  name: 'chispa',
  startState: () => ({ lineaEspecial: false, trasPunto: false }),
  token(stream, estado) {
    if (stream.sol()) estado.lineaEspecial = false;
    if (stream.eatSpace()) return null;

    // Comentario hasta el final de la línea
    if (stream.peek() === '#') {
      stream.skipToEnd();
      return 'comment';
    }
    // Textos: "..." '...' “...”
    const c = stream.peek()!;
    if (c === '"' || c === "'" || c === '“' || c === '«') {
      const cierre = c === '“' ? '”' : c === '«' ? '»' : c;
      stream.next();
      let escapado = false;
      let ch: string | void;
      while ((ch = stream.next()) !== undefined) {
        if (!escapado && (ch === cierre || (c === '“' && ch === '"'))) break;
        escapado = !escapado && ch === '\\';
      }
      estado.trasPunto = false;
      return 'string';
    }
    if (stream.match(/^[0-9]+(\.[0-9]+)?/)) {
      estado.trasPunto = false;
      return 'number';
    }
    if (stream.match(/^[\p{L}_][\p{L}\p{N}_]*/u)) {
      const palabra = normalizar(stream.current());
      const trasPunto = estado.trasPunto;
      estado.trasPunto = false;
      if (trasPunto) return 'propertyName';
      if (palabra === 'cuando' || palabra === 'repetir') estado.lineaEspecial = true;
      if (VALORES.has(palabra)) return 'atom';
      if (PALABRAS_CLAVE.has(palabra)) return palabra === 'mostrar' ? 'function' : 'keyword';
      if (estado.lineaEspecial && PALABRAS_DE_EVENTO.has(palabra)) return 'keyword';
      if (ESPECIALES.has(palabra)) return 'special';
      if (GLOBALES.has(palabra)) return 'function';
      return 'variableName';
    }
    if (stream.eat('.')) {
      estado.trasPunto = true;
      return 'punctuation';
    }
    if (stream.match(/^(==|!=|<=|>=|\+=|-=|\*=|\/=|[+\-*/%<>=])/)) {
      estado.trasPunto = false;
      return 'operator';
    }
    stream.next();
    estado.trasPunto = false;
    return 'punctuation';
  },
  tokenTable: {
    special: t.special(t.variableName),
    function: t.function(t.variableName),
  },
  languageData: {
    commentTokens: { line: '#' },
    closeBrackets: { brackets: ['(', '[', '{', '"', "'"] },
    indentOnInput: /^\s*(sino)$/,
  },
};

export const lenguajeChispa = StreamLanguage.define(parser);

/** Colores (tema oscuro). */
export const coloresChispa = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: '#c792ea', fontWeight: '600' },
    { tag: t.function(t.variableName), color: '#82aaff' },
    { tag: t.special(t.variableName), color: '#ffcb6b' },
    { tag: t.atom, color: '#f78c6c' },
    { tag: t.string, color: '#c3e88d' },
    { tag: t.number, color: '#f9e27d' },
    { tag: t.comment, color: '#6b7489', fontStyle: 'italic' },
    { tag: t.propertyName, color: '#89ddff' },
    { tag: t.operator, color: '#89ddff' },
    { tag: t.variableName, color: '#e6e9f0' },
    { tag: t.punctuation, color: '#9aa3b5' },
  ]),
);

/**
 * Sangría automática: al pulsar Intro después de una línea que termina en ':'
 * (si, mientras, cuando...), la línea nueva empieza con 4 espacios más.
 */
export const sangriaChispa = indentService.of((contexto, posicion) => {
  // La línea que se va a sangrar (al pulsar Intro, la parte que queda DESPUÉS del salto)
  const actual = contexto.lineAt(posicion, 1);
  if (actual.from === 0) return 0;
  // La línea de arriba (al pulsar Intro, la parte que queda ANTES del salto)
  const texto = contexto.lineAt(actual.from - 1, -1).text;
  const base = texto.match(/^\s*/)![0].replace(/\t/g, '    ').length;
  const sinComentario = texto.replace(/\s+#.*$/, '').trimEnd();
  let sangria = base;
  if (sinComentario.endsWith(':')) sangria = base + 4;
  // Después de devolver/romper/continuar, normalmente se sale del bloque
  else if (/^\s*(devolver|romper|continuar)\b/.test(texto)) sangria = base - 4;
  // "sino" va a la altura de su "si"
  if (/^\s*sino\b/.test(actual.text) && !sinComentario.endsWith(':')) sangria = base - 4;
  return Math.max(0, sangria);
});
