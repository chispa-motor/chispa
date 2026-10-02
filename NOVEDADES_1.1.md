# Novedades de Chispa 1.1

Chispa 1.1 trae sobre todo **cosas ya hechas**: formas, efectos, sonidos,
música, marcadores, pantallas, plantillas y dibujos, para que hacer un juego
entero cueste menos. Todo lo que hiciste con la 1.0 **sigue funcionando
igual**: los proyectos de antes se abren sin cambiar nada.

En números: de **280 a 408 comandos**, todos con su ayuda en el editor, su
autocompletado, su ficha en el manual, su bloque y su ejemplo probado.

> ¿Primera vez? Empieza por [EMPIEZA_AQUI.md](EMPIEZA_AQUI.md). El curso
> completo está en [APRENDE_CHISPA.md](APRENDE_CHISPA.md) y todos los comandos,
> en una línea cada uno, en la [chuleta](CHULETA_CHISPA.md).

## Empezar más rápido

- **Plantillas de proyecto.** *Nuevo* ofrece siete juegos pequeños que ya
  funcionan, con el código explicado: **plataformas**, **vista desde arriba**,
  **naves**, **puzle**, **carreras**, **cartas** y **diálogos**.
- **Dibujos, sonidos y música listos.** En *Proyecto*, el botón del libro: 34
  dibujos (personajes, enemigos, objetos y casillas para mapas), 11 efectos de
  sonido y 3 canciones. Originales de Chispa y de dominio público.
- **Biblioteca de objetos.** La pestaña *Biblioteca*: 16 objetos listos
  (monedas, enemigos que patrullan, plataformas que se mueven, puertas…) que
  se arrastran a la escena con su script.

## Dibujar

- **13 formas nuevas**: triángulo, elipse, polígono, estrella, rombo, corazón,
  flecha, línea, cápsula, rectángulo redondeado, anillo, arco y camino libre.
  **Chocan con su forma de verdad** (un triángulo hace de rampa).
- **Estilo**: degradados, patrones, imagen de relleno, borde, sombra,
  resplandor y modos de mezcla. Paletas de colores y un selector de color con
  cuentagotas y «Mis colores».
- **La pluma**: dibuja tus propias formas punto a punto, con curvas. Y se
  pueden **unir y restar** formas, o convertirlas en imagen.
- **Tipos de letra**: 7 listos (uno de píxeles, hecho para Chispa) y los
  tuyos, importados. `dibujar.elipse` y `dibujar.poligono`.

## Efectos

- **Efectos con un comando** (`efecto.explosion(yo)`, `efecto.fuego`,
  `efecto.humo`, `efecto.rayo`, `efecto.lluvia`, `efecto.confeti`…) y un
  **editor de partículas** para hacer los tuyos.
- **Efectos de pantalla**: grises, desenfoque, pixelado, viñeta, tele antigua,
  bloom, flash, `tiempo.congelar` y transiciones entre escenas.
- **Luces y oscuridad**: escenas a oscuras con luces de punto o de foco, de
  colores, que parpadean y que hacen sombra.
- **Juntas**: cuerdas, muelles y bisagras (`junta.cuerda(yo, …)`).
- **Azar que se repite**: `semilla(1234)`.

## Sonido

- **Generador de efectos de sonido**: pulsa «Salto», «Moneda», «Explosión»…
  hasta que salga uno que te guste. Sin archivos.
- **Editor de música**: una rejilla donde pones notas con el ratón; hasta 8
  pistas con 8 instrumentos.
- **Sonido con sitio** (`sonido.reproducirEn`), cambios en vivo
  (`sonido.ponerTono`) y **música que cambia con el juego**
  (`musica.intensidad`, `musica.cruzar`).

## Interfaz y jugadores

- **Controles de interfaz** (*Añadir → Interfaz*): botón, barra, campo de
  texto, deslizador, casilla, lista, menú, ventana, inventario, minimapa e
  icono con contador. Las barras y los contadores leen solos un dato
  (`juego.monedas`, `Jugador.vida`). Evento nuevo: `cuando cambia:`.
- **Pantallas listas**: menú principal, opciones, créditos, tabla de
  puntuaciones, fin del juego y pausa, ya conectados.
  `puntuaciones.guardar("Ana", 1200)`.
- **De 2 a 4 jugadores en el mismo ordenador**: cada uno con su trozo del
  teclado o su mando (`controles(2).sePulso("a")`, `yo.moverConJugador(2, 300)`),
  con **pantalla dividida** o **compartida**. También sin código.

## Publicar

- **Botón itch.io**: un clic descarga el juego listo para subir y enseña los
  pasos. Incluye una portada para la página.
- **Icono y nombre del juego**, y una **pantalla de carga** «Hecho con Chispa»
  (se puede quitar).

## El editor

- **Bloques**: una categoría nueva, **Interfaz**. Los bloques salen ya con los
  nombres de tu proyecto (tus sonidos, tus plantillas, tus objetos).
- **Cambiar el nombre de un objeto ya no rompe el juego**: se cambia también en
  `cuando toco …`, `buscar("…")`, `crear("…")` y en la cámara.
- Cabe en **pantallas de portátil** (1366×768 y 1280×720).
- **Más rápido**: lo que tiene sombra o resplandor se dibuja una vez y se
  reutiliza. En la prueba con 500 objetos con efectos, luces y partículas, un
  fotograma cuesta casi la mitad que antes.
- Mensajes de error nuevos para lo que más se equivoca uno con lo nuevo (ver
  [PROBLEMAS_PRINCIPIANTE.md](PROBLEMAS_PRINCIPIANTE.md), «Cuarta prueba»).

## Para aprender

- El curso tiene **5 niveles**: el nuevo, «Tu juego, de principio a fin», no
  trae comandos nuevos sino un juego entero con las herramientas del editor
  (un duelo para dos jugadores). Los niveles 3 y 4 tienen el doble de
  ejercicios.
- **12 recetas nuevas** en *Guía → Recetas*: barra de vida, contador,
  inventario, linterna, dos jugadores, pantallas listas, puntuaciones, sonidos
  y música propios, sonido con sitio, música que cambia, cuerdas y publicar.

## Lo que no ha cambiado

- **Tus juegos son tuyos**, y el motor sigue con licencia MPL 2.0.
- El formato de los proyectos es el **3**. Los de la 1.0 (formato 2) se abren
  solos; lo único que cambia al abrirlos es que sus círculos siguen chocando
  como cajas, como antes, para que el juego se juegue igual.

## Lo que queda pendiente

- En **móviles y tabletas**, el campo de texto de la interfaz no abre el
  teclado de la pantalla (con teclado de verdad funciona). Ver `ATASCOS.md`.
- El objetivo de **60 fotogramas por segundo con 500 objetos con efectos,
  luces y partículas** está medido solo en el navegador de pruebas, que no
  tiene tarjeta gráfica: ahí va a unos 50 (antes, a unos 30). Falta medirlo en
  ordenadores de verdad. Ver `DECISIONES.md`, día 6.
