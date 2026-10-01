/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EFECTOS DE PANTALLA Y DE OBJETO (día 2, bloque 2): congelar, flash,
 * filtros de pantalla (grises, pixelado, viñeta, CRT, bloom...), contorno,
 * brillo, grises y desenfoque de los objetos, y transiciones entre escenas.
 * (Que se VEN bien lo comprueban las pruebas del navegador.)
 */
import { describe, expect, it } from 'vitest';
import { FILTROS_NORMALES, hayFiltros } from '../src/motor/Filtros';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { migrarProyecto, proyectoVacio } from '../src/proyecto/formato';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { Inspector } from '../src/editor/paneles/Inspector';
import type { VistaEscena } from '../src/editor/escena/VistaEscena';
import { juegoDePrueba, unObjeto } from './ayudantes';

/** Un lienzo de mentira que apunta lo que se le pone y cuenta lo que se le pide. */
function lienzo() {
  const puesto: Record<string, unknown[]> = {};
  const cuenta: Record<string, number> = {};
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => {
      if (k in t) return t[k];
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'canvas') return { width: 960, height: 540 };
      return (..._a: unknown[]) => void (cuenta[k] = (cuenta[k] ?? 0) + 1);
    },
    set: (t, k: string, v) => {
      t[k] = v;
      (puesto[k] ??= []).push(v);
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, puesto, cuenta };
}

describe('Filtros de pantalla', () => {
  it('sin filtros no se hace nada especial (se dibuja directamente)', () => {
    expect(hayFiltros(FILTROS_NORMALES)).toBe(false);
    expect(hayFiltros({ ...FILTROS_NORMALES, crt: true })).toBe(true);
    expect(hayFiltros({ ...FILTROS_NORMALES, pixelado: 4 })).toBe(true);
  });

  it('desde Chispa: se ponen, se leen, se comprueban y pantalla.normal() los quita', () => {
    const j = unObjeto('cuando empieza:\n    pantalla.grises = 1\n    pantalla.crt = verdadero\n    pantalla.pixelado = 4\n    mostrar(pantalla.grises, pantalla.crt)\n    esperar(0.1)\n    pantalla.normal()');
    j.avanzar(1);
    expect(j.salida).toEqual(['1 verdadero']);
    expect(j.juego.escena.filtros).toMatchObject({ grises: 1, crt: true, pixelado: 4 });
    j.avanzar(10);
    expect(j.juego.escena.filtros).toEqual(FILTROS_NORMALES);
    const malo = unObjeto('cuando empieza:\n    pantalla.vineta = 5');
    malo.avanzar(1);
    expect(malo.errores[0]?.error.message).toMatch(/de 0 a 1/);
  });

  it('cada escena tiene sus filtros (los del editor); los del código se quitan al cambiar de escena', () => {
    const p = proyectoVacio();
    p.escenas.Principal.objetos = [{ nombre: 'A', script: 'a.chs' }];
    p.escenas.Cueva = { colorFondo: 'negro', filtros: { vineta: 0.8, brillo: 0.6 }, objetos: [] };
    p.scripts['a.chs'] = 'cuando empieza:\n    pantalla.grises = 1\n    escena.cambiar("Cueva")';
    const j = juegoDePrueba({ proyecto: migrarProyecto(p) });
    // «cuando empieza» ya se ha ejecutado; el cambio de escena llega al empezar el siguiente fotograma
    expect(j.juego.escena.filtros.grises).toBe(1);
    j.avanzar(2);
    expect(j.juego.escena.filtros).toEqual({ ...FILTROS_NORMALES, vineta: 0.8, brillo: 0.6 });
  });

  it('pantalla.flash pinta toda la pantalla de un color y se apaga sola', () => {
    const j = juegoDePrueba({ scripts: { 'f.chs': 'cuando empieza:\n    pantalla.flash("blanco", 0.2)' }, escena: [{ nombre: 'F', script: 'f.chs' }] });
    j.avanzar(1);
    expect(j.juego.escena.flash.alfa).toBeGreaterThan(0.8);
    const { ctx, puesto } = lienzo();
    j.juego.escena.dibujar({ ctx, ancho: 960, alto: 540, fondo: 'negro' } as never);
    expect(puesto.fillStyle).toContain('#ffffff');
    j.avanzar(20);
    expect(j.juego.escena.flash.alfa).toBe(0);
  });
});

describe('Congelar el juego', () => {
  it('tiempo.congelar para el tiempo un instante (de verdad) y lo devuelve como estaba', () => {
    const j = unObjeto('cuando empieza:\n    tiempo.escala = 0.5\n    tiempo.congelar(0.1)');
    j.avanzar(1);
    expect(j.motor.tiempo.escala).toBe(0);
    j.avanzar(8);
    expect(j.motor.tiempo.escala).toBe(0.5);
    const malo = unObjeto('cuando empieza:\n    tiempo.congelar(30)');
    malo.avanzar(1);
    expect(malo.errores[0]?.error.message).toMatch(/de 0 a 5/);
  });
});

describe('Transiciones entre escenas', () => {
  const conDosEscenas = (codigo: string) => {
    const p = proyectoVacio();
    p.escenas.Principal.objetos = [{ nombre: 'A', script: 'a.chs' }];
    p.escenas.Nivel2 = { colorFondo: 'negro', objetos: [] };
    p.scripts['a.chs'] = codigo;
    return juegoDePrueba({ proyecto: migrarProyecto(p) });
  };

  for (const tipo of ['barrido', 'circulo', 'pixelado', 'fundido']) {
    it(`«${tipo}»: tapa la pantalla, cambia de escena y la destapa`, () => {
      const j = conDosEscenas(`cuando empieza:\n    escena.cambiar("Nivel2", 1, "${tipo}")`);
      j.avanzar(15);
      const f = j.juego.escena.fundido;
      expect(f.tipo).toBe(tipo);
      expect(f.alfa).toBeGreaterThan(0.3);
      const { ctx, cuenta } = lienzo();
      j.juego.escena.dibujar({ ctx, ancho: 960, alto: 540, fondo: 'negro' } as never);
      expect((cuenta.fillRect ?? 0) + (cuenta.fill ?? 0)).toBeGreaterThan(0);
      j.avanzar(40);
      expect(j.juego.nombreEscena).toBe('Nivel2');
      j.avanzar(40);
      expect(j.juego.escena.fundido.alfa).toBe(0);
    });
  }

  it('una transición que no existe, o sin segundos, da un error claro', () => {
    const mal = conDosEscenas('cuando empieza:\n    escena.cambiar("Nivel2", 1, "persiana")');
    mal.avanzar(1);
    expect(mal.errores[0]?.error.message).toMatch(/transición/);
    const sinTiempo = conDosEscenas('cuando empieza:\n    escena.cambiar("Nivel2", 0, "circulo")');
    sinTiempo.avanzar(1);
    expect(sinTiempo.errores[0]?.error.message).toMatch(/necesita tiempo/);
  });
});

describe('Efectos de objeto', () => {
  it('flash: el objeto entero de un color un momento (y se dibuja por el camino del estilo)', () => {
    const j = unObjeto('cuando empieza:\n    yo.flash("rojo", 0.2)', { sprite: { ancho: 20, alto: 20, color: 'azul' } });
    j.avanzar(1);
    const s = j.buscar('Prueba').obtener(Sprite)!;
    const { ctx, puesto } = lienzo();
    s.dibujarEn({ ctx } as never, 0, 0);
    expect(puesto.fillStyle).toContain('#e74c3c');
    j.avanzar(15);
    const otro = lienzo();
    const r = { ctx: otro.ctx, rectangulo: (_x: number, _y: number, _w: number, _h: number, color: string) => (otro.puesto.color = [color]) };
    s.dibujarEn(r as never, 0, 0);
    expect(otro.puesto.color).toEqual(['azul']); // ya pasó: su color de siempre
  });

  it('contorno, brillo, grises y desenfoque', () => {
    const j = unObjeto('cuando empieza:\n    yo.contorno = "amarillo"\n    yo.grosorContorno = 4\n    yo.brillo = 1.5\n    yo.grises = 1\n    yo.desenfoque = 2', { sprite: { forma: 'estrella', ancho: 40, alto: 40 } });
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    const s = j.buscar('Prueba').obtener(Sprite)!;
    const { ctx, puesto } = lienzo();
    s.dibujarEn({ ctx } as never, 0, 0);
    expect(puesto.filter?.[0]).toBe('brightness(1.5) grayscale(1) blur(2px)');
    expect(puesto.lineWidth).toContain(8); // el contorno: el doble de su grosor (va por fuera)
    expect(puesto.strokeStyle).toContain('#f1c40f');
    const malo = unObjeto('cuando empieza:\n    yo.grises = 50', { sprite: {} });
    malo.avanzar(1);
    expect(malo.errores[0]?.error.message).toMatch(/de 0 a 1/);
  });
});

describe('En el editor', () => {
  const vistaFalsa = () => ({ herramienta: 'mover', tipoPincel: null, alCambiarHerramienta: () => {}, ponerHerramienta() {} }) as unknown as VistaEscena;

  it('los filtros de la escena y los del objeto se ponen en el inspector (y se guardan solo si no son los normales)', () => {
    const e = new EstadoEditor();
    const insp = new Inspector(e, vistaFalsa());
    const crt = insp.elemento.querySelector<HTMLInputElement>('[data-ruta="filtros.crt"]')!;
    crt.checked = true;
    crt.dispatchEvent(new Event('change'));
    expect(e.escena.filtros).toEqual({ crt: true });
    e.cambiarEscenaPropiedad('filtros.crt', false);
    expect(e.escena.filtros).toBeUndefined();
    e.crearObjeto('forma', 0, 0, undefined, 'estrella');
    const contorno = insp.elemento.querySelector<HTMLInputElement>('[data-ruta="sprite.contorno"]')!;
    contorno.checked = true;
    contorno.dispatchEvent(new Event('change'));
    expect(e.seleccionado?.sprite?.contorno).toBe('blanco');
    expect(() => migrarProyecto({ ...proyectoVacio(), escenas: { Principal: { colorFondo: 'negro', filtros: { pixelado: 0 }, objetos: [] } } })).toThrow(/pixelado/);
  });
});
