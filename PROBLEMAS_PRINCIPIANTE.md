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
