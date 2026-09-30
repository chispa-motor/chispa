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

### Tutorial guiado (sesión 3, bloque 4)

| Decisión | Por qué |
|---|---|
| La **primera vez** que se abre el editor en un navegador pregunta «¿Hacemos tu primer juego?». Se pregunta **una sola vez** (se apunta en el navegador), diga lo que diga. Luego se abre desde **Ayuda → Tutorial: tu primer juego**. | Ofrecerlo es lo que más ayuda al que empieza; insistir molesta al que ya sabe. |
| El tutorial va **dentro del propio editor**: oscurece un poco todo, **resalta** con un borde amarillo el sitio donde hay que hacer clic y una **burbuja** explica qué hacer. **No bloquea nada**: se puede hacer clic en cualquier sitio. | Se aprende el editor de verdad, no una copia. Si alguien se despista y hace otra cosa, no se queda atrapado. |
| Cada paso sabe que **está hecho mirando el proyecto** (¿hay un objeto llamado Jugador?), no los clics. Avanza solo. | Da igual si se hace con el botón, con un atajo, deshaciendo o de otra forma: si está hecho, está hecho. |
| Cada paso tiene **«Hazlo por mí»** (en el código, «Escríbelo por mí»). | Nadie debería abandonar por atascarse en un paso. Además, los tests recorren el tutorial entero con él y comprueban que el juego final funciona (se coge la moneda y suben los puntos). |
| Empieza con un **proyecto vacío** y avisa antes si se va a cerrar uno (también si es el que se ha recuperado del navegador). | Así los pasos siempre encajan; y nunca se pierde el trabajo de nadie sin preguntar. |
| El juego del tutorial: **Jugador** con física, **suelo** pintado con Mayús, una **Moneda** que se atraviesa, el **script** del jugador (andar, saltar, coger la moneda) y un **marcador** hecho con «Enseñar un dato». | Toca las cinco cosas que se usan en casi cualquier juego: objetos, propiedades, mapa, código y textos con datos. Cabe en 5 minutos. |
| Si lo que hay que tocar está fuera de la vista (por ejemplo, abajo del todo en Propiedades), el tutorial **lleva la vista hasta allí**, una vez por paso. | Si no, el resaltado apuntaba fuera de la pantalla. Solo una vez, para no pelear con quien mueve la vista. |
| La burbuja se pone **al lado** de lo resaltado; si es algo grande (la escena, el código), **dentro, en una esquina** que no tape donde se trabaja. | Nunca debe tapar lo que se está señalando. |

### Publicar (sesión 3, bloque 5)

| Decisión | Por qué |
|---|---|
| **Exportar** abre un diálogo con tres opciones: **un archivo** (.html), **itch.io** (.zip) y **GitHub Pages** (index.html). Al elegir, se descarga el archivo y el diálogo enseña **los pasos**, numerados, con los nombres de los botones tal como salen en esa web (en inglés, en negrita, y traducidos entre paréntesis la primera vez). | Quien empieza no sabe qué archivo pide cada sitio ni dónde se pulsa. Los botones de esas webs están en inglés: hay que reconocerlos. |
| **No se conecta a ninguna cuenta.** | Se pidió así. Además, conectar cuentas necesita permisos, contraseñas y un servidor; así no hay nada que pueda fallar ni ningún dato que guardar. |
| Para itch.io, un **.zip con un index.html dentro**, y los pasos dicen **el tamaño exacto** del juego para «Viewport dimensions». | Es lo que pide itch.io para juegos HTML. Con el tamaño bien puesto, el juego no sale cortado ni con bandas. |
| El .zip se hace **sin comprimir**, con un programa propio de unas 100 líneas (con su CRC-32). | No hace falta ninguna biblioteca. El juego es una sola página e itch.io la sirve comprimida de todas formas. |
| Para GitHub Pages, **index.html** (tiene que llamarse así) y los pasos **desde la web** (subir el archivo, Settings → Pages), sin usar git. | Instalar y aprender git es demasiado para publicar el primer juego. |
| La dirección de GitHub se sugiere con un **nombre corto** del juego (`Mi Juego del Ñandú` → `mi-juego-del-nandu`). | Sin espacios ni acentos, que en una dirección web dan problemas. |
| Cada opción explica también **cómo subir una versión nueva**. | Es lo segundo que se pregunta siempre. |

### Prueba de principiante (sesión 3, bloque 6)

| Decisión | Por qué |
|---|---|
| Si justo después de Intro (con la sangría ya puesta) lo primero que se escribe es un **espacio**, se quita la sangría automática y cuentan los espacios escritos. | Quien copia un ejemplo escribe también sus espacios. Sin esto salían 8 donde tocaban 4. |
| Al escribir **`cuando `**, la línea se va sola al principio. | Un evento nunca va dentro de nada: no hay ningún caso en que esa sangría sea buena. |
| El tirador del tamaño **solo aparece si el objeto mide al menos 27 píxeles en la pantalla**. | Con la vista alejada, el tirador tapaba los objetos pequeños y moverlos los deformaba. Para cambiar el tamaño de algo pequeño, se acerca la vista (o se escribe en Propiedades). |
| Los **textos nuevos se alinean a la izquierda** y salen en la esquina (x = 32). | Casi siempre son marcadores: crecen al subir los puntos y así nunca se salen por el borde. |

## Noche

### API completa (noche, bloque 0)

| Decisión | Por qué |
|---|---|
| La lista de referencia es **LÖVE**, comparada con Scratch, GDevelop, Godot 2D y Roblox. Cada módulo de LÖVE y lo que se hace en Chispa está en **API_QUE_FALTA.md**, con el porqué de lo que se deja fuera. | Un motor real muy usado dice qué hace falta de verdad; los otros cuatro, cómo se lo explicas a alguien que empieza. |
| Lo que en LÖVE es una función que se llama en cada fotograma, en Chispa suele ser **una propiedad de un objeto** (`yo.color`, `yo.arrastrable`). | Los objetos de Chispa ya se dibujan y se mueven solos: no hay que «dibujar a mano». |
| **`animar(yo.tamano, 2, 0.5)`** recibe el SITIO (`yo.tamano`), no su valor. Se puede animar todo lo que se puede cambiar desde el código: números, posiciones, colores… También variables y cosas como `escena.camara.zoom`. | Es como lo escribiría alguien que empieza. Por dentro, la función pide un «Lugar» en vez de un valor; ninguna otra función cambia. Si se le da un número suelto (`animar(5, ...)`), se avisa antes de jugar. |
| Siete **suavizados** con nombre en español: suave (el normal), lineal, entrada, salida, rebote, elastico, atras. | Los de siempre (Roblox y Godot tienen estos mismos), sin nombres técnicos como *easeInOutCubic*. |
| Al terminar una animación, el valor es **exactamente** el pedido (`"rojo"`, no `"#e74c3c"`). | Así `si yo.color == "rojo":` funciona después de animar. |
| Una animación nueva de un sitio **sustituye** a la que hubiera en ese sitio. Si el objeto se destruye, su animación se acaba sin error. | Dos animaciones del mismo valor a la vez pelean y el objeto tiembla. |
| **`yo.tamano`** es lo grande que es el objeto (1 = normal, 2 = el doble). En un objeto de **texto** sigue siendo el tamaño de la letra. Para la letra de un botón está **`yo.tamanoLetra`**. | «Hazlo el doble de grande» se escribe `yo.tamano = 2`. Antes, en un cuadrado no hacía nada visible. |
| Para hacer visible un objeto: **`yo.aparecer()`**, no `mostrar`. Su contrario es **`yo.ocultar()`**. | `mostrar()` ya escribe en la consola; con el mismo nombre para dos cosas, el error estaría garantizado. |
| **`yo.transparencia`** existe además de `yo.opacidad` (y es su contrario). | Es la palabra que busca alguien que empieza. |
| Los sitios se pueden dar de **tres formas**: un objeto, un vector o dos números. Vale en `yo.irA`, `teletransportar`, `distanciaA`, `anguloA` y `rotarHacia`. | `yo.irA(400, 300)` es lo primero que se escribe; `yo.irA(buscar("Meta"))` también tiene que valer. |
| **`yo.irA(sitio, segundos)`** va suave; **`yo.teletransportar(sitio)`** va de golpe y quita la velocidad. | Los dos casos de «ir a un punto»: el que se ve y el que no. Sin quitar la velocidad, un objeto con física saldría disparado al llegar. |
| **Etiquetas**: `yo.ponerEtiqueta("peligro")`. Las entienden `cuando toco peligro:`, `yo.tocando("peligro")`, `yo.cercanos(…, "peligro")` y `buscarConEtiqueta("peligro")`. | Agrupar cosas distintas (lava, pinchos y enemigos son «peligro») sin repetir el código para cada una. |
| **`yo.pegarA(otro)`**: el hijo se mueve lo mismo que su padre (y puede moverse además por su cuenta). Si el padre se destruye, sus hijos también. No se puede hacer un bucle de padres. | Como en Roblox y Godot. Mover «lo mismo que el padre», en vez de fijarlo a una distancia, deja que la espada también se balancee. |
| **`yo.arrastrable = verdadero`** y el motor hace el resto (se coge el de más arriba; mientras se lleva, no cae). | Puzles e inventarios sin escribir el código del ratón. |
| **`dibujar.linea / circulo / rectangulo / texto`** dibuja en el mundo durante **un fotograma**. | Es para ver cosas mientras programas (a dónde apunta algo, hasta dónde ve un enemigo). Si durara para siempre, llenaría la pantalla. |
| **`tiempo.pausar()`** para el juego pero no las teclas: los eventos siguen llegando (con `delta` = 0) para poder quitar la pausa. | Si una pausa parara también las teclas, no habría forma de salir de ella. |
| **Fundidos**: `pantalla.oscurecer(1)` y `pantalla.aclarar(1)`, y `escena.cambiar("Nivel2", 1)` oscurece, cambia y aclara. Van en tiempo real: funcionan aunque el juego esté en pausa. El fundido se conserva al cambiar de escena. | El cambio de nivel con fundido es lo que más «profesional» hace sentir un juego, y es una sola línea. |
| **Sonido**: volumen y tono en el mismo `sonido.reproducir("salto", 0.5, 1.2)`; `sonido.bucle()` para los que se repiten; `sonido.pausar()` pausa **todo** el sonido a la vez. La música tiene fundido de entrada y salida, y pausa por donde iba. | Pausar un «pum» de medio segundo no tiene sentido; lo que se pausa es el juego entero. |
| **Listas y textos**: `ordenar`, `mezclar` e `invertir` cambian la lista (y la devuelven); `sublista` y todo lo de los textos dan uno **nuevo**. | Como en Python y Lua. Los textos no se pueden cambiar por dentro en casi ningún lenguaje. |
| `para cada i, x en lista:` da **la posición y el valor**. Antes era un error. | Recorrer con la posición es de lo más pedido («el enemigo número 3»). La forma de dos nombres ya existía para las tablas. |
| `texto(3.5, 2)` da `"3.50"`: **siempre esos decimales**. | Para marcadores de tiempo que no bailan (3.5, 3.48, 3.5…). |
| Ángulos siempre en **grados** (también `tangente` y `angulo`), con **0 = derecha y 90 = arriba**. | Es lo que se aprende en el colegio, y ya era así en el resto del motor. |

### Depurador (noche, bloque 1)

| Decisión | Por qué |
|---|---|
| Un punto de parada se pone **haciendo clic en el número de la línea** (sale un punto rojo); otro clic lo quita. Si escribes líneas encima, el punto se mueve con su línea. | Es donde lo ponen todos los editores (VS Code, Roblox Studio), y no hay que aprender ningún menú. |
| El juego se para **justo antes** de la línea del punto. Esa línea (la siguiente que se va a ejecutar) se resalta en amarillo. | Así se ven los valores de ANTES de la línea, que es lo que se quiere mirar para entender por qué algo sale mal. |
| Un punto en la línea de un **«cuando»** para en su primera línea de dentro. | El «cuando» no se ejecuta como tal; es lo que quiere decir quien lo pone ahí. |
| Tres botones con nombre en español: **Continuar** (F8), **Siguiente línea** (F10) y **Entrar en función** (F11). Son las teclas de Visual Studio. | «Paso por encima» y «paso a paso» (*step over*, *step into*) son palabras que no dicen nada a quien empieza. |
| Los pasos van siempre por el **mismo evento**: si mientras tanto ocurren otros eventos, no se para en ellos (salvo que tengan un punto de parada). | Si no, «Siguiente línea» saltaría a otro script y parecería que el depurador se ha vuelto loco. |
| Por dentro, parar es que el HILO del evento se queda quieto (como en un `esperar()` sin fin) y el juego se pone en pausa. | Los hilos ya sabían pararse a medias: no ha hecho falta cambiar cómo se ejecuta nada. Si no hay puntos de parada, no cuesta nada. |
| El resto del fotograma en el que se para (la física, otros objetos) **termina** antes de pausar. | Cortar un fotograma a medias podría dejar el juego en un estado imposible. Solo el evento parado se queda quieto. |
| El panel **Depurar** enseña las variables agrupadas: las de aquí, las de los bloques de fuera, las del script y lo más útil de **yo** (dónde está, su velocidad y sus propiedades propias). Las funciones y las cosas del motor (teclado, crear…) no salen. | Lo que se quiere mirar es lo del propio código; cien cosas del motor lo taparían. |
| Los puntos de parada **no se guardan en el proyecto**. Duran mientras el editor está abierto. | Son una herramienta para mirar, no parte del juego; y así un juego exportado nunca se para. |
| El botón **Pausa / Seguir** de arriba, estando parado en una línea, hace lo mismo que Continuar. | Es el botón que tiene más a mano quien no sabe que existe el panel. |

### Recursos (noche, bloque 2)

| Decisión | Por qué |
|---|---|
| **Soltar archivos encima del editor** los importa: las imágenes y los sonidos, en cualquier sitio de la ventana (se ve un aviso «Suelta aquí…»). En la escena, las imágenes además se colocan como objeto. Lo que no es imagen ni sonido se explica en un mensaje. | Arrastrar es lo primero que se prueba. Antes solo funcionaba con imágenes y solo encima de la escena. |
| **Doble clic en el nombre** cambia el nombre de una imagen, un sonido o una animación, y lo cambia **en todos los sitios**: objetos, plantillas, casillas del mapa, animaciones y el **código** (los textos entre comillas con ese nombre). Se deshace de una vez. | Si al renombrar hubiera que buscar el nombre a mano por todo el código, nadie renombraría nada. Solo se cambian los textos exactos entre comillas, nunca trozos de otras palabras. |
| Antes de **borrar**, se avisa de **dónde se usa** (objetos, casillas, animaciones y líneas de código). | Borrar una imagen que usan cinco sitios sin saberlo es la forma más rápida de romper un juego. |
| Borrar una imagen la quita también de los **tipos de casilla** del mapa. | Antes se quedaba el nombre de una imagen que ya no existía. |
| **Editor de pixel art** dentro de Chispa: lápiz, goma, cubo y coger color; paleta de 16 colores y cualquier otro; zoom; voltear; deshacer. Dibujos de 8 × 8 a 64 × 64. | Para muchos, dibujar sus propios personajes es la mitad de la gracia de hacer un juego, y no hace falta instalar otro programa. |
| **Fotogramas** en el mismo editor. El botón principal crea el siguiente como **copia** del actual, y el anterior se ve en transparente («papel cebolla»). Con varios fotogramas se guarda una **animación** (Nombre) y una imagen por fotograma (Nombre1, Nombre2…). | Así es como se anima de verdad: se copia el dibujo y se cambia un poco. |
| Un dibujo **nuevo nunca pisa** uno que ya existe (se le pone otro nombre: Dibujo2). Solo se sobrescribe al **editar**. | No perder nunca un dibujo por repetir el nombre. |
| Las imágenes pequeñas (hasta 64 × 64) se dibujan **nítidas** al agrandarlas, con sus píxeles cuadrados, en el juego y en las miniaturas. | Un sprite de 16 × 16 puesto a 64 × 64 se veía borroso. Las fotos grandes se siguen suavizando. |
| El editor de **animaciones** tiene una **vista previa** que se mueve a la velocidad elegida, y los fotogramas se pueden cambiar de orden. Desde él se puede pasar a **dibujar** los fotogramas. | Ver la animación antes de jugar ahorra ir y volver al juego a cada cambio. |
| Al decir «¡Vamos!» al tutorial en la primera visita, **solo se pregunta** antes de cerrar el proyecto si se había **recuperado uno guardado** o se había cambiado algo. | Antes también preguntaba si el ejemplo del principio se había guardado solo (pasa al segundo de abrir): quien tardaba en leer la bienvenida recibía un «tu proyecto se cerrará» que no entendía. Lo destapó una prueba de navegador que fallaba una de cada dos veces. |

### Comunicación entre objetos (noche, bloque 3)

| Decisión | Por qué |
|---|---|
| **Mensajes**: `enviar("abrir_puerta")` en un script y `cuando recibo "abrir_puerta":` en otro (con comillas o sin ellas). Le llega a **todos** los que lo escuchan. Se puede mandar algo con el mensaje (`enviar("dano", 10)`) y llega en **`dato`**. | Es como los mensajes de Scratch («enviar» y «al recibir»), que muchos ya conocen. Un mensaje no necesita saber quién escucha: la llave no tiene que conocer la puerta. |
| El mensaje llega **al empezar el siguiente fotograma**, no en el momento. | Si llegara al instante, dos objetos que se responden (ping → pong → ping…) colgarían el juego en un bucle sin fin. Así, como mucho va un mensaje por fotograma y el juego sigue. |
| Si **nadie recibe** un mensaje, sale un **aviso amarillo** mientras escribes, sugiriendo el parecido (`"abrir_puera"` → `"abrir_puerta"`). | Una letra cambiada en un mensaje no da ningún error: simplemente no pasa nada, que es lo más difícil de encontrar. |
| Otras palabras que se le ocurren a un principiante (`cuando llega`, `cuando escucho`, `cuando oigo`…) dan un error que enseña la buena: `cuando recibo "mensaje":`. | Una sola forma de escribirlo, pero sin castigar al que prueba otra. |
| **Datos del juego**: se siguen usando con `juego.x` (una sola forma). Lo nuevo: en el inspector de la escena (sin nada seleccionado) hay una sección **Datos del juego** para darles su **valor inicial** sin código. Están puestos antes de que empiece ningún script. | Antes había que acordarse de ponerlos en un `cuando empieza` de algún objeto, y si otro objeto los leía antes, fallaba. Con valores iniciales, el orden deja de importar. |
| Si se lee `juego.algo` y **ningún script lo guarda** (ni está en Datos del juego), sale un aviso con el nombre parecido (`juego.punto` → `juego.puntos`). Comparar (`==`) no cuenta como guardar; `+=` sí. | Es el error de principiante más común con datos compartidos, y antes solo se veía al llegar a esa línea jugando. |
| El **depurador** enseña también todo lo que hay en `juego`. | Son los datos que más se quieren mirar al buscar un fallo. |
| **Llamar funciones de otro objeto**: `buscar("Puerta").abrir()` ejecuta la función `abrir` del script de la puerta **como si fuera la puerta** (`yo` es la puerta). Lo que devuelve, se puede usar. Puede tener `esperar()` dentro. | Es lo que se espera: «puerta, ábrete». Si `yo` fuera el que llama, la función haría cosas al objeto equivocado. |
| Un error dentro de esa función sale **en el archivo de la puerta**, en su línea, y el depurador entra en ese archivo. | El error está en ese código, no en el que llama. |
| Las **variables del script** de otro objeto no se pueden leer desde fuera; el error explica que se use una propiedad (`yo.llaves`) o `juego.llaves`. | Las variables son del script, las propiedades son del objeto. Así hay un sitio claro para cada cosa. |

### Utilidades de juego (noche, bloque 4)

| Decisión | Por qué |
|---|---|
| **Comportamientos sin código** en el inspector (sección «Comportamiento»): perseguir si está cerca, huir si está cerca y seguir como una mascota, con a quién, rapidez y distancia. **Patrullar** es el Recorrido que ya existía; los dos se juntan: el enemigo patrulla y deja el camino mientras persigue. | Es lo que más se programa en los primeros juegos, y es fácil equivocarse. Con un desplegable, un enemigo que persigue está hecho en 5 segundos. |
| El objetivo es un **nombre, tipo o etiqueta**, y si hay varios va a por el **más cercano**. | Sirve igual para «el Jugador» que para «cualquier Moneda». |
| **`yo.irHacia(sitio, rapidez)`** busca el camino (A*) por el mapa de casillas y **rodea las paredes**. Si el sitio es un objeto, lo sigue aunque se mueva. `yo.yendo` dice si sigue de camino y `yo.parar()` lo para. | Hacer A* a mano es demasiado para un principiante; pedir «ve allí» no. Un solo nombre (`irHacia`) frente a `irA` (que va recto y suave, en un tiempo). |
| Los caminos **solo esquivan casillas sólidas** del mapa, no los objetos sólidos sueltos, y solo en juegos **vistos desde arriba** (sin gravedad). En plataformas, perseguir es ir a los lados. | Así el cálculo es rápido y predecible. Para un laberinto las paredes se pintan con casillas; en un plataformas, «ir hacia» por el aire no tiene sentido. |
| Los que se mueven solos, con física, se mueven cambiando su **velocidad** (chocan con las paredes); sin física, cambiando su posición. | Así no atraviesan paredes, y un fantasma sin física sí puede. |
| **`rayo(desde, direccion, largo)`** da una **tabla** (objeto, punto, distancia, casilla) o **nulo**. La dirección puede ser un ángulo, un vector o un objeto. El que lanza el rayo no se toca a sí mismo. | «¿Me ve el jugador?» es `rayo(yo, jugador, 400)` y mirar qué tocó. Nulo = no toca nada, que se comprueba con un `si`. |
| **`dialogo("Ana", "texto", opciones)`**: letra a letra, se pasa con espacio, intro o clic (la primera pulsación enseña todo el texto). Con opciones se eligen con flechas, números o el ratón, y **devuelve la elegida**. | Es la forma más corta de hacer conversaciones con decisiones, y se lee como un guion. |
| Mientras hay un diálogo, **el juego se para** (scripts, física y mensajes) y la tecla que lo cierra no llega al juego. Varios diálogos a la vez salen uno tras otro. | Si no, el jugador saltaría al pulsar espacio para pasar el texto, y los enemigos atacarían mientras lees. |
| El **mando hace de teclado**: cruceta y palanca = flechas, A = espacio, B = x, X = z, Y = c, start = enter, select = escape. Para más control, el módulo `mando` (palancas, botones, vibrar). | Así todos los juegos ya hechos se juegan con mando sin tocar nada. |
| En el juego exportado, en un **móvil**, salen **botones táctiles solos**: se mira qué teclas usan los scripts y se pone una cruceta y botones redondos para esas. Se pueden quitar en el proyecto («botones en el móvil»). | Configurar controles táctiles a mano es un lío; así un juego hecho en el ordenador se juega en el móvil sin hacer nada. |

### Lo que faltaba (encontrado con la Arena de Habilidades)

| Decisión | Por qué |
|---|---|
| **Scripts de funciones**: un script que no está en ningún objeto comparte sus funciones con todos los scripts. Sin `importar`. | Es lo más sencillo: crear el script y no ponerlo en nada. Así el código que usan varios objetos se escribe una vez. Sus variables son solo suyas; dentro no hay `yo` (se le pasa el objeto), y se explica con un error si se usa. |
| **`aLaVez(funcion, ...)`** en vez de otra forma de hilos. | Cada evento ya es un hilo; esto solo deja empezar otro. Con el nombre de la función (sin paréntesis), igual que se pasa una función en una tabla. |
| **`rango(desde, hasta, paso)`** devuelve una lista, y se usa con `para cada`. | No hace falta un bucle nuevo: `para cada` ya se conoce. |
| **`yo.atravesar("Nombre")`** con nombre, tipo o etiqueta (como `cuando toco`). | Lo mismo que ya se sabe usar para tocar sirve para no chocar. Sin «capas de colisión» con números. |
| **`dibujar.enPantalla`** es un módulo dentro de `dibujar`, con las mismas funciones. | Una sola cosa que aprender: lo mismo, pero fijo en la pantalla. Se dibuja por debajo de los objetos de la interfaz. |
| **`sonido.efecto("nombre")`** con una lista fija de efectos generados. | Un juego suena desde el primer minuto, sin buscar archivos. Los nombres son palabras de juego (explosion, moneda, salto…). |
| **Órdenes en la consola** mientras se juega (una línea de Chispa). | Probar cosas (ir al jefe, darse vida) sin tocar el código ni jugar 10 minutos. Es la consola que ya se mira. |
| Los objetos de texto hacen **salto de línea con `\n`** y **crecen con la escala**. | Es lo que se espera al escribir `"Linea 1\nLinea 2"` o al animar la escala de un texto. |

### Modo bloques (noche, bloque 5)

| Decisión | Por qué |
|---|---|
| Cada script tiene arriba dos botones: **Código** y **Bloques**. En bloques se ve la paleta de colores (Eventos, Control, Movimiento, Apariencia, Sonido, Objetos, Variables, Funciones) y se arrastra, como en Scratch. | Se puede empezar con bloques y pasar a código cuando se quiera, en el mismo script. |
| **El código es lo que se guarda.** Los bloques lo escriben al momento (con «Ver el código» se ve al lado), y al pasar a bloques se lee el código. | Un juego hecho con bloques es Chispa de verdad: funciona igual, se exporta igual y se puede seguir en código. No hay dos formatos que puedan no coincidir. |
| Las **órdenes** son bloques; lo que va **dentro de los huecos** (yo.x + 10, "hola", buscar("Jugador")) se escribe como código corto, y el hueco se pone rojo si no tiene sentido (y dice por qué). | Un bloque para cada suma y cada comparación hace los programas enormes. Escribir valores pequeños es el puente natural hacia el código. |
| Las órdenes más usadas (mostrar, esperar, crear, saltar, sonido...) tienen **bloques con palabras** («saltar con fuerza 600»). Cualquier otra orden sale como un bloque **«hacer»** con su código. | Así cualquier script se puede ver en bloques, aunque use cosas que no tienen bloque propio. |
| Si el código **tiene errores de escritura, no se puede pasar a bloques**: se explica y se dicen las líneas. Los **comentarios** de una línea se convierten en bloques de **nota**; si hay comentarios al final de una línea (que en bloques no caben), se pregunta antes. | Nunca se pierde nada sin avisar. |
| Un «si» o un «repetir» **vacío** se deja: en el código sale como un bloque vacío (que da su error, como si se escribiera a mano) y en los bloques pone «Arrastra aquí lo que tiene que hacer». | Es lo mismo que pasa en código; no se inventa una orden «no hacer nada». |
| Los errores y el depurador **resaltan el bloque** de esa línea. Ctrl+Z deshace dentro de los bloques. | Lo mismo que se puede hacer en código. |
| Si el script se deja en bloques, se abre en bloques la próxima vez (se guarda en el proyecto). | Quien trabaja con bloques no quiere encontrarse el código cada vez. |

### Robustez y comodidad (noche, bloque 6)

| Decisión | Por qué |
|---|---|
| El guardado automático se hace **un momento después de cada cambio**, pero si se sigue cambiando sin parar, **como mucho cada 5 segundos**. Al abrir, se recupera solo y **se avisa** («Recuperado …, tal como estaba hace 3 min»). | Antes, escribiendo mucho rato seguido no se guardaba hasta parar; si el navegador se cerraba de golpe (sin avisar), se perdía todo ese rato. Ahora, como mucho, los últimos segundos. |
| **Ajustes** (botón arriba a la derecha, o Ctrl + ,): tema **oscuro o claro**, tamaño de la **letra del código** y de la **letra del editor**. Se guardan en el navegador, no en el proyecto. | Son de la persona, no del juego: un proyecto compartido no le cambia el tema a nadie. |
| La letra del editor agranda **todos los paneles a la vez** (zoom), pero no la escena ni el juego. | Cambiar tamaños sueltos descoloca los paneles; y la escena y el juego tienen su propio zoom. |
| **F1** abre la ventana con **todos los atajos**, por grupos. La lista está en un solo sitio (atajos.ts) y de ahí sale también la de la Ayuda. | Dos listas escritas a mano acaban diciendo cosas distintas. |
| Nuevos atajos: **F1** (atajos), **Ctrl + ,** (ajustes), **Ctrl + B** (código ⇄ bloques). Ctrl + Z dentro de los bloques deshace en los bloques, no en la escena. | Los tres son cosas que se hacen a menudo. |
| **Rendimiento con 2000 objetos**: la física busca los contactos solo desde quien los escucha, con claves numéricas; las parejas cercanas se buscan con un barrido (sin crear listas); los sólidos cercanos se buscan una vez por paso; como mucho 4 pasos de física por fotograma; y las expresiones sin llamadas se calculan sin generadores. | Con 2000 cajas amontonadas el juego iba a 10 fotogramas por segundo y con 2000 objetos con script, a 28. Ahora el motor tarda 17 ms y 7 ms por fotograma (antes 52 y 46). Hay una prueba de navegador que lo vigila. |
| Un script **con «cuando» que no está en ningún objeto** no es un script de funciones: solo avisa de que no se ejecuta (antes, al crear un script y no ponerlo todavía en un objeto, su `yo` daba error y no dejaba ejecutar el juego). | Lo encontró la prueba de rendimiento. Un script de funciones es el que solo tiene funciones. |
| Bloque 8: **16 recetas nuevas** en la Guía, una por cada cosa nueva de la noche (mensajes, datos del juego, comportamiento, rayo, diálogos, mando, bibliotecas, aLaVez, rango, dash, barras de vida, efectos, fundido, órdenes, bloques). Algunas no solo se comprueban al escribir: un test las **juega**. | Una receta que se escribe bien pero no hace lo que dice engaña más que no tenerla. Así salió que la puerta de la receta de mensajes tenía que destruirse (oculta, seguía chocando). |

## Código abierto (versión 1.0)

| Decisión | Por qué |
|---|---|
| Un proyecto que **no encaja** con el formato **no se abre** (con un error que dice el sitio exacto: «escenas → Principal → objetos → 1 → x»). Lo que no se conoce (campos de más) se ignora sin avisar. | Abrir «lo que se pueda» de un archivo raro es justo lo que aprovecha un ataque. Con el sitio exacto, quien lo hizo puede arreglarlo. Los campos de más no hacen daño una vez quitados, y así los proyectos de versiones futuras no se rompen del todo. |
| Las imágenes y los sonidos de un proyecto solo pueden ir **dentro del archivo** (data URL). Nada de direcciones de internet ni rutas. | Si no, abrir el proyecto de otra persona le diría a su servidor que lo has abierto y desde dónde. Además, así un proyecto nunca pierde archivos. |
| Los SVG se aceptan, pero solo si son dibujo (sin `<script>`, `onload`, `javascript:` ni nada de internet). | Muchos dibujos se hacen en SVG; quitarlos del todo sería un paso atrás. Dentro de una imagen el navegador ya no ejecuta scripts, así que esto es una segunda defensa. |
| Cada proyecto tiene un **identificador al azar**, y los datos de `guardar()` van con él (antes, con el nombre). | Un juego de otra persona con el mismo nombre podía leer tus récords. Lo guardado antes de la 1.0 con el nombre no se lee ya: es un precio pequeño (son récords) por cerrar ese agujero. |
| Límites: 1 000 funciones una dentro de otra, 1 000 000 de letras por texto, 1 000 000 de elementos por lista, 10 000 objetos por escena, 5 000 `aLaVez` a la vez por objeto, 10 000 mensajes por fotograma. | Muy por encima de lo que usa un juego (la Arena, el más grande, no se acerca), y muy por debajo de lo que congela un navegador. |
| En el editor, `sistema.abrirWeb` **pregunta antes**, enseñando la dirección. En el juego exportado, no. | En el editor puedes estar probando el proyecto de otra persona. El juego exportado es de su autor, y el navegador ya no deja abrir ventanas sin que el jugador pulse algo. |
| Los juegos exportados llevan una CSP con la **huella** (sha256) de su código, no con `'unsafe-inline'`. La huella se calcula con un SHA-256 escrito a mano. | La página es un solo archivo, así que el código tiene que ir dentro; con la huella, solo ESE código se ejecuta. `crypto.subtle` es asíncrono y exportar es inmediato. |
| El editor lleva CSP solo al compilar, y permite estilos en línea. | `npm run dev` necesita recargar al momento, y CodeMirror pone sus estilos en línea. Lo que se publica es lo compilado. |

