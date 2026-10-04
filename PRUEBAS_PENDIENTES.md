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

## Bloque 3 — Juegos en móvil

Para probar: publica un juego con «App para móvil» (o «Una página»), súbelo a un sitio con https y
ábrelo en el aparato. Un juego de prueba rápido: `tactil.joystick()` y `tactil.boton("Saltar", "espacio")`
en «cuando empieza», y `yo.moverConFlechas(200)` en «cuando cada fotograma».

| Qué | Dónde | Qué hay que mirar |
|---|---|---|
| La palanca y los botones con los pulgares | Android y iPhone, de pie y tumbado | Mover con un pulgar y pulsar con el otro A LA VEZ, durante un rato. Que no se «enganche» una dirección al levantar el dedo fuera de la palanca, y que la página no se mueva, no se acerque ni seleccione texto. Simulado con dos toques a la vez; el tacto real (dedos gordos, bordes de la pantalla, fundas) no. |
| Gestos del sistema | iPhone (rayita de abajo, borde izquierdo = atrás), Android con gestos | Que deslizar cerca de los bordes no saque al jugador del juego sin querer. Los controles se apartan de la zona segura, pero el gesto de «atrás» del borde no se puede quitar desde una web. |
| Vibración | Android (Chrome) | `tactil.vibrar(0.2)` tiene que notarse y devolver verdadero. **En iPhone y iPad NO vibra**: Safari no deja a las webs (devuelve falso y el juego sigue). Está dicho en el manual. |
| El sonido | iPhone e iPad | Tiene que sonar tras el primer toque. Con el interruptor de silencio puesto, Safari NO suena (es cosa del aparato). Al volver de otra app o de la pantalla apagada, tiene que volver a sonar al tocar. |
| Pantalla completa | Android, iPad, iPhone | El botón ⛶: en Android y iPad pone el juego a pantalla completa. **En iPhone Safari no hay pantalla completa para webs**: el botón no sale; la manera es instalar el juego en la pantalla de inicio. |
| El aviso «Gira el móvil» | Android y iPhone | Con un juego «horizontal» y el móvil de pie: sale el aviso; al girar, se quita y el juego sigue donde estaba. Instalado como app en Android, se gira solo. |
| Instalar el juego | Android (Chrome) | Abrir la dirección del juego: menú > «Instalar app». Sale con su icono y su nombre, se abre sin barras. Poner el modo avión y abrirlo: funciona. |
| Instalar el juego | iPhone e iPad (Safari) | Compartir > «Añadir a pantalla de inicio». Sale con su icono; se abre sin barras; modo avión: funciona. Mirar que lo guardado (récords, sitio de los controles) sigue al cerrar y abrir: en iPhone, la app instalada tiene su propio almacén, distinto del de Safari. |
| Subir una versión nueva del juego | Android y iPhone | Subir el juego cambiado al mismo sitio, abrir la app con internet y cerrarla; a la segunda vez tiene que salir la versión nueva. |
| Instalar el EDITOR y usarlo sin internet | Android, iPhone, iPad, Chromebook | Ajustes > «Chispa como app». Instalar, poner modo avión, abrir: se abre, deja editar, ejecutar, exportar y están «Mis proyectos». |
| Calidad automática en un móvil lento | Un Android de gama baja | Un juego con muchas partículas y luces en "auto": a los pocos segundos tiene que bajar a "media" o "baja" (`pantalla.nivelCalidad`) y dejar de ir a tirones. En las pruebas se simula diciéndole cuánto tarda cada fotograma; cuánto mejora de verdad solo se ve en el aparato. |
| 30 fotogramas, batería y calor | Cualquier móvil, 15 minutos de juego | Con «30 por segundo» el móvil tiene que calentarse menos. No se puede medir sin el aparato. |
| Pantallas de 120 Hz | Móviles y tabletas recientes | Que el juego vaya a la misma velocidad que en uno de 60 (el movimiento usa el tiempo, no los fotogramas) y que «60 por segundo como mucho» lo limite. |
| Mandos | Bluetooth y USB, en móvil, tablet y PC | Conectar un mando con los controles en pantalla puestos: al usar el mando se esconden; al tocar la pantalla, vuelven. Simulado con un mando de mentira; uno de verdad, no. |
| Colocar los controles | Android y iPhone | `tactil.colocar()`: arrastrar cada control a otro sitio, «Listo», cerrar y abrir: siguen donde se dejaron. Girar el móvil: no se salen de la pantalla. |
| Pantallas plegables | Móvil plegable | Abrir y cerrar a media partida: el juego sigue y los controles se recolocan. |

## Chispa 1.3 — La primera persona (con «Arena Cero»)

Para probar: abre `arena-cero.html` (el juego exportado: un solo archivo) en el aparato, o publica un
juego que use `vista3d.ver(yo)`. En Ajustes > «Ver fps» sale el contador.

| Qué | Dónde | Qué hay que mirar |
|---|---|---|
| Fotogramas por segundo | Un Android de gama baja, uno normal, un iPhone, una tableta | Con «Ver fps»: andando por el nivel 1 y en la pelea con el Núcleo. Tiene que ir a 30 o más. Apuntar también a qué calidad se queda (Ajustes > Calidad en "auto"; el contador dice las columnas: 640, 480, 320 o 240). |
| Calidad «mínima» | Un móvil lento | Que en "auto" llegue a bajar hasta ahí si hace falta, que se siga leyendo la interfaz y que vuelva a subir si va sobrado. |
| Dos pulgares a la vez | Android y iPhone, tumbado | Andar con la palanca y, a la vez, arrastrar para mirar y pulsar Fuego con el otro pulgar, un buen rato. Que no se «enganche» la mirada ni la palanca. |
| Sensibilidad de la mirada con el dedo | Móvil y tableta | Que con la sensibilidad en 1 se pueda dar media vuelta con un arrastre cómodo. Probar los valores de Ajustes. |
| Capturar el ratón | Ordenador con Chrome, Firefox y Safari; Chromebook | El primer clic se queda con el ratón; Escape lo suelta y sale el menú de pausa; «Seguir» y un clic lo vuelven a coger. |
| Un ordenador con pantalla táctil | Windows táctil, Chromebook táctil | Tocar la pantalla mientras se juega con ratón: salen los botones y la mirada con el dedo funciona (el ratón se suelta solo). |
| El mando | Bluetooth y USB, en ordenador, Android y iPad | Palanca izquierda anda de lado, la derecha mira, RT dispara, A usa, Start pausa; los menús y los diálogos se manejan con la cruceta y A. Que vibre al recibir un golpe. |
| De dónde viene el sonido | Con auriculares | Con un guardia a la derecha, sus pasos suenan por la derecha; al girarse, cambian de lado. El zumbido del Núcleo sube al acercarse. |
| «Colocar botones» | Móvil | Ajustes > Colocar botones (desde la pausa): moverlos, pulsar «Listo», seguir jugando; al volver a abrir el juego siguen donde se dejaron. |
| Guardado | Android (Chrome) y iPhone (Safari) | Cerrar el navegador en el nivel 2 y volver a abrir el archivo: sale «Continuar». Abierto como archivo local (`file://`), algunos navegadores no guardan: comprobarlo también subido a una web. |
| Abrir el .html desde Archivos | Android | Que Chrome lo abra tocándolo en la app Archivos (o con «Abrir con»). |

