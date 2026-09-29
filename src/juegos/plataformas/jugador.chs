# ───────────────────────────────────────────────
#  JUGADOR
# ───────────────────────────────────────────────
variable rapidez = 260
variable fuerzaSalto = 640
variable inicio = vector(0, 0)
variable invencible = falso

cuando empieza:
    inicio = yo.posicion
    camara.seguir(yo)

cuando cada fotograma:
    si juego.terminado:
        yo.velocidad.x = 0
        devolver

    # Izquierda / derecha (flechas o A/D)
    variable direccion = 0
    si teclado.pulsada("izquierda") o teclado.pulsada("a"):
        direccion -= 1
    si teclado.pulsada("derecha") o teclado.pulsada("d"):
        direccion += 1
    yo.velocidad.x = direccion * rapidez

    # Mirar hacia donde camina
    si direccion != 0:
        yo.voltear = direccion < 0

    # ¿Se ha caído por un agujero?
    si yo.y > 700:
        recibirGolpe()

cuando se pulsa "espacio", "arriba", "w":
    si no juego.terminado:
        yo.saltar(fuerzaSalto)

# Salto variable: si sueltas la tecla pronto, saltas menos alto
cuando se suelta "espacio", "arriba", "w":
    si yo.velocidad.y < 0:
        yo.velocidad.y = yo.velocidad.y / 2

cuando toco Moneda:
    juego.monedas += 1
    destruir(otro)

cuando toco Enemigo:
    # ¿Le caemos encima? Entonces lo aplastamos y rebotamos
    si yo.velocidad.y > 0 y yo.y < otro.y - 10:
        destruir(otro)
        yo.velocidad.y = -450
    sino:
        recibirGolpe()

cuando toco Pinchos:
    recibirGolpe()

cuando toco Bandera:
    si no juego.terminado:
        juego.terminado = verdadero
        juego.mensaje = "¡Has ganado! Monedas: " + juego.monedas + " / " + juego.monedasTotales
        esperar(4)
        escena.reiniciar()

funcion recibirGolpe():
    si invencible o juego.terminado:
        devolver
    juego.vidas -= 1

    si juego.vidas <= 0:
        juego.terminado = verdadero
        juego.mensaje = "¡Fin del juego!"
        yo.visible = falso
        yo.gravedad = 0
        yo.velocidad = vector(0, 0)
        esperar(3)
        escena.reiniciar()
        devolver

    # Volver al principio y parpadear un rato sin recibir daño
    yo.posicion = inicio
    yo.velocidad = vector(0, 0)
    invencible = verdadero
    repetir 8 veces:
        yo.visible = no yo.visible
        esperar(0.12)
    yo.visible = verdadero
    invencible = falso
