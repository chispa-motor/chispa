/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * RAYOS: una línea invisible que sale de un punto en una dirección y dice
 * qué es lo primero que toca (un objeto con colisión o una casilla sólida).
 *
 * Sirve para saber si un enemigo "ve" al jugador (sin paredes en medio),
 * para láseres, para saber qué hay delante o debajo...
 *
 * Objetos: se prueba la caja de colisión de cada uno (el método de las
 * "franjas": en qué tramo del rayo está dentro de la caja en X y en Y).
 * Casillas: se recorren solo las casillas por las que pasa el rayo, una a
 * una en orden (así un rayo largo en un mapa enorme sigue siendo rápido).
 */
import { Vector2 } from '../motor/Vector2';
import type { Escena } from './Escena';
import type { ObjetoJuego } from './ObjetoJuego';
import { Colision, type Caja } from './componentes/Colision';
import { MapaCasillas } from './componentes/MapaCasillas';
import { Sprite } from './componentes/Sprite';
import { propio } from '../utilidades/seguro';

export interface Impacto {
  /** El objeto tocado (si es una casilla, el mapa). */
  objeto: ObjetoJuego;
  punto: Vector2;
  distancia: number;
  /** Si lo tocado es una casilla: su tipo. */
  casilla: string | null;
}

/**
 * Lanza un rayo desde `origen` en `direccion` (de largo 1) hasta `largo` píxeles.
 * `ignorar`: el objeto que lanza el rayo (y sus hijos), que no cuentan.
 */
export function lanzarRayo(escena: Escena, origen: Vector2, direccion: Vector2, largo: number, ignorar: ObjetoJuego | null = null): Impacto | null {
  let mejor: Impacto | null = null;
  for (const o of escena.objetos) {
    if (o.destruido || o === ignorar || (ignorar && esDescendiente(o, ignorar)) || o.obtener(Sprite)?.fijo) continue;
    const col = o.obtener(Colision);
    if (col?.activo) {
      const d = rayoContraCaja(origen, direccion, col.caja());
      if (d !== null && d <= largo && (!mejor || d < mejor.distancia)) mejor = impacto(o, origen, direccion, d, null);
    }
    const mapa = o.obtener(MapaCasillas);
    if (mapa?.activo) {
      const c = rayoContraMapa(mapa, origen, direccion, mejor ? mejor.distancia : largo);
      if (c && (!mejor || c.distancia < mejor.distancia)) mejor = impacto(o, origen, direccion, c.distancia, c.tipo);
    }
  }
  return mejor;
}

function impacto(o: ObjetoJuego, origen: Vector2, dir: Vector2, d: number, casilla: string | null): Impacto {
  return { objeto: o, punto: origen.sumar(dir.multiplicar(d)), distancia: d, casilla };
}

function esDescendiente(o: ObjetoJuego, antepasado: ObjetoJuego): boolean {
  for (let p = o.padre; p; p = p.padre) if (p === antepasado) return true;
  return false;
}

/** A qué distancia entra el rayo en la caja (0 si empieza dentro), o null si no la toca. */
export function rayoContraCaja(origen: Vector2, dir: Vector2, c: Caja): number | null {
  let entrada = 0;
  let salida = Infinity;
  for (const [o, d, min, max] of [[origen.x, dir.x, c.izquierda, c.derecha], [origen.y, dir.y, c.abajo, c.arriba]]) {
    if (Math.abs(d) < 1e-12) {
      if (o < min || o > max) return null; // paralelo y fuera
      continue;
    }
    let t1 = (min - o) / d;
    let t2 = (max - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    entrada = Math.max(entrada, t1);
    salida = Math.min(salida, t2);
    if (entrada > salida) return null;
  }
  return entrada;
}

/** La primera casilla sólida por la que pasa el rayo (recorriendo la rejilla casilla a casilla). */
function rayoContraMapa(m: MapaCasillas, origen: Vector2, dir: Vector2, largo: number): { distancia: number; tipo: string } | null {
  const t = m.tamano;
  let c = m.columnaEn(origen.x);
  let f = m.filaEn(origen.y);
  const pasoC = dir.x > 0 ? 1 : -1;
  const pasoF = dir.y > 0 ? 1 : -1;
  const caja = m.cajaDe(c, f);
  // Cuánto rayo hace falta para cruzar una casilla entera, y para llegar al primer borde
  const deltaX = Math.abs(dir.x) < 1e-12 ? Infinity : t / Math.abs(dir.x);
  const deltaY = Math.abs(dir.y) < 1e-12 ? Infinity : t / Math.abs(dir.y);
  let bordeX = Math.abs(dir.x) < 1e-12 ? Infinity : ((dir.x > 0 ? caja.derecha : caja.izquierda) - origen.x) / dir.x;
  let bordeY = Math.abs(dir.y) < 1e-12 ? Infinity : ((dir.y > 0 ? caja.arriba : caja.abajo) - origen.y) / dir.y;
  let recorrido = 0;
  for (let vueltas = 0; recorrido <= largo && vueltas < 100000; vueltas++) {
    const tipo = m.obtener(c, f);
    if (tipo && m.esSolida(tipo) && !propio(m.tipos, tipo)?.soloDesdeArriba) return { distancia: recorrido, tipo };
    if (bordeX < bordeY) {
      recorrido = bordeX;
      bordeX += deltaX;
      c += pasoC;
    } else {
      recorrido = bordeY;
      bordeY += deltaY;
      f += pasoF;
    }
  }
  return null;
}
