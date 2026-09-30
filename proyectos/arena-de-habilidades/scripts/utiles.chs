# ═══════════════════════════════════════════════════════════════
#  utiles.chs · FUNCIONES QUE USAN TODOS
# ═══════════════════════════════════════════════════════════════
# Script de funciones (no esta en ningun objeto).

# La arena: de 40 a 1240 en x y de 40 a 600 en y (dentro de los muros)
variable ARENA = {izquierda: 60, derecha: 1220, abajo: 60, arriba: 580}
# Sitios donde aparecen los enemigos: las cuatro esquinas y el centro de cada lado
variable ENTRADAS = [
    vector(80, 80), vector(1200, 80), vector(80, 560), vector(1200, 560),
    vector(640, 70), vector(640, 570), vector(70, 320), vector(1210, 320),
]

# Un numero (o texto) que sube y se desvanece: dano, curas, avisos
funcion numeroFlotante(px, py, contenido, color, tamano):
    variable n = crear("NumeroDano", px + aleatorio(-12, 12), py + 20)
    n.texto = contenido
    n.color = color
    n.tamano = tamano
    devolver n

# Un vector de largo 1 que apunta hacia ese angulo (0 = derecha, 90 = arriba)
funcion direccionDeAngulo(grados):
    devolver vector(coseno(grados), seno(grados))

# Una entrada al azar que no este encima del jugador
funcion entradaLejosDe(jugador):
    variable opciones = []
    para cada p en ENTRADAS:
        si jugador == nulo o distancia(p, jugador) > 300:
            opciones.añadir(p)
    si opciones.longitud == 0:
        devolver elegir(ENTRADAS)
    devolver elegir(opciones)

# Un punto al azar dentro de la arena (para los ataques del jefe)
funcion puntoEnArena():
    devolver vector(aleatorio(ARENA.izquierda, ARENA.derecha), aleatorio(ARENA.abajo, ARENA.arriba))

# Mete un punto dentro de la arena
funcion dentroDeArena(p):
    devolver vector(limitar(p.x, ARENA.izquierda, ARENA.derecha), limitar(p.y, ARENA.abajo, ARENA.arriba))

# 125 segundos → "2:05"
funcion textoTiempo(segundos):
    variable m = redondearAbajo(segundos / 60)
    variable s = redondearAbajo(segundos % 60)
    si s < 10:
        devolver "{m}:0{s}"
    devolver "{m}:{s}"
