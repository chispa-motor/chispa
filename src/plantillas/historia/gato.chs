# EL GATO: espera detras del lago. Cuando el jugador lo encuentra (buscandolo
# para Ana), lo sigue hasta que se lo lleva.
variable jugador = buscar("Jugador")

cuando empieza:
    yo.ponerEtiqueta("personaje")

cuando recibo "hablar":
    si dato == yo:
        si juego.mision == 1:
            juego.mision = 2
            juego.objetivo = "Lleva el gato a Ana"
            sonido.reproducir("moneda")
            dialogo("Bigotes", "¡Miau! (Parece que quiere ir contigo)")
        sino:
            dialogo("Bigotes", "Miau.")

cuando cada fotograma:
    # Mientras la mision es llevarlo a Ana, va detras del jugador
    si juego.mision == 2 y yo.distanciaA(jugador) > 60:
        yo.moverHacia(jugador, 170)
