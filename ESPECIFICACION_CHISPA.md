# Especificación del lenguaje Chispa · v0.2

Chispa es un lenguaje de programación en español para crear videojuegos 2D dentro del motor Chispa.
Los archivos llevan la extensión `.chs`. Cada objeto de la escena puede tener un script.

**Principios de diseño**

1. Que lo pueda leer en voz alta alguien que no sabe inglés ni programar.
2. Una forma clara de hacer cada cosa, sin símbolos raros.
3. Cada error explica qué pasa y cómo arreglarlo.

---

## 1. Reglas generales

| Regla | Detalle |
|---|---|
| Bloques | Por **sangría** (4 espacios), estilo Python. La línea que abre un bloque termina en `:`. |
| Tildes | Dan igual en palabras clave, variables y API: `función` = `funcion`, `posición` = `posicion`. La **ñ** sí cuenta (`año` ≠ `ano`). |
| Mayúsculas | Dan igual: `Si` = `si`, `Vida` = `vida`. |
| Comentarios | Empiezan con `#` y llegan hasta el final de la línea. |
| Líneas largas | Dentro de `( )`, `[ ]` o `{ }` se puede saltar de línea libremente. |
| Fin de línea | No hace falta `;`. |

**Palabras reservadas** (no se pueden usar como nombres):

`si` `sino` `mientras` `repetir` `para` `cada` `en` `funcion` `devolver` `variable` `verdadero` `falso` `nulo` `y` `o` `no` `cuando` `mostrar` `romper` `continuar`

`mostrar` es una función normal (se escribe con paréntesis), pero su nombre está reservado para poder avisar si alguien se olvida de los paréntesis.

Algunas palabras solo tienen significado especial en su sitio (dentro de un `cuando` o de un `repetir`): `veces`, `empieza`, `fotograma`, `pulsa`, `toco`, `hago`, `clic`, `segundos`. Fuera de ahí se pueden usar como nombres normales.

### Coordenadas: la Y crece hacia ARRIBA

Chispa usa los ejes de las matemáticas y de Unity: **subir es sumar a la Y**.

```
        y ↑
          │
          │   (100, 50)
          │      •
  (0, 0)  └──────────→ x
```

- Al empezar, el punto `(0, 0)` es la **esquina inferior izquierda** de la pantalla. La pantalla va de `(0, 0)` a `(960, 540)`.
- La gravedad tira hacia **abajo**, es decir, resta a la Y.
- `velocidad.y > 0` significa que el objeto sube, y `yo.y += 10` lo mueve hacia arriba.
- **Rotación en grados:** un número positivo gira en sentido **contrario a las agujas del reloj**, como en matemáticas.
- El ratón usa las mismas coordenadas: `raton.y` se mide desde abajo.
- El Canvas del navegador tiene la Y hacia abajo. Esa conversión la hace el motor por dentro y nunca se ve desde Chispa.

## 2. Tipos de datos

| Tipo | Ejemplos | Notas |
|---|---|---|
| número | `5`, `-3`, `3.14` | Un solo tipo para enteros y decimales. El decimal se escribe con **punto**. Al mostrarse se redondea a 4 decimales, así que `0.1 + 0.2` se ve como `0.3`. |
| texto | `"hola"`, `'hola'` | Sirven las comillas normales y las tipográficas (“ ”). Admite `\n` (salto de línea) y `\"`. |
| lógico | `verdadero`, `falso` | |
| nulo | `nulo` | "Nada, vacío". |
| lista | `[1, 2, 3]` | **La primera posición es la 1.** |
| tabla | `{nombre: "Ana", vida: 3}` | Pares clave-valor. Las claves son nombres o textos. |
| vector | `vector(10, 20)` | Posiciones y velocidades. Tiene `.x` e `.y`. |
| objeto | `yo`, `otro`, `crear("Bala")` | Objetos de la escena. |
| función | `funcion saltar(): ...` | Las funciones también son valores. |

**Qué cuenta como falso en un `si`:** solo `falso` y `nulo`. El `0` y el texto vacío cuentan como verdadero, igual que en Luau.

**Copias y referencias:**

- Números, textos y vectores se **copian** al guardarlos en otra variable.
- Listas, tablas y objetos se **comparten**: si los cambias desde una variable, cambian también en la otra.

## 3. Variables y operadores

```
variable vida = 100        # crear (obligatorio usar 'variable' la primera vez)
vida = vida - 10           # cambiar
vida -= 10                 # atajos: += -= *= /=
```

- **Ámbito:** una variable creada dentro de un bloque (`si`, `mientras`, una función…) solo existe dentro de ese bloque, como `local` en Luau.
- **Si asignas a una variable que no has creado,** sale un error que te sugiere usar `variable`.

**Operadores, del que se aplica primero al último:**

| Tipo | Operadores |
|---|---|
| Acceso | `a.b`, `a[i]`, `f(x)` |
| Signo | `-x` |
| Multiplicar y dividir | `*`, `/`, `%` (resto; siempre positivo) |
| Sumar y restar | `+`, `-` |
| Comparar | `==`, `!=`, `<`, `>`, `<=`, `>=`, `en` |
| Lógicos | `no`, luego `y`, luego `o` |

**Detalles:**

- **Unir textos:** `+` junta textos, y si uno de los dos es texto convierte el otro. `"Vida: " + 3` da `"Vida: 3"`.
- **Vectores:** se pueden sumar y restar entre sí, y multiplicar o dividir por un número.
- **`y` y `o`** no miran la parte derecha si no hace falta. Así funciona `si enemigo != nulo y enemigo.vida > 0:` sin dar error cuando `enemigo` es nulo.
- **Dividir entre 0** da un error, no "infinito".
- **`en` comprueba si algo está dentro de otra cosa:**
  - Una clave en una tabla: `"vida" en jugador`.
  - Un elemento en una lista: `3 en [1, 2, 3]`.
  - Un trozo de texto dentro de otro: `"ola" en "hola"`.
  - Para lo contrario se usa `no`: `si no ("vida" en jugador):`.

## 4. Control de flujo

```
si vida <= 0:
    mostrar("Has perdido")
sino si vida < 20:
    mostrar("¡Cuidado!")
sino:
    mostrar("Todo bien")

mientras vida > 0:
    vida -= 1

repetir 3 veces:
    mostrar("¡Hola!")

para cada enemigo en lista:          # listas
    mostrar(enemigo)
para cada letra en "hola":           # textos, letra a letra
    mostrar(letra)
para cada clave, valor en tabla:     # tablas
    mostrar(clave, valor)
```

- **`romper`** sale del bucle. **`continuar`** salta a la siguiente vuelta. Usados fuera de un bucle dan error.
- **Bucles infinitos:** si un bucle da más de 1.000.000 de vueltas sin llamar a `esperar()`, el motor lo corta con un error en vez de congelar el navegador.

## 5. Funciones

```
funcion curar(cantidad):
    vida = minimo(vida + cantidad, 100)
    devolver vida

curar(25)
```

- **Número de valores:** hay que pasar exactamente los que pide la función. Si no, sale un error que dice cuántos faltan o sobran.
- **Sin `devolver`,** la función devuelve `nulo`.
- **Recuerdan las variables** del sitio donde se crearon (esto se llama "closure").

## 6. Listas y tablas

```
variable nums = [10, 20, 30]
nums[1]                 # 10
nums.añadir(40)         # también: agregar
nums.quitar(2)          # quita la posición 2
30 en nums              # verdadero
nums.longitud           # 3

variable ficha = {nombre: "Ana", vida: 3}
ficha.vida              # 3   (también ficha["vida"])
ficha.nivel = 2         # añadir una clave nueva
"nivel" en ficha        # verdadero
ficha.claves            # ["nombre", "vida", "nivel"]
ficha.quitar("nivel")
```

- **Posición fuera de la lista** o **clave que no existe:** error con sugerencia, por ejemplo "¿querías decir 'vida'?".
- **Para comprobar si una clave existe** antes de leerla, usa `en`:

```
si "vida" en ficha:
    mostrar(ficha.vida)
```

## 7. Eventos del motor

Los bloques `cuando` van en el nivel principal del script, sin sangría:

```
cuando empieza:                    # una vez, al aparecer el objeto
cuando cada fotograma:             # unas 60 veces por segundo
cuando se pulsa "espacio":         # al pulsar la tecla
cuando se pulsa "espacio", "w":    # cualquiera de varias teclas
cuando toco Enemigo:               # al empezar a tocar un objeto con ese nombre o tipo; el otro es 'otro'
cuando hago clic:                  # clic izquierdo en la vista del juego
```

**Eventos extra:**

- `cuando cada 2 segundos:`
- `cuando se suelta "espacio":`
- `cuando se mantiene "espacio":`
- `cuando dejo de tocar Enemigo:`
- `cuando toco:` (con cualquier objeto)

**Nombres de las teclas:**

- `"espacio"`, `"enter"`, `"escape"`, `"mayus"`, `"control"`, `"alt"`, `"tab"`, `"borrar"`
- Flechas: `"arriba"`, `"abajo"`, `"izquierda"`, `"derecha"`
- Letras (`"a"`, `"ñ"`), números (`"1"`) y teclas de función (`"f1"`…`"f12"`)

**`esperar()` y los hilos:**

- Cada evento se ejecuta como un **hilo**. `esperar(segundos)` pausa **solo ese evento**, no el juego, igual que `task.wait()` en Roblox.
- Un evento que se repite solo (`cada fotograma`, `cada N segundos`, `se mantiene`) no se lanza otra vez mientras el anterior siga esperando.

## 8. API del motor

Todo lo que aparece aquí se puede escribir con o sin tildes.

**`yo` y `otro` (objetos de la escena)**

| Propiedad | Qué es |
|---|---|
| `x`, `y`, `posicion` | Dónde está su centro. La **Y crece hacia arriba**. |
| `rotacion` (grados), `escala` | Giro (positivo = contrario a las agujas del reloj) y tamaño. |
| `velocidad`, `gravedad` | Solo si el objeto tiene física. |
| `enSuelo`, `tocaPared`, `tocaTecho` | Solo lectura; las calcula la física. |
| `color`, `visible`, `ancho`, `alto`, `opacidad`, `voltear`, `capa`, `imagen`, `texto` | Aspecto. |
| `nombre`, `tipo`, `destruido` | Otros datos del objeto. |

**Acciones:**

- `yo.saltar(fuerza)`: solo salta si está en el suelo. Pone `velocidad.y` en positivo, es decir, hacia arriba.
- `yo.mover(dx, dy)`
- `yo.rotar(grados)`
- `yo.destruir()`
- `yo.distanciaA(otro)`

**Propiedades propias:** puedes inventarte las tuyas. Por ejemplo, `yo.vida = 100` le crea una propiedad `vida` al objeto.

**Funciones globales**

| Función | Qué hace |
|---|---|
| `mostrar(a, b, ...)` | Escribe en la consola del motor. Los paréntesis son obligatorios, como en todas las funciones. |
| `crear("Plantilla", x, y)` | Crea un objeto a partir de una plantilla y lo devuelve. |
| `destruir(objeto)` | Elimina un objeto. |
| `buscar("Nombre")` / `buscarTodos("Tipo")` | Busca objetos. `buscar` devuelve `nulo` si no encuentra nada. |
| `esperar(segundos)` | Pausa el evento actual. Sin número, espera un fotograma. |
| `aleatorio(min, max)` | Entero entre `min` y `max`, ambos incluidos. `aleatorio()` da un decimal entre 0 y 1. |
| `vector(x, y)`, `distancia(a, b)` | Vectores. |
| `redondear`, `absoluto`, `raiz`, `minimo`, `maximo`, `seno`, `coseno` | Matemáticas. Los ángulos van en grados. |
| `longitud(x)`, `texto(x)`, `numero(x)` | Tamaño y conversiones. |

**Módulos**

| Módulo | Qué tiene |
|---|---|
| `teclado` | `.pulsada("a")`, `.sePulso("a")`, `.seSolto("a")` |
| `raton` | `.x`, `.y`, `.posicion`, `.pulsado("izquierdo")`, `.sePulso()`, `.rueda` |
| `escena` | `.reiniciar()`, `.objetos`, `.camara.seguir(obj)`, `.camara.limites(x1, y1, x2, y2)` |
| `sonido` | `.reproducir("nombre")`, `.parar("nombre")`, `.volumen` (de 0 a 1), `.tono(frecuencia, segundos)` (un pitido generado, sin necesitar archivos) |
| `tiempo` | `.total`, `.delta`, `.escala` (0 = pausa, 0.5 = cámara lenta) |
| `pantalla` | `.ancho`, `.alto` |
| `juego` | Datos compartidos por todos los scripts, por ejemplo `juego.puntos = 0`. |

## 9. Errores

Todos los errores siguen el mismo formato:

```
✖ Error en jugador.chs · línea 8, columna 5

   8 │     mientas vida > 0:
     │     ^^^^^^^
   Has escrito 'mientas', que no es ninguna palabra de Chispa.
   💡 ¿Querías decir 'mientras'?
```

Cada error lleva cuatro partes:

1. El archivo, la línea y la columna.
2. El trozo de código subrayado.
3. Una explicación en español sencillo.
4. Una sugerencia para arreglarlo.

**Tipos de errores:**

- **De escritura:**
  - Palabras mal escritas, comparando con las palabras clave, las variables que existen y la API.
  - Falta `:`.
  - Sangría incorrecta.
  - Textos o paréntesis sin cerrar.
  - `=` en lugar de `==`.
  - `mostrar "hola"` sin paréntesis, con la sugerencia: "escribe `mostrar("hola")`".
  - Símbolos que no existen en Chispa (`;`, `{` fuera de una tabla, `&&`…).
- **De ejecución:**
  - Variable que no existe (el mensaje enumera las que sí existen).
  - Objeto nulo.
  - Operar con tipos que no encajan (sumar una lista y un número, por ejemplo).
  - Posición fuera de la lista.
  - Número incorrecto de valores al llamar a una función.
  - Bucle infinito.
- **Avisos (en amarillo, no paran el programa):**
  - Una variable creada que nunca se usa.
  - Código que hay después de un `devolver` y nunca se ejecutará.

**Cuándo aparecen:**

- Los errores de escritura se detectan **mientras escribes**, y el editor subraya el trozo en rojo.
- Los de ejecución aparecen al ejecutar: el programa se para, el error sale en la consola y el editor salta a la línea.

## 10. Lo que Chispa NO tiene (por ahora)

- Clases ni herencia (su lugar lo ocupan los objetos de la escena y las tablas).
- Importar otros archivos.
- Textos con huecos para variables, como `"Vida: {vida}"`.
- Capturar errores (`intentar`/`si falla`).

Se pueden añadir más adelante si hacen falta.

---

## Decisiones aprobadas

1. Las listas empiezan en **1**.
2. Se usa **`romper`** para salir de un bucle. No hay alias: `salir` no existe.
3. Leer una clave de tabla que no existe da error con sugerencia. Para comprobarlo antes se usa **`en`**: `si "vida" en jugador:`.
4. **`mostrar` siempre lleva paréntesis**, como el resto de funciones.
5. **La Y crece hacia arriba.** El motor la convierte por dentro para el Canvas.
