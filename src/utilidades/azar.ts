/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL AZAR DE CHISPA: aleatorio(), elegir(), probabilidad(), lista.mezclar(),
 * las partículas y los temblores salen de aquí.
 *
 * Normalmente es azar de verdad (el del navegador). Con semilla(1234), el
 * azar se repite: con la misma semilla salen siempre los mismos números en
 * el mismo orden. Sirve para mundos generados que son siempre iguales (el
 * «nivel del día»), para repetir una partida o para encontrar un fallo.
 *
 * El generador es «mulberry32»: muy rápido, con 32 bits de estado; de sobra
 * para juegos (no sirve para contraseñas, ni falta que hace).
 */

let estado: number | null = null;

/** Un número al azar entre 0 (incluido) y 1 (sin incluir). */
export function azar(): number {
  if (estado === null) return Math.random();
  estado = (estado + 0x6d2b79f5) | 0;
  let t = estado;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A partir de ahora, el azar se repite con esta semilla (un número). null vuelve al azar de verdad. */
export function ponerSemilla(semilla: number | null): void {
  estado = semilla === null ? null : Math.floor(semilla) | 0;
}

/** ¿Hay semilla puesta? (para el depurador y las pruebas) */
export function haySemilla(): boolean {
  return estado !== null;
}
