/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LA VISTA EN PRIMERA PERSONA (Chispa 1.3): el raycaster (paredes, suelo,
 * techo, niebla, puertas, sprites), su unión con la escena (vista3d), las
 * puertas de los mapas, el sonido según hacia dónde se mira y mirar con el
 * ratón. Lo que se ve de verdad se comprueba en el navegador
 * (pruebas-navegador/editor.mjs, «primera persona»).
 */
import { describe, expect, it } from 'vitest';
import { MAXIMO_PASOS, Raycaster, empaquetar, type Ambiente, type Ojo, type Rejilla, type Sprite3D, type Textura } from '../src/motor/Raycaster';
import { oirDesde } from '../src/motor/Sonido';
import { LADO_MAXIMO_MAPA, MAXIMO_SPRITES, texturaLisa } from '../src/objetos/Vista3D';
import { APERTURA_PARA_PASAR, MapaCasillas } from '../src/objetos/componentes/MapaCasillas';
import { buscarCamino } from '../src/objetos/Caminos';
import { lanzarRayo } from '../src/objetos/Rayos';
import { Vector2 } from '../src/motor/Vector2';
import { calidad } from '../src/motor/Calidad';
import type { DefObjeto } from '../src/proyecto/formato';
import { juegoDePrueba } from './ayudantes';

// ───────────────────────── Ayudantes ─────────────────────────

const ROJO = empaquetar(255, 0, 0);
const VERDE = empaquetar(0, 255, 0);
const AZUL = empaquetar(0, 0, 255);
const BLANCO = empaquetar(255, 255, 255);
const GRIS = empaquetar(100, 100, 100);
const NEGRO = empaquetar(0, 0, 0);

/** Una rejilla a partir de un dibujo con letras (la primera línea es la fila de ARRIBA): # pared, D puerta, s suelo con textura. */
function rejilla(dibujo: string[]): Rejilla {
  const filas = dibujo.length;
  const columnas = dibujo[0].length;
  const r: Rejilla = { columnas, filas, paredes: new Uint8Array(columnas * filas), suelos: new Uint8Array(columnas * filas), puertas: new Uint8Array(columnas * filas), aperturas: new Float32Array(columnas * filas) };
  dibujo.forEach((linea, i) => {
    const f = filas - 1 - i;
    [...linea].forEach((letra, c) => {
      const k = f * columnas + c;
      if (letra === '#') r.paredes[k] = 1;
      if (letra === 'B') r.paredes[k] = 2;
      if (letra === 'D') {
        r.paredes[k] = 3;
        r.puertas[k] = 2;
      }
      if (letra === 'd') {
        r.paredes[k] = 3;
        r.puertas[k] = 1;
      }
      if (letra === 's') r.suelos[k] = 4;
    });
  });
  return r;
}

/** Una textura de 2×1: la mitad izquierda de un color y la derecha de otro. */
const mitades = (a: number, b: number): Textura => ({ ancho: 2, alto: 1, pix: new Uint32Array([a, b]) });
const TEXTURAS: Textura[] = [texturaLisa(ROJO), texturaLisa(AZUL), texturaLisa(VERDE), texturaLisa(BLANCO)];
const AMBIENTE: Ambiente = { suelo: null, colorSuelo: GRIS, techo: null, colorTecho: NEGRO, cielo: null, niebla: null, brillo: 1 };
const ojoEn = (x: number, y: number, grados = 0, mas: Partial<Ojo> = {}): Ojo => ({ x, y, angulo: (grados * Math.PI) / 180, campo: Math.PI / 2, altura: 0.5, inclinacion: 0, ...mas });

function pintar(dibujo: string[], ojo: Ojo, ambiente: Partial<Ambiente> = {}, sprites: Sprite3D[] = [], texturas = TEXTURAS, ancho = 160, alto = 100) {
  const rc = new Raycaster();
  rc.redimensionar(ancho, alto);
  const r = rejilla(dibujo);
  rc.pintar(r, texturas, ojo, { ...AMBIENTE, ...ambiente }, sprites);
  const pixel = (x: number, y: number) => rc.pantalla[Math.floor(y) * ancho + Math.floor(x)];
  /** Cuántos píxeles de ese color hay en una columna. */
  const altoDe = (x: number, color: number) => {
    let n = 0;
    for (let y = 0; y < alto; y++) if (pixel(x, y) === color) n++;
    return n;
  };
  return { rc, r, pixel, altoDe, ancho, alto };
}

const SALA = [
  '#######',
  '#.....#',
  '#.....#',
  '#.....#',
  '#.....#',
  '#.....#',
  '#######',
];

const sprite = (x: number, y: number, mas: Partial<Sprite3D> = {}): Sprite3D => ({ x, y, ancho: 0.5, alto: 0.5, elevacion: 0, textura: texturaLisa(VERDE), opacidad: 1, voltear: false, tinte: 0, cuantoTinte: 0, ...mas });

// ───────────────────────── El raycaster ─────────────────────────

describe('Raycaster: paredes', () => {
  it('la pared de enfrente está a su distancia y se pinta centrada en el horizonte', () => {
    // En el centro de la sala (3.5, 3.5), mirando a la derecha: la pared está en x = 6, a 2.5 casillas
    const v = pintar(SALA, ojoEn(3.5, 3.5));
    expect(v.rc.profundidad[80]).toBeCloseTo(2.5, 1);
    // Con 90 grados de campo y 160 de ancho, una pared de 1 de alto a 2.5 mide 80 / 2.5 = 32 píxeles
    expect(v.altoDe(80, ROJO)).toBeGreaterThanOrEqual(31);
    expect(v.altoDe(80, ROJO)).toBeLessThanOrEqual(33);
    expect(v.pixel(80, 50)).toBe(ROJO);
    // Encima, techo; debajo, suelo
    expect(v.pixel(80, 5)).toBe(NEGRO);
    expect(v.pixel(80, 95)).toBe(GRIS);
  });

  it('cuanto más cerca, más alta', () => {
    const lejos = pintar(SALA, ojoEn(1.5, 3.5)).altoDe(80, ROJO);
    const cerca = pintar(SALA, ojoEn(5, 3.5)).altoDe(80, ROJO);
    expect(cerca).toBeGreaterThan(lejos * 3);
    // Pegado a la pared, la tapa entera
    expect(pintar(SALA, ojoEn(5.8, 3.5)).altoDe(80, ROJO)).toBe(100);
  });

  it('no deja ningún píxel sin pintar, se mire hacia donde se mire', () => {
    for (const grados of [0, 37, 90, 133, 180, 271, 359]) {
      const v = pintar(SALA, ojoEn(2.2, 4.1, grados));
      expect(v.rc.pantalla.every((c) => c >>> 24 === 255), `a ${grados} grados`).toBe(true);
    }
  });

  it('la textura se lee de izquierda a derecha en las cuatro paredes', () => {
    const texturas = [mitades(ROJO, AZUL), ...TEXTURAS.slice(1)];
    for (const grados of [0, 90, 180, 270]) {
      // Justo delante de la pared, mirándola de frente: a la izquierda de la pantalla, la mitad izquierda de la textura
      const d = 2;
      const rad = (grados * Math.PI) / 180;
      const v = pintar(SALA, ojoEn(3.5 + Math.cos(rad) * d, 3.5 + Math.sin(rad) * d, grados), {}, [], texturas);
      const izquierda = v.pixel(70, 50) & 0xffffff;
      const derecha = v.pixel(90, 50) & 0xffffff;
      // (las paredes de arriba y de abajo salen algo más oscuras, pero del mismo color)
      expect(izquierda & 0xff, `a ${grados} grados`).toBeGreaterThan(150);
      expect((derecha >>> 16) & 0xff, `a ${grados} grados`).toBeGreaterThan(150);
    }
  });

  it('las paredes que miran arriba o abajo son más oscuras (se nota el volumen)', () => {
    const deFrente = pintar(SALA, ojoEn(3.5, 3.5, 0)).pixel(80, 50) & 0xff;
    const deLado = pintar(SALA, ojoEn(3.5, 3.5, 90)).pixel(80, 50) & 0xff;
    expect(deFrente).toBe(255);
    expect(deLado).toBeLessThan(220);
    expect(deLado).toBeGreaterThan(150);
  });

  it('mirar arriba o abajo mueve el horizonte, y agacharse cambia lo que se ve de suelo', () => {
    const normal = pintar(SALA, ojoEn(3.5, 3.5));
    const arriba = pintar(SALA, ojoEn(3.5, 3.5, 0, { inclinacion: 0.4 }));
    // Mirando arriba, el horizonte baja en la pantalla: se ve más techo
    expect(arriba.altoDe(80, NEGRO)).toBeGreaterThan(normal.altoDe(80, NEGRO) + 10);
    // Agachado, los ojos están más cerca del suelo: la pared «sube» en la pantalla (se ve más suelo y menos techo)
    const agachado = pintar(SALA, ojoEn(3.5, 3.5, 0, { altura: 0.2 }));
    expect(agachado.altoDe(80, GRIS)).toBeGreaterThan(normal.altoDe(80, GRIS));
    expect(agachado.altoDe(80, NEGRO)).toBeLessThan(normal.altoDe(80, NEGRO));
    expect(agachado.altoDe(80, ROJO)).toBe(normal.altoDe(80, ROJO));
  });

  it('fuera del mapa, dentro de una pared o con números raros no falla ni se queda colgado', () => {
    const rc = new Raycaster();
    rc.redimensionar(80, 50);
    const r = rejilla(SALA);
    for (const ojo of [ojoEn(-20, -20, 45), ojoEn(0.5, 0.5), ojoEn(3.5, 3.5, 0, { campo: 0 }), ojoEn(3.5, 3.5, 0, { campo: 99 }), ojoEn(1e9, 1e9), ojoEn(3.5, 3.5, 1e7)]) {
      expect(() => rc.pintar(r, TEXTURAS, ojo, AMBIENTE, [sprite(3.5, 3.5)])).not.toThrow();
    }
    // Un mapa sin paredes: el rayo no da vueltas sin fin
    const vacio = rejilla(['.....', '.....', '.....']);
    const t0 = performance.now();
    rc.pintar(vacio, TEXTURAS, ojoEn(2.5, 1.5), AMBIENTE, []);
    expect(performance.now() - t0).toBeLessThan(500);
    expect(rc.profundidad[40]).toBe(Infinity);
    expect(MAXIMO_PASOS).toBeLessThanOrEqual(1024);
  });
});

describe('Raycaster: suelo, techo, cielo y niebla', () => {
  it('las baldosas del mapa se pintan en su casilla', () => {
    // Una baldosa blanca dos casillas delante: se ve en el suelo, en el centro
    const dibujo = ['#######', '#.....#', '#.....#', '#...s.#', '#.....#', '#.....#', '#######'];
    const v = pintar(dibujo, ojoEn(1.5, 3.5));
    // La baldosa va de x = 4 a 5: su centro está a 3 casillas. A esa distancia el suelo cae en y = 50 + 0.5 * 80 / 3 ≈ 63
    expect(v.pixel(80, 63)).toBe(BLANCO);
    // Más cerca (a 1 casilla, y = 90) es suelo normal
    expect(v.pixel(80, 90)).toBe(GRIS);
    // Y a los lados, a esa misma distancia, también
    expect(v.pixel(20, 63)).not.toBe(BLANCO);
  });

  it('el suelo y el techo con imagen repiten la imagen en cada casilla', () => {
    const cuadros: Textura = { ancho: 2, alto: 2, pix: new Uint32Array([ROJO, AZUL, AZUL, ROJO]) };
    const v = pintar(SALA, ojoEn(3.5, 3.5), { suelo: cuadros, techo: cuadros });
    const colores = new Set<number>();
    for (let x = 0; x < 160; x += 3) colores.add(v.pixel(x, 96));
    expect(colores.has(ROJO) && colores.has(AZUL)).toBe(true);
    const arriba = new Set<number>();
    for (let x = 0; x < 160; x += 3) arriba.add(v.pixel(x, 3));
    expect(arriba.has(ROJO) && arriba.has(AZUL)).toBe(true);
  });

  it('la niebla se come lo lejano y deja lo cercano', () => {
    const niebla = { color: empaquetar(10, 20, 30), desde: 1, hasta: 2 };
    const lejos = pintar(SALA, ojoEn(1.5, 3.5), { niebla });
    // La pared está a 4.5: solo niebla
    expect(lejos.pixel(80, 50)).toBe(empaquetar(10, 20, 30));
    const cerca = pintar(SALA, ojoEn(5.5, 3.5), { niebla });
    expect(cerca.pixel(80, 50)).toBe(ROJO);
    // A medio camino, mezcla
    const medio = pintar(SALA, ojoEn(4.5, 3.5), { niebla }).pixel(80, 50) & 0xff;
    expect(medio).toBeGreaterThan(60);
    expect(medio).toBeLessThan(200);
    // El suelo también: cerca gris, lejos niebla
    expect(lejos.pixel(80, 98)).not.toBe(empaquetar(10, 20, 30));
    expect(lejos.pixel(80, 56)).toBe(empaquetar(10, 20, 30));
  });

  it('el brillo aclara y oscurece todo', () => {
    const texturas = [texturaLisa(empaquetar(100, 100, 100)), ...TEXTURAS.slice(1)];
    const normal = pintar(SALA, ojoEn(3.5, 3.5), {}, [], texturas).pixel(80, 50) & 0xff;
    const claro = pintar(SALA, ojoEn(3.5, 3.5), { brillo: 2 }, [], texturas).pixel(80, 50) & 0xff;
    const oscuro = pintar(SALA, ojoEn(3.5, 3.5), { brillo: 0 }, [], texturas).pixel(80, 50) & 0xff;
    expect(normal).toBe(100);
    expect(claro).toBeGreaterThan(190);
    expect(oscuro).toBe(0);
    // Y no se pasa de blanco
    expect(pintar(SALA, ojoEn(3.5, 3.5), { brillo: 3 }).pixel(80, 50) & 0xff).toBe(255);
  });

  it('el cielo sustituye al techo y gira con la mirada', () => {
    const cielo: Textura = { ancho: 4, alto: 1, pix: new Uint32Array([ROJO, VERDE, AZUL, BLANCO]) };
    const patio = ['.......', '.......', '.......', '.......', '.......'];
    const a = pintar(patio, ojoEn(3.5, 2.5, 0), { cielo }).pixel(80, 10);
    const b = pintar(patio, ojoEn(3.5, 2.5, 180), { cielo }).pixel(80, 10);
    expect([ROJO, VERDE, AZUL, BLANCO]).toContain(a);
    expect(b).not.toBe(a);
    // El suelo sigue siendo suelo
    expect(pintar(patio, ojoEn(3.5, 2.5, 0), { cielo }).pixel(80, 95)).toBe(GRIS);
  });
});

describe('Raycaster: puertas', () => {
  const PASILLO = ['#######', '#..#..#', '#..D..#', '#..#..#', '#######'];

  it('cerrada es una pared fina en mitad de su casilla', () => {
    const v = pintar(PASILLO, ojoEn(1.5, 2.5));
    // La puerta está en la casilla x = 3: su plano, en x = 3.5, a 2 casillas
    expect(v.rc.profundidad[80]).toBeCloseTo(2, 1);
    expect(v.pixel(80, 50)).toBe(VERDE);
  });

  it('abierta del todo se ve lo de detrás', () => {
    const rc = new Raycaster();
    rc.redimensionar(160, 100);
    const r = rejilla(PASILLO);
    r.aperturas[2 * 7 + 3] = 1;
    rc.pintar(r, TEXTURAS, ojoEn(1.5, 2.5), AMBIENTE, []);
    // La pared del fondo, en x = 6: a 4.5
    expect(rc.profundidad[80]).toBeCloseTo(4.5, 1);
    expect(rc.pantalla[50 * 160 + 80]).toBe(ROJO);
  });

  it('a medio abrir, por un lado se ve la puerta y por el otro el fondo', () => {
    const rc = new Raycaster();
    rc.redimensionar(160, 100);
    const r = rejilla(PASILLO);
    r.aperturas[2 * 7 + 3] = 0.5;
    rc.pintar(r, TEXTURAS, ojoEn(1.5, 2.5), AMBIENTE, []);
    const colores = new Set<number>();
    for (let x = 60; x <= 100; x++) colores.add(rc.pantalla[50 * 160 + x]);
    expect(colores.has(VERDE)).toBe(true);
    expect(colores.has(ROJO)).toBe(true);
  });

  it('una puerta de lado a lado (entre paredes a izquierda y derecha) también', () => {
    const v = pintar(['#####', '#...#', '##d##', '#...#', '#####'], ojoEn(2.5, 1.5, 90));
    expect(v.rc.profundidad[80]).toBeCloseTo(1, 1);
    expect(v.pixel(80, 50) & 0xff00).toBeGreaterThan(0);
  });
});

describe('Raycaster: sprites', () => {
  it('se ve delante, más pequeño cuanto más lejos, y con los pies en el suelo', () => {
    const cerca = pintar(SALA, ojoEn(1.5, 3.5), {}, [sprite(2.5, 3.5)]);
    const lejos = pintar(SALA, ojoEn(1.5, 3.5), {}, [sprite(4.5, 3.5)]);
    // A 1 casilla, medio metro de alto son 40 píxeles; a 3, unos 13
    expect(cerca.altoDe(80, VERDE)).toBeGreaterThanOrEqual(39);
    expect(lejos.altoDe(80, VERDE)).toBeGreaterThanOrEqual(12);
    expect(lejos.altoDe(80, VERDE)).toBeLessThanOrEqual(14);
    // Los pies, donde cae el suelo a esa distancia: y = 50 + 0.5 * 80 / 1 = 90
    expect(cerca.pixel(80, 88)).toBe(VERDE);
    expect(cerca.pixel(80, 92)).toBe(GRIS);
  });

  it('levantado del suelo, sube', () => {
    const v = pintar(SALA, ojoEn(1.5, 3.5), {}, [sprite(2.5, 3.5, { elevacion: 0.5 })]);
    expect(v.pixel(80, 88)).not.toBe(VERDE);
    expect(v.pixel(80, 30)).toBe(VERDE);
  });

  it('una pared lo tapa, y el de delante tapa al de detrás', () => {
    const tapado = pintar(['#######', '#..#..#', '#..#..#', '#..#..#', '#######'], ojoEn(1.5, 2.5), {}, [sprite(4.5, 2.5)]);
    expect(tapado.altoDe(80, VERDE)).toBe(0);
    const dos = [sprite(4.5, 3.5, { textura: texturaLisa(AZUL), ancho: 3, alto: 1 }), sprite(2.5, 3.5)];
    const v = pintar(SALA, ojoEn(1.5, 3.5), {}, dos);
    expect(v.pixel(80, 70)).toBe(VERDE);
    // Da igual el orden en que lleguen
    const alReves = pintar(SALA, ojoEn(1.5, 3.5), {}, [dos[1], dos[0]]);
    expect(alReves.pixel(80, 70)).toBe(VERDE);
    // Por los lados del pequeño se ve el grande de detrás
    expect(v.pixel(50, 60)).toBe(AZUL);
  });

  it('lo transparente del dibujo deja ver el fondo, y la opacidad lo mezcla', () => {
    const hueco: Textura = { ancho: 2, alto: 1, pix: new Uint32Array([0x00000000, VERDE]) };
    const v = pintar(SALA, ojoEn(1.5, 3.5), {}, [sprite(2.5, 3.5, { textura: hueco })]);
    expect(v.pixel(70, 70)).not.toBe(VERDE);
    expect(v.pixel(90, 70)).toBe(VERDE);
    const medio = pintar(SALA, ojoEn(1.5, 3.5), {}, [sprite(2.5, 3.5, { opacidad: 0.5, alto: 0.2, elevacion: 0.4 })]).pixel(80, 50);
    // Mezcla de verde y el rojo de la pared del fondo
    expect((medio >>> 8) & 0xff).toBeGreaterThan(90);
    expect(medio & 0xff).toBeGreaterThan(90);
  });

  it('detrás del ojo no se pinta, y pegado al ojo no rompe nada', () => {
    expect(pintar(SALA, ojoEn(3.5, 3.5), {}, [sprite(1.5, 3.5)]).altoDe(80, VERDE)).toBe(0);
    expect(() => pintar(SALA, ojoEn(3.5, 3.5), {}, [sprite(3.5, 3.5), sprite(3.5001, 3.5), sprite(NaN, NaN)])).not.toThrow();
  });

  it('el tinte (un «flash») lo acerca a ese color y volteado sale al revés', () => {
    const v = pintar(SALA, ojoEn(1.5, 3.5), {}, [sprite(2.5, 3.5, { tinte: BLANCO, cuantoTinte: 1 })]);
    expect(v.pixel(80, 70)).toBe(BLANCO);
    const dosColores = mitades(ROJO, AZUL);
    const normal = pintar(SALA, ojoEn(1.5, 3.5), {}, [sprite(2.5, 3.5, { textura: dosColores })]);
    const volteado = pintar(SALA, ojoEn(1.5, 3.5), {}, [sprite(2.5, 3.5, { textura: dosColores, voltear: true })]);
    expect(normal.pixel(70, 70)).toBe(ROJO);
    expect(volteado.pixel(70, 70)).toBe(AZUL);
  });
});

describe('Raycaster: dónde cae un punto del mundo', () => {
  it('lo de delante, en el centro; lo de la derecha, a la derecha; lo de detrás, nada', () => {
    const v = pintar(SALA, ojoEn(1.5, 3.5));
    const frente = v.rc.proyectar(3.5, 3.5, 0.5)!;
    expect(frente.x).toBeCloseTo(80, 0);
    expect(frente.y).toBeCloseTo(50, 0);
    expect(frente.distancia).toBeCloseTo(2, 3);
    expect(frente.tapado).toBe(false);
    // Mirando a la derecha (x crece), «a mi derecha» es hacia abajo en el mapa (y menor)
    expect(v.rc.proyectar(3.5, 2.5, 0.5)!.x).toBeGreaterThan(100);
    expect(v.rc.proyectar(3.5, 4.5, 0.5)!.x).toBeLessThan(60);
    // Los pies caen más abajo que la cabeza
    expect(v.rc.proyectar(3.5, 3.5, 0)!.y).toBeGreaterThan(v.rc.proyectar(3.5, 3.5, 1)!.y);
    expect(v.rc.proyectar(0.5, 3.5, 0.5)).toBeNull();
  });

  it('dice si lo tapa una pared', () => {
    const v = pintar(['#######', '#..#..#', '#..#..#', '#..#..#', '#######'], ojoEn(1.5, 2.5));
    expect(v.rc.proyectar(2.5, 2.5)!.tapado).toBe(false);
    expect(v.rc.proyectar(4.5, 2.5)!.tapado).toBe(true);
  });
});

describe('Raycaster: va deprisa', () => {
  it('pinta 640×360 con texturas, niebla y 100 sprites en pocos milisegundos', () => {
    const lado = 32;
    const dibujo = Array.from({ length: lado }, (_, f) => Array.from({ length: lado }, (_, c) => (f === 0 || c === 0 || f === lado - 1 || c === lado - 1 || (f % 5 === 0 && c % 3 !== 0) ? '#' : f % 4 === 1 ? 's' : '.')).join(''));
    const ruido = (semilla: number): Textura => ({ ancho: 64, alto: 64, pix: Uint32Array.from({ length: 4096 }, (_, i) => empaquetar((i * 7 + semilla) & 255, (i * 13) & 255, (i * 3) & 255)) });
    const texturas = [ruido(1), ruido(2), ruido(3), ruido(4)];
    const sprites = Array.from({ length: 100 }, (_, i) => sprite(2.5 + (i % 10) * 2.7, 2.5 + Math.floor(i / 10) * 2.7, { textura: ruido(i) }));
    const rc = new Raycaster();
    rc.redimensionar(640, 360);
    const r = rejilla(dibujo);
    const ambiente = { ...AMBIENTE, suelo: ruido(9), techo: ruido(8), niebla: { color: NEGRO, desde: 3, hasta: 20 } };
    // (unas vueltas para que el motor de JavaScript lo optimice, como pasa al jugar)
    for (let i = 0; i < 10; i++) rc.pintar(r, texturas, ojoEn(16.5, 16.5, i * 36), ambiente, sprites);
    const t0 = performance.now();
    const vueltas = 30;
    for (let i = 0; i < vueltas; i++) rc.pintar(r, texturas, ojoEn(16.5, 16.3, i * 12), ambiente, sprites);
    const porFotograma = (performance.now() - t0) / vueltas;
    // A 60 fotogramas por segundo hay 16,6 ms para TODO; el dibujo no puede comerse más de la mitad ni en una máquina lenta
    expect(porFotograma).toBeLessThan(process.env.CI ? 30 : 12);
  });
});

// ───────────────────────── vista3d en un juego ─────────────────────────

/** Una sala de 7×7 casillas de 40 píxeles, con una puerta en medio de un muro, y el jugador dentro. */
function juego3D(codigo: string, mas: DefObjeto[] = [], plantillas: Record<string, DefObjeto> = {}) {
  const celdas: Record<string, string> = {};
  for (let c = 0; c < 9; c++) for (let f = 0; f < 7; f++) {
    if (c === 0 || f === 0 || c === 8 || f === 6) celdas[`${c},${f}`] = 'muro';
    else if (c === 4) celdas[`${c},${f}`] = f === 3 ? 'puerta' : 'muro';
  }
  celdas['2,2'] = 'baldosa';
  const j = juegoDePrueba({
    gravedad: 0,
    imagenes: { ladrillo: '', robot: '' },
    plantillas,
    scripts: { 'j.chs': codigo },
    escena: [
      { nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 40, tipos: { muro: { imagen: 'ladrillo', solida: true }, puerta: { color: 'verde', solida: true, puerta: true }, baldosa: { color: 'azul', solida: false } }, celdas } },
      { nombre: 'Jugador', x: 100, y: 140, sprite: { ancho: 20, alto: 20 }, colision: { ancho: 20, alto: 20 }, fisica: { gravedad: 0, rozamiento: 0 }, script: 'j.chs' },
      ...mas,
    ],
  });
  const vista = j.juego.escena.vista3d;
  // Sin lienzo (en las pruebas), las imágenes se «leen» como un color fijo
  vista.leerImagen = (nombre) => texturaLisa(nombre === 'ladrillo' ? ROJO : BLANCO);
  return { ...j, vista, mapa: j.buscar('Mapa').obtener(MapaCasillas)! };
}

describe('vista3d: el juego de siempre, visto desde dentro', () => {
  it('vista3d.ver(yo) la pone, y el mundo se calcula desde sus ojos', () => {
    const j = juego3D('cuando empieza:\n    vista3d.ver(yo)\n    mostrar(vista3d.activa)\n    mostrar(vista3d.observador.nombre)');
    j.avanzar(2);
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['verdadero', 'Jugador']);
    expect(j.vista.calcular(j.juego.escena, 960, 540)).toBe(true);
    const rc = j.vista.raycaster;
    expect(rc.ancho).toBe(calidad.ajustes.columnas3d);
    expect(rc.alto).toBe(Math.round((rc.ancho * 540) / 960));
    // Mira a la derecha (rotación 0): el muro de la puerta está en x = 160..200; la puerta, en su mitad (180), a 80 píxeles = 2 casillas
    expect(rc.profundidad[rc.ancho >> 1]).toBeCloseTo(2, 1);
    // Girado hacia arriba: el muro de arriba (y = 240), a 100 píxeles = 2.5 casillas
    j.buscar('Jugador').transformacion.rotacion = 90;
    j.vista.calcular(j.juego.escena, 960, 540);
    expect(rc.profundidad[rc.ancho >> 1]).toBeCloseTo(2.5, 1);
    expect(rc.pantalla[(rc.alto >> 1) * rc.ancho + (rc.ancho >> 1)] & 0xff).toBeGreaterThan(150);
  });

  it('sin vista3d.ver no cambia nada, y vista3d.quitar() vuelve a la vista normal', () => {
    const j = juego3D('cuando empieza:\n    mostrar(vista3d.activa)\n    vista3d.ver(yo)\n    vista3d.quitar()\n    mostrar(vista3d.activa)\n    mostrar(vista3d.observador)');
    j.avanzar(2);
    expect(j.salida).toEqual(['falso', 'falso', 'nulo']);
    expect(j.vista.calcular(j.juego.escena, 960, 540)).toBe(false);
  });

  it('si quien mira se destruye, la vista se quita sola', () => {
    const j = juego3D('cuando empieza:\n    vista3d.ver(yo)\n\ncuando pasen 0.1 segundos:\n    yo.destruir()');
    j.avanzar(30);
    expect(j.errores).toEqual([]);
    expect(j.vista.activa).toBe(false);
  });

  it('los objetos son sprites: quien mira no se ve, la interfaz tampoco, y lo invisible tampoco', () => {
    const j = juego3D('cuando empieza:\n    vista3d.ver(yo)', [
      { nombre: 'Robot', x: 140, y: 140, sprite: { imagen: 'robot', ancho: 30, alto: 36 } },
      { nombre: 'Marcador', x: 20, y: 20, sprite: { forma: 'texto', texto: 'hola', fijo: true } },
      { nombre: 'Oculto', x: 130, y: 150, sprite: { ancho: 10, alto: 10, visible: false } },
      { nombre: 'Forma', x: 130, y: 120, sprite: { forma: 'circulo', color: 'verde', ancho: 16, alto: 16 } },
    ]);
    j.avanzar(2);
    j.vista.calcular(j.juego.escena, 960, 540);
    expect(j.vista.spritesPintados).toBe(2);
    // El robot, justo delante a una casilla: en el centro de la pantalla hay algo blanco
    const rc = j.vista.raycaster;
    expect(rc.pantalla[Math.round(rc.alto * 0.6) * rc.ancho + (rc.ancho >> 1)]).toBe(BLANCO);
    // Con yo.elevacion sube
    j.buscar('Robot').elevacion = 30;
    j.vista.calcular(j.juego.escena, 960, 540);
    expect(rc.pantalla[Math.round(rc.alto * 0.9) * rc.ancho + (rc.ancho >> 1)]).not.toBe(BLANCO);
  });

  it('la elevación se puede poner en el proyecto (el inspector) y se copia al clonar', () => {
    const j = juego3D('cuando empieza:\n    variable c = clonar(buscar("Dron"))\n    mostrar(buscar("Dron").elevacion, c.elevacion)', [{ nombre: 'Dron', x: 140, y: 140, elevacion: 24, sprite: { imagen: 'robot', ancho: 20, alto: 20 } }]);
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['24 24']);
    expect(() => juego3D('cuando empieza:\n    mostrar(1)', [{ nombre: 'Malo', elevacion: 'mucho' as unknown as number }])).toThrow(/por seguridad no se abre/);
  });

  it('cambiar una casilla del mapa se ve al momento', () => {
    const j = juego3D('cuando empieza:\n    vista3d.ver(yo)');
    j.avanzar(2);
    j.vista.calcular(j.juego.escena, 960, 540);
    const rc = j.vista.raycaster;
    const antes = rc.profundidad[rc.ancho >> 1];
    j.mapa.poner(3, 3, 'muro');
    j.vista.calcular(j.juego.escena, 960, 540);
    // La casilla 3 empieza en x = 120: a 20 píxeles = media casilla
    expect(rc.profundidad[rc.ancho >> 1]).toBeCloseTo(0.5, 1);
    j.mapa.quitar(3, 3);
    j.vista.calcular(j.juego.escena, 960, 540);
    expect(rc.profundidad[rc.ancho >> 1]).toBeCloseTo(antes, 3);
    // Y una casilla puesta FUERA de lo que había (el mapa crece) no rompe nada
    j.mapa.poner(-3, -2, 'muro');
    j.mapa.poner(15, 12, 'muro');
    expect(() => j.vista.calcular(j.juego.escena, 960, 540)).not.toThrow();
    expect(rc.profundidad[rc.ancho >> 1]).toBeCloseTo(antes, 3);
  });

  it('vista3d.enPantalla y vista3d.seVe', () => {
    const j = juego3D('cuando empieza:\n    vista3d.ver(yo)\n\ncuando cada fotograma:\n    juego.p = vista3d.enPantalla(buscar("Robot"))\n    juego.ve = vista3d.seVe(buscar("Robot"))\n    juego.detras = vista3d.enPantalla(vector(yo.x - 50, yo.y))\n    juego.tapado = vista3d.seVe(vector(300, 140))', [
      { nombre: 'Robot', x: 140, y: 140, sprite: { imagen: 'robot', ancho: 30, alto: 36 } },
    ]);
    j.avanzar(1);
    j.vista.calcular(j.juego.escena, 960, 540);
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    const p = j.juego.datoDelJuego('p') as Vector2;
    expect(p.x).toBeCloseTo(480, -1);
    expect(p.y).toBeCloseTo(270, -1);
    expect(j.juego.datoDelJuego('ve')).toBe(true);
    expect(j.juego.datoDelJuego('detras')).toBeNull();
    // Al otro lado del muro: delante, pero tapado
    expect(j.juego.datoDelJuego('tapado')).toBe(false);
  });

  it('los datos de la vista tienen sus topes, con errores claros', () => {
    const error = (codigo: string) => {
      const j = juego3D(`cuando empieza:\n    ${codigo}`);
      j.avanzar(1);
      return j.errores[0] ? `${j.errores[0].error.message} ${j.errores[0].error.pista ?? ''}` : '';
    };
    expect(error('vista3d.campo = 400')).toContain('va de 30 a 120');
    expect(error('vista3d.altura = 3')).toContain('va de 0.05 a 0.95');
    expect(error('vista3d.inclinacion = 9')).toContain('va de -1 a 1');
    expect(error('vista3d.brillo = -1')).toContain('va de 0 a 3');
    expect(error('vista3d.columnas = 99999')).toContain('va de 64 a 1280');
    expect(error('vista3d.suelo("ladrilo")')).toContain('¿Querías decir "ladrillo"?');
    expect(error('vista3d.cielo("nada")')).toContain('no hay ninguna imagen llamada "nada"');
    expect(error('vista3d.pared("muru", "ladrillo")')).toContain('¿Querías decir "muro"?');
    expect(error('vista3d.niebla("negro", 500, 100)')).toContain('a otra MAYOR');
    expect(error('vista3d.niebla("colorin")')).toContain('no conozco el color');
    expect(error('vista3d.ver(5)')).toContain('necesita el objeto desde el que se mira');
    expect(error('vista3d.mapa(yo)')).toContain('no es un mapa de casillas');
    expect(error('vista3d.enPantalla("Robot")')).toContain('necesita un objeto o una posición');
    expect(error('yo.elevacion = "alto"')).not.toBe('');
  });

  it('sin mapa de casillas, vista3d.ver lo explica', () => {
    const j = juegoDePrueba({ scripts: { 'a.chs': 'cuando empieza:\n    vista3d.ver(yo)' }, escena: [{ nombre: 'A', script: 'a.chs' }] });
    j.avanzar(1);
    expect(j.errores[0].error.message).toContain('hace falta un mapa de casillas');
    expect(j.errores[0].error.pista).toContain('Mapa de casillas');
  });

  it('un mapa enorme o miles de objetos no llenan la memoria: hay topes', () => {
    const j = juego3D('cuando empieza:\n    vista3d.ver(yo)\n    repetir 600 veces:\n        crear("Cosa", aleatorio(50, 150), aleatorio(50, 230))', [], { Cosa: { sprite: { ancho: 8, alto: 8 } } });
    j.avanzar(2);
    j.mapa.poner(100000, 100000, 'muro');
    j.mapa.poner(-100000, -100000, 'muro');
    expect(() => j.vista.calcular(j.juego.escena, 960, 540)).not.toThrow();
    expect(j.vista.spritesPintados).toBeLessThanOrEqual(MAXIMO_SPRITES);
    expect(LADO_MAXIMO_MAPA * LADO_MAXIMO_MAPA).toBeLessThanOrEqual(512 * 512);
    // Y pedir una pantalla absurda tampoco
    j.vista.columnas = 1e9;
    j.vista.calcular(j.juego.escena, 960, 540);
    expect(j.vista.raycaster.ancho).toBeLessThanOrEqual(960);
  });

  it('vista3d no deja llegar a JavaScript', () => {
    for (const codigo of ['mostrar(vista3d.constructor)', 'mostrar(vista3d.__proto__)', 'vista3d.pared("__proto__", "ladrillo")', 'vista3d.suelo("constructor")', 'mostrar(raton.constructor)']) {
      let salida: string[] = [];
      try {
        const j = juego3D(`cuando empieza:\n    ${codigo}\n    mostrar("sigue")`);
        j.avanzar(1);
        salida = j.salida;
        expect(j.errores.length, codigo).toBe(1);
      } catch (e) {
        expect(e, codigo).toBeInstanceOf(Error);
      }
      expect(salida, codigo).toEqual([]);
    }
  });
});

// ───────────────────────── Puertas ─────────────────────────

describe('Puertas en los mapas de casillas', () => {
  it('cerrada es una pared; abierta, se pasa por ella', () => {
    const j = juego3D('cuando cada fotograma:\n    yo.velocidad = vector(200, 0)');
    j.avanzar(60);
    // El muro de la puerta empieza en x = 160: el jugador (de 20 de ancho) se queda en 150
    expect(j.buscar('Jugador').posicion.x).toBeLessThanOrEqual(151);
    j.mapa.moverPuerta(4, 3, 1, 0.5);
    j.avanzar(10);
    // A medio abrir todavía no se pasa
    expect(j.mapa.abierta(4, 3)).toBe(false);
    expect(j.buscar('Jugador').posicion.x).toBeLessThanOrEqual(151);
    j.avanzar(60);
    expect(j.mapa.apertura(4, 3)).toBe(1);
    expect(j.buscar('Jugador').posicion.x).toBeGreaterThan(220);
  });

  it('mapa.abrirPuerta, cerrarPuerta, puertaAbierta y esPuerta desde un script', () => {
    const j = juego3D('cuando empieza:\n    variable m = buscar("Mapa")\n    mostrar(m.esPuerta(4, 3), m.esPuerta(4, 2), m.puertaAbierta(4, 3))\n    m.abrirPuerta(4, 3, 0.2)\n    esperar(0.5)\n    mostrar(m.puertaAbierta(4, 3))\n    m.cerrarPuerta(4, 3, 0)\n    mostrar(m.puertaAbierta(4, 3))');
    j.avanzar(60);
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['verdadero falso falso', 'verdadero', 'falso']);
    expect(APERTURA_PARA_PASAR).toBeGreaterThan(0.5);
  });

  it('mapa.solidoEn(x, y): una pared sí; el suelo, una baldosa que se atraviesa y una puerta abierta, no', () => {
    const j = juego3D('cuando empieza:\n    variable m = buscar("Mapa")\n    mostrar(m.solidoEn(20, 20), m.solidoEn(100, 140), m.solidoEn(100, 100), m.solidoEn(180, 140), m.solidoEn(-500, 9000))\n    m.abrirPuerta(4, 3, 0)\n    mostrar(m.solidoEn(180, 140))');
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    // (20, 20) es el muro de la esquina; (100, 140) suelo sin casilla; (100, 100) la baldosa azul; (180, 140) la puerta
    expect(j.salida).toEqual(['verdadero falso falso verdadero falso', 'falso']);
  });

  it('abrir algo que no es una puerta lo explica', () => {
    const error = (codigo: string) => {
      const j = juego3D(`cuando empieza:\n    ${codigo}`);
      j.avanzar(1);
      return `${j.errores[0]?.error.message} ${j.errores[0]?.error.pista}`;
    };
    expect(error('buscar("Mapa").abrirPuerta(0, 0)')).toContain('es de tipo "muro", que no es una puerta');
    expect(error('buscar("Mapa").abrirPuerta(0, 0)')).toContain('"puerta"');
    expect(error('buscar("Mapa").cerrarPuerta(2, 4)')).toContain('no hay nada');
    expect(error('buscar("Mapa").abrirPuerta(4, 3, 500)')).toContain('de 0 a 60 segundos');
    expect(error('yo.abrirPuerta(4, 3)')).toContain('solo funciona con mapas de casillas');
  });

  it('los rayos y los caminos pasan por una puerta abierta, y por una cerrada no', () => {
    const j = juego3D('cuando empieza:\n    mostrar("ya")');
    j.avanzar(1);
    const desde = new Vector2(100, 140);
    const cerrada = lanzarRayo(j.juego.escena, desde, new Vector2(1, 0), 1000, j.buscar('Jugador'))!;
    expect(cerrada.casilla).toBe('puerta');
    expect(cerrada.distancia).toBeCloseTo(60, 0);
    expect(buscarCamino(j.mapa, desde, new Vector2(300, 140))).toBeNull();
    j.mapa.moverPuerta(4, 3, 1, 0);
    const abierta = lanzarRayo(j.juego.escena, desde, new Vector2(1, 0), 1000, j.buscar('Jugador'))!;
    expect(abierta.casilla).toBe('muro');
    expect(abierta.distancia).toBeCloseTo(220, 0);
    expect(buscarCamino(j.mapa, desde, new Vector2(300, 140))).not.toBeNull();
  });

  it('en primera persona la puerta se aparta poco a poco', () => {
    const j = juego3D('cuando empieza:\n    vista3d.ver(yo)');
    j.avanzar(2);
    const rc = j.vista.raycaster;
    j.vista.calcular(j.juego.escena, 960, 540);
    expect(rc.profundidad[rc.ancho >> 1]).toBeCloseTo(2, 1);
    j.mapa.moverPuerta(4, 3, 1, 0);
    j.vista.calcular(j.juego.escena, 960, 540);
    // Se ve el muro del fondo (x = 320): a 220 píxeles = 5.5 casillas
    expect(rc.profundidad[rc.ancho >> 1]).toBeCloseTo(5.5, 1);
  });

  it('poner o quitar la casilla de una puerta abierta la olvida (no queda una puerta fantasma)', () => {
    const j = juego3D('cuando empieza:\n    mostrar("ya")');
    j.mapa.moverPuerta(4, 3, 1, 0);
    expect(j.mapa.abierta(4, 3)).toBe(true);
    j.mapa.poner(4, 3, 'muro');
    expect(j.mapa.abierta(4, 3)).toBe(false);
    expect(j.mapa.solidaEn(4, 3, 'muro')).toBe(true);
  });

  it('el archivo de un proyecto solo admite verdadero o falso en «puerta»', () => {
    const con = (puerta: unknown) => () => juegoDePrueba({ escena: [{ nombre: 'Mapa', mapa: { tamano: 40, tipos: { p: { solida: true, puerta: puerta as boolean } }, celdas: {} } }] });
    expect(con(true)).not.toThrow();
    expect(con('si')).toThrow(/por seguridad no se abre/);
  });
});

// ───────────────────────── Sonido y ratón ─────────────────────────

describe('En primera persona, el sonido suena por el lado donde está según hacia dónde se mira', () => {
  it('a la derecha de quien mira, por la derecha; delante o detrás, por los dos', () => {
    const yo = { x: 0, y: 0, mirando: 0 };
    // Mirando a la derecha (x crece): mi derecha es hacia abajo (y menor)
    expect(oirDesde(yo, { x: 0, y: -100 }, 800, 480).pan).toBeGreaterThan(0.8);
    expect(oirDesde(yo, { x: 0, y: 100 }, 800, 480).pan).toBeLessThan(-0.8);
    expect(oirDesde(yo, { x: 100, y: 0 }, 800, 480).pan).toBeCloseTo(0, 5);
    expect(oirDesde(yo, { x: -100, y: 0 }, 800, 480).pan).toBeCloseTo(0, 5);
    // Al girarse (mirando hacia arriba), lo mismo cambia de lado
    const arriba = { x: 0, y: 0, mirando: Math.PI / 2 };
    expect(oirDesde(arriba, { x: 100, y: 0 }, 800, 480).pan).toBeGreaterThan(0.8);
    // El volumen sigue dependiendo de la distancia
    expect(oirDesde(yo, { x: 0, y: -100 }, 800, 480).volumen).toBeGreaterThan(oirDesde(yo, { x: 0, y: -600 }, 800, 480).volumen);
    // Y encima del oyente no hay lado
    expect(oirDesde(yo, { x: 0, y: 0 }, 800, 480).pan).toBeCloseTo(0, 5);
  });

  it('sin mirar a ningún sitio (vista desde arriba) sigue como antes', () => {
    expect(oirDesde({ x: 0, y: 0 }, { x: 240, y: 0 }, 800, 480).pan).toBeCloseTo(0.425, 3);
    expect(oirDesde({ x: 0, y: 0 }, { x: 0, y: -100 }, 800, 480).pan).toBeCloseTo(0, 5);
  });
});

describe('Mirar con el ratón', () => {
  it('raton.movX y raton.movY: lo que se mueve en cada fotograma (la Y hacia arriba)', () => {
    const j = juego3D('cuando cada fotograma:\n    juego.mx = raton.movX\n    juego.my = raton.movY');
    j.avanzar(1);
    const mover = (dx: number, dy: number) => {
      const e = new MouseEvent('pointermove', { bubbles: true }) as MouseEvent & Record<string, unknown>;
      Object.defineProperties(e, { movementX: { value: dx }, movementY: { value: dy }, pointerType: { value: 'mouse' } });
      window.dispatchEvent(e);
    };
    mover(12, 5);
    mover(3, -1);
    j.avanzar(1);
    expect(j.juego.datoDelJuego('mx')).toBe(15);
    expect(j.juego.datoDelJuego('my')).toBe(-4);
    j.avanzar(1);
    expect(j.juego.datoDelJuego('mx')).toBe(0);
  });

  it('raton.capturado se puede pedir aunque el navegador no deje (no da error), y dice la verdad', () => {
    const j = juego3D('cuando empieza:\n    raton.capturado = verdadero\n    mostrar(raton.capturado)\n    raton.capturado = falso\n    mostrar(raton.capturado)');
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['falso', 'falso']);
  });
});

describe('Capturar el ratón no estropea los toques', () => {
  it('con ratón se pide al momento y en cada clic; jugando con el dedo no se pide, y un toque lo suelta', () => {
    const j = juego3D('cuando se pulsa "c":\n    raton.capturado = verdadero');
    let pedidas = 0;
    let soltadas = 0;
    (j.canvas as unknown as { requestPointerLock: () => void }).requestPointerLock = () => void pedidas++;
    const documento = document as unknown as { exitPointerLock: () => void; pointerLockElement: Element | null };
    const antes = Object.getOwnPropertyDescriptor(document, 'pointerLockElement');
    let capturado: Element | null = null;
    Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => capturado });
    documento.exitPointerLock = () => {
      soltadas++;
      capturado = null;
    };
    const bajar = (tipo: string) => {
      const e = new MouseEvent('pointerdown', { button: 0, bubbles: true }) as MouseEvent & Record<string, unknown>;
      Object.defineProperty(e, 'pointerType', { value: tipo });
      j.canvas.dispatchEvent(e);
    };
    try {
      // Con ratón (un ordenador): se pide ya, y otra vez en cada clic mientras no lo tenga
      j.entrada.capturarRaton(true);
      expect(pedidas).toBe(1);
      bajar('mouse');
      expect(pedidas).toBe(2);
      // Ya lo tiene: tocar con el dedo lo suelta (capturado, el navegador no dice dónde cae cada dedo)
      capturado = j.canvas;
      bajar('touch');
      expect(soltadas).toBe(1);
      // Jugando con el dedo, pedirlo desde el juego no hace nada... hasta que alguien haga clic con un ratón
      j.entrada.tactil.usandoDedo(true);
      j.entrada.capturarRaton(true);
      expect(pedidas).toBe(2);
      bajar('touch');
      expect(pedidas).toBe(2);
      bajar('mouse');
      expect(pedidas).toBe(3);
    } finally {
      if (antes) Object.defineProperty(document, 'pointerLockElement', antes);
      else Reflect.deleteProperty(document, 'pointerLockElement');
    }
  });
});

describe('El mando deja de hacer de teclado', () => {
  it('mando.comoTeclado = falso: la palanca ya no pulsa las flechas, pero mando.ejeX sigue diciendo cuánto', () => {
    const j = juego3D('cuando cada fotograma:\n    juego.flecha = teclado.pulsada("derecha")\n    juego.eje = mando.ejeX\n    juego.a = mando.pulsado("a")\n    juego.espacio = teclado.pulsada("espacio")\n\ncuando se pulsa "t":\n    mando.comoTeclado = falso\n    mostrar(mando.comoTeclado)');
    j.entrada.ponerMando(true, new Set(['a']), 0.9, 0);
    j.avanzar(1);
    expect([j.juego.datoDelJuego('flecha'), j.juego.datoDelJuego('eje'), j.juego.datoDelJuego('a'), j.juego.datoDelJuego('espacio')]).toEqual([true, 0.9, true, true]);
    j.pulsar('KeyT', 't');
    j.avanzar(1);
    j.soltar('KeyT', 't');
    j.entrada.ponerMando(true, new Set(['a']), 0.9, 0);
    j.avanzar(1);
    expect(j.salida).toEqual(['falso']);
    expect([j.juego.datoDelJuego('flecha'), j.juego.datoDelJuego('eje'), j.juego.datoDelJuego('a'), j.juego.datoDelJuego('espacio')]).toEqual([false, 0.9, true, false]);
    expect(j.errores).toEqual([]);
  });

  it('los diálogos se siguen pasando con el botón A del mando, y las opciones se eligen con la cruceta', () => {
    const j = juego3D('cuando empieza:\n    mando.comoTeclado = falso\n    variable r = dialogo("Ana", "Vienes?", ["Si", "No"])\n    mostrar(r)');
    const pulsar = (...botones: string[]) => {
      j.entrada.ponerMando(true, new Set(botones), 0, 0);
      j.avanzar(1);
      j.entrada.ponerMando(true, new Set(), 0, 0);
      j.avanzar(1);
    };
    j.avanzar(2);
    // La primera pulsación enseña todo el texto; luego, abajo elige «No», y A lo acepta
    pulsar('a');
    pulsar('abajo');
    pulsar('a');
    j.avanzar(2);
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['No']);
  });
});


// ───────────────────────── Efectos en primera persona ─────────────────────────

/** Un «lienzo» de mentira que apunta lo que se le pide pintar. */
function lienzoApuntador() {
  const llamadas: { que: string; a: number[] }[] = [];
  const textos: { texto: string; x: number; y: number }[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (o, nombre: string) => {
      if (nombre in o) return o[nombre];
      if (nombre === 'createRadialGradient') return () => ({ addColorStop: () => {} });
      return (...a: unknown[]) => {
        if (nombre === 'fillText') textos.push({ texto: String(a[0]), x: a[1] as number, y: a[2] as number });
        llamadas.push({ que: nombre, a: a.filter((x): x is number => typeof x === 'number') });
      };
    },
    set: (o, nombre: string, v) => ((o[nombre] = v), true),
  });
  /** Los rectángulos y círculos pintados: su centro y su tamaño. */
  // (las chispas son rayitas: cuenta donde empieza cada una)
  const manchas = () => llamadas.filter((l) => l.que === 'fillRect' || l.que === 'arc' || l.que === 'moveTo').map((l) => (l.que === 'fillRect' ? { x: l.a[0] + l.a[2] / 2, y: l.a[1] + l.a[3] / 2, tam: l.a[2] } : l.que === 'arc' ? { x: l.a[0], y: l.a[1], tam: l.a[2] * 2 } : { x: l.a[0], y: l.a[1], tam: 1 }));
  return { ctx: ctx as unknown as CanvasRenderingContext2D, llamadas, textos, manchas };
}

describe('Los efectos se ven en primera persona', () => {
  const montar = (codigo: string, mas: DefObjeto[] = []) => {
    const j = juego3D(`cuando empieza:\n    vista3d.ver(yo)\n${codigo}`, mas);
    j.avanzar(2);
    j.vista.calcular(j.juego.escena, 960, 540);
    return j;
  };

  it('las partículas salen donde se ve su sitio, se abren a los lados y hacia arriba, y son más pequeñas de lejos', () => {
    const cerca = montar('    efecto.chispas(vector(yo.x + 40, yo.y))');
    const a = lienzoApuntador();
    cerca.juego.escena.efectos.dibujar3D(a.ctx, cerca.vista.proyector);
    const m = a.manchas();
    expect(m.length).toBeGreaterThan(5);
    // Justo delante: alrededor del centro de la pantalla, repartidas a los dos lados y arriba y abajo
    const xs = m.map((p) => p.x);
    const ys = m.map((p) => p.y);
    expect(Math.min(...xs)).toBeLessThan(480);
    expect(Math.max(...xs)).toBeGreaterThan(480);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(4);
    expect(xs.every((x) => x > 200 && x < 760)).toBe(true);
    // Lo mismo al doble de distancia: más juntas y más pequeñas
    const lejos = montar('    efecto.chispas(vector(yo.x + 78, yo.y))');
    const b = lienzoApuntador();
    lejos.juego.escena.efectos.dibujar3D(b.ctx, lejos.vista.proyector);
    const ancho = (l: ReturnType<typeof lienzoApuntador>) => Math.max(...l.manchas().map((p) => p.x)) - Math.min(...l.manchas().map((p) => p.x));
    expect(ancho(b)).toBeLessThan(ancho(a));
  });

  it('lo que queda detrás de quien mira o al otro lado de una pared no se pinta', () => {
    const detras = montar('    efecto.chispas(vector(yo.x - 40, yo.y))');
    const a = lienzoApuntador();
    detras.juego.escena.efectos.dibujar3D(a.ctx, detras.vista.proyector);
    expect(a.manchas()).toEqual([]);
    // Al otro lado del muro (x = 300): delante, pero tapado
    const tapado = montar('    efecto.chispas(vector(300, 200))');
    const b = lienzoApuntador();
    tapado.juego.escena.efectos.dibujar3D(b.ctx, tapado.vista.proyector);
    expect(b.manchas()).toEqual([]);
  });

  it('el efecto de un objeto sale a SU altura (un dron que vuela echa chispas arriba)', () => {
    const robot: DefObjeto = { nombre: 'Robot', x: 140, y: 140, sprite: { imagen: 'robot', ancho: 20, alto: 20 } };
    const suelo = montar('    efecto.chispas(buscar("Robot"))', [robot]);
    const a = lienzoApuntador();
    suelo.juego.escena.efectos.dibujar3D(a.ctx, suelo.vista.proyector);
    const vuela = montar('    buscar("Robot").elevacion = 28\n    efecto.chispas(buscar("Robot"))', [robot]);
    const b = lienzoApuntador();
    vuela.juego.escena.efectos.dibujar3D(b.ctx, vuela.vista.proyector);
    const media = (l: ReturnType<typeof lienzoApuntador>) => l.manchas().reduce((s, p) => s + p.y, 0) / l.manchas().length;
    // (en el lienzo la Y va hacia abajo: más arriba = menor)
    expect(media(b)).toBeLessThan(media(a) - 30);
    // El del suelo queda por debajo del horizonte (y = 270)
    expect(media(a)).toBeGreaterThan(270);
  });

  it('el número de un golpe sale encima de la cabeza y se lee', () => {
    const j = montar('    efecto.golpe(buscar("Robot"), 25)', [{ nombre: 'Robot', x: 140, y: 140, sprite: { imagen: 'robot', ancho: 20, alto: 20 } }]);
    const a = lienzoApuntador();
    j.juego.escena.efectos.dibujar3D(a.ctx, j.vista.proyector);
    expect(a.textos).toHaveLength(1);
    expect(a.textos[0].texto).toBe('-25');
    expect(a.textos[0].x).toBeGreaterThan(430);
    expect(a.textos[0].x).toBeLessThan(530);
    // La cabeza del robot (20 de alto en casillas de 40) queda justo en el horizonte: el número, un poco por encima
    expect(a.textos[0].y).toBeLessThan(275);
    expect(a.textos[0].y).toBeGreaterThan(100);
  });

  it('destellos, ondas, rayos y textos: se pintan sin fallar, y el clima no sale', () => {
    const j = montar('    efecto.explosion(vector(yo.x + 60, yo.y))\n    efecto.onda(vector(yo.x + 60, yo.y))\n    efecto.rayo(yo, buscar("Robot"))\n    efecto.texto("+1", vector(yo.x + 60, yo.y))\n    efecto.fuego(buscar("Robot"))', [{ nombre: 'Robot', x: 140, y: 150, sprite: { imagen: 'robot', ancho: 20, alto: 20 } }]);
    j.avanzar(6);
    j.vista.calcular(j.juego.escena, 960, 540);
    const a = lienzoApuntador();
    expect(() => j.juego.escena.efectos.dibujar3D(a.ctx, j.vista.proyector)).not.toThrow();
    expect(a.llamadas.some((l) => l.que === 'ellipse')).toBe(true);
    expect(a.llamadas.some((l) => l.que === 'stroke')).toBe(true);
    expect(a.textos.map((t) => t.texto)).toContain('+1');
    // Ninguna mancha con números raros (ni NaN ni infinitos)
    expect(a.manchas().every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.tam))).toBe(true);
    expect(j.errores).toEqual([]);
  });

  it('el clima (lluvia, nieve), que cae por toda la pantalla vista desde arriba, no se pinta en primera persona', () => {
    const j = montar('    efecto.lluvia(5)');
    j.avanzar(20);
    j.vista.calcular(j.juego.escena, 960, 540);
    expect(j.juego.escena.particulas.cantidad).toBeGreaterThan(10);
    const a = lienzoApuntador();
    j.juego.escena.efectos.dibujar3D(a.ctx, j.vista.proyector);
    expect(a.manchas()).toEqual([]);
  });

  it('sin la vista puesta, no pinta nada (y no falla)', () => {
    const j = juego3D('cuando empieza:\n    efecto.chispas(yo)');
    j.avanzar(2);
    const a = lienzoApuntador();
    j.juego.escena.efectos.dibujar3D(a.ctx, j.vista.proyector);
    expect(a.manchas()).toEqual([]);
  });
});

describe('rayo(): qué atraviesa', () => {
  const mas: DefObjeto[] = [
    { nombre: 'Moneda', x: 125, y: 140, sprite: { ancho: 10, alto: 10 }, colision: { ancho: 10, alto: 10, solido: false } },
    { nombre: 'Robot', tipo: 'Enemigo', x: 150, y: 140, sprite: { ancho: 10, alto: 10 }, colision: { ancho: 10, alto: 10 } },
  ];
  const rayo = (cuarto: string) => {
    const j = juego3D(`cuando empieza:\n    variable r = rayo(yo, 0, 500${cuarto})\n    si r == nulo:\n        mostrar("nada")\n    sino si r.casilla != nulo:\n        mostrar("casilla " + r.casilla)\n    sino:\n        mostrar(r.objeto.nombre)`, mas);
    j.avanzar(1);
    return j.errores[0] ? `${j.errores[0].error.message} ${j.errores[0].error.pista ?? ''}` : j.salida[0];
  };

  it('sin decir nada, lo primero que toca (también lo que se atraviesa), como siempre', () => {
    expect(rayo('')).toBe('Moneda');
  });

  it('"solidos": pasa a través de los fantasmas y se para en lo sólido', () => {
    expect(rayo(', "solidos"')).toBe('Robot');
    expect(rayo(', "Sólidos"')).toBe('Robot');
  });

  it('un nombre, un tipo, una etiqueta o una lista: se los salta', () => {
    expect(rayo(', "Moneda"')).toBe('Robot');
    expect(rayo(', ["Moneda", "Enemigo"]')).toBe('casilla puerta');
    expect(rayo(', ["solidos", "Robot"]')).toBe('casilla puerta');
    expect(rayo(', nulo')).toBe('Moneda');
  });

  it('si se le da otra cosa, lo explica', () => {
    expect(rayo(', 7')).toContain('se dice con textos');
    expect(rayo(', 7')).toContain('rayo(yo, 0, 500, "solidos")');
  });
});
