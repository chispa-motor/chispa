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

#### `cuando cambia:`

En el script de un CONTROL de interfaz: se ejecuta cuando quien juega cambia lo que vale (mueve el deslizador, marca la casilla, escribe en el campo, elige en la lista o pulsa una opción del menú). El valor nuevo está en yo.valor.

```
cuando cambia:
    sonido.volumen = yo.valor / 100
```

#### `cuando termina la animacion:`

Se ejecuta cuando termina una animación que no se repite.

```
cuando termina la animacion:
    yo.animar("quieto")
```

#### `cuando recibo "mensaje":`

Se ejecuta cuando alguien hace enviar("mensaje") en cualquier script (le llega a TODOS los que lo escuchen, al empezar el siguiente fotograma). Si el mensaje trae algo, esta en 'dato'.

```
cuando recibo "abrir_puerta":
    yo.ocultar()
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

#### `dato`

Dentro de 'cuando recibo': lo que se envio junto al mensaje con enviar("mensaje", dato). Si no se envio nada, es nulo.

```
cuando recibo "dano":
    yo.vida -= dato
```

#### `juego`

Datos compartidos por todos los scripts (puntos, vidas...). Se conservan al cambiar de escena.

```
juego.puntos += 1
```

#### `pi`

El número pi (3.14159...): lo que mide una vuelta entera dividido entre su ancho.

```
variable vuelta = 2 * pi * radio
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

#### `tangente(grados)`

La tangente de un ángulo EN GRADOS.

```
mostrar(tangente(45))
```

#### `aleatorioDecimal(min, max)`

Un número CON DECIMALES al azar entre min y max (aleatorio() da enteros).

```
yo.tamano = aleatorioDecimal(0.5, 1.5)
```

#### `limitar(valor, min, max)`

Deja el número entre min y max: si se pasa, da max; si no llega, da min.

```
yo.vida = limitar(yo.vida, 0, 100)
```

#### `interpolar(desde, hasta, cuanto)`

Un valor entre dos: con 0 da el primero, con 1 el segundo, con 0.5 el de en medio. Vale con números y con vectores.

```
yo.x = interpolar(yo.x, raton.x, 0.1)
```

#### `redondearAbajo(numero)`

Quita los decimales hacia abajo: redondearAbajo(3.9) es 3.

```
variable columna = redondearAbajo(yo.x / 48)
```

#### `redondearArriba(numero)`

Redondea hacia arriba: redondearArriba(3.1) es 4.

```
variable paginas = redondearArriba(total / 10)
```

#### `signo(numero)`

1 si es positivo, -1 si es negativo, 0 si es cero. Para saber hacia dónde va algo.

```
yo.voltear = signo(yo.velocidad.x) < 0
```

#### `potencia(base, exponente)`

Multiplica un número por sí mismo varias veces: potencia(2, 3) = 2 × 2 × 2 = 8.

```
mostrar(potencia(2, 10))
```

#### `ruido(x, y)`

Un número entre 0 y 1 «al azar pero suave»: cambia poco a poco al cambiar x. Para nubes, terrenos o movimientos naturales.

```
yo.y = 200 + ruido(tiempo.total) * 100
```

#### `unir(lista, separador)`

Junta los elementos de una lista en un texto, con el separador entre medias (por defecto ", ").

```
yo.texto = unir(inventario, " - ")
```

#### `rango(desde, hasta, paso)`

Una lista de numeros seguidos, de desde a hasta (los dos incluidos). Sirve para contar con para cada. El paso es opcional (1 si no se dice). Si hasta es menor que desde, cuenta hacia atras.

```
para cada i en rango(1, 5):
    crear("Moneda", i * 100, 300)
```

#### `aLaVez(funcion, valores...)`

Empieza a ejecutar una funcion POR SU CUENTA, como si fuera otro evento: quien la llama sigue sin esperar a que acabe. Sirve para cosas que duran (con esperar dentro) sin parar el resto del script. Se escribe el nombre de la funcion sin parentesis, y detras sus valores.

```
funcion lluvia(veces):
    repetir veces veces:
        crear("Gota", aleatorio(0, 900), 540)
        esperar(0.2)

cuando se pulsa "espacio":
    aLaVez(lluvia, 10)
    mostrar("esto sale enseguida")
```

#### `dialogo("quien", "texto", opciones)`

Una caja de dialogo abajo de la pantalla: el texto sale letra a letra y se pasa con espacio, intro o clic. Quien habla y las opciones (una lista) no son obligatorios. Con opciones, devuelve la elegida. Mientras se lee, el juego se para.

```
cuando toco Jugador:
    variable r = dialogo("Ana", "¿Me ayudas?", ["Si", "No"])
    si r == "Si":
        juego.mision = 1
```

#### `rayo(desde, direccion, largo, atraviesa)`

Lanza una linea invisible y dice lo primero que toca (un objeto con colision o una casilla solida), o nulo. Desde: un objeto (no se toca a si mismo) o un vector. Direccion: un angulo (0 = derecha, 90 = arriba), un vector o un objeto hacia el que mirar. Da una tabla con objeto, punto, distancia y casilla. El cuarto valor (si se pone) dice que atraviesa: "solidos" = solo lo paran las cosas solidas (pasa a traves de los fantasmas: monedas, zonas, balas); o un nombre, un tipo o una etiqueta, o una lista de ellos.

```
variable r = rayo(yo, buscar("Jugador"), 400)
si r != nulo y r.objeto.nombre == "Jugador":
    mostrar("te veo")
```

#### `enviar("mensaje", dato)`

Avisa a todos los objetos que tengan 'cuando recibo "mensaje"'. El dato es opcional (un numero, un texto, un objeto...) y llega en 'dato'.

```
cuando toco Llave:
    enviar("abrir_puerta")
```

#### `contar("Tipo")`

Cuántos objetos hay con ese nombre o tipo.

```
si contar("Enemigo") == 0:
    escena.cambiar("Ganaste")
```

#### `clonar(objeto)`

Hace una copia del objeto tal como está ahora (sitio, color, tamaño, propiedades), con su script. Devuelve la copia.

```
variable copia = clonar(yo)
copia.x += 50
```

#### `buscarConEtiqueta("etiqueta")`

Una lista con los objetos que tienen esa etiqueta (ver yo.ponerEtiqueta).

```
para cada e en buscarConEtiqueta("malo"):
    e.color = "rojo"
```

#### `angulo(desde, hasta)`

El ángulo en grados de la flecha que va de un objeto (o posición) a otro: 0 = derecha, 90 = arriba.

```
yo.rotacion = angulo(yo, raton.posicion)
```

#### `cronometro()`

Un cronómetro nuevo, que empieza a contar ya. Tiene .segundos, .reiniciar(), .pausar() y .seguir().

```
variable crono = cronometro()
mostrar(crono.segundos)
```

#### `animar(sitio, hasta, segundos, suavizado)`

Cambia algo POCO A POCO hasta un valor en esos segundos (0.5 si no se dice): la posición, el tamaño, el giro, la opacidad, un color... Suavizados: "suave" (el normal), "lineal", "entrada", "salida", "rebote", "elastico" y "atras".

```
animar(yo.tamano, 2, 0.5)
animar(yo.color, "rojo", 1, "lineal")
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

#### `paleta("nombre", n)`

Los colores de una paleta lista ("pastel", "retro", "neon", "natural", "oceano", "fuego", "bosque", "caramelo", "grises", "arcoiris"). Con un número, solo ese color (del 1 al 8).

```
yo.color = paleta("neon", 3)
```

#### `mezclarColores(color1, color2, cuanto)`

El color que sale de mezclar dos: con 0 da el primero, con 1 el segundo y con 0.5 el de en medio.

```
yo.color = mezclarColores("rojo", "amarillo", 0.5)
```

#### `semilla(numero)`

Hace que el azar SE REPITA: con la misma semilla, aleatorio(), elegir(), probabilidad() y lista.mezclar() dan siempre lo mismo y en el mismo orden. Sirve para mundos hechos al azar que son iguales para todos (el nivel del día) o para repetir una partida. semilla() sin nada vuelve al azar de verdad.

```
cuando empieza:
    semilla(2026)
    mostrar(aleatorio(1, 100))
```

#### `controles(jugador)`

Los controles de un jugador (del 1 al 4), para jugar varios en el mismo ordenador. Cada uno tiene arriba, abajo, izquierda, derecha, a y b, en su trozo del teclado y en su mando. Jugador 1: W A S D, a = espacio, b = F. Jugador 2: flechas, a = Intro, b = Mayusculas. Jugador 3: I J K L, a = O, b = U. Jugador 4: 8 4 5 6, a = 0, b = 9. En el mando: cruceta o palanca, a = A, b = B.

```
cuando cada fotograma:
    si controles(2).sePulso("a"):
        yo.saltar(600)
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

#### `yo.moviendo`

Solo en objetos con recorrido (plataformas que se mueven solas): si es falso, se para donde está; si es verdadero, sigue su camino.

```
cuando toco Jugador:
    yo.moviendo = verdadero
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

Lo grande que es: 1 = normal, 2 = el doble, 0.5 = la mitad. En un objeto de TEXTO es el tamaño de la letra. Se puede escribir tamano (sin ñ).

```
yo.tamano = 2
animar(yo.tamano, 1, 0.3)
```

#### `yo.tamanoLetra`

El tamaño de la letra de un texto o de la etiqueta de un botón.

```
yo.tamanoLetra = 40
```

#### `yo.transparencia`

Lo contrario de la opacidad: 0 = se ve normal, 1 = invisible, 0.5 = medio transparente.

```
yo.transparencia = 0.5
```

#### `yo.voltearVertical`

Si es verdadero, la imagen se ve boca abajo.

```
yo.voltearVertical = verdadero
```

#### `yo.letra`

El tipo de letra de su texto. Las listas: "normal", "redonda", "clasica", "maquina", "manuscrita", "titulo" y "pixel". También las tuyas, importadas en Proyecto > Letras (.ttf, .otf, .woff).

```
yo.letra = "pixel"
```

#### `yo.colorTexto`

Color de la letra de las etiquetas (botones).

```
yo.colorTexto = "negro"
```

#### `yo.valor`

En un CONTROL de interfaz, lo que vale: el número de una barra, un deslizador o un icono con contador; verdadero o falso en una casilla; el texto de un campo; la opción elegida de una lista o un menú; lo que hay en la casilla elegida de un inventario.

```
buscar("BarraVida").valor = juego.vida
```

#### `yo.minimo`

En una barra o un deslizador: el valor más bajo (0 si no se dice).

```
buscar("Deslizador").minimo = 1
```

#### `yo.maximo`

En una barra o un deslizador: el valor más alto (100 si no se dice). La barra está llena cuando su valor llega al máximo.

```
buscar("BarraVida").maximo = 200
```

#### `yo.opciones`

En una lista o un menú: sus opciones, una lista de textos.

```
buscar("Menu").opciones = ["Jugar", "Opciones", "Salir"]
```

#### `yo.elegido`

En una lista, un menú o un inventario: el número de la opción (o la casilla) elegida. La primera es la 1; 0 es ninguna.

```
buscar("Lista").elegido = 1
```

#### `yo.activado`

En un control: si se puede usar. Con falso se ve apagado y no atiende al ratón ni al teclado.

```
buscar("BotonComprar").activado = juego.monedas >= 10
```

#### `yo.titulo`

En una ventana: lo que pone en su barra de arriba.

```
buscar("Ventana").titulo = "Tienda"
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

#### `yo.yendo`

Verdadero mientras va hacia el sitio de yo.irHacia(). Al llegar, falso.

```
si no yo.yendo:
    yo.irHacia(vector(aleatorio(0, 900), aleatorio(0, 500)))
```

#### `yo.etiquetas`

La lista de sus etiquetas.

```
mostrar(yo.etiquetas)
```

#### `yo.padre`

El objeto al que está pegado (o nulo).

```
si yo.padre != nulo:
    mostrar(yo.padre.nombre)
```

#### `yo.hijos`

La lista de los objetos pegados a este.

```
para cada h en yo.hijos:
    h.color = "rojo"
```

#### `yo.elevacion`

Cuánto está levantado del suelo, en píxeles. En primera persona (vista3d) es lo que flota o vuela: un dron, una bala, algo que salta. 0 = apoyado en el suelo.

```
yo.elevacion = 20
```

#### `yo.arrastrable`

Si es verdadero, se puede coger con el ratón y moverlo (puzles, inventarios, juegos de ordenar).

```
yo.arrastrable = verdadero
```

#### `yo.arrastrando`

Verdadero mientras se está arrastrando con el ratón (solo se lee).

```
si yo.arrastrando:
    yo.opacidad = 0.7
```

#### `yo.luz`

Si es verdadero, el objeto lleva una luz (se ve cuando la escena tiene oscuridad). Falso la apaga.

```
yo.luz = verdadero
```

#### `yo.tipoLuz`

"punto" (alumbra alrededor, como una antorcha) o "foco" (un cono hacia donde mira el objeto, como una linterna).

```
yo.tipoLuz = "foco"
```

#### `yo.colorLuz`

El color de la luz (blanca si no se dice): tiñe un poco lo que ilumina.

```
yo.colorLuz = "naranja"
```

#### `yo.radioLuz`

Hasta dónde llega la luz, en píxeles (220).

```
yo.radioLuz = 300
```

#### `yo.intensidadLuz`

Lo fuerte que es la luz, de 0 (apagada) a 1 (normal); más de 1 llega más lejos.

```
yo.intensidadLuz = 0.6
```

#### `yo.anguloLuz`

En un foco: lo abierto que es el cono, en grados (60). Mira hacia la rotación del objeto.

```
yo.anguloLuz = 40
```

#### `yo.luzConSombras`

Si es verdadero, lo sólido tapa la luz y hace sombra (las paredes de un laberinto).

```
yo.luzConSombras = verdadero
```

#### `yo.parpadeoLuz`

La luz tiembla como una llama, de 0 (quieta) a 1 (mucho).

```
yo.parpadeoLuz = 0.5
```

#### `yo.contorno`

Una línea de color alrededor de todo el objeto (nulo la quita). Para resaltar lo que se puede coger o al elegido.

```
yo.contorno = "blanco"
```

#### `yo.grosorContorno`

Lo gordo que es el contorno, en píxeles (3).

```
yo.grosorContorno = 5
```

#### `yo.brillo`

El brillo del objeto: 1 = normal, 0.5 = más oscuro, 2 = el doble de claro.

```
yo.brillo = 1.5
```

#### `yo.grises`

El objeto en escala de grises, de 0 (colores) a 1 (blanco y negro). Para lo que está apagado o no se puede usar.

```
yo.grises = 1
```

#### `yo.desenfoque`

El objeto borroso (en píxeles): cosas lejanas, fantasmas...

```
yo.desenfoque = 3
```

#### `yo.polvo`

Si es verdadero, levanta polvo al saltar y al caer al suelo (necesita física).

```
yo.polvo = verdadero
```

#### `yo.efecto`

El efecto que lleva siempre puesto: "fuego", "humo", "burbujas" o "estela" (nulo lo quita).

```
yo.efecto = "fuego"
```

#### `yo.relleno`

Cómo se rellena la forma: "color" (lo normal), "degradado" (de color a color2), "radial" (degradado redondo, del centro hacia fuera), "patron" (rayas, puntos...) o "imagen" (una imagen repetida).

```
yo.relleno = "degradado"
yo.color2 = "azul"
```

#### `yo.color2`

El segundo color: el final de un degradado o el dibujo de un patrón.

```
yo.color2 = "morado"
```

#### `yo.anguloDegradado`

Hacia dónde va el degradado, en grados: 0 = de izquierda a derecha, 90 = de abajo arriba (lo normal).

```
yo.anguloDegradado = 0
```

#### `yo.patron`

El dibujo del relleno "patron": "rayas", "puntos", "cuadros", "rombos", "ondas" o "ladrillos" (con color de fondo y color2 de dibujo).

```
yo.relleno = "patron"
yo.patron = "cuadros"
```

#### `yo.imagenRelleno`

La imagen del proyecto que se repite dentro de la forma, con relleno "imagen".

```
yo.relleno = "imagen"
yo.imagenRelleno = "ladrillo"
```

#### `yo.borde`

El grosor del borde en píxeles (0 = sin borde).

```
yo.borde = 3
```

#### `yo.colorBorde`

El color del borde (negro si no se dice).

```
yo.colorBorde = "blanco"
```

#### `yo.bordeDiscontinuo`

Si es verdadero, el borde es a rayitas (como una línea de recortar).

```
yo.bordeDiscontinuo = verdadero
```

#### `yo.sombra`

El color de la sombra (con algo de transparencia queda mejor: "#00000088"). verdadero pone una sombra gris; nulo la quita.

```
yo.sombra = "#00000088"
```

#### `yo.sombraX`

Cuánto se aparta la sombra hacia la derecha, en píxeles (6).

```
yo.sombraX = 10
```

#### `yo.sombraY`

Cuánto se aparta la sombra hacia arriba, en píxeles (-6: hacia abajo).

```
yo.sombraY = -10
```

#### `yo.desenfoqueSombra`

Lo borrosa que es la sombra (0 = con bordes duros).

```
yo.desenfoqueSombra = 0
```

#### `yo.resplandor`

Un brillo alrededor del objeto, de ese color (nulo lo quita). Muy bonito en monedas, poderes y textos.

```
yo.resplandor = "amarillo"
```

#### `yo.tamanoResplandor`

Lo grande que es el resplandor, en píxeles (16).

```
yo.tamanoResplandor = 30
```

#### `yo.mezcla`

Cómo se junta con lo que hay detrás: "normal", "sumar" (luz que se suma: fuego, magia), "multiplicar" (sombras), "pantalla", "superponer", "oscurecer", "aclarar" o "diferencia".

```
yo.mezcla = "sumar"
```

#### `yo.forma`

La forma del dibujo: "rectangulo", "circulo", "triangulo", "elipse", "poligono", "estrella", "rombo", "corazon", "flecha", "linea", "capsula", "redondeado", "anillo", "arco", "camino" o "texto". Choca con su forma de verdad.

```
yo.forma = "estrella"
```

#### `yo.lados`

Cuántos lados tiene un polígono (6 si no se dice) o cuántas puntas una estrella (5). De 3 a 64.

```
yo.forma = "poligono"
yo.lados = 8
```

#### `yo.radioInterior`

Lo grande que es el hueco de una estrella, un anillo o un arco, de 0 a 1 (0,5 en la estrella y 0,6 en el anillo).

```
yo.forma = "anillo"
yo.radioInterior = 0.8
```

#### `yo.radioEsquina`

En un rectángulo redondeado, el radio de las esquinas en píxeles.

```
yo.forma = "redondeado"
yo.radioEsquina = 12
```

#### `yo.inicioArco`

Dónde empieza un arco, en grados (0 = derecha, 90 = arriba).

```
yo.forma = "arco"
yo.inicioArco = 0
```

#### `yo.finArco`

Dónde termina un arco, en grados (180 si no se dice: medio anillo).

```
yo.forma = "arco"
yo.finArco = 270
```

#### `yo.grosor`

Lo gorda que es una línea o un camino abierto, en píxeles.

```
yo.forma = "linea"
yo.grosor = 10
```

#### `yo.formaColision`

Cómo choca: "auto" (con su forma, salvo los rectángulos), "caja" (como un rectángulo) o "figura" (con su forma, también girada).

```
yo.formaColision = "caja"
```

### Acciones

#### `yo.abrir()`

Enseña un control con todo lo que lleva dentro (sus hijos: lo pegado a él con pegarA). Para ventanas y menús que aparecen.

```
cuando se pulsa "i":
    buscar("Ventana").abrir()
```

#### `yo.cerrar()`

Esconde un control con todo lo que lleva dentro.

```
buscar("Ventana").cerrar()
```

#### `yo.enfocar()`

En un campo de texto: empieza a escribir en él, como si se hiciera clic. Mientras se escribe, las teclas son letras (no saltan los «cuando se pulsa»).

```
buscar("CampoNombre").enfocar()
```

#### `yo.meter("cosa", cantidad)`

En un inventario: mete esa cosa (una si no se dice cuántas). Si ya hay de esa, se suman; si no, va a la primera casilla vacía. Devuelve falso si no cabe. Si hay una imagen con ese nombre, se ve en la casilla.

```
cuando toco Llave:
    buscar("Inventario").meter("llave")
    destruir(otro)
```

#### `yo.sacar("cosa", cantidad)`

En un inventario: saca esa cosa (una si no se dice cuántas). Devuelve cuántas ha sacado de verdad (0 si no había).

```
si buscar("Inventario").sacar("llave") == 1:
    mostrar("puerta abierta")
```

#### `yo.cuantos("cosa")`

En un inventario: cuántas hay de esa cosa.

```
si buscar("Inventario").cuantos("moneda") >= 10:
    mostrar("puedes comprar")
```

#### `yo.vaciar()`

En un inventario: lo deja vacío.

```
buscar("Inventario").vaciar()
```

#### `yo.moverConJugador(numero, rapidez)`

Como moverConFlechas, pero con los controles de UN jugador (del 1 al 4): su trozo del teclado o su mando. Si el objeto cae (Fisica con gravedad) solo se mueve a los lados. Sin codigo: Comportamiento > «Lo maneja un jugador».

```
cuando cada fotograma:
    yo.moverConJugador(2, 300)
```

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

#### `yo.distanciaA(destino)`

Distancia en píxeles hasta otro objeto o una posición (también con dos números: x, y).

```
si yo.distanciaA(jugador) < 50:
```

#### `yo.irHacia(destino, rapidez)`

Va hasta un sitio o detras de un objeto (lo sigue aunque se mueva), RODEANDO las paredes del mapa de casillas si el juego se ve desde arriba. Rapidez en pixeles/segundo (150 si no se dice). Devuelve falso si no hay camino.

```
cuando empieza:
    yo.irHacia(buscar("Jugador"), 120)
```

#### `yo.atravesar("Nombre")`

Deja de chocar con los objetos de ese nombre, tipo o etiqueta: pasa a traves de ellos. Sigue chocando con las paredes y sigue avisando con cuando toco. Sirve para un dash que cruza enemigos o para balas que rebotan en las paredes pero no empujan a nadie.

```
yo.atravesar("enemigo")
esperar(0.2)
yo.dejarDeAtravesar("enemigo")
```

#### `yo.dejarDeAtravesar("Nombre")`

Vuelve a chocar con los objetos de ese nombre, tipo o etiqueta.

```
yo.dejarDeAtravesar("enemigo")
```

#### `yo.parar()`

Deja de ir a donde iba (irHacia, irA) y se queda quieto.

```
cuando toco Jugador:
    yo.parar()
```

#### `yo.irA(destino, segundos)`

Va SUAVEMENTE hasta un sitio en esos segundos (1 si no se dice). El sitio puede ser un objeto, una posición o dos números: yo.irA(400, 300, 2).

```
yo.irA(buscar("Meta"), 2)
```

#### `yo.teletransportar(destino)`

Se va DE GOLPE a otro sitio (un objeto, una posición o dos números), sin la velocidad que llevaba.

```
yo.teletransportar(100, 300)
```

#### `yo.avanzar(pasos)`

Se mueve hacia donde mira (según su rotación), como «mover pasos» de Scratch.

```
yo.rotacion = 45
yo.avanzar(10)
```

#### `yo.anguloA(destino)`

El ángulo (en grados) hacia otro objeto o posición: 0 = derecha, 90 = arriba.

```
variable a = yo.anguloA(raton.posicion)
```

#### `yo.rotarHacia(destino, gradosPorSegundo)`

Gira POCO A POCO hasta mirar hacia algo (180 grados por segundo si no se dice). Devuelve verdadero cuando ya lo mira. Úsalo en «cuando cada fotograma».

```
cuando cada fotograma:
    yo.rotarHacia(buscar("Jugador"), 90)
```

#### `yo.ocultar()`

Deja de verse (sigue existiendo y chocando). Es lo mismo que yo.visible = falso.

```
yo.ocultar()
```

#### `yo.aparecer()`

Vuelve a verse. Es lo mismo que yo.visible = verdadero.

```
yo.aparecer()
```

#### `yo.parpadear(segundos, vecesPorSegundo)`

Se enciende y se apaga durante esos segundos (1 si no se dice) y al final se queda visible. Típico al recibir un golpe.

```
cuando toco Enemigo:
    yo.parpadear(1)
```

#### `yo.ponerDelante()`

Se dibuja por encima de todos los demás (cambia su capa).

```
cuando hago clic encima:
    yo.ponerDelante()
```

#### `yo.ponerDetras()`

Se dibuja por debajo de todos los demás.

```
yo.ponerDetras()
```

#### `yo.tocando("Nombre")`

Verdadero si AHORA MISMO está tocando algo con ese nombre, tipo, etiqueta o tipo de casilla. Sin nada: si toca cualquier cosa.

```
si yo.tocando("Lava"):
    escena.reiniciar()
```

#### `yo.cercanos(radio, "Tipo")`

Una lista con los objetos a menos de esos píxeles (de ese tipo, si se dice), del más cercano al más lejano.

```
para cada e en yo.cercanos(150, "Enemigo"):
    e.empujar(300, 0)
```

#### `yo.masCercano("Tipo", radio)`

El objeto más cercano (de ese tipo, y a menos de esos píxeles si se dice), o nulo si no hay.

```
variable presa = yo.masCercano("Oveja")
si presa != nulo:
    yo.moverHacia(presa, 80)
```

#### `yo.clonar()`

Hace una copia de este objeto tal como está ahora, con su script. Devuelve la copia.

```
variable copia = yo.clonar()
copia.x += 50
```

#### `yo.ponerEtiqueta("etiqueta")`

Le pone una etiqueta. Un objeto puede tener varias. Sirven para agrupar cosas distintas: «cuando toco» y «yo.tocando» también las entienden.

```
yo.ponerEtiqueta("peligro")
```

#### `yo.quitarEtiqueta("etiqueta")`

Le quita una etiqueta.

```
yo.quitarEtiqueta("peligro")
```

#### `yo.tieneEtiqueta("etiqueta")`

Verdadero si tiene esa etiqueta.

```
cuando toco:
    si otro.tieneEtiqueta("peligro"):
        escena.reiniciar()
```

#### `yo.pegarA(otro)`

Se pega a otro objeto (su «padre»): a partir de ahora se mueve con él. Si el padre se destruye, él también.

```
variable espada = crear("Espada")
espada.pegarA(yo)
```

#### `yo.soltar()`

Se despega de su padre y vuelve a moverse solo.

```
yo.soltar()
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

#### `yo.flash(color, segundos)`

El objeto entero de un color (blanco si no se dice) un momento: al recibir un golpe.

```
cuando toco Bala:
    yo.flash()
```

#### `yo.ponerCamino(puntos, cerrado)`

Le da una forma libre: una lista de puntos (vectores, desde su centro). Cerrado (lo normal) se rellena; con falso es una línea.

```
yo.ponerCamino([vector(-50, -30), vector(0, 40), vector(50, -30)])
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

#### `mapa.abrirPuerta(columna, fila, segundos)`

Solo en mapas: abre la puerta de esa casilla poco a poco (0,6 segundos si no se dice). Abierta, se pasa por ella, y los rayos y yo.irHacia también. La casilla tiene que ser de un tipo marcado como puerta (en el editor: el mapa > su tipo de casilla > «es una puerta»).

```
variable mapa = buscar("Mapa")
mapa.abrirPuerta(5, 3)
```

#### `mapa.cerrarPuerta(columna, fila, segundos)`

Solo en mapas: cierra la puerta de esa casilla poco a poco. Cerrada, vuelve a ser una pared.

```
variable mapa = buscar("Mapa")
mapa.cerrarPuerta(5, 3)
```

#### `mapa.puertaAbierta(columna, fila)`

Solo en mapas: verdadero si la puerta de esa casilla está abierta lo bastante para pasar.

```
variable mapa = buscar("Mapa")
si mapa.puertaAbierta(5, 3):
    mostrar("paso")
```

#### `mapa.esPuerta(columna, fila)`

Solo en mapas: verdadero si en esa casilla hay una puerta (abierta o cerrada).

```
variable mapa = buscar("Mapa")
si mapa.esPuerta(mapa.columnaEn(yo.x + 40), mapa.filaEn(yo.y)):
    mostrar("hay una puerta")
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

#### `teclado.algunaSePulso()`

Verdadero en el fotograma en que se pulsa CUALQUIER tecla. Para «pulsa una tecla para empezar».

```
si teclado.algunaSePulso():
    escena.cambiar("Nivel1")
```

#### `teclado.ultima`

La última tecla que se ha pulsado (su nombre: "a", "espacio"...), o nulo si todavía ninguna.

```
cuando cada fotograma:
    yo.texto = "Última tecla: {teclado.ultima}"
```

#### `teclado.pulsadas`

Una lista con las teclas que están pulsadas ahora mismo.

```
mostrar(teclado.pulsadas)
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

#### `raton.objeto`

El objeto que hay debajo del ratón (el de más arriba), o nulo si no hay ninguno.

```
si raton.sePulso() y raton.objeto != nulo:
    destruir(raton.objeto)
```

#### `raton.visible`

Si es falso, la flecha del ratón no se ve encima del juego (para poner tu propia mira).

```
raton.visible = falso
```

#### `raton.capturado`

Si es verdadero, el juego se queda con el ratón: la flecha desaparece y no se sale de la pantalla, y lo que se mueve se lee en raton.movX y raton.movY. Para mirar con el ratón en primera persona. El navegador lo concede al hacer clic en el juego, y lo suelta con la tecla Escape (por eso al leerlo dice si lo tiene de verdad).

```
cuando empieza:
    raton.capturado = verdadero
```

#### `raton.movX`

Cuánto se ha movido el ratón a los lados en este fotograma, en píxeles (positivo = a la derecha). Solo se lee.

```
cuando cada fotograma:
    yo.rotacion -= raton.movX * 0.2
```

#### `raton.movY`

Cuánto se ha movido el ratón arriba o abajo en este fotograma, en píxeles (positivo = hacia arriba). Solo se lee.

```
cuando cada fotograma:
    yo.y += raton.movY
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

#### `escena.camaraDe(numero)`

Con la pantalla dividida (pantalla.dividir), la cámara de ese trozo: la 1 es la de siempre (escena.camara), la 2 la del segundo trozo... Tiene lo mismo que escena.camara: seguir, zoom, x, y, limites y temblar.

```
pantalla.dividir(2)
escena.camaraDe(2).seguir(buscar("Jugador2"))
```

#### `escena.oscuridad`

Oscuridad de la escena, de 0 (de día: no hacen falta luces) a 1 (negro donde no llega ninguna luz). Para cuevas y noches, con objetos que llevan luz.

```
escena.oscuridad = 0.9
```

#### `escena.luzAmbiente`

El color de la oscuridad (negro si no se dice). Un azul muy oscuro parece de noche.

```
escena.luzAmbiente = "#0a1030"
```

#### `escena.colorFondo`

El color del fondo de la escena.

```
escena.colorFondo = "azul"
```

#### `escena.cambiar("Nombre", segundos, transicion)`

Cambia a otra escena. Los datos de juego (juego.puntos...) se conservan. Con segundos, una transición: la pantalla se tapa y se destapa. Transiciones: "fundido" (la normal), "barrido", "circulo" y "pixelado".

```
escena.cambiar("Nivel2", 1)
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

#### `escena.camara.encuadrar(objetos, margen)`

PANTALLA COMPARTIDA: la cámara se pone en medio de esos objetos (una lista) y se aleja lo justo para que se vean todos, con un margen alrededor (120 si no se dice). Al juntarse vuelve a acercarse. Se quita con escena.camara.seguir(...) o con una lista vacía.

```
cuando empieza:
    escena.camara.encuadrar([buscar("Jugador1"), buscar("Jugador2")])
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

Efectos de sonido: los importados (.mp3, .ogg, .wav), los hechos con el generador de efectos (Proyecto > Sonidos > +) y los que se generan solos (sonido.efecto, sonido.tono).

```
sonido.reproducir("salto")
```

#### `sonido.reproducir("nombre", volumen, tono, lado)`

Reproduce un sonido del proyecto (importado, o hecho con el generador de efectos). Volumen de 0 a 1; tono 1 = normal, 2 = más agudo, 0.5 = más grave; lado de -1 (izquierda) a 1 (derecha). Los tres se pueden dejar sin poner.

```
sonido.reproducir("salto", 0.5, aleatorioDecimal(0.9, 1.1))
```

#### `sonido.bucle("nombre", volumen)`

Reproduce un sonido una y otra vez, hasta que se pare con sonido.parar("nombre").

```
sonido.bucle("motor", 0.4)
```

#### `sonido.parar("nombre")`

Para un sonido (o todos, sin nombre).

```
sonido.parar()
```

#### `sonido.sonando("nombre")`

Verdadero si ese sonido está sonando ahora.

```
si no sonido.sonando("motor"):
    sonido.bucle("motor")
```

#### `sonido.pausar()`

Congela TODO el sonido (efectos y música) sin perder por dónde iba.

```
sonido.pausar()
```

#### `sonido.seguir()`

Sigue el sonido que se había pausado con sonido.pausar().

```
sonido.seguir()
```

#### `sonido.efecto("nombre", volumen, tono)`

Un efecto de sonido que se GENERA solo, sin archivos: disparo, laser, explosion, golpe, salto, moneda, poder, dash, escudo, hielo, fuego, rayo, subir, perder, clic, alarma, dano. Con tono 2 suena mas agudo y con 0.5 mas grave.

```
cuando toco Moneda:
    sonido.efecto("moneda")
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

#### `sonido.reproducirEn("nombre", sitio, alcance, volumen)`

Reproduce un sonido EN UN SITIO del mundo (un objeto o un vector): suena más flojo cuanto más lejos está del oyente, y por el altavoz del lado donde está. El alcance es hasta dónde se oye, en píxeles (800 si no se dice).

```
cuando toco Bala:
    sonido.reproducirEn("explosion", otro, 900)
```

#### `sonido.bucleEn("nombre", sitio, alcance, volumen)`

Un sonido que no para, pegado a un objeto o a un punto: una cascada, un motor, una hoguera. Se oye al acercarse y va con el objeto; si el objeto se destruye, se para. Se quita con sonido.parar("nombre").

```
cuando empieza:
    sonido.bucleEn("cascada", yo, 600)
```

#### `sonido.ponerVolumen("nombre", volumen, segundos)`

Cambia el volumen de un sonido QUE YA ESTÁ SONANDO (de 0 a 1). Con segundos, poco a poco. Devuelve cuántos sonidos ha cambiado.

```
sonido.ponerVolumen("motor", 0.2, 1)
```

#### `sonido.ponerTono("nombre", tono, segundos)`

Cambia el tono (y la velocidad) de un sonido que ya está sonando: 1 = normal, 2 = más agudo y rápido. Un motor que acelera, una alarma que sube.

```
cuando cada fotograma:
    sonido.ponerTono("motor", 1 + yo.velocidad.x / 400)
```

#### `sonido.ponerPan("nombre", lado, segundos)`

Por qué lado suena un sonido que ya está sonando: -1 = izquierda, 0 = centro, 1 = derecha.

```
sonido.ponerPan("motor", -1)
```

#### `sonido.oyente`

Quién escucha los sonidos con sitio (sonido.reproducirEn, sonido.bucleEn): un objeto, o nulo para que sea el centro de la cámara (lo normal).

```
sonido.oyente = buscar("Jugador")
```

### `musica`

Música de fondo: suena en bucle y solo una a la vez. Vale un archivo importado o una canción hecha en el editor de música (Proyecto > Música); las pistas de una canción son capas que se suben y se bajan mientras se juega.

```
musica.reproducir("tema")
```

#### `musica.reproducir("nombre", fundido)`

Pone una música en bucle (para la anterior). Con un número, empieza en silencio y sube poco a poco durante esos segundos.

```
musica.reproducir("tema", 2)
```

#### `musica.parar(fundido)`

Para la música. Con un número, baja poco a poco durante esos segundos.

```
musica.parar(2)
```

#### `musica.pausar()`

Pone la música en pausa (recuerda por dónde iba).

```
musica.pausar()
```

#### `musica.seguir()`

Sigue la música por donde iba.

```
musica.seguir()
```

#### `musica.volumen`

Volumen de la música, de 0 a 1.

```
musica.volumen = 0.3
```

#### `musica.cruzar("nombre", segundos)`

Pasa a otra música CRUZÁNDOLAS: la que suena baja mientras la nueva sube (2 segundos si no se dice). Para pasar de la música tranquila a la de combate sin cortes.

```
cuando recibo "jefe":
    musica.cruzar("combate", 2)
```

#### `musica.capa(numero, volumen, segundos)`

Sube o baja UNA capa de la música que suena. Las capas son las pistas de una canción hecha en el editor de música, en su orden (la 1 es la primera). Con segundos, poco a poco.

```
cuando recibo "peligro":
    musica.capa(3, 1, 2)
```

#### `musica.intensidad`

Música adaptativa con un solo número: con 0 solo suena la primera capa, con 1 todas, y en medio van entrando una a una. Para canciones del editor de música con varias pistas. Se recuerda: la música siguiente empieza con esa intensidad.

```
musica.intensidad = contar("Enemigo") / 10
```

#### `musica.tono`

La velocidad de la música (y su tono): 1 = normal, 1.2 = más rápida y aguda, 0.8 = más lenta y grave. De 0.25 a 4.

```
si juego.tiempo < 10:
    musica.tono = 1.3
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

La velocidad del tiempo: 1 = normal, 0.5 = cámara lenta, 2 = el doble de rápido, 0 = pausa.

```
tiempo.escala = 0.5
```

#### `tiempo.pausado`

Verdadero si el juego está en pausa (tiempo.pausar()).

```
si tiempo.pausado:
    yo.texto = "PAUSA"
```

#### `tiempo.fps`

Fotogramas por segundo: cuántas veces por segundo se dibuja el juego (60 es lo normal).

```
yo.texto = "FPS: {tiempo.fps}"
```

#### `tiempo.pausar()`

Pone el juego en pausa: todo se para (física, animaciones, cronómetros), pero las teclas siguen funcionando para poder quitarla.

```
cuando se pulsa "p":
    si tiempo.pausado:
        tiempo.seguir()
    sino:
        tiempo.pausar()
```

#### `tiempo.seguir()`

Quita la pausa.

```
tiempo.seguir()
```

#### `tiempo.congelar(segundos)`

Congela el juego un instante (0,08 segundos si no se dice): al dar un golpe fuerte, se nota mucho más.

```
cuando toco Enemigo:
    tiempo.congelar(0.1)
```

#### `tiempo.camaraLenta(velocidad, segundos)`

Cámara lenta durante un rato y luego vuelve sola a la normalidad.

```
cuando toco Enemigo:
    tiempo.camaraLenta(0.3, 1)
```

### `tactil`

Jugar con el dedo, en móviles y tabletas: una palanca (joystick) y botones en la pantalla, arrastrar para mirar, gestos y vibración. La palanca hace de flechas y cada botón pulsa una tecla, así que el resto del juego no cambia. Solo se ven cuando se juega con el dedo (con teclado o mando se esconden), y quien juega puede moverlos a su gusto. Si no pones ninguno, Chispa pone solo los botones de las teclas que usa tu juego.

```
cuando empieza:
    tactil.joystick()
    tactil.boton("Saltar", "espacio")
```

#### `tactil.joystick(lado)`

Pone una palanca en la pantalla, a la "izquierda" (si no se dice) o a la "derecha". Hace lo mismo que las flechas: con yo.moverConFlechas ya funciona, y además poco inclinada va despacio. Con tactil.joystick("izquierda", falso) no pulsa las flechas: solo se lee con tactil.x y tactil.y.

```
cuando empieza:
    tactil.joystick()

cuando cada fotograma:
    yo.moverConFlechas(300)
```

#### `tactil.boton("nombre", "tecla")`

Pone un botón en la pantalla con ese nombre (12 letras como mucho). Si se le da una tecla, al tocarlo es como pulsarla: «cuando se pulsa "espacio"» salta igual. Sin tecla, se pregunta con tactil.pulsado("nombre"). Caben 12.

```
cuando empieza:
    tactil.boton("Saltar", "espacio")

cuando se pulsa "espacio":
    yo.saltar(600)
```

#### `tactil.pulsado("nombre")`

Verdadero mientras se tiene el dedo en ese botón.

```
cuando cada fotograma:
    si tactil.pulsado("Fuego"):
        mostrar("disparando")
```

#### `tactil.sePulso("nombre")`

Verdadero solo en el fotograma en que se toca ese botón (una vez por toque).

```
cuando cada fotograma:
    si tactil.sePulso("Fuego"):
        crear("Bala", yo.x, yo.y)
```

#### `tactil.seSolto("nombre")`

Verdadero solo en el fotograma en que se levanta el dedo de ese botón.

```
cuando cada fotograma:
    si tactil.seSolto("Cargar"):
        mostrar("¡suelta!")
```

#### `tactil.x`

Cuánto está inclinada la palanca a los lados: de -1 (izquierda) a 1 (derecha). 0 si no se toca.

```
yo.x += tactil.x * 300 * delta
```

#### `tactil.y`

Cuánto está inclinada la palanca arriba o abajo: de -1 (abajo) a 1 (arriba). 0 si no se toca.

```
yo.y += tactil.y * 300 * delta
```

#### `tactil.mirar()`

Activa «arrastrar para mirar»: lo que se mueve el dedo por la pantalla (fuera de los controles) se lee en tactil.miraX y tactil.miraY. Para apuntar o mover la cámara. tactil.mirar(falso) lo apaga.

```
cuando empieza:
    tactil.mirar()

cuando cada fotograma:
    yo.rotacion -= tactil.miraX
```

#### `tactil.miraX`

Con tactil.mirar(): cuánto se ha movido el dedo a los lados en este fotograma, en píxeles del juego (positivo = a la derecha).

```
escena.camara.x -= tactil.miraX
```

#### `tactil.miraY`

Con tactil.mirar(): cuánto se ha movido el dedo arriba o abajo en este fotograma (positivo = hacia arriba).

```
escena.camara.y -= tactil.miraY
```

#### `tactil.gesto`

El gesto que se ha hecho con el dedo en este fotograma: "toque", "doble" (dos toques seguidos), "largo" (dedo quieto), "arriba", "abajo", "izquierda" o "derecha" (deslizar). "" si no ha habido ninguno.

```
cuando cada fotograma:
    si tactil.gesto == "arriba":
        yo.saltar(600)
```

#### `tactil.pellizco`

Pellizcar con dos dedos: cuánto se han separado en este fotograma. 1 = igual, más de 1 = se separan, menos de 1 = se juntan. Para acercar la cámara.

```
cuando cada fotograma:
    escena.camara.zoom = escena.camara.zoom * tactil.pellizco
```

#### `tactil.dedos`

Cuántos dedos están tocando la pantalla del juego ahora.

```
si tactil.dedos == 2:
    mostrar("dos dedos")
```

#### `tactil.toques`

Dónde está cada dedo que toca la pantalla, en el mundo: una lista de vectores (vacía si no hay ninguno).

```
para cada dedo en tactil.toques:
    dibujar.circulo(dedo.x, dedo.y, 30, "amarillo")
```

#### `tactil.hay`

Verdadero si el aparato se maneja con el dedo (un móvil, una tableta) o se está tocando la pantalla ahora. Para cambiar algo del juego según sea móvil u ordenador.

```
si tactil.hay:
    buscar("Ayuda").texto = "Toca para saltar"
sino:
    buscar("Ayuda").texto = "Espacio para saltar"
```

#### `tactil.mostrar`

Cuándo se ven los controles: "auto" (solo cuando se juega con el dedo: lo normal), "siempre" o "nunca".

```
tactil.mostrar = "siempre"
```

#### `tactil.tamano`

El tamaño de los controles: 1 = normal, de 0.5 (la mitad) a 2 (el doble).

```
tactil.tamano = 1.3
```

#### `tactil.opacidad`

Cuánto se ven los controles: de 0.1 (casi nada) a 1 (del todo). 0.6 si no se dice.

```
tactil.opacidad = 0.4
```

#### `tactil.mover("nombre", x, y)`

Pone un control ("joystick" o el nombre de un botón) en un sitio de la pantalla: x de 0 (izquierda) a 100 (derecha) e y de 0 (abajo) a 100 (arriba). Si quien juega lo ha movido a su gusto, manda lo suyo.

```
cuando empieza:
    tactil.boton("Saltar", "espacio")
    tactil.mover("Saltar", 85, 20)
```

#### `tactil.quitar("nombre")`

Quita un control ("joystick" o un botón). Sin nombre, los quita todos.

```
tactil.quitar("Saltar")
```

#### `tactil.colocar()`

Abre el modo colocar: quien juega arrastra cada control a donde le venga bien y pulsa «Listo». Se le recuerda para las siguientes partidas. Ponlo en un botón de tu menú de opciones.

```
cuando hago clic encima:
    tactil.colocar()
```

#### `tactil.vibrar(segundos)`

Hace vibrar el móvil (0,1 segundos si no se dice; como mucho 5). Si el aparato no sabe vibrar (los iPhone, los ordenadores), no pasa nada. Para un mando, mando.vibrar.

```
cuando toco Enemigo:
    tactil.vibrar(0.2)
```

### `vista3d`

Ver el juego en PRIMERA PERSONA, con 3D simulado (como los primeros juegos de disparos). El juego es el de siempre, visto desde arriba: un mapa de casillas, objetos, física sin gravedad. Con vista3d.ver(yo) se pinta desde los ojos de ese objeto: las casillas sólidas del mapa son paredes (con su imagen), las que no lo son son baldosas del suelo, y cada objeto es un dibujo que siempre te mira, más pequeño cuanto más lejos. Se gira con yo.rotacion y se anda como siempre. Todo lo demás (choques, yo.irHacia, rayo, sonidos con sitio) funciona igual.

```
cuando empieza:
    vista3d.ver(yo)
    vista3d.niebla("negro", 200, 900)

cuando cada fotograma:
    si teclado.pulsada("izquierda"):
        yo.rotacion += 120 * delta
    si teclado.pulsada("derecha"):
        yo.rotacion -= 120 * delta
    si teclado.pulsada("arriba"):
        yo.avanzar(200 * delta)
```

#### `vista3d.ver(objeto)`

Pone la vista en primera persona: el mundo se ve desde ese objeto (desde yo, si no se dice), mirando hacia donde apunta su rotación. Hace falta un mapa de casillas en la escena: sus casillas sólidas son las paredes. El objeto desde el que se mira no se ve.

```
cuando empieza:
    vista3d.ver(yo)
```

#### `vista3d.quitar()`

Vuelve a la vista normal, desde arriba (por ejemplo, para enseñar el mapa entero).

```
cuando se pulsa "m":
    vista3d.quitar()
```

#### `vista3d.activa`

Verdadero si se está viendo en primera persona (solo se lee: se pone con vista3d.ver y se quita con vista3d.quitar).

```
si vista3d.activa:
    mostrar("en primera persona")
```

#### `vista3d.observador`

El objeto desde el que se mira, o nulo si la vista no está puesta (solo se lee).

```
si vista3d.observador == yo:
    mostrar("miro yo")
```

#### `vista3d.campo`

Cuánto se ve a lo ancho, en grados: de 30 (como con unos prismáticos) a 120 (ojo de pez). 66 si no se dice. Bajarlo de golpe sirve para apuntar con zoom.

```
cuando empieza:
    vista3d.ver(yo)
    vista3d.campo = 80
```

#### `vista3d.altura`

A qué altura están los ojos: de 0.05 (pegados al suelo) a 0.95 (pegados al techo). 0.5 si no se dice. Para agacharse, o para que la vista suba y baje un poco al andar.

```
cuando cada fotograma:
    vista3d.altura = 0.5 + seno(tiempo.total * 400) * 0.02
```

#### `vista3d.inclinacion`

Mirar hacia arriba (positivo) o hacia abajo (negativo): de -1 a 1. 0 = de frente.

```
cuando cada fotograma:
    vista3d.inclinacion = limitar(vista3d.inclinacion + raton.movY * 0.002, -0.6, 0.6)
```

#### `vista3d.brillo`

La luz de todo lo que se ve en 3D: 1 = normal, 0 = a oscuras, hasta 3. Subirlo un instante hace el destello de un disparo.

```
cuando se pulsa "espacio":
    vista3d.brillo = 1.6
    animar(vista3d.brillo, 1, 0.15)
```

#### `vista3d.suelo("imagen o color")`

Con qué se pinta el suelo donde el mapa no tiene casilla: una imagen del proyecto (se repite en cada casilla) o un color. Las casillas NO sólidas del mapa se ven como baldosas con su propia imagen.

```
cuando empieza:
    vista3d.ver(yo)
    vista3d.suelo("#444444")
```

#### `vista3d.techo("imagen o color")`

Con qué se pinta el techo: una imagen del proyecto o un color. Quita el cielo si lo había.

```
cuando empieza:
    vista3d.ver(yo)
    vista3d.techo("#222233")
```

#### `vista3d.cielo("imagen")`

Un cielo en vez de techo: una imagen ancha que da la vuelta entera al girar y nunca se acerca (para sitios al aire libre). Sin nada, vista3d.cielo() lo quita.

```
cuando empieza:
    vista3d.ver(yo)
    vista3d.cielo("jugador")
```

#### `vista3d.pared("tipo", "imagen")`

Cambia la imagen con la que se pinta un tipo de casilla del mapa en primera persona (si no se dice, la del mapa). Sirve para que una pared tenga un dibujo desde arriba y otro de frente.

```
cuando empieza:
    vista3d.pared("suelo", "jugador")
```

#### `vista3d.niebla("color", desde, hasta)`

Niebla con la distancia: a «desde» píxeles empieza a notarse y a «hasta» ya solo se ve el color de la niebla. Da ambiente, y además lo que queda detrás no hay que pintarlo. Sin nada, vista3d.niebla() la quita.

```
cuando empieza:
    vista3d.ver(yo)
    vista3d.niebla("negro", 200, 900)
```

#### `vista3d.mapa(objeto)`

Elige qué mapa de casillas hace de paredes, si en la escena hay más de uno (si no se dice, el primero que tenga casillas sólidas).

```
cuando empieza:
    vista3d.mapa(buscar("Mapa"))
    vista3d.ver(yo)
```

#### `vista3d.enPantalla(objeto, altura)`

En qué punto de la pantalla se ve un objeto (o una posición) en primera persona: un vector, como los de dibujar.enPantalla; o nulo si queda detrás de ti. Para poner un nombre, una barra de vida o una flecha encima de alguien. La altura, en píxeles desde el suelo (si no se dice, la de en medio).

```
cuando cada fotograma:
    variable p = vista3d.enPantalla(buscar("Jugador"))
    si p != nulo:
        dibujar.enPantalla.texto("AQUI", p.x, p.y, "blanco")
```

#### `vista3d.seVe(objeto)`

Verdadero si ese objeto (o esa posición) se ve ahora mismo en la pantalla: está delante y no lo tapa una pared.

```
cuando cada fotograma:
    si vista3d.seVe(buscar("Jugador")):
        mostrar("lo veo")
```

#### `vista3d.columnas`

Cuántas columnas tiene la imagen en 3D (cada una es un rayo). Si no se toca (0), las que diga pantalla.calidad: 640 en alta, 480 en media y 320 en baja. Con menos va más rápido y se ve más «pixelado». De 64 a 1280.

```
cuando empieza:
    vista3d.columnas = 320
```

#### `vista3d.milisegundos`

Lo que ha tardado en pintarse la vista 3D en el último fotograma, en milésimas de segundo (solo se lee). Para medir: a 60 fotogramas por segundo, cada uno tiene 16 en total.

```
cuando cada 1 segundos:
    mostrar(vista3d.milisegundos)
```

### `puntuaciones`

La tabla de las 10 mejores puntuaciones del juego, con el nombre de quien las hizo. Se guarda en el ordenador de quien juega (como guardar y cargar). En el editor, «Pantallas listas» trae una pantalla de Fin del juego y una Tabla de puntuaciones que ya la usan.

```
si puntuaciones.entra(juego.puntos):
    puntuaciones.guardar("Ana", juego.puntos)
```

#### `puntuaciones.guardar("nombre", puntos)`

Apunta una puntuación en la tabla. Devuelve su puesto (1 = la mejor) o 0 si no entra entre las 10 mejores.

```
variable puesto = puntuaciones.guardar("Ana", juego.puntos)
si puesto == 1:
    mostrar("¡Nuevo record!")
```

#### `puntuaciones.lista()`

Las mejores puntuaciones, de mayor a menor: una lista de tablas con nombre y puntos.

```
para cada p en puntuaciones.lista():
    mostrar(p.nombre, p.puntos)
```

#### `puntuaciones.entra(puntos)`

Verdadero si esos puntos entrarían en la tabla (hay hueco, o superan a la última).

```
si puntuaciones.entra(juego.puntos):
    mostrar("¡Escribe tu nombre!")
```

#### `puntuaciones.borrar()`

Deja la tabla vacía.

```
puntuaciones.borrar()
```

### `junta`

Unir objetos con cuerdas, muelles y bisagras. El objeto que se une necesita Física (y no ser estático); el otro extremo puede ser otro objeto o un punto del mundo (un vector). Se dibujan solas (junta.visibles = falso para que no).

```
cuando empieza:
    junta.cuerda(yo, vector(yo.x, yo.y + 200))
```

#### `junta.cuerda(objeto, otro, largo, color)`

Una cuerda: no deja que se separen más de su largo (si no se dice, lo lejos que están ahora). Más cerca está floja. Para péndulos, lianas, ganchos y cadenas.

```
junta.cuerda(yo, buscar("Gancho"), 200)
```

#### `junta.muelle(objeto, otro, largo, rigidez, color)`

Un muelle: tira hacia su largo, más fuerte cuanto más lejos, y se queda botando. La rigidez (60 si no se dice) es lo duro que es: 10 = goma blanda, 300 = muy duro.

```
junta.muelle(yo, buscar("Techo"), 120, 60)
```

#### `junta.bisagra(objeto, eje, color)`

Una bisagra: el objeto se queda siempre a la misma distancia del eje (un punto u otro objeto) y gira a su alrededor, como una puerta, un péndulo rígido o un balancín.

```
junta.bisagra(yo, vector(yo.x, yo.y + 150))
```

#### `junta.quitar(objeto, otro)`

Suelta las juntas de un objeto: todas, o solo las que lo unen con otro. Devuelve cuántas ha quitado.

```
cuando se pulsa "espacio":
    junta.quitar(yo)
```

#### `junta.visibles`

Si las juntas se dibujan (verdadero, lo normal) o no (falso: para dibujarlas a tu manera).

```
junta.visibles = falso
```

### `efecto`

Efectos especiales listos con un comando. El sitio puede ser un objeto (el efecto lo sigue), un vector, dos números (x, y) o nada (donde está este objeto). Los que duran (fuego, humo, burbujas, estela, lluvia, nieve, hojas) siguen hasta que se paran con efecto.parar o se acaban sus segundos.

```
cuando toco Bomba:
    efecto.explosion(otro)
    destruir(otro)
```

#### `efecto.explosion(sitio, tamaño)`

Una explosión: fuego, humo, un destello y una onda. Con tamaño 2, el doble de grande.

```
efecto.explosion(yo, 2)
```

#### `efecto.fuego(sitio, segundos)`

Fuego que no se apaga (o que dura esos segundos). Si el sitio es un objeto, el fuego va con él.

```
efecto.fuego(yo)
```

#### `efecto.humo(sitio, segundos)`

Humo que sube y se deshace.

```
efecto.humo(yo, 3)
```

#### `efecto.chispas(sitio)`

Un puñado de chispas que brillan.

```
efecto.chispas(otro)
```

#### `efecto.rayo(desde, hasta, color)`

Un rayo eléctrico en zigzag entre dos sitios (si son objetos, los sigue). Dura un momento.

```
efecto.rayo(yo, buscar("Enemigo"))
```

#### `efecto.estela(objeto, segundos)`

Una estela detrás del objeto: copias de él que se apagan (para cosas que van rápido).

```
efecto.estela(yo)
```

#### `efecto.onda(sitio, radio)`

Una onda expansiva: un anillo que crece y se apaga.

```
efecto.onda(yo, 200)
```

#### `efecto.destello(sitio, tamaño)`

Un destello de luz redondo, muy rápido.

```
efecto.destello(yo, 150)
```

#### `efecto.lluvia(intensidad)`

Lluvia por toda la pantalla. Intensidad: 1 normal, 3 tormenta, 0 la para.

```
efecto.lluvia(2)
```

#### `efecto.nieve(intensidad)`

Nieve cayendo por toda la pantalla (0 la para).

```
efecto.nieve()
```

#### `efecto.hojas(intensidad)`

Hojas de otoño cayendo y girando (0 las para).

```
efecto.hojas()
```

#### `efecto.burbujas(sitio, segundos)`

Burbujas que suben haciendo eses.

```
efecto.burbujas(yo)
```

#### `efecto.confeti(sitio)`

Confeti de colores, para celebrar.

```
efecto.confeti(yo)
```

#### `efecto.sangre(sitio)`

Gotas de sangre. Con efecto.suave (lo normal) sale tinta de colores con estrellitas.

```
efecto.sangre(otro)
```

#### `efecto.tinta(sitio)`

Una salpicadura de tinta de colores.

```
efecto.tinta(otro)
```

#### `efecto.polvo(objeto)`

Polvo a los pies del objeto (al saltar o al caer). Con yo.polvo = verdadero sale solo.

```
efecto.polvo(yo)
```

#### `efecto.golpe(objeto, daño)`

Un golpe: chispitas y el número de daño, que sube y se desvanece. Con un texto, sale el texto.

```
efecto.golpe(otro, 25)
```

#### `efecto.texto("texto", sitio, color)`

Un texto que sube y se desvanece: "+1", "¡Bien!"...

```
efecto.texto("+1", yo, "amarillo")
```

#### `efecto.usar("nombre", sitio, segundos)`

Un efecto hecho por ti en el editor de partículas (Proyecto > Efectos).

```
efecto.usar("magia", yo)
```

#### `efecto.parar("nombre", sitio)`

Para los efectos que duran: los de ese nombre (y de ese objeto, si se dice), o todos si no se dice nada.

```
efecto.parar("fuego", yo)
```

#### `efecto.suave`

Versión suave para los más pequeños: si es verdadero (lo normal), la sangre sale como tinta de colores.

```
efecto.suave = falso
```

### `pantalla`

La pantalla del juego: su tamaño, fundidos, un flash y filtros para todo lo que se ve (escala de grises, pixelado, viñeta, tele antigua...). Los filtros duran hasta que se cambian o se cambia de escena.

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

#### `pantalla.completa`

Pantalla completa: verdadero para ponerla, falso para quitarla. El navegador solo deja justo después de pulsar una tecla o hacer clic.

```
cuando se pulsa "f":
    pantalla.completa = no pantalla.completa
```

#### `pantalla.calidad`

La calidad con la que se pinta el juego: "auto" (la que aguante el aparato: si va a trompicones se baja sola, y si va sobrado vuelve a subir), "alta", "media" o "baja". Con menos calidad hay menos píxeles, menos partículas y luces sin sombras: se ve un poco peor pero va fluido en un móvil lento. Se elige también en el inspector > Proyecto.

```
cuando empieza:
    pantalla.calidad = "baja"
```

#### `pantalla.nivelCalidad`

La calidad que hay puesta ahora mismo: "alta", "media" o "baja" (con pantalla.calidad = "auto" puede ir cambiando). Solo se lee.

```
mostrar(pantalla.nivelCalidad)
```

#### `pantalla.maximoFps`

Cuántos fotogramas por segundo se pintan como mucho (0 = los que dé la pantalla). Con 30 el aparato trabaja la mitad: gasta menos batería y se calienta menos. El juego va igual de rápido.

```
cuando empieza:
    pantalla.maximoFps = 30
```

#### `pantalla.orientacion`

Cómo hay que tener el móvil para jugar: "horizontal" (tumbado), "vertical" (de pie) o "cualquiera". Si alguien lo abre al revés, sale un aviso de «gira el móvil». En un ordenador no hace nada.

```
cuando empieza:
    pantalla.orientacion = "horizontal"
```

#### `pantalla.oscurecer(segundos, color, cuanto)`

Fundido: la pantalla se va poniendo de un color (negro si no se dice) durante esos segundos. Cuanto va de 0 a 1: con 0.5 se oscurece a medias y se sigue viendo el juego (1 si no se dice).

```
pantalla.oscurecer(0.2, "negro", 0.5)
```

#### `pantalla.dividir(cuantas, como)`

Divide la pantalla en 2, 3 o 4 trozos, cada uno con su cámara (escena.camaraDe(2)...): para jugar varios en el mismo ordenador. Con 2: "columnas" (lado a lado, lo normal) o "filas" (una encima de otra). pantalla.dividir(1) la deja entera. Al cambiar de escena vuelve a estar entera.

```
pantalla.dividir(2)
escena.camara.seguir(buscar("Jugador1"))
escena.camaraDe(2).seguir(buscar("Jugador2"))
```

#### `pantalla.flash(color, segundos)`

Toda la pantalla de un color (blanco si no se dice) que se apaga enseguida: golpes fuertes, rayos, fotos.

```
pantalla.flash("blanco", 0.2)
```

#### `pantalla.normal()`

Quita todos los filtros de pantalla.

```
pantalla.normal()
```

#### `pantalla.grises`

Escala de grises: 0 = colores normales, 1 = blanco y negro.

```
pantalla.grises = 1
```

#### `pantalla.desenfoque`

Todo borroso (en píxeles). Muy útil detrás de un menú de pausa.

```
pantalla.desenfoque = 4
```

#### `pantalla.pixelado`

Todo con «píxeles gordos» de ese tamaño (1 = normal).

```
pantalla.pixelado = 4
```

#### `pantalla.brillo`

El brillo de todo: 1 = normal, 0.5 = más oscuro, 1.5 = más claro.

```
pantalla.brillo = 0.6
```

#### `pantalla.vineta`

Viñeta: los bordes de la pantalla más oscuros, de 0 a 1. Da ambiente (cuevas, miedo).

```
pantalla.vineta = 0.7
```

#### `pantalla.aberracion`

Aberración cromática: los colores se separan un poco (píxeles). Queda bien al recibir un golpe.

```
pantalla.aberracion = 4
```

#### `pantalla.crt`

Efecto de tele antigua: rayas, bordes oscuros y colores algo separados.

```
pantalla.crt = verdadero
```

#### `pantalla.bloom`

Lo brillante deja un halo de luz alrededor, de 0 a 1 (fuego, neón, magia).

```
pantalla.bloom = 0.6
```

#### `pantalla.aclarar(segundos)`

Quita el fundido poco a poco.

```
pantalla.aclarar(1)
```

### `dibujar`

Dibujar líneas, círculos, rectángulos y textos en el mundo del juego, para ver cosas mientras programas (a dónde apunta algo, hasta dónde ve un enemigo...). Lo dibujado dura UN fotograma: ponlo en «cuando cada fotograma». Colores: los de siempre ("rojo" si no se dice).

```
cuando cada fotograma:
    dibujar.circulo(yo.x, yo.y, 200, "amarillo")
```

#### `dibujar.linea(x1, y1, x2, y2, color, grosor)`

Una línea de un punto a otro.

```
dibujar.linea(yo.x, yo.y, raton.x, raton.y, "rojo")
```

#### `dibujar.circulo(x, y, radio, color, relleno)`

Un círculo (solo el borde; con verdadero al final, relleno).

```
dibujar.circulo(yo.x, yo.y, 100, "verde")
```

#### `dibujar.rectangulo(x, y, ancho, alto, color, relleno)`

Un rectángulo con su centro en (x, y), como los objetos.

```
dibujar.rectangulo(yo.x, yo.y, 64, 64, "azul")
```

#### `dibujar.texto(texto, x, y, color, tamano, letra)`

Un texto en ese sitio del mundo (por ejemplo, encima de un enemigo). Al final se puede decir el tipo de letra ("pixel", "titulo"...).

```
dibujar.texto(yo.vida, yo.x, yo.y + 40, "blanco")
```

#### `dibujar.elipse(x, y, ancho, alto, color, relleno)`

Un círculo aplastado con su centro en (x, y): ancho y alto es lo que mide entera. Solo el borde; con verdadero al final, rellena.

```
dibujar.elipse(yo.x, yo.y - 30, 80, 20, "negro", verdadero)
```

#### `dibujar.poligono(puntos, color, relleno, grosor)`

Una forma con los puntos que quieras: una lista de vectores, en orden (se cierra sola). Solo el borde; con verdadero, rellena.

```
dibujar.poligono([vector(100, 100), vector(200, 100), vector(150, 180)], "amarillo", verdadero)
```

#### `dibujar.arco(x, y, radio, desde, hasta, color, relleno, grosor)`

Un trozo de circulo de un angulo a otro, en grados (0 = derecha, 90 = arriba, y se cuenta al reves que las agujas del reloj). Con relleno = verdadero es un quesito: sirve para enseñar cuanto falta de un tiempo.

```
variable falta = 0.25
dibujar.arco(yo.x, yo.y, 30, 90, 90 + 360 * falta, "#00000099", verdadero)
```

#### `dibujar.enPantalla`

Lo mismo, pero en la PANTALLA, como la interfaz: (0, 0) es la esquina de abajo a la izquierda y no se mueve con la camara. Sirve para barras de vida, marcadores e iconos.

```
dibujar.enPantalla.rectangulo(120, 700, 200, 16, "rojo", verdadero)
```

### `dibujar.enPantalla`

Dibujar en la pantalla (sin camara): lo mismo que dibujar, con (0, 0) en la esquina de abajo a la izquierda. Dura un fotograma. Se ve por encima del mundo, pero por debajo de los objetos de la interfaz (asi un texto o un panel de pausa quedan siempre encima).

```
cuando cada fotograma:
    dibujar.enPantalla.rectangulo(110, 700, 200 * yo.vida / 100, 16, "rojo", verdadero)
```

#### `dibujar.enPantalla.linea(x1, y1, x2, y2, color, grosor)`

Una linea en la pantalla.

```
dibujar.enPantalla.linea(0, 360, 1280, 360, "blanco")
```

#### `dibujar.enPantalla.circulo(x, y, radio, color, relleno)`

Un circulo en la pantalla.

```
dibujar.enPantalla.circulo(60, 60, 30, "blanco", verdadero)
```

#### `dibujar.enPantalla.rectangulo(x, y, ancho, alto, color, relleno)`

Un rectangulo con el centro en (x, y) de la pantalla.

```
dibujar.enPantalla.rectangulo(110, 700, 200, 16, "rojo", verdadero)
```

#### `dibujar.enPantalla.texto(texto, x, y, color, tamano, letra)`

Un texto en la pantalla. Al final se puede decir el tipo de letra.

```
dibujar.enPantalla.texto("Vida", 20, 700, "blanco")
```

#### `dibujar.enPantalla.elipse(x, y, ancho, alto, color, relleno)`

Una elipse en la pantalla, con el centro en (x, y).

```
dibujar.enPantalla.elipse(480, 60, 300, 40, "blanco")
```

#### `dibujar.enPantalla.poligono(puntos, color, relleno, grosor)`

Una forma con los puntos que quieras (una lista de vectores) en la pantalla.

```
dibujar.enPantalla.poligono([vector(20, 20), vector(60, 20), vector(40, 55)], "rojo", verdadero)
```

#### `dibujar.enPantalla.arco(x, y, radio, desde, hasta, color, relleno, grosor)`

Un trozo de circulo en la pantalla (quesito si relleno = verdadero).

```
dibujar.enPantalla.arco(60, 60, 30, 90, 270, "#00000099", verdadero)
```

### `mando`

El mando de consola (el primero que se conecte). No hace falta para jugar con mando: la cruceta y la palanca ya son las flechas, A es espacio, B es "x", X es "z", Y es "c", start es enter y select es escape.

```
cuando cada fotograma:
    yo.x += mando.ejeX * 300 * delta
```

#### `mando.conectado`

Verdadero si hay un mando conectado.

```
si mando.conectado:
    mostrar("Mando listo")
```

#### `mando.ejeX`

La palanca izquierda de lado: de -1 (izquierda) a 1 (derecha). 0 en el centro.

```
yo.x += mando.ejeX * 300 * delta
```

#### `mando.ejeY`

La palanca izquierda de arriba abajo: de -1 (abajo) a 1 (arriba).

```
yo.y += mando.ejeY * 300 * delta
```

#### `mando.comoTeclado`

Si es verdadero (lo normal), el mando hace de teclado: la palanca y la cruceta son las flechas, A es espacio, B es "x"... Con falso deja de pulsar teclas y solo se lee con mando.ejeX, mando.pulsado... Hace falta cuando las flechas y la palanca tienen que hacer cosas DISTINTAS (en primera persona: las flechas giran y la palanca anda de lado).

```
cuando empieza:
    mando.comoTeclado = falso
```

#### `mando.ejeDerechoX`

La palanca derecha de lado (de -1 a 1). Sirve para apuntar.

```
yo.rotacion = angulo(vector(0, 0), vector(mando.ejeDerechoX, mando.ejeDerechoY))
```

#### `mando.ejeDerechoY`

La palanca derecha de arriba abajo (de -1 a 1).

```
mostrar(mando.ejeDerechoY)
```

#### `mando.pulsado("boton")`

Verdadero mientras el boton esta pulsado. Botones: a, b, x, y, lb, rb, lt, rt, select, start, l3, r3, arriba, abajo, izquierda, derecha.

```
si mando.pulsado("rt"):
    yo.x += 400 * delta
```

#### `mando.sePulso("boton")`

Verdadero solo en el fotograma en que se pulsa el boton.

```
si mando.sePulso("lb"):
    mostrar("lb")
```

#### `mando.vibrar(segundos, fuerza)`

Hace vibrar el mando (fuerza de 0 a 1). Si el mando no sabe vibrar, no pasa nada.

```
cuando toco Enemigo:
    mando.vibrar(0.3)
```

### `sistema`

Cosas del ordenador o del móvil donde se está jugando.

```
si sistema.movil:
    mostrar("Juegas en un móvil")
```

#### `sistema.movil`

Verdadero si se está jugando en un móvil o una tableta (con pantalla táctil).

```
si sistema.movil:
    yo.visible = verdadero
```

#### `sistema.abrirWeb("direccion")`

Abre una página web en otra pestaña (por ejemplo, la de tu juego en itch.io). Tiene que empezar por https://. En el editor, antes de abrirla se pregunta (por si el juego es de otra persona).

```
cuando hago clic encima:
    sistema.abrirWeb("https://itch.io")
```

## 9. Listas, textos, tablas y vectores

### Controles de cada jugador (varios en el mismo ordenador)

Lo que da controles(1), controles(2)...: los controles de ese jugador, juegue con su trozo del teclado o con su mando. Los controles se llaman siempre igual: "arriba", "abajo", "izquierda", "derecha", "a" (la acción principal) y "b" (la segunda).

#### `controles(1).x`

Hacia qué lado quiere ir: -1 izquierda, 0 quieto, 1 derecha (con la palanca del mando, valores intermedios).

```
yo.x += controles(1).x * 300 * delta
```

#### `controles(1).y`

Hacia arriba (1) o hacia abajo (-1).

```
yo.y += controles(1).y * 300 * delta
```

#### `controles(1).pulsado("control")`

Verdadero mientras ese jugador tiene pulsado ese control ("a", "b", "arriba"...).

```
si controles(1).pulsado("b"):
    yo.color = "rojo"
```

#### `controles(1).sePulso("control")`

Verdadero solo en el fotograma en que lo pulsa (para saltar o disparar una vez).

```
si controles(2).sePulso("a"):
    yo.saltar(600)
```

#### `controles(1).seSolto("control")`

Verdadero solo en el fotograma en que lo suelta.

```
si controles(1).seSolto("a"):
    mostrar("soltado")
```

#### `controles(1).mando`

Verdadero si ese jugador tiene un mando conectado (el primer mando es del jugador 1, el segundo del 2...).

```
si controles(2).mando:
    mostrar("El jugador 2 juega con mando")
```

#### `controles(1).ponerTecla("control", "tecla")`

Cambia la tecla de uno de sus controles.

```
controles(1).ponerTecla("a", "m")
```

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

#### `lista.primero`

El primer elemento (o nulo si está vacía).

```
mostrar(cola.primero)
```

#### `lista.ultimo`

El último elemento (o nulo si está vacía).

```
mostrar(puntos.ultimo)
```

#### `lista.insertar(posicion, valor)`

Mete un valor en esa posición; los que había de ahí en adelante se corren un sitio.

```
cola.insertar(1, "el primero")
```

#### `lista.ordenar()`

Ordena la lista de menor a mayor (números) o por orden alfabético (textos).

```
records.ordenar()
```

#### `lista.mezclar()`

Desordena la lista al azar (como barajar cartas).

```
cartas.mezclar()
```

#### `lista.invertir()`

Le da la vuelta: el último pasa a ser el primero.

```
records.ordenar()
records.invertir()
```

#### `lista.posicion(valor)`

En qué posición está un valor (la primera es la 1), o 0 si no está.

```
variable donde = colores.posicion("verde")
```

#### `lista.contiene(valor)`

Verdadero si el valor está en la lista.

```
si inventario.contiene("llave"):
    mostrar("Abres la puerta")
```

#### `lista.sublista(desde, hasta)`

Una lista nueva con un trozo: de la posición desde a la hasta (las dos incluidas).

```
variable mejores = records.sublista(1, 3)
```

#### `lista.unir(separador)`

Junta los elementos en un texto, con el separador entre medias (", " si no se dice).

```
yo.texto = inventario.unir(" | ")
```

#### `lista.vaciar()`

Quita todos los elementos.

```
enemigos.vaciar()
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

#### `texto.dividir(separador)`

Corta el texto en trozos y da una lista. Sin separador, corta por los espacios (palabras).

```
variable palabras = frase.dividir(" ")
```

#### `texto.reemplazar(buscar, cambiarPor)`

Un texto nuevo en el que se cambia cada trozo buscado por otro.

```
yo.texto = frase.reemplazar("gato", "perro")
```

#### `texto.contiene(trozo)`

Verdadero si el texto tiene ese trozo dentro.

```
si respuesta.contiene("si"):
    mostrar("Vale")
```

#### `texto.empiezaPor(trozo)`

Verdadero si el texto empieza así.

```
si nombre.empiezaPor("Dr"):
    mostrar("Doctor")
```

#### `texto.terminaPor(trozo)`

Verdadero si el texto termina así.

```
si palabra.terminaPor("s"):
    mostrar("Plural")
```

#### `texto.recortar()`

El mismo texto sin los espacios del principio y del final.

```
variable limpio = escrito.recortar()
```

#### `texto.trozo(desde, hasta)`

Un trozo del texto: de la letra desde a la hasta (las dos incluidas; la primera es la 1).

```
variable inicial = nombre.trozo(1, 1)
```

#### `texto.posicion(trozo)`

En qué letra empieza un trozo dentro del texto (la primera es la 1), o 0 si no está.

```
mostrar(frase.posicion("mundo"))
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

### Moverse solo a los lados (una cesta, una raqueta)

Sin Física: con las flechas se mueve en las cuatro direcciones, así que fijamos su altura en cada fotograma.

```
cuando cada fotograma:
    yo.moverConFlechas(500)
    yo.y = 60
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

### Plataforma que se mueve (o un ascensor)

Sin código: selecciona la plataforma y activa Propiedades > Recorrido. Arrastra en la escena el punto 2 hasta donde tiene que llegar (puedes añadir más puntos). Lo que se pone encima viaja con ella. Desde el código se puede parar y poner en marcha:

```
# En el script de la plataforma: se pone en marcha cuando el jugador se sube
cuando empieza:
    yo.moviendo = falso

cuando toco Jugador:
    yo.moviendo = verdadero
```

### Plataforma que se atraviesa desde abajo

Sin código: en Propiedades > Colisión marca «solo desde arriba». Se puede saltar a través de ella desde abajo y, al caer, te quedas encima. En un mapa de casillas, es una opción de cada tipo de casilla. No hace falta ningún script; por ejemplo, el del jugador puede ser solo:

```
cuando cada fotograma:
    yo.moverConFlechas(300)

cuando se pulsa "espacio":
    yo.saltar(700)
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

### Un objeto avisa a otros (mensajes)

Con enviar, TODOS los objetos que tengan «cuando recibo» con ese mensaje se enteran, estén donde estén. En el script de la llave y en el de la puerta:

```
cuando toco Jugador:
    enviar("abrir_puerta")
    destruir(yo)

cuando recibo "abrir_puerta":
    destruir(yo)
```

### Pedirle algo a otro objeto (llamar a su función)

Si la Puerta tiene en su script una función abrir(), desde otro objeto se escribe buscar("Puerta").abrir(). Dentro de la función, yo es la puerta. En el script de la puerta:

```
funcion abrir():
    yo.ocultar()
    sonido.efecto("subir")

cuando toco Jugador:
    abrir()
```

### Datos del juego sin código (vidas, nivel...)

Sin nada seleccionado, en Propiedades > Datos del juego puedes añadir datos con su valor de salida (vidas = 3). Existen desde el principio en todas las escenas, antes de cualquier script. Luego se usan así:

```
cuando toco Enemigo:
    juego.vidas -= 1
    si juego.vidas <= 0:
        escena.cambiar("Fin")
```

### Un enemigo que persigue sin código

Selecciona el enemigo y activa Propiedades > Comportamiento: «Perseguir si está cerca», a quién (Jugador) y la rapidez. Si el juego se ve desde arriba y hay un mapa con paredes, las rodea. Con código es lo mismo con irHacia:

```
cuando empieza:
    yo.irHacia(buscar("Jugador"), 120)
```

### Un enemigo que patrulla y te ve

Con rayo miras si hay una pared entre el enemigo y el jugador. Si lo ve, lo persigue; si no, pasea.

```
cuando cada 0.5 segundos:
    variable jugador = buscar("Jugador")
    variable veo = falso
    si jugador != nulo:
        variable r = rayo(yo, jugador, 400)
        veo = r != nulo y r.objeto == jugador
    si veo:
        yo.irHacia(jugador, 160)
    sino si no yo.yendo:
        yo.irHacia(vector(aleatorio(100, 900), aleatorio(100, 500)), 80)
```

### Hablar con un personaje (diálogos)

En el script del personaje. El juego se para mientras se lee. Con opciones, dialogo devuelve la elegida.

```
cuando toco Jugador:
    dialogo("Ana", "¡Hola! Llevo días esperando a alguien.")
    variable r = dialogo("Ana", "¿Me ayudas a buscar mi gato?", ["Si", "No"])
    si r == "Si":
        juego.mision = verdadero
        dialogo("Ana", "¡Gracias! Creo que se fue al bosque.")
    sino:
        dialogo("Ana", "Vaya... Vuelve si cambias de idea.")
```

### Jugar con mando (o con botones en el móvil)

moverConFlechas ya usa la palanca del mando. Los botones se leen con mando. En el móvil salen botones en la pantalla solos, con las teclas que usa tu juego (se quitan en Propiedades del juego > botones en el móvil).

```
cuando cada fotograma:
    yo.moverConFlechas(300)
    si mando.pulsado("a") o teclado.pulsada("espacio"):
        yo.saltar(700)
```

### Funciones para todos los objetos (una biblioteca)

Crea un script, escribe solo funciones (sin ningún «cuando») y NO se lo pongas a ningún objeto. Sus funciones se pueden usar desde cualquier script, y dentro de ellas yo es quien las llama. Por ejemplo, un script «ayudas»:

```
funcion curar(cuanto):
    yo.vida = minimo(yo.vida + cuanto, 100)
    sonido.efecto("poder")
```

### Hacer dos cosas a la vez

Las cosas con esperar dentro paran el script hasta que acaban. Con aLaVez la función va por su cuenta y el resto sigue.

```
funcion parpadear():
    repetir 6 veces:
        yo.ocultar()
        esperar(0.1)
        yo.mostrar()
        esperar(0.1)

cuando toco Enemigo:
    aLaVez(parpadear)
    yo.saltar(500)
```

### Crear muchas cosas en fila

rango da los números seguidos, para contar con para cada. Moneda tiene que ser una plantilla (botón «Convertir en plantilla» de sus Propiedades).

```
cuando empieza:
    para cada i en rango(1, 8):
        crear("Moneda", i * 100, 300)
```

### Un dash que atraviesa enemigos

Durante un momento deja de chocar con los enemigos (pero no con las paredes) y se mueve muy rápido.

```
cuando se pulsa "x":
    yo.atravesar("Enemigo")
    yo.velocidad = vector(900, 0)
    sonido.efecto("dash")
    esperar(0.2)
    yo.dejarDeAtravesar("Enemigo")
```

### Barra de vida en la pantalla

dibujar.enPantalla dibuja en la pantalla, como la interfaz: no se mueve con la cámara. Se dibuja en cada fotograma. (0, 0) es la esquina de abajo a la izquierda.

```
cuando empieza:
    yo.vida = 100

cuando cada fotograma:
    dibujar.enPantalla.rectangulo(120, 500, 200, 16, "gris", verdadero)
    dibujar.enPantalla.rectangulo(20 + yo.vida, 500, yo.vida * 2, 16, "rojo", verdadero)
```

### Sonidos sin archivos

sonido.efecto se inventa el sonido solo. Hay disparo, laser, explosion, golpe, salto, moneda, poder, dash, escudo, hielo, fuego, rayo, subir, perder, clic, alarma y dano.

```
cuando toco Moneda:
    destruir(otro)
    sonido.efecto("moneda")

cuando se pulsa "espacio":
    yo.saltar(700)
    sonido.efecto("salto")
```

### Oscurecer la pantalla al perder

pantalla.oscurecer hace un fundido. Con cuanto = 0.5 se sigue viendo el juego detrás (para un menú de pausa).

```
cuando toco Enemigo:
    pantalla.oscurecer(1)
    esperar(1)
    escena.reiniciar()
```

### Probar cosas mientras juegas (órdenes)

Mientras el juego está en marcha, abajo de la consola hay una línea para escribir una orden y pulsar Intro. Sirve para hacer trampas y probar: juego.vidas = 99, buscar("Jugador").x = 500, crear("Enemigo", 400, 300)... Lo mismo se puede poner en un script:

```
cuando se pulsa "t":
    juego.vidas = 99
```

### Barra de vida sin dibujarla (interfaz)

Añadir > Interfaz > Barra. En su «dato» escribe Jugador.vida (la vida es una propiedad propia del jugador: inspector > Propiedades propias > vida = 100). La barra se mueve sola; el código solo cambia la vida. En el script del jugador:

```
cuando toco Enemigo:
    yo.vida -= 25
    yo.flash("rojo", 0.15)
    si yo.vida <= 0:
        escena.reiniciar()
```

### Contador de monedas con un icono

Haz clic en el fondo de la escena y, en Datos del juego, crea «monedas» (0). Añadir > Interfaz > Icono con contador: elige su imagen y en «dato» pon juego.monedas. En el script del jugador:

```
cuando toco Moneda:
    destruir(otro)
    juego.monedas += 1
    sonido.efecto("moneda")
```

### Inventario: coger una llave y abrir una puerta

Añadir > Interfaz > Inventario. Lo que se mete se ve en sus casillas (si hay una imagen que se llame igual, «llave», sale su dibujo). En el script del jugador:

```
cuando toco Llave:
    destruir(otro)
    buscar("Inventario").meter("llave")

cuando toco Puerta:
    variable mochila = buscar("Inventario")
    si mochila.cuantos("llave") > 0:
        mochila.sacar("llave")
        destruir(otro)
    sino:
        dialogo("La puerta esta cerrada. Hace falta una llave.")
```

### Una cueva a oscuras con linterna

La escena se oscurece y el jugador lleva una luz. También se puede hacer sin código: fondo de la escena > Luz y oscuridad, y en el objeto, la sección Luz. Con «luzConSombras», las paredes del mapa tapan la luz.

```
cuando empieza:
    escena.oscuridad = 0.9
    yo.luz = verdadero
    yo.radioLuz = 220
    yo.colorLuz = "naranja"
    yo.luzConSombras = verdadero
```

### Dos jugadores en el mismo teclado

El jugador 1 usa W A S D y espacio; el 2, las flechas e Intro (el 3, I J K L; el 4, el teclado de números). Con mando, cada uno el suyo. Sin código: en cada objeto, Comportamiento > «Lo maneja un jugador». Para partir la pantalla: fondo de la escena > Cámara > jugadores. Con código, este es el script del jugador 2:

```
cuando cada fotograma:
    yo.moverConJugador(2, 280)
    si controles(2).sePulso("a"):
        yo.saltar(600)
```

### Menú, pausa, créditos y fin del juego (Pantallas listas)

En la pestaña Escena, el botón «Pantallas listas» (junto a las escenas) añade un menú principal, opciones, créditos, tabla de puntuaciones, fin del juego y pausa, ya conectados. Son escenas normales: se abren y se cambian. Tu juego solo tiene que sumar puntos en juego.puntos y, al acabar, ir a la escena Fin:

```
cuando toco Meta:
    juego.puntos += 100
    escena.cambiar("Fin", 0.5)
```

### Apuntar la puntuación en la tabla de los mejores

puntuaciones guarda las 10 mejores, con su nombre, aunque se cierre el juego. (La pantalla lista «Fin del juego» ya lo hace, pidiendo el nombre.)

```
cuando toco Meta:
    si puntuaciones.entra(juego.puntos):
        puntuaciones.guardar("Ana", juego.puntos)
    para cada p en puntuaciones.lista():
        mostrar(p.nombre, p.puntos)
```

### Hacer tus sonidos y tu música

En la pestaña Proyecto: el + de Sonidos abre el generador de efectos (pulsa «Salto», «Moneda», «Explosión»... hasta que te guste uno y guárdalo con su nombre), y el + de Música, la rejilla de notas. El botón del libro trae sonidos y canciones ya hechos. Luego se usan por su nombre:

```
cuando empieza:
    musica.reproducir("tema")

cuando se pulsa "espacio":
    sonido.reproducir("salto")
```

### Un sonido que se oye más cuanto más cerca estás

reproducirEn pone el sonido en un sitio: se oye más flojo cuanto más lejos está de lo que se ve, y por el lado que toca. bucleEn lo deja sonando pegado al objeto (una hoguera, un motor).

```
cuando empieza:
    sonido.bucleEn("motor", yo, 500)

cuando toco Jugador:
    sonido.reproducirEn("salto", yo, 800)
```

### Música que sube cuando hay peligro

Cada pista de una canción hecha en el editor de música es una capa. Con musica.intensidad = 0 suena solo la primera; con 1, todas. Aquí sube cuando hay enemigos cerca:

```
cuando empieza:
    musica.reproducir("tema")

cuando cada 0.5 segundos:
    si yo.cercanos(300, "Enemigo").longitud > 0:
        musica.intensidad = 1
    sino:
        musica.intensidad = 0.3
```

### Colgar de una cuerda (péndulo o gancho)

El objeto necesita Física. La cuerda lo une a un punto (o a otro objeto) y no le deja alejarse más de su largo. Con espacio se suelta.

```
cuando empieza:
    junta.cuerda(yo, vector(yo.x + 120, yo.y + 160), 200)

cuando se pulsa "espacio":
    junta.quitar(yo)
```

### Empezar con una plantilla y publicar el juego

Nuevo > elige una plantilla (plataformas, vista desde arriba, naves, puzle, carreras, cartas o diálogos): es un juego pequeño que ya funciona, con el código comentado. Cámbialo. Para publicarlo: clic en el fondo de la escena > Proyecto > ponle nombre e icono, y pulsa «itch.io» en la barra de arriba: descarga el juego listo y te dice los pasos. El script más corto de una plantilla (una bala) es así:

```
cuando cada fotograma:
    yo.y += 700 * delta

cuando salgo de la pantalla:
    destruir(yo)
```

### Programar con bloques

Con el botón «Bloques» de arriba del script (o Ctrl+B) el script se ve como bloques de colores. Arrastra un evento («cuando cada fotograma») y mete dentro acciones. Puedes volver al código cuando quieras: los dos son el mismo script. Este código se ve así en bloques:

```
cuando cada fotograma:
    yo.moverConFlechas(300)

cuando se pulsa "espacio":
    yo.saltar(700)
```

### Jugar con el dedo: una palanca y un botón de saltar

En el script del jugador. La palanca hace de flechas y el botón pulsa la tecla espacio, así que el resto del código es el mismo que con teclado. Solo se ven cuando se juega con el dedo: en un ordenador no salen.

```
cuando empieza:
    tactil.joystick()
    tactil.boton("Saltar", "espacio")

cuando cada fotograma:
    yo.moverConFlechas(300)

cuando se pulsa "espacio":
    yo.saltar(700)
```

### Un botón en pantalla para disparar

Un botón que no pulsa ninguna tecla: se pregunta por él con tactil.sePulso (una vez por toque) o tactil.pulsado (mientras se aprieta). Con tactil.mover se pone donde quieras: de 0 a 100 de izquierda a derecha y de abajo arriba.

```
cuando empieza:
    tactil.boton("Fuego")
    tactil.mover("Fuego", 88, 25)

cuando cada fotograma:
    si tactil.sePulso("Fuego"):
        efecto.chispas(yo)
```

### Moverse deslizando el dedo (sin botones)

Para juegos de una mano: deslizar a un lado cambia de carril y deslizar hacia arriba salta. tactil.gesto dice el gesto de este fotograma: "toque", "doble", "largo", "arriba", "abajo", "izquierda" o "derecha".

```
cuando cada fotograma:
    si tactil.gesto == "izquierda":
        yo.x -= 120
    si tactil.gesto == "derecha":
        yo.x += 120
    si tactil.gesto == "arriba":
        yo.saltar(600)
```

### Apuntar o mirar arrastrando el dedo

Con tactil.mirar(), arrastrar por la pantalla (fuera de la palanca y los botones) se lee en tactil.miraX y tactil.miraY. Aquí gira al objeto; cambiando la última línea mueve la cámara.

```
cuando empieza:
    tactil.joystick()
    tactil.mirar()

cuando cada fotograma:
    yo.rotacion -= tactil.miraX
```

### Un juego que va bien en móviles lentos y gasta poca batería

La calidad "auto" baja sola si el aparato no puede (menos píxeles y menos partículas), y con 30 fotogramas por segundo el móvil trabaja la mitad y se calienta menos. También se elige sin código: clic en el fondo de la escena > Proyecto > «calidad» y «fotogramas».

```
cuando empieza:
    pantalla.calidad = "auto"
    pantalla.maximoFps = 30
```

### Un juego que se juega con el móvil tumbado

Si alguien lo abre con el móvil de pie, sale un aviso de «Gira el móvil» y el juego espera. En un ordenador no hace nada.

```
cuando empieza:
    pantalla.orientacion = "horizontal"
    tactil.joystick()
```

### Vibrar cuando te dan y texto distinto en móvil y en ordenador

tactil.vibrar hace vibrar el móvil (en iPhone y en ordenadores no pasa nada). tactil.hay dice si se juega con el dedo: sirve para cambiar las instrucciones.

```
cuando empieza:
    si tactil.hay:
        mostrar("Toca Saltar")
    sino:
        mostrar("Pulsa espacio")

cuando toco Enemigo:
    tactil.vibrar(0.2)
```

### Dejar que cada uno coloque los botones a su gusto

En el script de un botón de tu menú de opciones. Se abre el modo colocar: quien juega arrastra la palanca y los botones a donde le vengan bien y pulsa «Listo». Se le recuerda para las siguientes partidas.

```
cuando hago clic encima:
    tactil.colocar()
```

### Convertir tu juego en una app para el móvil

Arriba, «Exportar» > «App para el móvil»: descarga un zip con el juego, su icono y lo necesario para que funcione sin internet. Descomprímelo y sube lo de dentro a un sitio web con https (GitHub Pages, Netlify...). Al abrir esa dirección en el móvil: en Android, menú > «Instalar app»; en iPhone, Compartir > «Añadir a pantalla de inicio». El juego necesita controles para el dedo, por ejemplo:

```
cuando empieza:
    tactil.joystick()
    tactil.boton("Saltar", "espacio")
```
