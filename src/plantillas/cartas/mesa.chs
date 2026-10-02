# LA MESA de un juego de parejas (memoria). Este objeto no se ve:
# reparte las cartas boca abajo y comprueba si las dos levantadas son iguales.
# Para tener mas parejas, anade nombres de imagenes a esta lista:
variable DIBUJOS = ["gema", "estrella", "corazon", "llave", "moneda", "pocion"]
variable COLUMNAS = 4
variable levantadas = []
variable comprobando = falso

cuando empieza:
    # La baraja lleva cada dibujo dos veces, y se mezcla
    variable baraja = []
    para cada d en DIBUJOS:
        baraja.añadir(d)
        baraja.añadir(d)
    baraja.mezclar()
    # Se reparten en filas, de izquierda a derecha y de arriba abajo
    para cada i en rango(1, baraja.longitud):
        variable columna = (i - 1) % COLUMNAS
        variable fila = redondearAbajo((i - 1) / COLUMNAS)
        variable carta = crear("Carta", 300 + columna * 120, 410 - fila * 125)
        carta.dibujo = baraja[i]

# Cada carta avisa con este mensaje cuando se le hace clic
cuando recibo "levantar":
    si no comprobando y levantadas.longitud < 2:
        dato.imagen = dato.dibujo
        dato.levantada = verdadero
        levantadas.añadir(dato)
        sonido.reproducir("clic")
        si levantadas.longitud == 2:
            comprobar()

funcion comprobar():
    comprobando = verdadero
    juego.intentos += 1
    variable a = levantadas[1]
    variable b = levantadas[2]
    si a.dibujo == b.dibujo:
        # Pareja: se quedan boca arriba
        juego.parejas += 1
        sonido.reproducir("moneda")
        efecto.destello(a)
        efecto.destello(b)
    sino:
        # No son iguales: se dejan ver un momento y se vuelven a tapar
        esperar(0.8)
        para cada c en [a, b]:
            c.imagen = "madera"
            c.levantada = falso
    levantadas.vaciar()
    comprobando = falso
    si juego.parejas == DIBUJOS.longitud:
        sonido.reproducir("ganar")
        efecto.confeti(vector(480, 300))
        dialogo("¡Todas las parejas en " + texto(juego.intentos) + " intentos!")
        juego.parejas = 0
        juego.intentos = 0
        escena.reiniciar()
