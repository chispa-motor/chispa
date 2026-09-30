/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Las recetas nuevas de la noche (bloque 8) no solo se escriben bien:
 * también FUNCIONAN al jugar, sin errores.
 */
import { describe, expect, it } from 'vitest';
import { RECETAS } from '../src/chispa/api/documentacion';
import { juegoDePrueba } from './ayudantes';

const receta = (inicio: string) => RECETAS.find((r) => r.titulo.startsWith(inicio))!.codigo;
const caja = { sprite: { ancho: 20, alto: 20 }, colision: {} };

describe('Recetas que se juegan', () => {
  it('el enemigo que patrulla persigue al jugador cuando lo ve, y no falla si el jugador desaparece', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: { 'e.chs': receta('Un enemigo que patrulla') },
      escena: [
        { nombre: 'Jugador', x: 400, y: 100, ...caja },
        { nombre: 'Enemigo', x: 100, y: 100, ...caja, fisica: { gravedad: 0 }, script: 'e.chs' },
      ],
    });
    j.avanzar(60);
    expect(j.buscar('Enemigo').posicion.x).toBeGreaterThan(150);
    j.juego.escena.destruir(j.buscar('Jugador'));
    j.avanzar(60);
    expect(j.errores).toEqual([]);
  });

  it('mensajes, aLaVez, rango, dash, barra de vida y sonidos: sin errores', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      plantillas: { Moneda: { sprite: { ancho: 10, alto: 10 } } },
      scripts: {
        'llave.chs': receta('Un objeto avisa').split('\n\ncuando recibo')[0],
        'puerta.chs': 'cuando recibo' + receta('Un objeto avisa').split('\n\ncuando recibo')[1],
        'fila.chs': receta('Crear muchas cosas'),
        'vida.chs': receta('Barra de vida'),
        'par.chs': receta('Hacer dos cosas'),
      },
      escena: [
        { nombre: 'Jugador', x: 100, y: 100, ...caja, fisica: { gravedad: 0 }, script: 'par.chs' },
        { nombre: 'Llave', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, colision: { solido: false }, script: 'llave.chs' },
        { nombre: 'Puerta', x: 600, y: 100, ...caja, script: 'puerta.chs' },
        { nombre: 'Fila', x: 0, y: 0, script: 'fila.chs' },
        { nombre: 'Vida', x: 0, y: 0, script: 'vida.chs' },
      ],
    });
    j.avanzar(30);
    expect(j.errores).toEqual([]);
    expect(j.juego.escena.buscar('Puerta')).toBeFalsy();
    expect(j.juego.escena.objetos.filter((o) => o.nombre.startsWith('Moneda')).length).toBe(8);
  });
});
