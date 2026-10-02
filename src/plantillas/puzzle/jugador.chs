# EL JUGADOR de un puzle de empujar cajas.
# Se mueve de casilla en casilla con las flechas. Si delante hay una caja,
# la empuja (si detras de la caja hay sitio). Gana cuando todas las cajas
# estan sobre una marca. Con la tecla R se vuelve a empezar.
variable PASO = 48
variable mapa = buscar("Mapa")

# La caja que hay en ese punto (o nulo si no hay ninguna)
funcion cajaEn(px, py):
    para cada c en buscarTodos("Caja"):
        si distancia(c, vector(px, py)) < 10:
            devolver c
    devolver nulo

# ¿Estan todas las marcas tapadas por una caja?
funcion resuelto():
    para cada m en buscarTodos("Marca"):
        si cajaEn(m.x, m.y) == nulo:
            devolver falso
    devolver verdadero

# Intenta dar un paso hacia (dx, dy): 1 es derecha o arriba, -1 izquierda o abajo
funcion intentar(dx, dy):
    variable px = yo.x + dx * PASO
    variable py = yo.y + dy * PASO
    si mapa.casillaEn(px, py) == "pared":
        devolver falso
    variable caja = cajaEn(px, py)
    si caja != nulo:
        # Detras de la caja tiene que haber sitio: ni pared ni otra caja
        variable detrasX = px + dx * PASO
        variable detrasY = py + dy * PASO
        si mapa.casillaEn(detrasX, detrasY) == "pared" o cajaEn(detrasX, detrasY) != nulo:
            devolver falso
        caja.teletransportar(detrasX, detrasY)
        sonido.reproducir("golpe", 0.6)
    yo.teletransportar(px, py)
    juego.pasos += 1
    si resuelto():
        sonido.reproducir("ganar")
        efecto.confeti(yo)
        dialogo("¡Resuelto en " + texto(juego.pasos) + " pasos!")
        juego.pasos = 0
        escena.reiniciar()
    devolver verdadero

cuando se pulsa "derecha":
    intentar(1, 0)

cuando se pulsa "izquierda":
    intentar(-1, 0)

cuando se pulsa "arriba":
    intentar(0, 1)

cuando se pulsa "abajo":
    intentar(0, -1)

cuando se pulsa "r":
    juego.pasos = 0
    escena.reiniciar()
