# Guía rápida de Chispa

Chispa es un lenguaje de programación en español para hacer videojuegos.
Los archivos llevan la extensión `.chs`. Cada objeto del juego puede tener un script.

## Lo básico

```
# Esto es un comentario
variable vidas = 3               # crear una variable
vidas = vidas - 1                # cambiarla
vidas -= 1                       # lo mismo, más corto (también += *= /=)
mostrar "Te quedan", vidas       # escribir en la consola del juego
```

- **Tildes y mayúsculas dan igual:** `función` = `funcion` = `Funcion`, y `yo.posición` = `yo.posicion`.
- **Los bloques se marcan con sangría (4 espacios)**, y la línea que abre un bloque termina en `:`.
- **Valores posibles:** números (`5`, `3.14`), textos (`"hola"`), `verdadero`/`falso`, `nulo`, listas (`[1, 2, 3]`) y vectores (`vector(10, 20)`).

## Condiciones y bucles

```
si vida <= 0:
    mostrar "Has perdido"
sino si vida < 20:
    mostrar "¡Cuidado!"
sino:
    mostrar "Todo bien"

repetir 3 veces:
    mostrar "¡Hola!"

mientras vida > 0:
    vida -= 1
    esperar(1)

para cada enemigo en buscarTodos("Enemigo"):
    destruir(enemigo)
```

- **Comparaciones:** `==`, `!=`, `<`, `>`, `<=`, `>=`. Se combinan con `y`, `o` y `no`.
- **`salir`** termina un bucle antes de tiempo.
- **Las listas empiezan en 1:** `lista[1]` es el primer elemento.

## Funciones

```
funcion curar(cantidad):
    yo.vida = minimo(yo.vida + cantidad, 100)
    devolver yo.vida
```

## Eventos

```
cuando empieza:                    # una vez, al aparecer el objeto
cuando cada fotograma:             # unas 60 veces por segundo
cuando cada 2 segundos:
cuando se pulsa "espacio":         # también: "se mantiene", "se suelta"
cuando se pulsa "espacio", "w":    # varias teclas a la vez
cuando toco Moneda:                # por nombre o por tipo; el otro objeto está en 'otro'
cuando dejo de tocar Moneda:
cuando toco:                       # cualquier objeto
cuando hago clic:
```

**Nombres de las teclas:**

- `"espacio"`, `"enter"`, `"escape"`, `"mayus"`, `"control"`, `"alt"`, `"tab"`, `"borrar"`
- Flechas: `"arriba"`, `"abajo"`, `"izquierda"`, `"derecha"`
- Letras (`"a"`, `"ñ"`), números (`"1"`) y teclas de función (`"f1"`…)

**Cómo funciona `esperar(segundos)`:** pausa solo ese evento, no el juego entero (como `task.wait()` en Roblox). Los eventos que se repiten solos (`cada fotograma`, `cada N segundos`, `se mantiene`) no se vuelven a lanzar mientras el anterior siga esperando.

## Objetos: `yo`, `otro` y los que crees tú

| Propiedad | Qué es |
|---|---|
| `x`, `y`, `posicion` | Dónde está (el centro). La Y crece **hacia abajo**. |
| `rotacion`, `escala` | Giro en grados y tamaño (`yo.escala = 2`). |
| `velocidad`, `gravedad` | Solo si tiene física. `yo.velocidad.x = 200` |
| `enSuelo`, `tocaPared`, `tocaTecho` | Solo lectura; las calcula la física. |
| `color`, `visible`, `ancho`, `alto`, `opacidad`, `voltear`, `capa` | Aspecto. |
| `texto`, `tamaño` | Para objetos de texto (marcadores). |
| `imagen` | Cambiar de imagen: `yo.imagen = "jugador"` |
| `nombre`, `tipo`, `solido`, `destruido` | Otros datos del objeto. |

**Acciones de los objetos:**

- `yo.saltar(600)`: salta solo si está en el suelo.
- `yo.mover(10, 0)`
- `yo.rotar(90)`
- `yo.destruir()`
- `yo.distanciaA(otro)`

**Propiedades propias:** puedes inventarte las tuyas. Por ejemplo, `yo.vida = 100` crea una propiedad `vida` en el objeto.

## Funciones del motor

| Función | Ejemplo |
|---|---|
| `crear(plantilla, x, y)` | `variable b = crear("Bala", yo.x, yo.y)` |
| `destruir(objeto)` | `destruir(otro)` |
| `buscar(nombre)` / `buscarTodos(nombre)` | `buscar("Jugador")` |
| `esperar(segundos)` | `esperar(0.5)` |
| `aleatorio(min, max)` | `aleatorio(1, 6)` (entero); `aleatorio()` (decimal entre 0 y 1) |
| `vector(x, y)`, `distancia(a, b)` | `yo.velocidad = vector(0, -300)` |
| `redondear`, `absoluto`, `raiz`, `minimo`, `maximo` | `redondear(3.14159, 2)` |
| `seno(grados)`, `coseno(grados)` | Van en grados, no en radianes. |
| `longitud(x)`, `texto(x)`, `numero(x)` | `longitud([1, 2])` da 2 |

**Listas:** `lista.añadir(x)`, `lista.quitar(posición)`, `lista.contiene(x)` y `lista.longitud`.

## Módulos

| Módulo | Qué tiene |
|---|---|
| `teclado` | `teclado.pulsada("a")`, `teclado.sePulso("espacio")`, `teclado.seSolto("espacio")` |
| `raton` | `raton.x`, `raton.y`, `raton.posicion`, `raton.pulsado("izquierdo")`, `raton.sePulso()`, `raton.rueda` |
| `camara` | `camara.seguir(yo)`, `camara.limites(x1, y1, x2, y2)`, `camara.x`, `camara.y`, `camara.suavizado` |
| `escena` | `escena.reiniciar()`, `escena.objetos` |
| `tiempo` | `tiempo.total`, `tiempo.delta`, `tiempo.escala` (0 = pausa, 0.5 = cámara lenta) |
| `pantalla` | `pantalla.ancho`, `pantalla.alto` |
| `juego` | Datos compartidos entre todos los scripts: `juego.puntos = 0` |
| `delta` | Segundos desde el fotograma anterior. `yo.x += 100 * delta` |
