/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Comprobación de los valores que se pasan a las funciones del motor.
 *
 * Cada función nativa (crear, aleatorio, sonido.tono...) comprueba sus
 * argumentos con estas ayudas. Si algo no encaja, el error dice qué función
 * era, qué esperaba y un EJEMPLO correcto de uso.
 */
import { ErrorChispa } from '../errores/ErrorChispa';
import type { Posicion } from '../lexico/tokens';
import { nombreTipo, type Valor } from '../ejecucion/valores';
import { Vector2 } from '../../motor/Vector2';

export function argNumero(args: Valor[], i: number, funcion: string, pos: Posicion, ejemplo: string, porDefecto?: number): number {
  const v = args[i];
  if (v === undefined && porDefecto !== undefined) return porDefecto;
  if (typeof v !== 'number') {
    throw new ErrorChispa(
      pos,
      v === undefined ? `a '${funcion}' le falta un número (el valor ${i + 1}).` : `'${funcion}' necesita un número como valor ${i + 1}, pero le das ${nombreTipo(v)}.`,
      `Ejemplo: ${ejemplo}`,
    );
  }
  return v;
}

export function argTexto(args: Valor[], i: number, funcion: string, pos: Posicion, ejemplo: string): string {
  const v = args[i];
  if (typeof v !== 'string') {
    throw new ErrorChispa(
      pos,
      v === undefined ? `a '${funcion}' le falta un texto entre comillas.` : `'${funcion}' necesita un texto entre comillas, pero le das ${nombreTipo(v)}.`,
      `Ejemplo: ${ejemplo}`,
    );
  }
  return v;
}

export function sinDemasiados(args: Valor[], cuantos: number, funcion: string, pos: Posicion, ejemplo: string): void {
  if (args.length > cuantos) {
    throw new ErrorChispa(pos, `a '${funcion}' le das demasiados valores (${args.length}; como mucho ${cuantos}).`, `Ejemplo: ${ejemplo}`);
  }
}

export function comoNumero(v: Valor, prop: string, pos: Posicion): number {
  if (typeof v !== 'number') throw new ErrorChispa(pos, `'${prop}' tiene que ser un número, pero le das ${nombreTipo(v)}.`);
  return v;
}

export function comoLogico(v: Valor, prop: string, pos: Posicion): boolean {
  if (typeof v !== 'boolean') throw new ErrorChispa(pos, `'${prop}' tiene que ser verdadero o falso, pero le das ${nombreTipo(v)}.`);
  return v;
}

export function comoVector(v: Valor, prop: string, pos: Posicion): Vector2 {
  if (!(v instanceof Vector2)) {
    throw new ErrorChispa(pos, `'${prop}' tiene que ser un vector, pero le das ${nombreTipo(v)}.`, `Crea uno con vector(x, y). Ejemplo: yo.${prop} = vector(0, 0)`);
  }
  return v;
}
