/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * API COMPLETA (noche, bloque 0): los comandos nuevos, uno por uno.
 * Cada `describe` es un grupo de API_QUE_FALTA.md.
 */
import { describe, expect, it } from 'vitest';
import { errorDe, juegoDePrueba, mostrado, unObjeto } from './ayudantes';
import { ruido } from '../src/chispa/api/basicas';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { Fisica } from '../src/objetos/componentes/Fisica';
import { SUAVIZADOS } from '../src/objetos/AnimadorDeValores';
import { revisarScript } from '../src/proyecto/Revision';
import { proyectoVacio } from '../src/proyecto/formato';
import type { DefObjeto } from '../src/proyecto/formato';

const cuadrado = (nombre: string, x: number, y: number, extra: Partial<DefObjeto> = {}): DefObjeto => ({ nombre, x, y, sprite: { ancho: 20, alto: 20 }, colision: {}, ...extra });
const sprite = (j: ReturnType<typeof juegoDePrueba>, n: string) => j.buscar(n).obtener(Sprite)!;

describe('Matemáticas', () => {
  it('limitar, interpolar, redondear hacia abajo y arriba, signo, potencia, tangente, pi', () => {
    expect(mostrado('mostrar(limitar(150, 0, 100), limitar(-5, 0, 100), limitar(50, 0, 100))')).toBe('100 0 50');
    expect(mostrado('mostrar(interpolar(0, 100, 0.25), interpolar(vector(0, 0), vector(10, 20), 0.5))')).toBe('25 (5, 10)');
    expect(mostrado('mostrar(redondearAbajo(3.9), redondearArriba(3.1), redondearAbajo(-1.5))')).toBe('3 4 -2');
    expect(mostrado('mostrar(signo(-5), signo(0), signo(8), potencia(2, 10))')).toBe('-1 0 1 1024');
    expect(mostrado('mostrar(redondear(tangente(45), 3), redondear(pi, 2))')).toBe('1 3.14');
  });

  it('aleatorioDecimal da decimales dentro del rango', () => {
    const valores = mostrado('repetir 200 veces:\n    mostrar(aleatorioDecimal(0.5, 1.5))').split(' | ').map(Number);
    expect(valores.every((v) => v >= 0.5 && v <= 1.5)).toBe(true);
    expect(valores.some((v) => !Number.isInteger(v))).toBe(true);
  });

  it('ruido: entre 0 y 1, siempre igual para el mismo punto, y suave', () => {
    for (let x = 0; x < 20; x += 0.37) {
      const v = ruido(x, 0);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(ruido(x, 0)).toBe(v);
      expect(Math.abs(ruido(x + 0.01, 0) - v)).toBeLessThan(0.05);
    }
    expect(mostrado('mostrar(ruido(1.5) == ruido(1.5))')).toBe('verdadero');
  });

  it('errores claros', () => {
    expect(errorDe('mostrar(limitar(5, 10, 0))').message).toMatch(/el mínimo \(10\) es mayor que el máximo \(0\)/);
    expect(errorDe('mostrar(interpolar("a", 1, 0.5))').message).toMatch(/dos números \(o dos vectores\)/);
    expect(errorDe('mostrar(aleatorioDecimal(5, 1))').message).toMatch(/el primer número es mayor/);
  });
});

describe('Textos', () => {
  it('dividir, reemplazar, contiene, empieza y termina, recortar, trozo, posicion', () => {
    expect(mostrado('mostrar("hola que tal".dividir())')).toBe('["hola", "que", "tal"]');
    expect(mostrado('mostrar("a,b,c".dividir(","), "sol".dividir(""))')).toBe('["a", "b", "c"] ["s", "o", "l"]');
    expect(mostrado('mostrar("el gato y el gato".reemplazar("gato", "perro"))')).toBe('el perro y el perro');
    expect(mostrado('mostrar("hola".contiene("ol"), "Dr Pepe".empiezaPor("Dr"), "gatos".terminaPor("s"))')).toBe('verdadero verdadero verdadero');
    expect(mostrado('mostrar("[" + "  hola  ".recortar() + "]")')).toBe('[hola]');
    expect(mostrado('mostrar("Chispa".trozo(1, 3), "Chispa".trozo(4), "niño".trozo(3, 4))')).toBe('Chi spa ño');
    expect(mostrado('mostrar("hola mundo".posicion("mundo"), "hola".posicion("x"))')).toBe('6 0');
  });

  it('texto con decimales y unir', () => {
    expect(mostrado('mostrar(texto(3.14159, 2), texto(2.5, 2), texto(7, 0))')).toBe('3.14 2.50 7');
    expect(mostrado('mostrar(unir(["a", 1, verdadero]), unir(["x", "y"], "-"))')).toBe('a, 1, verdadero x-y');
  });

  it('errores claros', () => {
    expect(errorDe('mostrar("hola".trozo(0, 2))').message).toMatch(/la posición 0 no existe: van de 1 a 4/);
    expect(errorDe('mostrar("hola".contiene(3))').message).toMatch(/'contiene' necesita un texto/);
    expect(errorDe('mostrar("hola".saltar())').pista).toMatch(/dividir, reemplazar/);
  });
});

describe('Listas', () => {
  it('insertar, ordenar, mezclar, invertir, posicion, contiene, sublista, unir, vaciar, primero y ultimo', () => {
    expect(mostrado('variable l = [2, 3]\nl.insertar(1, 1)\nl.insertar(4, 4)\nmostrar(l)')).toBe('[1, 2, 3, 4]');
    expect(mostrado('mostrar([3, 1, 2].ordenar(), ["pera", "Árbol", "uva"].ordenar())')).toBe('[1, 2, 3] ["Árbol", "pera", "uva"]');
    expect(mostrado('variable l = [1, 2, 3, 4, 5]\nl.mezclar()\nmostrar(longitud(l), l.contiene(3))')).toBe('5 verdadero');
    expect(mostrado('mostrar([1, 2, 3].invertir(), ["a", "b"].posicion("b"), ["a"].posicion("z"))')).toBe('[3, 2, 1] 2 0');
    expect(mostrado('mostrar([1, 2, 3, 4].sublista(2, 3), [1, 2, 3].sublista(2), ["a", "b"].unir(" y "))')).toBe('[2, 3] [2, 3] a y b');
    expect(mostrado('variable l = [1, 2]\nmostrar(l.primero, l.ultimo)\nl.vaciar()\nmostrar(longitud(l), l.primero)')).toBe('1 2 | 0 nulo');
  });

  it('recorrer con posición: para cada posicion, valor en lista (y en textos)', () => {
    expect(mostrado('para cada i, nombre en ["Ana", "Luis"]:\n    mostrar(i, nombre)')).toBe('1 Ana | 2 Luis');
    expect(mostrado('para cada i, letra en "sol":\n    mostrar(i, letra)')).toBe('1 s | 2 o | 3 l');
  });

  it('errores claros', () => {
    expect(errorDe('mostrar([1, "a"].ordenar())').message).toMatch(/no puedo ordenar esta lista: mezcla un (número|texto) y un (texto|número)/);
    expect(errorDe('variable l = [1]\nl.insertar(3, 5)').message).toMatch(/la posición 3 no existe: van de 1 a 2/);
    expect(errorDe('mostrar([1].saltar())').pista).toMatch(/insertar, ordenar/);
  });
});

describe('animar(): cambiar valores poco a poco', () => {
  it('un número llega a su valor en el tiempo pedido, con el suavizado pedido', () => {
    const j = unObjeto('cuando empieza:\n    animar(yo.x, 200, 1, "lineal")', { x: 100 });
    j.avanzar(30);
    expect(j.buscar('Prueba').posicion.x).toBeCloseTo(150, 0);
    j.avanzar(40);
    expect(j.buscar('Prueba').posicion.x).toBe(200);
  });

  it('yo.tamano en un cuadrado es su tamaño (escala); en un texto, la letra', () => {
    const j = unObjeto('cuando empieza:\n    animar(yo.tamano, 2, 0.5)');
    j.avanzar(40);
    expect(j.buscar('Prueba').transformacion.escala.x).toBe(2);
    const t = unObjeto('cuando empieza:\n    yo.tamano = 40', { sprite: { forma: 'texto', texto: 'hola' } });
    t.avanzar(1);
    expect(sprite(t, 'Prueba').tamano).toBe(40);
    expect(t.buscar('Prueba').transformacion.escala.x).toBe(1);
  });

  it('colores, rotación, opacidad y la cámara', () => {
    const j = unObjeto('cuando empieza:\n    yo.color = "negro"\n    animar(yo.color, "blanco", 1, "lineal")\n    animar(yo.rotacion, 90, 1)\n    animar(yo.opacidad, 0, 1)\n    animar(escena.camara.zoom, 2, 1)');
    j.avanzar(30);
    expect(sprite(j, 'Prueba').color).toMatch(/^#7[f-f0-9]7[0-9a-f]7[0-9a-f]$/);
    j.avanzar(40);
    // Al acabar queda EXACTAMENTE el valor pedido (el nombre del color, no un código)
    expect(sprite(j, 'Prueba').color).toBe('blanco');
    expect(j.buscar('Prueba').transformacion.rotacion).toBe(90);
    expect(sprite(j, 'Prueba').opacidad).toBe(0);
    expect(j.juego.escena.camara.zoom).toBe(2);
  });

  it('una variable del script también se puede animar; una animación nueva del mismo sitio sustituye a la vieja', () => {
    const j = unObjeto('variable v = 0\ncuando empieza:\n    animar(v, 100, 1, "lineal")\n    esperar(0.5)\n    animar(v, 0, 0.5, "lineal")\ncuando cada fotograma:\n    yo.x = v');
    j.avanzar(30);
    expect(j.buscar('Prueba').posicion.x).toBeGreaterThan(40);
    j.avanzar(45);
    expect(j.buscar('Prueba').posicion.x).toBe(0);
  });

  it('si el objeto se destruye, su animación se acaba sin errores', () => {
    const j = unObjeto('cuando empieza:\n    animar(yo.x, 500, 1)\n    esperar(0.2)\n    yo.destruir()');
    j.avanzar(90);
    expect(j.errores).toEqual([]);
    expect(j.juego.escena.animaciones.cuantas).toBe(0);
  });

  it('todos los suavizados empiezan en 0 y acaban en 1', () => {
    for (const [nombre, f] of Object.entries(SUAVIZADOS)) {
      expect(f(0), nombre).toBeCloseTo(0, 5);
      expect(f(1), nombre).toBeCloseTo(1, 5);
    }
  });

  it('animar(5, ...) se avisa antes de jugar', () => {
    const d = revisarScript('p.chs', 'cuando empieza:\n    animar(5, 10, 1)', proyectoVacio());
    expect(d[0].mensaje).toMatch(/necesita saber QUÉ tiene que cambiar/);
    expect(revisarScript('p.chs', 'cuando empieza:\n    animar(yo.x, 10, 1)', proyectoVacio())).toEqual([]);
  });

  it('errores claros: sin sitio, suavizado mal escrito, tipos que no encajan', () => {
    const e2 = unObjeto('cuando empieza:\n    animar(yo.x, 10, 1, "rebot")');
    expect(e2.errores[0].error.pista).toMatch(/¿Querías decir "rebote"\?/);
    const e3 = unObjeto('cuando empieza:\n    animar(yo.x, "rojo", 1)');
    expect(e3.errores[0].error.message).toMatch(/no puedo animar 'yo.x'/);
    const e4 = unObjeto('cuando empieza:\n    animar(yo.color, "rojoo", 1)');
    expect(e4.errores[0].error.message).toMatch(/no conozco el color "rojoo"/);
    const e5 = unObjeto('cuando empieza:\n    animar(yo.x)');
    expect(e5.errores[0].error.message).toMatch(/le falta hasta dónde/);
  });
});

describe('Movimiento', () => {
  it('irA llega suavemente; teletransportar va de golpe y sin velocidad', () => {
    const j = unObjeto('cuando empieza:\n    yo.irA(400, 300, 1)', { x: 0, y: 0 });
    j.avanzar(30);
    const medio = j.buscar('Prueba').posicion.x;
    expect(medio).toBeGreaterThan(100);
    expect(medio).toBeLessThan(300);
    j.avanzar(40);
    expect([j.buscar('Prueba').posicion.x, j.buscar('Prueba').posicion.y]).toEqual([400, 300]);
    const t = unObjeto('cuando empieza:\n    yo.velocidad = vector(500, 0)\n    yo.teletransportar(vector(50, 60))', { fisica: { gravedad: 0 } });
    t.avanzar(1);
    expect(t.buscar('Prueba').posicion.x).toBeCloseTo(50, 5);
    expect(t.buscar('Prueba').obtener(Fisica)!.velocidad.x).toBe(0);
  });

  it('anguloA, rotarHacia (poco a poco), avanzar y distanciaA con posiciones', () => {
    const j = juegoDePrueba({
      scripts: { 'p.chs': 'cuando empieza:\n    mostrar(redondear(yo.anguloA(buscar("Meta"))), yo.distanciaA(100, 0), redondear(angulo(yo, buscar("Meta"))))\ncuando cada fotograma:\n    yo.rotarHacia(buscar("Meta"), 90)' },
      escena: [{ nombre: 'Yo', x: 0, y: 0, script: 'p.chs' }, { nombre: 'Meta', x: 0, y: 100 }],
    });
    j.avanzar(1);
    expect(j.salida[0]).toBe('90 100 90');
    j.avanzar(29);
    expect(j.buscar('Yo').transformacion.rotacion).toBeCloseTo(45, 0);
    j.avanzar(60);
    expect(j.buscar('Yo').transformacion.rotacion).toBeCloseTo(90, 5);
    const a = unObjeto('cuando empieza:\n    yo.rotacion = 90\n    yo.avanzar(10)', { x: 0, y: 0 });
    a.avanzar(1);
    expect(a.buscar('Prueba').posicion.y).toBeCloseTo(10, 5);
  });
});

describe('Apariencia', () => {
  it('ocultar, aparecer, transparencia, voltearVertical, tamanoLetra', () => {
    const j = unObjeto('cuando empieza:\n    yo.ocultar()\n    mostrar(yo.visible)\n    yo.aparecer()\n    yo.transparencia = 0.25\n    yo.voltearVertical = verdadero\n    yo.tamanoLetra = 30\n    mostrar(yo.visible, yo.opacidad, yo.voltearVertical)');
    j.avanzar(1);
    expect(j.salida).toEqual(['falso', 'verdadero 0.75 verdadero']);
    expect(sprite(j, 'Prueba').tamano).toBe(30);
  });

  it('parpadear se apaga y se enciende, y al final se queda visible', () => {
    const j = unObjeto('cuando empieza:\n    yo.parpadear(1, 4)');
    const vistos = new Set<boolean>();
    for (let i = 0; i < 50; i++) {
      j.avanzar(1);
      vistos.add(sprite(j, 'Prueba').visible);
    }
    expect(vistos).toEqual(new Set([true, false]));
    j.avanzar(30);
    expect(sprite(j, 'Prueba').visible).toBe(true);
  });

  it('ponerDelante y ponerDetras cambian la capa respecto a los demás', () => {
    const j = juegoDePrueba({
      scripts: { 'a.chs': 'cuando empieza:\n    yo.ponerDelante()', 'b.chs': 'cuando empieza:\n    yo.ponerDetras()' },
      escena: [cuadrado('A', 0, 0, { script: 'a.chs' }), cuadrado('B', 0, 0, { script: 'b.chs', sprite: { capa: 5 } }), cuadrado('C', 0, 0, { sprite: { capa: 3 } })],
    });
    j.avanzar(1);
    // A se pone por encima de todos; B, por debajo de todos (también de C, que estaba en la 3)
    expect(sprite(j, 'A').capa).toBeGreaterThan(5);
    expect(sprite(j, 'B').capa).toBeLessThan(3);
  });
});

describe('Colisiones y objetos cercanos', () => {
  const escena = () => juegoDePrueba({
    scripts: {
      'p.chs': 'cuando empieza:\n    mostrar(yo.tocando("Lava"), yo.tocando("Agua"), yo.tocando(), yo.tocando("peligro"))\n    variable c = yo.cercanos(150)\n    mostrar(longitud(c), c[1].nombre, yo.masCercano("Moneda").nombre, yo.masCercano("Moneda", 10), yo.masCercano("Nada"))',
      'l.chs': 'cuando empieza:\n    yo.ponerEtiqueta("peligro")',
    },
    escena: [
      cuadrado('Lava', 15, 0, { script: 'l.chs' }),
      cuadrado('Yo', 0, 0, { script: 'p.chs' }),
      cuadrado('Agua', 500, 0),
      cuadrado('Moneda', 100, 0, { colision: undefined }),
      cuadrado('Moneda2', 300, 0),
    ],
  });

  it('tocando, cercanos y masCercano', () => {
    const j = escena();
    j.avanzar(1);
    expect(j.salida).toEqual(['verdadero falso verdadero verdadero', '2 Lava Moneda nulo nulo']);
  });

  it('tocando un tipo de casilla de un mapa', () => {
    const j = juegoDePrueba({
      scripts: { 'p.chs': 'cuando empieza:\n    mostrar(yo.tocando("pinchos"), yo.tocando("hielo"))' },
      escena: [
        cuadrado('Yo', 24, 60, { script: 'p.chs' }),
        { nombre: 'Mapa', mapa: { tamano: 48, tipos: { pinchos: { solida: false }, hielo: { solida: true } }, celdas: { '0,1': 'pinchos', '5,0': 'hielo' } } },
      ],
    });
    j.avanzar(1);
    expect(j.salida).toEqual(['verdadero falso']);
  });
});

describe('Objetos: clonar, contar, etiquetas, padre e hijos', () => {
  it('clonar copia cómo está ahora (color, sitio, propiedades) y su script empieza otra vez', () => {
    const j = juegoDePrueba({
      scripts: { 'p.chs': 'cuando empieza:\n    mostrar("empiezo", yo.vida)\ncuando se pulsa "c":\n    yo.color = "rojo"\n    yo.vida = 7\n    variable c = yo.clonar()\n    c.x += 100' },
      escena: [cuadrado('Oveja', 10, 20, { script: 'p.chs', propiedades: { vida: 3 } })],
    });
    j.avanzar(1);
    j.pulsar('KeyC', 'c');
    j.avanzar(2);
    const ovejas = j.juego.escena.buscarTodos('Oveja');
    expect(ovejas).toHaveLength(2);
    expect(ovejas[1].posicion.x).toBe(110);
    expect(ovejas[1].obtener(Sprite)!.color).toBe('rojo');
    expect(j.salida).toEqual(['empiezo 3', 'empiezo 7']);
  });

  it('contar y buscarConEtiqueta; cuando toco también entiende etiquetas', () => {
    const j = juegoDePrueba({
      scripts: {
        'e.chs': 'cuando empieza:\n    yo.ponerEtiqueta("Peligro")',
        'j.chs': 'cuando empieza:\n    esperar(0.05)\n    mostrar(contar("Enemigo"), longitud(buscarConEtiqueta("peligro")), buscar("Enemigo").tieneEtiqueta("PELIGRO"), buscar("Enemigo").etiquetas)\n    buscar("Enemigo2").quitarEtiqueta("peligro")\n    mostrar(longitud(buscarConEtiqueta("peligro")))\ncuando toco peligro:\n    mostrar("ay")',
      },
      escena: [cuadrado('Enemigo', 300, 0, { script: 'e.chs' }), cuadrado('Enemigo2', 600, 0, { script: 'e.chs' }), cuadrado('Jugador', 0, 0, { script: 'j.chs', fisica: { gravedad: 0 } })],
    });
    j.avanzar(10);
    expect(j.salida).toEqual(['2 2 verdadero ["Peligro"]', '1']);
    j.buscar('Jugador').posicion.x = 295;
    j.avanzar(3);
    expect(j.salida).toContain('ay');
  });

  it('pegarA: el hijo se mueve con el padre, se suelta con soltar(), y muere con él', () => {
    const j = juegoDePrueba({
      scripts: { 'e.chs': 'cuando empieza:\n    yo.pegarA(buscar("Jugador"))\n    mostrar(yo.padre.nombre, longitud(buscar("Jugador").hijos))' },
      escena: [cuadrado('Jugador', 0, 0), cuadrado('Espada', 30, 0, { script: 'e.chs' })],
    });
    j.avanzar(1);
    expect(j.salida).toEqual(['Jugador 1']);
    j.buscar('Jugador').posicion.x = 100;
    j.avanzar(1);
    expect(j.buscar('Espada').posicion.x).toBe(130);
    j.buscar('Jugador').destruir();
    j.avanzar(2);
    expect(j.juego.escena.buscar('Espada')).toBeNull();
  });

  it('errores al pegar: a sí mismo y en bucle', () => {
    const a = unObjeto('cuando empieza:\n    yo.pegarA(yo)');
    expect(a.errores[0].error.message).toMatch(/no se puede pegar a sí mismo/);
    const b = juegoDePrueba({
      scripts: { 'p.chs': 'cuando empieza:\n    buscar("B").pegarA(yo)\n    yo.pegarA(buscar("B"))' },
      escena: [cuadrado('A', 0, 0, { script: 'p.chs' }), cuadrado('B', 0, 0)],
    });
    expect(b.errores[0].error.message).toMatch(/ya va pegado a 'A'/);
  });
});

describe('Entrada: teclas, ratón y arrastrar', () => {
  it('teclado.ultima, algunaSePulso y pulsadas', () => {
    const j = unObjeto('cuando cada fotograma:\n    si teclado.algunaSePulso():\n        mostrar(teclado.ultima, teclado.pulsadas)');
    j.avanzar(1);
    j.pulsar('KeyA', 'a');
    j.avanzar(1);
    j.avanzar(1);
    expect(j.salida).toEqual(['a ["a"]']);
  });

  it('raton.objeto: el de más arriba debajo del ratón', () => {
    const j = juegoDePrueba({
      scripts: { 'p.chs': 'cuando cada fotograma:\n    si raton.objeto != nulo:\n        mostrar(raton.objeto.nombre)' },
      escena: [cuadrado('Abajo', 100, 440, { sprite: { ancho: 40, alto: 40, capa: 0 } }), cuadrado('Arriba', 100, 440, { script: 'p.chs', sprite: { ancho: 40, alto: 40, capa: 2 } })],
    });
    j.entrada.posicionRaton.x = 100;
    j.entrada.posicionRaton.y = 100; // en la pantalla la Y va hacia abajo: 540 - 100 = 440 en el mundo
    j.avanzar(1);
    expect(j.salida).toEqual(['Arriba']);
  });

  it('un objeto arrastrable se coge con el ratón y se lleva', () => {
    const j = unObjeto('cuando empieza:\n    yo.arrastrable = verdadero\ncuando cada fotograma:\n    si yo.arrastrando:\n        mostrar("llevando")', { x: 100, y: 440, sprite: { ancho: 40, alto: 40 } });
    j.avanzar(1);
    j.entrada.posicionRaton.x = 105;
    j.entrada.posicionRaton.y = 100;
    (j.entrada as unknown as { botonesAbajo: Set<string>; botonesPulsados: Set<string> }).botonesAbajo.add('izquierdo');
    (j.entrada as unknown as { botonesPulsados: Set<string> }).botonesPulsados.add('izquierdo');
    j.avanzar(1);
    j.entrada.posicionRaton.x = 305;
    j.entrada.posicionRaton.y = 200;
    j.avanzar(1);
    expect(j.buscar('Prueba').posicion.x).toBe(300);
    expect(j.buscar('Prueba').posicion.y).toBe(340);
    expect(j.salida).toContain('llevando');
  });
});

describe('Efectos: pausa, cámara lenta, fundidos', () => {
  it('tiempo.pausar para el tiempo del juego (y los cronómetros); tiempo.seguir lo devuelve', () => {
    const j = unObjeto('variable crono = cronometro()\ncuando se pulsa "p":\n    tiempo.pausar()\ncuando se pulsa "s":\n    tiempo.seguir()\ncuando se pulsa "m":\n    mostrar(tiempo.pausado, redondear(crono.segundos, 1))');
    j.avanzar(60);
    j.pulsar('KeyP', 'p');
    j.avanzar(60);
    j.pulsar('KeyM', 'm');
    j.avanzar(1);
    j.pulsar('KeyS', 's');
    j.avanzar(1);
    j.pulsar('KeyM', 'm');
    j.avanzar(1);
    expect(j.salida[0]).toBe('verdadero 1');
    expect(j.salida[1]).toMatch(/^falso 1/);
  });

  it('tiempo.camaraLenta y vuelve sola', () => {
    const j = unObjeto('cuando empieza:\n    tiempo.camaraLenta(0.25, 0.5)');
    j.avanzar(1);
    expect(j.juego.motor.tiempo.escala).toBe(0.25);
    j.avanzar(35);
    expect(j.juego.motor.tiempo.escala).toBe(1);
  });

  it('pantalla.oscurecer y aclarar; escena.cambiar con fundido', () => {
    const j = juegoDePrueba({
      scripts: { 'p.chs': 'cuando empieza:\n    pantalla.oscurecer(1)\ncuando se pulsa "a":\n    pantalla.aclarar(0.5)\ncuando se pulsa "c":\n    escena.cambiar("Otra", 1)' },
      escena: [{ nombre: 'P', script: 'p.chs' }],
      escenas: { Otra: { colorFondo: 'azul', objetos: [{ nombre: 'Q' }] } },
    });
    const f = j.juego.escena.fundido;
    j.avanzar(30);
    expect(f.alfa).toBeCloseTo(0.5, 1);
    j.avanzar(40);
    expect(f.alfa).toBe(1);
    j.pulsar('KeyA', 'a');
    j.avanzar(35);
    expect(f.alfa).toBe(0);
    // Cambio con fundido: medio segundo oscureciendo, cambia, medio segundo aclarando
    j.pulsar('KeyC', 'c');
    j.avanzar(10);
    expect(j.juego.nombreEscena).toBe('Principal');
    expect(f.alfa).toBeGreaterThan(0.2);
    j.avanzar(30);
    expect(j.juego.nombreEscena).toBe('Otra');
    expect(f.alfa).toBeGreaterThan(0.5);
    j.avanzar(40);
    expect(f.alfa).toBe(0);
  });

  it('escena.colorFondo', () => {
    const j = unObjeto('cuando empieza:\n    escena.colorFondo = "azul"\n    mostrar(escena.colorFondo)');
    j.avanzar(1);
    expect(j.salida).toEqual(['azul']);
    expect(unObjeto('cuando empieza:\n    escena.colorFondo = "azull"').errores[0].error.message).toMatch(/no conozco el color/);
  });
});

describe('Sonido y música', () => {
  const conSonidos = (codigo: string) => juegoDePrueba({ scripts: { 'p.chs': codigo }, escena: [{ nombre: 'P', script: 'p.chs' }], sonidos: { salto: 'x', motor: 'x', tema: 'x' } });

  it('volumen y tono al reproducir, bucle, sonando y parar', () => {
    const j = conSonidos('cuando empieza:\n    sonido.reproducir("salto", 0.5, 1.5)\n    sonido.bucle("motor")\n    mostrar(sonido.sonando("motor"))\n    sonido.parar("motor")\n    mostrar(sonido.sonando("motor"))');
    j.avanzar(1);
    expect(j.juego.motor.sonido.historial).toEqual(expect.arrayContaining(['reproducir salto volumen 0.5 tono 1.5', 'bucle motor']));
    expect(j.salida).toEqual(['verdadero', 'falso']);
  });

  it('música con fundido, pausar y seguir', () => {
    const j = conSonidos('cuando empieza:\n    musica.reproducir("tema", 2)\n    musica.pausar()\n    musica.seguir()\n    musica.parar(1)');
    j.avanzar(1);
    expect(j.juego.motor.sonido.historial).toEqual(['musica tema fundido 2', 'pausar musica', 'seguir musica', 'parar musica fundido 1']);
  });

  it('errores: tono 0 y sonidos que no existen (antes de jugar)', () => {
    expect(conSonidos('cuando empieza:\n    sonido.reproducir("salto", 1, 0)').errores[0].error.message).toMatch(/el tono tiene que ser mayor que 0/);
    const p = proyectoVacio();
    p.sonidos = { salto: 'x' };
    const d = revisarScript('p.chs', 'cuando empieza:\n    sonido.bucle("sato")', p);
    expect(d[0].pista).toMatch(/¿Querías decir "salto"\?/);
  });
});

describe('Dibujar para depurar', () => {
  it('líneas, círculos, rectángulos y textos: se dibujan un fotograma', () => {
    const j = unObjeto('cuando cada fotograma:\n    dibujar.linea(0, 0, 10, 10)\n    dibujar.circulo(5, 5, 20, "verde", verdadero)\n    dibujar.rectangulo(0, 0, 10, 10, "azul")\n    dibujar.texto("hola", 0, 0)');
    j.avanzar(1);
    expect(j.juego.escena.dibujos.map((d) => d.tipo)).toEqual(['linea', 'circulo', 'rectangulo', 'texto']);
    expect(j.juego.escena.dibujos[1]).toMatchObject({ color: 'verde', relleno: true, radio: 20 });
    expect(j.juego.escena.dibujos[0]).toMatchObject({ color: 'rojo' });
    expect(unObjeto('cuando empieza:\n    dibujar.linea(0, 0, 1, 1, "rojoo")').errores[0].error.message).toMatch(/no conozco el color "rojoo"/);
  });
});

describe('Cronómetros y sistema', () => {
  it('un cronómetro cuenta, se pausa y se reinicia', () => {
    const j = unObjeto('variable c = cronometro()\ncuando pasen 1 segundos:\n    mostrar(redondear(c.segundos, 1))\n    c.pausar()\ncuando pasen 2 segundos:\n    mostrar(redondear(c.segundos, 1), c.pausado)\n    c.reiniciar()\n    mostrar(c.segundos)');
    j.avanzar(130);
    expect(j.salida).toEqual(['1', '1 verdadero', '0']);
    expect(unObjeto('cuando empieza:\n    variable c = cronometro()\n    mostrar(c.segundoss)').errores[0].error.pista).toMatch(/segundos/);
  });

  it('sistema.movil y abrirWeb (solo direcciones web)', () => {
    const j = unObjeto('cuando empieza:\n    mostrar(sistema.movil)');
    j.avanzar(1);
    expect(['verdadero', 'falso']).toContain(j.salida[0]);
    expect(unObjeto('cuando empieza:\n    sistema.abrirWeb("itch.io")').errores[0].error.message).toMatch(/tiene que empezar por https/);
  });
});
