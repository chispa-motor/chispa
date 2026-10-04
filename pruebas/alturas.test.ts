/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * SUELOS A DISTINTAS ALTURAS (el reto de Arena Cero): un tipo de casilla que no
 * es sólida puede tener el suelo levantado (una tarima) o ser una rampa.
 *   - En primera persona (vista3d) se pintan su frente y su parte de arriba,
 *     tapan lo que queda detrás, y quien mira sube y baja con el suelo que pisa.
 *   - Un escalón demasiado alto para donde se está es como una pared: se sube
 *     por una rampa (la física, yo.irHacia y los caminos lo saben).
 */
import { describe, expect, it } from 'vitest';
import { Raycaster, alturaDelSuelo, empaquetar, type Ambiente, type Ojo, type Rejilla, type Sprite3D, type Textura } from '../src/motor/Raycaster';
import { texturaLisa } from '../src/objetos/Vista3D';
import { ALTURA_MAXIMA_SUELO, ESCALON, MapaCasillas } from '../src/objetos/componentes/MapaCasillas';
import { Fisica } from '../src/objetos/componentes/Fisica';
import { buscarCamino, lineaLibre } from '../src/objetos/Caminos';
import { Vector2 } from '../src/motor/Vector2';
import { validarProyecto } from '../src/proyecto/validar';
import type { DefObjeto } from '../src/proyecto/formato';
import { juegoDePrueba } from './ayudantes';

const ROJO = empaquetar(255, 0, 0);
const VERDE = empaquetar(0, 255, 0);
const AZUL = empaquetar(0, 0, 255);
const GRIS = empaquetar(100, 100, 100);
const NEGRO = empaquetar(0, 0, 0);
const TEXTURAS: Textura[] = [texturaLisa(ROJO), texturaLisa(AZUL)];
const AMBIENTE: Ambiente = { suelo: null, colorSuelo: GRIS, techo: null, colorTecho: NEGRO, cielo: null, niebla: null, brillo: 1 };
const ojoEn = (x: number, y: number, grados = 0, mas: Partial<Ojo> = {}): Ojo => ({ x, y, angulo: (grados * Math.PI) / 180, campo: Math.PI / 2, altura: 0.5, inclinacion: 0, ...mas });
const sprite = (x: number, y: number, mas: Partial<Sprite3D> = {}): Sprite3D => ({ x, y, ancho: 0.5, alto: 0.5, elevacion: 0, textura: texturaLisa(VERDE), opacidad: 1, voltear: false, tinte: 0, cuantoTinte: 0, ...mas });

/**
 * Una sala de 7×7 con paredes rojas. `relieve`: casillas con el suelo levantado (azul):
 * [columna, fila, altura baja, altura alta, rampa (0 = llano, 1 = sube hacia la derecha...)].
 */
function sala(relieve: [number, number, number, number, number][] | null): Rejilla {
  const n = 49;
  const r: Rejilla = { columnas: 7, filas: 7, paredes: new Uint8Array(n), suelos: new Uint8Array(n), puertas: new Uint8Array(n), aperturas: new Float32Array(n) };
  for (let c = 0; c < 7; c++) for (let f = 0; f < 7; f++) if (c === 0 || f === 0 || c === 6 || f === 6) r.paredes[f * 7 + c] = 1;
  if (relieve) {
    r.alturas = new Float32Array(n);
    r.subidas = new Float32Array(n);
    r.rampas = new Uint8Array(n);
    for (const [c, f, baja, alta, rampa] of relieve) {
      const i = f * 7 + c;
      r.suelos[i] = 2;
      r.alturas[i] = baja;
      r.subidas[i] = alta - baja;
      r.rampas[i] = rampa;
    }
  }
  return r;
}

/** Pinta la sala (160×100: con 90 grados de campo, algo de 1 de alto a distancia d mide 80/d píxeles; el horizonte está en la fila 50). */
function pintar(r: Rejilla, ojo: Ojo, sprites: Sprite3D[] = []) {
  const rc = new Raycaster();
  rc.redimensionar(160, 100);
  rc.pintar(r, TEXTURAS, ojo, AMBIENTE, sprites);
  const pixel = (x: number, y: number) => rc.pantalla[y * 160 + x];
  const azul = (x: number, y: number) => (pixel(x, y) >>> 16) & 255;
  const esAzulado = (x: number, y: number) => azul(x, y) > 150 && (pixel(x, y) & 0xffff) === 0;
  return { rc, pixel, esAzulado };
}

describe('Raycaster: suelos a distintas alturas', () => {
  // El ojo en (1.5, 3.5) mirando a la derecha; la casilla (4, 3) va de x = 4 a 5: se entra a 2.5 y se sale a 3.5.
  // La pared del fondo (x = 6) está a 4.5: ocupa de la fila 41 a la 58.
  it('sin ningún suelo levantado, todo se pinta como siempre', () => {
    const v = pintar(sala(null), ojoEn(1.5, 3.5));
    expect(v.pixel(80, 57)).toBe(ROJO);
    expect(v.pixel(80, 62)).toBe(GRIS);
    // Y con la lista de alturas puesta pero todo a cero, igual
    const llano = pintar(sala([]), ojoEn(1.5, 3.5));
    expect([...llano.rc.pantalla]).toEqual([...v.rc.pantalla]);
  });

  it('una tarima: se ven su frente (el escalón) y su parte de arriba, y tapa el pie de la pared de detrás', () => {
    const v = pintar(sala([[4, 3, 0.25, 0.25, 0]]), ojoEn(1.5, 3.5));
    // El suelo de siempre llega hasta el pie del escalón: a 2.5, la fila 50 + 0.5·32 = 66
    expect(v.pixel(80, 70)).toBe(GRIS);
    expect(v.pixel(80, 67)).toBe(GRIS);
    // El frente: de la fila 58 (50 + 0.25·32) a la 65, del color de la casilla pero un poco más oscuro
    for (const y of [58, 61, 65]) {
      expect(v.esAzulado(80, y)).toBe(true);
      expect(v.pixel(80, y)).not.toBe(AZUL);
    }
    // La parte de arriba: hasta donde se sale (a 3.5: fila 50 + 0.25·80/3.5 = 55.7), del color entero
    expect(v.pixel(80, 57)).toBe(AZUL);
    expect(v.pixel(80, 56)).toBe(AZUL);
    // Por encima asoma la pared (que sin la tarima llegaba hasta la fila 58)
    expect(v.pixel(80, 55)).toBe(ROJO);
    expect(v.pixel(80, 45)).toBe(ROJO);
    // A un lado de la tarima (ese rayo no pasa por su casilla), el suelo de siempre
    expect(v.pixel(40, 62)).toBe(GRIS);
  });

  it('mirándola desde más abajo que su parte de arriba, solo se ve el frente', () => {
    const v = pintar(sala([[4, 3, 0.4, 0.4, 0]]), ojoEn(1.5, 3.5, 0, { altura: 0.2 }));
    // El frente va del suelo (fila 50 + 0.2·32 = 56.4) hasta por encima del horizonte (50 − 0.2·32 = 43.6)
    for (const y of [44, 50, 56]) expect(v.esAzulado(80, y)).toBe(true);
    expect(v.pixel(80, 57)).toBe(GRIS);
    // Y encima, la pared: de la parte de arriba de la tarima no se ve nada
    expect(v.pixel(80, 43)).toBe(ROJO);
    for (let y = 0; y < 100; y++) expect(v.pixel(80, y)).not.toBe(AZUL);
  });

  it('una rampa: sin escalón al entrar por abajo, y el suelo va subiendo', () => {
    // Sube hacia la derecha, de 0 a 0.4: se entra por su lado bajo
    const v = pintar(sala([[4, 3, 0, 0.4, 1]]), ojoEn(1.5, 3.5));
    // Empieza donde empezaría el suelo de esa casilla (fila 66) y acaba a 3.5 con 0.4 de alto: 50 + 0.1·80/3.5 = 52.3
    expect(v.pixel(80, 67)).toBe(GRIS);
    for (const y of [65, 60, 55, 53]) expect(v.pixel(80, y)).toBe(AZUL);
    expect(v.pixel(80, 52)).toBe(ROJO);
    // Vista desde el otro lado (desde la derecha, mirando a la izquierda) se ve su frente alto
    const detras = pintar(sala([[3, 3, 0, 0.4, 1]]), ojoEn(5.5, 3.5, 180));
    // Se entra a 1.5 por su lado alto: frente de la fila 50 + 0.1·80/1.5 = 55.3 a la 50 + 0.5·80/1.5 = 76.7
    expect(detras.esAzulado(80, 60)).toBe(true);
    expect(detras.esAzulado(80, 75)).toBe(true);
    expect(detras.pixel(80, 60)).not.toBe(AZUL);
  });

  it('quien está subido a una tarima la ve bajo sus pies, y el suelo de más allá queda más abajo', () => {
    // El ojo, encima de la tarima (3, 3), con los ojos a 0.25 + 0.5
    const v = pintar(sala([[3, 3, 0.25, 0.25, 0]]), ojoEn(3.1, 3.5, 0, { altura: 0.75 }));
    // Abajo del todo, la tarima: se sale de ella a 0.9, que es la fila 50 + 0.5·80/0.9 = 94.4
    expect(v.pixel(80, 99)).toBe(AZUL);
    expect(v.pixel(80, 95)).toBe(AZUL);
    // Más allá del borde, el suelo de siempre (que desde 0.75 de alto se ve más abajo que desde 0.5)
    expect(v.pixel(80, 93)).toBe(GRIS);
    // La pared, a 2.9, tiene el pie en 50 + 0.75·80/2.9 = 70.7
    expect(v.pixel(80, 69)).toBe(ROJO);
    expect(v.pixel(80, 73)).toBe(GRIS);
  });

  it('una tarima tapa los pies de lo que está detrás, pero no lo que está subido a ella', () => {
    // Detrás (a 4 de distancia), en el suelo: va de la fila 50 a la 60; la tarima tapa de la 56 hacia abajo
    const detras = pintar(sala([[4, 3, 0.25, 0.25, 0]]), ojoEn(1.5, 3.5), [sprite(5.5, 3.5)]);
    expect(detras.pixel(80, 53)).toBe(VERDE);
    expect(detras.pixel(80, 55)).toBe(VERDE);
    expect(detras.pixel(80, 57)).toBe(AZUL);
    expect(detras.esAzulado(80, 59)).toBe(true);
    // Sin tarima se le ven los pies
    expect(pintar(sala(null), ojoEn(1.5, 3.5), [sprite(5.5, 3.5)]).pixel(80, 59)).toBe(VERDE);
    // Subido a ella (a 3 de distancia, con los pies a 0.25): de la fila 50 + 0.25·80/3 − 13.3 = 43.3 a la 56.7
    const encima = pintar(sala([[4, 3, 0.25, 0.25, 0]]), ojoEn(1.5, 3.5), [sprite(4.5, 3.5, { elevacion: 0.25 })]);
    expect(encima.pixel(80, 45)).toBe(VERDE);
    expect(encima.pixel(80, 56)).toBe(VERDE);
    // Delante de ella (a 1.5), entero
    const delante = pintar(sala([[4, 3, 0.25, 0.25, 0]]), ojoEn(1.5, 3.5), [sprite(3, 3.5)]);
    expect(delante.pixel(80, 70)).toBe(VERDE);
  });

  it('alturaDelSuelo: la altura en un punto (llano, rampa, fuera y sin relieve)', () => {
    const r = sala([[4, 3, 0.25, 0.25, 0], [2, 2, 0.1, 0.4, 3]]);
    expect(alturaDelSuelo(r, 4.5, 3.5)).toBeCloseTo(0.25);
    expect(alturaDelSuelo(r, 3.5, 3.5)).toBe(0);
    // La rampa de (2, 2) sube hacia arriba (+y), de 0.1 a 0.4
    expect(alturaDelSuelo(r, 2.5, 2)).toBeCloseTo(0.1);
    expect(alturaDelSuelo(r, 2.5, 2.5)).toBeCloseTo(0.25);
    expect(alturaDelSuelo(r, 2.5, 2.999)).toBeCloseTo(0.4, 2);
    expect(alturaDelSuelo(r, -3, 50)).toBe(0);
    expect(alturaDelSuelo(sala(null), 4.5, 3.5)).toBe(0);
  });

  it('con números imposibles (un proyecto estropeado a propósito) ni se cuelga ni falla', () => {
    const r = sala([[4, 3, 0.25, 0.25, 0], [3, 3, 0, 0.4, 1]]);
    r.alturas![10] = NaN;
    r.subidas![11] = Infinity;
    r.alturas![12] = -5;
    r.alturas![17] = 1e9;
    const rc = new Raycaster();
    rc.redimensionar(160, 100);
    for (const ojo of [ojoEn(NaN, 3.5), ojoEn(1.5, Infinity), ojoEn(-1e12, 1e12), ojoEn(1.5, 3.5, NaN), ojoEn(1.5, 3.5, 0, { altura: NaN }), ojoEn(1.5, 3.5, 0, { altura: 1e9, inclinacion: -1e9 }), ojoEn(1.5, 3.5, 0, { campo: 0 })]) {
      const t0 = performance.now();
      expect(() => rc.pintar(r, TEXTURAS, ojo, AMBIENTE, [sprite(4.5, 3.5, { elevacion: NaN }), sprite(NaN, NaN)])).not.toThrow();
      expect(performance.now() - t0).toBeLessThan(500);
    }
    expect(alturaDelSuelo(r, NaN, NaN)).toBe(0);
  });

  it('pintar las tarimas no cuesta casi nada donde no las hay, y va deprisa donde las hay', () => {
    const rc = new Raycaster();
    rc.redimensionar(640, 360);
    const relieve: [number, number, number, number, number][] = [[2, 3, 0, 0.3, 1], [3, 3, 0.3, 0.3, 0], [4, 3, 0.3, 0.3, 0], [3, 4, 0.3, 0.3, 0], [4, 2, 0.15, 0.15, 0]];
    const r = sala(relieve);
    const t0 = performance.now();
    for (let i = 0; i < 30; i++) rc.pintar(r, TEXTURAS, ojoEn(1.5, 3.5, i * 12), AMBIENTE, []);
    const porFotograma = (performance.now() - t0) / 30;
    // (con mucho margen: en un ordenador normal son 2 o 3 ms)
    expect(porFotograma).toBeLessThan(40);
  });
});

// ───────────────────────── En el juego ─────────────────────────

/**
 * Un mapa de casillas de 40 (el escalón que se sube andando: 8 píxeles): un cuarto de 9×7 con
 * paredes, una rampa en (3, 3) que sube hacia la derecha hasta 16 y una tarima de 16 en (4, 3),
 * (5, 3), (4, 4) y (5, 4). El jugador (20×20, sin gravedad) empieza en (60, 140): casilla (1, 3).
 */
function juego(codigo = '', mas: DefObjeto[] = [], conRampa = true) {
  const celdas: Record<string, string> = {};
  for (let c = 0; c < 9; c++) for (let f = 0; f < 7; f++) if (c === 0 || f === 0 || c === 8 || f === 6) celdas[`${c},${f}`] = 'muro';
  if (conRampa) celdas['3,3'] = 'rampa';
  for (const k of ['4,3', '5,3', '4,4', '5,4']) celdas[k] = 'tarima';
  const j = juegoDePrueba({
    gravedad: 0,
    imagenes: {},
    scripts: { 'j.chs': codigo },
    escena: [
      { nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 40, tipos: { muro: { color: 'rojo', solida: true }, tarima: { color: 'azul', solida: false, altura: 16 }, rampa: { color: 'azul', solida: false, altura: 16, rampa: 'derecha' }, alta: { color: 'azul', solida: false, altura: 500 } }, celdas } },
      { nombre: 'Jugador', x: 60, y: 140, sprite: { ancho: 20, alto: 20 }, colision: { ancho: 20, alto: 20 }, fisica: { gravedad: 0, rozamiento: 0 }, script: 'j.chs' },
      ...mas,
    ],
  });
  const vista = j.juego.escena.vista3d;
  vista.leerImagen = () => texturaLisa(ROJO);
  const jugador = j.buscar('Jugador');
  const empujar = (x: number, y: number, fotogramas: number) => {
    for (let i = 0; i < fotogramas; i++) {
      jugador.obtener(Fisica)!.velocidad.x = x;
      jugador.obtener(Fisica)!.velocidad.y = y;
      j.avanzar(1);
    }
  };
  return { ...j, vista, mapa: j.buscar('Mapa').obtener(MapaCasillas)!, jugador, empujar };
}

describe('Mapas con suelos a distintas alturas', () => {
  it('alturaEn: la tarima, la rampa (que va subiendo), el suelo de siempre y las paredes', () => {
    const { mapa } = juego();
    expect(mapa.tieneRelieve).toBe(true);
    expect(mapa.alturaEn(180, 140)).toBe(16);
    expect(mapa.alturaEn(60, 140)).toBe(0);
    // La rampa (x de 120 a 160) sube hacia la derecha
    expect(mapa.alturaEn(120, 140)).toBeCloseTo(0);
    expect(mapa.alturaEn(140, 140)).toBeCloseTo(8);
    expect(mapa.alturaEn(159.9, 140)).toBeCloseTo(16, 0);
    // Una pared no tiene «altura de suelo», ni un sitio sin casilla
    expect(mapa.alturaEn(10, 10)).toBe(0);
    expect(mapa.alturaEn(-500, 900)).toBe(0);
    // Como mucho, casi la mitad de la casilla (más arriba, los ojos darían en el techo)
    mapa.poner(2, 1, 'alta');
    expect(mapa.alturaEn(100, 60)).toBeCloseTo(40 * ALTURA_MAXIMA_SUELO);
    expect(mapa.escalon).toBeCloseTo(40 * ESCALON);
  });

  it('un mapa sin suelos levantados no tiene relieve (y nada de esto se mira)', () => {
    const j = juegoDePrueba({ escena: [{ nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 40, tipos: { muro: { color: 'rojo', solida: true }, agua: { color: 'azul', solida: false } }, celdas: { '0,0': 'muro', '1,0': 'agua' } } }] });
    const mapa = j.buscar('Mapa').obtener(MapaCasillas)!;
    expect(mapa.tieneRelieve).toBe(false);
    expect(mapa.alturaEn(60, 20)).toBe(0);
  });

  it('desde el suelo no se sube a la tarima de frente: el escalón es como una pared', () => {
    const j = juego();
    // Por la fila 4 (y = 180): la tarima de (4, 4) empieza en x = 160
    j.jugador.posicion.y = 180;
    j.empujar(200, 0, 60);
    expect(j.jugador.posicion.x).toBeCloseTo(150, 0);
    expect(j.jugador.alturaSuelo).toBe(0);
  });

  it('por la rampa sí: se sube poco a poco, se anda por la tarima y se baja de ella por cualquier lado', () => {
    const j = juego();
    // Por la fila 3 (y = 140): la rampa está en x = 120..160
    j.empujar(200, 0, 24);
    expect(j.jugador.posicion.x).toBeGreaterThan(125);
    expect(j.jugador.alturaSuelo).toBeGreaterThan(2);
    expect(j.jugador.alturaSuelo).toBeLessThan(16);
    j.empujar(200, 0, 20);
    expect(j.jugador.posicion.x).toBeGreaterThan(180);
    expect(j.jugador.alturaSuelo).toBe(16);
    // Arriba se pasa a las otras casillas de la tarima (están a la misma altura)
    j.empujar(0, 200, 12);
    expect(j.jugador.posicion.y).toBeGreaterThan(170);
    // Y se baja por el borde (hacia arriba del mapa, donde no hay rampa): bajar siempre se puede
    j.empujar(0, 200, 30);
    expect(j.jugador.posicion.y).toBeGreaterThan(215);
    expect(j.jugador.alturaSuelo).toBe(0);
    // Pero volver a subir por ahí, no
    j.empujar(0, -200, 30);
    expect(j.jugador.posicion.y).toBeGreaterThan(205);
    expect(j.errores).toEqual([]);
  });

  it('a la rampa no se entra por su lado alto, pero sí por el lado si aún está baja', () => {
    const j = juego();
    // La rampa de (3, 3) vista desde abajo (fila 2, y = 100): por su mitad derecha (alta) es una pared
    j.jugador.posicion.x = 150;
    j.jugador.posicion.y = 100;
    j.empujar(0, 200, 30);
    expect(j.jugador.posicion.y).toBeLessThan(112);
    // Por su mitad izquierda (baja: menos de un escalón), se entra
    j.jugador.posicion.x = 126;
    j.jugador.posicion.y = 100;
    j.empujar(0, 200, 30);
    expect(j.jugador.posicion.y).toBeGreaterThan(125);
  });

  it('los caminos (yo.irHacia) rodean por la rampa; sin rampa, a la tarima no se llega', () => {
    const j = juego();
    const desde = new Vector2(60, 180);
    const hasta = new Vector2(220, 180);
    // En línea recta hay un escalón de 16 (el máximo es 8)
    expect(lineaLibre(j.mapa, desde, hasta, 10)).toBe(false);
    expect(lineaLibre(j.mapa, new Vector2(60, 140), new Vector2(220, 140), 10)).toBe(true);
    // Bajar en línea recta sí se puede
    expect(lineaLibre(j.mapa, hasta, new Vector2(300, 180), 10)).toBe(true);
    const camino = buscarCamino(j.mapa, desde, hasta, 10)!;
    expect(camino).not.toBeNull();
    // Pasa por la rampa (la casilla (3, 3): x de 120 a 160, y de 120 a 160)
    const puntos = [desde, ...camino];
    let pasaPorLaRampa = false;
    for (let i = 1; i < puntos.length; i++) for (let k = 0; k <= 20; k++) {
      const x = puntos[i - 1].x + ((puntos[i].x - puntos[i - 1].x) * k) / 20;
      const y = puntos[i - 1].y + ((puntos[i].y - puntos[i - 1].y) * k) / 20;
      if (x > 120 && x < 160 && y > 120 && y < 160) pasaPorLaRampa = true;
    }
    expect(pasaPorLaRampa).toBe(true);
    expect(camino[camino.length - 1]).toEqual(hasta);
    // Sin rampa no hay manera de subir
    const sinRampa = juego('', [], false);
    expect(buscarCamino(sinRampa.mapa, desde, new Vector2(220, 140), 10)).toBeNull();
    // (y entre dos sitios del suelo, o de arriba abajo, sigue habiendo camino)
    expect(buscarCamino(sinRampa.mapa, new Vector2(220, 140), desde, 10)).not.toBeNull();
  });

  it('yo.irHacia sube por la rampa hasta la tarima', () => {
    const j = juego('cuando empieza:\n    yo.y = 180\n    mostrar(yo.irHacia(vector(220, 180), 150))');
    j.avanzar(200);
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['verdadero']);
    expect(j.jugador.posicion.x).toBeCloseTo(220, 0);
    expect(j.jugador.posicion.y).toBeCloseTo(180, 0);
    expect(j.jugador.alturaSuelo).toBe(16);
  });

  it('en primera persona: los ojos suben con el suelo que se pisa (poco a poco), y cada cosa se ve a la altura de su suelo', () => {
    const cosa: DefObjeto = { nombre: 'Cosa', x: 220, y: 140, sprite: { ancho: 10, alto: 10 } };
    const dron: DefObjeto = { nombre: 'Dron', x: 220, y: 180, elevacion: 10, sprite: { ancho: 10, alto: 10 } };
    const abajo: DefObjeto = { nombre: 'Abajo', x: 300, y: 140, sprite: { ancho: 10, alto: 10 } };
    const j = juego('cuando empieza:\n    vista3d.ver(yo)', [cosa, dron, abajo]);
    j.avanzar(2);
    const ojo = () => {
      j.vista.calcular(j.juego.escena, 960, 540);
      return (j.vista.raycaster as unknown as { ojo: Ojo }).ojo.altura;
    };
    expect(ojo()).toBeCloseTo(0.5);
    // La rejilla lleva las alturas en casillas: 16 / 40 = 0.4
    const rejilla = (j.vista as unknown as { rejilla: Rejilla }).rejilla;
    expect(rejilla.alturas).toBeDefined();
    expect(alturaDelSuelo(rejilla, 4.5, 3.5)).toBeCloseTo(0.4);
    expect(alturaDelSuelo(rejilla, 3.5, 3.5)).toBeCloseTo(0.2);
    // Los sprites: lo que está en la tarima, a 0.4; lo que vuela encima, a 0.4 + 10/40; lo del suelo, a 0
    const sprites = (j.vista as unknown as { sprites: Sprite3D[] }).sprites;
    const elevacion = (nombre: string) => sprites.find((s) => (s.dato as { nombre: string }).nombre === nombre)!.elevacion;
    expect(elevacion('Cosa')).toBeCloseTo(0.4);
    expect(elevacion('Dron')).toBeCloseTo(0.65);
    expect(elevacion('Abajo')).toBe(0);
    // Sube a la tarima: los ojos no saltan de golpe, y acaban 0.4 más arriba
    j.empujar(200, 0, 44);
    expect(j.jugador.alturaSuelo).toBe(16);
    const alLlegar = ojo();
    expect(alLlegar).toBeGreaterThan(0.5);
    for (let i = 0; i < 40; i++) ojo();
    expect(ojo()).toBeCloseTo(0.9);
    expect(j.errores).toEqual([]);
  });

  it('mapa.alturaEn(x, y) desde el código, y lo que dice si se usa mal', () => {
    const j = juego('cuando empieza:\n    variable m = buscar("Mapa")\n    mostrar(m.alturaEn(180, 140))\n    mostrar(m.alturaEn(140, 140))\n    mostrar(m.alturaEn(60, 140))\n    mostrar(yo.alturaEn(1, 1))');
    j.avanzar(1);
    expect(j.salida).toEqual(['16', '8', '0']);
    expect(j.errores[0].error.message).toContain('alturaEn');
    const otro = juego('cuando empieza:\n    mostrar(buscar("Mapa").alturaEn(yo.posicion))');
    otro.avanzar(1);
    expect(otro.errores[0].error.message).toMatch(/alturaEn/);
  });

  it('un proyecto con tarimas y rampas se guarda y se abre; una rampa mal escrita no vale', () => {
    const proyecto = (rampa: string) => ({
      formato: 'chispa-proyecto', version: 3, nombre: 'p', ancho: 960, alto: 540, imagenes: {}, sonidos: {}, animaciones: {}, scripts: {}, plantillas: {}, escenaInicial: 'A',
      escenas: { A: { colorFondo: 'negro', objetos: [{ nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 40, tipos: { tarima: { color: 'azul', solida: false, altura: 16 }, rampa: { color: 'azul', solida: false, altura: 16, alturaBaja: 4, rampa } }, celdas: { '1,1': 'tarima' } } }] } },
    });
    const bueno = validarProyecto(proyecto('arriba'));
    const tipos = bueno.escenas!.A.objetos[0].mapa!.tipos;
    expect(tipos.tarima.altura).toBe(16);
    expect(tipos.rampa).toMatchObject({ altura: 16, alturaBaja: 4, rampa: 'arriba' });
    expect(() => validarProyecto(proyecto('norte'))).toThrow();
  });
});
