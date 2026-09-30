/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * UTILIDADES DE JUEGO (noche, bloque 4): caminos, comportamientos sin código,
 * rayos, diálogos, mando y controles táctiles.
 */
import { describe, expect, it } from 'vitest';
import { juegoDePrueba } from './ayudantes';
import { MapaCasillas } from '../src/objetos/componentes/MapaCasillas';
import { ObjetoJuego } from '../src/objetos/ObjetoJuego';
import { buscarCamino, lineaLibre } from '../src/objetos/Caminos';
import { rayoContraCaja } from '../src/objetos/Rayos';
import { Vector2 } from '../src/motor/Vector2';
import { partirEnLineas } from '../src/objetos/Dialogo';
import { teclasDelJuego } from '../src/reproductor/ControlesTactiles';
import { proyectoVacio, type DefObjeto } from '../src/proyecto/formato';

/** Un mapa de casillas de 40 px con una pared vertical en la columna 5, de la fila 0 a la 8 (se rodea por arriba). */
function mapaConPared(): DefObjeto {
  const celdas: Record<string, string> = {};
  for (let f = 0; f <= 8; f++) celdas[`5,${f}`] = 'muro';
  celdas['0,0'] = 'suelo';
  return { nombre: 'Mapa', mapa: { tamano: 40, tipos: { muro: { color: 'gris', solida: true }, suelo: { color: 'verde', solida: false } }, celdas } };
}

describe('Caminos (A*)', () => {
  const mapa = () => {
    const o = new ObjetoJuego('Mapa');
    const m = o.agregar(new MapaCasillas());
    m.tamano = 40;
    m.tipos = { muro: { solida: true } };
    for (let f = 0; f <= 8; f++) m.poner(5, f, 'muro');
    return m;
  };

  it('rodea la pared y no la atraviesa', () => {
    const m = mapa();
    const c = buscarCamino(m, new Vector2(60, 60), new Vector2(340, 60), 10)!;
    expect(c).not.toBeNull();
    expect(c[c.length - 1]).toEqual(new Vector2(340, 60));
    // Todos los tramos van por sitios libres, y pasa por encima de la pared (fila 9 o más)
    let desde = new Vector2(60, 60);
    for (const p of c) {
      expect(lineaLibre(m, desde, p)).toBe(true);
      desde = p;
    }
    // Pasa por encima (fila 9) o por debajo (fila -1) de la pared
    expect(c.some((p) => p.y >= 9 * 40 || p.y < 0)).toBe(true);
  });

  it('si no hay pared en medio va recto (un solo tramo); si el destino está cerrado, da null', () => {
    const m = mapa();
    expect(buscarCamino(m, new Vector2(20, 20), new Vector2(180, 100))).toEqual([new Vector2(180, 100)]);
    // Encerrar la casilla (10, 3)
    for (const [c, f] of [[9, 2], [10, 2], [11, 2], [9, 3], [11, 3], [9, 4], [10, 4], [11, 4]]) m.poner(c, f, 'muro');
    expect(buscarCamino(m, new Vector2(20, 20), new Vector2(420, 140))).toBeNull();
  });
});

describe('irHacia y comportamientos', () => {
  it('yo.irHacia llega al sitio rodeando la pared y yendo pasa a falso', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: { 'b.chs': 'cuando empieza:\n    mostrar(yo.irHacia(vector(340, 60), 300))\ncuando cada fotograma:\n    si no yo.yendo:\n        mostrar("llegue", redondear(yo.x), redondear(yo.y))\n        destruir(yo)' },
      escena: [mapaConPared(), { nombre: 'Bicho', x: 60, y: 60, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: { gravedad: 0 }, script: 'b.chs' }],
    });
    let rodea = false;
    for (let i = 0; i < 400 && j.juego.escena.buscar('Bicho'); i++) {
      j.avanzar(1);
      const b = j.juego.escena.buscar('Bicho');
      if (b && (b.posicion.y > 8 * 40 || b.posicion.y < 0)) rodea = true;
    }
    expect(j.salida).toEqual(['verdadero', 'llegue 340 60']);
    expect(rodea).toBe(true); // ha pasado por encima o por debajo de la pared
  });

  it('perseguir solo cuando está cerca; parar() lo detiene', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      escena: [
        { nombre: 'Jugador', x: 500, y: 100, sprite: { ancho: 20, alto: 20 } },
        { nombre: 'Enemigo', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, comportamiento: { tipo: 'perseguir', objetivo: 'Jugador', rapidez: 120, distancia: 300 } },
      ],
    });
    j.avanzar(30);
    expect(j.buscar('Enemigo').posicion.x).toBe(100); // a 400 px: no lo ve
    j.buscar('Jugador').posicion.x = 300;
    j.avanzar(30);
    expect(j.buscar('Enemigo').posicion.x).toBeCloseTo(160, 0); // medio segundo a 120 px/s
  });

  it('huir se aleja; seguir se queda a su distancia; con recorrido, lo deja mientras persigue', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      escena: [
        { nombre: 'Jugador', x: 300, y: 300, sprite: { ancho: 20, alto: 20 } },
        { nombre: 'Gallina', x: 400, y: 300, sprite: { ancho: 20, alto: 20 }, comportamiento: { tipo: 'huir', objetivo: 'Jugador', rapidez: 100 } },
        { nombre: 'Perro', x: 300, y: 600, sprite: { ancho: 20, alto: 20 }, comportamiento: { tipo: 'seguir', objetivo: 'Jugador', rapidez: 400, distancia: 80 } },
        { nombre: 'Guardia', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, recorrido: { puntos: [{ x: 0, y: 100 }], rapidez: 50 }, comportamiento: { tipo: 'perseguir', objetivo: 'Jugador', distancia: 50 } },
      ],
    });
    j.avanzar(60);
    expect(j.buscar('Gallina').posicion.x).toBeCloseTo(500, 0);
    expect(j.buscar('Perro').posicion.distancia(j.buscar('Jugador').posicion)).toBeCloseTo(80, 0);
    const guardia = j.buscar('Guardia');
    expect(guardia.posicion.x).toBe(100); // patrulla en vertical
    j.buscar('Jugador').en(100, guardia.posicion.y + 40);
    j.avanzar(1);
    const y = guardia.posicion.y;
    j.avanzar(10);
    expect(guardia.posicion.y).toBeGreaterThan(y); // va a por el jugador, no sigue su camino
  });

  it('errores claros', () => {
    const j = juegoDePrueba({ scripts: { 'a.chs': 'cuando empieza:\n    yo.irHacia("Jugador")' }, escena: [{ nombre: 'A', script: 'a.chs' }] });
    j.avanzar(1);
    expect(j.errores[0].error.mensajeCorto).toContain("'irHacia' necesita un sitio");
  });
});

describe('rayo', () => {
  it('franjas: entra en la caja, empieza dentro o no la toca', () => {
    const caja = { izquierda: 100, derecha: 200, abajo: 0, arriba: 50 };
    expect(rayoContraCaja(new Vector2(0, 25), new Vector2(1, 0), caja)).toBe(100);
    expect(rayoContraCaja(new Vector2(150, 25), new Vector2(1, 0), caja)).toBe(0);
    expect(rayoContraCaja(new Vector2(0, 100), new Vector2(1, 0), caja)).toBeNull();
  });

  it('lo primero que toca: objeto o casilla, sin tocarse a sí mismo', () => {
    const j = juegoDePrueba({
      scripts: {
        'o.chs': [
          'cuando empieza:',
          '    variable r = rayo(yo, 0, 1000)', // a la derecha: la pared del mapa en x = 200
          '    mostrar(r.casilla, redondear(r.distancia), redondear(r.punto.x))',
          '    r = rayo(yo, 180, 1000)', // a la izquierda: la caja
          '    mostrar(r.objeto.nombre, redondear(r.distancia))',
          '    mostrar(rayo(yo, 90, 100))', // arriba no hay nada
          '    mostrar(rayo(yo, buscar("Caja"), 30))', // demasiado corto
        ].join('\n'),
      },
      escena: [
        mapaConPared(),
        { nombre: 'Ojo', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, colision: {}, script: 'o.chs' },
        { nombre: 'Caja', x: 40, y: 100, sprite: { ancho: 20, alto: 20 }, colision: {} },
      ],
    });
    j.avanzar(1);
    expect(j.salida).toEqual(['muro 100 200', 'Caja 50', 'nulo', 'nulo']);
  });

  it('errores: sin dirección', () => {
    const j = juegoDePrueba({ scripts: { 'o.chs': 'cuando empieza:\n    rayo(yo, "derecha")' }, escena: [{ nombre: 'O', script: 'o.chs' }] });
    j.avanzar(1);
    expect(j.errores[0].error.mensajeCorto).toContain('dirección');
  });
});

describe('dialogo', () => {
  const pulsar = (j: ReturnType<typeof juegoDePrueba>, codigo: string) => {
    j.pulsar(codigo);
    j.avanzar(1);
    j.soltar(codigo);
    j.avanzar(1);
  };

  it('para el juego, sale letra a letra, y la primera pulsación enseña todo', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: {
        'a.chs': 'cuando empieza:\n    dialogo("Ana", "Hola, soy Ana y tengo una mision para ti")\n    mostrar("fin")',
        'b.chs': 'cuando cada fotograma:\n    yo.x += 1',
      },
      escena: [{ nombre: 'A', script: 'a.chs' }, { nombre: 'B', x: 0, script: 'b.chs' }],
    });
    j.avanzar(3);
    const caja = j.juego.escena.dialogos[0];
    expect(caja.quien).toBe('Ana');
    expect(caja.completo).toBe(false);
    expect(j.buscar('B').posicion.x).toBe(0); // el diálogo sale al empezar: B no se ha movido
    pulsar(j, 'Space');
    expect(caja.completo).toBe(true);
    expect(j.salida).toEqual([]);
    pulsar(j, 'Space');
    expect(j.juego.escena.dialogos).toHaveLength(0);
    expect(j.salida).toEqual(['fin']);
    expect(j.buscar('B').posicion.x).toBeGreaterThan(0); // el juego sigue
  });

  it('con opciones: flechas y espacio (o el número) y devuelve la elegida; varios, en orden', () => {
    const j = juegoDePrueba({
      scripts: { 'a.chs': 'cuando empieza:\n    variable r = dialogo("¿Vienes?", ["Si", "No", "Quiza"])\n    mostrar("elegiste", r)\n    mostrar(dialogo("Adios"))' },
      escena: [{ nombre: 'A', script: 'a.chs' }],
    });
    j.avanzar(1);
    pulsar(j, 'Space'); // enseña el texto entero
    pulsar(j, 'ArrowDown');
    pulsar(j, 'ArrowDown');
    pulsar(j, 'ArrowUp');
    pulsar(j, 'Space');
    expect(j.salida).toEqual(['elegiste No']);
    pulsar(j, 'Space');
    pulsar(j, 'Space');
    expect(j.salida).toEqual(['elegiste No', 'nulo']);
  });

  it('errores y líneas', () => {
    const j = juegoDePrueba({ scripts: { 'a.chs': 'cuando empieza:\n    dialogo("Ana", "Hola", [1, 2])' }, escena: [{ nombre: 'A', script: 'a.chs' }] });
    j.avanzar(1);
    expect(j.errores[0].error.mensajeCorto).toContain('lista de textos');
    const medir = (t: string) => t.length * 10;
    expect(partirEnLineas('uno dos tres cuatro', 80, medir)).toEqual(['uno dos', 'tres', 'cuatro']);
    expect(partirEnLineas('a\nb', 80, medir)).toEqual(['a', 'b']);
  });
});

describe('Mando y controles táctiles', () => {
  it('el mando hace de teclado, y mando.pulsado / sePulso / ejeX', () => {
    const j = juegoDePrueba({
      scripts: { 'a.chs': 'cuando se pulsa "espacio":\n    mostrar("salto", mando.conectado)\ncuando se mantiene "derecha":\n    mostrar("derecha", mando.ejeX, mando.pulsado("a"))\ncuando cada fotograma:\n    si mando.sePulso("lb"):\n        mostrar("lb")' },
      escena: [{ nombre: 'A', script: 'a.chs' }],
    });
    const e = j.juego.motor.entrada;
    e.ponerMando(true, new Set(['a']), 0.8, 0);
    j.avanzar(1);
    expect(j.salida).toEqual(['salto verdadero', 'derecha 0.8 verdadero']);
    e.ponerMando(true, new Set(['lb']), 0, 0);
    j.avanzar(1);
    expect(j.salida.slice(2)).toEqual(['lb']);
    j.avanzar(1);
    expect(j.salida).toHaveLength(3); // se soltó la palanca: ya no va a la derecha; lb solo una vez
  });

  it('un botón que no existe', () => {
    const j = juegoDePrueba({ scripts: { 'a.chs': 'cuando empieza:\n    mando.pulsado("aa")' }, escena: [{ nombre: 'A', script: 'a.chs' }] });
    j.avanzar(1);
    expect(j.errores[0].error.pista).toContain('"a"');
  });

  it('los botones táctiles salen de las teclas que usa el juego', () => {
    const p = proyectoVacio();
    p.scripts['j.chs'] = 'cuando se pulsa "espacio", "w":\n    yo.saltar()\ncuando cada fotograma:\n    si teclado.pulsada("a"):\n        yo.x -= 1\n    si teclado.sePulso("x"):\n        mostrar(1)';
    p.scripts['k.chs'] = 'cuando cada fotograma:\n    yo.moverConFlechas(200)';
    const t = teclasDelJuego(p);
    expect(t.acciones).toEqual(['espacio', 'x']);
    expect(t.direcciones).toEqual({ arriba: ['w', 'arriba'], izquierda: ['a', 'izquierda'], derecha: ['derecha'], abajo: ['abajo'] });
  });
});
