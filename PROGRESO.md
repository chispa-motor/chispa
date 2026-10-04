# Progreso de Chispa 1.2 (móvil y tablet)

Este archivo se actualiza al acabar cada bloque. Si el trabajo se corta, aquí
se ve por dónde iba. La regla que manda en todo es `DISPOSITIVOS.md`.

| Bloque | Qué | Estado | Etiqueta |
|---|---|---|---|
| 1 | Editor adaptable (cajones, barra de abajo, escena con el dedo, teclado de pantalla) | **Hecho** | `m12-bloque-1` |
| 2 | Programar con el dedo (barra de atajos, bloques para tacto, tutorial, archivos) | **Hecho** | `m12-bloque-2` |
| 3 | Juegos en móvil (joystick, botones, gestos, vibración, calidad, 30 fps, PWA) | **Hecho** | `m12-bloque-3` |
| 4 | Pruebas, seguridad y documentación (versión 1.2.0) | **Hecho** | `m12-bloque-4` |

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

## Bloque 4 — Pruebas, seguridad y documentación (hecho)

- **Seguridad**: auditoría de todo lo nuevo (`AUDITORIA_SEGURIDAD.md`, «Chispa 1.2», puntos 20 a 23,
  el service worker punto por punto y los riesgos aceptados). 12 tests nuevos en
  `pruebas/seguridad.test.ts` (71): uno ejecuta el service worker con un navegador de mentira y le
  pide archivos de fuera de su carpeta.
- **Documentación**: `EMPIEZA_AQUI.md` sección 7 «Usar Chispa en el móvil o la tableta»; 9 recetas
  nuevas en la Guía (y en el manual), todas jugadas en `pruebas/recetas.test.ts`; manual, curso y
  chuleta regenerados (434 comandos); `NOVEDADES_1.2.md`; `PRUEBAS_PENDIENTES.md` con lo que hay que
  mirar en aparatos de verdad.
- **Versión 1.2.0** (`src/version.ts`, `package.json`).
- **Pruebas en aparatos simulados**: el juego exportado se abre en todos los aparatos táctiles (y en
  uno de 320 px), con controles propios y con los automáticos. Salió un fallo (en 320 px la palanca
  pisaba un botón) y está arreglado: los controles se encogen en pantallas estrechas.
- **Números al cerrar la 1.2**: 434 comandos (408 en la 1.1), 1077 tests (975), 149 pruebas de
  navegador (45 del editor y 104 en móviles y tabletas simulados; 45 en la 1.1), 82 973 líneas (74 184).

# Arena Cero (Chispa 1.3): un juego en primera persona

El juego NO está en este repositorio: es un proyecto privado, en la carpeta de al lado
(`../arena-cero/`, con su propio `PROGRESO.md`). Aquí va lo que se añade al MOTOR para poder
hacerlo, con commit y etiqueta por parte (`arena-cero-parte-N`: las `arena-parte-1` a `3` ya existían, de Arena de Habilidades). Lo que faltaba está en
`FALTABA_EN_EL_MOTOR.md`. No se hace push de nada.

| Parte | Qué | Estado | Etiqueta |
|---|---|---|---|
| 1 | Motor 3D simulado: paredes, suelo, techo, niebla, puertas, medir fps | **Hecho** | `arena-cero-parte-1` |
| 2 | Jugador: teclado, ratón, mando y táctil | **Hecho** | `arena-cero-parte-2` |
| 3 | Sprites que miran al jugador | **Hecho** | `arena-cero-parte-3` |
| 4 | Armas | **Hecho** | `arena-cero-parte-4` |
| 5 | NPCs con IA | **Hecho** | `arena-cero-parte-5` |
| 6 | Mapa rejugable | Sin empezar | |
| 7 | Interfaz | Sin empezar | |
| 8 | Sonido, niveles, guardado, pausa, ajustes | Sin empezar | |
| 9 | Rendimiento | Sin empezar | |
| 10 | Reto: alturas | Sin empezar | |

## Arena Cero, parte 1 — Motor 3D simulado (hecho)

- **`src/motor/Raycaster.ts`**: el dibujo (paredes con textura, suelo y techo por filas, cielo,
  niebla, puertas finas que se deslizan, sprites con profundidad). No depende del navegador.
- **`src/objetos/Vista3D.ts`**: lo une con la escena (el mapa de casillas hecho rejilla, las
  imágenes hechas texturas, los objetos hechos sprites). La escena la usa en `dibujarMundo`.
- **`src/chispa/api/vista3d.ts`**: el módulo `vista3d` (18 comandos). Además: 4 comandos de puertas
  en los mapas, `yo.elevacion`, y `raton.capturado`, `movX`, `movY`. En total, de 434 a 460 comandos.
- Puertas: `MapaCasillas` (apertura por casilla), y las respetan la física, los rayos, los caminos y
  las luces. En el editor, casilla «es una puerta» en el tipo de casilla.
- Sonido con sitio según hacia dónde mira quien escucha (`Sonido.oirDesde`).
- **Pruebas**: `pruebas/vista3d.test.ts` (46) y «primera persona» en `pruebas-navegador/editor.mjs`.
- **Medido** (con el nivel de pruebas del juego, en la máquina de trabajo, sin tarjeta gráfica):
  60 fps en un ordenador (4 ms de dibujo a 640×360); con el procesador frenado 4 veces (como un
  móvil), 53 fps a 320×180; frenado 6 veces, 40 fps.

## Arena Cero, parte 2 — Jugador (hecho)

- En el juego (todo en Chispa): `scripts/controles.chs` (una biblioteca que junta teclado, ratón,
  mando y pantalla táctil) y `scripts/jugador.chs` (andar con física, girar, subir la mirada,
  balanceo al andar, abrir puertas, sensibilidad que se guarda).
- En el motor: `mando.comoTeclado` (461 comandos) y dos errores arreglados con test (un control
  táctil se podía salir de la pantalla; capturar el ratón rompía los toques en un móvil).
- Pruebas del juego (`pruebas/parte2.mjs`, en su carpeta): teclado, choques, ratón capturado,
  sensibilidad, mando, y táctil en tres aparatos (con los dos pulgares a la vez).

## Arena Cero, parte 3 — Sprites (hecho)

- El motor ya lo hacía desde la parte 1 (cada objeto con dibujo es un sprite que mira a quien ve,
  con su tamaño según la distancia, su animación de siempre y orden por profundidad). En esta parte:
  la **elevación en el proyecto** (`DefObjeto.elevacion`, campo «elevación» del inspector) y los
  **efectos en primera persona** (se adelantaron a la parte 2).
- En el juego: 62 imágenes nuevas (cuatro robots con sus fotogramas de andar, apuntar, disparar y
  romperse; el dron; el jefe; disparos; objetos y decorado), 17 animaciones y 22 plantillas.
- Medido con 26 sprites en la sala: 60 fps, 4,1 ms de dibujo a 640×360.

## Arena Cero, parte 4 — Armas (hecho)

- En el motor: `rayo(desde, direccion, largo, atraviesa)` (el cuarto valor: `"solidos"` o nombres que
  se salta), con sus tests.
- En el juego: `scripts/armas.chs` (pistola, escopeta de 7 perdigones, rifle de pulsos automático y
  lanza de riel; cargador y reserva por tipo de munición; recarga; cambio con 1-4, Q, rueda, mando y
  botón táctil; retroceso, fogonazo y destello), `scripts/diana.chs` y `scripts/barril.chs`.
  14 sonidos hechos con el generador de efectos del editor. Pruebas: `pruebas/parte4.mjs` (7).

## Arena Cero, parte 5 — NPCs (hecho)

- En el motor: `mapa.solidoEn(x, y)` (462 comandos) y los diálogos se pasan con el mando aunque no
  haga de teclado. Todo lo demás que usa la IA ya estaba: `yo.irHacia` (camino rodeando paredes),
  `rayo` (línea de visión), `yo.cercanos`, `dialogo`.
- En el juego: `scripts/enemigo.chs` (estados patrulla, alerta, persigue, cubre, huye; vista con
  ángulo y paredes, oído, alarma entre vecinos; piensan seis veces por segundo, no en cada
  fotograma), `scripts/plasma.chs`, `scripts/aliado.chs` (el centinela: espera, sigue, combate, con
  diálogo) y `scripts/tecnico.chs` (trabaja, se asusta y huye, con diálogo y regalo).
- Pruebas: `pruebas/parte5.mjs` (8). Con cuatro enemigos persiguiendo: 60 fps; la lógica de todos
  los scripts tarda 1,2 ms por fotograma de media.

## Cómo seguir si se corta

1. `git log --oneline | head` y `git tag | grep m12` dicen el último bloque cerrado.
2. `git status` dice si hay trabajo a medias del bloque siguiente.
3. Pruebas: `npx vitest run`, `npm run build`, `node pruebas-navegador/editor.mjs` y
   `node pruebas-navegador/moviles.mjs` (aquí con `CI=1 CHROMIUM=/opt/pw-browsers/chromium`).
