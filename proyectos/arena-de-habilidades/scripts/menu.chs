# ═══════════════════════════════════════════════════════════════
#  menu.chs · el boton JUGAR del menu principal
# ═══════════════════════════════════════════════════════════════

cuando empieza:
    tiempo.seguir()
    variable record = cargar("record", 0)
    variable texto = "Record: todavia ninguno"
    si record > 10:
        texto = "Record: ¡has vencido al Guardian!"
    sino si record > 0:
        texto = "Record: oleada {record}"
    buscar("Record").texto = texto
    si mando.conectado:
        buscar("AyudaMando").color = "#f1c40f"

cuando cada fotograma:
    # El boton "respira" para que se vea que se puede pulsar
    yo.escala = 1 + seno(tiempo.total * 200) * 0.04
    si teclado.sePulso("enter") o teclado.sePulso("espacio") o mando.sePulso("a") o mando.sePulso("start"):
        empezar()

cuando hago clic encima:
    empezar()

funcion empezar():
    sonido.efecto("clic")
    sonido.efecto("poder", 0.5)
    escena.cambiar("Arena", 0.6)
