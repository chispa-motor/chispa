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
import { Vector2 } from './Vector2';
import { normalizar } from '../utilidades/texto';

export type BotonRaton = 'izquierdo' | 'medio' | 'derecho';

/** Teclas especiales: código físico del navegador → nombre en español. */
const NOMBRES_POR_CODIGO: Record<string, string> = {
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
};

/** Otras formas de escribir el mismo nombre de tecla. */
const ALIAS: Record<string, string> = {
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
};

const TECLAS_CONOCIDAS = new Set([
  ...Object.values(NOMBRES_POR_CODIGO),
  ...Array.from({ length: 12 }, (_, i) => `f${i + 1}`), // f1 … f12
]);

/** Teclas que el navegador usa para hacer scroll: se lo impedimos durante el juego. */
const EVITAR_SCROLL = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

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

export class Entrada {
  /**
   * Teclas abajo ahora mismo: código físico → nombre.
   * Guardamos el código porque al soltar la tecla el navegador podría darnos
   * otro "key" (si pulsaste Mayús entre medias) y la tecla se quedaría pegada.
   */
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

  /** AbortController permite quitar TODOS los eventos de golpe (útil al parar el juego). */
  private eventos = new AbortController();

  constructor(
    canvas: HTMLCanvasElement,
    /** Función que convierte coordenadas de la ventana a coordenadas del juego. */
    private aCoordenadasJuego: (x: number, y: number) => Vector2,
  ) {
    const signal = this.eventos.signal;

    // ── Teclado (en window, para que funcione aunque no hayas hecho clic en el lienzo)
    window.addEventListener(
      'keydown',
      (e) => {
        if (EVITAR_SCROLL.has(e.code)) e.preventDefault();
        if (e.repeat) return; // Mantener pulsada una tecla repite el evento: lo ignoramos.
        const nombre = nombreDesdeEvento(e);
        this.teclasAbajo.set(e.code, nombre);
        this.pulsadasEsteFotograma.add(nombre);
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
      },
      { signal },
    );
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
        this.posicionRaton = this.aCoordenadasJuego(e.clientX, e.clientY);
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

  // ───────────────────────── Teclado ─────────────────────────

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
    this.soltadasEsteFotograma.clear();
    this.botonesPulsados.clear();
    this.botonesSoltados.clear();
    this.rueda = 0;
  }

  /** Quita todos los eventos del navegador. */
  destruir(): void {
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
    const n = normalizarNombreTecla(tecla);
    const esCaracter = [...n].length === 1;
    if (!esCaracter && !TECLAS_CONOCIDAS.has(n)) {
      throw new ErrorMotor(
        `No conozco ninguna tecla llamada "${tecla}".`,
        `Las teclas especiales son: ${[...TECLAS_CONOCIDAS].join(', ')}. ` +
          'Para letras y números escribe solo el carácter, por ejemplo "a" o "1".',
      );
    }
    return n;
  }
}
