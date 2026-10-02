/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * `puntuaciones`: la tabla de las mejores puntuaciones del juego, guardada
 * en el ordenador de quien juega (como guardar() y cargar()).
 *
 *   puntuaciones.guardar("Ana", 1200)   apunta la puntuación; devuelve su puesto (0 si no entra)
 *   puntuaciones.lista()                las mejores, de mayor a menor: una lista de {nombre, puntos}
 *   puntuaciones.entra(1200)            ¿entraría en la tabla?
 *   puntuaciones.borrar()               deja la tabla vacía
 */
import { ErrorChispa } from '../errores/ErrorChispa';
import { Tabla, aTexto, type Valor } from '../ejecucion/valores';
import { argNumero } from './argumentos';
import { Modulo } from './motor';

/** Cuántas puntuaciones se guardan, y cuántas letras tiene un nombre como mucho. */
export const PUESTOS = 10;
export const LETRAS_NOMBRE = 16;
const CLAVE = 'chispa.puntuaciones';

export interface Puntuacion {
  nombre: string;
  puntos: number;
}

export interface ContextoPuntuaciones {
  guardarDato(clave: string, texto: string): void;
  cargarDato(clave: string): string | null;
  borrarDato(clave: string): void;
}

/** Lo guardado (si está roto o lo ha tocado alguien, se queda con lo que valga). */
export function leerPuntuaciones(ctx: ContextoPuntuaciones): Puntuacion[] {
  let datos: unknown;
  try {
    datos = JSON.parse(ctx.cargarDato(CLAVE) ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(datos)) return [];
  return datos
    .filter((d): d is Puntuacion => !!d && typeof d === 'object' && typeof (d as Puntuacion).nombre === 'string' && Number.isFinite((d as Puntuacion).puntos))
    .map((d) => ({ nombre: [...d.nombre].slice(0, LETRAS_NOMBRE).join(''), puntos: d.puntos }))
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, PUESTOS);
}

export function crearModuloPuntuaciones(ctx: ContextoPuntuaciones): Modulo {
  const entra = (tabla: Puntuacion[], puntos: number) => tabla.length < PUESTOS || puntos > tabla[tabla.length - 1].puntos;
  return new Modulo(
    'puntuaciones',
    {},
    {
      guardar: (a, p) => {
        const ej = 'puntuaciones.guardar("Ana", juego.puntos)';
        if (a[0] === undefined) throw new ErrorChispa(p, "a 'puntuaciones.guardar' le falta el nombre de quien ha jugado.", `Ejemplo: ${ej}`);
        // Solo se mira el principio: un nombre enorme no puede dejar el juego parado
        const nombre = [...aTexto(a[0]).slice(0, 200).replace(/\s+/g, ' ').trim()].slice(0, LETRAS_NOMBRE).join('') || '???';
        const puntos = argNumero(a, 1, 'puntuaciones.guardar', p, ej);
        if (!Number.isFinite(puntos)) throw new ErrorChispa(p, 'los puntos tienen que ser un número normal.', `Ejemplo: ${ej}`);
        const tabla = leerPuntuaciones(ctx);
        if (!entra(tabla, puntos)) return 0;
        // Con los mismos puntos, va delante quien llegó antes
        let puesto = tabla.findIndex((x) => puntos > x.puntos);
        if (puesto < 0) puesto = tabla.length;
        tabla.splice(puesto, 0, { nombre, puntos });
        ctx.guardarDato(CLAVE, JSON.stringify(tabla.slice(0, PUESTOS)));
        return puesto + 1;
      },
      lista: () =>
        leerPuntuaciones(ctx).map((x) => {
          const t = new Tabla();
          t.poner('nombre', x.nombre);
          t.poner('puntos', x.puntos);
          return t;
        }) as Valor,
      entra: (a, p) => entra(leerPuntuaciones(ctx), argNumero(a, 0, 'puntuaciones.entra', p, 'si puntuaciones.entra(juego.puntos):')),
      borrar: () => {
        ctx.borrarDato(CLAVE);
        return null;
      },
    },
    ['guardar', 'lista', 'entra', 'borrar'],
  );
}
