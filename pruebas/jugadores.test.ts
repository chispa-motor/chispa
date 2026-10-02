/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * VARIOS JUGADORES EN EL MISMO ORDENADOR (día 4, bloque 3): de 2 a 4, con el
 * teclado partido o con mandos, y la pantalla dividida o compartida.
 */
import { describe, expect, it } from 'vitest';
import { ACCIONES_JUGADOR, TECLAS_JUGADOR } from '../src/motor/Jugadores';
import { Fisica } from '../src/objetos/componentes/Fisica';
import { migrarProyecto, proyectoVacio, type DefObjeto } from '../src/proyecto/formato';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { Inspector } from '../src/editor/paneles/Inspector';
import type { VistaEscena } from '../src/editor/escena/VistaEscena';
import { juegoDePrueba } from './ayudantes';

const caja = (nombre: string, x: number, y: number, extra: Partial<DefObjeto> = {}): DefObjeto => ({ nombre, x, y, sprite: { ancho: 20, alto: 20 }, ...extra });

/** Dos objetos, cada uno con su script. */
function dos(codigo1: string, codigo2 = '', extra: Partial<DefObjeto> = {}) {
  return juegoDePrueba({
    scripts: { 'uno.chs': codigo1, 'dos.chs': codigo2 },
    escena: [caja('Uno', 100, 100, { script: 'uno.chs', ...extra }), caja('Dos', 500, 100, { script: codigo2 ? 'dos.chs' : undefined, ...extra })],
    gravedad: 0,
  });
}

describe('El teclado partido', () => {
  it('cada jugador tiene los mismos seis controles en su trozo del teclado, sin pisarse', () => {
    expect(ACCIONES_JUGADOR).toEqual(['arriba', 'abajo', 'izquierda', 'derecha', 'a', 'b']);
    const todas = TECLAS_JUGADOR.flatMap((t) => Object.values(t));
    expect(todas).toHaveLength(24);
    expect(new Set(todas).size).toBe(24);
    expect(TECLAS_JUGADOR[0]).toMatchObject({ arriba: 'w', izquierda: 'a', a: 'espacio' });
    expect(TECLAS_JUGADOR[1]).toMatchObject({ arriba: 'arriba', a: 'enter' });
  });

  it('cada uno se mueve con sus teclas; solo, el jugador 1 también lleva las flechas', () => {
    const solo = dos('cuando cada fotograma:\n    yo.moverConJugador(1, 300)');
    solo.pulsar('ArrowRight', 'ArrowRight');
    solo.avanzar(60);
    expect(solo.buscar('Uno').posicion.x).toBeCloseTo(400);
    solo.soltar('ArrowRight', 'ArrowRight');
    solo.pulsar('KeyW', 'w');
    solo.avanzar(60);
    expect(solo.buscar('Uno').posicion.y).toBeCloseTo(400);

    const j = dos('cuando cada fotograma:\n    yo.moverConJugador(1, 300)', 'cuando cada fotograma:\n    yo.moverConJugador(2, 300)');
    j.avanzar(1);
    j.pulsar('ArrowRight', 'ArrowRight'); // las flechas ya son solo del 2
    j.pulsar('KeyA', 'a'); // y el 1, con WASD, a la izquierda
    j.avanzar(60);
    expect(j.buscar('Uno').posicion.x).toBeCloseTo(-200, 0);
    expect(j.buscar('Dos').posicion.x).toBeCloseTo(800, 0);
    expect(j.errores).toEqual([]);
  });

  it('controles(n): ejes, pulsado, sePulso, seSolto y cambiar una tecla', () => {
    const j = dos('cuando cada fotograma:\n    variable c = controles(3)\n    si c.sePulso("a"):\n        mostrar("pulsa")\n    si c.seSolto("a"):\n        mostrar("suelta")\n    si c.pulsado("b"):\n        mostrar("b", c.x, c.y)');
    j.pulsar('KeyO', 'o'); // la «a» del jugador 3
    j.avanzar(2);
    j.soltar('KeyO', 'o');
    j.avanzar(1);
    expect(j.salida).toEqual(['pulsa', 'suelta']);
    j.pulsar('KeyU', 'u'); // su «b»
    j.pulsar('KeyL', 'l'); // derecha
    j.pulsar('KeyK', 'k'); // abajo
    j.avanzar(1);
    expect(j.salida[2]).toBe('b 1 -1');
    // Cambiar una tecla
    const otra = dos('cuando empieza:\n    controles(1).ponerTecla("a", "M")\n\ncuando cada fotograma:\n    si controles(1).sePulso("a"):\n        mostrar("con la m")');
    otra.pulsar('Space', ' ');
    otra.avanzar(1);
    otra.pulsar('KeyM', 'm');
    otra.avanzar(1);
    expect(otra.salida).toEqual(['con la m']);
  });

  it('errores claros', () => {
    const error = (codigo: string) => dos(`cuando empieza:\n    ${codigo}`).errores[0]?.error;
    expect(error('mostrar(controles(5).x)')?.message).toMatch(/número del jugador: 1, 2, 3 o 4 \(y le das 5\)/);
    expect(error('mostrar(controles().x)')?.message).toMatch(/número del jugador/);
    expect(error('mostrar(controles(1).pulsado("espacio"))')?.message).toMatch(/no tiene ningún control llamado "espacio"/);
    expect(error('mostrar(controles(1).pulsado("espacio"))')?.pista).toMatch(/arriba, abajo, izquierda, derecha, a .* y b/);
    expect(error('mostrar(controles(1).saltar)')?.message).toMatch(/no tienen nada llamado 'saltar'/);
    expect(error('controles(1).x = 1')?.message).toMatch(/solo se puede leer/);
    expect(error('controles(1).ponerTecla("a", "tecla rara")')?.message).toMatch(/tecla/);
    expect(error('yo.moverConJugador(300)')?.message).toMatch(/número del jugador/);
    // Una variable propia llamada «jugador» sigue valiendo (el nombre no está cogido)
    const libre = dos('cuando empieza:\n    variable jugador = buscar("Dos")\n    mostrar(jugador.nombre)');
    expect(libre.salida).toEqual(['Dos']);
  });
});

describe('Con mandos', () => {
  it('el primer mando es del jugador 1, el segundo del 2...; la palanca, poco inclinada, va despacio', () => {
    const j = dos('cuando cada fotograma:\n    yo.moverConJugador(1, 300)', 'cuando cada fotograma:\n    yo.moverConJugador(2, 300)\n    si controles(2).sePulso("a"):\n        mostrar("salta el 2", controles(2).mando, controles(1).mando)');
    j.avanzar(1);
    j.entrada.ponerMando(true, new Set(['a']), 0.5, 0, 0, 0, 1); // el SEGUNDO mando
    j.avanzar(1);
    expect(j.salida).toEqual(['salta el 2 verdadero falso']);
    j.entrada.ponerMando(true, new Set(), 0.5, 0, 0, 0, 1);
    j.avanzar(60);
    expect(j.buscar('Dos').posicion.x).toBeCloseTo(500 + 150 + 2.5, 0); // a la mitad de rapidez
    expect(j.buscar('Uno').posicion.x).toBe(100); // el 1 no se entera
    // Soltar un botón del mando también cuenta
    const s = dos('cuando cada fotograma:\n    si controles(1).seSolto("b"):\n        mostrar("suelta b")');
    s.entrada.ponerMando(true, new Set(['x']), 0, 0); // en el mando, «b» es B o X
    s.avanzar(1);
    s.entrada.ponerMando(true, new Set(), 0, 0);
    s.avanzar(1);
    expect(s.salida).toEqual(['suelta b']);
  });

  it('con varios jugadores, el primer mando deja de hacer de teclado (si no, movería al jugador 2, que lleva las flechas)', () => {
    const j = dos('cuando cada fotograma:\n    yo.moverConJugador(1, 300)', 'cuando cada fotograma:\n    yo.moverConJugador(2, 300)');
    j.avanzar(1);
    expect(j.entrada.mandoHaceDeTeclado).toBe(false);
    j.entrada.ponerMando(true, new Set(['derecha']), 0, 0);
    j.avanzar(60);
    expect(j.buscar('Uno').posicion.x).toBeGreaterThan(390);
    expect(j.buscar('Dos').posicion.x).toBe(500);
    // Con un solo jugador sigue haciendo de teclado, como siempre
    const solo = dos('cuando se pulsa "espacio":\n    mostrar("espacio")');
    solo.entrada.ponerMando(true, new Set(['a']), 0, 0);
    solo.avanzar(1);
    expect(solo.salida).toEqual(['espacio']);
  });
});

describe('Sin código: «Lo maneja un jugador»', () => {
  it('visto desde arriba se mueve en las cuatro direcciones; en plataformas, a los lados, y salta con «a»', () => {
    const arriba = juegoDePrueba({
      gravedad: 0,
      escena: [caja('A', 100, 100, { comportamiento: { tipo: 'jugador', objetivo: '', jugador: 2, rapidez: 120 } })],
    });
    arriba.pulsar('ArrowUp', 'ArrowUp');
    arriba.pulsar('ArrowLeft', 'ArrowLeft');
    arriba.avanzar(60);
    // En diagonal no va más rápido: 120 / √2 en cada eje
    expect(arriba.buscar('A').posicion.x).toBeCloseTo(100 - 84.85, 0);
    expect(arriba.buscar('A').posicion.y).toBeCloseTo(100 + 84.85, 0);

    const plataformas = juegoDePrueba({
      escena: [
        caja('P', 100, 60, { colision: {}, fisica: {}, comportamiento: { tipo: 'jugador', objetivo: '', jugador: 1, rapidez: 200, salto: 500 } }),
        { nombre: 'Suelo', x: 500, y: 20, sprite: { ancho: 2000, alto: 40 }, colision: {} },
      ],
    });
    plataformas.avanzar(30); // cae al suelo
    const p = plataformas.buscar('P');
    const suelo = p.posicion.y;
    plataformas.pulsar('KeyD', 'd');
    plataformas.pulsar('KeyW', 'w'); // «arriba» también salta
    plataformas.avanzar(10);
    expect(p.posicion.x).toBeGreaterThan(125);
    expect(p.posicion.y).toBeGreaterThan(suelo + 30);
    plataformas.soltar('KeyW', 'w');
    plataformas.avanzar(120);
    expect(p.posicion.y).toBeCloseTo(suelo, 0);
    // En el aire no vuelve a saltar
    plataformas.pulsar('Space', ' ');
    plataformas.avanzar(3);
    plataformas.soltar('Space', ' ');
    plataformas.pulsar('Space', ' ');
    plataformas.avanzar(1);
    expect(p.obtener(Fisica)!.velocidad.y).toBeLessThan(500);
  });

  it('se pone en el inspector, con las teclas de ese jugador a la vista', () => {
    const e = new EstadoEditor();
    const insp = new Inspector(e, { herramienta: 'mover', tipoPincel: null, alCambiarHerramienta: () => {}, ponerHerramienta() {} } as unknown as VistaEscena);
    e.crearObjeto('rectangulo', 100, 100);
    e.activarComponente(e.seleccion!, 'comportamiento', true);
    const elegir = (ruta: string, valor: string) => {
      const c = insp.elemento.querySelector<HTMLSelectElement>(`[data-ruta="${ruta}"]`)!;
      c.value = valor;
      c.dispatchEvent(new Event('change'));
    };
    elegir('comportamiento.tipo', 'jugador');
    expect(e.seleccionado?.comportamiento).toMatchObject({ tipo: 'jugador', rapidez: 300 });
    elegir('comportamiento.jugador', '2');
    expect(e.seleccionado?.comportamiento?.jugador).toBe(2);
    expect(insp.elemento.textContent).toContain('Teclas del jugador 2: Flechas');
    expect(insp.elemento.querySelector('[data-ruta="comportamiento.objetivo"]')).toBeNull();
    // Y el proyecto se puede guardar y abrir
    expect(() => migrarProyecto(JSON.parse(JSON.stringify(e.proyecto)))).not.toThrow();
    expect(() => migrarProyecto({ ...proyectoVacio(), escenas: { Principal: { colorFondo: 'negro', objetos: [{ nombre: 'X', comportamiento: { tipo: 'jugador', objetivo: '', jugador: 7 } }] } } })).toThrow(/jugador/);
  });
});

describe('La pantalla: dividida o compartida', () => {
  const escena = (jugadores: NonNullable<NonNullable<ReturnType<typeof proyectoVacio>['escenas'][string]['camara']>['jugadores']>) => {
    const p = proyectoVacio();
    p.escenas.Principal = {
      colorFondo: 'negro', gravedad: 0, camara: { jugadores },
      objetos: [
        caja('Rojo', 0, 0, { comportamiento: { tipo: 'jugador', objetivo: '', jugador: 1, rapidez: 600 } }),
        caja('Azul', 3000, 1000, { comportamiento: { tipo: 'jugador', objetivo: '', jugador: 2, rapidez: 600 } }),
        caja('Verde', 100, 0),
      ],
    };
    return juegoDePrueba({ proyecto: migrarProyecto(p) });
  };

  it('dividida (desde el editor, sin código): un trozo para cada jugador, y su cámara lo sigue', () => {
    const j = escena({ modo: 'dividida', seguir: ['Rojo', 'Azul'], division: 'filas' });
    const e = j.juego.escena;
    expect(e.vistas().map((v) => [v.x, v.y, v.ancho, v.alto])).toEqual([[0, 0, 960, 270], [0, 270, 960, 270]]);
    expect([e.camaras[0].posicion.x, e.camaras[1].posicion.x]).toEqual([0, 3000]);
    j.pulsar('ArrowRight', 'ArrowRight');
    j.avanzar(120);
    expect(e.camaras[1].posicion.x).toBeGreaterThan(4100);
    expect(e.camaras[0].posicion.x).toBe(0);
    // Con 3: tres trozos
    const tres = escena({ modo: 'dividida', seguir: ['Rojo', 'Azul', 'Verde'] });
    expect(tres.juego.escena.camaras).toHaveLength(3);
    expect(tres.juego.escena.camaras[2].posicion.x).toBe(100);
  });

  it('compartida: la cámara se pone en medio y se aleja para que quepan todos; al juntarse, se acerca (sin pasarse)', () => {
    const j = escena({ modo: 'compartida', seguir: ['Rojo', 'Azul'] });
    const cam = j.juego.escena.camara;
    j.avanzar(180);
    expect(j.juego.escena.camaras).toHaveLength(1);
    expect(cam.posicion.x).toBeCloseTo(1500, 0);
    expect(cam.posicion.y).toBeCloseTo(500, 0);
    // 3000 de ancho + 120 de margen a cada lado en 960 de pantalla
    expect(cam.zoom).toBeCloseTo(960 / 3240, 2);
    const v = cam.zonaVisible();
    expect(v.izquierda).toBeLessThan(0);
    expect(v.derecha).toBeGreaterThan(3000);
    expect(v.abajo).toBeLessThan(0);
    expect(v.arriba).toBeGreaterThan(1000);
    // Se juntan: vuelve al zoom normal (1), no más cerca
    j.buscar('Azul').posicion.x = 50;
    j.buscar('Azul').posicion.y = 0;
    j.avanzar(240);
    expect(cam.zoom).toBeCloseTo(1, 2);
    // Si uno desaparece, sigue con el otro
    j.juego.escena.destruir(j.buscar('Azul'));
    j.buscar('Rojo').posicion.x = 800;
    j.avanzar(240);
    expect(cam.posicion.x).toBeCloseTo(800, 0);
  });

  it('desde Chispa: escena.camara.encuadrar([...]) y se quita con seguir', () => {
    const j = dos('cuando empieza:\n    escena.camara.encuadrar([yo, buscar("Dos")], 50)\n\ncuando se pulsa "q":\n    escena.camara.seguir(yo)');
    j.avanzar(120);
    expect(j.errores).toEqual([]);
    expect(j.juego.escena.camara.posicion.x).toBeCloseTo(300, 0);
    j.pulsar('KeyQ', 'q');
    j.avanzar(120);
    expect(j.juego.escena.camara.posicion.x).toBeCloseTo(100, 0);
    const error = (codigo: string) => dos(`cuando empieza:\n    ${codigo}`).errores[0]?.error.message;
    expect(error('escena.camara.encuadrar(yo, buscar("Dos"))')).toMatch(/lista de objetos/);
    expect(error('escena.camara.encuadrar([yo, buscar("Nadie")])')).toMatch(/lo 2º de la lista no es un objeto/);
    expect(error('escena.camara.encuadrar([yo], -5)')).toMatch(/margen/);
  });

  it('en el editor: al elegir «2 jugadores» se proponen los objetos que maneja cada uno', () => {
    const e = new EstadoEditor();
    const insp = new Inspector(e, { herramienta: 'mover', tipoPincel: null, alCambiarHerramienta: () => {}, ponerHerramienta() {} } as unknown as VistaEscena);
    for (const [nombre, jugador] of [['Azul', 2], ['Rojo', 1]] as const) {
      e.crearObjeto('rectangulo', 100, 100);
      e.renombrar(e.seleccion!, nombre);
      e.cambiarPropiedad(e.seleccion!, 'comportamiento', { tipo: 'jugador', objetivo: '', jugador });
    }
    e.seleccionar(null);
    const elegir = (ruta: string, valor: string) => {
      const c = insp.elemento.querySelector<HTMLSelectElement>(`[data-ruta="${ruta}"]`)!;
      c.value = valor;
      c.dispatchEvent(new Event('change'));
    };
    elegir('camara.jugadores', 'dividida:2');
    expect(e.escena.camara?.jugadores).toEqual({ modo: 'dividida', seguir: ['Rojo', 'Azul'] });
    elegir('camara.division', 'filas');
    elegir('camara.jugador2', 'Rojo');
    expect(e.escena.camara?.jugadores).toEqual({ modo: 'dividida', seguir: ['Rojo', 'Rojo'], division: 'filas' });
    elegir('camara.jugadores', 'compartida:3');
    expect(e.escena.camara?.jugadores?.modo).toBe('compartida');
    expect(e.escena.camara?.jugadores?.seguir).toHaveLength(3);
    elegir('camara.jugadores', '');
    expect(e.escena.camara?.jugadores).toBeUndefined();
    expect(() => migrarProyecto({ ...proyectoVacio(), escenas: { Principal: { colorFondo: 'negro', camara: { jugadores: { modo: 'triple', seguir: [] } as never }, objetos: [] } } })).toThrow(/modo/);
  });
});
