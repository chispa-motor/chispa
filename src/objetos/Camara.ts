/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Cámara: decide QUÉ parte del mundo se ve, con cuánto ZOOM, y convierte
 * coordenadas del MUNDO a coordenadas de la PANTALLA.
 *
 * ── Dos sistemas de coordenadas ──
 *   Mundo (lo que ve Chispa):  la Y crece hacia ARRIBA, como en Unity o en matemáticas.
 *   Pantalla (Canvas):         la Y crece hacia ABAJO, y (0,0) es la esquina de arriba.
 * La conversión se hace SOLO aquí. El resto del motor (física, scripts,
 * editor) trabaja siempre con la Y hacia arriba.
 *
 *     pantallaX = anchoPantalla/2 + (mundoX - camaraX) · zoom
 *     pantallaY = altoPantalla/2 - (mundoY - camaraY) · zoom   ← aquí se "da la vuelta" al eje
 *
 * Al empezar, la cámara enseña de (0,0) a (960,540): (0,0) es la esquina
 * INFERIOR izquierda de la pantalla.
 */
import type { ObjetoJuego } from './ObjetoJuego';
import type { Caja } from './componentes/Colision';
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
  /** 1 = normal, 2 = todo el doble de grande (más cerca), 0.5 = más lejos. */
  private _zoom = 1;
  /** Temblor: cuánto (píxeles) y cuánto tiempo le queda (segundos). */
  private temblor = { intensidad: 0, restante: 0, duracion: 0 };
  /** Desplazamiento de este fotograma por el temblor. */
  private sacudida = new Vector2(0, 0);

  constructor(
    /** El trozo de pantalla que ocupa (toda, o su parte si la pantalla está dividida). */
    public anchoPantalla: number,
    public altoPantalla: number,
  ) {
    this.posicion = new Vector2(anchoPantalla / 2, altoPantalla / 2);
  }

  get zoom(): number {
    return this._zoom;
  }
  set zoom(z: number) {
    this._zoom = Math.min(10, Math.max(0.1, z));
    this.aplicarLimites();
  }

  seguir(objeto: ObjetoJuego | null): void {
    this.objetivo = objeto;
    this.grupo = null;
    if (objeto) {
      // Saltamos directamente al objetivo para que no "viaje" desde lejos al empezar.
      this.posicion = objeto.posicion.copiar();
      this.aplicarLimites();
    }
  }

  /** Los objetos que la cámara mantiene todos a la vista (pantalla compartida), y el margen alrededor. */
  grupo: ObjetoJuego[] | null = null;
  private margenGrupo = 120;
  /** El zoom que tenía al empezar a encuadrar: nunca se acerca más que eso. */
  private zoomDeCerca = 1;

  /**
   * PANTALLA COMPARTIDA: la cámara se coloca en medio de esos objetos y se
   * aleja lo justo para que se vean todos (con un margen alrededor). Cuando
   * se juntan, vuelve a acercarse (hasta el zoom que tenía). Con una lista
   * vacía (o seguir(...)) deja de hacerlo.
   */
  encuadrar(objetos: ObjetoJuego[], margen = 120): void {
    this.objetivo = null;
    this.grupo = objetos.length ? [...objetos] : null;
    this.margenGrupo = Math.max(0, margen);
    this.zoomDeCerca = this._zoom;
  }

  /** Hace temblar la cámara (explosiones, golpes...). */
  temblar(intensidad: number, segundos: number): void {
    this.temblor = { intensidad, restante: segundos, duracion: segundos };
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
    const vivos = this.grupo?.filter((o) => !o.destruido) ?? [];
    if (vivos.length) {
      let [izquierda, derecha, abajo, arriba] = [Infinity, -Infinity, Infinity, -Infinity];
      for (const o of vivos) {
        izquierda = Math.min(izquierda, o.posicion.x);
        derecha = Math.max(derecha, o.posicion.x);
        abajo = Math.min(abajo, o.posicion.y);
        arriba = Math.max(arriba, o.posicion.y);
      }
      const f = 1 - Math.exp(-this.suavizado * dt);
      this.posicion.x += ((izquierda + derecha) / 2 - this.posicion.x) * f;
      this.posicion.y += ((abajo + arriba) / 2 - this.posicion.y) * f;
      // El zoom con el que caben todos (con su margen), sin acercarse más que al empezar ni alejarse sin fin
      const cabe = Math.min(this.anchoPantalla / (derecha - izquierda + this.margenGrupo * 2), this.altoPantalla / (arriba - abajo + this.margenGrupo * 2));
      const destino = Math.max(0.2, Math.min(this.zoomDeCerca, cabe));
      this._zoom += (destino - this._zoom) * f;
    }
    this.aplicarLimites();

    if (this.temblor.restante > 0) {
      this.temblor.restante = Math.max(0, this.temblor.restante - dt);
      const fuerza = this.temblor.intensidad * (this.temblor.restante / this.temblor.duracion);
      // Azar de verdad (no el de semilla()): el temblor solo se ve, no cambia el juego
      this.sacudida = new Vector2((Math.random() * 2 - 1) * fuerza, (Math.random() * 2 - 1) * fuerza);
    } else {
      this.sacudida = new Vector2(0, 0);
    }
  }

  /**
   * Centro de la cámara para dibujar: con el temblor y redondeado a un píxel
   * de pantalla (si no, los dibujos "tiemblan" medio píxel al moverse).
   */
  centroDibujo(): Vector2 {
    const z = this._zoom;
    return new Vector2(Math.round((this.posicion.x + this.sacudida.x) * z) / z, Math.round((this.posicion.y + this.sacudida.y) * z) / z);
  }

  /** Mundo → pantalla. */
  mundoAPantalla(x: number, y: number): Vector2 {
    const c = this.centroDibujo();
    return new Vector2(this.anchoPantalla / 2 + (x - c.x) * this._zoom, this.altoPantalla / 2 - (y - c.y) * this._zoom);
  }

  /** Pantalla → mundo (para el ratón). */
  pantallaAMundo(p: Vector2): Vector2 {
    const c = this.centroDibujo();
    return new Vector2((p.x - this.anchoPantalla / 2) / this._zoom + c.x, (this.altoPantalla / 2 - p.y) / this._zoom + c.y);
  }

  /** La zona del mundo que se ve ahora mismo. */
  zonaVisible(): Caja {
    const c = this.centroDibujo();
    const mw = this.anchoPantalla / 2 / this._zoom;
    const mh = this.altoPantalla / 2 / this._zoom;
    return { izquierda: c.x - mw, derecha: c.x + mw, abajo: c.y - mh, arriba: c.y + mh };
  }

  /** Borde izquierdo e inferior de lo que se ve (útil para dibujar fondos). */
  get izquierda(): number {
    return this.zonaVisible().izquierda;
  }
  get abajo(): number {
    return this.zonaVisible().abajo;
  }

  private aplicarLimites(): void {
    const l = this.limites;
    if (!l) return;
    const mw = this.anchoPantalla / 2 / this._zoom;
    const mh = this.altoPantalla / 2 / this._zoom;
    // Si la zona es más pequeña que lo que se ve, la centramos.
    this.posicion.x = l.derecha - l.izquierda <= mw * 2 ? (l.izquierda + l.derecha) / 2 : Math.min(Math.max(this.posicion.x, l.izquierda + mw), l.derecha - mw);
    this.posicion.y = l.arriba - l.abajo <= mh * 2 ? (l.abajo + l.arriba) / 2 : Math.min(Math.max(this.posicion.y, l.abajo + mh), l.arriba - mh);
  }
}
