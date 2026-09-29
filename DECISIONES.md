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
