/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LOS SONIDOS Y LA MÚSICA QUE TRAE CHISPA: efectos hechos con el generador
 * de efectos (sus números) y canciones hechas con el editor de música (sus
 * notas). Son originales de Chispa: se pueden usar en cualquier juego.
 *
 * Al añadirlos a un proyecto se pueden abrir y retocar, como si los hubiera
 * hecho quien usa el editor.
 */
import { completarSonido, type ParamsSonido } from '../sonido/generador';
import { cancionDeEjemplo, ponerNota, type DefCancion, type Instrumento } from '../sonido/musica';

export interface SonidoListo {
  nombre: string;
  titulo: string;
  sonido: ParamsSonido;
}

const s = (nombre: string, titulo: string, datos: Partial<ParamsSonido>): SonidoListo => ({ nombre, titulo, sonido: completarSonido(datos) });

export const SONIDOS_LISTOS: SonidoListo[] = [
  s('salto', 'Salto', { onda: 'cuadrada', ancho: 0.5, frecuencia: 300, deslizar: 4, sostenido: 0.12, caida: 0.12, volumen: 0.45 }),
  s('moneda', 'Moneda', { onda: 'cuadrada', frecuencia: 988, salto: 5, cuandoSalta: 0.07, sostenido: 0.07, golpe: 0.4, caida: 0.3, volumen: 0.45 }),
  s('explosion', 'Explosión', { onda: 'ruido', frecuencia: 180, deslizar: -1.2, sostenido: 0.2, golpe: 0.5, caida: 0.6, quitarAgudos: 4000, cambioAgudos: -2, volumen: 0.7, semilla: 7 }),
  s('disparo', 'Disparo', { onda: 'sierra', frecuencia: 1100, deslizar: -5, frecuenciaMinima: 120, sostenido: 0.1, caida: 0.12, volumen: 0.4 }),
  s('golpe', 'Golpe', { onda: 'ruido', frecuencia: 400, deslizar: -4, sostenido: 0.03, golpe: 0.5, caida: 0.12, volumen: 0.6, semilla: 3 }),
  s('herida', 'Daño', { onda: 'cuadrada', ancho: 0.3, frecuencia: 220, deslizar: -2.5, sostenido: 0.08, caida: 0.15, volumen: 0.5 }),
  s('powerup', 'Power-up', { onda: 'cuadrada', frecuencia: 330, deslizar: 1.6, repetir: 0.1, sostenido: 0.3, caida: 0.3, volumen: 0.45 }),
  s('clic', 'Clic (menú)', { onda: 'seno', frecuencia: 700, sostenido: 0.03, caida: 0.05, quitarGraves: 100, volumen: 0.4 }),
  s('ganar', 'Ganar', { onda: 'cuadrada', ancho: 0.4, frecuencia: 523, deslizar: 2.2, repetir: 0.12, sostenido: 0.45, caida: 0.35, volumen: 0.45 }),
  s('perder', 'Perder', { onda: 'sierra', frecuencia: 400, deslizar: -1.5, sostenido: 0.4, caida: 0.5, vibrato: 1.5, velocidadVibrato: 7, volumen: 0.45 }),
  s('motor', 'Motor (para poner en bucle)', { onda: 'sierra', frecuencia: 90, sostenido: 0.6, caida: 0, vibrato: 0.8, velocidadVibrato: 28, quitarAgudos: 900, volumen: 0.4 }),
];

export interface CancionLista {
  nombre: string;
  titulo: string;
  cancion: DefCancion;
}

/** Escribe una canción a partir de sus pistas: de cada una, su instrumento, su volumen y sus notas [paso, nota, largo]. */
function cancion(tempo: number, pasos: number, pistas: [Instrumento, number, [number, number, number?][]][]): DefCancion {
  const c: DefCancion = { tempo, pasos, bucle: true, pistas: pistas.map(([instrumento, volumen]) => ({ instrumento, volumen, notas: [] })) };
  pistas.forEach(([, , notas], i) => notas.forEach(([paso, nota, largo]) => ponerNota(c, c.pistas[i], paso, nota, largo ?? 1)));
  return c;
}

/** El mismo dibujo de batería repetido cada `cada` pasos. */
const ritmo = (pasos: number, cada: number, golpes: [number, number][]): [number, number][] =>
  Array.from({ length: pasos / cada }, (_, i) => golpes.map(([paso, tambor]): [number, number] => [i * cada + paso, tambor])).flat();

export const CANCIONES_LISTAS: CancionLista[] = [
  { nombre: 'aventura', titulo: 'Aventura (alegre)', cancion: cancionDeEjemplo() },
  {
    // En La menor, lenta: para cuevas, noches y castillos
    nombre: 'misterio', titulo: 'Misterio (lenta)',
    cancion: cancion(84, 64, [
      ['campana', 0.7, [[0, 69, 4], [8, 72, 4], [16, 76, 6], [24, 74, 2], [26, 72, 2], [28, 71, 4], [32, 69, 4], [40, 67, 4], [48, 64, 6], [56, 67, 4], [60, 71, 4]]],
      ['organo', 0.45, [[0, 45, 14], [16, 41, 14], [32, 43, 14], [48, 40, 14]]],
      ['bajo', 0.7, [[0, 33, 3], [8, 33, 3], [16, 29, 3], [24, 29, 3], [32, 31, 3], [40, 31, 3], [48, 28, 3], [56, 28, 3]]],
      ['bateria', 0.5, ritmo(64, 16, [[0, 0], [8, 4], [12, 2]])],
    ]),
  },
  {
    // Rápida, para carreras, persecuciones y combates
    nombre: 'accion', titulo: 'Acción (rápida)',
    cancion: cancion(150, 32, [
      ['sierra', 0.6, [[0, 64, 2], [2, 67, 2], [4, 69, 2], [6, 67, 1], [7, 69, 1], [8, 72, 3], [12, 71, 2], [14, 69, 2], [16, 67, 2], [18, 69, 2], [20, 72, 2], [22, 74, 2], [24, 76, 4], [28, 74, 2], [30, 72, 2]]],
      ['bajo', 0.8, ritmo(32, 2, [[0, 0]]).map(([paso], i): [number, number, number] => [paso, [33, 33, 33, 33, 29, 29, 29, 29, 31, 31, 31, 31, 28, 28, 31, 31][i], 1])],
      ['bateria', 0.8, ritmo(32, 8, [[0, 0], [2, 2], [4, 1], [6, 2], [3, 0]])],
    ]),
  },
];
