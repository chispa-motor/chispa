/**
 * Ayudantes para los tests.
 *
 *  - ejecutar(codigo)        → ejecuta Chispa "a pelo" (sin motor) y devuelve lo que muestra.
 *  - errorDe(codigo)         → ejecuta y devuelve el ErrorChispa que salta (o falla el test si no salta).
 *  - juegoDePrueba({...})    → monta un juego completo con un motor de mentira,
 *                              para avanzar fotogramas y pulsar teclas a mano.
 */
import { compilar } from '../src/chispa/sintaxis/parser';
import { Interprete } from '../src/chispa/ejecucion/interprete';
import { Entorno } from '../src/chispa/ejecucion/entorno';
import { ErrorChispa, ErrorCompilacion, type Diagnostico } from '../src/chispa/errores/ErrorChispa';
import { analizar } from '../src/chispa/analisis/analizador';
import { Entrada } from '../src/motor/Entrada';
import { Recursos } from '../src/motor/Recursos';
import { Sonido } from '../src/motor/Sonido';
import { Vector2 } from '../src/motor/Vector2';
import type { EscenaActiva, Motor } from '../src/motor/Motor';
import { JuegoEnMarcha, type DefObjeto, type DefProyecto } from '../src/proyecto/Proyecto';

// ───────────────────────── Lenguaje sin motor ─────────────────────────

export interface Resultado {
  /** Cada llamada a mostrar() es un elemento. */
  salida: string[];
  /** Cuántas veces se ha pausado con esperar(). */
  pausas: number;
}

/**
 * Ejecuta como lo hace el motor: compila, ANALIZA (si hay errores, no ejecuta) y ejecuta.
 * Con `analisis: false` se salta el análisis, para probar los errores que da el intérprete.
 */
export function ejecutar(codigo: string, opciones: { analisis?: boolean } = {}): Resultado {
  const salida: string[] = [];
  const interprete = new Interprete();
  interprete.alMostrar = (t) => salida.push(t);
  const programa = compilar(codigo, 'prueba.chs');
  if (opciones.analisis !== false) {
    const errores = analizar(programa, { globales: interprete.globales })
      .filter((d) => d.gravedad === 'error')
      .map((d) => new ErrorChispa(d.pos, d.mensaje, d.pista).conArchivo('prueba.chs', programa.lineas));
    if (errores.length) throw new ErrorCompilacion(errores);
  }
  const hilo = interprete.ejecutarBloque(programa.sentencias, new Entorno(interprete.globales));
  let pausas = 0;
  try {
    for (let r = hilo.next(); !r.done; r = hilo.next()) pausas++;
  } catch (e) {
    if (e instanceof ErrorChispa) e.conArchivo(programa.archivo, programa.lineas);
    throw e;
  }
  return { salida, pausas };
}

/** Atajo: lo que se ha mostrado, unido con " | ". */
export function mostrado(codigo: string): string {
  return ejecutar(codigo).salida.join(' | ');
}

/** Los avisos (en amarillo) que da el análisis. */
export function avisosDe(codigo: string): Diagnostico[] {
  const interprete = new Interprete();
  return analizar(compilar(codigo, 'prueba.chs'), { globales: interprete.globales }).filter((d) => d.gravedad === 'aviso');
}

export function errorDe(codigo: string, opciones: { analisis?: boolean } = {}): ErrorChispa {
  try {
    ejecutar(codigo, opciones);
  } catch (e) {
    if (e instanceof ErrorChispa) return e;
    throw e;
  }
  throw new Error('Se esperaba un error de Chispa, pero el código ha funcionado sin errores.');
}

// ───────────────────────── Juego con motor de mentira ─────────────────────────

/**
 * Un "motor" con todo lo que usan la escena y los scripts, pero sin Canvas
 * ni requestAnimationFrame: los fotogramas se avanzan a mano con avanzar().
 */
function motorDePrueba() {
  const canvas = document.createElement('canvas');
  const tiempo = { delta: 0, deltaReal: 0, total: 0, fotogramas: 0, fps: 60, escala: 1 };
  const actualizadores: ((dt: number) => void)[] = [];
  const entrada = new Entrada(canvas, (x, y) => new Vector2(x, y));
  const motor = {
    renderizador: { ancho: 960, alto: 540 },
    entrada,
    recursos: new Recursos(),
    sonido: new Sonido(),
    tiempo,
    colorFondo: '',
    escena: null as EscenaActiva | null,
    alActualizar: (f: (dt: number) => void) => actualizadores.push(f),
    iniciar: () => {},
  };

  /** Avanza N fotogramas en el mismo orden que el bucle real del Motor. */
  function avanzar(fotogramas = 1, dt = 1 / 60) {
    for (let i = 0; i < fotogramas; i++) {
      tiempo.deltaReal = dt;
      tiempo.delta = dt * tiempo.escala;
      tiempo.total += tiempo.delta;
      tiempo.fotogramas++;
      for (const f of actualizadores) f(tiempo.delta);
      motor.escena?.actualizar(tiempo.delta);
      entrada.finDeFotograma();
    }
  }

  /** Simula pulsar (y opcionalmente soltar) una tecla. `codigo` es el de KeyboardEvent: "Space", "ArrowUp", "KeyA"... */
  function pulsar(codigo: string, tecla = ' ') {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: codigo, key: tecla }));
  }
  function soltar(codigo: string, tecla = ' ') {
    window.dispatchEvent(new KeyboardEvent('keyup', { code: codigo, key: tecla }));
  }

  return { motor: motor as unknown as Motor, avanzar, pulsar, soltar, entrada };
}

export interface OpcionesJuegoPrueba {
  scripts?: Record<string, string>;
  escena?: DefObjeto[];
  plantillas?: Record<string, DefObjeto>;
}

export function juegoDePrueba(opciones: OpcionesJuegoPrueba) {
  const m = motorDePrueba();
  const salida: string[] = [];
  const errores: { error: ErrorChispa; veces: number }[] = [];
  const avisos: Diagnostico[] = [];
  const proyecto: DefProyecto = {
    formato: 'chispa-proyecto',
    version: 1,
    nombre: 'prueba',
    ancho: 960,
    alto: 540,
    colorFondo: 'negro',
    imagenes: {},
    scripts: opciones.scripts ?? {},
    plantillas: opciones.plantillas ?? {},
    escena: opciones.escena ?? [],
  };
  const juego = JuegoEnMarcha.preparar(m.motor, proyecto, {
    alMostrar: (t) => salida.push(t),
    alError: (error, veces) => {
      const ya = errores.find((x) => x.error.mensajeCorto === error.mensajeCorto && x.error.linea === error.linea);
      if (ya) ya.veces = veces;
      else errores.push({ error, veces });
    },
    alAviso: (a) => avisos.push(...a),
  });
  const buscar = (nombre: string) => {
    const o = juego.escena.buscar(nombre);
    if (!o) throw new Error(`No hay ningún objeto "${nombre}" en la escena`);
    return o;
  };
  return { ...m, juego, salida, errores, avisos, buscar };
}

/** Atajo: un único objeto "Prueba" con este script. */
export function unObjeto(codigo: string, extra: Partial<DefObjeto> = {}) {
  return juegoDePrueba({
    scripts: { 'prueba.chs': codigo },
    escena: [{ nombre: 'Prueba', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, script: 'prueba.chs', ...extra }],
  });
}
