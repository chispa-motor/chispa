# Novedades de Chispa 1.3

Chispa 1.3 trae la **primera persona**: un juego visto desde arriba se puede
mirar «desde dentro», como en los juegos de laberintos y pasillos de los años
90. No es otro tipo de juego ni otro editor: el mapa de casillas, los objetos,
la física, los caminos y los sonidos son los de siempre. Todo lo que hiciste
con la 1.0, la 1.1 y la 1.2 **sigue funcionando igual**.

En números: de **434 a 464 comandos**, todos con su ayuda, su autocompletado,
su ficha en el manual, su bloque y su ejemplo probado.

> Salió de hacer un juego entero con Chispa y con el editor, como lo haría
> cualquiera: «Arena Cero». Lo que faltaba para hacerlo se fue añadiendo al
> motor como comandos generales: está contado en
> [FALTABA_EN_EL_MOTOR.md](FALTABA_EN_EL_MOTOR.md) («Lo que faltaba para Arena
> Cero»). Lo de la versión anterior está en [NOVEDADES_1.2.md](NOVEDADES_1.2.md).

## Ver el juego desde dentro

- **`vista3d.ver(yo)`**: el mundo se pinta desde los ojos de ese objeto. Las
  casillas sólidas del mapa son paredes (con la imagen de su tipo), las que no
  lo son son baldosas del suelo, y los objetos con dibujo se ven de pie,
  mirando siempre a quien mira, más pequeños cuanto más lejos.
  `vista3d.quitar()` vuelve a la vista normal.
- **El ambiente**: `vista3d.suelo`, `vista3d.techo`, `vista3d.cielo`,
  `vista3d.pared` y `vista3d.niebla`.
- **La mirada**: `vista3d.campo` (cuánto se ve a lo ancho), `vista3d.altura`,
  `vista3d.inclinacion` (mirar arriba y abajo) y `vista3d.brillo` (destellos).
- **`yo.elevacion`**: lo que flota o vuela (un dron, una bala).
- **`vista3d.enPantalla(sitio)`** y **`vista3d.seVe(sitio)`**: dónde cae en la
  pantalla un punto del mundo, y si se ve o lo tapa una pared.
- **Los efectos** (`efecto.chispas`, `explosion`, `golpe`, `texto`...) se ven
  en su sitio también en primera persona.

## Puertas

Un tipo de casilla puede ser una **puerta** (en el editor: «es una puerta»).
Cerrada es una pared; abierta, se pasa. `mapa.abrirPuerta(columna, fila)`,
`mapa.cerrarPuerta`, `mapa.puertaAbierta` y `mapa.esPuerta`. La física, los
caminos (`yo.irHacia`), los rayos y las luces lo saben. `mapa.solidoEn(x, y)`
dice si en un punto hay una pared de verdad.

## Suelos a distintas alturas y rampas

Un tipo de casilla que no es sólida puede tener el **suelo levantado** (una
tarima) o ser una **rampa** (en el editor: «altura del suelo» y «rampa»). En
primera persona se ven a su altura, tapan lo que queda detrás y quien mira sube
y baja con el suelo que pisa. Un escalón alto es como una pared: se sube por
la rampa. Lo saben la física y los caminos. `mapa.alturaEn(x, y)` dice a qué
altura está el suelo en un punto.

## Ratón, mando y rayos

- **`raton.capturado`**, con `raton.movX` y `raton.movY`: mirar con el ratón
  sin que se salga del juego.
- **`mando.comoTeclado = falso`**: la palanca deja de «pulsar las flechas»,
  para poder usarla para andar de lado mientras las flechas giran. Los
  diálogos y los menús se siguen manejando con el mando.
- **`rayo(desde, direccion, largo, atraviesa)`**: el cuarto dato dice qué se
  salta el rayo ("solidos" = solo se para en lo que es sólido).

## El sonido oye desde quien mira

En primera persona, `sonido.reproducirEn` y `sonido.bucleEn` suenan por el
altavoz del lado donde está la cosa **según hacia dónde se mira**, y más flojo
cuanto más lejos.

## Minimapa

- En primera persona, el control «Minimapa» pinta una **flecha** donde está
  quien mira y hacia dónde, en vez del marco de la cámara.
- **`yo.enMinimapa`**: verdadero, falso o un color para el punto de cada objeto.
- Se pinta mucho más deprisa (se repinta 15 veces por segundo, no 60).

## Para móviles lentos

- **Calidad «minima»** (`pantalla.calidad = "minima"`, y un escalón más para
  "auto"): menos píxeles de los que tiene la pantalla. Se ve más gordo, pero
  va fluido donde «baja» no llegaba.
- En «baja» y «mínima», el juego nunca pinta más píxeles que su propio tamaño.
- La vista en primera persona usa la calidad adaptable de la 1.2: 640
  columnas en alta, 480 en media, 320 en baja y 240 en mínima
  (`vista3d.columnas` para elegirlas; `vista3d.milisegundos` para medir).

## Arreglos

- Un botón táctil puesto con `tactil.mover` ya no se puede salir de la pantalla.
- Capturar el ratón ya no estropea «arrastrar para mirar» en los móviles.
- Diálogos y menús se manejan con el mando aunque no haga de teclado.
- Las barras ya no recortan en cada fotograma (era caro en móviles).

## Lo que no se puede (y conviene saber)

- El 3D es **simulado**: paredes rectas de una casilla, todas igual de altas,
  y no se puede mirar del todo hacia arriba ni hacia abajo. Los suelos
  levantados llegan como mucho a casi la mitad de la altura de una pared.
- Las tarimas no paran los disparos ni la vista (`rayo`): solo el paso.
- En **iPhone y iPad** no se puede capturar el ratón (no lo hay): se mira
  arrastrando el dedo. La dirección del sonido se nota con auriculares.
- Los fotogramas por segundo en móviles se han medido en un ordenador que se
  hace pasar por móvil, con el procesador frenado. Lo que falta por mirar en
  un aparato de verdad está en [PRUEBAS_PENDIENTES.md](PRUEBAS_PENDIENTES.md).
