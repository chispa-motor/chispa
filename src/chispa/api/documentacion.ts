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
  d('dialogo', 'funcion', 'dialogo("quien", "texto", opciones)', 'Una caja de dialogo abajo de la pantalla: el texto sale letra a letra y se pasa con espacio, intro o clic. Quien habla y las opciones (una lista) no son obligatorios. Con opciones, devuelve la elegida. Mientras se lee, el juego se para.', 'cuando toco Jugador:\n    variable r = dialogo("Ana", "¿Me ayudas?", ["Si", "No"])\n    si r == "Si":\n        juego.mision = 1', 'dialogo("${1:Ana}", "${2:Hola}")'),
  d('rayo', 'funcion', 'rayo(desde, direccion, largo)', "Lanza una linea invisible y dice lo primero que toca (un objeto con colision o una casilla solida), o nulo. Desde: un objeto (no se toca a si mismo) o un vector. Direccion: un angulo (0 = derecha, 90 = arriba), un vector o un objeto hacia el que mirar. Da una tabla con objeto, punto, distancia y casilla.", 'variable r = rayo(yo, buscar("Jugador"), 400)\nsi r != nulo y r.objeto.nombre == "Jugador":\n    mostrar("te veo")', 'rayo(${1:yo}, ${2:0}, ${3:500})'),
  d('enviar', 'funcion', 'enviar("mensaje", dato)', "Avisa a todos los objetos que tengan 'cuando recibo \"mensaje\"'. El dato es opcional (un numero, un texto, un objeto...) y llega en 'dato'.", 'cuando toco Llave:\n    enviar("abrir_puerta")', 'enviar("${1:mensaje}")'),
  d('contar', 'funcion', 'contar("Tipo")', 'Cuántos objetos hay con ese nombre o tipo.', 'si contar("Enemigo") == 0:\n    escena.cambiar("Ganaste")', 'contar("${1:Tipo}")'),
  d('clonar', 'funcion', 'clonar(objeto)', 'Hace una copia del objeto tal como está ahora (sitio, color, tamaño, propiedades), con su script. Devuelve la copia.', 'variable copia = clonar(yo)\ncopia.x += 50', 'clonar(${1:yo})'),
  d('buscarConEtiqueta', 'funcion', 'buscarConEtiqueta("etiqueta")', 'Una lista con los objetos que tienen esa etiqueta (ver yo.ponerEtiqueta).', 'para cada e en buscarConEtiqueta("malo"):\n    e.color = "rojo"', 'buscarConEtiqueta("${1:etiqueta}")'),
  d('angulo', 'funcion', 'angulo(desde, hasta)', 'El ángulo en grados de la flecha que va de un objeto (o posición) a otro: 0 = derecha, 90 = arriba.', 'yo.rotacion = angulo(yo, raton.posicion)', 'angulo(${1:yo}, ${2:otro})'),
  d('cronometro', 'funcion', 'cronometro()', 'Un cronómetro nuevo, que empieza a contar ya. Tiene .segundos, .reiniciar(), .pausar() y .seguir().', 'variable crono = cronometro()\nmostrar(crono.segundos)', 'cronometro()'),
  d('animar', 'funcion', 'animar(sitio, hasta, segundos, suavizado)', 'Cambia algo POCO A POCO hasta un valor en esos segundos (0.5 si no se dice): la posición, el tamaño, el giro, la opacidad, un color... Suavizados: "suave" (el normal), "lineal", "entrada", "salida", "rebote", "elastico" y "atras".', 'animar(yo.tamano, 2, 0.5)\nanimar(yo.color, "rojo", 1, "lineal")', 'animar(${1:yo.tamano}, ${2:2}, ${3:0.5})'),
  d('longitud', 'funcion', 'longitud(x)', 'Cuántas letras tiene un texto, o cuántos elementos una lista o una tabla.', 'mostrar(longitud(buscarTodos("Moneda")))', 'longitud(${1})'),
  d('texto', 'funcion', 'texto(valor)', 'Convierte cualquier valor en texto.', 'yo.texto = "Puntos: " + texto(juego.puntos)', 'texto(${1})'),
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
      d('colorFondo', 'propiedad', 'escena.colorFondo', 'El color del fondo de la escena.', 'escena.colorFondo = "azul"'),
      d('cambiar', 'accion', 'escena.cambiar("Nombre", fundido)', 'Cambia a otra escena. Los datos de juego (juego.puntos...) se conservan. Con un número, la pantalla se oscurece y se aclara durante esos segundos.', 'escena.cambiar("Nivel2", 1)', 'cambiar("${1:Nivel2}")'),
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
      d('temblar', 'accion', 'escena.camara.temblar(intensidad, segundos)', 'Hace temblar la pantalla (explosiones, golpes).', 'escena.camara.temblar(10, 0.3)', 'temblar(${1:8}, ${2:0.3})'),
      d('zoom', 'propiedad', 'escena.camara.zoom', '1 = normal, 2 = más cerca (todo el doble de grande), 0.5 = más lejos.', 'escena.camara.zoom = 2'),
      d('x', 'propiedad', 'escena.camara.x', 'Centro de la cámara (horizontal).', 'escena.camara.x = 480'),
      d('y', 'propiedad', 'escena.camara.y', 'Centro de la cámara (vertical).', 'escena.camara.y = 270'),
      d('suavizado', 'propiedad', 'escena.camara.suavizado', 'Lo rápido que alcanza al objeto que sigue (8 por defecto; más alto = más rápido).', 'escena.camara.suavizado = 3'),
    ],
  },
  {
    nombre: 'sonido',
    descripcion: 'Efectos de sonido.',
    ejemplo: 'sonido.reproducir("salto")',
    miembros: [
      d('reproducir', 'accion', 'sonido.reproducir("nombre", volumen, tono)', 'Reproduce un sonido del proyecto. Volumen de 0 a 1; tono 1 = normal, 2 = más agudo, 0.5 = más grave (los dos se pueden dejar sin poner).', 'sonido.reproducir("salto", 0.5, aleatorioDecimal(0.9, 1.1))', 'reproducir("${1:nombre}")'),
      d('bucle', 'accion', 'sonido.bucle("nombre", volumen)', 'Reproduce un sonido una y otra vez, hasta que se pare con sonido.parar("nombre").', 'sonido.bucle("motor", 0.4)', 'bucle("${1:nombre}")'),
      d('parar', 'accion', 'sonido.parar("nombre")', 'Para un sonido (o todos, sin nombre).', 'sonido.parar()', 'parar()'),
      d('sonando', 'accion', 'sonido.sonando("nombre")', 'Verdadero si ese sonido está sonando ahora.', 'si no sonido.sonando("motor"):\n    sonido.bucle("motor")', 'sonando("${1:nombre}")'),
      d('pausar', 'accion', 'sonido.pausar()', 'Congela TODO el sonido (efectos y música) sin perder por dónde iba.', 'sonido.pausar()', 'pausar()'),
      d('seguir', 'accion', 'sonido.seguir()', 'Sigue el sonido que se había pausado con sonido.pausar().', 'sonido.seguir()', 'seguir()'),
      d('tono', 'accion', 'sonido.tono(frecuencia, segundos)', 'Un pitido generado, sin archivos. 440 es la nota La.', 'sonido.tono(880, 0.1)', 'tono(${1:440}, ${2:0.2})'),
      d('volumen', 'propiedad', 'sonido.volumen', 'Volumen de los efectos, de 0 a 1.', 'sonido.volumen = 0.5'),
    ],
  },
  {
    nombre: 'musica',
    descripcion: 'Música de fondo: suena en bucle y solo una a la vez.',
    ejemplo: 'musica.reproducir("tema")',
    miembros: [
      d('reproducir', 'accion', 'musica.reproducir("nombre", fundido)', 'Pone una música en bucle (para la anterior). Con un número, empieza en silencio y sube poco a poco durante esos segundos.', 'musica.reproducir("tema", 2)', 'reproducir("${1:nombre}")'),
      d('parar', 'accion', 'musica.parar(fundido)', 'Para la música. Con un número, baja poco a poco durante esos segundos.', 'musica.parar(2)', 'parar()'),
      d('pausar', 'accion', 'musica.pausar()', 'Pone la música en pausa (recuerda por dónde iba).', 'musica.pausar()', 'pausar()'),
      d('seguir', 'accion', 'musica.seguir()', 'Sigue la música por donde iba.', 'musica.seguir()', 'seguir()'),
      d('volumen', 'propiedad', 'musica.volumen', 'Volumen de la música, de 0 a 1.', 'musica.volumen = 0.3'),
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
      d('camaraLenta', 'accion', 'tiempo.camaraLenta(velocidad, segundos)', 'Cámara lenta durante un rato y luego vuelve sola a la normalidad.', 'cuando toco Enemigo:\n    tiempo.camaraLenta(0.3, 1)', 'camaraLenta(${1:0.3}, ${2:1})'),
    ],
  },
  {
    nombre: 'pantalla',
    descripcion: 'El tamaño de la pantalla del juego.',
    ejemplo: 'yo.x = pantalla.ancho / 2',
    miembros: [
      d('ancho', 'propiedad', 'pantalla.ancho', 'Ancho de la pantalla del juego en píxeles.', 'yo.x = pantalla.ancho / 2'),
      d('alto', 'propiedad', 'pantalla.alto', 'Alto de la pantalla del juego en píxeles.', 'yo.y = pantalla.alto - 30'),
      d('completa', 'propiedad', 'pantalla.completa', 'Pantalla completa: verdadero para ponerla, falso para quitarla. El navegador solo deja justo después de pulsar una tecla o hacer clic.', 'cuando se pulsa "f":\n    pantalla.completa = no pantalla.completa'),
      d('oscurecer', 'accion', 'pantalla.oscurecer(segundos, color)', 'Fundido: la pantalla se va poniendo de un color (negro si no se dice) durante esos segundos.', 'pantalla.oscurecer(1)', 'oscurecer(${1:1})'),
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
      d('texto', 'accion', 'dibujar.texto(texto, x, y, color, tamano)', 'Un texto en ese sitio del mundo (por ejemplo, encima de un enemigo).', 'dibujar.texto(yo.vida, yo.x, yo.y + 40, "blanco")', 'texto(${1:"hola"}, ${2:yo.x}, ${3:yo.y})'),
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
      d('abrirWeb', 'accion', 'sistema.abrirWeb("direccion")', 'Abre una página web en otra pestaña (por ejemplo, la de tu juego en itch.io).', 'cuando hago clic encima:\n    sistema.abrirWeb("https://itch.io")', 'abrirWeb("${1:https://}")'),
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
  d('colorTexto', 'propiedad', 'yo.colorTexto', 'Color de la letra de las etiquetas (botones).', 'yo.colorTexto = "negro"'),
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
];

// ═════════════════════════ Listas, textos, tablas y vectores ═════════════════════════

/** Lo que tienen los valores del lenguaje (no los objetos del juego): lista.añadir(), texto.mayusculas... */
export const DOC_VALORES: { tipo: string; descripcion: string; miembros: Doc[] }[] = [
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
