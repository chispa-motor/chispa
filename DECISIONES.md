# Decisiones de diseño

Aquí se apuntan las decisiones importantes del motor Chispa. Cuando había
varias opciones, se ha elegido la **más fácil para alguien que no sabe
programar**.

## Tomadas contigo (aprobadas)

| # | Decisión | Por qué |
|---|---|---|
| 1 | Las listas empiezan en **1**. | «El primero» es el 1, como en Lua o Scratch. |
| 2 | Para salir de un bucle se usa **`romper`**, sin alias. | Una sola forma de hacerlo. |
| 3 | Leer una clave de tabla que no existe da **error con sugerencia**. Para comprobarlo antes se usa **`"clave" en tabla`**. | Es mejor enterarse que tener un `nulo` escondido. |
| 4 | **`mostrar()` siempre lleva paréntesis.** | Coherente con el resto de funciones. |
| 5 | **La Y crece hacia arriba.** Solo la cámara la invierte al dibujar. | Subir = sumar, como en Unity y en matemáticas. |
| 6 | Las tablas **recuerdan el orden** en que se añadieron las claves. | Así el resultado nunca parece aleatorio. |
| 7 | `"Vida: " + vida` **une el texto y el número directamente** (opción A). | Es lo que escribe cualquiera que empieza. |
| 8 | Una variable que no existe, detectada **antes de ejecutar**, impide pulsar Ejecutar. | Fallaría igualmente al ejecutar; así lo ves antes. |
| 9 | Dar valor a `yo.velocidda` (casi igual a una propiedad del motor) es un **error con sugerencia**. | Evita crear sin querer una propiedad con un nombre mal escrito. |
| 10 | **La forma oficial es sin tildes** (`funcion`, `rotacion`, `posicion`). Con tilde también funciona, pero el motor nunca lo sugiere. | Se escribe más rápido y es más fácil en cualquier teclado. La **ñ** no es una tilde y se mantiene (`añadir`, `tamaño`). |

## Tomadas durante el desarrollo (sin esperar)

<!-- Se van añadiendo fase a fase -->

### Fase 3C · Errores

| Decisión | Por qué |
|---|---|
| Como mucho **un error de escritura por línea** y **10 por archivo**. | El primer error de una línea suele ser el de verdad; los demás, consecuencias. Diez es suficiente para no agobiar. |
| Si una línea con error abría un bloque (`si ... ` sin `:`), **se salta el bloque entero** al recuperarse. | Así un `:` olvidado da 1 error y no 10 errores falsos. |
| El **análisis** revisa el cuerpo de funciones y `cuando` **al final** del bloque donde están. | Se ejecutan después, así que pueden usar variables creadas más abajo. |
| Si un script tiene errores de escritura, **no se analiza** hasta que se arreglen. | Con el árbol a medias saldrían errores falsos. |
| **`yo.xp`, `yo.hp`** (nombres de menos de 4 letras) nunca se confunden con propiedades del motor. | Con nombres cortos, «¿querías decir 'x'?» saldría constantemente por error. |
| Si **muchas copias** de una plantilla fallan igual, se enseña **un solo error con ×N**. | 50 mensajes iguales esconderían los demás errores. |
| **`devolver` dentro de un `cuando`** es válido y termina ese evento. | Es la forma natural de decir «ya he terminado», como `return` en un evento de Roblox. |
| Nuevo evento **`cuando pasen N segundos:`** (una sola vez). | Es el temporizador más fácil de entender, sin tener que combinar `cuando empieza` con `esperar`. |
| Las palabras de **otros lenguajes** (`print`, `True`, `elif`, `while`...) tienen su propio mensaje: «en Chispa se escribe...». | Mucha gente llega habiendo visto algo de Python o JavaScript. |

### Motor 2D completo

| Decisión | Por qué |
|---|---|
| **Una animación = una lista de imágenes** (una por fotograma), más una velocidad y si se repite. No hay «hojas de sprites». | Filas, columnas y recortes de una imagen grande son difíciles de explicar; con imágenes sueltas se entiende a la primera. |
| `rozamiento` y `rebote` van **de 0 a 1**. El rozamiento frena **solo en el suelo**, salvo en escenas sin gravedad (vista desde arriba), donde frena siempre y en las dos direcciones. | Son porcentajes fáciles de imaginar («0 = hielo», «1 = pelota perfecta»). Frenar en el aire estropearía los saltos. |
| Entre objetos con física, al chocar se separan **por el lado más corto** y la velocidad se reparte **según la masa**. | Es lo que se espera sin saber física: el pesado empuja al ligero. |
| Las **plataformas que se mueven por script no arrastran** al jugador que está encima. | Simplificación: añadirlo complica mucho la física. Queda como mejora futura. |
| Un objeto **sin física pero con script** también detecta lo que toca. | Quien empieza mueve una bala con `yo.x += 10` y espera que `cuando toco Enemigo` funcione. |
| Las zonas que se atraviesan se llaman **«fantasma»** (`yo.fantasma`), aunque `yo.solido` también existe. | «Fantasma» se entiende sin explicación. |
| Los mapas de casillas **no giran ni se escalan**. La posición del objeto mapa es la esquina inferior izquierda de la casilla (0, 0). | Así saber qué casilla hay en un punto es una simple división, rapidísima con miles de casillas. |
| Tocar una casilla lanza **`cuando toco <tipo de casilla>`**. `otro` es el mapa y **`casilla`** es el tipo. | Se reutiliza el mismo evento que con objetos: nada nuevo que aprender. |
| La **interfaz** son objetos normales con **`fijo`** activado (pegados a la pantalla, con la Y hacia arriba desde abajo). Los botones usan **`cuando hago clic encima:`**. | No hay un sistema de interfaz aparte que aprender. |
| Un clic lo recibe **solo el objeto de más arriba** (la interfaz fija va por encima del mundo). | Al pulsar un botón no se «pulsa» también lo que hay detrás. |
| Las **partículas no son objetos**: no tienen scripts ni colisiones. Hay 6 tipos preparados y se pueden personalizar con una tabla. | Se pueden crear cientos sin que el juego vaya lento. |
| La **música** va aparte de los efectos (`musica.reproducir`, en bucle, una sola a la vez, con su propio volumen). | Es lo que casi siempre se quiere de una música de fondo. |
| Los datos de **`juego`** se **conservan al cambiar de escena y al reiniciar**. | «Pasar al nivel 2» no debe perder los puntos. Para empezar de cero, se les da valor en `cuando empieza`. |
| **`guardar`/`cargar`** usan el almacenamiento del navegador, **separado por proyecto**. Las tablas se guardan en su orden. Los objetos del juego no se pueden guardar. | Dos juegos distintos no se pisan los datos. Un objeto deja de existir al cerrar el juego. |
| Imágenes y sonidos importados se guardan **dentro del proyecto** (como «data URL»). | Un proyecto es un único archivo que nunca pierde recursos por el camino. |
| Las **propiedades propias** de un objeto (`vida = 3`) se pueden poner en el editor, como los Attributes de Roblox. | Se ajustan sin tocar el código. |
| Nuevas funciones **`elegir(lista)`** y **`probabilidad(porcentaje)`**, y nuevas acciones `moverHacia`, `mirarA` y `direccionA`. | Son las que más se echan de menos al hacer el primer juego (enemigos que persiguen, premios al azar). |
