# Atascos

Cosas que se han atascado durante el desarrollo de Chispa 1.1: qué pasó, qué se hizo para que todo siga funcionando y qué queda.


## Día 4

- **El campo de texto en móviles y tabletas no abre el teclado de la pantalla.** Los navegadores solo abren ese teclado si, justo en el toque, se enfoca un campo de texto de verdad (de la página); el campo de Chispa está dibujado dentro del juego y se enfoca un fotograma después. Con teclado físico funciona todo (letras, eñes, tildes, borrar, Intro). Queda pendiente: poner un campo invisible de la página encima y enfocarlo en el mismo toque.
