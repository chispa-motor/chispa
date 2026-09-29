# Las nubes se mueven despacio hacia la izquierda y vuelven a salir por la derecha
variable rapidez = aleatorio(8, 20)

cuando cada fotograma:
    yo.x -= rapidez * delta
    si yo.x < -100:
        yo.x = 3550
