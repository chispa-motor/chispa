/**
 * ════════════════════════════════════════════════════════════════════
 *  ETAPA 2 de 3 · SINTAXIS — El AST (Árbol de Sintaxis Abstracta)
 * ════════════════════════════════════════════════════════════════════
 *
 * Es el programa convertido en una estructura que el intérprete puede
 * recorrer. Por ejemplo:
 *
 *     yo.vida = yo.vida - 10
 *
 * se convierte en:
 *
 *     Asignacion
 *     ├── objetivo: Miembro(yo, "vida")
 *     └── valor:    Binaria("-", Miembro(yo, "vida"), Numero(10))
 *
 * Cada nodo guarda `pos` (línea, columna y longitud) para los errores.
 * Los nombres se guardan normalizados (sin tildes, en minúsculas) en
 * `nombre`, y tal como los escribió la persona en `original`.
 */
import type { Posicion } from '../lexico/tokens';

// ───────────────────────── Expresiones (cosas que dan un valor) ─────────────────────────

export interface EntradaTabla {
  clave: string;
  original: string;
  valor: Expresion;
  pos: Posicion;
}

export type Expresion =
  | { tipo: 'Numero'; valor: number; pos: Posicion }
  | { tipo: 'Texto'; valor: string; pos: Posicion }
  | { tipo: 'Logico'; valor: boolean; pos: Posicion }
  | { tipo: 'Nulo'; pos: Posicion }
  | { tipo: 'Identificador'; nombre: string; original: string; pos: Posicion }
  | { tipo: 'Lista'; elementos: Expresion[]; pos: Posicion }
  | { tipo: 'Tabla'; entradas: EntradaTabla[]; pos: Posicion }
  /** + - * / % == != < > <= >= en */
  | { tipo: 'Binaria'; operador: string; izquierda: Expresion; derecha: Expresion; pos: Posicion }
  | { tipo: 'Logica'; operador: 'y' | 'o'; izquierda: Expresion; derecha: Expresion; pos: Posicion }
  | { tipo: 'Unaria'; operador: '-' | 'no'; operando: Expresion; pos: Posicion }
  | { tipo: 'Llamada'; funcion: Expresion; argumentos: Expresion[]; pos: Posicion }
  | { tipo: 'Miembro'; objeto: Expresion; propiedad: string; original: string; pos: Posicion }
  | { tipo: 'Indice'; objeto: Expresion; indice: Expresion; pos: Posicion };

// ───────────────────────── Eventos (lo que va después de "cuando") ─────────────────────────

export type Evento =
  | { tipo: 'empieza' }
  | { tipo: 'fotograma' }
  | { tipo: 'intervalo'; segundos: Expresion }
  /** "cuando pasen 3 segundos:" → una sola vez, a los 3 segundos de aparecer el objeto */
  | { tipo: 'pasen'; segundos: Expresion }
  | { tipo: 'tecla'; modo: 'pulsa' | 'mantiene' | 'suelta'; teclas: Expresion[] }
  /** con = null → cualquier objeto. dejar = verdadero → "cuando dejo de tocar" */
  | { tipo: 'toco'; con: string | null; original: string | null; dejar: boolean }
  /** encima = verdadero → "cuando hago clic encima:" (solo si el clic es sobre este objeto) */
  | { tipo: 'clic'; encima: boolean }
  /** "cuando termina la animacion:" (solo las que no se repiten) */
  | { tipo: 'animacion' };

// ───────────────────────── Sentencias (órdenes) ─────────────────────────

export type Bloque = Sentencia[];

export interface Nombre {
  nombre: string;
  original: string;
  pos: Posicion;
}

export interface SentenciaFuncion {
  tipo: 'Funcion';
  nombre: string;
  original: string;
  parametros: Nombre[];
  cuerpo: Bloque;
  pos: Posicion;
}

export type Sentencia =
  | { tipo: 'Variable'; nombre: string; original: string; valor: Expresion; pos: Posicion; posNombre: Posicion }
  | { tipo: 'Asignacion'; objetivo: Expresion; operador: string; valor: Expresion; pos: Posicion }
  | { tipo: 'Si'; ramas: { condicion: Expresion; cuerpo: Bloque }[]; sino: Bloque | null; pos: Posicion }
  | { tipo: 'Mientras'; condicion: Expresion; cuerpo: Bloque; pos: Posicion }
  | { tipo: 'Repetir'; veces: Expresion; cuerpo: Bloque; pos: Posicion }
  /** `para cada x en lista` (1 nombre) o `para cada clave, valor en tabla` (2 nombres) */
  | { tipo: 'ParaCada'; variables: Nombre[]; coleccion: Expresion; cuerpo: Bloque; pos: Posicion }
  | SentenciaFuncion
  | { tipo: 'Devolver'; valor: Expresion | null; pos: Posicion }
  | { tipo: 'Romper'; pos: Posicion }
  | { tipo: 'Continuar'; pos: Posicion }
  | { tipo: 'Cuando'; evento: Evento; cuerpo: Bloque; pos: Posicion }
  | { tipo: 'ExpresionSuelta'; expresion: Expresion; pos: Posicion };

export interface Programa {
  sentencias: Bloque;
  archivo: string;
  /** Las líneas del código fuente, para enseñarlas en los errores. */
  lineas: string[];
}
