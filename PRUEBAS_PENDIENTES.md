# Pruebas pendientes en aparatos de verdad

Las pruebas automáticas (`pruebas-navegador/moviles.mjs`) usan un Chromium de
ordenador que se hace pasar por móviles y tabletas: mismo tamaño de pantalla,
sin ratón y con toques de verdad de uno y dos dedos. Eso comprueba casi todo,
pero hay cosas que solo se ven con el aparato en la mano. Están aquí, con lo
que hay que mirar en cada una.

Para probar: abre el editor en el aparato (la dirección de `npm run dev -- --host`
desde un ordenador de la misma red, o la web publicada).

## Bloque 1 — El editor

| Qué | Dónde | Qué hay que mirar |
|---|---|---|
| El teclado de pantalla en los campos de texto de un juego | Android (Chrome), iPhone e iPad (Safari) | Añade un «Campo de texto», ejecuta y tócalo: tiene que SALIR el teclado. Escribe, borra, usa el texto predictivo y pulsa Intro. En la prueba simulada se comprueba que se enfoca un campo de verdad en el mismo toque, pero que el navegador saque el teclado solo se ve en el aparato. En Safari el campo se enfoca al bajar el dedo y, por si acaso, otra vez al levantarlo. |
| El teclado no tapa el código | iPhone e iPad (Safari) | Abre un script largo, toca una línea de abajo: la línea del cursor tiene que quedar a la vista por encima del teclado y la barra de abajo tiene que quitarse. En Android se simula encogiendo la ventana; en Safari la ventana NO se encoge (solo «lo visible») y eso no se puede simular. |
| La zona segura (notch y barra de abajo del iPhone) | iPhone con notch, de pie y tumbado | Que la barra de arriba no quede debajo del notch ni la de abajo debajo de la rayita de inicio. Se usa `env(safe-area-inset-*)`, que en el navegador de pruebas vale siempre 0. |
| Pellizcar en la escena | Android y Safari | Que al pellizcar se acerque la escena y NO la página entera, y que arrastrar no «tire» de la página (rebote de Safari). |
| Dejar el dedo quieto | Android y Safari | Sobre un objeto de la escena, sobre una fila de la lista de objetos y sobre un botón: tiene que salir el menú o la ayuda de Chispa, no el menú del navegador ni la lupa de seleccionar texto. |
| Girar el aparato | Todos | Con un juego en marcha: sigue la partida y el editor se recoloca (en el móvil tumbado, la barra pasa a la izquierda). |
| Tablet con teclado y ratón | iPad con funda de teclado, tablet Android con ratón | Con ratón el puntero pasa a ser «fino»: los botones vuelven a su tamaño normal. Si se prefieren grandes: Ajustes > Botones grandes > Siempre. |
| PC con pantalla táctil | Windows | Pellizcar y arrastrar con el dedo en la escena, y que el ratón siga igual. |
| Pantallas plegables | Móvil plegable | Abrir y cerrar con el editor abierto: pasa de móvil a tablet sin perder nada (es lo mismo que cambiar el tamaño de la ventana, que sí está probado). |

## Bloque 2 — Programar con el dedo

| Qué | Dónde | Qué hay que mirar |
|---|---|---|
| La barra de atajos con el teclado de verdad | Android, iPhone, iPad | Abre un script y toca el código: la barra (cuando, si, sino...) tiene que quedar pegada justo encima del teclado, y al tocar un botón el teclado NO se tiene que esconder. En las pruebas se comprueba que el botón no se lleva el foco, que es lo que esconde el teclado; verlo de verdad solo se puede con el aparato. |
| Escribir con el teclado predictivo | Android (Gboard), iPhone | Escribir varias líneas de código con el corrector activado: que no cambie palabras de Chispa por otras ni ponga mayúsculas al empezar la línea (el editor pide al teclado que no lo haga). |
| Bloques: tocar y poner | Android y Safari | Pasar un script a bloques, tocar un bloque de la paleta y luego un sitio «＋ aquí». Mover uno tocando su cabecera. Desplazar la zona de bloques con el dedo. |
| Tutorial entero con el dedo | Móvil de pie y tumbado, tablet | Hacerlo de principio a fin tocando lo que resalta (no «Hazlo por mí»): que en cada paso se abra el panel que toca y la burbuja no tape lo que hay que tocar. |
| Importar de la galería | Android y iPhone | Proyecto > Imágenes > Importar: tiene que abrirse la galería (y dejar hacer una foto). Una foto de la cámara se importa reducida. En iPhone, comprobar que la foto llega como JPG (si llega como HEIC, el editor lo dice). |
| Importar un sonido grabado | Android y iPhone | Proyecto > Sonidos > Importar: una nota de voz (.m4a) se importa y suena. |
| Compartir el proyecto | Android y iPhone | Menú de arriba > «Compartir o guardar copia»: sale el menú de compartir del aparato con el archivo .chispa.json; guardarlo en Archivos o Drive y volver a abrirlo con «Abrir un archivo». Hay aparatos que no dejan compartir archivos .json: entonces el editor lo descarga. |
| Que no se pierda el trabajo | Android y iPhone | Cambiar algo, pasar a otra app unos minutos (o apagar la pantalla) y volver: el proyecto sigue. Cerrar el navegador del todo y abrirlo: «Mis proyectos» lo tiene. |
| El navegador no borra lo guardado | Safari de iPhone | Safari borra lo guardado de las webs que no se visitan en 7 días (salvo si están en la pantalla de inicio). El editor pide al navegador que no lo haga, pero puede negarse: por eso conviene «Guardar» o «Compartir» una copia de vez en cuando. |

