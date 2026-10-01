/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Colisión: una CAJA invisible alrededor del objeto para detectar choques.
 *
 * DECISIÓN: los rectángulos chocan como cajas alineadas con los ejes, sin
 * girar (en inglés AABB, "Axis-Aligned Bounding Box"): aunque el sprite
 * rote, la caja no. Es lo que usan la mayoría de juegos de plataformas
 * clásicos porque es rapidísimo y muy predecible.
 *
 * Las demás formas (círculo, triángulo, estrella, corazón, caminos de la
 * pluma...) chocan con su FIGURA de verdad, girada y volteada como se ve
 * (forma = "auto"). Con forma = "caja" chocan como una caja, y con
 * forma = "figura" también un rectángulo choca girado.
 *
 * solido = verdadero → los objetos con Física chocan con él y no lo atraviesan (suelos, paredes).
 * solido = falso     → se puede atravesar, pero avisa cuando algo lo toca
 *                       (monedas, pinchos, meta). En Unity se llama "trigger".
 */
import { Componente } from '../Componente';
import { Vector2 } from '../../motor/Vector2';
import { Sprite } from './Sprite';
import { aMundo, type Figura, type Poligono } from '../formas/figuras';
import { cajaComoPieza, cajaDePiezas } from '../formas/sat';

/** Cómo choca: auto = con su figura si no es un rectángulo; caja = siempre como una caja; figura = siempre con su figura (girada). */
export type FormaColision = 'auto' | 'caja' | 'figura';

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
  forma: FormaColision = 'auto';

  /** ¿Choca con su figura de verdad (y no con una caja)? */
  usaFigura(): boolean {
    if (this.forma === 'caja') return false;
    const s = this.objeto.obtener(Sprite);
    if (!s || s.imagen || s.forma === 'texto') return false;
    return this.forma === 'figura' || s.forma !== 'rectangulo';
  }

  private ultimas: { figura: Figura; x: number; y: number; rot: number; vx: boolean; vy: boolean; piezas: Poligono[] } | null = null;

  /**
   * La figura en el mundo, partida en piezas convexas (ya girada, volteada y
   * en su sitio). Si choca como una caja, la caja como una sola pieza.
   */
  piezas(): Poligono[] {
    if (!this.usaFigura()) return [cajaComoPieza(this.caja())];
    const s = this.objeto.obtener(Sprite)!;
    const t = this.objeto.transformacion;
    const figura = s.figura((this.ancho ?? s.ancho) * Math.abs(t.escala.x), (this.alto ?? s.alto) * Math.abs(t.escala.y));
    const x = t.posicion.x + this.desplazamiento.x;
    const y = t.posicion.y + this.desplazamiento.y;
    const vx = s.voltearX !== t.escala.x < 0;
    const vy = s.voltearY !== t.escala.y < 0;
    const u = this.ultimas;
    if (u && u.figura === figura && u.x === x && u.y === y && u.rot === t.rotacion && u.vx === vx && u.vy === vy) return u.piezas;
    const piezas = figura.piezas.map((p) => aMundo(p, x, y, t.rotacion, vx, vy));
    this.ultimas = { figura, x, y, rot: t.rotacion, vx, vy, piezas };
    return piezas;
  }

  /** Calcula la caja en coordenadas del mundo (la que rodea a la figura, si choca con su figura). */
  caja(): Caja {
    if (this.usaFigura()) return cajaDePiezas(this.piezas());
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
