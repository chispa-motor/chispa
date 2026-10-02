# EL JUGADOR de una aventura vista desde arriba.
# Se mueve con las flechas (o W A S D) en las cuatro direcciones.
variable RAPIDEZ = 200
variable inicio = vector(0, 0)
# El inventario de arriba a la izquierda: guarda lo que se va cogiendo
variable mochila = buscar("Inventario")

cuando empieza:
    inicio = vector(yo.x, yo.y)
    musica.reproducir("misterio")

cuando cada fotograma:
    yo.moverConFlechas(RAPIDEZ)

cuando toco Gema:
    destruir(otro)
    mochila.meter("gema")
    sonido.reproducir("moneda")

cuando toco Llave:
    destruir(otro)
    mochila.meter("llave")
    sonido.reproducir("powerup")

cuando toco Fantasma:
    juego.vidas -= 1
    sonido.reproducir("herida")
    yo.teletransportar(inicio)
    yo.parpadear(1)
    si juego.vidas <= 0:
        dialogo("Los fantasmas te han atrapado... ¡Otra vez!")
        juego.vidas = 3
        escena.reiniciar()

cuando toco Cofre:
    # El cofre solo se abre con la llave y las tres gemas
    si mochila.cuantos("llave") == 0:
        dialogo("El cofre esta cerrado. Hace falta una llave.")
    sino si mochila.cuantos("gema") < 3:
        dialogo("Dentro caben 3 gemas. Te faltan " + texto(3 - mochila.cuantos("gema")) + ".")
    sino:
        sonido.reproducir("ganar")
        efecto.confeti(otro)
        dialogo("¡Has guardado el tesoro! Fin de la aventura.")
        juego.vidas = 3
        escena.reiniciar()
