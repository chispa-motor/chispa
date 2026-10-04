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
| Licencia **MPL 2.0** para el motor. El archivo `LICENSE` es el texto oficial de Mozilla, en inglés. | Es lo que se pidió. La MPL es «copyleft por archivo»: quien cambie un archivo de Chispa y lo reparta tiene que compartir ese archivo, pero lo que se hace CON Chispa (los juegos) no. Mozilla no tiene traducción oficial, y una traducción no valdría legalmente; la explicación en español está en README.md y EMPIEZA_AQUI.md. |
| La cabecera de cada archivo lleva una línea en español (Chispa, el copyright) y el aviso oficial de la MPL (el «Exhibit A») en inglés, más la línea `SPDX-License-Identifier: MPL-2.0`. `npm run cabeceras` la pone y un test vigila que ningún archivo del motor se quede sin ella. | El aviso tiene que ser el oficial para valer; SPDX hace que las herramientas (y GitHub) reconozcan la licencia de cada archivo. |
| Los **juegos de ejemplo** (`proyectos/` y `src/ejemplos/`) son de **dominio público (CC0)** y no llevan cabecera. | Si fueran MPL, quien empieza un juego desde la Arena tendría que compartir esos scripts cambiados: justo lo contrario de «tus juegos son tuyos». Con CC0 se pueden copiar sin pensar. |
| Cada **juego exportado** lleva un comentario escondido: el juego es de su autor; el motor es Chispa, MPL 2.0, y su código está en el repositorio. | La MPL pide, al repartir el programa ya hecho (y el reproductor va dentro de cada juego), decir dónde está su código. Es lo único que se le pide al creador, y lo pone Chispa solo. |
| Los enlaces que se pueden cambiar (donaciones y repositorio) están en **un solo archivo**: `src/configuracion.ts`. El repositorio está en la organización `chispa-motor`: `github.com/chispa-motor/chispa`. | Se pidió así. El del repositorio hace falta para el aviso de la licencia de cada juego exportado. |
| Los avisos de licencia de las 14 dependencias que van dentro del editor (todas MIT, de CodeMirror) se copian en `public/licencias-de-terceros.txt`, que se reparte con el editor compilado. `npm run licencias` lo genera y un test vigila que ninguna dependencia nueva tenga una licencia incompatible. | La licencia MIT pide que su aviso viaje con el código. |
| En CREDITOS.md se dice que Chispa se programó con la ayuda de Claude (Anthropic). | Es verdad y es bueno decirlo en un proyecto abierto. Rodrigo puede quitarlo o cambiarlo. |
| Las capturas del README son de verdad (el editor compilado en Chromium) y se rehacen con `npm run capturas`. | Así, cuando el editor cambie, se actualizan con una orden, y nunca enseñan algo que no existe. |
| La **versión 1.0.0**, con versionado semántico (explicado en `src/version.ts`). Sale en la Ayuda, en «Acerca de Chispa» y en cada juego exportado (`<meta name="generator">`). Un test vigila que sea la misma que en package.json. | Así quien avisa de un fallo puede decir con qué versión le pasa, y un juego exportado dice con qué Chispa se hizo. |
| «Acerca de Chispa» y «Apoya Chispa» están **dentro de la ventana de Ayuda**, en una fila al final (con la versión), y no en la barra de arriba. | La barra es para hacer juegos. Quien busca información la busca en la Ayuda. |
| «Apoya Chispa» **solo** hace algo al pulsarlo. Con enlace, lo abre en otra pestaña; **sin enlace todavía**, da las gracias y cuenta otras formas de ayudar (en vez de esconder el botón). Nunca hay avisos de donación que salten solos, ni en el editor ni en los juegos exportados (un test lo vigila). | Se pidió así. Esconder el botón haría pensar que falta; así se ve dónde irá el enlace. |

## Curso y chuleta

| Decisión | Por qué |
|---|---|
| APRENDE_CHISPA.md y CHULETA_CHISPA.md **se generan** (como el manual) desde `src/chispa/api/curso.ts` y la API de verdad (`documentacion.ts`), con `npm run manual`. | Así nunca se quedan atrás: un test falla si se añade un comando a la API y no está en el curso, o si alguien cambia el .md a mano. La frase de «qué hace» sale de la propia ficha de la API. |
| Un test **ejecuta** cada ejemplo, cada línea de la chuleta, cada solución de ejercicio y cada mini proyecto en un juego de prueba, y exige cero errores. | Se pidió que los ejemplos funcionen de verdad, no que lo parezcan. |
| Cada «error típico» dice si Chispa avisa (error) o si es de lógica (funciona, pero hace otra cosa), y el test lo comprueba en los dos sentidos. | Varios errores que «parecían» errores no lo eran (Chispa acepta `empiece`, por ejemplo); el curso no puede prometer un aviso que no sale. |
| Los ejemplos de la chuleta usan unas variables comunes (`vida`, `lista`, `jugador`...) que se enseñan una vez al principio. | Una línea por comando no da para declararlo todo; así cada ejemplo cabe en una línea y sigue funcionando. |
| Arreglado de paso: un objeto que se clona a sí mismo (o una plantilla que se crea a sí misma) en «cuando empieza» ya no rompe el juego con un desbordamiento: a los 40 niveles de creaciones una dentro de otra, Chispa para con un error que lo explica. | Lo encontró el test del curso. Antes el navegador se quedaba sin pila y el juego moría sin decir nada útil. |

## Chispa 1.1 · Día 1: objetos y dibujo

| Decisión | Por qué |
|---|---|
| 13 formas nuevas (triángulo, elipse, polígono, estrella, rombo, corazón, flecha, línea, cápsula, rectángulo redondeado, anillo, arco y camino libre). Cada forma se calcula UNA vez como puntos (`src/objetos/formas/figuras.ts`) y esos mismos puntos se usan para dibujar, para chocar y para saber si el ratón está encima. | Lo que ves es lo que choca. Un solo sitio que sabe cómo es cada forma. |
| Para chocar, cada forma se parte en piezas convexas (triángulos de `earcut` que luego se juntan mientras sigan siendo convexos) y se usa el «teorema del eje separador» (SAT, `formas/sat.ts`). | SAT es el método estándar para polígonos convexos, es rápido y da por dónde separar. Juntar los triángulos deja una estrella en 5 piezas y un corazón en menos de 20, en vez de 54 triángulos. |
| Los rectángulos siguen chocando como cajas sin girar (lo de siempre). Las demás formas chocan con su figura, girada y volteada. `colision.forma` (`yo.formaColision`) elige: auto, caja o figura. | Los juegos de plataformas con rectángulos no cambian nada (ni en velocidad ni en cómo se sienten). |
| En una rampa que hace de suelo, el cuerpo se empuja hacia ARRIBA, no en diagonal; solo los que rebotan salen por la normal. | Así un personaje se queda quieto en una cuesta y la sube andando, como en los plataformas; una pelota sí rueda y rebota. |
| Formato de proyecto 3. Al abrir un proyecto de antes, sus círculos con colisión pasan a `colision.forma = "caja"`. | Antes los círculos chocaban como cajas. Así los juegos que ya existen se juegan exactamente igual, y los círculos nuevos son redondos. |
| Los caminos de la pluma se guardan en unidades del tamaño (de -0,5 a 0,5). | Si cambias el ancho o el alto del objeto, el dibujo se estira con él, como las demás formas. |
| Los datos del arco se llaman `inicioArco` y `finArco` (y no «desde» y «hasta»). | «desde» y «hasta» son nombres que cualquiera usaría para sus propias propiedades; así no chocan. |
| Polígonos y estrellas: de 3 a 64 lados; caminos: hasta 400 puntos. | Más no se distingue a la vista, y sin límite un `yo.lados = 1000000` congelaría el navegador. |
| Dependencias nuevas: `earcut` (ISC) para trocear polígonos y `polygon-clipping` (MIT, con `robust-predicates`, Unlicense) para unir y restar formas en el editor. Unlicense se añade a las licencias compatibles (es dominio público). | Son las bibliotecas de referencia para esto, pequeñas y muy probadas. Escribir un recortador de polígonos robusto a mano es fácil hacerlo mal. |
| Cada comando nuevo de 1.1 está en `src/chispa/api/cursoNovedades.ts`, y `pruebas/novedades.test.ts` comprueba que cada uno tiene ficha de ayuda, autocompletado, manual y bloque. | Así no se puede añadir un comando a medias. |
| Las propiedades nuevas tienen bloque «poner yo.forma a …» en la paleta de su categoría (`DATOS_CON_BLOQUE`). | Un bloque de asignar normal: el código que sale es el de siempre, y se lee igual al volver de código a bloques. |
| Estilo de las formas (`src/motor/Estilo.ts`): relleno (color, degradado, degradado redondo, patrón, imagen repetida), borde (grosor, color, a rayas), sombra, resplandor y modo de mezcla. Un objeto sin estilo sigue dibujándose por el camino rápido de antes. | El estilo cuesta algo más de dibujar; así solo lo paga quien lo usa. |
| La sombra y el resplandor se pintan «solo como sombra»: la forma se dibuja muy lejos, fuera del lienzo, y su sombra se trae a su sitio. | Si no, en una forma medio transparente la sombra se vería a través de ella. Y con el lienzo del navegador solo cabe una sombra por dibujo: así hay sombra Y resplandor a la vez. |
| Los patrones (rayas, puntos, cuadros, rombos, ondas, ladrillos) se dibujan con código en un cuadro de 16 × 16 que se repite, con el color y el color2 del objeto. | No hacen falta imágenes ni archivos aparte, y cambian de color con el objeto. |
| Paletas listas propias (10 paletas de 8 colores), las mismas en el editor y en Chispa (`paleta("neon", 3)`). | Elegidas a mano para Chispa: no se copia ninguna paleta con autor. |
| El selector de color es propio (rueda de tono e intensidad, brillo, transparencia, código, cuentagotas, «Mis colores» y paletas), en vez del de cada navegador. | El del navegador es distinto en cada uno, no tiene paletas ni sitio para guardar colores. |
| El cuentagotas usa el del navegador cuando lo tiene (Chrome, Edge: coge de cualquier sitio de la pantalla). Si no, el siguiente clic en un dibujo del editor coge su color. | Firefox y Safari no tienen cuentagotas: así funciona en todos. |
| «Mis colores» se guardan dentro del proyecto (`colores`, como mucho 40). | Viajan con el juego: si lo abres en otro ordenador, siguen ahí. |
| Los colores nuevos se comprueban al ponerlos desde Chispa (`yo.colorBorde = "blanquito"` da un error que propone «blanco»). `yo.color` sigue aceptando lo de antes. | Un color mal escrito no se veía y no avisaba. No se cambia `yo.color` para no romper juegos que ya existen. |
| La pluma (`EditorPluma.ts`): clic pone un punto, clic y arrastrar hace una curva (tiradores como en los programas de dibujo), clic en el primer punto cierra la forma, doble clic cambia esquina ↔ curva. Con imán a una cuadrícula (Mayúsculas lo suelta). El modelo (`ModeloPluma`) va separado de la pantalla. | Es la forma de dibujar caminos que se usa en todos los programas de dibujo, así lo aprendido aquí sirve fuera. Separar el modelo deja probar todo sin ratón. |
| Al aceptar la pluma, el camino se encaja en su objeto (lo que ocupa pasa a ser su ancho y su alto) y el objeto se mueve lo justo para que el dibujo no salte de sitio. | Si no, la caja del objeto (para elegirlo y cambiar su tamaño) no coincidiría con lo que se ve. |
| Cualquier forma se puede retocar con la pluma: se pasa a puntos y se quitan los que casi no cambian la forma (Ramer-Douglas-Peucker). | Un círculo son 48 puntos: con tantos no se puede editar a mano. |
| Unir y restar: con varias formas elegidas, en el inspector. Restar le quita al PRIMERO que elegiste lo que tapan los demás. El resultado es una forma nueva («Union», «Recorte») y las originales se quitan, todo en un solo paso de deshacer. | Es la operación que se busca (hacer un agujero, una luna). Los textos, imágenes y mapas no se combinan. |
| «Convertir en imagen» dibuja la forma (relleno y borde) en un PNG al doble de resolución; la sombra, el resplandor y la mezcla se quedan en el objeto. La imagen recuerda su forma: choca con ella (`colision.forma = "figura"`). | Así no se pierde nada de la forma al pasarla a imagen, y la imagen no se corta por la sombra. «Convertir en plantilla» ya existía. |
| Biblioteca (`src/editor/biblioteca/biblioteca.ts`): 16 objetos listos en 5 categorías, en una pestaña del panel izquierdo, con buscador (sin importar tildes) y filtro por categoría. Se arrastran a la escena o se pulsan para ponerlos en el centro. | Es lo más rápido para empezar un juego, y cada objeto enseña cómo se hace con un script corto y comentado. |
| Todo lo de la biblioteca usa los mismos datos: `juego.puntos` y `juego.vidas`, y al ponerlo crea esos datos (sin pisar los que ya hubiera). Lo que hace daño lleva el daño en su propio script. | Así se mezclan entre sí (y con lo tuyo) sin tocar nada, y nunca hay un mensaje que nadie escucha. |
| Lo que se puede hacer sin código, se hace sin código: el enemigo que patrulla usa su Recorrido; el que persigue, su Comportamiento; la plataforma móvil y la caja no tienen script. | Se aprende qué hace cada parte del inspector, y hay menos código que entender. |
| Si un script de la biblioteca ya existe con el mismo nombre pero otro código (porque lo cambiaste), el nuevo se guarda con otro nombre (`moneda2.chs`). | Nunca se pisa lo que has escrito. |
| Los círculos chocan como círculos de verdad (no como polígonos de 48 lados), y la física mira una sola vez por fotograma qué objetos chocan con su figura. | Con 1000 círculos amontonados, chocar como polígonos hacía el juego 20 veces más lento. Así cuesta casi lo mismo que antes. |
| El panel izquierdo tiene ahora tres pestañas; si no caben sus nombres, las que no están elegidas se quedan solo con su icono. | Para que quepan en pantallas pequeñas sin cortarse. |

## Chispa 1.1 · Día 2: efectos especiales y comandos

| Decisión | Por qué |
|---|---|
| Los efectos están en un módulo, `efecto` (`efecto.explosion(yo)`, `efecto.fuego(yo)`, `efecto.lluvia()`...), y no en un comando con un texto (`efecto("explosion")`). | Al escribir `efecto.` el autocompletado enseña todos, cada uno con su ayuda; y Chispa avisa al momento si uno está mal escrito. |
| El sitio de un efecto se escribe como en el resto de Chispa: un objeto, un vector, dos números o nada (donde está quien lo pide). Con un objeto, el efecto lo SIGUE. | Una sola forma de decir «dónde», que ya se conoce de `yo.irA` y compañía. Un fuego pegado a una antorcha que se mueve se mueve con ella. |
| Tres clases de efecto: de golpe (partículas a la vez), que duran (un emisor, en un sitio, en un objeto o por toda la pantalla) y dibujos especiales (rayo en zigzag que cambia cada fotograma, onda, destello, números que suben). Todos en `src/objetos/Efectos.ts`, con las recetas en un solo sitio (`RECETAS`). | Las mismas recetas sirven al código, al editor (efecto de un objeto, clima de la escena) y al editor de partículas como punto de partida. |
| Las partículas ganan forma (círculo, cuadrado, línea, estrella, anillo, hoja, chispa), color final, tamaño final, giro, vaivén, rozamiento del aire, «brillo» (mezcla sumar) y área de salida. Lo que no se dice, como antes. | Con eso salen lluvia (líneas), nieve y hojas (vaivén), confeti (cuadrados que giran) y fuego (brilla y pasa de amarillo a rojo). Los juegos de antes no cambian. |
| Las que brillan se dibujan todas juntas con la mezcla «sumar», después de las normales. | Cambiar la mezcla del lienzo cuesta: así se cambia una vez por fotograma, no una por partícula. |
| Como mucho 3000 partículas y 200 efectos que duran a la vez. | Más no se distingue y el juego iría lento (o se congelaría con un efecto en un bucle sin fin). |
| `efecto.suave` (verdadero por defecto): la sangre sale como tinta de colores con estrellitas. Para que sea roja hay que pedirlo (`efecto.suave = falso`). | Se pidió sangre opcional con versión suave. Chispa es para todas las edades: lo suave es lo normal. |
| Polvo al saltar y al caer: `yo.polvo = verdadero` (o la casilla en Física). Al caer solo levanta polvo si llega con fuerza. | Así no salen nubecitas al bajar una cuesta andando. |
| Desde el editor, sin código: el «Efecto» de un objeto (fuego, humo, burbujas, estela o uno propio) y el «clima» de una escena (lluvia, nieve, hojas). | Se pidió poder usarlos también desde el editor. |
| Editor de partículas: se empieza desde un efecto listo, se cambia con deslizadores viéndolo en marcha y se guarda con un nombre en el proyecto (`efectos`). Se usa con `efecto.usar("nombre", yo)`, con `particulas("nombre")` o en la sección Efecto. No puede llamarse como uno de Chispa. | Empezar desde algo que ya funciona es más fácil que desde cero. El nombre no puede tapar a uno de Chispa para que no haya dudas de cuál sale. |
| Filtros de pantalla (`src/motor/Filtros.ts`): grises, desenfoque, pixelado, brillo, viñeta, aberración cromática, tele antigua (CRT) y bloom. La escena se dibuja en un lienzo aparte y se copia a la pantalla con los filtros; sin filtros, se dibuja directamente como siempre. | Lo que no se usa no cuesta nada. El lienzo del navegador ya trae desenfoque, grises y brillo; el resto (pixelado, viñeta, rayas, colores separados, halo) se hace copiando el lienzo. |
| Los filtros son de cada escena: se ponen en el editor (sección Pantalla) o desde el código, y al cambiar de escena se ponen los de la escena nueva. | Una cueva oscura o un nivel retro tienen su aspecto; un filtro puesto en un momento (un golpe en blanco y negro) no se queda pegado al pasar de nivel. |
| El fundido, el flash y los diálogos se dibujan DESPUÉS de los filtros. | Un diálogo se tiene que leer bien aunque la pantalla esté borrosa o pixelada. |
| Transiciones al cambiar de escena: `escena.cambiar("Nivel2", 1, "circulo")` con fundido, barrido, círculo o pixelado. Son el mismo «fundido» de antes con otra forma de tapar la pantalla. | Se aprovecha lo que ya existía (la pantalla se tapa, cambia la escena y se destapa) y `escena.cambiar("Nivel2", 1)` sigue igual. |
| `tiempo.congelar(0.08)`: el tiempo se para un instante (de verdad, aunque haya cámara lenta) y luego vuelve a la velocidad que tenía. Como mucho 5 segundos. | Es el «hit-stop» de los juegos de lucha: al dar un golpe fuerte se nota mucho más. Para parar más rato ya está `tiempo.pausar()`. |
| Efectos de objeto: contorno (con su color y grosor; en una imagen, su silueta alrededor), brillo, grises, desenfoque y `yo.flash()` (todo el objeto de un color un momento). El temblor, la cámara lenta y el parpadeo ya existían. | El contorno de una imagen no puede ser una línea: se dibuja su silueta un poco movida hacia los 8 lados. |
| Luces 2D (`src/objetos/Luces.ts`): la escena tiene oscuridad (de 0 a 1) y un color de oscuridad (luz ambiente); los objetos llevan luz de punto o foco, de color, con parpadeo y, si se quiere, sombras. Sin oscuridad, no se calcula nada. | Las luces solo tienen sentido en la oscuridad; así un juego de día no paga nada. |
| Cómo se dibuja: un «mapa de luz» aparte, a la mitad de resolución, todo del color de la oscuridad; cada luz borra la oscuridad con un degradado (en un cono si es un foco). Las luces de color, además, tiñen un poco lo que iluminan. | La luz es suave: a la mitad de resolución no se nota y cuesta cuatro veces menos. |
| Lo que da luz (partículas que brillan, rayos, destellos) se dibuja ENCIMA de la oscuridad; la interfaz, también. | El fuego tiene que verse en la cueva, y las vidas y los puntos siempre. |
| Sombras simples con un polígono de visibilidad: rayos a las esquinas de lo sólido cercano (y un poquito a cada lado). Tapan los objetos sólidos y las casillas sólidas (solo sus lados al aire, juntados en tramos largos); los fantasmas y la interfaz no. Como mucho 600 tramos por luz. | Es el método clásico y exacto para 2D. Juntar los bordes de las casillas deja una fila de 20 casillas en 4 tramos en vez de 80. |
| Lo que tapa la luz se ilumina por su cara (un poco menos que lo de delante), y una luz dentro de una pared (una antorcha colgada) no se tapa a sí misma. | Si no, las paredes alrededor de una antorcha se verían negras. |
| Las propiedades de la luz se llaman `yo.luz`, `yo.tipoLuz`, `yo.colorLuz`, `yo.radioLuz`, `yo.intensidadLuz`, `yo.anguloLuz`, `yo.luzConSombras` y `yo.parpadeoLuz`; cambiar cualquiera enciende la luz si no la tenía. | Todas empiezan o terminan en «luz» para encontrarlas juntas en el autocompletado, y no se confunden con `yo.sombra` (la sombra del dibujo). |
| Azar con semilla: `semilla(1234)` hace que `aleatorio()`, `elegir()`, `probabilidad()` y `lista.mezclar()` se repitan igual; `semilla()` vuelve al azar de verdad, y cada partida empieza sin semilla. El generador es mulberry32 (`src/utilidades/azar.ts`). | Sirve para mundos al azar iguales para todos (el nivel del día) y para repetir un fallo. Mulberry32 es rapidísimo y de sobra para juegos. |
| Las partículas y el temblor de la cámara NO usan la semilla: siguen con el azar de verdad. | Lo que solo se ve no debe gastar números de la semilla; si no, el mismo nivel saldría distinto según cuántas chispas hubiera en pantalla o a cuántos fotogramas fuera el juego. |
| Tipos de letra: 7 listas (`normal`, `redonda`, `clasica`, `maquina`, `manuscrita`, `titulo`, `pixel`) y las propias, importadas al proyecto (.ttf, .otf, .woff, .woff2). Se eligen en el inspector o con `yo.letra`; `dibujar.texto` acepta la letra al final. | Las listas no ocupan nada: usan letras que ya trae cada ordenador (una lista de candidatas de más a menos deseada), así que cambian un poco de un ordenador a otro. Para que se vea igual en todas partes está la `pixel` o una letra importada. |
| La letra `pixel` es de Chispa: una letra de puntos de 5×7 dibujada a mano (`src/motor/letraPixel.ts`), con tildes, eñes y signos; cada letra está escrita con `#` y `.` para leerla y corregirla a simple vista. Si un texto lleva un signo que no tiene, ese texto se escribe con una letra del ordenador muy pequeña, sin grises, y se agranda. | No hay que incluir (ni licenciar) ningún archivo de letra, se ve igual en todos los ordenadores y los juegos retro la piden siempre. |
| Las letras importadas se guardan en `proyecto.letras` como data URL, se comprueban por dentro (la firma del archivo, no su nombre), máximo 20 por proyecto y 4 MB cada una, y se cargan desde sus bytes (`FontFace` con un `ArrayBuffer`). | Igual que imágenes y sonidos: nada de direcciones de internet. Cargando desde los bytes, el juego exportado puede seguir prohibiendo pedir letras a internet (`font-src 'none'`). |
| `dibujar.elipse(x, y, ancho, alto, color, relleno)` y `dibujar.poligono(puntos, color, relleno, grosor)` (y sus versiones `enPantalla`). El polígono recibe una lista de vectores y se cierra solo. | Lo mismo que el resto de `dibujar`: centro y medidas enteras, como los objetos. La lista de vectores es la misma forma que usa `yo.ponerCamino`. |
| Juntas físicas en un módulo, `junta`: `junta.cuerda`, `junta.muelle`, `junta.bisagra`, `junta.quitar` y `junta.visibles`. El otro extremo es un objeto o un punto (un vector). | Tres juntas que se entienden sin saber física y cubren péndulos, ganchos, cadenas, gomas, puertas y balancines. |
| Cómo se resuelven (`src/objetos/Juntas.ts`): después de la física de cada fotograma, cuerdas y bisagras colocan los objetos donde tienen que estar (4 pasadas) y quitan la velocidad que los separaba; los muelles cambian la velocidad, como una fuerza con un poco de freno. Cada objeto se mueve según su masa; uno estático o sin Física no se mueve. | Colocar en vez de empujar no explota nunca (aunque la cuerda sea muy corta o el objeto muy rápido), que es lo que importa con principiantes. Con 4 pasadas una cadena de cuerdas queda bien. |
| La bisagra no es un motor de giro completo: mantiene la distancia al eje y hace que el objeto gire con el ángulo que recorre. | Chispa no tiene velocidad de giro en su física. Con esto salen puertas, péndulos rígidos, aspas y balancines, que es para lo que se pide una bisagra. |
| Una junta entre dos cosas que no se mueven (sin Física) da un error que lo explica; repetir la misma junta la cambia en vez de añadir otra; se quitan solas al destruir un objeto o cambiar de escena; máximo 500. | Lo normal es ponerla en `cuando empieza`, pero si alguien la pone en `cuando cada fotograma` no pasa nada malo. |
| Pantalla dividida: `pantalla.dividir(2)` (hasta 4) y `escena.camaraDe(2)` para la cámara de cada trozo, que tiene lo mismo que `escena.camara`. Con 2: `"columnas"` (lado a lado) o `"filas"`; con 3, dos arriba y una abajo; con 4, una en cada esquina. | «Columnas» y «filas» se entienden mejor que «vertical» y «horizontal» (¿la raya o los trozos?). La cámara 1 es la de siempre: un juego de un jugador no cambia nada. |
| El mundo se dibuja una vez por cámara, recortado a su trozo (con sus luces, efectos y juntas); la interfaz (lo fijo), el fundido, los filtros y los diálogos, una sola vez para toda la pantalla. El ratón apunta al mundo del trozo que tiene debajo. Al cambiar de escena la pantalla vuelve a estar entera. | El marcador o el menú de pausa son de todos. Que vuelva a estar entera evita que un menú salga partido por haber venido de un nivel de dos jugadores. |

## Día 3 — Sonido

| Decisión | Por qué |
|---|---|
| Generador de efectos de sonido propio (`src/sonido/generador.ts`): la idea de «sfxr» (oscilador + envolvente + deslizar, vibrato, salto, repetir, filtros y eco) escrita de cero, con los datos en segundos, hercios y semitonos. | En las unidades de sfxr (de 0 a 1, sin significado) no se entiende qué hace cada deslizador. Así «deslizar 3» son 3 octavas por segundo y «sostenido 0.2» son 0,2 segundos. |
| Cada botón (Salto, Moneda, Explosión, Disparo, Golpe, Power-up, Menú, Aleatorio) da un sonido distinto cada vez, y «Variar un poco» cambia ligeramente el que hay. | Es la forma de trabajar que funciona con principiantes: pulsar hasta que guste, y luego retocar. |
| Con los mismos números sale siempre el mismo sonido (el ruido lleva su semilla). Se calcula al cuádruple de muestras y se promedia. | Lo que se oye en el editor es lo que suena en el juego. El promedio quita el chirrido (aliasing) de las ondas cuadradas agudas. |
| En el proyecto se guardan los NÚMEROS del sonido (`sonidosHechos`), no un archivo: el sonido se calcula al cargar el juego. | Ocupa unos 400 bytes en vez de decenas de KB, y se puede volver a abrir para cambiarlo. `aWAV` existe para sacarlo como archivo si hace falta. |
| Editor de música (`src/sonido/musica.ts` y `EditorMusica.ts`): rejilla de notas por pasos (4 pasos = un pulso), hasta 8 pistas, 8 instrumentos generados (piano, chip, sintetizador, flauta, órgano, campana, bajo y batería de 5 tambores), tempo y bucle. | Es lo mínimo con lo que se hace una melodía con acompañamiento y ritmo, y cabe en una ventana. |
| La rejilla enseña solo las notas de una ESCALA (por defecto, la pentatónica); se puede cambiar a mayor, menor o todas. Las notas que una escala esconde no se pierden: se avisa. | Con la pentatónica es muy difícil que algo suene mal: un principiante hace algo que suena bien a la primera. |
| En el proyecto van las notas (`canciones`); cada pista se convierte en sonido al cargar, a 32000 muestras por segundo. En bucle, lo que le sobra a la última nota se suma al principio. | Unas pocas KB por canción. 32000 suena bien y ocupa un 27 % menos de memoria que 44100. Sin «costura» el bucle no hace clic. |
| Cada pista es una CAPA que suena con su propio volumen: `musica.capa(n, volumen, segundos)` y `musica.intensidad` (0 = solo la primera capa, 1 = todas; se recuerda para la música siguiente). | Es la música adaptativa más sencilla de explicar: «cuando hay enemigos entra la batería». Con un archivo importado solo hay una capa, y el error lo explica. |
| `musica.cruzar("otra", 2)` cruza dos músicas; `musica.tono` cambia su velocidad (y tono). | Pasar de exploración a combate sin corte; acelerar la música cuando queda poco tiempo. |
| Sonido con sitio: `sonido.reproducirEn(nombre, sitio, alcance)` y `sonido.bucleEn(...)`. El volumen baja con la distancia al oyente (al cuadrado) hasta cero en el alcance; el lado (panorama) según lo a la izquierda o derecha que esté respecto a lo que se ve. El oyente es el centro de la cámara, o `sonido.oyente = objeto`. | Dos datos que se entienden (dónde y hasta dónde se oye). Con la pantalla dividida el oyente es la cámara 1, salvo que se elija un objeto. |
| Un bucle con sitio va con su objeto y se para solo si el objeto se destruye; pedir el mismo bucle otra vez no lo amontona. | Lo normal es ponerlo en `cuando empieza`, pero en `cuando cada fotograma` no pasa nada malo. |
| Cambios en vivo: `sonido.ponerVolumen`, `sonido.ponerTono` y `sonido.ponerPan` cambian lo que YA suena (poco a poco si se dan segundos) y devuelven cuántos sonidos han cambiado. Si no suena, no es un error. | Un motor que acelera o una alarma que se aleja. Que no sea un error evita tener que comprobar antes si suena. |
| Por dentro, cada sonido que suena es una «voz» con su ganancia y, solo si hace falta, su panorama. | El panorama cuesta: casi ningún sonido lo usa. |
| Los tres bloques del día 3 van en UN solo commit (con las etiquetas `dia3-bloque-1`, `dia3-bloque-2` y `dia3-bloque-3` en él). | El generador, la música y los comandos comparten el motor de sonido, el formato del proyecto y el panel: partirlos habría dejado commits intermedios que no compilan. |

## Día 4 — Interfaz y jugadores

| Decisión | Por qué |
|---|---|
| Los controles de interfaz son UN componente, `Control` (`src/objetos/componentes/Control.ts`), con 11 tipos: botón, barra, campo de texto, deslizador, casilla, lista, menú, ventana, inventario, minimapa e icono con contador. Va siempre con un Dibujo, que le da tamaño, color, letra, capa y si está pegado a la pantalla. | Un control es un objeto como los demás: se coloca, se le cambia el tamaño, lleva script y se guarda igual. No hace falta otro sistema de interfaz aparte. |
| Todos comparten `yo.valor` (lo que valen: un número, verdadero/falso, un texto, la opción elegida...) y avisan con un evento nuevo del lenguaje: `cuando cambia:`. Solo avisan de lo que hace QUIEN JUEGA; cambiar el valor desde el código no avisa. | Una sola idea para todos. Si avisara también al cambiarlo desde el código, sería fácil hacer un bucle sin fin (el aviso cambia el valor, que avisa...). |
| Lo de los controles (`valor`, `minimo`, `maximo`, `opciones`, `elegido`, `activado`, `titulo`, `abrir`, `cerrar`, `enfocar`, `meter`, `sacar`, `cuantos`, `vaciar`) solo existe en los objetos que son un control. En los demás, esos nombres siguen libres. | Nombres tan normales como `valor` o `titulo` ya se usan como propiedades propias en juegos hechos con Chispa 1.0: no se pueden romper. |
| `yo.elegido` cuenta desde 1 (0 = ninguna), como las listas de Chispa. | En Chispa la primera posición es siempre la 1. |
| Barras, iconos y casillas pueden leer SOLOS un dato (`juego.vida`) puesto en el inspector, sin código; se revisa antes de empezar, como los textos con huecos. El texto de una barra usa los huecos de siempre: `{yo.valor} / {yo.maximo}`. | Una barra de vida sin escribir una línea. Y no se inventa otra forma de poner datos en un texto. |
| El campo de texto: mientras se escribe, las teclas son letras y no órdenes (`cuando se pulsa "a"` no salta). Se suelta con Intro, Escape o un clic fuera. Solo se escribe en uno a la vez. | Si no, escribir tu nombre movería al personaje. |
| El menú se maneja con el ratón o con flechas + Intro/espacio (y el mando, que ya hace de teclado), avisa cada vez que se pulsa una opción y mide de alto lo que ocupan sus opciones. | Un menú tiene que funcionar sin ratón. La lista, en cambio, solo avisa cuando cambia la elegida. |
| La ventana no «contiene» objetos: lleva dentro a sus hijos (lo pegado con `yo.pegarA`), que se mueven, se abren y se cierran con ella (`yo.abrir()`, `yo.cerrar()`). | Se aprovecha el sistema de padres e hijos que ya existía. |
| El inventario guarda cosas por su nombre y las amontona; si hay una imagen con ese nombre, la enseña, y si no, un círculo de un color que sale del nombre con su inicial. | Funciona antes de tener dibujos (lo normal al empezar un juego) y mejora solo al añadirlos. |
| El minimapa enseña las casillas sólidas (con su color), los objetos como puntos y el marco de lo que ve la cámara; el mundo entero, o el alrededor de un objeto. Como mucho 6000 casillas y 400 puntos. | Lo que se espera de un minimapa, sin configurarlo. Los límites evitan que un mapa enorme frene el juego. |
| El botón de «Añadir > Botón» pasa a ser un control (se ilumina con el ratón encima y se hunde al pulsarlo). Los botones de proyectos anteriores (un rectángulo con texto) siguen funcionando igual. | Mejora lo nuevo sin tocar lo ya hecho. |
| «Pantallas listas» (el botón junto a las escenas): menú principal, opciones, créditos, tabla de puntuaciones, fin del juego y pausa. Son escenas NORMALES (la pausa, dos objetos en la escena del juego) hechas con los controles y con scripts cortos y comentados. Se añaden todas de una vez, con un solo deshacer. | No es un sistema aparte que no se puede tocar: se abren, se entienden y se cambian como cualquier otra escena. También sirven de ejemplo de cómo usar los controles. |
| Las pantallas se conectan solas: el menú ofrece solo las pantallas que hay, «Volver» lleva al menú (o al juego si no hay menú), y si un nombre ya está cogido se usa otro (Menu2) y todo apunta a él. | El proyecto tiene que poder ejecutarse nada más añadirlas: Chispa comprueba que las escenas que se nombran existan. |
| Opciones guarda el volumen con `guardar()` y el menú lo pone al empezar. Los controles se enseñan en un texto que se cambia en el inspector. | Así se recuerda entre partidas con lo que ya había. Cambiar las teclas de verdad llega con los jugadores (bloque 3). |
| La tabla de puntuaciones es un módulo nuevo, `puntuaciones` (guardar, lista, entra, borrar): las 10 mejores, con nombres de 16 letras como mucho, guardadas con los datos del juego. Lo guardado se lee con desconfianza (si está roto o cambiado a mano, se ignora lo que no valga). | Hacerla en Chispa con listas y tablas son 20 líneas que un principiante no sabe escribir; con el módulo, la pantalla entera son 10. |
| Las pantallas de Fin y de puntuaciones usan `juego.puntos`; si el juego no tiene ese dato, se le añade (empieza en 0). | Es el nombre que ya usan los ejemplos y la biblioteca. |
| En el menú, el ratón solo cambia la opción marcada cuando SE MUEVE; si está quieto encima, mandan las flechas. | Si no, con el ratón parado sobre el menú no se podría usar el teclado. |
| Varios jugadores (de 2 a 4) en el mismo ordenador: cada uno tiene SIEMPRE los mismos seis controles (`arriba`, `abajo`, `izquierda`, `derecha`, `a`, `b`), en su trozo del teclado y, si hay, en su mando. Se leen con `controles(2).sePulso("a")`, `controles(2).x`... y se mueve un objeto con `yo.moverConJugador(2, 300)`. | El script de un jugador vale para los cuatro cambiando un número, y no hay que saber si juega con teclado o con mando. |
| Teclado partido: J1 = W A S D + espacio y F; J2 = flechas + Intro y Mayúsculas; J3 = I J K L + O y U; J4 = 8 4 5 6 + 0 y 9. Mientras solo se use al jugador 1, también lleva las flechas. Las teclas se cambian con `controles(1).ponerTecla("a", "m")`. | Son los repartos de siempre en los juegos para dos en un teclado, y no se pisan. Un juego de un jugador hecho con `controles(1)` se juega igual que con `moverConFlechas`. |
| La función se llama `controles(n)` y no `jugador(n)`. | `jugador` es el nombre de variable más usado en los juegos hechos con Chispa (`variable jugador = buscar("Jugador")`): una función con ese nombre quedaría tapada y daría errores raros. |
| Hasta 4 mandos: el primero es del jugador 1, el segundo del 2... El módulo `mando` sigue siendo el primero. Con varios jugadores, el primer mando deja de «hacer de teclado». | Si siguiera pulsando las flechas, el mando del jugador 1 movería al 2. Con un jugador, todo sigue como en la versión 1.0. |
| Sin código: el Comportamiento «Lo maneja un jugador» (jugador, rapidez y salto) y, en la cámara de la escena, «jugadores»: pantalla dividida o compartida, con el objeto de cada uno. | Un juego para dos se puede montar entero desde el inspector, que es por donde empieza un principiante. |
| Pantalla compartida: `escena.camara.encuadrar([...], margen)`. La cámara se pone en medio y se aleja lo justo para que quepan todos; al juntarse vuelve a acercarse, pero nunca más que el zoom que tenía. | Es la cámara de los juegos de lucha y de cooperar. Que no se acerque de más evita el «zoom en la cara» cuando los dos están pegados. |

## Día 5 — Plantillas y recursos

| Decisión | Por qué |
|---|---|
| Los recursos se hacen ANTES que las plantillas (el bloque 2 antes que el 1). | Las plantillas usan esos dibujos y sonidos: así no hay que hacerlas dos veces. |
| Los dibujos (34: personajes, enemigos, objetos y casillas de mapa, de 16×16) están ESCRITOS en el código, letra a letra con una paleta de 24 colores (`src/recursos/dibujos.ts`), y se convierten en PNG al pedirlos con un codificador propio (`src/recursos/png.ts`, sin compresión). | No se añade ningún archivo binario ni ninguna dependencia, se ve en el código qué es cada dibujo, y es seguro que son originales. 34 dibujos ocupan unos 12 KB de código. |
| Los personajes simétricos se escriben solo por la mitad (8 letras por fila) y se reflejan. Las casillas se pintan con una receta (color base + motas + detalles) con semilla fija. | Menos que escribir y que revisar; las casillas salen siempre iguales y encajan unas con otras. |
| Los sonidos (11) son números del generador de efectos y las canciones (3), notas del editor de música (`src/recursos/sonidos.ts`). Al añadirlos al proyecto son como los hechos por uno mismo: se abren y se retocan. | Es lo que pedía el plan (hechos con el generador del día 3), y de paso enseñan cómo se hace cada sonido. |
| Ventana «Recursos listos» (el botón del libro en Imágenes, Sonidos y Música): un clic añade el recurso; los personajes, enemigos y objetos, además, se ponen en la escena. Añadir dos veces el mismo no lo repite; si ya había OTRA imagen con ese nombre, no se pisa (se añade con otro nombre). | Lo más corto para un principiante: ver, pulsar y ya está en el juego. |
| Los recursos son de dominio público (CC0), como los juegos de ejemplo: `src/recursos/LICENCIA.md`. **Rodrigo: es una decisión de licencia tomada por ti; cámbiala si prefieres otra antes de publicar.** | Quien hace un juego con Chispa tiene que poder usarlos sin preguntarse nada. |
| Siete plantillas de proyecto (`src/plantillas`): plataformas, vista desde arriba, naves, puzle, carreras, cartas y diálogos. Cada una es un proyecto normal, hecho solo con los dibujos y sonidos de Chispa, con scripts de menos de 75 líneas (150 en total como mucho) que empiezan diciendo qué son. Se eligen en «Proyecto nuevo», que ahora es una rejilla de fichas (en blanco, las siete y el ejemplo mínimo). | Un principiante aprende más cambiando un juego que funciona que mirando una escena vacía. Pequeñas, para que se puedan leer enteras. |
| Los niveles de las plantillas se escriben como texto (una letra por casilla: `'##..o..'`) y se convierten en mapa y objetos (`src/plantillas/ayudas.ts`). | Se ve el nivel en el código y es fácil cambiarlo o revisarlo. |
| Cada plantilla se JUEGA en las pruebas: un jugador automático termina el nivel de plataformas, un buscador comprueba que el puzle tiene solución (y la juega), un piloto da las tres vueltas al circuito, se levantan las seis parejas y se sigue la historia entera con sus decisiones. | «Funciona» tiene que querer decir que se puede ganar, no solo que arranca. |
| Cada plantilla usa algo de lo nuevo de la 1.1: inventario e icono con contador, luces y oscuridad (aventura), música y sonidos hechos (todas), `sonido.ponerTono` (el motor del coche), plantillas de objetos y `guardar` (naves, carreras). | Sirven también de ejemplo de las novedades. |
| Se añade un dibujo más, `cesped` (hierba vista desde arriba). | La casilla `hierba` es de perfil (para plataformas): como suelo de un juego visto desde arriba quedaba mal. |
| Arreglo que salió al probar las plantillas: en la vista de la escena del editor, si un dibujo fallaba (su imagen aún no había cargado) el lienzo se quedaba desplazado y ya no se veía NADA hasta recargar. Ahora cada objeto se dibuja con `try/finally`. | Pasaba al abrir cualquier proyecto con imágenes en un ordenador lento; con las plantillas pasaba siempre. |
| Exportar: el juego tiene ICONO (`proyecto.icono`: una de sus imágenes; inspector > Proyecto) y pantalla de carga con el icono, el nombre y «Hecho con Chispa» (`proyecto.pantallaDeCarga`; se puede quitar). La pantalla va en la página (HTML y CSS), no la pinta el motor. | Se ve desde el primer instante, antes de que arranque el código. Se puede quitar porque el juego es de quien lo hace: la licencia no obliga a enseñarla. |
| El juego NO empieza detrás de la pantalla de carga: se ve 1,2 segundos y entonces arranca. | Si arrancara debajo, te matarían antes de ver nada. |
| Botón «itch.io» en la barra: UN clic descarga el zip listo y enseña los pasos (antes: Exportar > itch.io). La portada para la página de itch (630×500, con el fondo, el icono y el nombre) se dibuja sola y se descarga aparte con un botón. | Es el sitio donde casi todos publican su primer juego. La portada no va dentro del zip (habría que descomprimirlo) ni se descarga sola (los navegadores bloquean dos descargas seguidas). |
| Los bloques 1 y 3 del día 5 van en UN commit (con las etiquetas `dia5-bloque-1` y `dia5-bloque-3`). | La consola de trabajo estuvo un rato sin responder y los dos bloques se escribieron a la vez sobre los mismos archivos. |

## Día 6 — Prueba de principiante, rendimiento, documentación y seguridad

| Decisión | Por qué |
|---|---|
| Los problemas de la prueba de principiante están en `PROBLEMAS_PRINCIPIANTE.md` («Cuarta prueba»), con un test por cada uno (`pruebas/principiante4.test.ts`). Las decisiones de diseño que salieron de ahí: categoría «Interfaz» en los bloques; al renombrar un objeto se cambia su nombre en el código (solo donde se habla de objetos); `juego.dato += 1` sin crear el dato sigue siendo un error. | Ver el documento. |
| ESTAMPAS (`src/motor/Estampas.ts`): lo que tiene sombra, resplandor, contorno, degradado o borde se pinta UNA vez en un lienzo aparte y, mientras no cambie, en cada fotograma solo se copia. Dos objetos iguales comparten estampa. La sombra es otra estampa, para que siga cayendo hacia el mismo lado. | Lo borroso (sombras y resplandores) es lo más caro de pintar, y casi nunca cambia de un fotograma a otro. Con 500 objetos con estilo, el dibujo baja a la tercera parte. |
| Las estampas se hacen justo al tamaño al que se ven y se copian en píxeles enteros del lienzo (como mucho medio píxel de diferencia). Solo se usan con el objeto SIN girar; lo que gira se pinta como antes. | Copiar píxeles tal cual es rapidísimo; estirar o girar una imagen sin tarjeta gráfica es MÁS lento que pintar la sombra de nuevo (medido: 70 µs por objeto girado frente a 17). |
| Si el aspecto de un objeto cambia en más de 3 fotogramas seguidos (un color o un tamaño animados), ese objeto deja las estampas durante 90 fotogramas. Como mucho 400 estampas y 768 píxeles de lado. | Hacer una estampa nueva en cada fotograma sería más lento que no usarlas, y no deben comerse la memoria. |
| Las partículas que en el lienzo miden menos de 3,5 píxeles se pintan como cuadraditos (sin trazar un círculo), y los colores intermedios se escriben una sola vez. | A ese tamaño no se distingue un círculo de un cuadrado, y cuesta la cuarta parte. |
| El mapa de luz mide la mitad del LIENZO de verdad (no de la pantalla del juego): en la vista del editor es mucho más pequeño. Las caras de lo que tapa una luz se pintan de una vez, y el tinte de las luces de color se suma directamente a la pantalla. | Menos píxeles que rellenar y un lienzo entero menos que copiar por fotograma. Se ve igual. |
| **La medida de «60 fotogramas con 500 objetos con efectos, luces y partículas»:** la prueba (`pruebas-navegador/editor.mjs`, «rendimiento: 500 objetos con efectos») monta 500 objetos, todos con algún efecto de estilo y moviéndose con su script, 50 con partículas (unas 1300 a la vez, más explosiones), 13 luces (4 con sombras) y oscuridad. En el navegador de pruebas, que NO tiene tarjeta gráfica y va en una máquina virtual lenta, un fotograma entero tarda 17-19 ms (unos 50 por segundo); antes de estos cambios, 29-36 ms (unos 30). **No he podido medirlo en un ordenador de verdad**: con tarjeta gráfica debería ir más rápido, pero es una suposición. La prueba exige menos de 25 ms aquí y una mejora de al menos el 20 %. | Decir «va a 60» sin haberlo medido en un ordenador normal sería inventárselo. |
| Pantallas de 1366×768 y 1280×720: por debajo de 1400 de ancho, «itch.io», Pausar y Parar se quedan con su dibujo; la columna de categorías de los bloques se desplaza y se aprieta (antes las dos últimas se salían por abajo); en los editores de sonido y de partículas cada columna se desplaza por su cuenta (antes los controles pisaban los botones). Una prueba recorre el editor y sus ventanas en las dos medidas. | Son las pantallas de casi todos los portátiles de clase. |
| Auditoría de seguridad de lo nuevo (`AUDITORIA_SEGURIDAD.md`, «Chispa 1.1», puntos 14 a 19; 12 tests nuevos en `pruebas/seguridad.test.ts`). Topes nuevos: 64 sonidos a la vez; 1200 segundos de música y 600 de sonidos hechos preparados al empezar; 16 millones de píxeles de estampas; el aspecto en marcha con los mismos topes que en el archivo. | Un juego que te pasa otra persona no debe poder colgar el navegador ni llenar la memoria. |
| Cuando un proyecto tiene más música o sonidos hechos de los que caben, se ABRE igual y lo que sobra se queda en silencio (con un aviso en la consola). No se rechaza el archivo. | Rechazarlo dejaría a alguien sin poder abrir su propio juego por haber hecho muchas canciones. |
| Los números de aspecto fuera de tope desde un script se recortan sin dar error (`yo.borde = 5000` deja 1000). | Un valor exagerado suele ser un descuido en una cuenta, no merece parar el juego. |
| Las estampas recién hechas (menos de 2 segundos) no se tiran para hacer sitio a otras: lo que no cabe se pinta directamente durante 90 fotogramas. | Si no, una escena con más aspectos distintos de los que caben haría y tiraría estampas en cada fotograma, que es mucho más lento que no usarlas. |
| Arreglo que salió al repasar las pruebas del navegador: al abrir otro proyecto, la caja del script que estaba abierto se quedaba en la página, debajo de la nueva (con sus bloques). Ahora se quita. | Era basura que se acumulaba con cada proyecto abierto, y con los bloques se llegaba a ver doble. |

## Chispa 1.2 — Reglas

| Decisión | Por qué |
|---|---|
| Regla permanente de dispositivos (`DISPOSITIVOS.md`): móviles, tabletas, Chromebooks, pantallas táctiles, mandos y escritorio. Vale para la 1.2 y para todo lo que venga después. | Pedido por Rodrigo el 3 de octubre de 2026. |
| **1.2, bloque 1.** Tres disposiciones del editor según el aparato (`dispositivo.ts`): móvil (menos de 700 px de ancho o de 500 de alto), tablet (hasta 1400 px si se maneja con el dedo, hasta 900 con ratón) y escritorio. Con ratón, un portátil de 1366 o 1280 sigue siendo escritorio, como en la 1.1. | Un iPad grande tumbado mide 1366 de ancho: con el dedo los tres paneles a la vez no caben bien; con ratón, sí. |
| En móvil y tablet los paneles son CAJONES que se abren con una barra de abajo (Escena, Código, Objetos, Propiedades, Juego, Consola). Al ejecutar se pasa solo a «Juego»; si hay un error, a «Consola». En la tablet, con «Propiedades» abierto se sigue viendo y tocando la escena. | Es como funcionan las apps que la gente ya usa en el móvil. Lo que se está editando (escena o código) siempre tiene toda la pantalla. |
| «Se maneja con el dedo» es lo que diga el navegador (`pointer: coarse`); se puede forzar en Ajustes > Botones grandes (Automático, Siempre, Nunca). | Un PC con pantalla táctil dice que su puntero es el ratón; quien lo use con el dedo puede pedir los botones grandes. |
| Con el dedo: UN dedo hace lo del ratón (con más holgura para acertar), y arrastrar el FONDO mueve la vista en vez de hacer un rectángulo de selección. DOS dedos mueven y acercan. Dedo QUIETO (0,55 s) abre el menú. Al tocar un objeto no se mueve hasta arrastrar 10 px. | Mover la vista es lo que más se hace en una pantalla pequeña; seleccionar varios con el dedo se hace desde el menú («Seleccionar todo»). El dedo siempre resbala un poco al tocar. |
| La ayuda de los botones (`title`) sale dejando el dedo medio segundo, y entonces el botón NO se pulsa. Lo que no hace nada al pulsarlo enseña la ayuda con un toque. | No hay otra manera de «pasar por encima» con un dedo. |
| Todo lo que con ratón era doble clic, arrastrar y soltar o clic derecho tiene otro camino: un menú propio (`conMenu`) que sale dejando el dedo, con el botón derecho o con la tecla del menú. | Regla de `DISPOSITIVOS.md`: nada depende del ratón. Arrastrar y soltar del navegador no funciona con el dedo en Safari. |
| Teclado de pantalla en los juegos: el motor tiene un campo de texto de la página, invisible, que se enfoca EN EL MISMO TOQUE que cae sobre un campo del juego. Lo que cambia en él se convierte en letras y borrados comparando el texto de antes y el de después. | Los navegadores solo sacan el teclado así. Comparar textos funciona también con el texto predictivo, que cambia palabras enteras de golpe. |
| Con el teclado fuera, el editor mide lo que se ve (`visualViewport`), se quita la barra de abajo y se deja a la vista la línea del cursor. | En Safari la página no se encoge sola al salir el teclado. |
| **1.2, bloque 2.** La barra de atajos está DENTRO del editor, debajo del código (no flotando sobre el teclado). Como el editor se encoge a lo que se ve cuando sale el teclado, la barra queda justo encima de él. Sus botones no cogen el foco. | Una barra flotante hay que recolocarla a mano en cada navegador (Safari mueve la página al salir el teclado); así se coloca sola. Si un botón cogiera el foco, el teclado se escondería a cada toque. |
| «sino» en una línea vacía con sangría se escribe un nivel más fuera. «si», «mientras» y «repetir» dejan el cursor donde va lo que falta. | Es lo que se haría a mano, sin tener que borrar espacios en un teclado de móvil. |
| Bloques: además de arrastrar (ratón), se pueden COGER con un toque y PONER tocando un sitio («＋ aquí»). Vale para el dedo, para el teclado y para el ratón. | Arrastrar y soltar del navegador no funciona con el dedo en Safari, y arrastrar con precisión en una pantalla pequeña es difícil. Dos toques no fallan. |
| «Mis proyectos»: cada proyecto en el que se cambia algo se guarda solo en el navegador con su identificador (hasta 30; al pasar, se quita el que hace más que no se toca). El ejemplo sin tocar no se guarda. | En un móvil, descargar un archivo y volver a abrirlo es incómodo y la gente no lo hace. El límite evita llenar el almacenamiento del navegador. |
| Las imágenes de más de 2048 px o de más de 1,5 MB se reducen a 1024 px al importarlas (JPEG si era una foto, PNG si no). Se avisa del tamaño nuevo. | Las fotos de un móvil miden 4000 px y pesan varios megas; para un juego sobran y hacen que el proyecto pese demasiado para guardarse. |
| El proyecto se guarda en cuanto la página deja de verse (`visibilitychange` y `pagehide`), además de cada pocos segundos. | En un móvil la página no se cierra: el sistema la mata en segundo plano sin avisar, y `beforeunload` no llega. |
| El tutorial abre solo el cajón donde está lo que hay que tocar en cada paso, y lo vuelve a abrir si se cierra. La burbuja se puede encoger. | En una pantalla pequeña no cabe a la vez el panel, lo resaltado y la explicación. |
| **1.2, bloque 3.** Los controles de pantalla PULSAN TECLAS: la palanca hace de flechas y cada botón pulsa la tecla que se le diga. Un juego hecho para teclado se pasa al móvil con dos líneas, sin tocar el resto. Quien quiera más, lee `tactil.x`, `tactil.y` o `tactil.pulsado("Fuego")`. | Así los comandos son generales: valen para cualquier juego y no hay dos maneras de mover a un personaje. |
| Los controles solo se ven cuando se juega con el dedo (`tactil.mostrar = "auto"`): salen al tocar la pantalla y se esconden al usar teclado, ratón o mando. En un PC con pantalla táctil van y vienen según lo último que se use. | Pedido: «detectar móvil o PC y mostrar solo los controles que tocan». Preguntar «¿es un móvil?» falla con tabletas con teclado y PCs táctiles; mirar con qué se está jugando no falla. |
| Si el juego no pone controles, Chispa sigue poniendo los automáticos (los de las teclas que usa el código), como en la 1.1. Si pone los suyos, los automáticos no salen. | Los juegos ya hechos siguen funcionando en el móvil sin cambiar nada. |
| Como mucho 12 botones, de 12 letras, y los sitios en tanto por ciento de la pantalla (0 a 100). Donde los deja quien juega (`tactil.colocar()`) se guarda con los datos del juego. | Más botones no caben en un móvil. En tanto por ciento, el mismo juego vale para todas las pantallas. |
| `tactil.vibrar` devuelve falso donde no se puede (iPhone, iPad, ordenadores) en vez de dar error. | Safari no deja vibrar a las webs: un juego no debe pararse por eso. |
| Calidad: tres niveles fijos y "auto". "Alta" pinta como mucho 2 píxeles por punto (antes, los 3 de algunos móviles); "media" 1,5 y 60 % de partículas; "baja" 1, 35 % de partículas, sin sombras de luces ni filtros caros. En "auto" se miden los fotogramas por ventanas: si va lento, baja; si va sobrado un buen rato, prueba a subir, y si al subir vuelve a ir lento, no lo intenta más veces. | Los píxeles son lo que más cuesta en un móvil (una pantalla de 3 tiene 9 veces más que una de 1). Que no suba y baje sin parar se nota más que un nivel menos. |
| `pantalla.maximoFps` salta fotogramas enteros (ni calcula ni pinta); va de 15 a 240, y 0 es sin límite. | Es lo que de verdad ahorra batería y calor. Menos de 15 no es jugable. |
| «Juego horizontal / vertical» (`pantalla.orientacion` o las Propiedades del proyecto) enseña un aviso de «Gira el móvil» y pausa el juego; no se intenta girar la pantalla a la fuerza. Instalado como app, la ficha pide esa orientación y Android la respeta. | Las webs no pueden girar la pantalla en iPhone, y en Android solo a pantalla completa. Un aviso funciona en todos. |
| El juego como app (PWA) es un DESTINO más al publicar («App para móvil»): un zip con cinco archivos. El service worker solo sirve una lista fija de archivos de su carpeta, no acepta mensajes y no guarda nada más. La política de seguridad de la página solo se abre en lo justo: su ficha, su service worker y sus iconos, todos de la propia carpeta. | «Una página» sigue siendo un solo archivo que se puede abrir con doble clic; una app necesita un sitio web con https. Un service worker se queda instalado: cuanto menos sepa hacer, mejor. |
| El icono de la app sale del icono del juego (o del primer dibujo); si no hay, una chispa amarilla. | Sin icono, Android no deja instalar. |
| El EDITOR también es una app instalable que funciona sin internet (misma función del service worker). Una versión nueva del editor no entra hasta que se cierran las pestañas abiertas con la vieja. | En un móvil es como se usa una herramienta; además, Safari no borra a los 7 días lo guardado de las apps instaladas. El editor va en varios archivos que se cargan cuando hacen falta: cambiarlos a media sesión rompería la página abierta. |
| En Ajustes hay un botón «Instalar Chispa» solo donde el navegador deja (Chrome, Edge); en Safari se explica con palabras (Compartir > Añadir a pantalla de inicio). | Safari no permite instalar desde un botón. |
| **1.2, bloque 4.** En pantallas de menos de 400 px de ancho los controles de pantalla se encogen en proporción (hasta el 62 %, que deja los botones en 44 px). Salió al probar el juego exportado en un móvil de 320 px: la palanca pisaba un botón. | La palanca y dos botones a tamaño normal no caben en 320 px. Encoger todo a la vez mantiene las distancias que se han elegido. |
| El teclado invisible de los juegos admite 2000 letras; «Mis proyectos» limpia los nombres al leerlos; lo que quien juega guarda sobre el sitio de los controles va en un objeto sin «padre». Auditoría de la 1.2 en `AUDITORIA_SEGURIDAD.md`. | Defensas baratas contra lo guardado roto o con trampa. |
| Versión 1.2.0: sube el segundo número porque hay cosas nuevas y nada de lo anterior deja de funcionar. | La regla de `src/version.ts`. |

## Chispa 1.3 — Primera persona (haciendo «Arena Cero»)

| Decisión | Por qué |
|---|---|
| **El 3D no es otro tipo de juego: es otra manera de MIRAR un juego visto desde arriba.** `vista3d.ver(yo)` pinta en primera persona la misma escena de siempre (mapa de casillas + objetos). No hay «mapa 3D», ni «objetos 3D», ni otra física. | Todo lo que Chispa ya sabe hacer (choques, caminos, rayos, animaciones, sonido con sitio, plantillas, el editor de mapas) sirve sin tocarlo, y quien aprende solo tiene que aprender un comando. Además el juego se puede ver desde arriba en cualquier momento (`vista3d.quitar()`), que viene muy bien para depurar. |
| El dibujo se hace con un **raycaster por software** (`motor/Raycaster.ts`): un rayo por columna para las paredes, el suelo y el techo por filas, y los sprites del más lejano al más cercano. Escribe los colores en una lista de números y se copia a la pantalla de una vez. No usa la tarjeta gráfica (WebGL). | Es la técnica de los juegos que se quieren imitar, cabe en un archivo que se puede leer entero y funciona igual en todos los aparatos de `DISPOSITIVOS.md`. Medido: 640×360 con texturas, niebla y 100 sprites en menos de 12 ms sin optimizar nada más. Con WebGL habría dos maneras de pintar que mantener. |
| El raycaster **no sabe nada del navegador ni del resto del motor**: recibe una rejilla, texturas en memoria y una lista de sprites. Quien lo une con la escena es `objetos/Vista3D.ts`. | Se prueba entero sin pantalla (46 tests), y la parte delicada (cuentas por píxel) queda aislada. |
| Las casillas sólidas son paredes y **las no sólidas son baldosas del suelo** con la imagen de su tipo. Donde no hay casilla, el suelo de `vista3d.suelo`. | El nivel entero (paredes, suelos especiales, trampas) se pinta en el editor de mapas, sin comandos nuevos. |
| Una **puerta** es un tipo de casilla marcado como tal. En primera persona se pinta como una hoja fina en mitad de la casilla (entre las dos paredes que tenga a los lados) que se desliza. Se puede pasar desde el 70 % de apertura. | Las puertas son del mapa, no de la vista: funcionan igual desde arriba. No hay que esperar a que acabe de abrirse para pasar (se nota torpe). |
| La pantalla 3D tiene **menos píxeles que el juego** (las columnas que diga la calidad) y se estira. Con «píxeles nítidos» en el proyecto se ve con píxeles gordos; sin ella, suavizado. | Es lo que más ahorra: un móvil pinta 320×180 en vez de 960×540 (nueve veces menos). |
| Las imágenes de paredes y suelos se reducen a 128 px de lado como mucho, y las de los sprites a 256. El mapa en primera persona mide como mucho 512×512 casillas, y se pintan como mucho 400 sprites (los más cercanos). | Topes para que un proyecto de otra persona no llene la memoria ni cuelgue el navegador (ver `AUDITORIA_SEGURIDAD.md`). |
| `raton.capturado = verdadero` no da error si el navegador no lo concede: lo vuelve a pedir en el siguiente clic. Al leerlo dice si lo tiene de verdad. | Los navegadores solo dan el ratón dentro de un clic y lo quitan con Escape: el juego tiene que poder preguntar. |
| La categoría de bloques nueva se llama «3D». Las puertas del mapa van ahí, con bloques «(en un mapa) abrir la puerta…» para el script del propio mapa. | Son doce categorías: las de la columna se han apretado un poco más para que quepan en 1280×720. |
| Las etiquetas de este trabajo se llaman `arena-cero-parte-N`, no `arena-parte-N` como se pidió. | `arena-parte-1`, `2` y `3` ya existen en el repositorio: son de Arena de Habilidades (septiembre). Git no deja dos etiquetas con el mismo nombre, y moverlas borraría esa historia. |
