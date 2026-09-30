/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Rejilla espacial: para encontrar rápido qué objetos están CERCA de otro.
 *
 * Sin ella, para saber con qué choca cada objeto habría que compararlo con
 * TODOS los demás: con 500 objetos, 250.000 comparaciones por fotograma.
 * Con la rejilla dividimos el mundo en celdas (como un tablero) y cada
 * objeto se apunta en las celdas que ocupa. Luego solo comparamos con los
 * que están en las mismas celdas.
 */
import type { Caja } from './componentes/Colision';

/** Una clave numérica por celda (más rápida que un texto "columna,fila"). */
const clave = (c: number, f: number) => (c + 1_000_000) * 2_000_003 + (f + 1_000_000);
const GRANDE = -1;

export class RejillaEspacial<T> {
  private celdas = new Map<number, T[]>();

  constructor(private tamano = 128) {}

  /** Celdas que toca una caja, o null si es enorme (va a la celda especial de los grandes). */
  private rango(caja: Caja): [number, number, number, number] | null {
    const t = this.tamano;
    const c0 = Math.floor(caja.izquierda / t);
    const c1 = Math.floor(caja.derecha / t);
    const f0 = Math.floor(caja.abajo / t);
    const f1 = Math.floor(caja.arriba / t);
    // Objetos enormes: evitamos recorrer millones de celdas
    return (c1 - c0 + 1) * (f1 - f0 + 1) > 4096 ? null : [c0, c1, f0, f1];
  }

  insertar(caja: Caja, dato: T): void {
    const r = this.rango(caja);
    const meter = (k: number) => {
      const lista = this.celdas.get(k);
      if (lista) lista.push(dato);
      else this.celdas.set(k, [dato]);
    };
    if (!r) return meter(GRANDE);
    for (let c = r[0]; c <= r[1]; c++) for (let f = r[2]; f <= r[3]; f++) meter(clave(c, f));
  }

  /** Todo lo que hay en las celdas que toca la caja (puede incluir cosas que no se solapan: hay que comprobarlo después). */
  consultar(caja: Caja): Set<T> {
    const res = new Set<T>();
    const r = this.rango(caja);
    if (!r) return res;
    for (let c = r[0]; c <= r[1]; c++) {
      for (let f = r[2]; f <= r[3]; f++) {
        const lista = this.celdas.get(clave(c, f));
        if (lista) for (const d of lista) res.add(d);
      }
    }
    return res;
  }

  /** Las cosas enormes se apuntan en una celda especial que se mira siempre. */
  consultarConGrandes(caja: Caja): Set<T> {
    const res = this.consultar(caja);
    const grandes = this.celdas.get(GRANDE);
    if (grandes) for (const d of grandes) res.add(d);
    return res;
  }
}
