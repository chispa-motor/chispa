# Atascos

Cosas que se han atascado durante el desarrollo de Chispa 1.1: qué pasó, qué se hizo para que todo siga funcionando y qué queda.


## Día 4

- **El campo de texto en móviles y tabletas no abre el teclado de la pantalla.** Los navegadores solo abren ese teclado si, justo en el toque, se enfoca un campo de texto de verdad (de la página); el campo de Chispa está dibujado dentro del juego y se enfoca un fotograma después. Con teclado físico funciona todo (letras, eñes, tildes, borrar, Intro). Queda pendiente: poner un campo invisible de la página encima y enfocarlo en el mismo toque.

## Día 6

- **Los 60 fotogramas por segundo con 500 objetos no se han podido comprobar en un ordenador de verdad.** Donde se ha trabajado no hay tarjeta gráfica (el navegador de pruebas lo pinta todo con el procesador, en una máquina virtual lenta). Ahí la escena de la prueba (500 objetos con efectos, 13 luces, unas 1300 partículas) va a unos 50 por segundo; antes de los cambios iba a unos 30. Queda pendiente: abrir esa misma escena en un ordenador normal y mirar el contador de fotogramas. La prueba «rendimiento: 500 objetos con efectos» de `pruebas-navegador/editor.mjs` sirve para eso.
- **Las pruebas de rendimiento del navegador solo pasan aquí con el margen ancho** (`CI=1`, que dobla los tiempos permitidos). Con el margen normal, «rendimiento: 2000 objetos» falla en esa máquina también con el código del día 4, sin tocar: es por la lentitud de la máquina, no por un cambio. Las 45 pruebas del navegador pasan con `CI=1`. Conviene ejecutarlas una vez en un ordenador normal antes de publicar (`npm run build` y luego `node pruebas-navegador/editor.mjs`).
