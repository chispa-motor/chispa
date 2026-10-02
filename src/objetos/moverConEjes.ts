/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Mover un objeto «con los mandos»: lo que hacen yo.moverConFlechas, yo.moverConJugador
 * y el comportamiento «lo maneja un jugador». Se le dice hacia dónde (de -1 a 1 en
 * cada eje) y a qué rapidez:
 *
 *   - Si el objeto CAE (tiene física y hay gravedad): solo a los lados (para saltar, aparte).
 *   - Si no (juegos vistos desde arriba, naves...): en las cuatro direcciones.
 *   - Con física cambia su velocidad (así choca bien con las paredes); sin física, su posición.
 *   - En diagonal no va más rápido que en recto.
 *
 * Devuelve si se ha movido.
 */
import type { ObjetoJuego } from './ObjetoJuego';
import { Fisica } from './componentes/Fisica';
import { Sprite } from './componentes/Sprite';

export function moverConEjes(o: ObjetoJuego, ejeX: number, ejeY: number, rapidez: number): boolean {
  const escena = o.escena;
  if (!escena) return false;
  const f = o.obtener(Fisica);
  const conFisica = !!f && f.activo && !f.estatico;
  const cae = conFisica && f!.gravedad !== 0 && escena.gravedad !== 0;
  let dx = ejeX;
  let dy = cae ? 0 : ejeY;
  const largo = Math.hypot(dx, dy);
  if (largo > 1) {
    dx /= largo;
    dy /= largo;
  }
  if (conFisica) {
    f!.velocidad.x = dx * rapidez;
    if (!cae) f!.velocidad.y = dy * rapidez;
  } else {
    const dt = escena.motor.tiempo.delta;
    o.posicion.x += dx * rapidez * dt;
    o.posicion.y += dy * rapidez * dt;
  }
  // Mira hacia donde anda (las imágenes se dan la vuelta al ir a la izquierda)
  const s = o.obtener(Sprite);
  if (s && dx !== 0) s.voltearX = dx < 0;
  return dx !== 0 || dy !== 0;
}

/** ¿Cae este objeto? (tiene física, no es estático y hay gravedad): en un juego de plataformas, sí. */
export function cae(o: ObjetoJuego): boolean {
  const f = o.obtener(Fisica);
  return !!f && f.activo && !f.estatico && f.gravedad !== 0 && (o.escena?.gravedad ?? 0) !== 0;
}
