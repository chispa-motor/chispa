# ═══════════════════════════════════════════════════════════════
#  efecto.chs · efectos que aparecen y se desvanecen
# ═══════════════════════════════════════════════════════════════
# Lo usan la Estela del dash, la Onda de la nova y los Rayos de la
# Tormenta. Cada plantilla trae sus propiedades:
#   duracion     → segundos que dura
#   escalaFinal  → hasta que tamaño crece (1 = no crece)

cuando empieza:
    animar(yo.escala, yo.escalaFinal, yo.duracion, "salida")
    animar(yo.opacidad, 0, yo.duracion, "entrada")
    esperar(yo.duracion)
    destruir(yo)
