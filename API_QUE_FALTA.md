# La API de Chispa comparada con LÖVE

LÖVE (love2d.org) es un motor 2D real y muy usado. Aquí está cada uno de sus
módulos, qué funciones tiene y qué se escribe en Chispa para hacer lo mismo.

**Cómo leer las tablas:**

- ✅ Existe en Chispa.
- 🆕 Se ha añadido esta noche (bloque 0).
- ➖ No se añade, y la columna «Por qué» lo explica.

La idea no es copiar LÖVE. LÖVE es para programadores: tú dibujas cada cosa en
cada fotograma. Chispa es para alguien de 12 años: hay objetos que ya se
dibujan, se mueven y chocan solos. Por eso muchas funciones de LÖVE en Chispa
son **una propiedad de un objeto** (`yo.color`) en vez de una función.

---

## love.graphics (dibujar)

| LÖVE | Chispa | Por qué / notas |
|---|---|---|
| `draw` (dibujar una imagen) | ✅ objetos con imagen (`yo.imagen = "nave"`) | En Chispa se dibujan solos. |
| `print`, `printf` (textos) | ✅ objetos de texto (`yo.texto`) · 🆕 `dibujar.texto()` | |
| `rectangle`, `circle`, `line` | ✅ objetos con forma · 🆕 `dibujar.rectangulo()`, `dibujar.circulo()`, `dibujar.linea()` | `dibujar.xxx` es para ver cosas mientras programas: dura un fotograma. |
| `setColor` | ✅ `yo.color` · 🆕 `animar(yo.color, "rojo", 1)` | |
| `setBackgroundColor` | 🆕 `escena.colorFondo` | |
| `translate`, `scale`, `rotate` (cámara) | ✅ `escena.camara.x / .y / .zoom`, `seguir()`, `limites()`, `temblar()` | |
| `setFont` / `newFont` | ✅ `yo.tamano` (en textos) · 🆕 `yo.tamanoLetra` | ➖ Elegir tipo de letra: con una sola letra clara no hay que decidir nada; queda como idea. |
| transparencia (`setColor` con alfa) | ✅ `yo.opacidad` · 🆕 `yo.transparencia` | `transparencia` es lo que buscaría alguien que empieza. |
| `getWidth`, `getHeight` | ✅ `pantalla.ancho`, `pantalla.alto` | |
| `arc` | 🆕 `dibujar.arco` y `dibujar.enPantalla.arco` | Salió en el juego Arena: los círculos de recarga de las habilidades. |
| `ellipse`, `polygon`, `points` | ➖ | Con rectángulos, círculos, arcos, líneas e imágenes basta para empezar. |
| `newCanvas`, `setCanvas` (dibujar en una imagen) | ➖ | Es un concepto avanzado (dibujar fuera de la pantalla). |
| `newShader`, `setShader` | ➖ | Se programan en otro lenguaje (GLSL). Demasiado para un principiante. |
| `setBlendMode`, `stencil`, `setScissor`, `setLineStyle`… | ➖ | Detalles de dibujo de bajo nivel; los objetos ya se dibujan bien solos. |
| `newQuad`, `newSpriteBatch`, `newMesh` | ➖ | Optimizaciones de bajo nivel. Las animaciones se hacen en el editor (fotogramas). |
| `push`, `pop`, `origin`, `shear`… | ➖ | En Chispa no se dibuja «a mano»: no hacen falta. |
| `getStats`, `getRendererInfo`, `getSupported`… | ➖ | Información técnica del ordenador. |

## love.audio y love.sound (sonido)

| LÖVE | Chispa | Por qué / notas |
|---|---|---|
| `newSource` + `play` | ✅ `sonido.reproducir("salto")` (los sonidos se importan en el editor) | |
| `Source:setVolume` | 🆕 `sonido.reproducir("salto", 0.5)` · ✅ `sonido.volumen`, `musica.volumen` | |
| `Source:setPitch` (tono) | 🆕 `sonido.reproducir("salto", 1, 1.5)` | Un tono un poco al azar hace que los golpes no suenen repetidos. |
| `Source:setLooping` | 🆕 `sonido.bucle("motor")` · ✅ `musica.reproducir()` (siempre en bucle) | |
| `Source:stop` · `love.audio.stop` | ✅ `sonido.parar("nombre")`, `sonido.parar()`, `musica.parar()` | |
| `Source:pause` · `love.audio.pause` | 🆕 `sonido.pausar()`, `sonido.seguir()`, `musica.pausar()`, `musica.seguir()` | Los efectos se pausan todos a la vez: pausar un solo «pum» de medio segundo no tiene sentido. |
| `Source:isPlaying` | 🆕 `sonido.sonando("motor")` | |
| fundidos (a mano con `setVolume`) | 🆕 `musica.reproducir("tema", 2)`, `musica.parar(2)` | |
| generar sonido (`newSoundData`) | ✅ `sonido.tono(440, 0.2)` | Pitidos sin archivos. |
| `Source:seek`, `tell` | ➖ | Saltar a un punto de un sonido casi nunca hace falta en un juego sencillo. |
| sonido 3D (`setPosition`, `setOrientation`, efectos, `getDistanceModel`…) | ➖ | Sonido en el espacio 3D: fuera de lo que necesita un juego 2D sencillo. |
| `newQueueableSource`, `getRecordingDevices` | ➖ | Sonido generado en directo y micrófono: avanzado. |
| love.sound (`newDecoder`, `newSoundData`) | ➖ | Leer archivos de sonido por dentro: lo hace el editor al importar. |

## love.keyboard (teclado)

| LÖVE | Chispa | Por qué / notas |
|---|---|---|
| `isDown` | ✅ `teclado.pulsada("a")` · ✅ `cuando se mantiene "a":` | |
| `love.keypressed` | ✅ `teclado.sePulso("a")`, `cuando se pulsa "a":` · 🆕 `teclado.algunaSePulso()` | |
| `love.keyreleased` | ✅ `teclado.seSolto("a")`, `cuando se suelta "a":` | |
| `love.textinput` | 🆕 `teclado.ultima` | Para escribir un nombre letra a letra. |
| teclas pulsadas ahora | 🆕 `teclado.pulsadas` | |
| `isScancodeDown`, `getScancodeFromKey`, `getKeyFromScancode` | ➖ | Diferencia técnica entre la tecla física y la letra; los nombres en español ya lo resuelven. |
| `setKeyRepeat`, `hasKeyRepeat` | ➖ | Chispa ignora la repetición a propósito (mantener pulsada una tecla no dispara el evento 30 veces). |
| `setTextInput`, `hasScreenKeyboard` | ➖ | Teclado en pantalla del móvil para escribir texto. Los controles táctiles (bloque 4) ponen botones, no teclado: para un nombre, mejor elegir con botones. |

## love.mouse (ratón)

| LÖVE | Chispa | Por qué / notas |
|---|---|---|
| `getPosition`, `getX`, `getY` | ✅ `raton.x`, `raton.y`, `raton.posicion` (en el mundo, con la cámara ya tenida en cuenta) | |
| `isDown` | ✅ `raton.pulsado("izquierdo")` | |
| `love.mousepressed`, `mousereleased` | ✅ `raton.sePulso()`, `raton.seSolto()`, `cuando hago clic:`, `cuando hago clic encima:` | |
| `love.wheelmoved` | ✅ `raton.rueda` | |
| (qué hay debajo del ratón) | 🆕 `raton.objeto` · ✅ `yo.ratonEncima` | LÖVE no lo tiene: hay que calcularlo. En Chispa es lo que se quiere casi siempre. |
| (arrastrar cosas) | 🆕 `yo.arrastrable = verdadero`, `yo.arrastrando` | Puzles, inventarios, juegos de ordenar, sin código. |
| `setVisible`, `isVisible` | 🆕 `raton.visible` | |
| `setCursor`, `newCursor`, `getSystemCursor` | ➖ | Para poner una mira propia: `raton.visible = falso` y un objeto que siga al ratón. |
| `setGrabbed`, `setRelativeMode`, `setPosition` | ➖ | Atrapar el ratón en la ventana: lo bloquean los navegadores sin permiso, y confunde. |

## love.joystick (mandos) y love.touch (táctil)

| LÖVE | Chispa | Por qué / notas |
|---|---|---|
| `getJoysticks`, `isGamepadDown`, `getGamepadAxis`… | 🆕 módulo `mando` (conectado, ejeX/ejeY, ejeDerechoX/Y, pulsado, sePulso, vibrar) | Además el mando hace de teclado: la cruceta son las flechas y A es espacio. |
| `love.touch.getTouches`, `getPosition` | 🆕 botones táctiles automáticos en el juego exportado · ✅ un toque cuenta como clic | No hay varios dedos a la vez desde el código: los botones en pantalla cubren lo que se necesita. |

## love.math (matemáticas)

| LÖVE / Lua | Chispa | Por qué / notas |
|---|---|---|
| `random(min, max)` | ✅ `aleatorio(1, 6)` (enteros) · 🆕 `aleatorioDecimal(0.5, 1.5)` | |
| elegir de una lista | ✅ `elegir(lista)` · ✅ `probabilidad(30)` · 🆕 `lista.mezclar()` | |
| `noise` (ruido de Perlin) | 🆕 `ruido(x, y)` | Para nubes, terrenos y temblores naturales. |
| `math.floor`, `math.ceil` | 🆕 `redondearAbajo()`, `redondearArriba()` · ✅ `redondear(n, decimales)` | |
| `math.abs`, `min`, `max`, `sqrt` | ✅ `absoluto`, `minimo`, `maximo`, `raiz` | |
| `math.sin`, `cos`, `tan` | ✅ `seno`, `coseno` · 🆕 `tangente` (en GRADOS, no radianes) | Los grados son lo que se aprende en el colegio. |
| `math.atan2` (ángulo) | 🆕 `angulo(a, b)`, `yo.anguloA(b)` | |
| `math.pi`, `^` | 🆕 `pi`, `potencia(2, 3)` | |
| limitar (`math.max(min, math.min(max, v))`) | 🆕 `limitar(v, 0, 100)` | Lo que siempre se escribe mal a mano. |
| interpolar (`a + (b - a) * t`) | 🆕 `interpolar(a, b, t)` (números y vectores) | |
| signo | 🆕 `signo(n)` | |
| `newRandomGenerator`, `setRandomSeed` | ➖ | Números al azar repetibles: útil para expertos (mundos generados); para empezar, basta con aleatorio(). |
| `newBezierCurve`, `triangulate`, `isConvex` | ➖ | Geometría avanzada. Para caminos curvos ya está el Recorrido del editor. |
| `newTransform`, `gammaToLinear`, `linearToGamma`, `compress` | ➖ | Detalles técnicos de gráficos y datos. |

## love.physics (física)

| LÖVE | Chispa | Por qué / notas |
|---|---|---|
| `newWorld`, `newBody`, `newFixture`, formas | ✅ componente Física y Colisión en el editor | Chispa tiene su propia física, pensada para plataformas y vista desde arriba. |
| `Body:setLinearVelocity`, `applyLinearImpulse` | ✅ `yo.velocidad`, `yo.empujar(x, y)` (impulso) | |
| gravedad, rozamiento, rebote, masa | ✅ `yo.gravedad`, `yo.rozamiento`, `yo.rebote`, `yo.masa`, `escena.gravedad` | |
| contactos (`beginContact`, `endContact`) | ✅ `cuando toco X:`, `cuando dejo de tocar X:` · 🆕 `yo.tocando("X")` | |
| `getDistance` | ✅ `distancia(a, b)`, `yo.distanciaA(b)` | |
| `World:queryBoundingBox` | 🆕 `yo.cercanos(radio)`, `yo.masCercano("Tipo")` | |
| `World:rayCast` | 🆕 `rayo(desde, direccion, largo)` | Objetos con colisión y casillas sólidas. |
| juntas (`newRevoluteJoint`, `newRopeJoint`, `newWeldJoint`…) | 🆕 (solo la más útil) `yo.pegarA(otro)` | Péndulos, cuerdas y muelles son física avanzada; pegar una cosa a otra (una espada al jugador) es lo que se usa siempre. |
| rotación física (`setAngularVelocity`, `setFixedRotation`) | ➖ | En Chispa los objetos con física no giran solos: así un personaje nunca se cae de lado. |

## love.timer (tiempo)

| LÖVE | Chispa | Por qué / notas |
|---|---|---|
| `getDelta` | ✅ `delta`, `tiempo.delta` | |
| `getTime` | ✅ `tiempo.total` | |
| `getFPS` | 🆕 `tiempo.fps` | |
| `sleep` | ✅ `esperar(1)` | En Chispa no congela el juego: solo ese evento espera. |
| temporizadores (librerías como hump.timer) | ✅ `cuando cada 2 segundos:`, `cuando pasen 3 segundos:` · 🆕 `cronometro()` | |
| velocidad del tiempo (a mano) | ✅ `tiempo.escala` · 🆕 `tiempo.pausar()`, `tiempo.seguir()`, `tiempo.pausado`, `tiempo.camaraLenta(0.3, 1)` | |
| `getAverageDelta`, `step` | ➖ | Detalles del bucle del motor. |

## love.window (ventana)

| LÖVE | Chispa | Por qué / notas |
|---|---|---|
| `setFullscreen`, `getFullscreen` | 🆕 `pantalla.completa` | |
| `getDimensions` | ✅ `pantalla.ancho`, `pantalla.alto` (y el tamaño del juego en el editor) | |
| `setTitle` | ✅ el nombre del proyecto (se pone en el editor) | |
| `setMode`, `setPosition`, `maximize`, `minimize`, `setVSync`, `setIcon`, `showMessageBox`, `getDisplayCount`… | ➖ | En un navegador, la ventana es del navegador: un juego web no puede moverla ni cambiarla de tamaño. |

## love.system, love.event y love.filesystem

| LÖVE | Chispa | Por qué / notas |
|---|---|---|
| `getOS` | 🆕 `sistema.movil` | Lo que de verdad importa: ¿móvil (táctil) u ordenador? |
| `openURL` | 🆕 `sistema.abrirWeb("https://...")` | Solo direcciones web (http o https). |
| `setClipboardText`, `getPowerInfo`, `getProcessorCount` | ➖ | Casi nunca se usan en un juego, y los navegadores piden permiso para algunas. |
| `love.event.quit` | ✅ `escena.cambiar(...)`, `escena.reiniciar()` | Un juego web no se «cierra»: se cambia de escena. |
| `love.load` | ✅ `cuando empieza:` | |
| `love.update` | ✅ `cuando cada fotograma:` | |
| `love.draw` | ✅ los objetos se dibujan solos · 🆕 `dibujar.xxx` | |
| `love.focus`, `love.resize`, `love.visible` | ➖ | El juego se pausa solo al cambiar de pestaña; el tamaño lo ajusta el motor. |
| `filesystem.write`, `read`, `remove` (guardar partidas) | ✅ `guardar("clave", valor)`, `cargar("clave", 0)`, `borrarGuardado("clave")` | Se guarda en el navegador, sin archivos ni rutas. |
| `getDirectoryItems`, `createDirectory`, `mount`… | ➖ | Un juego web no puede ver los archivos del ordenador (y es mejor así). |

## love.image, love.font, love.data, love.thread, love.video

| LÖVE | Chispa | Por qué / notas |
|---|---|---|
| love.image (`newImageData`, leer píxeles) | 🆕 editor de pixel art (bloque 2) | Dibujar sprites se hace en el editor, no con código. |
| love.font (`newRasterizer`, `newGlyphData`…) | ➖ | Cómo se fabrican las letras por dentro. |
| love.data (`compress`, `encode`, `hash`) | ➖ | Datos binarios y códigos: no hacen falta para hacer juegos. |
| love.thread | ➖ | Varios hilos del procesador: muy avanzado. Chispa ya tiene «hilos» sencillos (cada evento con `esperar`). |
| love.video | ➖ | Poner vídeos queda fuera de un motor para empezar. |

---

## Lo que Chispa tiene y LÖVE no (porque viene de Scratch, GDevelop, Godot y Roblox)

| Idea | De dónde viene | En Chispa |
|---|---|---|
| Objetos que se dibujan, se mueven y chocan solos | Scratch (objetos), Godot (nodos), Roblox (Parts) | ✅ el editor y los componentes |
| Animar valores suavemente | Roblox (TweenService), Godot (Tween) | 🆕 `animar(yo.tamano, 2, 0.5, "rebote")`, `yo.irA(x, y, segundos)` |
| Mover hacia donde mira | Scratch («mover 10 pasos») | 🆕 `yo.avanzar(10)` |
| Ir a un sitio, apuntar hacia algo | Scratch («ir a», «apuntar hacia») | 🆕 `yo.teletransportar()`, ✅ `yo.mirarA()`, 🆕 `yo.rotarHacia()` |
| Mostrar y esconder, ir al frente | Scratch («mostrar», «esconder», «ir a la capa delantera») | 🆕 `yo.aparecer()`, `yo.ocultar()`, `yo.ponerDelante()`, `yo.ponerDetras()` |
| Clonar | Scratch («crear clon de mí mismo») | 🆕 `yo.clonar()`, `clonar(objeto)` |
| Etiquetas y grupos | Godot (grupos), Roblox (CollectionService), GDevelop (grupos de objetos) | 🆕 `yo.ponerEtiqueta()`, `buscarConEtiqueta()`, `cuando toco etiqueta:` |
| Padre e hijos | Godot (árbol de nodos), Roblox (Parent) | 🆕 `yo.pegarA(otro)`, `yo.padre`, `yo.hijos` |
| Objetos cercanos, el más cercano | GDevelop (condiciones de distancia) | 🆕 `yo.cercanos()`, `yo.masCercano()` |
| Parpadear al recibir daño | GDevelop (comportamiento «Flash») | 🆕 `yo.parpadear(1)` |
| Arrastrar con el ratón | GDevelop (comportamiento «Draggable») | 🆕 `yo.arrastrable = verdadero` |
| Contar objetos | Scratch, GDevelop | 🆕 `contar("Enemigo")` |
| Textos: dividir, reemplazar, trozos | Todos (Lua: `string.gsub`, `sub`) | 🆕 `texto.dividir()`, `reemplazar()`, `trozo()`, `contiene()`… |
| Listas: insertar, ordenar, barajar | Scratch (listas), Lua (`table.insert`, `table.sort`) | 🆕 `lista.insertar()`, `ordenar()`, `mezclar()`, `invertir()`, `sublista()`… |
| Recorrer con la posición | Lua (`ipairs`), Python (`enumerate`) | 🆕 `para cada i, x en lista:` |

## Cuánto de LÖVE cubre Chispa

Las tablas de arriba tienen **98 filas**: cada una es una función de LÖVE o
un grupo de funciones que hacen lo mismo. Se cuentan con un pequeño script
sobre este mismo archivo, así que el número no es a ojo:

| | Filas | % |
|---|---:|---:|
| ✅ / 🆕 Chispa lo tiene | 69 | 70 % |
| ⏳ Llega en otro bloque de esta noche | 0 | 0 % |
| ➖ Se deja fuera a propósito (explicado en su fila) | 29 | 30 % |

Casi todo lo que se deja fuera es de bajo nivel, o cosas que un juego web no
puede hacer: shaders, lienzos, hilos, datos binarios, archivos del ordenador,
mover la ventana o sonido 3D.

Lo que falta y sí podría servirle a un principiante:

- números al azar con semilla (para mundos que se repiten);
- elegir el tipo de letra;
- elipses y polígonos (los arcos ya están);
- juntas físicas de cuerda y de muelle.
