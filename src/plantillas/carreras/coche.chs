# EL COCHE de un juego de carreras visto desde arriba.
# Flecha arriba: acelerar · abajo: frenar y marcha atras · izquierda y derecha: girar.
# Hay que dar 3 vueltas lo mas rapido posible. Por la hierba va mucho mas lento.
variable MAXIMA = 340
variable VUELTAS = 3
variable rapidez = 0
variable mapa = buscar("Mapa")
variable crono = cronometro()
# Para que no valga cruzar la meta marcha atras: hay que pasar antes por el control
variable pasoPorControl = falso

cuando empieza:
    juego.mejor = cargar("mejorTiempo", 0)
    sonido.bucle("motor", 0.25)
    musica.reproducir("accion")

cuando cada fotograma:
    # Acelerar, frenar o ir perdiendo rapidez poco a poco
    si teclado.pulsada("arriba"):
        rapidez += 420 * delta
    sino si teclado.pulsada("abajo"):
        rapidez -= 520 * delta
    sino:
        rapidez -= rapidez * 1.2 * delta
    variable tope = MAXIMA
    si mapa.casillaEn(yo.x, yo.y) == "hierba":
        tope = 120
    rapidez = limitar(rapidez, -100, tope)
    # Girar: mas cuanto mas corre (parado no gira)
    variable giro = 190 * delta * limitar(rapidez / 150, -1, 1)
    si teclado.pulsada("izquierda"):
        yo.rotar(giro)
    si teclado.pulsada("derecha"):
        yo.rotar(-giro)
    # El coche va hacia donde mira
    yo.velocidad = vector(coseno(yo.rotacion) * rapidez, seno(yo.rotacion) * rapidez)
    sonido.ponerTono("motor", 0.7 + absoluto(rapidez) / MAXIMA)
    juego.tiempo = redondear(crono.segundos, 1)

cuando toco Control:
    pasoPorControl = verdadero

cuando toco Meta:
    si pasoPorControl:
        pasoPorControl = falso
        juego.vuelta += 1
        sonido.reproducir("powerup")
        si juego.vuelta > VUELTAS:
            terminar()

funcion terminar():
    sonido.parar("motor")
    sonido.reproducir("ganar")
    variable frase = "¡Meta! Tu tiempo: " + texto(juego.tiempo) + " segundos."
    si juego.mejor == 0 o juego.tiempo < juego.mejor:
        guardar("mejorTiempo", juego.tiempo)
        frase = frase + " ¡Nuevo record!"
    dialogo(frase)
    juego.vuelta = 1
    escena.reiniciar()
