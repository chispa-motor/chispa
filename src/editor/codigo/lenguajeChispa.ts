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
import { EditorView } from '@codemirror/view';
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
  /** Dentro de un texto: la comilla que lo cierra (o null si no estamos en un texto). */
  enTexto: string | null;
  /** Dentro de un hueco {…} de un texto: ahí va código normal. */
  enHueco: boolean;
}

/** Sigue leyendo un texto hasta que se cierra o hasta un hueco "{". */
function seguirTexto(stream: Parameters<StreamParser<Estado>['token']>[0], estado: Estado): string {
  let escapado = false;
  while (!stream.eol()) {
    const ch = stream.peek()!;
    if (!escapado && ch === '{' && stream.string[stream.pos + 1] !== '{') {
      if (stream.current().length === 0) {
        stream.next();
        estado.enHueco = true;
        return 'special';
      }
      return 'string'; // primero el trozo de texto; el "{" en la siguiente llamada
    }
    stream.next();
    if (!escapado && ch === '{') stream.next(); // "{{" es una llave escrita
    if (!escapado && (ch === estado.enTexto || (estado.enTexto === '”' && ch === '"'))) {
      estado.enTexto = null;
      return 'string';
    }
    escapado = !escapado && ch === '\\';
  }
  estado.enTexto = null; // un texto no sigue en la línea de abajo
  return 'string';
}

export const parserChispa: StreamParser<Estado> = {
  name: 'chispa',
  startState: () => ({ lineaEspecial: false, trasPunto: false, enTexto: null, enHueco: false }),
  copyState: (e) => ({ ...e }),
  token(stream, estado) {
    if (stream.sol()) {
      estado.lineaEspecial = false;
      estado.enTexto = null;
      estado.enHueco = false;
    }
    // Dentro de un texto (fuera de los huecos)
    if (estado.enTexto && !estado.enHueco) return seguirTexto(stream, estado);
    // Fin de un hueco: se vuelve al texto
    if (estado.enHueco && stream.peek() === '}') {
      stream.next();
      estado.enHueco = false;
      return 'special';
    }
    if (stream.eatSpace()) return null;

    // Comentario hasta el final de la línea
    if (stream.peek() === '#') {
      stream.skipToEnd();
      return 'comment';
    }
    // Textos: "..." '...' “...”
    const c = stream.peek()!;
    if (!estado.enHueco && (c === '"' || c === "'" || c === '“' || c === '«')) {
      stream.next();
      estado.enTexto = c === '“' ? '”' : c === '«' ? '»' : c;
      estado.trasPunto = false;
      return seguirTexto(stream, estado);
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
    // Al escribir «sino» o «cuando », la línea se coloca sola a su altura
    indentOnInput: /^\s*(sino|cuando\s)$/,
  },
};

export const lenguajeChispa = StreamLanguage.define(parserChispa);

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
  // "cuando" siempre va al principio de la línea (los eventos no se meten dentro de nada)
  if (/^\s*cuando\b/.test(actual.text)) return 0;
  return Math.max(0, sangria);
});

/**
 * Quien copia código de un ejemplo escribe también los espacios del principio.
 * Si justo después de Intro (con la sangría ya puesta sola) lo primero que se
 * escribe es un espacio, se quita la sangría automática: cuentan los espacios
 * que escribe la persona. Así no salen 8 espacios donde tocaban 4.
 */
const lineaConSangriaAutomatica = new WeakMap<EditorView, number>();
export const sangriaEscritaAMano = [
  EditorView.updateListener.of((u) => {
    if (!u.docChanged) return;
    let intro = false;
    for (const tr of u.transactions) tr.changes.iterChanges((_a, _b, _c, _d, texto) => {
      if (tr.isUserEvent('input') && texto.toString().includes('\n')) intro = true;
    });
    const linea = u.state.doc.lineAt(u.state.selection.main.head);
    if (intro && /^\s+$/.test(linea.text)) lineaConSangriaAutomatica.set(u.view, linea.number);
    else if (!intro) lineaConSangriaAutomatica.delete(u.view);
  }),
  EditorView.inputHandler.of((vista, desde, hasta, texto) => {
    if (texto !== ' ' || desde !== hasta) return false;
    const linea = vista.state.doc.lineAt(desde);
    if (lineaConSangriaAutomatica.get(vista) !== linea.number || !/^\s+$/.test(linea.text) || desde !== linea.to) return false;
    lineaConSangriaAutomatica.delete(vista);
    vista.dispatch({ changes: { from: linea.from, to: linea.to, insert: ' ' }, selection: { anchor: linea.from + 1 }, userEvent: 'input.type' });
    return true;
  }),
];
