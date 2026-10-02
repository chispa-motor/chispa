/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
import { JuegoEnMarcha } from '../src/proyecto/JuegoEnMarcha';
import type { Depurador } from '../src/chispa/ejecucion/depurador';
import type { DefEscena, DefObjeto, DefProyecto } from '../src/proyecto/formato';
import type { DefAnimacion } from '../src/objetos/componentes/Animador';

/** Una imagen PNG de 1×1 píxel y un sonido WAV vacío, de verdad (pasan validar.ts). */
export const IMAGEN_PRUEBA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
export const SONIDO_PRUEBA = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

/**
 * Imágenes y sonidos de prueba DISTINTOS entre sí (para saber cuál se ha guardado):
 * empiezan con la firma de verdad de un PNG o un WAV y luego llevan la marca.
 */
export const imagenPrueba = (marca: string) => 'data:image/png;base64,' + btoa('\x89PNG\r\n\x1a\n' + marca);
export const sonidoPrueba = (marca: string) => 'data:audio/wav;base64,' + btoa('RIFF\0\0\0\0WAVE' + marca);

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
function motorDePrueba(ancho = 960, alto = 540) {
  const canvas = document.createElement('canvas');
  const tiempo = { delta: 0, deltaReal: 0, total: 0, fotogramas: 0, fps: 60, escala: 1 };
  const actualizadores: ((dt: number) => void)[] = [];
  const entrada = new Entrada(canvas, (x, y) => new Vector2(x, y));
  const motor = {
    renderizador: { ancho, alto },
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

  /**
   * Simula un clic en la pantalla. (x, y) en coordenadas de PANTALLA del juego con la
   * Y hacia ARRIBA, como en Chispa: (0, 0) es la esquina inferior izquierda.
   */
  function clic(x: number, y: number) {
    const opciones = { button: 0, clientX: x, clientY: alto - y, bubbles: true };
    canvas.dispatchEvent(new MouseEvent('pointermove', opciones));
    canvas.dispatchEvent(new MouseEvent('pointerdown', opciones));
    window.dispatchEvent(new MouseEvent('pointerup', opciones));
  }

  /** El ratón, paso a paso (para arrastrar): bajar el botón en un sitio, moverlo y soltarlo. Coordenadas como en clic(). */
  const raton = {
    bajar(x: number, y: number) {
      const opciones = { button: 0, clientX: x, clientY: alto - y, bubbles: true };
      canvas.dispatchEvent(new MouseEvent('pointermove', opciones));
      canvas.dispatchEvent(new MouseEvent('pointerdown', opciones));
    },
    mover(x: number, y: number) {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: alto - y, bubbles: true }));
    },
    soltar() {
      window.dispatchEvent(new MouseEvent('pointerup', { button: 0, bubbles: true }));
    },
  };

  return { motor: motor as unknown as Motor, avanzar, pulsar, soltar, clic, raton, entrada };
}

export interface OpcionesJuegoPrueba {
  scripts?: Record<string, string>;
  /** Objetos de la escena "Principal". */
  escena?: DefObjeto[];
  /** Otras escenas (además de "Principal"). */
  escenas?: Record<string, DefEscena>;
  plantillas?: Record<string, DefObjeto>;
  animaciones?: Record<string, DefAnimacion>;
  sonidos?: Record<string, string>;
  imagenes?: Record<string, string>;
  gravedad?: number;
  depurador?: Depurador;
  /** «Datos del juego»: con qué empieza juego. */
  datos?: DefProyecto['datos'];
  /** Un proyecto entero (por ejemplo, uno de la carpeta proyectos/): se usa tal cual. */
  proyecto?: DefProyecto;
  /** El «navegador» donde se guardan los datos (para que dos juegos compartan el mismo). */
  almacen?: Map<string, string>;
  /** Qué hacer con sistema.abrirWeb. */
  abrirWeb?: (url: string) => void;
}

export function juegoDePrueba(opciones: OpcionesJuegoPrueba) {
  const m = motorDePrueba(opciones.proyecto?.ancho, opciones.proyecto?.alto);
  const salida: string[] = [];
  const errores: { error: ErrorChispa; veces: number }[] = [];
  const avisos: Diagnostico[] = [];
  const proyecto: DefProyecto = opciones.proyecto ?? {
    formato: 'chispa-proyecto',
    version: 2,
    id: 'prueba-juego',
    nombre: 'prueba',
    ancho: 960,
    alto: 540,
    // Los proyectos solo pueden llevar imágenes y sonidos de verdad (validar.ts): en los
    // tests basta el nombre, y aquí se le pone una imagen o un sonido diminuto
    imagenes: Object.fromEntries(Object.keys(opciones.imagenes ?? {}).map((n) => [n, IMAGEN_PRUEBA])),
    sonidos: Object.fromEntries(Object.keys(opciones.sonidos ?? {}).map((n) => [n, SONIDO_PRUEBA])),
    animaciones: opciones.animaciones ?? {},
    scripts: opciones.scripts ?? {},
    plantillas: opciones.plantillas ?? {},
    escenas: { Principal: { colorFondo: 'negro', gravedad: opciones.gravedad, objetos: opciones.escena ?? [] }, ...opciones.escenas },
    escenaInicial: 'Principal',
    datos: opciones.datos,
  };
  // Los sonidos "se cargan" (sin audio de verdad en los tests)
  for (const nombre of Object.keys(proyecto.sonidos)) void m.motor.sonido.cargar(nombre, 'no-hay-audio');
  // Imágenes de mentira (1×1) para que existan
  for (const nombre of Object.keys(proyecto.imagenes)) m.motor.recursos.registrar(nombre, document.createElement('img'));
  const almacen = opciones.almacen ?? new Map<string, string>();
  const juego = JuegoEnMarcha.preparar(m.motor, proyecto, {
    almacen: { getItem: (k) => almacen.get(k) ?? null, setItem: (k, v) => void almacen.set(k, v), removeItem: (k) => void almacen.delete(k) },
    alMostrar: (t) => salida.push(t),
    alError: (error, veces) => {
      const ya = errores.find((x) => x.error.mensajeCorto === error.mensajeCorto && x.error.linea === error.linea);
      if (ya) ya.veces = veces;
      else errores.push({ error, veces });
    },
    alAviso: (a) => avisos.push(...a),
    depurador: opciones.depurador,
    abrirWeb: opciones.abrirWeb,
  });
  const buscar = (nombre: string) => {
    const o = juego.escena.buscar(nombre);
    if (!o) throw new Error(`No hay ningún objeto "${nombre}" en la escena`);
    return o;
  };
  return { ...m, juego, salida, errores, avisos, buscar, almacen };
}

/** Atajo: un único objeto "Prueba" con este script. */
export function unObjeto(codigo: string, extra: Partial<DefObjeto> = {}) {
  return juegoDePrueba({
    scripts: { 'prueba.chs': codigo },
    escena: [{ nombre: 'Prueba', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, script: 'prueba.chs', ...extra }],
  });
}
