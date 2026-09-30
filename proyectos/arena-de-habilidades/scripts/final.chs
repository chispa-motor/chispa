# ═══════════════════════════════════════════════════════════════
#  final.chs · las pantallas de derrota y de victoria
# ═══════════════════════════════════════════════════════════════

cuando empieza:
    tiempo.seguir()
    variable llegaste = "Llegaste a la oleada {juego.oleada}"
    si juego.resultado == "victoria":
        llegaste = "¡Has vencido al Guardian!"
    variable lineas = [
        llegaste,
        "Nivel {juego.nivelFinal} · {juego.enemigosDerrotados} enemigos · {textoTiempo(juego.tiempoJugado)}",
    ]
    si juego.nuevoRecord:
        lineas.añadir("¡NUEVO RECORD!")
    buscar("Resumen").texto = unir(lineas, "\n")
    si juego.resultado == "victoria":
        particulas({tipo: "confeti", cantidad: 150}, 640, 600)
        sonido.efecto("subir")

cuando cada fotograma:
    yo.escala = 1 + seno(tiempo.total * 200) * 0.04
    si teclado.sePulso("enter") o teclado.sePulso("espacio") o mando.sePulso("a") o mando.sePulso("start"):
        otraVez()

cuando hago clic encima:
    otraVez()

cuando se pulsa "escape":
    escena.cambiar("Menu", 0.5)

funcion otraVez():
    sonido.efecto("clic")
    escena.cambiar("Arena", 0.6)
