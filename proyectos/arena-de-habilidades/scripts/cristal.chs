# ═══════════════════════════════════════════════════════════════
#  cristal.chs · la experiencia que sueltan los enemigos
# ═══════════════════════════════════════════════════════════════
# Si el jugador esta cerca, el cristal va hacia el (como un iman).

variable jugador = nulo

cuando empieza:
    jugador = buscar("Jugador")
    yo.rotacion = 45

cuando cada fotograma:
    yo.rotar(180 * delta)
    si jugador == nulo o no jugador.visible:
        devolver
    si yo.distanciaA(jugador) < 140:
        yo.moverHacia(jugador, 420)

cuando toco Jugador:
    otro.ganarXP(yo.xp)
    sonido.efecto("moneda", 0.3, aleatorioDecimal(0.9, 1.2))
    destruir(yo)

# Si nadie los recoge, desaparecen parpadeando
cuando pasen 20 segundos:
    yo.parpadear(3, 6)
    esperar(3)
    destruir(yo)
