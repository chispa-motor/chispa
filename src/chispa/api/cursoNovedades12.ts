/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL CURSO DE LO NUEVO DE CHISPA 1.2 (jugar en el móvil): los temas y comandos
 * que se añaden a APRENDE_CHISPA.md y a la chuleta. Mismo formato que
 * cursoNovedades.ts (cada comando: ejemplo, línea de la chuleta y error
 * típico), y los mismos tests: cada ejemplo se ejecuta y cada error se comprueba.
 */

type Tema = (nivel: number, titulo: string, intro: string) => void;
/** tipo: 'e' = da un error de Chispa (se comprueba), 'l' = error de lógica. */
type Comando = (id: string, ejemplo: string, corto: string, mal: string, explica: string, tipo?: 'e' | 'l') => void;

export function agregarNovedades12(tema: Tema, c: Comando): void {
  tema(4, 'Jugar con el dedo', 'En un móvil no hay teclado. Con tactil se pone una palanca y botones en la pantalla: la palanca hace de flechas y cada botón pulsa una tecla, así que el resto del juego no cambia. Solo se ven cuando se juega con el dedo. Si no pones ninguno, Chispa pone solo los botones de las teclas que usa tu juego.');
  c('tactil:joystick', 'cuando empieza:\n    tactil.joystick()\n\ncuando cada fotograma:\n    yo.moverConFlechas(300)', 'tactil.joystick()',
    'cuando empieza:\n    tactil.joystick("abajo")', 'Inventarse el lado: la palanca va a la "izquierda" o a la "derecha".');
  c('tactil:boton', 'cuando empieza:\n    tactil.boton("Saltar", "espacio")\n\ncuando se pulsa "espacio":\n    mostrar("salto")', 'tactil.boton("Saltar", "espacio")',
    'cuando empieza:\n    tactil.boton("Saltar", "espasio")', 'Escribir mal la tecla: Chispa dice cuál se parece.');
  c('tactil:pulsado', 'cuando empieza:\n    tactil.boton("Fuego")\n\ncuando cada fotograma:\n    si tactil.pulsado("Fuego"):\n        mostrar("fuego")', 'si tactil.pulsado("Fuego"):',
    'cuando cada fotograma:\n    si tactil.pulsado("Fuego"):\n        mostrar("fuego")', 'Preguntar por un botón que no se ha puesto: primero tactil.boton("Fuego").');
  c('tactil:sePulso', 'cuando empieza:\n    tactil.boton("Fuego")\n\ncuando cada fotograma:\n    si tactil.sePulso("Fuego"):\n        mostrar("¡pum!")', 'si tactil.sePulso("Fuego"):',
    'cuando empieza:\n    tactil.boton("Fuego")\n    si tactil.sePulso("Fuego"):\n        mostrar("¡pum!")', 'Preguntarlo en cuando empieza: solo se mira una vez. Tiene que ir en cuando cada fotograma.', 'l');
  c('tactil:seSolto', 'cuando empieza:\n    tactil.boton("Cargar")\n\ncuando cada fotograma:\n    si tactil.seSolto("Cargar"):\n        mostrar("¡suelta!")', 'si tactil.seSolto("Cargar"):',
    'cuando empieza:\n    tactil.boton("Cargar")\n\ncuando cada fotograma:\n    si tactil.seSolto():\n        mostrar("¡suelta!")', 'Olvidar el nombre del botón.');
  c('tactil:x', 'cuando empieza:\n    tactil.joystick("izquierda", falso)\n\ncuando cada fotograma:\n    yo.x += tactil.x * 300 * delta', 'yo.x += tactil.x * 300 * delta',
    'cuando cada fotograma:\n    tactil.x = 1', 'Intentar cambiarla: la inclinación de la palanca solo se lee.');
  c('tactil:y', 'cuando empieza:\n    tactil.joystick("izquierda", falso)\n\ncuando cada fotograma:\n    yo.y += tactil.y * 300 * delta', 'yo.y += tactil.y * 300 * delta',
    'cuando cada fotograma:\n    yo.y -= tactil.y * 300 * delta', 'Restarla: tactil.y ya es positiva hacia ARRIBA, como la Y de Chispa. Restando, va al revés.', 'l');
  c('tactil:mover', 'cuando empieza:\n    tactil.boton("Saltar", "espacio")\n    tactil.mover("Saltar", 85, 20)', 'tactil.mover("Saltar", 85, 20)',
    'cuando empieza:\n    tactil.boton("Saltar", "espacio")\n    tactil.mover("Saltar", 800, 400)', 'Darlo en píxeles: el sitio va de 0 a 100 (un tanto por ciento de la pantalla).');
  c('tactil:quitar', 'cuando empieza:\n    tactil.boton("Saltar", "espacio")\n    tactil.quitar("Saltar")', 'tactil.quitar("Saltar")',
    'cuando empieza:\n    tactil.quitar("Saltar")', 'Quitar un botón que no existe: Chispa dice cuáles hay.');
  c('tactil:colocar', 'cuando empieza:\n    tactil.joystick()\n\ncuando se pulsa "c":\n    tactil.colocar()', 'tactil.colocar()',
    'cuando cada fotograma:\n    tactil.colocar()', 'Ponerlo en cada fotograma: el modo colocar no se podría cerrar nunca.', 'l');
  c('tactil:mostrar', 'cuando empieza:\n    tactil.joystick()\n    tactil.mostrar = "siempre"', 'tactil.mostrar = "siempre"',
    'cuando empieza:\n    tactil.mostrar = verdadero', 'Darle verdadero o falso: es "auto", "siempre" o "nunca".');
  c('tactil:tamano', 'cuando empieza:\n    tactil.joystick()\n    tactil.tamano = 1.3', 'tactil.tamano = 1.3',
    'cuando empieza:\n    tactil.tamano = 80', 'Darlo en píxeles: 1 es el tamaño normal, y va de 0.5 a 2.');
  c('tactil:opacidad', 'cuando empieza:\n    tactil.joystick()\n    tactil.opacidad = 0.4', 'tactil.opacidad = 0.4',
    'cuando empieza:\n    tactil.opacidad = 0', 'Ponerla a 0: no se verían. Va de 0.1 a 1 (para quitarlos, tactil.mostrar = "nunca").');
  c('tactil:hay', 'cuando empieza:\n    si tactil.hay:\n        mostrar("con el dedo")\n    sino:\n        mostrar("con teclado")', 'si tactil.hay:',
    'cuando empieza:\n    tactil.hay = verdadero', 'Intentar cambiarlo: lo dice el aparato, solo se lee.');

  tema(4, 'Gestos, mirar y vibrar', 'Además de botones, el dedo hace gestos (un toque, deslizar, pellizcar) y puede arrastrar por la pantalla para mirar o apuntar. Y el móvil puede vibrar.');
  c('tactil:gesto', 'cuando cada fotograma:\n    si tactil.gesto == "arriba":\n        mostrar("deslizar hacia arriba")', 'si tactil.gesto == "toque":',
    'cuando cada fotograma:\n    si tactil.gesto == "saltar":\n        mostrar("salto")', 'Inventarse el gesto: son "toque", "doble", "largo", "arriba", "abajo", "izquierda" y "derecha".', 'l');
  c('tactil:pellizco', 'cuando cada fotograma:\n    escena.camara.zoom = escena.camara.zoom * tactil.pellizco', 'escena.camara.zoom = escena.camara.zoom * tactil.pellizco',
    'cuando cada fotograma:\n    escena.camara.zoom = tactil.pellizco', 'Poner el zoom IGUAL al pellizco: vale 1 casi siempre (nadie pellizca). Hay que multiplicar.', 'l');
  c('tactil:dedos', 'cuando cada fotograma:\n    si tactil.dedos == 2:\n        mostrar("dos dedos")', 'si tactil.dedos == 2:',
    'cuando cada fotograma:\n    si tactil.dedos():\n        mostrar("toca")', 'Ponerle paréntesis: es un número, no una orden.');
  c('tactil:toques', 'cuando cada fotograma:\n    para cada dedo en tactil.toques:\n        dibujar.circulo(dedo.x, dedo.y, 30, "amarillo")', 'para cada dedo en tactil.toques:',
    'cuando cada fotograma:\n    mostrar(tactil.toques.x)', 'Pedirle la x a la lista entera: hay que recorrerla (para cada dedo en ...) o coger uno: tactil.toques[1].x');
  c('tactil:mirar', 'cuando empieza:\n    tactil.mirar()\n\ncuando cada fotograma:\n    yo.rotacion -= tactil.miraX', 'tactil.mirar()',
    'cuando cada fotograma:\n    yo.rotacion -= tactil.miraX', 'Olvidar tactil.mirar(): sin activarlo, miraX vale siempre 0.', 'l');
  c('tactil:miraX', 'cuando empieza:\n    tactil.mirar()\n\ncuando cada fotograma:\n    escena.camara.x -= tactil.miraX', 'escena.camara.x -= tactil.miraX',
    'cuando empieza:\n    tactil.mirar()\n    escena.camara.x -= tactil.miraX', 'Leerlo en cuando empieza: es lo que se mueve el dedo en CADA fotograma.', 'l');
  c('tactil:miraY', 'cuando empieza:\n    tactil.mirar()\n\ncuando cada fotograma:\n    escena.camara.y -= tactil.miraY', 'escena.camara.y -= tactil.miraY',
    'cuando cada fotograma:\n    tactil.miraY = 0', 'Intentar cambiarlo: solo se lee.');
  c('tactil:vibrar', 'cuando se pulsa "espacio":\n    tactil.vibrar(0.2)', 'tactil.vibrar(0.2)',
    'cuando empieza:\n    tactil.vibrar(60)', 'Pedir un minuto: se puede vibrar 5 segundos como mucho.');

  tema(4, 'Calidad, batería y cómo se sujeta el móvil', 'Un móvil barato no puede pintar tanto como un ordenador, y pintar gasta batería. Chispa adapta la calidad sola; con estos datos se decide desde el juego (también están en el inspector > Proyecto).');
  c('pantalla:calidad', 'cuando empieza:\n    pantalla.calidad = "baja"', 'pantalla.calidad = "auto"',
    'cuando empieza:\n    pantalla.calidad = "bajo"', 'Escribirla mal: es "auto", "alta", "media" o "baja" (Chispa propone la parecida).');
  c('pantalla:nivelCalidad', 'cuando empieza:\n    pantalla.calidad = "media"\n    mostrar(pantalla.nivelCalidad)', 'mostrar(pantalla.nivelCalidad)',
    'cuando empieza:\n    pantalla.nivelCalidad = "baja"', 'Intentar cambiarla: solo se lee. La que se cambia es pantalla.calidad.');
  c('pantalla:maximoFps', 'cuando empieza:\n    pantalla.maximoFps = 30', 'pantalla.maximoFps = 30',
    'cuando empieza:\n    pantalla.maximoFps = 5', 'Pedir muy pocos: va de 15 a 240 (0 = sin límite).');
  c('pantalla:orientacion', 'cuando empieza:\n    pantalla.orientacion = "horizontal"', 'pantalla.orientacion = "horizontal"',
    'cuando empieza:\n    pantalla.orientacion = "tumbado"', 'Inventarse el valor: es "horizontal", "vertical" o "cualquiera".');
}
