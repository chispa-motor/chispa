# UNA BALA: sube recta y explota al tocar un ovni.
variable RAPIDEZ = 700

cuando cada fotograma:
    yo.y += RAPIDEZ * delta

cuando salgo de la pantalla:
    destruir(yo)

# Cada ovni derribado da 10 puntos
cuando toco Ovni:
    efecto.explosion(otro, 0.7)
    sonido.reproducir("explosion", 0.6)
    destruir(otro)
    juego.puntos += 10
    destruir(yo)
