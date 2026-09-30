# ═══════════════════════════════════════════════════════════════
#  orbe.chs · la bola de fuego del jugador (habilidad 2)
# ═══════════════════════════════════════════════════════════════
# Es solida (para rebotar en los muros) pero atraviesa a los enemigos
# y al jugador: asi no los empuja, y aun asi avisa con "cuando toco".
# El jugador le pone: velocidad, dano, rebotes y helado.

variable golpeados = []
variable direccionAntes = vector(0, 0)

cuando empieza:
    yo.atravesar("enemigo")
    yo.atravesar("Jugador")
    yo.atravesar("Orbe")
    yo.atravesar("BalaEnemiga")
    yo.atravesar("Cristal")

cuando cada fotograma:
    # Si la velocidad ha dado la vuelta en x o en y, ha rebotado en un muro
    variable v = yo.velocidad
    si direccionAntes.longitud > 0:
        si signo(v.x) != signo(direccionAntes.x) o signo(v.y) != signo(direccionAntes.y):
            rebotar()
    direccionAntes = v
    # Mantiene su rapidez (los rebotes no la frenan)
    si v.longitud > 1:
        yo.velocidad = v.normalizado * 620
    particulas({tipo: "chispas", color: yo.color, cantidad: 1})

funcion rebotar():
    yo.rebotes -= 1
    sonido.efecto("golpe", 0.2, 2)
    si yo.rebotes < 0:
        apagar()

funcion apagar():
    particulas({tipo: "humo", color: yo.color, cantidad: 10})
    destruir(yo)

cuando toco enemigo:
    si golpeados.contiene(otro):
        devolver
    golpeados.añadir(otro)
    variable jugador = buscar("Jugador")
    si jugador == nulo:
        devolver
    jugador.golpear(otro, yo.dano, "quemado", 3)
    si yo.helado:
        aplicarEstado(otro, "congelado", 2)
    particulas({tipo: "explosion", color: yo.color, cantidad: 12})
    # Con rebotes de sobra, sigue; si no, se apaga al primer golpe
    yo.rebotes -= 1
    si yo.rebotes < 0:
        apagar()

cuando pasen 5 segundos:
    apagar()
