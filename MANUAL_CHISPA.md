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

#### `rayo(desde, direccion, largo)`

Lanza una linea invisible y dice lo primero que toca (un objeto con colision o una casilla solida), o nulo. Desde: un objeto (no se toca a si mismo) o un vector. Direccion: un angulo (0 = derecha, 90 = arriba), un vector o un objeto hacia el que mirar. Da una tabla con objeto, punto, distancia y casilla.

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

#### `escena.colorFondo`

El color del fondo de la escena.

```
escena.colorFondo = "azul"
```

#### `escena.cambiar("Nombre", fundido)`

Cambia a otra escena. Los datos de juego (juego.puntos...) se conservan. Con un número, la pantalla se oscurece y se aclara durante esos segundos.

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

#### `sonido.reproducir("nombre", volumen, tono)`

Reproduce un sonido del proyecto. Volumen de 0 a 1; tono 1 = normal, 2 = más agudo, 0.5 = más grave (los dos se pueden dejar sin poner).

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

### `musica`

Música de fondo: suena en bucle y solo una a la vez.

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

#### `tiempo.camaraLenta(velocidad, segundos)`

Cámara lenta durante un rato y luego vuelve sola a la normalidad.

```
cuando toco Enemigo:
    tiempo.camaraLenta(0.3, 1)
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

#### `pantalla.completa`

Pantalla completa: verdadero para ponerla, falso para quitarla. El navegador solo deja justo después de pulsar una tecla o hacer clic.

```
cuando se pulsa "f":
    pantalla.completa = no pantalla.completa
```

#### `pantalla.oscurecer(segundos, color, cuanto)`

Fundido: la pantalla se va poniendo de un color (negro si no se dice) durante esos segundos. Cuanto va de 0 a 1: con 0.5 se oscurece a medias y se sigue viendo el juego (1 si no se dice).

```
pantalla.oscurecer(0.2, "negro", 0.5)
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

#### `dibujar.texto(texto, x, y, color, tamano)`

Un texto en ese sitio del mundo (por ejemplo, encima de un enemigo).

```
dibujar.texto(yo.vida, yo.x, yo.y + 40, "blanco")
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

#### `dibujar.enPantalla.texto(texto, x, y, color, tamano)`

Un texto en la pantalla.

```
dibujar.enPantalla.texto("Vida", 20, 700, "blanco")
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

Abre una página web en otra pestaña (por ejemplo, la de tu juego en itch.io).

```
cuando hago clic encima:
    sistema.abrirWeb("https://itch.io")
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
