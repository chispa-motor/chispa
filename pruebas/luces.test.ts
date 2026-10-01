/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LUCES 2D (día 2, bloque 3): oscuridad, luz ambiente, luces de punto y
 * focos, parpadeo y sombras (polígono de visibilidad).
 * (Que se VEN bien lo comprueban las pruebas del navegador.)
 */
import { describe, expect, it } from 'vitest';
import { Luz, segmentosQueTapan, visibilidad } from '../src/objetos/Luces';
import { puntoEnPoligono } from '../src/objetos/formas/figuras';
import { migrarProyecto, proyectoVacio } from '../src/proyecto/formato';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { Inspector } from '../src/editor/paneles/Inspector';
import type { VistaEscena } from '../src/editor/escena/VistaEscena';
import { juegoDePrueba, unObjeto } from './ayudantes';

describe('Sombras: lo que ve una luz', () => {
  it('una caja tapa la luz: detrás de ella no llega, a su lado sí', () => {
    // Luz en (0, 0); una caja de (100, -20) a (140, 20)
    const tapan = [
      { ax: 100, ay: -20, bx: 140, by: -20 }, { ax: 140, ay: -20, bx: 140, by: 20 },
      { ax: 140, ay: 20, bx: 100, by: 20 }, { ax: 100, ay: 20, bx: 100, by: -20 },
    ];
    const forma = visibilidad(0, 0, 300, tapan);
    expect(puntoEnPoligono(forma, { x: 200, y: 0 })).toBe(false); // justo detrás
    expect(puntoEnPoligono(forma, { x: 200, y: 100 })).toBe(true); // a un lado
    expect(puntoEnPoligono(forma, { x: -200, y: 0 })).toBe(true); // al otro lado
    expect(puntoEnPoligono(forma, { x: 50, y: 0 })).toBe(true); // entre la luz y la caja
  });

  it('tapan los sólidos y los bordes de las casillas sólidas (juntados); no los fantasmas ni la interfaz', () => {
    const j = juegoDePrueba({
      escena: [
        { nombre: 'Muro', x: 100, y: 0, sprite: { ancho: 40, alto: 40 }, colision: {} },
        { nombre: 'Humo', x: -100, y: 0, sprite: { ancho: 40, alto: 40 }, colision: { solido: false } },
        { nombre: 'Boton', x: 0, y: 100, sprite: { ancho: 40, alto: 40, fijo: true }, colision: {} },
        { nombre: 'Mapa', x: 0, y: -200, mapa: { tamano: 32, tipos: { suelo: { solida: true }, agua: { solida: false } }, celdas: { '0,0': 'suelo', '1,0': 'suelo', '2,0': 'suelo', '3,0': 'agua' } } },
        { nombre: 'Antorcha', x: 0, y: 0, sprite: { ancho: 10, alto: 10 } },
      ],
    });
    const segmentos = segmentosQueTapan(j.juego.escena, 0, 0, 400, j.buscar('Antorcha'));
    // 4 del muro + 4 de la fila de suelo (arriba, abajo y los dos lados, juntados)
    expect(segmentos.length).toBe(8);
    expect(segmentos.some((s) => s.ax === 0 && s.bx === 96 && s.ay === -168)).toBe(true);
  });

  it('una antorcha dentro de una pared no se tapa a sí misma', () => {
    const j = juegoDePrueba({ escena: [{ nombre: 'Pared', x: 0, y: 0, sprite: { ancho: 100, alto: 100 }, colision: {} }, { nombre: 'Antorcha', x: 0, y: 0, sprite: {} }] });
    expect(segmentosQueTapan(j.juego.escena, 0, 0, 300, j.buscar('Antorcha'))).toEqual([]);
  });
});

describe('Luces', () => {
  it('el parpadeo hace que el radio tiemble; la intensidad lo cambia', () => {
    const l = new Luz();
    l.radio = 200;
    expect(l.radioActual).toBe(200);
    l.parpadeo = 1;
    const radios = new Set<number>();
    for (let i = 0; i < 10; i++) {
      l.actualizar(0.05);
      radios.add(Math.round(l.radioActual));
    }
    expect(radios.size).toBeGreaterThan(3);
    l.parpadeo = 0;
    l.intensidad = 0.5;
    expect(l.radioActual).toBeLessThan(200);
  });

  it('desde Chispa: encender, cambiar y apagar la luz; leer sin luz es un error claro', () => {
    const j = unObjeto('cuando empieza:\n    escena.oscuridad = 0.9\n    yo.luz = verdadero\n    yo.tipoLuz = "foco"\n    yo.radioLuz = 300\n    yo.colorLuz = "naranja"\n    mostrar(yo.luz, yo.tipoLuz, yo.radioLuz, escena.oscuridad)\n    yo.luz = falso\n    mostrar(yo.luz)', { sprite: {} });
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['verdadero foco 300 0.9', 'falso']);
    const sinLuz = unObjeto('cuando empieza:\n    mostrar(yo.radioLuz)', { sprite: {} });
    sinLuz.avanzar(1);
    expect(sinLuz.errores[0]?.error.message).toMatch(/no tiene luz/);
    const mal = unObjeto('cuando empieza:\n    escena.oscuridad = 90');
    mal.avanzar(1);
    expect(mal.errores[0]?.error.message).toMatch(/de 0/);
  });

  it('desde el editor: la oscuridad de la escena y la luz de un objeto se ponen al jugar', () => {
    const p = proyectoVacio();
    p.escenas.Principal = { colorFondo: 'negro', oscuridad: 0.8, luzAmbiente: '#0a1030', objetos: [{ nombre: 'Farol', sprite: {}, luz: { color: 'amarillo', radio: 150, sombras: true, tipo: 'foco', angulo: 45 } }] };
    const j = juegoDePrueba({ proyecto: migrarProyecto(p) });
    expect([j.juego.escena.oscuridad, j.juego.escena.luzAmbiente]).toEqual([0.8, '#0a1030']);
    const luz = j.buscar('Farol').obtener(Luz)!;
    expect([luz.color, luz.radio, luz.sombras, luz.tipo, luz.angulo]).toEqual(['amarillo', 150, true, 'foco', 45]);
    expect(() => migrarProyecto({ ...proyectoVacio(), escenas: { Principal: { colorFondo: 'negro', objetos: [{ luz: { tipo: 'laser' } }] } } })).toThrow(/tipo/);
  });

  it('en el inspector: la sección Luz del objeto y la oscuridad de la escena', () => {
    const e = new EstadoEditor();
    const insp = new Inspector(e, { herramienta: 'mover', tipoPincel: null, alCambiarHerramienta: () => {}, ponerHerramienta() {} } as unknown as VistaEscena);
    const oscuridad = insp.elemento.querySelector<HTMLInputElement>('[data-ruta="escena.oscuridad"]')!;
    oscuridad.value = '0.7';
    oscuridad.dispatchEvent(new Event('change'));
    expect(e.escena.oscuridad).toBe(0.7);
    e.crearObjeto('circulo', 0, 0);
    e.activarComponente(e.seleccion!, 'luz', true);
    expect(e.seleccionado?.luz).toEqual({ color: '#ffd9a0', radio: 220 });
    const tipo = insp.elemento.querySelector<HTMLSelectElement>('[data-ruta="luz.tipo"]')!;
    tipo.value = 'foco';
    tipo.dispatchEvent(new Event('change'));
    expect(insp.elemento.querySelector('[data-ruta="luz.angulo"]')).not.toBeNull();
  });
});
