/**
 * VISTA DEL JUEGO: el juego funcionando dentro del editor (como el botón
 * Play de Unity o Roblox Studio).
 *
 * DECISIÓN: cada vez que pulsas ▶ Ejecutar se crea un motor NUEVO con una
 * COPIA del proyecto. Así:
 *   - El juego siempre empieza limpio (nada se queda de la partida anterior).
 *   - Lo que cambies en el editor mientras juegas no rompe la partida; se
 *     verá la próxima vez que pulses Ejecutar.
 */
import { Motor } from '../../motor/Motor';
import type { DefProyecto } from '../../proyecto/formato';
import { ErrorMotor } from '../../motor/Errores';
import { teclasDelJuego } from '../../reproductor/ControlesTactiles';
import { JuegoEnMarcha, type OpcionesJuego } from '../../proyecto/JuegoEnMarcha';
import { h, icono } from '../interfaz/dom';

export type EstadoJuego = 'parado' | 'cargando' | 'jugando' | 'pausado';

export class VistaJuego {
  readonly elemento: HTMLElement;
  estadoJuego: EstadoJuego = 'parado';
  alCambiarEstado: () => void = () => {};

  private pantalla = h('div', { class: 'pantalla-juego' });
  private barraEstado = h('div', { class: 'estado-juego' });
  private motor: Motor | null = null;
  private juego: JuegoEnMarcha | null = null;
  /** Un dato de `juego` del juego que está en marcha (para el tutorial). */
  datoDelJuego(nombre: string): unknown {
    return this.juego?.datoDelJuego(nombre);
  }
  private intervalo = 0;
  private ampliada = false;

  /** Aviso cuando el juego está en marcha pero las teclas van a otro sitio (al código, a la escena...). */
  /** Si el juego usa la tecla Escape, Escape no cierra la vista ampliada (se sale con el botón). */
  private juegoUsaEscape = false;
  private avisoFoco = h('button', { class: 'aviso-foco', hidden: true, onclick: () => this.enfocar() }, 'Haz clic aquí para jugar con el teclado');

  constructor() {
    const salir = h('button', { class: 'salir-ampliada', title: 'Volver al editor', onclick: () => this.ampliar(false) }, '✕ Volver al editor');
    this.elemento = h('div', { class: 'vista-juego' }, this.pantalla, this.avisoFoco, this.barraEstado, salir);
    document.addEventListener('focusin', () => this.actualizarAvisoFoco());
    document.addEventListener('focusout', () => setTimeout(() => this.actualizarAvisoFoco()));
    this.mostrarEspera();
    // Escape sale de la vista ampliada, salvo que el juego use Escape (pausa...): entonces es para el juego
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.ampliada && !this.juegoUsaEscape) this.ampliar(false);
    });
  }

  private mostrarEspera(): void {
    this.pantalla.replaceChildren(
      h('div', { class: 'espera-juego' }, icono('jugar', 40), h('p', {}, 'Pulsa ', h('strong', {}, '▶ Ejecutar'), ' (F5) para probar tu juego aquí')),
    );
    this.barraEstado.textContent = 'Parado';
  }

  /**
   * Arranca el juego. Si el código tiene errores, lanza el error (ErrorCompilacion)
   * para que la aplicación los enseñe en la consola.
   */
  async ejecutar(proyecto: DefProyecto, opciones: OpcionesJuego & { alFallar: (e: unknown) => void }): Promise<void> {
    this.parar();
    this.cambiarEstado('cargando');
    const copia = structuredClone(proyecto);
    this.juegoUsaEscape = teclasDelJuego(copia).acciones.includes('escape');
    const canvas = h('canvas', { class: 'lienzo-juego', tabindex: '0', 'aria-label': 'Juego en marcha' });
    this.pantalla.replaceChildren(canvas);
    const motor = new Motor({ canvas, ancho: copia.ancho, alto: copia.alto, pixelArt: copia.pixelArt });
    motor.alFallar = (e) => {
      opciones.alFallar(e);
      this.parar();
    };
    // Las teclas solo son para el juego si no estás escribiendo o editando la escena
    motor.entrada.aceptarTecla = (e) => {
      const activo = document.activeElement;
      return !activo || activo === document.body || this.elemento.contains(activo) || (e.target as Node | null) === document.body;
    };
    this.motor = motor;
    try {
      this.juego = await JuegoEnMarcha.arrancar(motor, copia, { ...opciones, almacen: localStorage });
    } catch (error) {
      if (this.motor === motor) {
        this.motor = null;
        motor.destruir();
        this.mostrarEspera();
        this.cambiarEstado('parado');
      }
      throw error;
    }
    if (this.motor !== motor) return; // Se paró mientras cargaba
    canvas.focus();
    canvas.addEventListener('pointerdown', () => canvas.focus());
    this.cambiarEstado('jugando');
    this.intervalo = window.setInterval(() => this.actualizarBarra(), 500);
  }

  /** Una orden escrita en la consola mientras se juega (ver JuegoEnMarcha.ejecutarOrden). */
  ejecutarOrden(codigo: string): string | null {
    if (!this.juego) throw new ErrorMotor('El juego no está en marcha.', 'Pulsa ▶ Ejecutar (F5) y escribe la orden mientras juegas.');
    return this.juego.ejecutarOrden(codigo);
  }

  /** Da el teclado al juego. */
  enfocar(): void {
    this.pantalla.querySelector('canvas')?.focus();
    this.actualizarAvisoFoco();
  }

  private actualizarAvisoFoco(): void {
    const activo = document.activeElement;
    const tieneTeclado = !activo || activo === document.body || this.elemento.contains(activo);
    this.avisoFoco.hidden = this.estadoJuego !== 'jugando' || tieneTeclado;
  }

  pausar(): void {
    if (!this.motor) return;
    if (this.estadoJuego === 'jugando') {
      this.motor.detener();
      this.motor.sonido.pausar();
      this.cambiarEstado('pausado');
    } else if (this.estadoJuego === 'pausado') {
      this.motor.iniciar();
      this.motor.sonido.reanudar();
      this.cambiarEstado('jugando');
      this.pantalla.querySelector('canvas')?.focus();
    }
  }

  /** Las variables globales del juego en marcha (para el depurador). */
  get globales() {
    return this.juego?.interprete.globales ?? null;
  }

  /** Pausa (si está jugando) o sigue (si está en pausa), sin alternar: lo usa el depurador. */
  ponerEnPausa(si: boolean): void {
    if (si === (this.estadoJuego === 'pausado')) return;
    if (this.estadoJuego === 'jugando' || this.estadoJuego === 'pausado') this.pausar();
  }

  parar(): void {
    clearInterval(this.intervalo);
    if (this.juego) this.juego.detener();
    if (this.motor) this.motor.destruir();
    const habia = this.motor !== null;
    this.juego = null;
    this.motor = null;
    if (habia) {
      this.mostrarEspera();
      this.cambiarEstado('parado');
    }
  }

  /** Enseña el juego ocupando toda la ventana del editor (Escape para volver). */
  ampliar(si = !this.ampliada): void {
    this.ampliada = si;
    this.elemento.classList.toggle('ampliada', si);
    if (si) this.pantalla.querySelector('canvas')?.focus();
  }

  private cambiarEstado(e: EstadoJuego): void {
    this.estadoJuego = e;
    this.elemento.dataset.estado = e;
    this.actualizarAvisoFoco();
    this.actualizarBarra();
    this.alCambiarEstado();
  }

  private actualizarBarra(): void {
    const textos: Record<EstadoJuego, string> = { parado: 'Parado', cargando: 'Cargando…', jugando: 'Jugando', pausado: 'En pausa' };
    const partes = [textos[this.estadoJuego]];
    if (this.juego && this.motor) {
      partes.push(`escena ${this.juego.nombreEscena}`, `${this.juego.escena.objetos.length} objetos`, `${this.motor.tiempo.fps} fotogramas/s`);
    }
    this.barraEstado.textContent = partes.join(' · ');
  }
}
