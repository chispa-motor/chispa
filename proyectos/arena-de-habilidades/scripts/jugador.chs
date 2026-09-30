# ═══════════════════════════════════════════════════════════════
#  jugador.chs · EL HEROE DE LA ARENA
# ═══════════════════════════════════════════════════════════════
# Moverse:   WASD o flechas (o la palanca del mando)
# Apuntar:   el raton (o la palanca derecha del mando)
# Habilidades (teclas 1 a 5, o A X Y B RT en el mando):
#   1 Dash      → corre muy rapido en linea recta, atraviesa enemigos y los ralentiza
#   2 Orbe      → una bola de fuego que rebota en las paredes y quema
#   3 Nova      → una onda helada alrededor que congela
#   4 Escudo    → no recibe dano durante unos segundos
#   5 Tormenta  → la definitiva: se carga haciendo dano. Rayos del cielo,
#                 camara lenta y temblor de pantalla.
# Combos: algunas habilidades seguidas (en menos de 1.5 s) se potencian.

# ── Estadisticas (las mejoras al subir de nivel las cambian) ──
variable stats = {
    rapidez: 260,
    vidaMax: 100,
    energiaMax: 100,
    regenEnergia: 16,
    dano: 1,
    enfriamiento: 1,
    rebotes: 3,
    radioNova: 150,
    duracionEscudo: 3,
    robaVida: 0,
    cargaPorDano: 0.35,
}

# ── Las 5 habilidades ──
# espera: segundos de enfriamiento · listo: cuando se puede volver a usar
variable habilidades = [
    {nombre: "Dash", tecla: "1", boton: "a", coste: 20, espera: 2.5, listo: 0, color: "#48dbfb"},
    {nombre: "Orbe", tecla: "2", boton: "x", coste: 12, espera: 0.6, listo: 0, color: "#feca57"},
    {nombre: "Nova", tecla: "3", boton: "y", coste: 35, espera: 6, listo: 0, color: "#74b9ff"},
    {nombre: "Escudo", tecla: "4", boton: "b", coste: 30, espera: 12, listo: 0, color: "#81ecec"},
    {nombre: "Tormenta", tecla: "5", boton: "rt", coste: 0, espera: 3, listo: 0, color: "#fffa65"},
]

# ── Combos: "anterior>actual" → nombre del combo ──
variable COMBOS = {
    "Dash>Nova": "NOVA EXPLOSIVA",
    "Nova>Orbe": "ORBE HELADO",
    "Escudo>Dash": "DASH ACORAZADO",
    "Orbe>Orbe": "RAFAGA",
}
variable VENTANA_COMBO = 1.5
variable ultimaHabilidad = ""
variable ultimaVez = -10
variable combosHechos = 0

# ── Estado del jugador ──
variable vivo = verdadero
variable apuntado = vector(1, 0)
variable dashHasta = 0
variable dashDireccion = vector(1, 0)
variable dashCombo = nulo
variable golpeadosEnDash = []
variable siguienteEstela = 0
variable invulnerableHasta = 0
variable escudoHasta = 0
variable escudo = nulo
variable mejorasPendientes = 0
variable avisoSinEnergia = 0

cuando empieza:
    prepararEstados(yo)
    yo.vidaMax = stats.vidaMax
    yo.vida = stats.vidaMax
    yo.energiaMax = stats.energiaMax
    yo.energia = stats.energiaMax
    yo.carga = 0
    yo.nivel = 1
    yo.xp = 0
    yo.xpSiguiente = xpParaNivel(1)
    yo.atravesar("Orbe")
    yo.atravesar("Cristal")

# ═════════════════════ Cada fotograma ═════════════════════

cuando cada fotograma:
    si no vivo o tiempo.pausado:
        devolver
    # Las mejoras de nivel se eligen aqui (el dialogo para el juego mientras tanto)
    si mejorasPendientes > 0:
        mejorasPendientes -= 1
        elegirMejora()
    yo.energia = minimo(yo.energiaMax, yo.energia + stats.regenEnergia * delta)
    variable quema = actualizarEstados(yo, delta)
    si quema > 0:
        yo.vida -= quema
        comprobarMuerte()
    apuntar()
    si tiempo.total < dashHasta:
        seguirDash()
    sino:
        moverse()
    leerHabilidades()
    dibujarApuntado()
    dibujarEstados(yo, 30)

funcion moverse():
    variable r = stats.rapidez * factorMovimiento(yo)
    yo.moverConFlechas(r)

# Hacia donde apunta: palanca derecha, o raton; con mando y sin palanca derecha, hacia donde anda
funcion apuntar():
    si mando.conectado:
        variable d = vector(mando.ejeDerechoX, mando.ejeDerechoY)
        si d.longitud > 0.3:
            apuntado = d.normalizado
        sino si yo.velocidad.longitud > 20:
            apuntado = yo.velocidad.normalizado
        devolver
    variable haciaRaton = raton.posicion - yo.posicion
    si haciaRaton.longitud > 4:
        apuntado = haciaRaton.normalizado

# Una rayita que dice hacia donde van el orbe y el dash
funcion dibujarApuntado():
    variable punta = yo.posicion + apuntado * 40
    dibujar.linea(yo.x + apuntado.x * 24, yo.y + apuntado.y * 24, punta.x, punta.y, "#ffffff88", 3)

funcion leerHabilidades():
    para cada i, h en habilidades:
        si teclado.sePulso(h.tecla) o mando.sePulso(h.boton):
            usar(i)

# ═════════════════════ Habilidades ═════════════════════

# Cuanto le falta a una habilidad: 0 = lista, 1 = recien usada (para los circulos de la interfaz)
funcion restante(i):
    variable h = habilidades[i]
    variable falta = h.listo - tiempo.total
    si falta <= 0:
        devolver 0
    devolver limitar(falta / (h.espera * stats.enfriamiento), 0, 1)

funcion puedeUsar(i):
    variable h = habilidades[i]
    si i == 5:
        devolver yo.carga >= 100 y restante(i) == 0
    devolver yo.energia >= h.coste y restante(i) == 0

funcion datosHabilidad(i):
    devolver habilidades[i]

funcion usar(i):
    variable h = habilidades[i]
    si restante(i) > 0:
        sonido.efecto("clic", 0.4, 0.6)
        devolver
    si i == 5 y yo.carga < 100:
        avisar("La Tormenta se carga haciendo dano", "#fffa65")
        devolver
    si yo.energia < h.coste:
        si tiempo.total > avisoSinEnergia:
            avisar("Sin energia", "#74b9ff")
            avisoSinEnergia = tiempo.total + 1
        devolver
    si no puedeActuar(yo):
        devolver
    yo.energia -= h.coste
    h.listo = tiempo.total + h.espera * stats.enfriamiento
    variable combo = comprobarCombo(h.nombre)
    si i == 1:
        empezarDash(combo)
    sino si i == 2:
        lanzarOrbe(combo)
    sino si i == 3:
        nova(combo)
    sino si i == 4:
        ponerEscudo()
    sino:
        yo.carga = 0
        aLaVez(tormenta)

funcion comprobarCombo(nombre):
    variable clave = "{ultimaHabilidad}>{nombre}"
    variable combo = nulo
    si tiempo.total - ultimaVez < VENTANA_COMBO y clave en COMBOS:
        combo = COMBOS[clave]
        combosHechos += 1
        avisar("COMBO: {combo}", "#ff9ff3")
        sonido.efecto("poder", 0.6, 1.5)
        particulas({tipo: "estrellas", color: "#ff9ff3", cantidad: 25})
        # Despues de un combo hay que empezar otro de cero
        ultimaHabilidad = ""
    sino:
        ultimaHabilidad = nombre
    ultimaVez = tiempo.total
    devolver combo

# ── 1. Dash ──
funcion empezarDash(combo):
    dashDireccion = apuntado
    si yo.velocidad.longitud > 20 y no mando.conectado:
        dashDireccion = yo.velocidad.normalizado
    dashHasta = tiempo.total + 0.18
    dashCombo = combo
    golpeadosEnDash = []
    invulnerableHasta = tiempo.total + 0.3
    yo.atravesar("enemigo")
    sonido.efecto("dash")
    particulas({tipo: "polvo", color: "#48dbfb", cantidad: 18})

funcion seguirDash():
    yo.velocidad = dashDireccion * 1150
    si tiempo.total >= siguienteEstela:
        variable e = crear("Estela", yo.x, yo.y)
        siguienteEstela = tiempo.total + 0.02
        si dashCombo != nulo:
            e.color = "#ff9ff3"
    # Los enemigos que atraviesa se llevan un golpe (una sola vez cada uno)
    para cada e en yo.cercanos(40, "enemigo"):
        si no golpeadosEnDash.contiene(e):
            golpeadosEnDash.añadir(e)
            si dashCombo == "DASH ACORAZADO":
                golpear(e, 45, "aturdido", 1.2)
            sino:
                golpear(e, 15, "ralentizado", 2)
    si tiempo.total + delta >= dashHasta:
        yo.velocidad = dashDireccion * stats.rapidez
        yo.dejarDeAtravesar("enemigo")

# ── 2. Orbe ──
funcion lanzarOrbe(combo):
    variable veces = 1
    si combo == "RAFAGA":
        veces = 3
    variable angulo0 = angulo(vector(0, 0), apuntado)
    para cada k en rango(1, veces):
        variable desvio = 0
        si veces > 1:
            desvio = (k - 2) * 12
        variable orbe = crear("Orbe", yo.x + apuntado.x * 26, yo.y + apuntado.y * 26)
        orbe.velocidad = direccionDeAngulo(angulo0 + desvio) * 620
        orbe.dano = 14 * stats.dano
        orbe.rebotes = stats.rebotes
        orbe.helado = combo == "ORBE HELADO"
        si orbe.helado:
            orbe.color = "#74b9ff"
    sonido.efecto("fuego", 0.5, 1.4)

# ── 3. Nova ──
funcion nova(combo):
    variable radio = stats.radioNova
    variable dano = 30 * stats.dano
    si combo == "NOVA EXPLOSIVA":
        radio *= 1.5
        dano *= 2
    variable onda = crear("Onda", yo.x, yo.y)
    onda.escalaFinal = radio * 2 / 20
    si combo != nulo:
        onda.color = "#ff9ff3"
    para cada e en yo.cercanos(radio, "enemigo"):
        golpear(e, dano, "congelado", 3)
        # Los empuja hacia fuera
        variable fuera = (e.posicion - yo.posicion).normalizado
        e.empujar(fuera.x * 400, fuera.y * 400)
    # Tambien borra las balas enemigas que pilla (se lo dice a todas con un mensaje)
    enviar("borrar_balas", {punto: yo.posicion, radio: radio})
    sonido.efecto("hielo")
    escena.camara.temblar(4, 0.2)

# ── 4. Escudo ──
funcion ponerEscudo():
    escudoHasta = tiempo.total + stats.duracionEscudo
    si escudo == nulo o escudo.destruido:
        escudo = crear("Escudo", yo.x, yo.y)
        escudo.pegarA(yo)
    sonido.efecto("escudo")
    particulas({tipo: "chispas", color: "#81ecec", cantidad: 20})
    aLaVez(quitarEscudoLuego)

funcion quitarEscudoLuego():
    mientras tiempo.total < escudoHasta:
        # Parpadea cuando se va a acabar
        si escudo != nulo y no escudo.destruido:
            escudo.opacidad = 0.35
            si escudoHasta - tiempo.total < 0.8 y redondearAbajo(tiempo.total * 10) % 2 == 0:
                escudo.opacidad = 0.1
        esperar()
    si escudo != nulo y no escudo.destruido:
        destruir(escudo)
    escudo = nulo

funcion escudado():
    devolver tiempo.total < escudoHasta

# ── 5. Tormenta (la definitiva) ──
funcion tormenta():
    avisar("¡TORMENTA!", "#fffa65")
    sonido.efecto("rayo", 1, 0.8)
    tiempo.camaraLenta(0.4, 2.5)
    escena.camara.temblar(10, 2.5)
    pantalla.oscurecer(0.2, "#1e1e3a")
    invulnerableHasta = tiempo.total + 1.5
    repetir 14 veces:
        variable enemigos = buscarConEtiqueta("enemigo")
        si enemigos.longitud > 0:
            variable e = elegir(enemigos)
            crear("Rayo", e.x, e.y + 450)
            particulas({tipo: "explosion", color: "#fffa65", cantidad: 30}, e.x, e.y)
            sonido.efecto("rayo", 0.6, aleatorioDecimal(0.8, 1.4))
            golpear(e, 55, "aturdido", 1.5)
        esperar(0.12)
    pantalla.aclarar(0.4)

# ═════════════════════ Dano ═════════════════════

# Pega a un enemigo (con los multiplicadores) y apunta el dano hecho
funcion golpear(enemigo, cantidad, efecto, segundos):
    si enemigo == nulo o enemigo.destruido:
        devolver
    variable hecho = enemigo.recibirDano(cantidad * stats.dano, efecto, segundos)
    anotarDano(hecho)

# Lo llaman los golpes del jugador (tambien el orbe): carga la Tormenta y roba vida
funcion anotarDano(cantidad):
    si cantidad <= 0:
        devolver
    yo.carga = minimo(100, yo.carga + cantidad * stats.cargaPorDano)
    si stats.robaVida > 0:
        yo.vida = minimo(yo.vidaMax, yo.vida + cantidad * stats.robaVida)

# Lo llaman los enemigos, sus balas y los ataques del jefe. Devuelve si le ha hecho dano.
funcion recibirDano(cantidad, efecto, segundos):
    si no vivo o tiempo.total < invulnerableHasta:
        devolver falso
    si escudado():
        numeroFlotante(yo.x, yo.y + 20, "BLOQUEADO", "#81ecec", 18)
        sonido.efecto("escudo", 0.4, 1.8)
        devolver falso
    yo.vida -= cantidad
    si efecto != nulo:
        aplicarEstado(yo, efecto, segundos)
    numeroFlotante(yo.x, yo.y + 20, "-{redondear(cantidad)}", "#ff6b6b", 26)
    sonido.efecto("dano")
    escena.camara.temblar(5, 0.15)
    mando.vibrar(0.15, 0.6)
    invulnerableHasta = tiempo.total + 0.4
    yo.parpadear(0.4, 12)
    comprobarMuerte()
    devolver verdadero

funcion curar(cantidad):
    yo.vida = minimo(yo.vidaMax, yo.vida + cantidad)
    numeroFlotante(yo.x, yo.y + 20, "+{redondear(cantidad)}", "#2ecc71", 24)

funcion comprobarMuerte():
    si yo.vida > 0 o no vivo:
        devolver
    vivo = falso
    yo.vida = 0
    yo.velocidad = vector(0, 0)
    particulas({tipo: "explosion", color: "#48dbfb", cantidad: 80})
    sonido.efecto("perder")
    tiempo.camaraLenta(0.3, 1.5)
    yo.ocultar()
    enviar("jugador_caido")

# ═════════════════════ Experiencia y niveles ═════════════════════

funcion xpParaNivel(n):
    devolver 10 + (n - 1) * 8

funcion ganarXP(cantidad):
    si no vivo:
        devolver
    yo.xp += cantidad
    mientras yo.xp >= yo.xpSiguiente:
        yo.xp -= yo.xpSiguiente
        yo.nivel += 1
        yo.xpSiguiente = xpParaNivel(yo.nivel)
        mejorasPendientes += 1
        particulas({tipo: "confeti", cantidad: 40})
        sonido.efecto("subir")

# Cada mejora: nombre, que hace y la funcion que la aplica
funcion mejorarRapidez():
    stats.rapidez *= 1.12
funcion mejorarVida():
    stats.vidaMax += 25
    yo.vidaMax = stats.vidaMax
    curar(25)
funcion mejorarEnergia():
    stats.energiaMax += 25
    yo.energiaMax = stats.energiaMax
    stats.regenEnergia += 3
funcion mejorarDano():
    stats.dano *= 1.18
funcion mejorarEnfriamiento():
    stats.enfriamiento *= 0.85
funcion mejorarRebotes():
    stats.rebotes += 2
funcion mejorarNova():
    stats.radioNova += 40
funcion mejorarEscudo():
    stats.duracionEscudo += 1.5
funcion mejorarRoboVida():
    stats.robaVida += 0.04
funcion mejorarCarga():
    stats.cargaPorDano *= 1.35

variable MEJORAS = [
    {nombre: "Botas veloces", texto: "+12% de rapidez", aplicar: mejorarRapidez},
    {nombre: "Corazon fuerte", texto: "+25 de vida maxima y te cura", aplicar: mejorarVida},
    {nombre: "Pozo de energia", texto: "+25 de energia y se recarga antes", aplicar: mejorarEnergia},
    {nombre: "Filo", texto: "+18% de dano en todo", aplicar: mejorarDano},
    {nombre: "Mente rapida", texto: "Habilidades un 15% antes", aplicar: mejorarEnfriamiento},
    {nombre: "Orbe elastico", texto: "El orbe rebota 2 veces mas", aplicar: mejorarRebotes},
    {nombre: "Nova grande", texto: "La nova llega mas lejos", aplicar: mejorarNova},
    {nombre: "Escudo largo", texto: "El escudo dura 1.5 s mas", aplicar: mejorarEscudo},
    {nombre: "Vampiro", texto: "Recuperas vida al hacer dano", aplicar: mejorarRoboVida},
    {nombre: "Tormenta cercana", texto: "La definitiva se carga antes", aplicar: mejorarCarga},
]

funcion elegirMejora():
    variable baraja = MEJORAS.sublista(1, MEJORAS.longitud)
    baraja.mezclar()
    variable tres = baraja.sublista(1, 3)
    variable opciones = []
    para cada m en tres:
        opciones.añadir("{m.nombre}: {m.texto}")
    variable elegida = dialogo("Nivel {yo.nivel}", "¡Subes de nivel! Elige una mejora:", opciones)
    variable m = tres[opciones.posicion(elegida)]
    m.aplicar()
    avisar(m.nombre, "#2ecc71")

# ═════════════════════ Avisos ═════════════════════

funcion avisar(texto, color):
    enviar("aviso", {texto: texto, color: color})

cuando recibo "oleada_superada":
    si vivo:
        curar(yo.vidaMax * 0.2)
        yo.energia = yo.energiaMax
