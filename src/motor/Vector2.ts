/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Vector2: un par de números (x, y).
 *
 * Lo usamos para posiciones, velocidades, direcciones y tamaños.
 * Es el equivalente a Vector2 de Roblox o de Unity.
 *
 * DECISIÓN: las operaciones devuelven un vector NUEVO en lugar de modificar
 * el original. Es un poco más lento, pero evita errores muy difíciles de
 * encontrar (dos objetos compartiendo sin querer el mismo vector).
 * Si algún día el rendimiento importa, añadiremos versiones "en el sitio".
 */
export class Vector2 {
  constructor(
    public x = 0,
    public y = 0,
  ) {}

  static cero(): Vector2 {
    return new Vector2(0, 0);
  }

  sumar(otro: Vector2): Vector2 {
    return new Vector2(this.x + otro.x, this.y + otro.y);
  }

  restar(otro: Vector2): Vector2 {
    return new Vector2(this.x - otro.x, this.y - otro.y);
  }

  multiplicar(n: number): Vector2 {
    return new Vector2(this.x * n, this.y * n);
  }

  /** Longitud (tamaño) del vector, usando Pitágoras. */
  longitud(): number {
    return Math.hypot(this.x, this.y);
  }

  /**
   * Devuelve el mismo vector pero con longitud 1 (misma dirección).
   * Muy útil para que moverse en diagonal no sea más rápido que en recto.
   */
  normalizado(): Vector2 {
    const l = this.longitud();
    return l === 0 ? Vector2.cero() : new Vector2(this.x / l, this.y / l);
  }

  distancia(otro: Vector2): number {
    return this.restar(otro).longitud();
  }

  copiar(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  toString(): string {
    return `(${Math.round(this.x)}, ${Math.round(this.y)})`;
  }
}
