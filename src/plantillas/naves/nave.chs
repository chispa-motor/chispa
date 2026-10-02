# LA NAVE del jugador: se mueve con las flechas y dispara con espacio.
variable RAPIDEZ = 380
# Segundos entre un disparo y el siguiente (mas pequeno = dispara mas rapido)
variable CADENCIA = 0.25
variable ultimoDisparo = 0

cuando empieza:
    juego.record = cargar("record", 0)
    musica.reproducir("accion")

cuando cada fotograma:
    yo.moverConFlechas(RAPIDEZ)
    # Que no se salga de la pantalla ni suba demasiado
    yo.x = limitar(yo.x, 30, pantalla.ancho - 30)
    yo.y = limitar(yo.y, 40, 260)

cuando se mantiene "espacio":
    si tiempo.total - ultimoDisparo >= CADENCIA:
        ultimoDisparo = tiempo.total
        crear("Bala", yo.x, yo.y + 30)
        sonido.reproducir("disparo", 0.5)

cuando toco Ovni:
    destruir(otro)
    efecto.explosion(yo)
    sonido.reproducir("explosion")
    escena.camara.temblar(10, 0.3)
    juego.vidas -= 1
    yo.parpadear(1)
    si juego.vidas <= 0:
        # Fin de la partida: se guarda el record y se vuelve a empezar
        si juego.puntos > juego.record:
            guardar("record", juego.puntos)
        dialogo("Fin de la partida. Puntos: " + texto(juego.puntos))
        juego.puntos = 0
        juego.vidas = 3
        escena.reiniciar()
