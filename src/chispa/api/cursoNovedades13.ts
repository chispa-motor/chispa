/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LOS COMANDOS DE CHISPA 1.3 EN EL CURSO (ver curso.ts): la vista en primera
 * persona (vista3d), las puertas de los mapas y mirar con el ratón. Salieron
 * haciendo «Arena Cero» (ver FALTABA_EN_EL_MOTOR.md).
 * Cada uno, como los demás: un ejemplo que funciona, la línea de la chuleta y
 * el error que más se comete con él.
 */
/** tipo: 'e' = da un error de Chispa (se comprueba), 'l' = error de lógica. */
type Comando = (id: string, ejemplo: string, corto: string, mal: string, explica: string, tipo?: 'e' | 'l') => void;
type Tema = (nivel: number, titulo: string, intro: string) => void;

export function agregarNovedades13(tema: Tema, c: Comando): void {
  tema(4, 'Primera persona: el mundo desde dentro', 'Un juego visto desde arriba (un mapa de casillas, objetos, sin gravedad) se puede mirar DESDE DENTRO, como en los primeros juegos de disparos. No hay que cambiar el juego: vista3d.ver(yo) lo pinta desde los ojos de ese objeto. Las casillas sólidas son paredes, las demás son suelo, y los objetos son dibujos que siempre te miran. Se gira con yo.rotacion y se anda con yo.avanzar o con la velocidad.');
  c('vista3d:ver', 'cuando empieza:\n    vista3d.ver(yo)', 'vista3d.ver(yo)',
    'cuando empieza:\n    vista3d.ver("Jugador")', 'Darle el nombre entre comillas: quiere el objeto (yo, o buscar("Jugador")).');
  c('vista3d:quitar', 'cuando empieza:\n    vista3d.ver(yo)\n\ncuando se pulsa "m":\n    vista3d.quitar()', 'vista3d.quitar()',
    'cuando empieza:\n    vista3d.activa = falso', 'Intentar apagarla con activa: solo se lee. Se quita con vista3d.quitar().');
  c('vista3d:activa', 'cuando empieza:\n    vista3d.ver(yo)\n    mostrar(vista3d.activa)', 'si vista3d.activa:',
    'cuando empieza:\n    vista3d.activa = verdadero', 'Intentar encenderla con activa: solo se lee. Se pone con vista3d.ver(yo).');
  c('vista3d:observador', 'cuando empieza:\n    vista3d.ver(yo)\n    mostrar(vista3d.observador.nombre)', 'si vista3d.observador == yo:',
    'cuando empieza:\n    vista3d.observador = yo', 'Intentar cambiarlo: solo se lee. Se elige con vista3d.ver(objeto).');
  c('vista3d:campo', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.campo = 80', 'vista3d.campo = 80',
    'cuando empieza:\n    vista3d.campo = 360', 'Pedir la vuelta entera: va de 30 a 120 grados.');
  c('vista3d:altura', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.altura = 0.3', 'vista3d.altura = 0.3',
    'cuando empieza:\n    vista3d.altura = 32', 'Darla en píxeles: va de 0.05 (el suelo) a 0.95 (el techo).');
  c('vista3d:inclinacion', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.inclinacion = 0.2', 'vista3d.inclinacion = 0.2',
    'cuando empieza:\n    vista3d.inclinacion = 45', 'Darla en grados: va de -1 (abajo) a 1 (arriba).');
  c('vista3d:brillo', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.brillo = 1.5', 'vista3d.brillo = 1.5',
    'cuando empieza:\n    vista3d.brillo = 100', 'Darlo en tanto por ciento: 1 es lo normal, y va de 0 a 3.');
  c('vista3d:suelo', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.suelo("#444444")', 'vista3d.suelo("gris")',
    'cuando empieza:\n    vista3d.suelo("baldosaaa")', 'Escribir mal el nombre: tiene que ser una imagen del proyecto o un color.');
  c('vista3d:techo', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.techo("#222233")', 'vista3d.techo("#222233")',
    'cuando empieza:\n    vista3d.techo()', 'Olvidar la imagen o el color.');
  c('vista3d:cielo', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.cielo()', 'vista3d.cielo()',
    'cuando empieza:\n    vista3d.cielo("azul")', 'Darle un color: el cielo es una IMAGEN del proyecto. Para un color liso, vista3d.techo("azul").');
  c('vista3d:pared', 'cuando empieza:\n    vista3d.ver(yo)\n    mostrar(vista3d.columnas >= 0)', 'vista3d.pared("suelo", "jugador")',
    'cuando empieza:\n    vista3d.pared("murooo", "ladrillo")', 'Inventarse el tipo de casilla: tiene que ser uno del mapa (Chispa dice cuáles hay).');
  c('vista3d:niebla', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.niebla("negro", 200, 900)', 'vista3d.niebla("negro", 200, 900)',
    'cuando empieza:\n    vista3d.niebla("negro", 900, 200)', 'Poner las distancias al revés: primero dónde empieza y luego dónde ya no se ve nada.');
  c('vista3d:mapa', 'cuando empieza:\n    vista3d.mapa(buscar("Mapa"))\n    vista3d.ver(yo)', 'vista3d.mapa(mapa)',
    'cuando empieza:\n    vista3d.mapa(yo)', 'Darle un objeto que no es un mapa de casillas.');
  c('vista3d:enPantalla', 'cuando empieza:\n    vista3d.ver(yo)\n\ncuando cada fotograma:\n    variable p = vista3d.enPantalla(vector(yo.x + 100, yo.y))\n    si p != nulo:\n        dibujar.enPantalla.circulo(p.x, p.y, 6, "rojo")', 'variable p = vista3d.enPantalla(jugador)',
    'cuando cada fotograma:\n    variable p = vista3d.enPantalla(jugador)\n    dibujar.enPantalla.circulo(p.x, p.y, 6, "rojo")', 'Usar el resultado sin mirar si es nulo: lo es cuando el objeto queda detrás (o la vista no está puesta).');
  c('vista3d:seVe', 'cuando empieza:\n    vista3d.ver(yo)\n\ncuando cada fotograma:\n    si vista3d.seVe(vector(yo.x + 100, yo.y)):\n        dibujar.enPantalla.texto("lo veo", 40, 40, "blanco")', 'si vista3d.seVe(jugador):',
    'cuando cada fotograma:\n    si vista3d.seVe("Jugador"):\n        mostrar("lo veo")', 'Darle el nombre entre comillas: quiere el objeto o una posición.');
  c('vista3d:columnas', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.columnas = 320', 'vista3d.columnas = 320',
    'cuando empieza:\n    vista3d.columnas = 10', 'Pedir muy pocas: va de 64 a 1280 (0 = las que diga pantalla.calidad).');
  c('vista3d:milisegundos', 'cuando empieza:\n    vista3d.ver(yo)\n\ncuando cada 1 segundos:\n    mostrar(vista3d.milisegundos)', 'mostrar(vista3d.milisegundos)',
    'cuando empieza:\n    vista3d.milisegundos = 0', 'Intentar cambiarlo: es una medida, solo se lee.');
  c('objeto:elevacion', 'cuando empieza:\n    yo.elevacion = 20', 'yo.elevacion = 20',
    'cuando empieza:\n    yo.elevacion = "alto"', 'Darle un texto: son píxeles desde el suelo.');

  tema(4, 'Puertas en los mapas', 'Un tipo de casilla puede ser una PUERTA (en el editor: selecciona el mapa y, en el tipo de casilla, marca «es una puerta»). Cerrada es una pared; abierta, se pasa. Se abren y se cierran desde el código, diciendo su columna y su fila.');
  c('objeto:abrirPuerta', 'cuando empieza:\n    variable m = buscar("Mapa")\n    m.ponerCasilla(20, 20, "puerta")\n    m.abrirPuerta(20, 20)', 'mapa.abrirPuerta(20, 20)',
    'cuando empieza:\n    buscar("Mapa").abrirPuerta(0, 0)', 'Abrir una casilla que no es una puerta: su tipo tiene que tener marcado «es una puerta».');
  c('objeto:cerrarPuerta', 'cuando empieza:\n    variable m = buscar("Mapa")\n    m.ponerCasilla(20, 20, "puerta")\n    m.abrirPuerta(20, 20, 0)\n    m.cerrarPuerta(20, 20)', 'mapa.cerrarPuerta(20, 20)',
    'cuando empieza:\n    buscar("Mapa").cerrarPuerta(20, 20, 500)', 'Dar los segundos en milisegundos: una puerta tarda de 0 a 60 segundos.');
  c('objeto:puertaAbierta', 'cuando empieza:\n    variable m = buscar("Mapa")\n    m.ponerCasilla(20, 20, "puerta")\n    m.abrirPuerta(20, 20, 0)\n    mostrar(m.puertaAbierta(20, 20))', 'si mapa.puertaAbierta(20, 20):',
    'cuando empieza:\n    mostrar(yo.puertaAbierta(20, 20))', 'Preguntárselo a un objeto que no es el mapa.');
  c('objeto:esPuerta', 'cuando empieza:\n    variable m = buscar("Mapa")\n    mostrar(m.esPuerta(m.columnaEn(yo.x), m.filaEn(yo.y)))', 'si mapa.esPuerta(20, 20):',
    'cuando empieza:\n    mostrar(buscar("Mapa").esPuerta(yo.x))', 'Darle un solo número: quiere la columna y la fila.');

  tema(4, 'Mirar con el ratón y con el mando', 'En primera persona se mira moviendo el ratón. Para eso el juego «captura» el ratón: la flecha desaparece, no se sale de la pantalla y se lee lo que se mueve. El navegador lo concede al hacer clic en el juego y lo suelta con Escape. Con mando se anda con una palanca y se mira con la otra: para eso el mando tiene que dejar de hacer de teclado.');
  c('mando:comoTeclado', 'cuando empieza:\n    mando.comoTeclado = falso', 'mando.comoTeclado = falso',
    'cuando empieza:\n    mando.comoTeclado = "no"', 'Darle un texto: es verdadero o falso.');
  c('raton:capturado', 'cuando empieza:\n    raton.capturado = verdadero', 'raton.capturado = verdadero',
    'cuando empieza:\n    raton.capturado = "si"', 'Darle un texto: es verdadero o falso.');
  c('raton:movX', 'cuando cada fotograma:\n    yo.rotacion -= raton.movX * 0.2', 'yo.rotacion -= raton.movX * 0.2',
    'cuando cada fotograma:\n    raton.movX = 0', 'Intentar cambiarlo: solo se lee.');
  c('raton:movY', 'cuando cada fotograma:\n    yo.y += raton.movY', 'yo.y += raton.movY',
    'cuando empieza:\n    yo.y += raton.movY', 'Leerlo en cuando empieza: es lo que se mueve el ratón en CADA fotograma.', 'l');
}
