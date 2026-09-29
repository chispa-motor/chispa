# Informe de revisión

Revisión honesta del estado del motor. Las líneas se cuentan con
`npm run lineas`, que solo cuenta los archivos guardados en Git: nunca entran
`node_modules`, `dist` ni `public/reproductor.js`, que se generan solos.

## Antes de la revisión (versión `despues-de-5`)

| Parte | Archivos | Líneas |
|---|---:|---:|
| Lenguaje (`src/chispa`) | 18 | 4.601 |
| Motor (motor, objetos, proyecto, reproductor, utilidades) | 28 | 3.276 |
| Editor (editor, exportar, main, estilos, index.html) | 22 | 4.568 |
| Tests (`pruebas`) | 9 | 2.036 |
| Ejemplos y demos | 4 | 341 |
| Documentación (.md) | 4 | 606 |
| Configuración y herramientas | 7 | 154 |
| **Total** | **92** | **15.582** |

Tests: 205, todos pasando.

**Criterio:** HECHA = funciona y tiene tests automáticos dentro del proyecto.
A MEDIAS = funciona, pero le falta algo de lo pedido o solo se había probado a
mano (o con scripts de prueba que no estaban en el proyecto).

| Parte | Estado | Detalle |
|---|---|---|
| 3C · errores | HECHA | 57 tests (errores y errores-3c). |
| 3D · Zona de Programación | A MEDIAS | Autocompletado, ayuda, errores en vivo y paneles con tests. El lienzo, los botones Ejecutar/Pausar/Parar y el editor de código dentro de la ventana solo se habían probado con scripts de Playwright **fuera del proyecto**. |
| Fase 4 · editor visual | A MEDIAS | Toda la lógica (`EstadoEditor`) tiene tests. Faltaba: poner **límites a la cámara** desde el editor (solo desde código), **copiar y pegar** objetos entre escenas, y tests de navegador dentro del proyecto. |
| Fase 5 · exportar | A MEDIAS | La página generada tiene tests, pero que el juego exportado **arranca de verdad** solo se había comprobado a mano. |
| Física completa | HECHA | 11 tests (rebote, rozamiento, masa, sólidos, estáticos, fantasmas, tocar y dejar de tocar). |
| Cámara | HECHA (motor) | Seguir, límites, zoom y temblor con tests. En el editor faltan los límites (ver Fase 4). |
| Mapas de casillas | HECHA | Tests de colisión, casillas fantasma y lectura/escritura desde Chispa. El pincel del editor, con tests de estado. |
| Animaciones | HECHA | 4 tests. |
| Interfaz en pantalla | HECHA | 4 tests (botones, fijo, un solo clic, ratonEncima). |
| Partículas | HECHA | 3 tests. |
| Sonido y música | HECHA | Tests con audio simulado. Comprobado además en Chromium con un WAV de verdad: se decodifica y suena (`AudioContext` en marcha). |
| Varias escenas | HECHA | 3 tests. |
| Guardar datos | HECHA | 2 tests. |
| Temporizadores y aleatorios | HECHA | `cada N segundos`, `pasen N segundos`, `esperar`, `aleatorio`, `elegir`, `probabilidad`, con tests. |

Además, un fallo que aparecería en cuanto alguien hiciera un juego:
**duplicar un objeto lo rompía**. Al duplicar una moneda salía `Moneda2`, y
`cuando toco Moneda` no funcionaba con ella. Se encontró en la prueba de
principiante (ver PROBLEMAS_PRINCIPIANTE.md).

## Después de los bloques 2 a 5 (versión `despues-de-bloque-5`)

| Parte | Archivos | Líneas |
|---|---:|---:|
| Lenguaje (`src/chispa`) | 19 | 5.079 |
| Motor (motor, objetos, proyecto, reproductor, utilidades) | 28 | 3.351 |
| Editor (editor, exportar, main, estilos, index.html) | 22 | 4.784 |
| Tests (`pruebas` y `pruebas-navegador`) | 12 | 2.610 |
| Ejemplos y demos | 4 | 341 |
| Documentación (.md, de ellas 1.733 del manual, que se genera solo) | 7 | 2.487 |
| Configuración y herramientas | 7 | 162 |
| **Total** | **99** | **18.814** |

Tests:
- **257 tests** automáticos (`npm run pruebas`), todos pasando.
- **8 pruebas en un navegador de verdad** (`npm run pruebas:navegador`), todas pasando.

| Parte | Estado | Cómo se ha comprobado |
|---|---|---|
| 3C · errores | HECHA | 64 tests (errores y errores-3c). Además, 12 tests con las formas de escribir de quien empieza (`entonces`, `si no`, `++`, `cuando pulso`, comillas que faltan...). |
| 3D · Zona de Programación | HECHA | Tests de autocompletado, ayuda, sangría y paneles. En el navegador: errores subrayados mientras escribes, Ejecutar bloqueado con errores, sangría automática, ejecutar, pausar y parar. |
| Fase 4 · editor visual | HECHA | 27 tests de `EstadoEditor` y 7 de paneles. En el navegador: arrastrar y deshacer, pintar mapas (también rectángulos), copiar y pegar entre escenas, 500 objetos a 60 fotogramas por segundo. Añadido: límites de la cámara, copiar y pegar, rectángulos, coordenadas del ratón. |
| Fase 5 · exportar | HECHA | Tests de la página generada. En el navegador: se exporta, se abre el archivo `.html` sin el editor y el juego arranca. |
| Física completa | HECHA | 11 tests, más 4 de `moverConFlechas` (incluido chocar con paredes). Con 500 cuerpos amontonados va a 60 fotogramas por segundo (antes, 10). |
| Cámara | HECHA | 3 tests y 3 más (no salir del mapa, límites con un objeto, sin arrastrar el zoom de otra escena). |
| Mapas de casillas | HECHA | 5 tests en el motor, 2 en el editor (pintar y rectángulos) y una prueba de navegador. |
| Animaciones | HECHA | 4 tests. |
| Interfaz en pantalla | HECHA | 4 tests y el de los textos de interfaz por defecto. |
| Partículas | HECHA | 3 tests y uno de partículas sin posición. |
| Sonido y música | HECHA | Tests con audio simulado y una prueba de navegador con un WAV de verdad (se decodifica y suena). |
| Varias escenas | HECHA | 3 tests y uno de cámara al cambiar de escena. En la prueba de principiante, hecha en el navegador, funcionaron la puerta → Nivel2 y la pantalla de fin → volver a empezar. En las pruebas de navegador del proyecto: crear una escena y pegar en ella. |
| Guardar datos | HECHA | 2 tests. |
| Temporizadores y aleatorios | HECHA | Tests de `cada N segundos`, `pasen N segundos`, `esperar`, `aleatorio`, `elegir` y `probabilidad`. |

