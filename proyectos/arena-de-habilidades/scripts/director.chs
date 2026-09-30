# ═══════════════════════════════════════════════════════════════
#  director.chs · LAS OLEADAS, LA PAUSA Y EL FINAL
# ═══════════════════════════════════════════════════════════════
# Cada oleada es una tabla: cuantos enemigos de cada tipo salen.
# Cuando no queda ninguno, empieza la siguiente (y cada una es mas fuerte).
# La oleada 10 es el Guardian.

variable OLEADAS = [
    {Perseguidor: 5},
    {Perseguidor: 7, Tirador: 2},
    {Perseguidor: 6, Tirador: 3, Embestidor: 1},
    {Perseguidor: 6, Embestidor: 2, Invocador: 1},
    {Perseguidor: 8, Tirador: 4, Embestidor: 2},
    {Tirador: 5, Embestidor: 3, Invocador: 2},
    {Perseguidor: 12, Tirador: 4, Invocador: 2},
    {Perseguidor: 8, Tirador: 5, Embestidor: 4, Invocador: 2},
    {Perseguidor: 10, Tirador: 6, Embestidor: 4, Invocador: 3},
]
variable OLEADA_JEFE = 10
# Como mucho estos enemigos a la vez (los demas esperan su turno)
variable MAXIMO_A_LA_VEZ = 14

variable pendientes = []
variable apareciendo = falso
variable enPausa = falso
variable terminado = falso
variable inicio = 0

cuando empieza:
    juego.oleada = 0
    juego.fuerza = 1
    juego.enemigosDerrotados = 0
    juego.nuevoRecord = falso
    juego.resultado = ""
    inicio = tiempo.total
    esperar(1)
    siguienteOleada()

cuando cada fotograma:
    si teclado.sePulso("escape") o teclado.sePulso("p") o mando.sePulso("start"):
        cambiarPausa()
    si enPausa:
        si teclado.sePulso("q") o mando.sePulso("select"):
            tiempo.seguir()
            escena.cambiar("Menu", 0.5)
        devolver
    si terminado:
        devolver
    juego.tiempoJugado = tiempo.total - inicio
    # Van saliendo los enemigos que faltan, sin pasarse del maximo
    si pendientes.longitud > 0 y no apareciendo y contarEnemigos() < MAXIMO_A_LA_VEZ:
        aLaVez(aparecerUno)
    # ¿Oleada superada?
    si juego.oleada > 0 y juego.oleada < OLEADA_JEFE y pendientes.longitud == 0 y no apareciendo y contarEnemigos() == 0:
        oleadaSuperada()

funcion contarEnemigos():
    devolver buscarConEtiqueta("enemigo").longitud

funcion siguienteOleada():
    juego.oleada += 1
    juego.fuerza = 1 + (juego.oleada - 1) * 0.15
    si juego.oleada == OLEADA_JEFE:
        aLaVez(llegaElJefe)
        devolver
    avisar("OLEADA {juego.oleada}", "#f1c40f")
    sonido.efecto("alarma", 0.5, 0.8)
    # La lista de lo que va a salir, mezclada
    pendientes = []
    para cada tipo, cuantos en OLEADAS[juego.oleada]:
        repetir cuantos veces:
            pendientes.añadir(tipo)
    pendientes.mezclar()

funcion aparecerUno():
    apareciendo = verdadero
    variable tipo = pendientes.primero
    variable deLaOleada = juego.oleada
    pendientes.quitar(1)
    variable p = entradaLejosDe(buscar("Jugador"))
    # Primero un aviso de humo donde va a salir, para que no pille por sorpresa
    particulas({tipo: "humo", color: "#ff6b6b", cantidad: 15}, p.x, p.y)
    esperar(0.35)
    # (si mientras tanto ha cambiado la oleada, ya no toca)
    si juego.oleada == deLaOleada:
        crear(tipo, p.x, p.y)
    apareciendo = falso

funcion oleadaSuperada():
    enviar("oleada_superada")
    avisar("¡Oleada superada!", "#2ecc71")
    sonido.efecto("subir", 0.6)
    terminado = verdadero
    esperar(2.5)
    terminado = falso
    siguienteOleada()

funcion llegaElJefe():
    terminado = verdadero
    avisar("¡EL GUARDIAN!", "#ff3838")
    musica.parar(1)
    escena.camara.temblar(6, 1.5)
    sonido.efecto("alarma", 0.8, 0.5)
    esperar(1.5)
    dialogo("Guardian", "Has llegado lejos, pequeño heroe. Aqui se acaba tu viaje.")
    crear("Jefe", 640, 480)
    terminado = falso

funcion cambiarPausa():
    si terminado y no enPausa:
        devolver
    enPausa = no enPausa
    buscar("PanelPausa").visible = enPausa
    si enPausa:
        tiempo.pausar()
        buscar("TextoPausa").texto = "PAUSA\n\nEscape (o start) para seguir\nQ (o select) para salir al menu"
    sino:
        tiempo.seguir()
        buscar("TextoPausa").texto = ""

# Truco para probar: escribe en la consola del editor, mientras juegas,
#     buscar("Director").saltarA(10)
# y empieza esa oleada (la 10 es el jefe). Los enemigos que haya se van.
funcion saltarA(oleada):
    pendientes = []
    para cada e en buscarConEtiqueta("enemigo"):
        destruir(e)
    juego.oleada = oleada - 1
    siguienteOleada()

funcion avisar(texto, color):
    enviar("aviso", {texto: texto, color: color})

# ── El final ──
cuando recibo "jugador_caido":
    terminar("derrota")

cuando recibo "jefe_derrotado":
    terminar("victoria")

funcion terminar(resultado):
    si terminado y juego.resultado != "":
        devolver
    terminado = verdadero
    juego.resultado = resultado
    juego.tiempoJugado = tiempo.total - inicio
    variable nivel = 1
    variable jugador = buscar("Jugador")
    si jugador != nulo:
        nivel = jugador.nivel
    juego.nivelFinal = nivel
    # El record es la oleada mas alta (ganar cuenta como 11)
    variable puntuacion = juego.oleada
    si resultado == "victoria":
        puntuacion = OLEADA_JEFE + 1
    juego.nuevoRecord = puntuacion > cargar("record", 0)
    si juego.nuevoRecord:
        guardar("record", puntuacion)
    juego.record = cargar("record", 0)
    esperar(2)
    si resultado == "victoria":
        escena.cambiar("Victoria", 1)
    sino:
        escena.cambiar("Derrota", 1)
