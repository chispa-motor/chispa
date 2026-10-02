# UN OVNI: baja haciendo eses. Cada uno sale con su rapidez.
variable rapidez = aleatorio(80, 170)
variable vaiven = aleatorio(0, 360)

cuando cada fotograma:
    yo.y -= rapidez * delta
    yo.x += seno(tiempo.total * 150 + vaiven) * 90 * delta
    # Si llega abajo sin que le den, desaparece
    si yo.y < -40:
        destruir(yo)
