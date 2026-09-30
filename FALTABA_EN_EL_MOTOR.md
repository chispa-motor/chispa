# Lo que faltaba en el motor

Encontrado haciendo **Arena de Habilidades** (`proyectos/arena-de-habilidades/`), un juego
grande escrito solo en Chispa. Cada vez que algo no se podía hacer o costaba demasiado,
se apuntó aquí, se añadió al motor algo **general** (que sirve para cualquier juego), con
ayuda, manual, errores en español y test (`pruebas/faltaba.test.ts`), y se volvió al juego.

| # | Qué pasaba en el juego | Qué se añadió al motor (para cualquier juego) |
|---|---|---|
| 1 | Los enemigos, el jefe y el jugador necesitan **el mismo código** de efectos de estado (quemado, congelado...). La única forma era copiarlo en cada script o hacer un objeto invisible «Reglas» y llamar a `buscar("Reglas").quemar(...)`. | **Scripts de funciones.** Un script que no está puesto en ningún objeto es una biblioteca: sus funciones se pueden usar desde **cualquier** script, sin importar nada. Sus variables son solo suyas. Dentro no hay `yo` (se pasa el objeto). Errores claros: nombre repetido, nombre de una función del motor, `yo` dentro, y aviso si tiene `cuando` (no se ejecutan). |
| 2 | La Tormenta dura 2 segundos (con `esperar` dentro). Si se lanzaba desde `cuando cada fotograma`, **el jugador se quedaba quieto** esos 2 segundos, porque el evento esperaba. | **`aLaVez(funcion, valores...)`**: la función empieza ya, pero por su cuenta, como otro evento del mismo objeto. Error claro si se escribe `aLaVez(f())` en vez de `aLaVez(f)`. |
| 3 | Para disparar 12 balas en círculo había que escribir `[1, 2, 3, 4, ... 24]` a mano: `para cada` no sabe contar. | **`rango(desde, hasta, paso)`**: `para cada i en rango(1, 12):`. Cuenta hacia atrás si hace falta. Y el error de `para cada i en 10` ahora lo sugiere. |
| 4 | El dash tiene que **atravesar enemigos** pero no las paredes, y el orbe tiene que **rebotar en los muros** sin empujar a los enemigos. Con «sólido» o «fantasma» no se podía: fantasma atraviesa también los muros. | **`yo.atravesar("Nombre")`** y **`yo.dejarDeAtravesar("Nombre")`**: deja de chocar con ese nombre, tipo o etiqueta, pero sigue chocando con lo demás y sigue avisando con `cuando toco`. |
| 5 | Los iconos de las habilidades necesitan el **enfriamiento en círculo** (un «quesito» que se vacía), y la interfaz tiene que dibujarse **fija en la pantalla**. `dibujar` solo tenía círculos enteros y solo en el mundo. | **`dibujar.arco(x, y, radio, desde, hasta, color, relleno, grosor)`** (relleno = quesito) y **`dibujar.enPantalla`**, con las mismas funciones pero en la pantalla, como la interfaz. |
| 6 | «Partículas y sonidos en todas las habilidades», pero el proyecto no tiene archivos de sonido, y `sonido.tono` solo hace pitidos. | **`sonido.efecto("nombre", volumen, tono)`**: 17 efectos generados sin archivos (disparo, laser, explosion, golpe, salto, moneda, poder, dash, escudo, hielo, fuego, rayo, subir, perder, clic, alarma, dano), con sugerencia si el nombre está mal. |
| 7 | Con mando, `moverConFlechas` solo sabía «palanca a tope o nada». | `yo.moverConFlechas` usa la **palanca analógica** si hay mando (poco inclinada = despacio). |
| 8 | El panel de pausa (`"PAUSA\n\nEscape para seguir..."`) salía en **una sola línea** que se salía de la pantalla, y animar la `escala` de un texto no lo agrandaba. | Los objetos de texto dibujan **cada `\n` en su línea** (centradas) y la **escala agranda la letra**. |
| 9 | La interfaz dibujada con `dibujar.enPantalla` quedaba **encima** del panel de pausa y de los textos. | Lo dibujado en la pantalla va **debajo** de los objetos de la interfaz (un panel o un texto siempre quedan encima). |
| 11 | Para probar el **jefe** había que jugar 9 oleadas enteras cada vez: no había forma de cambiar nada mientras el juego está en marcha. | **Órdenes en la consola**: con el juego en marcha, se escribe una línea de Chispa abajo de la consola y se ejecuta al momento (`juego.vidas = 99`, `buscar("Director").saltarA(10)`, `buscar("Jugador").x`). Enseña el valor, los errores con pista, y la flecha arriba recupera las anteriores. |
| 12 | La Tormenta oscurece la pantalla para el efecto, pero `pantalla.oscurecer` lo tapaba **todo** (solo sabía oscurecer del todo). | `pantalla.oscurecer(segundos, color, cuanto)`: con `cuanto` de 0 a 1 se oscurece a medias y se sigue viendo el juego. |
| 10 | El proyecto es enorme para un solo JSON: no se podía leer ni comparar el código de cada script. | Herramientas: **`herramientas/proyecto-carpeta.mjs`** (desmontar un `.chispa.json` en `proyecto.json` + `scripts/*.chs` y volver a montarlo) y **`herramientas/revisar-proyecto.ts`** (todos los errores y avisos de un proyecto, sin abrir el editor). |

## Errores del motor encontrados (y arreglados, con test)

| Error | Arreglo |
|---|---|
| `yo.rebotes` (una propiedad del orbe, puesta en su plantilla) daba **error** «¿querías decir `rebote`?» y **no dejaba ejecutar** el juego. | El análisis conoce las propiedades propias del proyecto (las del inspector y las que se asignan a otros objetos: `orbe.rebotes = 3`). `yo.rebotes` sin definirla en ningún sitio sigue avisando. |
| **Rendimiento**: con 6 enemigos el juego iba a 35 ms por fotograma. Un tercio del tiempo era `normalizar()` (quitar tildes) cada vez que se buscaba un objeto por su nombre. | `normalizar` recuerda los resultados. El juego va el doble de rápido. |
| `yo.irHacia(jugador)` en cada fotograma **volvía a calcular el camino** (A*) cada vez. | Si el destino es el mismo, solo cambia la rapidez. |
| `si a and b:` decía «esperaba ':'», sin explicar que en Chispa es `y`. | La pista dice «'and' no es de Chispa: aquí se escribe 'y'» (también `or`, `not`...). |
| La vista del juego del editor cerraba la pantalla grande con **Escape**, que también es la tecla de pausa del juego: al pausar, se salía de la pantalla grande. | Si los scripts usan la tecla Escape, Escape es para el juego (se sale de la pantalla grande con su botón). |
