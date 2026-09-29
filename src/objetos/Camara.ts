/**
 * Cámara: decide QUÉ parte del mundo se ve, y convierte coordenadas del
 * MUNDO a coordenadas de la PANTALLA.
 *
 * ── Dos sistemas de coordenadas ──
 *   Mundo (lo que ve Chispa):  la Y crece hacia ARRIBA, como en Unity o en matemáticas.
 *   Pantalla (Canvas):         la Y crece hacia ABAJO, y (0,0) es la esquina de arriba.
 * La conversión se hace SOLO aquí, justo al dibujar. El resto del motor
 * (física, scripts, editor) trabaja siempre con la Y hacia arriba.
 *
 *     pantallaX = mundoX - izquierda
 *     pantallaY = altoPantalla - (mundoY - abajo)      ← aquí se "da la vuelta" al eje
 *
 * Al empezar, la cámara enseña de (0,0) a (960,540): (0,0) es la esquina
 * INFERIOR izquierda de la pantalla.
 */
import type { ObjetoJuego } from './ObjetoJuego';
import { Vector2 } from '../motor/Vector2';

export interface Limites {
  izquierda: number;
  abajo: number;
  derecha: number;
  arriba: number;
}

export class Camara {
  /** Centro de lo que se ve, en coordenadas del mundo. */
  posicion: Vector2;
  objetivo: ObjetoJuego | null = null;
  /** Cuanto más alto, más rápido alcanza al objetivo. */
  suavizado = 8;
  limites: Limites | null = null;

  constructor(
    readonly anchoPantalla: number,
    readonly altoPantalla: number,
  ) {
    this.posicion = new Vector2(anchoPantalla / 2, altoPantalla / 2);
  }

  seguir(objeto: ObjetoJuego | null): void {
    this.objetivo = objeto;
    if (objeto) {
      // Saltamos directamente al objetivo para que no "viaje" desde lejos al empezar.
      this.posicion = objeto.posicion.copiar();
      this.aplicarLimites();
    }
  }

  actualizar(dt: number): void {
    if (this.objetivo && !this.objetivo.destruido) {
      // Suavizado exponencial: nos acercamos un % de la distancia que falta.
      // Usar 1 - e^(-k·dt) hace que el suavizado sea igual a cualquier FPS.
      const f = 1 - Math.exp(-this.suavizado * dt);
      const destino = this.objetivo.posicion;
      this.posicion.x += (destino.x - this.posicion.x) * f;
      this.posicion.y += (destino.y - this.posicion.y) * f;
    }
    this.aplicarLimites();
  }

  /** Borde izquierdo de lo que se ve (redondeado para que los dibujos no tiemblen). */
  get izquierda(): number {
    return Math.round(this.posicion.x - this.anchoPantalla / 2);
  }
  /** Borde inferior de lo que se ve. */
  get abajo(): number {
    return Math.round(this.posicion.y - this.altoPantalla / 2);
  }

  /** Mundo → pantalla (para dibujar). */
  mundoAPantalla(x: number, y: number): Vector2 {
    return new Vector2(x - this.izquierda, this.altoPantalla - (y - this.abajo));
  }

  /** Pantalla → mundo (para el ratón). */
  pantallaAMundo(p: Vector2): Vector2 {
    return new Vector2(p.x + this.izquierda, this.altoPantalla - p.y + this.abajo);
  }

  private aplicarLimites(): void {
    const l = this.limites;
    if (!l) return;
    const mitadW = this.anchoPantalla / 2;
    const mitadH = this.altoPantalla / 2;
    // Si la zona es más pequeña que la pantalla, la centramos.
    this.posicion.x =
      l.derecha - l.izquierda <= this.anchoPantalla
        ? (l.izquierda + l.derecha) / 2
        : Math.min(Math.max(this.posicion.x, l.izquierda + mitadW), l.derecha - mitadW);
    this.posicion.y =
      l.arriba - l.abajo <= this.altoPantalla
        ? (l.abajo + l.arriba) / 2
        : Math.min(Math.max(this.posicion.y, l.abajo + mitadH), l.arriba - mitadH);
  }
}
