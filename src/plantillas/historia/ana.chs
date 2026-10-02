# ANA: ha perdido a su gato. Da la mision y la termina.
# juego.mision cuenta por donde va la historia:
#   0 = aun no has hablado con ella · 1 = buscas al gato
#   2 = el gato te sigue · 3 = fin
cuando empieza:
    yo.ponerEtiqueta("personaje")

cuando recibo "hablar":
    # El mensaje les llega a todos: solo contesta a quien va dirigido
    si dato == yo:
        hablar()

funcion hablar():
    si juego.mision == 0:
        variable r = dialogo("Ana", "¡Mi gato Bigotes se ha escapado! ¿Me ayudas a buscarlo?", ["Claro", "Ahora no"])
        si r == "Claro":
            juego.mision = 1
            juego.objetivo = "Busca al gato de Ana"
            dialogo("Ana", "¡Gracias! Preguntale al robot del pueblo: lo ve todo.")
        sino:
            dialogo("Ana", "Vaya... Si cambias de idea, aqui estare.")
    sino si juego.mision == 1:
        dialogo("Ana", "¿Aun nada? El robot tiene que saber algo.")
    sino si juego.mision == 2:
        juego.mision = 3
        juego.objetivo = "¡Mision cumplida!"
        sonido.reproducir("ganar")
        efecto.confeti(yo)
        dialogo("Ana", "¡Bigotes! ¡Lo has encontrado! Muchisimas gracias.")
        dialogo("FIN. Ahora cambia la historia: abre los scripts y escribe la tuya.")
    sino:
        dialogo("Ana", "Bigotes y yo te debemos una.")
