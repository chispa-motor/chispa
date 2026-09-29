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
| ~~Las plataformas que se mueven por script no arrastran al jugador.~~ **Resuelto en la sesión 3** (ver «Plataformas»). | — |
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
| ~~Arrastrar el **fondo** mueve la vista.~~ **Cambiado en la sesión 3**: arrastrar el fondo selecciona con un rectángulo (ver «Editor»). La **rueda** hace zoom hacia el ratón. | — |
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

### Pulido (bloque 5)

| Decisión | Por qué |
|---|---|
| El manual (**MANUAL_CHISPA.md**) **se genera** a partir de las fichas de la ayuda del editor, y un test comprueba que está al día (`npm run manual`). | Así el manual y la ayuda del editor no pueden contradecirse nunca. |
| La especificación ya **no repite la API**: remite al manual. | Tener dos listas de la API es la forma más segura de que acaben diciendo cosas distintas. |
| Vista de la escena: los objetos se **reconstruyen una sola vez por fotograma** y **solo los que han cambiado**. El panel de objetos solo se redibuja si cambia lo que enseña. | Con 500 objetos, arrastrar uno rehacía los 500 en cada movimiento del ratón. Ahora va a 60 fotogramas por segundo. |
| Física: la rejilla ajusta el **tamaño de sus celdas al de los objetos**, las **parejas cercanas se buscan una vez por paso** y las cajas se calculan sin crear objetos nuevos. `obtener(Componente)` recuerda el resultado. | Con 500 objetos con física amontonados, el juego iba a 10 fotogramas por segundo; ahora va a 60. |
| Las **pruebas de navegador** (`npm run pruebas:navegador`) no forman parte de `npm run pruebas`. | Necesitan descargar un navegador (unos 150 MB). Los tests normales siguen funcionando sin nada más. |
| Imagen o sonido importado que no se puede leer: el mensaje dice **su nombre** y cómo arreglarlo, no la ruta. | La ruta de un recurso importado es un «data URL» de miles de letras. |
| Nuevo **`raton.seSolto()`**, que es lo mismo que ya tenía `teclado`. | La función del motor ya existía, pero no se podía usar desde Chispa. |

### Textos con huecos (sesión 3, bloque 1)

| Decisión | Por qué |
|---|---|
| Lo que va **entre llaves** dentro de un texto se calcula: `"Puntos: {juego.puntos}"`. Dentro puede ir cualquier expresión (`{redondear(tiempo.total)}`). Para escribir una llave: `{{` y `}}`. | Es como se piensa un marcador («Puntos: y aquí los puntos»), y evita `"Puntos: " + texto(...)`. Las llaves no se usaban dentro de los textos, así que no se rompe nada. |
| Un texto con huecos que se da a **`yo.texto`** (o que se escribe en el **texto de un objeto en el editor**) **se vuelve a calcular cada vez que se dibuja**: se actualiza solo. En cualquier otro sitio (`mostrar`, variables…) se calcula una vez, en ese momento. | Así un marcador funciona sin `cuando cada fotograma`. Guardar en una variable «el texto de ahora» sigue siendo lo normal. |
| Dentro de un texto del editor se pueden usar `juego`, `yo`, las funciones y **las variables del script de ese objeto**. Se revisan antes de ejecutar, como el código. | Un error en un marcador tiene que salir antes de jugar, con su «¿querías decir…?». |
| Si un hueco falla mientras se juega (por ejemplo, `juego.puntos` todavía no tiene valor), se avisa **una vez** en la consola y ese texto deja de recalcularse; el juego sigue. | Un error repetido 60 veces por segundo taparía todo lo demás. |
| En el editor, **«Enseñar un dato»** ofrece los datos de `juego` que usan los scripts, las propiedades propias del objeto y de los demás, y el tiempo. Si el texto no decía nada («Texto»), le pone nombre: `Puntos: {juego.puntos}`. | Enlazar un texto a un dato sin escribir nada de código. |
| Los huecos se **colorean como código** y se **autocompletan** dentro del texto. | Así se ve que lo de dentro no es texto normal. |

### Plataformas (sesión 3, bloque 2)

| Decisión | Por qué |
|---|---|
| Una plataforma que se mueve es un objeto con el componente **Recorrido**: una lista de puntos, una rapidez, una pausa en cada punto y un modo (**ida y vuelta** o **en bucle**). Dos puntos = entre dos puntos; más = un camino. | Una sola idea sirve para plataformas, ascensores y enemigos que patrullan. |
| Los puntos del camino son **relativos** a donde está el objeto al empezar. El primero (0, 0) es el sitio del objeto y no se escribe. | Al mover la plataforma en el editor, su camino se mueve con ella. Las copias de una plantilla hacen el mismo camino cada una desde su sitio. |
| En la escena, el camino se **dibuja** (línea discontinua, fantasmas y números) y los puntos se **arrastran** con el ratón. | Configurarlo sin escribir números. |
| Un objeto con Recorrido **no cae** aunque tenga Física: el recorrido manda. `yo.moviendo = falso` lo para. | Si la gravedad y el camino pelearan, la plataforma temblaría. |
| **Lo que está encima viaja con el soporte**, tanto si lo mueve un recorrido como si lo mueve un script (`yo.x = …`). | Esto resuelve la limitación anterior («las plataformas movidas por script no llevan al jugador»). |
| Si una plataforma que se mueve se mete dentro de un cuerpo, el cuerpo **se aparta por el lado más corto** antes de moverse. | Sin esto, un ascensor que sube empujaba al jugador hacia un lado como si fuera una pared. |
| **«Solo desde arriba»** (casilla en Colisión y en los tipos de casilla del mapa): se atraviesa saltando desde abajo y de lado, y se para al caer encima. Cuenta como «encima» si los pies estaban como mucho **4 píxeles** por debajo del borde. | El margen evita que el jugador atraviese una plataforma que sube hacia él. |

### Editor: varios a la vez, plantillas enlazadas y deshacer (sesión 3, bloque 3)

| Decisión | Por qué |
|---|---|
| **Arrastrar el fondo** de la escena dibuja un **rectángulo de selección** (como en el escritorio del ordenador, en Unity o en Godot). La vista se mueve con el **botón derecho**, el central o **Espacio + arrastrar**. | Con selección múltiple, el gesto del rectángulo es el que todo el mundo conoce del escritorio. Antes ese gesto movía la vista; ahora lo hace el botón derecho, que está a mano y no choca con nada. |
| El rectángulo selecciona lo que **toca** (no hace falta que quede entero dentro) y **no coge los mapas**. | Es más fácil acertar. Un mapa ocupa todo el nivel: si entrara en cada rectángulo, al mover unas monedas se movería el suelo. Con Ctrl+clic sí se puede añadir. |
| **Ctrl+clic** añade o quita uno (en la escena y en la lista). **Ctrl+A** selecciona todo menos los mapas. | Los atajos de siempre. |
| Con varios seleccionados, el inspector enseña **cuántos y sus nombres** y los botones Duplicar, Copiar y Borrar. No se editan propiedades de varios a la vez. | Editar a la vez objetos distintos (un texto y un círculo) confunde más de lo que ayuda. Para cambiar muchos iguales están las plantillas enlazadas. |
| Mover, duplicar, copiar, pegar y borrar varios es **un solo paso** de deshacer. Al pegar un grupo, **todo el grupo se desplaza igual** si choca con lo que ya había. | Deshacer tiene que deshacer lo que la persona ha hecho, no una parte. El grupo conserva su forma. |
| Las copias que se ponen **arrastrando una plantilla** a la escena quedan **enlazadas** (`"plantilla": "Moneda"` en el proyecto). Cambiar **una copia** (o la plantilla) cambia la plantilla y **todas las copias**, en todas las escenas. | «Editar la plantilla dentro de la escena»: se toca la moneda que se ve y cambian todas, sin ir a buscar la plantilla. |
| Cada copia solo tiene suyo **el nombre y el sitio** (x, y). Todo lo demás (dibujo, tamaño, giro, física, script, propiedades…) es compartido. | Una regla que se explica en una línea. El giro y la escala también se comparten: si una moneda tiene que ser distinta, se desvincula. |
| **Desvincular** separa una copia (sigue siendo del mismo tipo para `cuando toco Moneda`). Borrar la plantilla desvincula sus copias (no las borra). Renombrarla mantiene el enlace. | Nunca se pierde nada sin avisar. |
| Los proyectos antiguos **no se enlazan solos**, aunque sus copias vengan de una plantilla. | Sus copias pueden haberse cambiado a propósito: enlazarlas las igualaría y se perderían esos cambios. |
| Un test recorre **todos los métodos del estado del editor** y comprueba que cada cambio se deshace y se rehace; si alguien añade un método nuevo sin probarlo, el test falla. | «Deshacer para todo» tiene que seguir siendo verdad aunque el editor crezca. Lo único fuera del historial es el código (el editor de código tiene su propio deshacer, letra a letra). |
| **Ctrl+Mayús+Z** también rehace. | Es el atajo de Mac y de muchos programas. |
