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

  tema(3, 'Efectos especiales', 'Con un solo comando: explosiones, fuego, humo, rayos, lluvia... Están todos en efecto. El sitio puede ser un objeto (el efecto lo sigue), un vector, dos números o nada (donde está este objeto). Los que duran (fuego, humo, lluvia...) siguen hasta que los paras.');
  c('efecto:explosion', 'cuando toco Enemigo:\n    efecto.explosion(otro)\n    destruir(otro)', 'efecto.explosion(yo, 2)',
    'cuando empieza:\n    efecto.explosion(yo, 0)', 'Darle tamaño 0: una explosión tiene que tener algo de tamaño.');
  c('efecto:fuego', 'cuando empieza:\n    efecto.fuego(yo)', 'efecto.fuego(yo, 3)',
    'cuando empieza:\n    efecto.fuego(yo, 0)', 'Darle 0 segundos: el fuego no duraría nada. Sin segundos, dura siempre.');
  c('efecto:humo', 'cuando empieza:\n    efecto.humo(yo, 3)', 'efecto.humo(yo)',
    'cuando empieza:\n    efecto.humo("yo")', 'Poner yo entre comillas: es el objeto, no un texto.');
  c('efecto:chispas', 'cuando toco Enemigo:\n    efecto.chispas(otro)', 'efecto.chispas(yo)',
    'cuando empieza:\n    efecto.chispas(nulo)', 'Darle un objeto que no existe (nulo).');
  c('efecto:rayo', 'cuando se pulsa "espacio":\n    efecto.rayo(yo, buscar("Enemigo"))', 'efecto.rayo(yo, jugador)',
    'cuando empieza:\n    efecto.rayo(yo)', 'Darle un solo sitio: un rayo va de un sitio a otro.');
  c('efecto:estela', 'cuando empieza:\n    efecto.estela(yo)', 'efecto.estela(yo, 2)',
    'cuando empieza:\n    efecto.estela(100, 200)', 'Darle un punto: la estela va detrás de un objeto.');
  c('efecto:onda', 'cuando toco Enemigo:\n    efecto.onda(yo, 200)', 'efecto.onda(yo, 150)',
    'cuando empieza:\n    efecto.onda(yo, "grande")', 'Darle un texto: el radio son píxeles.');
  c('efecto:destello', 'cuando toco Moneda:\n    efecto.destello(otro, 100)', 'efecto.destello(yo)',
    'cuando empieza:\n    efecto.destello(yo, "mucho")', 'Darle un texto: el tamaño son píxeles.');
  c('efecto:lluvia', 'cuando empieza:\n    efecto.lluvia(2)', 'efecto.lluvia()',
    'cuando empieza:\n    efecto.lluvia(50)', 'Pasarse de intensidad: va de 0 a 10 (3 ya es una tormenta).');
  c('efecto:nieve', 'cuando empieza:\n    efecto.nieve()', 'efecto.nieve(2)',
    'cuando empieza:\n    efecto.nieve(0)', 'Ponerle 0 pensando que empieza poco a poco: con 0 la nieve se PARA.', 'l');
  c('efecto:hojas', 'cuando empieza:\n    efecto.hojas()', 'efecto.hojas(2)',
    'cuando empieza:\n    efecto.hojas(-1)', 'Darle una intensidad negativa: va de 0 a 10.');
  c('efecto:burbujas', 'cuando empieza:\n    efecto.burbujas(yo)', 'efecto.burbujas(yo, 5)',
    'cuando empieza:\n    efecto.burbujas(yo, -2)', 'Darle segundos negativos.');
  c('efecto:confeti', 'cuando toco Meta:\n    efecto.confeti(otro)', 'efecto.confeti(yo)',
    'cuando empieza:\n    efecto.confeti("fiesta")', 'Darle un texto: el sitio es un objeto o una posición.');
  c('efecto:sangre', 'cuando toco Enemigo:\n    efecto.sangre(yo)', 'efecto.sangre(yo)',
    'cuando empieza:\n    efecto.sangre(yo)\n    # y esperar que salga roja', 'Esperar que salga roja: con efecto.suave (lo normal) sale tinta de colores. Para que sea roja: efecto.suave = falso.', 'l');
  c('efecto:tinta', 'cuando toco Enemigo:\n    efecto.tinta(otro)', 'efecto.tinta(yo)',
    'cuando empieza:\n    efecto.tinta(nulo)', 'Darle un objeto que no existe (nulo).');
  c('efecto:polvo', 'cuando se pulsa "espacio":\n    si yo.saltar(600):\n        efecto.polvo(yo)', 'efecto.polvo(yo)',
    'cuando empieza:\n    efecto.polvo(100, 50)', 'Darle un punto: el polvo sale de los pies de un objeto.');
  c('efecto:golpe', 'cuando toco Enemigo:\n    efecto.golpe(otro, 25)', 'efecto.golpe(jugador, 10)',
    'cuando empieza:\n    efecto.golpe(25)', 'Olvidar a quién se golpea: primero el objeto, luego el daño.');
  c('efecto:texto', 'cuando toco Moneda:\n    efecto.texto("+1", otro, "amarillo")', 'efecto.texto("+1", yo, "amarillo")',
    'cuando empieza:\n    efecto.texto("+1", yo, "dorado")', 'Inventarse el color: "dorado" no es un color de Chispa (usa "amarillo" o "#ffd700").');
  c('efecto:usar', 'cuando empieza:\n    efecto.usar("fuego", yo)', 'efecto.usar("chispas", yo)',
    'cuando empieza:\n    efecto.usar("magia", yo)', 'Usar un efecto que no has hecho: los propios se hacen en Proyecto > Efectos.');
  c('efecto:parar', 'cuando empieza:\n    efecto.fuego(yo)\n    esperar(2)\n    efecto.parar("fuego", yo)', 'efecto.parar("fuego", yo)',
    'cuando empieza:\n    efecto.parar("fuegos")', 'Escribir mal el nombre: Chispa propone el parecido.');
  c('efecto:suave', 'cuando empieza:\n    efecto.suave = falso', 'efecto.suave = falso',
    'cuando empieza:\n    efecto.suave = "si"', 'Darle un texto: es verdadero o falso.');
  c('objeto:polvo', 'cuando empieza:\n    yo.polvo = verdadero', 'yo.polvo = verdadero',
    'cuando empieza:\n    yo.polvo = "mucho"', 'Darle un texto: es verdadero o falso.');
  c('objeto:efecto', 'cuando empieza:\n    yo.efecto = "fuego"', 'yo.efecto = "humo"',
    'cuando empieza:\n    yo.efecto = "explosion"', 'Ponerle un efecto de golpe: yo.efecto es uno que dura (fuego, humo, burbujas, estela). Para explotar: efecto.explosion(yo).');

  tema(3, 'Efectos de pantalla y de objeto', 'Para que un juego se SIENTA bien: la pantalla tiembla, se congela un instante al dar un golpe, destella... Y filtros para todo lo que se ve (blanco y negro, pixelado, tele antigua) o para un objeto (contorno, brillo). Al cambiar de escena, una transición: fundido, barrido, círculo o pixelado.');
  c('tiempo:congelar', 'cuando toco Enemigo:\n    tiempo.congelar(0.1)\n    escena.camara.temblar(8, 0.2)', 'tiempo.congelar(0.08)',
    'cuando empieza:\n    tiempo.congelar(30)', 'Congelar mucho rato: congelar es un instante (hasta 5 segundos). Para parar el juego, tiempo.pausar().');
  c('pantalla:flash', 'cuando toco Enemigo:\n    pantalla.flash("blanco", 0.2)', 'pantalla.flash()',
    'cuando empieza:\n    pantalla.flash("relampago")', 'Darle algo que no es un color: el primer dato es el color.');
  c('pantalla:normal', 'cuando se pulsa "n":\n    pantalla.normal()', 'pantalla.normal()',
    'cuando empieza:\n    pantalla.normal', 'Olvidar los paréntesis.');
  c('pantalla:grises', 'cuando empieza:\n    pantalla.grises = 1', 'pantalla.grises = 1',
    'cuando empieza:\n    pantalla.grises = 100', 'Darle un porcentaje: va de 0 a 1 (1 = blanco y negro del todo).');
  c('pantalla:desenfoque', 'cuando se pulsa "p":\n    pantalla.desenfoque = 4', 'pantalla.desenfoque = 3',
    'cuando empieza:\n    pantalla.desenfoque = -2', 'Darle un número negativo.');
  c('pantalla:pixelado', 'cuando empieza:\n    pantalla.pixelado = 4', 'pantalla.pixelado = 3',
    'cuando empieza:\n    pantalla.pixelado = 0', 'Darle 0: el tamaño normal de los píxeles es 1.');
  c('pantalla:brillo', 'cuando empieza:\n    pantalla.brillo = 0.6', 'pantalla.brillo = 1.3',
    'cuando empieza:\n    pantalla.brillo = -1', 'Darle un número negativo: 0 ya es todo negro.');
  c('pantalla:vineta', 'cuando empieza:\n    pantalla.vineta = 0.7', 'pantalla.vineta = 0.5',
    'cuando empieza:\n    pantalla.vineta = 5', 'Pasarse: va de 0 a 1.');
  c('pantalla:aberracion', 'cuando toco Enemigo:\n    pantalla.aberracion = 5\n    esperar(0.3)\n    pantalla.aberracion = 0', 'pantalla.aberracion = 4',
    'cuando empieza:\n    pantalla.aberracion = "mucha"', 'Darle un texto: son píxeles.');
  c('pantalla:crt', 'cuando empieza:\n    pantalla.crt = verdadero', 'pantalla.crt = verdadero',
    'cuando empieza:\n    pantalla.crt = "si"', 'Darle un texto: es verdadero o falso.');
  c('pantalla:bloom', 'cuando empieza:\n    pantalla.bloom = 0.6', 'pantalla.bloom = 0.5',
    'cuando empieza:\n    pantalla.bloom = 2', 'Pasarse: va de 0 a 1.');
  c('objeto:contorno', 'cuando cada fotograma:\n    si yo.ratonEncima:\n        yo.contorno = "blanco"\n    sino:\n        yo.contorno = nulo', 'yo.contorno = "blanco"',
    'cuando empieza:\n    yo.contorno = "blanquito"', 'Inventarse un color: Chispa propone el parecido.');
  c('objeto:grosorContorno', 'cuando empieza:\n    yo.contorno = "amarillo"\n    yo.grosorContorno = 5', 'yo.grosorContorno = 5',
    'cuando empieza:\n    yo.grosorContorno = 5', 'Cambiar el grosor sin poner yo.contorno: no hay contorno que engordar.', 'l');
  c('objeto:brillo', 'cuando cada fotograma:\n    si yo.ratonEncima:\n        yo.brillo = 1.4\n    sino:\n        yo.brillo = 1', 'yo.brillo = 1.5',
    'cuando empieza:\n    yo.brillo = -1', 'Darle un número negativo: 0 ya es negro.');
  c('objeto:grises', 'cuando empieza:\n    yo.grises = 1', 'yo.grises = 1',
    'cuando empieza:\n    yo.grises = 50', 'Darle un porcentaje: va de 0 a 1.');
  c('objeto:desenfoque', 'cuando empieza:\n    yo.desenfoque = 3', 'yo.desenfoque = 3',
    'cuando empieza:\n    yo.desenfoque = "poco"', 'Darle un texto: son píxeles.');
  c('objeto:flash', 'cuando toco Enemigo:\n    yo.flash()\n    tiempo.congelar(0.08)', 'yo.flash("rojo", 0.15)',
    'cuando empieza:\n    yo.flash("rojo", -1)', 'Darle segundos negativos.');

  tema(3, 'Luces y oscuridad', 'Para cuevas y noches: la escena se oscurece (escena.oscuridad) y los objetos llevan luz (yo.luz). Una luz puede ser de punto (antorcha) o un foco (linterna), de colores, que parpadea, y que hace sombras con las paredes.');
  c('escena:oscuridad', 'cuando empieza:\n    escena.oscuridad = 0.9', 'escena.oscuridad = 0.8',
    'cuando empieza:\n    escena.oscuridad = 90', 'Darle un porcentaje: va de 0 a 1 (0.9 es casi negro).');
  c('escena:luzAmbiente', 'cuando empieza:\n    escena.oscuridad = 0.8\n    escena.luzAmbiente = "#0a1030"', 'escena.luzAmbiente = "#0a1030"',
    'cuando empieza:\n    escena.luzAmbiente = "noche"', 'Darle algo que no es un color: es el COLOR de la oscuridad.');
  c('objeto:luz', 'cuando empieza:\n    escena.oscuridad = 0.9\n    yo.luz = verdadero', 'yo.luz = verdadero',
    'cuando empieza:\n    yo.luz = verdadero', 'Encender una luz sin oscuridad: de día no se nota. Pon también escena.oscuridad = 0.9.', 'l');
  c('objeto:tipoLuz', 'cuando empieza:\n    yo.luz = verdadero\n    yo.tipoLuz = "foco"', 'yo.tipoLuz = "foco"',
    'cuando empieza:\n    yo.tipoLuz = "linterna"', 'Inventarse el tipo: es "punto" o "foco".');
  c('objeto:colorLuz', 'cuando empieza:\n    yo.luz = verdadero\n    yo.colorLuz = "naranja"', 'yo.colorLuz = "naranja"',
    'cuando empieza:\n    yo.colorLuz = "fuego"', 'Darle algo que no es un color.');
  c('objeto:radioLuz', 'cuando empieza:\n    yo.luz = verdadero\n    yo.radioLuz = 300', 'yo.radioLuz = 300',
    'cuando empieza:\n    mostrar(yo.radioLuz)', 'Leerlo sin luz: primero yo.luz = verdadero.');
  c('objeto:intensidadLuz', 'cuando empieza:\n    yo.luz = verdadero\n    yo.intensidadLuz = 0.6', 'yo.intensidadLuz = 0.6',
    'cuando empieza:\n    yo.intensidadLuz = 50', 'Darle un porcentaje: va de 0 a 1 (puede pasar un poco de 1, hasta 10).');
  c('objeto:anguloLuz', 'cuando empieza:\n    yo.luz = verdadero\n    yo.tipoLuz = "foco"\n    yo.anguloLuz = 40', 'yo.anguloLuz = 40',
    'cuando empieza:\n    yo.luz = verdadero\n    yo.anguloLuz = 40', 'Cambiar el ángulo de una luz de punto: solo se nota en un foco (yo.tipoLuz = "foco").', 'l');
  c('objeto:luzConSombras', 'cuando empieza:\n    yo.luz = verdadero\n    yo.luzConSombras = verdadero', 'yo.luzConSombras = verdadero',
    'cuando empieza:\n    yo.luzConSombras = "si"', 'Darle un texto: es verdadero o falso.');
  c('objeto:parpadeoLuz', 'cuando empieza:\n    yo.luz = verdadero\n    yo.colorLuz = "naranja"\n    yo.parpadeoLuz = 0.5', 'yo.parpadeoLuz = 0.5',
    'cuando empieza:\n    yo.parpadeoLuz = 3', 'Pasarse: va de 0 a 1.');
}
