/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: CC0-1.0 (las plantillas son de dominio público: ver LICENCIA.md)
 */

/** PLANTILLA «Plataformas»: correr, saltar, coger monedas, aplastar slimes y llegar a la bandera. */
import type { DefProyecto } from '../../proyecto/formato';
import { LADO, figura, letrero, mapa, proyectoBase, recursos, sitiosDeTexto } from '../ayudas';
import jugador from './jugador.chs?raw';

// El nivel, como se ve. # hierba · T tierra · L ladrillo · = madera (se sube desde abajo) · ^ pinchos
// J jugador · o moneda · s slime · F bandera
const NIVEL = [
  '............................................',
  '............................................',
  '............................................',
  '............................................',
  '.................o.o.o......................',
  '..........o.o...............................',
  '.........=====...LLLLL..........o...........',
  '............................o.............F.',
  '..J.o.o.........s.............s........#####',
  '##########...###############..#########TTTTT',
  'TTTTTTTTTT^^^TTTTTTTTTTTTTTT..TTTTTTTTTTTTTT',
];

export function plataformas(): DefProyecto {
  const en = (letra: string) => sitiosDeTexto(NIVEL, letra);
  return {
    ...proyectoBase('Mi juego de plataformas'),
    ...recursos(['heroe', 'slime', 'slime2', 'moneda', 'bandera', 'pinchos', 'hierba', 'tierra', 'ladrillo', 'madera'], ['salto', 'moneda', 'herida', 'golpe', 'ganar'], ['aventura']),
    animaciones: { slime: { fotogramas: ['slime', 'slime2'], velocidad: 3, repetir: true } },
    scripts: { 'jugador.chs': jugador },
    datos: { monedas: 0, vidas: 3 },
    escenaInicial: 'Nivel1',
    escenas: {
      Nivel1: {
        colorFondo: '#6ec6ff',
        camara: { seguir: 'Jugador', limitarAlMapa: true },
        objetos: [
          mapa(NIVEL, { '#': 'hierba', T: 'tierra', L: 'ladrillo', '=': 'madera', '^': 'pinchos' }, {
            hierba: { imagen: 'hierba', solida: true },
            tierra: { imagen: 'tierra', solida: true },
            ladrillo: { imagen: 'ladrillo', solida: true },
            madera: { imagen: 'madera', solida: true, soloDesdeArriba: true },
            pinchos: { imagen: 'pinchos', solida: false },
          }),
          ...en('o').map((p, i) => figura(`Moneda${i + 1}`, 'moneda', p.x, p.y, { colision: { solido: false, ancho: 28, alto: 28 } }, { ancho: 32, alto: 32 })),
          // Los slimes van y vienen solos (su «recorrido»: 5 casillas a la derecha y vuelta)
          ...en('s').map((p, i) => figura(`Slime${i + 1}`, 'slime', p.x, p.y, { colision: { solido: false, ancho: 40, alto: 30, desplazamientoY: -8 }, recorrido: { puntos: [{ x: LADO * 5, y: 0 }], rapidez: 70, pausa: 0.2 }, animacion: 'slime' })),
          ...en('F').map((p) => figura('Bandera', 'bandera', p.x, p.y, { colision: { solido: false } })),
          ...en('J').map((p) => figura('Jugador', 'heroe', p.x, p.y, { colision: { ancho: 30, alto: 44, desplazamientoY: -2 }, fisica: { rozamiento: 0, polvo: true }, script: 'jugador.chs' }, { capa: 3 })),
          letrero('Marcador', 16, 512, 'Monedas: {juego.monedas}   Vidas: {juego.vidas}', 22, { alinear: 'izquierda', sombra: 'negro', sombraX: 2, sombraY: -2 }),
          letrero('Ayuda', 944, 512, 'Flechas: andar · Espacio: saltar', 16, { alinear: 'derecha', sombra: 'negro', sombraX: 2, sombraY: -2 }),
        ],
      },
    },
  };
}
