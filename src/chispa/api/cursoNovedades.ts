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

  tema(3, 'Colores y estilo', 'Además de un color, una forma puede tener un degradado, un patrón o una imagen por dentro, un borde, sombra y resplandor. Y se puede elegir cómo se mezcla con lo de detrás (sumar luz queda genial en fuegos y poderes). Hay paletas de colores listas que quedan bien juntos.');
  c('objeto:relleno', 'cuando empieza:\n    yo.relleno = "degradado"\n    yo.color = "amarillo"\n    yo.color2 = "rojo"', 'yo.relleno = "degradado"',
    'cuando empieza:\n    yo.relleno = "degradao"', 'Escribirlo mal: Chispa te dice el parecido ("degradado").');
  c('objeto:color2', 'cuando empieza:\n    yo.relleno = "radial"\n    yo.color2 = "azul"', 'yo.color2 = "azul"',
    'cuando empieza:\n    yo.color2 = "azul"', 'Ponerlo con el relleno normal: color2 solo se ve en degradados y patrones.', 'l');
  c('objeto:anguloDegradado', 'cuando empieza:\n    yo.relleno = "degradado"\n    yo.anguloDegradado = 0', 'yo.anguloDegradado = 45',
    'cuando empieza:\n    yo.relleno = "degradado"\n    yo.anguloDegradado = "horizontal"', 'Darle un texto: son grados (0 = horizontal).');
  c('objeto:patron', 'cuando empieza:\n    yo.relleno = "patron"\n    yo.patron = "cuadros"\n    yo.color2 = "negro"', 'yo.patron = "puntos"',
    'cuando empieza:\n    yo.patron = "cuadros"', 'Olvidar yo.relleno = "patron": sin eso el patrón no se ve.', 'l');
  c('objeto:imagenRelleno', 'cuando empieza:\n    yo.relleno = "imagen"\n    yo.imagenRelleno = "jugador"', 'yo.imagenRelleno = "jugador"',
    'cuando empieza:\n    yo.relleno = "imagen"\n    yo.imagenRelleno = "ladrilloo"', 'Usar una imagen que no existe: Chispa dice cuáles hay.');
  c('objeto:borde', 'cuando empieza:\n    yo.borde = 4\n    yo.colorBorde = "blanco"', 'yo.borde = 3',
    'cuando empieza:\n    yo.borde = "gordo"', 'Darle un texto: el borde son píxeles.');
  c('objeto:colorBorde', 'cuando empieza:\n    yo.borde = 3\n    yo.colorBorde = "negro"', 'yo.colorBorde = "blanco"',
    'cuando empieza:\n    yo.borde = 3\n    yo.colorBorde = "blanquito"', 'Inventarse un color: Chispa avisa y propone el parecido.');
  c('objeto:bordeDiscontinuo', 'cuando empieza:\n    yo.borde = 2\n    yo.bordeDiscontinuo = verdadero', 'yo.bordeDiscontinuo = verdadero',
    'cuando empieza:\n    yo.bordeDiscontinuo = verdadero', 'Olvidar el grosor: sin yo.borde no hay borde que cortar.', 'l');
  c('objeto:sombra', 'cuando empieza:\n    yo.sombra = "#00000088"', 'yo.sombra = verdadero',
    'cuando empieza:\n    yo.sombra = "sombra"', 'Darle un texto que no es un color: la sombra es un color (o verdadero).');
  c('objeto:sombraX', 'cuando empieza:\n    yo.sombra = verdadero\n    yo.sombraX = 12', 'yo.sombraX = 12',
    'cuando empieza:\n    yo.sombraX = 12', 'Moverla sin poner yo.sombra: no hay sombra que mover.', 'l');
  c('objeto:sombraY', 'cuando empieza:\n    yo.sombra = verdadero\n    yo.sombraY = -12', 'yo.sombraY = -12',
    'cuando empieza:\n    yo.sombra = verdadero\n    yo.sombraY = 12', 'Ponerla en positivo para bajarla: en Chispa la Y va hacia ARRIBA, así que la sombra sube.', 'l');
  c('objeto:desenfoqueSombra', 'cuando empieza:\n    yo.sombra = verdadero\n    yo.desenfoqueSombra = 0', 'yo.desenfoqueSombra = 20',
    'cuando empieza:\n    yo.sombra = verdadero\n    yo.desenfoqueSombra = "mucho"', 'Darle un texto: son píxeles.');
  c('objeto:resplandor', 'cuando empieza:\n    yo.resplandor = "amarillo"', 'yo.resplandor = "cian"',
    'cuando empieza:\n    yo.resplandor = "brillante"', 'Darle un texto que no es un color.');
  c('objeto:tamanoResplandor', 'cuando empieza:\n    yo.resplandor = "amarillo"\n    yo.tamanoResplandor = 30', 'yo.tamanoResplandor = 30',
    'cuando empieza:\n    yo.tamanoResplandor = 30', 'Cambiar el tamaño sin poner yo.resplandor: no hay brillo.', 'l');
  c('objeto:mezcla', 'cuando empieza:\n    yo.mezcla = "sumar"', 'yo.mezcla = "multiplicar"',
    'cuando empieza:\n    yo.mezcla = "suma"', 'Escribirlo mal: es "sumar" (Chispa propone el parecido).');
  c('funcion:paleta', 'cuando empieza:\n    yo.color = paleta("neon", 3)', 'yo.color = paleta("pastel", 2)',
    'cuando empieza:\n    yo.color = paleta("neon", 9)', 'Pedir un color que no hay: cada paleta tiene 8 (del 1 al 8).');
  c('funcion:mezclarColores', 'cuando empieza:\n    yo.color = mezclarColores("rojo", "amarillo", 0.5)', 'yo.color = mezclarColores("rojo", "azul", 0.5)',
    'cuando empieza:\n    yo.color = mezclarColores("rojo", "amarilo", 0.5)', 'Escribir mal un color: no se puede mezclar.');
}
