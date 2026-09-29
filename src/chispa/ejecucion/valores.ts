/**
 * ════════════════════════════════════════════════════════════════════
 *  ETAPA 3 de 3 · EJECUCIÓN — Los valores de Chispa
 * ════════════════════════════════════════════════════════════════════
 *
 * Todo lo que puede guardarse en una variable, y cómo se representa por
 * dentro en TypeScript:
 *
 *   número      → number         (5, 3.14)
 *   texto       → string         ("hola")
 *   lógico      → boolean        (verdadero, falso)
 *   nulo        → null
 *   lista       → Valor[]        ([1, 2, 3])
 *   tabla       → Tabla          ({nombre: "Ana"})
 *   vector      → Vector2        (vector(10, 20))
 *   función     → FuncionChispa (escrita en Chispa) o FuncionNativa (del motor)
 *   anfitrión   → Anfitrion      (objetos del motor: yo, teclado, sonido...)
 *
 * "Anfitrión" (host object) es el nombre técnico de los objetos que no son
 * del lenguaje en sí, sino que los presta el programa que lo ejecuta (el
 * motor). Como `workspace` o `game` en Roblox.
 */
import type { Entorno } from './entorno';
import type { SentenciaFuncion } from '../sintaxis/ast';
import type { Posicion } from '../lexico/tokens';
import { Vector2 } from '../../motor/Vector2';
import { normalizar } from '../../utilidades/texto';

export type Valor = number | string | boolean | null | Valor[] | Tabla | Vector2 | FuncionChispa | FuncionNativa | Anfitrion;

/**
 * Tabla: pares clave → valor.
 *
 * DECISIÓN: usamos un Map de JavaScript porque RECUERDA EL ORDEN en que se
 * añadieron las claves. Así `para cada clave, valor en tabla` siempre sale en
 * ese orden y nunca parece aleatorio. Cambiar el valor de una clave que ya
 * existe no la mueve de sitio (Map.set conserva la posición).
 *
 * Las claves se buscan NORMALIZADAS (sin tildes ni mayúsculas, como el resto
 * del lenguaje), pero se guarda cómo se escribieron para enseñarlas.
 */
export class Tabla {
  private entradas = new Map<string, { clave: string; valor: Valor }>();

  tiene(clave: string): boolean {
    return this.entradas.has(normalizar(clave));
  }
  obtener(clave: string): Valor | undefined {
    return this.entradas.get(normalizar(clave))?.valor;
  }
  poner(clave: string, valor: Valor): void {
    const k = normalizar(clave);
    const existente = this.entradas.get(k);
    if (existente) existente.valor = valor;
    else this.entradas.set(k, { clave, valor });
  }
  quitar(clave: string): Valor {
    const k = normalizar(clave);
    const v = this.entradas.get(k)?.valor ?? null;
    this.entradas.delete(k);
    return v;
  }
  /** Claves en el orden en que se añadieron, tal como se escribieron. */
  claves(): string[] {
    return [...this.entradas.values()].map((e) => e.clave);
  }
  /** Pares [clave, valor] en orden. */
  pares(): [string, Valor][] {
    return [...this.entradas.values()].map((e) => [e.clave, e.valor]);
  }
  get tamano(): number {
    return this.entradas.size;
  }
}

/** Función escrita en Chispa. Guarda el entorno donde se creó: eso es un "closure". */
export class FuncionChispa {
  constructor(
    readonly definicion: SentenciaFuncion,
    readonly entorno: Entorno,
  ) {}
}

/** Petición de pausa que devuelve esperar(): el intérprete la entiende y duerme el hilo. */
export class PeticionEspera {
  constructor(readonly segundos: number) {}
}

/** Función del motor (escrita en TypeScript), como crear(), aleatorio() o esperar(). */
export class FuncionNativa {
  constructor(
    readonly nombre: string,
    readonly ejecutar: (argumentos: Valor[], pos: Posicion) => Valor | PeticionEspera,
  ) {}
}

/** Objeto del motor visible desde Chispa. */
export abstract class Anfitrion {
  /** Cómo se describe en los errores: "el objeto 'Jugador'", "'teclado'"... */
  abstract describir(): string;
  abstract obtener(propiedad: string, original: string, pos: Posicion): Valor;
  abstract asignar(propiedad: string, valor: Valor, original: string, pos: Posicion): void;
  /** Nombres de propiedades conocidas (para sugerir cuando alguien se equivoca). */
  propiedadesConocidas(): string[] {
    return [];
  }
  /**
   * Para el análisis ANTES de ejecutar: ¿tiene este miembro?
   * verdadero/falso si se sabe seguro; null si no se puede saber (datos que cambian).
   */
  tieneMiembro(_nombre: string): boolean | null {
    return null;
  }
  /** Si el miembro es otro módulo (escena.camara), lo devuelve para seguir comprobando. */
  submodulo(_nombre: string): Anfitrion | null {
    return null;
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
  if (v instanceof Tabla) return 'una tabla';
  if (v instanceof Vector2) return 'un vector';
  if (v instanceof FuncionChispa || v instanceof FuncionNativa) return 'una función';
  return v.describir();
}

/**
 * El tipo Y el valor, para los errores: `un número (10)`, `un texto ("hola")`.
 * Los valores largos se recortan con "…".
 */
export function tipoConValor(v: Valor): string {
  const recortar = (t: string, max: number) => (t.length > max ? t.slice(0, max - 1) + '…' : t);
  if (v === null) return 'nulo (vacío)';
  if (typeof v === 'number') return `un número (${formatearNumero(v)})`;
  if (typeof v === 'string') return `un texto ("${recortar(v, 24)}")`;
  if (typeof v === 'boolean') return `un valor lógico (${v ? 'verdadero' : 'falso'})`;
  if (Array.isArray(v)) return `una lista (${recortar(aTexto(v), 30)})`;
  if (v instanceof Tabla) return `una tabla (${recortar(aTexto(v), 30)})`;
  if (v instanceof Vector2) return `un vector ${aTexto(v)}`;
  return nombreTipo(v);
}

/** Convierte cualquier valor a texto (para mostrar() y para unir textos con +). */
export function aTexto(v: Valor): string {
  if (v === null) return 'nulo';
  if (typeof v === 'boolean') return v ? 'verdadero' : 'falso';
  if (typeof v === 'number') return formatearNumero(v);
  if (typeof v === 'string') return v;
  const dentro = (e: Valor) => (typeof e === 'string' ? `"${e}"` : aTexto(e));
  if (Array.isArray(v)) return '[' + v.map(dentro).join(', ') + ']';
  if (v instanceof Tabla) return '{' + v.pares().map(([k, e]) => `${k}: ${dentro(e)}`).join(', ') + '}';
  if (v instanceof Vector2) return `(${formatearNumero(v.x)}, ${formatearNumero(v.y)})`;
  if (v instanceof FuncionChispa) return `función ${v.definicion.original}`;
  if (v instanceof FuncionNativa) return `función ${v.nombre}`;
  return v.describir();
}

/**
 * DECISIÓN: redondeamos a 4 decimales al mostrar.
 * Los ordenadores guardan los decimales en binario, y 0.1 + 0.2 da
 * 0.30000000000000004. A alguien que empieza eso le confunde muchísimo.
 */
export function formatearNumero(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(parseFloat(n.toFixed(4)));
}

/**
 * ¿Es "verdadero" este valor en un `si`?
 * Como en Lua/Luau: solo `falso` y `nulo` cuentan como falso.
 */
export function esVerdadero(v: Valor): boolean {
  return v !== null && v !== false;
}

/**
 * Igualdad para == y !=.
 * - Números, textos, lógicos, nulo y vectores: por su contenido.
 * - Listas: elemento a elemento.
 * - Tablas, funciones y objetos del juego: ¿son el MISMO? (identidad)
 */
export function sonIguales(a: Valor, b: Valor): boolean {
  if (a instanceof Vector2 && b instanceof Vector2) return a.x === b.x && a.y === b.y;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => sonIguales(x, b[i]));
  return a === b;
}

/**
 * DECISIÓN: los vectores se COPIAN al guardarlos.
 *     variable inicio = yo.posicion
 * Si no copiáramos, `inicio` sería la MISMA posición del objeto y cambiaría
 * cuando el objeto se mueve (un error muy típico y muy difícil de ver).
 * Listas y tablas, en cambio, se comparten (como en Luau o Python).
 */
export function copiarSiVector(v: Valor): Valor {
  return v instanceof Vector2 ? v.copiar() : v;
}
