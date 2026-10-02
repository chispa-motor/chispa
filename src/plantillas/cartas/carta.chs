# UNA CARTA: al hacerle clic, avisa a la mesa para que la levante.
# «dibujo» y «levantada» son propiedades suyas (se ven en el inspector).
cuando hago clic encima:
    si no yo.levantada:
        enviar("levantar", yo)
