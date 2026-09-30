# ═══════════════════════════════════════════════════════════════
#  aviso.chs · un ataque que se avisa en el suelo
# ═══════════════════════════════════════════════════════════════
# Un circulo rojo que se llena como un reloj. Cuando se acaba el tiempo,
# explota: si el jugador sigue dentro, recibe el dano.
# Quien lo crea le pone: radio, retraso (segundos) y dano.

variable empezo = 0

cuando empieza:
    empezo = tiempo.total
    # El dibujo mide 100 de ancho: se escala al tamaño del radio
    yo.escala = yo.radio * 2 / 100
    yo.opacidad = 0.15
    sonido.efecto("alarma", 0.15, 1.5)

cuando cada fotograma:
    variable parte = limitar((tiempo.total - empezo) / yo.retraso, 0, 1)
    # El reloj: un quesito que se va llenando
    dibujar.arco(yo.x, yo.y, yo.radio, 90, 90 - 360 * parte, "#ff383855", verdadero)
    dibujar.circulo(yo.x, yo.y, yo.radio, "#ff3838", falso)
    yo.opacidad = 0.12 + parte * 0.25
    si parte >= 1:
        explotar()

funcion explotar():
    particulas({tipo: "explosion", color: "#ff7f50", cantidad: 25})
    sonido.efecto("explosion", 0.35, 1.2)
    variable jugador = buscar("Jugador")
    si jugador != nulo y distancia(yo, jugador) < yo.radio + 14:
        si yo.ralentiza:
            jugador.recibirDano(yo.dano, "ralentizado", 2)
        sino:
            jugador.recibirDano(yo.dano, "quemado", 2)
    destruir(yo)
