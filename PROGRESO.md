# Progreso de Chispa 1.2 (móvil y tablet)

Este archivo se actualiza al acabar cada bloque. Si el trabajo se corta, aquí
se ve por dónde iba. La regla que manda en todo es `DISPOSITIVOS.md`.

| Bloque | Qué | Estado | Etiqueta |
|---|---|---|---|
| 1 | Editor adaptable (cajones, barra de abajo, escena con el dedo, teclado de pantalla) | **Hecho** | `m12-bloque-1` |
| 2 | Programar con el dedo (barra de atajos, bloques para tacto, tutorial, archivos) | Sin empezar | |
| 3 | Juegos en móvil (joystick, botones, gestos, vibración, calidad, 30 fps, PWA) | Sin empezar | |
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

## Cómo seguir si se corta

1. `git log --oneline | head` y `git tag | grep m12` dicen el último bloque cerrado.
2. `git status` dice si hay trabajo a medias del bloque siguiente.
3. Pruebas: `npx vitest run`, `npm run build`, `node pruebas-navegador/editor.mjs` y
   `node pruebas-navegador/moviles.mjs` (aquí con `CI=1 CHROMIUM=/opt/pw-browsers/chromium`).
