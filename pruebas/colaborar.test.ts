/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * TESTS DE «PROGRAMAR JUNTOS» (sin internet): las diferencias entre proyectos, el proyecto dentro de
 * Yjs y dos (o tres) editores unidos como si estuvieran en la misma sala.
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { aplicar, cambioDeTexto, clonar, diferencias, iguales } from '../src/colaborar/diferencias';
import { aY, aplicarEnY } from '../src/colaborar/yjson';
import { Vinculo, llenarDoc, proyectoDeDoc } from '../src/colaborar/Vinculo';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { migrarProyecto } from '../src/proyecto/formato';

const esperar = (ms = 0) => new Promise((r) => setTimeout(r, ms));
/** Espera a que lleguen y se apliquen los cambios (los de la escena se aplican como mucho cada 80 ms). */
const llegar = () => esperar(140);

describe('Diferencias entre proyectos', () => {
  it('convierten un objeto en otro, y al aplicarlas sale igual', () => {
    const a = { nombre: 'Juego', ancho: 960, escenas: { P: { objetos: [{ nombre: 'A', x: 1 }, { nombre: 'B', x: 2 }] } }, lista: [1, 2, 3], quitar: true };
    const b = { nombre: 'Juego 2', ancho: 960, escenas: { P: { objetos: [{ nombre: 'A', x: 5 }, { nombre: 'C', x: 9 }, { nombre: 'B', x: 2 }] } }, lista: [1, 9, 2, 3], nuevo: { y: 1 } };
    const copia = clonar(a);
    aplicar(copia, diferencias(a, b));
    expect(iguales(copia, b)).toBe(true);
  });

  it('los objetos de una escena se buscan por su nombre, no por su sitio', () => {
    const a = { objetos: [{ nombre: 'Moneda', x: 0 }] };
    const b = { objetos: [{ nombre: 'Moneda', x: 100 }] };
    const cambios = diferencias(a, b);
    expect(cambios).toEqual([{ tipo: 'poner', ruta: ['objetos', { nombre: 'Moneda' }, 'x'], valor: 100 }]);
    // Aunque otro haya metido un objeto delante, el cambio va a la Moneda
    const otro = { objetos: [{ nombre: 'Nuevo', x: 7 }, { nombre: 'Moneda', x: 0 }] };
    aplicar(otro, cambios);
    expect(otro.objetos).toEqual([{ nombre: 'Nuevo', x: 7 }, { nombre: 'Moneda', x: 100 }]);
  });

  it('un cambio sobre algo que otro ha borrado se salta sin romper nada', () => {
    const cambios = diferencias({ objetos: [{ nombre: 'Moneda', x: 0 }] }, { objetos: [{ nombre: 'Moneda', x: 5 }] });
    const sinMoneda = { objetos: [{ nombre: 'Otro', x: 1 }] };
    expect(aplicar(sinMoneda, cambios)).toBe(0);
    expect(sinMoneda.objetos).toEqual([{ nombre: 'Otro', x: 1 }]);
  });

  it('aplicar no cambia los objetos que no han cambiado (siguen siendo los mismos)', () => {
    const a = { objetos: [{ nombre: 'A', x: 1 }, { nombre: 'B', x: 2 }] };
    const b0 = a.objetos[1];
    aplicar(a, diferencias(a, { objetos: [{ nombre: 'A', x: 3 }, { nombre: 'B', x: 2 }] }));
    expect(a.objetos[1]).toBe(b0);
  });

  it('el cambio de texto más pequeño (y sin partir emojis)', () => {
    expect(cambioDeTexto('hola mundo', 'hola gran mundo')).toEqual({ desde: 5, hasta: 5, meter: 'gran ' });
    expect(cambioDeTexto('abc', 'abc')).toBeNull();
    const c = cambioDeTexto('a😀b', 'a😃b')!;
    const viejo = 'a😀b';
    expect(viejo.slice(0, c.desde) + c.meter + viejo.slice(c.hasta)).toBe('a😃b');
    expect(c.meter).toBe('😃');
  });
});

describe('El proyecto dentro de Yjs', () => {
  it('los cambios aplicados en Yjs dejan lo mismo que aplicados al objeto', () => {
    const a = { nombre: 'J', escenas: { P: { objetos: [{ nombre: 'A', x: 1, sprite: { color: 'rojo' } }] } }, puntos: [1, 2] };
    const b = { nombre: 'J', escenas: { P: { objetos: [{ nombre: 'Z' }, { nombre: 'A', x: 4, sprite: { color: 'azul' } }] }, Q: { objetos: [] } }, puntos: [1, 2, 3] };
    const doc = new Y.Doc();
    const mapa = doc.getMap<unknown>('p');
    doc.transact(() => {
      for (const [k, v] of Object.entries(a)) mapa.set(k, aY(v));
    });
    doc.transact(() => aplicarEnY(mapa, diferencias(a, b)));
    expect(iguales(mapa.toJSON(), b)).toBe(true);
  });
});

/** Varios editores unidos por Yjs, como en una sala (lo que manda uno le llega a los demás un momento después). */
function sala(n: number) {
  const docs = Array.from({ length: n }, () => new Y.Doc());
  for (const d of docs) {
    d.on('update', (u: Uint8Array, origen: unknown) => {
      if (origen === 'red') return;
      for (const otro of docs) if (otro !== d) setTimeout(() => Y.applyUpdate(otro, u, 'red'), 5);
    });
  }
  // El primero crea la sala con su proyecto; los demás entran y abren el de la sala
  const estados = [new EstadoEditor()];
  estados[0].crearObjeto('rectangulo', 100, 100);
  estados[0].renombrar(estados[0].seleccion!, 'Jugador');
  llenarDoc(docs[0], estados[0].proyecto);
  for (let i = 1; i < n; i++) {
    Y.applyUpdate(docs[i], Y.encodeStateAsUpdate(docs[0]), 'red');
    const e = new EstadoEditor();
    e.abrir(proyectoDeDoc(docs[i]));
    estados.push(e);
  }
  const vinculos = estados.map((e, i) => new Vinculo(docs[i], e));
  return { docs, estados, vinculos };
}
const nombres = (e: EstadoEditor) => e.escena.objetos.map((o) => o.nombre);

describe('Dos editores en la misma sala', () => {
  it('lo que hace uno le aparece al otro', async () => {
    const { estados: [ana, beto] } = sala(2);
    expect(nombres(beto)).toEqual(['Jugador']);
    ana.crearObjeto('circulo', 300, 50);
    await llegar();
    expect(nombres(beto)).toEqual(['Jugador', 'Circulo']);
    beto.moverObjeto({ tipo: 'escena', escena: beto.escenaActual, indice: 1 }, 400, 60);
    await llegar();
    expect(ana.escena.objetos[1]).toMatchObject({ x: 400, y: 60 });
  });

  it('cambios a la vez en cosas distintas: no se pisa nada', async () => {
    const { estados: [ana, beto] } = sala(2);
    ana.crearObjeto('circulo', 0, 0);
    await llegar();
    // A la vez: Ana mueve el Jugador y Beto le cambia el color al Círculo y crea otra escena
    ana.moverObjeto({ tipo: 'escena', escena: ana.escenaActual, indice: 0 }, 777, 1);
    beto.cambiarPropiedad({ tipo: 'escena', escena: beto.escenaActual, indice: 1 }, 'sprite.color', '#ff0000');
    beto.crearEscena('Nivel');
    await llegar();
    for (const e of [ana, beto]) {
      const p = e.proyecto.escenas[e.proyecto.escenaInicial];
      expect(p.objetos[0]).toMatchObject({ nombre: 'Jugador', x: 777 });
      expect(p.objetos[1].sprite?.color).toBe('#ff0000');
      expect(Object.keys(e.proyecto.escenas)).toContain('Nivel');
    }
  });

  it('si otro añade un objeto delante, lo que tienes seleccionado sigue siendo lo mismo', async () => {
    const { estados: [ana, beto] } = sala(2);
    ana.crearObjeto('circulo', 0, 0);
    await llegar();
    beto.seleccionar({ tipo: 'escena', escena: beto.escenaActual, indice: 1 });
    expect(beto.seleccionado?.nombre).toBe('Circulo');
    // Ana pone un objeto al principio de la lista (lo crea y lo manda al fondo)
    ana.crearObjeto('texto', 0, 0);
    await llegar();
    expect(beto.seleccionado?.nombre).toBe('Circulo');
  });

  it('el código: lo que escribe uno le llega al otro', async () => {
    const { estados: [ana, beto] } = sala(2);
    const archivo = ana.crearScriptSuelto('jugador');
    await llegar();
    expect(Object.keys(beto.proyecto.scripts)).toContain(archivo);
    ana.cambiarCodigo(archivo, ana.proyecto.scripts[archivo] + 'cuando empieza:\n    mostrar("hola")\n');
    await llegar();
    expect(beto.proyecto.scripts[archivo]).toContain('mostrar("hola")');
  });

  it('escribir a la vez en el mismo script junta las dos cosas', async () => {
    const { estados: [ana, beto] } = sala(2);
    const archivo = ana.crearScriptSuelto('juntos');
    await llegar();
    const base = beto.proyecto.scripts[archivo];
    ana.cambiarCodigo(archivo, '# arriba Ana\n' + base);
    beto.cambiarCodigo(archivo, base + '# abajo Beto\n');
    await llegar();
    expect(ana.proyecto.scripts[archivo]).toBe(beto.proyecto.scripts[archivo]);
    expect(ana.proyecto.scripts[archivo]).toContain('# arriba Ana');
    expect(ana.proyecto.scripts[archivo]).toContain('# abajo Beto');
  });

  it('deshacer deshace solo lo tuyo, no lo de los demás', async () => {
    const { estados: [ana, beto] } = sala(2);
    ana.crearObjeto('circulo', 0, 0);
    await esperar(700);
    beto.crearObjeto('texto', 0, 0);
    await llegar();
    expect(nombres(ana)).toHaveLength(3);
    expect(ana.puedeDeshacer).toBe(true);
    ana.deshacer();
    await llegar();
    // Se ha ido el círculo de Ana; el texto de Beto sigue
    for (const e of [ana, beto]) {
      expect(nombres(e)).not.toContain('Circulo');
      expect(nombres(e).some((n) => !!n?.startsWith('Texto'))).toBe(true);
    }
    ana.rehacer();
    await llegar();
    expect(nombres(beto)).toContain('Circulo');
  });

  it('lo que llega se espera mientras arrastras (y luego se aplica)', async () => {
    const { estados: [ana, beto] } = sala(2);
    beto.empezarCambioLargo();
    ana.crearObjeto('circulo', 0, 0);
    await llegar();
    expect(nombres(beto)).toEqual(['Jugador']);
    beto.moverObjeto({ tipo: 'escena', escena: beto.escenaActual, indice: 0 }, 50, 50);
    beto.terminarCambioLargo();
    await esperar(400);
    expect(nombres(beto)).toEqual(['Jugador', 'Circulo']);
    expect(ana.escena.objetos[0]).toMatchObject({ x: 50, y: 50 });
  });

  it('un proyecto roto que llega de la sala NO se aplica (se comprueba entero)', async () => {
    const { docs, estados: [, beto], vinculos } = sala(2);
    const problemas: string[] = [];
    (vinculos[1] as unknown as { opciones: { alProblema: (t: string) => void } }).opciones.alProblema = (t) => problemas.push(t);
    // Un tramposo mete un objeto y una imagen de internet (no se permite: avisaría al dueño de esa web de quién abre el juego)
    docs[0].transact(() => {
      const p = docs[0].getMap<unknown>('proyecto');
      const escena = (p.get('escenas') as Y.Map<Y.Map<unknown>>).get(beto.escenaActual)!;
      (escena.get('objetos') as Y.Array<unknown>).push([aY({ nombre: 'Trampa', x: 0, y: 0 })]);
      (p.get('imagenes') as Y.Map<unknown>).set('espia', 'https://malo.example/espia.png');
    }, 'tramposo');
    await llegar();
    expect(nombres(beto)).toEqual(['Jugador']);
    expect(problemas.length).toBe(1);
  });

  it('tres editores acaban todos con el mismo proyecto', async () => {
    const { estados } = sala(3);
    const [a, b, c] = estados;
    a.crearObjeto('circulo', 1, 1);
    b.crearEscena('Nivel2');
    c.crearScriptSuelto('enemigo');
    await llegar();
    await llegar();
    const json = (e: EstadoEditor) => JSON.stringify(migrarProyecto(JSON.parse(e.aJSON())), Object.keys(migrarProyecto(JSON.parse(e.aJSON()))).sort());
    expect(json(a)).toBe(json(b));
    expect(json(b)).toBe(json(c));
  });

  it('al salir de la sala, el proyecto se queda y deshacer vuelve a ser el normal', async () => {
    const { estados: [ana], vinculos } = sala(2);
    vinculos[0].destruir();
    expect(ana.deshacerExterno).toBeNull();
    ana.crearObjeto('circulo', 0, 0);
    expect(ana.puedeDeshacer).toBe(true);
    ana.deshacer();
    expect(nombres(ana)).toEqual(['Jugador']);
  });
});
