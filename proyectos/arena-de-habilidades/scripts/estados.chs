# ═══════════════════════════════════════════════════════════════
#  estados.chs · EFECTOS DE ESTADO
# ═══════════════════════════════════════════════════════════════
# Es un SCRIPT DE FUNCIONES: no esta puesto en ningun objeto, asi que
# sus funciones se pueden usar desde cualquier script (los enemigos,
# el jefe y el jugador usan las mismas).
#
# Cada objeto guarda sus estados en su propiedad "estados", una tabla:
#     {quemado: {tiempo: 2.5, pilas: 2}, congelado: {tiempo: 1, pilas: 1}}
# Las pilas se acumulan (hasta un maximo) y el tiempo se alarga.
#
#   quemado     → pierde vida cada segundo (mas pilas, mas dano)
#   congelado   → va mas lento; con 3 pilas se queda helado del todo
#   aturdido    → no puede hacer nada
#   ralentizado → va mas lento

variable MAXIMO_PILAS = {quemado: 5, congelado: 3, aturdido: 1, ralentizado: 3}
variable COLORES = {aturdido: "#fffa65", congelado: "#74b9ff", quemado: "#ff7f50", ralentizado: "#a29bfe"}
# Dano por segundo de cada pila de quemado
variable DANO_QUEMADO = 6

funcion prepararEstados(quien):
    quien.estados = {}

# Pone (o acumula) un estado. Devuelve cuantas pilas tiene ahora.
funcion aplicarEstado(quien, nombre, segundos):
    si quien == nulo o quien.destruido:
        devolver 0
    si no (nombre en MAXIMO_PILAS):
        mostrar("aplicarEstado: no conozco el estado", nombre)
        devolver 0
    variable e = quien.estados
    si nombre en e:
        variable actual = e[nombre]
        actual.pilas = minimo(actual.pilas + 1, MAXIMO_PILAS[nombre])
        actual.tiempo = maximo(actual.tiempo, segundos)
    sino:
        e[nombre] = {tiempo: segundos, pilas: 1}
    devolver e[nombre].pilas

funcion quitarEstados(quien):
    quien.estados = {}

funcion tieneEstado(quien, nombre):
    devolver nombre en quien.estados

funcion pilasDe(quien, nombre):
    si nombre en quien.estados:
        devolver quien.estados[nombre].pilas
    devolver 0

# Hay que llamarla en cada fotograma: pasa el tiempo de los estados y
# quita los que se acaban. Devuelve el dano de quemadura de este fotograma.
funcion actualizarEstados(quien, dt):
    variable dano = 0
    variable acabados = []
    para cada nombre, e en quien.estados:
        e.tiempo -= dt
        si nombre == "quemado":
            dano += DANO_QUEMADO * e.pilas * dt
        si e.tiempo <= 0:
            acabados.añadir(nombre)
    para cada nombre en acabados:
        quien.estados.quitar(nombre)
    devolver dano

# Cuanto se puede mover: 1 = normal, 0 = nada
funcion factorMovimiento(quien):
    si no puedeActuar(quien):
        devolver 0
    variable f = 1 - 0.2 * pilasDe(quien, "congelado") - 0.15 * pilasDe(quien, "ralentizado")
    devolver maximo(f, 0.25)

funcion puedeActuar(quien):
    devolver no tieneEstado(quien, "aturdido") y pilasDe(quien, "congelado") < 3

# El color que toca: el del estado mas importante, o el normal
funcion colorConEstados(quien, colorNormal):
    para cada nombre, color en COLORES:
        si tieneEstado(quien, nombre):
            devolver color
    devolver colorNormal

# Puntitos de colores encima del objeto: uno por estado, con sus pilas
funcion dibujarEstados(quien, altura):
    variable x = quien.x - 18
    para cada nombre, e en quien.estados:
        dibujar.circulo(x, quien.y + altura, 3 + e.pilas, COLORES[nombre], verdadero)
        x += 14
