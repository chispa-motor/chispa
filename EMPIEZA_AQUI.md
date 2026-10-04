# Empieza aquí: tu primer juego con Chispa

Esta guía es para ti si abres Chispa por primera vez. En unos 10 minutos
tendrás un personaje que anda, salta y recoge monedas, con un marcador de
puntos en la pantalla.

## 1. Abrir el editor

Abre esta dirección en el navegador (mejor Chrome o Edge):

**https://chispa-motor.github.io/chispa/**

Ya está: no hay que instalar nada. Tus proyectos se guardan solos en ese
navegador, y si vuelves a abrir la dirección, siguen ahí. Para guardar una
copia o llevarte un proyecto a otro ordenador, usa **Guardar** (descarga un
archivo) y luego **Abrir**.

> **¿Quieres tenerlo en tu ordenador, o cambiar el propio Chispa?** Necesitas
> [Node.js](https://nodejs.org) 22 o más nuevo (la versión «LTS»). En una
> terminal, dentro de la carpeta de Chispa, escribe `npm install` (solo la
> primera vez) y `npm run dev`, y se abre en http://localhost:5173.
> **En Windows**, si PowerShell dice que «la ejecución de scripts está
> deshabilitada», escribe `npm.cmd install` y `npm.cmd run dev`.

## 2. Conoce la ventana

```
┌─ Nuevo · Abrir · Guardar · Exportar · itch.io · ▶ Ejecutar ⏸ ⏹ · Ajustes · Ayuda ─┐
│ ESCENA /     │  Escena  |  jugador.chs                    │  JUEGO            │
│ PROYECTO     │                                            │  (aquí se juega)  │
│ (tus objetos │  la escena (colocar objetos)               ├───────────────────┤
│  y scripts)  │  o el código                               │  PROPIEDADES      │
│              ├────────────────────────────────────────────┤  (del objeto      │
│              │  CONSOLA · PROBLEMAS · GUÍA                │   seleccionado)   │
└──────────────┴────────────────────────────────────────────┴───────────────────┘
```

- **Izquierda:** los objetos de la escena y el script de cada uno. En la
  pestaña *Proyecto* están las escenas, imágenes, sonidos y plantillas.
- **Centro:** la escena o el código de un script. En la escena:
  - Arrastra un objeto para moverlo.
  - Arrastra el fondo con el botón derecho (o con Espacio pulsado) para moverte por la escena. Con el botón izquierdo, el fondo dibuja un rectángulo que selecciona varios objetos.
  - La rueda del ratón acerca y aleja.
  - Arriba ves la **x** y la **y** del ratón.
- **Derecha:** el juego funcionando y las propiedades del objeto seleccionado.
- **Abajo:** la consola, los problemas de tu código y la **Guía**. En la
  Guía están las **Recetas** («¿cómo hago…?») y todo el lenguaje, con buscador.

La primera vez se abre un ejemplo. Pulsa **▶ Ejecutar** (o F5) para verlo.

> **¿Prefieres que te guíe?** La primera vez que abres el editor te pregunta
> «¿Hacemos tu primer juego?». Si dices que sí, te va señalando dónde hacer
> clic, paso a paso, dentro del propio editor. Se puede saltar, y volver a
> abrir cuando quieras desde **Ayuda → Tutorial: tu primer juego**. Lo que
> viene a continuación es lo mismo, por escrito (con alguna cosa más).

## 3. Tu primer juego

> **¿Prefieres empezar con un juego ya hecho?** Pulsa **Nuevo** y elige una
> **plantilla**: plataformas, vista desde arriba, naves, puzle, carreras,
> cartas o diálogos. Son juegos pequeños que ya funcionan, con el código
> explicado línea a línea. Pulsa **▶ Ejecutar**, juega y luego cambia cosas:
> los números del principio de cada script, los dibujos, el nivel… Lo que
> sigue es para hacerlo tú desde cero.

1. Pulsa **Nuevo → En blanco**.
2. **El jugador.** Pulsa **Añadir → Cuadrado**. En *Propiedades*, cámbiale el
   nombre a `Jugador` y activa **Física** con su interruptor. Con Física, cae
   y choca.
3. **El suelo.** Pulsa **Añadir → Mapa de casillas**. Ya tienes el pincel en
   la mano. Mantén pulsada **Mayús** y arrastra por la parte de abajo del
   recuadro de puntos (la pantalla del juego): pintarás una fila de suelo
   entera.
4. **Una plataforma.** Pulsa **V** para volver a la flecha. Luego
   **Añadir → Cuadrado**, llámalo `Plataforma` y hazlo alargado. Puedes
   arrastrar su esquina o cambiar *ancho* y *alto*. Un objeto **sin** Física
   no se mueve: sirve de suelo.
5. **Las monedas.** **Añadir → Círculo**, llámalo `Moneda`, ponle color
   `amarillo` y, en *Colisión*, quita **sólido** (así se atraviesa). Pulsa
   **Ctrl+D** para duplicarla un par de veces y coloca las copias por la
   escena. Se llamarán `Moneda2`, `Moneda3`…, pero todas son monedas.
6. **Los puntos.** **Añadir → Texto** (ya sale pegado a la pantalla, arriba a
   la izquierda). Pulsa **Crear script**, borra lo que hay y escribe:

   ```
   cuando cada fotograma:
       yo.texto = "Puntos: " + juego.puntos
   ```

7. **El jugador.** Selecciónalo en la lista de la izquierda, pulsa
   **Crear script**, borra lo que hay y escribe:

   ```
   cuando empieza:
       juego.puntos = 0

   cuando cada fotograma:
       yo.moverConFlechas(300)

   cuando se pulsa "espacio":
       yo.saltar(700)

   cuando toco Moneda:
       destruir(otro)
       juego.puntos += 1

   cuando salgo de la pantalla:
       escena.reiniciar()
   ```

8. Pulsa **▶ Ejecutar**, haz clic en el juego y usa las flechas y el espacio.

> **¿Mejor con bloques?** Arriba de cada script hay dos botones: **Código** y
> **Bloques** (o pulsa **Ctrl+B**). En bloques, arrastras piezas de colores
> desde la paleta de la izquierda: un evento como «cuando cada fotograma» y,
> dentro, acciones como «moverme con las flechas». Los huecos blancos se
> rellenan escribiendo, y si pones algo que no vale se ponen rojos y te dicen
> por qué. Código y bloques son **el mismo script**: puedes cambiar cuando
> quieras y ver cómo se escribe en código lo que has montado.

Qué significa cada trozo:

- `yo` es el objeto de este script.
- `otro` es lo que has tocado.
- `juego.puntos` es un dato que ven todos los scripts; por eso el texto puede
  enseñarlo.
- **La Y crece hacia arriba**: subir es sumar a la Y.

## 4. Cuando algo sale mal

- Si escribes algo mal, se **subraya en rojo** mientras escribes. Pasa el
  ratón por encima: te dice qué pasa y cómo arreglarlo («¿Querías decir…?»).
- Mientras haya errores, el botón **Ejecutar** se pone rojo. En la pestaña
  **Problemas** están todos; haz clic en uno para ir a su línea.
- Si algo falla con el juego en marcha, el error sale en la **Consola** y el
  resto del juego sigue funcionando.
- Si el juego no hace caso al teclado, haz clic en el juego (sale un aviso
  cuando las teclas van a otro sitio).
- ¿No sabes qué escribir? Escribe `yo.` o `teclado.` y espera: salen las
  sugerencias. Pasa el ratón por cualquier palabra para ver su explicación.
- Los nombres de teclas, colores, escenas y plantillas van **entre comillas**:
  `teclado.pulsada("derecha")`, `crear("Bala")`.
- Para ver qué está pasando, escribe `mostrar(algo)` en tu código: el valor
  sale en la consola.
- **Paso a paso.** Haz clic en el número de una línea: sale un punto rojo. Al
  ejecutar, el juego se para ahí y ves cuánto vale cada variable (también las
  de `juego`). **F10** va a la siguiente línea y **F8** sigue jugando.
- **Probar sin tocar el código.** Con el juego en marcha, abajo de la consola
  puedes escribir una orden, como `juego.vidas = 99`, y pulsar **Intro**.
- Si el navegador se cierra de golpe, no pasa nada: al volver, el editor
  recupera tu proyecto y te lo dice.

## 5. Tu siguiente juego

En **Guía → Recetas** tienes el código de lo más común, con un botón para
copiarlo:

- **Dibujos, sonidos y música ya hechos.** En la pestaña *Proyecto*, el botón
  del **libro** (en Imágenes, Sonidos y Música) trae personajes, enemigos,
  objetos, casillas para mapas, efectos de sonido y canciones. Un clic y están
  en tu juego. Son de dominio público: úsalos como quieras.
- **Tus propios sonidos y tu música.** El **+** de *Sonidos* abre un generador
  de efectos: pulsa «Salto», «Moneda», «Explosión»… hasta que salga uno que te
  guste. El **+** de *Música* es una rejilla donde pones notas con el ratón.
- **Marcadores sin código.** **Añadir → Interfaz** tiene barras de vida,
  iconos con contador, inventario, listas, casillas, deslizadores, ventanas,
  campos para escribir y minimapa. En su «dato» escribes de dónde sacan el
  número (`juego.monedas`, `Jugador.vida`) y se actualizan solos.
- **Menú, pausa y puntuaciones.** El botón **Pantallas listas** (junto al
  nombre de la escena) añade un menú principal, opciones, créditos, tabla de
  puntuaciones, fin del juego y pausa, ya conectados entre sí.
- **Para dos, tres o cuatro jugadores.** En cada personaje, activa
  **Comportamiento** y elige «Lo maneja un jugador». Con la escena
  seleccionada, en *Cámara → jugadores* eliges pantalla dividida o compartida.
- **Cuevas y noches.** Con la escena seleccionada, en *Luz y oscuridad* sube la
  oscuridad; en el jugador, activa **Luz**.

- **Disparar.** Crea la bala y pulsa **Plantilla** para convertirla en
  plantilla. Luego, desde la nave: `crear("Bala")`.
- **Enemigos que aparecen solos.** Usa un *Objeto vacío* con
  `cuando cada 1 segundo:`.
- **Explosiones:** `particulas("explosion")`.
- **Pantalla de fin.** Crea otra escena con el **+** que hay junto al nombre de
  la escena, y en ella un **Botón** con `cuando hago clic encima:`.
- **Juego visto desde arriba.** Sin nada seleccionado, pon la **gravedad** de
  la escena a `0`: `yo.moverConFlechas` irá en las cuatro direcciones.
- **Cámara que sigue al jugador.** Sin nada seleccionado, en *Cámara* elige al
  jugador en «seguir a» y marca «no salir del mapa».
- **Puertas a otra escena.** Crea un tipo de casilla `puerta` y escribe
  `cuando toco puerta:`.
- **El mismo jugador en otra escena.** Selecciónalo, **Ctrl+C**, cambia de
  escena y **Pegar**.
- **Enemigos que te persiguen sin código.** En sus *Propiedades*, activa
  **Comportamiento** y elige «Perseguir si está cerca» (o huir, o seguirte
  como una mascota). Si hay paredes en un juego visto desde arriba, las
  rodean. Con código: `yo.irHacia(buscar("Jugador"), 120)`.
- **Hablar con personajes:** `dialogo("Ana", "¿Me ayudas?", ["Si", "No"])`.
  El juego se para mientras se lee y te dice qué se ha elegido.
- **Avisar a otros objetos:** `enviar("abrir_puerta")` en uno y
  `cuando recibo "abrir_puerta":` en los que tengan que enterarse.
- **Vidas, nivel…** Sin nada seleccionado, en **Datos del juego** añades datos
  con su valor de salida (`vidas = 3`), sin escribir código.
- **Sonidos sin archivos:** `sonido.efecto("moneda")`, `sonido.efecto("salto")`…
- **Dibujar en la pantalla desde el código:** `dibujar.enPantalla.rectangulo(…)`.
- **Mando y móvil.** `yo.moverConFlechas` ya funciona con la palanca de un
  mando, y los botones se leen con `mando.pulsado("a")`. Si abren tu juego
  exportado en un móvil, salen botones en la pantalla solos; para poner los
  tuyos (una palanca, un botón de saltar), mira la sección 7.
- **Funciones para todos.** Un script con solo funciones (sin ningún
  `cuando`) que no está puesto en ningún objeto es una *biblioteca*: sus
  funciones se pueden usar desde cualquier script.

## 6. Guardar y compartir

- El editor **guarda solo** en tu navegador. Si cierras la pestaña, al volver
  está todo.
- **Mis proyectos** (arriba): todos los proyectos que has tocado en este
  navegador, cada uno con su nombre. Tócalo para abrirlo.
- **Guardar** (Ctrl+S) descarga tu proyecto como un archivo `.chispa.json`.
  Con **Abrir** lo recuperas, en este o en otro ordenador.
- **Exportar** te deja elegir:
  - **Un archivo**: una página `.html` con tu juego dentro. Se abre con doble
    clic y se la puedes mandar a quien quieras.
  - **itch.io**: descarga un `.zip` listo para subir y te dice, paso a paso,
    qué pulsar en la web de itch.io (y qué tamaño poner).
  - **GitHub Pages**: descarga un `index.html` y te explica cómo tener tu
    juego en una dirección tuya, gratis.
  - **App para el móvil**: descarga un `.zip` con tu juego listo para
    instalarse en la pantalla de inicio de un móvil o una tableta, con su
    icono, y jugar sin internet. Te explica dónde subirlo.

  No hace falta conectar ninguna cuenta al editor: tú subes el archivo.
- **itch.io en un clic.** El botón **itch.io** de la barra de arriba hace lo
  mismo que Exportar → itch.io, directamente: descarga el `.zip` y te enseña
  los pasos. También te da una **portada** para la página del juego.
- **El nombre y el icono de tu juego.** Haz clic en el fondo de la escena y,
  abajo en *Propiedades → Proyecto*, escribe el **nombre** y elige el **icono**
  (una de tus imágenes). Salen en la pestaña del navegador y en la pantalla de
  carga del juego exportado, que dice «Hecho con Chispa» (si no la quieres,
  quita la casilla «pantalla de carga»).

## ¿De quién son mis juegos?

**Tuyos.** Chispa tiene una licencia de código abierto, la **MPL 2.0**
(Mozilla Public License), pero esa licencia es para el **motor**: el editor,
el lenguaje y el código que hace funcionar los juegos. **No es para lo que tú
haces con él.**

Tu juego es tuyo: su proyecto, tus scripts `.chs`, tus dibujos, tus sonidos,
tus escenas y tus ideas. Puedes:

- **regalarlo**, subirlo a itch.io o enseñárselo a tus amigos;
- **venderlo**, si quieres;
- **no enseñar su código** a nadie. La MPL no te obliga a publicar tus
  juegos.

Solo hay dos cosas que tener en cuenta:

1. **Cada juego exportado lleva dentro el motor Chispa**, y dentro de la
   página hay un aviso escondido (no se ve al jugar) que dice que el motor
   es Chispa, con licencia MPL 2.0, y dónde está su código. Lo pone Chispa
   solo al exportar. Déjalo ahí: es lo único que la licencia pide.
2. **Si cambias el propio Chispa** (un archivo de `src/`, por ejemplo, para
   añadir un comando nuevo) y repartes ese Chispa cambiado, tienes que
   compartir **esos archivos cambiados** con la misma licencia. Así las
   mejoras vuelven a todo el mundo. Tus juegos siguen siendo tuyos igual.

¿Y los juegos de ejemplo (la Arena de Habilidades, el ejemplo del
principio), las **plantillas** y los **dibujos, sonidos y canciones** que trae
Chispa? Son de **dominio público**: cópialos, cámbialos y usa lo que quieras
de ellos en tus juegos, sin pedir permiso.

> Esto es una explicación sencilla, no un consejo legal. El texto que vale
> es el de la licencia, en el archivo `LICENSE`.

## 7. Usar Chispa en el móvil o la tableta

Chispa funciona en móviles (Android con Chrome, iPhone con Safari), en
tabletas (con o sin teclado), en Chromebooks y en ordenadores con pantalla
táctil. Es la misma dirección de siempre, y todo se hace con el dedo.

### El editor con el dedo

- **La barra de abajo** cambia de sitio: **Escena**, **Código**, **Objetos**,
  **Propiedades**, **Juego** y **Consola**. Lo que estás editando ocupa toda
  la pantalla y lo demás se abre encima. Con el móvil tumbado, la barra se
  pone a la izquierda.
- **En la escena**: toca un objeto para elegirlo y arrástralo para moverlo.
  Con **dos dedos** mueves y acercas la vista. **Deja el dedo quieto** sobre
  un objeto y sale su menú (abrir su código, duplicar, copiar, borrar…).
- **Dejar el dedo quieto** es el truco para todo: sobre un botón enseña su
  ayuda, y sobre una fila de una lista abre su menú (cambiar el nombre,
  ordenar…). Es lo que con ratón se hace pasando por encima o con el botón
  derecho.
- **Escribir código**: encima del teclado sale una **barra de atajos** con lo
  que más cuesta escribir en un móvil: `cuando`, `si`, `sino`, `mientras`,
  `repetir`, `funcion`, los dos puntos, paréntesis, comillas, la sangría y
  deshacer. Toca un error subrayado para ver qué pasa, y **?** para la ayuda
  de la palabra donde estás.
- **Si prefieres no escribir**: el botón **Bloques** de arriba del script.
  Toca un bloque de la lista y luego el sitio **＋ aquí** donde lo quieres.
  Toca la cabecera de un bloque para moverlo, duplicarlo o borrarlo.
- **El tutorial** («Tu primer juego») también funciona con el dedo: abre él
  solo el panel que toca en cada paso.
- **Fotos y sonidos**: en *Proyecto*, **Importar** abre tu galería (o la
  cámara). Las fotos enormes se hacen más pequeñas solas.
- **Guardar**: se guarda solo, también cuando cambias de app. En el menú de
  arriba, **Compartir o guardar copia** manda el proyecto por donde quieras
  (a tus archivos, a la nube, a otra persona).
- **Botones grandes**: en un ordenador con pantalla táctil, *Ajustes →
  Botones grandes → Siempre*.

### Chispa como una app, sin internet

Chispa se puede **instalar** en la pantalla de inicio y usar **sin
internet**: se abre como cualquier app, sin la barra del navegador.

- **Android y Chromebook** (Chrome): *Ajustes → Chispa como app → Instalar
  Chispa*, o el menú de los tres puntos → **Instalar app**.
- **iPhone y iPad** (Safari): botón de **Compartir** (el cuadrado con la
  flecha) → **Añadir a pantalla de inicio**.
- **Ordenador** (Chrome o Edge): el icono de instalar de la barra de
  direcciones.

> **En iPhone y iPad, instálala.** Safari borra lo guardado de las webs que
> no visitas en 7 días; a las que están en la pantalla de inicio no les
> pasa. Aun así, guarda una copia de tus proyectos de vez en cuando.

### Que tu juego se juegue en el móvil

Dos líneas y tu juego de teclado se juega con el dedo:

```
cuando empieza:
    tactil.joystick()                  # una palanca: hace de flechas
    tactil.boton("Saltar", "espacio")  # un botón que pulsa la tecla espacio
```

El resto del código no cambia (`yo.moverConFlechas`, `cuando se pulsa
"espacio"`…). La palanca y los botones **solo se ven cuando se juega con el
dedo**: en un ordenador con teclado no salen, y con un mando se esconden.

Más cosas, todas en la pestaña **Guía** (busca «tactil»):

- `tactil.gesto`: deslizar, tocar dos veces, dejar el dedo…
- `tactil.mirar()`: arrastrar el dedo para apuntar o mover la cámara.
- `tactil.colocar()`: que cada uno ponga los botones donde le vengan bien.
- `tactil.vibrar(0.2)`: vibra el móvil (en iPhone no: Safari no deja).
- **Tumbado o de pie**, **calidad** y **fotogramas**: clic en el fondo de la
  escena → *Propiedades → Proyecto*. Con «solo tumbado», quien abra el juego
  con el móvil de pie ve un aviso de «Gira el móvil». La calidad
  «automática» baja sola en los móviles lentos, y «30 por segundo» gasta
  menos batería.

Para probarlo en tu móvil: **Exportar → App para el móvil**.

### Cosas que conviene saber

- **El sonido** empieza con el primer toque (los móviles no dejan antes). En
  un iPhone con el interruptor de silencio puesto, no suena.
- **Pantalla completa**: en Android y iPad, el botón ⛶ del juego. En iPhone
  las webs no pueden; ahí la manera es instalar el juego en la pantalla de
  inicio.
- **Teclado y ratón en una tableta**: funcionan, y el editor vuelve a sus
  botones normales.

## 8. A tu gusto

- **Ajustes** (arriba, o **Ctrl+,**): tema claro u oscuro y tamaño de la
  letra del código y del editor. Se quedan guardados en tu navegador.
- **F1** enseña todos los atajos de teclado.
- En **Ayuda**, abajo, está la versión de Chispa, **Acerca de Chispa** (quién
  lo hace, la licencia y los créditos) y **Apoya Chispa**, por si quieres
  ayudar a que siga creciendo.

¿Quieres aprender de verdad, paso a paso? Sigue el curso
**[APRENDE_CHISPA.md](APRENDE_CHISPA.md)**: 5 niveles, cada comando con un
ejemplo y el error que más se comete, ejercicios y un mini proyecto por nivel.
Lo nuevo de esta versión (la primera persona) está en
**[NOVEDADES_1.3.md](NOVEDADES_1.3.md)**, y lo de las anteriores, en
[NOVEDADES_1.2.md](NOVEDADES_1.2.md) y [NOVEDADES_1.1.md](NOVEDADES_1.1.md).
Para buscar algo rápido, la **[chuleta](CHULETA_CHISPA.md)** (una línea por
comando; también hay botones para los dos arriba de la pestaña **Guía**).

Todo el lenguaje, con un ejemplo de cada cosa, está en **MANUAL_CHISPA.md**
(y en la pestaña **Guía** del editor). Un juego grande hecho solo con Chispa,
para ver hasta dónde se puede llegar, está en
`proyectos/arena-de-habilidades/` (ábrelo con **Abrir**).
