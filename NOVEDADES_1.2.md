# Novedades de Chispa 1.2

Chispa 1.2 es la versión **para móviles y tabletas**. El editor entero se
maneja con el dedo, se puede programar sin teclado, y los juegos que hagas se
juegan en un móvil con palanca y botones en la pantalla. Todo lo que hiciste
con la 1.0 y la 1.1 **sigue funcionando igual**, y en un ordenador con teclado
y ratón el editor es el de siempre.

En números: de **408 a 434 comandos** (22 del módulo nuevo `tactil` y 4 de
`pantalla`), todos con su ayuda, su autocompletado, su ficha en el manual, su
bloque y su ejemplo probado.

> ¿Primera vez en el móvil? Lee la sección **«Usar Chispa en el móvil o la
> tableta»** de [EMPIEZA_AQUI.md](EMPIEZA_AQUI.md). Lo de la versión anterior
> está en [NOVEDADES_1.1.md](NOVEDADES_1.1.md).

## Dónde funciona

Móviles Android (Chrome) y iPhone (Safari), de pie y tumbados; tabletas
Android y iPad, con o sin teclado y ratón; Chromebooks y portátiles pequeños;
ordenadores con pantalla táctil; mandos Bluetooth y USB en cualquiera de
ellos; y el escritorio de siempre (Windows, Mac, Linux). La lista y las
reglas están en [DISPOSITIVOS.md](DISPOSITIVOS.md).

Lo que solo se puede comprobar con el aparato en la mano está apuntado, con
lo que hay que mirar, en [PRUEBAS_PENDIENTES.md](PRUEBAS_PENDIENTES.md).

## El editor con el dedo

- **Tres formas del editor**, según el aparato: escritorio (como siempre),
  tableta y móvil. En tableta y móvil, lo que editas (la escena o el código)
  ocupa toda la pantalla, y los paneles se abren con una **barra de abajo**:
  Escena, Código, Objetos, Propiedades, Juego y Consola.
- **Nada depende del ratón.** Dejar el dedo quieto enseña la ayuda de un
  botón o abre el menú de un objeto o de una fila. Todo lo que era doble
  clic, arrastrar y soltar o botón derecho tiene su camino con el dedo.
- **Botones grandes** (44 px) cuando se usa el dedo. En un ordenador con
  pantalla táctil: *Ajustes → Botones grandes*.
- **La escena con el dedo**: tocar elige, arrastrar mueve, dos dedos mueven y
  acercan la vista, dedo quieto abre el menú.
- **El teclado de pantalla** sale al tocar un campo de texto de un juego
  (antes no salía), y no tapa el código: el editor se encoge a lo que se ve.
- **Girar el aparato** o cambiar el tamaño de la ventana no pierde nada: ni
  el proyecto ni la partida.

## Programar con el dedo

- **Barra de atajos** encima del teclado: `cuando`, `si`, `sino`, `mientras`,
  `repetir`, `funcion`, dos puntos, paréntesis, comillas, sangría, deshacer y
  rehacer, y **?** para la ayuda.
- **Bloques sin arrastrar**: toca un bloque y luego el sitio donde va. Con
  botones de deshacer y rehacer.
- **El tutorial** funciona en el móvil: abre el panel que toca en cada paso.
- **Mis proyectos**: cada proyecto se guarda solo en el navegador, con su
  nombre. Puedes tener varios y cambiar de uno a otro.
- **Compartir o guardar copia** con el menú del propio aparato.
- **Importar de la galería** (o de la cámara). Las fotos enormes se reducen
  solas.
- **Se guarda al cambiar de app**, no solo cada pocos segundos.

## Juegos para el móvil

Comandos generales, para cualquier juego:

- **`tactil.joystick()`**: una palanca en la pantalla que hace de flechas.
- **`tactil.boton("Saltar", "espacio")`**: un botón que pulsa una tecla. El
  resto del código no cambia. También `tactil.pulsado`, `sePulso` y `seSolto`.
- **Solo salen cuando se juega con el dedo.** Con teclado, ratón o mando se
  esconden solos (`tactil.mostrar` lo cambia).
- **`tactil.mirar()`** con `tactil.miraX` y `miraY`: arrastrar para apuntar o
  mover la cámara.
- **Gestos**: `tactil.gesto` (toque, doble, largo, deslizar a los cuatro
  lados), `tactil.pellizco`, `tactil.toques` y `tactil.dedos`.
- **`tactil.vibrar()`** (en Android; en iPhone no se puede).
- **Botones a gusto de cada uno**: `tactil.mover`, `tactil.tamano`,
  `tactil.opacidad` y **`tactil.colocar()`**, con el que quien juega los
  arrastra a donde quiera (y se le recuerda).
- **`pantalla.orientacion`**: si el juego es para jugar tumbado y lo abren de
  pie, sale un aviso de «Gira el móvil» y el juego espera.
- **Pantalla completa** con un botón en el propio juego (Android y iPad).
- **Calidad adaptable**: `pantalla.calidad` ("auto", "alta", "media",
  "baja"). En "auto" baja sola si el aparato no puede y vuelve a subir si le
  sobra. `pantalla.nivelCalidad` dice cuál se está usando.
- **`pantalla.maximoFps = 30`**: menos batería y menos calor.
- Orientación, calidad y fotogramas se eligen también **sin código**, en
  *Propiedades → Proyecto*.

## Apps que se instalan y funcionan sin internet

- **Tu juego como app**: *Exportar → App para el móvil*. Un zip con el juego,
  su icono y lo necesario para instalarlo en la pantalla de inicio y jugar
  **sin internet**. Te dice paso a paso dónde subirlo.
- **Chispa como app**: el propio editor se instala (*Ajustes → Chispa como
  app*) y abre, ejecuta y exporta sin internet.
- **Seguridad**: la app solo puede usar los archivos de su propia carpeta y
  no puede conectarse a ningún sitio. Todo lo nuevo se ha revisado como lo
  haría un atacante: está en [AUDITORIA_SEGURIDAD.md](AUDITORIA_SEGURIDAD.md)
  («Chispa 1.2»).

## Lo que no se puede (y conviene saber)

- **iPhone y iPad no vibran** desde una web, y el **iPhone no tiene pantalla
  completa** para webs: la manera es instalar el juego en la pantalla de inicio.
- **El sonido** empieza con el primer toque, y en un iPhone en silencio no
  suena.
- **Safari borra lo guardado** de las webs que no se visitan en 7 días, salvo
  si están instaladas en la pantalla de inicio. Instala Chispa y guarda copias.
- Las pruebas automáticas usan un navegador de ordenador que **se hace pasar**
  por móviles y tabletas, con toques de verdad. No es lo mismo que un aparato
  real: lo que falta por mirar a mano está en PRUEBAS_PENDIENTES.md.

## Recetas nuevas en la Guía

Jugar con el dedo (palanca y botón), un botón para disparar, moverse
deslizando, apuntar arrastrando, un juego que va bien en móviles lentos, un
juego tumbado, vibrar, dejar colocar los botones y convertir tu juego en una
app.
