# EL ROBOT: sabe donde esta el gato, pero solo lo dice a cambio de una pocion.
cuando empieza:
    yo.ponerEtiqueta("personaje")

# El jugador avisa con «hablar» al personaje que tiene cerca
cuando recibo "hablar":
    si dato == yo:
        hablar()

# Dice una cosa u otra segun por donde va la historia
funcion hablar():
    si juego.mision == 0:
        dialogo("Robot", "BIP. Buenos dias. Ana te estaba buscando.")
    sino si juego.pista:
        dialogo("Robot", "BIP. El gato esta detras del lago, al este.")
    sino si no juego.pocion:
        dialogo("Robot", "BIP. He visto un gato... pero me falla la memoria. Con una pocion de aceite me acordaria.")
        juego.objetivo = "Busca una pocion para el robot"
    sino:
        # Un dialogo con opciones devuelve la que se elige
        variable r = dialogo("Robot", "BIP. ¡Eso que llevas es una pocion de aceite!", ["Darsela", "Quedarmela"])
        si r == "Darsela":
            juego.pocion = falso
            juego.pista = verdadero
            juego.objetivo = "Busca al gato detras del lago"
            sonido.reproducir("powerup")
            efecto.chispas(yo)
            dialogo("Robot", "BIP BIP. ¡Ya me acuerdo! El gato esta detras del lago, al este.")
        sino:
            dialogo("Robot", "BIP. Sin aceite no hay memoria.")
