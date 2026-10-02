/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: CC0-1.0 (las plantillas son de dominio público: ver LICENCIA.md)
 */

/** PLANTILLA «Carreras»: un coche visto desde arriba, un circuito, tres vueltas y el mejor tiempo. */
import type { DefProyecto } from '../../proyecto/formato';
import { LADO, figura, letrero, mapa, proyectoBase, recursos } from '../ayudas';
import coche from './coche.chs?raw';

// L muro · a pista · lo demás es hierba (se puede pisar, pero frena)
const CIRCUITO = [
  'LLLLLLLLLLLLLLLLLLLLLLLL',
  'L......................L',
  'L.aaaaaaaa....aaaaaaaa.L',
  'L.aaaaaaaa....aaaaaaaa.L',
  'L.aa....aa....aa....aa.L',
  'L.aa....aaaaaaaa....aa.L',
  'L.aa....aaaaaaaa....aa.L',
  'L.aa................aa.L',
  'L.aa................aa.L',
  'L.aaaaaaaaaaaaaaaaaaaa.L',
  'L.aaaaaaaaaaaaaaaaaaaa.L',
  'L......................L',
  'LLLLLLLLLLLLLLLLLLLLLLLL',
];

export function carreras(): DefProyecto {
  return {
    ...proyectoBase('Mi juego de carreras'),
    ...recursos(['coche', 'cesped', 'arena', 'ladrillo'], ['motor', 'powerup', 'ganar'], ['accion']),
    scripts: { 'coche.chs': coche },
    datos: { vuelta: 1, tiempo: 0, mejor: 0 },
    escenaInicial: 'Circuito',
    escenas: {
      Circuito: {
        colorFondo: '#2e7d32',
        gravedad: 0,
        camara: { seguir: 'Coche', limitarAlMapa: true },
        objetos: [
          mapa(CIRCUITO, { L: 'muro', a: 'pista' }, { hierba: { imagen: 'cesped', solida: false }, pista: { imagen: 'arena', solida: false }, muro: { imagen: 'ladrillo', solida: true } }, -1, 'hierba'),
          // La meta (se ve) y el control (no se ve): los dos se atraviesan y avisan al coche con «cuando toco»
          { nombre: 'Meta', x: LADO * 12, y: LADO * 3, sprite: { forma: 'rectangulo', color: 'blanco', patron: 'cuadros', color2: 'negro', relleno: 'patron', ancho: 16, alto: LADO * 2, capa: 1 }, colision: { solido: false } },
          { nombre: 'Control', x: LADO * 5.5, y: LADO * 10, sprite: { forma: 'rectangulo', color: 'blanco', ancho: 16, alto: LADO * 2, visible: false }, colision: { solido: false } },
          figura('Coche', 'coche', LADO * 13, LADO * 3, { colision: { ancho: 36, alto: 28 }, fisica: { gravedad: 0, rozamiento: 0 }, script: 'coche.chs' }, { capa: 3 }),
          letrero('Marcador', 16, 512, 'Vuelta {juego.vuelta} de 3   Tiempo: {juego.tiempo}', 22, { alinear: 'izquierda', sombra: 'negro', sombraX: 2, sombraY: -2 }),
          letrero('Mejor', 944, 512, 'Mejor: {juego.mejor}', 22, { alinear: 'derecha', color: 'amarillo', sombra: 'negro', sombraX: 2, sombraY: -2 }),
        ],
      },
    },
  };
}
