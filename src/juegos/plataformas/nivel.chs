# ───────────────────────────────────────────────
#  NIVEL: construye el mapa a partir de letras
# ───────────────────────────────────────────────
# Cada letra es una casilla de 48×48 píxeles:
#   #  suelo            M  moneda         E  enemigo
#   ^  pinchos          J  jugador        B  bandera (meta)
#   |  límite invisible (los enemigos se dan la vuelta al tocarlo)
#
# ¡Prueba a cambiar el mapa! Guarda el archivo y el juego se recarga solo.

variable TAM = 48

variable mapa = [
    "                                                                        ",
    "                                                                        ",
    "#                                                                      #",
    "#                                                                      #",
    "#           MMM                                     MMM                #",
    "#          #####                                   #####               #",
    "#     M M                    MM |   E  |                               #",
    "#     ####                       ######   M   ####                     #",
    "#  J             |   E   |   ^^                          |  E ^E |  B  #",
    "###########   ###########################   ############################",
    "###########   ###########################   ############################",
]

# Devuelve la letra de una casilla, o " " si está fuera del mapa.
# (En Chispa las listas y los textos empiezan en la posición 1)
funcion letraEn(fila, columna):
    si fila < 1 o fila > longitud(mapa):
        devolver " "
    variable linea = mapa[fila]
    si columna < 1 o columna > longitud(linea):
        devolver " "
    devolver linea[columna]

cuando empieza:
    # Datos compartidos por todos los scripts del juego
    juego.monedas = 0
    juego.monedasTotales = 0
    juego.vidas = 3
    juego.mensaje = ""
    juego.terminado = falso

    # La cámara no se sale del nivel
    camara.limites(0, 0, longitud(mapa[1]) * TAM, longitud(mapa) * TAM)

    # Unas nubes de decoración en sitios al azar
    repetir 10 veces:
        crear("Nube", aleatorio(0, 3400), aleatorio(30, 200))

    # Recorremos el mapa fila a fila y letra a letra
    variable fila = 1
    para cada linea en mapa:
        variable columna = 1
        para cada letra en linea:
            # Centro de la casilla
            variable posX = (columna - 1) * TAM + TAM / 2
            variable posY = (fila - 1) * TAM + TAM / 2

            si letra == "#":
                # Si encima hay otro bloque, es tierra; si no, césped
                si letraEn(fila - 1, columna) == "#":
                    crear("Tierra", posX, posY)
                sino:
                    crear("Cesped", posX, posY)
            sino si letra == "M":
                crear("Moneda", posX, posY)
                juego.monedasTotales += 1
            sino si letra == "E":
                crear("Enemigo", posX, posY)
            sino si letra == "^":
                crear("Pinchos", posX, posY)
            sino si letra == "|":
                crear("Limite", posX, posY)
            sino si letra == "B":
                # La bandera mide 2 casillas: la subimos media casilla
                crear("Bandera", posX, posY - TAM / 2)
            sino si letra == "J":
                crear("Jugador", posX, posY)
            columna += 1
        fila += 1

    mostrar "¡Nivel cargado! Recoge las", juego.monedasTotales, "monedas y llega a la bandera."

cuando se pulsa "r":
    escena.reiniciar()
