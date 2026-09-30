/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * TESTS DE LA 3C: errores increíbles.
 * Cada test es un error que antes no se entendía (o no salía) y ahora sí.
 */
import { describe, expect, it } from 'vitest';
import { avisosDe, errorDe, juegoDePrueba, unObjeto } from './ayudantes';
import { ErrorChispa, ErrorCompilacion, formatearDiagnostico } from '../src/chispa/errores/ErrorChispa';

/** Monta un juego que debería fallar ANTES de empezar y devuelve el error. */
function errorAlPreparar(montar: () => unknown): ErrorChispa {
  try {
    montar();
  } catch (e) {
    if (e instanceof ErrorChispa) return e;
    throw e;
  }
  throw new Error('Se esperaba un error al preparar el juego');
}
import { analizarSintaxis } from '../src/chispa/sintaxis/parser';

describe('Varios errores de escritura a la vez', () => {
  it('se enseñan todos, uno por línea', () => {
    const { errores } = analizarSintaxis('si 1 > 0\n    mostrar(1)\nmientas verdadero:\n    romper\nvariable = 3\nmostrar("fin")', 'a.chs');
    expect(errores.map((e) => e.linea)).toEqual([1, 3, 5]);
  });

  it("un ':' olvidado no provoca errores falsos en las líneas de debajo", () => {
    const { errores } = analizarSintaxis('si 1 > 0\n    mostrar(1)\n    mostrar(2)\nmostrar(3)', 'a.chs');
    expect(errores).toHaveLength(1);
  });

  it('compilar() lanza un ErrorCompilacion con la lista completa', () => {
    const e = errorDe('mostrar("a" 3)\nvariable x == 3');
    expect(e).toBeInstanceOf(ErrorCompilacion);
    expect((e as ErrorCompilacion).errores).toHaveLength(2);
  });

  it('también junta errores del lexer y del parser', () => {
    const { errores } = analizarSintaxis('mostrar("hola)\nsi verdadero\n    mostrar(1)\nmostrar(¡)', 'a.chs');
    expect(errores.map((e) => e.linea)).toEqual([1, 2, 4]);
  });
});

describe('¿Querías decir...?', () => {
  it.each([
    ['variable vida = 3\nmientas vida > 0:\n    vida -= 1', "has escrito 'mientas'", "¿Querías decir 'mientras'?"],
    ['fucnion saltar():\n    mostrar(1)', "has escrito 'fucnion'", "¿Querías decir 'funcion'?"],
    ['varible x = 3', "has escrito 'varible'", "¿Querías decir 'variable'?"],
    ['si verdadero:\n    mostrar(1)\nsin:\n    mostrar(2)', "has escrito 'sin'", "¿Querías decir 'sino'?"],
  ])('palabra clave mal escrita: %s', (codigo, mensaje, pista) => {
    const e = errorDe(codigo);
    expect(e.message).toContain(mensaje);
    expect(e.pista).toBe(pista);
  });

  it.each([
    ['si 1 > 0:\n    mostrar(1)\nelif 2 > 1:\n    mostrar(2)', 'sino si'],
    ['print("hola")', 'mostrar(...)'],
    ['variable x = True', 'verdadero'],
  ])('palabras de otros lenguajes: %s', (codigo, equivalente) => {
    expect(errorDe(codigo).pista).toContain(`En Chispa se escribe: ${equivalente}`);
  });

  it('funciones de la API mal escritas', () => {
    expect(errorDe('mostar("hola")').pista).toBe("¿Querías decir 'mostrar'?");
  });

  it('nunca sugiere la forma con tilde (raíz → raiz)', () => {
    expect(errorDe('mostrar(raizz(4))').pista).toBe("¿Querías decir 'raiz'?");
    expect(errorDe('mostrar(numro("3"))').pista).toBe("¿Querías decir 'numero'?");
  });

  it('si no hay nada parecido, enumera las variables que sí existen', () => {
    const e = errorDe('variable jugador = 1\nvariable puntos = 2\nvariable vida = 3\nmostrar(enemigo)');
    expect(e.message).toBe("Línea 4: intentas usar 'enemigo', pero no existe ninguna variable con ese nombre.");
    expect(e.pista).toMatch(/Las variables que sí existen aquí son: jugador, puntos y vida\./);
  });

  it('cambiar la propiedad de algo que no existe (el ejemplo de la especificación)', () => {
    const e = errorDe('enemigo.vida = enemigo.vida - 10');
    expect(e.message).toBe("Línea 1: intentas cambiar 'vida' de 'enemigo', pero 'enemigo' no existe.");
    expect(e.pista).toBe('¿Lo has creado antes o está bien escrito el nombre?');
  });

  it('eventos mal escritos', () => {
    expect(errorDe('cuando empiza:\n    mostrar(1)').pista).toMatch(/¿Querías decir 'cuando empieza/);
  });
});

describe('La API: miembros, teclas, plantillas y colores', () => {
  it('yo.velocidda = ... da error con sugerencia (antes del juego)', () => {
    const e = errorAlPreparar(() => unObjeto('cuando empieza:\n    yo.velocidda = vector(1, 1)'));
    expect(e.message).toBe("Línea 2: has escrito 'yo.velocidda', que se parece mucho a 'velocidad', una propiedad del motor.");
    expect(e.pista).toBe("¿Querías decir 'velocidad'?");
  });

  it('yo.velocidda también da error al ejecutar (por si se escapa del análisis)', () => {
    const j = unObjeto('cuando empieza:\n    variable yo2 = yo\n    yo2.velocidda = 1');
    expect(j.errores[0].error.pista).toMatch(/¿Querías decir 'velocidad'\?/);
  });

  it('los nombres cortos propios no se confunden con los del motor (yo.xp)', () => {
    const j = unObjeto('cuando empieza:\n    yo.xp = 5\n    mostrar(yo.xp)');
    expect(j.salida).toEqual(['5']);
  });

  it('miembros de módulos mal escritos, antes de ejecutar', () => {
    expect(errorAlPreparar(() => unObjeto('cuando empieza:\n    mostrar(teclado.pulsado("a"))')).pista).toBe("¿Querías decir 'teclado.pulsada'?");
    expect(errorAlPreparar(() => unObjeto('cuando empieza:\n    escena.camara.segir(yo)')).pista).toBe("¿Querías decir 'escena.camara.seguir'?");
  });

  it('teclas mal escritas, con sugerencia', () => {
    expect(errorAlPreparar(() => unObjeto('cuando se pulsa "espaico":\n    mostrar(1)')).pista).toMatch(/^¿Querías decir "espacio"\?/);
    expect(errorAlPreparar(() => unObjeto('cuando cada fotograma:\n    si teclado.pulsada("izquirda"):\n        mostrar(1)')).pista).toMatch(/^¿Querías decir "izquierda"\?/);
  });

  it('plantillas que no existen, con sugerencia', () => {
    const crearJuego = () =>
      juegoDePrueba({
        scripts: { 'a.chs': 'cuando empieza:\n    crear("Bal", 0, 0)' },
        plantillas: { Bala: { sprite: {} } },
        escena: [{ nombre: 'A', script: 'a.chs' }],
      });
    expect(crearJuego).toThrow(/no existe ninguna plantilla llamada "Bal"/);
    expect(crearJuego).toThrow(ErrorCompilacion);
  });

  it('colores que no existen, con sugerencia', () => {
    expect(errorAlPreparar(() => unObjeto('cuando empieza:\n    yo.color = "rojoo"')).pista).toMatch(/^¿Querías decir "rojo"\?/);
    const j = unObjeto('cuando empieza:\n    yo.color = "#ff8800"');
    expect(j.errores).toHaveLength(0);
  });

  it("'otro' fuera de un 'cuando toco'", () => {
    expect(() => unObjeto('cuando empieza:\n    destruir(otro)')).toThrow(/'otro' solo existe dentro de un 'cuando toco/);
  });
});

describe('Errores de tipo explicados con sus valores', () => {
  it('enseña los valores de cada lado', () => {
    expect(errorDe('mostrar(10 + "hola" - 1)').message).toBe('Línea 1: intentas restar un texto ("10hola") y un número (1).');
  });

  it('si es una variable, dice también su nombre', () => {
    const e = errorDe('variable nombre = "Ana"\nmostrar(nombre - 1)');
    expect(e.message).toBe(`Línea 2: intentas restar 'nombre', que es un texto ("Ana"), y un número (1).`);
    expect(e.pista).toBe('Si el texto guarda un número, conviértelo antes: numero(nombre)');
  });

  it('nulo: dice qué variable está vacía', () => {
    expect(errorDe('variable x = nulo\nsi x > 3:\n    mostrar(1)').pista).toBe("'x' está vacío (nulo). ¿Le has dado un valor antes?");
  });

  it('lista + número sugiere añadir()', () => {
    expect(errorDe('variable l = [1]\nmostrar(l + 2)').pista).toBe('Para añadir un elemento a una lista usa: l.añadir(...)');
  });

  it('recorta los valores muy largos', () => {
    expect(errorDe('mostrar("un texto larguísimo que no cabe en el mensaje" - 1)').message).toMatch(/"un texto larguísimo que…"/);
  });
});

describe('Pila de llamadas', () => {
  it('dice desde qué línea se llamó a la función donde falló', () => {
    const e = errorDe('funcion dañar(n):\n    devolver n - "x"\n\nmostrar(dañar(5))');
    expect(e.linea).toBe(2);
    expect(e.pila).toEqual([{ funcion: 'dañar', desde: expect.objectContaining({ linea: 4 }) }]);
    expect(formatearDiagnostico(e.diagnostico())).toContain("Esto pasó dentro de la función 'dañar', que se llamó desde la línea 4.");
  });

  it('funciones dentro de funciones: enumera toda la cadena', () => {
    const e = errorDe('funcion a():\n    devolver b()\nfuncion b():\n    devolver 1 / 0\nmostrar(a())');
    expect(e.pila.map((l) => [l.funcion, l.desde.linea])).toEqual([
      ['b', 2],
      ['a', 5],
    ]);
  });
});

describe('Un error no para el juego entero', () => {
  it('se para solo el script que falla; los demás siguen', () => {
    const j = juegoDePrueba({
      scripts: { 'mal.chs': 'cuando cada fotograma:\n    yo.x += 1\n    si yo.x > 5:\n        mostrar(1 / 0)', 'bien.chs': 'cuando cada fotograma:\n    yo.x += 1' },
      escena: [
        { nombre: 'Mal', x: 0, script: 'mal.chs' },
        { nombre: 'Bien', x: 0, script: 'bien.chs' },
      ],
    });
    j.avanzar(20);
    expect(j.buscar('Mal').posicion.x).toBe(6); // se paró al fallar
    expect(j.buscar('Bien').posicion.x).toBe(20); // siguió funcionando
    expect(j.errores).toHaveLength(1);
    expect(j.errores[0].error.message).toMatch(/dividiendo entre cero/);
  });

  it('el mismo error en varias copias se cuenta (×3) en vez de repetirse', () => {
    const j = juegoDePrueba({
      scripts: { 'bola.chs': 'cuando pasen 0.1 segundos:\n    mostrar(nulo + 1)', 'fabrica.chs': 'cuando empieza:\n    repetir 3 veces:\n        crear("Bola", 0, 0)' },
      plantillas: { Bola: { script: 'bola.chs' } },
      escena: [{ nombre: 'Fabrica', script: 'fabrica.chs' }],
    });
    j.avanzar(10);
    expect(j.errores).toHaveLength(1);
    expect(j.errores[0].veces).toBe(3);
  });

  it('los errores de escritura de TODOS los scripts salen juntos y no se ejecuta nada', () => {
    let error: unknown;
    try {
      juegoDePrueba({
        scripts: { 'a.chs': 'mientas verdadero:\n    romper', 'b.chs': 'mostrar(puntoss)' },
        escena: [
          { nombre: 'A', script: 'a.chs' },
          { nombre: 'B', script: 'b.chs' },
        ],
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ErrorCompilacion);
    expect((error as ErrorCompilacion).errores.map((e) => e.ubicacion.archivo)).toEqual(['a.chs', 'b.chs']);
  });
});

describe('Más errores que antes no se entendían', () => {
  it('coma decimal', () => {
    expect(errorDe('variable x = 3,5').pista).toBe('Escribe 3.5 en lugar de 3,5');
  });

  it("'==' al crear una variable", () => {
    expect(errorDe('variable x == 3').message).toMatch(/para crear una variable se usa un solo '='/);
  });

  it("'devolver' fuera de una función", () => {
    expect(errorDe('devolver 3').message).toMatch(/'devolver' solo se puede usar dentro de una función/);
  });

  it("'devolver' dentro de un 'cuando' sí vale (termina el evento)", () => {
    const j = unObjeto('cuando empieza:\n    mostrar(1)\n    devolver\n    mostrar(2)');
    expect(j.salida).toEqual(['1']);
  });

  it('una variable creada dentro de un si no se ve fuera (se detecta antes de ejecutar)', () => {
    const e = errorDe('si verdadero:\n    variable dentro = 1\nmostrar(dentro)');
    expect(e).toBeInstanceOf(ErrorCompilacion);
  });
});

describe('Avisos', () => {
  it('variable creada y nunca usada', () => {
    const avisos = avisosDe('variable sobra = 1\nvariable usada = 2\nmostrar(usada)');
    expect(avisos).toHaveLength(1);
    expect(avisos[0].mensaje).toBe("has creado la variable 'sobra', pero no la usas en ningún sitio.");
    expect(avisos[0].pos.columna).toBe(10);
  });

  it('código después de devolver', () => {
    const avisos = avisosDe('funcion f():\n    devolver 1\n    mostrar(2)\nmostrar(f())');
    expect(avisos.map((a) => a.pos.linea)).toEqual([3]);
    expect(avisos[0].mensaje).toMatch(/nunca se ejecutará/);
  });

  it('una variable usada solo dentro de una función cuenta como usada', () => {
    expect(avisosDe('variable n = 0\nfuncion f():\n    n += 1\nf()')).toHaveLength(0);
  });

  it('los avisos no impiden ejecutar', () => {
    const j = unObjeto('variable sinUsar = 1\ncuando empieza:\n    mostrar("ok")');
    expect(j.salida).toEqual(['ok']);
    expect(j.avisos).toHaveLength(1);
  });
});

describe('Formato del error', () => {
  it('subraya el trozo exacto con ^^^', () => {
    const e = errorDe('variable vida = 3\nmientas vida > 0:\n    vida -= 1');
    const texto = formatearDiagnostico(e.diagnostico(), ['variable vida = 3', 'mientas vida > 0:', '    vida -= 1']);
    expect(texto).toBe(
      [
        '✖ Error en prueba.chs · línea 2, columna 1',
        '',
        '   2 │ mientas vida > 0:',
        '     │ ^^^^^^^',
        "   Has escrito 'mientas', que no es ninguna palabra de Chispa.",
        "   💡 ¿Querías decir 'mientras'?",
      ].join('\n'),
    );
  });
});
