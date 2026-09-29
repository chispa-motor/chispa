# Ejemplo mínimo de Chispa: eventos, teclado, ratón, sonido, listas, tablas.
# Recuerda: la Y crece hacia ARRIBA (subir = sumar a la Y).

variable rapidez = 250
variable colores = ["cian", "amarillo", "rosa", "verde"]
variable clics = 0
variable datos = {nombre: "Cuadrado", lenguaje: "Chispa"}

cuando empieza:
    mostrar("¡Hola! Flechas: mover · Espacio: color · Clic: pitido")
    para cada clave, valor en datos:
        mostrar(clave + ": " + valor)

cuando cada fotograma:
    si teclado.pulsada("derecha"):
        yo.x += rapidez * delta
    si teclado.pulsada("izquierda"):
        yo.x -= rapidez * delta
    si teclado.pulsada("arriba"):
        yo.y += rapidez * delta
    si teclado.pulsada("abajo"):
        yo.y -= rapidez * delta
    yo.rotar(90 * delta)

cuando se pulsa "espacio":
    colores.añadir(colores.quitar(1))
    yo.color = colores[1]

cuando hago clic:
    clics += 1
    sonido.tono(440 + clics * 40, 0.15)
    mostrar("Clic " + clics + " en (" + redondear(raton.x) + ", " + redondear(raton.y) + ")")

cuando cada 5 segundos:
    mostrar("Llevo " + redondear(tiempo.total) + " segundos funcionando")
