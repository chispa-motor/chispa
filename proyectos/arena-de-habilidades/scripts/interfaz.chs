# ═══════════════════════════════════════════════════════════════
#  interfaz.chs · LO QUE SE VE ENCIMA DEL JUEGO
# ═══════════════════════════════════════════════════════════════
# Vida, energia, experiencia, los 5 iconos de habilidad con su
# enfriamiento en circulo, la carga de la definitiva y la vida del jefe.
# Todo se dibuja en la pantalla (dibujar.enPantalla), en cada fotograma.

variable jugador = nulo
variable textoAviso = nulo
variable avisoHasta = 0

cuando empieza:
    jugador = buscar("Jugador")
    textoAviso = buscar("TextoAviso")

cuando cada fotograma:
    # La franja de arriba, donde va todo
    dibujar.enPantalla.rectangulo(640, 680, 1280, 80, "#0b0e1a", verdadero)
    si jugador == nulo:
        devolver
    barra(330, 700, 300, 18, jugador.vida, jugador.vidaMax, "#ff6b6b", "Vida")
    barra(330, 676, 300, 12, jugador.energia, jugador.energiaMax, "#48dbfb", "Energia")
    # Experiencia: una linea fina arriba del todo
    dibujar.enPantalla.rectangulo(640, 717, 1280, 6, "#00000099", verdadero)
    dibujar.enPantalla.rectangulo(640 * jugador.xp / jugador.xpSiguiente, 717, 1280 * jugador.xp / jugador.xpSiguiente, 6, "#55efc4", verdadero)
    para cada i en rango(1, 5):
        icono(i, 560 + (i - 1) * 72, 680)
    buscar("TextoNivel").texto = "Nivel {jugador.nivel}"
    si juego.oleada >= 10:
        buscar("TextoOleada").texto = "JEFE"
    sino:
        buscar("TextoOleada").texto = "Oleada {juego.oleada}/9"
    vidaDelJefe()
    si textoAviso.texto != "" y tiempo.total > avisoHasta:
        textoAviso.opacidad -= 2 * tiempo.delta
        si textoAviso.opacidad <= 0:
            textoAviso.texto = ""

# Una barra con el fondo oscuro, el trozo lleno y el numero encima
funcion barra(px, py, ancho, alto, valor, maximo, color, nombre):
    variable parte = limitar(valor / maximo, 0, 1)
    dibujar.enPantalla.rectangulo(px, py, ancho + 4, alto + 4, "#000000", verdadero)
    dibujar.enPantalla.rectangulo(px - ancho * (1 - parte) / 2, py, ancho * parte, alto, color, verdadero)
    dibujar.enPantalla.texto("{nombre} {redondear(valor)}/{redondear(maximo)}", px - ancho / 2 + 6, py + alto / 2 - 1, "#ffffff", alto - 2)

# El icono de una habilidad: su color, la tecla, el coste y el enfriamiento
funcion icono(i, px, py):
    variable h = jugador.datosHabilidad(i)
    variable lista = jugador.puedeUsar(i)
    variable fondo = h.color
    si no lista:
        fondo = "#2d3448"
    dibujar.enPantalla.rectangulo(px, py, 56, 56, "#0b0e1a", verdadero)
    dibujar.enPantalla.circulo(px, py, 25, fondo, verdadero)
    # La definitiva: un anillo que se llena con la carga
    si i == 5:
        dibujar.enPantalla.arco(px, py, 27, 90, 90 - 360 * jugador.carga / 100, "#fffa65", falso, 4)
    # El enfriamiento: un quesito oscuro que se va vaciando como un reloj
    variable falta = jugador.restante(i)
    si falta > 0:
        dibujar.enPantalla.arco(px, py, 25, 90, 90 + 360 * falta, "#000000bb", verdadero)
    dibujar.enPantalla.texto(h.tecla, px - 24, py + 26, "#ffffff", 14)
    dibujar.enPantalla.texto(h.nombre, px - 24, py - 16, "#ffffff", 12)
    si h.coste > 0:
        dibujar.enPantalla.texto(h.coste, px + 10, py + 26, "#48dbfb", 12)

funcion vidaDelJefe():
    variable jefe = buscar("Jefe")
    si jefe == nulo:
        devolver
    barra(640, 612, 700, 16, jefe.vida, jefe.vidaMax, "#ff3838", "GUARDIAN · fase {jefe.fase}")

# Los avisos grandes del centro (oleadas, combos, mejoras)
cuando recibo "aviso":
    textoAviso.texto = dato.texto
    textoAviso.color = dato.color
    textoAviso.opacidad = 1
    textoAviso.escala = 1.4
    animar(textoAviso.escala, 1, 0.3, "rebote")
    avisoHasta = tiempo.total + 1.3
