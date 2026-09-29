/**
 * Cámara: decide QUÉ parte del mundo se ve.
 *
 * El mundo puede ser mucho más grande que la pantalla (un nivel de
 * plataformas de 3000 píxeles). La cámara tiene una posición (el centro de
 * lo que se ve) y todo se dibuja desplazado respecto a ella.
 */
import type { ObjetoJuego } from './ObjetoJuego';
import { Vector2 } from '../motor/Vector2';

export class Camara {
  /** Centro de lo que se ve, en coordenadas del mundo. */
  posicion: Vector2;
  objetivo: ObjetoJuego | null = null;
  /** Cuanto más alto, más rápido alcanza al objetivo. */
  suavizado = 8;
  limites: { izquierda: number; arriba: number; derecha: number; abajo: number } | null = null;

  constructor(
    private anchoPantalla: number,
    private altoPantalla: number,
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

  /** Convierte coordenadas de pantalla (ratón) a coordenadas del mundo. */
  pantallaAMundo(p: Vector2): Vector2 {
    return new Vector2(p.x + this.esquinaX, p.y + this.esquinaY);
  }

  /** Esquina superior izquierda de lo que se ve (redondeada para que no tiemble). */
  get esquinaX(): number {
    return Math.round(this.posicion.x - this.anchoPantalla / 2);
  }
  get esquinaY(): number {
    return Math.round(this.posicion.y - this.altoPantalla / 2);
  }

  private aplicarLimites(): void {
    const l = this.limites;
    if (!l) return;
    const mitadW = this.anchoPantalla / 2;
    const mitadH = this.altoPantalla / 2;
    // Si el nivel es más pequeño que la pantalla, lo centramos.
    this.posicion.x =
      l.derecha - l.izquierda <= this.anchoPantalla
        ? (l.izquierda + l.derecha) / 2
        : Math.min(Math.max(this.posicion.x, l.izquierda + mitadW), l.derecha - mitadW);
    this.posicion.y =
      l.abajo - l.arriba <= this.altoPantalla
        ? (l.arriba + l.abajo) / 2
        : Math.min(Math.max(this.posicion.y, l.arriba + mitadH), l.abajo - mitadH);
  }
}
