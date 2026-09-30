/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PIXEL ART: el dibujo que se hace en el editor de sprites, sin pantalla.
 *
 * Un dibujo es una rejilla de ancho × alto casillas ("píxeles") por cada
 * fotograma. Cada píxel guarda un color ("#ff8800") o null (transparente).
 * Aquí están las herramientas (lápiz, goma, cubo, líneas al arrastrar),
 * los fotogramas y el deshacer. El editor (EditorPixelArt) solo dibuja esto
 * en la pantalla y lo convierte en PNG al guardar.
 */

export type Pixel = string | null;

/** Colores para empezar (se pueden elegir otros con el selector de color). */
export const PALETA = [
  '#000000', '#ffffff', '#7f8c8d', '#c0c7d1',
  '#e74c3c', '#ff6fa8', '#e67e22', '#f1c40f',
  '#2ecc71', '#1e8449', '#3498db', '#1abcd4',
  '#9b59b6', '#8e5a2b', '#f5cba7', '#34495e',
];

export const TAMANOS = [8, 16, 24, 32, 48, 64];
const MAXIMO_DESHACER = 50;

export class PixelArt {
  fotogramas: Pixel[][];
  /** El fotograma que se está dibujando. */
  actual = 0;
  private pasado: string[] = [];
  private futuro: string[] = [];

  constructor(
    readonly ancho = 16,
    readonly alto = 16,
    fotogramas?: Pixel[][],
  ) {
    this.fotogramas = fotogramas?.length ? fotogramas.map((f) => [...f]) : [this.vacio()];
  }

  private vacio(): Pixel[] {
    return new Array(this.ancho * this.alto).fill(null);
  }

  private get pixeles(): Pixel[] {
    return this.fotogramas[this.actual];
  }

  dentro(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.ancho && y < this.alto;
  }

  obtener(x: number, y: number, fotograma = this.actual): Pixel {
    return this.dentro(x, y) ? this.fotogramas[fotograma][y * this.ancho + x] : null;
  }

  // ───────────────────────── Deshacer ─────────────────────────

  /** Guarda cómo estaba todo antes de un cambio (un trazo entero cuenta como un cambio). */
  apuntar(): void {
    this.pasado.push(JSON.stringify({ f: this.fotogramas, a: this.actual }));
    if (this.pasado.length > MAXIMO_DESHACER) this.pasado.shift();
    this.futuro = [];
  }

  deshacer(): boolean {
    const foto = this.pasado.pop();
    if (!foto) return false;
    this.futuro.push(JSON.stringify({ f: this.fotogramas, a: this.actual }));
    this.restaurar(foto);
    return true;
  }

  rehacer(): boolean {
    const foto = this.futuro.pop();
    if (!foto) return false;
    this.pasado.push(JSON.stringify({ f: this.fotogramas, a: this.actual }));
    this.restaurar(foto);
    return true;
  }

  private restaurar(foto: string): void {
    const d = JSON.parse(foto) as { f: Pixel[][]; a: number };
    this.fotogramas = d.f;
    this.actual = Math.min(d.a, d.f.length - 1);
  }

  // ───────────────────────── Herramientas ─────────────────────────

  /** Lápiz (con un color) o goma (con null). */
  pintar(x: number, y: number, color: Pixel): void {
    if (this.dentro(x, y)) this.pixeles[y * this.ancho + x] = color;
  }

  /** Una línea de píxeles de un punto a otro (para que un trazo rápido no deje huecos). */
  linea(x0: number, y0: number, x1: number, y1: number, color: Pixel): void {
    // Algoritmo de Bresenham: los píxeles que mejor siguen la recta
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      this.pintar(x0, y0, color);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * error;
      if (e2 >= dy) {
        error += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        error += dx;
        y0 += sy;
      }
    }
  }

  /** Cubo: pinta de un color toda la zona del mismo color que toca (sin pasar por las esquinas). */
  rellenar(x: number, y: number, color: Pixel): void {
    if (!this.dentro(x, y)) return;
    const original = this.obtener(x, y);
    if (original === color) return;
    const pendientes = [[x, y]];
    while (pendientes.length) {
      const [px, py] = pendientes.pop()!;
      if (!this.dentro(px, py) || this.obtener(px, py) !== original) continue;
      this.pintar(px, py, color);
      pendientes.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }

  /** Borra todo el fotograma actual. */
  limpiar(): void {
    this.fotogramas[this.actual] = this.vacio();
  }

  /** Da la vuelta al fotograma actual, como en un espejo. */
  voltear(): void {
    const f = this.pixeles;
    const nuevo = this.vacio();
    for (let y = 0; y < this.alto; y++) for (let x = 0; x < this.ancho; x++) nuevo[y * this.ancho + (this.ancho - 1 - x)] = f[y * this.ancho + x];
    this.fotogramas[this.actual] = nuevo;
  }

  // ───────────────────────── Fotogramas ─────────────────────────

  /** Añade un fotograma después del actual: una copia del actual (lo normal en animación: se cambia un poco). */
  duplicarFotograma(): void {
    this.fotogramas.splice(this.actual + 1, 0, [...this.pixeles]);
    this.actual++;
  }

  nuevoFotograma(): void {
    this.fotogramas.splice(this.actual + 1, 0, this.vacio());
    this.actual++;
  }

  borrarFotograma(): void {
    if (this.fotogramas.length <= 1) {
      this.limpiar();
      return;
    }
    this.fotogramas.splice(this.actual, 1);
    this.actual = Math.min(this.actual, this.fotogramas.length - 1);
  }

  /** Mueve el fotograma actual un sitio a la izquierda (-1) o a la derecha (+1). */
  moverFotograma(hacia: -1 | 1): void {
    const destino = this.actual + hacia;
    if (destino < 0 || destino >= this.fotogramas.length) return;
    [this.fotogramas[this.actual], this.fotogramas[destino]] = [this.fotogramas[destino], this.fotogramas[this.actual]];
    this.actual = destino;
  }

  /** ¿Está vacío (todo transparente) este fotograma? */
  estaVacio(fotograma = this.actual): boolean {
    return this.fotogramas[fotograma].every((p) => p === null);
  }
}

/** Lee los píxeles de una imagen (ya cargada en un canvas) para seguir editándola. */
export function pixelesDesdeRGBA(datos: Uint8ClampedArray, ancho: number, alto: number): Pixel[] {
  const pixeles: Pixel[] = [];
  for (let i = 0; i < ancho * alto; i++) {
    const [r, g, b, a] = [datos[i * 4], datos[i * 4 + 1], datos[i * 4 + 2], datos[i * 4 + 3]];
    pixeles.push(a < 128 ? null : `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
  }
  return pixeles;
}
