/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Comportamiento: el objeto se mueve solo según otro objeto, sin escribir código.
 *
 *   seguir     → va detrás del objetivo y se queda a una distancia (una mascota, un ayudante).
 *   perseguir  → si el objetivo se acerca, va a por él; si se aleja, se para (enemigos).
 *   huir       → si el objetivo se acerca, se aleja de él (gallinas, peces).
 *
 * Patrullar entre puntos es el Recorrido. Se pueden juntar: un enemigo con
 * recorrido y «perseguir» patrulla, y cuando te ve deja el camino para ir a por ti.
 *
 * También es lo que mueve el objeto con yo.irHacia(sitio) desde el código:
 * ese destino manda sobre el comportamiento mientras dure.
 *
 * Cómo se mueve:
 *   - Con física, cambiando su velocidad (así choca con las paredes). En un
 *     juego de plataformas (con gravedad) solo se mueve a los lados.
 *   - Sin física, moviendo su posición.
 *   - Si la escena tiene un mapa con paredes y el juego es visto desde arriba
 *     (sin gravedad), busca un camino que las rodee (ver Caminos.ts).
 */
import { Componente } from '../Componente';
import { Vector2 } from '../../motor/Vector2';
import { normalizar } from '../../utilidades/texto';
import type { ObjetoJuego } from '../ObjetoJuego';
import { buscarCamino, lineaLibre, mapaConParedes } from '../Caminos';
import { Colision } from './Colision';
import { Fisica } from './Fisica';
import { Recorrido } from './Recorrido';
import { Sprite } from './Sprite';

export type TipoComportamiento = 'seguir' | 'perseguir' | 'huir';

/** Distancia por defecto de cada comportamiento (en píxeles). */
export const DISTANCIA_POR_DEFECTO: Record<TipoComportamiento, number> = { seguir: 80, perseguir: 300, huir: 200 };

/** Cada cuánto se vuelve a buscar el camino si el objetivo se mueve (segundos). */
const RECALCULAR = 0.4;

export class Comportamiento extends Componente {
  tipo: TipoComportamiento | null = null;
  /** Nombre, tipo o etiqueta del objeto al que sigue, persigue o del que huye. */
  objetivo = '';
  /** Píxeles por segundo. */
  rapidez = 150;
  /** seguir: a qué distancia se queda. perseguir y huir: a partir de qué distancia reacciona. */
  distancia = 0;

  /** Destino puesto desde el código con yo.irHacia(): un objeto (lo sigue) o un punto (se para al llegar). */
  destino: ObjetoJuego | Vector2 | null = null;
  rapidezDestino = 150;
  /** ¿Hay camino hasta el destino de irHacia? */
  hayCamino = true;

  private camino: Vector2[] = [];
  private caminoHacia: Vector2 | null = null;
  private recalcularEn = 0;
  /** ¿Lo estaba moviendo yo en el fotograma anterior? (para frenarlo una sola vez al parar) */
  private moviendo = false;
  private dejoElRecorrido = false;

  get yendo(): boolean {
    return this.destino !== null;
  }

  /** Va hacia un sitio o un objeto por el camino más corto. Devuelve si se puede llegar. */
  irHacia(destino: ObjetoJuego | Vector2, rapidez: number): boolean {
    // Llamarlo en cada fotograma con el mismo destino no recalcula el camino (solo cambia la rapidez)
    const mismo = this.destino !== null && (this.destino === destino || (this.destino instanceof Vector2 && destino instanceof Vector2 && this.destino.distancia(destino) < 1));
    this.rapidezDestino = rapidez;
    if (mismo) return this.hayCamino;
    this.destino = destino;
    this.camino = [];
    this.caminoHacia = null;
    this.hayCamino = this.calcularCamino(this.puntoDe(destino));
    return this.hayCamino;
  }

  /** Deja de ir hacia el destino de irHacia (el comportamiento del editor sigue). */
  parar(): void {
    this.destino = null;
    this.camino = [];
    this.frenar();
  }

  actualizar(dt: number): void {
    const accion = this.decidir();
    // Con recorrido: lo deja mientras persigue (o huye) y lo retoma al acabar
    const recorrido = this.objeto.obtener(Recorrido);
    if (recorrido && this.tipo && !!accion !== this.dejoElRecorrido) {
      this.dejoElRecorrido = !!accion;
      recorrido.moviendo = !accion;
    }
    if (!accion) {
      if (this.moviendo) this.frenar();
      return;
    }
    if (accion.huir) this.mover(accion.punto.restar(this.objeto.posicion).normalizado(), accion.rapidez, dt, Infinity);
    else this.irPorCamino(accion.punto, accion.rapidez, dt, accion.pararA);
  }

  /** Qué toca hacer ahora: ir a un punto, huir de un punto o nada. */
  private decidir(): { punto: Vector2; rapidez: number; pararA: number; huir?: boolean } | null {
    const yo = this.objeto.posicion;
    if (this.destino) {
      if (this.destino instanceof Vector2 || !this.destino.destruido) return { punto: this.puntoDe(this.destino), rapidez: this.rapidezDestino, pararA: 0 };
      this.destino = null;
    }
    if (!this.tipo) return null;
    const otro = this.buscarObjetivo();
    if (!otro) return null;
    const distancia = this.distancia || DISTANCIA_POR_DEFECTO[this.tipo];
    const lejos = yo.distancia(otro.posicion);
    if (this.tipo === 'seguir') return lejos > distancia ? { punto: otro.posicion, rapidez: this.rapidez, pararA: distancia } : null;
    if (lejos > distancia) return null;
    if (this.tipo === 'perseguir') return { punto: otro.posicion, rapidez: this.rapidez, pararA: 0 };
    // Huir: un punto al otro lado, lejos del que se acerca
    const lado = lejos > 0.001 ? yo.restar(otro.posicion).normalizado() : new Vector2(1, 0);
    return { punto: yo.sumar(lado.multiplicar(100)), rapidez: this.rapidez, pararA: 0, huir: true };
  }

  private buscarObjetivo(): ObjetoJuego | null {
    const escena = this.objeto.escena;
    const n = normalizar(this.objetivo);
    if (!escena || !n) return null;
    let mejor: ObjetoJuego | null = null;
    let menor = Infinity;
    for (const o of escena.objetos) {
      if (o === this.objeto || o.destruido || (normalizar(o.nombre) !== n && normalizar(o.tipo) !== n && !o.etiquetas.has(n))) continue;
      const d = o.posicion.distancia(this.objeto.posicion);
      if (d < menor) [mejor, menor] = [o, d];
    }
    return mejor;
  }

  private puntoDe(d: ObjetoJuego | Vector2): Vector2 {
    return d instanceof Vector2 ? d : d.posicion;
  }

  /** Va hacia el punto siguiendo el camino (si hay paredes) y se para a `pararA` píxeles. */
  private irPorCamino(punto: Vector2, rapidez: number, dt: number, pararA: number): void {
    const yo = this.objeto.posicion;
    const escena = this.objeto.escena!;
    this.recalcularEn -= dt;
    const mapa = this.enDosDimensiones() ? mapaConParedes(escena) : null;
    if (mapa) {
      const seMovio = !this.caminoHacia || this.caminoHacia.distancia(punto) > mapa.tamano / 2;
      if (seMovio && this.recalcularEn <= 0) {
        this.calcularCamino(punto);
        this.recalcularEn = RECALCULAR;
      }
    } else this.camino = [punto];
    // Los puntos del camino a los que ya ha llegado se quitan
    while (this.camino.length > 1 && yo.distancia(this.camino[0]) < 4) this.camino.shift();
    const siguiente = this.camino[0];
    if (!siguiente) return this.alLlegar();
    // El último tramo apunta al objetivo de verdad (aunque se haya movido un poco desde que se calculó)
    const meta = this.camino.length === 1 && (!mapa || lineaLibre(mapa, yo, punto, this.radio())) ? punto : siguiente;
    const queda = yo.distancia(meta) - (this.camino.length === 1 ? pararA : 0);
    if (queda <= 1) {
      if (this.camino.length <= 1) return this.alLlegar();
      this.camino.shift();
      return;
    }
    this.mover(meta.restar(yo).normalizado(), rapidez, dt, queda);
  }

  private alLlegar(): void {
    if (this.destino instanceof Vector2) this.destino = null;
    this.frenar();
  }

  private calcularCamino(punto: Vector2): boolean {
    const escena = this.objeto.escena;
    const mapa = escena && this.enDosDimensiones() ? mapaConParedes(escena) : null;
    this.caminoHacia = punto.copiar();
    if (!mapa) {
      this.camino = [punto];
      return true;
    }
    const c = buscarCamino(mapa, this.objeto.posicion, punto, this.radio());
    this.camino = c ?? [];
    return c !== null;
  }

  /** La mitad del tamaño del objeto (para no rozar las paredes). */
  private radio(): number {
    const caja = this.objeto.obtener(Colision)?.caja();
    const s = this.objeto.obtener(Sprite);
    if (caja) return Math.max(caja.derecha - caja.izquierda, caja.arriba - caja.abajo) / 2;
    return s ? Math.max(s.anchoFinal, s.altoFinal) / 2 : 0;
  }

  /** ¿Se puede mover hacia arriba y abajo? (no, si tiene física y hay gravedad: plataformas) */
  private enDosDimensiones(): boolean {
    const f = this.fisica();
    return !f || f.gravedad === 0 || (this.objeto.escena?.gravedad ?? 0) === 0;
  }

  private fisica(): Fisica | null {
    const f = this.objeto.obtener(Fisica);
    return f && !f.estatico ? f : null;
  }

  private mover(direccion: Vector2, rapidez: number, dt: number, queda: number): void {
    this.moviendo = true;
    const f = this.fisica();
    if (f) {
      if (this.enDosDimensiones()) {
        // Sin pasarse: cerca del final va más despacio
        const v = Math.min(rapidez, queda / Math.max(dt, 1e-6));
        f.velocidad.x = direccion.x * v;
        f.velocidad.y = direccion.y * v;
      } else f.velocidad.x = Math.sign(direccion.x) * Math.min(rapidez, queda / Math.max(dt, 1e-6));
    } else {
      const paso = Math.min(rapidez * dt, queda);
      this.objeto.posicion.x += direccion.x * paso;
      this.objeto.posicion.y += direccion.y * paso;
    }
    const s = this.objeto.obtener(Sprite);
    if (s && Math.abs(direccion.x) > 0.1) s.voltearX = direccion.x < 0;
  }

  private frenar(): void {
    this.moviendo = false;
    const f = this.fisica();
    if (!f) return;
    f.velocidad.x = 0;
    if (this.enDosDimensiones()) f.velocidad.y = 0;
  }
}
