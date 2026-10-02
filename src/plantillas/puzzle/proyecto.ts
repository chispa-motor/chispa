/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: CC0-1.0 (las plantillas son de dominio público: ver LICENCIA.md)
 */

/** PLANTILLA «Puzle»: empujar cajas hasta sus marcas, de casilla en casilla. */
import type { DefProyecto } from '../../proyecto/formato';
import { LADO, figura, letrero, mapa, proyectoBase, recursos, sitiosDeTexto } from '../ayudas';
import jugador from './jugador.chs?raw';

// P pared · J jugador · c caja · m marca (donde hay que dejar una caja)
const NIVEL = [
  'PPPPPPPPPP',
  'P...P....P',
  'P.J.c..m.P',
  'P...PP...P',
  'P.c....m.P',
  'P..c.P..mP',
  'P....P...P',
  'PPPPPPPPPP',
];
// El mapa va centrado en la pantalla
const X = (960 - NIVEL[0].length * LADO) / 2;
const Y = (540 - NIVEL.length * LADO) / 2 - 12;

export function puzzle(): DefProyecto {
  const en = (letra: string) => sitiosDeTexto(NIVEL, letra, X, Y);
  return {
    ...proyectoBase('Mi puzle'),
    ...recursos(['robot', 'madera', 'estrella', 'ladrillo', 'arena'], ['golpe', 'ganar']),
    scripts: { 'jugador.chs': jugador },
    datos: { pasos: 0 },
    escenaInicial: 'Nivel1',
    escenas: {
      Nivel1: {
        colorFondo: '#2d2a3e',
        gravedad: 0,
        objetos: [
          mapa(NIVEL, { P: 'pared' }, { suelo: { imagen: 'arena', solida: false }, pared: { imagen: 'ladrillo', solida: true } }, -1, 'suelo', X, Y),
          ...en('m').map((p, i) => figura(`Marca${i + 1}`, 'estrella', p.x, p.y, {}, { capa: 1, ancho: 30, alto: 30, opacidad: 0.6 })),
          ...en('c').map((p, i) => figura(`Caja${i + 1}`, 'madera', p.x, p.y, {}, { ancho: 40, alto: 40, borde: 3, colorBorde: '#5d4037' })),
          ...en('J').map((p) => figura('Jugador', 'robot', p.x, p.y, { script: 'jugador.chs' }, { capa: 3, ancho: 44, alto: 44 })),
          letrero('Marcador', 480, 512, 'Pasos: {juego.pasos}', 24),
          letrero('Ayuda', 480, 20, 'Flechas: moverse y empujar · R: empezar otra vez', 16, { color: '#b9b4d0' }),
        ],
      },
    },
  };
}
