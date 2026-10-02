# EL JUGADOR de un juego de plataformas.
# Anda con las flechas (o A y D) y salta con espacio o con la flecha de arriba.
# Cambia estos dos numeros para que corra o salte mas:
variable RAPIDEZ = 260
variable SALTO = 700
variable inicio = vector(0, 0)

# Salta solo si esta en el suelo (yo.saltar da verdadero si ha saltado)
funcion saltar():
    si yo.saltar(SALTO):
        sonido.reproducir("salto")

# Quita una vida y vuelve al principio. Sin vidas, se empieza de cero
funcion perderVida():
    juego.vidas -= 1
    sonido.reproducir("herida")
    escena.camara.temblar(8, 0.3)
    si juego.vidas > 0:
        yo.teletransportar(inicio)
    sino:
        dialogo("Te has quedado sin vidas. ¡A empezar otra vez!")
        juego.vidas = 3
        juego.monedas = 0
        escena.reiniciar()

cuando empieza:
    inicio = vector(yo.x, yo.y)
    musica.reproducir("aventura")

cuando cada fotograma:
    yo.moverConFlechas(RAPIDEZ)
    # Si se cae por un agujero, pierde una vida
    si yo.y < -100:
        perderVida()

cuando se pulsa "espacio":
    saltar()

cuando se pulsa "arriba":
    saltar()

cuando toco Moneda:
    destruir(otro)
    juego.monedas += 1
    sonido.reproducir("moneda")
    efecto.texto("+1", yo, "amarillo")

cuando toco pinchos:
    perderVida()

cuando toco Slime:
    # Si le cae encima lo aplasta y rebota; si lo toca de lado, pierde una vida
    si yo.velocidad.y < 0 y yo.y > otro.y + 10:
        efecto.explosion(otro, 0.6)
        destruir(otro)
        yo.velocidad.y = 450
        sonido.reproducir("golpe")
    sino:
        perderVida()

# La bandera es la meta
cuando toco Bandera:
    sonido.reproducir("ganar")
    efecto.confeti(yo)
    dialogo("¡Nivel superado! Has cogido " + texto(juego.monedas) + " monedas.")
    juego.vidas = 3
    juego.monedas = 0
    escena.reiniciar()
