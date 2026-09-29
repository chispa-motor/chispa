# Especificación del lenguaje Chispa · v0.6

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
| Tildes | **La forma oficial es SIN tildes**: `funcion`, `posicion`, `rotacion`. Si alguien escribe la tilde, también funciona (`función` = `funcion`), pero el motor nunca la sugiere. La **ñ** no es una tilde y sí cuenta (`año` ≠ `ano`). |
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
para cada clave, valor en tabla:     # tablas (en el orden en que se añadieron las claves)
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
- **Orden de las claves:** siempre es el orden en que se añadieron. `para cada`, `.claves` y `mostrar()` recorren la tabla en ese orden, así que el resultado nunca parece aleatorio. Cambiar el valor de una clave que ya existe no la mueve de sitio. Si la quitas y la vuelves a añadir, pasa al final.
- **Nombres especiales:** `.claves` y `.quitar()` siempre se refieren a esas acciones de la tabla. Si guardas una clave con uno de esos nombres, léela con corchetes: `ficha["claves"]`.
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
cuando cada 2 segundos:            # una y otra vez, cada cierto tiempo
cuando pasen 3 segundos:           # una sola vez, 3 segundos después de aparecer
cuando se pulsa "espacio":         # al pulsar la tecla (también varias: "espacio", "w")
cuando se mantiene "espacio":      # en cada fotograma mientras esté pulsada
cuando se suelta "espacio":        # al soltarla
cuando toco Enemigo:               # al EMPEZAR a tocar un objeto (nombre o tipo) o una casilla de ese tipo
cuando dejo de tocar Enemigo:      # al dejar de tocarlo
cuando toco:                       # con cualquier cosa
cuando hago clic:                  # clic en cualquier sitio de la pantalla del juego
cuando hago clic encima:           # clic ENCIMA de este objeto (botones)
cuando termina la animacion:       # al acabar una animación que no se repite
cuando salgo de la pantalla:       # al dejar de verse (solo si antes se veía)
```

- Dentro de `cuando toco`, **`otro`** es el objeto tocado y **`casilla`** es el tipo de casilla (o `nulo` si no era un mapa).
- Un clic solo lo recibe el objeto de más arriba (la interfaz `fijo` va siempre por encima del mundo).

**Nombres de las teclas:**

- `"espacio"`, `"enter"`, `"escape"`, `"mayus"`, `"control"`, `"alt"`, `"tab"`, `"borrar"`
- Flechas: `"arriba"`, `"abajo"`, `"izquierda"`, `"derecha"`
- Letras (`"a"`, `"ñ"`), números (`"1"`) y teclas de función (`"f1"`…`"f12"`)

**`esperar()` y los hilos:**

- Cada evento se ejecuta como un **hilo**. `esperar(segundos)` pausa **solo ese evento**, no el juego, igual que `task.wait()` en Roblox.
- Un evento que se repite solo (`cada fotograma`, `cada N segundos`, `se mantiene`) no se lanza otra vez mientras el anterior siga esperando.
- `devolver` dentro de un `cuando` termina ese evento.

## 8. API del motor

La referencia completa de la API (cada función, propiedad, acción y módulo, con su explicación y un ejemplo) está en **MANUAL_CHISPA.md**. Ese manual se genera a partir de las mismas fichas que la ayuda del editor, así que nunca se contradicen. Aquí solo van las reglas generales.

- La forma oficial es **sin tildes**. Con tilde también funciona, pero el motor nunca la sugiere.
- **Variables especiales:**
  - `yo`: el objeto del script.
  - `otro` y `casilla`: dentro de `cuando toco`.
  - `juego`: datos compartidos que **se conservan** al cambiar de escena.
  - `delta`: segundos desde el fotograma anterior.
- **El tipo de un objeto** es el de su plantilla o, si no viene de una, su nombre sin los números del final. `Moneda2` es del tipo `Moneda`, y `cuando toco Moneda` y `buscarTodos("Moneda")` valen para todas las copias.
- **Posición por defecto:** `crear("Plantilla")` y `particulas("tipo")` sin posición salen donde está el objeto que las pide.
- **Módulos:**
  - `teclado`, `raton`, `escena` (con `escena.camara`), `sonido`, `musica`, `tiempo` y `pantalla`.
  - Los objetos tienen propiedades como `x`, `y`, `velocidad` o `color`.
  - También tienen acciones: `saltar`, `moverConFlechas`, `moverHacia`, `animar`, `destruir`…
  - Los mapas de casillas tienen además `casilla`, `ponerCasilla`…
- **Colores:** un nombre (`"rojo"`, `"azul"`…) o un código como `"#ff8800"`.

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

Si el error pasa **dentro de una función**, se añade desde dónde se llamó:
`Esto pasó dentro de la función 'dañar', que se llamó desde la línea 4.`

**Tres momentos:**

1. **Al escribir (errores de escritura).** Se enseñan **todos a la vez**, como mucho uno por línea y diez por archivo. Un `:` olvidado no provoca errores falsos en las líneas de debajo. Por ejemplo:
   - Palabras mal escritas (`mientas` → `mientras`), palabras de otros lenguajes (`print` → `mostrar`, `elif` → `sino si`) y `=` en lugar de `==`.
   - Falta `:`, sangría incorrecta, textos o paréntesis sin cerrar, `3,5` en vez de `3.5`.
   - `mostrar "hola"` sin paréntesis (sugiere `mostrar("hola")`), `devolver` fuera de una función, `romper` fuera de un bucle.
2. **Antes de ejecutar (análisis).** Se revisa el programa sin ejecutarlo. Si encuentra un **error**, no deja pulsar Ejecutar:
   - Variables que no existen, con sugerencia o con la lista de las que sí existen.
   - `otro` fuera de un `cuando toco`.
   - Miembros de la API mal escritos (`teclado.pulsado`, `yo.velocidda`).
   - Teclas, plantillas, escenas, sonidos, animaciones, imágenes o colores que no existen, si van escritos entre comillas.

   Los **avisos** salen en amarillo y no impiden ejecutar:
   - Una variable creada que nunca se usa.
   - Código después de `devolver`, `romper` o `continuar`, que nunca se ejecutará.
3. **Al ejecutar.** Por ejemplo:
   - Operar con tipos que no encajan, **enseñando los valores**: `intentas restar 'nombre', que es un texto ("Ana"), y un número (1).`
   - Un objeto nulo, una posición fuera de la lista, un número incorrecto de valores al llamar a una función o un bucle infinito.

   **Un error al ejecutar no para todo el juego:**
   - Sale en la consola y solo se detiene el script de ese objeto; el resto sigue funcionando.
   - Si el mismo error ocurre en muchas copias de una plantilla, se enseña una vez con el número de veces (×50).

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
