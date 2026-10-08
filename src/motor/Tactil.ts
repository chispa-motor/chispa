/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * JUGAR CON EL DEDO: los controles que se ponen encima del juego en un móvil
 * o una tableta, y los gestos. Son GENERALES: sirven para cualquier juego.
 *
 *  - Un JOYSTICK (una palanca que se arrastra con el pulgar). Hace lo mismo
 *    que las flechas, así que «yo.moverConFlechas» funciona sin cambiar nada;
 *    y además dice cuánto está inclinado (despacio o deprisa).
 *  - BOTONES. Cada uno puede pulsar una tecla («Saltar» pulsa espacio): el
 *    juego no distingue el botón de la tecla de verdad.
 *  - ARRASTRAR PARA MIRAR: lo que se mueve el dedo por la pantalla, para
 *    apuntar o mover la cámara.
 *  - GESTOS: un toque, dos toques, dedo quieto, deslizar hacia un lado y
 *    pellizcar.
 *
 * Los controles son elementos de la página puestos encima del lienzo (no se
 * dibujan dentro del juego): así se ven nítidos, se pueden tocar varios a la
 * vez y pueden estar en las bandas negras de los lados.
 *
 * SOLO SALEN CUANDO TOCAN: en un aparato que se maneja con el dedo, o en
 * cuanto alguien toca la pantalla de un ordenador táctil. Si luego se usa un
 * teclado o un mando, se esconden. (Se puede cambiar con `mostrar`.)
 *
 * Quien juega puede MOVERLOS a su gusto (modo colocar) y se le recuerda.
 */

/** Lo que este módulo necesita de la entrada del motor (las teclas «de mentira»). */
export interface TeclasVirtuales {
  pulsarVirtual(id: string, tecla: string): void;
  soltarVirtual(id: string): void;
}

export type LadoJoystick = 'izquierda' | 'derecha';
export type CuandoMostrar = 'auto' | 'siempre' | 'nunca';
export type Gesto = '' | 'toque' | 'doble' | 'largo' | 'arriba' | 'abajo' | 'izquierda' | 'derecha';
export const GESTOS: Gesto[] = ['toque', 'doble', 'largo', 'arriba', 'abajo', 'izquierda', 'derecha'];
export type Orientacion = 'cualquiera' | 'horizontal' | 'vertical';
export const ORIENTACIONES: Orientacion[] = ['cualquiera', 'horizontal', 'vertical'];

/** Como mucho, estos botones en pantalla (más no caben en un móvil, y un script en bucle no debe llenar la página). */
export const MAXIMO_BOTONES = 12;
/** Letras de un botón, como mucho. */
export const LETRAS_BOTON = 12;
/** Por debajo de esto (de 0 a 1), la palanca no cuenta: el pulgar nunca está quieto del todo. */
export const ZONA_MUERTA = 0.18;
/** A partir de esto, la palanca «pulsa» la flecha de ese lado. */
export const UMBRAL_FLECHA = 0.45;
/** Tamaño de los controles: de la mitad al doble. */
export const TAMANO_MINIMO = 0.5;
export const TAMANO_MAXIMO = 2;
/** Gestos: cuánto dura un toque como mucho, cuánto hay que esperar para «largo» y cuánto hay que deslizar. */
export const MS_TOQUE = 300;
export const MS_DOBLE = 320;
export const MS_LARGO = 550;
export const PX_DESLIZAR = 40;
export const PX_QUIETO = 12;

/** ¿Es un aparato que se maneja con el dedo? (un móvil o una tableta sin ratón) */
export function esAparatoTactil(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/**
 * Dónde está el centro de un control: en tanto por uno de la capa (x desde la izquierda, y desde
 * ABAJO), más unos píxeles (dx, dy) que crecen con el tamaño de los controles. Así «abajo a la
 * derecha» es x: 1, y: 0 con dx negativo, y queda igual de cerca del borde en un móvil y en una tableta.
 */
export interface SitioControl {
  x: number;
  y: number;
  dx?: number;
  dy?: number;
}

interface Boton {
  nombre: string;
  /** La tecla que pulsa (o '' si solo se pregunta con tactil.pulsado). */
  teclas: string[];
  el: HTMLElement;
  abajo: boolean;
  sePulso: boolean;
  seSolto: boolean;
  sitio: SitioControl;
  /** Lo ha puesto Chispa solo, mirando las teclas del juego (se quitan si el script pone los suyos). */
  automatico: boolean;
}

interface Palanca {
  lado: LadoJoystick;
  el: HTMLElement;
  pomo: HTMLElement;
  sitio: SitioControl;
  /** Pulsa las flechas (lo normal) o solo da su inclinación. */
  flechas: boolean;
  puntero: number | null;
}

/**
 * De dónde bajó cada dedo en el lienzo (para los gestos y para mirar).
 * x, y: en píxeles de la ventana.
 */
interface Dedo {
  x: number;
  y: number;
  x0: number;
  y0: number;
  t0: number;
  movido: boolean;
}

const limitar = (n: number, min: number, max: number): number => (n >= min ? Math.min(max, n) : min);

/** La inclinación de la palanca (de -1 a 1 en cada eje, la Y hacia ARRIBA) para un dedo a (dx, dy) píxeles del centro. */
export function inclinacion(dx: number, dy: number, radio: number): { x: number; y: number } {
  const largo = Math.hypot(dx, dy);
  if (!(radio > 0) || largo / radio < ZONA_MUERTA) return { x: 0, y: 0 };
  const f = Math.min(1, largo / radio) / largo;
  return { x: dx * f, y: -dy * f };
}

/** El gesto que hace un dedo que se ha movido (dx, dy) píxeles en `ms` milisegundos, al levantarlo. */
export function gestoAlLevantar(dx: number, dy: number, ms: number): Gesto {
  const largo = Math.hypot(dx, dy);
  if (largo >= PX_DESLIZAR) return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : dy > 0 ? 'abajo' : 'arriba';
  if (largo <= PX_QUIETO && ms <= MS_TOQUE) return 'toque';
  return '';
}

export class Tactil {
  /** La palanca: de -1 a 1 en cada eje (la Y positiva, hacia arriba). 0 si no hay o no se toca. */
  x = 0;
  y = 0;
  /** Arrastrar para mirar: lo que se ha movido el dedo en este fotograma, en píxeles del juego (la Y hacia arriba). */
  miraX = 0;
  miraY = 0;
  /** El gesto que ha pasado en este fotograma ('' = ninguno). */
  gesto: Gesto = '';
  /** Pellizcar: cuánto se han separado los dos dedos en este fotograma (1 = igual, 2 = el doble de separados). */
  pellizco = 1;
  /** Si se pide una orientación y el aparato está al revés, sale un aviso de «gira el móvil». */
  private _orientacion: Orientacion = 'cualquiera';
  private _mostrar: CuandoMostrar = 'auto';
  private _tamano = 1;
  private _opacidad = 0.6;

  private capa: HTMLElement | null = null;
  private botones = new Map<string, Boton>();
  private palanca: Palanca | null = null;
  private mirando = false;
  private colocando = false;
  private barraColocar: HTMLElement | null = null;
  private avisoGirar: HTMLElement | null = null;
  private dedos = new Map<number, Dedo>();
  private ultimoToque = -Infinity;
  /** En este gesto ha habido dos dedos (pellizcar): al levantarlos no cuenta como toque ni como deslizar. */
  private huboDos = false;
  private temporizadorLargo: ReturnType<typeof setTimeout> | null = null;
  private distanciaPellizco = 0;
  /** ¿Se está usando el dedo? (lo último que se ha usado: el dedo, o el teclado o un mando) */
  private conDedo = esAparatoTactil();
  private eventos = new AbortController();
  /** Dónde ha dejado cada control quien juega (se guarda entre partidas). */
  // (sin «padre»: un botón llamado "constructor" o "__proto__" no encuentra nada que no sea suyo)
  private colocados: Record<string, SitioControl> = Object.create(null) as Record<string, SitioControl>;
  /** Para guardar y leer dónde ha dejado los controles quien juega (lo pone el juego). */
  almacen: { leer(): string | null; guardar(texto: string): void } | null = null;
  /** Convierte un punto de la ventana en un punto del juego (para los dedos y para mirar). */
  aJuego: (x: number, y: number) => { x: number; y: number } = (x, y) => ({ x, y });
  /** Cuántos píxeles del juego es un píxel de la ventana (para «mirar»). */
  escalaJuego: () => number = () => 1;

  constructor(
    private entrada: TeclasVirtuales,
    private canvas: HTMLElement | null,
  ) {
    if (!canvas || typeof window === 'undefined') return;
    const o = { signal: this.eventos.signal };
    canvas.addEventListener('pointerdown', (e) => this.dedoBaja(e), o);
    window.addEventListener('pointermove', (e) => this.dedoSeMueve(e), o);
    window.addEventListener('pointerup', (e) => this.dedoSube(e), o);
    window.addEventListener('pointercancel', (e) => this.dedoSube(e, true), o);
    // Solo salen cuando tocan: con el dedo se enseñan; con el teclado, se esconden
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') this.usandoDedo(true);
    }, { ...o, capture: true });
    window.addEventListener('keydown', (e) => {
      // (el campo invisible del teclado de pantalla no cuenta: eso también es jugar con el dedo)
      if (!(e.target as HTMLElement | null)?.classList?.contains('teclado-chispa') && e.key !== 'Unidentified') this.usandoDedo(false);
    }, o);
    window.addEventListener('resize', () => {
      this.ajustarAlAncho();
      this.revisarOrientacion();
    }, o);
  }

  // ───────────────────────── Cuándo se ven ─────────────────────────

  /** ¿Es un aparato táctil, o se está usando el dedo ahora mismo? */
  get hay(): boolean {
    return this.conDedo || esAparatoTactil();
  }

  get mostrar(): CuandoMostrar {
    return this._mostrar;
  }
  set mostrar(v: CuandoMostrar) {
    this._mostrar = v;
    this.actualizarVista();
  }

  /** ¿Se ven ahora los controles? */
  get visibles(): boolean {
    return this._mostrar === 'siempre' || (this._mostrar === 'auto' && this.conDedo);
  }

  /** Se acaba de usar el dedo (verdadero) o el teclado o un mando (falso). */
  usandoDedo(si: boolean): void {
    if (this.conDedo === si) return;
    this.conDedo = si;
    if (!si) this.soltarTodo();
    this.actualizarVista();
    this.revisarOrientacion();
  }

  get tamano(): number {
    return this._tamano;
  }
  set tamano(v: number) {
    this._tamano = limitar(v, TAMANO_MINIMO, TAMANO_MAXIMO);
    this.capa?.style.setProperty('--tamano-tactil', String(this._tamano));
  }

  get opacidad(): number {
    return this._opacidad;
  }
  set opacidad(v: number) {
    this._opacidad = limitar(v, 0.1, 1);
    this.capa?.style.setProperty('--opacidad-tactil', String(this._opacidad));
  }

  private actualizarVista(): void {
    if (!this.capa) return;
    this.ajustarAlAncho();
    const controles = this.visibles || this.colocando;
    // (el aviso de girar el móvil va en la misma capa: se ve aunque no haya controles)
    this.capa.classList.toggle('sin-controles', !controles);
    this.capa.hidden = !controles && !this.avisoGirar;
  }

  // ───────────────────────── La capa (donde van los controles) ─────────────────────────

  /**
   * En pantallas estrechas (un móvil pequeño de pie, la vista del juego del editor) los controles
   * se encogen para no pisarse: la palanca y dos botones necesitan unos 400 px de ancho a tamaño normal.
   * Nunca bajan de 44 px (ENCOGE_MINIMO × 72 px del botón).
   */
  private ajustarAlAncho(): void {
    const ancho = this.capa?.clientWidth ?? 0;
    this.capa?.style.setProperty('--encoge', String(encogeParaAncho(ancho)));
  }

  /** La capa de encima del lienzo. Se crea la primera vez que hace falta. */
  private laCapa(): HTMLElement | null {
    if (this.capa) return this.capa;
    const padre = this.canvas?.parentElement;
    if (!padre || typeof document === 'undefined') return null;
    const capa = document.createElement('div');
    capa.className = 'controles-tactiles';
    capa.style.setProperty('--tamano-tactil', String(this._tamano));
    capa.style.setProperty('--opacidad-tactil', String(this._opacidad));
    // Los estilos van en la página del juego exportado (con su huella en la política de seguridad).
    // Si no están (en el editor, en las pruebas), se ponen aquí.
    if (!document.querySelector('style[data-controles-tactiles]')) {
      const estilo = document.createElement('style');
      estilo.dataset.controlesTactiles = '';
      estilo.textContent = ESTILOS_TACTILES;
      document.head.appendChild(estilo);
    }
    if (typeof getComputedStyle === 'function' && getComputedStyle(padre).position === 'static') padre.style.position = 'relative';
    padre.appendChild(capa);
    this.capa = capa;
    this.leerColocados();
    this.actualizarVista();
    return capa;
  }

  /** Pone un control en su sitio (el que le dio quien juega, si lo movió). */
  private situar(el: HTMLElement, id: string, sitio: SitioControl): void {
    const s = this.colocados[id] ?? sitio;
    // El sitio va en variables; los estilos lo convierten en left y bottom SIN dejar que se salga de la pantalla
    // (su centro se queda, como poco, a medio control del borde: --medio)
    el.style.setProperty('--x', `${(limitar(s.x, 0, 1) * 100).toFixed(2)}%`);
    el.style.setProperty('--y', `${(limitar(s.y, 0, 1) * 100).toFixed(2)}%`);
    el.style.setProperty('--dx', `${Math.round(s.dx ?? 0)}px`);
    el.style.setProperty('--dy', `${Math.round(s.dy ?? 0)}px`);
  }

  // ───────────────────────── La palanca ─────────────────────────

  /** Pone la palanca (si ya había una, la cambia). `flechas`: además pulsa las flechas (para moverConFlechas). */
  joystick(lado: LadoJoystick = 'izquierda', flechas = true): void {
    this.quitarAutomaticos();
    const capa = this.laCapa();
    this.quitarJoystick();
    // (sin página donde ponerla —en las pruebas—, la palanca existe igual: se puede inclinar con ponerPalanca)
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = 'palanca-tactil';
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', 'Palanca para moverse');
    el.dataset.control = 'joystick';
    const pomo = document.createElement('div');
    pomo.className = 'pomo-tactil';
    el.appendChild(pomo);
    const p: Palanca = { lado, el, pomo, flechas, puntero: null, sitio: lado === 'izquierda' ? { x: 0, y: 0, dx: 96, dy: 100 } : { x: 1, y: 0, dx: -96, dy: 100 } };
    this.palanca = p;
    this.situar(el, 'joystick', p.sitio);
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const radio = r.width / 2 || 60;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const v = inclinacion(dx, dy, radio);
      this.ponerPalanca(v.x, v.y);
      const largo = Math.hypot(dx, dy);
      const f = largo > radio ? radio / largo : 1;
      pomo.style.transform = `translate(${(dx * f).toFixed(1)}px, ${(dy * f).toFixed(1)}px)`;
    };
    el.addEventListener('pointerdown', (e) => {
      if (this.colocando) return this.empezarAColocar(e, el, 'joystick');
      e.preventDefault();
      p.puntero = e.pointerId;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('pulsado');
      mover(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (p.puntero === e.pointerId) mover(e);
    });
    const soltar = (e: PointerEvent) => {
      if (p.puntero !== e.pointerId) return;
      p.puntero = null;
      el.classList.remove('pulsado');
      pomo.style.transform = '';
      this.ponerPalanca(0, 0);
    };
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
    capa?.appendChild(el);
  }

  /** ¿Hay una palanca puesta? */
  get conJoystick(): boolean {
    return !!this.palanca;
  }

  /** La inclinación de la palanca (y las flechas que «pulsa»). Lo llaman los dedos; también sirve para probar. */
  ponerPalanca(x: number, y: number): void {
    this.x = limitar(x, -1, 1);
    this.y = limitar(y, -1, 1);
    if (!this.palanca?.flechas) return;
    const flecha = (tecla: string, pulsada: boolean) => (pulsada ? this.entrada.pulsarVirtual(`palanca:${tecla}`, tecla) : this.entrada.soltarVirtual(`palanca:${tecla}`));
    flecha('derecha', this.x > UMBRAL_FLECHA);
    flecha('izquierda', this.x < -UMBRAL_FLECHA);
    flecha('arriba', this.y > UMBRAL_FLECHA);
    flecha('abajo', this.y < -UMBRAL_FLECHA);
  }

  private quitarJoystick(): void {
    if (!this.palanca) return;
    this.ponerPalanca(0, 0);
    this.palanca.el.remove();
    this.palanca = null;
  }

  // ───────────────────────── Los botones ─────────────────────────

  /**
   * Pone un botón. `teclas`: las que pulsa (ninguna = solo se pregunta con `pulsado`).
   * Si ya había uno con ese nombre, se cambia. Devuelve falso si ya no caben más.
   */
  boton(nombre: string, teclas: string[] = [], opciones: { texto?: string; clase?: string; sitio?: SitioControl; automatico?: boolean } = {}): boolean {
    if (!opciones.automatico) this.quitarAutomaticos();
    const capa = this.laCapa();
    const clave = nombre.toLowerCase();
    const viejo = this.botones.get(clave);
    if (!viejo && this.botones.size >= MAXIMO_BOTONES) return false;
    if (viejo) this.quitarBoton(clave);
    if (typeof document === 'undefined') return true;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `boton-tactil ${opciones.clase ?? ''}`.trim();
    el.textContent = [...(opciones.texto ?? nombre)].slice(0, LETRAS_BOTON).join('');
    el.setAttribute('aria-label', nombre);
    el.dataset.control = clave;
    // Los que no dicen dónde van se reparten desde la esquina de abajo a la derecha, en filas de tres
    const n = [...this.botones.values()].filter((b) => !b.automatico || opciones.automatico).length;
    // (si la palanca está a la derecha, los botones van a la izquierda)
    const aLaDerecha = this.palanca?.lado !== 'derecha';
    const sitio = opciones.sitio ?? { x: aLaDerecha ? 1 : 0, y: 0, dx: (aLaDerecha ? -1 : 1) * (56 + (n % 3) * 88), dy: 60 + Math.floor(n / 3) * 88 };
    const b: Boton = { nombre, teclas, el, abajo: false, sePulso: false, seSolto: false, sitio, automatico: !!opciones.automatico };
    this.botones.set(clave, b);
    this.situar(el, clave, sitio);
    el.addEventListener('pointerdown', (e) => {
      if (this.colocando) return this.empezarAColocar(e, el, clave);
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      this.pulsar(clave, true);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) el.addEventListener(ev, () => this.pulsar(clave, false));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    capa?.appendChild(el);
    return true;
  }

  /** Pulsa o suelta un botón (lo hace el dedo; también sirve para probar). */
  pulsar(nombre: string, abajo: boolean): void {
    const b = this.botones.get(nombre.toLowerCase());
    if (!b || b.abajo === abajo) return;
    b.abajo = abajo;
    if (abajo) b.sePulso = true;
    else b.seSolto = true;
    b.el.classList.toggle('pulsado', abajo);
    b.teclas.forEach((t, i) => (abajo ? this.entrada.pulsarVirtual(`tactil:${b.nombre}:${i}`, t) : this.entrada.soltarVirtual(`tactil:${b.nombre}:${i}`)));
  }

  existe(nombre: string): boolean {
    return this.botones.has(nombre.toLowerCase());
  }
  pulsado(nombre: string): boolean {
    return this.botones.get(nombre.toLowerCase())?.abajo ?? false;
  }
  sePulso(nombre: string): boolean {
    return this.botones.get(nombre.toLowerCase())?.sePulso ?? false;
  }
  seSolto(nombre: string): boolean {
    return this.botones.get(nombre.toLowerCase())?.seSolto ?? false;
  }
  /** Los nombres de los botones que hay. */
  get nombres(): string[] {
    return [...this.botones.values()].map((b) => b.nombre);
  }

  private quitarBoton(clave: string): void {
    const b = this.botones.get(clave);
    if (!b) return;
    this.pulsar(clave, false);
    b.el.remove();
    this.botones.delete(clave);
  }

  /** Los botones que puso Chispa solo se quitan en cuanto el juego pone los suyos. */
  private quitarAutomaticos(): void {
    for (const [clave, b] of [...this.botones]) if (b.automatico) this.quitarBoton(clave);
  }

  /** ¿Ha puesto el juego (su script) algún control suyo? */
  get conControlesPropios(): boolean {
    return !!this.palanca || [...this.botones.values()].some((b) => !b.automatico) || this.mirando;
  }

  /** Quita un control ("joystick" o el nombre de un botón), o todos si no se dice cuál. */
  quitar(nombre?: string): void {
    if (nombre === undefined) {
      this.quitarJoystick();
      for (const clave of [...this.botones.keys()]) this.quitarBoton(clave);
      this.mirando = false;
      return;
    }
    if (nombre.toLowerCase() === 'joystick') return this.quitarJoystick();
    this.quitarBoton(nombre.toLowerCase());
  }

  /** Mueve un control a un sitio de la pantalla: x de 0 (izquierda) a 100 (derecha), y de 0 (abajo) a 100 (arriba). */
  mover(nombre: string, x: number, y: number): boolean {
    const clave = nombre.toLowerCase();
    const sitio = { x: limitar(x, 0, 100) / 100, y: limitar(y, 0, 100) / 100 };
    if (clave === 'joystick' && this.palanca) {
      this.palanca.sitio = sitio;
      this.situar(this.palanca.el, 'joystick', sitio);
      return true;
    }
    const b = this.botones.get(clave);
    if (!b) return false;
    b.sitio = sitio;
    this.situar(b.el, clave, sitio);
    return true;
  }

  // ───────────────────────── Mirar y gestos (dedos sobre el lienzo) ─────────────────────────

  /** Activa o apaga «arrastrar para mirar». */
  mirar(activar = true): void {
    if (activar) this.quitarAutomaticos();
    this.mirando = activar;
    if (!activar) this.miraX = this.miraY = 0;
  }

  /** Dónde está cada dedo que toca el lienzo ahora, en coordenadas del juego. */
  get toques(): { x: number; y: number }[] {
    return [...this.dedos.values()].map((d) => this.aJuego(d.x, d.y));
  }

  private dedoBaja(e: PointerEvent): void {
    if (e.pointerType !== 'touch' || this.dedos.size >= 5) return;
    const ahora = performance.now();
    this.dedos.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: ahora, movido: false });
    if (this.temporizadorLargo) clearTimeout(this.temporizadorLargo);
    this.temporizadorLargo = null;
    if (this.dedos.size === 1) {
      this.temporizadorLargo = setTimeout(() => {
        const d = this.dedos.get(e.pointerId);
        if (d && !d.movido && this.dedos.size === 1) {
          this.gesto = 'largo';
          d.movido = true; // al levantarlo ya no cuenta como toque
        }
      }, MS_LARGO);
    } else if (this.dedos.size === 2) {
      this.huboDos = true;
      this.distanciaPellizco = this.separacion();
    }
  }

  private separacion(): number {
    const [a, b] = [...this.dedos.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private dedoSeMueve(e: PointerEvent): void {
    const d = this.dedos.get(e.pointerId);
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    if (Math.hypot(d.x - d.x0, d.y - d.y0) > PX_QUIETO) d.movido = true;
    if (this.dedos.size === 2) {
      const ahora = this.separacion();
      if (this.distanciaPellizco > 20 && ahora > 20) this.pellizco *= ahora / this.distanciaPellizco;
      this.distanciaPellizco = ahora;
      return;
    }
    if (this.mirando && this.dedos.size === 1) {
      const k = this.escalaJuego();
      this.miraX += dx * k;
      this.miraY -= dy * k;
    }
  }

  private dedoSube(e: PointerEvent, cancelado = false): void {
    const d = this.dedos.get(e.pointerId);
    if (!d) return;
    this.dedos.delete(e.pointerId);
    if (this.temporizadorLargo) clearTimeout(this.temporizadorLargo);
    this.temporizadorLargo = null;
    if (this.dedos.size > 0) return;
    const fueConDos = this.huboDos;
    this.huboDos = false;
    if (cancelado || fueConDos) return;
    const ahora = performance.now();
    const g = d.movido && Math.hypot(d.x - d.x0, d.y - d.y0) < PX_DESLIZAR ? '' : gestoAlLevantar(d.x - d.x0, d.y - d.y0, ahora - d.t0);
    if (g === 'toque') {
      this.gesto = ahora - this.ultimoToque <= MS_DOBLE ? 'doble' : 'toque';
      this.ultimoToque = this.gesto === 'doble' ? -Infinity : ahora;
    } else if (g) this.gesto = g;
  }

  /** Hace como si hubiera pasado un gesto (para las pruebas y para el editor). */
  hacerGesto(g: Gesto): void {
    this.gesto = g;
  }

  // ───────────────────────── Que quien juega los coloque a su gusto ─────────────────────────

  get colocandoAhora(): boolean {
    return this.colocando;
  }

  /** Entra (o sale) del modo colocar: los controles se arrastran en vez de pulsarse. */
  colocar(activar = true): void {
    if (this.colocando === activar) return;
    const capa = this.laCapa();
    this.colocando = activar;
    this.soltarTodo();
    if (!capa) return;
    capa.classList.toggle('colocando', activar);
    this.barraColocar?.remove();
    this.barraColocar = null;
    if (activar) {
      const barra = document.createElement('div');
      barra.className = 'barra-colocar';
      const texto = document.createElement('span');
      texto.textContent = 'Arrastra los controles a donde quieras';
      const boton = (t: string, accion: () => void) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t;
        b.addEventListener('click', accion);
        return b;
      };
      barra.append(texto, boton('Como estaban', () => this.olvidarColocados()), boton('Listo', () => this.colocar(false)));
      capa.appendChild(barra);
      this.barraColocar = barra;
    }
    this.actualizarVista();
  }

  private empezarAColocar(e: PointerEvent, el: HTMLElement, id: string): void {
    const capa = this.capa;
    if (!capa) return;
    e.preventDefault();
    el.setPointerCapture?.(e.pointerId);
    const mover = (ev: PointerEvent) => {
      const r = capa.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const sitio = { x: limitar((ev.clientX - r.left) / r.width, 0.04, 0.96), y: limitar(1 - (ev.clientY - r.top) / r.height, 0.06, 0.94) };
      this.colocados[id] = sitio;
      this.situar(el, id, sitio);
    };
    const soltar = () => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      this.guardarColocados();
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  }

  /** Dónde ha dejado quien juega un control (o null si no lo ha movido). */
  colocadoEn(nombre: string): SitioControl | null {
    return this.colocados[nombre.toLowerCase()] ?? null;
  }

  /** Deja un control donde diga quien juega (lo que hace arrastrarlo en el modo colocar). */
  dejarEn(nombre: string, sitio: SitioControl): void {
    const clave = nombre.toLowerCase();
    this.colocados[clave] = { x: limitar(sitio.x, 0, 1), y: limitar(sitio.y, 0, 1) };
    const el = clave === 'joystick' ? this.palanca?.el : this.botones.get(clave)?.el;
    if (el) this.situar(el, clave, this.colocados[clave]);
    this.guardarColocados();
  }

  private olvidarColocados(): void {
    this.colocados = Object.create(null) as Record<string, SitioControl>;
    this.guardarColocados();
    if (this.palanca) this.situar(this.palanca.el, 'joystick', this.palanca.sitio);
    for (const [clave, b] of this.botones) this.situar(b.el, clave, b.sitio);
  }

  private guardarColocados(): void {
    try {
      this.almacen?.guardar(JSON.stringify(this.colocados));
    } catch {
      /* sin sitio donde guardar: se recuerdan mientras dure la partida */
    }
  }

  /** Lee lo guardado. Solo vale lo que tiene buena pinta (dos números de 0 a 1 por control, y pocos controles). */
  leerColocados(): void {
    let datos: unknown;
    try {
      datos = JSON.parse(this.almacen?.leer() ?? '{}');
    } catch {
      return;
    }
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return;
    const limpio: Record<string, SitioControl> = Object.create(null) as Record<string, SitioControl>;
    for (const [clave, v] of Object.entries(datos as Record<string, unknown>).slice(0, MAXIMO_BOTONES + 1)) {
      const s = v as { x?: unknown; y?: unknown } | null;
      if (clave.length <= 40 && s && typeof s.x === 'number' && typeof s.y === 'number' && s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1) limpio[clave] = { x: s.x, y: s.y };
    }
    this.colocados = limpio;
  }

  // ───────────────────────── Orientación (aviso de «gira el móvil») ─────────────────────────

  get orientacion(): Orientacion {
    return this._orientacion;
  }
  set orientacion(v: Orientacion) {
    this._orientacion = v;
    this.revisarOrientacion();
  }

  /** ¿Está la pantalla al revés de como pide el juego? (solo cuenta en aparatos que se giran: los táctiles) */
  get malGirado(): boolean {
    if (this._orientacion === 'cualquiera' || !this.hay || typeof window === 'undefined') return false;
    const tumbado = window.innerWidth >= window.innerHeight;
    return this._orientacion === 'horizontal' ? !tumbado : tumbado;
  }

  /** Pone o quita el aviso de girar el aparato. */
  revisarOrientacion(): void {
    const mal = this.malGirado;
    if (!mal) {
      this.avisoGirar?.remove();
      this.avisoGirar = null;
      this.actualizarVista();
      return;
    }
    if (this.avisoGirar) return;
    const capa = this.laCapa();
    if (!capa) return;
    const aviso = document.createElement('div');
    aviso.className = 'aviso-girar';
    aviso.setAttribute('role', 'alert');
    const dibujo = document.createElement('div');
    dibujo.className = `movil-girando ${this._orientacion}`;
    const texto = document.createElement('p');
    texto.textContent = this._orientacion === 'horizontal' ? 'Gira el móvil: este juego se juega tumbado' : 'Gira el móvil: este juego se juega de pie';
    aviso.append(dibujo, texto);
    // El aviso va en la página entera (no solo encima del lienzo) y por delante de todo
    capa.appendChild(aviso);
    this.avisoGirar = aviso;
    this.actualizarVista();
  }

  // ───────────────────────── Vibrar ─────────────────────────

  /** Hace vibrar el aparato (si sabe). Devuelve si lo ha intentado. */
  vibrar(segundos: number): boolean {
    try {
      return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && navigator.vibrate(Math.round(limitar(segundos, 0, 5) * 1000));
    } catch {
      return false;
    }
  }

  // ───────────────────────── Cada fotograma ─────────────────────────

  /** Borra lo que solo dura un fotograma (el gesto, lo que se ha movido el dedo, los botones recién pulsados). */
  finDeFotograma(): void {
    this.gesto = '';
    this.miraX = 0;
    this.miraY = 0;
    this.pellizco = 1;
    for (const b of this.botones.values()) b.sePulso = b.seSolto = false;
  }

  private soltarTodo(): void {
    for (const clave of this.botones.keys()) this.pulsar(clave, false);
    if (this.palanca) {
      this.palanca.puntero = null;
      this.palanca.pomo.style.transform = '';
      this.palanca.el.classList.remove('pulsado');
    }
    this.ponerPalanca(0, 0);
    this.dedos.clear();
  }

  /** Quita todo de la página (al parar el juego). */
  destruir(): void {
    this.eventos.abort();
    if (this.temporizadorLargo) clearTimeout(this.temporizadorLargo);
    this.soltarTodo();
    this.capa?.remove();
    this.capa = null;
    this.botones.clear();
    this.palanca = null;
  }
}

/** El ancho con el que los controles caben a tamaño normal, y cuánto se encogen como mucho. */
export const ANCHO_COMODO = 400;
export const ENCOGE_MINIMO = 0.62;

/** Cuánto hay que encoger los controles en una pantalla de este ancho (1 = nada). Sin medida (0), nada. */
export function encogeParaAncho(ancho: number): number {
  if (!(ancho > 0)) return 1;
  return Math.round(limitar(ancho / ANCHO_COMODO, ENCOGE_MINIMO, 1) * 100) / 100;
}

/**
 * Los estilos de los controles. Van aparte porque el juego exportado tiene que
 * poner su huella en la política de seguridad (ver exportar.ts): si cambian,
 * la huella cambia sola.
 */
export const ESTILOS_TACTILES = `
.controles-tactiles{position:absolute;inset:0;z-index:10;pointer-events:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;--t:calc(var(--tamano-tactil,1)*var(--encoge,1));--o:var(--opacidad-tactil,.6);overflow:hidden}
.controles-tactiles[hidden]{display:none}
.controles-tactiles.sin-controles>.boton-tactil,.controles-tactiles.sin-controles>.palanca-tactil{display:none}
.controles-tactiles>*{pointer-events:auto;touch-action:none}
.boton-tactil{--medio:max(22px,calc(36px*var(--t)));position:absolute;left:clamp(var(--medio),calc(var(--x,50%) + var(--dx,0px)*var(--t)),calc(100% - var(--medio)));bottom:clamp(var(--medio),calc(var(--y,50%) + var(--dy,0px)*var(--t)),calc(100% - var(--medio)));transform:translate(-50%,50%);width:calc(72px*var(--t));height:calc(72px*var(--t));min-width:44px;min-height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.6);background:rgba(20,24,40,.5);color:#fff;font:bold calc(14px*var(--t)) system-ui,sans-serif;opacity:var(--o);padding:0 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;-webkit-tap-highlight-color:transparent}
.boton-tactil.flecha{--medio:max(22px,calc(32px*var(--t)));border-radius:16px;width:calc(64px*var(--t));height:calc(64px*var(--t));font-size:calc(20px*var(--t))}
.boton-tactil.pulsado{background:rgba(255,255,255,.4);opacity:1}
.palanca-tactil{--medio:calc(64px*var(--t));position:absolute;left:clamp(var(--medio),calc(var(--x,50%) + var(--dx,0px)*var(--t)),calc(100% - var(--medio)));bottom:clamp(var(--medio),calc(var(--y,50%) + var(--dy,0px)*var(--t)),calc(100% - var(--medio)));transform:translate(-50%,50%);width:calc(128px*var(--t));height:calc(128px*var(--t));border-radius:50%;border:2px solid rgba(255,255,255,.5);background:rgba(20,24,40,.35);opacity:var(--o)}
.palanca-tactil.pulsado{opacity:1}
.pomo-tactil{position:absolute;left:50%;top:50%;width:44%;height:44%;margin:-22% 0 0 -22%;border-radius:50%;background:rgba(255,255,255,.75);pointer-events:none}
.controles-tactiles.colocando{background:rgba(0,0,0,.45);pointer-events:auto}
.controles-tactiles.colocando .boton-tactil,.controles-tactiles.colocando .palanca-tactil{opacity:1;outline:3px dashed #f1c40f;outline-offset:3px}
.barra-colocar{position:absolute;left:50%;top:12px;transform:translateX(-50%);display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;max-width:calc(100% - 136px);padding:8px 12px;border-radius:12px;background:rgba(18,20,28,.92);color:#fff;font:14px system-ui,sans-serif}
.barra-colocar button{min-height:44px;padding:0 14px;border-radius:8px;border:1px solid rgba(255,255,255,.4);background:#2b3140;color:#fff;font:inherit}
.aviso-girar{position:fixed;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;background:#12141c;color:#e8ebf2;text-align:center;font:18px system-ui,sans-serif;pointer-events:auto}
.aviso-girar p{margin:0;max-width:20em}
.movil-girando{width:56px;height:96px;border:4px solid #f1c40f;border-radius:12px;animation:girar-movil 1.8s ease-in-out infinite alternate}
.movil-girando.vertical{animation-name:girar-movil-de-pie}
@keyframes girar-movil{from{transform:rotate(0)}to{transform:rotate(90deg)}}
@keyframes girar-movil-de-pie{from{transform:rotate(90deg)}to{transform:rotate(0)}}
@media (prefers-reduced-motion:reduce){.movil-girando{animation:none;transform:rotate(90deg)}.movil-girando.vertical{transform:none}}
.boton-completa[hidden]{display:none}
.boton-completa{position:fixed;right:max(8px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));z-index:12;width:44px;height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.35);background:rgba(20,24,40,.45);color:#fff;font:20px system-ui,sans-serif;opacity:.55}
`;
