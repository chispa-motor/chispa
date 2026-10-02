/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: CC0-1.0 (las plantillas son de dominio público: ver LICENCIA.md)
 */

/** PLANTILLA «Cartas»: el juego de las parejas. Doce cartas boca abajo, con el ratón. */
import type { DefProyecto } from '../../proyecto/formato';
import { figura, letrero, proyectoBase, recursos } from '../ayudas';
import mesa from './mesa.chs?raw';
import carta from './carta.chs?raw';

export function cartas(): DefProyecto {
  return {
    ...proyectoBase('Mi juego de cartas'),
    ...recursos(['madera', 'gema', 'estrella', 'corazon', 'llave', 'moneda', 'pocion'], ['clic', 'moneda', 'ganar']),
    scripts: { 'mesa.chs': mesa, 'carta.chs': carta },
    datos: { parejas: 0, intentos: 0 },
    // La carta es una plantilla: la mesa crea doce copias al empezar. Boca abajo enseña la madera
    plantillas: {
      Carta: figura('Carta', 'madera', 0, 0, { colision: { solido: false }, script: 'carta.chs', propiedades: { dibujo: '', levantada: false } }, { ancho: 96, alto: 96, borde: 4, colorBorde: '#3e2723', sombra: '#00000066', sombraX: 4, sombraY: -4 }),
    },
    escenaInicial: 'Mesa',
    escenas: {
      Mesa: {
        colorFondo: '#1b5e20',
        gravedad: 0,
        objetos: [
          { nombre: 'Mesa', x: 480, y: 270, script: 'mesa.chs' },
          letrero('Marcador', 480, 505, 'Parejas: {juego.parejas} de 6   Intentos: {juego.intentos}', 24),
          letrero('Ayuda', 480, 20, 'Haz clic en dos cartas: si son iguales, se quedan boca arriba', 16, { color: '#c8e6c9' }),
        ],
      },
    },
  };
}
