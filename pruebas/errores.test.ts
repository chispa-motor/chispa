/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * TESTS DE ERRORES: cada error tiene que decir la línea y la columna, qué pasa
 * y cómo arreglarlo. (La 3C mejorará todavía más estos mensajes.)
 */
import { describe, expect, it } from 'vitest';
import { errorDe, mostrado } from './ayudantes';

describe('Errores de escritura (al compilar)', () => {
  it("falta ':' al final de un si", () => {
    const e = errorDe('variable a = 1\nsi a > 0\n    mostrar(a)');
    expect(e.linea).toBe(2);
    expect(e.message).toMatch(/esperaba ':'/);
    expect(e.pista).toMatch(/terminan en dos puntos/);
  });

  it("'=' en lugar de '==' en una condición", () => {
    const e = errorDe('variable a = 1\nsi a = 1:\n    mostrar(a)');
    expect(e.message).toMatch(/'=='/);
    expect(e.posicion.columna).toBe(6);
  });

  it('sangría que no coincide con ninguna anterior', () => {
    const e = errorDe('si verdadero:\n    mostrar(1)\n  mostrar(2)');
    expect(e.linea).toBe(3);
    expect(e.message).toMatch(/sangría/);
  });

  it('mostrar sin paréntesis sugiere la forma correcta', () => {
    const e = errorDe('mostrar "hola"');
    expect(e.message).toMatch(/paréntesis/);
    expect(e.pista).toBe('Escribe: mostrar("hola")');
  });

  it('romper fuera de un bucle', () => {
    expect(errorDe('romper').message).toMatch(/solo se puede usar dentro de un bucle/);
  });

  it('usar una palabra reservada como nombre', () => {
    const e = errorDe('variable y = 3');
    expect(e.message).toMatch(/'y' es una palabra reservada/);
    expect(e.pista).toMatch(/posY/);
  });

  it('texto sin cerrar', () => {
    const e = errorDe('mostrar("hola)');
    expect(e.message).toMatch(/nunca se cierra/);
    expect(e.posicion.columna).toBe(9);
  });

  it("'&&' sugiere usar la palabra y", () => {
    expect(errorDe('si 1 && 2:\n    mostrar(1)').pista).toMatch(/escribe la palabra y/);
  });

  it('clave repetida en una tabla', () => {
    expect(errorDe('variable t = {a: 1, A: 2}').message).toMatch(/repetida/);
  });

  it('los errores de escritura incluyen archivo y código de la línea', () => {
    const e = errorDe('variable a = 1\nsi a > 0\n    mostrar(a)');
    expect(e.ubicacion.archivo).toBe('prueba.chs');
    expect(e.ubicacion.codigo).toBe('si a > 0');
  });
});

describe('Errores de ejecución', () => {
  it('variable que no existe, con sugerencia y columna', () => {
    const e = errorDe('variable puntos = 1\nmostrar(puntoss)');
    expect(e.linea).toBe(2);
    expect(e.posicion.columna).toBe(9);
    expect(e.pista).toBe("¿Querías decir 'puntos'?");
  });

  it('asignar a una variable que no se ha creado', () => {
    const e = errorDe('vida = 3');
    expect(e.message).toMatch(/no existe todavía/);
    expect(e.pista).toMatch(/variable vida = /);
  });

  it('usar una propiedad de algo que no existe', () => {
    expect(errorDe('enemigo.vida = 5').message).toMatch(/intentas cambiar 'vida' de 'enemigo', pero 'enemigo' no existe/);
  });

  it('clave de tabla que no existe: sugerencia y cómo comprobarlo antes', () => {
    expect(errorDe('variable j = {vida: 3}\nmostrar(j.vidda)').pista).toBe("¿Querías decir 'vida'?");
    expect(errorDe('variable j = {vida: 3}\nmostrar(j.mana)').pista).toMatch(/si "mana" en j:/);
  });

  it('posición 0 en una lista (empiezan en 1)', () => {
    expect(errorDe('variable l = [1, 2]\nmostrar(l[0])').pista).toMatch(/empiezan en 1/);
  });

  it('dividir entre cero', () => {
    expect(errorDe('mostrar(5 / 0)').message).toMatch(/dividiendo entre cero/);
  });

  it('operar con tipos que no encajan', () => {
    expect(errorDe('mostrar([1] - "a")').message).toMatch(/intentas restar una lista \(\[1\]\) y un texto \("a"\)/);
  });

  it('detecta bucles infinitos en vez de congelar el navegador', () => {
    const e = errorDe('variable i = 0\nmientras verdadero:\n    i += 1');
    expect(e.linea).toBe(2);
    expect(e.pista).toMatch(/esperar\(\)/);
  });

  it('número incorrecto de valores al llamar a una función', () => {
    expect(errorDe('funcion f(a, b):\n    devolver a\nmostrar(f(1))').message).toMatch(/necesita 2 valores \(a, b\), pero le das 1/);
  });

  it('para cada con dos nombres en una lista: la posición y el valor (antes era un error)', () => {
    expect(mostrado('para cada i, v en ["a", "b"]:\n    mostrar(i, v)')).toBe('1 a | 2 b');
  });
});
