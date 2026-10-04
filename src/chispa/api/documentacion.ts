/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * DOCUMENTACIÓN DE CHISPA: una ficha para cada palabra, evento, función,
 * módulo, propiedad y acción, con una explicación en español y un ejemplo.
 *
 * De aquí salen:
 *   - el autocompletado del editor (qué se puede escribir en cada sitio);
 *   - la ayuda que aparece al pasar el ratón por una palabra;
 *   - la guía del lenguaje.
 *
 * Un test comprueba que TODO lo que existe en la API está documentado aquí
 * (y que aquí no hay nada que no exista), para que nunca se desincronicen.
 *
 * Todo SIN TILDES: es la forma oficial de Chispa.
 */
import { normalizar } from '../../utilidades/texto';

export type TipoDoc = 'palabra' | 'evento' | 'funcion' | 'modulo' | 'propiedad' | 'accion' | 'variable';

export interface Doc {
  /** Cómo se escribe (forma oficial): "mostrar", "pulsada", "cuando empieza"... */
  nombre: string;
  tipo: TipoDoc;
  /** Cómo se usa: "mostrar(valor, ...)", "teclado.pulsada(tecla)". */
  firma: string;
  descripcion: string;
  ejemplo: string;
  /** Texto que inserta el autocompletado (con ${1} donde queda el cursor). Si no se da, el nombre. */
  insertar?: string;
}

const d = (nombre: string, tipo: TipoDoc, firma: string, descripcion: string, ejemplo: string, insertar?: string): Doc => ({ nombre, tipo, firma, descripcion, ejemplo, insertar });

// ═════════════════════════ Palabras del lenguaje ═════════════════════════

export const DOC_PALABRAS: Doc[] = [
  d('variable', 'palabra', 'variable nombre = valor', 'Crea una variable nueva: una caja con nombre donde guardar un valor. Solo se usa la primera vez; después basta con nombre = valor.', 'variable vida = 3', 'variable ${1:nombre} = ${2:0}'),
  d('si', 'palabra', 'si condicion:', 'Ejecuta el bloque de dentro solo si la condición es verdadera.', 'si vida <= 0:\n    mostrar("Has perdido")', 'si ${1:condicion}:\n    '),
  d('sino', 'palabra', 'sino:  /  sino si condicion:', "Va después de un 'si'. Su bloque se ejecuta cuando la condición del 'si' es falsa. Con 'sino si' se encadenan más condiciones.", 'si vida > 50:\n    mostrar("Bien")\nsino:\n    mostrar("Cuidado")', 'sino:\n    '),
  d('mientras', 'palabra', 'mientras condicion:', 'Repite el bloque de dentro mientras la condición sea verdadera.', 'mientras vida > 0:\n    vida -= 1', 'mientras ${1:condicion}:\n    '),
  d('repetir', 'palabra', 'repetir N veces:', 'Repite el bloque de dentro un número de veces.', 'repetir 3 veces:\n    crear("Moneda", aleatorio(0, 900), 400)', 'repetir ${1:3} veces:\n    '),
  d('para', 'palabra', 'para cada x en lista:', 'Recorre una lista, un texto (letra a letra) o una tabla. Con una tabla se pueden usar dos nombres: para cada clave, valor en tabla.', 'para cada enemigo en buscarTodos("Enemigo"):\n    destruir(enemigo)', 'para cada ${1:elemento} en ${2:lista}:\n    '),
  d('cada', 'palabra', 'para cada x en lista:  /  cuando cada fotograma:', "Se usa en 'para cada' y en los eventos 'cuando cada fotograma' y 'cuando cada N segundos'.", 'para cada n en [1, 2, 3]:\n    mostrar(n)'),
  d('en', 'palabra', 'x en lista  /  "clave" en tabla', "Dos usos: en 'para cada x en lista', y para comprobar si algo está dentro de otra cosa (una clave en una tabla, un elemento en una lista, un trozo en un texto).", 'si "vida" en jugador:\n    mostrar(jugador.vida)'),
  d('funcion', 'palabra', 'funcion nombre(a, b):', 'Crea una función: un trozo de código con nombre que se puede usar muchas veces.', 'funcion curar(cantidad):\n    yo.vida += cantidad', 'funcion ${1:nombre}(${2}):\n    '),
  d('devolver', 'palabra', 'devolver valor', "Termina la función y da un resultado. Dentro de un 'cuando', termina el evento antes de tiempo.", 'funcion doble(n):\n    devolver n * 2', 'devolver ${1}'),
  d('romper', 'palabra', 'romper', 'Sale del bucle (mientras, repetir o para cada) en el que está.', 'mientras verdadero:\n    si listo:\n        romper'),
  d('continuar', 'palabra', 'continuar', 'Salta a la siguiente vuelta del bucle, sin terminar esta.', 'para cada n en lista:\n    si n < 0:\n        continuar\n    mostrar(n)'),
  d('cuando', 'palabra', 'cuando evento:', 'Empieza un evento: código que se ejecuta cuando pasa algo (al empezar, al pulsar una tecla, al tocar otro objeto...).', 'cuando se pulsa "espacio":\n    yo.saltar(600)'),
  d('verdadero', 'palabra', 'verdadero', 'El valor lógico «sí».', 'variable vivo = verdadero'),
  d('falso', 'palabra', 'falso', 'El valor lógico «no».', 'variable pausado = falso'),
  d('nulo', 'palabra', 'nulo', 'Nada, vacío. Es lo que vale algo que no existe (por ejemplo, buscar() cuando no encuentra nada).', 'si buscar("Jefe") == nulo:\n    mostrar("¡Ganaste!")'),
  d('y', 'palabra', 'a y b', 'Verdadero solo si las DOS cosas son verdaderas.', 'si vida > 0 y puntos >= 10:'),
  d('o', 'palabra', 'a o b', 'Verdadero si AL MENOS UNA de las dos es verdadera.', 'si teclado.pulsada("izquierda") o teclado.pulsada("a"):'),
  d('no', 'palabra', 'no a', 'Lo contrario: verdadero pasa a falso y al revés.', 'si no yo.enSuelo:'),
];

// ═════════════════════════ Eventos ═════════════════════════

export const DOC_EVENTOS: Doc[] = [
  d('cuando empieza', 'evento', 'cuando empieza:', 'Se ejecuta una vez, cuando el objeto aparece en la escena.', 'cuando empieza:\n    yo.vida = 3', 'cuando empieza:\n    '),
  d('cuando cada fotograma', 'evento', 'cuando cada fotograma:', 'Se ejecuta unas 60 veces por segundo. Es el sitio para mover cosas y comprobar teclas. Usa delta para que la velocidad no dependa del ordenador.', 'cuando cada fotograma:\n    yo.x += 100 * delta', 'cuando cada fotograma:\n    '),
  d('cuando cada N segundos', 'evento', 'cuando cada 2 segundos:', 'Se ejecuta una y otra vez, cada cierto tiempo.', 'cuando cada 2 segundos:\n    crear("Enemigo", 900, 300)', 'cuando cada ${1:2} segundos:\n    '),
  d('cuando pasen N segundos', 'evento', 'cuando pasen 3 segundos:', 'Se ejecuta UNA sola vez, ese tiempo después de que aparezca el objeto.', 'cuando pasen 3 segundos:\n    destruir(yo)', 'cuando pasen ${1:3} segundos:\n    '),
  d('cuando se pulsa', 'evento', 'cuando se pulsa "tecla":', 'Se ejecuta al pulsar una tecla (una vez por pulsación). Se pueden poner varias: "espacio", "w".', 'cuando se pulsa "espacio":\n    yo.saltar(600)', 'cuando se pulsa "${1:espacio}":\n    '),
  d('cuando se mantiene', 'evento', 'cuando se mantiene "tecla":', 'Se ejecuta en cada fotograma mientras la tecla esté pulsada.', 'cuando se mantiene "derecha":\n    yo.x += 200 * delta', 'cuando se mantiene "${1:derecha}":\n    '),
  d('cuando se suelta', 'evento', 'cuando se suelta "tecla":', 'Se ejecuta al soltar una tecla.', 'cuando se suelta "espacio":\n    mostrar("soltada")', 'cuando se suelta "${1:espacio}":\n    '),
  d('cuando toco', 'evento', 'cuando toco Nombre:', "Se ejecuta al EMPEZAR a tocar un objeto con ese nombre o tipo, o una casilla de ese tipo. El otro objeto está en 'otro' (y el tipo de casilla en 'casilla'). Sin nombre (cuando toco:) vale cualquier cosa.", 'cuando toco Moneda:\n    juego.puntos += 1\n    destruir(otro)', 'cuando toco ${1:Nombre}:\n    '),
  d('cuando dejo de tocar', 'evento', 'cuando dejo de tocar Nombre:', 'Se ejecuta cuando deja de tocar un objeto o casilla.', 'cuando dejo de tocar Agua:\n    yo.gravedad = 1', 'cuando dejo de tocar ${1:Nombre}:\n    '),
  d('cuando hago clic', 'evento', 'cuando hago clic:', 'Se ejecuta al hacer clic en cualquier sitio de la pantalla del juego.', 'cuando hago clic:\n    crear("Bola", raton.x, raton.y)', 'cuando hago clic:\n    '),
  d('cuando hago clic encima', 'evento', 'cuando hago clic encima:', 'Se ejecuta al hacer clic ENCIMA de este objeto. Sirve para hacer botones.', 'cuando hago clic encima:\n    escena.cambiar("Nivel1")', 'cuando hago clic encima:\n    '),
  d('cuando cambia', 'evento', 'cuando cambia:', 'En el script de un CONTROL de interfaz: se ejecuta cuando quien juega cambia lo que vale (mueve el deslizador, marca la casilla, escribe en el campo, elige en la lista o pulsa una opción del menú). El valor nuevo está en yo.valor.', 'cuando cambia:\n    sonido.volumen = yo.valor / 100', 'cuando cambia:\n    '),
  d('cuando termina la animacion', 'evento', 'cuando termina la animacion:', 'Se ejecuta cuando termina una animación que no se repite.', 'cuando termina la animacion:\n    yo.animar("quieto")', 'cuando termina la animacion:\n    '),
  d('cuando recibo', 'evento', 'cuando recibo "mensaje":', "Se ejecuta cuando alguien hace enviar(\"mensaje\") en cualquier script (le llega a TODOS los que lo escuchen, al empezar el siguiente fotograma). Si el mensaje trae algo, esta en 'dato'.", 'cuando recibo "abrir_puerta":\n    yo.ocultar()', 'cuando recibo "${1:mensaje}":\n    '),
  d('cuando salgo de la pantalla', 'evento', 'cuando salgo de la pantalla:', 'Se ejecuta cuando el objeto sale de lo que se ve (por un borde de la pantalla). Sirve para borrar balas y enemigos que ya no se ven, o para perder si el jugador se cae.', 'cuando salgo de la pantalla:\n    destruir(yo)', 'cuando salgo de la pantalla:\n    '),
];

// ═════════════════════════ Funciones ═════════════════════════

export const DOC_FUNCIONES: Doc[] = [
  d('mostrar', 'funcion', 'mostrar(valor, ...)', 'Escribe en la consola. Muy útil para ver qué valor tiene algo mientras pruebas.', 'mostrar("Vida:", yo.vida)', 'mostrar(${1})'),
  d('esperar', 'funcion', 'esperar(segundos)', 'Pausa ESTE evento un rato, sin parar el juego. Sin número, espera un fotograma.', 'yo.visible = falso\nesperar(0.5)\nyo.visible = verdadero', 'esperar(${1:1})'),
  d('crear', 'funcion', 'crear("Plantilla", x, y)', 'Crea un objeto nuevo a partir de una plantilla, en la posición (x, y). Devuelve el objeto creado.', 'variable bala = crear("Bala", yo.x, yo.y)', 'crear("${1:Plantilla}", ${2:yo.x}, ${3:yo.y})'),
  d('destruir', 'funcion', 'destruir(objeto)', 'Quita un objeto del juego.', 'cuando toco Moneda:\n    destruir(otro)', 'destruir(${1:otro})'),
  d('buscar', 'funcion', 'buscar("Nombre")', 'Busca un objeto por su nombre o su tipo. Si no lo encuentra, da nulo.', 'variable jugador = buscar("Jugador")', 'buscar("${1:Nombre}")'),
  d('buscarTodos', 'funcion', 'buscarTodos("Tipo")', 'Da una lista con todos los objetos de ese nombre o tipo.', 'mostrar(longitud(buscarTodos("Enemigo")))', 'buscarTodos("${1:Tipo}")'),
  d('distancia', 'funcion', 'distancia(a, b)', 'Distancia en píxeles entre dos objetos o dos posiciones.', 'si distancia(yo, buscar("Jugador")) < 100:', 'distancia(${1:yo}, ${2:otro})'),
  d('particulas', 'funcion', 'particulas("tipo", x, y)', 'Crea un efecto de partículas. Tipos: "explosion", "humo", "chispas", "polvo", "confeti", "estrellas". También acepta una tabla: {tipo: "humo", color: "verde", cantidad: 30}.', 'particulas("explosion", yo.x, yo.y)', 'particulas("${1:explosion}", ${2:yo.x}, ${3:yo.y})'),
  d('guardar', 'funcion', 'guardar("clave", valor)', 'Guarda un dato del jugador en el navegador (se conserva al cerrar el juego): récords, niveles, opciones...', 'guardar("record", puntos)', 'guardar("${1:clave}", ${2:valor})'),
  d('cargar', 'funcion', 'cargar("clave", porDefecto)', 'Lee un dato guardado con guardar(). Si no existe, da el valor por defecto.', 'variable record = cargar("record", 0)', 'cargar("${1:clave}", ${2:0})'),
  d('borrarGuardado', 'funcion', 'borrarGuardado("clave")', 'Borra un dato guardado.', 'borrarGuardado("record")', 'borrarGuardado("${1:clave}")'),
  d('aleatorio', 'funcion', 'aleatorio(min, max)', 'Un número entero al azar entre min y max (los dos incluidos). Sin nada, un decimal entre 0 y 1.', 'variable dado = aleatorio(1, 6)', 'aleatorio(${1:1}, ${2:6})'),
  d('elegir', 'funcion', 'elegir(lista)', 'Un elemento al azar de una lista.', 'yo.color = elegir(["rojo", "verde", "azul"])', 'elegir([${1}])'),
  d('probabilidad', 'funcion', 'probabilidad(porcentaje)', 'Verdadero ese porcentaje de las veces. probabilidad(30) es verdadero 30 de cada 100 veces.', 'si probabilidad(10):\n    crear("Premio", yo.x, yo.y)', 'probabilidad(${1:50})'),
  d('redondear', 'funcion', 'redondear(numero, decimales)', 'Redondea un número. Sin decimales, al entero más cercano.', 'mostrar(redondear(3.14159, 2))', 'redondear(${1})'),
  d('absoluto', 'funcion', 'absoluto(numero)', 'El número sin signo: absoluto(-5) es 5.', 'si absoluto(yo.velocidad.x) > 100:', 'absoluto(${1})'),
  d('raiz', 'funcion', 'raiz(numero)', 'La raíz cuadrada.', 'mostrar(raiz(16))', 'raiz(${1})'),
  d('minimo', 'funcion', 'minimo(a, b, ...)', 'El más pequeño de varios números.', 'yo.vida = minimo(yo.vida + 1, 10)', 'minimo(${1})'),
  d('maximo', 'funcion', 'maximo(a, b, ...)', 'El más grande de varios números.', 'yo.vida = maximo(yo.vida - 1, 0)', 'maximo(${1})'),
  d('seno', 'funcion', 'seno(grados)', 'El seno de un ángulo EN GRADOS. Sirve para movimientos de vaivén.', 'yo.y = 200 + seno(tiempo.total * 90) * 50', 'seno(${1})'),
  d('coseno', 'funcion', 'coseno(grados)', 'El coseno de un ángulo EN GRADOS.', 'yo.x = 400 + coseno(tiempo.total * 90) * 50', 'coseno(${1})'),
  d('vector', 'funcion', 'vector(x, y)', 'Un vector: dos números juntos (una posición, una velocidad...).', 'yo.velocidad = vector(0, 300)', 'vector(${1:0}, ${2:0})'),
  d('tangente', 'funcion', 'tangente(grados)', 'La tangente de un ángulo EN GRADOS.', 'mostrar(tangente(45))', 'tangente(${1})'),
  d('aleatorioDecimal', 'funcion', 'aleatorioDecimal(min, max)', 'Un número CON DECIMALES al azar entre min y max (aleatorio() da enteros).', 'yo.tamano = aleatorioDecimal(0.5, 1.5)', 'aleatorioDecimal(${1:0}, ${2:1})'),
  d('limitar', 'funcion', 'limitar(valor, min, max)', 'Deja el número entre min y max: si se pasa, da max; si no llega, da min.', 'yo.vida = limitar(yo.vida, 0, 100)', 'limitar(${1:valor}, ${2:0}, ${3:100})'),
  d('interpolar', 'funcion', 'interpolar(desde, hasta, cuanto)', 'Un valor entre dos: con 0 da el primero, con 1 el segundo, con 0.5 el de en medio. Vale con números y con vectores.', 'yo.x = interpolar(yo.x, raton.x, 0.1)', 'interpolar(${1:0}, ${2:100}, ${3:0.5})'),
  d('redondearAbajo', 'funcion', 'redondearAbajo(numero)', 'Quita los decimales hacia abajo: redondearAbajo(3.9) es 3.', 'variable columna = redondearAbajo(yo.x / 48)', 'redondearAbajo(${1})'),
  d('redondearArriba', 'funcion', 'redondearArriba(numero)', 'Redondea hacia arriba: redondearArriba(3.1) es 4.', 'variable paginas = redondearArriba(total / 10)', 'redondearArriba(${1})'),
  d('signo', 'funcion', 'signo(numero)', '1 si es positivo, -1 si es negativo, 0 si es cero. Para saber hacia dónde va algo.', 'yo.voltear = signo(yo.velocidad.x) < 0', 'signo(${1})'),
  d('potencia', 'funcion', 'potencia(base, exponente)', 'Multiplica un número por sí mismo varias veces: potencia(2, 3) = 2 × 2 × 2 = 8.', 'mostrar(potencia(2, 10))', 'potencia(${1:2}, ${2:3})'),
  d('ruido', 'funcion', 'ruido(x, y)', 'Un número entre 0 y 1 «al azar pero suave»: cambia poco a poco al cambiar x. Para nubes, terrenos o movimientos naturales.', 'yo.y = 200 + ruido(tiempo.total) * 100', 'ruido(${1:tiempo.total})'),
  d('unir', 'funcion', 'unir(lista, separador)', 'Junta los elementos de una lista en un texto, con el separador entre medias (por defecto ", ").', 'yo.texto = unir(inventario, " - ")', 'unir(${1:lista}, ${2:", "})'),
  d('rango', 'funcion', 'rango(desde, hasta, paso)', 'Una lista de numeros seguidos, de desde a hasta (los dos incluidos). Sirve para contar con para cada. El paso es opcional (1 si no se dice). Si hasta es menor que desde, cuenta hacia atras.', 'para cada i en rango(1, 5):\n    crear("Moneda", i * 100, 300)', 'rango(${1:1}, ${2:10})'),
  d('aLaVez', 'funcion', 'aLaVez(funcion, valores...)', 'Empieza a ejecutar una funcion POR SU CUENTA, como si fuera otro evento: quien la llama sigue sin esperar a que acabe. Sirve para cosas que duran (con esperar dentro) sin parar el resto del script. Se escribe el nombre de la funcion sin parentesis, y detras sus valores.', 'funcion lluvia(veces):\n    repetir veces veces:\n        crear("Gota", aleatorio(0, 900), 540)\n        esperar(0.2)\n\ncuando se pulsa "espacio":\n    aLaVez(lluvia, 10)\n    mostrar("esto sale enseguida")', 'aLaVez(${1:funcion})'),
  d('dialogo', 'funcion', 'dialogo("quien", "texto", opciones)', 'Una caja de dialogo abajo de la pantalla: el texto sale letra a letra y se pasa con espacio, intro o clic. Quien habla y las opciones (una lista) no son obligatorios. Con opciones, devuelve la elegida. Mientras se lee, el juego se para.', 'cuando toco Jugador:\n    variable r = dialogo("Ana", "¿Me ayudas?", ["Si", "No"])\n    si r == "Si":\n        juego.mision = 1', 'dialogo("${1:Ana}", "${2:Hola}")'),
  d('rayo', 'funcion', 'rayo(desde, direccion, largo, atraviesa)', "Lanza una linea invisible y dice lo primero que toca (un objeto con colision o una casilla solida), o nulo. Desde: un objeto (no se toca a si mismo) o un vector. Direccion: un angulo (0 = derecha, 90 = arriba), un vector o un objeto hacia el que mirar. Da una tabla con objeto, punto, distancia y casilla. El cuarto valor (si se pone) dice que atraviesa: \"solidos\" = solo lo paran las cosas solidas (pasa a traves de los fantasmas: monedas, zonas, balas); o un nombre, un tipo o una etiqueta, o una lista de ellos.", 'variable r = rayo(yo, buscar("Jugador"), 400)\nsi r != nulo y r.objeto.nombre == "Jugador":\n    mostrar("te veo")', 'rayo(${1:yo}, ${2:0}, ${3:500})'),
  d('enviar', 'funcion', 'enviar("mensaje", dato)', "Avisa a todos los objetos que tengan 'cuando recibo \"mensaje\"'. El dato es opcional (un numero, un texto, un objeto...) y llega en 'dato'.", 'cuando toco Llave:\n    enviar("abrir_puerta")', 'enviar("${1:mensaje}")'),
  d('contar', 'funcion', 'contar("Tipo")', 'Cuántos objetos hay con ese nombre o tipo.', 'si contar("Enemigo") == 0:\n    escena.cambiar("Ganaste")', 'contar("${1:Tipo}")'),
  d('clonar', 'funcion', 'clonar(objeto)', 'Hace una copia del objeto tal como está ahora (sitio, color, tamaño, propiedades), con su script. Devuelve la copia.', 'variable copia = clonar(yo)\ncopia.x += 50', 'clonar(${1:yo})'),
  d('buscarConEtiqueta', 'funcion', 'buscarConEtiqueta("etiqueta")', 'Una lista con los objetos que tienen esa etiqueta (ver yo.ponerEtiqueta).', 'para cada e en buscarConEtiqueta("malo"):\n    e.color = "rojo"', 'buscarConEtiqueta("${1:etiqueta}")'),
  d('angulo', 'funcion', 'angulo(desde, hasta)', 'El ángulo en grados de la flecha que va de un objeto (o posición) a otro: 0 = derecha, 90 = arriba.', 'yo.rotacion = angulo(yo, raton.posicion)', 'angulo(${1:yo}, ${2:otro})'),
  d('cronometro', 'funcion', 'cronometro()', 'Un cronómetro nuevo, que empieza a contar ya. Tiene .segundos, .reiniciar(), .pausar() y .seguir().', 'variable crono = cronometro()\nmostrar(crono.segundos)', 'cronometro()'),
  d('animar', 'funcion', 'animar(sitio, hasta, segundos, suavizado)', 'Cambia algo POCO A POCO hasta un valor en esos segundos (0.5 si no se dice): la posición, el tamaño, el giro, la opacidad, un color... Suavizados: "suave" (el normal), "lineal", "entrada", "salida", "rebote", "elastico" y "atras".', 'animar(yo.tamano, 2, 0.5)\nanimar(yo.color, "rojo", 1, "lineal")', 'animar(${1:yo.tamano}, ${2:2}, ${3:0.5})'),
  d('longitud', 'funcion', 'longitud(x)', 'Cuántas letras tiene un texto, o cuántos elementos una lista o una tabla.', 'mostrar(longitud(buscarTodos("Moneda")))', 'longitud(${1})'),
  d('texto', 'funcion', 'texto(valor)', 'Convierte cualquier valor en texto.', 'yo.texto = "Puntos: " + texto(juego.puntos)', 'texto(${1})'),
  d('paleta', 'funcion', 'paleta("nombre", n)', 'Los colores de una paleta lista ("pastel", "retro", "neon", "natural", "oceano", "fuego", "bosque", "caramelo", "grises", "arcoiris"). Con un número, solo ese color (del 1 al 8).', 'yo.color = paleta("neon", 3)', 'paleta("${1:pastel}", ${2:1})'),
  d('mezclarColores', 'funcion', 'mezclarColores(color1, color2, cuanto)', 'El color que sale de mezclar dos: con 0 da el primero, con 1 el segundo y con 0.5 el de en medio.', 'yo.color = mezclarColores("rojo", "amarillo", 0.5)', 'mezclarColores("${1:rojo}", "${2:amarillo}", ${3:0.5})'),
  d('semilla', 'funcion', 'semilla(numero)', 'Hace que el azar SE REPITA: con la misma semilla, aleatorio(), elegir(), probabilidad() y lista.mezclar() dan siempre lo mismo y en el mismo orden. Sirve para mundos hechos al azar que son iguales para todos (el nivel del día) o para repetir una partida. semilla() sin nada vuelve al azar de verdad.', 'cuando empieza:\n    semilla(2026)\n    mostrar(aleatorio(1, 100))', 'semilla(${1:1234})'),
  d('controles', 'funcion', 'controles(jugador)', 'Los controles de un jugador (del 1 al 4), para jugar varios en el mismo ordenador. Cada uno tiene arriba, abajo, izquierda, derecha, a y b, en su trozo del teclado y en su mando. Jugador 1: W A S D, a = espacio, b = F. Jugador 2: flechas, a = Intro, b = Mayusculas. Jugador 3: I J K L, a = O, b = U. Jugador 4: 8 4 5 6, a = 0, b = 9. En el mando: cruceta o palanca, a = A, b = B.', 'cuando cada fotograma:\n    si controles(2).sePulso("a"):\n        yo.saltar(600)', 'controles(${1:1})'),
  d('numero', 'funcion', 'numero(texto)', 'Convierte un texto con un número ("42") en un número de verdad.', 'variable n = numero("42") + 1', 'numero(${1})'),
];

// ═════════════════════════ Módulos y variables especiales ═════════════════════════

export interface DocModulo {
  nombre: string;
  descripcion: string;
  ejemplo: string;
  miembros: Doc[];
}

export const DOC_MODULOS: DocModulo[] = [
  {
    nombre: 'teclado',
    descripcion: 'El teclado. Nombres de tecla: "espacio", "enter", "escape", "mayus", "control", "alt", "tab", "borrar", las flechas "arriba", "abajo", "izquierda", "derecha", letras ("a"), números ("1") y "f1"…"f12".',
    ejemplo: 'si teclado.pulsada("derecha"):\n    yo.x += 200 * delta',
    miembros: [
      d('pulsada', 'accion', 'teclado.pulsada("tecla")', 'Verdadero MIENTRAS la tecla esté pulsada. Para moverse.', 'si teclado.pulsada("izquierda"):\n    yo.x -= 200 * delta', 'pulsada("${1:izquierda}")'),
      d('sePulso', 'accion', 'teclado.sePulso("tecla")', 'Verdadero solo en el fotograma en que se pulsa la tecla. Para saltar o disparar una vez.', 'si teclado.sePulso("espacio"):\n    yo.saltar(600)', 'sePulso("${1:espacio}")'),
      d('seSolto', 'accion', 'teclado.seSolto("tecla")', 'Verdadero solo en el fotograma en que se suelta la tecla.', 'si teclado.seSolto("espacio"):\n    mostrar("soltada")', 'seSolto("${1:espacio}")'),
      d('algunaSePulso', 'accion', 'teclado.algunaSePulso()', 'Verdadero en el fotograma en que se pulsa CUALQUIER tecla. Para «pulsa una tecla para empezar».', 'si teclado.algunaSePulso():\n    escena.cambiar("Nivel1")', 'algunaSePulso()'),
      d('ultima', 'propiedad', 'teclado.ultima', 'La última tecla que se ha pulsado (su nombre: "a", "espacio"...), o nulo si todavía ninguna.', 'cuando cada fotograma:\n    yo.texto = "Última tecla: {teclado.ultima}"'),
      d('pulsadas', 'propiedad', 'teclado.pulsadas', 'Una lista con las teclas que están pulsadas ahora mismo.', 'mostrar(teclado.pulsadas)'),
    ],
  },
  {
    nombre: 'raton',
    descripcion: 'El ratón, en coordenadas del mundo (la Y crece hacia arriba).',
    ejemplo: 'cuando hago clic:\n    crear("Bola", raton.x, raton.y)',
    miembros: [
      d('x', 'propiedad', 'raton.x', 'Posición horizontal del ratón en el mundo.', 'yo.x = raton.x'),
      d('y', 'propiedad', 'raton.y', 'Posición vertical del ratón en el mundo (hacia arriba).', 'yo.y = raton.y'),
      d('posicion', 'propiedad', 'raton.posicion', 'Posición del ratón como vector.', 'yo.mirarA(raton.posicion)'),
      d('rueda', 'propiedad', 'raton.rueda', 'Cuánto se ha girado la rueda en este fotograma (positivo = hacia abajo).', 'escena.camara.zoom -= raton.rueda * 0.1'),
      d('objeto', 'propiedad', 'raton.objeto', 'El objeto que hay debajo del ratón (el de más arriba), o nulo si no hay ninguno.', 'si raton.sePulso() y raton.objeto != nulo:\n    destruir(raton.objeto)'),
      d('visible', 'propiedad', 'raton.visible', 'Si es falso, la flecha del ratón no se ve encima del juego (para poner tu propia mira).', 'raton.visible = falso'),
      d('capturado', 'propiedad', 'raton.capturado', 'Si es verdadero, el juego se queda con el ratón: la flecha desaparece y no se sale de la pantalla, y lo que se mueve se lee en raton.movX y raton.movY. Para mirar con el ratón en primera persona. El navegador lo concede al hacer clic en el juego, y lo suelta con la tecla Escape (por eso al leerlo dice si lo tiene de verdad).', 'cuando empieza:\n    raton.capturado = verdadero'),
      d('movX', 'propiedad', 'raton.movX', 'Cuánto se ha movido el ratón a los lados en este fotograma, en píxeles (positivo = a la derecha). Solo se lee.', 'cuando cada fotograma:\n    yo.rotacion -= raton.movX * 0.2'),
      d('movY', 'propiedad', 'raton.movY', 'Cuánto se ha movido el ratón arriba o abajo en este fotograma, en píxeles (positivo = hacia arriba). Solo se lee.', 'cuando cada fotograma:\n    yo.y += raton.movY'),
      d('pulsado', 'accion', 'raton.pulsado("izquierdo")', 'Verdadero mientras el botón esté pulsado ("izquierdo", "derecho" o "medio").', 'si raton.pulsado("izquierdo"):\n    disparar()', 'pulsado("${1:izquierdo}")'),
      d('sePulso', 'accion', 'raton.sePulso("izquierdo")', 'Verdadero solo en el fotograma en que se pulsa el botón.', 'si raton.sePulso():\n    mostrar("clic")', 'sePulso()'),
      d('seSolto', 'accion', 'raton.seSolto("izquierdo")', 'Verdadero solo en el fotograma en que se suelta el botón (por ejemplo, para soltar algo que arrastras).', 'si raton.seSolto():\n    mostrar("soltado")', 'seSolto()'),
    ],
  },
  {
    nombre: 'escena',
    descripcion: 'La escena que se está jugando.',
    ejemplo: 'escena.cambiar("Nivel2")',
    miembros: [
      d('nombre', 'propiedad', 'escena.nombre', 'El nombre de la escena actual.', 'mostrar(escena.nombre)'),
      d('objetos', 'propiedad', 'escena.objetos', 'Lista con todos los objetos de la escena.', 'mostrar(longitud(escena.objetos))'),
      d('gravedad', 'propiedad', 'escena.gravedad', 'La gravedad de la escena (1500 normal, 0 para juegos vistos desde arriba).', 'escena.gravedad = 0'),
      d('camara', 'modulo', 'escena.camara', 'La cámara: qué parte del mundo se ve.', 'escena.camara.seguir(yo)'),
      d('camaraDe', 'accion', 'escena.camaraDe(numero)', 'Con la pantalla dividida (pantalla.dividir), la cámara de ese trozo: la 1 es la de siempre (escena.camara), la 2 la del segundo trozo... Tiene lo mismo que escena.camara: seguir, zoom, x, y, limites y temblar.', 'pantalla.dividir(2)\nescena.camaraDe(2).seguir(buscar("Jugador2"))', 'camaraDe(${1:2})'),
      d('oscuridad', 'propiedad', 'escena.oscuridad', 'Oscuridad de la escena, de 0 (de día: no hacen falta luces) a 1 (negro donde no llega ninguna luz). Para cuevas y noches, con objetos que llevan luz.', 'escena.oscuridad = 0.9'),
      d('luzAmbiente', 'propiedad', 'escena.luzAmbiente', 'El color de la oscuridad (negro si no se dice). Un azul muy oscuro parece de noche.', 'escena.luzAmbiente = "#0a1030"'),
      d('colorFondo', 'propiedad', 'escena.colorFondo', 'El color del fondo de la escena.', 'escena.colorFondo = "azul"'),
      d('cambiar', 'accion', 'escena.cambiar("Nombre", segundos, transicion)', 'Cambia a otra escena. Los datos de juego (juego.puntos...) se conservan. Con segundos, una transición: la pantalla se tapa y se destapa. Transiciones: "fundido" (la normal), "barrido", "circulo" y "pixelado".', 'escena.cambiar("Nivel2", 1)', 'cambiar("${1:Nivel2}")'),
      d('reiniciar', 'accion', 'escena.reiniciar()', 'Vuelve a empezar la escena actual desde el principio.', 'si juego.vidas <= 0:\n    escena.reiniciar()', 'reiniciar()'),
    ],
  },
  {
    nombre: 'escena.camara',
    descripcion: 'La cámara de la escena.',
    ejemplo: 'escena.camara.seguir(yo)\nescena.camara.zoom = 2',
    miembros: [
      d('seguir', 'accion', 'escena.camara.seguir(objeto)', 'La cámara sigue a un objeto (suavemente).', 'escena.camara.seguir(yo)', 'seguir(${1:yo})'),
      d('limites', 'accion', 'escena.camara.limites(izquierda, abajo, derecha, arriba)', 'La cámara no enseña nada fuera de esta zona. También se le puede dar un mapa de casillas (no sale de él), o nada para quitar los límites. En el editor: Cámara > «no salir del mapa».', 'escena.camara.limites(buscar("Mapa"))', 'limites(${1:0}, ${2:0}, ${3:3000}, ${4:540})'),
      d('encuadrar', 'accion', 'escena.camara.encuadrar(objetos, margen)', 'PANTALLA COMPARTIDA: la cámara se pone en medio de esos objetos (una lista) y se aleja lo justo para que se vean todos, con un margen alrededor (120 si no se dice). Al juntarse vuelve a acercarse. Se quita con escena.camara.seguir(...) o con una lista vacía.', 'cuando empieza:\n    escena.camara.encuadrar([buscar("Jugador1"), buscar("Jugador2")])', 'encuadrar([${1:buscar("Jugador1"), buscar("Jugador2")}])'),
      d('temblar', 'accion', 'escena.camara.temblar(intensidad, segundos)', 'Hace temblar la pantalla (explosiones, golpes).', 'escena.camara.temblar(10, 0.3)', 'temblar(${1:8}, ${2:0.3})'),
      d('zoom', 'propiedad', 'escena.camara.zoom', '1 = normal, 2 = más cerca (todo el doble de grande), 0.5 = más lejos.', 'escena.camara.zoom = 2'),
      d('x', 'propiedad', 'escena.camara.x', 'Centro de la cámara (horizontal).', 'escena.camara.x = 480'),
      d('y', 'propiedad', 'escena.camara.y', 'Centro de la cámara (vertical).', 'escena.camara.y = 270'),
      d('suavizado', 'propiedad', 'escena.camara.suavizado', 'Lo rápido que alcanza al objeto que sigue (8 por defecto; más alto = más rápido).', 'escena.camara.suavizado = 3'),
    ],
  },
  {
    nombre: 'sonido',
    descripcion: 'Efectos de sonido: los importados (.mp3, .ogg, .wav), los hechos con el generador de efectos (Proyecto > Sonidos > +) y los que se generan solos (sonido.efecto, sonido.tono).',
    ejemplo: 'sonido.reproducir("salto")',
    miembros: [
      d('reproducir', 'accion', 'sonido.reproducir("nombre", volumen, tono, lado)', 'Reproduce un sonido del proyecto (importado, o hecho con el generador de efectos). Volumen de 0 a 1; tono 1 = normal, 2 = más agudo, 0.5 = más grave; lado de -1 (izquierda) a 1 (derecha). Los tres se pueden dejar sin poner.', 'sonido.reproducir("salto", 0.5, aleatorioDecimal(0.9, 1.1))', 'reproducir("${1:nombre}")'),
      d('bucle', 'accion', 'sonido.bucle("nombre", volumen)', 'Reproduce un sonido una y otra vez, hasta que se pare con sonido.parar("nombre").', 'sonido.bucle("motor", 0.4)', 'bucle("${1:nombre}")'),
  d('parar', 'accion', 'sonido.parar("nombre")', 'Para un sonido (o todos, sin nombre).', 'sonido.parar()', 'parar()'),
      d('sonando', 'accion', 'sonido.sonando("nombre")', 'Verdadero si ese sonido está sonando ahora.', 'si no sonido.sonando("motor"):\n    sonido.bucle("motor")', 'sonando("${1:nombre}")'),
      d('pausar', 'accion', 'sonido.pausar()', 'Congela TODO el sonido (efectos y música) sin perder por dónde iba.', 'sonido.pausar()', 'pausar()'),
      d('seguir', 'accion', 'sonido.seguir()', 'Sigue el sonido que se había pausado con sonido.pausar().', 'sonido.seguir()', 'seguir()'),
      d('efecto', 'accion', 'sonido.efecto("nombre", volumen, tono)', 'Un efecto de sonido que se GENERA solo, sin archivos: disparo, laser, explosion, golpe, salto, moneda, poder, dash, escudo, hielo, fuego, rayo, subir, perder, clic, alarma, dano. Con tono 2 suena mas agudo y con 0.5 mas grave.', 'cuando toco Moneda:\n    sonido.efecto("moneda")', 'efecto("${1:explosion}")'),
      d('tono', 'accion', 'sonido.tono(frecuencia, segundos)', 'Un pitido generado, sin archivos. 440 es la nota La.', 'sonido.tono(880, 0.1)', 'tono(${1:440}, ${2:0.2})'),
      d('volumen', 'propiedad', 'sonido.volumen', 'Volumen de los efectos, de 0 a 1.', 'sonido.volumen = 0.5'),
      d('reproducirEn', 'accion', 'sonido.reproducirEn("nombre", sitio, alcance, volumen)', 'Reproduce un sonido EN UN SITIO del mundo (un objeto o un vector): suena más flojo cuanto más lejos está del oyente, y por el altavoz del lado donde está. El alcance es hasta dónde se oye, en píxeles (800 si no se dice).', 'cuando toco Bala:\n    sonido.reproducirEn("explosion", otro, 900)', 'reproducirEn("${1:nombre}", ${2:yo}, ${3:800})'),
      d('bucleEn', 'accion', 'sonido.bucleEn("nombre", sitio, alcance, volumen)', 'Un sonido que no para, pegado a un objeto o a un punto: una cascada, un motor, una hoguera. Se oye al acercarse y va con el objeto; si el objeto se destruye, se para. Se quita con sonido.parar("nombre").', 'cuando empieza:\n    sonido.bucleEn("cascada", yo, 600)', 'bucleEn("${1:nombre}", ${2:yo}, ${3:600})'),
      d('ponerVolumen', 'accion', 'sonido.ponerVolumen("nombre", volumen, segundos)', 'Cambia el volumen de un sonido QUE YA ESTÁ SONANDO (de 0 a 1). Con segundos, poco a poco. Devuelve cuántos sonidos ha cambiado.', 'sonido.ponerVolumen("motor", 0.2, 1)', 'ponerVolumen("${1:nombre}", ${2:0.5})'),
      d('ponerTono', 'accion', 'sonido.ponerTono("nombre", tono, segundos)', 'Cambia el tono (y la velocidad) de un sonido que ya está sonando: 1 = normal, 2 = más agudo y rápido. Un motor que acelera, una alarma que sube.', 'cuando cada fotograma:\n    sonido.ponerTono("motor", 1 + yo.velocidad.x / 400)', 'ponerTono("${1:nombre}", ${2:1.5})'),
      d('ponerPan', 'accion', 'sonido.ponerPan("nombre", lado, segundos)', 'Por qué lado suena un sonido que ya está sonando: -1 = izquierda, 0 = centro, 1 = derecha.', 'sonido.ponerPan("motor", -1)', 'ponerPan("${1:nombre}", ${2:-1})'),
      d('oyente', 'propiedad', 'sonido.oyente', 'Quién escucha los sonidos con sitio (sonido.reproducirEn, sonido.bucleEn): un objeto, o nulo para que sea el centro de la cámara (lo normal).', 'sonido.oyente = buscar("Jugador")'),
    ],
  },
  {
    nombre: 'musica',
    descripcion: 'Música de fondo: suena en bucle y solo una a la vez. Vale un archivo importado o una canción hecha en el editor de música (Proyecto > Música); las pistas de una canción son capas que se suben y se bajan mientras se juega.',
    ejemplo: 'musica.reproducir("tema")',
    miembros: [
      d('reproducir', 'accion', 'musica.reproducir("nombre", fundido)', 'Pone una música en bucle (para la anterior). Con un número, empieza en silencio y sube poco a poco durante esos segundos.', 'musica.reproducir("tema", 2)', 'reproducir("${1:nombre}")'),
      d('parar', 'accion', 'musica.parar(fundido)', 'Para la música. Con un número, baja poco a poco durante esos segundos.', 'musica.parar(2)', 'parar()'),
      d('pausar', 'accion', 'musica.pausar()', 'Pone la música en pausa (recuerda por dónde iba).', 'musica.pausar()', 'pausar()'),
      d('seguir', 'accion', 'musica.seguir()', 'Sigue la música por donde iba.', 'musica.seguir()', 'seguir()'),
      d('volumen', 'propiedad', 'musica.volumen', 'Volumen de la música, de 0 a 1.', 'musica.volumen = 0.3'),
      d('cruzar', 'accion', 'musica.cruzar("nombre", segundos)', 'Pasa a otra música CRUZÁNDOLAS: la que suena baja mientras la nueva sube (2 segundos si no se dice). Para pasar de la música tranquila a la de combate sin cortes.', 'cuando recibo "jefe":\n    musica.cruzar("combate", 2)', 'cruzar("${1:nombre}", ${2:2})'),
      d('capa', 'accion', 'musica.capa(numero, volumen, segundos)', 'Sube o baja UNA capa de la música que suena. Las capas son las pistas de una canción hecha en el editor de música, en su orden (la 1 es la primera). Con segundos, poco a poco.', 'cuando recibo "peligro":\n    musica.capa(3, 1, 2)', 'capa(${1:2}, ${2:1}, ${3:2})'),
      d('intensidad', 'propiedad', 'musica.intensidad', 'Música adaptativa con un solo número: con 0 solo suena la primera capa, con 1 todas, y en medio van entrando una a una. Para canciones del editor de música con varias pistas. Se recuerda: la música siguiente empieza con esa intensidad.', 'musica.intensidad = contar("Enemigo") / 10'),
      d('tono', 'propiedad', 'musica.tono', 'La velocidad de la música (y su tono): 1 = normal, 1.2 = más rápida y aguda, 0.8 = más lenta y grave. De 0.25 a 4.', 'si juego.tiempo < 10:\n    musica.tono = 1.3'),
      d('actual', 'propiedad', 'musica.actual', 'El nombre de la música que suena (o nulo).', 'si musica.actual == nulo:\n    musica.reproducir("tema")'),
    ],
  },
  {
    nombre: 'tiempo',
    descripcion: 'El tiempo del juego.',
    ejemplo: 'tiempo.escala = 0.5   # cámara lenta',
    miembros: [
      d('total', 'propiedad', 'tiempo.total', 'Segundos que lleva funcionando el juego.', 'mostrar(redondear(tiempo.total))'),
      d('delta', 'propiedad', 'tiempo.delta', 'Segundos desde el fotograma anterior (igual que delta).', 'yo.x += 100 * tiempo.delta'),
      d('escala', 'propiedad', 'tiempo.escala', 'La velocidad del tiempo: 1 = normal, 0.5 = cámara lenta, 2 = el doble de rápido, 0 = pausa.', 'tiempo.escala = 0.5'),
      d('pausado', 'propiedad', 'tiempo.pausado', 'Verdadero si el juego está en pausa (tiempo.pausar()).', 'si tiempo.pausado:\n    yo.texto = "PAUSA"'),
      d('fps', 'propiedad', 'tiempo.fps', 'Fotogramas por segundo: cuántas veces por segundo se dibuja el juego (60 es lo normal).', 'yo.texto = "FPS: {tiempo.fps}"'),
      d('pausar', 'accion', 'tiempo.pausar()', 'Pone el juego en pausa: todo se para (física, animaciones, cronómetros), pero las teclas siguen funcionando para poder quitarla.', 'cuando se pulsa "p":\n    si tiempo.pausado:\n        tiempo.seguir()\n    sino:\n        tiempo.pausar()', 'pausar()'),
      d('seguir', 'accion', 'tiempo.seguir()', 'Quita la pausa.', 'tiempo.seguir()', 'seguir()'),
      d('congelar', 'accion', 'tiempo.congelar(segundos)', 'Congela el juego un instante (0,08 segundos si no se dice): al dar un golpe fuerte, se nota mucho más.', 'cuando toco Enemigo:\n    tiempo.congelar(0.1)', 'congelar(${1:0.08})'),
      d('camaraLenta', 'accion', 'tiempo.camaraLenta(velocidad, segundos)', 'Cámara lenta durante un rato y luego vuelve sola a la normalidad.', 'cuando toco Enemigo:\n    tiempo.camaraLenta(0.3, 1)', 'camaraLenta(${1:0.3}, ${2:1})'),
    ],
  },
  {
    nombre: 'tactil',
    descripcion: 'Jugar con el dedo, en móviles y tabletas: una palanca (joystick) y botones en la pantalla, arrastrar para mirar, gestos y vibración. La palanca hace de flechas y cada botón pulsa una tecla, así que el resto del juego no cambia. Solo se ven cuando se juega con el dedo (con teclado o mando se esconden), y quien juega puede moverlos a su gusto. Si no pones ninguno, Chispa pone solo los botones de las teclas que usa tu juego.',
    ejemplo: 'cuando empieza:\n    tactil.joystick()\n    tactil.boton("Saltar", "espacio")',
    miembros: [
      d('joystick', 'accion', 'tactil.joystick(lado)', 'Pone una palanca en la pantalla, a la "izquierda" (si no se dice) o a la "derecha". Hace lo mismo que las flechas: con yo.moverConFlechas ya funciona, y además poco inclinada va despacio. Con tactil.joystick("izquierda", falso) no pulsa las flechas: solo se lee con tactil.x y tactil.y.', 'cuando empieza:\n    tactil.joystick()\n\ncuando cada fotograma:\n    yo.moverConFlechas(300)', 'joystick()'),
      d('boton', 'accion', 'tactil.boton("nombre", "tecla")', 'Pone un botón en la pantalla con ese nombre (12 letras como mucho). Si se le da una tecla, al tocarlo es como pulsarla: «cuando se pulsa "espacio"» salta igual. Sin tecla, se pregunta con tactil.pulsado("nombre"). Caben 12.', 'cuando empieza:\n    tactil.boton("Saltar", "espacio")\n\ncuando se pulsa "espacio":\n    yo.saltar(600)', 'boton("${1:Saltar}", "${2:espacio}")'),
      d('pulsado', 'accion', 'tactil.pulsado("nombre")', 'Verdadero mientras se tiene el dedo en ese botón.', 'cuando cada fotograma:\n    si tactil.pulsado("Fuego"):\n        mostrar("disparando")', 'pulsado("${1:Fuego}")'),
      d('sePulso', 'accion', 'tactil.sePulso("nombre")', 'Verdadero solo en el fotograma en que se toca ese botón (una vez por toque).', 'cuando cada fotograma:\n    si tactil.sePulso("Fuego"):\n        crear("Bala", yo.x, yo.y)', 'sePulso("${1:Fuego}")'),
      d('seSolto', 'accion', 'tactil.seSolto("nombre")', 'Verdadero solo en el fotograma en que se levanta el dedo de ese botón.', 'cuando cada fotograma:\n    si tactil.seSolto("Cargar"):\n        mostrar("¡suelta!")', 'seSolto("${1:Cargar}")'),
      d('x', 'propiedad', 'tactil.x', 'Cuánto está inclinada la palanca a los lados: de -1 (izquierda) a 1 (derecha). 0 si no se toca.', 'yo.x += tactil.x * 300 * delta'),
      d('y', 'propiedad', 'tactil.y', 'Cuánto está inclinada la palanca arriba o abajo: de -1 (abajo) a 1 (arriba). 0 si no se toca.', 'yo.y += tactil.y * 300 * delta'),
      d('mirar', 'accion', 'tactil.mirar()', 'Activa «arrastrar para mirar»: lo que se mueve el dedo por la pantalla (fuera de los controles) se lee en tactil.miraX y tactil.miraY. Para apuntar o mover la cámara. tactil.mirar(falso) lo apaga.', 'cuando empieza:\n    tactil.mirar()\n\ncuando cada fotograma:\n    yo.rotacion -= tactil.miraX', 'mirar()'),
      d('miraX', 'propiedad', 'tactil.miraX', 'Con tactil.mirar(): cuánto se ha movido el dedo a los lados en este fotograma, en píxeles del juego (positivo = a la derecha).', 'escena.camara.x -= tactil.miraX'),
      d('miraY', 'propiedad', 'tactil.miraY', 'Con tactil.mirar(): cuánto se ha movido el dedo arriba o abajo en este fotograma (positivo = hacia arriba).', 'escena.camara.y -= tactil.miraY'),
      d('gesto', 'propiedad', 'tactil.gesto', 'El gesto que se ha hecho con el dedo en este fotograma: "toque", "doble" (dos toques seguidos), "largo" (dedo quieto), "arriba", "abajo", "izquierda" o "derecha" (deslizar). "" si no ha habido ninguno.', 'cuando cada fotograma:\n    si tactil.gesto == "arriba":\n        yo.saltar(600)'),
      d('pellizco', 'propiedad', 'tactil.pellizco', 'Pellizcar con dos dedos: cuánto se han separado en este fotograma. 1 = igual, más de 1 = se separan, menos de 1 = se juntan. Para acercar la cámara.', 'cuando cada fotograma:\n    escena.camara.zoom = escena.camara.zoom * tactil.pellizco'),
      d('dedos', 'propiedad', 'tactil.dedos', 'Cuántos dedos están tocando la pantalla del juego ahora.', 'si tactil.dedos == 2:\n    mostrar("dos dedos")'),
      d('toques', 'propiedad', 'tactil.toques', 'Dónde está cada dedo que toca la pantalla, en el mundo: una lista de vectores (vacía si no hay ninguno).', 'para cada dedo en tactil.toques:\n    dibujar.circulo(dedo.x, dedo.y, 30, "amarillo")'),
      d('hay', 'propiedad', 'tactil.hay', 'Verdadero si el aparato se maneja con el dedo (un móvil, una tableta) o se está tocando la pantalla ahora. Para cambiar algo del juego según sea móvil u ordenador.', 'si tactil.hay:\n    buscar("Ayuda").texto = "Toca para saltar"\nsino:\n    buscar("Ayuda").texto = "Espacio para saltar"'),
      d('mostrar', 'propiedad', 'tactil.mostrar', 'Cuándo se ven los controles: "auto" (solo cuando se juega con el dedo: lo normal), "siempre" o "nunca".', 'tactil.mostrar = "siempre"'),
      d('tamano', 'propiedad', 'tactil.tamano', 'El tamaño de los controles: 1 = normal, de 0.5 (la mitad) a 2 (el doble).', 'tactil.tamano = 1.3'),
      d('opacidad', 'propiedad', 'tactil.opacidad', 'Cuánto se ven los controles: de 0.1 (casi nada) a 1 (del todo). 0.6 si no se dice.', 'tactil.opacidad = 0.4'),
      d('mover', 'accion', 'tactil.mover("nombre", x, y)', 'Pone un control ("joystick" o el nombre de un botón) en un sitio de la pantalla: x de 0 (izquierda) a 100 (derecha) e y de 0 (abajo) a 100 (arriba). Si quien juega lo ha movido a su gusto, manda lo suyo.', 'cuando empieza:\n    tactil.boton("Saltar", "espacio")\n    tactil.mover("Saltar", 85, 20)', 'mover("${1:Saltar}", ${2:85}, ${3:20})'),
      d('quitar', 'accion', 'tactil.quitar("nombre")', 'Quita un control ("joystick" o un botón). Sin nombre, los quita todos.', 'tactil.quitar("Saltar")', 'quitar()'),
      d('colocar', 'accion', 'tactil.colocar()', 'Abre el modo colocar: quien juega arrastra cada control a donde le venga bien y pulsa «Listo». Se le recuerda para las siguientes partidas. Ponlo en un botón de tu menú de opciones.', 'cuando hago clic encima:\n    tactil.colocar()', 'colocar()'),
      d('vibrar', 'accion', 'tactil.vibrar(segundos)', 'Hace vibrar el móvil (0,1 segundos si no se dice; como mucho 5). Si el aparato no sabe vibrar (los iPhone, los ordenadores), no pasa nada. Para un mando, mando.vibrar.', 'cuando toco Enemigo:\n    tactil.vibrar(0.2)', 'vibrar(${1:0.2})'),
    ],
  },
  {
    nombre: 'vista3d',
    descripcion: 'Ver el juego en PRIMERA PERSONA, con 3D simulado (como los primeros juegos de disparos). El juego es el de siempre, visto desde arriba: un mapa de casillas, objetos, física sin gravedad. Con vista3d.ver(yo) se pinta desde los ojos de ese objeto: las casillas sólidas del mapa son paredes (con su imagen), las que no lo son son baldosas del suelo, y cada objeto es un dibujo que siempre te mira, más pequeño cuanto más lejos. Se gira con yo.rotacion y se anda como siempre. Todo lo demás (choques, yo.irHacia, rayo, sonidos con sitio) funciona igual.',
    ejemplo: 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.niebla("negro", 200, 900)\n\ncuando cada fotograma:\n    si teclado.pulsada("izquierda"):\n        yo.rotacion += 120 * delta\n    si teclado.pulsada("derecha"):\n        yo.rotacion -= 120 * delta\n    si teclado.pulsada("arriba"):\n        yo.avanzar(200 * delta)',
    miembros: [
      d('ver', 'accion', 'vista3d.ver(objeto)', 'Pone la vista en primera persona: el mundo se ve desde ese objeto (desde yo, si no se dice), mirando hacia donde apunta su rotación. Hace falta un mapa de casillas en la escena: sus casillas sólidas son las paredes. El objeto desde el que se mira no se ve.', 'cuando empieza:\n    vista3d.ver(yo)', 'ver(${1:yo})'),
      d('quitar', 'accion', 'vista3d.quitar()', 'Vuelve a la vista normal, desde arriba (por ejemplo, para enseñar el mapa entero).', 'cuando se pulsa "m":\n    vista3d.quitar()', 'quitar()'),
      d('activa', 'propiedad', 'vista3d.activa', 'Verdadero si se está viendo en primera persona (solo se lee: se pone con vista3d.ver y se quita con vista3d.quitar).', 'si vista3d.activa:\n    mostrar("en primera persona")'),
      d('observador', 'propiedad', 'vista3d.observador', 'El objeto desde el que se mira, o nulo si la vista no está puesta (solo se lee).', 'si vista3d.observador == yo:\n    mostrar("miro yo")'),
      d('campo', 'propiedad', 'vista3d.campo', 'Cuánto se ve a lo ancho, en grados: de 30 (como con unos prismáticos) a 120 (ojo de pez). 66 si no se dice. Bajarlo de golpe sirve para apuntar con zoom.', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.campo = 80'),
      d('altura', 'propiedad', 'vista3d.altura', 'A qué altura están los ojos: de 0.05 (pegados al suelo) a 0.95 (pegados al techo). 0.5 si no se dice. Para agacharse, o para que la vista suba y baje un poco al andar.', 'cuando cada fotograma:\n    vista3d.altura = 0.5 + seno(tiempo.total * 400) * 0.02'),
      d('inclinacion', 'propiedad', 'vista3d.inclinacion', 'Mirar hacia arriba (positivo) o hacia abajo (negativo): de -1 a 1. 0 = de frente.', 'cuando cada fotograma:\n    vista3d.inclinacion = limitar(vista3d.inclinacion + raton.movY * 0.002, -0.6, 0.6)'),
      d('brillo', 'propiedad', 'vista3d.brillo', 'La luz de todo lo que se ve en 3D: 1 = normal, 0 = a oscuras, hasta 3. Subirlo un instante hace el destello de un disparo.', 'cuando se pulsa "espacio":\n    vista3d.brillo = 1.6\n    animar(vista3d.brillo, 1, 0.15)'),
      d('suelo', 'accion', 'vista3d.suelo("imagen o color")', 'Con qué se pinta el suelo donde el mapa no tiene casilla: una imagen del proyecto (se repite en cada casilla) o un color. Las casillas NO sólidas del mapa se ven como baldosas con su propia imagen.', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.suelo("#444444")', 'suelo("${1:gris}")'),
      d('techo', 'accion', 'vista3d.techo("imagen o color")', 'Con qué se pinta el techo: una imagen del proyecto o un color. Quita el cielo si lo había.', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.techo("#222233")', 'techo("${1:#222233}")'),
      d('cielo', 'accion', 'vista3d.cielo("imagen")', 'Un cielo en vez de techo: una imagen ancha que da la vuelta entera al girar y nunca se acerca (para sitios al aire libre). Sin nada, vista3d.cielo() lo quita.', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.cielo("jugador")', 'cielo("${1:nubes}")'),
      d('pared', 'accion', 'vista3d.pared("tipo", "imagen")', 'Cambia la imagen con la que se pinta un tipo de casilla del mapa en primera persona (si no se dice, la del mapa). Sirve para que una pared tenga un dibujo desde arriba y otro de frente.', 'cuando empieza:\n    vista3d.pared("suelo", "jugador")', 'pared("${1:muro}", "${2:ladrillo}")'),
      d('niebla', 'accion', 'vista3d.niebla("color", desde, hasta)', 'Niebla con la distancia: a «desde» píxeles empieza a notarse y a «hasta» ya solo se ve el color de la niebla. Da ambiente, y además lo que queda detrás no hay que pintarlo. Sin nada, vista3d.niebla() la quita.', 'cuando empieza:\n    vista3d.ver(yo)\n    vista3d.niebla("negro", 200, 900)', 'niebla("${1:negro}", ${2:200}, ${3:900})'),
      d('mapa', 'accion', 'vista3d.mapa(objeto)', 'Elige qué mapa de casillas hace de paredes, si en la escena hay más de uno (si no se dice, el primero que tenga casillas sólidas).', 'cuando empieza:\n    vista3d.mapa(buscar("Mapa"))\n    vista3d.ver(yo)', 'mapa(${1:buscar("Mapa")})'),
      d('enPantalla', 'accion', 'vista3d.enPantalla(objeto, altura)', 'En qué punto de la pantalla se ve un objeto (o una posición) en primera persona: un vector, como los de dibujar.enPantalla; o nulo si queda detrás de ti. Para poner un nombre, una barra de vida o una flecha encima de alguien. La altura, en píxeles desde el suelo (si no se dice, la de en medio).', 'cuando cada fotograma:\n    variable p = vista3d.enPantalla(buscar("Jugador"))\n    si p != nulo:\n        dibujar.enPantalla.texto("AQUI", p.x, p.y, "blanco")', 'enPantalla(${1:objeto})'),
      d('seVe', 'accion', 'vista3d.seVe(objeto)', 'Verdadero si ese objeto (o esa posición) se ve ahora mismo en la pantalla: está delante y no lo tapa una pared.', 'cuando cada fotograma:\n    si vista3d.seVe(buscar("Jugador")):\n        mostrar("lo veo")', 'seVe(${1:objeto})'),
      d('columnas', 'propiedad', 'vista3d.columnas', 'Cuántas columnas tiene la imagen en 3D (cada una es un rayo). Si no se toca (0), las que diga pantalla.calidad: 640 en alta, 480 en media y 320 en baja. Con menos va más rápido y se ve más «pixelado». De 64 a 1280.', 'cuando empieza:\n    vista3d.columnas = 320'),
      d('milisegundos', 'propiedad', 'vista3d.milisegundos', 'Lo que ha tardado en pintarse la vista 3D en el último fotograma, en milésimas de segundo (solo se lee). Para medir: a 60 fotogramas por segundo, cada uno tiene 16 en total.', 'cuando cada 1 segundos:\n    mostrar(vista3d.milisegundos)'),
    ],
  },
  {
    nombre: 'puntuaciones',
    descripcion: 'La tabla de las 10 mejores puntuaciones del juego, con el nombre de quien las hizo. Se guarda en el ordenador de quien juega (como guardar y cargar). En el editor, «Pantallas listas» trae una pantalla de Fin del juego y una Tabla de puntuaciones que ya la usan.',
    ejemplo: 'si puntuaciones.entra(juego.puntos):\n    puntuaciones.guardar("Ana", juego.puntos)',
    miembros: [
      d('guardar', 'accion', 'puntuaciones.guardar("nombre", puntos)', 'Apunta una puntuación en la tabla. Devuelve su puesto (1 = la mejor) o 0 si no entra entre las 10 mejores.', 'variable puesto = puntuaciones.guardar("Ana", juego.puntos)\nsi puesto == 1:\n    mostrar("¡Nuevo record!")', 'guardar("${1:nombre}", ${2:juego.puntos})'),
      d('lista', 'accion', 'puntuaciones.lista()', 'Las mejores puntuaciones, de mayor a menor: una lista de tablas con nombre y puntos.', 'para cada p en puntuaciones.lista():\n    mostrar(p.nombre, p.puntos)', 'lista()'),
      d('entra', 'accion', 'puntuaciones.entra(puntos)', 'Verdadero si esos puntos entrarían en la tabla (hay hueco, o superan a la última).', 'si puntuaciones.entra(juego.puntos):\n    mostrar("¡Escribe tu nombre!")', 'entra(${1:juego.puntos})'),
      d('borrar', 'accion', 'puntuaciones.borrar()', 'Deja la tabla vacía.', 'puntuaciones.borrar()', 'borrar()'),
    ],
  },
  {
    nombre: 'junta',
    descripcion: 'Unir objetos con cuerdas, muelles y bisagras. El objeto que se une necesita Física (y no ser estático); el otro extremo puede ser otro objeto o un punto del mundo (un vector). Se dibujan solas (junta.visibles = falso para que no).',
    ejemplo: 'cuando empieza:\n    junta.cuerda(yo, vector(yo.x, yo.y + 200))',
    miembros: [
      d('cuerda', 'accion', 'junta.cuerda(objeto, otro, largo, color)', 'Una cuerda: no deja que se separen más de su largo (si no se dice, lo lejos que están ahora). Más cerca está floja. Para péndulos, lianas, ganchos y cadenas.', 'junta.cuerda(yo, buscar("Gancho"), 200)', 'cuerda(${1:yo}, ${2:buscar("Gancho")}, ${3:200})'),
      d('muelle', 'accion', 'junta.muelle(objeto, otro, largo, rigidez, color)', 'Un muelle: tira hacia su largo, más fuerte cuanto más lejos, y se queda botando. La rigidez (60 si no se dice) es lo duro que es: 10 = goma blanda, 300 = muy duro.', 'junta.muelle(yo, buscar("Techo"), 120, 60)', 'muelle(${1:yo}, ${2:buscar("Techo")}, ${3:120})'),
      d('bisagra', 'accion', 'junta.bisagra(objeto, eje, color)', 'Una bisagra: el objeto se queda siempre a la misma distancia del eje (un punto u otro objeto) y gira a su alrededor, como una puerta, un péndulo rígido o un balancín.', 'junta.bisagra(yo, vector(yo.x, yo.y + 150))', 'bisagra(${1:yo}, ${2:vector(400, 300)})'),
      d('quitar', 'accion', 'junta.quitar(objeto, otro)', 'Suelta las juntas de un objeto: todas, o solo las que lo unen con otro. Devuelve cuántas ha quitado.', 'cuando se pulsa "espacio":\n    junta.quitar(yo)', 'quitar(${1:yo})'),
      d('visibles', 'propiedad', 'junta.visibles', 'Si las juntas se dibujan (verdadero, lo normal) o no (falso: para dibujarlas a tu manera).', 'junta.visibles = falso'),
    ],
  },
  {
    nombre: 'efecto',
    descripcion: 'Efectos especiales listos con un comando. El sitio puede ser un objeto (el efecto lo sigue), un vector, dos números (x, y) o nada (donde está este objeto). Los que duran (fuego, humo, burbujas, estela, lluvia, nieve, hojas) siguen hasta que se paran con efecto.parar o se acaban sus segundos.',
    ejemplo: 'cuando toco Bomba:\n    efecto.explosion(otro)\n    destruir(otro)',
    miembros: [
      d('explosion', 'accion', 'efecto.explosion(sitio, tamaño)', 'Una explosión: fuego, humo, un destello y una onda. Con tamaño 2, el doble de grande.', 'efecto.explosion(yo, 2)', 'explosion(${1:yo})'),
      d('fuego', 'accion', 'efecto.fuego(sitio, segundos)', 'Fuego que no se apaga (o que dura esos segundos). Si el sitio es un objeto, el fuego va con él.', 'efecto.fuego(yo)', 'fuego(${1:yo})'),
      d('humo', 'accion', 'efecto.humo(sitio, segundos)', 'Humo que sube y se deshace.', 'efecto.humo(yo, 3)', 'humo(${1:yo})'),
      d('chispas', 'accion', 'efecto.chispas(sitio)', 'Un puñado de chispas que brillan.', 'efecto.chispas(otro)', 'chispas(${1:otro})'),
      d('rayo', 'accion', 'efecto.rayo(desde, hasta, color)', 'Un rayo eléctrico en zigzag entre dos sitios (si son objetos, los sigue). Dura un momento.', 'efecto.rayo(yo, buscar("Enemigo"))', 'rayo(${1:yo}, ${2:otro})'),
      d('estela', 'accion', 'efecto.estela(objeto, segundos)', 'Una estela detrás del objeto: copias de él que se apagan (para cosas que van rápido).', 'efecto.estela(yo)', 'estela(${1:yo})'),
      d('onda', 'accion', 'efecto.onda(sitio, radio)', 'Una onda expansiva: un anillo que crece y se apaga.', 'efecto.onda(yo, 200)', 'onda(${1:yo}, ${2:150})'),
      d('destello', 'accion', 'efecto.destello(sitio, tamaño)', 'Un destello de luz redondo, muy rápido.', 'efecto.destello(yo, 150)', 'destello(${1:yo})'),
      d('lluvia', 'accion', 'efecto.lluvia(intensidad)', 'Lluvia por toda la pantalla. Intensidad: 1 normal, 3 tormenta, 0 la para.', 'efecto.lluvia(2)', 'lluvia(${1:1})'),
      d('nieve', 'accion', 'efecto.nieve(intensidad)', 'Nieve cayendo por toda la pantalla (0 la para).', 'efecto.nieve()', 'nieve(${1:1})'),
      d('hojas', 'accion', 'efecto.hojas(intensidad)', 'Hojas de otoño cayendo y girando (0 las para).', 'efecto.hojas()', 'hojas(${1:1})'),
      d('burbujas', 'accion', 'efecto.burbujas(sitio, segundos)', 'Burbujas que suben haciendo eses.', 'efecto.burbujas(yo)', 'burbujas(${1:yo})'),
      d('confeti', 'accion', 'efecto.confeti(sitio)', 'Confeti de colores, para celebrar.', 'efecto.confeti(yo)', 'confeti(${1:yo})'),
      d('sangre', 'accion', 'efecto.sangre(sitio)', 'Gotas de sangre. Con efecto.suave (lo normal) sale tinta de colores con estrellitas.', 'efecto.sangre(otro)', 'sangre(${1:otro})'),
      d('tinta', 'accion', 'efecto.tinta(sitio)', 'Una salpicadura de tinta de colores.', 'efecto.tinta(otro)', 'tinta(${1:otro})'),
      d('polvo', 'accion', 'efecto.polvo(objeto)', 'Polvo a los pies del objeto (al saltar o al caer). Con yo.polvo = verdadero sale solo.', 'efecto.polvo(yo)', 'polvo(${1:yo})'),
      d('golpe', 'accion', 'efecto.golpe(objeto, daño)', 'Un golpe: chispitas y el número de daño, que sube y se desvanece. Con un texto, sale el texto.', 'efecto.golpe(otro, 25)', 'golpe(${1:otro}, ${2:10})'),
      d('texto', 'accion', 'efecto.texto("texto", sitio, color)', 'Un texto que sube y se desvanece: "+1", "¡Bien!"...', 'efecto.texto("+1", yo, "amarillo")', 'texto("${1:+1}", ${2:yo})'),
      d('usar', 'accion', 'efecto.usar("nombre", sitio, segundos)', 'Un efecto hecho por ti en el editor de partículas (Proyecto > Efectos).', 'efecto.usar("magia", yo)', 'usar("${1:magia}", ${2:yo})'),
      d('parar', 'accion', 'efecto.parar("nombre", sitio)', 'Para los efectos que duran: los de ese nombre (y de ese objeto, si se dice), o todos si no se dice nada.', 'efecto.parar("fuego", yo)', 'parar("${1:fuego}")'),
      d('suave', 'propiedad', 'efecto.suave', 'Versión suave para los más pequeños: si es verdadero (lo normal), la sangre sale como tinta de colores.', 'efecto.suave = falso'),
    ],
  },
  {
    nombre: 'pantalla',
    descripcion: 'La pantalla del juego: su tamaño, fundidos, un flash y filtros para todo lo que se ve (escala de grises, pixelado, viñeta, tele antigua...). Los filtros duran hasta que se cambian o se cambia de escena.',
    ejemplo: 'yo.x = pantalla.ancho / 2',
    miembros: [
      d('ancho', 'propiedad', 'pantalla.ancho', 'Ancho de la pantalla del juego en píxeles.', 'yo.x = pantalla.ancho / 2'),
      d('alto', 'propiedad', 'pantalla.alto', 'Alto de la pantalla del juego en píxeles.', 'yo.y = pantalla.alto - 30'),
      d('completa', 'propiedad', 'pantalla.completa', 'Pantalla completa: verdadero para ponerla, falso para quitarla. El navegador solo deja justo después de pulsar una tecla o hacer clic.', 'cuando se pulsa "f":\n    pantalla.completa = no pantalla.completa'),
      d('calidad', 'propiedad', 'pantalla.calidad', 'La calidad con la que se pinta el juego: "auto" (la que aguante el aparato: si va a trompicones se baja sola, y si va sobrado vuelve a subir), "alta", "media" o "baja". Con menos calidad hay menos píxeles, menos partículas y luces sin sombras: se ve un poco peor pero va fluido en un móvil lento. Se elige también en el inspector > Proyecto.', 'cuando empieza:\n    pantalla.calidad = "baja"'),
      d('nivelCalidad', 'propiedad', 'pantalla.nivelCalidad', 'La calidad que hay puesta ahora mismo: "alta", "media" o "baja" (con pantalla.calidad = "auto" puede ir cambiando). Solo se lee.', 'mostrar(pantalla.nivelCalidad)'),
      d('maximoFps', 'propiedad', 'pantalla.maximoFps', 'Cuántos fotogramas por segundo se pintan como mucho (0 = los que dé la pantalla). Con 30 el aparato trabaja la mitad: gasta menos batería y se calienta menos. El juego va igual de rápido.', 'cuando empieza:\n    pantalla.maximoFps = 30'),
      d('orientacion', 'propiedad', 'pantalla.orientacion', 'Cómo hay que tener el móvil para jugar: "horizontal" (tumbado), "vertical" (de pie) o "cualquiera". Si alguien lo abre al revés, sale un aviso de «gira el móvil». En un ordenador no hace nada.', 'cuando empieza:\n    pantalla.orientacion = "horizontal"'),
      d('oscurecer', 'accion', 'pantalla.oscurecer(segundos, color, cuanto)', 'Fundido: la pantalla se va poniendo de un color (negro si no se dice) durante esos segundos. Cuanto va de 0 a 1: con 0.5 se oscurece a medias y se sigue viendo el juego (1 si no se dice).', 'pantalla.oscurecer(0.2, "negro", 0.5)', 'oscurecer(${1:1})'),
      d('dividir', 'accion', 'pantalla.dividir(cuantas, como)', 'Divide la pantalla en 2, 3 o 4 trozos, cada uno con su cámara (escena.camaraDe(2)...): para jugar varios en el mismo ordenador. Con 2: "columnas" (lado a lado, lo normal) o "filas" (una encima de otra). pantalla.dividir(1) la deja entera. Al cambiar de escena vuelve a estar entera.', 'pantalla.dividir(2)\nescena.camara.seguir(buscar("Jugador1"))\nescena.camaraDe(2).seguir(buscar("Jugador2"))', 'dividir(${1:2})'),
      d('flash', 'accion', 'pantalla.flash(color, segundos)', 'Toda la pantalla de un color (blanco si no se dice) que se apaga enseguida: golpes fuertes, rayos, fotos.', 'pantalla.flash("blanco", 0.2)', 'flash("${1:blanco}", ${2:0.2})'),
      d('normal', 'accion', 'pantalla.normal()', 'Quita todos los filtros de pantalla.', 'pantalla.normal()', 'normal()'),
      d('grises', 'propiedad', 'pantalla.grises', 'Escala de grises: 0 = colores normales, 1 = blanco y negro.', 'pantalla.grises = 1'),
      d('desenfoque', 'propiedad', 'pantalla.desenfoque', 'Todo borroso (en píxeles). Muy útil detrás de un menú de pausa.', 'pantalla.desenfoque = 4'),
      d('pixelado', 'propiedad', 'pantalla.pixelado', 'Todo con «píxeles gordos» de ese tamaño (1 = normal).', 'pantalla.pixelado = 4'),
      d('brillo', 'propiedad', 'pantalla.brillo', 'El brillo de todo: 1 = normal, 0.5 = más oscuro, 1.5 = más claro.', 'pantalla.brillo = 0.6'),
      d('vineta', 'propiedad', 'pantalla.vineta', 'Viñeta: los bordes de la pantalla más oscuros, de 0 a 1. Da ambiente (cuevas, miedo).', 'pantalla.vineta = 0.7'),
      d('aberracion', 'propiedad', 'pantalla.aberracion', 'Aberración cromática: los colores se separan un poco (píxeles). Queda bien al recibir un golpe.', 'pantalla.aberracion = 4'),
      d('crt', 'propiedad', 'pantalla.crt', 'Efecto de tele antigua: rayas, bordes oscuros y colores algo separados.', 'pantalla.crt = verdadero'),
      d('bloom', 'propiedad', 'pantalla.bloom', 'Lo brillante deja un halo de luz alrededor, de 0 a 1 (fuego, neón, magia).', 'pantalla.bloom = 0.6'),
      d('aclarar', 'accion', 'pantalla.aclarar(segundos)', 'Quita el fundido poco a poco.', 'pantalla.aclarar(1)', 'aclarar(${1:1})'),
    ],
  },
  {
    nombre: 'dibujar',
    descripcion: 'Dibujar líneas, círculos, rectángulos y textos en el mundo del juego, para ver cosas mientras programas (a dónde apunta algo, hasta dónde ve un enemigo...). Lo dibujado dura UN fotograma: ponlo en «cuando cada fotograma». Colores: los de siempre ("rojo" si no se dice).',
    ejemplo: 'cuando cada fotograma:\n    dibujar.circulo(yo.x, yo.y, 200, "amarillo")',
    miembros: [
      d('linea', 'accion', 'dibujar.linea(x1, y1, x2, y2, color, grosor)', 'Una línea de un punto a otro.', 'dibujar.linea(yo.x, yo.y, raton.x, raton.y, "rojo")', 'linea(${1:yo.x}, ${2:yo.y}, ${3:raton.x}, ${4:raton.y})'),
      d('circulo', 'accion', 'dibujar.circulo(x, y, radio, color, relleno)', 'Un círculo (solo el borde; con verdadero al final, relleno).', 'dibujar.circulo(yo.x, yo.y, 100, "verde")', 'circulo(${1:yo.x}, ${2:yo.y}, ${3:50})'),
      d('rectangulo', 'accion', 'dibujar.rectangulo(x, y, ancho, alto, color, relleno)', 'Un rectángulo con su centro en (x, y), como los objetos.', 'dibujar.rectangulo(yo.x, yo.y, 64, 64, "azul")', 'rectangulo(${1:yo.x}, ${2:yo.y}, ${3:64}, ${4:64})'),
      d('texto', 'accion', 'dibujar.texto(texto, x, y, color, tamano, letra)', 'Un texto en ese sitio del mundo (por ejemplo, encima de un enemigo). Al final se puede decir el tipo de letra ("pixel", "titulo"...).', 'dibujar.texto(yo.vida, yo.x, yo.y + 40, "blanco")', 'texto(${1:"hola"}, ${2:yo.x}, ${3:yo.y})'),
      d('elipse', 'accion', 'dibujar.elipse(x, y, ancho, alto, color, relleno)', 'Un círculo aplastado con su centro en (x, y): ancho y alto es lo que mide entera. Solo el borde; con verdadero al final, rellena.', 'dibujar.elipse(yo.x, yo.y - 30, 80, 20, "negro", verdadero)', 'elipse(${1:yo.x}, ${2:yo.y}, ${3:120}, ${4:60})'),
      d('poligono', 'accion', 'dibujar.poligono(puntos, color, relleno, grosor)', 'Una forma con los puntos que quieras: una lista de vectores, en orden (se cierra sola). Solo el borde; con verdadero, rellena.', 'dibujar.poligono([vector(100, 100), vector(200, 100), vector(150, 180)], "amarillo", verdadero)', 'poligono([${1:vector(100, 100), vector(200, 100), vector(150, 180)}], "${2:amarillo}")'),
      d('arco', 'accion', 'dibujar.arco(x, y, radio, desde, hasta, color, relleno, grosor)', 'Un trozo de circulo de un angulo a otro, en grados (0 = derecha, 90 = arriba, y se cuenta al reves que las agujas del reloj). Con relleno = verdadero es un quesito: sirve para enseñar cuanto falta de un tiempo.', 'variable falta = 0.25\ndibujar.arco(yo.x, yo.y, 30, 90, 90 + 360 * falta, "#00000099", verdadero)', 'arco(${1:yo.x}, ${2:yo.y}, ${3:30}, ${4:0}, ${5:180})'),
      d('enPantalla', 'modulo', 'dibujar.enPantalla', 'Lo mismo, pero en la PANTALLA, como la interfaz: (0, 0) es la esquina de abajo a la izquierda y no se mueve con la camara. Sirve para barras de vida, marcadores e iconos.', 'dibujar.enPantalla.rectangulo(120, 700, 200, 16, "rojo", verdadero)'),
    ],
  },
  {
    nombre: 'dibujar.enPantalla',
    descripcion: 'Dibujar en la pantalla (sin camara): lo mismo que dibujar, con (0, 0) en la esquina de abajo a la izquierda. Dura un fotograma. Se ve por encima del mundo, pero por debajo de los objetos de la interfaz (asi un texto o un panel de pausa quedan siempre encima).',
    ejemplo: 'cuando cada fotograma:\n    dibujar.enPantalla.rectangulo(110, 700, 200 * yo.vida / 100, 16, "rojo", verdadero)',
    miembros: [
      d('linea', 'accion', 'dibujar.enPantalla.linea(x1, y1, x2, y2, color, grosor)', 'Una linea en la pantalla.', 'dibujar.enPantalla.linea(0, 360, 1280, 360, "blanco")', 'linea(${1:0}, ${2:0}, ${3:100}, ${4:100})'),
      d('circulo', 'accion', 'dibujar.enPantalla.circulo(x, y, radio, color, relleno)', 'Un circulo en la pantalla.', 'dibujar.enPantalla.circulo(60, 60, 30, "blanco", verdadero)', 'circulo(${1:60}, ${2:60}, ${3:30})'),
      d('rectangulo', 'accion', 'dibujar.enPantalla.rectangulo(x, y, ancho, alto, color, relleno)', 'Un rectangulo con el centro en (x, y) de la pantalla.', 'dibujar.enPantalla.rectangulo(110, 700, 200, 16, "rojo", verdadero)', 'rectangulo(${1:100}, ${2:100}, ${3:200}, ${4:20})'),
      d('texto', 'accion', 'dibujar.enPantalla.texto(texto, x, y, color, tamano, letra)', 'Un texto en la pantalla. Al final se puede decir el tipo de letra.', 'dibujar.enPantalla.texto("Vida", 20, 700, "blanco")', 'texto(${1:"hola"}, ${2:20}, ${3:700})'),
      d('elipse', 'accion', 'dibujar.enPantalla.elipse(x, y, ancho, alto, color, relleno)', 'Una elipse en la pantalla, con el centro en (x, y).', 'dibujar.enPantalla.elipse(480, 60, 300, 40, "blanco")', 'elipse(${1:480}, ${2:60}, ${3:300}, ${4:40})'),
      d('poligono', 'accion', 'dibujar.enPantalla.poligono(puntos, color, relleno, grosor)', 'Una forma con los puntos que quieras (una lista de vectores) en la pantalla.', 'dibujar.enPantalla.poligono([vector(20, 20), vector(60, 20), vector(40, 55)], "rojo", verdadero)', 'poligono([${1:vector(20, 20), vector(60, 20), vector(40, 55)}], "${2:rojo}")'),
      d('arco', 'accion', 'dibujar.enPantalla.arco(x, y, radio, desde, hasta, color, relleno, grosor)', 'Un trozo de circulo en la pantalla (quesito si relleno = verdadero).', 'dibujar.enPantalla.arco(60, 60, 30, 90, 270, "#00000099", verdadero)', 'arco(${1:60}, ${2:60}, ${3:30}, ${4:90}, ${5:270})'),
    ],
  },
  {
    nombre: 'mando',
    descripcion: 'El mando de consola (el primero que se conecte). No hace falta para jugar con mando: la cruceta y la palanca ya son las flechas, A es espacio, B es "x", X es "z", Y es "c", start es enter y select es escape.',
    ejemplo: 'cuando cada fotograma:\n    yo.x += mando.ejeX * 300 * delta',
    miembros: [
      d('conectado', 'propiedad', 'mando.conectado', 'Verdadero si hay un mando conectado.', 'si mando.conectado:\n    mostrar("Mando listo")'),
      d('ejeX', 'propiedad', 'mando.ejeX', 'La palanca izquierda de lado: de -1 (izquierda) a 1 (derecha). 0 en el centro.', 'yo.x += mando.ejeX * 300 * delta'),
      d('ejeY', 'propiedad', 'mando.ejeY', 'La palanca izquierda de arriba abajo: de -1 (abajo) a 1 (arriba).', 'yo.y += mando.ejeY * 300 * delta'),
      d('comoTeclado', 'propiedad', 'mando.comoTeclado', 'Si es verdadero (lo normal), el mando hace de teclado: la palanca y la cruceta son las flechas, A es espacio, B es "x"... Con falso deja de pulsar teclas y solo se lee con mando.ejeX, mando.pulsado... Hace falta cuando las flechas y la palanca tienen que hacer cosas DISTINTAS (en primera persona: las flechas giran y la palanca anda de lado).', 'cuando empieza:\n    mando.comoTeclado = falso'),
      d('ejeDerechoX', 'propiedad', 'mando.ejeDerechoX', 'La palanca derecha de lado (de -1 a 1). Sirve para apuntar.', 'yo.rotacion = angulo(vector(0, 0), vector(mando.ejeDerechoX, mando.ejeDerechoY))'),
      d('ejeDerechoY', 'propiedad', 'mando.ejeDerechoY', 'La palanca derecha de arriba abajo (de -1 a 1).', 'mostrar(mando.ejeDerechoY)'),
      d('pulsado', 'accion', 'mando.pulsado("boton")', 'Verdadero mientras el boton esta pulsado. Botones: a, b, x, y, lb, rb, lt, rt, select, start, l3, r3, arriba, abajo, izquierda, derecha.', 'si mando.pulsado("rt"):\n    yo.x += 400 * delta', 'pulsado("${1:a}")'),
      d('sePulso', 'accion', 'mando.sePulso("boton")', 'Verdadero solo en el fotograma en que se pulsa el boton.', 'si mando.sePulso("lb"):\n    mostrar("lb")', 'sePulso("${1:a}")'),
      d('vibrar', 'accion', 'mando.vibrar(segundos, fuerza)', 'Hace vibrar el mando (fuerza de 0 a 1). Si el mando no sabe vibrar, no pasa nada.', 'cuando toco Enemigo:\n    mando.vibrar(0.3)', 'vibrar(${1:0.3})'),
    ],
  },
  {
    nombre: 'sistema',
    descripcion: 'Cosas del ordenador o del móvil donde se está jugando.',
    ejemplo: 'si sistema.movil:\n    mostrar("Juegas en un móvil")',
    miembros: [
      d('movil', 'propiedad', 'sistema.movil', 'Verdadero si se está jugando en un móvil o una tableta (con pantalla táctil).', 'si sistema.movil:\n    yo.visible = verdadero'),
      d('abrirWeb', 'accion', 'sistema.abrirWeb("direccion")', 'Abre una página web en otra pestaña (por ejemplo, la de tu juego en itch.io). Tiene que empezar por https://. En el editor, antes de abrirla se pregunta (por si el juego es de otra persona).', 'cuando hago clic encima:\n    sistema.abrirWeb("https://itch.io")', 'abrirWeb("${1:https://}")'),
    ],
  },
];

export const DOC_ESPECIALES: Doc[] = [
  d('yo', 'variable', 'yo', 'El objeto al que pertenece este script.', 'yo.x += 10'),
  d('otro', 'variable', 'otro', "Dentro de 'cuando toco': el objeto que has tocado.", 'cuando toco Enemigo:\n    destruir(otro)'),
  d('casilla', 'variable', 'casilla', "Dentro de 'cuando toco': si has tocado una casilla de un mapa, su tipo (si no, nulo).", 'cuando toco:\n    si casilla == "agua":\n        yo.gravedad = 0.2'),
  d('dato', 'variable', 'dato', "Dentro de 'cuando recibo': lo que se envio junto al mensaje con enviar(\"mensaje\", dato). Si no se envio nada, es nulo.", 'cuando recibo "dano":\n    yo.vida -= dato'),
  d('juego', 'variable', 'juego', 'Datos compartidos por todos los scripts (puntos, vidas...). Se conservan al cambiar de escena.', 'juego.puntos += 1'),
  d('pi', 'variable', 'pi', 'El número pi (3.14159...): lo que mide una vuelta entera dividido entre su ancho.', 'variable vuelta = 2 * pi * radio'),
  d('delta', 'variable', 'delta', 'Segundos desde el fotograma anterior (unos 0.016). Multiplica por delta las velocidades para que el juego vaya igual en cualquier ordenador.', 'yo.x += 200 * delta'),
];

// ═════════════════════════ Propiedades y acciones de los objetos ═════════════════════════

export const DOC_OBJETO: Doc[] = [
  d('nombre', 'propiedad', 'yo.nombre', 'El nombre del objeto.', 'mostrar(yo.nombre)'),
  d('tipo', 'propiedad', 'yo.tipo', 'El tipo del objeto (normalmente, la plantilla de la que salió).', 'si otro.tipo == "Enemigo":'),
  d('x', 'propiedad', 'yo.x', 'Posición horizontal del centro del objeto.', 'yo.x += 100 * delta'),
  d('y', 'propiedad', 'yo.y', 'Posición vertical del centro del objeto. La Y crece hacia ARRIBA.', 'yo.y += 100 * delta   # sube'),
  d('posicion', 'propiedad', 'yo.posicion', 'Posición como vector.', 'yo.posicion = vector(100, 200)'),
  d('rotacion', 'propiedad', 'yo.rotacion', 'Giro en grados (positivo = contrario a las agujas del reloj).', 'yo.rotacion = 45'),
  d('escala', 'propiedad', 'yo.escala', 'Tamaño: 1 normal, 2 el doble. Puede ser un número o un vector.', 'yo.escala = 2'),
  d('velocidad', 'propiedad', 'yo.velocidad', 'Velocidad en píxeles por segundo (necesita física). Positivo en Y = hacia arriba.', 'yo.velocidad.x = 200'),
  d('gravedad', 'propiedad', 'yo.gravedad', 'Cuánto le afecta la gravedad: 1 normal, 0 flota, 0.5 como en la luna.', 'yo.gravedad = 0'),
  d('rozamiento', 'propiedad', 'yo.rozamiento', 'Cuánto frena en el suelo, de 0 (hielo) a 1 (se para en seco).', 'yo.rozamiento = 0'),
  d('rebote', 'propiedad', 'yo.rebote', 'Cuánto rebota al chocar, de 0 (nada) a 1 (pelota perfecta).', 'yo.rebote = 0.8'),
  d('masa', 'propiedad', 'yo.masa', 'Cuánto pesa. Al chocar, el más pesado empuja al otro.', 'yo.masa = 10'),
  d('estatico', 'propiedad', 'yo.estatico', 'Si es verdadero, el objeto no se mueve nunca (como una pared).', 'yo.estatico = verdadero'),
  d('moviendo', 'propiedad', 'yo.moviendo', 'Solo en objetos con recorrido (plataformas que se mueven solas): si es falso, se para donde está; si es verdadero, sigue su camino.', 'cuando toco Jugador:\n    yo.moviendo = verdadero'),
  d('enSuelo', 'propiedad', 'yo.enSuelo', 'Verdadero si está apoyado en el suelo (solo se lee).', 'si yo.enSuelo:\n    yo.saltar(600)'),
  d('tocaPared', 'propiedad', 'yo.tocaPared', 'Verdadero si ha chocado con una pared (solo se lee).', 'si yo.tocaPared:\n    direccion = -direccion'),
  d('tocaTecho', 'propiedad', 'yo.tocaTecho', 'Verdadero si se ha dado con la cabeza en un techo (solo se lee).', 'si yo.tocaTecho:\n    mostrar("¡Ay!")'),
  d('solido', 'propiedad', 'yo.solido', 'Si es verdadero, los demás chocan con él.', 'yo.solido = falso'),
  d('fantasma', 'propiedad', 'yo.fantasma', 'Si es verdadero, se atraviesa, pero sigue avisando con "cuando toco" (zonas, monedas, metas).', 'yo.fantasma = verdadero'),
  d('color', 'propiedad', 'yo.color', 'El color de la forma (o del texto). Nombres: rojo, verde, azul, amarillo, naranja, morado, rosa, cian, blanco, negro, gris, marron... o "#ff8800".', 'yo.color = "rojo"'),
  d('visible', 'propiedad', 'yo.visible', 'Si es falso, el objeto no se dibuja (pero sigue existiendo).', 'yo.visible = falso'),
  d('ancho', 'propiedad', 'yo.ancho', 'Ancho del dibujo en píxeles.', 'yo.ancho = 100'),
  d('alto', 'propiedad', 'yo.alto', 'Alto del dibujo en píxeles.', 'yo.alto = 20'),
  d('opacidad', 'propiedad', 'yo.opacidad', 'De 0 (invisible) a 1 (normal).', 'yo.opacidad = 0.5'),
  d('voltear', 'propiedad', 'yo.voltear', 'Si es verdadero, el dibujo se ve al revés (como en un espejo). Para mirar a la izquierda.', 'yo.voltear = yo.velocidad.x < 0'),
  d('capa', 'propiedad', 'yo.capa', 'Orden de dibujo: los de capa más alta se ven por encima.', 'yo.capa = 10'),
  d('imagen', 'propiedad', 'yo.imagen', 'La imagen que se dibuja (nombre de una imagen del proyecto).', 'yo.imagen = "jugador_herido"'),
  d('texto', 'propiedad', 'yo.texto', 'El texto de un objeto de texto, o la etiqueta de un botón.', 'yo.texto = "Puntos: " + juego.puntos'),
  d('tamaño', 'propiedad', 'yo.tamaño', 'Lo grande que es: 1 = normal, 2 = el doble, 0.5 = la mitad. En un objeto de TEXTO es el tamaño de la letra. Se puede escribir tamano (sin ñ).', 'yo.tamano = 2\nanimar(yo.tamano, 1, 0.3)'),
  d('tamanoLetra', 'propiedad', 'yo.tamanoLetra', 'El tamaño de la letra de un texto o de la etiqueta de un botón.', 'yo.tamanoLetra = 40'),
  d('transparencia', 'propiedad', 'yo.transparencia', 'Lo contrario de la opacidad: 0 = se ve normal, 1 = invisible, 0.5 = medio transparente.', 'yo.transparencia = 0.5'),
  d('voltearVertical', 'propiedad', 'yo.voltearVertical', 'Si es verdadero, la imagen se ve boca abajo.', 'yo.voltearVertical = verdadero'),
  d('letra', 'propiedad', 'yo.letra', 'El tipo de letra de su texto. Las listas: "normal", "redonda", "clasica", "maquina", "manuscrita", "titulo" y "pixel". También las tuyas, importadas en Proyecto > Letras (.ttf, .otf, .woff).', 'yo.letra = "pixel"'),
  d('colorTexto', 'propiedad', 'yo.colorTexto', 'Color de la letra de las etiquetas (botones).', 'yo.colorTexto = "negro"'),
  d('valor', 'propiedad', 'yo.valor', 'En un CONTROL de interfaz, lo que vale: el número de una barra, un deslizador o un icono con contador; verdadero o falso en una casilla; el texto de un campo; la opción elegida de una lista o un menú; lo que hay en la casilla elegida de un inventario.', 'buscar("BarraVida").valor = juego.vida'),
  d('minimo', 'propiedad', 'yo.minimo', 'En una barra o un deslizador: el valor más bajo (0 si no se dice).', 'buscar("Deslizador").minimo = 1'),
  d('maximo', 'propiedad', 'yo.maximo', 'En una barra o un deslizador: el valor más alto (100 si no se dice). La barra está llena cuando su valor llega al máximo.', 'buscar("BarraVida").maximo = 200'),
  d('opciones', 'propiedad', 'yo.opciones', 'En una lista o un menú: sus opciones, una lista de textos.', 'buscar("Menu").opciones = ["Jugar", "Opciones", "Salir"]'),
  d('elegido', 'propiedad', 'yo.elegido', 'En una lista, un menú o un inventario: el número de la opción (o la casilla) elegida. La primera es la 1; 0 es ninguna.', 'buscar("Lista").elegido = 1'),
  d('activado', 'propiedad', 'yo.activado', 'En un control: si se puede usar. Con falso se ve apagado y no atiende al ratón ni al teclado.', 'buscar("BotonComprar").activado = juego.monedas >= 10'),
  d('titulo', 'propiedad', 'yo.titulo', 'En una ventana: lo que pone en su barra de arriba.', 'buscar("Ventana").titulo = "Tienda"'),
  d('abrir', 'accion', 'yo.abrir()', 'Enseña un control con todo lo que lleva dentro (sus hijos: lo pegado a él con pegarA). Para ventanas y menús que aparecen.', 'cuando se pulsa "i":\n    buscar("Ventana").abrir()', 'abrir()'),
  d('cerrar', 'accion', 'yo.cerrar()', 'Esconde un control con todo lo que lleva dentro.', 'buscar("Ventana").cerrar()', 'cerrar()'),
  d('enfocar', 'accion', 'yo.enfocar()', 'En un campo de texto: empieza a escribir en él, como si se hiciera clic. Mientras se escribe, las teclas son letras (no saltan los «cuando se pulsa»).', 'buscar("CampoNombre").enfocar()', 'enfocar()'),
  d('meter', 'accion', 'yo.meter("cosa", cantidad)', 'En un inventario: mete esa cosa (una si no se dice cuántas). Si ya hay de esa, se suman; si no, va a la primera casilla vacía. Devuelve falso si no cabe. Si hay una imagen con ese nombre, se ve en la casilla.', 'cuando toco Llave:\n    buscar("Inventario").meter("llave")\n    destruir(otro)', 'meter("${1:llave}")'),
  d('sacar', 'accion', 'yo.sacar("cosa", cantidad)', 'En un inventario: saca esa cosa (una si no se dice cuántas). Devuelve cuántas ha sacado de verdad (0 si no había).', 'si buscar("Inventario").sacar("llave") == 1:\n    mostrar("puerta abierta")', 'sacar("${1:llave}")'),
  d('cuantos', 'accion', 'yo.cuantos("cosa")', 'En un inventario: cuántas hay de esa cosa.', 'si buscar("Inventario").cuantos("moneda") >= 10:\n    mostrar("puedes comprar")', 'cuantos("${1:llave}")'),
  d('vaciar', 'accion', 'yo.vaciar()', 'En un inventario: lo deja vacío.', 'buscar("Inventario").vaciar()', 'vaciar()'),
  d('moverConJugador', 'accion', 'yo.moverConJugador(numero, rapidez)', 'Como moverConFlechas, pero con los controles de UN jugador (del 1 al 4): su trozo del teclado o su mando. Si el objeto cae (Fisica con gravedad) solo se mueve a los lados. Sin codigo: Comportamiento > «Lo maneja un jugador».', 'cuando cada fotograma:\n    yo.moverConJugador(2, 300)', 'moverConJugador(${1:2}, ${2:300})'),
  d('fijo', 'propiedad', 'yo.fijo', 'Si es verdadero, se queda pegado a la pantalla (interfaz: vida, puntos, botones).', 'yo.fijo = verdadero'),
  d('animacion', 'propiedad', 'yo.animacion', 'La animación que suena ahora (o nulo). Darle valor es lo mismo que yo.animar(...).', 'si yo.animacion != "correr":\n    yo.animacion = "correr"'),
  d('ratonEncima', 'propiedad', 'yo.ratonEncima', 'Verdadero si el ratón está encima del objeto (para resaltar botones).', 'si yo.ratonEncima:\n    yo.color = "amarillo"'),
  d('destruido', 'propiedad', 'yo.destruido', 'Verdadero si el objeto ya se ha destruido.', 'si objetivo.destruido:\n    romper'),
  d('saltar', 'accion', 'yo.saltar(fuerza)', 'Salta, pero solo si está en el suelo. Devuelve verdadero si ha saltado.', 'cuando se pulsa "espacio":\n    yo.saltar(600)', 'saltar(${1:600})'),
  d('mover', 'accion', 'yo.mover(x, y)', 'Mueve el objeto esa cantidad de píxeles.', 'yo.mover(10, 0)', 'mover(${1:10}, ${2:0})'),
  d('rotar', 'accion', 'yo.rotar(grados)', 'Gira el objeto esos grados.', 'yo.rotar(90 * delta)', 'rotar(${1:90})'),
  d('empujar', 'accion', 'yo.empujar(x, y)', 'Da un golpe: cambia la velocidad según la masa (los pesados se mueven menos).', 'otro.empujar(500, 200)', 'empujar(${1:500}, ${2:0})'),
  d('moverConFlechas', 'accion', 'yo.moverConFlechas(rapidez)', 'Mueve el objeto con las flechas (o W A S D) a esa rapidez en píxeles por segundo. Si el objeto cae (tiene física y hay gravedad), solo va a izquierda y derecha; si no, en las cuatro direcciones. Las imágenes miran hacia donde anda. Úsalo en "cuando cada fotograma".', 'cuando cada fotograma:\n    yo.moverConFlechas(300)', 'moverConFlechas(${1:300})'),
  d('moverHacia', 'accion', 'yo.moverHacia(destino, rapidez)', 'Avanza hacia otro objeto o posición a esa rapidez (píxeles/segundo), sin pasarse. Devuelve verdadero al llegar.', 'yo.moverHacia(buscar("Jugador"), 80)', 'moverHacia(${1:buscar("Jugador")}, ${2:100})'),
  d('mirarA', 'accion', 'yo.mirarA(destino)', 'Gira el objeto para que mire hacia otro objeto o posición.', 'yo.mirarA(raton.posicion)', 'mirarA(${1:otro})'),
  d('direccionA', 'accion', 'yo.direccionA(destino)', 'Un vector de largo 1 que apunta hacia otro objeto o posición. Útil para disparar.', 'bala.velocidad = yo.direccionA(raton.posicion) * 500', 'direccionA(${1:otro})'),
  d('distanciaA', 'accion', 'yo.distanciaA(destino)', 'Distancia en píxeles hasta otro objeto o una posición (también con dos números: x, y).', 'si yo.distanciaA(jugador) < 50:', 'distanciaA(${1:otro})'),
  d('irHacia', 'accion', 'yo.irHacia(destino, rapidez)', 'Va hasta un sitio o detras de un objeto (lo sigue aunque se mueva), RODEANDO las paredes del mapa de casillas si el juego se ve desde arriba. Rapidez en pixeles/segundo (150 si no se dice). Devuelve falso si no hay camino.', 'cuando empieza:\n    yo.irHacia(buscar("Jugador"), 120)', 'irHacia(${1:buscar("Jugador")}, ${2:120})'),
      d('atravesar', 'accion', 'yo.atravesar("Nombre")', 'Deja de chocar con los objetos de ese nombre, tipo o etiqueta: pasa a traves de ellos. Sigue chocando con las paredes y sigue avisando con cuando toco. Sirve para un dash que cruza enemigos o para balas que rebotan en las paredes pero no empujan a nadie.', 'yo.atravesar("enemigo")\nesperar(0.2)\nyo.dejarDeAtravesar("enemigo")', 'atravesar("${1:enemigo}")'),
  d('dejarDeAtravesar', 'accion', 'yo.dejarDeAtravesar("Nombre")', 'Vuelve a chocar con los objetos de ese nombre, tipo o etiqueta.', 'yo.dejarDeAtravesar("enemigo")', 'dejarDeAtravesar("${1:enemigo}")'),
  d('parar', 'accion', 'yo.parar()', 'Deja de ir a donde iba (irHacia, irA) y se queda quieto.', 'cuando toco Jugador:\n    yo.parar()', 'parar()'),
  d('yendo', 'propiedad', 'yo.yendo', 'Verdadero mientras va hacia el sitio de yo.irHacia(). Al llegar, falso.', 'si no yo.yendo:\n    yo.irHacia(vector(aleatorio(0, 900), aleatorio(0, 500)))'),
  d('irA', 'accion', 'yo.irA(destino, segundos)', 'Va SUAVEMENTE hasta un sitio en esos segundos (1 si no se dice). El sitio puede ser un objeto, una posición o dos números: yo.irA(400, 300, 2).', 'yo.irA(buscar("Meta"), 2)', 'irA(${1:400}, ${2:300}, ${3:1})'),
  d('teletransportar', 'accion', 'yo.teletransportar(destino)', 'Se va DE GOLPE a otro sitio (un objeto, una posición o dos números), sin la velocidad que llevaba.', 'yo.teletransportar(100, 300)', 'teletransportar(${1:100}, ${2:300})'),
  d('avanzar', 'accion', 'yo.avanzar(pasos)', 'Se mueve hacia donde mira (según su rotación), como «mover pasos» de Scratch.', 'yo.rotacion = 45\nyo.avanzar(10)', 'avanzar(${1:10})'),
  d('anguloA', 'accion', 'yo.anguloA(destino)', 'El ángulo (en grados) hacia otro objeto o posición: 0 = derecha, 90 = arriba.', 'variable a = yo.anguloA(raton.posicion)', 'anguloA(${1:otro})'),
  d('rotarHacia', 'accion', 'yo.rotarHacia(destino, gradosPorSegundo)', 'Gira POCO A POCO hasta mirar hacia algo (180 grados por segundo si no se dice). Devuelve verdadero cuando ya lo mira. Úsalo en «cuando cada fotograma».', 'cuando cada fotograma:\n    yo.rotarHacia(buscar("Jugador"), 90)', 'rotarHacia(${1:otro}, ${2:180})'),
  d('ocultar', 'accion', 'yo.ocultar()', 'Deja de verse (sigue existiendo y chocando). Es lo mismo que yo.visible = falso.', 'yo.ocultar()', 'ocultar()'),
  d('aparecer', 'accion', 'yo.aparecer()', 'Vuelve a verse. Es lo mismo que yo.visible = verdadero.', 'yo.aparecer()', 'aparecer()'),
  d('parpadear', 'accion', 'yo.parpadear(segundos, vecesPorSegundo)', 'Se enciende y se apaga durante esos segundos (1 si no se dice) y al final se queda visible. Típico al recibir un golpe.', 'cuando toco Enemigo:\n    yo.parpadear(1)', 'parpadear(${1:1})'),
  d('ponerDelante', 'accion', 'yo.ponerDelante()', 'Se dibuja por encima de todos los demás (cambia su capa).', 'cuando hago clic encima:\n    yo.ponerDelante()', 'ponerDelante()'),
  d('ponerDetras', 'accion', 'yo.ponerDetras()', 'Se dibuja por debajo de todos los demás.', 'yo.ponerDetras()', 'ponerDetras()'),
  d('tocando', 'accion', 'yo.tocando("Nombre")', 'Verdadero si AHORA MISMO está tocando algo con ese nombre, tipo, etiqueta o tipo de casilla. Sin nada: si toca cualquier cosa.', 'si yo.tocando("Lava"):\n    escena.reiniciar()', 'tocando("${1:Nombre}")'),
  d('cercanos', 'accion', 'yo.cercanos(radio, "Tipo")', 'Una lista con los objetos a menos de esos píxeles (de ese tipo, si se dice), del más cercano al más lejano.', 'para cada e en yo.cercanos(150, "Enemigo"):\n    e.empujar(300, 0)', 'cercanos(${1:200})'),
  d('masCercano', 'accion', 'yo.masCercano("Tipo", radio)', 'El objeto más cercano (de ese tipo, y a menos de esos píxeles si se dice), o nulo si no hay.', 'variable presa = yo.masCercano("Oveja")\nsi presa != nulo:\n    yo.moverHacia(presa, 80)', 'masCercano("${1:Tipo}")'),
  d('clonar', 'accion', 'yo.clonar()', 'Hace una copia de este objeto tal como está ahora, con su script. Devuelve la copia.', 'variable copia = yo.clonar()\ncopia.x += 50', 'clonar()'),
  d('ponerEtiqueta', 'accion', 'yo.ponerEtiqueta("etiqueta")', 'Le pone una etiqueta. Un objeto puede tener varias. Sirven para agrupar cosas distintas: «cuando toco» y «yo.tocando» también las entienden.', 'yo.ponerEtiqueta("peligro")', 'ponerEtiqueta("${1:etiqueta}")'),
  d('quitarEtiqueta', 'accion', 'yo.quitarEtiqueta("etiqueta")', 'Le quita una etiqueta.', 'yo.quitarEtiqueta("peligro")', 'quitarEtiqueta("${1:etiqueta}")'),
  d('tieneEtiqueta', 'accion', 'yo.tieneEtiqueta("etiqueta")', 'Verdadero si tiene esa etiqueta.', 'cuando toco:\n    si otro.tieneEtiqueta("peligro"):\n        escena.reiniciar()', 'tieneEtiqueta("${1:etiqueta}")'),
  d('etiquetas', 'propiedad', 'yo.etiquetas', 'La lista de sus etiquetas.', 'mostrar(yo.etiquetas)'),
  d('pegarA', 'accion', 'yo.pegarA(otro)', 'Se pega a otro objeto (su «padre»): a partir de ahora se mueve con él. Si el padre se destruye, él también.', 'variable espada = crear("Espada")\nespada.pegarA(yo)', 'pegarA(${1:otro})'),
  d('soltar', 'accion', 'yo.soltar()', 'Se despega de su padre y vuelve a moverse solo.', 'yo.soltar()', 'soltar()'),
  d('padre', 'propiedad', 'yo.padre', 'El objeto al que está pegado (o nulo).', 'si yo.padre != nulo:\n    mostrar(yo.padre.nombre)'),
  d('hijos', 'propiedad', 'yo.hijos', 'La lista de los objetos pegados a este.', 'para cada h en yo.hijos:\n    h.color = "rojo"'),
  d('elevacion', 'propiedad', 'yo.elevacion', 'Cuánto está levantado del suelo, en píxeles. En primera persona (vista3d) es lo que flota o vuela: un dron, una bala, algo que salta. 0 = apoyado en el suelo.', 'yo.elevacion = 20'),
  d('arrastrable', 'propiedad', 'yo.arrastrable', 'Si es verdadero, se puede coger con el ratón y moverlo (puzles, inventarios, juegos de ordenar).', 'yo.arrastrable = verdadero'),
  d('arrastrando', 'propiedad', 'yo.arrastrando', 'Verdadero mientras se está arrastrando con el ratón (solo se lee).', 'si yo.arrastrando:\n    yo.opacidad = 0.7'),
  d('animar', 'accion', 'yo.animar("nombre")', 'Empieza una animación del proyecto. Si ya estaba sonando, no la reinicia.', 'yo.animar("correr")', 'animar("${1:nombre}")'),
  d('pararAnimacion', 'accion', 'yo.pararAnimacion()', 'Para la animación (se queda en el fotograma actual).', 'yo.pararAnimacion()', 'pararAnimacion()'),
  d('destruir', 'accion', 'yo.destruir()', 'Quita el objeto del juego (igual que destruir(yo)).', 'yo.destruir()', 'destruir()'),
  d('casilla', 'accion', 'mapa.casilla(columna, fila)', 'Solo en mapas de casillas: el tipo de la casilla (o nulo si está vacía).', 'variable mapa = buscar("Mapa")\nmostrar(mapa.casilla(3, 0))', 'casilla(${1:0}, ${2:0})'),
  d('ponerCasilla', 'accion', 'mapa.ponerCasilla(columna, fila, "tipo")', 'Solo en mapas: pone una casilla.', 'mapa.ponerCasilla(3, 0, "suelo")', 'ponerCasilla(${1:0}, ${2:0}, "${3:suelo}")'),
  d('quitarCasilla', 'accion', 'mapa.quitarCasilla(columna, fila)', 'Solo en mapas: quita una casilla.', 'mapa.quitarCasilla(3, 0)', 'quitarCasilla(${1:0}, ${2:0})'),
  d('casillaEn', 'accion', 'mapa.casillaEn(x, y)', 'Solo en mapas: el tipo de la casilla que hay en un punto del mundo.', 'si mapa.casillaEn(yo.x, yo.y - 30) == "hielo":', 'casillaEn(${1:yo.x}, ${2:yo.y})'),
  d('columnaEn', 'accion', 'mapa.columnaEn(x)', 'Solo en mapas: la columna que hay en esa X del mundo.', 'variable c = mapa.columnaEn(yo.x)', 'columnaEn(${1:yo.x})'),
  d('filaEn', 'accion', 'mapa.filaEn(y)', 'Solo en mapas: la fila que hay en esa Y del mundo.', 'variable f = mapa.filaEn(yo.y)', 'filaEn(${1:yo.y})'),
  d('centroDeCasilla', 'accion', 'mapa.centroDeCasilla(columna, fila)', 'Solo en mapas: el centro de una casilla, en el mundo (vector).', 'yo.posicion = mapa.centroDeCasilla(2, 5)', 'centroDeCasilla(${1:0}, ${2:0})'),
  d('abrirPuerta', 'accion', 'mapa.abrirPuerta(columna, fila, segundos)', 'Solo en mapas: abre la puerta de esa casilla poco a poco (0,6 segundos si no se dice). Abierta, se pasa por ella, y los rayos y yo.irHacia también. La casilla tiene que ser de un tipo marcado como puerta (en el editor: el mapa > su tipo de casilla > «es una puerta»).', 'variable mapa = buscar("Mapa")\nmapa.abrirPuerta(5, 3)', 'abrirPuerta(${1:0}, ${2:0})'),
  d('cerrarPuerta', 'accion', 'mapa.cerrarPuerta(columna, fila, segundos)', 'Solo en mapas: cierra la puerta de esa casilla poco a poco. Cerrada, vuelve a ser una pared.', 'variable mapa = buscar("Mapa")\nmapa.cerrarPuerta(5, 3)', 'cerrarPuerta(${1:0}, ${2:0})'),
  d('puertaAbierta', 'accion', 'mapa.puertaAbierta(columna, fila)', 'Solo en mapas: verdadero si la puerta de esa casilla está abierta lo bastante para pasar.', 'variable mapa = buscar("Mapa")\nsi mapa.puertaAbierta(5, 3):\n    mostrar("paso")', 'puertaAbierta(${1:0}, ${2:0})'),
  d('esPuerta', 'accion', 'mapa.esPuerta(columna, fila)', 'Solo en mapas: verdadero si en esa casilla hay una puerta (abierta o cerrada).', 'variable mapa = buscar("Mapa")\nsi mapa.esPuerta(mapa.columnaEn(yo.x + 40), mapa.filaEn(yo.y)):\n    mostrar("hay una puerta")', 'esPuerta(${1:0}, ${2:0})'),
  // ── Luz ──
  d('luz', 'propiedad', 'yo.luz', 'Si es verdadero, el objeto lleva una luz (se ve cuando la escena tiene oscuridad). Falso la apaga.', 'yo.luz = verdadero'),
  d('tipoLuz', 'propiedad', 'yo.tipoLuz', '"punto" (alumbra alrededor, como una antorcha) o "foco" (un cono hacia donde mira el objeto, como una linterna).', 'yo.tipoLuz = "foco"'),
  d('colorLuz', 'propiedad', 'yo.colorLuz', 'El color de la luz (blanca si no se dice): tiñe un poco lo que ilumina.', 'yo.colorLuz = "naranja"'),
  d('radioLuz', 'propiedad', 'yo.radioLuz', 'Hasta dónde llega la luz, en píxeles (220).', 'yo.radioLuz = 300'),
  d('intensidadLuz', 'propiedad', 'yo.intensidadLuz', 'Lo fuerte que es la luz, de 0 (apagada) a 1 (normal); más de 1 llega más lejos.', 'yo.intensidadLuz = 0.6'),
  d('anguloLuz', 'propiedad', 'yo.anguloLuz', 'En un foco: lo abierto que es el cono, en grados (60). Mira hacia la rotación del objeto.', 'yo.anguloLuz = 40'),
  d('luzConSombras', 'propiedad', 'yo.luzConSombras', 'Si es verdadero, lo sólido tapa la luz y hace sombra (las paredes de un laberinto).', 'yo.luzConSombras = verdadero'),
  d('parpadeoLuz', 'propiedad', 'yo.parpadeoLuz', 'La luz tiembla como una llama, de 0 (quieta) a 1 (mucho).', 'yo.parpadeoLuz = 0.5'),
  // ── Efectos de objeto ──
  d('contorno', 'propiedad', 'yo.contorno', 'Una línea de color alrededor de todo el objeto (nulo la quita). Para resaltar lo que se puede coger o al elegido.', 'yo.contorno = "blanco"'),
  d('grosorContorno', 'propiedad', 'yo.grosorContorno', 'Lo gordo que es el contorno, en píxeles (3).', 'yo.grosorContorno = 5'),
  d('brillo', 'propiedad', 'yo.brillo', 'El brillo del objeto: 1 = normal, 0.5 = más oscuro, 2 = el doble de claro.', 'yo.brillo = 1.5'),
  d('grises', 'propiedad', 'yo.grises', 'El objeto en escala de grises, de 0 (colores) a 1 (blanco y negro). Para lo que está apagado o no se puede usar.', 'yo.grises = 1'),
  d('desenfoque', 'propiedad', 'yo.desenfoque', 'El objeto borroso (en píxeles): cosas lejanas, fantasmas...', 'yo.desenfoque = 3'),
  d('flash', 'accion', 'yo.flash(color, segundos)', 'El objeto entero de un color (blanco si no se dice) un momento: al recibir un golpe.', 'cuando toco Bala:\n    yo.flash()', 'flash(${1})'),
  // ── Efectos ──
  d('polvo', 'propiedad', 'yo.polvo', 'Si es verdadero, levanta polvo al saltar y al caer al suelo (necesita física).', 'yo.polvo = verdadero'),
  d('efecto', 'propiedad', 'yo.efecto', 'El efecto que lleva siempre puesto: "fuego", "humo", "burbujas" o "estela" (nulo lo quita).', 'yo.efecto = "fuego"'),
  // ── Estilo ──
  d('relleno', 'propiedad', 'yo.relleno', 'Cómo se rellena la forma: "color" (lo normal), "degradado" (de color a color2), "radial" (degradado redondo, del centro hacia fuera), "patron" (rayas, puntos...) o "imagen" (una imagen repetida).', 'yo.relleno = "degradado"\nyo.color2 = "azul"'),
  d('color2', 'propiedad', 'yo.color2', 'El segundo color: el final de un degradado o el dibujo de un patrón.', 'yo.color2 = "morado"'),
  d('anguloDegradado', 'propiedad', 'yo.anguloDegradado', 'Hacia dónde va el degradado, en grados: 0 = de izquierda a derecha, 90 = de abajo arriba (lo normal).', 'yo.anguloDegradado = 0'),
  d('patron', 'propiedad', 'yo.patron', 'El dibujo del relleno "patron": "rayas", "puntos", "cuadros", "rombos", "ondas" o "ladrillos" (con color de fondo y color2 de dibujo).', 'yo.relleno = "patron"\nyo.patron = "cuadros"'),
  d('imagenRelleno', 'propiedad', 'yo.imagenRelleno', 'La imagen del proyecto que se repite dentro de la forma, con relleno "imagen".', 'yo.relleno = "imagen"\nyo.imagenRelleno = "ladrillo"'),
  d('borde', 'propiedad', 'yo.borde', 'El grosor del borde en píxeles (0 = sin borde).', 'yo.borde = 3'),
  d('colorBorde', 'propiedad', 'yo.colorBorde', 'El color del borde (negro si no se dice).', 'yo.colorBorde = "blanco"'),
  d('bordeDiscontinuo', 'propiedad', 'yo.bordeDiscontinuo', 'Si es verdadero, el borde es a rayitas (como una línea de recortar).', 'yo.bordeDiscontinuo = verdadero'),
  d('sombra', 'propiedad', 'yo.sombra', 'El color de la sombra (con algo de transparencia queda mejor: "#00000088"). verdadero pone una sombra gris; nulo la quita.', 'yo.sombra = "#00000088"'),
  d('sombraX', 'propiedad', 'yo.sombraX', 'Cuánto se aparta la sombra hacia la derecha, en píxeles (6).', 'yo.sombraX = 10'),
  d('sombraY', 'propiedad', 'yo.sombraY', 'Cuánto se aparta la sombra hacia arriba, en píxeles (-6: hacia abajo).', 'yo.sombraY = -10'),
  d('desenfoqueSombra', 'propiedad', 'yo.desenfoqueSombra', 'Lo borrosa que es la sombra (0 = con bordes duros).', 'yo.desenfoqueSombra = 0'),
  d('resplandor', 'propiedad', 'yo.resplandor', 'Un brillo alrededor del objeto, de ese color (nulo lo quita). Muy bonito en monedas, poderes y textos.', 'yo.resplandor = "amarillo"'),
  d('tamanoResplandor', 'propiedad', 'yo.tamanoResplandor', 'Lo grande que es el resplandor, en píxeles (16).', 'yo.tamanoResplandor = 30'),
  d('mezcla', 'propiedad', 'yo.mezcla', 'Cómo se junta con lo que hay detrás: "normal", "sumar" (luz que se suma: fuego, magia), "multiplicar" (sombras), "pantalla", "superponer", "oscurecer", "aclarar" o "diferencia".', 'yo.mezcla = "sumar"'),
  // ── Formas ──
  d('forma', 'propiedad', 'yo.forma', 'La forma del dibujo: "rectangulo", "circulo", "triangulo", "elipse", "poligono", "estrella", "rombo", "corazon", "flecha", "linea", "capsula", "redondeado", "anillo", "arco", "camino" o "texto". Choca con su forma de verdad.', 'yo.forma = "estrella"'),
  d('lados', 'propiedad', 'yo.lados', 'Cuántos lados tiene un polígono (6 si no se dice) o cuántas puntas una estrella (5). De 3 a 64.', 'yo.forma = "poligono"\nyo.lados = 8'),
  d('radioInterior', 'propiedad', 'yo.radioInterior', 'Lo grande que es el hueco de una estrella, un anillo o un arco, de 0 a 1 (0,5 en la estrella y 0,6 en el anillo).', 'yo.forma = "anillo"\nyo.radioInterior = 0.8'),
  d('radioEsquina', 'propiedad', 'yo.radioEsquina', 'En un rectángulo redondeado, el radio de las esquinas en píxeles.', 'yo.forma = "redondeado"\nyo.radioEsquina = 12'),
  d('inicioArco', 'propiedad', 'yo.inicioArco', 'Dónde empieza un arco, en grados (0 = derecha, 90 = arriba).', 'yo.forma = "arco"\nyo.inicioArco = 0'),
  d('finArco', 'propiedad', 'yo.finArco', 'Dónde termina un arco, en grados (180 si no se dice: medio anillo).', 'yo.forma = "arco"\nyo.finArco = 270'),
  d('grosor', 'propiedad', 'yo.grosor', 'Lo gorda que es una línea o un camino abierto, en píxeles.', 'yo.forma = "linea"\nyo.grosor = 10'),
  d('formaColision', 'propiedad', 'yo.formaColision', 'Cómo choca: "auto" (con su forma, salvo los rectángulos), "caja" (como un rectángulo) o "figura" (con su forma, también girada).', 'yo.formaColision = "caja"'),
  d('ponerCamino', 'accion', 'yo.ponerCamino(puntos, cerrado)', 'Le da una forma libre: una lista de puntos (vectores, desde su centro). Cerrado (lo normal) se rellena; con falso es una línea.', 'yo.ponerCamino([vector(-50, -30), vector(0, 40), vector(50, -30)])', 'ponerCamino([${1:vector(-50, -30), vector(0, 40), vector(50, -30)}])'),
];

// ═════════════════════════ Listas, textos, tablas y vectores ═════════════════════════

/** Lo que tienen los valores del lenguaje (no los objetos del juego): lista.añadir(), texto.mayusculas... */
export const DOC_VALORES: { tipo: string; descripcion: string; miembros: Doc[] }[] = [
  {
    tipo: 'controles',
    descripcion: 'Lo que da controles(1), controles(2)...: los controles de ese jugador, juegue con su trozo del teclado o con su mando. Los controles se llaman siempre igual: "arriba", "abajo", "izquierda", "derecha", "a" (la acción principal) y "b" (la segunda).',
    miembros: [
      d('x', 'propiedad', 'controles(1).x', 'Hacia qué lado quiere ir: -1 izquierda, 0 quieto, 1 derecha (con la palanca del mando, valores intermedios).', 'yo.x += controles(1).x * 300 * delta'),
      d('y', 'propiedad', 'controles(1).y', 'Hacia arriba (1) o hacia abajo (-1).', 'yo.y += controles(1).y * 300 * delta'),
      d('pulsado', 'accion', 'controles(1).pulsado("control")', 'Verdadero mientras ese jugador tiene pulsado ese control ("a", "b", "arriba"...).', 'si controles(1).pulsado("b"):\n    yo.color = "rojo"', 'pulsado("${1:a}")'),
      d('sePulso', 'accion', 'controles(1).sePulso("control")', 'Verdadero solo en el fotograma en que lo pulsa (para saltar o disparar una vez).', 'si controles(2).sePulso("a"):\n    yo.saltar(600)', 'sePulso("${1:a}")'),
      d('seSolto', 'accion', 'controles(1).seSolto("control")', 'Verdadero solo en el fotograma en que lo suelta.', 'si controles(1).seSolto("a"):\n    mostrar("soltado")', 'seSolto("${1:a}")'),
      d('mando', 'propiedad', 'controles(1).mando', 'Verdadero si ese jugador tiene un mando conectado (el primer mando es del jugador 1, el segundo del 2...).', 'si controles(2).mando:\n    mostrar("El jugador 2 juega con mando")'),
      d('ponerTecla', 'accion', 'controles(1).ponerTecla("control", "tecla")', 'Cambia la tecla de uno de sus controles.', 'controles(1).ponerTecla("a", "m")', 'ponerTecla("${1:a}", "${2:m}")'),
    ],
  },
  {
    tipo: 'lista',
    descripcion: 'Una lista de valores en orden, entre corchetes: [1, 2, 3]. La primera posición es la 1.',
    miembros: [
      d('longitud', 'propiedad', 'lista.longitud', 'Cuántos elementos tiene la lista.', 'mostrar(enemigos.longitud)'),
      d('añadir', 'accion', 'lista.añadir(valor)', 'Pone un valor al final de la lista.', 'colores.añadir("rosa")', 'añadir(${1})'),
      d('quitar', 'accion', 'lista.quitar(posicion)', 'Quita el elemento de esa posición (la primera es la 1) y lo devuelve.', 'variable primero = cola.quitar(1)', 'quitar(${1:1})'),
      d('primero', 'propiedad', 'lista.primero', 'El primer elemento (o nulo si está vacía).', 'mostrar(cola.primero)'),
      d('ultimo', 'propiedad', 'lista.ultimo', 'El último elemento (o nulo si está vacía).', 'mostrar(puntos.ultimo)'),
      d('insertar', 'accion', 'lista.insertar(posicion, valor)', 'Mete un valor en esa posición; los que había de ahí en adelante se corren un sitio.', 'cola.insertar(1, "el primero")', 'insertar(${1:1}, ${2})'),
      d('ordenar', 'accion', 'lista.ordenar()', 'Ordena la lista de menor a mayor (números) o por orden alfabético (textos).', 'records.ordenar()', 'ordenar()'),
      d('mezclar', 'accion', 'lista.mezclar()', 'Desordena la lista al azar (como barajar cartas).', 'cartas.mezclar()', 'mezclar()'),
      d('invertir', 'accion', 'lista.invertir()', 'Le da la vuelta: el último pasa a ser el primero.', 'records.ordenar()\nrecords.invertir()', 'invertir()'),
      d('posicion', 'accion', 'lista.posicion(valor)', 'En qué posición está un valor (la primera es la 1), o 0 si no está.', 'variable donde = colores.posicion("verde")', 'posicion(${1})'),
      d('contiene', 'accion', 'lista.contiene(valor)', 'Verdadero si el valor está en la lista.', 'si inventario.contiene("llave"):\n    mostrar("Abres la puerta")', 'contiene(${1})'),
      d('sublista', 'accion', 'lista.sublista(desde, hasta)', 'Una lista nueva con un trozo: de la posición desde a la hasta (las dos incluidas).', 'variable mejores = records.sublista(1, 3)', 'sublista(${1:1}, ${2:3})'),
      d('unir', 'accion', 'lista.unir(separador)', 'Junta los elementos en un texto, con el separador entre medias (", " si no se dice).', 'yo.texto = inventario.unir(" | ")', 'unir(${1:", "})'),
      d('vaciar', 'accion', 'lista.vaciar()', 'Quita todos los elementos.', 'enemigos.vaciar()', 'vaciar()'),
    ],
  },
  {
    tipo: 'texto',
    descripcion: 'Un texto entre comillas: "Hola". Con + se une a otros textos y números. Entre llaves se meten valores: "Puntos: {juego.puntos}" (para escribir una llave, dos: {{). Si se lo das a yo.texto, se actualiza solo.',
    miembros: [
      d('longitud', 'propiedad', 'texto.longitud', 'Cuántas letras tiene el texto.', 'mostrar(nombre.longitud)'),
      d('mayusculas', 'propiedad', 'texto.mayusculas', 'El mismo texto en MAYÚSCULAS.', 'yo.texto = nombre.mayusculas'),
      d('minusculas', 'propiedad', 'texto.minusculas', 'El mismo texto en minúsculas.', 'si respuesta.minusculas == "si":\n    mostrar("Vale")'),
      d('dividir', 'accion', 'texto.dividir(separador)', 'Corta el texto en trozos y da una lista. Sin separador, corta por los espacios (palabras).', 'variable palabras = frase.dividir(" ")', 'dividir(${1:" "})'),
      d('reemplazar', 'accion', 'texto.reemplazar(buscar, cambiarPor)', 'Un texto nuevo en el que se cambia cada trozo buscado por otro.', 'yo.texto = frase.reemplazar("gato", "perro")', 'reemplazar("${1}", "${2}")'),
      d('contiene', 'accion', 'texto.contiene(trozo)', 'Verdadero si el texto tiene ese trozo dentro.', 'si respuesta.contiene("si"):\n    mostrar("Vale")', 'contiene("${1}")'),
      d('empiezaPor', 'accion', 'texto.empiezaPor(trozo)', 'Verdadero si el texto empieza así.', 'si nombre.empiezaPor("Dr"):\n    mostrar("Doctor")', 'empiezaPor("${1}")'),
      d('terminaPor', 'accion', 'texto.terminaPor(trozo)', 'Verdadero si el texto termina así.', 'si palabra.terminaPor("s"):\n    mostrar("Plural")', 'terminaPor("${1}")'),
      d('recortar', 'accion', 'texto.recortar()', 'El mismo texto sin los espacios del principio y del final.', 'variable limpio = escrito.recortar()', 'recortar()'),
      d('trozo', 'accion', 'texto.trozo(desde, hasta)', 'Un trozo del texto: de la letra desde a la hasta (las dos incluidas; la primera es la 1).', 'variable inicial = nombre.trozo(1, 1)', 'trozo(${1:1}, ${2:3})'),
      d('posicion', 'accion', 'texto.posicion(trozo)', 'En qué letra empieza un trozo dentro del texto (la primera es la 1), o 0 si no está.', 'mostrar(frase.posicion("mundo"))', 'posicion("${1}")'),
    ],
  },
  {
    tipo: 'tabla',
    descripcion: 'Datos con nombre, entre llaves: {vida: 3, nombre: "Ana"}. Se leen con un punto: jugador.vida.',
    miembros: [
      d('claves', 'propiedad', 'tabla.claves', 'Una lista con los nombres de todas las claves, en el orden en que se añadieron.', 'para cada k en inventario.claves:\n    mostrar(k)'),
      d('quitar', 'accion', 'tabla.quitar("clave")', 'Quita una clave de la tabla y devuelve su valor.', 'inventario.quitar("llave")', 'quitar("${1}")'),
    ],
  },
  {
    tipo: 'vector',
    descripcion: 'Dos números juntos (una posición, una velocidad...): vector(3, 4).',
    miembros: [
      d('x', 'propiedad', 'vector.x', 'El número horizontal.', 'mostrar(yo.velocidad.x)'),
      d('y', 'propiedad', 'vector.y', 'El número vertical (positivo = hacia arriba).', 'si yo.velocidad.y < 0:\n    mostrar("Cayendo")'),
      d('longitud', 'propiedad', 'vector.longitud', 'Lo largo que es (por ejemplo, la rapidez de una velocidad).', 'mostrar(yo.velocidad.longitud)'),
      d('normalizado', 'propiedad', 'vector.normalizado', 'Un vector con la misma dirección pero de largo 1.', 'variable dir = (destino - yo.posicion).normalizado'),
    ],
  },
];

// ═════════════════════════ Recetas ═════════════════════════

/**
 * RECETAS: respuestas a «¿cómo hago...?». Son lo primero que se busca al
 * hacer el primer juego (salieron de la prueba de principiante: ver
 * PROBLEMAS_PRINCIPIANTE.md). Un test comprueba que todo su código es correcto.
 */
export interface Receta {
  titulo: string;
  /** Qué hace falta en el editor y dónde va el código. */
  descripcion: string;
  codigo: string;
}

export const RECETAS: Receta[] = [
  {
    titulo: 'Moverse con las flechas',
    descripcion: 'En el script del jugador. Si tiene Física y hay gravedad, anda a izquierda y derecha; en una escena con gravedad 0 (vista desde arriba) o sin Física, en las cuatro direcciones. También funciona con W A S D.',
    codigo: 'cuando cada fotograma:\n    yo.moverConFlechas(300)',
  },
  {
    titulo: 'Moverse solo a los lados (una cesta, una raqueta)',
    descripcion: 'Sin Física: con las flechas se mueve en las cuatro direcciones, así que fijamos su altura en cada fotograma.',
    codigo: 'cuando cada fotograma:\n    yo.moverConFlechas(500)\n    yo.y = 60',
  },
  {
    titulo: 'Saltar',
    descripcion: 'El jugador necesita Física (Propiedades > Física) y algo debajo para apoyarse: un suelo sin Física, o un mapa de casillas. Solo salta si está en el suelo.',
    codigo: 'cuando se pulsa "espacio", "arriba":\n    yo.saltar(700)',
  },
  {
    titulo: 'Recoger monedas y contar puntos',
    descripcion: 'En el script del jugador. Las monedas llevan Colisión con «sólido» quitado, para atravesarlas. Si duplicas la moneda (Ctrl+D), las copias se llaman Moneda2, Moneda3... y «cuando toco Moneda» vale para todas.',
    codigo: 'cuando empieza:\n    juego.puntos = 0\n\ncuando toco Moneda:\n    destruir(otro)\n    juego.puntos += 1\n    sonido.tono(880, 0.1)',
  },
  {
    titulo: 'Enseñar los puntos (o la vida) en la pantalla',
    descripcion: 'Sin código: añade un Texto y escribe en su texto (Propiedades) Puntos: {juego.puntos}, o elige el dato en «Enseñar un dato». Lo que va entre llaves se actualiza solo mientras juegas. Alguien tiene que darle valor primero (ver la receta anterior). Desde el código es igual:',
    codigo: 'cuando empieza:\n    yo.texto = "Puntos: {juego.puntos}"',
  },
  {
    titulo: 'Disparar',
    descripcion: 'Crea la bala (un objeto pequeño con su script) y pulsa «Plantilla» para convertirla en plantilla. La nave la crea con crear("Bala"): sin posición, sale donde está la nave.',
    codigo: '# En el script de la nave:\ncuando se pulsa "espacio":\n    crear("Bala")\n\n# En el script de la Bala:\ncuando cada fotograma:\n    yo.y += 600 * delta\n\ncuando salgo de la pantalla:\n    destruir(yo)',
  },
  {
    titulo: 'Enemigos que caen desde arriba',
    descripcion: 'Un objeto vacío (Añadir > Objeto vacío) con este script crea un enemigo cada segundo en un sitio al azar. El Enemigo es una plantilla con su propio script para bajar.',
    codigo: '# En el script del objeto vacío:\ncuando cada 1 segundo:\n    crear("Enemigo", aleatorio(50, pantalla.ancho - 50), pantalla.alto + 40)\n\n# En el script del Enemigo:\ncuando cada fotograma:\n    yo.y -= 200 * delta\n\ncuando salgo de la pantalla:\n    destruir(yo)',
  },
  {
    titulo: 'Explosión al acertar',
    descripcion: 'En el script de la Bala. particulas() sin posición sale donde está el objeto; con otro.x y otro.y, donde estaba el enemigo.',
    codigo: 'cuando toco Enemigo:\n    particulas("explosion", otro.x, otro.y)\n    destruir(otro)\n    destruir(yo)\n    juego.puntos += 1',
  },
  {
    titulo: 'Pantalla de fin y volver a empezar',
    descripcion: 'Crea otra escena llamada Fin (botón + junto al nombre de la escena) con un Texto y un Botón. Al volver a Principal, recuerda poner los puntos a 0 en «cuando empieza».',
    codigo: '# En el script del Enemigo:\ncuando toco Nave:\n    escena.cambiar("Fin")\n\n# En el script del Botón de la escena Fin:\ncuando hago clic encima:\n    escena.cambiar("Principal")',
  },
  {
    titulo: 'Caer al vacío y volver a empezar',
    descripcion: 'En el script del jugador. «cuando salgo de la pantalla» pasa cuando deja de verse (si la cámara le sigue, solo cuando la cámara ya no puede bajar más: usa «no salir del mapa»).',
    codigo: 'cuando salgo de la pantalla:\n    escena.reiniciar()',
  },
  {
    titulo: 'Cámara que sigue al jugador',
    descripcion: 'Lo más fácil es en el editor: sin nada seleccionado, en Propiedades > Cámara, elige al jugador en «seguir a» y marca «no salir del mapa». Desde el código:',
    codigo: 'cuando empieza:\n    escena.camara.seguir(yo)\n    escena.camara.limites(buscar("Mapa"))',
  },
  {
    titulo: 'Una puerta que lleva a otra escena',
    descripcion: 'En el mapa de casillas, crea un tipo de casilla «puerta» y píntala. En el script del jugador (la otra escena se crea con el botón + junto al nombre de la escena):',
    codigo: 'cuando toco puerta:\n    escena.cambiar("Nivel2")',
  },
  {
    titulo: 'Plataforma que se mueve (o un ascensor)',
    descripcion: 'Sin código: selecciona la plataforma y activa Propiedades > Recorrido. Arrastra en la escena el punto 2 hasta donde tiene que llegar (puedes añadir más puntos). Lo que se pone encima viaja con ella. Desde el código se puede parar y poner en marcha:',
    codigo: '# En el script de la plataforma: se pone en marcha cuando el jugador se sube\ncuando empieza:\n    yo.moviendo = falso\n\ncuando toco Jugador:\n    yo.moviendo = verdadero',
  },
  {
    titulo: 'Plataforma que se atraviesa desde abajo',
    descripcion: 'Sin código: en Propiedades > Colisión marca «solo desde arriba». Se puede saltar a través de ella desde abajo y, al caer, te quedas encima. En un mapa de casillas, es una opción de cada tipo de casilla. No hace falta ningún script; por ejemplo, el del jugador puede ser solo:',
    codigo: 'cuando cada fotograma:\n    yo.moverConFlechas(300)\n\ncuando se pulsa "espacio":\n    yo.saltar(700)',
  },
  {
    titulo: 'Un enemigo que te persigue',
    descripcion: 'En el script del enemigo.',
    codigo: 'cuando cada fotograma:\n    variable jugador = buscar("Jugador")\n    si jugador != nulo:\n        yo.moverHacia(jugador, 120)',
  },
  {
    titulo: 'Cuenta atrás',
    descripcion: 'En el script de un Texto.',
    codigo: 'variable quedan = 30\n\ncuando empieza:\n    yo.texto = "Tiempo: {quedan}"\n\ncuando cada 1 segundo:\n    quedan -= 1\n    si quedan == 0:\n        escena.cambiar("Fin")',
  },
  {
    titulo: 'Guardar el récord',
    descripcion: 'Los datos guardados siguen ahí aunque cierres el juego. Por ejemplo, en la escena Fin:',
    codigo: 'cuando empieza:\n    variable record = cargar("record", 0)\n    si juego.puntos > record:\n        guardar("record", juego.puntos)\n        record = juego.puntos\n    yo.texto = "Récord: {record}"',
  },
  {
    titulo: "Un objeto avisa a otros (mensajes)",
    descripcion: "Con enviar, TODOS los objetos que tengan «cuando recibo» con ese mensaje se enteran, estén donde estén. En el script de la llave y en el de la puerta:",
    codigo: "cuando toco Jugador:\n    enviar(\"abrir_puerta\")\n    destruir(yo)\n\ncuando recibo \"abrir_puerta\":\n    destruir(yo)",
  },
  {
    titulo: "Pedirle algo a otro objeto (llamar a su función)",
    descripcion: "Si la Puerta tiene en su script una función abrir(), desde otro objeto se escribe buscar(\"Puerta\").abrir(). Dentro de la función, yo es la puerta. En el script de la puerta:",
    codigo: "funcion abrir():\n    yo.ocultar()\n    sonido.efecto(\"subir\")\n\ncuando toco Jugador:\n    abrir()",
  },
  {
    titulo: "Datos del juego sin código (vidas, nivel...)",
    descripcion: "Sin nada seleccionado, en Propiedades > Datos del juego puedes añadir datos con su valor de salida (vidas = 3). Existen desde el principio en todas las escenas, antes de cualquier script. Luego se usan así:",
    codigo: "cuando toco Enemigo:\n    juego.vidas -= 1\n    si juego.vidas <= 0:\n        escena.cambiar(\"Fin\")",
  },
  {
    titulo: "Un enemigo que persigue sin código",
    descripcion: "Selecciona el enemigo y activa Propiedades > Comportamiento: «Perseguir si está cerca», a quién (Jugador) y la rapidez. Si el juego se ve desde arriba y hay un mapa con paredes, las rodea. Con código es lo mismo con irHacia:",
    codigo: "cuando empieza:\n    yo.irHacia(buscar(\"Jugador\"), 120)",
  },
  {
    titulo: "Un enemigo que patrulla y te ve",
    descripcion: "Con rayo miras si hay una pared entre el enemigo y el jugador. Si lo ve, lo persigue; si no, pasea.",
    codigo: "cuando cada 0.5 segundos:\n    variable jugador = buscar(\"Jugador\")\n    variable veo = falso\n    si jugador != nulo:\n        variable r = rayo(yo, jugador, 400)\n        veo = r != nulo y r.objeto == jugador\n    si veo:\n        yo.irHacia(jugador, 160)\n    sino si no yo.yendo:\n        yo.irHacia(vector(aleatorio(100, 900), aleatorio(100, 500)), 80)",
  },
  {
    titulo: "Hablar con un personaje (diálogos)",
    descripcion: "En el script del personaje. El juego se para mientras se lee. Con opciones, dialogo devuelve la elegida.",
    codigo: "cuando toco Jugador:\n    dialogo(\"Ana\", \"¡Hola! Llevo días esperando a alguien.\")\n    variable r = dialogo(\"Ana\", \"¿Me ayudas a buscar mi gato?\", [\"Si\", \"No\"])\n    si r == \"Si\":\n        juego.mision = verdadero\n        dialogo(\"Ana\", \"¡Gracias! Creo que se fue al bosque.\")\n    sino:\n        dialogo(\"Ana\", \"Vaya... Vuelve si cambias de idea.\")",
  },
  {
    titulo: "Jugar con mando (o con botones en el móvil)",
    descripcion: "moverConFlechas ya usa la palanca del mando. Los botones se leen con mando. En el móvil salen botones en la pantalla solos, con las teclas que usa tu juego (se quitan en Propiedades del juego > botones en el móvil).",
    codigo: "cuando cada fotograma:\n    yo.moverConFlechas(300)\n    si mando.pulsado(\"a\") o teclado.pulsada(\"espacio\"):\n        yo.saltar(700)",
  },
  {
    titulo: "Funciones para todos los objetos (una biblioteca)",
    descripcion: "Crea un script, escribe solo funciones (sin ningún «cuando») y NO se lo pongas a ningún objeto. Sus funciones se pueden usar desde cualquier script, y dentro de ellas yo es quien las llama. Por ejemplo, un script «ayudas»:",
    codigo: "funcion curar(cuanto):\n    yo.vida = minimo(yo.vida + cuanto, 100)\n    sonido.efecto(\"poder\")",
  },
  {
    titulo: "Hacer dos cosas a la vez",
    descripcion: "Las cosas con esperar dentro paran el script hasta que acaban. Con aLaVez la función va por su cuenta y el resto sigue.",
    codigo: "funcion parpadear():\n    repetir 6 veces:\n        yo.ocultar()\n        esperar(0.1)\n        yo.mostrar()\n        esperar(0.1)\n\ncuando toco Enemigo:\n    aLaVez(parpadear)\n    yo.saltar(500)",
  },
  {
    titulo: "Crear muchas cosas en fila",
    descripcion: "rango da los números seguidos, para contar con para cada. Moneda tiene que ser una plantilla (botón «Convertir en plantilla» de sus Propiedades).",
    codigo: "cuando empieza:\n    para cada i en rango(1, 8):\n        crear(\"Moneda\", i * 100, 300)",
  },
  {
    titulo: "Un dash que atraviesa enemigos",
    descripcion: "Durante un momento deja de chocar con los enemigos (pero no con las paredes) y se mueve muy rápido.",
    codigo: "cuando se pulsa \"x\":\n    yo.atravesar(\"Enemigo\")\n    yo.velocidad = vector(900, 0)\n    sonido.efecto(\"dash\")\n    esperar(0.2)\n    yo.dejarDeAtravesar(\"Enemigo\")",
  },
  {
    titulo: "Barra de vida en la pantalla",
    descripcion: "dibujar.enPantalla dibuja en la pantalla, como la interfaz: no se mueve con la cámara. Se dibuja en cada fotograma. (0, 0) es la esquina de abajo a la izquierda.",
    codigo: "cuando empieza:\n    yo.vida = 100\n\ncuando cada fotograma:\n    dibujar.enPantalla.rectangulo(120, 500, 200, 16, \"gris\", verdadero)\n    dibujar.enPantalla.rectangulo(20 + yo.vida, 500, yo.vida * 2, 16, \"rojo\", verdadero)",
  },
  {
    titulo: "Sonidos sin archivos",
    descripcion: "sonido.efecto se inventa el sonido solo. Hay disparo, laser, explosion, golpe, salto, moneda, poder, dash, escudo, hielo, fuego, rayo, subir, perder, clic, alarma y dano.",
    codigo: "cuando toco Moneda:\n    destruir(otro)\n    sonido.efecto(\"moneda\")\n\ncuando se pulsa \"espacio\":\n    yo.saltar(700)\n    sonido.efecto(\"salto\")",
  },
  {
    titulo: "Oscurecer la pantalla al perder",
    descripcion: "pantalla.oscurecer hace un fundido. Con cuanto = 0.5 se sigue viendo el juego detrás (para un menú de pausa).",
    codigo: "cuando toco Enemigo:\n    pantalla.oscurecer(1)\n    esperar(1)\n    escena.reiniciar()",
  },
  {
    titulo: "Probar cosas mientras juegas (órdenes)",
    descripcion: "Mientras el juego está en marcha, abajo de la consola hay una línea para escribir una orden y pulsar Intro. Sirve para hacer trampas y probar: juego.vidas = 99, buscar(\"Jugador\").x = 500, crear(\"Enemigo\", 400, 300)... Lo mismo se puede poner en un script:",
    codigo: "cuando se pulsa \"t\":\n    juego.vidas = 99",
  },
  // ── Lo nuevo de la 1.1 ──
  {
    titulo: 'Barra de vida sin dibujarla (interfaz)',
    descripcion: 'Añadir > Interfaz > Barra. En su «dato» escribe Jugador.vida (la vida es una propiedad propia del jugador: inspector > Propiedades propias > vida = 100). La barra se mueve sola; el código solo cambia la vida. En el script del jugador:',
    codigo: 'cuando toco Enemigo:\n    yo.vida -= 25\n    yo.flash("rojo", 0.15)\n    si yo.vida <= 0:\n        escena.reiniciar()',
  },
  {
    titulo: 'Contador de monedas con un icono',
    descripcion: 'Haz clic en el fondo de la escena y, en Datos del juego, crea «monedas» (0). Añadir > Interfaz > Icono con contador: elige su imagen y en «dato» pon juego.monedas. En el script del jugador:',
    codigo: 'cuando toco Moneda:\n    destruir(otro)\n    juego.monedas += 1\n    sonido.efecto("moneda")',
  },
  {
    titulo: 'Inventario: coger una llave y abrir una puerta',
    descripcion: 'Añadir > Interfaz > Inventario. Lo que se mete se ve en sus casillas (si hay una imagen que se llame igual, «llave», sale su dibujo). En el script del jugador:',
    codigo: 'cuando toco Llave:\n    destruir(otro)\n    buscar("Inventario").meter("llave")\n\ncuando toco Puerta:\n    variable mochila = buscar("Inventario")\n    si mochila.cuantos("llave") > 0:\n        mochila.sacar("llave")\n        destruir(otro)\n    sino:\n        dialogo("La puerta esta cerrada. Hace falta una llave.")',
  },
  {
    titulo: 'Una cueva a oscuras con linterna',
    descripcion: 'La escena se oscurece y el jugador lleva una luz. También se puede hacer sin código: fondo de la escena > Luz y oscuridad, y en el objeto, la sección Luz. Con «luzConSombras», las paredes del mapa tapan la luz.',
    codigo: 'cuando empieza:\n    escena.oscuridad = 0.9\n    yo.luz = verdadero\n    yo.radioLuz = 220\n    yo.colorLuz = "naranja"\n    yo.luzConSombras = verdadero',
  },
  {
    titulo: 'Dos jugadores en el mismo teclado',
    descripcion: 'El jugador 1 usa W A S D y espacio; el 2, las flechas e Intro (el 3, I J K L; el 4, el teclado de números). Con mando, cada uno el suyo. Sin código: en cada objeto, Comportamiento > «Lo maneja un jugador». Para partir la pantalla: fondo de la escena > Cámara > jugadores. Con código, este es el script del jugador 2:',
    codigo: 'cuando cada fotograma:\n    yo.moverConJugador(2, 280)\n    si controles(2).sePulso("a"):\n        yo.saltar(600)',
  },
  {
    titulo: 'Menú, pausa, créditos y fin del juego (Pantallas listas)',
    descripcion: 'En la pestaña Escena, el botón «Pantallas listas» (junto a las escenas) añade un menú principal, opciones, créditos, tabla de puntuaciones, fin del juego y pausa, ya conectados. Son escenas normales: se abren y se cambian. Tu juego solo tiene que sumar puntos en juego.puntos y, al acabar, ir a la escena Fin:',
    codigo: 'cuando toco Meta:\n    juego.puntos += 100\n    escena.cambiar("Fin", 0.5)',
  },
  {
    titulo: 'Apuntar la puntuación en la tabla de los mejores',
    descripcion: 'puntuaciones guarda las 10 mejores, con su nombre, aunque se cierre el juego. (La pantalla lista «Fin del juego» ya lo hace, pidiendo el nombre.)',
    codigo: 'cuando toco Meta:\n    si puntuaciones.entra(juego.puntos):\n        puntuaciones.guardar("Ana", juego.puntos)\n    para cada p en puntuaciones.lista():\n        mostrar(p.nombre, p.puntos)',
  },
  {
    titulo: 'Hacer tus sonidos y tu música',
    descripcion: 'En la pestaña Proyecto: el + de Sonidos abre el generador de efectos (pulsa «Salto», «Moneda», «Explosión»... hasta que te guste uno y guárdalo con su nombre), y el + de Música, la rejilla de notas. El botón del libro trae sonidos y canciones ya hechos. Luego se usan por su nombre:',
    codigo: 'cuando empieza:\n    musica.reproducir("tema")\n\ncuando se pulsa "espacio":\n    sonido.reproducir("salto")',
  },
  {
    titulo: 'Un sonido que se oye más cuanto más cerca estás',
    descripcion: 'reproducirEn pone el sonido en un sitio: se oye más flojo cuanto más lejos está de lo que se ve, y por el lado que toca. bucleEn lo deja sonando pegado al objeto (una hoguera, un motor).',
    codigo: 'cuando empieza:\n    sonido.bucleEn("motor", yo, 500)\n\ncuando toco Jugador:\n    sonido.reproducirEn("salto", yo, 800)',
  },
  {
    titulo: 'Música que sube cuando hay peligro',
    descripcion: 'Cada pista de una canción hecha en el editor de música es una capa. Con musica.intensidad = 0 suena solo la primera; con 1, todas. Aquí sube cuando hay enemigos cerca:',
    codigo: 'cuando empieza:\n    musica.reproducir("tema")\n\ncuando cada 0.5 segundos:\n    si yo.cercanos(300, "Enemigo").longitud > 0:\n        musica.intensidad = 1\n    sino:\n        musica.intensidad = 0.3',
  },
  {
    titulo: 'Colgar de una cuerda (péndulo o gancho)',
    descripcion: 'El objeto necesita Física. La cuerda lo une a un punto (o a otro objeto) y no le deja alejarse más de su largo. Con espacio se suelta.',
    codigo: 'cuando empieza:\n    junta.cuerda(yo, vector(yo.x + 120, yo.y + 160), 200)\n\ncuando se pulsa "espacio":\n    junta.quitar(yo)',
  },
  {
    titulo: 'Empezar con una plantilla y publicar el juego',
    descripcion: 'Nuevo > elige una plantilla (plataformas, vista desde arriba, naves, puzle, carreras, cartas o diálogos): es un juego pequeño que ya funciona, con el código comentado. Cámbialo. Para publicarlo: clic en el fondo de la escena > Proyecto > ponle nombre e icono, y pulsa «itch.io» en la barra de arriba: descarga el juego listo y te dice los pasos. El script más corto de una plantilla (una bala) es así:',
    codigo: 'cuando cada fotograma:\n    yo.y += 700 * delta\n\ncuando salgo de la pantalla:\n    destruir(yo)',
  },
  {
    titulo: "Programar con bloques",
    descripcion: "Con el botón «Bloques» de arriba del script (o Ctrl+B) el script se ve como bloques de colores. Arrastra un evento («cuando cada fotograma») y mete dentro acciones. Puedes volver al código cuando quieras: los dos son el mismo script. Este código se ve así en bloques:",
    codigo: "cuando cada fotograma:\n    yo.moverConFlechas(300)\n\ncuando se pulsa \"espacio\":\n    yo.saltar(700)",
  },  // ── Chispa 1.2: jugar en el móvil ──
  {
    titulo: 'Jugar con el dedo: una palanca y un botón de saltar',
    descripcion: 'En el script del jugador. La palanca hace de flechas y el botón pulsa la tecla espacio, así que el resto del código es el mismo que con teclado. Solo se ven cuando se juega con el dedo: en un ordenador no salen.',
    codigo: 'cuando empieza:\n    tactil.joystick()\n    tactil.boton("Saltar", "espacio")\n\ncuando cada fotograma:\n    yo.moverConFlechas(300)\n\ncuando se pulsa "espacio":\n    yo.saltar(700)',
  },
  {
    titulo: 'Un botón en pantalla para disparar',
    descripcion: 'Un botón que no pulsa ninguna tecla: se pregunta por él con tactil.sePulso (una vez por toque) o tactil.pulsado (mientras se aprieta). Con tactil.mover se pone donde quieras: de 0 a 100 de izquierda a derecha y de abajo arriba.',
    codigo: 'cuando empieza:\n    tactil.boton("Fuego")\n    tactil.mover("Fuego", 88, 25)\n\ncuando cada fotograma:\n    si tactil.sePulso("Fuego"):\n        efecto.chispas(yo)',
  },
  {
    titulo: 'Moverse deslizando el dedo (sin botones)',
    descripcion: 'Para juegos de una mano: deslizar a un lado cambia de carril y deslizar hacia arriba salta. tactil.gesto dice el gesto de este fotograma: "toque", "doble", "largo", "arriba", "abajo", "izquierda" o "derecha".',
    codigo: 'cuando cada fotograma:\n    si tactil.gesto == "izquierda":\n        yo.x -= 120\n    si tactil.gesto == "derecha":\n        yo.x += 120\n    si tactil.gesto == "arriba":\n        yo.saltar(600)',
  },
  {
    titulo: 'Apuntar o mirar arrastrando el dedo',
    descripcion: 'Con tactil.mirar(), arrastrar por la pantalla (fuera de la palanca y los botones) se lee en tactil.miraX y tactil.miraY. Aquí gira al objeto; cambiando la última línea mueve la cámara.',
    codigo: 'cuando empieza:\n    tactil.joystick()\n    tactil.mirar()\n\ncuando cada fotograma:\n    yo.rotacion -= tactil.miraX',
  },
  {
    titulo: 'Un juego que va bien en móviles lentos y gasta poca batería',
    descripcion: 'La calidad "auto" baja sola si el aparato no puede (menos píxeles y menos partículas), y con 30 fotogramas por segundo el móvil trabaja la mitad y se calienta menos. También se elige sin código: clic en el fondo de la escena > Proyecto > «calidad» y «fotogramas».',
    codigo: 'cuando empieza:\n    pantalla.calidad = "auto"\n    pantalla.maximoFps = 30',
  },
  {
    titulo: 'Un juego que se juega con el móvil tumbado',
    descripcion: 'Si alguien lo abre con el móvil de pie, sale un aviso de «Gira el móvil» y el juego espera. En un ordenador no hace nada.',
    codigo: 'cuando empieza:\n    pantalla.orientacion = "horizontal"\n    tactil.joystick()',
  },
  {
    titulo: 'Vibrar cuando te dan y texto distinto en móvil y en ordenador',
    descripcion: 'tactil.vibrar hace vibrar el móvil (en iPhone y en ordenadores no pasa nada). tactil.hay dice si se juega con el dedo: sirve para cambiar las instrucciones.',
    codigo: 'cuando empieza:\n    si tactil.hay:\n        mostrar("Toca Saltar")\n    sino:\n        mostrar("Pulsa espacio")\n\ncuando toco Enemigo:\n    tactil.vibrar(0.2)',
  },
  {
    titulo: 'Dejar que cada uno coloque los botones a su gusto',
    descripcion: 'En el script de un botón de tu menú de opciones. Se abre el modo colocar: quien juega arrastra la palanca y los botones a donde le vengan bien y pulsa «Listo». Se le recuerda para las siguientes partidas.',
    codigo: 'cuando hago clic encima:\n    tactil.colocar()',
  },
  {
    titulo: 'Convertir tu juego en una app para el móvil',
    descripcion: 'Arriba, «Exportar» > «App para el móvil»: descarga un zip con el juego, su icono y lo necesario para que funcione sin internet. Descomprímelo y sube lo de dentro a un sitio web con https (GitHub Pages, Netlify...). Al abrir esa dirección en el móvil: en Android, menú > «Instalar app»; en iPhone, Compartir > «Añadir a pantalla de inicio». El juego necesita controles para el dedo, por ejemplo:',
    codigo: 'cuando empieza:\n    tactil.joystick()\n    tactil.boton("Saltar", "espacio")',
  },
];

// ═════════════════════════ Búsqueda ═════════════════════════


/** Todas las fichas de funciones globales, variables especiales y módulos (lo que se puede escribir "suelto"). */
export function docsGlobales(): Doc[] {
  return [
    ...DOC_FUNCIONES,
    ...DOC_ESPECIALES,
    ...DOC_MODULOS.filter((m) => !m.nombre.includes('.')).map((m) => d(m.nombre, 'modulo', m.nombre, m.descripcion, m.ejemplo)),
  ];
}

/**
 * Busca la ficha de algo por su "ruta": "mostrar", "si", "teclado.pulsada",
 * "escena.camara.zoom", "yo.velocidad", "otro.x"...
 */
export function buscarDoc(ruta: string): Doc | null {
  const partes = ruta.split('.').map(normalizar);
  const igual = (a: string, b: string) => normalizar(a) === b;
  if (partes.length === 1) {
    const [n] = partes;
    return (
      DOC_PALABRAS.find((x) => igual(x.nombre, n)) ??
      docsGlobales().find((x) => igual(x.nombre, n)) ??
      DOC_EVENTOS.find((x) => igual(x.nombre, n)) ??
      null
    );
  }
  const miembro = partes[partes.length - 1];
  const dueno = partes.slice(0, -1).join('.');
  const modulo = DOC_MODULOS.find((m) => normalizar(m.nombre) === dueno);
  if (modulo) return modulo.miembros.find((x) => igual(x.nombre, miembro)) ?? null;
  // Cualquier otra cosa (yo, otro, una variable con un objeto...): propiedades de objeto,
  // y si no, lo que tienen las listas, textos, tablas y vectores (colores.añadir...)
  return DOC_OBJETO.find((x) => igual(x.nombre, miembro)) ?? DOC_VALORES.flatMap((v) => v.miembros).find((x) => igual(x.nombre, miembro)) ?? null;
}

/** Los miembros que se pueden escribir después de "algo." (para el autocompletado). */
export function miembrosDe(dueno: string): Doc[] {
  const n = normalizar(dueno);
  const modulo = DOC_MODULOS.find((m) => normalizar(m.nombre) === n);
  if (modulo) return modulo.miembros;
  if (n === 'yo' || n === 'otro') return DOC_OBJETO;
  // Una variable: puede ser un objeto, una lista, un texto... Damos todo (sin repetir nombres)
  const vistos = new Set(DOC_OBJETO.map((x) => x.nombre));
  return [...DOC_OBJETO, ...DOC_VALORES.flatMap((v) => v.miembros).filter((x) => !vistos.has(x.nombre) && (vistos.add(x.nombre), true))];
}
