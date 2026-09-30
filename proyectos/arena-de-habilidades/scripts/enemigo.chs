# ═══════════════════════════════════════════════════════════════
#  enemigo.chs · LA IA DE LOS ENEMIGOS NORMALES
# ═══════════════════════════════════════════════════════════════
# Lo usan cinco plantillas. Cada una trae sus propiedades (vida,
# rapidez, dano, xp) y su tipo decide como piensa:
#   Perseguidor → va a por ti rodeando los pilares
#   Esbirro     → igual, pero pequeño y rapido (los invoca el Invocador)
#   Tirador     → dispara de lejos y huye si te acercas
#   Embestidor  → se para, avisa con una linea y embiste en linea recta
#   Invocador   → se mantiene lejos y llama a esbirros

variable jugador = nulo
variable colorBase = "blanco"
# Para el embestidor: acercarse, preparar, embestir, cansado
variable fase = "acercarse"
variable faseHasta = 0
variable direccionEmbestida = vector(1, 0)
variable siguienteDisparo = 0
variable siguienteInvocacion = 0
variable siguienteGolpe = 0
variable quemaAcumulada = 0

cuando empieza:
    yo.ponerEtiqueta("enemigo")
    yo.atravesar("Orbe")
    prepararEstados(yo)
    colorBase = yo.color
    jugador = buscar("Jugador")
    # Mas fuertes en cada oleada
    yo.vidaMax = redondear(yo.vida * juego.fuerza)
    yo.vida = yo.vidaMax
    yo.dano = redondear(yo.dano * (1 + (juego.fuerza - 1) / 2))
    siguienteDisparo = tiempo.total + aleatorioDecimal(1, 2)
    siguienteInvocacion = tiempo.total + 2
    # Aparece creciendo
    yo.escala = 0.2
    animar(yo.escala, 1, 0.35, "rebote")

cuando cada fotograma:
    si jugador == nulo o jugador.destruido o no jugador.visible:
        yo.parar()
        devolver
    variable quema = actualizarEstados(yo, delta)
    quemaAcumulada += quema
    yo.color = colorConEstados(yo, colorBase)
    si puedeActuar(yo):
        pensar(factorMovimiento(yo))
    sino:
        yo.parar()
    golpeCuerpoACuerpo()
    dibujarVida()
    dibujarEstados(yo, yo.alto / 2 + 16)

# La quemadura se cuenta de medio en medio segundo (si no, saldria un numerito en cada fotograma)
cuando cada 0.5 segundos:
    si quemaAcumulada >= 1:
        variable d = quemaAcumulada
        quemaAcumulada = 0
        recibirDano(d, nulo, 0)
        jugador.anotarDano(d)

funcion pensar(f):
    si yo.tipo == "Tirador":
        iaTirador(f)
    sino si yo.tipo == "Embestidor":
        iaEmbestidor(f)
    sino si yo.tipo == "Invocador":
        iaInvocador(f)
    sino:
        yo.irHacia(jugador, yo.rapidez * f)

# ── Tirador: a media distancia dispara; si estas cerca, huye ──
funcion iaTirador(f):
    variable d = yo.distanciaA(jugador)
    si d < 220:
        huir(f)
    sino si d > 460:
        yo.irHacia(jugador, yo.rapidez * f)
    sino:
        yo.parar()
    si tiempo.total >= siguienteDisparo y d < 650 y meVe():
        siguienteDisparo = tiempo.total + aleatorioDecimal(1.4, 2.2) / f
        disparar(yo.direccionA(jugador), 330)

funcion huir(f):
    yo.parar()
    variable lejos = (yo.posicion - jugador.posicion).normalizado
    yo.velocidad = lejos * yo.rapidez * 1.2 * f

# ¿Hay una linea sin paredes entre el enemigo y el jugador?
funcion meVe():
    variable r = rayo(yo, jugador, 900)
    devolver r != nulo y r.objeto == jugador

funcion disparar(direccion, rapidez):
    variable b = crear("BalaEnemiga", yo.x + direccion.x * 22, yo.y + direccion.y * 22)
    b.velocidad = direccion * rapidez
    b.dano = yo.dano
    sonido.efecto("laser", 0.25, 1.3)

# ── Embestidor: acercarse → preparar (avisa) → embestir → cansado ──
funcion iaEmbestidor(f):
    si fase == "acercarse":
        yo.irHacia(jugador, yo.rapidez * f)
        si yo.distanciaA(jugador) < 340 y meVe():
            fase = "preparar"
            faseHasta = tiempo.total + 0.8
            yo.parar()
            direccionEmbestida = yo.direccionA(jugador)
            sonido.efecto("alarma", 0.3)
    sino si fase == "preparar":
        # Apunta mientras se prepara y lo dibuja: una linea roja que avisa
        direccionEmbestida = yo.direccionA(jugador)
        variable punta = yo.posicion + direccionEmbestida * 420
        dibujar.linea(yo.x, yo.y, punta.x, punta.y, "#ff383888", 6)
        colorBase = "#ff3838"
        si tiempo.total >= faseHasta:
            fase = "embestir"
            faseHasta = tiempo.total + 0.55
            colorBase = "#ff9f43"
            sonido.efecto("dash", 0.6, 0.7)
    sino si fase == "embestir":
        yo.velocidad = direccionEmbestida * 720 * f
        si yo.tocaPared o tiempo.total >= faseHasta:
            fase = "cansado"
            faseHasta = tiempo.total + 1.1
            yo.parar()
            si yo.tocaPared:
                # Se da contra la pared: queda aturdido
                aplicarEstado(yo, "aturdido", 1)
                escena.camara.temblar(3, 0.15)
                particulas({tipo: "polvo", cantidad: 15})
    sino:
        yo.parar()
        si tiempo.total >= faseHasta:
            fase = "acercarse"

# ── Invocador: lejos del jugador, llama a esbirros cada pocos segundos ──
funcion iaInvocador(f):
    variable d = yo.distanciaA(jugador)
    si d < 300:
        huir(f)
    sino si d > 520:
        yo.irHacia(jugador, yo.rapidez * f)
    sino:
        yo.parar()
    si tiempo.total >= siguienteInvocacion y contar("Esbirro") < 10:
        siguienteInvocacion = tiempo.total + 5
        aLaVez(invocar)

funcion invocar():
    colorBase = "#ffffff"
    sonido.efecto("poder", 0.4, 0.6)
    esperar(0.5)
    colorBase = "#26de81"
    repetir 3 veces:
        variable a = aleatorio(0, 359)
        variable p = dentroDeArena(yo.posicion + direccionDeAngulo(a) * 50)
        particulas({tipo: "humo", color: "#26de81", cantidad: 12}, p.x, p.y)
        variable e = crear("Esbirro", p.x, p.y)
        e.xp = 1

# ── Todos: si tocan al jugador, le hacen dano (como mucho una vez por segundo) ──
funcion golpeCuerpoACuerpo():
    si tiempo.total < siguienteGolpe o no yo.tocando("Jugador"):
        devolver
    siguienteGolpe = tiempo.total + 1
    variable dano = yo.dano
    si fase == "embestir":
        dano *= 2
    jugador.recibirDano(dano, nulo, 0)

funcion dibujarVida():
    si yo.vida >= yo.vidaMax:
        devolver
    variable ancho = maximo(30, yo.ancho)
    variable altura = yo.y + yo.alto / 2 + 8
    dibujar.rectangulo(yo.x, altura, ancho, 5, "#00000099", verdadero)
    variable lleno = ancho * yo.vida / yo.vidaMax
    dibujar.rectangulo(yo.x - (ancho - lleno) / 2, altura, lleno, 5, "#ff6b6b", verdadero)

# ═════════════════════ Recibir dano ═════════════════════

# La llaman el jugador, el orbe, la nova... Devuelve el dano de verdad (para cargar la Tormenta)
funcion recibirDano(cantidad, efecto, segundos):
    si yo.destruido o yo.vida <= 0:
        devolver 0
    variable hecho = minimo(cantidad, yo.vida)
    yo.vida -= cantidad
    si efecto != nulo:
        aplicarEstado(yo, efecto, segundos)
    variable color = "#ffffff"
    si efecto != nulo:
        color = colorConEstados(yo, "#ffffff")
    numeroFlotante(yo.x, yo.y + yo.alto / 2, texto(redondear(cantidad)), color, 20)
    sonido.efecto("golpe", 0.35, aleatorioDecimal(0.9, 1.3))
    yo.color = "#ffffff"
    si yo.vida <= 0:
        morir()
    devolver hecho

funcion morir():
    particulas({tipo: "explosion", color: colorBase, cantidad: 30})
    sonido.efecto("explosion", 0.4, 1.4)
    # Deja cristales de experiencia
    variable cuantos = maximo(1, redondear(yo.xp / 3))
    repetir cuantos veces:
        variable c = crear("Cristal", yo.x + aleatorio(-16, 16), yo.y + aleatorio(-16, 16))
        c.xp = yo.xp / cuantos
    juego.enemigosDerrotados += 1
    destruir(yo)
