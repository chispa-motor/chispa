/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LAS PLANTILLAS DE PROYECTO: juegos pequeños y comentados de los que partir
 * (Proyecto nuevo > elegir una). Cada una es un proyecto normal, hecho con los
 * dibujos y los sonidos que trae Chispa: se abre, se juega y se cambia.
 */
import type { DefProyecto } from '../proyecto/formato';
import { plataformas } from './plataformas/proyecto';
import { aventura } from './aventura/proyecto';
import { naves } from './naves/proyecto';
import { puzzle } from './puzzle/proyecto';
import { carreras } from './carreras/proyecto';
import { cartas } from './cartas/proyecto';
import { historia } from './historia/proyecto';

export interface PlantillaProyecto {
  id: string;
  titulo: string;
  /** Una frase: qué juego es. */
  descripcion: string;
  /** Cómo se juega (las teclas). */
  controles: string;
  /** El dibujo (de los de Chispa) que la representa en la lista. */
  dibujo: string;
  color: string;
  /** Hace el proyecto (cada vez uno nuevo: se puede cambiar sin miedo). */
  crear: () => DefProyecto;
}

/** El dibujo que representa a la plantilla es también el icono del juego (se cambia en el inspector: Proyecto > icono). */
const conIcono = (crear: () => DefProyecto, icono: string) => (): DefProyecto => ({ ...crear(), icono });

export const PLANTILLAS: PlantillaProyecto[] = [
  { id: 'plataformas', titulo: 'Plataformas', descripcion: 'Corre, salta, coge monedas, aplasta slimes y llega a la bandera.', controles: 'Flechas y espacio', dibujo: 'heroe', color: '#6ec6ff', crear: conIcono(plataformas, 'heroe') },
  { id: 'aventura', titulo: 'Vista desde arriba', descripcion: 'Una cueva a oscuras con fantasmas, una llave, tres gemas y un cofre.', controles: 'Flechas', dibujo: 'heroina', color: '#3b2a55', crear: conIcono(aventura, 'heroina') },
  { id: 'naves', titulo: 'Naves', descripcion: 'Dispara a los ovnis que bajan. Con puntos, vidas y récord.', controles: 'Flechas y espacio', dibujo: 'nave', color: '#10122e', crear: conIcono(naves, 'nave') },
  { id: 'puzzle', titulo: 'Puzle', descripcion: 'Empuja las cajas hasta las estrellas, de casilla en casilla.', controles: 'Flechas y R', dibujo: 'robot', color: '#4a4568', crear: conIcono(puzzle, 'robot') },
  { id: 'carreras', titulo: 'Carreras', descripcion: 'Tres vueltas al circuito contra el reloj. Por la hierba se va lento.', controles: 'Flechas', dibujo: 'coche', color: '#2e7d32', crear: conIcono(carreras, 'coche') },
  { id: 'cartas', titulo: 'Cartas', descripcion: 'El juego de las parejas: levanta dos cartas iguales.', controles: 'Ratón', dibujo: 'corazon', color: '#1b5e20', crear: conIcono(cartas, 'corazon') },
  { id: 'historia', titulo: 'Diálogos', descripcion: 'Un pueblo, personajes con los que hablar y una misión con decisiones.', controles: 'Flechas y espacio', dibujo: 'gato', color: '#8d6e63', crear: conIcono(historia, 'gato') },
];

export function plantillaPorId(id: string): PlantillaProyecto | null {
  return PLANTILLAS.find((p) => p.id === id) ?? null;
}
