/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * TESTS DEL MOTOR 2D COMPLETO: física, cámara, mapas de casillas,
 * animaciones, interfaz, partículas, sonido y música, escenas, guardado,
 * temporizadores y azar. Todo usado desde Chispa, como lo usaría alguien
 * que hace su juego.
 */
import { describe, expect, it } from 'vitest';
import { juegoDePrueba, unObjeto } from './ayudantes';
import { Camara } from '../src/objetos/Camara';
import { Vector2 } from '../src/motor/Vector2';
import { migrarProyecto, VERSION_PROYECTO } from '../src/proyecto/formato';
import { ErrorChispa } from '../src/chispa/errores/ErrorChispa';
import type { DefObjeto } from '../src/proyecto/formato';
import { Fisica } from '../src/objetos/componentes/Fisica';
import { Sprite } from '../src/objetos/componentes/Sprite';

const suelo: DefObjeto = { nombre: 'Suelo', x: 480, y: 20, sprite: { ancho: 960, alto: 40 }, colision: {} };

/** Monta un juego que debería fallar antes de empezar y devuelve el error. */
function errorAlPreparar(montar: () => unknown): ErrorChispa {
  try {
    montar();
  } catch (e) {
    if (e instanceof ErrorChispa) return e;
    throw e;
  }
  throw new Error('Se esperaba un error al preparar el juego');
}

describe('Física', () => {
  it('rebote: una pelota que cae rebota hacia arriba y acaba parándose', () => {
    const j = juegoDePrueba({ escena: [suelo, { nombre: 'Pelota', x: 480, y: 300, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: { rebote: 0.7 } }] });
    const pelota = j.buscar('Pelota');
    let subio = false;
    let yAnterior = pelota.posicion.y;
    for (let i = 0; i < 120; i++) {
      j.avanzar();
      if (pelota.posicion.y > yAnterior + 0.5 && pelota.posicion.y < 290) subio = true;
      yAnterior = pelota.posicion.y;
    }
    expect(subio).toBe(true);
    j.avanzar(600);
    expect(pelota.posicion.y).toBeCloseTo(50, 3); // quieta encima del suelo
  });

  it('rozamiento: frena en el suelo; con rozamiento 0 (hielo) sigue deslizando', () => {
    const j = juegoDePrueba({
      scripts: { 'empuje.chs': 'cuando pasen 0.2 segundos:\n    yo.velocidad.x = 300' },
      escena: [
        suelo,
        { nombre: 'Normal', x: 100, y: 60, sprite: { ancho: 40, alto: 40 }, colision: {}, fisica: { rozamiento: 0.5 }, script: 'empuje.chs' },
        { nombre: 'Hielo', x: 100, y: 160, sprite: { ancho: 40, alto: 40 }, colision: {}, fisica: { rozamiento: 0 }, script: 'empuje.chs' },
        { nombre: 'Suelo2', x: 480, y: 120, sprite: { ancho: 960, alto: 40 }, colision: {} },
      ],
    });
    j.avanzar(120);
    expect(Math.abs(j.buscar('Normal').obtener(Fisica)!.velocidad.x)).toBeLessThan(1);
    expect(j.buscar('Hielo').obtener(Fisica)!.velocidad.x).toBeCloseTo(300, 0);
  });

  const choque = (rebote: number) =>
    juegoDePrueba({
      gravedad: 0,
      scripts: { 'lanzar.chs': 'cuando empieza:\n    yo.velocidad = vector(200, 0)' },
      escena: [
        { nombre: 'Pesado', x: 100, y: 270, sprite: { ancho: 40, alto: 40 }, colision: {}, fisica: { masa: 10, rozamiento: 0, rebote }, script: 'lanzar.chs' },
        { nombre: 'Ligero', x: 200, y: 270, sprite: { ancho: 40, alto: 40 }, colision: {}, fisica: { masa: 1, rozamiento: 0, rebote } },
      ],
    });

  it('masa: el que pesa más empuja al que pesa menos (sin rebote, siguen juntos)', () => {
    const j = choque(0);
    j.avanzar(60);
    const pesado = j.buscar('Pesado').obtener(Fisica)!;
    const ligero = j.buscar('Ligero').obtener(Fisica)!;
    expect(pesado.velocidad.x).toBeCloseTo(200 * (10 / 11), 3); // el pesado casi no frena
    expect(ligero.velocidad.x).toBeCloseTo(pesado.velocidad.x, 3); // van juntos
    expect(j.buscar('Ligero').posicion.x).toBeGreaterThan(250); // lo ha empujado
    expect(j.buscar('Ligero').posicion.x - j.buscar('Pesado').posicion.x).toBeGreaterThanOrEqual(40 - 0.01); // no se atraviesan
  });

  it('masa con rebote: el ligero sale disparado más rápido que el pesado', () => {
    const j = choque(1);
    j.avanzar(60);
    expect(j.buscar('Ligero').obtener(Fisica)!.velocidad.x).toBeGreaterThan(j.buscar('Pesado').obtener(Fisica)!.velocidad.x + 100);
  });

  it('los objetos con física no se atraviesan: una caja cae encima de otra', () => {
    const j = juegoDePrueba({
      escena: [
        suelo,
        { nombre: 'Abajo', x: 480, y: 60, sprite: { ancho: 40, alto: 40 }, colision: {}, fisica: {} },
        { nombre: 'Arriba', x: 485, y: 300, sprite: { ancho: 40, alto: 40 }, colision: {}, fisica: {} },
      ],
    });
    j.avanzar(180);
    expect(j.buscar('Arriba').posicion.y).toBeCloseTo(100, 0);
    expect(j.buscar('Abajo').posicion.y).toBeCloseTo(60, 0);
  });

  it('los objetos estáticos no se mueven y paran a los demás', () => {
    const j = juegoDePrueba({
      escena: [
        { nombre: 'Plataforma', x: 480, y: 100, sprite: { ancho: 200, alto: 20 }, colision: {}, fisica: { estatico: true } },
        { nombre: 'Caja', x: 480, y: 300, sprite: { ancho: 40, alto: 40 }, colision: {}, fisica: {} },
      ],
    });
    j.avanzar(120);
    expect(j.buscar('Plataforma').posicion.y).toBe(100);
    expect(j.buscar('Caja').posicion.y).toBeCloseTo(130, 3);
  });

  it('zonas fantasma: se atraviesan, pero avisan al entrar y al salir', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: { 'bola.chs': 'cuando empieza:\n    yo.velocidad = vector(300, 0)\ncuando toco Zona:\n    mostrar("entro")\ncuando dejo de tocar Zona:\n    mostrar("salgo")' },
      escena: [
        { nombre: 'Zona', x: 300, y: 270, sprite: { ancho: 60, alto: 200 }, colision: { solido: false } },
        { nombre: 'Bola', x: 100, y: 270, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: { rozamiento: 0 }, script: 'bola.chs' },
      ],
    });
    j.avanzar(90);
    expect(j.salida).toEqual(['entro', 'salgo']);
    expect(j.buscar('Bola').posicion.x).toBeGreaterThan(400); // la ha atravesado
  });

  it('un objeto SIN física movido por su script también detecta lo que toca', () => {
    const j = juegoDePrueba({
      scripts: { 'bala.chs': 'cuando cada fotograma:\n    yo.x += 10\ncuando toco Enemigo:\n    mostrar("¡tocado!")\n    destruir(otro)' },
      escena: [
        { nombre: 'Enemigo', x: 300, y: 100, sprite: { ancho: 40, alto: 40 }, colision: {} },
        { nombre: 'Bala', x: 100, y: 100, sprite: { ancho: 10, alto: 10 }, colision: { solido: false }, script: 'bala.chs' },
      ],
    });
    j.avanzar(30);
    expect(j.salida).toEqual(['¡tocado!']);
    expect(j.juego.escena.buscar('Enemigo')).toBeNull();
  });

  it('sin gravedad (vista desde arriba) el rozamiento frena en las dos direcciones', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: { 'nave.chs': 'cuando empieza:\n    yo.velocidad = vector(300, 300)' },
      escena: [{ nombre: 'Nave', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: { rozamiento: 0.5 }, script: 'nave.chs' }],
    });
    j.avanzar(120);
    const v = j.buscar('Nave').obtener(Fisica)!.velocidad;
    expect(Math.abs(v.x)).toBeLessThan(1);
    expect(Math.abs(v.y)).toBeLessThan(1);
  });

  it('empujar() cambia la velocidad según la masa, y las propiedades de física se leen y cambian desde Chispa', () => {
    const j = unObjeto('cuando empieza:\n    yo.gravedad = 0\n    yo.masa = 2\n    yo.empujar(100, 50)\n    yo.rebote = 0.5\n    yo.rozamiento = 0\n    mostrar(yo.velocidad, yo.rebote, yo.masa)', { fisica: {} });
    expect(j.salida).toEqual(['(50, 25) 0.5 2']);
  });

  it('escena.gravedad cambia la gravedad de toda la escena', () => {
    const j = unObjeto('cuando empieza:\n    escena.gravedad = 0', { fisica: {} });
    j.avanzar(30);
    expect(j.buscar('Prueba').posicion.y).toBe(100);
  });
});

describe('Cámara', () => {
  it('zoom: con zoom 2 todo se ve el doble de grande alrededor del centro', () => {
    const c = new Camara(960, 540);
    c.zoom = 2;
    expect(c.mundoAPantalla(480, 270)).toEqual(new Vector2(480, 270));
    expect(c.mundoAPantalla(530, 270)).toEqual(new Vector2(580, 270));
    expect(c.pantallaAMundo(new Vector2(580, 170))).toEqual(new Vector2(530, 320));
  });

  it('seguir con límites: la cámara no enseña nada fuera de la zona', () => {
    const j = juegoDePrueba({
      scripts: { 'j.chs': 'cuando empieza:\n    escena.camara.limites(0, 0, 2000, 540)\n    escena.camara.seguir(yo)' },
      escena: [{ nombre: 'Jugador', x: 10, y: 100, sprite: {}, script: 'j.chs' }],
    });
    j.avanzar();
    expect(j.juego.escena.camara.zonaVisible().izquierda).toBe(0);
    j.buscar('Jugador').posicion.x = 1900;
    j.avanzar(200);
    expect(j.juego.escena.camara.zonaVisible().derecha).toBeCloseTo(2000, 0);
  });

  it('zoom y temblar desde Chispa; la configuración inicial de la cámara viene de la escena', () => {
    const j = juegoDePrueba({
      scripts: { 'c.chs': 'cuando empieza:\n    mostrar(escena.camara.zoom)\n    escena.camara.zoom = 3\n    escena.camara.temblar(10, 0.2)' },
      escena: [{ nombre: 'C', script: 'c.chs' }],
      escenas: {},
    });
    expect(j.salida).toEqual(['1']);
    expect(j.juego.escena.camara.zoom).toBe(3);
    j.avanzar(2);
    const durante = j.juego.escena.camara.mundoAPantalla(480, 270);
    j.avanzar(30);
    const despues = j.juego.escena.camara.mundoAPantalla(480, 270);
    expect(despues).toEqual(new Vector2(480, 270));
    expect(durante.x !== 480 || durante.y !== 270).toBe(true);
  });
});

describe('Mapas de casillas', () => {
  const mapa: DefObjeto = {
    nombre: 'Mapa',
    x: 0,
    y: 0,
    mapa: {
      tamano: 40,
      tipos: { suelo: { color: 'verde', solida: true }, pinchos: { color: 'gris', solida: false } },
      celdas: { '0,0': 'suelo', '1,0': 'suelo', '2,0': 'suelo', '3,0': 'suelo', '2,1': 'pinchos' },
    },
  };

  it('las casillas sólidas paran a los objetos con física', () => {
    const j = juegoDePrueba({ escena: [mapa, { nombre: 'Caja', x: 20, y: 200, sprite: { ancho: 30, alto: 30 }, colision: {}, fisica: {} }] });
    j.avanzar(120);
    expect(j.buscar('Caja').posicion.y).toBeCloseTo(55, 3); // casilla de 0 a 40 + media caja (15)
  });

  it('las casillas fantasma se atraviesan y avisan: cuando toco pinchos (con la variable casilla)', () => {
    const j = juegoDePrueba({
      scripts: { 'caja.chs': 'cuando toco pinchos:\n    mostrar("¡Ay!", casilla, otro.nombre)' },
      escena: [mapa, { nombre: 'Caja', x: 100, y: 200, sprite: { ancho: 30, alto: 30 }, colision: {}, fisica: {}, script: 'caja.chs' }],
    });
    j.avanzar(120);
    expect(j.salida).toEqual(['¡Ay! pinchos Mapa']);
    expect(j.buscar('Caja').posicion.y).toBeCloseTo(55, 3); // atraviesa los pinchos y se para en el suelo
  });

  it('se pueden leer y cambiar casillas desde Chispa', () => {
    const j = juegoDePrueba({
      scripts: {
        'm.chs': [
          'cuando empieza:',
          '    variable m = buscar("Mapa")',
          '    mostrar(m.casilla(0, 0), m.casilla(5, 5), m.casillaEn(100, 60))',
          '    m.ponerCasilla(5, 5, "Suelo")',
          '    m.quitarCasilla(0, 0)',
          '    mostrar(m.casilla(5, 5), m.casilla(0, 0), m.columnaEn(130), m.centroDeCasilla(1, 0))',
        ].join('\n'),
      },
      escena: [mapa, { nombre: 'M', script: 'm.chs' }],
    });
    expect(j.salida).toEqual(['suelo nulo pinchos', 'suelo nulo 3 (60, 20)']);
  });

  it('poner un tipo de casilla que no existe da error con sugerencia', () => {
    const j = juegoDePrueba({ scripts: { 'm.chs': 'cuando empieza:\n    buscar("Mapa").ponerCasilla(0, 0, "sulo")' }, escena: [mapa, { nombre: 'M', script: 'm.chs' }] });
    expect(j.errores[0].error.pista).toBe('¿Querías decir "suelo"?');
  });
});

describe('Animaciones', () => {
  const animaciones = {
    correr: { fotogramas: ['c1', 'c2', 'c3'], velocidad: 10, repetir: true },
    golpe: { fotogramas: ['g1', 'g2'], velocidad: 10, repetir: false },
  };
  const imagenes = { c1: '', c2: '', c3: '', g1: '', g2: '' };

  it('yo.animar cambia la imagen fotograma a fotograma y vuelve a empezar', () => {
    const j = juegoDePrueba({
      animaciones,
      imagenes,
      scripts: { 'a.chs': 'cuando empieza:\n    yo.animar("correr")' },
      escena: [{ nombre: 'A', sprite: { imagen: 'c1' }, script: 'a.chs' }],
    });
    const sprite = j.buscar('A').obtener(Sprite)!;
    const vistas = [];
    for (let i = 0; i < 4; i++) {
      vistas.push(sprite.imagen);
      j.avanzar(6); // 0.1 s = un fotograma a 10 por segundo
    }
    expect(vistas).toEqual(['c1', 'c2', 'c3', 'c1']);
  });

  it('cuando termina la animacion: solo en las que no se repiten', () => {
    const j = juegoDePrueba({
      animaciones,
      imagenes,
      scripts: { 'a.chs': 'cuando empieza:\n    yo.animar("golpe")\ncuando termina la animacion:\n    mostrar("fin de", yo.animacion)\n    yo.animacion = "correr"' },
      escena: [{ nombre: 'A', sprite: { imagen: 'c1' }, script: 'a.chs' }],
    });
    j.avanzar(60);
    expect(j.salida).toEqual(['fin de golpe']);
  });

  it('una animación que no existe se detecta antes de ejecutar', () => {
    const e = errorAlPreparar(() => juegoDePrueba({ animaciones, imagenes, scripts: { 'a.chs': 'cuando empieza:\n    yo.animar("corer")' }, escena: [{ nombre: 'A', sprite: {}, script: 'a.chs' }] }));
    expect(e.pista).toBe('¿Querías decir "correr"?');
  });

  it('la animación inicial se puede poner desde el editor', () => {
    const j = juegoDePrueba({ animaciones, imagenes, escena: [{ nombre: 'A', sprite: {}, animacion: 'correr' }] });
    j.avanzar(7);
    expect(j.buscar('A').obtener(Sprite)!.imagen).toBe('c2');
  });
});

describe('Interfaz en pantalla', () => {
  const boton: DefObjeto = { nombre: 'Boton', x: 100, y: 500, sprite: { ancho: 120, alto: 40, fijo: true, texto: 'Jugar' }, script: 'boton.chs' };

  it('cuando hago clic encima: solo si el clic cae sobre el botón (fijo en la pantalla)', () => {
    const j = juegoDePrueba({ scripts: { 'boton.chs': 'cuando hago clic encima:\n    mostrar("¡pulsado!")' }, escena: [boton] });
    j.clic(400, 400); // fuera
    j.avanzar();
    j.clic(110, 505); // dentro
    j.avanzar();
    expect(j.salida).toEqual(['¡pulsado!']);
  });

  it('el botón fijo no se mueve con la cámara', () => {
    const j = juegoDePrueba({ scripts: { 'boton.chs': 'cuando empieza:\n    escena.camara.x = 5000\ncuando hago clic encima:\n    mostrar("ok")' }, escena: [boton] });
    j.avanzar();
    j.clic(100, 500);
    j.avanzar();
    expect(j.salida).toEqual(['ok']);
  });

  it('un clic lo recibe solo el objeto de más arriba', () => {
    const j = juegoDePrueba({
      scripts: { 'a.chs': 'cuando hago clic encima:\n    mostrar(yo.nombre)' },
      escena: [
        { nombre: 'Fondo', x: 100, y: 100, sprite: { ancho: 100, alto: 100, capa: 0 }, script: 'a.chs' },
        { nombre: 'Delante', x: 100, y: 100, sprite: { ancho: 50, alto: 50, capa: 5 }, script: 'a.chs' },
      ],
    });
    j.clic(100, 100);
    j.avanzar();
    expect(j.salida).toEqual(['Delante']);
  });

  it('yo.ratonEncima, yo.texto y yo.fijo', () => {
    const j = juegoDePrueba({ scripts: { 'boton.chs': 'cuando cada fotograma:\n    si yo.ratonEncima:\n        yo.texto = "¡Encima!"\n        mostrar(yo.fijo)' }, escena: [boton] });
    j.clic(100, 500);
    j.avanzar();
    expect(j.buscar('Boton').obtener(Sprite)!.texto).toBe('¡Encima!');
    expect(j.salida[0]).toBe('verdadero');
  });
});

describe('Partículas', () => {
  it('particulas("explosion") crea partículas que desaparecen solas', () => {
    const j = unObjeto('cuando empieza:\n    particulas("explosion", yo.x, yo.y)');
    expect(j.juego.escena.particulas.cantidad).toBe(40);
    j.avanzar(90);
    expect(j.juego.escena.particulas.cantidad).toBe(0);
  });

  it('con una tabla se puede cambiar lo que se quiera', () => {
    const j = unObjeto('cuando empieza:\n    particulas({tipo: "humo", cantidad: 5, color: "verde"}, 0, 0)');
    expect(j.juego.escena.particulas.cantidad).toBe(5);
  });

  it('tipos y opciones mal escritos dan error con sugerencia', () => {
    expect(errorAlPreparar(() => unObjeto('cuando empieza:\n    particulas("explocion", 0, 0)')).pista).toBe('¿Querías decir "explosion"?');
    expect(unObjeto('cuando empieza:\n    particulas({cantidat: 5}, 0, 0)').errores[0].error.pista).toBe("¿Querías decir 'cantidad'?");
  });
});

describe('Sonidos y música', () => {
  it('musica.reproducir, musica.parar y sonido.reproducir', () => {
    const j = juegoDePrueba({
      sonidos: { tema: 'x', salto: 'x' },
      scripts: { 's.chs': 'cuando empieza:\n    musica.reproducir("tema")\n    mostrar(musica.actual)\n    sonido.reproducir("salto")\n    musica.parar()' },
      escena: [{ nombre: 'S', script: 's.chs' }],
    });
    expect(j.salida).toEqual(['tema']);
    expect(j.motor.sonido.historial).toEqual(['musica tema', 'reproducir salto', 'parar musica']);
  });

  it('un sonido que no existe se detecta antes de ejecutar, con sugerencia', () => {
    const e = errorAlPreparar(() => juegoDePrueba({ sonidos: { salto: 'x' }, scripts: { 's.chs': 'cuando empieza:\n    sonido.reproducir("salt")' }, escena: [{ nombre: 'S', script: 's.chs' }] }));
    expect(e.pista).toBe('¿Querías decir "salto"?');
  });
});

describe('Varias escenas', () => {
  const escenas = {
    Nivel2: { colorFondo: 'azul', objetos: [{ nombre: 'Meta', script: 'nivel2.chs' }] },
  };
  const scripts = {
    'nivel1.chs': 'cuando empieza:\n    juego.puntos = 10\n    mostrar(escena.nombre)\ncuando pasen 0.5 segundos:\n    escena.cambiar("Nivel2")',
    'nivel2.chs': 'cuando empieza:\n    mostrar(escena.nombre, juego.puntos)',
  };

  it('escena.cambiar() monta la otra escena; los datos de juego se conservan', () => {
    const j = juegoDePrueba({ scripts, escenas, escena: [{ nombre: 'Inicio', script: 'nivel1.chs' }] });
    j.avanzar(40);
    expect(j.salida).toEqual(['Principal', 'Nivel2 10']);
    expect(j.juego.escena.buscar('Inicio')).toBeNull();
    expect(j.motor.colorFondo).toBe('azul');
  });

  it('una escena que no existe se detecta antes de ejecutar', () => {
    const e = errorAlPreparar(() => juegoDePrueba({ scripts: { ...scripts, 'nivel1.chs': 'cuando empieza:\n    escena.cambiar("Nivel3")' }, escenas, escena: [{ nombre: 'Inicio', script: 'nivel1.chs' }] }));
    expect(e.message).toMatch(/no existe ninguna escena llamada "Nivel3"/);
  });

  it('escena.reiniciar() vuelve a montar la escena desde el principio', () => {
    const j = unObjeto('cuando empieza:\n    mostrar("empieza")\ncuando pasen 0.2 segundos:\n    escena.reiniciar()');
    j.avanzar(20);
    expect(j.salida).toEqual(['empieza', 'empieza']);
  });
});

describe('Guardar y cargar datos del jugador', () => {
  it('se guarda y se carga cualquier dato (con las tablas en su orden)', () => {
    const j = unObjeto(
      [
        'cuando empieza:',
        '    mostrar(cargar("record", 0))',
        '    guardar("record", 1500)',
        '    guardar("ficha", {nombre: "Ana", nivel: 3, pos: vector(1, 2), logros: ["a", "b"]})',
        '    mostrar(cargar("record", 0), cargar("ficha"))',
        '    borrarGuardado("record")',
        '    mostrar(cargar("record", "nada"))',
      ].join('\n'),
    );
    expect(j.salida).toEqual(['0', '1500 {nombre: "Ana", nivel: 3, pos: (1, 2), logros: ["a", "b"]}', 'nada']);
    expect([...j.almacen.keys()]).toEqual(['chispa:prueba-juego:ficha']);
  });

  it('los objetos del juego no se pueden guardar (error amable)', () => {
    expect(unObjeto('cuando empieza:\n    guardar("yo", yo)').errores[0].error.message).toMatch(/no se puede guardar el objeto 'Prueba'/);
  });
});

describe('Temporizadores y azar', () => {
  it('cuando pasen N segundos ocurre una sola vez', () => {
    const j = unObjeto('cuando pasen 0.5 segundos:\n    mostrar("ya")');
    j.avanzar(200);
    expect(j.salida).toEqual(['ya']);
  });

  it('elegir, probabilidad y aleatorio', () => {
    const j = unObjeto('cuando empieza:\n    mostrar(elegir(["solo"]), probabilidad(100), probabilidad(0), aleatorio(5, 5))');
    expect(j.salida).toEqual(['solo verdadero falso 5']);
  });
});

describe('Objetos: movimiento y propiedades iniciales', () => {
  it('moverHacia avanza sin pasarse y avisa al llegar; mirarA gira hacia el objetivo', () => {
    const j = juegoDePrueba({
      scripts: { 'e.chs': 'variable llegado = falso\ncuando cada fotograma:\n    si no llegado y yo.moverHacia(buscar("Meta"), 60):\n        llegado = verdadero\n        mostrar("llegué", yo.x)\n    yo.mirarA(buscar("Meta"))' },
      escena: [
        { nombre: 'E', x: 0, y: 0, script: 'e.chs' },
        { nombre: 'Meta', x: 0, y: 30 },
      ],
    });
    j.avanzar(40);
    expect(j.salida).toEqual(['llegué 0']);
    expect(j.buscar('E').transformacion.rotacion).toBeCloseTo(90);
  });

  it('las propiedades puestas en el editor llegan a Chispa (yo.vida)', () => {
    const j = unObjeto('cuando empieza:\n    mostrar(yo.vida, yo.nombreCompleto)', { propiedades: { vida: 3, nombreCompleto: 'Gatito' } });
    expect(j.salida).toEqual(['3 Gatito']);
  });
});

describe('Formato de proyecto', () => {
  it('un proyecto antiguo (v1) se convierte al formato nuevo', () => {
    const p = migrarProyecto({ formato: 'chispa-proyecto', version: 1, nombre: 'Viejo', colorFondo: 'rojo', escena: [{ nombre: 'A' }], scripts: {}, plantillas: {}, imagenes: {} });
    expect(p.version).toBe(VERSION_PROYECTO);
    expect(p.escenaInicial).toBe('Principal');
    expect(p.escenas.Principal.objetos[0].nombre).toBe('A');
    expect(p.escenas.Principal.colorFondo).toBe('rojo');
  });

  it('un archivo que no es de Chispa da un error amable', () => {
    expect(() => migrarProyecto({ hola: 1 })).toThrow(/no es un proyecto de Chispa/);
  });
});
