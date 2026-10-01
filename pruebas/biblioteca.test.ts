/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LA BIBLIOTECA (día 1, bloque 4): cada objeto listo se pone en la escena,
 * funciona sin errores ni avisos, y hace lo que dice.
 */
import { describe, expect, it } from 'vitest';
import { BIBLIOTECA, CATEGORIAS_BIBLIOTECA, buscarEnBiblioteca } from '../src/editor/biblioteca/biblioteca';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { PanelIzquierdo } from '../src/editor/paneles/PanelIzquierdo';
import type { VistaEscena } from '../src/editor/escena/VistaEscena';
import { Fisica } from '../src/objetos/componentes/Fisica';
import { Sprite } from '../src/objetos/componentes/Sprite';
import type { DefObjeto } from '../src/proyecto/formato';
import { juegoDePrueba } from './ayudantes';

const SUELO: DefObjeto = { nombre: 'Suelo', x: 480, y: 20, sprite: { ancho: 3000, alto: 40 }, colision: {} };

/** Un proyecto con suelo y lo que se pida de la biblioteca (en ese sitio). */
function conBiblioteca(...elementos: [string, number, number][]) {
  const e = new EstadoEditor();
  e.escena.objetos.push(structuredClone(SUELO));
  for (const [id, x, y] of elementos) e.insertarDeBiblioteca(id, x, y);
  return e;
}
const jugar = (e: EstadoEditor) => juegoDePrueba({ proyecto: structuredClone(e.proyecto) });

describe('La biblioteca: lo que hay', () => {
  it('tiene los 16 objetos pedidos, cada uno en una categoría', () => {
    expect(BIBLIOTECA.map((b) => b.id)).toEqual([
      'jugador-plataformas', 'jugador-arriba', 'nave', 'enemigo-patrulla', 'enemigo-persigue', 'moneda', 'corazon', 'llave-puerta',
      'plataforma-movil', 'pinchos', 'muelle', 'caja', 'meta', 'bala', 'boton', 'texto-puntos',
    ]);
    for (const b of BIBLIOTECA) expect(CATEGORIAS_BIBLIOTECA).toContain(b.categoria);
  });

  it('el buscador encuentra por nombre, descripción y palabras (sin importar tildes), y filtra por categoría', () => {
    expect(buscarEnBiblioteca('moneda').map((b) => b.id)).toEqual(['moneda']);
    expect(buscarEnBiblioteca('SALTAR').map((b) => b.id)).toEqual(expect.arrayContaining(['jugador-plataformas', 'muelle']));
    expect(buscarEnBiblioteca('corazón').map((b) => b.id)).toContain('corazon');
    expect(buscarEnBiblioteca('enemigo patrulla').map((b) => b.id)).toEqual(['enemigo-patrulla']);
    expect(buscarEnBiblioteca('', 'Enemigos').map((b) => b.id)).toEqual(['enemigo-patrulla', 'enemigo-persigue']);
    expect(buscarEnBiblioteca('zzzz')).toEqual([]);
  });

  it('cada objeto, puesto en un proyecto vacío, se juega sin errores ni avisos', () => {
    for (const b of BIBLIOTECA) {
      const e = conBiblioteca([b.id, 300, 200]);
      const j = jugar(e);
      j.avanzar(120);
      expect(j.errores.map((x) => x.error.message), b.id).toEqual([]);
      expect(j.avisos.map((a) => a.mensaje), b.id).toEqual([]);
    }
  });

  it('todos juntos en la misma escena, también', () => {
    const e = conBiblioteca(...BIBLIOTECA.map((b, i): [string, number, number] => [b.id, 100 + i * 150, 200]));
    const j = jugar(e);
    j.avanzar(120);
    expect(j.errores.map((x) => x.error.message)).toEqual([]);
  });
});

describe('La biblioteca: al ponerla en la escena', () => {
  it('pone sus objetos donde se suelta, con sus scripts y los datos del juego', () => {
    const e = new EstadoEditor();
    const nuevos = e.insertarDeBiblioteca('llave-puerta', 400, 300);
    expect(nuevos.length).toBe(2);
    expect(e.escena.objetos.map((o) => [o.nombre, o.x, o.y])).toEqual([['Llave', 250, 300], ['Puerta', 550, 330]]);
    expect(Object.keys(e.proyecto.scripts)).toEqual(expect.arrayContaining(['llave.chs', 'puerta.chs']));
    expect(e.indicesSeleccionados()).toEqual(nuevos);
    // La interfaz va pegada a la pantalla: el marcador, arriba a la izquierda
    e.insertarDeBiblioteca('texto-puntos', 9999, 9999);
    expect(e.seleccionado).toMatchObject({ x: 20, y: e.proyecto.alto - 30 });
    expect(e.proyecto.datos).toMatchObject({ puntos: 0, vidas: 3 });
  });

  it('dos veces: los scripts se comparten y los objetos se numeran; no pisa lo que ya había', () => {
    const e = new EstadoEditor();
    e.cambiarDatoJuego('vidas', 5);
    e.insertarDeBiblioteca('moneda', 0, 0);
    e.insertarDeBiblioteca('moneda', 100, 0);
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(['Moneda', 'Moneda2']);
    expect(Object.keys(e.proyecto.scripts).filter((s) => s.startsWith('moneda'))).toEqual(['moneda.chs']);
    expect(e.proyecto.datos?.vidas).toBe(5);
    // Un script con el mismo nombre pero otro código: el de la biblioteca se guarda aparte
    e.cambiarCodigo('moneda.chs', '# mi moneda');
    e.insertarDeBiblioteca('moneda', 200, 0);
    expect(e.seleccionado?.script).toBe('moneda2.chs');
    expect(e.proyecto.scripts['moneda.chs']).toBe('# mi moneda');
    // Y todo se deshace de una vez
    e.deshacer();
    expect(e.escena.objetos.length).toBe(2);
  });

  it('la bala es solo una plantilla (no un objeto en la escena)', () => {
    const e = new EstadoEditor();
    expect(e.insertarDeBiblioteca('bala', 0, 0)).toEqual([]);
    expect(e.proyecto.plantillas.Bala.script).toBe('bala.chs');
  });
});

describe('La biblioteca: cada objeto hace lo que dice', () => {
  it('jugador de plataformas: anda, salta y la cámara lo sigue', () => {
    const j = jugar(conBiblioteca(['jugador-plataformas', 300, 100]));
    j.avanzar(60);
    const jugador = j.buscar('Jugador');
    const x0 = jugador.posicion.x;
    j.pulsar('ArrowRight', 'ArrowRight');
    j.avanzar(30);
    j.soltar('ArrowRight', 'ArrowRight');
    expect(jugador.posicion.x).toBeGreaterThan(x0 + 100);
    j.pulsar('Space');
    j.avanzar(15);
    expect(jugador.obtener(Fisica)!.velocidad.y).toBeGreaterThan(0);
    expect(jugador.posicion.y).toBeGreaterThan(100);
  });

  it('jugador visto desde arriba: sube con la flecha (no cae)', () => {
    const j = jugar(conBiblioteca(['jugador-arriba', 300, 300]));
    j.pulsar('ArrowUp', 'ArrowUp');
    j.avanzar(30);
    expect(j.buscar('Jugador').posicion.y).toBeGreaterThan(350);
  });

  it('nave: dispara balas que destruyen enemigos y dan puntos', () => {
    const e = conBiblioteca(['nave', 300, 100]);
    e.escena.objetos.push({ nombre: 'Enemigo', x: 300, y: 400, sprite: { ancho: 40, alto: 40 }, colision: {} });
    const j = jugar(e);
    j.avanzar(2);
    j.pulsar('Space');
    j.avanzar(1);
    j.soltar('Space');
    expect(j.juego.escena.buscarTodos('Bala').length).toBe(1);
    j.avanzar(40);
    expect(j.juego.escena.buscar('Enemigo')).toBeNull();
    expect(j.juego.escena.buscarTodos('Bala').length).toBe(0);
  });

  it('enemigo que patrulla: se mueve solo y quita una vida al tocar al jugador', () => {
    const e = conBiblioteca(['enemigo-patrulla', 300, 60]);
    e.escena.objetos.push({ nombre: 'Jugador', x: 420, y: 60, sprite: { ancho: 30, alto: 30 }, colision: {}, fisica: {} });
    const j = jugar(e);
    j.avanzar(90);
    expect(j.buscar('Enemigo').posicion.x).toBeGreaterThan(300);
    expect(j.salida).toEqual([]);
    expect(j.juego.datoDelJuego('vidas')).toBe(2);
  });

  it('enemigo que persigue: va hacia el jugador cuando lo tiene cerca', () => {
    const e = conBiblioteca(['enemigo-persigue', 300, 300]);
    e.escena.objetos.push({ nombre: 'Jugador', x: 500, y: 300, sprite: { ancho: 30, alto: 30 }, colision: {} });
    const j = jugar(e);
    j.avanzar(60);
    expect(j.buscar('Enemigo').posicion.x).toBeGreaterThan(360);
  });

  it('moneda, corazón, llave y puerta: se cogen y hacen su efecto', () => {
    const e = conBiblioteca(['moneda', 300, 60], ['corazon', 500, 60], ['llave-puerta', 850, 60]);
    e.escena.objetos.push({ nombre: 'Jugador', x: 300, y: 60, sprite: { ancho: 30, alto: 30 }, colision: {} });
    const j = jugar(e);
    j.avanzar(2);
    expect(j.juego.datoDelJuego('puntos')).toBe(1);
    expect(j.juego.escena.buscar('Moneda')).toBeNull();
    j.buscar('Jugador').en(500, 60);
    j.avanzar(2);
    expect(j.juego.datoDelJuego('vidas')).toBe(4);
    j.buscar('Jugador').en(700, 60); // la llave (850 - 150)
    j.avanzar(60);
    expect(j.juego.escena.buscar('Puerta')).toBeNull();
  });

  it('plataforma móvil: se mueve sola', () => {
    const j = jugar(conBiblioteca(['plataforma-movil', 300, 200]));
    j.avanzar(60);
    expect(j.buscar('Plataforma').posicion.x).toBeGreaterThan(330);
  });

  it('pinchos y muelle: los pinchos quitan una vida y rebotan; el muelle lanza muy alto', () => {
    const e = conBiblioteca(['pinchos', 300, 54], ['muelle', 700, 50]);
    e.escena.objetos.push({ nombre: 'Jugador', x: 300, y: 150, sprite: { ancho: 30, alto: 30 }, colision: {}, fisica: {} });
    e.escena.objetos.push({ nombre: 'Jugador', x: 700, y: 150, sprite: { ancho: 30, alto: 30 }, colision: {}, fisica: {} });
    const j = jugar(e);
    j.avanzar(20);
    expect(j.juego.datoDelJuego('vidas')).toBe(2);
    const [enPinchos, enMuelle] = j.juego.escena.buscarTodos('Jugador');
    expect(enPinchos.obtener(Fisica)!.velocidad.y).toBeGreaterThan(200);
    expect(enMuelle.obtener(Fisica)!.velocidad.y).toBeGreaterThan(700);
  });

  it('caja empujable: el jugador la mueve al empujarla', () => {
    const e = conBiblioteca(['caja', 400, 64]);
    e.escena.objetos.push({ nombre: 'Jugador', x: 330, y: 70, sprite: { ancho: 30, alto: 50 }, colision: {}, fisica: {}, script: 'empuja.chs' });
    e.proyecto.scripts['empuja.chs'] = 'cuando cada fotograma:\n    yo.velocidad.x = 200';
    const j = jugar(e);
    j.avanzar(90);
    expect(j.buscar('Caja').posicion.x).toBeGreaterThan(450);
  });

  it('meta: al llegar sale un diálogo de victoria', () => {
    const e = conBiblioteca(['meta', 300, 100]);
    e.escena.objetos.push({ nombre: 'Jugador', x: 300, y: 100, sprite: { ancho: 30, alto: 30 }, colision: {} });
    const j = jugar(e);
    j.avanzar(3);
    expect(j.juego.escena.dialogos.length).toBe(1);
  });

  it('botón y marcador: el botón responde al clic; el marcador enseña puntos y vidas', () => {
    const j = jugar(conBiblioteca(['boton', 0, 0], ['texto-puntos', 0, 0]));
    j.avanzar(1);
    j.clic(480, 270);
    j.avanzar(1);
    expect(j.salida).toEqual(['¡Has pulsado el boton!']);
    const marcador = j.buscar('Marcador').obtener(Sprite)!;
    marcador.actualizarTexto();
    expect(marcador.texto).toBe('Puntos: 0   Vidas: 3');
  });
});

describe('La biblioteca en el editor', () => {
  it('la pestaña Biblioteca enseña las fichas, busca, filtra y pone objetos al pulsar', () => {
    const e = new EstadoEditor();
    const pedidos: string[] = [];
    const vista = { anadirDeBiblioteca: (id: string) => pedidos.push(id), anadir() {} } as unknown as VistaEscena;
    const panel = new PanelIzquierdo(e, vista);
    [...panel.elemento.querySelectorAll<HTMLButtonElement>('.pestana-panel')].find((b) => b.textContent?.includes('Biblioteca'))!.click();
    expect(panel.elemento.querySelectorAll('.ficha-biblioteca').length).toBe(16);
    const buscador = panel.elemento.querySelector<HTMLInputElement>('.buscador-biblioteca')!;
    buscador.value = 'moneda';
    buscador.dispatchEvent(new Event('input'));
    expect(panel.elemento.querySelectorAll('.ficha-biblioteca').length).toBe(1);
    panel.elemento.querySelector<HTMLButtonElement>('.ficha-biblioteca')!.click();
    expect(pedidos).toEqual(['moneda']);
    buscador.value = '';
    buscador.dispatchEvent(new Event('input'));
    [...panel.elemento.querySelectorAll<HTMLButtonElement>('.chip')].find((b) => b.textContent === 'Interfaz')!.click();
    expect(panel.elemento.querySelectorAll('.ficha-biblioteca').length).toBe(2);
  });
});
