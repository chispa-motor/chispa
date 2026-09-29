# Manual de Chispa

Todo lo que se puede escribir en Chispa, con una explicación sencilla y un ejemplo corto.

> Este manual se genera solo a partir de la ayuda del editor (la que sale al pasar el ratón y en la pestaña **Guía**), así que los dos dicen siempre lo mismo. **No lo edites a mano**: cambia las fichas en `src/chispa/api/documentacion.ts` y ejecuta `npm run manual`.

**Índice:** 1. Lo básico · 2. Palabras del lenguaje · 3. Eventos · 4. Variables especiales · 5. Funciones · 6. Objetos · 7. Mapas de casillas · 8. Módulos · 9. Listas, textos, tablas y vectores · 10. Nombres (teclas, colores, partículas) · 11. Cuando algo sale mal · 12. Recetas

## 1. Lo básico

### Cómo se escribe Chispa

- Cada objeto de la escena puede tener un **script** (un archivo `.chs`) que dice qué hace.
- Una instrucción por línea. No hace falta `;` al final.
- Las líneas que abren un bloque (`si`, `mientras`, `repetir`, `para cada`, `funcion`, `cuando`) terminan en **dos puntos `:`**, y lo que va dentro lleva **4 espacios más** al principio (la *sangría*). El editor los pone solo al pulsar Intro.
- Todo lo que va detrás de `#` es un **comentario**: una nota para ti que el juego no lee.
- Las mayúsculas no importan: `Vida` y `vida` son lo mismo.
- La forma oficial va **sin tildes** (`funcion`, `rotacion`). Si pones tildes también funciona. La **ñ** sí se escribe (`añadir`, `tamaño`).

```
# Esto es un comentario
variable vidas = 3

cuando se pulsa "espacio":
    vidas -= 1
    si vidas == 0:
        mostrar("Has perdido")
```

### Los valores

| Tipo | Ejemplos | Para qué |
|---|---|---|
| número | `5`, `-3`, `2.5` | Cuentas, posiciones, velocidades. Los decimales llevan **punto**. |
| texto | `"Hola"` | Palabras y frases, entre comillas. |
| lógico | `verdadero`, `falso` | Sí o no. |
| nulo | `nulo` | «Nada». Lo que da `buscar()` si no encuentra nada. |
| lista | `["rojo", "azul"]` | Varios valores en orden. **La primera posición es la 1.** |
| tabla | `{vida: 3, nombre: "Ana"}` | Datos con nombre. Se leen con un punto: `jugador.vida`. |
| vector | `vector(10, 20)` | Dos números juntos: una posición o una velocidad. |
| objeto | `yo`, `otro`, `buscar("Jugador")` | Los objetos de la escena. |

### Textos con huecos

Dentro de un texto, lo que va **entre llaves** se cambia por su valor:

```
mostrar("Vida: {yo.vida}")                  # Vida: 3
mostrar("{a} + {b} = {a + b}")
yo.texto = "Puntos: {juego.puntos}"         # este se actualiza solo
```

- Si el texto se le da a `yo.texto` (o se escribe en el editor, en el texto de un objeto), **se actualiza solo** mientras juegas. En el editor, «Enseñar un dato» lo pone por ti.
- Para escribir una llave de verdad se ponen dos: `"{{"` y `"}}"`.

### Variables

```
variable puntos = 0     # crear: la primera vez, con la palabra variable
puntos = 10             # cambiar el valor
puntos += 1             # sumar (también -=, *= y /=)
```

Una variable creada dentro de un bloque solo existe dentro de ese bloque.

### Operaciones

| Qué | Cómo |
|---|---|
| Sumar, restar, multiplicar, dividir | `+`, `-`, `*`, `/` |
| Resto de una división | `%` (por ejemplo, `7 % 2` es `1`) |
| Comparar | `==` igual, `!=` distinto, `<`, `>`, `<=`, `>=` |
| Combinar condiciones | `y`, `o`, `no` |
| ¿Está dentro? | `en`: `"vida" en jugador`, `3 en lista`, `"ola" en "hola"` |
| Unir textos | `+`: `"Puntos: " + puntos` (el número se convierte solo) |

- **`=` guarda y `==` compara.** `si vida == 0:` pregunta; `vida = 0` cambia.
- En un `si`, solo cuentan como «no» `falso` y `nulo`.

### Coordenadas

- **La Y crece hacia ARRIBA**: subir es sumar a la Y. Caer es que la Y baje.
- Al empezar, `(0, 0)` es la esquina de **abajo a la izquierda** de la pantalla del juego.
- Los objetos **fijos** en la pantalla (vidas, puntos, botones) se miden desde esa misma esquina de la pantalla, aunque la cámara se mueva.
- En el editor, la barra de la escena te dice la x y la y del ratón.

## 2. Palabras del lenguaje

#### `variable nombre = valor`

Crea una variable nueva: una caja con nombre donde guardar un valor. Solo se usa la primera vez; después basta con nombre = valor.

```
variable vida = 3
```

#### `si condicion:`

Ejecuta el bloque de dentro solo si la condición es verdadera.

```
si vida <= 0:
    mostrar("Has perdido")
```

#### `sino:  /  sino si condicion:`

Va después de un 'si'. Su bloque se ejecuta cuando la condición del 'si' es falsa. Con 'sino si' se encadenan más condiciones.

```
si vida > 50:
    mostrar("Bien")
sino:
    mostrar("Cuidado")
```

#### `mientras condicion:`

Repite el bloque de dentro mientras la condición sea verdadera.

```
mientras vida > 0:
    vida -= 1
```

#### `repetir N veces:`

Repite el bloque de dentro un número de veces.

```
repetir 3 veces:
    crear("Moneda", aleatorio(0, 900), 400)
```

#### `para cada x en lista:`

Recorre una lista, un texto (letra a letra) o una tabla. Con una tabla se pueden usar dos nombres: para cada clave, valor en tabla.

```
para cada enemigo en buscarTodos("Enemigo"):
    destruir(enemigo)
```

#### `para cada x en lista:  /  cuando cada fotograma:`

Se usa en 'para cada' y en los eventos 'cuando cada fotograma' y 'cuando cada N segundos'.

```
para cada n en [1, 2, 3]:
    mostrar(n)
```

#### `x en lista  /  "clave" en tabla`

Dos usos: en 'para cada x en lista', y para comprobar si algo está dentro de otra cosa (una clave en una tabla, un elemento en una lista, un trozo en un texto).

```
si "vida" en jugador:
    mostrar(jugador.vida)
```

#### `funcion nombre(a, b):`

Crea una función: un trozo de código con nombre que se puede usar muchas veces.

```
funcion curar(cantidad):
    yo.vida += cantidad
```

#### `devolver valor`

Termina la función y da un resultado. Dentro de un 'cuando', termina el evento antes de tiempo.

```
funcion doble(n):
    devolver n * 2
```

#### `romper`

Sale del bucle (mientras, repetir o para cada) en el que está.

```
mientras verdadero:
    si listo:
        romper
```

#### `continuar`

Salta a la siguiente vuelta del bucle, sin terminar esta.

```
para cada n en lista:
    si n < 0:
        continuar
    mostrar(n)
```

#### `cuando evento:`

Empieza un evento: código que se ejecuta cuando pasa algo (al empezar, al pulsar una tecla, al tocar otro objeto...).

```
cuando se pulsa "espacio":
    yo.saltar(600)
```

#### `verdadero`

El valor lógico «sí».

```
variable vivo = verdadero
```

#### `falso`

El valor lógico «no».

```
variable pausado = falso
```

#### `nulo`

Nada, vacío. Es lo que vale algo que no existe (por ejemplo, buscar() cuando no encuentra nada).

```
si buscar("Jefe") == nulo:
    mostrar("¡Ganaste!")
```

#### `a y b`

Verdadero solo si las DOS cosas son verdaderas.

```
si vida > 0 y puntos >= 10:
```

#### `a o b`

Verdadero si AL MENOS UNA de las dos es verdadera.

```
si teclado.pulsada("izquierda") o teclado.pulsada("a"):
```

#### `no a`

Lo contrario: verdadero pasa a falso y al revés.

```
si no yo.enSuelo:
```

## 3. Eventos

Los eventos dicen **cuándo** se ejecuta un trozo de código. Van al principio de la línea (sin sangría) y terminan en `:`. Cada evento funciona por su cuenta: `esperar()` pausa solo ese evento, no el juego.

#### `cuando empieza:`

Se ejecuta una vez, cuando el objeto aparece en la escena.

```
cuando empieza:
    yo.vida = 3
```

#### `cuando cada fotograma:`

Se ejecuta unas 60 veces por segundo. Es el sitio para mover cosas y comprobar teclas. Usa delta para que la velocidad no dependa del ordenador.

```
cuando cada fotograma:
    yo.x += 100 * delta
```

#### `cuando cada 2 segundos:`

Se ejecuta una y otra vez, cada cierto tiempo.

```
cuando cada 2 segundos:
    crear("Enemigo", 900, 300)
```

#### `cuando pasen 3 segundos:`

Se ejecuta UNA sola vez, ese tiempo después de que aparezca el objeto.

```
cuando pasen 3 segundos:
    destruir(yo)
```

#### `cuando se pulsa "tecla":`

Se ejecuta al pulsar una tecla (una vez por pulsación). Se pueden poner varias: "espacio", "w".

```
cuando se pulsa "espacio":
    yo.saltar(600)
```

#### `cuando se mantiene "tecla":`

Se ejecuta en cada fotograma mientras la tecla esté pulsada.

```
cuando se mantiene "derecha":
    yo.x += 200 * delta
```

#### `cuando se suelta "tecla":`

Se ejecuta al soltar una tecla.

```
cuando se suelta "espacio":
    mostrar("soltada")
```

#### `cuando toco Nombre:`

Se ejecuta al EMPEZAR a tocar un objeto con ese nombre o tipo, o una casilla de ese tipo. El otro objeto está en 'otro' (y el tipo de casilla en 'casilla'). Sin nombre (cuando toco:) vale cualquier cosa.

```
cuando toco Moneda:
    juego.puntos += 1
    destruir(otro)
```

#### `cuando dejo de tocar Nombre:`

Se ejecuta cuando deja de tocar un objeto o casilla.

```
cuando dejo de tocar Agua:
    yo.gravedad = 1
```

#### `cuando hago clic:`

Se ejecuta al hacer clic en cualquier sitio de la pantalla del juego.

```
cuando hago clic:
    crear("Bola", raton.x, raton.y)
```

#### `cuando hago clic encima:`

Se ejecuta al hacer clic ENCIMA de este objeto. Sirve para hacer botones.

```
cuando hago clic encima:
    escena.cambiar("Nivel1")
```

#### `cuando termina la animacion:`

Se ejecuta cuando termina una animación que no se repite.

```
cuando termina la animacion:
    yo.animar("quieto")
```

#### `cuando salgo de la pantalla:`

Se ejecuta cuando el objeto sale de lo que se ve (por un borde de la pantalla). Sirve para borrar balas y enemigos que ya no se ven, o para perder si el jugador se cae.

```
cuando salgo de la pantalla:
    destruir(yo)
```

## 4. Variables especiales

#### `yo`

El objeto al que pertenece este script.

```
yo.x += 10
```

#### `otro`

Dentro de 'cuando toco': el objeto que has tocado.

```
cuando toco Enemigo:
    destruir(otro)
```

#### `casilla`

Dentro de 'cuando toco': si has tocado una casilla de un mapa, su tipo (si no, nulo).

```
cuando toco:
    si casilla == "agua":
        yo.gravedad = 0.2
```

#### `juego`

Datos compartidos por todos los scripts (puntos, vidas...). Se conservan al cambiar de escena.

```
juego.puntos += 1
```

#### `delta`

Segundos desde el fotograma anterior (unos 0.016). Multiplica por delta las velocidades para que el juego vaya igual en cualquier ordenador.

```
yo.x += 200 * delta
```

## 5. Funciones

Se usan con paréntesis: `nombre(valores)`. Los paréntesis son obligatorios, aunque vayan vacíos.

#### `mostrar(valor, ...)`

Escribe en la consola. Muy útil para ver qué valor tiene algo mientras pruebas.

```
mostrar("Vida:", yo.vida)
```

#### `esperar(segundos)`

Pausa ESTE evento un rato, sin parar el juego. Sin número, espera un fotograma.

```
yo.visible = falso
esperar(0.5)
yo.visible = verdadero
```

#### `crear("Plantilla", x, y)`

Crea un objeto nuevo a partir de una plantilla, en la posición (x, y). Devuelve el objeto creado.

```
variable bala = crear("Bala", yo.x, yo.y)
```

#### `destruir(objeto)`

Quita un objeto del juego.

```
cuando toco Moneda:
    destruir(otro)
```

#### `buscar("Nombre")`

Busca un objeto por su nombre o su tipo. Si no lo encuentra, da nulo.

```
variable jugador = buscar("Jugador")
```

#### `buscarTodos("Tipo")`

Da una lista con todos los objetos de ese nombre o tipo.

```
mostrar(longitud(buscarTodos("Enemigo")))
```

#### `distancia(a, b)`

Distancia en píxeles entre dos objetos o dos posiciones.

```
si distancia(yo, buscar("Jugador")) < 100:
```

#### `particulas("tipo", x, y)`

Crea un efecto de partículas. Tipos: "explosion", "humo", "chispas", "polvo", "confeti", "estrellas". También acepta una tabla: {tipo: "humo", color: "verde", cantidad: 30}.

```
particulas("explosion", yo.x, yo.y)
```

#### `guardar("clave", valor)`

Guarda un dato del jugador en el navegador (se conserva al cerrar el juego): récords, niveles, opciones...

```
guardar("record", puntos)
```

#### `cargar("clave", porDefecto)`

Lee un dato guardado con guardar(). Si no existe, da el valor por defecto.

```
variable record = cargar("record", 0)
```

#### `borrarGuardado("clave")`

Borra un dato guardado.

```
borrarGuardado("record")
```

#### `aleatorio(min, max)`

Un número entero al azar entre min y max (los dos incluidos). Sin nada, un decimal entre 0 y 1.

```
variable dado = aleatorio(1, 6)
```

#### `elegir(lista)`

Un elemento al azar de una lista.

```
yo.color = elegir(["rojo", "verde", "azul"])
```

#### `probabilidad(porcentaje)`

Verdadero ese porcentaje de las veces. probabilidad(30) es verdadero 30 de cada 100 veces.

```
si probabilidad(10):
    crear("Premio", yo.x, yo.y)
```

#### `redondear(numero, decimales)`

Redondea un número. Sin decimales, al entero más cercano.

```
mostrar(redondear(3.14159, 2))
```

#### `absoluto(numero)`

El número sin signo: absoluto(-5) es 5.

```
si absoluto(yo.velocidad.x) > 100:
```

#### `raiz(numero)`

La raíz cuadrada.

```
mostrar(raiz(16))
```

#### `minimo(a, b, ...)`

El más pequeño de varios números.

```
yo.vida = minimo(yo.vida + 1, 10)
```

#### `maximo(a, b, ...)`

El más grande de varios números.

```
yo.vida = maximo(yo.vida - 1, 0)
```

#### `seno(grados)`

El seno de un ángulo EN GRADOS. Sirve para movimientos de vaivén.

```
yo.y = 200 + seno(tiempo.total * 90) * 50
```

#### `coseno(grados)`

El coseno de un ángulo EN GRADOS.

```
yo.x = 400 + coseno(tiempo.total * 90) * 50
```

#### `vector(x, y)`

Un vector: dos números juntos (una posición, una velocidad...).

```
yo.velocidad = vector(0, 300)
```

#### `longitud(x)`

Cuántas letras tiene un texto, o cuántos elementos una lista o una tabla.

```
mostrar(longitud(buscarTodos("Moneda")))
```

#### `texto(valor)`

Convierte cualquier valor en texto.

```
yo.texto = "Puntos: " + texto(juego.puntos)
```

#### `numero(texto)`

Convierte un texto con un número ("42") en un número de verdad.

```
variable n = numero("42") + 1
```

## 6. Objetos

Lo que tienen `yo`, `otro` y cualquier objeto (el que te da `buscar("Nombre")` o `crear("Plantilla")`). Aquí se escriben con `yo.`, pero sirven igual con cualquier otro objeto: `otro.x`, `enemigo.destruir()`.

El **tipo** de un objeto es el nombre de su plantilla o, si no viene de una plantilla, su nombre sin los números del final: `Moneda`, `Moneda2` y `Moneda3` son del tipo `Moneda`. Por eso `cuando toco Moneda` vale para todas.

Además puedes inventarte **propiedades propias**: `yo.vida = 3`. También se pueden poner en el editor, en Propiedades > Propiedades propias.

### Propiedades

#### `yo.nombre`

El nombre del objeto.

```
mostrar(yo.nombre)
```

#### `yo.tipo`

El tipo del objeto (normalmente, la plantilla de la que salió).

```
si otro.tipo == "Enemigo":
```

#### `yo.x`

Posición horizontal del centro del objeto.

```
yo.x += 100 * delta
```

#### `yo.y`

Posición vertical del centro del objeto. La Y crece hacia ARRIBA.

```
yo.y += 100 * delta   # sube
```

#### `yo.posicion`

Posición como vector.

```
yo.posicion = vector(100, 200)
```

#### `yo.rotacion`

Giro en grados (positivo = contrario a las agujas del reloj).

```
yo.rotacion = 45
```

#### `yo.escala`

Tamaño: 1 normal, 2 el doble. Puede ser un número o un vector.

```
yo.escala = 2
```

#### `yo.velocidad`

Velocidad en píxeles por segundo (necesita física). Positivo en Y = hacia arriba.

```
yo.velocidad.x = 200
```

#### `yo.gravedad`

Cuánto le afecta la gravedad: 1 normal, 0 flota, 0.5 como en la luna.

```
yo.gravedad = 0
```

#### `yo.rozamiento`

Cuánto frena en el suelo, de 0 (hielo) a 1 (se para en seco).

```
yo.rozamiento = 0
```

#### `yo.rebote`

Cuánto rebota al chocar, de 0 (nada) a 1 (pelota perfecta).

```
yo.rebote = 0.8
```

#### `yo.masa`

Cuánto pesa. Al chocar, el más pesado empuja al otro.

```
yo.masa = 10
```

#### `yo.estatico`

Si es verdadero, el objeto no se mueve nunca (como una pared).

```
yo.estatico = verdadero
```

#### `yo.enSuelo`

Verdadero si está apoyado en el suelo (solo se lee).

```
si yo.enSuelo:
    yo.saltar(600)
```

#### `yo.tocaPared`

Verdadero si ha chocado con una pared (solo se lee).

```
si yo.tocaPared:
    direccion = -direccion
```

#### `yo.tocaTecho`

Verdadero si se ha dado con la cabeza en un techo (solo se lee).

```
si yo.tocaTecho:
    mostrar("¡Ay!")
```

#### `yo.solido`

Si es verdadero, los demás chocan con él.

```
yo.solido = falso
```

#### `yo.fantasma`

Si es verdadero, se atraviesa, pero sigue avisando con "cuando toco" (zonas, monedas, metas).

```
yo.fantasma = verdadero
```

#### `yo.color`

El color de la forma (o del texto). Nombres: rojo, verde, azul, amarillo, naranja, morado, rosa, cian, blanco, negro, gris, marron... o "#ff8800".

```
yo.color = "rojo"
```

#### `yo.visible`

Si es falso, el objeto no se dibuja (pero sigue existiendo).

```
yo.visible = falso
```

#### `yo.ancho`

Ancho del dibujo en píxeles.

```
yo.ancho = 100
```

#### `yo.alto`

Alto del dibujo en píxeles.

```
yo.alto = 20
```

#### `yo.opacidad`

De 0 (invisible) a 1 (normal).

```
yo.opacidad = 0.5
```

#### `yo.voltear`

Si es verdadero, el dibujo se ve al revés (como en un espejo). Para mirar a la izquierda.

```
yo.voltear = yo.velocidad.x < 0
```

#### `yo.capa`

Orden de dibujo: los de capa más alta se ven por encima.

```
yo.capa = 10
```

#### `yo.imagen`

La imagen que se dibuja (nombre de una imagen del proyecto).

```
yo.imagen = "jugador_herido"
```

#### `yo.texto`

El texto de un objeto de texto, o la etiqueta de un botón.

```
yo.texto = "Puntos: " + juego.puntos
```

#### `yo.tamaño`

Tamaño de la letra del texto.

```
yo.tamaño = 40
```

#### `yo.colorTexto`

Color de la letra de las etiquetas (botones).

```
yo.colorTexto = "negro"
```

#### `yo.fijo`

Si es verdadero, se queda pegado a la pantalla (interfaz: vida, puntos, botones).

```
yo.fijo = verdadero
```

#### `yo.animacion`

La animación que suena ahora (o nulo). Darle valor es lo mismo que yo.animar(...).

```
si yo.animacion != "correr":
    yo.animacion = "correr"
```

#### `yo.ratonEncima`

Verdadero si el ratón está encima del objeto (para resaltar botones).

```
si yo.ratonEncima:
    yo.color = "amarillo"
```

#### `yo.destruido`

Verdadero si el objeto ya se ha destruido.

```
si objetivo.destruido:
    romper
```

### Acciones

#### `yo.saltar(fuerza)`

Salta, pero solo si está en el suelo. Devuelve verdadero si ha saltado.

```
cuando se pulsa "espacio":
    yo.saltar(600)
```

#### `yo.mover(x, y)`

Mueve el objeto esa cantidad de píxeles.

```
yo.mover(10, 0)
```

#### `yo.rotar(grados)`

Gira el objeto esos grados.

```
yo.rotar(90 * delta)
```

#### `yo.empujar(x, y)`

Da un golpe: cambia la velocidad según la masa (los pesados se mueven menos).

```
otro.empujar(500, 200)
```

#### `yo.moverConFlechas(rapidez)`

Mueve el objeto con las flechas (o W A S D) a esa rapidez en píxeles por segundo. Si el objeto cae (tiene física y hay gravedad), solo va a izquierda y derecha; si no, en las cuatro direcciones. Las imágenes miran hacia donde anda. Úsalo en "cuando cada fotograma".

```
cuando cada fotograma:
    yo.moverConFlechas(300)
```

#### `yo.moverHacia(destino, rapidez)`

Avanza hacia otro objeto o posición a esa rapidez (píxeles/segundo), sin pasarse. Devuelve verdadero al llegar.

```
yo.moverHacia(buscar("Jugador"), 80)
```

#### `yo.mirarA(destino)`

Gira el objeto para que mire hacia otro objeto o posición.

```
yo.mirarA(raton.posicion)
```

#### `yo.direccionA(destino)`

Un vector de largo 1 que apunta hacia otro objeto o posición. Útil para disparar.

```
bala.velocidad = yo.direccionA(raton.posicion) * 500
```

#### `yo.distanciaA(otro)`

Distancia en píxeles hasta otro objeto.

```
si yo.distanciaA(jugador) < 50:
```

#### `yo.animar("nombre")`

Empieza una animación del proyecto. Si ya estaba sonando, no la reinicia.

```
yo.animar("correr")
```

#### `yo.pararAnimacion()`

Para la animación (se queda en el fotograma actual).

```
yo.pararAnimacion()
```

#### `yo.destruir()`

Quita el objeto del juego (igual que destruir(yo)).

```
yo.destruir()
```

## 7. Mapas de casillas

Un mapa de casillas es una rejilla que se pinta en el editor con el pincel. Cada **tipo de casilla** (suelo, pared, agua, puerta…) puede ser sólido (no se atraviesa) o no. Tocar una casilla lanza `cuando toco <tipo>`; dentro, `casilla` dice el tipo. Las columnas y filas empiezan en 0, en la esquina de abajo a la izquierda del mapa.

#### `mapa.casilla(columna, fila)`

Solo en mapas de casillas: el tipo de la casilla (o nulo si está vacía).

```
variable mapa = buscar("Mapa")
mostrar(mapa.casilla(3, 0))
```

#### `mapa.ponerCasilla(columna, fila, "tipo")`

Solo en mapas: pone una casilla.

```
mapa.ponerCasilla(3, 0, "suelo")
```

#### `mapa.quitarCasilla(columna, fila)`

Solo en mapas: quita una casilla.

```
mapa.quitarCasilla(3, 0)
```

#### `mapa.casillaEn(x, y)`

Solo en mapas: el tipo de la casilla que hay en un punto del mundo.

```
si mapa.casillaEn(yo.x, yo.y - 30) == "hielo":
```

#### `mapa.columnaEn(x)`

Solo en mapas: la columna que hay en esa X del mundo.

```
variable c = mapa.columnaEn(yo.x)
```

#### `mapa.filaEn(y)`

Solo en mapas: la fila que hay en esa Y del mundo.

```
variable f = mapa.filaEn(yo.y)
```

#### `mapa.centroDeCasilla(columna, fila)`

Solo en mapas: el centro de una casilla, en el mundo (vector).

```
yo.posicion = mapa.centroDeCasilla(2, 5)
```

## 8. Módulos

Grupos de cosas del motor. Se escriben con un punto: `teclado.pulsada("a")`, `escena.camara.zoom`.

### `teclado`

El teclado. Nombres de tecla: "espacio", "enter", "escape", "mayus", "control", "alt", "tab", "borrar", las flechas "arriba", "abajo", "izquierda", "derecha", letras ("a"), números ("1") y "f1"…"f12".

```
si teclado.pulsada("derecha"):
    yo.x += 200 * delta
```

#### `teclado.pulsada("tecla")`

Verdadero MIENTRAS la tecla esté pulsada. Para moverse.

```
si teclado.pulsada("izquierda"):
    yo.x -= 200 * delta
```

#### `teclado.sePulso("tecla")`

Verdadero solo en el fotograma en que se pulsa la tecla. Para saltar o disparar una vez.

```
si teclado.sePulso("espacio"):
    yo.saltar(600)
```

#### `teclado.seSolto("tecla")`

Verdadero solo en el fotograma en que se suelta la tecla.

```
si teclado.seSolto("espacio"):
    mostrar("soltada")
```

### `raton`

El ratón, en coordenadas del mundo (la Y crece hacia arriba).

```
cuando hago clic:
    crear("Bola", raton.x, raton.y)
```

#### `raton.x`

Posición horizontal del ratón en el mundo.

```
yo.x = raton.x
```

#### `raton.y`

Posición vertical del ratón en el mundo (hacia arriba).

```
yo.y = raton.y
```

#### `raton.posicion`

Posición del ratón como vector.

```
yo.mirarA(raton.posicion)
```

#### `raton.rueda`

Cuánto se ha girado la rueda en este fotograma (positivo = hacia abajo).

```
escena.camara.zoom -= raton.rueda * 0.1
```

#### `raton.pulsado("izquierdo")`

Verdadero mientras el botón esté pulsado ("izquierdo", "derecho" o "medio").

```
si raton.pulsado("izquierdo"):
    disparar()
```

#### `raton.sePulso("izquierdo")`

Verdadero solo en el fotograma en que se pulsa el botón.

```
si raton.sePulso():
    mostrar("clic")
```

#### `raton.seSolto("izquierdo")`

Verdadero solo en el fotograma en que se suelta el botón (por ejemplo, para soltar algo que arrastras).

```
si raton.seSolto():
    mostrar("soltado")
```

### `escena`

La escena que se está jugando.

```
escena.cambiar("Nivel2")
```

#### `escena.nombre`

El nombre de la escena actual.

```
mostrar(escena.nombre)
```

#### `escena.objetos`

Lista con todos los objetos de la escena.

```
mostrar(longitud(escena.objetos))
```

#### `escena.gravedad`

La gravedad de la escena (1500 normal, 0 para juegos vistos desde arriba).

```
escena.gravedad = 0
```

#### `escena.camara`

La cámara: qué parte del mundo se ve.

```
escena.camara.seguir(yo)
```

#### `escena.cambiar("Nombre")`

Cambia a otra escena. Los datos de juego (juego.puntos...) se conservan.

```
escena.cambiar("Nivel2")
```

#### `escena.reiniciar()`

Vuelve a empezar la escena actual desde el principio.

```
si juego.vidas <= 0:
    escena.reiniciar()
```

### `escena.camara`

La cámara de la escena.

```
escena.camara.seguir(yo)
escena.camara.zoom = 2
```

#### `escena.camara.seguir(objeto)`

La cámara sigue a un objeto (suavemente).

```
escena.camara.seguir(yo)
```

#### `escena.camara.limites(izquierda, abajo, derecha, arriba)`

La cámara no enseña nada fuera de esta zona. También se le puede dar un mapa de casillas (no sale de él), o nada para quitar los límites. En el editor: Cámara > «no salir del mapa».

```
escena.camara.limites(buscar("Mapa"))
```

#### `escena.camara.temblar(intensidad, segundos)`

Hace temblar la pantalla (explosiones, golpes).

```
escena.camara.temblar(10, 0.3)
```

#### `escena.camara.zoom`

1 = normal, 2 = más cerca (todo el doble de grande), 0.5 = más lejos.

```
escena.camara.zoom = 2
```

#### `escena.camara.x`

Centro de la cámara (horizontal).

```
escena.camara.x = 480
```

#### `escena.camara.y`

Centro de la cámara (vertical).

```
escena.camara.y = 270
```

#### `escena.camara.suavizado`

Lo rápido que alcanza al objeto que sigue (8 por defecto; más alto = más rápido).

```
escena.camara.suavizado = 3
```

### `sonido`

Efectos de sonido.

```
sonido.reproducir("salto")
```

#### `sonido.reproducir("nombre")`

Reproduce un sonido del proyecto.

```
sonido.reproducir("salto")
```

#### `sonido.parar("nombre")`

Para un sonido (o todos, sin nombre).

```
sonido.parar()
```

#### `sonido.tono(frecuencia, segundos)`

Un pitido generado, sin archivos. 440 es la nota La.

```
sonido.tono(880, 0.1)
```

#### `sonido.volumen`

Volumen de los efectos, de 0 a 1.

```
sonido.volumen = 0.5
```

### `musica`

Música de fondo: suena en bucle y solo una a la vez.

```
musica.reproducir("tema")
```

#### `musica.reproducir("nombre")`

Pone una música en bucle (para la anterior).

```
musica.reproducir("tema")
```

#### `musica.parar()`

Para la música.

```
musica.parar()
```

#### `musica.volumen`

Volumen de la música, de 0 a 1.

```
musica.volumen = 0.3
```

#### `musica.actual`

El nombre de la música que suena (o nulo).

```
si musica.actual == nulo:
    musica.reproducir("tema")
```

### `tiempo`

El tiempo del juego.

```
tiempo.escala = 0.5   # cámara lenta
```

#### `tiempo.total`

Segundos que lleva funcionando el juego.

```
mostrar(redondear(tiempo.total))
```

#### `tiempo.delta`

Segundos desde el fotograma anterior (igual que delta).

```
yo.x += 100 * tiempo.delta
```

#### `tiempo.escala`

1 = normal, 0.5 = cámara lenta, 0 = pausa.

```
tiempo.escala = 0
```

### `pantalla`

El tamaño de la pantalla del juego.

```
yo.x = pantalla.ancho / 2
```

#### `pantalla.ancho`

Ancho de la pantalla del juego en píxeles.

```
yo.x = pantalla.ancho / 2
```

#### `pantalla.alto`

Alto de la pantalla del juego en píxeles.

```
yo.y = pantalla.alto - 30
```

## 9. Listas, textos, tablas y vectores

### Listas

Una lista de valores en orden, entre corchetes: [1, 2, 3]. La primera posición es la 1.

#### `lista.longitud`

Cuántos elementos tiene la lista.

```
mostrar(enemigos.longitud)
```

#### `lista.añadir(valor)`

Pone un valor al final de la lista.

```
colores.añadir("rosa")
```

#### `lista.quitar(posicion)`

Quita el elemento de esa posición (la primera es la 1) y lo devuelve.

```
variable primero = cola.quitar(1)
```

### Textos

Un texto entre comillas: "Hola". Con + se une a otros textos y números. Entre llaves se meten valores: "Puntos: {juego.puntos}" (para escribir una llave, dos: {{). Si se lo das a yo.texto, se actualiza solo.

#### `texto.longitud`

Cuántas letras tiene el texto.

```
mostrar(nombre.longitud)
```

#### `texto.mayusculas`

El mismo texto en MAYÚSCULAS.

```
yo.texto = nombre.mayusculas
```

#### `texto.minusculas`

El mismo texto en minúsculas.

```
si respuesta.minusculas == "si":
    mostrar("Vale")
```

### Tablas

Datos con nombre, entre llaves: {vida: 3, nombre: "Ana"}. Se leen con un punto: jugador.vida.

#### `tabla.claves`

Una lista con los nombres de todas las claves, en el orden en que se añadieron.

```
para cada k en inventario.claves:
    mostrar(k)
```

#### `tabla.quitar("clave")`

Quita una clave de la tabla y devuelve su valor.

```
inventario.quitar("llave")
```

### Vectores

Dos números juntos (una posición, una velocidad...): vector(3, 4).

#### `vector.x`

El número horizontal.

```
mostrar(yo.velocidad.x)
```

#### `vector.y`

El número vertical (positivo = hacia arriba).

```
si yo.velocidad.y < 0:
    mostrar("Cayendo")
```

#### `vector.longitud`

Lo largo que es (por ejemplo, la rapidez de una velocidad).

```
mostrar(yo.velocidad.longitud)
```

#### `vector.normalizado`

Un vector con la misma dirección pero de largo 1.

```
variable dir = (destino - yo.posicion).normalizado
```

## 10. Nombres que se escriben entre comillas

**Teclas:** `"espacio"`, `"arriba"`, `"abajo"`, `"izquierda"`, `"derecha"`, `"enter"`, `"escape"`, `"tab"`, `"borrar"`, `"suprimir"`, `"mayus"`, `"control"`, `"alt"`, `"f1"`, `"f2"`, `"f3"`, `"f4"`, `"f5"`, `"f6"`, `"f7"`, `"f8"`, `"f9"`, `"f10"`, `"f11"`, `"f12"`. Para letras y números, el carácter: `"a"`, `"ñ"`, `"1"`.

**Colores:** `"rojo"`, `"verde"`, `"azul"`, `"amarillo"`, `"naranja"`, `"morado"`, `"violeta"`, `"rosa"`, `"cian"`, `"blanco"`, `"negro"`, `"gris"`, `"marron"`, `"transparente"`. También códigos como `"#ff8800"`.

**Partículas:** `"explosion"`, `"humo"`, `"chispas"`, `"polvo"`, `"confeti"`, `"estrellas"`.

**Tuyos:** los nombres de tus plantillas, escenas, imágenes, sonidos y animaciones también van entre comillas: `crear("Bala")`, `escena.cambiar("Nivel2")`.

## 11. Cuando algo sale mal

- **Mientras escribes**, lo que está mal se subraya en rojo (errores) o en amarillo (avisos). Pasa el ratón por encima para ver qué pasa y cómo arreglarlo.
- **Con errores no se puede ejecutar**: el botón Ejecutar se pone rojo y la pestaña **Problemas** los enseña todos. Haz clic en uno para ir a su línea.
- **Si algo falla con el juego en marcha**, el error sale en la **Consola**. Solo se para el script que ha fallado; el resto del juego sigue. Si el mismo error pasa muchas veces (por ejemplo, en 50 enemigos), sale una vez con «×50».
- Los mensajes dicen **qué** ha pasado, **dónde** (archivo y línea) y **cómo arreglarlo** (💡). Si algo se parece a lo que querías escribir, te lo sugieren: «¿Querías decir…?».
- **`mostrar(...)`** es tu mejor amigo para averiguar qué está pasando: escribe en la consola el valor de lo que quieras.

## 12. Recetas: ¿cómo hago…?

Soluciones cortas para lo más común. También están en el editor, en la pestaña **Guía**, con un botón para copiarlas.

### Moverse con las flechas

En el script del jugador. Si tiene Física y hay gravedad, anda a izquierda y derecha; en una escena con gravedad 0 (vista desde arriba) o sin Física, en las cuatro direcciones. También funciona con W A S D.

```
cuando cada fotograma:
    yo.moverConFlechas(300)
```

### Saltar

El jugador necesita Física (Propiedades > Física) y algo debajo para apoyarse: un suelo sin Física, o un mapa de casillas. Solo salta si está en el suelo.

```
cuando se pulsa "espacio", "arriba":
    yo.saltar(700)
```

### Recoger monedas y contar puntos

En el script del jugador. Las monedas llevan Colisión con «sólido» quitado, para atravesarlas. Si duplicas la moneda (Ctrl+D), las copias se llaman Moneda2, Moneda3... y «cuando toco Moneda» vale para todas.

```
cuando empieza:
    juego.puntos = 0

cuando toco Moneda:
    destruir(otro)
    juego.puntos += 1
    sonido.tono(880, 0.1)
```

### Enseñar los puntos (o la vida) en la pantalla

Sin código: añade un Texto y escribe en su texto (Propiedades) Puntos: {juego.puntos}, o elige el dato en «Enseñar un dato». Lo que va entre llaves se actualiza solo mientras juegas. Alguien tiene que darle valor primero (ver la receta anterior). Desde el código es igual:

```
cuando empieza:
    yo.texto = "Puntos: {juego.puntos}"
```

### Disparar

Crea la bala (un objeto pequeño con su script) y pulsa «Plantilla» para convertirla en plantilla. La nave la crea con crear("Bala"): sin posición, sale donde está la nave.

```
# En el script de la nave:
cuando se pulsa "espacio":
    crear("Bala")

# En el script de la Bala:
cuando cada fotograma:
    yo.y += 600 * delta

cuando salgo de la pantalla:
    destruir(yo)
```

### Enemigos que caen desde arriba

Un objeto vacío (Añadir > Objeto vacío) con este script crea un enemigo cada segundo en un sitio al azar. El Enemigo es una plantilla con su propio script para bajar.

```
# En el script del objeto vacío:
cuando cada 1 segundo:
    crear("Enemigo", aleatorio(50, pantalla.ancho - 50), pantalla.alto + 40)

# En el script del Enemigo:
cuando cada fotograma:
    yo.y -= 200 * delta

cuando salgo de la pantalla:
    destruir(yo)
```

### Explosión al acertar

En el script de la Bala. particulas() sin posición sale donde está el objeto; con otro.x y otro.y, donde estaba el enemigo.

```
cuando toco Enemigo:
    particulas("explosion", otro.x, otro.y)
    destruir(otro)
    destruir(yo)
    juego.puntos += 1
```

### Pantalla de fin y volver a empezar

Crea otra escena llamada Fin (botón + junto al nombre de la escena) con un Texto y un Botón. Al volver a Principal, recuerda poner los puntos a 0 en «cuando empieza».

```
# En el script del Enemigo:
cuando toco Nave:
    escena.cambiar("Fin")

# En el script del Botón de la escena Fin:
cuando hago clic encima:
    escena.cambiar("Principal")
```

### Caer al vacío y volver a empezar

En el script del jugador. «cuando salgo de la pantalla» pasa cuando deja de verse (si la cámara le sigue, solo cuando la cámara ya no puede bajar más: usa «no salir del mapa»).

```
cuando salgo de la pantalla:
    escena.reiniciar()
```

### Cámara que sigue al jugador

Lo más fácil es en el editor: sin nada seleccionado, en Propiedades > Cámara, elige al jugador en «seguir a» y marca «no salir del mapa». Desde el código:

```
cuando empieza:
    escena.camara.seguir(yo)
    escena.camara.limites(buscar("Mapa"))
```

### Una puerta que lleva a otra escena

En el mapa de casillas, crea un tipo de casilla «puerta» y píntala. En el script del jugador (la otra escena se crea con el botón + junto al nombre de la escena):

```
cuando toco puerta:
    escena.cambiar("Nivel2")
```

### Un enemigo que te persigue

En el script del enemigo.

```
cuando cada fotograma:
    variable jugador = buscar("Jugador")
    si jugador != nulo:
        yo.moverHacia(jugador, 120)
```

### Cuenta atrás

En el script de un Texto.

```
variable quedan = 30

cuando empieza:
    yo.texto = "Tiempo: {quedan}"

cuando cada 1 segundo:
    quedan -= 1
    si quedan == 0:
        escena.cambiar("Fin")
```

### Guardar el récord

Los datos guardados siguen ahí aunque cierres el juego. Por ejemplo, en la escena Fin:

```
cuando empieza:
    variable record = cargar("record", 0)
    si juego.puntos > record:
        guardar("record", juego.puntos)
        record = juego.puntos
    yo.texto = "Récord: {record}"
```
