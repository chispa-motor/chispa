/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PLATAFORMAS (sesión 3, bloque 2): que se mueven solas (recorrido), que
 * llevan encima al jugador, y que se atraviesan desde abajo.
 */
import { describe, expect, it } from 'vitest';
import { juegoDePrueba, unObjeto } from './ayudantes';
import type { DefObjeto } from '../src/proyecto/formato';

const suelo: DefObjeto = { nombre: 'Suelo', x: 480, y: 10, sprite: { ancho: 2000, alto: 20 }, colision: {} };
const jugador = (x: number, y: number, script?: string): DefObjeto => ({ nombre: 'Jugador', x, y, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: {}, script });

describe('Recorrido: objetos que se mueven solos', () => {
  it('ida y vuelta entre dos puntos (los puntos son relativos al inicio)', () => {
    const j = juegoDePrueba({ escena: [{ nombre: 'P', x: 100, y: 300, sprite: { ancho: 80, alto: 20 }, colision: {}, recorrido: { puntos: [{ x: 200, y: 0 }], rapidez: 100, pausa: 0 } }] });
    j.avanzar(120);
    expect(j.buscar('P').posicion.x).toBeCloseTo(300, 0);
    j.avanzar(120);
    expect(j.buscar('P').posicion.x).toBeCloseTo(100, 0);
  });

  it('en bucle por un camino de varios puntos, y con pausa en cada punto', () => {
    const j = juegoDePrueba({
      escena: [{ nombre: 'P', x: 0, y: 0, recorrido: { puntos: [{ x: 100, y: 0 }, { x: 100, y: 100 }], rapidez: 200, modo: 'bucle', pausa: 0.25 } }],
    });
    const p = () => [Math.round(j.buscar('P').posicion.x), Math.round(j.buscar('P').posicion.y)];
    j.avanzar(36); // 0,6 s: ha llegado (0,5 s) y espera
    expect(p()).toEqual([100, 0]);
    j.avanzar(42); // 1,3 s: pausa hasta 0,75 y sube hasta 1,25; ahora espera arriba
    expect(p()).toEqual([100, 100]);
    j.avanzar(62); // 2,33 s: espera hasta 1,5 y vuelve en diagonal (141 px a 200 px/s = 0,71 s)
    expect(p()).toEqual([0, 0]);
  });

  it('una plantilla con recorrido lo hace desde donde se crea', () => {
    const j = juegoDePrueba({
      scripts: { 'c.chs': 'cuando empieza:\n    crear("Nube", 500, 400)\n' },
      plantillas: { Nube: { sprite: { ancho: 50, alto: 10 }, recorrido: { puntos: [{ x: 0, y: -100 }], rapidez: 100, pausa: 0 } } },
      escena: [{ nombre: 'C', script: 'c.chs' }],
    });
    j.avanzar(60);
    expect(j.buscar('Nube').posicion.y).toBeCloseTo(300, 0);
  });

  it('yo.moviendo para y sigue el recorrido; en un objeto sin recorrido, error que explica dónde se pone', () => {
    const j = juegoDePrueba({
      scripts: { 'p.chs': 'cuando empieza:\n    yo.moviendo = falso\ncuando pasen 1 segundos:\n    yo.moviendo = verdadero\n' },
      escena: [{ nombre: 'P', x: 0, y: 0, script: 'p.chs', recorrido: { puntos: [{ x: 100, y: 0 }], rapidez: 100, pausa: 0 } }],
    });
    j.avanzar(50);
    expect(j.buscar('P').posicion.x).toBe(0);
    j.avanzar(40);
    expect(j.buscar('P').posicion.x).toBeGreaterThan(40);
    const sin = unObjeto('cuando empieza:\n    yo.moviendo = falso\n');
    expect(sin.errores[0].error.pista).toContain('Propiedades > Recorrido');
  });
});

describe('Plataformas que llevan al jugador encima', () => {
  it('una plataforma que va de lado lleva al jugador (sin que se caiga)', () => {
    const j = juegoDePrueba({
      escena: [
        { nombre: 'P', x: 100, y: 200, sprite: { ancho: 100, alto: 20 }, colision: {}, recorrido: { puntos: [{ x: 300, y: 0 }], rapidez: 150, pausa: 0 } },
        jugador(100, 220),
      ],
    });
    j.avanzar(60);
    const p = j.buscar('P').posicion;
    const yo = j.buscar('Jugador').posicion;
    expect(p.x).toBeCloseTo(250, 0);
    expect(Math.abs(yo.x - p.x)).toBeLessThan(3); // se ha movido con ella
    expect(yo.y).toBeCloseTo(220, 0); // sigue encima
  });

  it('un ascensor sube y baja con el jugador encima', () => {
    const j = juegoDePrueba({
      escena: [
        { nombre: 'A', x: 300, y: 100, sprite: { ancho: 100, alto: 20 }, colision: {}, recorrido: { puntos: [{ x: 0, y: 200 }], rapidez: 100, pausa: 0 } },
        jugador(300, 120),
      ],
    });
    j.avanzar(120); // 2 s: arriba del todo
    expect(j.buscar('A').posicion.y).toBeCloseTo(300, 0);
    expect(j.buscar('Jugador').posicion.y).toBeCloseTo(320, 0);
    j.avanzar(60); // bajando: no se queda flotando
    expect(j.buscar('Jugador').posicion.y - j.buscar('A').posicion.y).toBeCloseTo(20, 0);
  });

  it('se puede saltar desde una plataforma que se mueve', () => {
    const j = juegoDePrueba({
      scripts: { 'j.chs': 'cuando pasen 0.5 segundos:\n    mostrar(yo.saltar(600))\n' },
      escena: [
        { nombre: 'P', x: 100, y: 200, sprite: { ancho: 100, alto: 20 }, colision: {}, recorrido: { puntos: [{ x: 300, y: 0 }], rapidez: 100, pausa: 0 } },
        jugador(100, 220, 'j.chs'),
      ],
    });
    j.avanzar(45);
    expect(j.salida).toEqual(['verdadero']);
    expect(j.buscar('Jugador').posicion.y).toBeGreaterThan(260);
  });

  it('también una plataforma movida por un script (yo.x += ...)', () => {
    const j = juegoDePrueba({
      scripts: { 'p.chs': 'cuando cada fotograma:\n    yo.x += 120 * delta\n' },
      escena: [{ nombre: 'P', x: 100, y: 200, sprite: { ancho: 100, alto: 20 }, colision: {}, script: 'p.chs' }, jugador(100, 220)],
    });
    j.avanzar(60);
    expect(Math.abs(j.buscar('Jugador').posicion.x - j.buscar('P').posicion.x)).toBeLessThan(3);
    expect(j.buscar('Jugador').posicion.y).toBeCloseTo(220, 0);
  });
});

describe('Plataformas que se atraviesan desde abajo', () => {
  const plataforma: DefObjeto = { nombre: 'P', x: 200, y: 120, sprite: { ancho: 200, alto: 16 }, colision: { soloDesdeArriba: true } };

  it('se salta a través de ella desde abajo y se cae encima', () => {
    const j = juegoDePrueba({
      scripts: { 'j.chs': 'cuando empieza:\n    yo.velocidad.y = 700\n' },
      escena: [suelo, plataforma, jugador(200, 40, 'j.chs')],
    });
    j.avanzar(120);
    const y = j.buscar('Jugador').posicion.y;
    expect(y).toBeCloseTo(138, 0); // encima de la plataforma (120 + 8 + 10)
    expect(j.buscar('Jugador').obtener).toBeDefined();
  });

  it('no para de lado: se puede andar a través de ella', () => {
    const lado: DefObjeto = { nombre: 'P', x: 200, y: 40, sprite: { ancho: 40, alto: 60 }, colision: { soloDesdeArriba: true } };
    const j = juegoDePrueba({
      scripts: { 'j.chs': 'cuando cada fotograma:\n    yo.velocidad.x = 200\n' },
      escena: [suelo, lado, jugador(100, 30, 'j.chs')],
    });
    j.avanzar(60);
    expect(j.buscar('Jugador').posicion.x).toBeGreaterThan(250);
  });

  it('también con casillas de un mapa marcadas «solo desde arriba»', () => {
    const j = juegoDePrueba({
      scripts: { 'j.chs': 'cuando empieza:\n    yo.velocidad.y = 700\n' },
      escena: [
        suelo,
        { nombre: 'Mapa', x: 0, y: 96, mapa: { tamano: 32, tipos: { tabla: { color: 'marron', solida: true, soloDesdeArriba: true } }, celdas: { '5,0': 'tabla', '6,0': 'tabla', '7,0': 'tabla' } } },
        jugador(200, 40, 'j.chs'),
      ],
    });
    j.avanzar(120);
    expect(j.buscar('Jugador').posicion.y).toBeCloseTo(138, 0); // encima de la fila (96 + 32 + 10)
  });

  it('una sólida normal sí para desde abajo (para comparar)', () => {
    const j = juegoDePrueba({
      scripts: { 'j.chs': 'cuando empieza:\n    yo.velocidad.y = 700\n' },
      escena: [suelo, { ...plataforma, colision: {} }, jugador(200, 40, 'j.chs')],
    });
    j.avanzar(120);
    expect(j.buscar('Jugador').posicion.y).toBeLessThan(110);
  });
});
