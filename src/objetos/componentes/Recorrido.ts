/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Recorrido: el objeto va solo de un punto a otro (plataformas que se mueven,
 * enemigos que patrullan, ascensores...).
 *
 * DECISIÓN: los puntos son RELATIVOS al sitio donde empieza el objeto
 * ("200 a la derecha", "150 hacia arriba"). Así, si mueves la plataforma en
 * el editor, su camino se mueve con ella, y una plantilla con recorrido
 * funciona igual la crees donde la crees.
 *
 * El sistema de física lo mueve en cada paso de física (no en cada fotograma),
 * para que los objetos que van encima se muevan exactamente con él.
 */
import { Componente } from '../Componente';
import { Vector2 } from '../../motor/Vector2';

export type ModoRecorrido = 'idaYVuelta' | 'bucle';

export class Recorrido extends Componente {
  /** Puntos del camino, relativos al inicio. El inicio (0, 0) es el primero y no se escribe. */
  puntos: Vector2[] = [];
  /** Píxeles por segundo. */
  rapidez = 100;
  /** idaYVuelta: al llegar al final vuelve por el mismo camino. bucle: del último punto va al primero. */
  modo: ModoRecorrido = 'idaYVuelta';
  /** Segundos que se para en cada extremo (o en cada punto, en bucle). */
  pausa = 0.5;
  /** Si es falso, se queda quieto donde esté (yo.moviendo = falso). */
  moviendo = true;

  private inicio: Vector2 | null = null;
  /** Hacia qué punto va ahora (índice en el camino completo, donde el 0 es el inicio). */
  private destino = 1;
  private sentido = 1;
  private esperando = 0;

  /** El camino completo, en coordenadas del mundo. */
  camino(): Vector2[] {
    this.inicio ??= this.objeto.posicion.copiar();
    return [this.inicio, ...this.puntos.map((p) => this.inicio!.sumar(p))];
  }

  /** Avanza el recorrido (lo llama el sistema de física, con su paso fijo). */
  avanzar(dt: number): void {
    if (!this.moviendo || this.puntos.length === 0 || this.rapidez <= 0) return;
    const camino = this.camino();
    if (this.esperando > 0) {
      this.esperando = Math.max(0, this.esperando - dt);
      return;
    }
    let paso = this.rapidez * dt;
    const pos = this.objeto.posicion;
    // Un bucle por si en un paso llega a un punto y le sobra camino (sin pausa)
    for (let vueltas = 0; paso > 0 && vueltas < 8; vueltas++) {
      const d = camino[this.destino];
      const falta = d.restar(pos);
      const largo = falta.longitud();
      if (largo > paso) {
        const mover = falta.normalizado().multiplicar(paso);
        pos.x += mover.x;
        pos.y += mover.y;
        return;
      }
      pos.x = d.x;
      pos.y = d.y;
      paso -= largo;
      this.siguientePunto(camino.length);
      if (this.esperando > 0) return;
    }
  }

  private siguientePunto(total: number): void {
    const extremo = this.destino === total - 1 || this.destino === 0;
    if (this.modo === 'bucle') {
      this.destino = (this.destino + 1) % total;
      if (this.pausa > 0) this.esperando = this.pausa;
      return;
    }
    if (extremo) {
      this.sentido = this.destino === 0 ? 1 : -1;
      if (this.pausa > 0) this.esperando = this.pausa;
    }
    this.destino += this.sentido;
  }
}
