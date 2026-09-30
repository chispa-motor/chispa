/**
 * ERRORES DE CHISPA
 *
 * Regla de oro: cada error dice (1) dónde está (archivo, línea y columna),
 * (2) qué pasa, con palabras normales, y (3) cómo arreglarlo. Nada de
 * "unexpected token" ni "undefined".
 *
 * Tipos:
 *   - ErrorChispa:      UN error, con su posición y, si pasó dentro de
 *                       funciones, la PILA DE LLAMADAS (desde dónde se llamó).
 *   - ErrorCompilacion: VARIOS errores de escritura encontrados a la vez.
 *                       Se comporta como el primero, pero los guarda todos.
 *   - Diagnostico:      la forma "plana" de un error o un AVISO, que usan el
 *                       editor (subrayados) y la consola.
 */
import { ErrorMotor } from '../../motor/Errores';
import type { Posicion } from '../lexico/tokens';

export type Gravedad = 'error' | 'aviso';

/** Una llamada a función en la pila: "dentro de 'dañar', llamada desde la línea 4". */
export interface Llamada {
  funcion: string;
  desde: Posicion;
}

/** Un error o aviso, listo para enseñarse. */
export interface Diagnostico {
  gravedad: Gravedad;
  archivo?: string;
  pos: Posicion;
  /** Sin el "Línea N:" del principio. */
  mensaje: string;
  pista?: string;
  /** De dentro hacia fuera: [la función donde falló, la que la llamó, ...] */
  pila?: Llamada[];
}

export class ErrorChispa extends ErrorMotor {
  /** El mensaje sin "Línea N:" delante. */
  readonly mensajeCorto: string;
  /** Funciones por las que ha pasado el error, de dentro hacia fuera. */
  readonly pila: Llamada[] = [];

  constructor(
    readonly posicion: Posicion,
    mensaje: string,
    pista?: string,
  ) {
    super(`Línea ${posicion.linea}: ${mensaje}`, pista, {
      linea: posicion.linea,
      columna: posicion.columna,
      longitud: posicion.longitud,
    });
    this.name = 'ErrorChispa';
    this.mensajeCorto = mensaje;
  }

  get linea(): number {
    return this.posicion.linea;
  }

  /** Añade el archivo y el texto de la línea (lo sabe quien tiene el código fuente). */
  conArchivo(archivo: string, lineasCodigo: string[]): this {
    if (!this.ubicacion.archivo) {
      this.ubicacion.archivo = archivo;
      this.ubicacion.codigo = lineasCodigo[this.linea - 1];
    }
    return this;
  }

  /** El intérprete lo llama al salir de cada función por la que "atraviesa" el error. */
  agregarLlamada(funcion: string, desde: Posicion): void {
    // Con una función que se llama a sí misma mil veces, basta con enseñar las primeras
    if (this.pila.length < MAXIMO_PILA) this.pila.push({ funcion, desde });
  }

  diagnostico(): Diagnostico {
    return {
      gravedad: 'error',
      archivo: this.ubicacion.archivo,
      pos: this.posicion,
      mensaje: this.mensajeCorto,
      pista: this.pista,
      pila: this.pila.length ? [...this.pila] : undefined,
    };
  }
}

/**
 * Varios errores de escritura a la vez. Hereda del PRIMERO (para que se pueda
 * tratar como un error normal) y guarda la lista completa en `errores`.
 */
export class ErrorCompilacion extends ErrorChispa {
  constructor(readonly errores: ErrorChispa[]) {
    const primero = errores[0];
    super(primero.posicion, primero.mensajeCorto, primero.pista);
    this.name = 'ErrorCompilacion';
    this.ubicacion = { ...primero.ubicacion };
  }
}

// ───────────────────────── Formato de texto ─────────────────────────

/** Frase que explica la pila: "Esto pasó dentro de la función 'dañar', que se llamó desde la línea 4." */
export function explicarPila(pila: Llamada[] | undefined): string[] {
  if (!pila?.length) return [];
  const frases = pila.map((l, i) =>
    i === 0
      ? `Esto pasó dentro de la función '${l.funcion}', que se llamó desde la línea ${l.desde.linea}.`
      : `…y '${pila[i - 1].funcion}' se llamó desde la función '${l.funcion}', en la línea ${l.desde.linea}.`,
  );
  if (pila.length >= MAXIMO_PILA) frases.push('…(y muchas llamadas más).');
  return frases;
}

/** Cuántas llamadas se apuntan como mucho en la pila de un error. */
const MAXIMO_PILA = 12;

/**
 * Convierte un diagnóstico en el texto de la especificación:
 *
 *   ✖ Error en jugador.chs · línea 8, columna 5
 *
 *      8 │     mientas vida > 0:
 *        │     ^^^^^^^
 *      Has escrito 'mientas', que no es ninguna palabra de Chispa.
 *      💡 ¿Querías decir 'mientras'?
 */
export function formatearDiagnostico(d: Diagnostico, lineasCodigo?: string[]): string {
  const icono = d.gravedad === 'error' ? '✖ Error' : '⚠ Aviso';
  const donde = `${d.archivo ? ` en ${d.archivo}` : ''} · línea ${d.pos.linea}, columna ${d.pos.columna}`;
  const salida = [`${icono}${donde}`, ''];
  const codigo = lineasCodigo?.[d.pos.linea - 1];
  if (codigo !== undefined) {
    const n = String(d.pos.linea);
    const margen = ' '.repeat(n.length);
    salida.push(`   ${n} │ ${codigo}`);
    salida.push(`   ${margen} │ ${' '.repeat(Math.max(0, d.pos.columna - 1))}${'^'.repeat(Math.max(1, d.pos.longitud))}`);
  }
  salida.push(`   ${primeraMayuscula(d.mensaje)}`);
  for (const frase of explicarPila(d.pila)) salida.push(`   ${frase}`);
  if (d.pista) salida.push(...d.pista.split('\n').map((l, i) => (i === 0 ? `   💡 ${l}` : `      ${l}`)));
  return salida.join('\n');
}

function primeraMayuscula(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Formatea un ErrorChispa usando la línea de código que ya lleva guardada. */
export function formatearError(e: ErrorChispa): string {
  const lineas: string[] = [];
  if (e.ubicacion.codigo !== undefined) lineas[e.linea - 1] = e.ubicacion.codigo;
  return formatearDiagnostico(e.diagnostico(), lineas);
}
