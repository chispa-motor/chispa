/**
 * TESTS DE LO QUE SE ARREGLÓ CON LA PRUEBA DE PRINCIPIANTE (bloque 3).
 * Cada test corresponde a un problema de PROBLEMAS_PRINCIPIANTE.md.
 */
import { describe, expect, it } from 'vitest';
import { ErrorCompilacion } from '../src/chispa/errores/ErrorChispa';
import { juegoDePrueba, unObjeto, type OpcionesJuegoPrueba } from './ayudantes';
import { tipoPorNombre } from '../src/proyecto/formato';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { Fisica } from '../src/objetos/componentes/Fisica';

/** Los errores de escritura (antes de ejecutar) de un juego. */
function erroresAlPreparar(opciones: OpcionesJuegoPrueba): ErrorCompilacion {
  try {
    juegoDePrueba(opciones);
  } catch (e) {
    if (e instanceof ErrorCompilacion) return e;
    throw e;
  }
  throw new Error('Se esperaba un error al preparar el juego.');
}

describe('Duplicar objetos: Moneda, Moneda2 y Moneda3 son del mismo tipo', () => {
  it('el tipo es el nombre sin los números del final', () => {
    expect(tipoPorNombre('Moneda2')).toBe('Moneda');
    expect(tipoPorNombre('Moneda')).toBe('Moneda');
    expect(tipoPorNombre('R2D2')).toBe('R2D');
    expect(tipoPorNombre('123')).toBe('123');
  });

  it('"cuando toco Moneda" funciona con las copias, y buscarTodos las encuentra todas', () => {
    const moneda = (nombre: string, x: number) => ({ nombre, x, y: 100, sprite: { ancho: 20, alto: 20 }, colision: { solido: false } });
    const j = juegoDePrueba({
      scripts: {
        'j.chs': 'cuando empieza:\n    mostrar(longitud(buscarTodos("Moneda")))\ncuando cada fotograma:\n    yo.x += 400 * delta\ncuando toco Moneda:\n    mostrar(otro.nombre)\n',
      },
      escena: [{ nombre: 'Jugador', x: 0, y: 100, sprite: { ancho: 20, alto: 20 }, colision: {}, script: 'j.chs' }, moneda('Moneda', 100), moneda('Moneda2', 200), moneda('Moneda3', 300)],
    });
    j.avanzar(60);
    expect(j.salida).toEqual(['3', 'Moneda', 'Moneda2', 'Moneda3']);
  });

  it('el análisis acepta "cuando toco Moneda" aunque solo haya una "Moneda2"', () => {
    expect(() =>
      juegoDePrueba({
        scripts: { 'j.chs': 'cuando toco Moneda:\n    destruir(otro)\n' },
        escena: [{ nombre: 'Jugador', script: 'j.chs' }, { nombre: 'Moneda2' }],
      }),
    ).not.toThrow();
  });
});

describe('yo.moverConFlechas(rapidez)', () => {
  it('en un juego de plataformas (con física y gravedad) solo mueve a los lados, y la imagen mira hacia donde anda', () => {
    const j = unObjeto('cuando cada fotograma:\n    yo.moverConFlechas(300)\n', { fisica: {}, colision: {}, y: 300 });
    j.pulsar('ArrowLeft', 'ArrowLeft');
    j.pulsar('ArrowUp', 'ArrowUp');
    j.avanzar(2);
    const o = j.buscar('Prueba');
    expect(o.obtener(Fisica)!.velocidad.x).toBe(-300);
    expect(o.obtener(Fisica)!.velocidad.y).toBeLessThan(0); // cae: la flecha arriba no le hace volar
    expect(o.obtener(Sprite)!.voltearX).toBe(true);
    j.soltar('ArrowLeft', 'ArrowLeft');
    j.avanzar(1);
    expect(o.obtener(Fisica)!.velocidad.x).toBe(0);
  });

  it('visto desde arriba (sin gravedad) va en las cuatro direcciones, y en diagonal no va más rápido', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: { 'p.chs': 'cuando cada fotograma:\n    yo.moverConFlechas(100)\n' },
      escena: [{ nombre: 'Prueba', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: {}, script: 'p.chs' }],
    });
    j.pulsar('KeyW', 'w');
    j.pulsar('KeyD', 'd');
    j.avanzar(2);
    const v = j.buscar('Prueba').obtener(Fisica)!.velocidad;
    // Igual de rápido en X que en Y, y más despacio que 100 en cada eje (100 es la rapidez total)
    expect(v.x).toBeCloseTo(v.y, 5);
    expect(v.x).toBeGreaterThan(50);
    expect(v.x).toBeLessThan(71);
  });

  it('sin física mueve la posición (una nave) en las cuatro direcciones', () => {
    const j = unObjeto('cuando cada fotograma:\n    yo.moverConFlechas(120)\n');
    j.pulsar('ArrowUp', 'ArrowUp');
    j.avanzar(60);
    expect(j.buscar('Prueba').posicion.y).toBeCloseTo(220, 0);
  });

  it('con física choca con las paredes', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: { 'p.chs': 'cuando cada fotograma:\n    yo.moverConFlechas(300)\n' },
      escena: [
        { nombre: 'Prueba', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: {}, script: 'p.chs' },
        { nombre: 'Pared', x: 200, y: 100, sprite: { ancho: 20, alto: 200 }, colision: {} },
      ],
    });
    j.pulsar('ArrowRight', 'ArrowRight');
    j.avanzar(60);
    expect(j.buscar('Prueba').posicion.x).toBeCloseTo(180, 0); // la pared empieza en 190 y el objeto mide 20
  });
});

describe('crear() y particulas() sin posición salen donde está el objeto', () => {
  it('crear("Bala") sale de la nave', () => {
    const j = juegoDePrueba({
      scripts: { 'n.chs': 'cuando empieza:\n    variable b = crear("Bala")\n    mostrar(b.x, b.y)\n' },
      plantillas: { Bala: { sprite: { ancho: 4, alto: 10 } } },
      escena: [{ nombre: 'Nave', x: 300, y: 50, script: 'n.chs' }],
    });
    expect(j.salida).toEqual(['300 50']);
  });

  it('particulas("explosion") sale en el objeto', () => {
    const j = unObjeto('cuando empieza:\n    particulas("explosion")\n');
    expect(j.errores).toEqual([]);
    expect(j.juego.escena.particulas.cantidad).toBeGreaterThan(0);
  });
});

describe('cuando salgo de la pantalla', () => {
  it('una bala que sube se borra al salir por arriba (una sola vez)', () => {
    const j = unObjeto('cuando cada fotograma:\n    yo.y += 600 * delta\ncuando salgo de la pantalla:\n    mostrar("fuera")\n    destruir(yo)\n', { y: 400 });
    j.avanzar(60);
    expect(j.salida).toEqual(['fuera']);
    expect(j.juego.escena.objetos.length).toBe(0);
  });

  it('un enemigo que aparece por encima no cuenta hasta que entra y vuelve a salir', () => {
    const j = unObjeto('cuando cada fotograma:\n    yo.y -= 300 * delta\ncuando salgo de la pantalla:\n    mostrar("fuera")\n', { y: 600 });
    j.avanzar(30);
    expect(j.salida).toEqual([]);
    j.avanzar(150);
    expect(j.salida).toEqual(['fuera']);
  });
});

describe('Pistas para quien empieza', () => {
  it('teclado.pulsada(derecha) sin comillas: pista para ponerlas', () => {
    const e = erroresAlPreparar({ scripts: { 'p.chs': 'cuando cada fotograma:\n    si teclado.pulsada(derecha):\n        yo.x += 1\n' }, escena: [{ nombre: 'P', script: 'p.chs' }] });
    expect(e.errores[0].pista).toContain('"derecha" entre comillas');
  });

  it('crear(Bala) sin comillas, con una plantilla Bala', () => {
    const e = erroresAlPreparar({ scripts: { 'p.chs': 'cuando empieza:\n    crear(Bala)\n' }, plantillas: { Bala: {} }, escena: [{ nombre: 'P', script: 'p.chs' }] });
    expect(e.errores[0].pista).toContain('"Bala" entre comillas');
  });
});

describe('Cámara', () => {
  const mapa = { nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 100, tipos: { suelo: { color: 'verde', solida: true } }, celdas: { '0,0': 'suelo', '19,9': 'suelo' } } };

  it('"no salir del mapa" (editor) pone los límites de la cámara en los mapas de la escena', () => {
    const j = juegoDePrueba({ escena: [mapa] });
    const e = j.juego.proyecto.escenas.Principal;
    e.camara = { limitarAlMapa: true };
    j.juego.cambiarEscena('Principal');
    j.avanzar(1);
    expect(j.juego.escena.camara.limites).toEqual({ izquierda: 0, abajo: 0, derecha: 2000, arriba: 1000 });
  });

  it('escena.camara.limites(buscar("Mapa")) hace lo mismo desde el código, y sin nada los quita', () => {
    const j = juegoDePrueba({
      scripts: { 'c.chs': 'cuando empieza:\n    escena.camara.limites(buscar("Mapa"))\ncuando pasen 1 segundos:\n    escena.camara.limites()\n' },
      escena: [mapa, { nombre: 'C', script: 'c.chs' }],
    });
    expect(j.juego.escena.camara.limites).toEqual({ izquierda: 0, abajo: 0, derecha: 2000, arriba: 1000 });
    j.avanzar(70);
    expect(j.juego.escena.camara.limites).toBeNull();
  });

  it('al cambiar de escena, la cámara no conserva el zoom de la anterior', () => {
    const j = juegoDePrueba({
      scripts: { 'c.chs': 'cuando empieza:\n    escena.camara.zoom = 3\ncuando pasen 0.1 segundos:\n    escena.cambiar("Otra")\n' },
      escena: [{ nombre: 'C', script: 'c.chs' }],
      escenas: { Otra: { colorFondo: 'negro', objetos: [] } },
    });
    expect(j.juego.escena.camara.zoom).toBe(3);
    j.avanzar(20);
    expect(j.juego.nombreEscena).toBe('Otra');
    expect(j.juego.escena.camara.zoom).toBe(1);
  });
});
