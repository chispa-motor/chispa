/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: CC0-1.0 (las plantillas son de dominio público: ver LICENCIA.md)
 */

/** PLANTILLA «Diálogos»: un pueblo, tres personajes con los que hablar y una misión con decisiones. */
import type { DefProyecto } from '../../proyecto/formato';
import { figura, letrero, mapa, proyectoBase, recursos, sitiosDeTexto } from '../ayudas';
import jugador from './jugador.chs?raw';
import ana from './ana.chs?raw';
import robot from './robot.chs?raw';
import gato from './gato.chs?raw';

// P piedra (muro) · A agua (el lago) · c camino · lo demás es hierba
// J jugador · N Ana · R robot · G gato · p poción
const PUEBLO = [
  'PPPPPPPPPPPPPPPPPPPP',
  'P..................P',
  'P..N.........AAA...P',
  'P..c........AAAAA..P',
  'P..c........AAAAAG.P',
  'P..cccccJccc.AAA...P',
  'P.......c..........P',
  'P.......c....PPP...P',
  'P..R.ccccc...PpP...P',
  'P............P.....P',
  'PPPPPPPPPPPPPPPPPPPP',
];

export function historia(): DefProyecto {
  const en = (letra: string) => sitiosDeTexto(PUEBLO, letra)[0];
  const quieto = { colision: { ancho: 34, alto: 40 }, fisica: { estatico: true } };
  return {
    ...proyectoBase('Mi historia'),
    ...recursos(['heroe', 'heroina', 'robot', 'gato', 'pocion', 'cesped', 'arena', 'piedra', 'agua'], ['powerup', 'moneda', 'ganar'], ['aventura']),
    scripts: { 'jugador.chs': jugador, 'ana.chs': ana, 'robot.chs': robot, 'gato.chs': gato },
    // Lo que el juego recuerda de la historia
    datos: { mision: 0, pocion: false, pista: false, objetivo: 'Habla con la gente del pueblo' },
    escenaInicial: 'Pueblo',
    escenas: {
      Pueblo: {
        colorFondo: '#2e7d32',
        gravedad: 0,
        camara: { limitarAlMapa: true },
        objetos: [
          mapa(PUEBLO, { P: 'piedra', A: 'agua', c: 'camino', J: 'camino' }, {
            hierba: { imagen: 'cesped', solida: false },
            camino: { imagen: 'arena', solida: false },
            piedra: { imagen: 'piedra', solida: true },
            agua: { imagen: 'agua', solida: true },
          }, -1, 'hierba'),
          figura('Ana', 'heroina', en('N').x, en('N').y, { ...quieto, script: 'ana.chs' }),
          figura('Robot', 'robot', en('R').x, en('R').y, { ...quieto, script: 'robot.chs' }),
          figura('Gato', 'gato', en('G').x, en('G').y, { colision: { solido: false, ancho: 30, alto: 30 }, script: 'gato.chs' }, { ancho: 40, alto: 40 }),
          figura('Pocion', 'pocion', en('p').x, en('p').y, { colision: { solido: false, ancho: 26, alto: 26 } }, { ancho: 32, alto: 32 }),
          figura('Jugador', 'heroe', en('J').x, en('J').y, { colision: { ancho: 30, alto: 36 }, fisica: { gravedad: 0, rozamiento: 0 }, script: 'jugador.chs' }, { capa: 3 }),
          letrero('Objetivo', 16, 512, '{juego.objetivo}', 20, { alinear: 'izquierda', sombra: 'negro', sombraX: 2, sombraY: -2 }),
        ],
      },
    },
  };
}
