/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * FORMAS (día 1, bloque 1): cada forma tiene su figura, y choca, se toca y
 * se pincha con su forma de verdad (no con su caja).
 */
import { describe, expect, it } from 'vitest';
import { FORMAS_DIBUJO, areaConSigno, esConvexa, figuraDe, type DatosFigura } from '../src/objetos/formas/figuras';
import { choqueFiguras } from '../src/objetos/formas/sat';
import { migrarProyecto, proyectoVacio, type DefObjeto } from '../src/proyecto/formato';
import { Fisica } from '../src/objetos/componentes/Fisica';
import { juegoDePrueba } from './ayudantes';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { Inspector } from '../src/editor/paneles/Inspector';
import type { VistaEscena } from '../src/editor/escena/VistaEscena';
import { trazoDeForma } from '../src/editor/interfaz/iconosFormas';

const suelo: DefObjeto = { nombre: 'Suelo', x: 480, y: -20, sprite: { ancho: 2000, alto: 40 }, colision: {} };
const caja = (x: number, y: number, extra: Partial<DefObjeto> = {}): DefObjeto => ({ nombre: 'Caja', x, y, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: {}, ...extra });
const areaDe = (d: DatosFigura) => figuraDe(d).piezas.reduce((s, p) => s + areaConSigno(p), 0);

describe('Figuras: los puntos de cada forma', () => {
  it('cada forma se parte en piezas convexas, bien orientadas', () => {
    for (const { forma } of FORMAS_DIBUJO) {
      const f = figuraDe({ forma, ancho: 200, alto: 100, puntos: [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0, y: 0.5 }] });
      expect(f.piezas.length, forma).toBeGreaterThan(0);
      for (const p of f.piezas) {
        expect(esConvexa(p), forma).toBe(true);
        expect(areaConSigno(p), forma).toBeGreaterThan(0);
      }
    }
  });

  it('las piezas ocupan lo mismo que la forma (área)', () => {
    expect(areaDe({ forma: 'rectangulo', ancho: 200, alto: 100 })).toBeCloseTo(20000);
    expect(areaDe({ forma: 'triangulo', ancho: 200, alto: 100 })).toBeCloseTo(10000);
    expect(areaDe({ forma: 'rombo', ancho: 200, alto: 100 })).toBeCloseTo(10000);
    expect(areaDe({ forma: 'circulo', ancho: 100, alto: 100 }) / (Math.PI * 50 * 50)).toBeCloseTo(1, 1);
    expect(areaDe({ forma: 'anillo', ancho: 100, alto: 100, radioInterior: 0.5 }) / (Math.PI * (50 * 50 - 25 * 25))).toBeCloseTo(1, 1);
    // Una estrella de 5 puntas (radio 50) con el hueco a la mitad (25): 10 triángulos centro-punta-hueco
    const estrella = 5 * 50 * 25 * Math.sin(Math.PI / 5);
    expect(areaDe({ forma: 'estrella', ancho: 100, alto: 100 }) / estrella).toBeCloseTo(1, 2);
  });

  it('el corazón y la estrella se juntan en pocas piezas (no en decenas de triángulos)', () => {
    expect(figuraDe({ forma: 'estrella', ancho: 100, alto: 100 }).piezas.length).toBeLessThanOrEqual(6);
    expect(figuraDe({ forma: 'corazon', ancho: 100, alto: 100 }).piezas.length).toBeLessThan(20);
    expect(figuraDe({ forma: 'flecha', ancho: 100, alto: 100 }).piezas.length).toBeLessThanOrEqual(3);
  });

  it('un camino abierto es una línea gruesa; cerrado, se rellena', () => {
    const puntos = [{ x: -0.5, y: 0 }, { x: 0, y: 0.5 }, { x: 0.5, y: 0 }];
    const abierto = figuraDe({ forma: 'camino', ancho: 100, alto: 100, puntos, cerrado: false, grosor: 10 });
    expect(abierto.trazo?.grosor).toBe(10);
    expect(abierto.anillos).toEqual([]);
    expect(abierto.piezas.length).toBe(2);
    const cerrado = figuraDe({ forma: 'camino', ancho: 100, alto: 100, puntos });
    expect(cerrado.trazo).toBeNull();
    expect(areaDe({ forma: 'camino', ancho: 100, alto: 100, puntos })).toBeCloseTo(2500);
  });

  it('las curvas de la pluma se convierten en tramos (más puntos que los que pones)', () => {
    const f = figuraDe({ forma: 'camino', ancho: 100, alto: 100, puntos: [{ x: -0.5, y: 0, salida: { x: -0.5, y: 0.5 } }, { x: 0.5, y: 0, entrada: { x: 0.5, y: 0.5 } }] });
    expect(f.anillos[0][0].length).toBeGreaterThan(10);
  });

  it('el polígono y la estrella no se pasan de 64 lados (para no congelar el navegador)', () => {
    expect(figuraDe({ forma: 'poligono', ancho: 100, alto: 100, lados: 1e9 }).piezas[0].length).toBe(64);
    expect(figuraDe({ forma: 'poligono', ancho: 100, alto: 100, lados: 1 }).piezas[0].length).toBe(3);
  });

  it('SAT: dos cuadrados que se meten 5 píxeles se separan por el lado corto', () => {
    const a = [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]];
    const b = [[{ x: 5, y: 2 }, { x: 15, y: 2 }, { x: 15, y: 12 }, { x: 5, y: 12 }]];
    const c = choqueFiguras(a, b)!;
    expect(c.profundidad).toBeCloseTo(5);
    expect(c.nx).toBeCloseTo(-1);
  });
});

describe('Física con figuras', () => {
  it('una caja que cae en una rampa (triángulo) se queda sobre la cuesta, no sobre su caja', () => {
    const j = juegoDePrueba({ escena: [suelo, { nombre: 'Rampa', x: 500, y: 100, sprite: { forma: 'triangulo', ancho: 400, alto: 200 }, colision: {} }, caja(400, 400)] });
    j.avanzar(180);
    const c = j.buscar('Caja').posicion;
    // La cuesta izquierda es y = x - 300: la esquina de abajo a la derecha de la caja (x + 10) se apoya en ella
    expect(c.y).toBeGreaterThan(112);
    expect(c.y).toBeLessThan(128);
    expect(Math.abs(c.x - 400)).toBeLessThan(3); // no resbala cuesta abajo
  });

  it('un círculo con física descansa sobre el suelo, y otro círculo se apoya encima', () => {
    const bola = (nombre: string, y: number): DefObjeto => ({ nombre, x: 500, y, sprite: { forma: 'circulo', ancho: 40, alto: 40 }, colision: {}, fisica: {} });
    const j = juegoDePrueba({ escena: [suelo, bola('Abajo', 60), bola('Arriba', 160)] });
    j.avanzar(180);
    expect(j.buscar('Abajo').posicion.y).toBeCloseTo(20, 0);
    expect(j.buscar('Arriba').posicion.y).toBeGreaterThan(55);
    expect(j.buscar('Arriba').posicion.y).toBeLessThan(65);
  });

  it('una pelota que rebota en una rampa sale en diagonal', () => {
    const j = juegoDePrueba({
      escena: [suelo, { nombre: 'Rampa', x: 500, y: 100, sprite: { forma: 'triangulo', ancho: 400, alto: 200 }, colision: {} },
        { nombre: 'Pelota', x: 400, y: 400, sprite: { forma: 'circulo', ancho: 20, alto: 20 }, colision: {}, fisica: { rebote: 0.8, rozamiento: 0 } }],
    });
    j.avanzar(40);
    const v = j.buscar('Pelota').obtener(Fisica)!.velocidad;
    expect(v.x).toBeLessThan(-50); // la cuesta mira a la izquierda: sale hacia la izquierda
  });

  it('dentro de un anillo hay hueco: lo que cae dentro se queda en el borde de dentro', () => {
    const j = juegoDePrueba({ escena: [{ nombre: 'Anillo', x: 500, y: 300, sprite: { forma: 'anillo', ancho: 300, alto: 300, radioInterior: 0.6 }, colision: {} }, caja(500, 300, { sprite: { ancho: 10, alto: 10 } })] });
    j.avanzar(180);
    const y = j.buscar('Caja').posicion.y;
    expect(y).toBeGreaterThan(205);
    expect(y).toBeLessThan(225);
  });

  it('cada forma aguanta una caja que le cae encima (no la atraviesa)', () => {
    for (const { forma } of FORMAS_DIBUJO) {
      const j = juegoDePrueba({
        escena: [suelo, { nombre: 'Forma', x: 500, y: 200, sprite: { forma, ancho: 200, alto: 100, puntos: [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0, y: 0.5 }] }, colision: {} }, caja(500, 450)],
      });
      j.avanzar(150);
      expect(j.errores, forma).toEqual([]);
      expect(j.buscar('Caja').posicion.y, forma).toBeGreaterThan(160);
    }
  });

  it('con colision.forma = "caja", una estrella choca como una caja', () => {
    const j = juegoDePrueba({ escena: [{ nombre: 'Estrella', x: 500, y: 100, sprite: { forma: 'estrella', ancho: 200, alto: 200 }, colision: { forma: 'caja' } }, caja(420, 400)] });
    j.avanzar(150);
    expect(j.buscar('Caja').posicion.y).toBeCloseTo(210, 0);
  });
});

describe('Tocar y hacer clic con figuras', () => {
  const estrella: DefObjeto = { nombre: 'Estrella', x: 500, y: 300, sprite: { forma: 'estrella', ancho: 200, alto: 200 }, colision: { solido: false }, script: 'estrella.chs' };

  it('«cuando toco» solo salta al tocar la estrella de verdad, no su caja', () => {
    const j = juegoDePrueba({
      scripts: { 'sensor.chs': 'cuando toco Estrella:\n    mostrar("toca")', 'estrella.chs': '' },
      escena: [estrella, { nombre: 'Sensor', x: 410, y: 390, sprite: { ancho: 10, alto: 10 }, colision: { solido: false }, script: 'sensor.chs' }],
    });
    j.avanzar(5);
    expect(j.salida).toEqual([]);
    j.buscar('Sensor').en(500, 300);
    j.avanzar(2);
    expect(j.salida).toEqual(['toca']);
  });

  it('yo.tocando() también mira la figura', () => {
    const j = juegoDePrueba({
      scripts: { 'sensor.chs': 'cuando cada fotograma:\n    mostrar(yo.tocando("Estrella"))', 'estrella.chs': '' },
      escena: [estrella, { nombre: 'Sensor', x: 410, y: 390, sprite: { ancho: 10, alto: 10 }, colision: { solido: false }, script: 'sensor.chs' }],
    });
    j.avanzar(1);
    expect(j.salida.at(-1)).toBe('falso');
    j.buscar('Sensor').en(500, 300);
    j.avanzar(1);
    expect(j.salida.at(-1)).toBe('verdadero');
  });

  it('un botón con forma de corazón solo se pulsa encima del corazón', () => {
    const j = juegoDePrueba({
      scripts: { 'boton.chs': 'cuando hago clic encima:\n    mostrar("clic")' },
      escena: [{ nombre: 'Boton', x: 500, y: 300, sprite: { forma: 'corazon', ancho: 200, alto: 200 }, script: 'boton.chs' }],
    });
    j.clic(500, 395); // el hueco de arriba del corazón (dentro de su caja)
    j.avanzar(1);
    expect(j.salida).toEqual([]);
    j.clic(500, 300);
    j.avanzar(1);
    expect(j.salida).toEqual(['clic']);
  });
});

describe('Proyectos con formas', () => {
  it('los círculos de los proyectos de antes siguen chocando como cajas (el juego no cambia)', () => {
    const viejo = { ...proyectoVacio(), version: 2, escenas: { Principal: { colorFondo: 'negro', objetos: [{ nombre: 'Bola', sprite: { forma: 'circulo' }, colision: {} }] } } };
    expect(migrarProyecto(viejo).escenas.Principal.objetos[0].colision?.forma).toBe('caja');
    const nuevo = { ...proyectoVacio(), escenas: { Principal: { colorFondo: 'negro', objetos: [{ nombre: 'Bola', sprite: { forma: 'circulo' }, colision: {} }] } } };
    expect(migrarProyecto(nuevo).escenas.Principal.objetos[0].colision?.forma).toBeUndefined();
  });

  it('una forma que no existe, o una estrella de mil puntas, no se abre', () => {
    const con = (sprite: object) => ({ ...proyectoVacio(), escenas: { Principal: { colorFondo: 'negro', objetos: [{ nombre: 'X', sprite }] } } });
    expect(() => migrarProyecto(con({ forma: 'hexagono' }))).toThrow(/forma/);
    expect(() => migrarProyecto(con({ forma: 'estrella', lados: 1000 }))).toThrow(/lados/);
    expect(() => migrarProyecto(con({ forma: 'camino', puntos: [{ x: 0, y: 0, z: 1 }] }))).toThrow(/punto/);
    expect(migrarProyecto(con({ forma: 'camino', puntos: [{ x: 0, y: 0, salida: { x: 0.1, y: 0.2 } }] })).escenas.Principal.objetos[0].sprite?.puntos?.[0].salida).toEqual({ x: 0.1, y: 0.2 });
  });
});

describe('Formas en el editor', () => {
  const vistaFalsa = () => ({ herramienta: 'mover', tipoPincel: null, alCambiarHerramienta: () => {}, ponerHerramienta() {} }) as unknown as VistaEscena;

  it('se añade una forma con su nombre (sin tildes), su color y su colisión', () => {
    const e = new EstadoEditor();
    e.crearObjeto('forma', 100, 100, undefined, 'corazon');
    const def = e.seleccionado!;
    expect(def.nombre).toBe('Corazon');
    expect(def.sprite?.forma).toBe('corazon');
    expect(def.colision).toEqual({});
    e.crearObjeto('forma', 100, 100, undefined, 'redondeado');
    expect(e.seleccionado!.nombre).toBe('Rectangulo');
  });

  it('el inspector enseña los datos de cada forma y los cambia', () => {
    const e = new EstadoEditor();
    const insp = new Inspector(e, vistaFalsa());
    e.crearObjeto('forma', 0, 0, undefined, 'estrella');
    const puntas = insp.elemento.querySelector<HTMLInputElement>('[data-ruta="sprite.lados"]')!;
    expect(puntas.value).toBe('5');
    puntas.value = '7';
    puntas.dispatchEvent(new Event('change'));
    expect(e.seleccionado!.sprite?.lados).toBe(7);
    expect(insp.elemento.querySelector('[data-ruta="sprite.radioInterior"]')).not.toBeNull();
    // Cambiar la forma a arco enseña desde/hasta; la colisión se puede poner como caja
    const dibujo = insp.elemento.querySelector<HTMLSelectElement>('[data-ruta="sprite.dibujo"]')!;
    dibujo.value = 'arco';
    dibujo.dispatchEvent(new Event('change'));
    expect(insp.elemento.querySelector('[data-ruta="sprite.finArco"]')).not.toBeNull();
    const choque = insp.elemento.querySelector<HTMLSelectElement>('[data-ruta="colision.forma"]')!;
    choque.value = 'caja';
    choque.dispatchEvent(new Event('change'));
    expect(e.seleccionado!.colision?.forma).toBe('caja');
  });

  it('los iconos de las formas son sus figuras de verdad', () => {
    for (const { forma } of FORMAS_DIBUJO) expect(trazoDeForma(forma), forma).toMatch(/^M[\d. L]+/);
    // El anillo tiene dos bordes (el de fuera y el agujero)
    expect(trazoDeForma('anillo').match(/M/g)?.length).toBe(2);
  });
});
