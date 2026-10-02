/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * `jugador(n)`: los controles del jugador n (de 1 a 4), se juegue con su
 * trozo del teclado o con su mando (ver Jugadores.ts).
 *
 *   controles(2).x   controles(2).y            hacia dónde quiere ir, de -1 a 1
 *   controles(2).pulsado("a")                ¿tiene pulsado el botón «a»?
 *   controles(2).sePulso("a")  .seSolto("a") justo en este fotograma
 *   controles(2).mando                       ¿juega con mando?
 *   controles(2).ponerTecla("a", "m")        cambia una de sus teclas
 */
import { ErrorChispa } from '../errores/ErrorChispa';
import { sugerir } from '../errores/sugerencias';
import type { Posicion } from '../lexico/tokens';
import { Anfitrion, FuncionNativa, type Valor } from '../ejecucion/valores';
import { MAXIMO_JUGADORES, comprobarAccion, type AccionJugador, type Jugadores } from '../../motor/Jugadores';
import { argTexto } from './argumentos';

const NOMBRES = ['x', 'y', 'mando', 'pulsado', 'sePulso', 'seSolto', 'ponerTecla'];

/** El número de jugador que se escribe en Chispa (de 1 a 4) → su posición (de 0 a 3). */
export function numeroDeJugador(v: Valor | undefined, funcion: string, pos: Posicion): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > MAXIMO_JUGADORES) {
    throw new ErrorChispa(pos, `'${funcion}' necesita el número del jugador: 1, 2, 3 o 4${v === undefined ? '' : ` (y le das ${typeof v === 'number' ? v : 'otra cosa'})`}.`, 'Ejemplo: controles(2).sePulso("a")');
  }
  return v - 1;
}

/** Los controles de UN jugador. */
export class ControlesJugador extends Anfitrion {
  constructor(private jugadores: () => Jugadores, private n: number) {
    super();
  }
  describir() {
    return `el jugador ${this.n + 1}`;
  }
  propiedadesConocidas() {
    return NOMBRES;
  }
  tieneMiembro(nombre: string) {
    return NOMBRES.some((x) => x.toLowerCase() === nombre);
  }
  obtener(p: string, original: string, pos: Posicion): Valor {
    const j = this.jugadores();
    const n = this.n;
    const accion = (a: Valor[], funcion: string, pos2: Posicion): AccionJugador => comprobarAccion(argTexto(a, 0, `controles(${n + 1}).${funcion}`, pos2, `controles(${n + 1}).${funcion}("a")`));
    switch (p) {
      case 'x': return j.ejes(n).x;
      case 'y': return j.ejes(n).y;
      case 'mando': return j.conMando(n);
      case 'pulsado': return new FuncionNativa(original, (a, pos2) => j.pulsado(n, accion(a, 'pulsado', pos2)));
      case 'sepulso': return new FuncionNativa(original, (a, pos2) => j.sePulso(n, accion(a, 'sePulso', pos2)));
      case 'sesolto': return new FuncionNativa(original, (a, pos2) => j.seSolto(n, accion(a, 'seSolto', pos2)));
      case 'ponertecla':
        return new FuncionNativa(original, (a, pos2) => {
          const ej = `controles(${n + 1}).ponerTecla("a", "m")`;
          j.ponerTecla(n, accion(a, 'ponerTecla', pos2), argTexto(a, 1, `controles(${n + 1}).ponerTecla`, pos2, ej));
          return null;
        });
    }
    const s = sugerir(original, NOMBRES);
    throw new ErrorChispa(pos, `los controles de un jugador no tienen nada llamado '${original}'.`, s ? `¿Querías decir '${s}'?` : `Lo que tiene: ${NOMBRES.join(', ')}.`);
  }
  asignar(_p: string, _v: Valor, original: string, pos: Posicion): void {
    throw new ErrorChispa(pos, `'${original}' de los controles de un jugador solo se puede leer: lo decide quien juega, con sus teclas o su mando.`, 'Para cambiar una tecla: controles(1).ponerTecla("a", "m")');
  }
}
