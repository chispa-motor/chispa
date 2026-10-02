/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: CC0-1.0 (las plantillas son de dominio público: ver LICENCIA.md)
 */

/** PLANTILLA «Naves»: una nave que dispara a los ovnis que bajan, con puntos, vidas y récord. */
import type { DefProyecto } from '../../proyecto/formato';
import { figura, letrero, proyectoBase, recursos } from '../ayudas';
import nave from './nave.chs?raw';
import bala from './bala.chs?raw';
import ovni from './ovni.chs?raw';
import oleadas from './oleadas.chs?raw';

export function naves(): DefProyecto {
  return {
    ...proyectoBase('Mi juego de naves'),
    ...recursos(['nave', 'ovni', 'bala'], ['disparo', 'explosion'], ['accion']),
    scripts: { 'nave.chs': nave, 'bala.chs': bala, 'ovni.chs': ovni, 'oleadas.chs': oleadas },
    datos: { puntos: 0, vidas: 3, record: 0 },
    // Las plantillas de objetos: de aquí salen las balas y los ovnis que se crean con crear("Bala", ...)
    plantillas: {
      Bala: figura('Bala', 'bala', 0, 0, { colision: { solido: false, ancho: 10, alto: 24 }, script: 'bala.chs' }, { ancho: 24, alto: 24 }),
      Ovni: figura('Ovni', 'ovni', 0, 0, { colision: { solido: false, ancho: 40, alto: 26 }, script: 'ovni.chs' }),
    },
    escenaInicial: 'Espacio',
    escenas: {
      Espacio: {
        colorFondo: '#090a1c',
        gravedad: 0,
        // La nieve, sobre un fondo oscuro, hace de estrellas que pasan
        clima: { tipo: 'nieve', intensidad: 0.6 },
        objetos: [
          figura('Nave', 'nave', 480, 80, { colision: { solido: false, ancho: 30, alto: 36 }, script: 'nave.chs', efecto: 'estela' }, { capa: 3 }),
          { nombre: 'Oleadas', x: 480, y: 600, script: 'oleadas.chs' },
          letrero('Marcador', 16, 512, 'Puntos: {juego.puntos}   Vidas: {juego.vidas}', 22, { alinear: 'izquierda' }),
          letrero('Record', 944, 512, 'Récord: {juego.record}', 22, { alinear: 'derecha', color: 'amarillo' }),
          letrero('Ayuda', 480, 16, 'Flechas: moverse · Espacio: disparar', 16, { color: '#8390a8' }),
        ],
      },
    },
  };
}
