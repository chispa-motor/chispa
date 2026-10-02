/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * VARIOS JUGADORES EN EL MISMO ORDENADOR (de 1 a 4): cada uno con sus
 * controles, que son SIEMPRE los mismos seis, se juegue con lo que se juegue:
 *
 *     arriba   abajo   izquierda   derecha   a (la acción principal)   b (la segunda)
 *
 * Cada jugador los tiene en un trozo del teclado («teclado partido») y, si
 * hay mandos conectados, también en el suyo (el primer mando es del jugador
 * 1, el segundo del 2...). Las dos cosas valen a la vez.
 *
 *     Jugador 1:  W A S D        a = espacio   b = F
 *     Jugador 2:  las flechas    a = Intro     b = Mayúsculas
 *     Jugador 3:  I J K L        a = O         b = U
 *     Jugador 4:  8 4 5 6        a = 0         b = 9      (el teclado de números)
 *     En el mando: la cruceta o la palanca izquierda;  a = A (✕)   b = B (◯) o X (▢)
 *
 * Mientras solo se use al jugador 1, también se mueve con las flechas (como
 * yo.moverConFlechas). En cuanto se usa a otro jugador, las flechas son del 2.
 */
import { comprobarNombreTecla, type Entrada } from './Entrada';
import { ErrorMotor } from './Errores';
import { sugerir } from '../chispa/errores/sugerencias';

export const ACCIONES_JUGADOR = ['arriba', 'abajo', 'izquierda', 'derecha', 'a', 'b'] as const;
export type AccionJugador = (typeof ACCIONES_JUGADOR)[number];
export const MAXIMO_JUGADORES = 4;

/** Las teclas de cada jugador (el teclado partido). */
export const TECLAS_JUGADOR: Record<AccionJugador, string>[] = [
  { arriba: 'w', abajo: 's', izquierda: 'a', derecha: 'd', a: 'espacio', b: 'f' },
  { arriba: 'arriba', abajo: 'abajo', izquierda: 'izquierda', derecha: 'derecha', a: 'enter', b: 'mayus' },
  { arriba: 'i', abajo: 'k', izquierda: 'j', derecha: 'l', a: 'o', b: 'u' },
  { arriba: '8', abajo: '5', izquierda: '4', derecha: '6', a: '0', b: '9' },
];

/** Qué botones del mando valen para cada acción. */
const BOTONES_DE_ACCION: Record<AccionJugador, string[]> = {
  arriba: ['arriba'], abajo: ['abajo'], izquierda: ['izquierda'], derecha: ['derecha'], a: ['a'], b: ['b', 'x'],
};

/** Comprueba el nombre de una acción ("a", "arriba"...) y da un error claro si no existe. */
export function comprobarAccion(accion: string): AccionJugador {
  const n = accion.trim().toLowerCase();
  const ok = ACCIONES_JUGADOR.find((a) => a === n);
  if (ok) return ok;
  const parecida = sugerir(accion, [...ACCIONES_JUGADOR]);
  throw new ErrorMotor(`Un jugador no tiene ningún control llamado "${accion}".`, (parecida ? `¿Querías decir "${parecida}"? ` : '') + 'Los controles de un jugador son: arriba, abajo, izquierda, derecha, a (la acción principal) y b (la segunda).');
}

export class Jugadores {
  /** Las teclas de cada jugador (se pueden cambiar con ponerTecla). */
  private teclas: Record<AccionJugador, string>[] = TECLAS_JUGADOR.map((t) => ({ ...t }));
  /** ¿Se ha usado ya a algún jugador que no sea el 1? (entonces las flechas son del 2) */
  varios = false;

  constructor(private entrada: Entrada) {}

  /** Apunta que se usa a este jugador (el primero es el 0). */
  usar(n: number): void {
    if (n > 0 && !this.varios) {
      this.varios = true;
      this.entrada.mandoHaceDeTeclado = false;
    }
  }

  /** Las teclas que valen ahora para un control de un jugador. */
  teclasDe(n: number, accion: AccionJugador): string[] {
    const suya = this.teclas[n][accion];
    // El jugador 1, mientras juega solo, también lleva las flechas
    const flecha = n === 0 && !this.varios && accion !== 'a' && accion !== 'b' ? TECLAS_JUGADOR[1][accion] : null;
    return flecha && flecha !== suya ? [suya, flecha] : [suya];
  }

  /** Cambia la tecla de un control de un jugador. */
  ponerTecla(n: number, accion: AccionJugador, tecla: string): void {
    this.teclas[n][accion] = comprobarNombreTecla(tecla);
  }

  /** ¿Lo tiene pulsado ahora? (con su tecla o con su mando) */
  pulsado(n: number, accion: AccionJugador): boolean {
    this.usar(n);
    return this.teclasDe(n, accion).some((t) => this.entrada.estaPulsada(t)) || BOTONES_DE_ACCION[accion].some((b) => this.entrada.mandos[n].botones.has(b));
  }

  /** ¿Lo ha pulsado justo en este fotograma? */
  sePulso(n: number, accion: AccionJugador): boolean {
    this.usar(n);
    return this.teclasDe(n, accion).some((t) => this.entrada.sePulso(t)) || BOTONES_DE_ACCION[accion].some((b) => this.entrada.mandos[n].pulsados.has(b));
  }

  /** ¿Lo ha soltado justo en este fotograma? */
  seSolto(n: number, accion: AccionJugador): boolean {
    this.usar(n);
    return this.teclasDe(n, accion).some((t) => this.entrada.seSolto(t)) || BOTONES_DE_ACCION[accion].some((b) => this.entrada.mandos[n].soltados.has(b));
  }

  /**
   * Hacia dónde quiere ir, de -1 a 1 en cada eje (la Y positiva, hacia arriba).
   * Con la palanca del mando, poco inclinada = despacio; con las teclas, -1, 0 o 1.
   */
  ejes(n: number): { x: number; y: number } {
    this.usar(n);
    const m = this.entrada.mandos[n];
    if (m.conectado && (m.ejeX !== 0 || m.ejeY !== 0)) return { x: m.ejeX, y: m.ejeY };
    const tecla = (accion: AccionJugador) => (this.teclasDe(n, accion).some((t) => this.entrada.estaPulsada(t)) || m.botones.has(accion) ? 1 : 0);
    return { x: tecla('derecha') - tecla('izquierda'), y: tecla('arriba') - tecla('abajo') };
  }

  /** ¿Tiene un mando conectado? */
  conMando(n: number): boolean {
    return this.entrada.mandos[n].conectado;
  }
}
