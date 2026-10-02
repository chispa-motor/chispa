# LAS OLEADAS: este objeto no se ve. Cada segundo crea un ovni arriba,
# en un sitio al azar. Cuantos mas puntos, mas ovnis salen de golpe.
cuando cada 1 segundos:
    variable cuantos = 1 + redondearAbajo(juego.puntos / 200)
    repetir minimo(cuantos, 4) veces:
        crear("Ovni", aleatorio(40, pantalla.ancho - 40), pantalla.alto + 30)
