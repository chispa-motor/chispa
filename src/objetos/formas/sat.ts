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

/** Un círculo de verdad (los círculos chocan como círculos, no como polígonos: es más exacto y mucho más rápido). */
export interface Circulo {
  x: number;
  y: number;
  r: number;
}
/** Una pieza convexa: un polígono o un círculo. */
export type Pieza = Poligono | Circulo;
export const esCirculo = (p: Pieza): p is Circulo => !Array.isArray(p);

export interface Choque {
  /** Cuánto se meten una en otra (píxeles). */
  profundidad: number;
  /** Hacia dónde hay que mover la PRIMERA figura para sacarla (vector de largo 1). */
  nx: number;
  ny: number;
}

/** La caja que ocupan unas piezas. */
export function cajaDePiezas(piezas: Pieza[]): Caja {
  let izquierda = Infinity;
  let derecha = -Infinity;
  let abajo = Infinity;
  let arriba = -Infinity;
  for (const p of piezas) {
    if (esCirculo(p)) {
      izquierda = Math.min(izquierda, p.x - p.r);
      derecha = Math.max(derecha, p.x + p.r);
      abajo = Math.min(abajo, p.y - p.r);
      arriba = Math.max(arriba, p.y + p.r);
      continue;
    }
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
export function choquePiezas(a: Pieza, b: Pieza, margen = 0): Choque | null {
  if (esCirculo(a) && esCirculo(b)) return choqueCirculos(a, b, margen);
  if (esCirculo(a)) return choqueCirculoPoligono(a, b as Poligono, margen);
  if (esCirculo(b)) {
    const c = choqueCirculoPoligono(b, a, margen);
    return c && { profundidad: c.profundidad, nx: -c.nx, ny: -c.ny };
  }
  return choquePoligonos(a, b, margen);
}

/**
 * Un círculo contra una caja (sin girar), sin crear nada por el camino: es el
 * choque más común (pelotas contra suelos y paredes), así que va aparte.
 */
export function choqueCirculoCaja(cx: number, cy: number, r: number, c: Caja, margen = 0): Choque | null {
  const px = Math.min(Math.max(cx, c.izquierda), c.derecha);
  const py = Math.min(Math.max(cy, c.abajo), c.arriba);
  const dx = cx - px;
  const dy = cy - py;
  const d2 = dx * dx + dy * dy;
  if (d2 > 0) {
    const d = Math.sqrt(d2);
    if (d > r + margen) return null;
    return { profundidad: r - d, nx: dx / d, ny: dy / d };
  }
  // El centro está dentro de la caja: sale por el lado más cercano
  const opciones = [cx - c.izquierda, c.derecha - cx, cy - c.abajo, c.arriba - cy];
  const i = opciones.indexOf(Math.min(...opciones));
  const n = [[-1, 0], [1, 0], [0, -1], [0, 1]][i];
  return { profundidad: opciones[i] + r, nx: n[0], ny: n[1] };
}

export function choqueCirculos(a: Circulo, b: Circulo, margen: number): Choque | null {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const d = Math.hypot(dx, dy);
  const profundidad = a.r + b.r - d;
  if (profundidad < -margen) return null;
  return d > 1e-9 ? { profundidad, nx: dx / d, ny: dy / d } : { profundidad, nx: 0, ny: 1 };
}

/** Un círculo contra un polígono: los ejes del polígono y el que va del vértice más cercano al centro del círculo. */
function choqueCirculoPoligono(c: Circulo, pol: Poligono, margen: number): Choque | null {
  let mejor = Infinity;
  let nx = 0;
  let ny = 0;
  const probar = (ex: number, ey: number): boolean => {
    const centro = c.x * ex + c.y * ey;
    const [minB, maxB] = proyectar(pol, ex, ey);
    const solape = Math.min(centro + c.r - minB, maxB - (centro - c.r));
    if (solape < -margen) return false;
    if (solape < mejor) {
      mejor = solape;
      nx = ex;
      ny = ey;
    }
    return true;
  };
  let cercano = pol[0];
  let dmin = Infinity;
  for (let i = 0; i < pol.length; i++) {
    const p = pol[i];
    const q = pol[(i + 1) % pol.length];
    const l = Math.hypot(q.x - p.x, q.y - p.y);
    if (l > 1e-9 && !probar(-(q.y - p.y) / l, (q.x - p.x) / l)) return null;
    const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
    if (d < dmin) {
      dmin = d;
      cercano = p;
    }
  }
  const l = Math.sqrt(dmin);
  if (l > 1e-9 && !probar((c.x - cercano.x) / l, (c.y - cercano.y) / l)) return null;
  let cx = 0;
  let cy = 0;
  for (const q of pol) {
    cx += q.x;
    cy += q.y;
  }
  if ((c.x - cx / pol.length) * nx + (c.y - cy / pol.length) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { profundidad: mejor, nx, ny };
}

function choquePoligonos(a: Poligono, b: Poligono, margen: number): Choque | null {
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
export function choqueFiguras(a: Pieza[], b: Pieza[], margen = 0): Choque | null {
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
export function seTocanFiguras(a: Pieza[], b: Pieza[], margen = 0): boolean {
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
