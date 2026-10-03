/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL CURSO DE CHISPA, como datos. De aquí salen APRENDE_CHISPA.md (el curso
 * por niveles) y CHULETA_CHISPA.md (una línea por comando): los escribe
 * src/chispa/api/aprende.ts, y pruebas/curso.test.ts comprueba que
 *   - están TODOS los comandos de la API de verdad (documentacion.ts), ni uno
 *     de más ni uno de menos;
 *   - cada ejemplo FUNCIONA (se ejecuta en un juego de prueba sin errores);
 *   - cada «error típico» marcado como error da de verdad un error de Chispa;
 *   - los ejercicios y los mini proyectos funcionan.
 *
 * Cada comando tiene su «id»: grupo + ":" + nombre. Los grupos son palabra,
 * evento, funcion, especial, objeto, los módulos (teclado, raton, escena,
 * escena.camara, sonido...) y los tipos de valor (lista, texto, tabla, vector).
 */
import { agregarNovedades } from './cursoNovedades';
import { agregarNovedades12 } from './cursoNovedades12';
import type { DefObjeto } from '../../proyecto/formato';

/** Un comando en el curso. */
export interface ComandoCurso {
  id: string;
  /** Un ejemplo corto y COMPLETO, que funciona tal cual (se ejecuta en un test). */
  ejemplo: string;
  /** Una sola línea para la chuleta (puede usar las variables de EJEMPLO_BASE). */
  corto: string;
  /** El error típico: el código mal escrito y qué pasa. */
  error: { mal: string; explica: string; tipo: 'error' | 'logica' };
}

/**
 * Variables que ya existen en las líneas de la chuleta y en los errores
 * típicos (así caben en una línea). Se explican al principio de la chuleta.
 */
export const EJEMPLO_BASE = [
  'variable vida = 3',
  'variable puntos = 0',
  'variable lista = [3, 1, 2]',
  'variable frase = "hola mundo"',
  'variable tabla = {vida: 3, nombre: "Ana"}',
  'variable v = vector(3, 4)',
  'variable jugador = buscar("Jugador")',
  'variable mapa = buscar("Mapa")',
  'juego.puntos = 0',
].join('\n');

/** Un tema del curso: sus comandos, en orden. */
export interface TemaCurso {
  nivel: number;
  titulo: string;
  intro: string;
  ids: string[];
}

/** Una función que ya existe en la chuleta (para aLaVez). */
export const FUNCION_BASE = 'funcion lluvia(veces):\n    repetir veces veces:\n        crear("Gota", aleatorio(0, 900), 540)\n        esperar(0.2)';

const C: ComandoCurso[] = [];
const T: TemaCurso[] = [];
function tema(nivel: number, titulo: string, intro: string): void {
  T.push({ nivel, titulo, intro, ids: [] });
}
/** Añade un comando. tipo: 'e' = da un error de Chispa (se comprueba), 'l' = error de lógica (el código funciona, pero no hace lo que querías). */
function c(id: string, ejemplo: string, corto: string, mal: string, explica: string, tipo: 'e' | 'l' = 'e'): void {
  C.push({ id, ejemplo, corto, error: { mal, explica, tipo: tipo === 'e' ? 'error' : 'logica' } });
  T[T.length - 1].ids.push(id);
}

// ═══════════════════════════ NIVEL 1 ═══════════════════════════

tema(1, 'Mostrar y guardar datos', 'Un programa trabaja con datos: números, textos y verdadero/falso. Se guardan en variables (cajas con nombre) y se enseñan con mostrar(), que escribe en la consola del editor.');
c('funcion:mostrar', 'mostrar("Hola")\nmostrar("Vidas:", 3)', 'mostrar("Vidas:", vida)',
  'mostar("Hola")', 'Escribirlo mal: es mostrar, con r. Chispa te sugiere el nombre bueno.');
c('palabra:variable', 'variable vida = 3\nvida = vida - 1\nmostrar(vida)', 'variable nivel = 1',
  'vida = 3', 'Usar una variable que no se ha creado: la primera vez se escribe variable vida = 3.');
c('palabra:verdadero', 'variable vivo = verdadero\nsi vivo:\n    mostrar("Sigues en pie")', 'variable vivo = verdadero',
  'variable vivo = "verdadero"\nsi vivo == verdadero:\n    mostrar("vivo")', 'Ponerlo entre comillas: "verdadero" es un texto, no el valor lógico, así que la comparación da falso.', 'l');
c('palabra:falso', 'variable pausado = falso\nsi no pausado:\n    mostrar("Jugando")', 'variable pausado = falso',
  'variable pausado = False', 'Escribirlo en inglés (False o false): en Chispa es falso.');
c('palabra:nulo', 'variable jefe = buscar("Jefe")\nsi jefe == nulo:\n    mostrar("No hay jefe")', 'si jugador == nulo:',
  'variable jefe = buscar("Jefe")\nmostrar(jefe.x)', 'Usar algo que puede ser nulo sin comprobarlo antes: si no hay ningún Jefe, jefe es nulo y no tiene x.');

tema(1, 'Números y operaciones', 'Con los números se hacen cuentas (+ - * / y % para el resto) y hay funciones para redondear, sortear y limitar.');
c('funcion:aleatorio', 'variable dado = aleatorio(1, 6)\nmostrar(dado)', 'variable dado = aleatorio(1, 6)',
  'variable dado = aleatorio("1", "6")', 'Pasarle textos: los números van sin comillas.');
c('funcion:aleatorioDecimal', 'variable t = aleatorioDecimal(0.5, 1.5)\nmostrar(t)', 'yo.tamano = aleatorioDecimal(0.5, 1.5)',
  'yo.tamano = aleatorio(0.5, 1.5)', 'Usar aleatorio para decimales: aleatorio da números enteros, y entre 0.5 y 1.5 solo hay el 1.', 'l');
c('funcion:redondear', 'mostrar(redondear(3.14159, 2))\nmostrar(redondear(2.6))', 'mostrar(redondear(3.14159, 2))',
  'mostrar(redondear("3.5"))', 'Redondear un texto: primero conviértelo con numero("3.5").');
c('funcion:redondearAbajo', 'mostrar(redondearAbajo(3.9))', 'variable columna = redondearAbajo(yo.x / 32)',
  'mostrar(redondearAbajo())', 'Llamarla sin el número: redondearAbajo necesita saber qué número redondear.');
c('funcion:redondearArriba', 'mostrar(redondearArriba(3.1))', 'variable paginas = redondearArriba(25 / 10)',
  'mostrar(redondearArriba(3,1))', 'Escribir los decimales con coma: en Chispa se usa el punto (3.1). Con coma son DOS números, redondearArriba se queda con el primero (3) y da 3, no 4.', 'l');
c('funcion:absoluto', 'mostrar(absoluto(-5))', 'si absoluto(yo.velocidad.x) > 100:',
  'mostrar(absoluto("-5"))', 'Pasarle un texto: los números van sin comillas.');
c('funcion:signo', 'mostrar(signo(-8))\nmostrar(signo(3))', 'yo.voltear = signo(yo.velocidad.x) < 0',
  'mostrar(signo("-8"))', 'Pasarle un texto en vez de un número.');
c('funcion:raiz', 'mostrar(raiz(16))', 'mostrar(raiz(16))',
  'mostrar(raiz(-4))', 'Pedir la raíz de un número negativo: no existe. Comprueba antes que el número no es negativo.');
c('funcion:potencia', 'mostrar(potencia(2, 10))', 'mostrar(potencia(2, 10))',
  'mostrar(2 ^ 10)', 'Usar ^ para elevar: en Chispa no existe, se usa potencia(2, 10).');
c('funcion:minimo', 'variable vida = 12\nvida = minimo(vida, 10)\nmostrar(vida)', 'yo.vida = minimo(vida + 1, 10)',
  'mostrar(minimo())', 'Llamarlo sin números: necesita al menos uno.');
c('funcion:maximo', 'variable vida = -2\nvida = maximo(vida, 0)\nmostrar(vida)', 'vida = maximo(vida - 1, 0)',
  'variable vida = 0\nvida = maximo(vida - 1)\nmostrar(vida)', 'Olvidar el segundo número: con uno solo, maximo no hace nada (da ese mismo número). Para no bajar de 0 es maximo(vida - 1, 0).', 'l');
c('funcion:limitar', 'variable vida = 150\nvida = limitar(vida, 0, 100)\nmostrar(vida)', 'vida = limitar(vida, 0, 100)',
  'variable vida = limitar(150, 100, 0)\nmostrar(vida)', 'Poner el máximo antes que el mínimo: primero va el valor, luego el mínimo y luego el máximo.');
c('funcion:numero', 'variable n = numero("42") + 1\nmostrar(n)', 'variable n = numero("42")',
  'mostrar("42" - 1)', 'Hacer cuentas con un número que está en un texto: conviértelo antes con numero("42").');
c('funcion:texto', 'variable puntos = 7\nmostrar("Puntos: " + texto(puntos))', 'yo.texto = "Puntos: " + texto(puntos)',
  'variable n = texto(5)\nmostrar(n + 1)', 'Convertir a texto y luego hacer cuentas: "5" + 1 junta los textos y da "51", no 6.', 'l');
c('funcion:probabilidad', 'si probabilidad(50):\n    mostrar("Cara")\nsino:\n    mostrar("Cruz")', 'si probabilidad(10):',
  'si probabilidad(0.1):\n    mostrar("premio")', 'Escribir 0.1 para decir el 10 %: probabilidad usa porcentajes, así que es probabilidad(10).', 'l');

tema(1, 'Decidir: si y sino', 'Un programa decide qué hacer mirando una condición. Se compara con == (igual), != (distinto), <, >, <= y >=.');
c('palabra:si', 'variable vida = 0\nsi vida <= 0:\n    mostrar("Has perdido")', 'si vida <= 0:',
  'variable vida = 0\nsi vida = 0:\n    mostrar("fin")', 'Usar = para comparar: = guarda un valor, para comparar se usa ==.');
c('palabra:sino', 'variable vida = 80\nsi vida > 50:\n    mostrar("Bien")\nsino si vida > 20:\n    mostrar("Regular")\nsino:\n    mostrar("Cuidado")', 'sino:',
  'variable vida = 80\nsi vida > 50:\n    mostrar("Bien")\nsi no:\n    mostrar("Cuidado")', 'Escribir si no separado: se escribe todo junto, sino.');
c('palabra:y', 'variable vida = 3\nvariable puntos = 20\nsi vida > 0 y puntos >= 10:\n    mostrar("Pasas de nivel")', 'si vida > 0 y puntos >= 10:',
  'variable vida = 3\nsi vida > 0 and vida < 5:\n    mostrar("ok")', 'Escribirlo en inglés (and o &&): en Chispa es y.');
c('palabra:o', 'variable tecla = "a"\nsi tecla == "a" o tecla == "izquierda":\n    mostrar("A la izquierda")', 'si vida == 0 o puntos < 0:',
  'variable tecla = "a"\nsi tecla == "a" o "izquierda":\n    mostrar("izquierda")', 'Poner solo el valor después de o: hay que repetir la comparación entera, tecla == "a" o tecla == "izquierda".', 'l');
c('palabra:no', 'variable pausado = falso\nsi no pausado:\n    mostrar("A jugar")', 'si no yo.enSuelo:',
  'variable pausado = falso\nsi !pausado:\n    mostrar("jugando")', 'Usar ! (como en otros lenguajes): en Chispa se escribe no.');

tema(1, 'Repetir: bucles', 'Para no escribir lo mismo muchas veces, se repite. El código que se repite va dentro, con sangría (cuatro espacios).');
c('palabra:repetir', 'repetir 3 veces:\n    mostrar("Hola")', 'repetir 3 veces:',
  'repetir 3 veces\n    mostrar("Hola")', 'Olvidar los dos puntos del final: la línea de repetir termina en :.');
c('palabra:mientras', 'variable n = 3\nmientras n > 0:\n    mostrar(n)\n    n -= 1', 'mientras vida > 0:',
  'variable n = 3\nmientras n > 0:\n    mostrar(n)', 'Un bucle que no termina nunca: si nada cambia n dentro, sigue para siempre. Chispa lo corta al millón de vueltas con un error.');
c('palabra:para', 'para cada color en ["rojo", "verde", "azul"]:\n    mostrar(color)', 'para cada x en lista:',
  'para color en ["rojo", "verde"]:\n    mostrar(color)', 'Olvidar la palabra cada: se escribe para cada color en lista:.');
c('palabra:cada', 'para cada n en [1, 2, 3]:\n    mostrar(n * 10)', 'para cada n en [1, 2, 3]:',
  'para cada n de [1, 2, 3]:\n    mostrar(n)', 'Usar de en vez de en: es para cada n en lista:.');
c('palabra:en', 'variable ficha = {vida: 3}\nsi "vida" en ficha:\n    mostrar(ficha.vida)', 'si "vida" en tabla:',
  'variable ficha = {vida: 3}\nsi vida en ficha:\n    mostrar("si")', 'Olvidar las comillas de la clave: sin comillas, vida es una variable (que no existe).');
c('funcion:rango', 'para cada i en rango(1, 5):\n    mostrar(i)', 'para cada i en rango(1, 10):',
  'para cada i en rango(1, 5, 0):\n    mostrar(i)', 'Un paso de 0: no avanzaría nunca. El paso tiene que ser 1, 2, 5...');
c('palabra:romper', 'variable n = 0\nmientras verdadero:\n    n += 1\n    si n == 3:\n        romper\nmostrar(n)', 'romper',
  'romper', 'Usar romper fuera de un bucle: solo sirve dentro de mientras, repetir o para cada.');
c('palabra:continuar', 'para cada n en [1, -2, 3]:\n    si n < 0:\n        continuar\n    mostrar(n)', 'continuar',
  'si vida > 0:\n    continuar', 'Usar continuar fuera de un bucle: salta a la siguiente vuelta, así que tiene que estar dentro de uno.');

tema(1, 'Textos', 'Los textos van entre comillas. Se juntan con + y se pueden meter valores dentro con llaves: "Tienes {vida} vidas". Los textos no cambian: sus acciones devuelven uno nuevo.');
c('texto:longitud', 'variable nombre = "Chispa"\nmostrar(nombre.longitud)', 'mostrar(frase.longitud)',
  'variable nombre = "Chispa"\nmostrar(nombre.longitud())', 'Ponerle paréntesis: longitud es un dato, no una acción, así que va sin ().');
c('texto:mayusculas', 'variable nombre = "ana"\nmostrar(nombre.mayusculas)', 'mostrar(frase.mayusculas)',
  'variable nombre = "ana"\nmostrar(nombre.mayusculas())', 'Ponerle paréntesis: mayusculas va sin ().');
c('texto:minusculas', 'variable respuesta = "SI"\nsi respuesta.minusculas == "si":\n    mostrar("Vale")', 'si frase.minusculas == "hola mundo":',
  'variable respuesta = "SI"\nsi respuesta.minuscula == "si":\n    mostrar("Vale")', 'Escribirlo en singular: es minusculas, con s.');
c('texto:dividir', 'variable palabras = "uno dos tres".dividir(" ")\nmostrar(palabras)', 'variable palabras = frase.dividir(" ")',
  'variable palabras = "uno dos".dividir(3)', 'Dividir por un número: el separador es un texto (" ", ",", "-").');
c('texto:reemplazar', 'mostrar("mi gato".reemplazar("gato", "perro"))', 'mostrar(frase.reemplazar("hola", "adios"))',
  'mostrar("mi gato".reemplazar("gato"))', 'Olvidar por qué cambiarlo: reemplazar necesita dos textos, qué buscar y qué poner.');
c('texto:contiene', 'variable frase = "hola mundo"\nsi frase.contiene("mundo"):\n    mostrar("Sale mundo")', 'si frase.contiene("hola"):',
  'variable frase = "hola mundo"\nsi frase.contiene(mundo):\n    mostrar("si")', 'Olvidar las comillas: mundo sin comillas es una variable, no un texto.');
c('texto:empiezaPor', 'variable nombre = "Dr. Pepe"\nsi nombre.empiezaPor("Dr"):\n    mostrar("Es doctor")', 'si frase.empiezaPor("hola"):',
  'variable nombre = "Dr. Pepe"\nsi nombre.empiezapor(Dr):\n    mostrar("doctor")', 'Olvidar las comillas del trozo que se busca.');
c('texto:terminaPor', 'variable palabra = "gatos"\nsi palabra.terminaPor("s"):\n    mostrar("Plural")', 'si frase.terminaPor("mundo"):',
  'variable palabra = "gatos"\nsi palabra.terminaPor("S"):\n    mostrar("plural")', 'Las mayúsculas cuentan: "gatos" no termina por "S" mayúscula. Usa palabra.minusculas si no te importan.', 'l');
c('texto:recortar', 'variable escrito = "  hola  "\nmostrar(escrito.recortar())', 'variable limpio = frase.recortar()',
  'variable escrito = "  hola  "\nmostrar(escrito.recortar)', 'Olvidar los paréntesis: sin () no se recorta nada; se enseña la acción en vez de usarla. Es escrito.recortar().', 'l');
c('texto:trozo', 'variable nombre = "Chispa"\nmostrar(nombre.trozo(1, 3))', 'variable inicial = frase.trozo(1, 1)',
  'variable nombre = "Chispa"\nmostrar(nombre.trozo(0, 3))', 'Empezar a contar en 0: en Chispa la primera letra es la 1.');
c('texto:posicion', 'mostrar("hola mundo".posicion("mundo"))', 'mostrar(frase.posicion("mundo"))',
  'si "hola".posicion("x") == -1:\n    mostrar("no esta")', 'Esperar un -1 si no está: en Chispa da 0 (las posiciones empiezan en 1).', 'l');
c('funcion:longitud', 'mostrar(longitud("hola"))\nmostrar(longitud([1, 2, 3]))', 'mostrar(longitud(lista))',
  'mostrar(longitud(5))', 'Pedir la longitud de un número: solo los textos, las listas y las tablas tienen longitud.');

tema(1, 'Listas', 'Una lista guarda varias cosas en orden, entre corchetes: ["rojo", "verde"]. En Chispa la primera posición es la 1: lista[1].');
c('lista:longitud', 'variable colores = ["rojo", "verde"]\nmostrar(colores.longitud)', 'mostrar(lista.longitud)',
  'variable colores = ["rojo", "verde"]\nmostrar(colores.length)', 'Escribirlo en inglés (length): es longitud.');
c('lista:añadir', 'variable colores = ["rojo"]\ncolores.añadir("azul")\nmostrar(colores)', 'lista.añadir(4)',
  'variable colores = ["rojo"]\ncolores.push("azul")', 'Escribirlo en inglés (push): es añadir (o anadir).');
c('lista:quitar', 'variable cola = ["Ana", "Luis"]\nvariable primero = cola.quitar(1)\nmostrar(primero, cola)', 'variable primero = lista.quitar(1)',
  'variable cola = ["Ana", "Luis"]\ncola.quitar(0)', 'Quitar la posición 0: en Chispa las posiciones empiezan en 1.');
c('lista:primero', 'variable cola = ["Ana", "Luis"]\nmostrar(cola.primero)', 'mostrar(lista.primero)',
  'variable cola = ["Ana", "Luis"]\nmostrar(cola[0])', 'Pedir el elemento 0: el primero es el 1 (cola[1]) o, más fácil, cola.primero.');
c('lista:ultimo', 'variable puntos = [10, 20, 30]\nmostrar(puntos.ultimo)', 'mostrar(lista.ultimo)',
  'variable puntos = [10, 20, 30]\nmostrar(puntos[puntos.longitud + 1])', 'Pasarse de la lista: el último es el de la posición longitud, no longitud + 1.');
c('lista:insertar', 'variable cola = ["Luis"]\ncola.insertar(1, "Ana")\nmostrar(cola)', 'lista.insertar(1, 0)',
  'variable cola = ["Luis"]\ncola.insertar("Ana")', 'Olvidar la posición: primero va dónde meterlo y luego el valor.');
c('lista:ordenar', 'variable records = [30, 10, 20]\nrecords.ordenar()\nmostrar(records)', 'lista.ordenar()',
  'variable cosas = [3, "a", 1]\ncosas.ordenar()', 'Ordenar una lista que mezcla números y textos: solo se puede con todo números o todo textos.');
c('lista:mezclar', 'variable cartas = [1, 2, 3, 4]\ncartas.mezclar()\nmostrar(cartas)', 'lista.mezclar()',
  'variable cartas = [1, 2, 3]\ncartas.mezclar', 'Olvidar los paréntesis: mezclar es una acción, lleva ().');
c('lista:invertir', 'variable n = [1, 2, 3]\nn.invertir()\nmostrar(n)', 'lista.invertir()',
  'variable n = [1, 2, 3]\nn.reverse()', 'Escribirlo en inglés (reverse): es invertir.');
c('lista:posicion', 'variable colores = ["rojo", "verde"]\nmostrar(colores.posicion("verde"))', 'variable donde = lista.posicion(2)',
  'variable colores = ["rojo", "verde"]\nsi colores.posicion("azul") == -1:\n    mostrar("no esta")', 'Esperar -1 si no está: da 0.', 'l');
c('lista:contiene', 'variable mochila = ["llave", "mapa"]\nsi mochila.contiene("llave"):\n    mostrar("Abres la puerta")', 'si lista.contiene(3):',
  'variable mochila = ["llave"]\nsi mochila.contiene(llave):\n    mostrar("abres")', 'Olvidar las comillas: llave sin comillas es una variable.');
c('lista:sublista', 'variable records = [50, 40, 30, 20]\nmostrar(records.sublista(1, 3))', 'variable mejores = lista.sublista(1, 2)',
  'variable records = [50, 40]\nmostrar(records.sublista(0, 1))', 'Empezar en 0: la primera posición es la 1.');
c('lista:unir', 'variable mochila = ["llave", "mapa"]\nmostrar(mochila.unir(" | "))', 'mostrar(lista.unir(", "))',
  'variable mochila = ["llave", "mapa"]\nmostrar(mochila.join(", "))', 'Escribirlo en inglés (join): es unir.');
c('lista:vaciar', 'variable enemigos = [1, 2]\nenemigos.vaciar()\nmostrar(enemigos.longitud)', 'lista.vaciar()',
  'variable enemigos = [1, 2]\nenemigos.vaciar', 'Olvidar los paréntesis: vaciar es una acción.');
c('funcion:elegir', 'variable color = elegir(["rojo", "verde", "azul"])\nmostrar(color)', 'yo.color = elegir(["rojo", "azul"])',
  'mostrar(elegir("rojo", "azul"))', 'Pasarle los valores sueltos: elegir necesita UNA lista, con corchetes: elegir(["rojo", "azul"]).');
c('funcion:unir', 'mostrar(unir(["a", "b", "c"], " - "))', 'mostrar(unir(lista, " - "))',
  'mostrar(unir("a", "b"))', 'Pasarle textos sueltos: unir necesita una lista.');

tema(1, 'Tablas', 'Una tabla guarda datos con nombre (claves), entre llaves: {vida: 3, nombre: "Ana"}. Se leen con punto (ficha.vida) o con corchetes (ficha["vida"]).');
c('tabla:claves', 'variable ficha = {vida: 3, nombre: "Ana"}\npara cada k en ficha.claves:\n    mostrar(k)', 'mostrar(tabla.claves)',
  'variable ficha = {vida: 3}\nmostrar(ficha.claves())', 'Ponerle paréntesis: claves es un dato, va sin ().');
c('tabla:quitar', 'variable ficha = {vida: 3, llave: 1}\nficha.quitar("llave")\nmostrar(ficha)', 'tabla.quitar("nombre")',
  'variable ficha = {vida: 3}\nficha.quitar("llave")', 'Quitar una clave que no está: comprueba antes con si "llave" en ficha:.');

tema(1, 'Funciones', 'Una función es un trozo de código con nombre que se puede usar muchas veces. Puede recibir valores y devolver un resultado.');
c('palabra:funcion', 'funcion saludar(nombre):\n    mostrar("Hola, " + nombre)\n\ncuando empieza:\n    saludar("Ana")', 'funcion saludar(nombre):',
  'funcion saludar(nombre):\n    mostrar("Hola, " + nombre)\n\ncuando empieza:\n    saludar()', 'Llamarla sin sus valores: si la función pide nombre, hay que dárselo: saludar("Ana").');
c('palabra:devolver', 'funcion doble(n):\n    devolver n * 2\n\ncuando empieza:\n    mostrar(doble(21))', 'devolver n * 2',
  'funcion doble(n):\n    n * 2\n\ncuando empieza:\n    mostrar(doble(3))', 'Olvidar devolver: la función hace la cuenta, pero no da el resultado. Hay que escribir devolver n * 2.');

// ═══════════════════════════ NIVEL 2 ═══════════════════════════

tema(2, 'Eventos: cuándo pasa cada cosa', 'En un juego, el código de cada objeto va dentro de eventos: «cuando pasa esto, haz esto otro». Cada objeto tiene su script.');
c('palabra:cuando', 'cuando empieza:\n    mostrar("Empieza el juego")', 'cuando empieza:',
  'cuando empiezo:\n    mostrar("hola")', 'Inventarse el evento: los que hay son fijos (cuando empieza, cuando toco...). Chispa entiende algunas formas parecidas (cuando empiece, cuando comienza), pero no cualquiera.');
c('evento:cuando empieza', 'cuando empieza:\n    yo.vida = 3\n    mostrar("Tengo", yo.vida, "vidas")', 'cuando empieza:',
  'cuando empieza\n    mostrar("hola")', 'Olvidar los dos puntos del final: la línea de un evento termina en :.');
c('evento:cuando cada fotograma', 'cuando cada fotograma:\n    yo.x += 100 * delta', 'cuando cada fotograma:',
  'cuando cada fotograma:\n    yo.x += 5', 'Mover sin delta: en un ordenador rápido irá más deprisa que en uno lento. Multiplica por delta.', 'l');
c('especial:delta', 'cuando cada fotograma:\n    yo.x += 200 * delta', 'yo.x += 200 * delta',
  'cuando empieza:\n    yo.x += 200 * delta', 'Usar delta fuera de cuando cada fotograma: en cuando empieza solo se mueve una vez, un poquito.', 'l');
c('tiempo:delta', 'cuando cada fotograma:\n    yo.x += 100 * tiempo.delta', 'yo.x += 100 * tiempo.delta',
  'cuando cada fotograma:\n    yo.x += 100 * tiempo.delta()', 'Ponerle paréntesis: es un dato, no una acción.');

tema(2, 'yo: el objeto y sus datos', 'yo es el objeto de este script. Tiene datos que se leen y se cambian: dónde está (x, y), su color, su tamaño... La Y crece hacia ARRIBA.');
c('especial:yo', 'cuando empieza:\n    yo.x += 10\n    mostrar(yo.nombre)', 'yo.x += 10',
  'cuando empieza:\n    Yo.x = 10\n    mostrar(me.x)', 'Escribirlo en inglés (me o this): el objeto del script es yo.');
c('objeto:nombre', 'cuando empieza:\n    mostrar(yo.nombre)', 'mostrar(yo.nombre)',
  'cuando empieza:\n    mostrar(yo.nombre())', 'Ponerle paréntesis: es un dato.');
c('objeto:tipo', 'cuando empieza:\n    mostrar(yo.tipo)', 'si jugador.tipo == "Jugador":',
  'cuando empieza:\n    si yo.tipo == Prueba:\n        mostrar("si")', 'Comparar con el tipo sin comillas: el tipo es un texto, "Prueba".');
c('objeto:x', 'cuando cada fotograma:\n    yo.x += 100 * delta', 'yo.x = 100',
  'cuando empieza:\n    yo.X = "100"', 'Darle un texto: la x es un número (sin comillas).');
c('objeto:y', 'cuando cada fotograma:\n    yo.y += 50 * delta', 'yo.y += 50 * delta',
  'cuando cada fotograma:\n    yo.y -= 100 * delta   # para subir', 'Pensar que la y crece hacia abajo: en Chispa la Y crece hacia ARRIBA, así que restar hace BAJAR.', 'l');
c('objeto:posicion', 'cuando empieza:\n    yo.posicion = vector(100, 200)', 'yo.posicion = vector(100, 200)',
  'cuando empieza:\n    yo.posicion = (100, 200)', 'Escribir la posición con paréntesis solos: se escribe vector(100, 200).');
c('funcion:vector', 'cuando empieza:\n    yo.posicion = vector(300, 200)\n    mostrar(yo.posicion)', 'variable v = vector(3, 4)',
  'variable v = vector("3", "4")', 'Pasarle textos: los dos números van sin comillas.');
c('vector:x', 'variable v = vector(3, 4)\nmostrar(v.x)', 'mostrar(v.x)',
  'variable v = vector(3, 4)\nmostrar(v.z)', 'Pedir algo que un vector no tiene: tiene x, y, longitud y normalizado.');
c('vector:y', 'variable v = vector(3, 4)\nmostrar(v.y)', 'mostrar(v.y)',
  'variable v = vector(3, 4)\nmostrar(v.Y())', 'Ponerle paréntesis: es un dato.');
c('vector:longitud', 'mostrar(vector(3, 4).longitud)', 'mostrar(v.longitud)',
  'mostrar(vector(3, 4).largo)', 'Llamarlo largo o tamano: es longitud.');
c('vector:normalizado', 'variable d = vector(3, 4).normalizado\nmostrar(d)', 'variable dir = v.normalizado',
  'variable d = vector(3, 4).normalizado()', 'Ponerle paréntesis: es un dato.');
c('objeto:rotacion', 'cuando empieza:\n    yo.rotacion = 45', 'yo.rotacion = 45',
  'cuando empieza:\n    yo.rotacion = "45 grados"', 'Darle un texto: la rotación es un número de grados.');
c('objeto:escala', 'cuando empieza:\n    yo.escala = 2', 'yo.escala = 2',
  'cuando empieza:\n    yo.escala = 0', 'Poner la escala a 0: el objeto desaparece (sigue ahí, pero no se ve). La normal es 1.', 'l');
c('objeto:color', 'cuando empieza:\n    yo.color = "rojo"', 'yo.color = "rojo"',
  'cuando empieza:\n    yo.color = rojo', 'Olvidar las comillas: los colores son textos, "rojo".');
c('objeto:visible', 'cuando empieza:\n    yo.visible = falso', 'yo.visible = falso',
  'cuando empieza:\n    yo.visible = "no"', 'Darle un texto: visible es verdadero o falso.');
c('objeto:ancho', 'cuando empieza:\n    yo.ancho = 100', 'yo.ancho = 100',
  'cuando empieza:\n    yo.ancho = "grande"', 'Darle un texto: el ancho es un número de píxeles.');
c('objeto:alto', 'cuando empieza:\n    yo.alto = 20', 'yo.alto = 20',
  'cuando empieza:\n    yo.alto = alto * 2', 'Olvidar yo.: alto solo no existe, es yo.alto.');
c('objeto:opacidad', 'cuando empieza:\n    yo.opacidad = 0.5', 'yo.opacidad = 0.5',
  'cuando empieza:\n    yo.opacidad = 50', 'Usar porcentajes: la opacidad va de 0 a 1 (0.5 es la mitad).', 'l');
c('objeto:transparencia', 'cuando empieza:\n    yo.transparencia = 0.5', 'yo.transparencia = 0.5',
  'cuando empieza:\n    yo.transparencia = 1', 'Confundirla con la opacidad: transparencia 1 es INVISIBLE (al revés que la opacidad).', 'l');
c('objeto:capa', 'cuando empieza:\n    yo.capa = 10', 'yo.capa = 10',
  'cuando empieza:\n    yo.capa = "delante"', 'Darle un texto: la capa es un número (más alto = más por encima).');
c('objeto:voltear', 'cuando cada fotograma:\n    yo.voltear = yo.velocidad.x < 0', 'yo.voltear = verdadero',
  'cuando empieza:\n    yo.voltear()', 'Usarlo como acción: es un dato, se escribe yo.voltear = verdadero.');
c('objeto:voltearVertical', 'cuando empieza:\n    yo.voltearVertical = verdadero', 'yo.voltearVertical = verdadero',
  'cuando empieza:\n    yo.voltearvertical()', 'Usarlo como acción: es un dato, yo.voltearVertical = verdadero.');
c('objeto:imagen', 'cuando empieza:\n    yo.imagen = "jugador_herido"', 'yo.imagen = "jugador"',
  'cuando empieza:\n    yo.imagen = "jugador_heridoo"', 'Escribir mal el nombre de la imagen: tiene que ser una imagen del proyecto. Chispa te sugiere la parecida.');
c('objeto:texto', 'cuando empieza:\n    yo.texto = "Puntos: 0"', 'yo.texto = "Puntos: {juego.puntos}"',
  'cuando empieza:\n    yo.texto = Puntos', 'Olvidar las comillas del texto.');
c('objeto:tamaño', 'cuando empieza:\n    yo.tamano = 2', 'yo.tamano = 2',
  'cuando empieza:\n    yo.tamano = "doble"', 'Darle un texto: el tamaño es un número (1 normal, 2 el doble).');
c('objeto:tamanoLetra', 'cuando empieza:\n    yo.texto = "Hola"\n    yo.tamanoLetra = 40', 'yo.tamanoLetra = 40',
  'cuando empieza:\n    yo.tamanoLetra = "40px"', 'Poner las unidades: es solo el número, 40.');
c('objeto:colorTexto', 'cuando empieza:\n    yo.colorTexto = "negro"', 'yo.colorTexto = "negro"',
  'cuando empieza:\n    yo.colorTexto = negro', 'Olvidar las comillas del color.');

tema(2, 'El teclado', 'Hay dos formas: eventos (cuando se pulsa) para cosas que pasan una vez, y teclado.pulsada() dentro de cuando cada fotograma para moverse. Las teclas se escriben entre comillas: "espacio", "izquierda", "a"...');
c('evento:cuando se pulsa', 'cuando se pulsa "espacio":\n    mostrar("Salto")', 'cuando se pulsa "espacio":',
  'cuando se pulsa espacio:\n    mostrar("salto")', 'Olvidar las comillas del nombre de la tecla.');
c('evento:cuando se mantiene', 'cuando se mantiene "derecha":\n    yo.x += 200 * delta', 'cuando se mantiene "derecha":',
  'cuando se pulsa "derecha":\n    yo.x += 200 * delta', 'Usar cuando se pulsa para moverse: solo pasa UNA vez por pulsación. Para moverse mientras se mantiene, cuando se mantiene.', 'l');
c('evento:cuando se suelta', 'cuando se suelta "espacio":\n    mostrar("Soltada")', 'cuando se suelta "espacio":',
  'cuando se suelta "spacebar":\n    mostrar("soltada")', 'Poner el nombre de la tecla en inglés: es "espacio". Chispa te dice los nombres que hay.');
c('teclado:pulsada', 'cuando cada fotograma:\n    si teclado.pulsada("izquierda"):\n        yo.x -= 200 * delta', 'si teclado.pulsada("izquierda"):',
  'cuando cada fotograma:\n    si teclado.pulsada(izquierda):\n        yo.x -= 5', 'Olvidar las comillas del nombre de la tecla.');
c('teclado:sePulso', 'cuando cada fotograma:\n    si teclado.sePulso("espacio"):\n        mostrar("Una vez")', 'si teclado.sePulso("espacio"):',
  'cuando empieza:\n    si teclado.sepulso("espacio"):\n        mostrar("salto")', 'Mirarlo en cuando empieza: solo es verdadero justo en el fotograma de la pulsación, así que hay que mirarlo en cada fotograma.', 'l');
c('teclado:seSolto', 'cuando cada fotograma:\n    si teclado.seSolto("espacio"):\n        mostrar("Soltada")', 'si teclado.seSolto("espacio"):',
  'cuando cada fotograma:\n    si teclado.seSolto():\n        mostrar("soltada")', 'Olvidar qué tecla: seSolto necesita el nombre de la tecla.');
c('teclado:algunaSePulso', 'cuando cada fotograma:\n    si teclado.algunaSePulso():\n        mostrar("Empezamos")', 'si teclado.algunaSePulso():',
  'cuando cada fotograma:\n    si teclado.algunaSePulso:\n        mostrar("empezamos")', 'Olvidar los paréntesis: sin () no se pregunta nada, y el si se cumple siempre. Es teclado.algunaSePulso().', 'l');
c('teclado:ultima', 'cuando cada fotograma:\n    yo.texto = "Tecla: {teclado.ultima}"', 'mostrar(teclado.ultima)',
  'cuando empieza:\n    mostrar(teclado.ultima())', 'Ponerle paréntesis: es un dato.');
c('teclado:pulsadas', 'cuando cada fotograma:\n    si teclado.pulsadas.longitud > 1:\n        mostrar("Varias a la vez")', 'mostrar(teclado.pulsadas)',
  'cuando empieza:\n    mostrar(teclado.pulsadas())', 'Ponerle paréntesis: es un dato (una lista).');

tema(2, 'El ratón', 'El ratón tiene posición (raton.x, raton.y) y botones. Los objetos pueden saber si el ratón está encima o si los arrastras.');
c('evento:cuando hago clic', 'cuando hago clic:\n    mostrar("Clic en", raton.x, raton.y)', 'cuando hago clic:',
  'cuando clic:\n    mostrar("clic")', 'Escribirlo a medias: es cuando hago clic:.');
c('evento:cuando hago clic encima', 'cuando hago clic encima:\n    yo.color = "amarillo"', 'cuando hago clic encima:',
  'cuando hago clic:\n    escena.cambiar("Nivel2")', 'Usar cuando hago clic para un botón: vale para un clic en CUALQUIER sitio. Para que sea solo encima del botón, cuando hago clic encima.', 'l');
c('raton:x', 'cuando cada fotograma:\n    yo.x = raton.x', 'yo.x = raton.x',
  'cuando cada fotograma:\n    yo.x = raton.x()', 'Ponerle paréntesis: es un dato.');
c('raton:y', 'cuando cada fotograma:\n    yo.y = raton.y', 'yo.y = raton.y',
  'cuando cada fotograma:\n    yo.y = mouse.y', 'Escribirlo en inglés (mouse): es raton, sin tilde.');
c('raton:posicion', 'cuando cada fotograma:\n    yo.mirarA(raton.posicion)', 'yo.posicion = raton.posicion',
  'cuando cada fotograma:\n    yo.mirarA(raton)', 'Mirar al raton entero: hay que decir su posición, raton.posicion.');
c('raton:rueda', 'cuando cada fotograma:\n    escena.camara.zoom -= raton.rueda * 0.001', 'escena.camara.zoom -= raton.rueda * 0.001',
  'cuando cada fotograma:\n    escena.camara.zoom -= raton.rueda', 'Usar la rueda tal cual: da números grandes (100 por vuelta), así que el zoom se vuelve loco. Multiplícala por algo pequeño.', 'l');
c('raton:objeto', 'cuando cada fotograma:\n    si raton.sePulso() y raton.objeto != nulo:\n        mostrar(raton.objeto.nombre)', 'si raton.objeto != nulo:',
  'cuando cada fotograma:\n    mostrar(raton.objeto.nombre)', 'Usarlo sin comprobar que hay algo debajo: si no hay nada, es nulo y no tiene nombre.');
c('raton:visible', 'cuando empieza:\n    raton.visible = falso', 'raton.visible = falso',
  'cuando empieza:\n    raton.ocultar()', 'Inventarse ocultar: se escribe raton.visible = falso.');
c('raton:pulsado', 'cuando cada fotograma:\n    si raton.pulsado("izquierdo"):\n        yo.x = raton.x', 'si raton.pulsado("izquierdo"):',
  'cuando cada fotograma:\n    si raton.pulsado("left"):\n        mostrar("clic")', 'Poner el botón en inglés: es "izquierdo", "derecho" o "medio".');
c('raton:sePulso', 'cuando cada fotograma:\n    si raton.sePulso():\n        mostrar("Clic")', 'si raton.sePulso():',
  'cuando cada fotograma:\n    si raton.sePulso:\n        mostrar("clic")', 'Olvidar los paréntesis: sin () no se pregunta nada, y el si se cumple siempre. Es raton.sePulso().', 'l');
c('raton:seSolto', 'cuando cada fotograma:\n    si raton.seSolto():\n        mostrar("Soltado")', 'si raton.seSolto():',
  'cuando cada fotograma:\n    si raton.seSolto("arriba"):\n        mostrar("soltado")', 'Poner un botón que no existe: son "izquierdo", "derecho" o "medio".');
c('objeto:ratonEncima', 'cuando cada fotograma:\n    si yo.ratonEncima:\n        yo.color = "amarillo"\n    sino:\n        yo.color = "blanco"', 'si yo.ratonEncima:',
  'cuando cada fotograma:\n    si yo.ratonEncima():\n        yo.color = "amarillo"', 'Ponerle paréntesis: es un dato.');
c('objeto:arrastrable', 'cuando empieza:\n    yo.arrastrable = verdadero', 'yo.arrastrable = verdadero',
  'cuando empieza:\n    yo.arrastrar()', 'Inventarse la acción: se escribe yo.arrastrable = verdadero.');
c('objeto:arrastrando', 'cuando cada fotograma:\n    si yo.arrastrando:\n        yo.opacidad = 0.7', 'si yo.arrastrando:',
  'cuando empieza:\n    yo.arrastrando = verdadero', 'Darle un valor: solo se lee. Para poder arrastrar, yo.arrastrable = verdadero.');

tema(2, 'Moverse', 'Hay muchas formas de mover un objeto: sumar a su x y su y, con las flechas, hacia otro objeto, girando... Recuerda multiplicar por delta en cuando cada fotograma.');
c('objeto:mover', 'cuando cada fotograma:\n    yo.mover(100 * delta, 0)', 'yo.mover(10, 0)',
  'cuando empieza:\n    yo.mover("derecha")', 'Decir la dirección con palabras: mover usa números, cuántos píxeles en x y en y: yo.mover(10, 0).');
c('objeto:moverConFlechas', 'cuando cada fotograma:\n    yo.moverConFlechas(300)', 'yo.moverConFlechas(300)',
  'cuando empieza:\n    yo.moverConFlechas(300)', 'Ponerlo en cuando empieza: solo mira las flechas una vez. Tiene que ir en cuando cada fotograma.', 'l');
c('objeto:rotar', 'cuando cada fotograma:\n    yo.rotar(90 * delta)', 'yo.rotar(90 * delta)',
  'cuando cada fotograma:\n    yo.rotar()', 'Olvidar cuántos grados.');
c('objeto:avanzar', 'cuando empieza:\n    yo.rotacion = 45\n    yo.avanzar(10)', 'yo.avanzar(10)',
  'cuando empieza:\n    yo.avanzar(pasos)', 'Usar una variable que no existe: di cuántos pasos con un número.');
c('objeto:moverHacia', 'cuando cada fotograma:\n    yo.moverHacia(buscar("Jugador"), 80)', 'yo.moverHacia(jugador, 80)',
  'cuando cada fotograma:\n    yo.moverHacia("Jugador", 80)', 'Pasarle el nombre en vez del objeto: hay que buscarlo antes, buscar("Jugador").');
c('objeto:irA', 'cuando empieza:\n    yo.irA(400, 300, 2)', 'yo.irA(400, 300, 2)',
  'cuando cada fotograma:\n    yo.irA(400, 300, 2)', 'Llamarlo en cada fotograma: empieza el viaje una y otra vez y nunca llega. Llámalo una sola vez.', 'l');
c('objeto:teletransportar', 'cuando empieza:\n    yo.teletransportar(100, 300)', 'yo.teletransportar(100, 300)',
  'cuando empieza:\n    yo.teletransportar()', 'Olvidar a dónde: un objeto, una posición o dos números.');
c('objeto:mirarA', 'cuando cada fotograma:\n    yo.mirarA(raton.posicion)', 'yo.mirarA(jugador)',
  'cuando cada fotograma:\n    yo.mirarA("Jugador")', 'Pasarle el nombre: hay que darle el objeto (buscar("Jugador")) o una posición.');
c('objeto:rotarHacia', 'cuando cada fotograma:\n    yo.rotarHacia(buscar("Jugador"), 90)', 'yo.rotarHacia(jugador, 90)',
  'cuando empieza:\n    yo.rotarHacia(buscar("Jugador"), 90)', 'Llamarlo una sola vez: gira un poco cada vez, así que va en cuando cada fotograma.', 'l');
c('objeto:anguloA', 'cuando empieza:\n    mostrar(yo.anguloA(buscar("Jugador")))', 'variable a = yo.anguloA(jugador)',
  'cuando empieza:\n    mostrar(yo.anguloA())', 'Olvidar hacia dónde.');
c('objeto:direccionA', 'cuando empieza:\n    variable d = yo.direccionA(buscar("Jugador"))\n    mostrar(d)', 'variable d = yo.direccionA(jugador)',
  'cuando empieza:\n    mostrar(yo.direccionA())', 'Olvidar hacia dónde.');
c('objeto:distanciaA', 'cuando empieza:\n    mostrar(yo.distanciaA(buscar("Jugador")))', 'si yo.distanciaA(jugador) < 50:',
  'cuando empieza:\n    mostrar(yo.distanciaA("Jugador"))', 'Pasarle el nombre: hay que darle el objeto o una posición.');
c('funcion:distancia', 'cuando empieza:\n    mostrar(distancia(yo, buscar("Jugador")))', 'si distancia(yo, jugador) < 100:',
  'cuando empieza:\n    mostrar(distancia(yo))', 'Darle un solo sitio: la distancia es entre DOS cosas.');
c('funcion:angulo', 'cuando empieza:\n    yo.rotacion = angulo(yo, buscar("Jugador"))', 'yo.rotacion = angulo(yo, raton.posicion)',
  'cuando empieza:\n    yo.rotacion = angulo(yo)', 'Darle un solo sitio: el ángulo va DE uno HASTA otro.');
c('funcion:seno', 'cuando cada fotograma:\n    yo.y = 200 + seno(tiempo.total * 90) * 50', 'yo.y = 200 + seno(tiempo.total * 90) * 50',
  'cuando cada fotograma:\n    yo.y = 200 + seno(tiempo.total) * 50', 'Olvidar que va en GRADOS: seno(tiempo.total) cambia muy despacio. Multiplica el tiempo (por 90, 180...).', 'l');
c('funcion:coseno', 'cuando cada fotograma:\n    yo.x = 400 + coseno(tiempo.total * 90) * 50', 'yo.x = 400 + coseno(tiempo.total * 90) * 50',
  'mostrar(coseno("90"))', 'Pasarle un texto: los grados son un número.');
c('funcion:tangente', 'mostrar(tangente(45))', 'mostrar(tangente(45))',
  'mostrar(tangente(90))', 'Pedir la tangente de 90 grados: es infinita. Evita justo 90 y 270.', 'l');
c('especial:pi', 'variable radio = 10\nmostrar(2 * pi * radio)', 'variable vuelta = 2 * pi * 10',
  'variable pi = 3', 'Crear una variable llamada pi: tapa al número pi de verdad (3.14159...) y las cuentas salen mal.', 'l');

tema(2, 'Choques: tocar cosas', 'Para que dos objetos se toquen, los dos necesitan Colisión (en el editor). Los sólidos chocan; los fantasmas se atraviesan pero avisan con cuando toco.');
c('evento:cuando toco', 'cuando toco Moneda:\n    destruir(otro)', 'cuando toco Moneda:',
  'cuando toco Moneda:\n    destruir(otro)\n# y en el editor, la Moneda no tiene Colision', 'Que no pase nada al tocarse: los DOS objetos necesitan Colisión (en Propiedades, en el editor).', 'l');
c('evento:cuando dejo de tocar', 'cuando dejo de tocar Jugador:\n    mostrar("Adios")', 'cuando dejo de tocar Jugador:',
  'cuando dejo de tocar Jugador\n    mostrar("Adios")', 'Olvidar los dos puntos del final de la línea del evento.');
c('especial:otro', 'cuando toco Jugador:\n    mostrar("Me ha tocado", otro.nombre)', 'destruir(otro)',
  'cuando empieza:\n    destruir(otro)', 'Usar otro fuera de cuando toco: solo existe dentro (es lo que has tocado).');
c('evento:cuando salgo de la pantalla', 'cuando salgo de la pantalla:\n    destruir(yo)', 'cuando salgo de la pantalla:',
  'cuando salga de la pantalla:\n    destruir(yo)', 'Cambiar el verbo: es cuando salgo de la pantalla:.');
c('objeto:tocando', 'cuando cada fotograma:\n    si yo.tocando("Jugador"):\n        yo.color = "rojo"', 'si yo.tocando("Lava"):',
  'cuando cada fotograma:\n    si yo.tocando(Lava):\n        mostrar("quema")', 'Olvidar las comillas: dentro de tocando el nombre va entre comillas.');
c('objeto:solido', 'cuando empieza:\n    yo.solido = falso', 'yo.solido = falso',
  'cuando empieza:\n    yo.solido = "no"', 'Darle un texto: es verdadero o falso.');
c('objeto:fantasma', 'cuando empieza:\n    yo.fantasma = verdadero', 'yo.fantasma = verdadero',
  'cuando empieza:\n    yo.fantasma = 1', 'Darle un número: es verdadero o falso.');
c('especial:casilla', 'cuando toco:\n    si casilla == "agua":\n        yo.gravedad = 0.2', 'si casilla == "agua":',
  'cuando empieza:\n    mostrar(casilla)', 'Usar casilla fuera de cuando toco: solo existe dentro.');

// ═══════════════════════════ NIVEL 3 ═══════════════════════════

tema(3, 'Crear, buscar y destruir objetos', 'Las plantillas son objetos «de molde» (balas, enemigos...): se crean desde el código con crear(). Para encontrar objetos de la escena, buscar().');
c('funcion:crear', 'cuando empieza:\n    variable bala = crear("Bala", yo.x, yo.y)\n    bala.color = "amarillo"', 'crear("Bala", yo.x, yo.y)',
  'cuando empieza:\n    crear(Bala, 0, 0)', 'Olvidar las comillas del nombre de la plantilla.');
c('funcion:destruir', 'cuando empieza:\n    destruir(buscar("Moneda"))', 'destruir(otro)',
  'cuando empieza:\n    destruir("Moneda")', 'Pasarle el nombre: destruir necesita el objeto (otro, yo, o buscar("Moneda")).');
c('objeto:destruir', 'cuando pasen 1 segundos:\n    yo.destruir()', 'yo.destruir()',
  'cuando empieza:\n    yo.destruir', 'Olvidar los paréntesis.');
c('objeto:destruido', 'cuando empieza:\n    variable m = buscar("Moneda")\n    destruir(m)\n    esperar()\n    si m.destruido:\n        mostrar("Ya no esta")', 'si jugador.destruido:',
  'cuando empieza:\n    yo.destruido = verdadero', 'Darle un valor: solo se lee. Para destruir, destruir(yo).');
c('funcion:buscar', 'cuando empieza:\n    variable j = buscar("Jugador")\n    si j != nulo:\n        mostrar(j.x)', 'variable j = buscar("Jugador")',
  'cuando empieza:\n    variable j = buscar(Jugador)', 'Olvidar las comillas del nombre.');
c('funcion:buscarTodos', 'cuando empieza:\n    para cada m en buscarTodos("Moneda"):\n        m.color = "amarillo"', 'buscarTodos("Enemigo")',
  'cuando empieza:\n    buscarTodos("Moneda").color = "amarillo"', 'Cambiar la lista entera: buscarTodos da una LISTA; hay que recorrerla con para cada.');
c('funcion:contar', 'cuando empieza:\n    mostrar(contar("Moneda"))', 'si contar("Enemigo") == 0:',
  'cuando empieza:\n    mostrar(contar(Moneda))', 'Olvidar las comillas del nombre.');
c('funcion:clonar', 'cuando empieza:\n    variable copia = clonar(buscar("Moneda"))\n    copia.x += 50', 'variable copia = clonar(jugador)',
  'cuando empieza:\n    clonar(yo)', 'Clonarse a sí mismo en cuando empieza: la copia también tiene ese cuando empieza, así que vuelve a clonarse... sin fin. Chispa lo corta con un error. Clona desde otro objeto, o en un evento que no se repita solo.');
c('objeto:clonar', 'cuando empieza:\n    variable copia = buscar("Moneda").clonar()\n    copia.x += 50', 'variable copia = jugador.clonar()',
  'cuando cada fotograma:\n    yo.clonar()', 'Clonar en cada fotograma: cada copia también clona... y en un momento hay miles. Chispa lo para al llegar a 10.000 objetos. Clona una vez, o cada cierto tiempo.', 'l');
c('objeto:ponerEtiqueta', 'cuando empieza:\n    yo.ponerEtiqueta("peligro")\n    mostrar(yo.etiquetas)', 'yo.ponerEtiqueta("peligro")',
  'cuando empieza:\n    yo.ponerEtiqueta(peligro)', 'Olvidar las comillas de la etiqueta.');
c('objeto:quitarEtiqueta', 'cuando empieza:\n    yo.ponerEtiqueta("peligro")\n    yo.quitarEtiqueta("peligro")', 'yo.quitarEtiqueta("peligro")',
  'cuando empieza:\n    yo.quitarEtiqueta()', 'Olvidar cuál.');
c('objeto:tieneEtiqueta', 'cuando empieza:\n    yo.ponerEtiqueta("malo")\n    si yo.tieneEtiqueta("malo"):\n        mostrar("Soy malo")', 'si otro.tieneEtiqueta("peligro"):',
  'cuando empieza:\n    si yo.tieneEtiqueta:\n        mostrar("si")', 'Olvidar los paréntesis y la etiqueta: sin () no se pregunta nada, y el si se cumple siempre. Es yo.tieneEtiqueta("malo").', 'l');
c('objeto:etiquetas', 'cuando empieza:\n    yo.ponerEtiqueta("malo")\n    mostrar(yo.etiquetas)', 'mostrar(yo.etiquetas)',
  'cuando empieza:\n    yo.etiquetas = ["malo"]', 'Darle un valor: se leen, pero se ponen con ponerEtiqueta.');
c('funcion:buscarConEtiqueta', 'cuando empieza:\n    yo.ponerEtiqueta("malo")\n    para cada e en buscarConEtiqueta("malo"):\n        e.color = "rojo"', 'buscarConEtiqueta("malo")',
  'cuando empieza:\n    buscarConEtiqueta("malo").color = "rojo"', 'Cambiar la lista entera: da una lista; recórrela con para cada.');
c('objeto:cercanos', 'cuando empieza:\n    para cada e en yo.cercanos(1000):\n        mostrar(e.nombre)', 'yo.cercanos(150, "Enemigo")',
  'cuando empieza:\n    mostrar(yo.cercanos())', 'Olvidar el radio: cercanos necesita a cuántos píxeles como mucho.');
c('objeto:masCercano', 'cuando empieza:\n    variable m = yo.masCercano("Moneda")\n    si m != nulo:\n        mostrar(m.nombre)', 'variable m = yo.masCercano("Moneda")',
  'cuando empieza:\n    mostrar(yo.masCercano("Dragon").nombre)', 'No comprobar si es nulo: si no hay ninguno, da nulo y no tiene nombre.');
c('escena:objetos', 'cuando empieza:\n    mostrar(escena.objetos.longitud)', 'mostrar(escena.objetos.longitud)',
  'cuando empieza:\n    mostrar(escena.objetos())', 'Ponerle paréntesis: es un dato (una lista).');

tema(3, 'Física: gravedad, velocidad y saltos', 'Con Física (en el editor), el objeto cae, choca y se puede empujar. La velocidad es un vector (x, y) en píxeles por segundo.');
c('objeto:velocidad', 'cuando empieza:\n    yo.velocidad = vector(200, 0)', 'yo.velocidad.x = 200',
  'cuando empieza:\n    yo.velocidad = 200', 'Darle un solo número: la velocidad es un vector (x, y): vector(200, 0).');
c('objeto:gravedad', 'cuando empieza:\n    yo.gravedad = 0.5', 'yo.gravedad = 0',
  'cuando empieza:\n    yo.gravedad = "luna"', 'Darle un texto: es un número (1 normal, 0 flota).');
c('escena:gravedad', 'cuando empieza:\n    escena.gravedad = 0', 'escena.gravedad = 0',
  'cuando empieza:\n    escena.gravedad = 1', 'Confundirla con yo.gravedad: la de la escena va en píxeles por segundo (1500 es lo normal), así que 1 es casi nada.', 'l');
c('objeto:rozamiento', 'cuando empieza:\n    yo.rozamiento = 0', 'yo.rozamiento = 0',
  'cuando empieza:\n    yo.rozamiento = "hielo"', 'Darle un texto: va de 0 (hielo) a 1.');
c('objeto:rebote', 'cuando empieza:\n    yo.rebote = 0.8', 'yo.rebote = 0.8',
  'cuando empieza:\n    yo.rebote = 5', 'Poner más de 1: cada bote sube más que el anterior y sale disparado.', 'l');
c('objeto:masa', 'cuando empieza:\n    yo.masa = 10', 'yo.masa = 10',
  'cuando empieza:\n    yo.masa = "mucha"', 'Darle un texto: la masa es un número.');
c('objeto:estatico', 'cuando empieza:\n    yo.estatico = verdadero', 'yo.estatico = verdadero',
  'cuando empieza:\n    yo.estatico = "si"', 'Darle un texto: es verdadero o falso.');
c('objeto:saltar', 'cuando se pulsa "espacio":\n    yo.saltar(600)', 'yo.saltar(600)',
  'cuando se pulsa "espacio":\n    yo.saltar', 'Olvidar los paréntesis (y la fuerza): yo.saltar(600).');
c('objeto:enSuelo', 'cuando cada fotograma:\n    si yo.enSuelo:\n        yo.color = "verde"', 'si yo.enSuelo:',
  'cuando cada fotograma:\n    si yo.enSuelo():\n        yo.saltar(600)', 'Ponerle paréntesis: es un dato.');
c('objeto:tocaPared', 'cuando cada fotograma:\n    si yo.tocaPared:\n        yo.velocidad.x = -yo.velocidad.x', 'si yo.tocaPared:',
  'cuando empieza:\n    yo.tocaPared = falso', 'Darle un valor: solo se lee (lo calcula la física).');
c('objeto:tocaTecho', 'cuando cada fotograma:\n    si yo.tocaTecho:\n        mostrar("Ay")', 'si yo.tocaTecho:',
  'cuando cada fotograma:\n    si yo.tocatecho():\n        mostrar("ay")', 'Ponerle paréntesis: es un dato.');
c('objeto:empujar', 'cuando empieza:\n    yo.empujar(500, 200)', 'otro.empujar(500, 200)',
  'cuando empieza:\n    yo.empujar("fuerte")', 'Decir la fuerza con palabras: empujar usa números, la fuerza en x y en y: yo.empujar(500, 200).');
c('objeto:moviendo', 'cuando toco Jugador:\n    yo.moviendo = falso', 'buscar("Plataforma").moviendo = falso',
  'cuando empieza:\n    yo.moviendo = "no"', 'Darle un texto: es verdadero o falso (y solo sirve en objetos con Recorrido).');

tema(3, 'Mapas de casillas', 'Un mapa de casillas es una rejilla donde se pintan suelos y paredes. Desde el código se puede leer y cambiar cada casilla (columna, fila).');
c('objeto:casilla', 'cuando empieza:\n    variable mapa = buscar("Mapa")\n    mostrar(mapa.casilla(0, 0))', 'mostrar(mapa.casilla(3, 0))',
  'cuando empieza:\n    mostrar(yo.casilla(0, 0))', 'Usarlo en un objeto que no es un mapa: solo los mapas de casillas tienen casillas.');
c('objeto:ponerCasilla', 'cuando empieza:\n    buscar("Mapa").ponerCasilla(3, 0, "suelo")', 'mapa.ponerCasilla(3, 0, "suelo")',
  'cuando empieza:\n    buscar("Mapa").ponerCasilla(3, 0, "suleo")', 'Escribir mal el tipo de casilla: tiene que ser uno de los tipos del mapa.');
c('objeto:quitarCasilla', 'cuando empieza:\n    buscar("Mapa").quitarCasilla(0, 0)', 'mapa.quitarCasilla(3, 0)',
  'cuando empieza:\n    buscar("Mapa").quitarCasilla(0)', 'Olvidar la fila: hacen falta columna y fila.');
c('objeto:casillaEn', 'cuando empieza:\n    mostrar(buscar("Mapa").casillaEn(yo.x, yo.y - 30))', 'si mapa.casillaEn(yo.x, yo.y - 30) == "hielo":',
  'cuando empieza:\n    mostrar(buscar("Mapa").casillaEn(yo))', 'Pasarle el objeto: casillaEn necesita un punto (x, y).');
c('objeto:columnaEn', 'cuando empieza:\n    mostrar(buscar("Mapa").columnaEn(yo.x))', 'variable c = mapa.columnaEn(yo.x)',
  'cuando empieza:\n    mostrar(buscar("Mapa").columnaEn())', 'Olvidar la x.');
c('objeto:filaEn', 'cuando empieza:\n    mostrar(buscar("Mapa").filaEn(yo.y))', 'variable f = mapa.filaEn(yo.y)',
  'cuando empieza:\n    mostrar(buscar("Mapa").filaEn())', 'Olvidar la y.');
c('objeto:centroDeCasilla', 'cuando empieza:\n    yo.posicion = buscar("Mapa").centroDeCasilla(2, 5)', 'yo.posicion = mapa.centroDeCasilla(2, 5)',
  'cuando empieza:\n    yo.posicion = buscar("Mapa").centroDeCasilla(2)', 'Olvidar la fila.');

tema(3, 'La cámara', 'La cámara decide qué parte del mundo se ve. Puede seguir al jugador, acercarse o temblar.');
c('escena:camara', 'cuando empieza:\n    escena.camara.seguir(yo)', 'escena.camara.seguir(yo)',
  'cuando empieza:\n    camara.seguir(yo)', 'Olvidar escena.: la cámara está dentro de la escena, escena.camara.');
c('escena.camara:seguir', 'cuando empieza:\n    escena.camara.seguir(yo)', 'escena.camara.seguir(yo)',
  'cuando empieza:\n    escena.camara.seguir("Jugador")', 'Pasarle el nombre: seguir necesita el objeto (yo, o buscar("Jugador")).');
c('escena.camara:limites', 'cuando empieza:\n    escena.camara.limites(0, 0, 2000, 1000)', 'escena.camara.limites(mapa)',
  'cuando empieza:\n    escena.camara.limites(0, 0, 2000)', 'Dar tres números: son cuatro (izquierda, abajo, derecha, arriba), o un mapa.');
c('escena.camara:temblar', 'cuando toco Enemigo:\n    escena.camara.temblar(10, 0.3)', 'escena.camara.temblar(10, 0.3)',
  'cuando empieza:\n    escena.camara.temblar("fuerte")', 'Darle un texto: la intensidad es un número de píxeles.');
c('escena.camara:zoom', 'cuando empieza:\n    escena.camara.zoom = 2', 'escena.camara.zoom = 2',
  'cuando empieza:\n    escena.camara.zoom = 0', 'Poner el zoom a 0: no se vería nada, así que Chispa no lo deja. 1 es lo normal, 0.5 más lejos, 2 más cerca.');
c('escena.camara:x', 'cuando empieza:\n    escena.camara.x = 480', 'escena.camara.x = 480',
  'cuando empieza:\n    escena.camara.x = "centro"', 'Darle un texto: es un número.');
c('escena.camara:y', 'cuando empieza:\n    escena.camara.y = 270', 'escena.camara.y = 270',
  'cuando empieza:\n    escena.camara.y()', 'Usarlo como acción: es un dato.');
c('escena.camara:suavizado', 'cuando empieza:\n    escena.camara.suavizado = 3', 'escena.camara.suavizado = 3',
  'cuando empieza:\n    escena.camara.suavizado = "mucho"', 'Darle un texto: es un número (8 por defecto).');

tema(3, 'Escenas', 'Un juego puede tener varias escenas: el menú, cada nivel, la pantalla de fin... Los datos de juego (juego.puntos) se conservan al cambiar.');
c('escena:nombre', 'cuando empieza:\n    mostrar(escena.nombre)', 'mostrar(escena.nombre)',
  'cuando empieza:\n    escena.nombre = "Nivel2"', 'Cambiar la escena dándole otro nombre: solo se lee. Para cambiar de escena, escena.cambiar("Nivel2").');
c('escena:cambiar', 'cuando toco Meta:\n    escena.cambiar("Nivel2", 1)', 'escena.cambiar("Nivel2")',
  'cuando empieza:\n    escena.cambiar("Nivel 2")', 'Escribir mal el nombre de la escena: tiene que ser como la llamaste en el editor. Chispa sugiere la parecida.');
c('escena:reiniciar', 'cuando toco Enemigo:\n    escena.reiniciar()', 'escena.reiniciar()',
  'cuando toco Enemigo:\n    escena.reiniciar', 'Olvidar los paréntesis.');
c('escena:colorFondo', 'cuando empieza:\n    escena.colorFondo = "azul"', 'escena.colorFondo = "azul"',
  'cuando empieza:\n    escena.colorFondo = azul', 'Olvidar las comillas del color.');

tema(3, 'Interfaz y dibujo en la pantalla', 'La interfaz (vida, puntos, botones) se queda pegada a la pantalla aunque la cámara se mueva. También se puede dibujar directamente (líneas, círculos, textos) en cada fotograma.');
c('objeto:fijo', 'cuando empieza:\n    yo.fijo = verdadero', 'yo.fijo = verdadero',
  'cuando empieza:\n    yo.fijo = "pantalla"', 'Darle un texto: es verdadero o falso.');
c('pantalla:ancho', 'cuando empieza:\n    yo.x = pantalla.ancho / 2', 'yo.x = pantalla.ancho / 2',
  'cuando empieza:\n    pantalla.ancho = 1280', 'Darle un valor: solo se lee. El tamaño se cambia en el editor (Propiedades del juego).');
c('pantalla:alto', 'cuando empieza:\n    yo.y = pantalla.alto - 30', 'yo.y = pantalla.alto - 30',
  'cuando empieza:\n    yo.y = pantalla.altura', 'Llamarlo altura: es pantalla.alto.');
c('pantalla:completa', 'cuando se pulsa "f":\n    pantalla.completa = no pantalla.completa', 'pantalla.completa = verdadero',
  'cuando empieza:\n    pantalla.completa = verdadero', 'Ponerla al empezar: el navegador solo deja justo después de pulsar una tecla o hacer clic. Ponla en cuando se pulsa.', 'l');
c('dibujar:linea', 'cuando cada fotograma:\n    dibujar.linea(yo.x, yo.y, raton.x, raton.y, "rojo")', 'dibujar.linea(0, 0, 100, 100, "rojo")',
  'cuando empieza:\n    dibujar.linea(0, 0, 100, 100, "rojo")', 'Dibujar solo una vez: lo dibujado dura UN fotograma. Va en cuando cada fotograma.', 'l');
c('dibujar:circulo', 'cuando cada fotograma:\n    dibujar.circulo(yo.x, yo.y, 100, "verde")', 'dibujar.circulo(yo.x, yo.y, 50, "verde")',
  'cuando cada fotograma:\n    dibujar.circulo(yo.x, yo.y)', 'Olvidar el radio.');
c('dibujar:rectangulo', 'cuando cada fotograma:\n    dibujar.rectangulo(yo.x, yo.y, 64, 64, "azul")', 'dibujar.rectangulo(yo.x, yo.y, 64, 64, "azul")',
  'cuando cada fotograma:\n    dibujar.rectangulo(yo.x, yo.y, 64)', 'Olvidar el alto: van x, y, ancho y alto.');
c('dibujar:texto', 'cuando cada fotograma:\n    dibujar.texto("Hola", yo.x, yo.y + 40, "blanco")', 'dibujar.texto("Hola", yo.x, yo.y + 40)',
  'cuando cada fotograma:\n    dibujar.texto(yo.x, yo.y, "Hola")', 'Poner el texto al final: primero va el texto, luego x e y.');
c('dibujar:arco', 'cuando cada fotograma:\n    dibujar.arco(yo.x, yo.y, 30, 90, 180, "blanco", verdadero)', 'dibujar.arco(yo.x, yo.y, 30, 90, 180, "blanco", verdadero)',
  'cuando cada fotograma:\n    dibujar.arco(yo.x, yo.y, 30)', 'Olvidar de qué ángulo a qué ángulo.');
c('dibujar:enPantalla', 'cuando cada fotograma:\n    dibujar.enPantalla.rectangulo(120, 500, 200, 16, "rojo", verdadero)', 'dibujar.enPantalla.rectangulo(120, 500, 200, 16, "rojo", verdadero)',
  'cuando cada fotograma:\n    dibujar.enpantalla()', 'Usarlo como acción: es un grupo de acciones; se escribe dibujar.enPantalla.rectangulo(...).');
c('dibujar.enPantalla:linea', 'cuando cada fotograma:\n    dibujar.enPantalla.linea(0, 270, 960, 270, "blanco")', 'dibujar.enPantalla.linea(0, 270, 960, 270, "blanco")',
  'cuando cada fotograma:\n    dibujar.enPantalla.linea(0, 270)', 'Olvidar el punto final.');
c('dibujar.enPantalla:circulo', 'cuando cada fotograma:\n    dibujar.enPantalla.circulo(60, 60, 30, "blanco", verdadero)', 'dibujar.enPantalla.circulo(60, 60, 30, "blanco")',
  'cuando cada fotograma:\n    dibujar.enPantalla.circulo(60, 60)', 'Olvidar el radio.');
c('dibujar.enPantalla:rectangulo', 'cuando cada fotograma:\n    dibujar.enPantalla.rectangulo(110, 500, 200, 16, "rojo", verdadero)', 'dibujar.enPantalla.rectangulo(110, 500, 200, 16, "rojo", verdadero)',
  'cuando cada fotograma:\n    dibujar.enPantalla.rectangulo(0, 0, 200, 16, "rojo", verdadero)', 'Olvidar que la posición es el CENTRO: con (0, 0) se ve solo un cuarto del rectángulo, en la esquina.', 'l');
c('dibujar.enPantalla:texto', 'cuando cada fotograma:\n    dibujar.enPantalla.texto("Vida", 20, 500, "blanco")', 'dibujar.enPantalla.texto("Vida", 20, 500, "blanco")',
  'cuando cada fotograma:\n    dibujar.enPantalla.texto(20, 500, "Vida")', 'Poner el texto al final: primero el texto, luego x e y.');
c('dibujar.enPantalla:arco', 'cuando cada fotograma:\n    dibujar.enPantalla.arco(60, 60, 30, 90, 270, "#00000099", verdadero)', 'dibujar.enPantalla.arco(60, 60, 30, 90, 270, "gris", verdadero)',
  'cuando cada fotograma:\n    dibujar.enPantalla.arco(60, 60)', 'Olvidar el radio y los ángulos.');
c('objeto:ponerDelante', 'cuando hago clic encima:\n    yo.ponerDelante()', 'yo.ponerDelante()',
  'cuando empieza:\n    yo.ponerDelante', 'Olvidar los paréntesis.');
c('objeto:ponerDetras', 'cuando empieza:\n    yo.ponerDetras()', 'yo.ponerDetras()',
  'cuando empieza:\n    yo.ponerDetras', 'Olvidar los paréntesis.');
c('objeto:ocultar', 'cuando empieza:\n    yo.ocultar()', 'yo.ocultar()',
  'cuando empieza:\n    yo.ocultar()\n    # y pensar que ya no choca', 'Pensar que un objeto oculto ya no choca: sigue ahí. Para quitarlo de verdad, destruir(yo); para atravesarlo, yo.solido = falso.', 'l');
c('objeto:aparecer', 'cuando empieza:\n    yo.ocultar()\n    esperar(1)\n    yo.aparecer()', 'yo.aparecer()',
  'cuando empieza:\n    yo.mostrar()', 'Usar yo.mostrar(): mostrar escribe en la consola; para volver a verse, yo.aparecer().');
c('objeto:parpadear', 'cuando toco Enemigo:\n    yo.parpadear(1)', 'yo.parpadear(1)',
  'cuando empieza:\n    yo.parpadear("rapido")', 'Darle un texto: son segundos (un número).');
c('objeto:pegarA', 'cuando empieza:\n    variable b = crear("Bala", yo.x, yo.y)\n    b.pegarA(yo)', 'otro.pegarA(yo)',
  'cuando empieza:\n    yo.pegarA("Jugador")', 'Pasarle el nombre: pegarA necesita el objeto (buscar("Jugador")).');
c('objeto:soltar', 'cuando empieza:\n    yo.pegarA(buscar("Jugador"))\n    yo.soltar()', 'yo.soltar()',
  'cuando empieza:\n    yo.soltar', 'Olvidar los paréntesis.');
c('objeto:padre', 'cuando empieza:\n    yo.pegarA(buscar("Jugador"))\n    si yo.padre != nulo:\n        mostrar(yo.padre.nombre)', 'si yo.padre != nulo:',
  'cuando empieza:\n    mostrar(yo.padre.nombre)', 'No comprobar si es nulo: si no está pegado a nada, padre es nulo.');
c('objeto:hijos', 'cuando empieza:\n    crear("Bala", 0, 0).pegarA(yo)\n    para cada h en yo.hijos:\n        h.color = "rojo"', 'para cada h en yo.hijos:',
  'cuando empieza:\n    yo.hijos.color = "rojo"', 'Cambiar la lista entera: hijos es una lista; recórrela con para cada.');

tema(3, 'Sonido y música', 'Los sonidos se importan en el editor (Proyecto > Sonidos) y se usan por su nombre. La música suena en bucle.');
c('sonido:reproducir', 'cuando se pulsa "espacio":\n    sonido.reproducir("salto")', 'sonido.reproducir("salto", 0.5)',
  'cuando empieza:\n    sonido.reproducir("slato")', 'Escribir mal el nombre: tiene que ser un sonido del proyecto. Chispa sugiere el parecido.');
c('sonido:bucle', 'cuando empieza:\n    sonido.bucle("motor", 0.4)', 'sonido.bucle("motor", 0.4)',
  'cuando cada fotograma:\n    sonido.reproducir("motor")', 'Reproducir en cada fotograma para que suene siempre: se amontonan 60 sonidos por segundo. Para eso está sonido.bucle.', 'l');
c('sonido:parar', 'cuando empieza:\n    sonido.bucle("motor")\n    esperar(1)\n    sonido.parar("motor")', 'sonido.parar("motor")',
  'cuando empieza:\n    sonido.parar(motor)', 'Olvidar las comillas del nombre.');
c('sonido:sonando', 'cuando empieza:\n    si no sonido.sonando("motor"):\n        sonido.bucle("motor")', 'si sonido.sonando("motor"):',
  'cuando empieza:\n    si sonido.sonando:\n        mostrar("suena")', 'Olvidar los paréntesis y el nombre: sin () no se pregunta nada, y el si se cumple siempre. Es sonido.sonando("motor").', 'l');
c('sonido:pausar', 'cuando se pulsa "p":\n    sonido.pausar()', 'sonido.pausar()',
  'cuando se pulsa "p":\n    sonido.pausar', 'Olvidar los paréntesis.');
c('sonido:seguir', 'cuando se pulsa "c":\n    sonido.seguir()', 'sonido.seguir()',
  'cuando se pulsa "c":\n    sonido.continuar()', 'Llamarlo continuar: es seguir.');
c('sonido:tono', 'cuando se pulsa "espacio":\n    sonido.tono(880, 0.1)', 'sonido.tono(440, 0.2)',
  'cuando empieza:\n    sonido.tono("La")', 'Darle el nombre de la nota: es la frecuencia en números (440 es La).');
c('sonido:volumen', 'cuando empieza:\n    sonido.volumen = 0.5', 'sonido.volumen = 0.5',
  'cuando empieza:\n    sonido.volumen = 50', 'Usar porcentajes: va de 0 a 1.', 'l');
c('musica:reproducir', 'cuando empieza:\n    musica.reproducir("tema", 2)', 'musica.reproducir("tema")',
  'cuando cada fotograma:\n    musica.reproducir("tema")', 'Ponerla en cada fotograma: basta una vez, en cuando empieza; ya suena en bucle.', 'l');
c('musica:parar', 'cuando toco Meta:\n    musica.parar(2)', 'musica.parar(2)',
  'cuando empieza:\n    musica.parar("tema")', 'Darle el nombre: parar no lo necesita (solo hay una música); el número es el fundido.');
c('musica:pausar', 'cuando se pulsa "p":\n    musica.pausar()', 'musica.pausar()',
  'cuando se pulsa "p":\n    musica.pausar', 'Olvidar los paréntesis.');
c('musica:seguir', 'cuando se pulsa "c":\n    musica.seguir()', 'musica.seguir()',
  'cuando se pulsa "c":\n    musica.seguir', 'Olvidar los paréntesis.');
c('musica:volumen', 'cuando empieza:\n    musica.volumen = 0.3', 'musica.volumen = 0.3',
  'cuando empieza:\n    musica.volumen = "bajo"', 'Darle un texto: es un número de 0 a 1.');
c('musica:actual', 'cuando empieza:\n    si musica.actual == nulo:\n        musica.reproducir("tema")', 'si musica.actual == nulo:',
  'cuando empieza:\n    musica.actual = "tema"', 'Darle un valor: solo se lee. Para poner música, musica.reproducir("tema").');

tema(3, 'Tiempo y temporizadores', 'Para que algo pase dentro de un rato o cada cierto tiempo, hay eventos y funciones de tiempo. esperar() para ESE evento sin parar el juego.');
c('evento:cuando cada N segundos', 'cuando cada 2 segundos:\n    crear("Enemigo", 900, 300)', 'cuando cada 2 segundos:',
  'cuando cada 2 segundo:\n    crear("Enemigo", 900, 300)', 'Poner segundo en singular con un 2: con 1 vale segundo, con más, segundos. (Chispa acepta los dos, pero mejor bien escrito.) El error de verdad es olvidar el número.', 'l');
c('evento:cuando pasen N segundos', 'cuando pasen 3 segundos:\n    destruir(yo)', 'cuando pasen 3 segundos:',
  'cuando pasen segundos:\n    destruir(yo)', 'Olvidar el número de segundos.');
c('funcion:esperar', 'cuando empieza:\n    yo.visible = falso\n    esperar(0.5)\n    yo.visible = verdadero', 'esperar(1)',
  'cuando empieza:\n    esperar("1 segundo")', 'Darle un texto: son segundos, un número.');
c('funcion:cronometro', 'cuando empieza:\n    variable crono = cronometro()\n    esperar(0.5)\n    mostrar(crono.segundos)', 'variable crono = cronometro()',
  'cuando empieza:\n    variable crono = cronometro\n    mostrar(crono.segundos)', 'Olvidar los paréntesis: cronometro() crea un cronómetro nuevo.');
c('tiempo:total', 'cuando cada fotograma:\n    yo.texto = "Tiempo: {redondear(tiempo.total)}"', 'mostrar(tiempo.total)',
  'cuando empieza:\n    tiempo.total = 0', 'Darle un valor: solo se lee. Para contar desde ahora, usa un cronometro().');
c('tiempo:escala', 'cuando empieza:\n    tiempo.escala = 0.5', 'tiempo.escala = 0.5',
  'cuando empieza:\n    tiempo.escala = "lento"', 'Darle un texto: es un número (1 normal, 0.5 lento).');
c('tiempo:pausado', 'cuando cada fotograma:\n    si tiempo.pausado:\n        yo.texto = "PAUSA"', 'si tiempo.pausado:',
  'cuando cada fotograma:\n    si tiempo.pausado():\n        mostrar("pausa")', 'Ponerle paréntesis: es un dato.');
c('tiempo:pausar', 'cuando se pulsa "p":\n    si tiempo.pausado:\n        tiempo.seguir()\n    sino:\n        tiempo.pausar()', 'tiempo.pausar()',
  'cuando se pulsa "p":\n    tiempo.pausar', 'Olvidar los paréntesis.');
c('tiempo:seguir', 'cuando se pulsa "c":\n    tiempo.seguir()', 'tiempo.seguir()',
  'cuando se pulsa "c":\n    tiempo.continuar()', 'Llamarlo continuar: es seguir.');
c('tiempo:fps', 'cuando cada fotograma:\n    yo.texto = "FPS: {tiempo.fps}"', 'mostrar(tiempo.fps)',
  'cuando empieza:\n    tiempo.fps = 120', 'Darle un valor: solo se lee (lo decide el ordenador).');

tema(3, 'Animaciones y partículas', 'Las animaciones se hacen en el editor (fotogramas) y se ponen con yo.animar(). Las partículas son efectos ya hechos: explosiones, humo, confeti...');
c('objeto:animar', 'cuando empieza:\n    yo.animar("correr")', 'yo.animar("correr")',
  'cuando empieza:\n    yo.animar("corer")', 'Escribir mal el nombre: tiene que ser una animación del proyecto. Chispa sugiere la parecida.');
c('objeto:animacion', 'cuando cada fotograma:\n    si yo.animacion != "correr":\n        yo.animacion = "correr"', 'yo.animacion = "correr"',
  'cuando empieza:\n    yo.animacion = correr', 'Olvidar las comillas del nombre.');
c('objeto:pararAnimacion', 'cuando empieza:\n    yo.animar("correr")\n    esperar(1)\n    yo.pararAnimacion()', 'yo.pararAnimacion()',
  'cuando empieza:\n    yo.pararAnimacion', 'Olvidar los paréntesis.');
c('evento:cuando termina la animacion', 'cuando empieza:\n    yo.animar("golpe")\n\ncuando termina la animacion:\n    yo.animar("correr")', 'cuando termina la animacion:',
  'cuando termina la animacion:\n    yo.animar("correr")\n# con una animacion que se repite', 'Esperarlo en una animación que se repite: una que se repite no termina nunca. Quita «repetir» en el editor de animaciones.', 'l');
c('funcion:particulas', 'cuando empieza:\n    particulas("explosion", yo.x, yo.y)', 'particulas("explosion", yo.x, yo.y)',
  'cuando empieza:\n    particulas("explocion", yo.x, yo.y)', 'Escribir mal el tipo: hay explosion, humo, chispas, polvo, confeti y estrellas.');

// ═══════════════════════════ NIVEL 4 ═══════════════════════════

tema(4, 'Mensajes entre objetos y datos globales', 'Los objetos pueden avisarse con mensajes (enviar y cuando recibo) y compartir datos en juego, que ven todos los scripts. aLaVez hace dos cosas a la vez.');
c('funcion:enviar', 'cuando toco Jugador:\n    enviar("abrir_puerta")\n\ncuando recibo "abrir_puerta":\n    yo.ocultar()', 'enviar("abrir_puerta")',
  'cuando empieza:\n    enviar(abrir_puerta)', 'Olvidar las comillas del mensaje.');
c('evento:cuando recibo', 'cuando empieza:\n    enviar("hola", 5)\n\ncuando recibo "hola":\n    mostrar("Me llega", dato)', 'cuando recibo "abrir_puerta":',
  'cuando empieza:\n    enviar("abrir_puerta")\n\ncuando recibo "abrir_puera":\n    yo.ocultar()', 'Escribir el mensaje distinto al enviarlo y al recibirlo: no pasa nada (Chispa avisa en amarillo, con el parecido).', 'l');
c('especial:dato', 'cuando empieza:\n    enviar("dano", 10)\n\ncuando recibo "dano":\n    mostrar("Pierdo", dato)', 'yo.vida -= dato',
  'cuando empieza:\n    mostrar(dato)', 'Usar dato fuera de cuando recibo: solo existe dentro.');
c('especial:juego', 'cuando empieza:\n    juego.puntos = 0\n    juego.puntos += 1\n    mostrar(juego.puntos)', 'juego.puntos += 1',
  'cuando empieza:\n    juego.puntos += 1', 'Sumar a un dato que todavía no existe: dale valor antes (juego.puntos = 0), o ponlo en «Datos del juego» del editor.');
c('funcion:aLaVez', 'funcion lluvia(veces):\n    repetir veces veces:\n        crear("Gota", aleatorio(0, 900), 540)\n        esperar(0.2)\n\ncuando empieza:\n    aLaVez(lluvia, 3)\n    mostrar("esto sale enseguida")', 'aLaVez(lluvia, 10)',
  'funcion lluvia(veces):\n    esperar(0.2)\n\ncuando empieza:\n    aLaVez(lluvia(3))', 'Poner paréntesis a la función: se escribe su nombre solo, y los valores detrás: aLaVez(lluvia, 3).');

tema(4, 'Ir a sitios esquivando paredes', 'irHacia busca el camino por el mapa y rodea las paredes. En el editor, la sección Comportamiento (perseguir, huir, seguir) hace lo mismo sin código.');
c('objeto:irHacia', 'cuando empieza:\n    yo.irHacia(buscar("Jugador"), 120)', 'yo.irHacia(jugador, 120)',
  'cuando empieza:\n    yo.irHacia("Jugador", 120)', 'Pasarle el nombre: hay que darle el objeto (buscar("Jugador")) o una posición.');
c('objeto:parar', 'cuando empieza:\n    yo.irHacia(buscar("Jugador"))\n\ncuando toco Jugador:\n    yo.parar()', 'yo.parar()',
  'cuando toco Jugador:\n    yo.parar', 'Olvidar los paréntesis.');
c('objeto:yendo', 'cuando cada fotograma:\n    si no yo.yendo:\n        yo.irHacia(vector(aleatorio(0, 900), aleatorio(0, 500)))', 'si no yo.yendo:',
  'cuando empieza:\n    yo.yendo = falso', 'Darle un valor: solo se lee. Para pararlo, yo.parar().');
c('objeto:atravesar', 'cuando se pulsa "x":\n    yo.atravesar("Enemigo")\n    esperar(0.2)\n    yo.dejarDeAtravesar("Enemigo")', 'yo.atravesar("Enemigo")',
  'cuando se pulsa "x":\n    yo.atravesar(Enemigo)', 'Olvidar las comillas del nombre.');
c('objeto:dejarDeAtravesar', 'cuando empieza:\n    yo.atravesar("Enemigo")\n    esperar(1)\n    yo.dejarDeAtravesar("Enemigo")', 'yo.dejarDeAtravesar("Enemigo")',
  'cuando empieza:\n    yo.dejarDeAtravesar()', 'Olvidar qué: el nombre, tipo o etiqueta.');

tema(4, 'Rayos y diálogos', 'Un rayo es una línea invisible que dice qué toca primero (para saber si un enemigo te ve). Los diálogos enseñan conversaciones con opciones.');
c('funcion:rayo', 'cuando empieza:\n    variable r = rayo(yo, buscar("Jugador"), 400)\n    si r != nulo:\n        mostrar("Veo", r.objeto.nombre)', 'variable r = rayo(yo, jugador, 400)',
  'cuando empieza:\n    mostrar(rayo(yo, 90, 50).objeto.nombre)', 'No comprobar si es nulo: si el rayo no toca nada (aquí, hacia arriba no hay nada), da nulo y nulo no tiene objeto.');
c('funcion:dialogo', 'cuando toco Jugador:\n    variable r = dialogo("Ana", "Me ayudas?", ["Si", "No"])\n    si r == "Si":\n        mostrar("Gracias")', 'dialogo("Ana", "Hola")',
  'cuando empieza:\n    dialogo("Ana", "Me ayudas?", "Si", "No")', 'Poner las opciones sueltas: van en UNA lista, con corchetes: ["Si", "No"].');

tema(4, 'Animar valores', 'animar() cambia algo poco a poco (la posición, el tamaño, el color...). interpolar y ruido sirven para movimientos suaves y naturales.');
c('funcion:animar', 'cuando empieza:\n    animar(yo.tamano, 2, 0.5)\n    animar(yo.color, "rojo", 1, "lineal")', 'animar(yo.x, 300, 1)',
  'cuando empieza:\n    animar(yo.x, 300, 1, "rapido")', 'Inventarse el suavizado: los que hay son suave, lineal, entrada, salida, rebote, elastico y atras.');
c('funcion:interpolar', 'cuando cada fotograma:\n    yo.x = interpolar(yo.x, raton.x, 0.1)', 'yo.x = interpolar(yo.x, raton.x, 0.1)',
  'cuando cada fotograma:\n    yo.x = interpolar(yo.x, raton.x, 10)', 'Poner un número grande: el último va de 0 a 1 (0.1 = un poco cada vez).', 'l');
c('funcion:ruido', 'cuando cada fotograma:\n    yo.y = 200 + ruido(tiempo.total) * 100', 'yo.y = 200 + ruido(tiempo.total) * 100',
  'cuando cada fotograma:\n    yo.y = 200 + ruido(5) * 100', 'Darle siempre el mismo número: el ruido cambia al cambiar x; con un número fijo, siempre da lo mismo.', 'l');

tema(4, 'Efectos: fundidos, sonidos y cámara lenta', 'Pequeños efectos que hacen que un juego se sienta mejor: fundidos a negro, sonidos generados y cámara lenta.');
c('pantalla:oscurecer', 'cuando empieza:\n    pantalla.oscurecer(0.2, "negro", 0.5)', 'pantalla.oscurecer(1)',
  'cuando empieza:\n    pantalla.oscurecer("negro")', 'Poner primero el color: primero van los segundos.');
c('pantalla:aclarar', 'cuando empieza:\n    pantalla.oscurecer(0.5)\n    esperar(0.5)\n    pantalla.aclarar(1)', 'pantalla.aclarar(1)',
  'cuando empieza:\n    pantalla.aclarar("rapido")', 'Darle un texto: son segundos.');
c('sonido:efecto', 'cuando toco Moneda:\n    sonido.efecto("moneda")', 'sonido.efecto("explosion")',
  'cuando empieza:\n    sonido.efecto("explocion")', 'Escribir mal el efecto: los que hay son disparo, laser, explosion, golpe, salto, moneda, poder, dash, escudo, hielo, fuego, rayo, subir, perder, clic, alarma y dano.');
c('tiempo:camaraLenta', 'cuando toco Enemigo:\n    tiempo.camaraLenta(0.3, 1)', 'tiempo.camaraLenta(0.3, 1)',
  'cuando empieza:\n    tiempo.camaraLenta("lento")', 'Decir la velocidad con palabras: es un número (0.3 = muy lento, 0.5 = la mitad), y luego los segundos.');

tema(4, 'Mando, móvil y web', 'Chispa entiende mandos de consola (el mando ya hace de teclado) y sabe si se juega en un móvil.');
c('mando:conectado', 'cuando empieza:\n    si mando.conectado:\n        mostrar("Mando listo")', 'si mando.conectado:',
  'cuando empieza:\n    si mando.conectado():\n        mostrar("listo")', 'Ponerle paréntesis: es un dato.');
c('mando:ejeX', 'cuando cada fotograma:\n    yo.x += mando.ejeX * 300 * delta', 'yo.x += mando.ejeX * 300 * delta',
  'cuando cada fotograma:\n    yo.x += mando.ejex()', 'Ponerle paréntesis: es un dato.');
c('mando:ejeY', 'cuando cada fotograma:\n    yo.y += mando.ejeY * 300 * delta', 'yo.y += mando.ejeY * 300 * delta',
  'cuando cada fotograma:\n    yo.y -= mando.ejeY * 300 * delta', 'Restar para subir: el eje Y del mando es 1 hacia ARRIBA, como la Y de Chispa. Se suma.', 'l');
c('mando:ejeDerechoX', 'cuando cada fotograma:\n    yo.rotacion = angulo(vector(0, 0), vector(mando.ejeDerechoX, mando.ejeDerechoY))', 'mostrar(mando.ejeDerechoX)',
  'cuando cada fotograma:\n    mostrar(mando.ejeDerecho)', 'Olvidar si es X o Y: son ejeDerechoX y ejeDerechoY.');
c('mando:ejeDerechoY', 'cuando cada fotograma:\n    mostrar(mando.ejeDerechoY)', 'mostrar(mando.ejeDerechoY)',
  'cuando cada fotograma:\n    mostrar(mando.ejederechoy())', 'Ponerle paréntesis: es un dato.');
c('mando:pulsado', 'cuando cada fotograma:\n    si mando.pulsado("rt"):\n        yo.x += 400 * delta', 'si mando.pulsado("a"):',
  'cuando cada fotograma:\n    si mando.pulsado("R2"):\n        mostrar("dispara")', 'Usar los nombres de otra consola: son a, b, x, y, lb, rb, lt, rt, select, start...');
c('mando:sePulso', 'cuando cada fotograma:\n    si mando.sePulso("a"):\n        yo.saltar(600)', 'si mando.sePulso("a"):',
  'cuando cada fotograma:\n    si mando.sePulso:\n        mostrar("a")', 'Olvidar los paréntesis y el botón: sin () no se pregunta nada, y el si se cumple siempre. Es mando.sePulso("a").', 'l');
c('mando:vibrar', 'cuando toco Enemigo:\n    mando.vibrar(0.3)', 'mando.vibrar(0.3)',
  'cuando empieza:\n    mando.vibrar("fuerte")', 'Darle un texto: son segundos (y la fuerza, de 0 a 1).');
c('sistema:movil', 'cuando empieza:\n    si sistema.movil:\n        mostrar("Juegas en el movil")', 'si sistema.movil:',
  'cuando empieza:\n    si sistema.movil():\n        mostrar("movil")', 'Ponerle paréntesis: es un dato.');
c('sistema:abrirWeb', 'cuando hago clic encima:\n    sistema.abrirWeb("https://itch.io")', 'sistema.abrirWeb("https://itch.io")',
  'cuando empieza:\n    sistema.abrirWeb("itch.io")', 'Olvidar el https:// del principio.');

tema(4, 'Guardar datos', 'guardar() deja un dato en el navegador aunque se cierre el juego (récords, niveles). Cada juego tiene sus datos: otro juego no los puede leer.');
c('funcion:guardar', 'cuando empieza:\n    guardar("record", 1500)', 'guardar("record", puntos)',
  'cuando empieza:\n    guardar("jugador", yo)', 'Guardar un objeto: solo se guardan números, textos, listas, tablas y vectores. Guarda sus datos (yo.x, yo.vida...).');
c('funcion:cargar', 'cuando empieza:\n    variable record = cargar("record", 0)\n    mostrar("Record:", record)', 'variable record = cargar("record", 0)',
  'cuando empieza:\n    variable record = cargar("recrod", 0)\n    # y no entender por que siempre es 0', 'Escribir la clave distinta al guardar y al cargar: si no la encuentra, da el valor por defecto sin avisar.', 'l');
c('funcion:borrarGuardado', 'cuando se pulsa "r":\n    borrarGuardado("record")', 'borrarGuardado("record")',
  'cuando empieza:\n    borrarGuardado(record)', 'Olvidar las comillas de la clave.');

// ═══════════════════════════ LOS NIVELES ═══════════════════════════

export interface NivelCurso {
  numero: number;
  titulo: string;
  intro: string;
  ejercicios: { enunciado: string; solucion: string }[];
  proyecto: {
    titulo: string;
    queHace: string;
    /** Qué hay que poner en la escena (se explica con palabras en el curso). */
    montaje: string[];
    /** La escena de verdad (para el test, y para que el montaje sea exacto). */
    objetos: DefObjeto[];
    plantillas?: Record<string, Partial<DefObjeto>>;
    gravedad?: number;
    /** archivo.chs → código */
    scripts: Record<string, string>;
  };
}

const figura = (x: number, y: number, extra: Partial<DefObjeto> = {}): Partial<DefObjeto> => ({ x, y, sprite: { ancho: 40, alto: 40 }, colision: {}, ...extra });
const marcador = (texto: string, script: string): DefObjeto => ({ nombre: 'Marcador', x: 120, y: 510, sprite: { forma: 'texto', texto, fijo: true }, script });

export const NIVELES_CURSO: readonly NivelCurso[] = [
  {
    numero: 1,
    titulo: 'Lo básico del lenguaje',
    intro: 'Aquí aprendes a programar: guardar datos, hacer cuentas, decidir, repetir y crear tus propias funciones. Todavía no hay nada que se mueva: todo sale en la **consola** (abajo en el editor) con mostrar(). Para probar cada ejemplo, crea un objeto cualquiera, pulsa **Crear script**, borra lo que hay, pega el ejemplo y pulsa **Ejecutar**: lo que no está dentro de un «cuando» se ejecuta al empezar.',
    ejercicios: [
      { enunciado: '**Cuenta atrás.** Muestra los números del 10 al 1 y después «Despegue».', solucion: 'para cada n en rango(10, 1):\n    mostrar(n)\nmostrar("Despegue")' },
      { enunciado: '**Pares e impares.** Haz una función esPar(n) que devuelva verdadero si n es par (pista: el resto de dividir entre 2 es 0, n % 2 == 0). Úsala para decir, del 1 al 6, si cada número es par o impar.', solucion: 'funcion esPar(n):\n    devolver n % 2 == 0\n\ncuando empieza:\n    para cada n en rango(1, 6):\n        si esPar(n):\n            mostrar(n, "es par")\n        sino:\n            mostrar(n, "es impar")' },
      { enunciado: '**La lista de la compra.** Empieza con una lista con "pan" y "leche", añade "huevos", ordénala y muestra cuántas cosas hay y cuáles, separadas por comas.', solucion: 'variable compra = ["pan", "leche"]\ncompra.añadir("huevos")\ncompra.ordenar()\nmostrar("Tengo que comprar", compra.longitud, "cosas:", compra.unir(", "))' },
    ],
    proyecto: {
      titulo: 'La tienda de pociones',
      queHace: 'Tienes 20 monedas y una tabla con los precios. La función comprar() mira si la poción existe y si te llega el dinero, la mete en la mochila y te dice cuánto te queda. Junta variables, tablas, listas, si/sino, bucles y funciones.',
      montaje: ['Un objeto cualquiera llamado **Tienda** con el script **tienda.chs**.'],
      objetos: [{ nombre: 'Tienda', ...figura(200, 200), script: 'tienda.chs' }],
      scripts: {
        'tienda.chs': [
          'variable dinero = 20',
          'variable mochila = []',
          'variable precios = {vida: 5, fuerza: 8, rapidez: 12}',
          '',
          'funcion comprar(pocion):',
          '    variable existe = pocion en precios',
          '    si no existe:',
          '        mostrar("No vendemos " + pocion)',
          '        devolver falso',
          '    variable precio = precios[pocion]',
          '    si precio > dinero:',
          '        mostrar("No te llega para " + pocion)',
          '        devolver falso',
          '    dinero -= precio',
          '    mochila.añadir(pocion)',
          '    mostrar("Compras " + pocion + ". Te quedan {dinero} monedas")',
          '    devolver verdadero',
          '',
          'cuando empieza:',
          '    para cada p en ["vida", "fuerza", "dragon", "rapidez"]:',
          '        comprar(p)',
          '    mostrar("En la mochila: " + mochila.unir(", "))',
          '    si mochila.contiene("vida"):',
          '        mostrar("Llevas una pocion de vida")',
        ].join('\n'),
      },
    },
  },
  {
    numero: 2,
    titulo: 'Objetos y eventos',
    intro: 'Ahora el código da vida a los objetos de la escena. Cada objeto tiene su **script**, y dentro van los **eventos**: «cuando empieza», «cuando cada fotograma», «cuando toco Moneda»... En los ejemplos, el script es de un objeto cualquiera (con Colisión) y en la escena hay también un **Jugador**, una **Moneda**, un **Enemigo** y una **Meta** (objetos con esos nombres y con Colisión).',
    ejercicios: [
      { enunciado: '**Ir y volver.** Haz que el objeto se mueva a la derecha a 150 píxeles por segundo y, al pasar de x = 800, vuelva hacia la izquierda; al pasar de x = 100, otra vez a la derecha. (Pista: una variable direccion que vale 1 o -1.)', solucion: 'variable direccion = 1\n\ncuando cada fotograma:\n    yo.x += 150 * direccion * delta\n    si yo.x > 800:\n        direccion = -1\n    si yo.x < 100:\n        direccion = 1' },
      { enunciado: '**Cambia de color.** Cada vez que pulses espacio, el objeto se pone de un color al azar entre rojo, verde, azul y amarillo.', solucion: 'cuando se pulsa "espacio":\n    yo.color = elegir(["rojo", "verde", "azul", "amarillo"])' },
      { enunciado: '**Vigila el ratón.** El objeto mira siempre hacia el ratón, y cuando toca la Moneda escribe «Tocado» en la consola.', solucion: 'cuando cada fotograma:\n    yo.mirarA(raton.posicion)\n\ncuando toco Moneda:\n    mostrar("Tocado")' },
    ],
    proyecto: {
      titulo: 'Atrapa la moneda',
      queHace: 'Mueves al jugador con las flechas. Cada vez que toca la moneda, sumas un punto y la moneda salta a otro sitio al azar. El marcador se actualiza solo. Junta eventos, teclado, moverse, choques y datos de juego.',
      montaje: [
        'La escena con **gravedad 0** (sin nada seleccionado, en Propiedades > Escena), para moverse en las cuatro direcciones.',
        'Un **Jugador** (un cuadrado) con Colisión y el script **jugador.chs**.',
        'Una **Moneda** (un círculo amarillo) con Colisión, sin marcar «sólido», y el script **moneda.chs**.',
        'Un **Texto** llamado **Marcador** con el script **marcador.chs**.',
      ],
      gravedad: 0,
      objetos: [
        { nombre: 'Jugador', ...figura(200, 270), script: 'jugador.chs' },
        { nombre: 'Moneda', ...figura(600, 270, { colision: { solido: false }, sprite: { forma: 'circulo', color: 'amarillo', ancho: 30, alto: 30 } }), script: 'moneda.chs' },
        marcador('Puntos: 0', 'marcador.chs'),
      ],
      scripts: {
        'jugador.chs': 'cuando cada fotograma:\n    yo.moverConFlechas(300)\n    yo.x = limitar(yo.x, 0, pantalla.ancho)\n    yo.y = limitar(yo.y, 0, pantalla.alto)\n\ncuando toco Moneda:\n    juego.puntos += 1\n    otro.x = aleatorio(50, pantalla.ancho - 50)\n    otro.y = aleatorio(50, pantalla.alto - 50)',
        'moneda.chs': 'cuando cada fotograma:\n    yo.rotar(90 * delta)',
        'marcador.chs': 'cuando empieza:\n    juego.puntos = 0\n\ncuando cada fotograma:\n    yo.texto = "Puntos: {juego.puntos}"',
      },
    },
  },
  {
    numero: 3,
    titulo: 'Hacer juegos',
    intro: 'Con lo que ya sabes, faltan las piezas de un juego de verdad: crear y destruir objetos, física, cámara, escenas, interfaz, sonido, tiempo, animaciones y efectos. En los ejemplos hay, además de lo del nivel 2, una **Plataforma** con Recorrido (que se mueve sola), un **mapa de casillas** llamado **Mapa** (con los tipos suelo, agua y hielo), las **plantillas** Bala (con Física y gravedad 0), Enemigo, Gota, Premio y Espada, las **escenas** Nivel2 y Fin, los **sonidos** salto, motor, tema y disparo, y las **animaciones** correr (que se repite) y golpe (que no).',
    ejercicios: [
      { enunciado: '**Disparos.** Cada medio segundo, crea una Bala donde está el objeto y dale velocidad hacia la derecha. (Para que no se acumulen, en el editor ponle a la plantilla Bala un script con «cuando salgo de la pantalla: destruir(yo)».)', solucion: 'cuando cada 0.5 segundos:\n    variable b = crear("Bala", yo.x, yo.y)\n    b.velocidad = vector(500, 0)' },
      { enunciado: '**Cuenta atrás.** El objeto enseña «Tiempo: 10» y cada segundo baja uno. Al llegar a 0, cambia a la escena Fin.', solucion: 'variable quedan = 10\n\ncuando empieza:\n    yo.texto = "Tiempo: {quedan}"\n\ncuando cada 1 segundo:\n    quedan -= 1\n    si quedan <= 0:\n        escena.cambiar("Fin")' },
      { enunciado: '**Un buen golpe.** Al tocar un Enemigo: partículas de explosión, el efecto de sonido «explosion», la cámara tiembla y el objeto parpadea.', solucion: 'cuando toco Enemigo:\n    particulas("explosion", yo.x, yo.y)\n    sonido.efecto("explosion")\n    escena.camara.temblar(10, 0.3)\n    yo.parpadear(1)' },      { enunciado: '**Barra de vida.** En la escena hay una barra llamada Barra (Añadir > Interfaz > Barra). Cada vez que el objeto toque un Enemigo, la barra baja 25; cuando llegue a 0, cambia a la escena Fin.', solucion: 'cuando toco Enemigo:\n    variable barra = buscar("Barra")\n    barra.valor -= 25\n    si barra.valor <= 0:\n        escena.cambiar("Fin")' },
      { enunciado: '**La linterna.** Al empezar, la escena se queda casi a oscuras y el objeto lleva una luz naranja de 250 de radio. Con la tecla L, la luz se apaga y se enciende.', solucion: 'cuando empieza:\n    escena.oscuridad = 0.9\n    yo.luz = verdadero\n    yo.radioLuz = 250\n    yo.colorLuz = "naranja"\n\ncuando se pulsa "l":\n    yo.luz = no yo.luz' },
      { enunciado: '**Fiesta.** Cada segundo, confeti en un sitio al azar de la pantalla, un destello blanco de pantalla muy corto y el objeto brilla con un resplandor de un color al azar.', solucion: 'cuando cada 1 segundo:\n    efecto.confeti(vector(aleatorio(100, 860), aleatorio(100, 440)))\n    pantalla.flash("blanco", 0.1)\n    yo.resplandor = elegir(["cian", "rosa", "amarillo"])' },
    ],
    proyecto: {
      titulo: 'Esquiva los meteoritos',
      queHace: 'Caen meteoritos cada segundo. Te mueves con las flechas; si uno te da, explota, suena, la cámara tiembla y pierdes una vida. Con 0 vidas, la pantalla se oscurece y pasa a la escena Fin. Junta crear/destruir, física, escenas, interfaz, sonido, tiempo y partículas.',
      montaje: [
        'La escena con **gravedad 0**, y otra escena llamada **Fin**.',
        'Un **Jugador** con Colisión, Física y el script **jugador.chs**.',
        'Un **Objeto vacío** llamado **Generador** con el script **generador.chs**.',
        'Una **plantilla Meteorito** (un círculo) con Colisión, Física y el script **meteorito.chs**.',
        'Un **Texto** llamado **Marcador** con el script **marcador.chs**.',
      ],
      gravedad: 0,
      plantillas: { Meteorito: { sprite: { forma: 'circulo', ancho: 36, alto: 36 }, colision: {}, fisica: {}, script: 'meteorito.chs' } },
      objetos: [
        { nombre: 'Jugador', ...figura(480, 60, { fisica: {} }), script: 'jugador.chs' },
        { nombre: 'Generador', x: 0, y: 0, script: 'generador.chs' },
        marcador('Vidas: 3', 'marcador.chs'),
      ],
      scripts: {
        'jugador.chs': 'cuando cada fotograma:\n    yo.moverConFlechas(350)\n\ncuando toco Meteorito:\n    destruir(otro)\n    juego.vidas -= 1\n    particulas("explosion", yo.x, yo.y)\n    sonido.efecto("golpe")\n    escena.camara.temblar(8, 0.3)\n    yo.parpadear(1)\n    si juego.vidas <= 0:\n        pantalla.oscurecer(1)\n        esperar(1)\n        escena.cambiar("Fin")',
        'generador.chs': 'cuando cada 1 segundo:\n    variable m = crear("Meteorito", aleatorio(40, pantalla.ancho - 40), pantalla.alto - 20)\n    m.velocidad = vector(0, -aleatorio(150, 300))',
        'meteorito.chs': 'cuando empieza:\n    yo.color = elegir(["gris", "marron", "naranja"])\n\ncuando salgo de la pantalla:\n    destruir(yo)',
        'marcador.chs': 'cuando empieza:\n    juego.vidas = 3\n\ncuando cada fotograma:\n    yo.texto = "Vidas: {juego.vidas}   Tiempo: {redondear(tiempo.total)}"',
      },
    },
  },
  {
    numero: 4,
    titulo: 'Avanzado',
    intro: 'Lo que hace que un juego parezca de verdad: objetos que se avisan entre ellos, personajes que hablan, enemigos que te buscan rodeando las paredes, efectos, mando y récords que se guardan. Y cómo encontrar los fallos con el depurador.',
    ejercicios: [
      { enunciado: '**Mensajes con dato.** Al empezar, envía el mensaje «puntos» dos veces, con 10 y con 5. Al recibirlo, suma el dato a juego.total y enséñalo.', solucion: 'cuando empieza:\n    juego.total = 0\n    enviar("puntos", 10)\n    enviar("puntos", 5)\n\ncuando recibo "puntos":\n    juego.total += dato\n    mostrar("Total:", juego.total)' },
      { enunciado: '**El récord.** Con unos puntos de 120, carga el récord guardado (0 si no hay). Si lo has superado, guárdalo y dilo; si no, di cuál sigue siendo el récord.', solucion: 'cuando empieza:\n    variable puntos = 120\n    variable record = cargar("record", 0)\n    si puntos > record:\n        guardar("record", puntos)\n        mostrar("Nuevo record:", puntos)\n    sino:\n        mostrar("El record sigue siendo", record)' },
      { enunciado: '**El vigilante.** Cada medio segundo, lanza un rayo hacia el Jugador. Si lo primero que toca es el Jugador (nada lo tapa), ve hacia él con irHacia.', solucion: 'cuando cada 0.5 segundos:\n    variable jugador = buscar("Jugador")\n    si jugador != nulo:\n        variable r = rayo(yo, jugador, 500)\n        si r != nulo:\n            si r.objeto == jugador:\n                yo.irHacia(jugador, 150)' },
      { enunciado: '**Para dos.** El objeto lo maneja el jugador 2 (con las flechas) a 250 de rapidez. Cada vez que el jugador 2 pulse su botón «a» (Intro), el objeto cambia a un color al azar.', solucion: 'cuando cada fotograma:\n    yo.moverConJugador(2, 250)\n    si controles(2).sePulso("a"):\n        yo.color = elegir(["rojo", "verde", "azul", "amarillo"])' },
      { enunciado: '**El péndulo.** Al empezar, cuelga el objeto con una cuerda de 150 de un punto que está 150 más arriba y 100 a la derecha. Con espacio, la cuerda se suelta.', solucion: 'cuando empieza:\n    junta.cuerda(yo, vector(yo.x + 100, yo.y + 150), 150)\n\ncuando se pulsa "espacio":\n    junta.quitar(yo)' },
      { enunciado: '**La tabla de los mejores.** Con unos puntos de 120: si entran en la tabla de puntuaciones, apúntalos con el nombre «Ana». Después enseña en la consola toda la tabla, cada línea con su nombre y sus puntos.', solucion: 'cuando empieza:\n    variable puntos = 120\n    si puntuaciones.entra(puntos):\n        puntuaciones.guardar("Ana", puntos)\n    para cada p en puntuaciones.lista():\n        mostrar(p.nombre, p.puntos)' },
    ],
    proyecto: {
      titulo: 'La aldea',
      queHace: 'Ana ha perdido la llave de su casa. Si hablas con ella (tocándola), te pide ayuda con un diálogo con opciones. Al coger la llave, un mensaje abre la puerta, que se desvanece. Un perro te sigue sin chocar con nada, y la misión se guarda aunque cierres el juego. Junta mensajes, datos de juego, diálogos, irHacia, animar, efectos y datos guardados.',
      montaje: [
        'La escena con **gravedad 0**.',
        'Un **Jugador** con Colisión, Física y el script **jugador.chs**.',
        'Un objeto **Ana** con Colisión y el script **ana.chs**.',
        'Una **Llave** con Colisión (sin «sólido»), una **Puerta** con Colisión y el script **puerta.chs**, y un **Perro** con Colisión (sin «sólido»), Física y el script **perro.chs**.',
        'Un **Texto** llamado **Marcador** con el script **marcador.chs**.',
      ],
      gravedad: 0,
      objetos: [
        { nombre: 'Jugador', ...figura(150, 270, { fisica: {} }), script: 'jugador.chs' },
        { nombre: 'Ana', ...figura(400, 400), script: 'ana.chs' },
        { nombre: 'Llave', ...figura(800, 100, { colision: { solido: false } }) },
        { nombre: 'Puerta', ...figura(700, 400), script: 'puerta.chs' },
        { nombre: 'Perro', ...figura(100, 200, { colision: { solido: false }, fisica: {} }), script: 'perro.chs' },
        marcador('Habla con Ana', 'marcador.chs'),
      ],
      scripts: {
        'jugador.chs': 'cuando cada fotograma:\n    yo.moverConFlechas(250)\n\ncuando toco Llave:\n    destruir(otro)\n    sonido.efecto("moneda")\n    enviar("abrir_puerta")',
        'ana.chs': 'cuando toco Jugador:\n    si juego.mision == 0:\n        variable r = dialogo("Ana", "Se me ha perdido la llave de casa. Me ayudas?", ["Si", "No"])\n        si r == "Si":\n            juego.mision = 1\n            dialogo("Ana", "Gracias! Creo que la vi junto al pozo.")\n    sino si juego.mision == 2:\n        dialogo("Ana", "Ya esta abierta. Eres de fiar!")',
        'puerta.chs': 'cuando recibo "abrir_puerta":\n    juego.mision = 2\n    guardar("aldea_mision", 2)\n    sonido.efecto("subir")\n    animar(yo.opacidad, 0, 1)\n    esperar(1)\n    destruir(yo)',
        'perro.chs': 'cuando cada 0.5 segundos:\n    variable jugador = buscar("Jugador")\n    si jugador != nulo:\n        si yo.distanciaA(jugador) > 80:\n            yo.irHacia(jugador, 200)\n        sino:\n            yo.parar()',
        'marcador.chs': 'cuando empieza:\n    juego.mision = cargar("aldea_mision", 0)\n\ncuando cada fotograma:\n    si juego.mision == 0:\n        yo.texto = "Habla con Ana"\n    sino si juego.mision == 1:\n        yo.texto = "Busca la llave"\n    sino:\n        yo.texto = "Mision cumplida"',
      },
    },
  },
  {
    numero: 5,
    titulo: 'Tu juego, de principio a fin',
    intro: 'Ya conoces todos los comandos. Este nivel no trae ninguno nuevo: es para hacer un juego ENTERO con las herramientas del editor, que hacen por ti lo más pesado. **Empezar:** botón Nuevo > una plantilla (plataformas, naves, puzle, carreras, cartas, diálogos...) y cambiarla, o En blanco. **Dibujos, sonidos y música:** en la pestaña Proyecto, el botón del libro trae dibujos, sonidos y canciones listos; con el + de Sonidos haces tus propios efectos (pulsa «Salto», «Moneda»... hasta que te guste uno) y con el + de Música, tus canciones en una rejilla de notas. **Marcadores sin código:** Añadir > Interfaz (barra, icono con contador, inventario...) y, en su «dato», juego.vidas o Jugador.vida. **Menú, pausa y puntuaciones:** el botón «Pantallas listas», junto a las escenas. **Para dos:** en cada personaje, Comportamiento > «Lo maneja un jugador», y en la Cámara de la escena, «2 jugadores». **Publicarlo:** haz clic en el fondo de la escena y, en Proyecto, ponle nombre e icono; luego, el botón itch.io de arriba descarga el juego listo para subir y te dice los pasos.',
    ejercicios: [
      { enunciado: '**Cambia una plantilla.** Abre la plantilla Naves (Nuevo > Naves). En el script de las oleadas, haz que salga un ovni cada medio segundo en vez de cada segundo. (Solo hay que cambiar un número.) Escribe aquí cómo queda ese script.', solucion: 'cuando cada 0.5 segundos:\n    crear("Enemigo", aleatorio(40, pantalla.ancho - 40), pantalla.alto + 30)' },
      { enunciado: '**El contador de monedas.** En un juego con monedas: cada vez que el objeto toque una Moneda, la destruye, suma 1 a juego.monedas y suena el efecto «moneda». (En el editor, el dato juego.monedas se crea en Datos del juego, y un «icono con contador» con el dato juego.monedas lo enseña sin más código.)', solucion: 'cuando empieza:\n    juego.monedas = 0\n\ncuando toco Moneda:\n    destruir(otro)\n    juego.monedas += 1\n    sonido.efecto("moneda")' },
      { enunciado: '**Guardar la partida en la tabla.** Al tocar la Meta: si los puntos del juego entran en la tabla de puntuaciones, se apuntan con el nombre «Yo»; después se pasa a la escena Fin con un fundido de medio segundo.', solucion: 'cuando empieza:\n    juego.puntos = 50\n\ncuando toco Meta:\n    si puntuaciones.entra(juego.puntos):\n        puntuaciones.guardar("Yo", juego.puntos)\n    escena.cambiar("Fin", 0.5)' },
    ],
    proyecto: {
      titulo: 'Duelo para dos',
      queHace: 'Dos jugadores en el mismo teclado: el 1 con W A S D y espacio, el 2 con las flechas e Intro. Cada uno dispara al otro; cada bala que acierta baja 20 la barra de vida del que la recibe. Quien se queda sin vida pierde: se apunta la victoria del otro (guardada, para que no se pierda) y se empieza otra vez. Junta los controles de varios jugadores, las barras de interfaz, las plantillas, los efectos y los datos guardados.',
      montaje: [
        'La escena con **gravedad 0**.',
        'Dos cuadrados con Colisión: **Azul** (a la izquierda, con el script **azul.chs**) y **Rojo** (a la derecha, con **rojo.chs**).',
        'Dos barras (**Añadir > Interfaz > Barra**) llamadas **VidaAzul** y **VidaRojo**, una en cada esquina de arriba.',
        'Una **plantilla Bala** (un círculo pequeño) con Colisión sin «sólido», Física con gravedad 0 y el script **bala.chs**.',
        'Un **Texto** llamado **Marcador** con el script **marcador.chs**.',
      ],
      gravedad: 0,
      plantillas: { Bala: { sprite: { forma: 'circulo', ancho: 12, alto: 12, color: 'amarillo' }, colision: { solido: false }, fisica: { gravedad: 0 }, script: 'bala.chs' } },
      objetos: [
        { nombre: 'Azul', ...figura(150, 270, { sprite: { ancho: 40, alto: 40, color: 'azul' } }), script: 'azul.chs' },
        { nombre: 'Rojo', ...figura(810, 270, { sprite: { ancho: 40, alto: 40, color: 'rojo' } }), script: 'rojo.chs' },
        { nombre: 'VidaAzul', x: 130, y: 510, sprite: { color: 'azul', ancho: 200, alto: 24, fijo: true }, control: { tipo: 'barra', valor: 100 } },
        { nombre: 'VidaRojo', x: 830, y: 510, sprite: { color: 'rojo', ancho: 200, alto: 24, fijo: true }, control: { tipo: 'barra', valor: 100 } },
        { nombre: 'Marcador', x: 480, y: 510, sprite: { forma: 'texto', texto: 'Azul 0 - 0 Rojo', fijo: true }, script: 'marcador.chs' },
      ],
      scripts: {
        'azul.chs': 'cuando cada fotograma:\n    yo.moverConJugador(1, 260)\n    si controles(1).sePulso("a"):\n        variable b = crear("Bala", yo.x + 40, yo.y)\n        b.velocidad = vector(500, 0)\n        sonido.efecto("laser")\n\ncuando toco Bala:\n    destruir(otro)\n    yo.flash("blanco", 0.1)\n    variable vida = buscar("VidaAzul")\n    vida.valor -= 20\n    si vida.valor <= 0:\n        guardar("duelo_rojo", cargar("duelo_rojo", 0) + 1)\n        efecto.explosion(yo)\n        esperar(1)\n        escena.reiniciar()',
        'rojo.chs': 'cuando cada fotograma:\n    yo.moverConJugador(2, 260)\n    si controles(2).sePulso("a"):\n        variable b = crear("Bala", yo.x - 40, yo.y)\n        b.velocidad = vector(-500, 0)\n        sonido.efecto("laser")\n\ncuando toco Bala:\n    destruir(otro)\n    yo.flash("blanco", 0.1)\n    variable vida = buscar("VidaRojo")\n    vida.valor -= 20\n    si vida.valor <= 0:\n        guardar("duelo_azul", cargar("duelo_azul", 0) + 1)\n        efecto.explosion(yo)\n        esperar(1)\n        escena.reiniciar()',
        'bala.chs': 'cuando salgo de la pantalla:\n    destruir(yo)',
        'marcador.chs': '# Las victorias se guardan: siguen ahi aunque la escena vuelva a empezar (y aunque cierres el juego)\ncuando empieza:\n    variable azul = cargar("duelo_azul", 0)\n    variable rojo = cargar("duelo_rojo", 0)\n    yo.texto = "Azul {azul} - {rojo} Rojo"',
      },
    },
  },
];

// Lo nuevo de Chispa 1.1 (formas, efectos, sonido, interfaz...), en su propio archivo
agregarNovedades(tema, c);
agregarNovedades12(tema, c);

export const COMANDOS_CURSO: readonly ComandoCurso[] = C;
export const TEMAS_CURSO: readonly TemaCurso[] = T;
