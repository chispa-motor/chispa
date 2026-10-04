# Chuleta de Chispa

> Se genera sola con `npm run manual` (no la cambies a mano). Un test comprueba que no falta ningún comando y que cada ejemplo funciona.

Todos los comandos de Chispa (461), una línea cada uno, para tenerla abierta mientras programas o imprimirla. Para aprender con calma, el [curso](APRENDE_CHISPA.md).

En los ejemplos se usan estas variables y esta función, como si ya las tuvieras (y en la escena hay un Jugador y un Mapa de casillas):

```
variable vida = 3
variable puntos = 0
variable lista = [3, 1, 2]
variable frase = "hola mundo"
variable tabla = {vida: 3, nombre: "Ana"}
variable v = vector(3, 4)
variable jugador = buscar("Jugador")
variable mapa = buscar("Mapa")
juego.puntos = 0

funcion lluvia(veces):
    repetir veces veces:
        crear("Gota", aleatorio(0, 900), 540)
        esperar(0.2)
```

Las líneas que terminan en `:` empiezan un bloque: lo de dentro va debajo, con 4 espacios. `yo` es el objeto del script. En el código no hacen falta tildes.

## Nivel 1: Lo básico del lenguaje

### Mostrar y guardar datos

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `mostrar(valor, ...)` | Escribe en la consola. | `mostrar("Vidas:", vida)` |
| `variable nombre = valor` | Crea una variable nueva: una caja con nombre donde guardar un valor. | `variable nivel = 1` |
| `verdadero` | El valor lógico «sí». | `variable vivo = verdadero` |
| `falso` | El valor lógico «no». | `variable pausado = falso` |
| `nulo` | Nada, vacío. | `si jugador == nulo:` |

### Números y operaciones

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `aleatorio(min, max)` | Un número entero al azar entre min y max (los dos incluidos). | `variable dado = aleatorio(1, 6)` |
| `aleatorioDecimal(min, max)` | Un número CON DECIMALES al azar entre min y max (aleatorio() da enteros). | `yo.tamano = aleatorioDecimal(0.5, 1.5)` |
| `redondear(numero, decimales)` | Redondea un número. | `mostrar(redondear(3.14159, 2))` |
| `redondearAbajo(numero)` | Quita los decimales hacia abajo: redondearAbajo(3.9) es 3. | `variable columna = redondearAbajo(yo.x / 32)` |
| `redondearArriba(numero)` | Redondea hacia arriba: redondearArriba(3.1) es 4. | `variable paginas = redondearArriba(25 / 10)` |
| `absoluto(numero)` | El número sin signo: absoluto(-5) es 5. | `si absoluto(yo.velocidad.x) > 100:` |
| `signo(numero)` | 1 si es positivo, -1 si es negativo, 0 si es cero. | `yo.voltear = signo(yo.velocidad.x) < 0` |
| `raiz(numero)` | La raíz cuadrada. | `mostrar(raiz(16))` |
| `potencia(base, exponente)` | Multiplica un número por sí mismo varias veces: potencia(2, 3) = 2 × 2 × 2 = 8. | `mostrar(potencia(2, 10))` |
| `minimo(a, b, ...)` | El más pequeño de varios números. | `yo.vida = minimo(vida + 1, 10)` |
| `maximo(a, b, ...)` | El más grande de varios números. | `vida = maximo(vida - 1, 0)` |
| `limitar(valor, min, max)` | Deja el número entre min y max: si se pasa, da max; si no llega, da min. | `vida = limitar(vida, 0, 100)` |
| `numero(texto)` | Convierte un texto con un número ("42") en un número de verdad. | `variable n = numero("42")` |
| `texto(valor)` | Convierte cualquier valor en texto. | `yo.texto = "Puntos: " + texto(puntos)` |
| `probabilidad(porcentaje)` | Verdadero ese porcentaje de las veces. | `si probabilidad(10):` |

### Decidir: si y sino

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `si condicion` | Ejecuta el bloque de dentro solo si la condición es verdadera. | `si vida <= 0:` |
| `sino:  /  sino si condicion` | Va después de un 'si'. | `sino:` |
| `a y b` | Verdadero solo si las DOS cosas son verdaderas. | `si vida > 0 y puntos >= 10:` |
| `a o b` | Verdadero si AL MENOS UNA de las dos es verdadera. | `si vida == 0 o puntos < 0:` |
| `no a` | Lo contrario: verdadero pasa a falso y al revés. | `si no yo.enSuelo:` |

### Repetir: bucles

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `repetir N veces` | Repite el bloque de dentro un número de veces. | `repetir 3 veces:` |
| `mientras condicion` | Repite el bloque de dentro mientras la condición sea verdadera. | `mientras vida > 0:` |
| `para cada x en lista` | Recorre una lista, un texto (letra a letra) o una tabla. | `para cada x en lista:` |
| `para cada x en lista:  /  cuando cada fotograma` | Se usa en 'para cada' y en los eventos 'cuando cada fotograma' y 'cuando cada N segundos'. | `para cada n en [1, 2, 3]:` |
| `x en lista  /  "clave" en tabla` | Dos usos: en 'para cada x en lista', y para comprobar si algo está dentro de otra cosa (una clave en una tabla, un elemento en una lista, un trozo en un texto). | `si "vida" en tabla:` |
| `rango(desde, hasta, paso)` | Una lista de numeros seguidos, de desde a hasta (los dos incluidos). | `para cada i en rango(1, 10):` |
| `romper` | Sale del bucle (mientras, repetir o para cada) en el que está. | `romper` |
| `continuar` | Salta a la siguiente vuelta del bucle, sin terminar esta. | `continuar` |

### Textos

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `texto.longitud` | Cuántas letras tiene el texto. | `mostrar(frase.longitud)` |
| `texto.mayusculas` | El mismo texto en MAYÚSCULAS. | `mostrar(frase.mayusculas)` |
| `texto.minusculas` | El mismo texto en minúsculas. | `si frase.minusculas == "hola mundo":` |
| `texto.dividir(separador)` | Corta el texto en trozos y da una lista. | `variable palabras = frase.dividir(" ")` |
| `texto.reemplazar(buscar, cambiarPor)` | Un texto nuevo en el que se cambia cada trozo buscado por otro. | `mostrar(frase.reemplazar("hola", "adios"))` |
| `texto.contiene(trozo)` | Verdadero si el texto tiene ese trozo dentro. | `si frase.contiene("hola"):` |
| `texto.empiezaPor(trozo)` | Verdadero si el texto empieza así. | `si frase.empiezaPor("hola"):` |
| `texto.terminaPor(trozo)` | Verdadero si el texto termina así. | `si frase.terminaPor("mundo"):` |
| `texto.recortar()` | El mismo texto sin los espacios del principio y del final. | `variable limpio = frase.recortar()` |
| `texto.trozo(desde, hasta)` | Un trozo del texto: de la letra desde a la hasta (las dos incluidas; la primera es la 1). | `variable inicial = frase.trozo(1, 1)` |
| `texto.posicion(trozo)` | En qué letra empieza un trozo dentro del texto (la primera es la 1), o 0 si no está. | `mostrar(frase.posicion("mundo"))` |
| `longitud(x)` | Cuántas letras tiene un texto, o cuántos elementos una lista o una tabla. | `mostrar(longitud(lista))` |

### Listas

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `lista.longitud` | Cuántos elementos tiene la lista. | `mostrar(lista.longitud)` |
| `lista.añadir(valor)` | Pone un valor al final de la lista. | `lista.añadir(4)` |
| `lista.quitar(posicion)` | Quita el elemento de esa posición (la primera es la 1) y lo devuelve. | `variable primero = lista.quitar(1)` |
| `lista.primero` | El primer elemento (o nulo si está vacía). | `mostrar(lista.primero)` |
| `lista.ultimo` | El último elemento (o nulo si está vacía). | `mostrar(lista.ultimo)` |
| `lista.insertar(posicion, valor)` | Mete un valor en esa posición; los que había de ahí en adelante se corren un sitio. | `lista.insertar(1, 0)` |
| `lista.ordenar()` | Ordena la lista de menor a mayor (números) o por orden alfabético (textos). | `lista.ordenar()` |
| `lista.mezclar()` | Desordena la lista al azar (como barajar cartas). | `lista.mezclar()` |
| `lista.invertir()` | Le da la vuelta: el último pasa a ser el primero. | `lista.invertir()` |
| `lista.posicion(valor)` | En qué posición está un valor (la primera es la 1), o 0 si no está. | `variable donde = lista.posicion(2)` |
| `lista.contiene(valor)` | Verdadero si el valor está en la lista. | `si lista.contiene(3):` |
| `lista.sublista(desde, hasta)` | Una lista nueva con un trozo: de la posición desde a la hasta (las dos incluidas). | `variable mejores = lista.sublista(1, 2)` |
| `lista.unir(separador)` | Junta los elementos en un texto, con el separador entre medias (", " si no se dice). | `mostrar(lista.unir(", "))` |
| `lista.vaciar()` | Quita todos los elementos. | `lista.vaciar()` |
| `elegir(lista)` | Un elemento al azar de una lista. | `yo.color = elegir(["rojo", "azul"])` |
| `unir(lista, separador)` | Junta los elementos de una lista en un texto, con el separador entre medias (por defecto ", "). | `mostrar(unir(lista, " - "))` |

### Tablas

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `tabla.claves` | Una lista con los nombres de todas las claves, en el orden en que se añadieron. | `mostrar(tabla.claves)` |
| `tabla.quitar("clave")` | Quita una clave de la tabla y devuelve su valor. | `tabla.quitar("nombre")` |

### Funciones

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `funcion nombre(a, b)` | Crea una función: un trozo de código con nombre que se puede usar muchas veces. | `funcion saludar(nombre):` |
| `devolver valor` | Termina la función y da un resultado. | `devolver n * 2` |

## Nivel 2: Objetos y eventos

### Eventos: cuándo pasa cada cosa

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `cuando evento` | Empieza un evento: código que se ejecuta cuando pasa algo (al empezar, al pulsar una tecla, al tocar otro objeto...). | `cuando empieza:` |
| `cuando empieza` | Se ejecuta una vez, cuando el objeto aparece en la escena. | `cuando empieza:` |
| `cuando cada fotograma` | Se ejecuta unas 60 veces por segundo. | `cuando cada fotograma:` |
| `delta` | Segundos desde el fotograma anterior (unos 0.016). | `yo.x += 200 * delta` |
| `tiempo.delta` | Segundos desde el fotograma anterior (igual que delta). | `yo.x += 100 * tiempo.delta` |

### yo: el objeto y sus datos

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `yo` | El objeto al que pertenece este script. | `yo.x += 10` |
| `yo.nombre` | El nombre del objeto. | `mostrar(yo.nombre)` |
| `yo.tipo` | El tipo del objeto (normalmente, la plantilla de la que salió). | `si jugador.tipo == "Jugador":` |
| `yo.x` | Posición horizontal del centro del objeto. | `yo.x = 100` |
| `yo.y` | Posición vertical del centro del objeto. | `yo.y += 50 * delta` |
| `yo.posicion` | Posición como vector. | `yo.posicion = vector(100, 200)` |
| `vector(x, y)` | Un vector: dos números juntos (una posición, una velocidad...). | `variable v = vector(3, 4)` |
| `vector.x` | El número horizontal. | `mostrar(v.x)` |
| `vector.y` | El número vertical (positivo = hacia arriba). | `mostrar(v.y)` |
| `vector.longitud` | Lo largo que es (por ejemplo, la rapidez de una velocidad). | `mostrar(v.longitud)` |
| `vector.normalizado` | Un vector con la misma dirección pero de largo 1. | `variable dir = v.normalizado` |
| `yo.rotacion` | Giro en grados (positivo = contrario a las agujas del reloj). | `yo.rotacion = 45` |
| `yo.escala` | Tamaño: 1 normal, 2 el doble. | `yo.escala = 2` |
| `yo.color` | El color de la forma (o del texto). | `yo.color = "rojo"` |
| `yo.visible` | Si es falso, el objeto no se dibuja (pero sigue existiendo). | `yo.visible = falso` |
| `yo.ancho` | Ancho del dibujo en píxeles. | `yo.ancho = 100` |
| `yo.alto` | Alto del dibujo en píxeles. | `yo.alto = 20` |
| `yo.opacidad` | De 0 (invisible) a 1 (normal). | `yo.opacidad = 0.5` |
| `yo.transparencia` | Lo contrario de la opacidad: 0 = se ve normal, 1 = invisible, 0.5 = medio transparente. | `yo.transparencia = 0.5` |
| `yo.capa` | Orden de dibujo: los de capa más alta se ven por encima. | `yo.capa = 10` |
| `yo.voltear` | Si es verdadero, el dibujo se ve al revés (como en un espejo). | `yo.voltear = verdadero` |
| `yo.voltearVertical` | Si es verdadero, la imagen se ve boca abajo. | `yo.voltearVertical = verdadero` |
| `yo.imagen` | La imagen que se dibuja (nombre de una imagen del proyecto). | `yo.imagen = "jugador"` |
| `yo.texto` | El texto de un objeto de texto, o la etiqueta de un botón. | `yo.texto = "Puntos: {juego.puntos}"` |
| `yo.tamaño` | Lo grande que es: 1 = normal, 2 = el doble, 0.5 = la mitad. | `yo.tamano = 2` |
| `yo.tamanoLetra` | El tamaño de la letra de un texto o de la etiqueta de un botón. | `yo.tamanoLetra = 40` |
| `yo.colorTexto` | Color de la letra de las etiquetas (botones). | `yo.colorTexto = "negro"` |

### El teclado

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `cuando se pulsa "tecla"` | Se ejecuta al pulsar una tecla (una vez por pulsación). | `cuando se pulsa "espacio":` |
| `cuando se mantiene "tecla"` | Se ejecuta en cada fotograma mientras la tecla esté pulsada. | `cuando se mantiene "derecha":` |
| `cuando se suelta "tecla"` | Se ejecuta al soltar una tecla. | `cuando se suelta "espacio":` |
| `teclado.pulsada("tecla")` | Verdadero MIENTRAS la tecla esté pulsada. | `si teclado.pulsada("izquierda"):` |
| `teclado.sePulso("tecla")` | Verdadero solo en el fotograma en que se pulsa la tecla. | `si teclado.sePulso("espacio"):` |
| `teclado.seSolto("tecla")` | Verdadero solo en el fotograma en que se suelta la tecla. | `si teclado.seSolto("espacio"):` |
| `teclado.algunaSePulso()` | Verdadero en el fotograma en que se pulsa CUALQUIER tecla. | `si teclado.algunaSePulso():` |
| `teclado.ultima` | La última tecla que se ha pulsado (su nombre: "a", "espacio"...), o nulo si todavía ninguna. | `mostrar(teclado.ultima)` |
| `teclado.pulsadas` | Una lista con las teclas que están pulsadas ahora mismo. | `mostrar(teclado.pulsadas)` |

### El ratón

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `cuando hago clic` | Se ejecuta al hacer clic en cualquier sitio de la pantalla del juego. | `cuando hago clic:` |
| `cuando hago clic encima` | Se ejecuta al hacer clic ENCIMA de este objeto. | `cuando hago clic encima:` |
| `raton.x` | Posición horizontal del ratón en el mundo. | `yo.x = raton.x` |
| `raton.y` | Posición vertical del ratón en el mundo (hacia arriba). | `yo.y = raton.y` |
| `raton.posicion` | Posición del ratón como vector. | `yo.posicion = raton.posicion` |
| `raton.rueda` | Cuánto se ha girado la rueda en este fotograma (positivo = hacia abajo). | `escena.camara.zoom -= raton.rueda * 0.001` |
| `raton.objeto` | El objeto que hay debajo del ratón (el de más arriba), o nulo si no hay ninguno. | `si raton.objeto != nulo:` |
| `raton.visible` | Si es falso, la flecha del ratón no se ve encima del juego (para poner tu propia mira). | `raton.visible = falso` |
| `raton.pulsado("izquierdo")` | Verdadero mientras el botón esté pulsado ("izquierdo", "derecho" o "medio"). | `si raton.pulsado("izquierdo"):` |
| `raton.sePulso("izquierdo")` | Verdadero solo en el fotograma en que se pulsa el botón. | `si raton.sePulso():` |
| `raton.seSolto("izquierdo")` | Verdadero solo en el fotograma en que se suelta el botón (por ejemplo, para soltar algo que arrastras). | `si raton.seSolto():` |
| `yo.ratonEncima` | Verdadero si el ratón está encima del objeto (para resaltar botones). | `si yo.ratonEncima:` |
| `yo.arrastrable` | Si es verdadero, se puede coger con el ratón y moverlo (puzles, inventarios, juegos de ordenar). | `yo.arrastrable = verdadero` |
| `yo.arrastrando` | Verdadero mientras se está arrastrando con el ratón (solo se lee). | `si yo.arrastrando:` |

### Moverse

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `yo.mover(x, y)` | Mueve el objeto esa cantidad de píxeles. | `yo.mover(10, 0)` |
| `yo.moverConFlechas(rapidez)` | Mueve el objeto con las flechas (o W A S D) a esa rapidez en píxeles por segundo. | `yo.moverConFlechas(300)` |
| `yo.rotar(grados)` | Gira el objeto esos grados. | `yo.rotar(90 * delta)` |
| `yo.avanzar(pasos)` | Se mueve hacia donde mira (según su rotación), como «mover pasos» de Scratch. | `yo.avanzar(10)` |
| `yo.moverHacia(destino, rapidez)` | Avanza hacia otro objeto o posición a esa rapidez (píxeles/segundo), sin pasarse. | `yo.moverHacia(jugador, 80)` |
| `yo.irA(destino, segundos)` | Va SUAVEMENTE hasta un sitio en esos segundos (1 si no se dice). | `yo.irA(400, 300, 2)` |
| `yo.teletransportar(destino)` | Se va DE GOLPE a otro sitio (un objeto, una posición o dos números), sin la velocidad que llevaba. | `yo.teletransportar(100, 300)` |
| `yo.mirarA(destino)` | Gira el objeto para que mire hacia otro objeto o posición. | `yo.mirarA(jugador)` |
| `yo.rotarHacia(destino, gradosPorSegundo)` | Gira POCO A POCO hasta mirar hacia algo (180 grados por segundo si no se dice). | `yo.rotarHacia(jugador, 90)` |
| `yo.anguloA(destino)` | El ángulo (en grados) hacia otro objeto o posición: 0 = derecha, 90 = arriba. | `variable a = yo.anguloA(jugador)` |
| `yo.direccionA(destino)` | Un vector de largo 1 que apunta hacia otro objeto o posición. | `variable d = yo.direccionA(jugador)` |
| `yo.distanciaA(destino)` | Distancia en píxeles hasta otro objeto o una posición (también con dos números: x, y). | `si yo.distanciaA(jugador) < 50:` |
| `distancia(a, b)` | Distancia en píxeles entre dos objetos o dos posiciones. | `si distancia(yo, jugador) < 100:` |
| `angulo(desde, hasta)` | El ángulo en grados de la flecha que va de un objeto (o posición) a otro: 0 = derecha, 90 = arriba. | `yo.rotacion = angulo(yo, raton.posicion)` |
| `seno(grados)` | El seno de un ángulo EN GRADOS. | `yo.y = 200 + seno(tiempo.total * 90) * 50` |
| `coseno(grados)` | El coseno de un ángulo EN GRADOS. | `yo.x = 400 + coseno(tiempo.total * 90) * 50` |
| `tangente(grados)` | La tangente de un ángulo EN GRADOS. | `mostrar(tangente(45))` |
| `pi` | El número pi (3.14159...): lo que mide una vuelta entera dividido entre su ancho. | `variable vuelta = 2 * pi * 10` |

### Choques: tocar cosas

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `cuando toco Nombre` | Se ejecuta al EMPEZAR a tocar un objeto con ese nombre o tipo, o una casilla de ese tipo. | `cuando toco Moneda:` |
| `cuando dejo de tocar Nombre` | Se ejecuta cuando deja de tocar un objeto o casilla. | `cuando dejo de tocar Jugador:` |
| `otro` | Dentro de 'cuando toco': el objeto que has tocado. | `destruir(otro)` |
| `cuando salgo de la pantalla` | Se ejecuta cuando el objeto sale de lo que se ve (por un borde de la pantalla). | `cuando salgo de la pantalla:` |
| `yo.tocando("Nombre")` | Verdadero si AHORA MISMO está tocando algo con ese nombre, tipo, etiqueta o tipo de casilla. | `si yo.tocando("Lava"):` |
| `yo.solido` | Si es verdadero, los demás chocan con él. | `yo.solido = falso` |
| `yo.fantasma` | Si es verdadero, se atraviesa, pero sigue avisando con "cuando toco" (zonas, monedas, metas). | `yo.fantasma = verdadero` |
| `casilla` | Dentro de 'cuando toco': si has tocado una casilla de un mapa, su tipo (si no, nulo). | `si casilla == "agua":` |

## Nivel 3: Hacer juegos

### Crear, buscar y destruir objetos

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `crear("Plantilla", x, y)` | Crea un objeto nuevo a partir de una plantilla, en la posición (x, y). | `crear("Bala", yo.x, yo.y)` |
| `destruir(objeto)` | Quita un objeto del juego. | `destruir(otro)` |
| `yo.destruir()` | Quita el objeto del juego (igual que destruir(yo)). | `yo.destruir()` |
| `yo.destruido` | Verdadero si el objeto ya se ha destruido. | `si jugador.destruido:` |
| `buscar("Nombre")` | Busca un objeto por su nombre o su tipo. | `variable j = buscar("Jugador")` |
| `buscarTodos("Tipo")` | Da una lista con todos los objetos de ese nombre o tipo. | `buscarTodos("Enemigo")` |
| `contar("Tipo")` | Cuántos objetos hay con ese nombre o tipo. | `si contar("Enemigo") == 0:` |
| `clonar(objeto)` | Hace una copia del objeto tal como está ahora (sitio, color, tamaño, propiedades), con su script. | `variable copia = clonar(jugador)` |
| `yo.clonar()` | Hace una copia de este objeto tal como está ahora, con su script. | `variable copia = jugador.clonar()` |
| `yo.ponerEtiqueta("etiqueta")` | Le pone una etiqueta. | `yo.ponerEtiqueta("peligro")` |
| `yo.quitarEtiqueta("etiqueta")` | Le quita una etiqueta. | `yo.quitarEtiqueta("peligro")` |
| `yo.tieneEtiqueta("etiqueta")` | Verdadero si tiene esa etiqueta. | `si otro.tieneEtiqueta("peligro"):` |
| `yo.etiquetas` | La lista de sus etiquetas. | `mostrar(yo.etiquetas)` |
| `buscarConEtiqueta("etiqueta")` | Una lista con los objetos que tienen esa etiqueta (ver yo.ponerEtiqueta). | `buscarConEtiqueta("malo")` |
| `yo.cercanos(radio, "Tipo")` | Una lista con los objetos a menos de esos píxeles (de ese tipo, si se dice), del más cercano al más lejano. | `yo.cercanos(150, "Enemigo")` |
| `yo.masCercano("Tipo", radio)` | El objeto más cercano (de ese tipo, y a menos de esos píxeles si se dice), o nulo si no hay. | `variable m = yo.masCercano("Moneda")` |
| `escena.objetos` | Lista con todos los objetos de la escena. | `mostrar(escena.objetos.longitud)` |

### Física: gravedad, velocidad y saltos

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `yo.velocidad` | Velocidad en píxeles por segundo (necesita física). | `yo.velocidad.x = 200` |
| `yo.gravedad` | Cuánto le afecta la gravedad: 1 normal, 0 flota, 0.5 como en la luna. | `yo.gravedad = 0` |
| `escena.gravedad` | La gravedad de la escena (1500 normal, 0 para juegos vistos desde arriba). | `escena.gravedad = 0` |
| `yo.rozamiento` | Cuánto frena en el suelo, de 0 (hielo) a 1 (se para en seco). | `yo.rozamiento = 0` |
| `yo.rebote` | Cuánto rebota al chocar, de 0 (nada) a 1 (pelota perfecta). | `yo.rebote = 0.8` |
| `yo.masa` | Cuánto pesa. | `yo.masa = 10` |
| `yo.estatico` | Si es verdadero, el objeto no se mueve nunca (como una pared). | `yo.estatico = verdadero` |
| `yo.saltar(fuerza)` | Salta, pero solo si está en el suelo. | `yo.saltar(600)` |
| `yo.enSuelo` | Verdadero si está apoyado en el suelo (solo se lee). | `si yo.enSuelo:` |
| `yo.tocaPared` | Verdadero si ha chocado con una pared (solo se lee). | `si yo.tocaPared:` |
| `yo.tocaTecho` | Verdadero si se ha dado con la cabeza en un techo (solo se lee). | `si yo.tocaTecho:` |
| `yo.empujar(x, y)` | Da un golpe: cambia la velocidad según la masa (los pesados se mueven menos). | `otro.empujar(500, 200)` |
| `yo.moviendo` | Solo en objetos con recorrido (plataformas que se mueven solas): si es falso, se para donde está; si es verdadero, sigue su camino. | `buscar("Plataforma").moviendo = falso` |

### Mapas de casillas

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `mapa.casilla(columna, fila)` | Solo en mapas de casillas: el tipo de la casilla (o nulo si está vacía). | `mostrar(mapa.casilla(3, 0))` |
| `mapa.ponerCasilla(columna, fila, "tipo")` | Solo en mapas: pone una casilla. | `mapa.ponerCasilla(3, 0, "suelo")` |
| `mapa.quitarCasilla(columna, fila)` | Solo en mapas: quita una casilla. | `mapa.quitarCasilla(3, 0)` |
| `mapa.casillaEn(x, y)` | Solo en mapas: el tipo de la casilla que hay en un punto del mundo. | `si mapa.casillaEn(yo.x, yo.y - 30) == "hielo":` |
| `mapa.columnaEn(x)` | Solo en mapas: la columna que hay en esa X del mundo. | `variable c = mapa.columnaEn(yo.x)` |
| `mapa.filaEn(y)` | Solo en mapas: la fila que hay en esa Y del mundo. | `variable f = mapa.filaEn(yo.y)` |
| `mapa.centroDeCasilla(columna, fila)` | Solo en mapas: el centro de una casilla, en el mundo (vector). | `yo.posicion = mapa.centroDeCasilla(2, 5)` |

### La cámara

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `escena.camara` | La cámara: qué parte del mundo se ve. | `escena.camara.seguir(yo)` |
| `escena.camara.seguir(objeto)` | La cámara sigue a un objeto (suavemente). | `escena.camara.seguir(yo)` |
| `escena.camara.limites(izquierda, abajo, derecha, arriba)` | La cámara no enseña nada fuera de esta zona. | `escena.camara.limites(mapa)` |
| `escena.camara.temblar(intensidad, segundos)` | Hace temblar la pantalla (explosiones, golpes). | `escena.camara.temblar(10, 0.3)` |
| `escena.camara.zoom` | 1 = normal, 2 = más cerca (todo el doble de grande), 0.5 = más lejos. | `escena.camara.zoom = 2` |
| `escena.camara.x` | Centro de la cámara (horizontal). | `escena.camara.x = 480` |
| `escena.camara.y` | Centro de la cámara (vertical). | `escena.camara.y = 270` |
| `escena.camara.suavizado` | Lo rápido que alcanza al objeto que sigue (8 por defecto; más alto = más rápido). | `escena.camara.suavizado = 3` |

### Escenas

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `escena.nombre` | El nombre de la escena actual. | `mostrar(escena.nombre)` |
| `escena.cambiar("Nombre", segundos, transicion)` | Cambia a otra escena. | `escena.cambiar("Nivel2")` |
| `escena.reiniciar()` | Vuelve a empezar la escena actual desde el principio. | `escena.reiniciar()` |
| `escena.colorFondo` | El color del fondo de la escena. | `escena.colorFondo = "azul"` |

### Interfaz y dibujo en la pantalla

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `yo.fijo` | Si es verdadero, se queda pegado a la pantalla (interfaz: vida, puntos, botones). | `yo.fijo = verdadero` |
| `pantalla.ancho` | Ancho de la pantalla del juego en píxeles. | `yo.x = pantalla.ancho / 2` |
| `pantalla.alto` | Alto de la pantalla del juego en píxeles. | `yo.y = pantalla.alto - 30` |
| `pantalla.completa` | Pantalla completa: verdadero para ponerla, falso para quitarla. | `pantalla.completa = verdadero` |
| `dibujar.linea(x1, y1, x2, y2, color, grosor)` | Una línea de un punto a otro. | `dibujar.linea(0, 0, 100, 100, "rojo")` |
| `dibujar.circulo(x, y, radio, color, relleno)` | Un círculo (solo el borde; con verdadero al final, relleno). | `dibujar.circulo(yo.x, yo.y, 50, "verde")` |
| `dibujar.rectangulo(x, y, ancho, alto, color, relleno)` | Un rectángulo con su centro en (x, y), como los objetos. | `dibujar.rectangulo(yo.x, yo.y, 64, 64, "azul")` |
| `dibujar.texto(texto, x, y, color, tamano, letra)` | Un texto en ese sitio del mundo (por ejemplo, encima de un enemigo). | `dibujar.texto("Hola", yo.x, yo.y + 40)` |
| `dibujar.arco(x, y, radio, desde, hasta, color, relleno, grosor)` | Un trozo de circulo de un angulo a otro, en grados (0 = derecha, 90 = arriba, y se cuenta al reves que las agujas del reloj). | `dibujar.arco(yo.x, yo.y, 30, 90, 180, "blanco", verdadero)` |
| `dibujar.enPantalla` | Lo mismo, pero en la PANTALLA, como la interfaz: (0, 0) es la esquina de abajo a la izquierda y no se mueve con la camara. | `dibujar.enPantalla.rectangulo(120, 500, 200, 16, "rojo", verdadero)` |
| `dibujar.enPantalla.linea(x1, y1, x2, y2, color, grosor)` | Una linea en la pantalla. | `dibujar.enPantalla.linea(0, 270, 960, 270, "blanco")` |
| `dibujar.enPantalla.circulo(x, y, radio, color, relleno)` | Un circulo en la pantalla. | `dibujar.enPantalla.circulo(60, 60, 30, "blanco")` |
| `dibujar.enPantalla.rectangulo(x, y, ancho, alto, color, relleno)` | Un rectangulo con el centro en (x, y) de la pantalla. | `dibujar.enPantalla.rectangulo(110, 500, 200, 16, "rojo", verdadero)` |
| `dibujar.enPantalla.texto(texto, x, y, color, tamano, letra)` | Un texto en la pantalla. | `dibujar.enPantalla.texto("Vida", 20, 500, "blanco")` |
| `dibujar.enPantalla.arco(x, y, radio, desde, hasta, color, relleno, grosor)` | Un trozo de circulo en la pantalla (quesito si relleno = verdadero). | `dibujar.enPantalla.arco(60, 60, 30, 90, 270, "gris", verdadero)` |
| `yo.ponerDelante()` | Se dibuja por encima de todos los demás (cambia su capa). | `yo.ponerDelante()` |
| `yo.ponerDetras()` | Se dibuja por debajo de todos los demás. | `yo.ponerDetras()` |
| `yo.ocultar()` | Deja de verse (sigue existiendo y chocando). | `yo.ocultar()` |
| `yo.aparecer()` | Vuelve a verse. | `yo.aparecer()` |
| `yo.parpadear(segundos, vecesPorSegundo)` | Se enciende y se apaga durante esos segundos (1 si no se dice) y al final se queda visible. | `yo.parpadear(1)` |
| `yo.pegarA(otro)` | Se pega a otro objeto (su «padre»): a partir de ahora se mueve con él. | `otro.pegarA(yo)` |
| `yo.soltar()` | Se despega de su padre y vuelve a moverse solo. | `yo.soltar()` |
| `yo.padre` | El objeto al que está pegado (o nulo). | `si yo.padre != nulo:` |
| `yo.hijos` | La lista de los objetos pegados a este. | `para cada h en yo.hijos:` |

### Sonido y música

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `sonido.reproducir("nombre", volumen, tono, lado)` | Reproduce un sonido del proyecto (importado, o hecho con el generador de efectos). | `sonido.reproducir("salto", 0.5)` |
| `sonido.bucle("nombre", volumen)` | Reproduce un sonido una y otra vez, hasta que se pare con sonido.parar("nombre"). | `sonido.bucle("motor", 0.4)` |
| `sonido.parar("nombre")` | Para un sonido (o todos, sin nombre). | `sonido.parar("motor")` |
| `sonido.sonando("nombre")` | Verdadero si ese sonido está sonando ahora. | `si sonido.sonando("motor"):` |
| `sonido.pausar()` | Congela TODO el sonido (efectos y música) sin perder por dónde iba. | `sonido.pausar()` |
| `sonido.seguir()` | Sigue el sonido que se había pausado con sonido.pausar(). | `sonido.seguir()` |
| `sonido.tono(frecuencia, segundos)` | Un pitido generado, sin archivos. | `sonido.tono(440, 0.2)` |
| `sonido.volumen` | Volumen de los efectos, de 0 a 1. | `sonido.volumen = 0.5` |
| `musica.reproducir("nombre", fundido)` | Pone una música en bucle (para la anterior). | `musica.reproducir("tema")` |
| `musica.parar(fundido)` | Para la música. | `musica.parar(2)` |
| `musica.pausar()` | Pone la música en pausa (recuerda por dónde iba). | `musica.pausar()` |
| `musica.seguir()` | Sigue la música por donde iba. | `musica.seguir()` |
| `musica.volumen` | Volumen de la música, de 0 a 1. | `musica.volumen = 0.3` |
| `musica.actual` | El nombre de la música que suena (o nulo). | `si musica.actual == nulo:` |

### Tiempo y temporizadores

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `cuando cada 2 segundos` | Se ejecuta una y otra vez, cada cierto tiempo. | `cuando cada 2 segundos:` |
| `cuando pasen 3 segundos` | Se ejecuta UNA sola vez, ese tiempo después de que aparezca el objeto. | `cuando pasen 3 segundos:` |
| `esperar(segundos)` | Pausa ESTE evento un rato, sin parar el juego. | `esperar(1)` |
| `cronometro()` | Un cronómetro nuevo, que empieza a contar ya. | `variable crono = cronometro()` |
| `tiempo.total` | Segundos que lleva funcionando el juego. | `mostrar(tiempo.total)` |
| `tiempo.escala` | La velocidad del tiempo: 1 = normal, 0.5 = cámara lenta, 2 = el doble de rápido, 0 = pausa. | `tiempo.escala = 0.5` |
| `tiempo.pausado` | Verdadero si el juego está en pausa (tiempo.pausar()). | `si tiempo.pausado:` |
| `tiempo.pausar()` | Pone el juego en pausa: todo se para (física, animaciones, cronómetros), pero las teclas siguen funcionando para poder quitarla. | `tiempo.pausar()` |
| `tiempo.seguir()` | Quita la pausa. | `tiempo.seguir()` |
| `tiempo.fps` | Fotogramas por segundo: cuántas veces por segundo se dibuja el juego (60 es lo normal). | `mostrar(tiempo.fps)` |

### Animaciones y partículas

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `yo.animar("nombre")` | Empieza una animación del proyecto. | `yo.animar("correr")` |
| `yo.animacion` | La animación que suena ahora (o nulo). | `yo.animacion = "correr"` |
| `yo.pararAnimacion()` | Para la animación (se queda en el fotograma actual). | `yo.pararAnimacion()` |
| `cuando termina la animacion` | Se ejecuta cuando termina una animación que no se repite. | `cuando termina la animacion:` |
| `particulas("tipo", x, y)` | Crea un efecto de partículas. | `particulas("explosion", yo.x, yo.y)` |

### Formas

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `yo.forma` | La forma del dibujo: "rectangulo", "circulo", "triangulo", "elipse", "poligono", "estrella", "rombo", "corazon", "flecha", "linea", "capsula", "redondeado", "anillo", "arco", "camino" o "texto". | `yo.forma = "corazon"` |
| `yo.lados` | Cuántos lados tiene un polígono (6 si no se dice) o cuántas puntas una estrella (5). | `yo.lados = 6` |
| `yo.radioInterior` | Lo grande que es el hueco de una estrella, un anillo o un arco, de 0 a 1 (0,5 en la estrella y 0,6 en el anillo). | `yo.radioInterior = 0.4` |
| `yo.radioEsquina` | En un rectángulo redondeado, el radio de las esquinas en píxeles. | `yo.radioEsquina = 12` |
| `yo.inicioArco` | Dónde empieza un arco, en grados (0 = derecha, 90 = arriba). | `yo.inicioArco = 0` |
| `yo.finArco` | Dónde termina un arco, en grados (180 si no se dice: medio anillo). | `yo.finArco = 270` |
| `yo.grosor` | Lo gorda que es una línea o un camino abierto, en píxeles. | `yo.grosor = 10` |
| `yo.formaColision` | Cómo choca: "auto" (con su forma, salvo los rectángulos), "caja" (como un rectángulo) o "figura" (con su forma, también girada). | `yo.formaColision = "caja"` |
| `yo.ponerCamino(puntos, cerrado)` | Le da una forma libre: una lista de puntos (vectores, desde su centro). | `yo.ponerCamino([vector(-50, 0), vector(0, 50), vector(50, 0)])` |

### Colores y estilo

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `yo.relleno` | Cómo se rellena la forma: "color" (lo normal), "degradado" (de color a color2), "radial" (degradado redondo, del centro hacia fuera), "patron" (rayas, puntos...) o "imagen" (una imagen repetida). | `yo.relleno = "degradado"` |
| `yo.color2` | El segundo color: el final de un degradado o el dibujo de un patrón. | `yo.color2 = "azul"` |
| `yo.anguloDegradado` | Hacia dónde va el degradado, en grados: 0 = de izquierda a derecha, 90 = de abajo arriba (lo normal). | `yo.anguloDegradado = 45` |
| `yo.patron` | El dibujo del relleno "patron": "rayas", "puntos", "cuadros", "rombos", "ondas" o "ladrillos" (con color de fondo y color2 de dibujo). | `yo.patron = "puntos"` |
| `yo.imagenRelleno` | La imagen del proyecto que se repite dentro de la forma, con relleno "imagen". | `yo.imagenRelleno = "jugador"` |
| `yo.borde` | El grosor del borde en píxeles (0 = sin borde). | `yo.borde = 3` |
| `yo.colorBorde` | El color del borde (negro si no se dice). | `yo.colorBorde = "blanco"` |
| `yo.bordeDiscontinuo` | Si es verdadero, el borde es a rayitas (como una línea de recortar). | `yo.bordeDiscontinuo = verdadero` |
| `yo.sombra` | El color de la sombra (con algo de transparencia queda mejor: "#00000088"). | `yo.sombra = verdadero` |
| `yo.sombraX` | Cuánto se aparta la sombra hacia la derecha, en píxeles (6). | `yo.sombraX = 12` |
| `yo.sombraY` | Cuánto se aparta la sombra hacia arriba, en píxeles (-6: hacia abajo). | `yo.sombraY = -12` |
| `yo.desenfoqueSombra` | Lo borrosa que es la sombra (0 = con bordes duros). | `yo.desenfoqueSombra = 20` |
| `yo.resplandor` | Un brillo alrededor del objeto, de ese color (nulo lo quita). | `yo.resplandor = "cian"` |
| `yo.tamanoResplandor` | Lo grande que es el resplandor, en píxeles (16). | `yo.tamanoResplandor = 30` |
| `yo.mezcla` | Cómo se junta con lo que hay detrás: "normal", "sumar" (luz que se suma: fuego, magia), "multiplicar" (sombras), "pantalla", "superponer", "oscurecer", "aclarar" o "diferencia". | `yo.mezcla = "multiplicar"` |
| `paleta("nombre", n)` | Los colores de una paleta lista ("pastel", "retro", "neon", "natural", "oceano", "fuego", "bosque", "caramelo", "grises", "arcoiris"). | `yo.color = paleta("pastel", 2)` |
| `mezclarColores(color1, color2, cuanto)` | El color que sale de mezclar dos: con 0 da el primero, con 1 el segundo y con 0.5 el de en medio. | `yo.color = mezclarColores("rojo", "azul", 0.5)` |

### Efectos especiales

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `efecto.explosion(sitio, tamaño)` | Una explosión: fuego, humo, un destello y una onda. | `efecto.explosion(yo, 2)` |
| `efecto.fuego(sitio, segundos)` | Fuego que no se apaga (o que dura esos segundos). | `efecto.fuego(yo, 3)` |
| `efecto.humo(sitio, segundos)` | Humo que sube y se deshace. | `efecto.humo(yo)` |
| `efecto.chispas(sitio)` | Un puñado de chispas que brillan. | `efecto.chispas(yo)` |
| `efecto.rayo(desde, hasta, color)` | Un rayo eléctrico en zigzag entre dos sitios (si son objetos, los sigue). | `efecto.rayo(yo, jugador)` |
| `efecto.estela(objeto, segundos)` | Una estela detrás del objeto: copias de él que se apagan (para cosas que van rápido). | `efecto.estela(yo, 2)` |
| `efecto.onda(sitio, radio)` | Una onda expansiva: un anillo que crece y se apaga. | `efecto.onda(yo, 150)` |
| `efecto.destello(sitio, tamaño)` | Un destello de luz redondo, muy rápido. | `efecto.destello(yo)` |
| `efecto.lluvia(intensidad)` | Lluvia por toda la pantalla. | `efecto.lluvia()` |
| `efecto.nieve(intensidad)` | Nieve cayendo por toda la pantalla (0 la para). | `efecto.nieve(2)` |
| `efecto.hojas(intensidad)` | Hojas de otoño cayendo y girando (0 las para). | `efecto.hojas(2)` |
| `efecto.burbujas(sitio, segundos)` | Burbujas que suben haciendo eses. | `efecto.burbujas(yo, 5)` |
| `efecto.confeti(sitio)` | Confeti de colores, para celebrar. | `efecto.confeti(yo)` |
| `efecto.sangre(sitio)` | Gotas de sangre. | `efecto.sangre(yo)` |
| `efecto.tinta(sitio)` | Una salpicadura de tinta de colores. | `efecto.tinta(yo)` |
| `efecto.polvo(objeto)` | Polvo a los pies del objeto (al saltar o al caer). | `efecto.polvo(yo)` |
| `efecto.golpe(objeto, daño)` | Un golpe: chispitas y el número de daño, que sube y se desvanece. | `efecto.golpe(jugador, 10)` |
| `efecto.texto("texto", sitio, color)` | Un texto que sube y se desvanece: "+1", "¡Bien!"... | `efecto.texto("+1", yo, "amarillo")` |
| `efecto.usar("nombre", sitio, segundos)` | Un efecto hecho por ti en el editor de partículas (Proyecto > Efectos). | `efecto.usar("chispas", yo)` |
| `efecto.parar("nombre", sitio)` | Para los efectos que duran: los de ese nombre (y de ese objeto, si se dice), o todos si no se dice nada. | `efecto.parar("fuego", yo)` |
| `efecto.suave` | Versión suave para los más pequeños: si es verdadero (lo normal), la sangre sale como tinta de colores. | `efecto.suave = falso` |
| `yo.polvo` | Si es verdadero, levanta polvo al saltar y al caer al suelo (necesita física). | `yo.polvo = verdadero` |
| `yo.efecto` | El efecto que lleva siempre puesto: "fuego", "humo", "burbujas" o "estela" (nulo lo quita). | `yo.efecto = "humo"` |

### Efectos de pantalla y de objeto

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `tiempo.congelar(segundos)` | Congela el juego un instante (0,08 segundos si no se dice): al dar un golpe fuerte, se nota mucho más. | `tiempo.congelar(0.08)` |
| `pantalla.flash(color, segundos)` | Toda la pantalla de un color (blanco si no se dice) que se apaga enseguida: golpes fuertes, rayos, fotos. | `pantalla.flash()` |
| `pantalla.normal()` | Quita todos los filtros de pantalla. | `pantalla.normal()` |
| `pantalla.grises` | Escala de grises: 0 = colores normales, 1 = blanco y negro. | `pantalla.grises = 1` |
| `pantalla.desenfoque` | Todo borroso (en píxeles). | `pantalla.desenfoque = 3` |
| `pantalla.pixelado` | Todo con «píxeles gordos» de ese tamaño (1 = normal). | `pantalla.pixelado = 3` |
| `pantalla.brillo` | El brillo de todo: 1 = normal, 0.5 = más oscuro, 1.5 = más claro. | `pantalla.brillo = 1.3` |
| `pantalla.vineta` | Viñeta: los bordes de la pantalla más oscuros, de 0 a 1. | `pantalla.vineta = 0.5` |
| `pantalla.aberracion` | Aberración cromática: los colores se separan un poco (píxeles). | `pantalla.aberracion = 4` |
| `pantalla.crt` | Efecto de tele antigua: rayas, bordes oscuros y colores algo separados. | `pantalla.crt = verdadero` |
| `pantalla.bloom` | Lo brillante deja un halo de luz alrededor, de 0 a 1 (fuego, neón, magia). | `pantalla.bloom = 0.5` |
| `yo.contorno` | Una línea de color alrededor de todo el objeto (nulo la quita). | `yo.contorno = "blanco"` |
| `yo.grosorContorno` | Lo gordo que es el contorno, en píxeles (3). | `yo.grosorContorno = 5` |
| `yo.brillo` | El brillo del objeto: 1 = normal, 0.5 = más oscuro, 2 = el doble de claro. | `yo.brillo = 1.5` |
| `yo.grises` | El objeto en escala de grises, de 0 (colores) a 1 (blanco y negro). | `yo.grises = 1` |
| `yo.desenfoque` | El objeto borroso (en píxeles): cosas lejanas, fantasmas... | `yo.desenfoque = 3` |
| `yo.flash(color, segundos)` | El objeto entero de un color (blanco si no se dice) un momento: al recibir un golpe. | `yo.flash("rojo", 0.15)` |

### Luces y oscuridad

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `escena.oscuridad` | Oscuridad de la escena, de 0 (de día: no hacen falta luces) a 1 (negro donde no llega ninguna luz). | `escena.oscuridad = 0.8` |
| `escena.luzAmbiente` | El color de la oscuridad (negro si no se dice). | `escena.luzAmbiente = "#0a1030"` |
| `yo.luz` | Si es verdadero, el objeto lleva una luz (se ve cuando la escena tiene oscuridad). | `yo.luz = verdadero` |
| `yo.tipoLuz` | "punto" (alumbra alrededor, como una antorcha) o "foco" (un cono hacia donde mira el objeto, como una linterna). | `yo.tipoLuz = "foco"` |
| `yo.colorLuz` | El color de la luz (blanca si no se dice): tiñe un poco lo que ilumina. | `yo.colorLuz = "naranja"` |
| `yo.radioLuz` | Hasta dónde llega la luz, en píxeles (220). | `yo.radioLuz = 300` |
| `yo.intensidadLuz` | Lo fuerte que es la luz, de 0 (apagada) a 1 (normal); más de 1 llega más lejos. | `yo.intensidadLuz = 0.6` |
| `yo.anguloLuz` | En un foco: lo abierto que es el cono, en grados (60). | `yo.anguloLuz = 40` |
| `yo.luzConSombras` | Si es verdadero, lo sólido tapa la luz y hace sombra (las paredes de un laberinto). | `yo.luzConSombras = verdadero` |
| `yo.parpadeoLuz` | La luz tiembla como una llama, de 0 (quieta) a 1 (mucho). | `yo.parpadeoLuz = 0.5` |

### Letras, dibujo y azar que se repite

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `yo.letra` | El tipo de letra de su texto. | `yo.letra = "pixel"` |
| `dibujar.elipse(x, y, ancho, alto, color, relleno)` | Un círculo aplastado con su centro en (x, y): ancho y alto es lo que mide entera. | `dibujar.elipse(yo.x, yo.y, 120, 60, "verde")` |
| `dibujar.poligono(puntos, color, relleno, grosor)` | Una forma con los puntos que quieras: una lista de vectores, en orden (se cierra sola). | `dibujar.poligono([vector(0, 0), vector(100, 0), vector(50, 80)], "amarillo")` |
| `dibujar.enPantalla.elipse(x, y, ancho, alto, color, relleno)` | Una elipse en la pantalla, con el centro en (x, y). | `dibujar.enPantalla.elipse(480, 60, 300, 40, "blanco")` |
| `dibujar.enPantalla.poligono(puntos, color, relleno, grosor)` | Una forma con los puntos que quieras (una lista de vectores) en la pantalla. | `dibujar.enPantalla.poligono([vector(20, 20), vector(60, 20), vector(40, 55)], "rojo")` |
| `semilla(numero)` | Hace que el azar SE REPITA: con la misma semilla, aleatorio(), elegir(), probabilidad() y lista.mezclar() dan siempre lo mismo y en el mismo orden. | `semilla(1234)` |

### Controles de interfaz

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `yo.valor` | En un CONTROL de interfaz, lo que vale: el número de una barra, un deslizador o un icono con contador; verdadero o falso en una casilla; el texto de un campo; la opción elegida de una lista o un menú; lo que hay en la casilla elegida de un inventario. | `buscar("Barra").valor = 40` |
| `cuando cambia` | En el script de un CONTROL de interfaz: se ejecuta cuando quien juega cambia lo que vale (mueve el deslizador, marca la casilla, escribe en el campo, elige en la lista o pulsa una opción del menú). | `cuando cambia:` |
| `yo.minimo` | En una barra o un deslizador: el valor más bajo (0 si no se dice). | `buscar("Deslizador").minimo = 10` |
| `yo.maximo` | En una barra o un deslizador: el valor más alto (100 si no se dice). | `buscar("Barra").maximo = 200` |
| `yo.opciones` | En una lista o un menú: sus opciones, una lista de textos. | `buscar("Menu").opciones = ["Jugar", "Salir"]` |
| `yo.elegido` | En una lista, un menú o un inventario: el número de la opción (o la casilla) elegida. | `buscar("Lista").elegido = 2` |
| `yo.activado` | En un control: si se puede usar. | `buscar("Casilla").activado = falso` |
| `yo.titulo` | En una ventana: lo que pone en su barra de arriba. | `buscar("Ventana").titulo = "Tienda"` |
| `yo.abrir()` | Enseña un control con todo lo que lleva dentro (sus hijos: lo pegado a él con pegarA). | `buscar("Ventana").abrir()` |
| `yo.cerrar()` | Esconde un control con todo lo que lleva dentro. | `buscar("Ventana").cerrar()` |
| `yo.enfocar()` | En un campo de texto: empieza a escribir en él, como si se hiciera clic. | `buscar("Campo").enfocar()` |
| `yo.meter("cosa", cantidad)` | En un inventario: mete esa cosa (una si no se dice cuántas). | `buscar("Inventario").meter("llave")` |
| `yo.sacar("cosa", cantidad)` | En un inventario: saca esa cosa (una si no se dice cuántas). | `buscar("Inventario").sacar("llave")` |
| `yo.cuantos("cosa")` | En un inventario: cuántas hay de esa cosa. | `mostrar(buscar("Inventario").cuantos("moneda"))` |
| `yo.vaciar()` | En un inventario: lo deja vacío. | `buscar("Inventario").vaciar()` |

## Nivel 4: Avanzado

### Mensajes entre objetos y datos globales

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `enviar("mensaje", dato)` | Avisa a todos los objetos que tengan 'cuando recibo "mensaje"'. | `enviar("abrir_puerta")` |
| `cuando recibo "mensaje"` | Se ejecuta cuando alguien hace enviar("mensaje") en cualquier script (le llega a TODOS los que lo escuchen, al empezar el siguiente fotograma). | `cuando recibo "abrir_puerta":` |
| `dato` | Dentro de 'cuando recibo': lo que se envio junto al mensaje con enviar("mensaje", dato). | `yo.vida -= dato` |
| `juego` | Datos compartidos por todos los scripts (puntos, vidas...). | `juego.puntos += 1` |
| `aLaVez(funcion, valores...)` | Empieza a ejecutar una funcion POR SU CUENTA, como si fuera otro evento: quien la llama sigue sin esperar a que acabe. | `aLaVez(lluvia, 10)` |

### Ir a sitios esquivando paredes

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `yo.irHacia(destino, rapidez)` | Va hasta un sitio o detras de un objeto (lo sigue aunque se mueva), RODEANDO las paredes del mapa de casillas si el juego se ve desde arriba. | `yo.irHacia(jugador, 120)` |
| `yo.parar()` | Deja de ir a donde iba (irHacia, irA) y se queda quieto. | `yo.parar()` |
| `yo.yendo` | Verdadero mientras va hacia el sitio de yo.irHacia(). | `si no yo.yendo:` |
| `yo.atravesar("Nombre")` | Deja de chocar con los objetos de ese nombre, tipo o etiqueta: pasa a traves de ellos. | `yo.atravesar("Enemigo")` |
| `yo.dejarDeAtravesar("Nombre")` | Vuelve a chocar con los objetos de ese nombre, tipo o etiqueta. | `yo.dejarDeAtravesar("Enemigo")` |

### Rayos y diálogos

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `rayo(desde, direccion, largo)` | Lanza una linea invisible y dice lo primero que toca (un objeto con colision o una casilla solida), o nulo. | `variable r = rayo(yo, jugador, 400)` |
| `dialogo("quien", "texto", opciones)` | Una caja de dialogo abajo de la pantalla: el texto sale letra a letra y se pasa con espacio, intro o clic. | `dialogo("Ana", "Hola")` |

### Animar valores

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `animar(sitio, hasta, segundos, suavizado)` | Cambia algo POCO A POCO hasta un valor en esos segundos (0.5 si no se dice): la posición, el tamaño, el giro, la opacidad, un color... | `animar(yo.x, 300, 1)` |
| `interpolar(desde, hasta, cuanto)` | Un valor entre dos: con 0 da el primero, con 1 el segundo, con 0.5 el de en medio. | `yo.x = interpolar(yo.x, raton.x, 0.1)` |
| `ruido(x, y)` | Un número entre 0 y 1 «al azar pero suave»: cambia poco a poco al cambiar x. | `yo.y = 200 + ruido(tiempo.total) * 100` |

### Efectos: fundidos, sonidos y cámara lenta

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `pantalla.oscurecer(segundos, color, cuanto)` | Fundido: la pantalla se va poniendo de un color (negro si no se dice) durante esos segundos. | `pantalla.oscurecer(1)` |
| `pantalla.aclarar(segundos)` | Quita el fundido poco a poco. | `pantalla.aclarar(1)` |
| `sonido.efecto("nombre", volumen, tono)` | Un efecto de sonido que se GENERA solo, sin archivos: disparo, laser, explosion, golpe, salto, moneda, poder, dash, escudo, hielo, fuego, rayo, subir, perder, clic, alarma, dano. | `sonido.efecto("explosion")` |
| `tiempo.camaraLenta(velocidad, segundos)` | Cámara lenta durante un rato y luego vuelve sola a la normalidad. | `tiempo.camaraLenta(0.3, 1)` |

### Mando, móvil y web

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `mando.conectado` | Verdadero si hay un mando conectado. | `si mando.conectado:` |
| `mando.ejeX` | La palanca izquierda de lado: de -1 (izquierda) a 1 (derecha). | `yo.x += mando.ejeX * 300 * delta` |
| `mando.ejeY` | La palanca izquierda de arriba abajo: de -1 (abajo) a 1 (arriba). | `yo.y += mando.ejeY * 300 * delta` |
| `mando.ejeDerechoX` | La palanca derecha de lado (de -1 a 1). | `mostrar(mando.ejeDerechoX)` |
| `mando.ejeDerechoY` | La palanca derecha de arriba abajo (de -1 a 1). | `mostrar(mando.ejeDerechoY)` |
| `mando.pulsado("boton")` | Verdadero mientras el boton esta pulsado. | `si mando.pulsado("a"):` |
| `mando.sePulso("boton")` | Verdadero solo en el fotograma en que se pulsa el boton. | `si mando.sePulso("a"):` |
| `mando.vibrar(segundos, fuerza)` | Hace vibrar el mando (fuerza de 0 a 1). | `mando.vibrar(0.3)` |
| `sistema.movil` | Verdadero si se está jugando en un móvil o una tableta (con pantalla táctil). | `si sistema.movil:` |
| `sistema.abrirWeb("direccion")` | Abre una página web en otra pestaña (por ejemplo, la de tu juego en itch.io). | `sistema.abrirWeb("https://itch.io")` |

### Guardar datos

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `guardar("clave", valor)` | Guarda un dato del jugador en el navegador (se conserva al cerrar el juego): récords, niveles, opciones... | `guardar("record", puntos)` |
| `cargar("clave", porDefecto)` | Lee un dato guardado con guardar(). | `variable record = cargar("record", 0)` |
| `borrarGuardado("clave")` | Borra un dato guardado. | `borrarGuardado("record")` |

### Juntas: cuerdas, muelles y bisagras

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `junta.cuerda(objeto, otro, largo, color)` | Una cuerda: no deja que se separen más de su largo (si no se dice, lo lejos que están ahora). | `junta.cuerda(yo, vector(400, 500), 200)` |
| `junta.muelle(objeto, otro, largo, rigidez, color)` | Un muelle: tira hacia su largo, más fuerte cuanto más lejos, y se queda botando. | `junta.muelle(yo, vector(400, 500), 120)` |
| `junta.bisagra(objeto, eje, color)` | Una bisagra: el objeto se queda siempre a la misma distancia del eje (un punto u otro objeto) y gira a su alrededor, como una puerta, un péndulo rígido o un balancín. | `junta.bisagra(yo, vector(400, 300))` |
| `junta.quitar(objeto, otro)` | Suelta las juntas de un objeto: todas, o solo las que lo unen con otro. | `junta.quitar(yo)` |
| `junta.visibles` | Si las juntas se dibujan (verdadero, lo normal) o no (falso: para dibujarlas a tu manera). | `junta.visibles = falso` |

### Pantalla dividida y varias cámaras

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `pantalla.dividir(cuantas, como)` | Divide la pantalla en 2, 3 o 4 trozos, cada uno con su cámara (escena.camaraDe(2)...): para jugar varios en el mismo ordenador. | `pantalla.dividir(2, "filas")` |
| `escena.camaraDe(numero)` | Con la pantalla dividida (pantalla.dividir), la cámara de ese trozo: la 1 es la de siempre (escena.camara), la 2 la del segundo trozo... | `escena.camaraDe(1).seguir(yo)` |

### Sonido con sitio y música que cambia

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `sonido.reproducirEn("nombre", sitio, alcance, volumen)` | Reproduce un sonido EN UN SITIO del mundo (un objeto o un vector): suena más flojo cuanto más lejos está del oyente, y por el altavoz del lado donde está. | `sonido.reproducirEn("salto", yo, 900)` |
| `sonido.bucleEn("nombre", sitio, alcance, volumen)` | Un sonido que no para, pegado a un objeto o a un punto: una cascada, un motor, una hoguera. | `sonido.bucleEn("salto", yo, 600)` |
| `sonido.ponerVolumen("nombre", volumen, segundos)` | Cambia el volumen de un sonido QUE YA ESTÁ SONANDO (de 0 a 1). | `sonido.ponerVolumen("salto", 0.2, 1)` |
| `sonido.ponerTono("nombre", tono, segundos)` | Cambia el tono (y la velocidad) de un sonido que ya está sonando: 1 = normal, 2 = más agudo y rápido. | `sonido.ponerTono("salto", 1.5)` |
| `sonido.ponerPan("nombre", lado, segundos)` | Por qué lado suena un sonido que ya está sonando: -1 = izquierda, 0 = centro, 1 = derecha. | `sonido.ponerPan("salto", -1)` |
| `sonido.oyente` | Quién escucha los sonidos con sitio (sonido.reproducirEn, sonido.bucleEn): un objeto, o nulo para que sea el centro de la cámara (lo normal). | `sonido.oyente = yo` |
| `musica.cruzar("nombre", segundos)` | Pasa a otra música CRUZÁNDOLAS: la que suena baja mientras la nueva sube (2 segundos si no se dice). | `musica.cruzar("tema", 2)` |
| `musica.capa(numero, volumen, segundos)` | Sube o baja UNA capa de la música que suena. | `musica.capa(1, 0.5, 2)` |
| `musica.intensidad` | Música adaptativa con un solo número: con 0 solo suena la primera capa, con 1 todas, y en medio van entrando una a una. | `musica.intensidad = 0.5` |
| `musica.tono` | La velocidad de la música (y su tono): 1 = normal, 1.2 = más rápida y aguda, 0.8 = más lenta y grave. | `musica.tono = 1.2` |

### Pantallas listas y tabla de puntuaciones

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `puntuaciones.guardar("nombre", puntos)` | Apunta una puntuación en la tabla. | `puntuaciones.guardar("Ana", 1200)` |
| `puntuaciones.lista()` | Las mejores puntuaciones, de mayor a menor: una lista de tablas con nombre y puntos. | `mostrar(puntuaciones.lista())` |
| `puntuaciones.entra(puntos)` | Verdadero si esos puntos entrarían en la tabla (hay hueco, o superan a la última). | `mostrar(puntuaciones.entra(500))` |
| `puntuaciones.borrar()` | Deja la tabla vacía. | `puntuaciones.borrar()` |

### Varios jugadores en el mismo ordenador

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `controles(jugador)` | Los controles de un jugador (del 1 al 4), para jugar varios en el mismo ordenador. | `mostrar(controles(2).pulsado("a"))` |
| `yo.moverConJugador(numero, rapidez)` | Como moverConFlechas, pero con los controles de UN jugador (del 1 al 4): su trozo del teclado o su mando. | `yo.moverConJugador(2, 300)` |
| `controles(1).x` | Hacia qué lado quiere ir: -1 izquierda, 0 quieto, 1 derecha (con la palanca del mando, valores intermedios). | `yo.x += controles(1).x * 200 * delta` |
| `controles(1).y` | Hacia arriba (1) o hacia abajo (-1). | `yo.y += controles(1).y * 200 * delta` |
| `controles(1).pulsado("control")` | Verdadero mientras ese jugador tiene pulsado ese control ("a", "b", "arriba"...). | `mostrar(controles(1).pulsado("b"))` |
| `controles(1).sePulso("control")` | Verdadero solo en el fotograma en que lo pulsa (para saltar o disparar una vez). | `mostrar(controles(2).sePulso("a"))` |
| `controles(1).seSolto("control")` | Verdadero solo en el fotograma en que lo suelta. | `mostrar(controles(1).seSolto("a"))` |
| `controles(1).mando` | Verdadero si ese jugador tiene un mando conectado (el primer mando es del jugador 1, el segundo del 2...). | `mostrar(controles(1).mando)` |
| `controles(1).ponerTecla("control", "tecla")` | Cambia la tecla de uno de sus controles. | `controles(1).ponerTecla("a", "m")` |
| `escena.camara.encuadrar(objetos, margen)` | PANTALLA COMPARTIDA: la cámara se pone en medio de esos objetos (una lista) y se aleja lo justo para que se vean todos, con un margen alrededor (120 si no se dice). | `escena.camara.encuadrar([yo, buscar("Jugador")])` |

### Jugar con el dedo

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `tactil.joystick(lado)` | Pone una palanca en la pantalla, a la "izquierda" (si no se dice) o a la "derecha". | `tactil.joystick()` |
| `tactil.boton("nombre", "tecla")` | Pone un botón en la pantalla con ese nombre (12 letras como mucho). | `tactil.boton("Saltar", "espacio")` |
| `tactil.pulsado("nombre")` | Verdadero mientras se tiene el dedo en ese botón. | `si tactil.pulsado("Fuego"):` |
| `tactil.sePulso("nombre")` | Verdadero solo en el fotograma en que se toca ese botón (una vez por toque). | `si tactil.sePulso("Fuego"):` |
| `tactil.seSolto("nombre")` | Verdadero solo en el fotograma en que se levanta el dedo de ese botón. | `si tactil.seSolto("Cargar"):` |
| `tactil.x` | Cuánto está inclinada la palanca a los lados: de -1 (izquierda) a 1 (derecha). | `yo.x += tactil.x * 300 * delta` |
| `tactil.y` | Cuánto está inclinada la palanca arriba o abajo: de -1 (abajo) a 1 (arriba). | `yo.y += tactil.y * 300 * delta` |
| `tactil.mover("nombre", x, y)` | Pone un control ("joystick" o el nombre de un botón) en un sitio de la pantalla: x de 0 (izquierda) a 100 (derecha) e y de 0 (abajo) a 100 (arriba). | `tactil.mover("Saltar", 85, 20)` |
| `tactil.quitar("nombre")` | Quita un control ("joystick" o un botón). | `tactil.quitar("Saltar")` |
| `tactil.colocar()` | Abre el modo colocar: quien juega arrastra cada control a donde le venga bien y pulsa «Listo». | `tactil.colocar()` |
| `tactil.mostrar` | Cuándo se ven los controles: "auto" (solo cuando se juega con el dedo: lo normal), "siempre" o "nunca". | `tactil.mostrar = "siempre"` |
| `tactil.tamano` | El tamaño de los controles: 1 = normal, de 0.5 (la mitad) a 2 (el doble). | `tactil.tamano = 1.3` |
| `tactil.opacidad` | Cuánto se ven los controles: de 0.1 (casi nada) a 1 (del todo). | `tactil.opacidad = 0.4` |
| `tactil.hay` | Verdadero si el aparato se maneja con el dedo (un móvil, una tableta) o se está tocando la pantalla ahora. | `si tactil.hay:` |

### Gestos, mirar y vibrar

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `tactil.gesto` | El gesto que se ha hecho con el dedo en este fotograma: "toque", "doble" (dos toques seguidos), "largo" (dedo quieto), "arriba", "abajo", "izquierda" o "derecha" (deslizar). | `si tactil.gesto == "toque":` |
| `tactil.pellizco` | Pellizcar con dos dedos: cuánto se han separado en este fotograma. | `escena.camara.zoom = escena.camara.zoom * tactil.pellizco` |
| `tactil.dedos` | Cuántos dedos están tocando la pantalla del juego ahora. | `si tactil.dedos == 2:` |
| `tactil.toques` | Dónde está cada dedo que toca la pantalla, en el mundo: una lista de vectores (vacía si no hay ninguno). | `para cada dedo en tactil.toques:` |
| `tactil.mirar()` | Activa «arrastrar para mirar»: lo que se mueve el dedo por la pantalla (fuera de los controles) se lee en tactil.miraX y tactil.miraY. | `tactil.mirar()` |
| `tactil.miraX` | Con tactil.mirar(): cuánto se ha movido el dedo a los lados en este fotograma, en píxeles del juego (positivo = a la derecha). | `escena.camara.x -= tactil.miraX` |
| `tactil.miraY` | Con tactil.mirar(): cuánto se ha movido el dedo arriba o abajo en este fotograma (positivo = hacia arriba). | `escena.camara.y -= tactil.miraY` |
| `tactil.vibrar(segundos)` | Hace vibrar el móvil (0,1 segundos si no se dice; como mucho 5). | `tactil.vibrar(0.2)` |

### Calidad, batería y cómo se sujeta el móvil

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `pantalla.calidad` | La calidad con la que se pinta el juego: "auto" (la que aguante el aparato: si va a trompicones se baja sola, y si va sobrado vuelve a subir), "alta", "media" o "baja". | `pantalla.calidad = "auto"` |
| `pantalla.nivelCalidad` | La calidad que hay puesta ahora mismo: "alta", "media" o "baja" (con pantalla.calidad = "auto" puede ir cambiando). | `mostrar(pantalla.nivelCalidad)` |
| `pantalla.maximoFps` | Cuántos fotogramas por segundo se pintan como mucho (0 = los que dé la pantalla). | `pantalla.maximoFps = 30` |
| `pantalla.orientacion` | Cómo hay que tener el móvil para jugar: "horizontal" (tumbado), "vertical" (de pie) o "cualquiera". | `pantalla.orientacion = "horizontal"` |

### Primera persona: el mundo desde dentro

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `vista3d.ver(objeto)` | Pone la vista en primera persona: el mundo se ve desde ese objeto (desde yo, si no se dice), mirando hacia donde apunta su rotación. | `vista3d.ver(yo)` |
| `vista3d.quitar()` | Vuelve a la vista normal, desde arriba (por ejemplo, para enseñar el mapa entero). | `vista3d.quitar()` |
| `vista3d.activa` | Verdadero si se está viendo en primera persona (solo se lee: se pone con vista3d.ver y se quita con vista3d.quitar). | `si vista3d.activa:` |
| `vista3d.observador` | El objeto desde el que se mira, o nulo si la vista no está puesta (solo se lee). | `si vista3d.observador == yo:` |
| `vista3d.campo` | Cuánto se ve a lo ancho, en grados: de 30 (como con unos prismáticos) a 120 (ojo de pez). | `vista3d.campo = 80` |
| `vista3d.altura` | A qué altura están los ojos: de 0.05 (pegados al suelo) a 0.95 (pegados al techo). | `vista3d.altura = 0.3` |
| `vista3d.inclinacion` | Mirar hacia arriba (positivo) o hacia abajo (negativo): de -1 a 1. | `vista3d.inclinacion = 0.2` |
| `vista3d.brillo` | La luz de todo lo que se ve en 3D: 1 = normal, 0 = a oscuras, hasta 3. | `vista3d.brillo = 1.5` |
| `vista3d.suelo("imagen o color")` | Con qué se pinta el suelo donde el mapa no tiene casilla: una imagen del proyecto (se repite en cada casilla) o un color. | `vista3d.suelo("gris")` |
| `vista3d.techo("imagen o color")` | Con qué se pinta el techo: una imagen del proyecto o un color. | `vista3d.techo("#222233")` |
| `vista3d.cielo("imagen")` | Un cielo en vez de techo: una imagen ancha que da la vuelta entera al girar y nunca se acerca (para sitios al aire libre). | `vista3d.cielo()` |
| `vista3d.pared("tipo", "imagen")` | Cambia la imagen con la que se pinta un tipo de casilla del mapa en primera persona (si no se dice, la del mapa). | `vista3d.pared("suelo", "jugador")` |
| `vista3d.niebla("color", desde, hasta)` | Niebla con la distancia: a «desde» píxeles empieza a notarse y a «hasta» ya solo se ve el color de la niebla. | `vista3d.niebla("negro", 200, 900)` |
| `vista3d.mapa(objeto)` | Elige qué mapa de casillas hace de paredes, si en la escena hay más de uno (si no se dice, el primero que tenga casillas sólidas). | `vista3d.mapa(mapa)` |
| `vista3d.enPantalla(objeto, altura)` | En qué punto de la pantalla se ve un objeto (o una posición) en primera persona: un vector, como los de dibujar.enPantalla; o nulo si queda detrás de ti. | `variable p = vista3d.enPantalla(jugador)` |
| `vista3d.seVe(objeto)` | Verdadero si ese objeto (o esa posición) se ve ahora mismo en la pantalla: está delante y no lo tapa una pared. | `si vista3d.seVe(jugador):` |
| `vista3d.columnas` | Cuántas columnas tiene la imagen en 3D (cada una es un rayo). | `vista3d.columnas = 320` |
| `vista3d.milisegundos` | Lo que ha tardado en pintarse la vista 3D en el último fotograma, en milésimas de segundo (solo se lee). | `mostrar(vista3d.milisegundos)` |
| `yo.elevacion` | Cuánto está levantado del suelo, en píxeles. | `yo.elevacion = 20` |

### Puertas en los mapas

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `mapa.abrirPuerta(columna, fila, segundos)` | Solo en mapas: abre la puerta de esa casilla poco a poco (0,6 segundos si no se dice). | `mapa.abrirPuerta(20, 20)` |
| `mapa.cerrarPuerta(columna, fila, segundos)` | Solo en mapas: cierra la puerta de esa casilla poco a poco. | `mapa.cerrarPuerta(20, 20)` |
| `mapa.puertaAbierta(columna, fila)` | Solo en mapas: verdadero si la puerta de esa casilla está abierta lo bastante para pasar. | `si mapa.puertaAbierta(20, 20):` |
| `mapa.esPuerta(columna, fila)` | Solo en mapas: verdadero si en esa casilla hay una puerta (abierta o cerrada). | `si mapa.esPuerta(20, 20):` |

### Mirar con el ratón y con el mando

| Comando | Qué hace | Ejemplo |
|---|---|---|
| `mando.comoTeclado` | Si es verdadero (lo normal), el mando hace de teclado: la palanca y la cruceta son las flechas, A es espacio, B es "x"... | `mando.comoTeclado = falso` |
| `raton.capturado` | Si es verdadero, el juego se queda con el ratón: la flecha desaparece y no se sale de la pantalla, y lo que se mueve se lee en raton.movX y raton.movY. | `raton.capturado = verdadero` |
| `raton.movX` | Cuánto se ha movido el ratón a los lados en este fotograma, en píxeles (positivo = a la derecha). | `yo.rotacion -= raton.movX * 0.2` |
| `raton.movY` | Cuánto se ha movido el ratón arriba o abajo en este fotograma, en píxeles (positivo = hacia arriba). | `yo.y += raton.movY` |
