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
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { Control } from '../src/objetos/componentes/Control';
import { datoDeControl } from '../src/editor/paneles/Inspector';
import { cancionDeEjemplo } from '../src/sonido/musica';
import { migrarProyecto } from '../src/proyecto/formato';
import { revisarProyecto } from '../src/proyecto/Revision';

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

  it('las recetas de la 1.1 se juegan sin errores (barra, contador, inventario, luz, dos jugadores, puntuaciones, sonido con sitio, cuerda)', () => {
    const e = new EstadoEditor();
    const control = (tipo: 'barra' | 'icono' | 'inventario', dato?: string) => {
      e.crearControl(tipo, 100, 500);
      if (dato) e.cambiarPropiedad(e.seleccion!, 'control.dato', dato);
    };
    for (const n of ['salto', 'motor']) e.anadirRecursoListo('sonido', n);
    e.guardarCancion('tema', cancionDeEjemplo());
    e.cambiarDatoJuego('monedas', 0);
    e.cambiarDatoJuego('puntos', 0);
    e.cambiarEscenaPropiedad('gravedad', 0);
    e.crearEscena('Fin');
    e.cambiarEscenaActual('Principal');
    const scripts: Record<string, string> = {
      'vida.chs': receta('Barra de vida sin dibujarla'),
      'monedas.chs': receta('Contador de monedas'),
      'mochila.chs': receta('Inventario'),
      'luz.chs': receta('Una cueva a oscuras'),
      'dos.chs': receta('Dos jugadores'),
      'tabla.chs': receta('Apuntar la puntuación'),
      'sitio.chs': receta('Un sonido que se oye'),
      'peligro.chs': receta('Música que sube'),
      'cuerda.chs': receta('Colgar de una cuerda'),
      'sonidos.chs': receta('Hacer tus sonidos'),
    };
    const objeto = (nombre: string, x: number, y: number, script?: string, extra: Record<string, unknown> = {}) => {
      e.crearObjeto('rectangulo', x, y);
      e.renombrar(e.seleccion!, nombre);
      for (const [k, v] of Object.entries(extra)) e.cambiarPropiedad(e.seleccion!, k, v);
      if (script) {
        e.proyecto.scripts[script] = scripts[script];
        e.asignarScript(e.seleccion!, script);
      }
    };
    objeto('Jugador', 100, 100, 'vida.chs', { propiedades: { vida: 50 }, fisica: { gravedad: 0 } });
    objeto('Enemigo', 100, 100, undefined, { 'colision.solido': false });
    objeto('Recolector', 300, 100, 'monedas.chs');
    objeto('Moneda', 300, 100, undefined, { 'colision.solido': false });
    objeto('Aventurero', 500, 100, 'mochila.chs');
    objeto('Llave', 500, 100, undefined, { 'colision.solido': false });
    objeto('Linterna', 700, 100, 'luz.chs');
    objeto('Segundo', 100, 300, 'dos.chs', { fisica: {} });
    objeto('Corredor', 300, 300, 'tabla.chs');
    objeto('Meta', 300, 300, undefined, { 'colision.solido': false });
    objeto('Hoguera', 500, 300, 'sitio.chs');
    objeto('Vigia', 700, 300, 'peligro.chs');
    objeto('Pendulo', 800, 400, 'cuerda.chs', { fisica: {} });
    objeto('Cantante', 900, 100, 'sonidos.chs');
    // Lo que se escribe en el inspector («Jugador.vida») se guarda como buscar("Jugador").vida
    control('barra', datoDeControl('Jugador.vida', [], ['Jugador']));
    control('icono', 'juego.monedas');
    control('inventario');
    const proyecto = migrarProyecto(JSON.parse(e.aJSON()));
    expect(revisarProyecto(proyecto).errores.map((x) => x.mensajeCorto)).toEqual([]);
    const j = juegoDePrueba({ proyecto });
    j.avanzar(30);
    expect(j.errores.map((x) => x.error.mensajeCorto)).toEqual([]);
    // La barra lee sola la vida del jugador, que ha bajado al tocar al enemigo (50 - 25)
    expect(j.buscar('Barra').obtener(Control)!.numero).toBe(25);
    expect(j.buscar('Icono').obtener(Control)!.numero).toBe(1);
    expect(j.buscar('Inventario').obtener(Control)!.cuantos('llave')).toBe(1);
    expect(j.juego.escena.oscuridad).toBeCloseTo(0.9);
    expect(j.juego.escena.juntas.lista.length).toBe(1);
    // El péndulo no se aleja de su punto más que el largo de la cuerda
    const pendulo = j.buscar('Pendulo').posicion;
    j.avanzar(120);
    expect(Math.hypot(pendulo.x - 920, pendulo.y - 560)).toBeLessThanOrEqual(201);
    expect(j.salida.join(' ')).toContain('Ana');
    expect(j.errores.map((x) => x.error.mensajeCorto)).toEqual([]);
  });
});

describe('Recetas de Chispa 1.2 (jugar en el móvil)', () => {
  const NUEVAS = ['Jugar con el dedo', 'Un botón en pantalla', 'Moverse deslizando', 'Apuntar o mirar', 'Un juego que va bien en móviles', 'Un juego que se juega con el móvil tumbado', 'Vibrar cuando te dan', 'Dejar que cada uno', 'Convertir tu juego en una app'];

  it('están todas y se juegan sin errores', () => {
    for (const inicio of NUEVAS) {
      expect(RECETAS.find((r) => r.titulo.startsWith(inicio)), inicio).toBeDefined();
      const j = juegoDePrueba({
        scripts: { 'r.chs': receta(inicio) },
        escena: [
          { nombre: 'Jugador', x: 100, y: 300, ...caja, fisica: {}, script: 'r.chs' },
          { nombre: 'Enemigo', x: 600, y: 100, ...caja },
          { nombre: 'Suelo', x: 400, y: 20, sprite: { ancho: 800, alto: 20 }, colision: {} },
        ],
      });
      j.avanzar(30);
      expect(j.errores, inicio).toEqual([]);
    }
  });

  it('la palanca y el botón de la primera receta mueven y hacen saltar al jugador', () => {
    const j = juegoDePrueba({
      scripts: { 'r.chs': receta('Jugar con el dedo') },
      escena: [{ nombre: 'Jugador', x: 100, y: 60, ...caja, fisica: {}, script: 'r.chs' }, { nombre: 'Suelo', x: 400, y: 20, sprite: { ancho: 2000, alto: 20 }, colision: {} }],
    });
    j.avanzar(30);
    const o = j.buscar('Jugador');
    const x0 = o.posicion.x;
    j.entrada.tactil.ponerPalanca(1, 0);
    j.avanzar(30);
    expect(o.posicion.x).toBeGreaterThan(x0 + 80);
    j.entrada.tactil.ponerPalanca(0, 0);
    const y0 = o.posicion.y;
    j.entrada.tactil.pulsar('Saltar', true);
    j.avanzar(10);
    j.entrada.tactil.pulsar('Saltar', false);
    expect(o.posicion.y).toBeGreaterThan(y0 + 20);
    expect(j.errores).toEqual([]);
  });

  it('deslizar el dedo cambia de carril', () => {
    const j = juegoDePrueba({ gravedad: 0, scripts: { 'r.chs': receta('Moverse deslizando') }, escena: [{ nombre: 'Jugador', x: 400, y: 300, ...caja, script: 'r.chs' }] });
    j.avanzar(2);
    j.entrada.tactil.hacerGesto('derecha');
    j.avanzar(1);
    expect(j.buscar('Jugador').posicion.x).toBe(520);
    j.avanzar(5);
    expect(j.buscar('Jugador').posicion.x).toBe(520);
  });
});
