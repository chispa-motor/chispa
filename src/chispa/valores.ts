/**
 * Valores de Chispa: todo lo que puede guardarse en una variable.
 *
 *   número      → number         (5, 3.14)
 *   texto       → string         ("hola")
 *   lógico      → boolean        (verdadero, falso)
 *   nulo        → null
 *   lista       → Valor[]        ([1, 2, 3])
 *   vector      → Vector2        (vector(10, 20), yo.posicion)
 *   función     → FuncionChispa (escrita en Chispa) o FuncionNativa (del motor)
 *   anfitrión   → Anfitrion      (objetos del motor: yo, teclado, camara...)
 *
 * "Anfitrión" (host object) es el nombre técnico de los objetos que no
 * existen en el lenguaje en sí, sino que los presta el programa que lo ejecuta
 * (nuestro motor). Como `workspace` o `game` en Roblox.
 */
import type { Entorno } from './entorno';
import type { SentenciaFuncion } from './ast';
import { Vector2 } from '../motor/Vector2';

export type Valor = number | string | boolean | null | Valor[] | Vector2 | FuncionChispa | FuncionNativa | Anfitrion;

/** Función escrita en Chispa. Guarda el entorno donde se creó (eso es un "closure"). */
export class FuncionChispa {
  constructor(
    readonly definicion: SentenciaFuncion,
    readonly entorno: Entorno,
  ) {}
}

/** Petición de pausa que devuelve esperar(): el intérprete la entiende y detiene el hilo. */
export class PeticionEspera {
  constructor(readonly segundos: number) {}
}

/** Función del motor (escrita en TypeScript), como crear(), aleatorio() o esperar(). */
export class FuncionNativa {
  constructor(
    readonly nombre: string,
    readonly ejecutar: (argumentos: Valor[], linea: number) => Valor | PeticionEspera,
  ) {}
}

/** Objeto del motor visible desde Chispa. */
export abstract class Anfitrion {
  /** Cómo se describe en los errores: "el objeto 'Jugador'", "el teclado"... */
  abstract describir(): string;
  abstract obtener(propiedad: string, original: string, linea: number): Valor;
  abstract asignar(propiedad: string, valor: Valor, original: string, linea: number): void;
  /** Nombres de propiedades conocidas (para sugerir cuando alguien se equivoca). */
  propiedadesConocidas(): string[] {
    return [];
  }
}

// ───────────────────────── Utilidades ─────────────────────────

/** Nombre del tipo en español, para los errores: "no puedo sumar un texto y una lista". */
export function nombreTipo(v: Valor): string {
  if (v === null) return 'nulo (vacío)';
  if (typeof v === 'number') return 'un número';
  if (typeof v === 'string') return 'un texto';
  if (typeof v === 'boolean') return 'un valor lógico (verdadero/falso)';
  if (Array.isArray(v)) return 'una lista';
  if (v instanceof Vector2) return 'un vector';
  if (v instanceof FuncionChispa || v instanceof FuncionNativa) return 'una función';
  return v.describir();
}

/** Convierte cualquier valor a texto (para mostrar y para unir textos con +). */
export function aTexto(v: Valor): string {
  if (v === null) return 'nulo';
  if (typeof v === 'boolean') return v ? 'verdadero' : 'falso';
  if (typeof v === 'number') return formatearNumero(v);
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return '[' + v.map((e) => (typeof e === 'string' ? `"${e}"` : aTexto(e))).join(', ') + ']';
  if (v instanceof Vector2) return `(${formatearNumero(v.x)}, ${formatearNumero(v.y)})`;
  if (v instanceof FuncionChispa) return `función ${v.definicion.original}`;
  if (v instanceof FuncionNativa) return `función ${v.nombre}`;
  return v.describir();
}

/**
 * DECISIÓN: redondeamos a 4 decimales al mostrar.
 * Los ordenadores guardan los decimales en binario y 0.1 + 0.2 da
 * 0.30000000000000004. A alguien que empieza eso le confunde muchísimo.
 */
export function formatearNumero(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(parseFloat(n.toFixed(4)));
}

/**
 * ¿Es "verdadero" este valor en un `si`?
 * DECISIÓN (como Lua/Luau): solo `falso` y `nulo` cuentan como falso.
 * El 0 y el texto vacío cuentan como verdadero.
 */
export function esVerdadero(v: Valor): boolean {
  return v !== null && v !== false;
}

/** Igualdad para == y !=. Los vectores se comparan por su contenido. */
export function sonIguales(a: Valor, b: Valor): boolean {
  if (a instanceof Vector2 && b instanceof Vector2) return a.x === b.x && a.y === b.y;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => sonIguales(x, b[i]));
  // Los anfitriones (objetos del juego) se comparan por identidad: ¿son el MISMO objeto?
  return a === b;
}

/**
 * DECISIÓN: los vectores se COPIAN al guardarlos.
 *     variable inicio = yo.posicion
 * Si no copiáramos, `inicio` sería la MISMA posición del jugador y cambiaría
 * cuando el jugador se mueve (un error muy típico y muy difícil de ver).
 * Así se comportan como números: son "valores", no "referencias".
 */
export function copiarSiVector(v: Valor): Valor {
  return v instanceof Vector2 ? v.copiar() : v;
}
