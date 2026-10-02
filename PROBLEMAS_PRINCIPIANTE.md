# Problemas encontrados en la prueba de principiante

Para esta prueba me puse en el lugar de alguien de 12 años que no sabe
programar ni inglés. Solo usé EMPIEZA_AQUI.md, la Guía y el editor, y así
hice tres juegos pequeños:

- **a)** Un personaje que anda, salta a plataformas y recoge monedas, con los puntos en pantalla.
- **b)** Una nave que dispara a enemigos que caen, con explosiones y una escena de «fin» para volver a empezar.
- **c)** Un personaje visto desde arriba en un mapa de casillas, con la cámara siguiéndole y una puerta que lleva a otra escena.

**Cómo los hice:**
- En el editor de verdad, con un navegador automático que pulsaba los mismos botones, rellenaba los mismos campos y escribía el mismo código que una persona.
- Probé además los errores típicos de quien escribe código por primera vez: más de 40 formas de equivocarse.

**Qué pasó con las pruebas:**
- Cuando todo se arregló, los tres juegos funcionaron.
- Los proyectos de prueba se borraron: nunca llegaron a guardarse en el proyecto.
- Lo que sí se queda son **tests automáticos**, uno por cada problema, en `pruebas/principiante.test.ts`, `pruebas/editor.test.ts` y `pruebas-navegador/editor.mjs`.

## Fallos (cosas que no funcionaban)

| # | Problema | Arreglo |
|---|---|---|
| 1 | **Al duplicar una moneda (Ctrl+D), la copia `Moneda2` no avisaba con `cuando toco Moneda`.** Solo funcionaba la primera moneda. Es el fallo más grave, porque es lo primero que hace cualquiera. | Si nadie dice otra cosa, el **tipo** de un objeto es su nombre sin los números del final. `Moneda`, `Moneda2` y `Moneda3` son del tipo `Moneda`, y `cuando toco Moneda` y `buscarTodos("Moneda")` valen para todas. El panel de propiedades lo explica. |
| 2 | Al duplicar `Moneda2` salía `Moneda22`. Con dos scripts del mismo nombre salía `cuadrado.chs2`. | Ahora sale `Moneda3`, y el número va antes de la extensión: `cuadrado2.chs`. |
| 3 | Al cambiar de escena, la pestaña seguía diciendo el nombre de la escena anterior. | Se actualiza. |
| 4 | Al crear un tipo de casilla nuevo (por ejemplo, «puerta»), no quedaba elegido y sus opciones, como «sólida», no se veían. | Queda elegido, con el pincel listo y sus opciones a la vista. |
| 5 | Al cambiar de escena, la cámara conservaba el zoom de la escena anterior. | Cada escena empieza con su cámara. |

## Difícil, largo o confuso

| # | Problema | Arreglo |
|---|---|---|
| 6 | **Moverse con las flechas** pedía cuatro bloques `si teclado.pulsada(...)` y entender `delta`. Visto desde arriba eran ocho líneas, y el personaje no miraba hacia donde andaba. | Nueva acción **`yo.moverConFlechas(300)`**, que funciona con las flechas y con W A S D. Si el objeto cae (tiene física y hay gravedad), solo va a los lados; si no, en las cuatro direcciones. Choca con las paredes y la imagen se da la vuelta sola. |
| 7 | `crear("Bala")` sin posición aparecía en la esquina (0, 0). | Sin posición, sale **donde está el objeto que la crea**: la bala sale de la nave. |
| 8 | `particulas("explosion")` sin posición daba error. | Sin posición, salen en el objeto. |
| 9 | Las balas y los enemigos que salían de la pantalla se quedaban para siempre. Tampoco había una forma fácil de saber si el jugador se había caído al vacío. | Nuevo evento **`cuando salgo de la pantalla:`**. Un enemigo que aparece por encima de la pantalla no cuenta hasta que entra. |
| 10 | El botón «Plantilla» dejaba el original en la escena: al empezar había una bala quieta en medio. | Ahora **convierte**: pregunta antes, saca el objeto de la escena y lo lleva a Plantillas. |
| 11 | Hacer una plantilla y borrar el original eran dos pasos que había que adivinar. | Lo mismo que el punto 10: es un solo paso. |
| 12 | El texto de los puntos se iba de la pantalla en cuanto la cámara seguía al jugador. | Los **textos nuevos ya salen pegados a la pantalla** (interfaz), arriba a la izquierda. |
| 13 | Los límites de la cámara solo se podían poner desde el código, calculando cuatro números. Además, la sección Cámara estaba plegada y no se veía. | Nueva casilla **«no salir del mapa»** en Propiedades > Cámara, y `escena.camara.limites(buscar("Mapa"))` desde el código. La sección Cámara ya sale abierta. |
| 14 | Pintar las paredes de una habitación casilla a casilla llevaba mucho tiempo. | **Mayús + arrastrar** con el pincel pinta, o borra con la goma, un rectángulo entero. |
| 15 | Para llevar el jugador a la escena Nivel2 había que hacerlo otra vez desde cero. | **Copiar y pegar** (Ctrl+C y Ctrl+V, y un botón «Pegar» en la lista de objetos), también de una escena a otra. |
| 16 | No había forma de saber las coordenadas de un sitio: ¿dónde está «arriba»? ¿Cuánto vale la Y del suelo? | La barra de la escena enseña la **x y la y del ratón**. |
| 17 | Si hacías clic en el código con el juego en marcha, las teclas dejaban de llegar al juego sin ninguna explicación. | Sale un aviso encima del juego: **«Haz clic aquí para jugar con el teclado»**. |
| 18 | El script nuevo solo decía «Hola» y no daba ninguna pista de qué hacer después. | La plantilla explica dónde buscar ideas (Guía > Recetas) y trae el ejemplo de moverse, listo para usar. |
| 19 | La Guía solo tenía fichas de funciones: había que saber ya qué buscar. | Nueva sección **Recetas: ¿cómo hago…?**, con 14 recetas: moverse, saltar, monedas y puntos, disparar, enemigos, explosiones, pantalla de fin, cámara, puertas, perseguir, cuenta atrás, récord… Un test comprueba que todo su código funciona. |
| 20 | No había ayuda ni autocompletado para las listas y los textos (`añadir`, `quitar`, `mayusculas`…). | Están documentados, salen al pasar el ratón y en el autocompletado. |

## Errores al escribir código: mensajes que no ayudaban

Antes, varios de estos errores daban un mensaje genérico, del tipo «no existe
ninguna variable» o «esperaba ':'». Ahora cada uno explica qué pasa.

| Lo que escribió | Pista nueva |
|---|---|
| `si teclado.pulsada(derecha):` · `yo.color = rojo` · `crear(Bala)` · `cuando se pulsa espacio:` | ¿Querías escribir `"derecha"` entre comillas? (Lo mismo con cualquier tecla, color, plantilla, escena, sonido o imagen.) |
| `si puntos == 10 entonces:` | En Chispa no se escribe «entonces»: la línea termina en `:` |
| `si puntos es 10:` | Para comparar se usa `==` |
| `si no:` | Se escribe todo junto: `sino` |
| `puntos++` | Para sumar 1 se escribe `puntos += 1` |
| `cuando pulso "espacio":` · `cuando presiono…` | En Chispa se escribe así: `cuando se pulsa "espacio":` |
| `cuando choco con Pared:` · `cuando toque…` | En Chispa se escribe así: `cuando toco Pared:` |
| `cuando empiece el juego:` | Después del evento va `:` directamente |
| `puntos == 5` (una línea sola) | Antes **no hacía nada y no avisaba**. Ahora: «esta línea compara, pero no guarda nada; para guardar se usa un solo =» |
| `yo.destruir` (sin paréntesis) | Antes **no hacía nada y no avisaba**. Ahora: «si es una acción, lleva paréntesis: `yo.destruir()`» |
| `fin` (para cerrar un bloque, como en el pseudocódigo del colegio) | Los bloques no se cierran con «fin»: terminan solos cuando se quita la sangría |

## Lo que funcionó bien a la primera

- La sangría automática: al pulsar Intro después de `:`, la siguiente línea ya empieza con 4 espacios.
- Los mensajes de `;`, `print`, `=` en un `si` y teclas mal escritas (`"espaico"` → `"espacio"`).
- La física de las plataformas: un rectángulo sin Física es un suelo sólido.
- Los botones con `cuando hago clic encima`.
- Los datos de `juego` se conservan entre escenas, y eso hace fácil la pantalla de fin con los puntos.
- `"Puntos: " + juego.puntos` funciona sin conversiones.
- Las mayúsculas no importan: `variable Vida` y `vida` son la misma variable.

---

# Segunda prueba de principiante (sesión 3)

Otra vez en el lugar de alguien de 12 años que no sabe programar. Esta vez:

- **El tutorial nuevo** («¿Hacemos tu primer juego?»), de principio a fin y
  cometiendo a propósito los despistes típicos: escribir un nombre y hacer
  clic fuera sin pulsar Intro, pintar el suelo sin Mayús, y **copiar el código
  de la burbuja tal cual, con sus espacios**.
- **«Atrapa la fruta»**: una cesta que se mueve a los lados, fruta que cae desde
  arriba (una plantilla creada desde el código cada segundo en un sitio al
  azar), puntos y vidas en un marcador con huecos, una escena de fin con el
  **récord guardado** y un botón para volver a jugar.
- **«Sube a la cima»**: una escalada hacia arriba contra el reloj, con **nubes
  que se atraviesan desde abajo** (copias enlazadas de una plantilla, colocadas
  arrastrando), un **ascensor** con Recorrido, la **cámara que sigue** al
  jugador, una **cuenta atrás** hecha con un texto con huecos y dos escenas de
  final (ganar y quedarse sin tiempo).

Todo en el editor de verdad, con un navegador automático que hacía clic,
arrastraba y escribía como una persona, en una pantalla de portátil normal
(1366 × 768). Los dos juegos funcionaron al final: se coge la fruta y suben los
puntos, se pierden las vidas y sale el fin con el récord; se sube a una nube
saltando desde abajo, el ascensor lleva al jugador hasta la meta y, si se acaba
el tiempo, sale la escena de «sin tiempo». Los juegos se borraron después.

## Fallos (cosas que no funcionaban)

| # | Problema | Arreglo |
|---|---|---|
| 21 | **Copiar el código del tutorial tal cual (con los espacios del principio) lo rompía.** El editor ya pone la sangría solo al pulsar Intro, así que salían 8 espacios donde tocaban 4; y después de una línea en blanco, cada `cuando` quedaba metido dentro del anterior. Resultado: «los bloques cuando tienen que ir en el nivel principal». Le habría pasado a casi cualquiera. | Si en una línea recién sangrada lo primero que se escribe es un espacio, cuentan los espacios que escribe la persona. Y al escribir `cuando ` la línea salta sola al principio (un evento nunca va dentro de nada). Ahora da igual copiarlo con o sin espacios: sale bien. |
| 22 | **Con la vista alejada, intentar mover un objeto pequeño lo deformaba.** El cuadradito de cambiar el tamaño tapaba el objeto entero: la meta (un círculo) se quedó en 504 × 8. | El tirador del tamaño solo aparece cuando el objeto se ve lo bastante grande en la pantalla. Si no, arrastrar siempre lo mueve. |

## Difícil, largo o confuso

| # | Problema | Arreglo |
|---|---|---|
| 23 | En una pantalla de portátil, la burbuja del tutorial en el paso del código **tapaba justo la parte del editor donde se escribe**. | Si lo resaltado es grande y hay sitio a su lado, la burbuja va fuera (encima del juego), sin tapar nada. |
| 24 | El marcador «Puntos: {juego.puntos}» salía **cortado por la izquierda** en la escena («untos:»): los textos crecían por los dos lados y el marcador está pegado al borde. | Los textos nuevos crecen hacia la derecha (alineados a la izquierda) y salen en la esquina. |
| 25 | Una **cesta que solo se mueva a los lados** obligaba a ponerle Física y un suelo solo para que no subiera y bajara. | Receta nueva en la Guía: «Moverse solo a los lados (una cesta, una raqueta)». |

## Lo que funcionó bien a la primera

- El tutorial avanza aunque no se pulse Intro al poner un nombre (basta con hacer clic fuera) y aunque se pinte sin Mayús.
- Al cambiar el color de **una** nube, cambiaron **todas** sus copias; duplicar dos nubes seleccionadas con Ctrl+clic y subirlas juntas con Mayús+flechas fue un momento.
- Saltar a través de una nube desde abajo y quedarse encima; el ascensor lleva al jugador sin que se caiga ni resbale.
- Los textos con huecos: el marcador de puntos y vidas sin código, la cuenta atrás de la receta y el récord con una variable del evento.
- Arrastrar la plantilla desde el panel Proyecto para poner copias.

## Queda por mejorar (ideas, no arreglado)

- «Añadir» pone el objeto en el centro de lo que se ve. Con la vista alejada o movida, ese centro puede quedar **debajo del suelo**, y el jugador cae al vacío al empezar. Se ve enseguida en la escena, pero se podría avisar.

---

# Prueba de principiante de la noche (bloque 7)

Tres juegos de géneros que no se habían probado antes, usando sobre todo lo nuevo de la noche. Se hicieron, se jugaron y se **borraron** al acabar.

- **a) «La aldea»** (diálogos con personajes): Ana te pide buscar su llave con un `dialogo` con opciones. Hay datos del juego con valor inicial (`juego.mision`), una mascota que te sigue sin código (comportamiento «seguir»), un mensaje `enviar("abrir_puerta")` / `cuando recibo`, `animar` y `sonido.efecto`.
- **b) «Laberinto»** (enemigos que persiguen): un mapa de casillas con pasillos y un fantasma con el comportamiento «perseguir» (sin código) que rodea las paredes. Además, un `rayo` para que te «vea», monedas, `escena.reiniciar()` al tocarte y un `dialogo` al llegar a la salida.
- **c) «Estrellas»**, hecho **solo con bloques**, arrastrando en el editor de verdad. El jugador se mueve con las flechas y recoge estrellas que caen y que crea otro objeto cada segundo. Se probó con una orden en la consola (`juego.puntos` → 1).

## Qué se encontró y se arregló

| # | Problema | Arreglo |
|---|---|---|
| 1 | El script nuevo de un objeto dice «quita los # de estas dos líneas» para moverse. En bloques, eso son dos notas que no se pueden «quitar»: no se entiende qué hacer. | El texto dice también cómo hacerlo con bloques: «o, en bloques, arrastra *cuando cada fotograma* y *moverme con las flechas*». |
| 2 | Al arrastrar un evento nuevo (todavía vacío), en Problemas sale «el bloque está vacío o le falta **sangría**». Con bloques no hay sangría: el mensaje despista. | La pista añade: «(Si usas bloques: arrastra algún bloque dentro de este.)». |
| 3 | Un script con `cuando` que todavía no estaba puesto en ningún objeto se trataba como script de funciones: su `yo` daba error y **no dejaba ejecutar** el juego. Lo encontró la prueba de rendimiento, pero le pasa a cualquiera que crea un script antes de ponerlo en su objeto. | Solo es de funciones el script que no tiene ningún `cuando`. El otro solo avisa: «este script no está puesto en ningún objeto, así que no se ejecuta». |

## Lo que funcionó bien a la primera

- Los diálogos con opciones paran el juego: el héroe no se mueve mientras lee, y la tecla que cierra el diálogo no llega al juego.
- El fantasma encuentra el camino por el laberinto solo con el desplegable «perseguir» del inspector.
- El perro que te sigue no necesita ni una línea de código.
- Con bloques, el código que se escribe es el mismo que se escribiría a mano, y los errores se entienden.
- La variable que se crea y no se usa sale como aviso, no como error.

## Queda por mejorar (ideas, no arreglado)

- Un objeto que se convierte en plantilla conserva el `mostrar("Hola, soy ...")` del script nuevo: con muchas copias, la consola se llena. Se podría quitar esa línea al hacer la plantilla, o no ponerla en las plantillas.
- `cuando toco` solo avisa al **empezar** a tocar: para volver a hablar con alguien hay que apartarse y volver. Es lo esperado, pero podría existir «cuando pulso una tecla al lado de…».

---

# Cuarta prueba: la versión 1.1 (lo nuevo)

Otra vez en el lugar de alguien de 12 años que no sabe programar ni inglés,
pero esta vez usando sobre todo **lo nuevo de la 1.1**: los dibujos y sonidos
listos, las plantillas, los controles de interfaz, las pantallas listas, los
editores de sonido y de música, los varios jugadores y los bloques nuevos.

Hice cuatro juegos, en el editor de verdad (un navegador automático que pulsa
los mismos botones, arrastra los mismos bloques y escribe lo mismo que una
persona):

- **a) Solo con bloques y sin escribir nada:** un héroe que coge gemas con un
  contador en pantalla y un fantasma que lo persigue. Dibujos y sonidos
  listos, bloques arrastrados, el dato del juego y el contador desde el
  inspector, y el enemigo con «Comportamiento».
- **b) Para dos jugadores:** dos personajes manejados cada uno con sus teclas
  (sin código), pantalla dividida, un sonido hecho con el generador, una
  canción del editor de música y las pantallas listas (menú, opciones,
  créditos, puntuaciones, fin y pausa).
- **c) A partir de una plantilla (Naves):** cambiando nombres, números y
  dibujos, y escribiendo código con el autocompletado.
- **d) Una aventura escrita desde cero:** barra de vida, inventario, luces y
  oscuridad, cuerdas y diálogos con opciones. Aquí probé además unas 85
  formas de equivocarse con los comandos nuevos.

Los cuatro juegos funcionaron al final y **se borraron** (nunca se guardaron
en el proyecto). Lo que queda son los tests: `pruebas/principiante4.test.ts`
(30 tests) y dos pruebas en `pruebas-navegador/editor.mjs` («principiante 4»).

## Fallos (cosas que no funcionaban)

| # | Problema | Arreglo |
|---|---|---|
| 1 | **Al abrir una plantilla (o cualquier proyecto con imágenes), la vista de la escena se quedaba vacía**: solo el fondo. Si una imagen aún no había cargado al dibujar, el lienzo se quedaba desplazado para siempre. | Cada objeto se dibuja de forma que, si falla, el lienzo queda como estaba. Al cargar la imagen, se ve. |
| 2 | **Los bloques de la interfaz no estaban en la paleta.** `yo.valor`, `yo.opciones`, `yo.elegido`… tenían bloque, pero la categoría Control no enseñaba los bloques de «dato = valor»: no había forma de encontrarlos. | Categoría nueva **«Interfaz»** con todo lo de barras, listas, ventanas, inventario y puntuaciones. Un test comprueba que TODOS los bloques están en la paleta. |
| 3 | **Una barra con la vida del jugador no se podía hacer sin código.** En «dato», `buscar("Heroe").vida` daba «no entiendo el símbolo \»: las comillas no valían dentro de un dato (ni de un hueco de un texto del inspector). | Ya valen. Y si se escribe `Heroe.vida`, el inspector lo convierte solo en `buscar("Heroe").vida`. |
| 4 | **Cambiar el nombre de un objeto o de una plantilla rompía el juego sin avisar.** Con la plantilla Naves: al llamar «Cohete» a la nave, `cuando toco Nave` dejaba de saltar y no salía ningún error. | Al renombrar se cambia también donde se le nombra: `cuando toco X`, `buscar("X")`, `crear("X")`, `contar("X")`…, a quién sigue la cámara, a quién persigue un enemigo y el centro de un minimapa. No se toca `yo.imagen = "x"` aunque la imagen se llame igual. Si quedan más objetos de ese tipo, no se cambia nada. |
| 5 | **El enemigo con «Comportamiento» no perseguía a nadie**: perseguía a «Jugador», que no existía (el personaje se llamaba Heroe), y no avisaba. | Persigue al objeto que se maneja (el que se llama Jugador, o el que usa las flechas o los controles de un jugador), se llame como se llame. |

## Difícil, largo o confuso

| # | Problema | Arreglo |
|---|---|---|
| 6 | Al añadir tres dibujos listos seguidos, **quedaban uno encima de otro**: solo se veía el último. | Cada uno va a un sitio libre: el centro, a su derecha, a su izquierda, debajo… |
| 7 | Los objetos se llamaban como la imagen, en minúscula (`gema`), y los demás objetos van con mayúscula (`Cuadrado`, `Texto`). | `Gema`, `Gema2`… La imagen sigue siendo `gema`. |
| 8 | En un proyecto en blanco, los dibujos de 16×16 **se veían borrosos**. | Al añadir el primero a un proyecto sin imágenes se activan los «píxeles nítidos» (y se avisa). Si ya había imágenes, no se toca. |
| 9 | Al hacer varias cosas seguidas, **los avisos se amontonaban** y tapaban medio inspector. | Como mucho tres a la vez. |
| 10 | Los bloques salían con nombres de ejemplo que no existen: «reproducir el sonido "salto"», «crear "Bala"», «cuando toco Moneda»… Soltarlos daba un error. | Salen con lo que hay en el proyecto: su primer sonido, su plantilla, otra escena, un objeto de la escena. |
| 11 | Un contador o una barra nuevos aparecían **en el centro, encima del jugador**. | Los marcadores van arriba a la izquierda (como los textos) y el minimapa arriba a la derecha; si hay otro, debajo. |
| 12 | En «dato» había que escribir `juego.puntos` de memoria. | El campo ofrece los datos del juego y las propiedades de los objetos. Si se escribe solo `puntos`, vale. |
| 13 | En «dato» de una barra, `yo.vida` no daba error hasta jugar, y el error hablaba de «una función vida()». | Se avisa antes de jugar: «'yo' es este mismo objeto… 'vida' es de 'Heroe': buscar("Heroe").vida». |
| 14 | `juego.puntos += 1` en bloques, sin haber creado el dato: la pista solo decía cómo arreglarlo con código. | La pista dice también cómo hacerlo sin código: fondo de la escena > Datos del juego > «+ Nuevo dato». |
| 15 | Después de añadir las pantallas listas, **la ventana de pausa tapaba el centro de la escena en el editor** (justo donde están los personajes). | La pausa empieza sin verse. En el editor, lo que empieza sin verse se dibuja muy clarito (y algo más al seleccionarlo): se sabe que está, pero no tapa. |

## Errores al escribir con lo nuevo: mensajes que no ayudaban

| Lo que escribió | Pista nueva |
|---|---|
| `jugador(2).x` | No existe la función 'jugador'. Los controles de cada jugador se leen con 'controles': `controles(2).x` |
| `al empezar:` · `al tocar Moneda:` · `al pulsar espacio:` | Los eventos empiezan por 'cuando': `cuando empieza:` · `cuando toco Moneda:` · `cuando se pulsa "espacio":` |
| `buscar("Inventario").meter(llave)` | Si es un nombre (un texto), va entre comillas: `"llave"` |
| `yo.letra = pixel` · `yo.forma = estrella` · `yo.texto = Hola` | ¿Querías escribir "pixel" entre comillas? · Si es un texto, va entre comillas: "Hola" |
| `sonido.reproducir("pum")` | «No existe ningún sonido llamado» (antes: «ninguna sonido llamada»), y dónde conseguir uno si el proyecto no tiene ninguno. |
| `yo.luz = 200` | 'luz' enciende o apaga: `yo.luz = verdadero`. El tamaño es `yo.radioLuz = 200` |
| `escena.camaraDe(2).seguir("Llave")` | Si "Llave" es el nombre del objeto, búscalo: `buscar("Llave")` |

Lo demás que probé ya daba un mensaje claro: `controles(5)`,
`controles(1).pulsado("saltar")`, `pantalla.dividir(5)`,
`musica.intensidad = 5`, `junta.cuerda(yo, "Meta")`,
`puntuaciones.guardar(100, "Ana")`, `dibujar.poligono([0, 0, 10, 10])`,
`escena.oscuridad = 80`, `yo.mezcla = "brillo"`, un parámetro llamado `y`…

## Lo que no se ha cambiado

- **`juego.puntos += 1` sin crear el dato sigue siendo un error** (no empieza
  solo en 0). Empezar en 0 escondería las erratas (`juego.puntso += 1`
  contaría en otro sitio sin avisar). El error ahora dice cómo crearlo con y
  sin código.
- **`sonido.volumen = 50`** no da error (se queda en el máximo). Quien viene
  de pensar en «de 0 a 100» oye el sonido igualmente.
