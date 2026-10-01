/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EFECTOS ESPECIALES (día 2, bloque 1): los efectos listos (de golpe, que
 * duran y especiales), el polvo al saltar y caer, el clima, los efectos de
 * los objetos y el editor de partículas.
 */
import { describe, expect, it } from 'vitest';
import { Efectos, RECETAS } from '../src/objetos/Efectos';
import { MAXIMO_PARTICULAS, Particulas, type ConfigParticulas } from '../src/objetos/Particulas';
import { ObjetoJuego } from '../src/objetos/ObjetoJuego';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { migrarProyecto, proyectoVacio, type DefObjeto } from '../src/proyecto/formato';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { Inspector } from '../src/editor/paneles/Inspector';
import type { VistaEscena } from '../src/editor/escena/VistaEscena';
import { abrirEditorParticulas } from '../src/editor/recursos/EditorParticulas';
import { juegoDePrueba, unObjeto } from './ayudantes';

const VISTA = { izquierda: 0, derecha: 960, abajo: 0, arriba: 540 };
const MAGIA: ConfigParticulas = { cantidad: 12, colores: ['rosa', 'morado'], velocidad: 150, vida: 0.6, tamano: 6, gravedad: 0, dispersion: 360, direccion: 90, encoger: true, forma: 'estrella' };

/** Un lienzo que no dibuja nada pero cuenta lo que se le pide. */
function lienzoQueCuenta() {
  const cuenta: Record<string, number> = {};
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => void (cuenta[k] = (cuenta[k] ?? 0) + 1)),
    set: (t, k: string, v) => ((t[k] = v), true),
  });
  return { r: { ctx } as never, cuenta };
}

describe('Partículas', () => {
  it('salen de golpe las que se piden, y nunca más de 3000 a la vez', () => {
    const p = new Particulas();
    p.emitir(RECETAS.confeti, 0, 0);
    expect(p.cantidad).toBe(RECETAS.confeti.cantidad);
    for (let i = 0; i < 100; i++) p.emitir(RECETAS.explosion, 0, 0);
    expect(p.cantidad).toBe(MAXIMO_PARTICULAS);
    p.actualizar(5);
    expect(p.cantidad).toBe(0);
  });

  it('cada forma se dibuja (y las que brillan, con la mezcla «sumar»)', () => {
    const p = new Particulas();
    for (const forma of ['circulo', 'cuadrado', 'linea', 'estrella', 'anillo', 'hoja', 'chispa'] as const) p.emitir({ ...MAGIA, forma, colorFinal: 'azul', mezcla: 'sumar' }, 0, 0, 2);
    const { r } = lienzoQueCuenta();
    expect(() => p.dibujar(r, (x, y) => ({ x, y }))).not.toThrow();
    expect((r as { ctx: { globalCompositeOperation: string } }).ctx.globalCompositeOperation).toBe('source-over');
  });
});

describe('Efectos', () => {
  it('un efecto que dura suelta sus partículas cada segundo, pegado a su objeto, hasta que se para', () => {
    const e = new Efectos();
    const o = new ObjetoJuego('Antorcha', 'Antorcha');
    o.en(100, 100);
    e.empezar('fuego', RECETAS.fuego, o);
    e.actualizar(0.2, VISTA); // 70 por segundo: 14 en 0,2 segundos (y ninguna ha muerto todavía)
    expect(e.particulas.cantidad).toBe(14);
    expect(e.tiene('fuego', o)).toBe(true);
    e.parar('fuego', o);
    expect(e.emisoresActivos).toBe(0);
    // Con segundos, se acaba solo
    e.empezar('humo', RECETAS.humo, { x: 0, y: 0 }, 1);
    e.actualizar(0.6, VISTA);
    e.actualizar(0.6, VISTA);
    expect(e.emisoresActivos).toBe(0);
  });

  it('al destruir el objeto, su efecto se acaba', () => {
    const j = juegoDePrueba({ scripts: { 'a.chs': 'cuando empieza:\n    efecto.fuego(yo)\n    esperar(0.2)\n    destruir(yo)' }, escena: [{ nombre: 'A', sprite: {}, script: 'a.chs' }] });
    j.avanzar(2);
    expect(j.juego.escena.efectos.emisoresActivos).toBe(1);
    j.avanzar(20);
    expect(j.juego.escena.efectos.emisoresActivos).toBe(0);
  });

  it('el clima cae desde arriba de lo que se ve, y con intensidad 0 se para', () => {
    const j = juegoDePrueba({ scripts: { 'c.chs': 'cuando empieza:\n    efecto.lluvia(2)\n    esperar(0.5)\n    efecto.lluvia(0)' }, escena: [{ nombre: 'C', script: 'c.chs' }] });
    j.avanzar(10);
    expect(j.juego.escena.efectos.tiene('lluvia')).toBe(true);
    expect(j.juego.escena.particulas.cantidad).toBeGreaterThan(20);
    j.avanzar(40);
    expect(j.juego.escena.efectos.tiene('lluvia')).toBe(false);
  });

  it('rayo, onda, destello y números de daño se dibujan y se acaban solos', () => {
    const e = new Efectos();
    const a = new ObjetoJuego('A', 'A');
    const b = new ObjetoJuego('B', 'B');
    b.en(300, 0);
    e.rayo(a, b);
    e.onda(0, 0, 100);
    e.destello(0, 0);
    e.texto('-25', 0, 0, 'rojo');
    const { r, cuenta } = lienzoQueCuenta();
    e.dibujar(r, (x, y) => ({ x, y }));
    expect(cuenta.strokeText).toBe(1);
    expect(cuenta.stroke).toBeGreaterThanOrEqual(4); // el anillo y las tres pasadas del rayo
    for (let i = 0; i < 70; i++) e.actualizar(1 / 60, VISTA);
    const otra = lienzoQueCuenta();
    e.dibujar(otra.r, (x, y) => ({ x, y }));
    expect(otra.cuenta.strokeText ?? 0).toBe(0);
  });

  it('la versión suave cambia la sangre por tinta de colores', () => {
    const e = new Efectos();
    e.sangre(0, 0);
    const { r, cuenta } = lienzoQueCuenta();
    e.dibujar(r, (x, y) => ({ x, y }));
    expect(e.suave).toBe(true);
    expect(cuenta.lineTo).toBeGreaterThan(0); // la tinta sale con estrellitas
  });
});

describe('Efectos desde Chispa', () => {
  it('efecto.golpe enseña el daño, efecto.explosion lanza partículas y efecto.parar lo para todo', () => {
    const j = unObjeto([
      'cuando empieza:',
      '    efecto.explosion(yo)',
      '    efecto.golpe(yo, 25)',
      '    efecto.fuego(yo)',
      '    efecto.burbujas(200, 300, 2)',
      '    mostrar(yo.efecto)',
      '    efecto.parar()',
    ].join('\n'), { sprite: { ancho: 20, alto: 20 } });
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['fuego']);
    expect(j.juego.escena.particulas.cantidad).toBeGreaterThan(40);
    expect(j.juego.escena.efectos.emisoresActivos).toBe(0);
  });

  it('los errores explican qué falta', () => {
    const error = (linea: string) => {
      const j = unObjeto(`cuando empieza:\n    ${linea}`, { sprite: {} });
      j.avanzar(1);
      const e = j.errores[0]?.error;
      return e ? `${e.message} ${e.pista ?? ''}` : '(sin error)';
    };
    expect(error('efecto.rayo(yo)')).toMatch(/dos sitios/);
    expect(error('efecto.usar("magia", yo)')).toMatch(/Proyecto > Efectos/);
    expect(error('efecto.parar("fuegos")')).toMatch(/fuego/);
    expect(error('efecto.lluvia(50)')).toMatch(/de 0/);
    expect(error('yo.efecto = "explosion"')).toMatch(/efecto\.explosion/);
    expect(error('efecto.estela(100, 200)')).toMatch(/necesita un objeto/);
  });

  it('efecto.usar usa los efectos del proyecto (y particulas() también los entiende)', () => {
    const proyecto = { ...proyectoVacio(), efectos: { magia: MAGIA, aura: { ...MAGIA, cantidad: 0, porSegundo: 30 } }, scripts: { 'a.chs': 'cuando empieza:\n    efecto.usar("magia", yo)\n    particulas("magia")\n    efecto.usar("aura", yo, 1)' } };
    proyecto.escenas.Principal.objetos = [{ nombre: 'A', script: 'a.chs' }];
    const j = juegoDePrueba({ proyecto: migrarProyecto(proyecto) });
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    expect(j.juego.escena.particulas.cantidad).toBeGreaterThanOrEqual(24);
    expect(j.juego.escena.efectos.tiene('aura')).toBe(true);
  });

  it('yo.polvo: levanta polvo al saltar y al caer al suelo', () => {
    const suelo: DefObjeto = { nombre: 'Suelo', x: 480, y: 0, sprite: { ancho: 2000, alto: 40 }, colision: {} };
    const j = juegoDePrueba({
      scripts: { 's.chs': 'cuando se pulsa "espacio":\n    yo.saltar(700)' },
      escena: [suelo, { nombre: 'Jugador', x: 300, y: 300, sprite: { ancho: 30, alto: 30 }, colision: {}, fisica: { polvo: true }, script: 's.chs' }],
    });
    j.avanzar(60); // cae desde arriba: polvo al llegar
    expect(j.juego.escena.particulas.cantidad).toBeGreaterThan(0);
    j.avanzar(60);
    expect(j.juego.escena.particulas.cantidad).toBe(0);
    j.pulsar('Space');
    j.avanzar(1);
    expect(j.juego.escena.particulas.cantidad).toBeGreaterThan(0);
  });

  it('desde el editor: el efecto de un objeto y el clima de la escena empiezan solos', () => {
    const proyecto = proyectoVacio();
    proyecto.escenas.Principal = { colorFondo: 'negro', clima: { tipo: 'nieve', intensidad: 2 }, objetos: [{ nombre: 'Hoguera', sprite: { ancho: 20, alto: 20 }, efecto: 'fuego' }] };
    const j = juegoDePrueba({ proyecto: migrarProyecto(proyecto) });
    j.avanzar(5);
    const ef = j.juego.escena.efectos;
    expect(ef.tiene('nieve')).toBe(true);
    expect(ef.tiene('fuego', j.buscar('Hoguera'))).toBe(true);
  });

  it('la estela usa el color y el tamaño de su objeto', () => {
    const j = unObjeto('cuando empieza:\n    efecto.estela(yo)', { sprite: { ancho: 40, alto: 40, color: 'verde' } });
    j.avanzar(10);
    expect(j.juego.escena.particulas.cantidad).toBeGreaterThan(5);
    expect(j.buscar('Prueba').obtener(Sprite)!.color).toBe('verde');
  });
});

describe('Efectos en el proyecto y en el editor', () => {
  const vistaFalsa = () => ({ herramienta: 'mover', tipoPincel: null, alCambiarHerramienta: () => {}, ponerHerramienta() {} }) as unknown as VistaEscena;

  it('los efectos, el clima y el efecto de un objeto se comprueban al abrir', () => {
    const con = (cambios: object) => ({ ...proyectoVacio(), ...cambios });
    expect(() => migrarProyecto(con({ efectos: { x: { ...MAGIA, cantidad: 1e6 } } }))).toThrow(/cantidad/);
    expect(() => migrarProyecto(con({ efectos: { x: { ...MAGIA, forma: 'cohete' } } }))).toThrow(/forma/);
    expect(() => migrarProyecto(con({ escenas: { Principal: { colorFondo: 'negro', clima: { tipo: 'granizo' }, objetos: [] } } }))).toThrow(/clima/);
    expect(migrarProyecto(con({ efectos: { magia: MAGIA } })).efectos?.magia.forma).toBe('estrella');
  });

  it('guardar un efecto, cambiarle el nombre (los objetos lo siguen usando) y borrarlo', () => {
    const e = new EstadoEditor();
    expect(e.guardarEfecto('magia', MAGIA)).toBe('magia');
    e.crearObjeto('rectangulo', 0, 0);
    e.cambiarPropiedad(e.seleccion!, 'efecto', 'magia');
    expect(e.guardarEfecto('aura', MAGIA, 'magia')).toBe('aura');
    expect(Object.keys(e.proyecto.efectos!)).toEqual(['aura']);
    expect(e.seleccionado?.efecto).toBe('aura');
    expect(e.guardarEfecto('1malo', MAGIA)).toBeNull();
    e.borrarEfecto('aura');
    expect(e.proyecto.efectos).toBeUndefined();
    expect(e.seleccionado?.efecto).toBeUndefined();
    e.deshacer();
    expect(e.seleccionado?.efecto).toBe('aura');
  });

  it('el inspector pone el clima de la escena y el efecto de un objeto', () => {
    const e = new EstadoEditor();
    const insp = new Inspector(e, vistaFalsa());
    const clima = insp.elemento.querySelector<HTMLSelectElement>('[data-ruta="escena.clima"]')!;
    clima.value = 'hojas';
    clima.dispatchEvent(new Event('change'));
    expect(e.escena.clima).toEqual({ tipo: 'hojas' });
    e.crearObjeto('circulo', 0, 0);
    const efecto = insp.elemento.querySelector<HTMLSelectElement>('[data-ruta="efecto"]')!;
    efecto.value = 'burbujas';
    efecto.dispatchEvent(new Event('change'));
    expect(e.seleccionado?.efecto).toBe('burbujas');
  });

  it('el editor de partículas empieza desde un efecto listo, se cambia con los deslizadores y se guarda', () => {
    const e = new EstadoEditor();
    abrirEditorParticulas(e);
    const dialogo = document.querySelector('.dialogo-particulas')!;
    const base = dialogo.querySelector<HTMLSelectElement>('[data-ruta="efecto.base"]')!;
    base.value = 'nieve';
    base.dispatchEvent(new Event('change'));
    const vaiven = dialogo.querySelector<HTMLInputElement>('[data-ruta="efecto.vaiven"]')!;
    expect(vaiven.value).toBe('22');
    vaiven.value = '60';
    vaiven.dispatchEvent(new Event('input'));
    const nombre = dialogo.querySelector<HTMLInputElement>('[data-ruta="efecto.nombre"]')!;
    nombre.value = 'nieve'; // ya es de Chispa: no se puede
    [...dialogo.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Guardar')!.click();
    expect(e.proyecto.efectos).toBeUndefined();
    nombre.value = 'ventisca';
    [...dialogo.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Guardar')!.click();
    expect(e.proyecto.efectos?.ventisca).toMatchObject({ vaiven: 60, porSegundo: RECETAS.nieve.porSegundo });
  });
});
