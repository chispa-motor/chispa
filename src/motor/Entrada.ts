/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Entrada: teclado y ratón.
 *
 * PROBLEMA: el navegador avisa de las teclas con EVENTOS (keydown/keyup) que
 * llegan en cualquier momento, pero un juego pregunta en cada fotograma:
 * "¿está pulsada la tecla ahora?". Así que guardamos el estado aquí y el
 * juego lo consulta cuando quiera.
 *
 * Tres preguntas distintas (igual que Unity):
 *   estaPulsada("a")  → la tecla está abajo AHORA (para moverse).
 *   sePulso("a")      → se ha pulsado JUSTO en este fotograma (para saltar o disparar una vez).
 *   seSolto("a")      → se ha soltado JUSTO en este fotograma.
 * sePulso/seSolto se borran al final de cada fotograma (finDeFotograma).
 *
 * Nombres de tecla en español: "espacio", "arriba", "abajo", "izquierda",
 * "derecha", "enter", "escape", "mayus", "control", "borrar", letras ("a",
 * "ñ") y números ("1"). Se aceptan con o sin tilde y en mayúsculas.
 */
import { ErrorMotor } from './Errores';
import { Tactil } from './Tactil';
import { Vector2 } from './Vector2';
import { normalizar } from '../utilidades/texto';
import { sugerir } from '../chispa/errores/sugerencias';
import { sinPrototipo } from '../utilidades/seguro';

export type BotonRaton = 'izquierdo' | 'medio' | 'derecho';

/**
 * Botones del mando, con la distribución "estándar" (la de los mandos de Xbox;
 * en PlayStation, a = ✕, b = ◯, x = ▢, y = △). El número es su posición.
 */
export const BOTONES_MANDO = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'select', 'start', 'l3', 'r3', 'arriba', 'abajo', 'izquierda', 'derecha'];

/**
 * DECISIÓN: el mando hace de TECLADO. La cruceta y la palanca izquierda son
 * las flechas; A es espacio, B es "x", X es "z", Y es "c", start es enter y
 * select es escape. Así cualquier juego hecho para teclado se juega con mando
 * sin cambiar nada. Para más control está el módulo `mando`.
 */
const TECLA_DE_BOTON: Record<string, string> = sinPrototipo({
  a: 'espacio', b: 'x', x: 'z', y: 'c', start: 'enter', select: 'escape',
  arriba: 'arriba', abajo: 'abajo', izquierda: 'izquierda', derecha: 'derecha',
});

/** Palanca: por debajo de esto se considera que está en el centro (los mandos nunca dan 0 exacto). */
const ZONA_MUERTA = 0.25;
/** Como mucho, estos mandos (uno por jugador). */
export const MAXIMO_MANDOS = 4;

export interface EstadoMando {
  conectado: boolean;
  botones: Set<string>;
  /** Los que se han pulsado, y los que se han soltado, justo en este fotograma. */
  pulsados: Set<string>;
  soltados: Set<string>;
  ejeX: number;
  ejeY: number;
  ejeDerechoX: number;
  ejeDerechoY: number;
}

/** Teclas especiales: código físico del navegador → nombre en español. */
const NOMBRES_POR_CODIGO: Record<string, string> = sinPrototipo({
  Space: 'espacio',
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
  ArrowLeft: 'izquierda',
  ArrowRight: 'derecha',
  Enter: 'enter',
  NumpadEnter: 'enter',
  Escape: 'escape',
  Tab: 'tab',
  Backspace: 'borrar',
  Delete: 'suprimir',
  ShiftLeft: 'mayus',
  ShiftRight: 'mayus',
  ControlLeft: 'control',
  ControlRight: 'control',
  AltLeft: 'alt',
  AltRight: 'alt',
});

/** Otras formas de escribir el mismo nombre de tecla. */
const ALIAS: Record<string, string> = sinPrototipo({
  intro: 'enter',
  mayusculas: 'mayus',
  shift: 'mayus',
  ctrl: 'control',
  esc: 'escape',
  space: 'espacio',
  up: 'arriba',
  down: 'abajo',
  left: 'izquierda',
  right: 'derecha',
  retroceso: 'borrar',
  supr: 'suprimir',
});

const TECLAS_CONOCIDAS = new Set([
  ...Object.values(NOMBRES_POR_CODIGO),
  ...Array.from({ length: 12 }, (_, i) => `f${i + 1}`), // f1 … f12
]);

/** Teclas que el navegador usa para hacer scroll: se lo impedimos durante el juego. */
const EVITAR_SCROLL = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

/** ¿El evento viene de un sitio donde se escribe (input, textarea, editor de código)? */
function esCampoDeTexto(objetivo: EventTarget | null): boolean {
  const el = objetivo as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

/** Nombres de las teclas especiales (para el autocompletado y las sugerencias). */
export const NOMBRES_TECLAS = [...TECLAS_CONOCIDAS];

/**
 * Comprueba un nombre de tecla y devuelve su forma oficial.
 * Si no existe, lanza un error amable con sugerencia ("espaico" → "espacio").
 */
export function comprobarNombreTecla(tecla: string): string {
  const n = normalizarNombreTecla(tecla);
  const esCaracter = [...n].length === 1;
  if (!esCaracter && !TECLAS_CONOCIDAS.has(n)) {
    const parecida = sugerir(n, NOMBRES_TECLAS);
    throw new ErrorMotor(
      `No conozco ninguna tecla llamada "${tecla}".`,
      (parecida ? `¿Querías decir "${parecida}"? ` : '') +
        `Las teclas especiales son: ${NOMBRES_TECLAS.join(', ')}. Para letras y números escribe solo el carácter, por ejemplo "a" o "1".`,
    );
  }
  return n;
}

/** "Espacio", "ESPACIO", "intro" → nombre oficial ("espacio", "enter"). */
export function normalizarNombreTecla(nombre: string): string {
  const n = normalizar(nombre);
  return ALIAS[n] ?? n;
}

/** Traduce un evento de teclado del navegador a nuestro nombre en español. */
function nombreDesdeEvento(e: KeyboardEvent): string {
  if (NOMBRES_POR_CODIGO[e.code]) return NOMBRES_POR_CODIGO[e.code];
  // Letras: usamos e.key (la letra impresa en TU teclado), así la ñ funciona.
  if (e.key.length === 1 && /\p{L}/u.test(e.key)) return e.key.toLowerCase();
  // Números: usamos el código físico, porque con Mayús el "1" se convierte en "!".
  if (e.code.startsWith('Digit')) return e.code.slice(5);
  if (/^Numpad\d$/.test(e.code)) return e.code.slice(6);
  return normalizar(e.key);
}

/** Cuántas letras caben en el campo invisible del teclado de pantalla (los campos de los juegos admiten muchas menos). */
export const MAXIMO_TECLADO = 2000;

export class Entrada {
  /**
   * ¿Es esta tecla para el juego? Por defecto, sí. El editor lo cambia para
   * que las teclas que pulsas en la vista de la escena no muevan al jugador.
   */
  aceptarTecla: (e: KeyboardEvent) => boolean = () => true;
  /**
   * Teclas abajo ahora mismo: código físico → nombre.
   * Guardamos el código porque al soltar la tecla el navegador podría darnos
   * otro "key" (si pulsaste Mayús entre medias) y la tecla se quedaría pegada.
   */
  /**
   * Se está escribiendo en un campo de texto del juego: las teclas no son
   * órdenes («cuando se pulsa "a"» no salta), son letras. Lo pone el campo.
   */
  escribiendo = false;
  /** Lo que se ha escrito en este fotograma: letras, "\b" (borrar), "\n" (Intro) y "\x1b" (Escape). */
  textoEscrito: string[] = [];

  /**
   * TECLADO DE PANTALLA (móviles y tabletas). El navegador solo saca el teclado si, EN EL MISMO
   * TOQUE, se enfoca un campo de texto de verdad (de la página). Los campos de Chispa están
   * dibujados dentro del juego, así que hay un campo de la página invisible para eso.
   *
   * Cada campo de texto del juego apunta aquí una función: dice si el dedo está encima de él
   * y qué texto tiene (o null). Al tocar el lienzo se pregunta a todas y, si alguna contesta,
   * se enfoca el campo invisible en ese mismo instante. Lo que se escribe en él llega al juego
   * como `textoEscrito`, igual que con un teclado de verdad.
   */
  zonasDeTexto = new Set<() => string | null>();
  /** Los controles en pantalla y los gestos, para jugar con el dedo (Tactil.ts). */
  readonly tactil: Tactil;
  private teclado: HTMLInputElement | null = null;
  /** Lo que tenía el campo invisible la última vez (para saber qué se ha escrito o borrado). */
  private textoTeclado = '';
  private componiendo = false;

  /** ¿Está abierto el teclado de pantalla (el campo invisible tiene el foco)? */
  get tecladoAbierto(): boolean {
    return !!this.teclado && typeof document !== 'undefined' && document.activeElement === this.teclado;
  }

  /** Enfoca el campo invisible (hay que llamarlo dentro de un toque del usuario) con ese texto, en ese punto de la ventana. */
  abrirTeclado(texto: string, x = 0, y = 0): void {
    if (typeof document === 'undefined') return;
    if (!this.teclado) {
      const t = document.createElement('input');
      t.type = 'text';
      t.className = 'teclado-chispa';
      t.setAttribute('aria-label', 'Escribir en el juego');
      t.setAttribute('autocapitalize', 'off');
      t.setAttribute('autocomplete', 'off');
      t.setAttribute('autocorrect', 'off');
      t.setAttribute('enterkeyhint', 'done');
      t.spellcheck = false;
      // (tope: pegar un texto enorme no puede llenar la memoria del juego)
      t.maxLength = MAXIMO_TECLADO;
      // Invisible pero «de verdad»: con 16 px de letra Safari no acerca la página al enfocarlo
      Object.assign(t.style, { position: 'fixed', width: '1px', height: '1px', padding: '0', border: '0', margin: '0', opacity: '0', fontSize: '16px', background: 'transparent', color: 'transparent', caretColor: 'transparent', outline: 'none', zIndex: '-1' });
      t.addEventListener('compositionstart', () => (this.componiendo = true));
      t.addEventListener('compositionend', () => {
        this.componiendo = false;
        this.leerTeclado();
      });
      t.addEventListener('input', () => this.leerTeclado());
      t.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.textoEscrito.push('\n');
          e.preventDefault();
        } else if (e.key === 'Escape') this.textoEscrito.push('\x1b');
      });
      this.eventos.signal.addEventListener('abort', () => t.remove());
      document.body.append(t);
      this.teclado = t;
    }
    const t = this.teclado;
    // Donde se ha tocado: así, si el navegador mueve la página para enseñar el campo, enseña el del juego
    t.style.left = `${Math.max(0, Math.round(x))}px`;
    t.style.top = `${Math.max(0, Math.round(y))}px`;
    t.value = texto;
    this.textoTeclado = texto;
    t.focus({ preventScroll: true });
    try {
      t.setSelectionRange(texto.length, texto.length);
    } catch {
      /* hay navegadores que no dejan en campos invisibles: da igual */
    }
  }

  /** Lo que ha cambiado en el campo invisible desde la última vez, convertido en letras y borrados. */
  private leerTeclado(): void {
    const t = this.teclado;
    if (!t) return;
    if (t.value.length > MAXIMO_TECLADO) t.value = t.value.slice(0, MAXIMO_TECLADO);
    const antes = [...this.textoTeclado];
    const ahora = [...t.value];
    let iguales = 0;
    while (iguales < antes.length && iguales < ahora.length && antes[iguales] === ahora[iguales]) iguales++;
    for (let i = iguales; i < antes.length; i++) this.textoEscrito.push('\b');
    for (let i = iguales; i < ahora.length; i++) this.textoEscrito.push(ahora[i] === '\n' ? '\n' : ahora[i]);
    this.textoTeclado = t.value;
  }

  /** El campo del juego dice qué texto tiene de verdad (puede haber recortado lo escrito): el invisible se pone igual. */
  sincronizarTeclado(texto: string): void {
    const t = this.teclado;
    if (!t || this.componiendo || t.value === texto || this.textoEscrito.length) return;
    t.value = texto;
    this.textoTeclado = texto;
  }

  /** Quita el teclado de pantalla (el campo del juego ha dejado de estar enfocado). */
  cerrarTeclado(): void {
    if (this.tecladoAbierto) this.teclado!.blur();
  }

  private teclasAbajo = new Map<string, string>();
  private pulsadasEsteFotograma = new Set<string>();
  private soltadasEsteFotograma = new Set<string>();

  private botonesAbajo = new Set<BotonRaton>();
  private botonesPulsados = new Set<BotonRaton>();
  private botonesSoltados = new Set<BotonRaton>();

  /** Posición del ratón en coordenadas del juego. */
  posicionRaton = Vector2.cero();
  /** Movimiento de la rueda en este fotograma (positivo = hacia abajo). */
  rueda = 0;
  /** Lo que se ha movido el ratón en este fotograma, en píxeles (Y hacia arriba). Para mirar con el ratón. */
  readonly movimientoRaton = new Vector2(0, 0);
  /** El juego quiere quedarse con el ratón (raton.capturado = verdadero): se pide al navegador en el siguiente clic. */
  private quiereRaton = false;
  private lienzo: HTMLCanvasElement | null = null;

  /** ¿Tiene el juego el ratón capturado ahora mismo? (el navegador lo suelta con Escape) */
  get ratonCapturado(): boolean {
    return typeof document !== 'undefined' && this.lienzo !== null && document.pointerLockElement === this.lienzo;
  }

  /**
   * Pide (o suelta) el ratón: capturado, la flecha desaparece y no se sale del juego, y se lee lo que se mueve
   * (raton.movX). El navegador solo lo concede dentro de un clic: si ahora no deja, se pide otra vez en el siguiente.
   */
  capturarRaton(si: boolean): void {
    this.quiereRaton = si;
    if (typeof document === 'undefined' || !this.lienzo) return;
    if (!si) {
      if (this.ratonCapturado) document.exitPointerLock?.();
      return;
    }
    this.pedirRaton();
  }

  private pedirRaton(): void {
    const l = this.lienzo;
    if (!l || this.ratonCapturado || typeof l.requestPointerLock !== 'function') return;
    try {
      // (devuelve una promesa en los navegadores nuevos: si dice que no, se pedirá en el siguiente clic)
      const r = l.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(() => {});
    } catch {
      /* el navegador no deja ahora: se pide en el siguiente clic */
    }
  }

  /** AbortController permite quitar TODOS los eventos de golpe (útil al parar el juego). */
  private eventos = new AbortController();

  constructor(
    canvas: HTMLCanvasElement,
    /** Función que convierte coordenadas de la ventana a coordenadas del juego. */
    private aCoordenadasJuego: (x: number, y: number) => Vector2,
  ) {
    const signal = this.eventos.signal;
    this.lienzo = canvas;
    this.tactil = new Tactil(this, canvas);
    this.tactil.aJuego = (x, y) => this.aCoordenadasJuego(x, y);
    this.tactil.escalaJuego = () => {
      const a = this.aCoordenadasJuego(0, 0);
      const b = this.aCoordenadasJuego(100, 0);
      return Math.abs(b.x - a.x) / 100 || 1;
    };

    // ── Teclado (en window, para que funcione aunque no hayas hecho clic en el lienzo)
    window.addEventListener(
      'keydown',
      (e) => {
        // Si se está escribiendo en un campo de texto o en el editor de código, la tecla no es para el juego
        if (esCampoDeTexto(e.target) || !this.aceptarTecla(e)) return;
        if (EVITAR_SCROLL.has(e.code)) e.preventDefault();
        if (this.escribiendo) {
          // Mantener una tecla pulsada SÍ repite la letra (como en cualquier campo de texto)
          if (e.key === 'Backspace') this.textoEscrito.push('\b');
          else if (e.key === 'Enter') this.textoEscrito.push('\n');
          else if (e.key === 'Escape') this.textoEscrito.push('\x1b');
          else if ([...e.key].length === 1 && !e.ctrlKey && !e.metaKey) this.textoEscrito.push(e.key);
          if (e.key === 'Backspace' || e.key === ' ') e.preventDefault();
          return;
        }
        if (e.repeat) return; // Mantener pulsada una tecla repite el evento: lo ignoramos.
        const nombre = nombreDesdeEvento(e);
        this.teclasAbajo.set(e.code, nombre);
        this.pulsadasEsteFotograma.add(nombre);
        this.ultimaTecla = nombre;
      },
      { signal },
    );
    window.addEventListener(
      'keyup',
      (e) => {
        const nombre = this.teclasAbajo.get(e.code) ?? nombreDesdeEvento(e);
        this.teclasAbajo.delete(e.code);
        this.soltadasEsteFotograma.add(nombre);
      },
      { signal },
    );
    // Si la ventana pierde el foco (Alt+Tab), no nos llegará el keyup: soltamos todo.
    window.addEventListener('blur', () => this.soltarTodo(), { signal });

    // ── Ratón (usamos "pointer events", que también funcionan con pantallas táctiles)
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        const b = this.botonDesdeEvento(e.button);
        if (!b) return;
        this.botonesAbajo.add(b);
        this.botonesPulsados.add(b);
        this.posicionRaton = this.aCoordenadasJuego(e.clientX, e.clientY);
        // El juego quiere el ratón (raton.capturado): el navegador solo lo da dentro de un clic
        if (this.quiereRaton && e.pointerType === 'mouse') this.pedirRaton();
        // Con el dedo (o un lápiz) sobre un campo de texto del juego: sale el teclado de pantalla
        if (e.pointerType && e.pointerType !== 'mouse') this.tocarZonaDeTexto(e);
      },
      { signal },
    );
    // Algunos navegadores (Safari) solo sacan el teclado si el campo se enfoca al LEVANTAR el dedo
    canvas.addEventListener(
      'pointerup',
      (e) => {
        if (e.pointerType && e.pointerType !== 'mouse' && this.quiereTeclado && !this.tecladoAbierto) this.tocarZonaDeTexto(e);
        this.quiereTeclado = false;
      },
      { signal },
    );
    // Con el teclado fuera, el clic «de ratón» que el navegador manda tras el toque no se lleva el foco al lienzo
    canvas.addEventListener('mousedown', (e) => this.tecladoAbierto && e.preventDefault(), { signal });
    // pointerup y pointermove en window: así detectamos que sueltas aunque salgas del lienzo.
    window.addEventListener(
      'pointerup',
      (e) => {
        const b = this.botonDesdeEvento(e.button);
        if (!b || !this.botonesAbajo.has(b)) return;
        this.botonesAbajo.delete(b);
        this.botonesSoltados.add(b);
      },
      { signal },
    );
    window.addEventListener(
      'pointermove',
      (e) => {
        // Capturado, el ratón no se mueve de sitio: solo cuenta lo que se desplaza
        if (!this.ratonCapturado) this.posicionRaton = this.aCoordenadasJuego(e.clientX, e.clientY);
        if (e.pointerType === 'mouse' || this.ratonCapturado) {
          this.movimientoRaton.x += e.movementX || 0;
          this.movimientoRaton.y -= e.movementY || 0;
        }
      },
      { signal },
    );
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.rueda += Math.sign(e.deltaY);
      },
      { signal, passive: false },
    );
    // Quitamos el menú del clic derecho para poder usar ese botón en los juegos.
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });
  }

  private quiereTeclado = false;
  private tocarZonaDeTexto(e: PointerEvent): void {
    for (const zona of this.zonasDeTexto) {
      const texto = zona();
      if (texto === null) continue;
      this.quiereTeclado = true;
      this.abrirTeclado(texto, e.clientX, e.clientY);
      return;
    }
  }

  // ───────────────────────── Teclado ─────────────────────────

  /** La última tecla que se ha pulsado (su nombre en español), o null si todavía ninguna. */
  ultimaTecla: string | null = null;

  /** ¿Se ha pulsado alguna tecla en este fotograma? */
  algunaSePulso(): boolean {
    return this.pulsadasEsteFotograma.size > 0;
  }

  estaPulsada(tecla: string): boolean {
    const n = this.comprobarTecla(tecla);
    for (const nombre of this.teclasAbajo.values()) if (nombre === n) return true;
    return false;
  }

  sePulso(tecla: string): boolean {
    return this.pulsadasEsteFotograma.has(this.comprobarTecla(tecla));
  }

  seSolto(tecla: string): boolean {
    return this.soltadasEsteFotograma.has(this.comprobarTecla(tecla));
  }

  /** Lista de teclas pulsadas ahora (para depurar). */
  teclasPulsadas(): string[] {
    return [...new Set(this.teclasAbajo.values())];
  }

  // ───────────────────────── Teclas virtuales (mando, botones táctiles) ─────────────────────────

  /** Pulsa una tecla "de mentira" (un botón en la pantalla del móvil, un botón del mando). `id` la identifica para soltarla. */
  pulsarVirtual(id: string, tecla: string): void {
    const clave = `virtual:${id}`;
    if (this.teclasAbajo.get(clave) === tecla) return;
    this.teclasAbajo.set(clave, tecla);
    this.pulsadasEsteFotograma.add(tecla);
    this.ultimaTecla = tecla;
  }

  soltarVirtual(id: string): void {
    const clave = `virtual:${id}`;
    const tecla = this.teclasAbajo.get(clave);
    if (tecla === undefined) return;
    this.teclasAbajo.delete(clave);
    this.soltadasEsteFotograma.add(tecla);
  }

  // ───────────────────────── Mando ─────────────────────────

  /**
   * Los mandos conectados (hasta 4), en el orden en que los da el navegador: el
   * primero es el del jugador 1, el segundo el del jugador 2... De cada uno:
   * sus botones pulsados y las palancas (-1 a 1, la Y positiva hacia arriba).
   */
  readonly mandos: EstadoMando[] = Array.from({ length: MAXIMO_MANDOS }, () => ({ conectado: false, botones: new Set<string>(), pulsados: new Set<string>(), soltados: new Set<string>(), ejeX: 0, ejeY: 0, ejeDerechoX: 0, ejeDerechoY: 0 }));
  /** El primer mando conectado (el del módulo `mando`, y el que hace de teclado). */
  readonly mando = this.mandos[0];
  /**
   * El primer mando hace de teclado (cruceta = flechas, A = espacio...). Con
   * varios jugadores se quita: si no, el mando del jugador 1 movería al 2 (que
   * lleva las flechas).
   */
  private _mandoHaceDeTeclado = true;
  get mandoHaceDeTeclado(): boolean {
    return this._mandoHaceDeTeclado;
  }
  set mandoHaceDeTeclado(v: boolean) {
    if (this._mandoHaceDeTeclado && !v) for (const b of this.mando.botones) if (TECLA_DE_BOTON[b]) this.soltarVirtual(`mando:${b}`);
    this._mandoHaceDeTeclado = v;
  }
  /** Los mandos del navegador, para vibrar. */
  private mandosNavegador: (Gamepad | null)[] = [];

  /** Lee los mandos (el navegador no avisa: hay que preguntarle en cada fotograma). */
  leerMandos(): void {
    const lista = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const conectados = [...lista].filter((x): x is Gamepad => !!x && x.connected).slice(0, MAXIMO_MANDOS);
    this.mandosNavegador = conectados;
    for (let i = 0; i < MAXIMO_MANDOS; i++) {
      const g = conectados[i] ?? null;
      const botones = new Set<string>();
      let [ejeX, ejeY, dx, dy] = [0, 0, 0, 0];
      if (g) {
        g.buttons.forEach((b, n) => {
          if (b.pressed && BOTONES_MANDO[n]) botones.add(BOTONES_MANDO[n]);
        });
        const eje = (n: number) => (Math.abs(g.axes[n] ?? 0) < ZONA_MUERTA ? 0 : (g.axes[n] ?? 0));
        [ejeX, ejeY, dx, dy] = [eje(0), -eje(1), eje(2), -eje(3)];
      }
      this.ponerMando(g !== null, botones, ejeX, ejeY, dx, dy, i);
    }
  }

  /** Aplica el estado de un mando (separado de leerMandos para poder probarlo sin mando de verdad). `indice`: 0 = el primero. */
  ponerMando(conectado: boolean, botones: Set<string>, ejeX: number, ejeY: number, ejeDerechoX = 0, ejeDerechoY = 0, indice = 0): void {
    const m = this.mandos[indice];
    if (!m) return;
    // La palanca también cuenta como la cruceta
    if (ejeX < -0.5) botones.add('izquierda');
    if (ejeX > 0.5) botones.add('derecha');
    if (ejeY > 0.5) botones.add('arriba');
    if (ejeY < -0.5) botones.add('abajo');
    m.pulsados = new Set([...botones].filter((b) => !m.botones.has(b)));
    // Se está jugando con un mando: los controles de la pantalla sobran (vuelven al tocarla)
    if (m.pulsados.size) this.tactil.usandoDedo(false);
    m.soltados = new Set([...m.botones].filter((b) => !botones.has(b)));
    // Solo el primer mando hace de teclado (y solo si no hay varios jugadores)
    if (indice === 0 && this._mandoHaceDeTeclado) {
      for (const b of m.soltados) if (TECLA_DE_BOTON[b]) this.soltarVirtual(`mando:${b}`);
      for (const b of m.pulsados) if (TECLA_DE_BOTON[b]) this.pulsarVirtual(`mando:${b}`, TECLA_DE_BOTON[b]);
    }
    Object.assign(m, { conectado, botones, ejeX, ejeY, ejeDerechoX, ejeDerechoY });
  }

  /** Hace vibrar un mando (si el navegador y el mando saben). */
  vibrar(segundos: number, fuerza = 1, indice = 0): void {
    const actuador = (this.mandosNavegador[indice] as (Gamepad & { vibrationActuator?: { playEffect(t: string, o: object): Promise<unknown> } }) | null | undefined)?.vibrationActuator;
    void actuador?.playEffect('dual-rumble', { duration: segundos * 1000, strongMagnitude: fuerza, weakMagnitude: fuerza }).catch(() => {});
  }

  // ───────────────────────── Ratón ─────────────────────────

  ratonPulsado(boton: BotonRaton = 'izquierdo'): boolean {
    return this.botonesAbajo.has(boton);
  }

  ratonSePulso(boton: BotonRaton = 'izquierdo'): boolean {
    return this.botonesPulsados.has(boton);
  }

  ratonSeSolto(boton: BotonRaton = 'izquierdo'): boolean {
    return this.botonesSoltados.has(boton);
  }

  // ───────────────────────── Ciclo ─────────────────────────

  /** El motor lo llama al terminar cada fotograma: borra lo que solo dura un fotograma. */
  finDeFotograma(): void {
    this.pulsadasEsteFotograma.clear();
    this.tactil.finDeFotograma();
    this.textoEscrito = [];
    this.soltadasEsteFotograma.clear();
    this.botonesPulsados.clear();
    this.botonesSoltados.clear();
    for (const m of this.mandos) {
      m.pulsados.clear();
      m.soltados.clear();
    }
    this.rueda = 0;
    this.movimientoRaton.x = 0;
    this.movimientoRaton.y = 0;
  }

  /** Quita todos los eventos del navegador. */
  destruir(): void {
    if (this.ratonCapturado) document.exitPointerLock?.();
    this.tactil.destruir();
    this.eventos.abort();
  }

  private soltarTodo(): void {
    for (const nombre of this.teclasAbajo.values()) this.soltadasEsteFotograma.add(nombre);
    this.teclasAbajo.clear();
    for (const b of this.botonesAbajo) this.botonesSoltados.add(b);
    this.botonesAbajo.clear();
  }

  private botonDesdeEvento(boton: number): BotonRaton | null {
    return boton === 0 ? 'izquierdo' : boton === 1 ? 'medio' : boton === 2 ? 'derecho' : null;
  }

  /**
   * validarTecla / comprobarTecla:
   * Normaliza el nombre y avisa si parece un error de escritura.
   * Ejemplo: "espaico" → error amable en vez de devolver siempre "falso" sin decir nada.
   */
  validarTecla(tecla: string): string {
    return this.comprobarTecla(tecla);
  }

  private comprobarTecla(tecla: string): string {
    return comprobarNombreTecla(tecla);
  }
}
