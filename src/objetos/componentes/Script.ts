/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Script (en TypeScript): comportamiento escrito a mano con funciones.
 *
 * En la Fase 3 añadimos ScriptChispa, que hace lo mismo pero leyendo código
 * .chs en español. Este se queda para usos internos del motor y para la demo
 * de la Fase 2.
 */
import { Componente } from '../Componente';
import type { ObjetoJuego } from '../ObjetoJuego';

export interface FuncionesScript {
  alIniciar?(yo: ObjetoJuego): void;
  alActualizar?(yo: ObjetoJuego, dt: number): void;
  alTocar?(yo: ObjetoJuego, otro: ObjetoJuego): void;
  alDejarDeTocar?(yo: ObjetoJuego, otro: ObjetoJuego): void;
}

export class Script extends Componente {
  constructor(private funciones: FuncionesScript) {
    super();
  }
  iniciar(): void {
    this.funciones.alIniciar?.(this.objeto);
  }
  actualizar(dt: number): void {
    this.funciones.alActualizar?.(this.objeto, dt);
  }
  alTocar(otro: ObjetoJuego): void {
    this.funciones.alTocar?.(this.objeto, otro);
  }
  alDejarDeTocar(otro: ObjetoJuego): void {
    this.funciones.alDejarDeTocar?.(this.objeto, otro);
  }
}
