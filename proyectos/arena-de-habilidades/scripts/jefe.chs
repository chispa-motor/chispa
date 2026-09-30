# ═══════════════════════════════════════════════════════════════
#  jefe.chs · EL GUARDIAN DE LA ARENA (3 fases)
# ═══════════════════════════════════════════════════════════════
# Fase 1 (vida > 66%): camina hacia ti, lluvia de avisos y anillos de balas.
# Fase 2 (vida > 33%): mas rapido, embiste y llama a perseguidores;
#                      los avisos caen en fila hacia ti.
# Fase 3 (el resto):   furioso. Espiral de balas sin parar, un aviso
#                      enorme debajo de ti y sus golpes te ralentizan.
# Todos los ataques de area se avisan antes en el suelo (plantilla Aviso).

variable jugador = nulo
variable fase = 1
variable cambiandoDeFase = falso
variable siguienteAtaque = 0
variable anguloEspiral = 0
variable siguienteGolpe = 0
variable embistiendoHasta = 0
variable direccionEmbestida = vector(1, 0)
variable quemaAcumulada = 0
variable COLOR_FASE = ["#8e2d2d", "#b33939", "#ff3838"]

cuando empieza:
    yo.ponerEtiqueta("enemigo")
    yo.ponerEtiqueta("jefe")
    yo.atravesar("Orbe")
    prepararEstados(yo)
    jugador = buscar("Jugador")
    yo.vidaMax = redondear(yo.vida * juego.fuerza)
    yo.vida = yo.vidaMax
    yo.fase = 1
    siguienteAtaque = tiempo.total + 2
    yo.escala = 0.1
    animar(yo.escala, 1, 1, "elastico")
    escena.camara.temblar(8, 1)
    sonido.efecto("explosion", 1, 0.5)

cuando cada fotograma:
    si jugador == nulo o no jugador.visible:
        yo.parar()
        devolver
    variable quema = actualizarEstados(yo, delta)
    quemaAcumulada += quema
    yo.color = colorConEstados(yo, COLOR_FASE[fase])
    si cambiandoDeFase:
        yo.parar()
        devolver
    comprobarFase()
    si no puedeActuar(yo):
        yo.parar()
        devolver
    variable f = factorMovimiento(yo)
    moverse(f)
    si tiempo.total >= siguienteAtaque:
        atacar()
    si fase == 3:
        espiral()
    golpeCuerpoACuerpo()
    dibujarEstados(yo, 64)

cuando cada 0.5 segundos:
    si quemaAcumulada >= 1:
        variable d = quemaAcumulada
        quemaAcumulada = 0
        recibirDano(d, nulo, 0)
        jugador.anotarDano(d)

funcion moverse(f):
    si tiempo.total < embistiendoHasta:
        yo.velocidad = direccionEmbestida * 650
        dibujar.circulo(yo.x, yo.y, 60, "#ff383866", verdadero)
        devolver
    variable rapidez = yo.rapidez * (1 + (fase - 1) * 0.35)
    si yo.distanciaA(jugador) > 140:
        yo.irHacia(jugador, rapidez * f)
    sino:
        yo.parar()

# ── Fases ──
funcion comprobarFase():
    variable parte = yo.vida / yo.vidaMax
    variable nueva = 1
    si parte <= 0.33:
        nueva = 3
    sino si parte <= 0.66:
        nueva = 2
    si nueva > fase:
        fase = nueva
        yo.fase = nueva
        aLaVez(cambiarDeFase)

funcion cambiarDeFase():
    cambiandoDeFase = verdadero
    quitarEstados(yo)
    tiempo.camaraLenta(0.3, 1)
    escena.camara.temblar(12, 1.2)
    sonido.efecto("explosion", 1, 0.4)
    particulas({tipo: "explosion", color: COLOR_FASE[fase], cantidad: 120})
    animar(yo.escala, 1 + (fase - 1) * 0.2, 0.6, "rebote")
    esperar(0.6)
    si fase == 2:
        dialogo("Guardian", "Nada mal... pero ahora ire en serio.")
    sino:
        dialogo("Guardian", "¡BASTA! ¡La arena entera arde conmigo!")
    enviar("aviso", {texto: "FASE {fase}", color: COLOR_FASE[fase]})
    siguienteAtaque = tiempo.total + 1
    cambiandoDeFase = falso

# ── Ataques: cada fase tiene los suyos y se elige uno al azar ──
funcion atacar():
    variable ataques = ["lluvia", "anillo"]
    si fase >= 2:
        ataques = ["fila", "anillo", "embestida", "refuerzos"]
    si fase == 3:
        ataques = ["fila", "enorme", "embestida", "lluvia"]
    variable ataque = elegir(ataques)
    siguienteAtaque = tiempo.total + 3.2 - fase * 0.5
    si ataque == "lluvia":
        aLaVez(lluvia)
    sino si ataque == "anillo":
        anillo(12 + fase * 4)
    sino si ataque == "fila":
        aLaVez(fila)
    sino si ataque == "embestida":
        aLaVez(embestida)
    sino si ataque == "refuerzos":
        refuerzos()
    sino:
        avisoEn(jugador.posicion, 170, 1.6, yo.dano * 1.5)

# Un circulo rojo en el suelo que explota cuando se acaba su tiempo
funcion avisoEn(punto, radio, retraso, dano):
    variable p = dentroDeArena(punto)
    variable a = crear("Aviso", p.x, p.y)
    a.radio = radio
    a.retraso = retraso
    a.dano = dano
    a.ralentiza = fase == 3
    devolver a

funcion lluvia():
    repetir 3 + fase * 2 veces:
        variable cerca = jugador.posicion + vector(aleatorio(-160, 160), aleatorio(-160, 160))
        avisoEn(cerca, 70, 1.2, yo.dano)
        esperar(0.15)

# Una fila de avisos desde el jefe hacia donde estas
funcion fila():
    variable dir = yo.direccionA(jugador)
    para cada k en rango(1, 7):
        avisoEn(yo.posicion + dir * (k * 95), 60, 0.9, yo.dano)
        esperar(0.1)

funcion anillo(cuantas):
    variable paso = 360 / cuantas
    variable desfase = aleatorio(0, 30)
    para cada k en rango(1, cuantas):
        disparar(direccionDeAngulo(desfase + k * paso), 260)
    sonido.efecto("laser", 0.5, 0.7)

funcion espiral():
    anguloEspiral += 240 * delta
    si redondearAbajo(tiempo.total * 10) % 2 == 0 y redondearAbajo((tiempo.total - delta) * 10) % 2 == 1:
        disparar(direccionDeAngulo(anguloEspiral), 220)
        disparar(direccionDeAngulo(anguloEspiral + 180), 220)

funcion embestida():
    # Se para, avisa con una linea y sale disparado
    yo.parar()
    direccionEmbestida = yo.direccionA(jugador)
    sonido.efecto("alarma", 0.5, 0.8)
    repetir 40 veces:
        direccionEmbestida = yo.direccionA(jugador)
        variable punta = yo.posicion + direccionEmbestida * 600
        dibujar.linea(yo.x, yo.y, punta.x, punta.y, "#ff383899", 14)
        yo.parar()
        esperar()
    embistiendoHasta = tiempo.total + 0.7
    sonido.efecto("dash", 1, 0.5)

funcion refuerzos():
    repetir 2 veces:
        variable p = entradaLejosDe(jugador)
        crear("Perseguidor", p.x, p.y)
    sonido.efecto("poder", 0.6, 0.5)

funcion disparar(direccion, rapidez):
    variable b = crear("BalaEnemiga", yo.x + direccion.x * 55, yo.y + direccion.y * 55)
    b.velocidad = direccion * rapidez
    b.dano = redondear(yo.dano * 0.6)
    b.escala = 1.4

funcion golpeCuerpoACuerpo():
    si tiempo.total < siguienteGolpe o no yo.tocando("Jugador"):
        devolver
    siguienteGolpe = tiempo.total + 1
    si fase == 3:
        jugador.recibirDano(yo.dano, "ralentizado", 2)
    sino:
        jugador.recibirDano(yo.dano, nulo, 0)

# ═════════════════════ Recibir dano ═════════════════════

funcion recibirDano(cantidad, efecto, segundos):
    si yo.destruido o yo.vida <= 0 o cambiandoDeFase:
        devolver 0
    variable hecho = minimo(cantidad, yo.vida)
    yo.vida -= cantidad
    # Al jefe le afectan menos los estados: duran la mitad
    si efecto != nulo:
        aplicarEstado(yo, efecto, segundos / 2)
    numeroFlotante(yo.x, yo.y + 50, texto(redondear(cantidad)), "#ffd32a", 24)
    sonido.efecto("golpe", 0.4, 0.7)
    si yo.vida <= 0:
        aLaVez(morir)
    devolver hecho

funcion morir():
    cambiandoDeFase = verdadero
    yo.parar()
    tiempo.camaraLenta(0.25, 2)
    repetir 8 veces:
        particulas({tipo: "explosion", color: elegir(COLOR_FASE), cantidad: 50}, yo.x + aleatorio(-50, 50), yo.y + aleatorio(-50, 50))
        sonido.efecto("explosion", 0.8, aleatorioDecimal(0.5, 1))
        escena.camara.temblar(10, 0.3)
        esperar(0.2)
    juego.enemigosDerrotados += 1
    enviar("jefe_derrotado")
    destruir(yo)
