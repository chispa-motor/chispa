# EL JUGADOR de un juego de historia: anda por el pueblo con las flechas
# y habla con quien tenga cerca con la tecla espacio.
variable RAPIDEZ = 190

cuando empieza:
    musica.reproducir("aventura")
    dialogo("Un pueblo tranquilo... hasta hoy. Acercate a alguien y pulsa ESPACIO para hablar.")

cuando cada fotograma:
    yo.moverConFlechas(RAPIDEZ)

cuando se pulsa "espacio":
    # Le dice «habla» al personaje mas cercano, si esta a menos de 80 pixeles
    variable cerca = yo.masCercano("personaje", 80)
    si cerca != nulo:
        enviar("hablar", cerca)

cuando toco Pocion:
    destruir(otro)
    juego.pocion = verdadero
    sonido.reproducir("powerup")
    dialogo("Has encontrado una pocion. ¿A quien le hara falta?")
