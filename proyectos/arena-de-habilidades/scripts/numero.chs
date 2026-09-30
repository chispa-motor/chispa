# ═══════════════════════════════════════════════════════════════
#  numero.chs · un numero que sube y se desvanece (dano, curas...)
# ═══════════════════════════════════════════════════════════════

cuando empieza:
    animar(yo.y, yo.y + 45, 0.8, "salida")
    animar(yo.escala, 1.3, 0.15, "salida")
    esperar(0.35)
    animar(yo.opacidad, 0, 0.45)
    esperar(0.45)
    destruir(yo)
