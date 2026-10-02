/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * `junta`: unir objetos con cuerdas, muelles y bisagras (ver Juntas.ts).
 *
 *   junta.cuerda(yo, buscar("Gancho"), 200)     una cuerda de 200 píxeles
 *   junta.cuerda(yo, vector(400, 500))          a un punto del mundo (su largo: lo lejos que está ahora)
 *   junta.muelle(yo, buscar("Techo"), 120, 80)  un muelle de 120 píxeles y rigidez 80
 *   junta.bisagra(yo, vector(400, 300))         gira alrededor de ese punto, como una puerta
 *   junta.quitar(yo)                            suelta todo lo que une a este objeto
 *   junta.visibles = falso                      no se dibujan
 */
import { ErrorChispa } from '../errores/ErrorChispa';
import type { Posicion } from '../lexico/tokens';
import { nombreTipo, type Valor } from '../ejecucion/valores';
import { Vector2 } from '../../motor/Vector2';
import { esColorValido } from '../../motor/Color';
import type { ObjetoJuego } from '../../objetos/ObjetoJuego';
import { MAXIMO_JUNTAS, RIGIDEZ_MAXIMA, RIGIDEZ_NORMAL, type Juntas, type TipoJunta } from '../../objetos/Juntas';
import { Fisica } from '../../objetos/componentes/Fisica';
import { argNumero, argTexto, comoLogico } from './argumentos';
import { Modulo, type Metodo } from './motor';
import { RefObjeto } from './objetos';

export interface ContextoJuntas {
  juntas(): Juntas;
  /** El objeto del script que lo pide. */
  yo(): ObjetoJuego | null;
}

export const NOMBRES_JUNTA = ['cuerda', 'muelle', 'bisagra', 'quitar', 'visibles'];

export function crearModuloJunta(ctx: ContextoJuntas): Modulo {
  /** El primer valor: el objeto que se une (tiene que existir). */
  const objeto = (a: Valor[], i: number, f: string, p: Posicion, ej: string): ObjetoJuego => {
    const v = a[i];
    if (v instanceof RefObjeto) return v.objeto;
    throw new ErrorChispa(p, `'junta.${f}' necesita un objeto, y le das ${v === undefined ? 'nada' : v === null ? 'un objeto vacío (nulo): ese objeto no existe' : nombreTipo(v)}.`, `Ejemplo: ${ej}`);
  };
  /** El segundo valor: a qué se une (otro objeto o un punto del mundo). */
  const extremo = (a: Valor[], f: string, p: Posicion, ej: string): ObjetoJuego | { x: number; y: number } => {
    const v = a[1];
    if (v instanceof RefObjeto) return v.objeto;
    if (v instanceof Vector2) return { x: v.x, y: v.y };
    throw new ErrorChispa(p, `'junta.${f}' necesita a qué unirlo: otro objeto o un punto (un vector), y le das ${v === undefined ? 'nada' : v === null ? 'un objeto vacío (nulo): ese objeto no existe' : nombreTipo(v)}.`, `Ejemplo: ${ej}`);
  };
  const color = (a: Valor[], i: number, f: string, p: Posicion, ej: string): string => {
    if (a[i] === undefined) return 'blanco';
    const c = argTexto(a, i, `junta.${f}`, p, ej);
    if (!esColorValido(c)) throw new ErrorChispa(p, `no conozco el color "${c}".`, `Ejemplo: ${ej}`);
    return c;
  };
  const unir = (tipo: TipoJunta, a: Valor[], p: Posicion, ej: string, conRigidez: boolean): null => {
    const uno = objeto(a, 0, tipo, p, ej);
    const otro = extremo(a, tipo, p, ej);
    if (otro === uno) throw new ErrorChispa(p, `no se puede unir un objeto consigo mismo.`, `Ejemplo: ${ej}`);
    // Si ninguno de los dos se mueve solo (sin Física), la junta no haría nada: mejor decirlo
    const seMueve = (o: ObjetoJuego) => !!o.obtener(Fisica) && !o.obtener(Fisica)!.estatico;
    if (!seMueve(uno) && !('posicion' in otro && seMueve(otro))) {
      throw new ErrorChispa(p, `'${uno.nombre}' no tiene Física (o es estático), así que la junta no puede moverlo.`, 'Actívale la Física en el inspector (y que no sea estático). El otro extremo sí puede estar quieto.');
    }
    let largo: number | null = null;
    if (tipo !== 'bisagra' && a[2] !== undefined && a[2] !== null) {
      largo = argNumero(a, 2, `junta.${tipo}`, p, ej);
      if (!(largo >= 0 && largo <= 100_000)) throw new ErrorChispa(p, `el largo va de 0 a 100000 píxeles, y le das ${largo}.`, `Ejemplo: ${ej}`);
    }
    let rigidez = RIGIDEZ_NORMAL;
    if (conRigidez && a[3] !== undefined) {
      rigidez = argNumero(a, 3, `junta.${tipo}`, p, ej);
      if (!(rigidez > 0 && rigidez <= RIGIDEZ_MAXIMA)) throw new ErrorChispa(p, `la rigidez de un muelle va de más de 0 (muy blando) a ${RIGIDEZ_MAXIMA} (durísimo), y le das ${rigidez}.`, `Lo normal es ${RIGIDEZ_NORMAL}. Ejemplo: ${ej}`);
    }
    const iColor = tipo === 'bisagra' ? 2 : conRigidez ? 4 : 3;
    if (!ctx.juntas().agregar(tipo, uno, otro, largo, rigidez, color(a, iColor, tipo, p, ej))) {
      throw new ErrorChispa(p, `hay demasiadas juntas (el máximo es ${MAXIMO_JUNTAS}).`, 'Quita las que ya no hagan falta con junta.quitar(objeto).');
    }
    return null;
  };

  const metodos: Record<string, Metodo> = {
    cuerda: (a, p) => unir('cuerda', a, p, 'junta.cuerda(yo, buscar("Gancho"), 200)', false),
    muelle: (a, p) => unir('muelle', a, p, 'junta.muelle(yo, buscar("Techo"), 120, 60)', true),
    bisagra: (a, p) => unir('bisagra', a, p, 'junta.bisagra(yo, vector(400, 300))', false),
    quitar: (a, p) => {
      // junta.quitar(yo): todas las de este objeto. junta.quitar(yo, otro): solo las que lo unen con ese
      const ej = 'junta.quitar(yo)';
      const uno = a[0] === undefined && ctx.yo() ? ctx.yo()! : objeto(a, 0, 'quitar', p, ej);
      const otro = a[1] === undefined ? undefined : objeto(a, 1, 'quitar', p, 'junta.quitar(yo, buscar("Gancho"))');
      return ctx.juntas().quitar(uno, otro);
    },
  };
  return new Modulo(
    'junta',
    {
      visibles: { obtener: () => ctx.juntas().visibles, asignar: (v, p) => (ctx.juntas().visibles = comoLogico(v, 'junta.visibles', p)) },
    },
    metodos,
    NOMBRES_JUNTA,
  );
}
