/**
 * AST (Árbol de Sintaxis Abstracta): el programa convertido en una
 * estructura que el intérprete puede recorrer.
 *
 *     yo.vida = yo.vida - 10
 * se convierte en:
 *     Asignacion
 *     ├── objetivo: Miembro(yo, "vida")
 *     └── valor:    Binaria("-", Miembro(yo, "vida"), Numero(10))
 *
 * Cada nodo guarda su `linea` para los mensajes de error.
 * Los nombres se guardan normalizados (sin tildes, minúsculas) y también
 * `original`, tal como los escribió la persona, para los mensajes.
 */

// ───────────────────────── Expresiones (cosas que dan un valor) ─────────────────────────

export type Expresion =
  | { tipo: 'Numero'; valor: number; linea: number }
  | { tipo: 'Texto'; valor: string; linea: number }
  | { tipo: 'Logico'; valor: boolean; linea: number }
  | { tipo: 'Nulo'; linea: number }
  | { tipo: 'Identificador'; nombre: string; original: string; linea: number }
  | { tipo: 'Lista'; elementos: Expresion[]; linea: number }
  | { tipo: 'Binaria'; operador: string; izquierda: Expresion; derecha: Expresion; linea: number }
  | { tipo: 'Logica'; operador: 'y' | 'o'; izquierda: Expresion; derecha: Expresion; linea: number }
  | { tipo: 'Unaria'; operador: '-' | 'no'; operando: Expresion; linea: number }
  | { tipo: 'Llamada'; funcion: Expresion; argumentos: Expresion[]; linea: number }
  | { tipo: 'Miembro'; objeto: Expresion; propiedad: string; original: string; linea: number }
  | { tipo: 'Indice'; objeto: Expresion; indice: Expresion; linea: number };

// ───────────────────────── Eventos (lo que va después de "cuando") ─────────────────────────

export type Evento =
  | { tipo: 'empieza' }
  | { tipo: 'fotograma' }
  | { tipo: 'intervalo'; segundos: Expresion }
  | { tipo: 'tecla'; modo: 'pulsa' | 'mantiene' | 'suelta'; teclas: Expresion[] }
  /** con = null → cualquier objeto. dejar = verdadero → "cuando dejo de tocar" */
  | { tipo: 'toco'; con: string | null; original: string | null; dejar: boolean }
  | { tipo: 'clic' };

// ───────────────────────── Sentencias (órdenes) ─────────────────────────

export type Bloque = Sentencia[];

export interface SentenciaFuncion {
  tipo: 'Funcion';
  nombre: string;
  original: string;
  parametros: { nombre: string; original: string }[];
  cuerpo: Bloque;
  linea: number;
}

export type Sentencia =
  | { tipo: 'Variable'; nombre: string; original: string; valor: Expresion; linea: number }
  | { tipo: 'Asignacion'; objetivo: Expresion; operador: string; valor: Expresion; linea: number }
  | { tipo: 'Si'; ramas: { condicion: Expresion; cuerpo: Bloque }[]; sino: Bloque | null; linea: number }
  | { tipo: 'Mientras'; condicion: Expresion; cuerpo: Bloque; linea: number }
  | { tipo: 'Repetir'; veces: Expresion; cuerpo: Bloque; linea: number }
  | { tipo: 'ParaCada'; variable: string; original: string; lista: Expresion; cuerpo: Bloque; linea: number }
  | SentenciaFuncion
  | { tipo: 'Devolver'; valor: Expresion | null; linea: number }
  | { tipo: 'Salir'; linea: number }
  | { tipo: 'Mostrar'; valores: Expresion[]; linea: number }
  | { tipo: 'Cuando'; evento: Evento; cuerpo: Bloque; linea: number }
  | { tipo: 'ExpresionSuelta'; expresion: Expresion; linea: number };

export interface Programa {
  sentencias: Bloque;
  archivo: string;
  /** Las líneas del código fuente, para enseñarlas en los errores. */
  lineas: string[];
}
