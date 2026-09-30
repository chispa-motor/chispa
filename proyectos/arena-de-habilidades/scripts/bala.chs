# ═══════════════════════════════════════════════════════════════
#  bala.chs · las balas de los enemigos y del jefe
# ═══════════════════════════════════════════════════════════════
# Quien la crea le pone la velocidad y el dano.

cuando empieza:
    yo.ponerEtiqueta("bala")

cuando toco Jugador:
    otro.recibirDano(yo.dano, nulo, 0)
    particulas({tipo: "chispas", color: "#e056fd", cantidad: 8})
    destruir(yo)

# Se deshacen contra los muros y los pilares (las casillas del mapa)
cuando toco Mapa:
    si casilla == "muro" o casilla == "pilar":
        particulas({tipo: "chispas", color: "#e056fd", cantidad: 5})
        destruir(yo)

# La nova las borra
cuando recibo "borrar_balas":
    si distancia(yo, dato.punto) < dato.radio:
        destruir(yo)

cuando pasen 6 segundos:
    destruir(yo)
