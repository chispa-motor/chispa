/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Física: hace que el objeto se mueva solo (velocidad), caiga (gravedad),
 * frene (rozamiento), rebote (rebote) y empuje a otros según su peso (masa).
 * Si además tiene Colisión, choca con los objetos sólidos y con otros
 * objetos con física (no se atraviesan).
 *
 * Es como un Rigidbody2D de Unity, pero pensado para entenderse:
 *   - Todo va en píxeles y segundos.
 *   - Los valores "de 0 a 1" (rozamiento, rebote) son porcentajes fáciles de imaginar.
 */
import { Componente } from '../Componente';
import { Vector2 } from '../../motor/Vector2';

/** Gravedad del mundo, por defecto, en píxeles/segundo² (cada escena puede cambiarla). */
export const GRAVEDAD_MUNDO = 1500;

export class Fisica extends Componente {
  /** Píxeles por segundo. Positivo en Y = hacia arriba. */
  velocidad = new Vector2(0, 0);
  /** Multiplicador de la gravedad: 1 = normal, 0 = flota (juegos vistos desde arriba), 0.5 = luna. */
  gravedad = 1;
  /**
   * Cuánto frena al tocar el suelo, de 0 (hielo: no frena nunca) a 1 (se para en seco).
   * Si la gravedad es 0 (vista desde arriba), frena siempre, en las dos direcciones.
   */
  rozamiento = 0.5;
  /** Cuánto rebota al chocar, de 0 (nada) a 1 (rebota con toda su fuerza, como una pelota perfecta). */
  rebote = 0;
  /** Cuánto pesa. Al chocar dos objetos con física, el que pesa más empuja al otro. */
  masa = 1;
  /** Levanta polvo al saltar y al caer al suelo (ver Efectos.polvo). */
  polvo = false;
  /** Velocidad máxima de caída, para que no atraviese el suelo al caer desde muy alto. */
  velocidadMaximaCaida = 1500;
  /** Un objeto estático no se mueve nunca: es como una pared (masa infinita). */
  estatico = false;

  // Estas las rellena el sistema de física en cada paso. Solo se leen.
  enSuelo = false;
  tocaTecho = false;
  tocaPared = false;

  /** Da un golpe al objeto: cambia su velocidad según su masa (los pesados se mueven menos). */
  empujar(fx: number, fy: number): void {
    const m = Math.max(0.001, this.masa);
    this.velocidad.x += fx / m;
    this.velocidad.y += fy / m;
  }
}
