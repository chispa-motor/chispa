# Atascos

Cosas que se han atascado durante el desarrollo de Chispa 1.1: qué pasó, qué se hizo para que todo siga funcionando y qué queda.


## Día 4

- **(Resuelto en la 1.2, bloque 1; falta comprobarlo en un aparato de verdad: ver `PRUEBAS_PENDIENTES.md`.)** **El campo de texto en móviles y tabletas no abre el teclado de la pantalla.** Los navegadores solo abren ese teclado si, justo en el toque, se enfoca un campo de texto de verdad (de la página); el campo de Chispa está dibujado dentro del juego y se enfoca un fotograma después. Con teclado físico funciona todo (letras, eñes, tildes, borrar, Intro). Queda pendiente: poner un campo invisible de la página encima y enfocarlo en el mismo toque.

## Día 6

- **Los 60 fotogramas por segundo con 500 objetos no se han podido comprobar en un ordenador de verdad.** Donde se ha trabajado no hay tarjeta gráfica (el navegador de pruebas lo pinta todo con el procesador, en una máquina virtual lenta). Ahí la escena de la prueba (500 objetos con efectos, 13 luces, unas 1300 partículas) va a unos 50 por segundo; antes de los cambios iba a unos 30. Queda pendiente: abrir esa misma escena en un ordenador normal y mirar el contador de fotogramas. La prueba «rendimiento: 500 objetos con efectos» de `pruebas-navegador/editor.mjs` sirve para eso.
- **Las pruebas de rendimiento del navegador solo pasan aquí con el margen ancho** (`CI=1`, que dobla los tiempos permitidos). Con el margen normal, «rendimiento: 2000 objetos» falla en esa máquina también con el código del día 4, sin tocar: es por la lentitud de la máquina, no por un cambio. Las 45 pruebas del navegador pasan con `CI=1`. Conviene ejecutarlas una vez en un ordenador normal antes de publicar (`npm run build` y luego `node pruebas-navegador/editor.mjs`).

## Arena Cero (Chispa 1.3)

- **Los fotogramas por segundo «en móvil» no son de un móvil.** No hay ningún aparato de verdad donde se ha trabajado, ni tarjeta gráfica: el navegador de pruebas pinta con el procesador. Lo que se ha medido es un Chromium que se hace pasar por móvil (pantalla, toques) con el procesador frenado ×4 (móvil normal), ×6 (móvil pequeño y lento) y ×3 (tableta). Ahí, el juego exportado da 55-60, 40-44 y 57-60 fps andando, y 57, 33-40 y 57 en la pelea con el jefe. En un móvil de verdad puede ir mejor (tiene tarjeta gráfica para estirar la imagen) o peor (procesador más lento que ×6). Queda pendiente: ver el contador (Ajustes > Ver fps) en un Android de gama baja. Está en `PRUEBAS_PENDIENTES.md`.
- **Casi la mitad del tiempo de cada fotograma en el navegador de pruebas no es del juego**: es el navegador estirando y componiendo la imagen sin tarjeta gráfica («(program)» en el perfil). Por eso lo que más ayudó no fue pintar más deprisa sino pintar menos píxeles (calidad «mínima», tope del lienzo) y menos veces (minimapa).
- **El reto (parte 10) entró, pero más pequeño de lo que se probó primero.** Con una tarima grande en mitad de la sala del jefe, el móvil lento simulado se quedaba en 27-33 fps en esa pelea (justo en el límite de 30). Se quitó esa tarima (el Núcleo vuelve a estar en el suelo) y se dejaron las dos galerías con rampa de los lados y la tarima con rampa de la armería del nivel 1: 33-40 fps. Las alturas cuestan por los píxeles que ocupan en pantalla: conviene no poner tarimas grandes en las escenas más cargadas.
- **El perfil dice que lo que más cuesta es pintar el suelo y el techo, y no se ha podido bajar mucho más.** Con números enteros se ganó un 20 %. El resto es lo que tarda el navegador en escribir cada píxel; solo se arregla pintando menos píxeles (que es lo que hace la calidad adaptable).

