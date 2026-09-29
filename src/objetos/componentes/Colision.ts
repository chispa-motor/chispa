/**
 * Colisión: una CAJA invisible alrededor del objeto para detectar choques.
 *
 * DECISIÓN (versión simple): cajas alineadas con los ejes, sin girar
 * (en inglés AABB, "Axis-Aligned Bounding Box"). Aunque el sprite rote,
 * la caja no. Es lo que usan la mayoría de juegos de plataformas clásicos
 * porque es rapidísimo y muy predecible.
 *
 * solido = verdadero → los objetos con Física chocan con él y no lo atraviesan (suelos, paredes).
 * solido = falso     → se puede atravesar, pero avisa cuando algo lo toca
 *                       (monedas, pinchos, meta). En Unity se llama "trigger".
 */
import { Componente } from '../Componente';
import { Vector2 } from '../../motor/Vector2';
import { Sprite } from './Sprite';

/**
 * Caja en coordenadas del MUNDO, donde la Y crece hacia ARRIBA:
 * `abajo` es la Y más pequeña y `arriba` la más grande.
 */
export interface Caja {
  izquierda: number;
  derecha: number;
  abajo: number;
  arriba: number;
}

export class Colision extends Componente {
  /** Si se deja en null, se usa el tamaño del Sprite. */
  ancho: number | null = null;
  alto: number | null = null;
  solido = true;
  /**
   * Plataforma que se atraviesa desde abajo: solo para a lo que cae encima.
   * Se puede saltar a través de ella desde abajo o desde los lados.
   */
  soloDesdeArriba = false;
  /** Mueve la caja respecto al centro del objeto (útil si el dibujo no está centrado). */
  desplazamiento = new Vector2(0, 0);

  /** Calcula la caja en coordenadas del mundo. */
  caja(): Caja {
    const t = this.objeto.transformacion;
    const sprite = this.objeto.obtener(Sprite);
    const ancho = (this.ancho ?? sprite?.ancho ?? 32) * Math.abs(t.escala.x);
    const alto = (this.alto ?? sprite?.alto ?? 32) * Math.abs(t.escala.y);
    const cx = t.posicion.x + this.desplazamiento.x;
    const cy = t.posicion.y + this.desplazamiento.y;
    return { izquierda: cx - ancho / 2, derecha: cx + ancho / 2, abajo: cy - alto / 2, arriba: cy + alto / 2 };
  }
}

/**
 * ¿Se solapan dos cajas? `margen` agranda la comprobación: con margen 1,
 * dos cajas que se tocan justo en el borde también cuentan como "tocándose".
 */
export function seSolapan(a: Caja, b: Caja, margen = 0): boolean {
  return (
    a.izquierda < b.derecha + margen &&
    a.derecha > b.izquierda - margen &&
    a.abajo < b.arriba + margen &&
    a.arriba > b.abajo - margen
  );
}
