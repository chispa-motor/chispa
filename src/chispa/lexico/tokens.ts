/**
 * ════════════════════════════════════════════════════════════════════
 *  ETAPA 1 de 3 · LÉXICO — Los tokens: las "palabras" del lenguaje
 * ════════════════════════════════════════════════════════════════════
 *
 * El lexer (lexer.ts) lee el texto letra a letra y lo corta en TOKENS:
 *
 *     si vida <= 0:
 *   → [si] [vida] [<=] [0] [:] [NUEVA_LINEA]
 *
 * Así las etapas siguientes ya no tienen que preocuparse de espacios,
 * comentarios, tildes ni mayúsculas.
 *
 * Cada token recuerda DÓNDE estaba (línea y columna). Esa información viaja
 * hasta el árbol y hasta los errores, para poder decir "línea 8, columna 5"
 * y subrayar el trozo exacto.
 */

/** Un sitio en el código fuente. */
export interface Posicion {
  /** Empieza en 1. */
  linea: number;
  /** Empieza en 1. */
  columna: number;
  /** Cuántos caracteres ocupa (para subrayar). */
  longitud: number;
}

export type TipoToken =
  | 'numero'
  | 'texto'
  | 'identificador'
  | 'palabraClave'
  | 'simbolo'
  | 'nuevaLinea'
  | 'indentar' // la línea empieza con MÁS sangría que la anterior → empieza un bloque
  | 'desindentar' // MENOS sangría → termina un bloque
  | 'fin';

export interface Token {
  tipo: TipoToken;
  /** Valor normalizado: en minúsculas y sin tildes para identificadores y palabras clave. */
  valor: string;
  /** Tal como lo escribió la persona (para los mensajes de error). */
  original: string;
  linea: number;
  columna: number;
  numero?: number;
}

/** Posición de un token (para crear nodos y errores). */
export function posicionDe(t: Token): Posicion {
  return { linea: t.linea, columna: t.columna, longitud: Math.max(1, t.original.length) };
}

/**
 * Palabras reservadas (ya sin tildes: "función" se guarda como "funcion").
 * Coinciden con la sección 1 de ESPECIFICACION_CHISPA.md.
 *
 * Palabras como "veces", "empieza", "toco" o "fotograma" NO son reservadas:
 * solo significan algo especial en su sitio (después de "cuando" o "repetir"),
 * así que se pueden seguir usando como nombres de variables.
 */
export const PALABRAS_CLAVE = new Set([
  'si',
  'sino',
  'mientras',
  'repetir',
  'para',
  'cada',
  'en',
  'funcion',
  'devolver',
  'variable',
  'verdadero',
  'falso',
  'nulo',
  'y',
  'o',
  'no',
  'cuando',
  'mostrar',
  'romper',
  'continuar',
]);

/** Explicación corta de cada palabra reservada (para "no puedes llamar 'y' a una variable"). */
export const SIGNIFICADO_PALABRA: Record<string, string> = {
  y: "'y' lógico: esto y aquello",
  o: "'o' lógico: esto o aquello",
  no: "'no' lógico: lo contrario",
  en: "sirve para 'para cada x en lista' y para comprobar si algo está dentro de otra cosa",
  si: 'sirve para las condiciones',
  sino: "va después de un 'si'",
  para: "se usa en 'para cada'",
  cada: "se usa en 'para cada' y en 'cuando cada fotograma'",
  mostrar: 'es la función que escribe en la consola',
};

export const SIMBOLOS_DOBLES = ['==', '!=', '<=', '>=', '+=', '-=', '*=', '/='];
export const SIMBOLOS_SIMPLES = '+-*/%()[]{},.:=<>';
