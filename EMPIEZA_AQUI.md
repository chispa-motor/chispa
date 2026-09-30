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
┌─── Nuevo · Abrir · Guardar · Exportar ·  ▶ Ejecutar  ⏸  ⏹  · Ajustes · Ayuda ───┐
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

1. Pulsa **Nuevo → Vacío**.
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
- **Barras de vida y marcadores:** `dibujar.enPantalla.rectangulo(…)`.
- **Mando y móvil.** `yo.moverConFlechas` ya funciona con la palanca de un
  mando, y los botones se leen con `mando.pulsado("a")`. Si abren tu juego
  exportado en un móvil, salen botones en la pantalla solos.
- **Funciones para todos.** Un script con solo funciones (sin ningún
  `cuando`) que no está puesto en ningún objeto es una *biblioteca*: sus
  funciones se pueden usar desde cualquier script.

## 6. Guardar y compartir

- El editor **guarda solo** en tu navegador. Si cierras la pestaña, al volver
  está todo.
- **Guardar** (Ctrl+S) descarga tu proyecto como un archivo `.chispa.json`.
  Con **Abrir** lo recuperas, en este o en otro ordenador.
- **Exportar** te deja elegir:
  - **Un archivo**: una página `.html` con tu juego dentro. Se abre con doble
    clic y se la puedes mandar a quien quieras.
  - **itch.io**: descarga un `.zip` listo para subir y te dice, paso a paso,
    qué pulsar en la web de itch.io (y qué tamaño poner).
  - **GitHub Pages**: descarga un `index.html` y te explica cómo tener tu
    juego en una dirección tuya, gratis.

  No hace falta conectar ninguna cuenta al editor: tú subes el archivo.

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
principio)? Son de **dominio público**: cópialos, cámbialos y usa lo que
quieras de ellos en tus juegos, sin pedir permiso.

> Esto es una explicación sencilla, no un consejo legal. El texto que vale
> es el de la licencia, en el archivo `LICENSE`.

## 7. A tu gusto

- **Ajustes** (arriba, o **Ctrl+,**): tema claro u oscuro y tamaño de la
  letra del código y del editor. Se quedan guardados en tu navegador.
- **F1** enseña todos los atajos de teclado.
- En **Ayuda**, abajo, está la versión de Chispa, **Acerca de Chispa** (quién
  lo hace, la licencia y los créditos) y **Apoya Chispa**, por si quieres
  ayudar a que siga creciendo.

Todo el lenguaje, con un ejemplo de cada cosa, está en **MANUAL_CHISPA.md**
(y en la pestaña **Guía** del editor). Un juego grande hecho solo con Chispa,
para ver hasta dónde se puede llegar, está en
`proyectos/arena-de-habilidades/` (ábrelo con **Abrir**).
