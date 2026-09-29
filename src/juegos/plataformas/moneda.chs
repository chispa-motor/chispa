# ───────────────────────────────────────────────
#  MONEDA: gira y flota un poco
# ───────────────────────────────────────────────
variable baseY = 0
variable fase = 0

cuando empieza:
    baseY = yo.y
    fase = aleatorio(0, 360)   # para que no giren todas a la vez

cuando cada fotograma:
    variable angulo = tiempo.total * 200 + fase
    # Encoger el ancho con el coseno parece que gira en 3D
    yo.ancho = 28 * absoluto(coseno(angulo))
    yo.y = baseY + seno(angulo) * 4
