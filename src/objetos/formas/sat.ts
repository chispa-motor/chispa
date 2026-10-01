/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CHOQUES ENTRE FIGURAS: el «teorema del eje separador» (SAT).
 *
 * Idea: dos figuras CONVEXAS no se tocan si hay una dirección en la que sus
 * sombras no se solapan (como dos cajas que, vistas desde arriba, están
 * separadas). Basta con probar las direcciones perpendiculares a sus lados.
 * Si en todas se solapan, se tocan, y la dirección donde se solapan MENOS es
 * por donde hay que separarlas (la «normal» del choque).
 *
 * Las figuras con entrantes (estrella, corazón...) ya vienen partidas en
 * piezas convexas (figuras.ts), así que aquí solo hay piezas convexas.
 */
import type { Caja } from '../componentes/Colision';
import type { Poligono } from './figuras';

export interface Choque {
  /** Cuánto se meten una en otra (píxeles). */
  profundidad: number;
  /** Hacia dónde hay que mover la PRIMERA figura para sacarla (vector de largo 1). */
  nx: number;
  ny: number;
}

/** La caja que ocupan unas piezas. */
export function cajaDePiezas(piezas: Poligono[]): Caja {
  let izquierda = Infinity;
  let derecha = -Infinity;
  let abajo = Infinity;
  let arriba = -Infinity;
  for (const p of piezas) {
    for (const q of p) {
      if (q.x < izquierda) izquierda = q.x;
      if (q.x > derecha) derecha = q.x;
      if (q.y < abajo) abajo = q.y;
      if (q.y > arriba) arriba = q.y;
    }
  }
  if (izquierda === Infinity) return { izquierda: 0, derecha: 0, abajo: 0, arriba: 0 };
  return { izquierda, derecha, abajo, arriba };
}

export function cajaComoPieza(c: Caja): Poligono {
  return [
    { x: c.izquierda, y: c.abajo },
    { x: c.derecha, y: c.abajo },
    { x: c.derecha, y: c.arriba },
    { x: c.izquierda, y: c.arriba },
  ];
}

/** Choque entre dos piezas convexas (null si no se tocan). `margen` > 0 cuenta como tocar si están a esa distancia. */
export function choquePiezas(a: Poligono, b: Poligono, margen = 0): Choque | null {
  let mejor = Infinity;
  let nx = 0;
  let ny = 0;
  for (const pol of [a, b]) {
    for (let i = 0; i < pol.length; i++) {
      const p = pol[i];
      const q = pol[(i + 1) % pol.length];
      let ex = -(q.y - p.y);
      let ey = q.x - p.x;
      const l = Math.hypot(ex, ey);
      if (l < 1e-9) continue;
      ex /= l;
      ey /= l;
      const [minA, maxA] = proyectar(a, ex, ey);
      const [minB, maxB] = proyectar(b, ex, ey);
      const solape = Math.min(maxA - minB, maxB - minA);
      if (solape < -margen) return null;
      if (solape < mejor) {
        mejor = solape;
        nx = ex;
        ny = ey;
      }
    }
  }
  if (mejor === Infinity) return null;
  // La normal tiene que apuntar de b hacia a (hacia donde se saca a)
  const [ca, cb] = [centro(a), centro(b)];
  if ((ca.x - cb.x) * nx + (ca.y - cb.y) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { profundidad: mejor, nx, ny };
}

/** El choque más profundo entre dos figuras hechas de piezas (null si no se tocan). */
export function choqueFiguras(a: Poligono[], b: Poligono[], margen = 0): Choque | null {
  let peor: Choque | null = null;
  for (const pa of a) {
    for (const pb of b) {
      const c = choquePiezas(pa, pb, margen);
      if (c && (!peor || c.profundidad > peor.profundidad)) peor = c;
    }
  }
  return peor;
}

/** ¿Se tocan (o están a menos de `margen`)? */
export function seTocanFiguras(a: Poligono[], b: Poligono[], margen = 0): boolean {
  for (const pa of a) for (const pb of b) if (choquePiezas(pa, pb, margen)) return true;
  return false;
}

function proyectar(p: Poligono, ex: number, ey: number): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const q of p) {
    const d = q.x * ex + q.y * ey;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

function centro(p: Poligono): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const q of p) {
    x += q.x;
    y += q.y;
  }
  return { x: x / p.length, y: y / p.length };
}
