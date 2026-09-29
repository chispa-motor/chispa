/**
 * Tokens: las "palabras" del lenguaje.
 *
 * El LEXER lee el texto letra a letra y lo corta en tokens:
 *     si vida <= 0:
 *   → [si] [vida] [<=] [0] [:] [NUEVA_LINEA]
 * Así el PARSER ya no tiene que preocuparse de espacios, comentarios ni tildes.
 */
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
  numero?: number;
}

/**
 * Palabras reservadas (ya sin tildes: "función" se guarda como "funcion").
 *
 * DECISIÓN: palabras como "cada", "veces", "empieza" o "toco" NO son
 * reservadas. Solo tienen significado especial en su sitio (después de
 * "cuando", "repetir"...). Así puedes seguir llamando "veces" a una variable.
 */
export const PALABRAS_CLAVE = new Set([
  'si',
  'sino',
  'mientras',
  'repetir',
  'para',
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
  'salir',
]);

/** Explicación de cada palabra reservada (para los errores tipo "no puedes llamar 'y' a una variable"). */
export const SIGNIFICADO_PALABRA: Record<string, string> = {
  y: "'y' lógico: esto y aquello",
  o: "'o' lógico: esto o aquello",
  no: "'no' lógico: lo contrario",
  en: "se usa en 'para cada x en lista'",
  si: 'sirve para las condiciones',
  sino: "va después de un 'si'",
  para: "se usa en 'para cada'",
};

export const SIMBOLOS_DOBLES = ['==', '!=', '<=', '>=', '+=', '-=', '*=', '/='];
export const SIMBOLOS_SIMPLES = '+-*/%()[],.:=<>';
