# Progreso de Chispa 1.2 (móvil y tablet)

Este archivo se actualiza al acabar cada bloque. Si el trabajo se corta, aquí
se ve por dónde iba. La regla que manda en todo es `DISPOSITIVOS.md`.

| Bloque | Qué | Estado | Etiqueta |
|---|---|---|---|
| 1 | Editor adaptable (cajones, barra de abajo, escena con el dedo, teclado de pantalla) | **Hecho** | `m12-bloque-1` |
| 2 | Programar con el dedo (barra de atajos, bloques para tacto, tutorial, archivos) | **Hecho** | `m12-bloque-2` |
| 3 | Juegos en móvil (joystick, botones, gestos, vibración, calidad, 30 fps, PWA) | **Hecho** | `m12-bloque-3` |
| 4 | Pruebas, seguridad y documentación (versión 1.2.0) | Sin empezar | |

No se ha hecho push de nada. La web sigue como estaba.

## Bloque 1 — Editor adaptable (hecho)

- **Tres disposiciones** (`src/editor/interfaz/dispositivo.ts`): escritorio (como siempre), tablet y
  móvil. En tablet y móvil la escena o el código ocupan todo y los paneles (Objetos, Propiedades,
  Juego, Consola) son cajones que se abren con la barra de abajo. En el móvil tumbado la barra va a la
  izquierda. El móvil lleva arriba lo justo y un menú «Más».
- **Nada depende del ratón**: la ayuda (`title`) sale dejando el dedo; lo que era doble clic o
  arrastrar (renombrar, ordenar, poner una imagen o una plantilla en la escena, quitar un color) está
  en un menú que sale dejando el dedo (o con el botón derecho, o con la tecla del menú). En el código,
  tocar un error lo explica y dejar el dedo en un comando enseña su ficha. La música se pone con
  toques (con selector de largo) y la pluma tiene botón de curva.
- **Botones de 44 px** con el dedo (y «Botones grandes» en Ajustes para los PC táctiles).
- **Escena con el dedo** (`src/editor/escena/gestos.ts`): tocar selecciona, arrastrar mueve, dos
  dedos mueven y acercan la vista, dedo quieto abre el menú.
- **Teclado de pantalla**: el campo de texto de los juegos enfoca un campo de verdad en el mismo
  toque (`Entrada.abrirTeclado`), y el editor se encoge a lo que queda a la vista.
- **Pruebas**: `pruebas/movil.test.ts` (18) y `pruebas-navegador/moviles.mjs` (69 comprobaciones en
  7 aparatos simulados, con toques de uno y dos dedos). Lo que no se puede simular está en
  `PRUEBAS_PENDIENTES.md`.

## Bloque 2 — Programar con el dedo (hecho)

- **Barra de atajos** (`src/editor/codigo/barraAtajos.ts`): debajo del código, justo encima del
  teclado. cuando, si, sino, mientras, repetir, funcion, dos puntos, paréntesis, comillas, igual,
  punto, sangría y quitar sangría, deshacer y rehacer, mover el cursor y «?» (ayuda de la palabra).
  No le quita el foco al código (el teclado no se esconde). Solo sale en móvil y tablet.
- **Bloques sin arrastrar** (`EditorBloques.coger`): tocar un bloque de la paleta y luego el sitio
  donde va; tocar la cabecera de un bloque para moverlo, duplicarlo o borrarlo. Botones de
  deshacer y rehacer. En el móvil la paleta va arriba en dos tiras. Arrastrar con el ratón sigue igual.
- **Tutorial**: cada paso sabe en qué cajón está lo que hay que tocar y lo abre; textos para el dedo;
  la burbuja ocupa el ancho, se pone en el lado contrario a lo resaltado y se puede encoger.
- **El juego en el editor con el dedo**: salen los mismos botones en pantalla que en el juego exportado.
- **Archivos**: «Mis proyectos» (cada proyecto se guarda solo en el navegador, con su nombre; se
  puede tener varios y borrar), compartir el archivo por el menú del aparato, las fotos enormes de
  la cámara se reducen a 1024 px al importarlas, y se guarda al mandar la página al fondo.
- **Pruebas**: `pruebas/dedo.test.ts` (19) y 22 comprobaciones más en `pruebas-navegador/moviles.mjs`
  (91 en total).

## Bloque 3 — Juegos en móvil (hecho)

- **Módulo `tactil`** (22 comandos, generales para cualquier juego; `src/motor/Tactil.ts` y
  `src/chispa/api/tactil.ts`): `tactil.joystick()` (hace de flechas), `tactil.boton("Saltar", "espacio")`
  (pulsa teclas: el resto del código no cambia), `pulsado / sePulso / seSolto`, `tactil.mirar()` con
  `miraX / miraY` (arrastrar para mirar), `gesto` (toque, doble, largo, deslizar a los cuatro lados),
  `pellizco`, `dedos`, `toques`, `x / y`, `mover`, `quitar`, `colocar` (quien juega mueve los controles
  y se le recuerda), `vibrar`, `mostrar` (auto, siempre, nunca), `tamano`, `opacidad`, `hay`.
- **Solo salen cuando hacen falta**: con el dedo, sí; con teclado, ratón o mando, se esconden solos.
  Un juego que no pone controles sigue teniendo los automáticos (los de las teclas que usa).
- **`pantalla`** (4 comandos nuevos): `calidad` ("auto", "alta", "media", "baja"), `nivelCalidad`,
  `maximoFps` (30 para gastar menos batería) y `orientacion` (aviso «Gira el móvil»). También están en
  las Propiedades del proyecto, sin escribir código.
- **Calidad adaptable** (`src/motor/Calidad.ts`): en "auto" mide los fotogramas y baja o sube sola
  (menos píxeles, menos partículas, sin sombras de luces ni filtros caros).
- **El juego como app del móvil** (`src/exportar/pwa.ts`): destino «App para móvil» al publicar: zip con
  la página, la ficha, los iconos y un service worker que solo sirve los archivos del juego. Se instala y
  funciona sin internet. Botón de pantalla completa, zona segura del iPhone, el audio se despierta al
  primer toque.
- **El editor como app**: al compilar se hace su ficha y su service worker (`vite.config.ts`): el editor
  se instala en la pantalla de inicio y abre, ejecuta y exporta sin internet. Ajustes explica cómo
  instalarlo en cada aparato (`src/editor/interfaz/instalar.ts`).
- **Pruebas**: `pruebas/juegos-movil.test.ts` (39) y 11 comprobaciones más en
  `pruebas-navegador/moviles.mjs` (102 en total): juego exportado con dos dedos a la vez, PC táctil,
  girar, calidad, 30 fps, colocar controles, app sin internet e instalable, editor sin internet.

## Cómo seguir si se corta

1. `git log --oneline | head` y `git tag | grep m12` dicen el último bloque cerrado.
2. `git status` dice si hay trabajo a medias del bloque siguiente.
3. Pruebas: `npx vitest run`, `npm run build`, `node pruebas-navegador/editor.mjs` y
   `node pruebas-navegador/moviles.mjs` (aquí con `CI=1 CHROMIUM=/opt/pw-browsers/chromium`).
