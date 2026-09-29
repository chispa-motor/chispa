/**
 * Motor: el corazón. Crea el renderizador, la entrada y los recursos,
 * y ejecuta el BUCLE DE JUEGO.
 *
 * ── ¿Qué es el bucle de juego? ──
 * Un juego es un bucle que se repite unas 60 veces por segundo:
 *     1. actualizar(dt)  → mover cosas, leer el teclado, comprobar choques...
 *     2. dibujar()       → pintar el estado actual
 *     3. limpiar la entrada de "un solo fotograma"
 * Usamos requestAnimationFrame: el navegador nos llama justo antes de
 * refrescar la pantalla (60 Hz, 144 Hz... según el monitor), y se pausa solo
 * si cambias de pestaña para no gastar batería.
 *
 * ── ¿Qué es el delta time (dt)? ──
 * Son los SEGUNDOS que han pasado desde el fotograma anterior (≈0,016 a 60 FPS).
 * Si movemos "5 píxeles por fotograma", en un monitor de 144 Hz el juego iría
 * más del doble de rápido que en uno de 60 Hz. Si movemos
 * "300 píxeles por SEGUNDO × dt", va igual de rápido en todos.
 * Es lo mismo que el deltaTime de RunService.Heartbeat en Roblox.
 *
 * ── DECISIÓN: limitar el dt a 0,1 s ──
 * Si el juego se congela un momento (o vuelves de otra pestaña), el dt podría
 * ser de 5 segundos y los objetos "teletransportarse" atravesando paredes.
 * Limitarlo es una protección sencilla. En la Fase 2, para la física,
 * valoraremos un "paso fijo" (fixed timestep) como el FixedUpdate de Unity.
 */
import { Entrada } from './Entrada';
import { mostrarError } from './Errores';
import { Recursos } from './Recursos';
import { Renderizador } from './Renderizador';

export interface OpcionesMotor {
  canvas: HTMLCanvasElement;
  ancho?: number;
  alto?: number;
  colorFondo?: string;
  pixelArt?: boolean;
}

export interface Tiempo {
  /** Segundos desde el fotograma anterior, ya multiplicados por la escala. */
  delta: number;
  /** Igual que delta pero sin escala (sigue corriendo aunque el juego esté en pausa). */
  deltaReal: number;
  /** Segundos de juego desde que empezó. */
  total: number;
  /** Número de fotogramas dibujados. */
  fotogramas: number;
  /** Fotogramas por segundo (se recalcula cada medio segundo). */
  fps: number;
  /** 1 = normal, 0.5 = cámara lenta, 0 = pausa. Como Time.timeScale de Unity. */
  escala: number;
}

/** Lo que el motor necesita de una escena (la Escena de la Fase 2 cumple esto). */
export interface EscenaActiva {
  actualizar(dt: number): void;
  dibujar(r: Renderizador): void;
}

type FuncionActualizar = (dt: number) => void;
type FuncionDibujar = (r: Renderizador) => void;

const DT_MAXIMO = 0.1;

export class Motor {
  readonly renderizador: Renderizador;
  readonly entrada: Entrada;
  readonly recursos = new Recursos();
  readonly tiempo: Tiempo = { delta: 0, deltaReal: 0, total: 0, fotogramas: 0, fps: 0, escala: 1 };
  colorFondo: string;
  /** Escena que se actualiza y dibuja en cada fotograma (Fase 2). */
  escena: EscenaActiva | null = null;

  private actualizadores: FuncionActualizar[] = [];
  private dibujadores: FuncionDibujar[] = [];
  private corriendo = false;
  private idFotograma = 0;
  private instanteAnterior = 0;
  // Para medir los FPS
  private fotogramasMedidos = 0;
  private tiempoMedido = 0;

  constructor(opciones: OpcionesMotor) {
    this.renderizador = new Renderizador(
      opciones.canvas,
      opciones.ancho ?? 960,
      opciones.alto ?? 540,
      opciones.pixelArt ?? false,
    );
    this.entrada = new Entrada(opciones.canvas, (x, y) => this.renderizador.aCoordenadasJuego(x, y));
    this.colorFondo = opciones.colorFondo ?? 'negro';
  }

  /** Registra una función que se ejecuta en cada fotograma para actualizar el juego. */
  alActualizar(funcion: FuncionActualizar): void {
    this.actualizadores.push(funcion);
  }

  /** Registra una función que se ejecuta en cada fotograma para dibujar. */
  alDibujar(funcion: FuncionDibujar): void {
    this.dibujadores.push(funcion);
  }

  iniciar(): void {
    if (this.corriendo) return;
    this.corriendo = true;
    this.instanteAnterior = performance.now();
    this.idFotograma = requestAnimationFrame(this.bucle);
  }

  detener(): void {
    this.corriendo = false;
    cancelAnimationFrame(this.idFotograma);
  }

  /** Quita todas las funciones registradas y la escena (al parar un juego en el editor). */
  limpiarFunciones(): void {
    this.actualizadores = [];
    this.dibujadores = [];
    this.escena = null;
  }

  get estaCorriendo(): boolean {
    return this.corriendo;
  }

  /**
   * Un fotograma del bucle.
   * Es una "función flecha" guardada en una propiedad para que `this` siga
   * apuntando al motor cuando la llama requestAnimationFrame.
   */
  private bucle = (ahora: number): void => {
    if (!this.corriendo) return;

    // 1. Calcular el delta time
    const dtReal = Math.min((ahora - this.instanteAnterior) / 1000, DT_MAXIMO);
    this.instanteAnterior = ahora;
    const t = this.tiempo;
    t.deltaReal = dtReal;
    t.delta = dtReal * t.escala;
    t.total += t.delta;
    t.fotogramas++;
    this.medirFps(dtReal);

    try {
      // 2. Actualizar (primero las funciones sueltas, luego la escena)
      for (const f of this.actualizadores) f(t.delta);
      this.escena?.actualizar(t.delta);
      // 3. Dibujar (primero la escena, luego las funciones sueltas, que quedan encima)
      this.renderizador.limpiar(this.colorFondo);
      this.escena?.dibujar(this.renderizador);
      for (const f of this.dibujadores) f(this.renderizador);
    } catch (error) {
      // Si algo falla, paramos el juego y lo explicamos, en vez de repetir el error 60 veces por segundo.
      this.detener();
      mostrarError(error);
      return;
    } finally {
      // 4. Borrar la entrada de "solo este fotograma"
      this.entrada.finDeFotograma();
    }

    this.idFotograma = requestAnimationFrame(this.bucle);
  };

  private medirFps(dt: number): void {
    this.fotogramasMedidos++;
    this.tiempoMedido += dt;
    if (this.tiempoMedido >= 0.5) {
      this.tiempo.fps = Math.round(this.fotogramasMedidos / this.tiempoMedido);
      this.fotogramasMedidos = 0;
      this.tiempoMedido = 0;
    }
  }
}
