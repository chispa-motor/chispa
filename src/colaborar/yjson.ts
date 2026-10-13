/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL PROYECTO DENTRO DE YJS (para programar juntos).
 *
 * Yjs es la librería que junta los cambios de varias personas sin que se pisen. Guarda los datos en
 * sus propios tipos (Y.Map es como un objeto, Y.Array como una lista, Y.Text como un texto). Aquí se
 * pasa el proyecto a esos tipos y se aplican en ellos los cambios de diferencias.ts.
 */
import * as Y from 'yjs';
import type { Cambio, Paso, Ruta } from './diferencias';

type Objeto = Record<string, unknown>;

/** De un valor normal a los tipos de Yjs (los objetos y las listas, por dentro también). */
export function aY(v: unknown): unknown {
  if (Array.isArray(v)) {
    const a = new Y.Array<unknown>();
    a.push(v.map(aY));
    return a;
  }
  if (typeof v === 'object' && v !== null) {
    const m = new Y.Map<unknown>();
    for (const [k, x] of Object.entries(v as Objeto)) if (x !== undefined) m.set(k, aY(x));
    return m;
  }
  return v;
}

function posicionEnY(lista: Y.Array<unknown>, nombre: string): number {
  let i = 0;
  for (const e of lista) {
    if (e instanceof Y.Map && e.get('nombre') === nombre) return i;
    i++;
  }
  return -1;
}

function pasoY(actual: unknown, p: Paso): unknown {
  if (actual instanceof Y.Map) return typeof p === 'string' ? actual.get(p) : undefined;
  if (actual instanceof Y.Array) {
    const i = typeof p === 'number' ? p : typeof p === 'object' ? posicionEnY(actual, p.nombre) : -1;
    return i >= 0 && i < actual.length ? actual.get(i) : undefined;
  }
  return undefined;
}

function navegarY(raiz: Y.Map<unknown>, ruta: Ruta): unknown {
  let actual: unknown = raiz;
  for (const p of ruta) {
    actual = pasoY(actual, p);
    if (actual === undefined) return undefined;
  }
  return actual;
}

/**
 * Aplica los cambios dentro de Yjs (hay que llamarla dentro de una transacción). Un cambio que ya no
 * tiene sitio (otra persona ha borrado ese objeto a la vez) se salta. Devuelve cuántos no tenían sitio.
 */
export function aplicarEnY(raiz: Y.Map<unknown>, cambios: Cambio[]): number {
  let saltados = 0;
  for (const c of cambios) {
    if (c.tipo === 'empalmar' || c.tipo === 'quitarNombre' || c.tipo === 'meterNombre') {
      const lista = navegarY(raiz, c.ruta);
      if (!(lista instanceof Y.Array)) {
        saltados++;
        continue;
      }
      if (c.tipo === 'empalmar') {
        if (c.desde > lista.length) {
          saltados++;
          continue;
        }
        const borrar = Math.min(c.borrar, lista.length - c.desde);
        if (borrar) lista.delete(c.desde, borrar);
        if (c.meter.length) lista.insert(c.desde, c.meter.map(aY));
      } else if (c.tipo === 'quitarNombre') {
        const i = posicionEnY(lista, c.nombre);
        if (i < 0) saltados++;
        else lista.delete(i, 1);
      } else {
        const despues = c.despuesDe === null ? -1 : posicionEnY(lista, c.despuesDe);
        lista.insert(c.despuesDe === null ? 0 : despues < 0 ? lista.length : despues + 1, [aY(c.valor)]);
      }
      continue;
    }
    if (!c.ruta.length) {
      saltados++;
      continue;
    }
    const padre = navegarY(raiz, c.ruta.slice(0, -1));
    const ultimo = c.ruta[c.ruta.length - 1];
    if (padre instanceof Y.Map && typeof ultimo === 'string') {
      if (c.tipo === 'poner') padre.set(ultimo, aY(c.valor));
      else padre.delete(ultimo);
    } else if (padre instanceof Y.Array) {
      const i = typeof ultimo === 'number' ? ultimo : typeof ultimo === 'object' ? posicionEnY(padre, ultimo.nombre) : -1;
      if (i < 0 || i >= padre.length) {
        saltados++;
        continue;
      }
      padre.delete(i, 1);
      if (c.tipo === 'poner') padre.insert(i, [aY(c.valor)]);
    } else saltados++;
  }
  return saltados;
}
