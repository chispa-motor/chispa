/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL CURSO DE LO NUEVO DE CHISPA 1.1: los temas y comandos que se añaden a
 * APRENDE_CHISPA.md y a la chuleta. Mismo formato que curso.ts (cada
 * comando: ejemplo, línea de la chuleta y error típico), y los mismos tests:
 * cada ejemplo se ejecuta y cada error típico se comprueba.
 */

type Tema = (nivel: number, titulo: string, intro: string) => void;
/** tipo: 'e' = da un error de Chispa (se comprueba), 'l' = error de lógica. */
type Comando = (id: string, ejemplo: string, corto: string, mal: string, explica: string, tipo?: 'e' | 'l') => void;

export function agregarNovedades(tema: Tema, c: Comando): void {
  tema(3, 'Formas', 'Un objeto puede tener muchas formas: rectángulo, círculo, triángulo, estrella, corazón, flecha... y choca con su forma de verdad (una pelota rueda por una rampa). Algunas formas tienen datos propios: los lados de un polígono, el hueco de un anillo...');
  c('objeto:forma', 'cuando empieza:\n    yo.forma = "estrella"', 'yo.forma = "corazon"',
    'cuando empieza:\n    yo.forma = "hexagono"', 'Inventarse una forma: un hexágono es un "poligono" con yo.lados = 6.');
  c('objeto:lados', 'cuando empieza:\n    yo.forma = "poligono"\n    yo.lados = 8', 'yo.lados = 6',
    'cuando empieza:\n    yo.forma = "poligono"\n    yo.lados = 2', 'Darle menos de 3 lados: con 2 no hay forma.');
  c('objeto:radioInterior', 'cuando empieza:\n    yo.forma = "anillo"\n    yo.radioInterior = 0.8', 'yo.radioInterior = 0.4',
    'cuando empieza:\n    yo.forma = "anillo"\n    yo.radioInterior = 30', 'Darlo en píxeles: va de 0 (sin hueco) a 1 (hueco del todo).');
  c('objeto:radioEsquina', 'cuando empieza:\n    yo.forma = "redondeado"\n    yo.radioEsquina = 12', 'yo.radioEsquina = 12',
    'cuando empieza:\n    yo.radioEsquina = 12', 'Ponerlo en un rectángulo normal: solo se nota con yo.forma = "redondeado".', 'l');
  c('objeto:inicioArco', 'cuando empieza:\n    yo.forma = "arco"\n    yo.inicioArco = 90', 'yo.inicioArco = 0',
    'cuando empieza:\n    yo.forma = "arco"\n    yo.inicioArco = "arriba"', 'Darle un texto: son grados (90 = arriba).');
  c('objeto:finArco', 'cuando empieza:\n    yo.forma = "arco"\n    yo.finArco = 270', 'yo.finArco = 270',
    'cuando empieza:\n    yo.forma = "arco"\n    yo.inicioArco = 180\n    yo.finArco = 180', 'Poner el mismo ángulo al principio y al final: el arco no tiene nada que dibujar.', 'l');
  c('objeto:grosor', 'cuando empieza:\n    yo.forma = "linea"\n    yo.grosor = 10', 'yo.grosor = 10',
    'cuando empieza:\n    yo.forma = "linea"\n    yo.grosor = "gordo"', 'Darle un texto: son píxeles.');
  c('objeto:formaColision', 'cuando empieza:\n    yo.forma = "estrella"\n    yo.formaColision = "caja"', 'yo.formaColision = "caja"',
    'cuando empieza:\n    yo.formaColision = "cuadrado"', 'Inventarse el valor: es "auto", "caja" o "figura".');
  c('objeto:ponerCamino', 'cuando empieza:\n    yo.ponerCamino([vector(-50, -30), vector(0, 40), vector(50, -30)])', 'yo.ponerCamino([vector(-50, 0), vector(0, 50), vector(50, 0)])',
    'cuando empieza:\n    yo.ponerCamino(vector(-50, 0), vector(50, 0))', 'Olvidar los corchetes: los puntos van en UNA lista.');
}
