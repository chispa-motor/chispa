/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * GUARDAR Y CARGAR DATOS DEL JUGADOR (récords, niveles desbloqueados, opciones...)
 *
 *     guardar("record", 1500)
 *     variable r = cargar("record", 0)     # 0 si todavía no se había guardado nada
 *
 * Los datos se guardan en el navegador (localStorage), por proyecto: dos
 * juegos distintos no se pisan los datos aunque usen la misma clave.
 *
 * Se pueden guardar números, textos, lógicos, nulo, vectores, listas y tablas
 * (con todo lo que tengan dentro). Los OBJETOS del juego no, porque dejan de
 * existir al cerrar el juego.
 */
import { ErrorChispa } from '../errores/ErrorChispa';
import type { Posicion } from '../lexico/tokens';
import { Tabla, nombreTipo, type Valor } from '../ejecucion/valores';
import { Vector2 } from '../../motor/Vector2';

/** Valor de Chispa → texto JSON. */
export function serializar(v: Valor, pos: Posicion): string {
  return JSON.stringify(aJSON(v, pos));
}

function aJSON(v: Valor, pos: Posicion): unknown {
  if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map((e) => aJSON(e, pos));
  if (v instanceof Vector2) return { __vector: [v.x, v.y] };
  // Las tablas se guardan como lista de pares para conservar el ORDEN de las claves
  if (v instanceof Tabla) return { __tabla: v.pares().map(([k, e]) => [k, aJSON(e, pos)]) };
  throw new ErrorChispa(
    pos,
    `no se puede guardar ${nombreTipo(v)}: solo números, textos, verdadero/falso, listas, tablas y vectores.`,
    'Los objetos del juego no se pueden guardar porque desaparecen al cerrarlo. Guarda sus datos (por ejemplo, su vida o su posición).',
  );
}

/**
 * Texto JSON → valor de Chispa. Lo guardado puede estar roto o cambiado a
 * mano (está en el navegador, y cualquiera lo puede tocar): si algo no encaja,
 * esa parte vale nulo, pero nunca rompe el juego.
 */
export function deserializar(texto: string): Valor {
  try {
    return desdeJSON(JSON.parse(texto), 0);
  } catch {
    return null;
  }
}

/** Más hondo que esto no hay nada que guarde un juego de verdad (y así no se llena la pila). */
const PROFUNDIDAD_MAXIMA = 100;

function desdeJSON(d: unknown, profundidad: number): Valor {
  if (d === null || typeof d === 'string' || typeof d === 'boolean') return d;
  if (typeof d === 'number') return Number.isFinite(d) ? d : null;
  if (profundidad > PROFUNDIDAD_MAXIMA || typeof d !== 'object') return null;
  if (Array.isArray(d)) return d.map((e) => desdeJSON(e, profundidad + 1));
  const o = d as { __vector?: unknown; __tabla?: unknown };
  if (Array.isArray(o.__vector) && typeof o.__vector[0] === 'number' && typeof o.__vector[1] === 'number') return new Vector2(o.__vector[0], o.__vector[1]);
  if (Array.isArray(o.__tabla)) {
    const t = new Tabla();
    for (const par of o.__tabla) {
      if (Array.isArray(par) && typeof par[0] === 'string') t.poner(par[0], desdeJSON(par[1], profundidad + 1));
    }
    return t;
  }
  return null;
}
