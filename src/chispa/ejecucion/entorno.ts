/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Entorno: dónde viven las variables.
 *
 * Cada bloque (si, mientras, función, evento...) crea un entorno nuevo que
 * apunta a su "padre". Al buscar una variable, miramos en el actual; si no
 * está, en el padre, y así hasta llegar a las globales.
 *
 *   globales (crear, esperar, teclado...)
 *     └── script del Jugador (yo, rapidez, funciones...)
 *           └── cuando se pulsa "espacio"  (otro...)
 *                 └── si ...: (variables del bloque)
 *
 * Es lo mismo que las variables `local` de Luau: una variable creada dentro
 * de un `si` no existe fuera de él.
 */
import type { Valor } from './valores';

interface Casilla {
  valor: Valor;
  /** Nombre tal como se escribió, para mensajes y sugerencias. */
  original: string;
}

export class Entorno {
  private variables = new Map<string, Casilla>();

  constructor(readonly padre: Entorno | null = null) {}

  /** Crea (o reemplaza) una variable EN ESTE entorno. */
  declarar(nombre: string, valor: Valor, original = nombre): void {
    this.variables.set(nombre, { valor, original });
  }

  /** Busca una variable subiendo por los padres. */
  buscar(nombre: string): Casilla | undefined {
    let e: Entorno | null = this;
    while (e) {
      const c = e.variables.get(nombre);
      if (c) return c;
      e = e.padre;
    }
    return undefined;
  }

  /** Cambia una variable que ya existe. Devuelve falso si no existe en ningún sitio. */
  asignar(nombre: string, valor: Valor): boolean {
    const c = this.buscar(nombre);
    if (!c) return false;
    c.valor = valor;
    return true;
  }

  /** Todos los nombres visibles desde aquí (para sugerir "¿querías decir...?"). */
  nombresVisibles(): string[] {
    const nombres: string[] = [];
    let e: Entorno | null = this;
    while (e) {
      for (const c of e.variables.values()) nombres.push(c.original);
      e = e.padre;
    }
    return nombres;
  }

  /** Nombres creados por quien programa: los de este entorno y sus padres, sin llegar a `limite` (las globales). */
  nombresDeUsuario(limite: Entorno): string[] {
    const nombres: string[] = [];
    let e: Entorno | null = this;
    while (e && e !== limite) {
      for (const [n, c] of e.variables) if (n !== 'yo') nombres.push(c.original);
      e = e.padre;
    }
    return nombres;
  }

  /** Nombres (normalizados) declarados directamente en este entorno. */
  nombresPropios(): string[] {
    return [...this.variables.keys()];
  }
}
