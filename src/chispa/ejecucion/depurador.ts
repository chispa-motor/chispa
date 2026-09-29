/**
 * DEPURADOR: parar el juego en una línea y ver qué valen las variables.
 *
 * Cómo funciona por dentro: cada evento es un HILO (un generador) que ya sabe
 * pararse a medias con esperar(). Antes de cada línea, el intérprete pregunta
 * al depurador «¿paro aquí?». Si la respuesta es sí, el hilo se queda parado
 * en esa línea (como en un esperar sin fin) y el editor pone el juego en
 * pausa. Continuar o dar un paso es, simplemente, dejar que el hilo siga.
 *
 *   - Puntos de parada: archivo + línea (se ponen haciendo clic en el número de línea).
 *   - Continuar:        sigue hasta el siguiente punto de parada.
 *   - Siguiente línea:  para en la siguiente línea de ESTE evento, sin entrar en las funciones que llame.
 *   - Entrar:           para en la siguiente línea que se ejecute, también dentro de una función.
 *
 * DECISIÓN: los pasos son siempre dentro del MISMO hilo (el mismo evento).
 * Si mientras tanto se ejecutan otros eventos, no se para en ellos (salvo que
 * tengan un punto de parada). Así «siguiente línea» hace lo que parece.
 */
import type { Entorno } from './entorno';
import { aTexto, Anfitrion, FuncionChispa, FuncionNativa, type Valor } from './valores';

/** Lo que un hilo apunta para el depurador: por dónde va de llamadas a funciones. */
export interface HiloDepurable {
  profundidad: number;
}

/** Lo que devuelve un hilo al pararse en una línea (lo recibe ScriptChispa). */
export class PeticionParada {
  constructor(
    readonly archivo: string,
    readonly linea: number,
    readonly entorno: Entorno,
  ) {}
}

export type ModoDepuracion = 'correr' | 'siguiente' | 'entrar';

/** Dónde está parado el juego ahora mismo. */
export interface Parada {
  archivo: string;
  linea: number;
  entorno: Entorno;
  hilo: HiloDepurable;
  /** Nombre del objeto cuyo script se ha parado. */
  objeto: string;
}

/** Una variable para enseñarla en el panel. */
export interface VariableVista {
  grupo: string;
  nombre: string;
  valor: string;
}

export class Depurador {
  /** Puntos de parada: archivo → líneas. */
  private puntos = new Map<string, Set<number>>();
  private modo: ModoDepuracion = 'correr';
  /** En los pasos: el hilo que se está siguiendo, y a qué profundidad iba. */
  private hiloPaso: HiloDepurable | null = null;
  private profundidadPaso = 0;
  /** No volver a parar en la misma línea al continuar desde ella. */
  private saltarUnaVez: { hilo: HiloDepurable; archivo: string; linea: number } | null = null;
  parada: Parada | null = null;
  /** El editor lo usa para poner el juego en pausa, abrir el archivo y enseñar las variables. */
  alParar: (p: Parada) => void = () => {};
  alSeguir: () => void = () => {};

  // ───────────────────────── Puntos de parada ─────────────────────────

  ponerPuntos(archivo: string, lineas: Iterable<number>): void {
    const s = new Set(lineas);
    if (s.size) this.puntos.set(archivo, s);
    else this.puntos.delete(archivo);
  }

  /** Pone o quita un punto de parada. Devuelve si queda puesto. */
  alternarPunto(archivo: string, linea: number): boolean {
    const s = this.puntos.get(archivo) ?? new Set<number>();
    const puesto = !s.has(linea);
    if (puesto) s.add(linea);
    else s.delete(linea);
    this.ponerPuntos(archivo, s);
    return puesto;
  }

  tienePunto(archivo: string, linea: number): boolean {
    return this.puntos.get(archivo)?.has(linea) ?? false;
  }

  lineasCon(archivo: string): number[] {
    return [...(this.puntos.get(archivo) ?? [])].sort((a, b) => a - b);
  }

  /** Todos los puntos de parada, para la lista del panel. */
  todosLosPuntos(): { archivo: string; linea: number }[] {
    return [...this.puntos].sort(([a], [b]) => a.localeCompare(b)).flatMap(([archivo, lineas]) => [...lineas].sort((x, y) => x - y).map((linea) => ({ archivo, linea })));
  }

  /** ¿Hay algún punto de parada? (si no y no se va paso a paso, el intérprete ni pregunta) */
  get activo(): boolean {
    return this.puntos.size > 0 || this.modo !== 'correr';
  }

  // ───────────────────────── Durante la ejecución ─────────────────────────

  /** El intérprete lo pregunta antes de cada línea. */
  debeParar(archivo: string, linea: number, hilo: HiloDepurable | null): boolean {
    if (!hilo) return false;
    const salto = this.saltarUnaVez;
    if (salto && salto.hilo === hilo) {
      if (salto.archivo === archivo && salto.linea === linea) return false;
      this.saltarUnaVez = null;
    }
    if (this.tienePunto(archivo, linea)) return true;
    if (this.modo === 'entrar') return hilo === this.hiloPaso;
    if (this.modo === 'siguiente') return hilo === this.hiloPaso && hilo.profundidad <= this.profundidadPaso;
    return false;
  }

  /** Hay un punto de parada en la línea de un «cuando»: el hilo nuevo se para en su primera línea. */
  pararAlEmpezar(hilo: HiloDepurable): void {
    this.modo = 'entrar';
    this.hiloPaso = hilo;
  }

  /** Un hilo acaba de pararse (lo llama ScriptChispa). */
  parar(p: Parada): void {
    this.parada = p;
    this.modo = 'correr';
    this.hiloPaso = null;
    this.alParar(p);
  }

  /** ¿Está este hilo parado esperando al depurador? */
  estaParado(hilo: HiloDepurable): boolean {
    return this.parada?.hilo === hilo;
  }

  /** Un hilo parado ha terminado (el evento se ha acabado): los pasos ya no tienen a quién seguir. */
  hiloTerminado(hilo: HiloDepurable): void {
    if (this.hiloPaso === hilo) {
      this.modo = 'correr';
      this.hiloPaso = null;
    }
  }

  continuar(): void {
    this.seguir('correr');
  }
  siguienteLinea(): void {
    this.seguir('siguiente');
  }
  entrar(): void {
    this.seguir('entrar');
  }

  private seguir(modo: ModoDepuracion): void {
    const p = this.parada;
    if (!p) return;
    this.modo = modo;
    this.hiloPaso = modo === 'correr' ? null : p.hilo;
    this.profundidadPaso = p.hilo.profundidad;
    // Al seguir, no se vuelve a parar en la línea donde estaba (es la que se va a ejecutar ahora)
    this.saltarUnaVez = { hilo: p.hilo, archivo: p.archivo, linea: p.linea };
    this.parada = null;
    this.alSeguir();
  }

  /** Al parar o reiniciar el juego: se olvida dónde estaba (los puntos de parada se quedan). */
  olvidar(): void {
    this.parada = null;
    this.modo = 'correr';
    this.hiloPaso = null;
    this.saltarUnaVez = null;
  }

  // ───────────────────────── Variables ─────────────────────────

  /**
   * Las variables que se ven desde la línea parada, de la más cercana a la
   * más lejana: las del bloque, las del evento y las del script. De `yo`,
   * sus propiedades más útiles. Las globales del motor (teclado, crear...) no.
   */
  variables(globales: Entorno): VariableVista[] {
    const p = this.parada;
    if (!p) return [];
    const filas: VariableVista[] = [];
    const vistas = new Set<string>();
    const entornos: Entorno[] = [];
    for (let e: Entorno | null = p.entorno; e && e !== globales; e = e.padre) entornos.push(e);
    entornos.forEach((e, i) => {
      const grupo = i === entornos.length - 1 ? 'Del script' : i === 0 ? 'Aquí' : 'Más fuera';
      for (const n of e.nombresPropios()) {
        if (vistas.has(n)) continue; // una variable de dentro tapa a otra de fuera con el mismo nombre
        vistas.add(n);
        const c = e.buscar(n)!;
        if (c.valor instanceof FuncionChispa || c.valor instanceof FuncionNativa) continue;
        filas.push({ grupo, nombre: c.original, valor: valorParaVer(c.valor) });
      }
    });
    // Lo más útil de yo: dónde está y sus propiedades propias (yo.vida...)
    const yo = p.entorno.buscar('yo')?.valor;
    if (yo instanceof Anfitrion && yo.resumenParaDepurar) {
      for (const [nombre, valor] of yo.resumenParaDepurar()) filas.push({ grupo: 'yo', nombre: `yo.${nombre}`, valor: valorParaVer(valor) });
    }
    // Y lo compartido por todos los scripts (juego.puntos...)
    const juego = globales.buscar('juego')?.valor;
    if (juego instanceof Anfitrion && juego.resumenParaDepurar) {
      for (const [nombre, valor] of juego.resumenParaDepurar()) filas.push({ grupo: 'juego', nombre: `juego.${nombre}`, valor: valorParaVer(valor) });
    }
    return filas;
  }
}

/** Un valor como se ve en el panel: "3", "\"hola\"", "[1, 2]", "el objeto 'Jugador'". */
export function valorParaVer(v: Valor): string {
  if (typeof v === 'string') return `"${v}"`;
  if (v instanceof Anfitrion) return v.describir();
  const t = aTexto(v);
  return t.length > 80 ? t.slice(0, 79) + '…' : t;
}
