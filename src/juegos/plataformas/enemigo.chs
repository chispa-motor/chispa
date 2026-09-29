# ───────────────────────────────────────────────
#  ENEMIGO: camina y se da la vuelta al chocar
# ───────────────────────────────────────────────
variable rapidez = 70
variable direccion = -1

cuando cada fotograma:
    yo.velocidad.x = rapidez * direccion
    si yo.tocaPared:
        darLaVuelta()
    yo.voltear = direccion > 0

# Los límites invisibles (|) evitan que se caiga de las plataformas
cuando toco Limite:
    darLaVuelta()

funcion darLaVuelta():
    direccion = -direccion
