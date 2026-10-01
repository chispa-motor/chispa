/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * FORMAS PROPIAS (día 1, bloque 3): la pluma (puntos y curvas), unir y
 * restar formas, y convertir una forma en imagen.
 */
import { describe, expect, it } from 'vitest';
import { ModeloPluma, abrirEditorPluma } from '../src/editor/recursos/EditorPluma';
import { caminoDeForma, combinarFormas, encajarCamino, simplificar } from '../src/editor/recursos/operacionesFormas';
import { areaConSigno, figuraDe } from '../src/objetos/formas/figuras';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { Inspector } from '../src/editor/paneles/Inspector';
import type { VistaEscena } from '../src/editor/escena/VistaEscena';
import type { DefObjeto } from '../src/proyecto/formato';
import { imagenPrueba, juegoDePrueba } from './ayudantes';

const R = 0.02;

describe('La pluma (el modelo)', () => {
  it('clic pone puntos; clic en el primero cierra la forma', () => {
    const m = new ModeloPluma();
    m.pulsar({ x: -0.5, y: -0.5 }, R);
    m.pulsar({ x: 0.5, y: -0.5 }, R);
    m.pulsar({ x: 0, y: 0.5 }, R);
    expect(m.puntos.length).toBe(3);
    expect(m.cerrado).toBe(false);
    m.pulsar({ x: -0.5, y: -0.5 }, R);
    expect(m.cerrado).toBe(true);
    expect(m.puntos.length).toBe(3);
    // Cerrada, un clic fuera no añade puntos
    m.pulsar({ x: 0.3, y: 0.3 }, R);
    expect(m.puntos.length).toBe(3);
  });

  it('clic y arrastrar hace una curva suave (los dos tiradores, uno a cada lado)', () => {
    const m = new ModeloPluma();
    m.pulsar({ x: 0, y: 0 }, R);
    const a = m.pulsar({ x: 0.4, y: 0 }, R);
    m.arrastrar(a, { x: 0.4, y: 0.2 });
    expect(m.puntos[1].salida).toEqual({ x: 0.4, y: 0.2 });
    expect(m.puntos[1].entrada!.x).toBeCloseTo(0.4);
    expect(m.puntos[1].entrada!.y).toBeCloseTo(-0.2);
    // Con Alt solo se mueve uno (una esquina con curva)
    m.arrastrar({ tipo: 'salida', indice: 1 }, { x: 0.5, y: 0.3 }, true);
    expect(m.puntos[1].entrada!.y).toBeCloseTo(-0.2);
  });

  it('arrastrar un punto se lleva sus tiradores; doble clic cambia esquina ↔ curva', () => {
    const m = new ModeloPluma([{ x: 0, y: 0 }, { x: 0.2, y: 0, entrada: { x: 0.1, y: 0 }, salida: { x: 0.3, y: 0 } }, { x: 0.2, y: 0.2 }], true);
    m.arrastrar({ tipo: 'punto', indice: 1 }, { x: 0.2, y: 0.1 });
    expect(m.puntos[1].salida).toEqual({ x: 0.3, y: 0.1 });
    m.alternarCurva(1);
    expect(m.puntos[1].salida).toBeUndefined();
    m.alternarCurva(0);
    expect(m.puntos[0].entrada).toBeDefined();
  });

  it('se borra el punto elegido y se deshace', () => {
    const m = new ModeloPluma([{ x: 0, y: 0 }, { x: 0.2, y: 0 }, { x: 0.2, y: 0.2 }], true);
    m.pulsar({ x: 0.2, y: 0 }, R);
    m.borrarElegido();
    expect(m.puntos.length).toBe(2);
    expect(m.cerrado).toBe(false); // con 2 puntos no hay forma cerrada
    m.deshacer();
    m.deshacer();
    expect(m.puntos.length).toBe(3);
    expect(m.cerrado).toBe(true);
  });
});

describe('Operaciones con formas', () => {
  const cuadrado = (x: number, y: number, lado = 100, extra: Partial<DefObjeto> = {}): DefObjeto => ({ x, y, sprite: { forma: 'rectangulo', ancho: lado, alto: lado, color: 'rojo' }, colision: {}, ...extra });
  const area = (d: DefObjeto) => figuraDe({ forma: 'camino', ancho: d.sprite!.ancho!, alto: d.sprite!.alto!, figuras: d.sprite!.figuras }).piezas.reduce((s, p) => s + areaConSigno(p), 0);

  it('unir dos cuadrados que se pisan da una forma con el área de los dos menos lo que comparten', () => {
    const u = combinarFormas([cuadrado(0, 0), cuadrado(50, 0)], 'unir')!;
    expect(u.sprite!.forma).toBe('camino');
    expect(u.sprite!.ancho).toBe(150);
    expect(u.x).toBe(25);
    expect(area(u)).toBeCloseTo(15000, 0);
    expect(u.sprite!.color).toBe('rojo');
    expect(u.colision).toEqual({});
  });

  it('restar un círculo de dentro de un cuadrado deja un agujero (y se puede caer dentro)', () => {
    const r = combinarFormas([cuadrado(300, 300, 300), { x: 300, y: 300, sprite: { forma: 'circulo', ancho: 200, alto: 200 } }], 'restar')!;
    expect(r.sprite!.figuras![0].length).toBe(2); // borde y agujero
    expect(area(r) / (300 * 300 - Math.PI * 100 * 100)).toBeCloseTo(1, 1);
    const j = juegoDePrueba({ escena: [{ nombre: 'Marco', ...r }, { nombre: 'Caja', x: 300, y: 300, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: {} }] });
    j.avanzar(120);
    const y = j.buscar('Caja').posicion.y;
    expect(y).toBeGreaterThan(205); // se queda en el fondo del agujero, no cae fuera
    expect(y).toBeLessThan(220);
  });

  it('restar lo que tapa la forma entera no deja nada', () => {
    expect(combinarFormas([cuadrado(0, 0, 50), cuadrado(0, 0, 200)], 'restar')).toBeNull();
  });

  it('las formas giradas y escaladas se combinan donde se ven', () => {
    const girado = combinarFormas([cuadrado(0, 0, 100, { rotacion: 45 }), cuadrado(1000, 0, 10)], 'unir')!;
    // Un cuadrado de 100 girado 45° ocupa unos 141 de ancho
    const fig = girado.sprite!.figuras!;
    expect(fig.length).toBe(2);
    const escalado = combinarFormas([cuadrado(0, 0, 100, { escala: 2 }), cuadrado(0, 0, 10)], 'unir')!;
    expect(escalado.sprite!.ancho).toBe(200);
  });

  it('cualquier forma se pasa a puntos de la pluma (sin cientos de puntos)', () => {
    expect(caminoDeForma({ forma: 'estrella', ancho: 100, alto: 100 }).length).toBe(10);
    const circulo = caminoDeForma({ forma: 'circulo', ancho: 100, alto: 100 });
    expect(circulo.length).toBeLessThan(48);
    expect(circulo.length).toBeGreaterThan(8);
    expect(simplificar([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0.0001 }, { x: 2, y: 2 }, { x: 0, y: 2 }], 0.01).length).toBe(4);
  });

  it('un camino se encaja en su objeto (puntos de -0,5 a 0,5, y el objeto se mueve para no saltar)', () => {
    const e = encajarCamino([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0.5 }], true, 100, 100);
    expect(e.ancho).toBe(100);
    expect(e.alto).toBe(50);
    expect(e.dx).toBe(50);
    expect(e.dy).toBe(25);
    expect(e.puntos[0]).toEqual({ x: -0.5, y: -0.5 });
  });
});

describe('Formas propias en el editor', () => {
  const vistaFalsa = () => ({ herramienta: 'mover', tipoPincel: null, alCambiarHerramienta: () => {}, ponerHerramienta() {} }) as unknown as VistaEscena;

  it('unir desde el inspector (varios elegidos) quita las originales y se deshace de una vez', () => {
    const e = new EstadoEditor();
    const insp = new Inspector(e, vistaFalsa());
    e.crearObjeto('rectangulo', 0, 0);
    e.crearObjeto('forma', 40, 0, undefined, 'estrella');
    e.crearObjeto('texto', 0, 0);
    e.seleccionarVarios([0, 1, 2]);
    const botones = [...insp.elemento.querySelectorAll('button')].map((b) => b.textContent);
    expect(botones).toContain('Unir formas');
    [...insp.elemento.querySelectorAll('button')].find((b) => b.textContent === 'Unir formas')!.click();
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(['Texto', 'Union']); // el texto no se une
    expect(e.seleccionado?.nombre).toBe('Union');
    e.deshacer();
    expect(e.escena.objetos.length).toBe(3);
  });

  it('la pluma guarda el camino en el objeto, que no se mueve de sitio en la escena', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 100, 100);
    const ref = e.seleccion!;
    abrirEditorPluma(e, ref);
    expect(document.querySelector('.lienzo-pluma')).not.toBeNull();
    // Aceptar sin cambiar nada: el rectángulo pasa a camino con sus 4 esquinas
    [...document.querySelectorAll<HTMLButtonElement>('.dialogo button')].find((b) => b.textContent === 'Aceptar')!.click();
    const s = e.seleccionado!.sprite!;
    expect(s.forma).toBe('camino');
    expect(s.puntos?.length).toBe(4);
    expect([e.seleccionado!.x, e.seleccionado!.y, s.ancho, s.alto]).toEqual([100, 100, 64, 64]);
  });

  it('convertir en imagen guarda la imagen, quita el relleno y sigue chocando con su forma', () => {
    const e = new EstadoEditor();
    e.crearObjeto('forma', 0, 0, undefined, 'corazon');
    e.cambiarPropiedad(e.seleccion!, 'sprite.borde', 3);
    const nombre = e.convertirEnImagen(e.seleccion!, imagenPrueba('corazon'))!;
    expect(nombre).toBe('corazon');
    const def = e.seleccionado!;
    expect(def.sprite?.imagen).toBe('corazon');
    expect(def.sprite?.borde).toBeUndefined();
    expect(def.colision?.forma).toBe('figura');
    expect(e.proyecto.imagenes.corazon).toBe(imagenPrueba('corazon'));
  });

  it('una imagen con colision.forma = "figura" choca con la forma que recuerda', () => {
    const j = juegoDePrueba({
      imagenes: { estrella: 'x' },
      escena: [
        { nombre: 'Estrella', x: 500, y: 100, sprite: { imagen: 'estrella', forma: 'estrella', ancho: 200, alto: 200 }, colision: { forma: 'figura' } },
        { nombre: 'Caja', x: 420, y: 400, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: {} },
      ],
    });
    j.avanzar(150);
    // Con su caja se quedaría a 210; con su forma de estrella cae más abajo, entre las puntas
    expect(j.buscar('Caja').posicion.y).toBeLessThan(200);
  });
});
