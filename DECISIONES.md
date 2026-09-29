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

### 3D y Fase 4 · El editor

| Decisión | Por qué |
|---|---|
| La **Zona de Programación (3D)** y el **editor visual (Fase 4)** son **la misma ventana**. En la pestaña «Escena» colocas objetos; al abrir un script, el centro pasa a ser el editor de código, y el juego, la consola y la lista de objetos siguen a la vista. Por eso las etiquetas `despues-de-3D` y `despues-de-4` apuntan al mismo commit. | Un solo programa que aprender. Es lo que hacen Godot y Roblox Studio. |
| El editor de código usa **CodeMirror 6** (una librería de código abierto), con el lenguaje, los colores, el autocompletado, la ayuda y los errores hechos a medida para Chispa. | Hacer desde cero un editor con cursor, selección, deshacer, buscar y teclados de todos los idiomas llevaría meses y funcionaría peor. El **lenguaje** sigue siendo 100 % nuestro. |
| Los errores del editor salen del **mismo analizador que usa el motor** al pulsar Ejecutar. | Lo que se subraya en rojo es exactamente lo que impediría ejecutar: nunca se contradicen. |
| El **autocompletado y la ayuda al pasar el ratón** salen del catálogo de documentación, que los tests comparan con la API real. | Una sola fuente: si algo existe en el motor, tiene ayuda; si tiene ayuda, existe. |
| **Todo sin interfaz primero**: la lógica del editor (crear, borrar, deshacer...) vive en `EstadoEditor`, sin HTML. Los paneles solo la llaman y se redibujan. | Se puede probar todo con tests, sin navegador. |
| **Deshacer** guarda una foto del proyecto antes de cada cambio. Arrastrar o pintar se deshace **de una vez**. El código **no** entra en ese deshacer: el editor de código tiene el suyo, letra a letra. | Es lo más sencillo y a prueba de fallos. Con el código, Ctrl+Z se comporta como en cualquier editor de texto. |
| La vista de la escena **dibuja con el mismo código que el juego** (Sprite y MapaCasillas del motor). | Lo que ves al editar es exactamente lo que ves al jugar. |
| Arrastrar el **fondo** mueve la vista (también con el botón central o con Espacio). La **rueda** hace zoom hacia el ratón. | Es lo primero que prueba cualquiera, sin tener que conocer atajos. |
| **Imán activado por defecto** (múltiplos de 16 px). Con Alt se coloca libre. | Los niveles quedan alineados sin esfuerzo; las plataformas encajan. |
| Los objetos de **interfaz** (`fijo`) se enseñan **dentro del marco de la pantalla**, y al marcarlos como fijos se recalcula su posición para que no «salten». | Se colocan viendo dónde quedarán de verdad en la pantalla. |
| Los números del panel de propiedades se cambian también **arrastrando su nombre** a los lados, y se guardan al pulsar Intro o salir del campo. | Como en Unity y Godot; y no se llena el deshacer con un cambio por cada letra. |
| **Ejecutar crea un motor nuevo con una COPIA del proyecto.** Lo que cambias mientras juegas se verá la próxima vez. | El juego siempre empieza limpio y editar nunca rompe una partida en marcha. |
| Con errores en el código, **Ejecutar se queda en rojo** y al pulsarlo lista los errores (con clic para ir a la línea). | Decisión 8: fallaría igualmente; así se ve antes y todo junto. |
| Las teclas solo llegan al juego si **no estás escribiendo ni en la vista de la escena**. Al pulsar Ejecutar, el foco pasa al juego. | Si no, mover un objeto con las flechas también movería al jugador. |
| **Pausa** congela también el sonido (y lo reanuda donde iba). | Es lo que se espera de «pausa». |
| **Guardado automático** en el navegador (IndexedDB) cada vez que cambias algo; **Guardar** descarga el archivo `.chispa.json`. Al abrir el editor se recupera lo último. | Nadie pierde su trabajo por cerrar la pestaña. IndexedDB y no localStorage porque este solo admite ~5 MB y las imágenes ocupan más. |
| La primera vez se abre el **ejemplo mínimo**; «Nuevo» deja elegir entre vacío o el ejemplo. | Empezar con algo que ya funciona enseña más que una pantalla vacía. |
| **F5 ejecuta** (y no recarga la página); Mayús+F5 para. | Es el atajo de Ejecutar en Visual Studio y en muchos editores. |
| La **Guía** (pestaña de abajo) es la documentación completa con buscador, y cada ejemplo se puede copiar. | Tener la ayuda dentro del editor evita salir a buscar en internet. |

### Fase 5 · Exportar

| Decisión | Por qué |
|---|---|
| Exportar genera **un único archivo .html** que lo lleva todo dentro: motor, código, imágenes y sonidos. | Se abre con doble clic, sin internet, y se sube tal cual a itch.io, GitHub Pages o Netlify. |
| El juego exportado usa un **reproductor**: el motor y el intérprete **sin el editor** (unos 120 KB), compilado aparte en `public/reproductor.js`. Se genera solo al hacer `npm run dev` o `npm run build`. | Quien juega no necesita descargar el editor de código. |
| En el juego exportado, **`mostrar()` solo escribe en la consola del navegador** (F12). Los errores sí se enseñan en pantalla. | `mostrar` es una herramienta para quien programa, no para quien juega. |
| Los textos del juego **no pueden romper la página** (un `mostrar("</script>")` o un nombre con `<b>`). | Una página rota sin explicación es muy difícil de entender para quien empieza. |
| No se puede exportar con errores en el código. | Exportaría un juego que no arranca. |

### Prueba de principiante (bloque 3)

Ver PROBLEMAS_PRINCIPIANTE.md para la lista completa de lo que se encontró.

| Decisión | Por qué |
|---|---|
| El **tipo** de un objeto es, si no se dice otro, su **nombre sin los números del final** (`Moneda2` → `Moneda`). | Al duplicar sale `Moneda2`, y `cuando toco Moneda` tiene que funcionar con todas las copias. Quien pone `Enemigo1` y `Enemigo2` puede seguir usando cada nombre por separado. |
| Nueva acción **`yo.moverConFlechas(rapidez)`**: flechas o W A S D. Si el objeto cae, solo a los lados; si no, en las cuatro direcciones. La imagen mira hacia donde anda. | Moverse es lo primero que se programa y pedía 8 líneas y entender `delta`. Una sola forma que sirve para plataformas, vista desde arriba y naves. |
| `crear()` y `particulas()` **sin posición** salen donde está el objeto que las pide. | «La nave crea una bala» se entiende sin coordenadas. |
| Nuevo evento **`cuando salgo de la pantalla:`**. Solo cuenta si el objeto **ha estado dentro** antes. | Para borrar balas y enemigos y para caer al vacío. Así, los enemigos que aparecen por encima de la pantalla no desaparecen nada más nacer. |
| El botón **Plantilla convierte** (saca el objeto de la escena), después de preguntar. | Lo normal es que una bala o un enemigo de plantilla no esté ya en la escena al empezar. Para poner copias, se arrastra desde Proyecto. |
| Los **textos nuevos son de interfaz** (fijos en la pantalla) y salen arriba a la izquierda. | Casi siempre son puntos, vidas o títulos. |
| Una línea que **no hace nada** (`puntos == 5`, `yo.destruir` sin paréntesis) es un **error**, no un aviso. | Nunca es a propósito, y si no se avisa, el fallo pasa desapercibido. |
| Las formas naturales de decir un evento (`cuando pulso`, `cuando choco con`…) **no se aceptan**, pero el error dice cómo se escribe. | Principio del lenguaje: una sola forma de hacer cada cosa. La pista hace que no cueste aprenderla. |
| En la Guía, las **Recetas** («¿cómo hago…?») van antes que la referencia. | Quien empieza busca «disparar», no `crear`. |
| Copiar y pegar usan **Ctrl+C / Ctrl+V** y un botón **Pegar**. Dentro de un campo de texto, Ctrl+V pega texto, como siempre. | Es lo que se espera en cualquier programa. El botón sirve cuando el cursor está en un campo. |
| **Mayús + arrastrar** con el pincel pinta un rectángulo. | Paredes y suelos en un solo gesto. |
| `?limpio` en la dirección abre el editor sin recuperar lo guardado. | Para las pruebas del navegador (cada prueba empieza igual). |
