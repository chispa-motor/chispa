# Aprende Chispa desde cero

> Este archivo se genera solo con `npm run manual`, a partir de la API de verdad (no lo cambies a mano: cambia `src/chispa/api/curso.ts`). Un test ejecuta cada ejemplo, cada ejercicio y cada mini proyecto para comprobar que funcionan.

Un curso por niveles para aprender a programar juegos con Chispa, aunque no hayas programado nunca. Salen **todos** los comandos que existen (398), cada uno con qué hace, un ejemplo corto que funciona y el error que más se comete con él.

**Cómo usarlo:**

1. Abre el editor (https://chispa-motor.github.io/chispa/, sin instalar nada) y lee [EMPIEZA_AQUI.md](EMPIEZA_AQUI.md) si es tu primera vez.
2. Ve nivel a nivel. Copia los ejemplos en un script y ejecútalos: cambia números y mira qué pasa. Así es como se aprende.
3. Al final de cada nivel hay **3 ejercicios** (las soluciones están [al final del todo](#soluciones), ¡inténtalo antes!) y un **mini proyecto** que junta todo lo del nivel.
4. Para buscar algo rápido, tienes la [chuleta](CHULETA_CHISPA.md): una línea por comando.

Una regla para todo el curso: en el código **no hacen falta tildes**. Se escribe `funcion`, `ultimo`, `animacion`... (si pones la tilde también funciona, pero la forma oficial es sin ella). Los textos entre comillas sí pueden llevarlas.

## Índice

- [Nivel 1: Lo básico del lenguaje](#nivel-1-lo-basico-del-lenguaje)
  - [Mostrar y guardar datos](#mostrar-y-guardar-datos)
  - [Números y operaciones](#numeros-y-operaciones)
  - [Decidir: si y sino](#decidir-si-y-sino)
  - [Repetir: bucles](#repetir-bucles)
  - [Textos](#textos)
  - [Listas](#listas)
  - [Tablas](#tablas)
  - [Funciones](#funciones)
- [Nivel 2: Objetos y eventos](#nivel-2-objetos-y-eventos)
  - [Eventos: cuándo pasa cada cosa](#eventos-cuando-pasa-cada-cosa)
  - [yo: el objeto y sus datos](#yo-el-objeto-y-sus-datos)
  - [El teclado](#el-teclado)
  - [El ratón](#el-raton)
  - [Moverse](#moverse)
  - [Choques: tocar cosas](#choques-tocar-cosas)
- [Nivel 3: Hacer juegos](#nivel-3-hacer-juegos)
  - [Crear, buscar y destruir objetos](#crear-buscar-y-destruir-objetos)
  - [Física: gravedad, velocidad y saltos](#fisica-gravedad-velocidad-y-saltos)
  - [Mapas de casillas](#mapas-de-casillas)
  - [La cámara](#la-camara)
  - [Escenas](#escenas)
  - [Interfaz y dibujo en la pantalla](#interfaz-y-dibujo-en-la-pantalla)
  - [Sonido y música](#sonido-y-musica)
  - [Tiempo y temporizadores](#tiempo-y-temporizadores)
  - [Animaciones y partículas](#animaciones-y-particulas)
  - [Formas](#formas)
  - [Colores y estilo](#colores-y-estilo)
  - [Efectos especiales](#efectos-especiales)
  - [Efectos de pantalla y de objeto](#efectos-de-pantalla-y-de-objeto)
  - [Luces y oscuridad](#luces-y-oscuridad)
  - [Letras, dibujo y azar que se repite](#letras-dibujo-y-azar-que-se-repite)
  - [Controles de interfaz](#controles-de-interfaz)
- [Nivel 4: Avanzado](#nivel-4-avanzado)
  - [Mensajes entre objetos y datos globales](#mensajes-entre-objetos-y-datos-globales)
  - [Ir a sitios esquivando paredes](#ir-a-sitios-esquivando-paredes)
  - [Rayos y diálogos](#rayos-y-dialogos)
  - [Animar valores](#animar-valores)
  - [Efectos: fundidos, sonidos y cámara lenta](#efectos-fundidos-sonidos-y-camara-lenta)
  - [Mando, móvil y web](#mando-movil-y-web)
  - [Guardar datos](#guardar-datos)
  - [Juntas: cuerdas, muelles y bisagras](#juntas-cuerdas-muelles-y-bisagras)
  - [Pantalla dividida y varias cámaras](#pantalla-dividida-y-varias-camaras)
  - [Sonido con sitio y música que cambia](#sonido-con-sitio-y-musica-que-cambia)
  - [Pantallas listas y tabla de puntuaciones](#pantallas-listas-y-tabla-de-puntuaciones)
  - [Depurar: encontrar los fallos](#depurar-encontrar-los-fallos)
- [Soluciones de los ejercicios](#soluciones)

## Nivel 1: Lo básico del lenguaje

Aquí aprendes a programar: guardar datos, hacer cuentas, decidir, repetir y crear tus propias funciones. Todavía no hay nada que se mueva: todo sale en la **consola** (abajo en el editor) con mostrar(). Para probar cada ejemplo, crea un objeto cualquiera, pulsa **Crear script**, borra lo que hay, pega el ejemplo y pulsa **Ejecutar**: lo que no está dentro de un «cuando» se ejecuta al empezar.

### Mostrar y guardar datos

Un programa trabaja con datos: números, textos y verdadero/falso. Se guardan en variables (cajas con nombre) y se enseñan con mostrar(), que escribe en la consola del editor.

#### `mostrar(valor, ...)`

Escribe en la consola.

```
mostrar("Hola")
mostrar("Vidas:", 3)
```

**Error típico:** Escribirlo mal: es mostrar, con r. Chispa te sugiere el nombre bueno. Chispa te avisa con un error que explica qué pasa.

```
mostar("Hola")
```

#### `variable nombre = valor`

Crea una variable nueva: una caja con nombre donde guardar un valor.

```
variable vida = 3
vida = vida - 1
mostrar(vida)
```

**Error típico:** Usar una variable que no se ha creado: la primera vez se escribe variable vida = 3. Chispa te avisa con un error que explica qué pasa.

```
vida = 3
```

#### `verdadero`

El valor lógico «sí».

```
variable vivo = verdadero
si vivo:
    mostrar("Sigues en pie")
```

**Error típico:** Ponerlo entre comillas: "verdadero" es un texto, no el valor lógico, así que la comparación da falso. Esto no da error: funciona, pero no hace lo que querías.

```
variable vivo = "verdadero"
si vivo == verdadero:
    mostrar("vivo")
```

#### `falso`

El valor lógico «no».

```
variable pausado = falso
si no pausado:
    mostrar("Jugando")
```

**Error típico:** Escribirlo en inglés (False o false): en Chispa es falso. Chispa te avisa con un error que explica qué pasa.

```
variable pausado = False
```

#### `nulo`

Nada, vacío.

```
variable jefe = buscar("Jefe")
si jefe == nulo:
    mostrar("No hay jefe")
```

**Error típico:** Usar algo que puede ser nulo sin comprobarlo antes: si no hay ningún Jefe, jefe es nulo y no tiene x. Chispa te avisa con un error que explica qué pasa.

```
variable jefe = buscar("Jefe")
mostrar(jefe.x)
```

### Números y operaciones

Con los números se hacen cuentas (+ - * / y % para el resto) y hay funciones para redondear, sortear y limitar.

#### `aleatorio(min, max)`

Un número entero al azar entre min y max (los dos incluidos).

```
variable dado = aleatorio(1, 6)
mostrar(dado)
```

**Error típico:** Pasarle textos: los números van sin comillas. Chispa te avisa con un error que explica qué pasa.

```
variable dado = aleatorio("1", "6")
```

#### `aleatorioDecimal(min, max)`

Un número CON DECIMALES al azar entre min y max (aleatorio() da enteros).

```
variable t = aleatorioDecimal(0.5, 1.5)
mostrar(t)
```

**Error típico:** Usar aleatorio para decimales: aleatorio da números enteros, y entre 0.5 y 1.5 solo hay el 1. Esto no da error: funciona, pero no hace lo que querías.

```
yo.tamano = aleatorio(0.5, 1.5)
```

#### `redondear(numero, decimales)`

Redondea un número.

```
mostrar(redondear(3.14159, 2))
mostrar(redondear(2.6))
```

**Error típico:** Redondear un texto: primero conviértelo con numero("3.5"). Chispa te avisa con un error que explica qué pasa.

```
mostrar(redondear("3.5"))
```

#### `redondearAbajo(numero)`

Quita los decimales hacia abajo: redondearAbajo(3.9) es 3.

```
mostrar(redondearAbajo(3.9))
```

**Error típico:** Llamarla sin el número: redondearAbajo necesita saber qué número redondear. Chispa te avisa con un error que explica qué pasa.

```
mostrar(redondearAbajo())
```

#### `redondearArriba(numero)`

Redondea hacia arriba: redondearArriba(3.1) es 4.

```
mostrar(redondearArriba(3.1))
```

**Error típico:** Escribir los decimales con coma: en Chispa se usa el punto (3.1). Con coma son DOS números, redondearArriba se queda con el primero (3) y da 3, no 4. Esto no da error: funciona, pero no hace lo que querías.

```
mostrar(redondearArriba(3,1))
```

#### `absoluto(numero)`

El número sin signo: absoluto(-5) es 5.

```
mostrar(absoluto(-5))
```

**Error típico:** Pasarle un texto: los números van sin comillas. Chispa te avisa con un error que explica qué pasa.

```
mostrar(absoluto("-5"))
```

#### `signo(numero)`

1 si es positivo, -1 si es negativo, 0 si es cero.

```
mostrar(signo(-8))
mostrar(signo(3))
```

**Error típico:** Pasarle un texto en vez de un número. Chispa te avisa con un error que explica qué pasa.

```
mostrar(signo("-8"))
```

#### `raiz(numero)`

La raíz cuadrada.

```
mostrar(raiz(16))
```

**Error típico:** Pedir la raíz de un número negativo: no existe. Comprueba antes que el número no es negativo. Chispa te avisa con un error que explica qué pasa.

```
mostrar(raiz(-4))
```

#### `potencia(base, exponente)`

Multiplica un número por sí mismo varias veces: potencia(2, 3) = 2 × 2 × 2 = 8.

```
mostrar(potencia(2, 10))
```

**Error típico:** Usar ^ para elevar: en Chispa no existe, se usa potencia(2, 10). Chispa te avisa con un error que explica qué pasa.

```
mostrar(2 ^ 10)
```

#### `minimo(a, b, ...)`

El más pequeño de varios números.

```
variable vida = 12
vida = minimo(vida, 10)
mostrar(vida)
```

**Error típico:** Llamarlo sin números: necesita al menos uno. Chispa te avisa con un error que explica qué pasa.

```
mostrar(minimo())
```

#### `maximo(a, b, ...)`

El más grande de varios números.

```
variable vida = -2
vida = maximo(vida, 0)
mostrar(vida)
```

**Error típico:** Olvidar el segundo número: con uno solo, maximo no hace nada (da ese mismo número). Para no bajar de 0 es maximo(vida - 1, 0). Esto no da error: funciona, pero no hace lo que querías.

```
variable vida = 0
vida = maximo(vida - 1)
mostrar(vida)
```

#### `limitar(valor, min, max)`

Deja el número entre min y max: si se pasa, da max; si no llega, da min.

```
variable vida = 150
vida = limitar(vida, 0, 100)
mostrar(vida)
```

**Error típico:** Poner el máximo antes que el mínimo: primero va el valor, luego el mínimo y luego el máximo. Chispa te avisa con un error que explica qué pasa.

```
variable vida = limitar(150, 100, 0)
mostrar(vida)
```

#### `numero(texto)`

Convierte un texto con un número ("42") en un número de verdad.

```
variable n = numero("42") + 1
mostrar(n)
```

**Error típico:** Hacer cuentas con un número que está en un texto: conviértelo antes con numero("42"). Chispa te avisa con un error que explica qué pasa.

```
mostrar("42" - 1)
```

#### `texto(valor)`

Convierte cualquier valor en texto.

```
variable puntos = 7
mostrar("Puntos: " + texto(puntos))
```

**Error típico:** Convertir a texto y luego hacer cuentas: "5" + 1 junta los textos y da "51", no 6. Esto no da error: funciona, pero no hace lo que querías.

```
variable n = texto(5)
mostrar(n + 1)
```

#### `probabilidad(porcentaje)`

Verdadero ese porcentaje de las veces.

```
si probabilidad(50):
    mostrar("Cara")
sino:
    mostrar("Cruz")
```

**Error típico:** Escribir 0.1 para decir el 10 %: probabilidad usa porcentajes, así que es probabilidad(10). Esto no da error: funciona, pero no hace lo que querías.

```
si probabilidad(0.1):
    mostrar("premio")
```

### Decidir: si y sino

Un programa decide qué hacer mirando una condición. Se compara con == (igual), != (distinto), <, >, <= y >=.

#### `si condicion`

Ejecuta el bloque de dentro solo si la condición es verdadera.

```
variable vida = 0
si vida <= 0:
    mostrar("Has perdido")
```

**Error típico:** Usar = para comparar: = guarda un valor, para comparar se usa ==. Chispa te avisa con un error que explica qué pasa.

```
variable vida = 0
si vida = 0:
    mostrar("fin")
```

#### `sino:  /  sino si condicion`

Va después de un 'si'.

```
variable vida = 80
si vida > 50:
    mostrar("Bien")
sino si vida > 20:
    mostrar("Regular")
sino:
    mostrar("Cuidado")
```

**Error típico:** Escribir si no separado: se escribe todo junto, sino. Chispa te avisa con un error que explica qué pasa.

```
variable vida = 80
si vida > 50:
    mostrar("Bien")
si no:
    mostrar("Cuidado")
```

#### `a y b`

Verdadero solo si las DOS cosas son verdaderas.

```
variable vida = 3
variable puntos = 20
si vida > 0 y puntos >= 10:
    mostrar("Pasas de nivel")
```

**Error típico:** Escribirlo en inglés (and o &&): en Chispa es y. Chispa te avisa con un error que explica qué pasa.

```
variable vida = 3
si vida > 0 and vida < 5:
    mostrar("ok")
```

#### `a o b`

Verdadero si AL MENOS UNA de las dos es verdadera.

```
variable tecla = "a"
si tecla == "a" o tecla == "izquierda":
    mostrar("A la izquierda")
```

**Error típico:** Poner solo el valor después de o: hay que repetir la comparación entera, tecla == "a" o tecla == "izquierda". Esto no da error: funciona, pero no hace lo que querías.

```
variable tecla = "a"
si tecla == "a" o "izquierda":
    mostrar("izquierda")
```

#### `no a`

Lo contrario: verdadero pasa a falso y al revés.

```
variable pausado = falso
si no pausado:
    mostrar("A jugar")
```

**Error típico:** Usar ! (como en otros lenguajes): en Chispa se escribe no. Chispa te avisa con un error que explica qué pasa.

```
variable pausado = falso
si !pausado:
    mostrar("jugando")
```

### Repetir: bucles

Para no escribir lo mismo muchas veces, se repite. El código que se repite va dentro, con sangría (cuatro espacios).

#### `repetir N veces`

Repite el bloque de dentro un número de veces.

```
repetir 3 veces:
    mostrar("Hola")
```

**Error típico:** Olvidar los dos puntos del final: la línea de repetir termina en :. Chispa te avisa con un error que explica qué pasa.

```
repetir 3 veces
    mostrar("Hola")
```

#### `mientras condicion`

Repite el bloque de dentro mientras la condición sea verdadera.

```
variable n = 3
mientras n > 0:
    mostrar(n)
    n -= 1
```

**Error típico:** Un bucle que no termina nunca: si nada cambia n dentro, sigue para siempre. Chispa lo corta al millón de vueltas con un error. Chispa te avisa con un error que explica qué pasa.

```
variable n = 3
mientras n > 0:
    mostrar(n)
```

#### `para cada x en lista`

Recorre una lista, un texto (letra a letra) o una tabla.

```
para cada color en ["rojo", "verde", "azul"]:
    mostrar(color)
```

**Error típico:** Olvidar la palabra cada: se escribe para cada color en lista:. Chispa te avisa con un error que explica qué pasa.

```
para color en ["rojo", "verde"]:
    mostrar(color)
```

#### `para cada x en lista:  /  cuando cada fotograma`

Se usa en 'para cada' y en los eventos 'cuando cada fotograma' y 'cuando cada N segundos'.

```
para cada n en [1, 2, 3]:
    mostrar(n * 10)
```

**Error típico:** Usar de en vez de en: es para cada n en lista:. Chispa te avisa con un error que explica qué pasa.

```
para cada n de [1, 2, 3]:
    mostrar(n)
```

#### `x en lista  /  "clave" en tabla`

Dos usos: en 'para cada x en lista', y para comprobar si algo está dentro de otra cosa (una clave en una tabla, un elemento en una lista, un trozo en un texto).

```
variable ficha = {vida: 3}
si "vida" en ficha:
    mostrar(ficha.vida)
```

**Error típico:** Olvidar las comillas de la clave: sin comillas, vida es una variable (que no existe). Chispa te avisa con un error que explica qué pasa.

```
variable ficha = {vida: 3}
si vida en ficha:
    mostrar("si")
```

#### `rango(desde, hasta, paso)`

Una lista de numeros seguidos, de desde a hasta (los dos incluidos).

```
para cada i en rango(1, 5):
    mostrar(i)
```

**Error típico:** Un paso de 0: no avanzaría nunca. El paso tiene que ser 1, 2, 5... Chispa te avisa con un error que explica qué pasa.

```
para cada i en rango(1, 5, 0):
    mostrar(i)
```

#### `romper`

Sale del bucle (mientras, repetir o para cada) en el que está.

```
variable n = 0
mientras verdadero:
    n += 1
    si n == 3:
        romper
mostrar(n)
```

**Error típico:** Usar romper fuera de un bucle: solo sirve dentro de mientras, repetir o para cada. Chispa te avisa con un error que explica qué pasa.

```
romper
```

#### `continuar`

Salta a la siguiente vuelta del bucle, sin terminar esta.

```
para cada n en [1, -2, 3]:
    si n < 0:
        continuar
    mostrar(n)
```

**Error típico:** Usar continuar fuera de un bucle: salta a la siguiente vuelta, así que tiene que estar dentro de uno. Chispa te avisa con un error que explica qué pasa.

```
si vida > 0:
    continuar
```

### Textos

Los textos van entre comillas. Se juntan con + y se pueden meter valores dentro con llaves: "Tienes {vida} vidas". Los textos no cambian: sus acciones devuelven uno nuevo.

#### `texto.longitud`

Cuántas letras tiene el texto.

```
variable nombre = "Chispa"
mostrar(nombre.longitud)
```

**Error típico:** Ponerle paréntesis: longitud es un dato, no una acción, así que va sin (). Chispa te avisa con un error que explica qué pasa.

```
variable nombre = "Chispa"
mostrar(nombre.longitud())
```

#### `texto.mayusculas`

El mismo texto en MAYÚSCULAS.

```
variable nombre = "ana"
mostrar(nombre.mayusculas)
```

**Error típico:** Ponerle paréntesis: mayusculas va sin (). Chispa te avisa con un error que explica qué pasa.

```
variable nombre = "ana"
mostrar(nombre.mayusculas())
```

#### `texto.minusculas`

El mismo texto en minúsculas.

```
variable respuesta = "SI"
si respuesta.minusculas == "si":
    mostrar("Vale")
```

**Error típico:** Escribirlo en singular: es minusculas, con s. Chispa te avisa con un error que explica qué pasa.

```
variable respuesta = "SI"
si respuesta.minuscula == "si":
    mostrar("Vale")
```

#### `texto.dividir(separador)`

Corta el texto en trozos y da una lista.

```
variable palabras = "uno dos tres".dividir(" ")
mostrar(palabras)
```

**Error típico:** Dividir por un número: el separador es un texto (" ", ",", "-"). Chispa te avisa con un error que explica qué pasa.

```
variable palabras = "uno dos".dividir(3)
```

#### `texto.reemplazar(buscar, cambiarPor)`

Un texto nuevo en el que se cambia cada trozo buscado por otro.

```
mostrar("mi gato".reemplazar("gato", "perro"))
```

**Error típico:** Olvidar por qué cambiarlo: reemplazar necesita dos textos, qué buscar y qué poner. Chispa te avisa con un error que explica qué pasa.

```
mostrar("mi gato".reemplazar("gato"))
```

#### `texto.contiene(trozo)`

Verdadero si el texto tiene ese trozo dentro.

```
variable frase = "hola mundo"
si frase.contiene("mundo"):
    mostrar("Sale mundo")
```

**Error típico:** Olvidar las comillas: mundo sin comillas es una variable, no un texto. Chispa te avisa con un error que explica qué pasa.

```
variable frase = "hola mundo"
si frase.contiene(mundo):
    mostrar("si")
```

#### `texto.empiezaPor(trozo)`

Verdadero si el texto empieza así.

```
variable nombre = "Dr. Pepe"
si nombre.empiezaPor("Dr"):
    mostrar("Es doctor")
```

**Error típico:** Olvidar las comillas del trozo que se busca. Chispa te avisa con un error que explica qué pasa.

```
variable nombre = "Dr. Pepe"
si nombre.empiezapor(Dr):
    mostrar("doctor")
```

#### `texto.terminaPor(trozo)`

Verdadero si el texto termina así.

```
variable palabra = "gatos"
si palabra.terminaPor("s"):
    mostrar("Plural")
```

**Error típico:** Las mayúsculas cuentan: "gatos" no termina por "S" mayúscula. Usa palabra.minusculas si no te importan. Esto no da error: funciona, pero no hace lo que querías.

```
variable palabra = "gatos"
si palabra.terminaPor("S"):
    mostrar("plural")
```

#### `texto.recortar()`

El mismo texto sin los espacios del principio y del final.

```
variable escrito = "  hola  "
mostrar(escrito.recortar())
```

**Error típico:** Olvidar los paréntesis: sin () no se recorta nada; se enseña la acción en vez de usarla. Es escrito.recortar(). Esto no da error: funciona, pero no hace lo que querías.

```
variable escrito = "  hola  "
mostrar(escrito.recortar)
```

#### `texto.trozo(desde, hasta)`

Un trozo del texto: de la letra desde a la hasta (las dos incluidas; la primera es la 1).

```
variable nombre = "Chispa"
mostrar(nombre.trozo(1, 3))
```

**Error típico:** Empezar a contar en 0: en Chispa la primera letra es la 1. Chispa te avisa con un error que explica qué pasa.

```
variable nombre = "Chispa"
mostrar(nombre.trozo(0, 3))
```

#### `texto.posicion(trozo)`

En qué letra empieza un trozo dentro del texto (la primera es la 1), o 0 si no está.

```
mostrar("hola mundo".posicion("mundo"))
```

**Error típico:** Esperar un -1 si no está: en Chispa da 0 (las posiciones empiezan en 1). Esto no da error: funciona, pero no hace lo que querías.

```
si "hola".posicion("x") == -1:
    mostrar("no esta")
```

#### `longitud(x)`

Cuántas letras tiene un texto, o cuántos elementos una lista o una tabla.

```
mostrar(longitud("hola"))
mostrar(longitud([1, 2, 3]))
```

**Error típico:** Pedir la longitud de un número: solo los textos, las listas y las tablas tienen longitud. Chispa te avisa con un error que explica qué pasa.

```
mostrar(longitud(5))
```

### Listas

Una lista guarda varias cosas en orden, entre corchetes: ["rojo", "verde"]. En Chispa la primera posición es la 1: lista[1].

#### `lista.longitud`

Cuántos elementos tiene la lista.

```
variable colores = ["rojo", "verde"]
mostrar(colores.longitud)
```

**Error típico:** Escribirlo en inglés (length): es longitud. Chispa te avisa con un error que explica qué pasa.

```
variable colores = ["rojo", "verde"]
mostrar(colores.length)
```

#### `lista.añadir(valor)`

Pone un valor al final de la lista.

```
variable colores = ["rojo"]
colores.añadir("azul")
mostrar(colores)
```

**Error típico:** Escribirlo en inglés (push): es añadir (o anadir). Chispa te avisa con un error que explica qué pasa.

```
variable colores = ["rojo"]
colores.push("azul")
```

#### `lista.quitar(posicion)`

Quita el elemento de esa posición (la primera es la 1) y lo devuelve.

```
variable cola = ["Ana", "Luis"]
variable primero = cola.quitar(1)
mostrar(primero, cola)
```

**Error típico:** Quitar la posición 0: en Chispa las posiciones empiezan en 1. Chispa te avisa con un error que explica qué pasa.

```
variable cola = ["Ana", "Luis"]
cola.quitar(0)
```

#### `lista.primero`

El primer elemento (o nulo si está vacía).

```
variable cola = ["Ana", "Luis"]
mostrar(cola.primero)
```

**Error típico:** Pedir el elemento 0: el primero es el 1 (cola[1]) o, más fácil, cola.primero. Chispa te avisa con un error que explica qué pasa.

```
variable cola = ["Ana", "Luis"]
mostrar(cola[0])
```

#### `lista.ultimo`

El último elemento (o nulo si está vacía).

```
variable puntos = [10, 20, 30]
mostrar(puntos.ultimo)
```

**Error típico:** Pasarse de la lista: el último es el de la posición longitud, no longitud + 1. Chispa te avisa con un error que explica qué pasa.

```
variable puntos = [10, 20, 30]
mostrar(puntos[puntos.longitud + 1])
```

#### `lista.insertar(posicion, valor)`

Mete un valor en esa posición; los que había de ahí en adelante se corren un sitio.

```
variable cola = ["Luis"]
cola.insertar(1, "Ana")
mostrar(cola)
```

**Error típico:** Olvidar la posición: primero va dónde meterlo y luego el valor. Chispa te avisa con un error que explica qué pasa.

```
variable cola = ["Luis"]
cola.insertar("Ana")
```

#### `lista.ordenar()`

Ordena la lista de menor a mayor (números) o por orden alfabético (textos).

```
variable records = [30, 10, 20]
records.ordenar()
mostrar(records)
```

**Error típico:** Ordenar una lista que mezcla números y textos: solo se puede con todo números o todo textos. Chispa te avisa con un error que explica qué pasa.

```
variable cosas = [3, "a", 1]
cosas.ordenar()
```

#### `lista.mezclar()`

Desordena la lista al azar (como barajar cartas).

```
variable cartas = [1, 2, 3, 4]
cartas.mezclar()
mostrar(cartas)
```

**Error típico:** Olvidar los paréntesis: mezclar es una acción, lleva (). Chispa te avisa con un error que explica qué pasa.

```
variable cartas = [1, 2, 3]
cartas.mezclar
```

#### `lista.invertir()`

Le da la vuelta: el último pasa a ser el primero.

```
variable n = [1, 2, 3]
n.invertir()
mostrar(n)
```

**Error típico:** Escribirlo en inglés (reverse): es invertir. Chispa te avisa con un error que explica qué pasa.

```
variable n = [1, 2, 3]
n.reverse()
```

#### `lista.posicion(valor)`

En qué posición está un valor (la primera es la 1), o 0 si no está.

```
variable colores = ["rojo", "verde"]
mostrar(colores.posicion("verde"))
```

**Error típico:** Esperar -1 si no está: da 0. Esto no da error: funciona, pero no hace lo que querías.

```
variable colores = ["rojo", "verde"]
si colores.posicion("azul") == -1:
    mostrar("no esta")
```

#### `lista.contiene(valor)`

Verdadero si el valor está en la lista.

```
variable mochila = ["llave", "mapa"]
si mochila.contiene("llave"):
    mostrar("Abres la puerta")
```

**Error típico:** Olvidar las comillas: llave sin comillas es una variable. Chispa te avisa con un error que explica qué pasa.

```
variable mochila = ["llave"]
si mochila.contiene(llave):
    mostrar("abres")
```

#### `lista.sublista(desde, hasta)`

Una lista nueva con un trozo: de la posición desde a la hasta (las dos incluidas).

```
variable records = [50, 40, 30, 20]
mostrar(records.sublista(1, 3))
```

**Error típico:** Empezar en 0: la primera posición es la 1. Chispa te avisa con un error que explica qué pasa.

```
variable records = [50, 40]
mostrar(records.sublista(0, 1))
```

#### `lista.unir(separador)`

Junta los elementos en un texto, con el separador entre medias (", " si no se dice).

```
variable mochila = ["llave", "mapa"]
mostrar(mochila.unir(" | "))
```

**Error típico:** Escribirlo en inglés (join): es unir. Chispa te avisa con un error que explica qué pasa.

```
variable mochila = ["llave", "mapa"]
mostrar(mochila.join(", "))
```

#### `lista.vaciar()`

Quita todos los elementos.

```
variable enemigos = [1, 2]
enemigos.vaciar()
mostrar(enemigos.longitud)
```

**Error típico:** Olvidar los paréntesis: vaciar es una acción. Chispa te avisa con un error que explica qué pasa.

```
variable enemigos = [1, 2]
enemigos.vaciar
```

#### `elegir(lista)`

Un elemento al azar de una lista.

```
variable color = elegir(["rojo", "verde", "azul"])
mostrar(color)
```

**Error típico:** Pasarle los valores sueltos: elegir necesita UNA lista, con corchetes: elegir(["rojo", "azul"]). Chispa te avisa con un error que explica qué pasa.

```
mostrar(elegir("rojo", "azul"))
```

#### `unir(lista, separador)`

Junta los elementos de una lista en un texto, con el separador entre medias (por defecto ", ").

```
mostrar(unir(["a", "b", "c"], " - "))
```

**Error típico:** Pasarle textos sueltos: unir necesita una lista. Chispa te avisa con un error que explica qué pasa.

```
mostrar(unir("a", "b"))
```

### Tablas

Una tabla guarda datos con nombre (claves), entre llaves: {vida: 3, nombre: "Ana"}. Se leen con punto (ficha.vida) o con corchetes (ficha["vida"]).

#### `tabla.claves`

Una lista con los nombres de todas las claves, en el orden en que se añadieron.

```
variable ficha = {vida: 3, nombre: "Ana"}
para cada k en ficha.claves:
    mostrar(k)
```

**Error típico:** Ponerle paréntesis: claves es un dato, va sin (). Chispa te avisa con un error que explica qué pasa.

```
variable ficha = {vida: 3}
mostrar(ficha.claves())
```

#### `tabla.quitar("clave")`

Quita una clave de la tabla y devuelve su valor.

```
variable ficha = {vida: 3, llave: 1}
ficha.quitar("llave")
mostrar(ficha)
```

**Error típico:** Quitar una clave que no está: comprueba antes con si "llave" en ficha:. Chispa te avisa con un error que explica qué pasa.

```
variable ficha = {vida: 3}
ficha.quitar("llave")
```

### Funciones

Una función es un trozo de código con nombre que se puede usar muchas veces. Puede recibir valores y devolver un resultado.

#### `funcion nombre(a, b)`

Crea una función: un trozo de código con nombre que se puede usar muchas veces.

```
funcion saludar(nombre):
    mostrar("Hola, " + nombre)

cuando empieza:
    saludar("Ana")
```

**Error típico:** Llamarla sin sus valores: si la función pide nombre, hay que dárselo: saludar("Ana"). Chispa te avisa con un error que explica qué pasa.

```
funcion saludar(nombre):
    mostrar("Hola, " + nombre)

cuando empieza:
    saludar()
```

#### `devolver valor`

Termina la función y da un resultado.

```
funcion doble(n):
    devolver n * 2

cuando empieza:
    mostrar(doble(21))
```

**Error típico:** Olvidar devolver: la función hace la cuenta, pero no da el resultado. Hay que escribir devolver n * 2. Chispa te avisa con un error que explica qué pasa.

```
funcion doble(n):
    n * 2

cuando empieza:
    mostrar(doble(3))
```

### Ejercicios del nivel 1

1. **Cuenta atrás.** Muestra los números del 10 al 1 y después «Despegue».
2. **Pares e impares.** Haz una función esPar(n) que devuelva verdadero si n es par (pista: el resto de dividir entre 2 es 0, n % 2 == 0). Úsala para decir, del 1 al 6, si cada número es par o impar.
3. **La lista de la compra.** Empieza con una lista con "pan" y "leche", añade "huevos", ordénala y muestra cuántas cosas hay y cuáles, separadas por comas.

Las soluciones, en [Soluciones](#soluciones) (nivel 1).

### Mini proyecto: La tienda de pociones

Tienes 20 monedas y una tabla con los precios. La función comprar() mira si la poción existe y si te llega el dinero, la mete en la mochila y te dice cuánto te queda. Junta variables, tablas, listas, si/sino, bucles y funciones.

**Qué poner en la escena:**

- Un objeto cualquiera llamado **Tienda** con el script **tienda.chs**.

**tienda.chs**

```
variable dinero = 20
variable mochila = []
variable precios = {vida: 5, fuerza: 8, rapidez: 12}

funcion comprar(pocion):
    variable existe = pocion en precios
    si no existe:
        mostrar("No vendemos " + pocion)
        devolver falso
    variable precio = precios[pocion]
    si precio > dinero:
        mostrar("No te llega para " + pocion)
        devolver falso
    dinero -= precio
    mochila.añadir(pocion)
    mostrar("Compras " + pocion + ". Te quedan {dinero} monedas")
    devolver verdadero

cuando empieza:
    para cada p en ["vida", "fuerza", "dragon", "rapidez"]:
        comprar(p)
    mostrar("En la mochila: " + mochila.unir(", "))
    si mochila.contiene("vida"):
        mostrar("Llevas una pocion de vida")
```

Cuando funcione, cámbialo: más enemigos, otro color, un sonido nuevo... ¡Es tuyo!

## Nivel 2: Objetos y eventos

Ahora el código da vida a los objetos de la escena. Cada objeto tiene su **script**, y dentro van los **eventos**: «cuando empieza», «cuando cada fotograma», «cuando toco Moneda»... En los ejemplos, el script es de un objeto cualquiera (con Colisión) y en la escena hay también un **Jugador**, una **Moneda**, un **Enemigo** y una **Meta** (objetos con esos nombres y con Colisión).

### Eventos: cuándo pasa cada cosa

En un juego, el código de cada objeto va dentro de eventos: «cuando pasa esto, haz esto otro». Cada objeto tiene su script.

#### `cuando evento`

Empieza un evento: código que se ejecuta cuando pasa algo (al empezar, al pulsar una tecla, al tocar otro objeto...).

```
cuando empieza:
    mostrar("Empieza el juego")
```

**Error típico:** Inventarse el evento: los que hay son fijos (cuando empieza, cuando toco...). Chispa entiende algunas formas parecidas (cuando empiece, cuando comienza), pero no cualquiera. Chispa te avisa con un error que explica qué pasa.

```
cuando empiezo:
    mostrar("hola")
```

#### `cuando empieza`

Se ejecuta una vez, cuando el objeto aparece en la escena.

```
cuando empieza:
    yo.vida = 3
    mostrar("Tengo", yo.vida, "vidas")
```

**Error típico:** Olvidar los dos puntos del final: la línea de un evento termina en :. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza
    mostrar("hola")
```

#### `cuando cada fotograma`

Se ejecuta unas 60 veces por segundo.

```
cuando cada fotograma:
    yo.x += 100 * delta
```

**Error típico:** Mover sin delta: en un ordenador rápido irá más deprisa que en uno lento. Multiplica por delta. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    yo.x += 5
```

#### `delta`

Segundos desde el fotograma anterior (unos 0.016).

```
cuando cada fotograma:
    yo.x += 200 * delta
```

**Error típico:** Usar delta fuera de cuando cada fotograma: en cuando empieza solo se mueve una vez, un poquito. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.x += 200 * delta
```

#### `tiempo.delta`

Segundos desde el fotograma anterior (igual que delta).

```
cuando cada fotograma:
    yo.x += 100 * tiempo.delta
```

**Error típico:** Ponerle paréntesis: es un dato, no una acción. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    yo.x += 100 * tiempo.delta()
```

### yo: el objeto y sus datos

yo es el objeto de este script. Tiene datos que se leen y se cambian: dónde está (x, y), su color, su tamaño... La Y crece hacia ARRIBA.

#### `yo`

El objeto al que pertenece este script.

```
cuando empieza:
    yo.x += 10
    mostrar(yo.nombre)
```

**Error típico:** Escribirlo en inglés (me o this): el objeto del script es yo. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    Yo.x = 10
    mostrar(me.x)
```

#### `yo.nombre`

El nombre del objeto.

```
cuando empieza:
    mostrar(yo.nombre)
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(yo.nombre())
```

#### `yo.tipo`

El tipo del objeto (normalmente, la plantilla de la que salió).

```
cuando empieza:
    mostrar(yo.tipo)
```

**Error típico:** Comparar con el tipo sin comillas: el tipo es un texto, "Prueba". Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    si yo.tipo == Prueba:
        mostrar("si")
```

#### `yo.x`

Posición horizontal del centro del objeto.

```
cuando cada fotograma:
    yo.x += 100 * delta
```

**Error típico:** Darle un texto: la x es un número (sin comillas). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.X = "100"
```

#### `yo.y`

Posición vertical del centro del objeto.

```
cuando cada fotograma:
    yo.y += 50 * delta
```

**Error típico:** Pensar que la y crece hacia abajo: en Chispa la Y crece hacia ARRIBA, así que restar hace BAJAR. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    yo.y -= 100 * delta   # para subir
```

#### `yo.posicion`

Posición como vector.

```
cuando empieza:
    yo.posicion = vector(100, 200)
```

**Error típico:** Escribir la posición con paréntesis solos: se escribe vector(100, 200). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.posicion = (100, 200)
```

#### `vector(x, y)`

Un vector: dos números juntos (una posición, una velocidad...).

```
cuando empieza:
    yo.posicion = vector(300, 200)
    mostrar(yo.posicion)
```

**Error típico:** Pasarle textos: los dos números van sin comillas. Chispa te avisa con un error que explica qué pasa.

```
variable v = vector("3", "4")
```

#### `vector.x`

El número horizontal.

```
variable v = vector(3, 4)
mostrar(v.x)
```

**Error típico:** Pedir algo que un vector no tiene: tiene x, y, longitud y normalizado. Chispa te avisa con un error que explica qué pasa.

```
variable v = vector(3, 4)
mostrar(v.z)
```

#### `vector.y`

El número vertical (positivo = hacia arriba).

```
variable v = vector(3, 4)
mostrar(v.y)
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
variable v = vector(3, 4)
mostrar(v.Y())
```

#### `vector.longitud`

Lo largo que es (por ejemplo, la rapidez de una velocidad).

```
mostrar(vector(3, 4).longitud)
```

**Error típico:** Llamarlo largo o tamano: es longitud. Chispa te avisa con un error que explica qué pasa.

```
mostrar(vector(3, 4).largo)
```

#### `vector.normalizado`

Un vector con la misma dirección pero de largo 1.

```
variable d = vector(3, 4).normalizado
mostrar(d)
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
variable d = vector(3, 4).normalizado()
```

#### `yo.rotacion`

Giro en grados (positivo = contrario a las agujas del reloj).

```
cuando empieza:
    yo.rotacion = 45
```

**Error típico:** Darle un texto: la rotación es un número de grados. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.rotacion = "45 grados"
```

#### `yo.escala`

Tamaño: 1 normal, 2 el doble.

```
cuando empieza:
    yo.escala = 2
```

**Error típico:** Poner la escala a 0: el objeto desaparece (sigue ahí, pero no se ve). La normal es 1. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.escala = 0
```

#### `yo.color`

El color de la forma (o del texto).

```
cuando empieza:
    yo.color = "rojo"
```

**Error típico:** Olvidar las comillas: los colores son textos, "rojo". Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.color = rojo
```

#### `yo.visible`

Si es falso, el objeto no se dibuja (pero sigue existiendo).

```
cuando empieza:
    yo.visible = falso
```

**Error típico:** Darle un texto: visible es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.visible = "no"
```

#### `yo.ancho`

Ancho del dibujo en píxeles.

```
cuando empieza:
    yo.ancho = 100
```

**Error típico:** Darle un texto: el ancho es un número de píxeles. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.ancho = "grande"
```

#### `yo.alto`

Alto del dibujo en píxeles.

```
cuando empieza:
    yo.alto = 20
```

**Error típico:** Olvidar yo.: alto solo no existe, es yo.alto. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.alto = alto * 2
```

#### `yo.opacidad`

De 0 (invisible) a 1 (normal).

```
cuando empieza:
    yo.opacidad = 0.5
```

**Error típico:** Usar porcentajes: la opacidad va de 0 a 1 (0.5 es la mitad). Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.opacidad = 50
```

#### `yo.transparencia`

Lo contrario de la opacidad: 0 = se ve normal, 1 = invisible, 0.5 = medio transparente.

```
cuando empieza:
    yo.transparencia = 0.5
```

**Error típico:** Confundirla con la opacidad: transparencia 1 es INVISIBLE (al revés que la opacidad). Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.transparencia = 1
```

#### `yo.capa`

Orden de dibujo: los de capa más alta se ven por encima.

```
cuando empieza:
    yo.capa = 10
```

**Error típico:** Darle un texto: la capa es un número (más alto = más por encima). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.capa = "delante"
```

#### `yo.voltear`

Si es verdadero, el dibujo se ve al revés (como en un espejo).

```
cuando cada fotograma:
    yo.voltear = yo.velocidad.x < 0
```

**Error típico:** Usarlo como acción: es un dato, se escribe yo.voltear = verdadero. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.voltear()
```

#### `yo.voltearVertical`

Si es verdadero, la imagen se ve boca abajo.

```
cuando empieza:
    yo.voltearVertical = verdadero
```

**Error típico:** Usarlo como acción: es un dato, yo.voltearVertical = verdadero. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.voltearvertical()
```

#### `yo.imagen`

La imagen que se dibuja (nombre de una imagen del proyecto).

```
cuando empieza:
    yo.imagen = "jugador_herido"
```

**Error típico:** Escribir mal el nombre de la imagen: tiene que ser una imagen del proyecto. Chispa te sugiere la parecida. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.imagen = "jugador_heridoo"
```

#### `yo.texto`

El texto de un objeto de texto, o la etiqueta de un botón.

```
cuando empieza:
    yo.texto = "Puntos: 0"
```

**Error típico:** Olvidar las comillas del texto. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.texto = Puntos
```

#### `yo.tamaño`

Lo grande que es: 1 = normal, 2 = el doble, 0.5 = la mitad.

```
cuando empieza:
    yo.tamano = 2
```

**Error típico:** Darle un texto: el tamaño es un número (1 normal, 2 el doble). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.tamano = "doble"
```

#### `yo.tamanoLetra`

El tamaño de la letra de un texto o de la etiqueta de un botón.

```
cuando empieza:
    yo.texto = "Hola"
    yo.tamanoLetra = 40
```

**Error típico:** Poner las unidades: es solo el número, 40. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.tamanoLetra = "40px"
```

#### `yo.colorTexto`

Color de la letra de las etiquetas (botones).

```
cuando empieza:
    yo.colorTexto = "negro"
```

**Error típico:** Olvidar las comillas del color. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.colorTexto = negro
```

### El teclado

Hay dos formas: eventos (cuando se pulsa) para cosas que pasan una vez, y teclado.pulsada() dentro de cuando cada fotograma para moverse. Las teclas se escriben entre comillas: "espacio", "izquierda", "a"...

#### `cuando se pulsa "tecla"`

Se ejecuta al pulsar una tecla (una vez por pulsación).

```
cuando se pulsa "espacio":
    mostrar("Salto")
```

**Error típico:** Olvidar las comillas del nombre de la tecla. Chispa te avisa con un error que explica qué pasa.

```
cuando se pulsa espacio:
    mostrar("salto")
```

#### `cuando se mantiene "tecla"`

Se ejecuta en cada fotograma mientras la tecla esté pulsada.

```
cuando se mantiene "derecha":
    yo.x += 200 * delta
```

**Error típico:** Usar cuando se pulsa para moverse: solo pasa UNA vez por pulsación. Para moverse mientras se mantiene, cuando se mantiene. Esto no da error: funciona, pero no hace lo que querías.

```
cuando se pulsa "derecha":
    yo.x += 200 * delta
```

#### `cuando se suelta "tecla"`

Se ejecuta al soltar una tecla.

```
cuando se suelta "espacio":
    mostrar("Soltada")
```

**Error típico:** Poner el nombre de la tecla en inglés: es "espacio". Chispa te dice los nombres que hay. Chispa te avisa con un error que explica qué pasa.

```
cuando se suelta "spacebar":
    mostrar("soltada")
```

#### `teclado.pulsada("tecla")`

Verdadero MIENTRAS la tecla esté pulsada.

```
cuando cada fotograma:
    si teclado.pulsada("izquierda"):
        yo.x -= 200 * delta
```

**Error típico:** Olvidar las comillas del nombre de la tecla. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    si teclado.pulsada(izquierda):
        yo.x -= 5
```

#### `teclado.sePulso("tecla")`

Verdadero solo en el fotograma en que se pulsa la tecla.

```
cuando cada fotograma:
    si teclado.sePulso("espacio"):
        mostrar("Una vez")
```

**Error típico:** Mirarlo en cuando empieza: solo es verdadero justo en el fotograma de la pulsación, así que hay que mirarlo en cada fotograma. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    si teclado.sepulso("espacio"):
        mostrar("salto")
```

#### `teclado.seSolto("tecla")`

Verdadero solo en el fotograma en que se suelta la tecla.

```
cuando cada fotograma:
    si teclado.seSolto("espacio"):
        mostrar("Soltada")
```

**Error típico:** Olvidar qué tecla: seSolto necesita el nombre de la tecla. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    si teclado.seSolto():
        mostrar("soltada")
```

#### `teclado.algunaSePulso()`

Verdadero en el fotograma en que se pulsa CUALQUIER tecla.

```
cuando cada fotograma:
    si teclado.algunaSePulso():
        mostrar("Empezamos")
```

**Error típico:** Olvidar los paréntesis: sin () no se pregunta nada, y el si se cumple siempre. Es teclado.algunaSePulso(). Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    si teclado.algunaSePulso:
        mostrar("empezamos")
```

#### `teclado.ultima`

La última tecla que se ha pulsado (su nombre: "a", "espacio"...), o nulo si todavía ninguna.

```
cuando cada fotograma:
    yo.texto = "Tecla: {teclado.ultima}"
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(teclado.ultima())
```

#### `teclado.pulsadas`

Una lista con las teclas que están pulsadas ahora mismo.

```
cuando cada fotograma:
    si teclado.pulsadas.longitud > 1:
        mostrar("Varias a la vez")
```

**Error típico:** Ponerle paréntesis: es un dato (una lista). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(teclado.pulsadas())
```

### El ratón

El ratón tiene posición (raton.x, raton.y) y botones. Los objetos pueden saber si el ratón está encima o si los arrastras.

#### `cuando hago clic`

Se ejecuta al hacer clic en cualquier sitio de la pantalla del juego.

```
cuando hago clic:
    mostrar("Clic en", raton.x, raton.y)
```

**Error típico:** Escribirlo a medias: es cuando hago clic:. Chispa te avisa con un error que explica qué pasa.

```
cuando clic:
    mostrar("clic")
```

#### `cuando hago clic encima`

Se ejecuta al hacer clic ENCIMA de este objeto.

```
cuando hago clic encima:
    yo.color = "amarillo"
```

**Error típico:** Usar cuando hago clic para un botón: vale para un clic en CUALQUIER sitio. Para que sea solo encima del botón, cuando hago clic encima. Esto no da error: funciona, pero no hace lo que querías.

```
cuando hago clic:
    escena.cambiar("Nivel2")
```

#### `raton.x`

Posición horizontal del ratón en el mundo.

```
cuando cada fotograma:
    yo.x = raton.x
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    yo.x = raton.x()
```

#### `raton.y`

Posición vertical del ratón en el mundo (hacia arriba).

```
cuando cada fotograma:
    yo.y = raton.y
```

**Error típico:** Escribirlo en inglés (mouse): es raton, sin tilde. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    yo.y = mouse.y
```

#### `raton.posicion`

Posición del ratón como vector.

```
cuando cada fotograma:
    yo.mirarA(raton.posicion)
```

**Error típico:** Mirar al raton entero: hay que decir su posición, raton.posicion. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    yo.mirarA(raton)
```

#### `raton.rueda`

Cuánto se ha girado la rueda en este fotograma (positivo = hacia abajo).

```
cuando cada fotograma:
    escena.camara.zoom -= raton.rueda * 0.001
```

**Error típico:** Usar la rueda tal cual: da números grandes (100 por vuelta), así que el zoom se vuelve loco. Multiplícala por algo pequeño. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    escena.camara.zoom -= raton.rueda
```

#### `raton.objeto`

El objeto que hay debajo del ratón (el de más arriba), o nulo si no hay ninguno.

```
cuando cada fotograma:
    si raton.sePulso() y raton.objeto != nulo:
        mostrar(raton.objeto.nombre)
```

**Error típico:** Usarlo sin comprobar que hay algo debajo: si no hay nada, es nulo y no tiene nombre. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    mostrar(raton.objeto.nombre)
```

#### `raton.visible`

Si es falso, la flecha del ratón no se ve encima del juego (para poner tu propia mira).

```
cuando empieza:
    raton.visible = falso
```

**Error típico:** Inventarse ocultar: se escribe raton.visible = falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    raton.ocultar()
```

#### `raton.pulsado("izquierdo")`

Verdadero mientras el botón esté pulsado ("izquierdo", "derecho" o "medio").

```
cuando cada fotograma:
    si raton.pulsado("izquierdo"):
        yo.x = raton.x
```

**Error típico:** Poner el botón en inglés: es "izquierdo", "derecho" o "medio". Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    si raton.pulsado("left"):
        mostrar("clic")
```

#### `raton.sePulso("izquierdo")`

Verdadero solo en el fotograma en que se pulsa el botón.

```
cuando cada fotograma:
    si raton.sePulso():
        mostrar("Clic")
```

**Error típico:** Olvidar los paréntesis: sin () no se pregunta nada, y el si se cumple siempre. Es raton.sePulso(). Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    si raton.sePulso:
        mostrar("clic")
```

#### `raton.seSolto("izquierdo")`

Verdadero solo en el fotograma en que se suelta el botón (por ejemplo, para soltar algo que arrastras).

```
cuando cada fotograma:
    si raton.seSolto():
        mostrar("Soltado")
```

**Error típico:** Poner un botón que no existe: son "izquierdo", "derecho" o "medio". Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    si raton.seSolto("arriba"):
        mostrar("soltado")
```

#### `yo.ratonEncima`

Verdadero si el ratón está encima del objeto (para resaltar botones).

```
cuando cada fotograma:
    si yo.ratonEncima:
        yo.color = "amarillo"
    sino:
        yo.color = "blanco"
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    si yo.ratonEncima():
        yo.color = "amarillo"
```

#### `yo.arrastrable`

Si es verdadero, se puede coger con el ratón y moverlo (puzles, inventarios, juegos de ordenar).

```
cuando empieza:
    yo.arrastrable = verdadero
```

**Error típico:** Inventarse la acción: se escribe yo.arrastrable = verdadero. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.arrastrar()
```

#### `yo.arrastrando`

Verdadero mientras se está arrastrando con el ratón (solo se lee).

```
cuando cada fotograma:
    si yo.arrastrando:
        yo.opacidad = 0.7
```

**Error típico:** Darle un valor: solo se lee. Para poder arrastrar, yo.arrastrable = verdadero. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.arrastrando = verdadero
```

### Moverse

Hay muchas formas de mover un objeto: sumar a su x y su y, con las flechas, hacia otro objeto, girando... Recuerda multiplicar por delta en cuando cada fotograma.

#### `yo.mover(x, y)`

Mueve el objeto esa cantidad de píxeles.

```
cuando cada fotograma:
    yo.mover(100 * delta, 0)
```

**Error típico:** Decir la dirección con palabras: mover usa números, cuántos píxeles en x y en y: yo.mover(10, 0). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.mover("derecha")
```

#### `yo.moverConFlechas(rapidez)`

Mueve el objeto con las flechas (o W A S D) a esa rapidez en píxeles por segundo.

```
cuando cada fotograma:
    yo.moverConFlechas(300)
```

**Error típico:** Ponerlo en cuando empieza: solo mira las flechas una vez. Tiene que ir en cuando cada fotograma. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.moverConFlechas(300)
```

#### `yo.rotar(grados)`

Gira el objeto esos grados.

```
cuando cada fotograma:
    yo.rotar(90 * delta)
```

**Error típico:** Olvidar cuántos grados. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    yo.rotar()
```

#### `yo.avanzar(pasos)`

Se mueve hacia donde mira (según su rotación), como «mover pasos» de Scratch.

```
cuando empieza:
    yo.rotacion = 45
    yo.avanzar(10)
```

**Error típico:** Usar una variable que no existe: di cuántos pasos con un número. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.avanzar(pasos)
```

#### `yo.moverHacia(destino, rapidez)`

Avanza hacia otro objeto o posición a esa rapidez (píxeles/segundo), sin pasarse.

```
cuando cada fotograma:
    yo.moverHacia(buscar("Jugador"), 80)
```

**Error típico:** Pasarle el nombre en vez del objeto: hay que buscarlo antes, buscar("Jugador"). Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    yo.moverHacia("Jugador", 80)
```

#### `yo.irA(destino, segundos)`

Va SUAVEMENTE hasta un sitio en esos segundos (1 si no se dice).

```
cuando empieza:
    yo.irA(400, 300, 2)
```

**Error típico:** Llamarlo en cada fotograma: empieza el viaje una y otra vez y nunca llega. Llámalo una sola vez. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    yo.irA(400, 300, 2)
```

#### `yo.teletransportar(destino)`

Se va DE GOLPE a otro sitio (un objeto, una posición o dos números), sin la velocidad que llevaba.

```
cuando empieza:
    yo.teletransportar(100, 300)
```

**Error típico:** Olvidar a dónde: un objeto, una posición o dos números. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.teletransportar()
```

#### `yo.mirarA(destino)`

Gira el objeto para que mire hacia otro objeto o posición.

```
cuando cada fotograma:
    yo.mirarA(raton.posicion)
```

**Error típico:** Pasarle el nombre: hay que darle el objeto (buscar("Jugador")) o una posición. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    yo.mirarA("Jugador")
```

#### `yo.rotarHacia(destino, gradosPorSegundo)`

Gira POCO A POCO hasta mirar hacia algo (180 grados por segundo si no se dice).

```
cuando cada fotograma:
    yo.rotarHacia(buscar("Jugador"), 90)
```

**Error típico:** Llamarlo una sola vez: gira un poco cada vez, así que va en cuando cada fotograma. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.rotarHacia(buscar("Jugador"), 90)
```

#### `yo.anguloA(destino)`

El ángulo (en grados) hacia otro objeto o posición: 0 = derecha, 90 = arriba.

```
cuando empieza:
    mostrar(yo.anguloA(buscar("Jugador")))
```

**Error típico:** Olvidar hacia dónde. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(yo.anguloA())
```

#### `yo.direccionA(destino)`

Un vector de largo 1 que apunta hacia otro objeto o posición.

```
cuando empieza:
    variable d = yo.direccionA(buscar("Jugador"))
    mostrar(d)
```

**Error típico:** Olvidar hacia dónde. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(yo.direccionA())
```

#### `yo.distanciaA(destino)`

Distancia en píxeles hasta otro objeto o una posición (también con dos números: x, y).

```
cuando empieza:
    mostrar(yo.distanciaA(buscar("Jugador")))
```

**Error típico:** Pasarle el nombre: hay que darle el objeto o una posición. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(yo.distanciaA("Jugador"))
```

#### `distancia(a, b)`

Distancia en píxeles entre dos objetos o dos posiciones.

```
cuando empieza:
    mostrar(distancia(yo, buscar("Jugador")))
```

**Error típico:** Darle un solo sitio: la distancia es entre DOS cosas. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(distancia(yo))
```

#### `angulo(desde, hasta)`

El ángulo en grados de la flecha que va de un objeto (o posición) a otro: 0 = derecha, 90 = arriba.

```
cuando empieza:
    yo.rotacion = angulo(yo, buscar("Jugador"))
```

**Error típico:** Darle un solo sitio: el ángulo va DE uno HASTA otro. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.rotacion = angulo(yo)
```

#### `seno(grados)`

El seno de un ángulo EN GRADOS.

```
cuando cada fotograma:
    yo.y = 200 + seno(tiempo.total * 90) * 50
```

**Error típico:** Olvidar que va en GRADOS: seno(tiempo.total) cambia muy despacio. Multiplica el tiempo (por 90, 180...). Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    yo.y = 200 + seno(tiempo.total) * 50
```

#### `coseno(grados)`

El coseno de un ángulo EN GRADOS.

```
cuando cada fotograma:
    yo.x = 400 + coseno(tiempo.total * 90) * 50
```

**Error típico:** Pasarle un texto: los grados son un número. Chispa te avisa con un error que explica qué pasa.

```
mostrar(coseno("90"))
```

#### `tangente(grados)`

La tangente de un ángulo EN GRADOS.

```
mostrar(tangente(45))
```

**Error típico:** Pedir la tangente de 90 grados: es infinita. Evita justo 90 y 270. Esto no da error: funciona, pero no hace lo que querías.

```
mostrar(tangente(90))
```

#### `pi`

El número pi (3.14159...): lo que mide una vuelta entera dividido entre su ancho.

```
variable radio = 10
mostrar(2 * pi * radio)
```

**Error típico:** Crear una variable llamada pi: tapa al número pi de verdad (3.14159...) y las cuentas salen mal. Esto no da error: funciona, pero no hace lo que querías.

```
variable pi = 3
```

### Choques: tocar cosas

Para que dos objetos se toquen, los dos necesitan Colisión (en el editor). Los sólidos chocan; los fantasmas se atraviesan pero avisan con cuando toco.

#### `cuando toco Nombre`

Se ejecuta al EMPEZAR a tocar un objeto con ese nombre o tipo, o una casilla de ese tipo.

```
cuando toco Moneda:
    destruir(otro)
```

**Error típico:** Que no pase nada al tocarse: los DOS objetos necesitan Colisión (en Propiedades, en el editor). Esto no da error: funciona, pero no hace lo que querías.

```
cuando toco Moneda:
    destruir(otro)
# y en el editor, la Moneda no tiene Colision
```

#### `cuando dejo de tocar Nombre`

Se ejecuta cuando deja de tocar un objeto o casilla.

```
cuando dejo de tocar Jugador:
    mostrar("Adios")
```

**Error típico:** Olvidar los dos puntos del final de la línea del evento. Chispa te avisa con un error que explica qué pasa.

```
cuando dejo de tocar Jugador
    mostrar("Adios")
```

#### `otro`

Dentro de 'cuando toco': el objeto que has tocado.

```
cuando toco Jugador:
    mostrar("Me ha tocado", otro.nombre)
```

**Error típico:** Usar otro fuera de cuando toco: solo existe dentro (es lo que has tocado). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    destruir(otro)
```

#### `cuando salgo de la pantalla`

Se ejecuta cuando el objeto sale de lo que se ve (por un borde de la pantalla).

```
cuando salgo de la pantalla:
    destruir(yo)
```

**Error típico:** Cambiar el verbo: es cuando salgo de la pantalla:. Chispa te avisa con un error que explica qué pasa.

```
cuando salga de la pantalla:
    destruir(yo)
```

#### `yo.tocando("Nombre")`

Verdadero si AHORA MISMO está tocando algo con ese nombre, tipo, etiqueta o tipo de casilla.

```
cuando cada fotograma:
    si yo.tocando("Jugador"):
        yo.color = "rojo"
```

**Error típico:** Olvidar las comillas: dentro de tocando el nombre va entre comillas. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    si yo.tocando(Lava):
        mostrar("quema")
```

#### `yo.solido`

Si es verdadero, los demás chocan con él.

```
cuando empieza:
    yo.solido = falso
```

**Error típico:** Darle un texto: es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.solido = "no"
```

#### `yo.fantasma`

Si es verdadero, se atraviesa, pero sigue avisando con "cuando toco" (zonas, monedas, metas).

```
cuando empieza:
    yo.fantasma = verdadero
```

**Error típico:** Darle un número: es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.fantasma = 1
```

#### `casilla`

Dentro de 'cuando toco': si has tocado una casilla de un mapa, su tipo (si no, nulo).

```
cuando toco:
    si casilla == "agua":
        yo.gravedad = 0.2
```

**Error típico:** Usar casilla fuera de cuando toco: solo existe dentro. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(casilla)
```

### Ejercicios del nivel 2

1. **Ir y volver.** Haz que el objeto se mueva a la derecha a 150 píxeles por segundo y, al pasar de x = 800, vuelva hacia la izquierda; al pasar de x = 100, otra vez a la derecha. (Pista: una variable direccion que vale 1 o -1.)
2. **Cambia de color.** Cada vez que pulses espacio, el objeto se pone de un color al azar entre rojo, verde, azul y amarillo.
3. **Vigila el ratón.** El objeto mira siempre hacia el ratón, y cuando toca la Moneda escribe «Tocado» en la consola.

Las soluciones, en [Soluciones](#soluciones) (nivel 2).

### Mini proyecto: Atrapa la moneda

Mueves al jugador con las flechas. Cada vez que toca la moneda, sumas un punto y la moneda salta a otro sitio al azar. El marcador se actualiza solo. Junta eventos, teclado, moverse, choques y datos de juego.

**Qué poner en la escena:**

- La escena con **gravedad 0** (sin nada seleccionado, en Propiedades > Escena), para moverse en las cuatro direcciones.
- Un **Jugador** (un cuadrado) con Colisión y el script **jugador.chs**.
- Una **Moneda** (un círculo amarillo) con Colisión, sin marcar «sólido», y el script **moneda.chs**.
- Un **Texto** llamado **Marcador** con el script **marcador.chs**.

**jugador.chs**

```
cuando cada fotograma:
    yo.moverConFlechas(300)
    yo.x = limitar(yo.x, 0, pantalla.ancho)
    yo.y = limitar(yo.y, 0, pantalla.alto)

cuando toco Moneda:
    juego.puntos += 1
    otro.x = aleatorio(50, pantalla.ancho - 50)
    otro.y = aleatorio(50, pantalla.alto - 50)
```

**moneda.chs**

```
cuando cada fotograma:
    yo.rotar(90 * delta)
```

**marcador.chs**

```
cuando empieza:
    juego.puntos = 0

cuando cada fotograma:
    yo.texto = "Puntos: {juego.puntos}"
```

Cuando funcione, cámbialo: más enemigos, otro color, un sonido nuevo... ¡Es tuyo!

## Nivel 3: Hacer juegos

Con lo que ya sabes, faltan las piezas de un juego de verdad: crear y destruir objetos, física, cámara, escenas, interfaz, sonido, tiempo, animaciones y efectos. En los ejemplos hay, además de lo del nivel 2, una **Plataforma** con Recorrido (que se mueve sola), un **mapa de casillas** llamado **Mapa** (con los tipos suelo, agua y hielo), las **plantillas** Bala (con Física y gravedad 0), Enemigo, Gota, Premio y Espada, las **escenas** Nivel2 y Fin, los **sonidos** salto, motor, tema y disparo, y las **animaciones** correr (que se repite) y golpe (que no).

### Crear, buscar y destruir objetos

Las plantillas son objetos «de molde» (balas, enemigos...): se crean desde el código con crear(). Para encontrar objetos de la escena, buscar().

#### `crear("Plantilla", x, y)`

Crea un objeto nuevo a partir de una plantilla, en la posición (x, y).

```
cuando empieza:
    variable bala = crear("Bala", yo.x, yo.y)
    bala.color = "amarillo"
```

**Error típico:** Olvidar las comillas del nombre de la plantilla. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    crear(Bala, 0, 0)
```

#### `destruir(objeto)`

Quita un objeto del juego.

```
cuando empieza:
    destruir(buscar("Moneda"))
```

**Error típico:** Pasarle el nombre: destruir necesita el objeto (otro, yo, o buscar("Moneda")). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    destruir("Moneda")
```

#### `yo.destruir()`

Quita el objeto del juego (igual que destruir(yo)).

```
cuando pasen 1 segundos:
    yo.destruir()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.destruir
```

#### `yo.destruido`

Verdadero si el objeto ya se ha destruido.

```
cuando empieza:
    variable m = buscar("Moneda")
    destruir(m)
    esperar()
    si m.destruido:
        mostrar("Ya no esta")
```

**Error típico:** Darle un valor: solo se lee. Para destruir, destruir(yo). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.destruido = verdadero
```

#### `buscar("Nombre")`

Busca un objeto por su nombre o su tipo.

```
cuando empieza:
    variable j = buscar("Jugador")
    si j != nulo:
        mostrar(j.x)
```

**Error típico:** Olvidar las comillas del nombre. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    variable j = buscar(Jugador)
```

#### `buscarTodos("Tipo")`

Da una lista con todos los objetos de ese nombre o tipo.

```
cuando empieza:
    para cada m en buscarTodos("Moneda"):
        m.color = "amarillo"
```

**Error típico:** Cambiar la lista entera: buscarTodos da una LISTA; hay que recorrerla con para cada. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscarTodos("Moneda").color = "amarillo"
```

#### `contar("Tipo")`

Cuántos objetos hay con ese nombre o tipo.

```
cuando empieza:
    mostrar(contar("Moneda"))
```

**Error típico:** Olvidar las comillas del nombre. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(contar(Moneda))
```

#### `clonar(objeto)`

Hace una copia del objeto tal como está ahora (sitio, color, tamaño, propiedades), con su script.

```
cuando empieza:
    variable copia = clonar(buscar("Moneda"))
    copia.x += 50
```

**Error típico:** Clonarse a sí mismo en cuando empieza: la copia también tiene ese cuando empieza, así que vuelve a clonarse... sin fin. Chispa lo corta con un error. Clona desde otro objeto, o en un evento que no se repita solo. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    clonar(yo)
```

#### `yo.clonar()`

Hace una copia de este objeto tal como está ahora, con su script.

```
cuando empieza:
    variable copia = buscar("Moneda").clonar()
    copia.x += 50
```

**Error típico:** Clonar en cada fotograma: cada copia también clona... y en un momento hay miles. Chispa lo para al llegar a 10.000 objetos. Clona una vez, o cada cierto tiempo. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    yo.clonar()
```

#### `yo.ponerEtiqueta("etiqueta")`

Le pone una etiqueta.

```
cuando empieza:
    yo.ponerEtiqueta("peligro")
    mostrar(yo.etiquetas)
```

**Error típico:** Olvidar las comillas de la etiqueta. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.ponerEtiqueta(peligro)
```

#### `yo.quitarEtiqueta("etiqueta")`

Le quita una etiqueta.

```
cuando empieza:
    yo.ponerEtiqueta("peligro")
    yo.quitarEtiqueta("peligro")
```

**Error típico:** Olvidar cuál. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.quitarEtiqueta()
```

#### `yo.tieneEtiqueta("etiqueta")`

Verdadero si tiene esa etiqueta.

```
cuando empieza:
    yo.ponerEtiqueta("malo")
    si yo.tieneEtiqueta("malo"):
        mostrar("Soy malo")
```

**Error típico:** Olvidar los paréntesis y la etiqueta: sin () no se pregunta nada, y el si se cumple siempre. Es yo.tieneEtiqueta("malo"). Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    si yo.tieneEtiqueta:
        mostrar("si")
```

#### `yo.etiquetas`

La lista de sus etiquetas.

```
cuando empieza:
    yo.ponerEtiqueta("malo")
    mostrar(yo.etiquetas)
```

**Error típico:** Darle un valor: se leen, pero se ponen con ponerEtiqueta. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.etiquetas = ["malo"]
```

#### `buscarConEtiqueta("etiqueta")`

Una lista con los objetos que tienen esa etiqueta (ver yo.ponerEtiqueta).

```
cuando empieza:
    yo.ponerEtiqueta("malo")
    para cada e en buscarConEtiqueta("malo"):
        e.color = "rojo"
```

**Error típico:** Cambiar la lista entera: da una lista; recórrela con para cada. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscarConEtiqueta("malo").color = "rojo"
```

#### `yo.cercanos(radio, "Tipo")`

Una lista con los objetos a menos de esos píxeles (de ese tipo, si se dice), del más cercano al más lejano.

```
cuando empieza:
    para cada e en yo.cercanos(1000):
        mostrar(e.nombre)
```

**Error típico:** Olvidar el radio: cercanos necesita a cuántos píxeles como mucho. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(yo.cercanos())
```

#### `yo.masCercano("Tipo", radio)`

El objeto más cercano (de ese tipo, y a menos de esos píxeles si se dice), o nulo si no hay.

```
cuando empieza:
    variable m = yo.masCercano("Moneda")
    si m != nulo:
        mostrar(m.nombre)
```

**Error típico:** No comprobar si es nulo: si no hay ninguno, da nulo y no tiene nombre. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(yo.masCercano("Dragon").nombre)
```

#### `escena.objetos`

Lista con todos los objetos de la escena.

```
cuando empieza:
    mostrar(escena.objetos.longitud)
```

**Error típico:** Ponerle paréntesis: es un dato (una lista). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(escena.objetos())
```

### Física: gravedad, velocidad y saltos

Con Física (en el editor), el objeto cae, choca y se puede empujar. La velocidad es un vector (x, y) en píxeles por segundo.

#### `yo.velocidad`

Velocidad en píxeles por segundo (necesita física).

```
cuando empieza:
    yo.velocidad = vector(200, 0)
```

**Error típico:** Darle un solo número: la velocidad es un vector (x, y): vector(200, 0). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.velocidad = 200
```

#### `yo.gravedad`

Cuánto le afecta la gravedad: 1 normal, 0 flota, 0.5 como en la luna.

```
cuando empieza:
    yo.gravedad = 0.5
```

**Error típico:** Darle un texto: es un número (1 normal, 0 flota). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.gravedad = "luna"
```

#### `escena.gravedad`

La gravedad de la escena (1500 normal, 0 para juegos vistos desde arriba).

```
cuando empieza:
    escena.gravedad = 0
```

**Error típico:** Confundirla con yo.gravedad: la de la escena va en píxeles por segundo (1500 es lo normal), así que 1 es casi nada. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    escena.gravedad = 1
```

#### `yo.rozamiento`

Cuánto frena en el suelo, de 0 (hielo) a 1 (se para en seco).

```
cuando empieza:
    yo.rozamiento = 0
```

**Error típico:** Darle un texto: va de 0 (hielo) a 1. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.rozamiento = "hielo"
```

#### `yo.rebote`

Cuánto rebota al chocar, de 0 (nada) a 1 (pelota perfecta).

```
cuando empieza:
    yo.rebote = 0.8
```

**Error típico:** Poner más de 1: cada bote sube más que el anterior y sale disparado. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.rebote = 5
```

#### `yo.masa`

Cuánto pesa.

```
cuando empieza:
    yo.masa = 10
```

**Error típico:** Darle un texto: la masa es un número. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.masa = "mucha"
```

#### `yo.estatico`

Si es verdadero, el objeto no se mueve nunca (como una pared).

```
cuando empieza:
    yo.estatico = verdadero
```

**Error típico:** Darle un texto: es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.estatico = "si"
```

#### `yo.saltar(fuerza)`

Salta, pero solo si está en el suelo.

```
cuando se pulsa "espacio":
    yo.saltar(600)
```

**Error típico:** Olvidar los paréntesis (y la fuerza): yo.saltar(600). Chispa te avisa con un error que explica qué pasa.

```
cuando se pulsa "espacio":
    yo.saltar
```

#### `yo.enSuelo`

Verdadero si está apoyado en el suelo (solo se lee).

```
cuando cada fotograma:
    si yo.enSuelo:
        yo.color = "verde"
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    si yo.enSuelo():
        yo.saltar(600)
```

#### `yo.tocaPared`

Verdadero si ha chocado con una pared (solo se lee).

```
cuando cada fotograma:
    si yo.tocaPared:
        yo.velocidad.x = -yo.velocidad.x
```

**Error típico:** Darle un valor: solo se lee (lo calcula la física). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.tocaPared = falso
```

#### `yo.tocaTecho`

Verdadero si se ha dado con la cabeza en un techo (solo se lee).

```
cuando cada fotograma:
    si yo.tocaTecho:
        mostrar("Ay")
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    si yo.tocatecho():
        mostrar("ay")
```

#### `yo.empujar(x, y)`

Da un golpe: cambia la velocidad según la masa (los pesados se mueven menos).

```
cuando empieza:
    yo.empujar(500, 200)
```

**Error típico:** Decir la fuerza con palabras: empujar usa números, la fuerza en x y en y: yo.empujar(500, 200). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.empujar("fuerte")
```

#### `yo.moviendo`

Solo en objetos con recorrido (plataformas que se mueven solas): si es falso, se para donde está; si es verdadero, sigue su camino.

```
cuando toco Jugador:
    yo.moviendo = falso
```

**Error típico:** Darle un texto: es verdadero o falso (y solo sirve en objetos con Recorrido). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.moviendo = "no"
```

### Mapas de casillas

Un mapa de casillas es una rejilla donde se pintan suelos y paredes. Desde el código se puede leer y cambiar cada casilla (columna, fila).

#### `mapa.casilla(columna, fila)`

Solo en mapas de casillas: el tipo de la casilla (o nulo si está vacía).

```
cuando empieza:
    variable mapa = buscar("Mapa")
    mostrar(mapa.casilla(0, 0))
```

**Error típico:** Usarlo en un objeto que no es un mapa: solo los mapas de casillas tienen casillas. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(yo.casilla(0, 0))
```

#### `mapa.ponerCasilla(columna, fila, "tipo")`

Solo en mapas: pone una casilla.

```
cuando empieza:
    buscar("Mapa").ponerCasilla(3, 0, "suelo")
```

**Error típico:** Escribir mal el tipo de casilla: tiene que ser uno de los tipos del mapa. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Mapa").ponerCasilla(3, 0, "suleo")
```

#### `mapa.quitarCasilla(columna, fila)`

Solo en mapas: quita una casilla.

```
cuando empieza:
    buscar("Mapa").quitarCasilla(0, 0)
```

**Error típico:** Olvidar la fila: hacen falta columna y fila. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Mapa").quitarCasilla(0)
```

#### `mapa.casillaEn(x, y)`

Solo en mapas: el tipo de la casilla que hay en un punto del mundo.

```
cuando empieza:
    mostrar(buscar("Mapa").casillaEn(yo.x, yo.y - 30))
```

**Error típico:** Pasarle el objeto: casillaEn necesita un punto (x, y). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(buscar("Mapa").casillaEn(yo))
```

#### `mapa.columnaEn(x)`

Solo en mapas: la columna que hay en esa X del mundo.

```
cuando empieza:
    mostrar(buscar("Mapa").columnaEn(yo.x))
```

**Error típico:** Olvidar la x. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(buscar("Mapa").columnaEn())
```

#### `mapa.filaEn(y)`

Solo en mapas: la fila que hay en esa Y del mundo.

```
cuando empieza:
    mostrar(buscar("Mapa").filaEn(yo.y))
```

**Error típico:** Olvidar la y. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(buscar("Mapa").filaEn())
```

#### `mapa.centroDeCasilla(columna, fila)`

Solo en mapas: el centro de una casilla, en el mundo (vector).

```
cuando empieza:
    yo.posicion = buscar("Mapa").centroDeCasilla(2, 5)
```

**Error típico:** Olvidar la fila. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.posicion = buscar("Mapa").centroDeCasilla(2)
```

### La cámara

La cámara decide qué parte del mundo se ve. Puede seguir al jugador, acercarse o temblar.

#### `escena.camara`

La cámara: qué parte del mundo se ve.

```
cuando empieza:
    escena.camara.seguir(yo)
```

**Error típico:** Olvidar escena.: la cámara está dentro de la escena, escena.camara. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    camara.seguir(yo)
```

#### `escena.camara.seguir(objeto)`

La cámara sigue a un objeto (suavemente).

```
cuando empieza:
    escena.camara.seguir(yo)
```

**Error típico:** Pasarle el nombre: seguir necesita el objeto (yo, o buscar("Jugador")). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.camara.seguir("Jugador")
```

#### `escena.camara.limites(izquierda, abajo, derecha, arriba)`

La cámara no enseña nada fuera de esta zona.

```
cuando empieza:
    escena.camara.limites(0, 0, 2000, 1000)
```

**Error típico:** Dar tres números: son cuatro (izquierda, abajo, derecha, arriba), o un mapa. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.camara.limites(0, 0, 2000)
```

#### `escena.camara.temblar(intensidad, segundos)`

Hace temblar la pantalla (explosiones, golpes).

```
cuando toco Enemigo:
    escena.camara.temblar(10, 0.3)
```

**Error típico:** Darle un texto: la intensidad es un número de píxeles. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.camara.temblar("fuerte")
```

#### `escena.camara.zoom`

1 = normal, 2 = más cerca (todo el doble de grande), 0.5 = más lejos.

```
cuando empieza:
    escena.camara.zoom = 2
```

**Error típico:** Poner el zoom a 0: no se vería nada, así que Chispa no lo deja. 1 es lo normal, 0.5 más lejos, 2 más cerca. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.camara.zoom = 0
```

#### `escena.camara.x`

Centro de la cámara (horizontal).

```
cuando empieza:
    escena.camara.x = 480
```

**Error típico:** Darle un texto: es un número. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.camara.x = "centro"
```

#### `escena.camara.y`

Centro de la cámara (vertical).

```
cuando empieza:
    escena.camara.y = 270
```

**Error típico:** Usarlo como acción: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.camara.y()
```

#### `escena.camara.suavizado`

Lo rápido que alcanza al objeto que sigue (8 por defecto; más alto = más rápido).

```
cuando empieza:
    escena.camara.suavizado = 3
```

**Error típico:** Darle un texto: es un número (8 por defecto). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.camara.suavizado = "mucho"
```

### Escenas

Un juego puede tener varias escenas: el menú, cada nivel, la pantalla de fin... Los datos de juego (juego.puntos) se conservan al cambiar.

#### `escena.nombre`

El nombre de la escena actual.

```
cuando empieza:
    mostrar(escena.nombre)
```

**Error típico:** Cambiar la escena dándole otro nombre: solo se lee. Para cambiar de escena, escena.cambiar("Nivel2"). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.nombre = "Nivel2"
```

#### `escena.cambiar("Nombre", segundos, transicion)`

Cambia a otra escena.

```
cuando toco Meta:
    escena.cambiar("Nivel2", 1)
```

**Error típico:** Escribir mal el nombre de la escena: tiene que ser como la llamaste en el editor. Chispa sugiere la parecida. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.cambiar("Nivel 2")
```

#### `escena.reiniciar()`

Vuelve a empezar la escena actual desde el principio.

```
cuando toco Enemigo:
    escena.reiniciar()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando toco Enemigo:
    escena.reiniciar
```

#### `escena.colorFondo`

El color del fondo de la escena.

```
cuando empieza:
    escena.colorFondo = "azul"
```

**Error típico:** Olvidar las comillas del color. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.colorFondo = azul
```

### Interfaz y dibujo en la pantalla

La interfaz (vida, puntos, botones) se queda pegada a la pantalla aunque la cámara se mueva. También se puede dibujar directamente (líneas, círculos, textos) en cada fotograma.

#### `yo.fijo`

Si es verdadero, se queda pegado a la pantalla (interfaz: vida, puntos, botones).

```
cuando empieza:
    yo.fijo = verdadero
```

**Error típico:** Darle un texto: es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.fijo = "pantalla"
```

#### `pantalla.ancho`

Ancho de la pantalla del juego en píxeles.

```
cuando empieza:
    yo.x = pantalla.ancho / 2
```

**Error típico:** Darle un valor: solo se lee. El tamaño se cambia en el editor (Propiedades del juego). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.ancho = 1280
```

#### `pantalla.alto`

Alto de la pantalla del juego en píxeles.

```
cuando empieza:
    yo.y = pantalla.alto - 30
```

**Error típico:** Llamarlo altura: es pantalla.alto. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.y = pantalla.altura
```

#### `pantalla.completa`

Pantalla completa: verdadero para ponerla, falso para quitarla.

```
cuando se pulsa "f":
    pantalla.completa = no pantalla.completa
```

**Error típico:** Ponerla al empezar: el navegador solo deja justo después de pulsar una tecla o hacer clic. Ponla en cuando se pulsa. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    pantalla.completa = verdadero
```

#### `dibujar.linea(x1, y1, x2, y2, color, grosor)`

Una línea de un punto a otro.

```
cuando cada fotograma:
    dibujar.linea(yo.x, yo.y, raton.x, raton.y, "rojo")
```

**Error típico:** Dibujar solo una vez: lo dibujado dura UN fotograma. Va en cuando cada fotograma. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    dibujar.linea(0, 0, 100, 100, "rojo")
```

#### `dibujar.circulo(x, y, radio, color, relleno)`

Un círculo (solo el borde; con verdadero al final, relleno).

```
cuando cada fotograma:
    dibujar.circulo(yo.x, yo.y, 100, "verde")
```

**Error típico:** Olvidar el radio. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.circulo(yo.x, yo.y)
```

#### `dibujar.rectangulo(x, y, ancho, alto, color, relleno)`

Un rectángulo con su centro en (x, y), como los objetos.

```
cuando cada fotograma:
    dibujar.rectangulo(yo.x, yo.y, 64, 64, "azul")
```

**Error típico:** Olvidar el alto: van x, y, ancho y alto. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.rectangulo(yo.x, yo.y, 64)
```

#### `dibujar.texto(texto, x, y, color, tamano, letra)`

Un texto en ese sitio del mundo (por ejemplo, encima de un enemigo).

```
cuando cada fotograma:
    dibujar.texto("Hola", yo.x, yo.y + 40, "blanco")
```

**Error típico:** Poner el texto al final: primero va el texto, luego x e y. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.texto(yo.x, yo.y, "Hola")
```

#### `dibujar.arco(x, y, radio, desde, hasta, color, relleno, grosor)`

Un trozo de circulo de un angulo a otro, en grados (0 = derecha, 90 = arriba, y se cuenta al reves que las agujas del reloj).

```
cuando cada fotograma:
    dibujar.arco(yo.x, yo.y, 30, 90, 180, "blanco", verdadero)
```

**Error típico:** Olvidar de qué ángulo a qué ángulo. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.arco(yo.x, yo.y, 30)
```

#### `dibujar.enPantalla`

Lo mismo, pero en la PANTALLA, como la interfaz: (0, 0) es la esquina de abajo a la izquierda y no se mueve con la camara.

```
cuando cada fotograma:
    dibujar.enPantalla.rectangulo(120, 500, 200, 16, "rojo", verdadero)
```

**Error típico:** Usarlo como acción: es un grupo de acciones; se escribe dibujar.enPantalla.rectangulo(...). Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.enpantalla()
```

#### `dibujar.enPantalla.linea(x1, y1, x2, y2, color, grosor)`

Una linea en la pantalla.

```
cuando cada fotograma:
    dibujar.enPantalla.linea(0, 270, 960, 270, "blanco")
```

**Error típico:** Olvidar el punto final. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.enPantalla.linea(0, 270)
```

#### `dibujar.enPantalla.circulo(x, y, radio, color, relleno)`

Un circulo en la pantalla.

```
cuando cada fotograma:
    dibujar.enPantalla.circulo(60, 60, 30, "blanco", verdadero)
```

**Error típico:** Olvidar el radio. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.enPantalla.circulo(60, 60)
```

#### `dibujar.enPantalla.rectangulo(x, y, ancho, alto, color, relleno)`

Un rectangulo con el centro en (x, y) de la pantalla.

```
cuando cada fotograma:
    dibujar.enPantalla.rectangulo(110, 500, 200, 16, "rojo", verdadero)
```

**Error típico:** Olvidar que la posición es el CENTRO: con (0, 0) se ve solo un cuarto del rectángulo, en la esquina. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    dibujar.enPantalla.rectangulo(0, 0, 200, 16, "rojo", verdadero)
```

#### `dibujar.enPantalla.texto(texto, x, y, color, tamano, letra)`

Un texto en la pantalla.

```
cuando cada fotograma:
    dibujar.enPantalla.texto("Vida", 20, 500, "blanco")
```

**Error típico:** Poner el texto al final: primero el texto, luego x e y. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.enPantalla.texto(20, 500, "Vida")
```

#### `dibujar.enPantalla.arco(x, y, radio, desde, hasta, color, relleno, grosor)`

Un trozo de circulo en la pantalla (quesito si relleno = verdadero).

```
cuando cada fotograma:
    dibujar.enPantalla.arco(60, 60, 30, 90, 270, "#00000099", verdadero)
```

**Error típico:** Olvidar el radio y los ángulos. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.enPantalla.arco(60, 60)
```

#### `yo.ponerDelante()`

Se dibuja por encima de todos los demás (cambia su capa).

```
cuando hago clic encima:
    yo.ponerDelante()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.ponerDelante
```

#### `yo.ponerDetras()`

Se dibuja por debajo de todos los demás.

```
cuando empieza:
    yo.ponerDetras()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.ponerDetras
```

#### `yo.ocultar()`

Deja de verse (sigue existiendo y chocando).

```
cuando empieza:
    yo.ocultar()
```

**Error típico:** Pensar que un objeto oculto ya no choca: sigue ahí. Para quitarlo de verdad, destruir(yo); para atravesarlo, yo.solido = falso. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.ocultar()
    # y pensar que ya no choca
```

#### `yo.aparecer()`

Vuelve a verse.

```
cuando empieza:
    yo.ocultar()
    esperar(1)
    yo.aparecer()
```

**Error típico:** Usar yo.mostrar(): mostrar escribe en la consola; para volver a verse, yo.aparecer(). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.mostrar()
```

#### `yo.parpadear(segundos, vecesPorSegundo)`

Se enciende y se apaga durante esos segundos (1 si no se dice) y al final se queda visible.

```
cuando toco Enemigo:
    yo.parpadear(1)
```

**Error típico:** Darle un texto: son segundos (un número). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.parpadear("rapido")
```

#### `yo.pegarA(otro)`

Se pega a otro objeto (su «padre»): a partir de ahora se mueve con él.

```
cuando empieza:
    variable b = crear("Bala", yo.x, yo.y)
    b.pegarA(yo)
```

**Error típico:** Pasarle el nombre: pegarA necesita el objeto (buscar("Jugador")). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.pegarA("Jugador")
```

#### `yo.soltar()`

Se despega de su padre y vuelve a moverse solo.

```
cuando empieza:
    yo.pegarA(buscar("Jugador"))
    yo.soltar()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.soltar
```

#### `yo.padre`

El objeto al que está pegado (o nulo).

```
cuando empieza:
    yo.pegarA(buscar("Jugador"))
    si yo.padre != nulo:
        mostrar(yo.padre.nombre)
```

**Error típico:** No comprobar si es nulo: si no está pegado a nada, padre es nulo. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(yo.padre.nombre)
```

#### `yo.hijos`

La lista de los objetos pegados a este.

```
cuando empieza:
    crear("Bala", 0, 0).pegarA(yo)
    para cada h en yo.hijos:
        h.color = "rojo"
```

**Error típico:** Cambiar la lista entera: hijos es una lista; recórrela con para cada. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.hijos.color = "rojo"
```

### Sonido y música

Los sonidos se importan en el editor (Proyecto > Sonidos) y se usan por su nombre. La música suena en bucle.

#### `sonido.reproducir("nombre", volumen, tono, lado)`

Reproduce un sonido del proyecto (importado, o hecho con el generador de efectos).

```
cuando se pulsa "espacio":
    sonido.reproducir("salto")
```

**Error típico:** Escribir mal el nombre: tiene que ser un sonido del proyecto. Chispa sugiere el parecido. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sonido.reproducir("slato")
```

#### `sonido.bucle("nombre", volumen)`

Reproduce un sonido una y otra vez, hasta que se pare con sonido.parar("nombre").

```
cuando empieza:
    sonido.bucle("motor", 0.4)
```

**Error típico:** Reproducir en cada fotograma para que suene siempre: se amontonan 60 sonidos por segundo. Para eso está sonido.bucle. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    sonido.reproducir("motor")
```

#### `sonido.parar("nombre")`

Para un sonido (o todos, sin nombre).

```
cuando empieza:
    sonido.bucle("motor")
    esperar(1)
    sonido.parar("motor")
```

**Error típico:** Olvidar las comillas del nombre. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sonido.parar(motor)
```

#### `sonido.sonando("nombre")`

Verdadero si ese sonido está sonando ahora.

```
cuando empieza:
    si no sonido.sonando("motor"):
        sonido.bucle("motor")
```

**Error típico:** Olvidar los paréntesis y el nombre: sin () no se pregunta nada, y el si se cumple siempre. Es sonido.sonando("motor"). Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    si sonido.sonando:
        mostrar("suena")
```

#### `sonido.pausar()`

Congela TODO el sonido (efectos y música) sin perder por dónde iba.

```
cuando se pulsa "p":
    sonido.pausar()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando se pulsa "p":
    sonido.pausar
```

#### `sonido.seguir()`

Sigue el sonido que se había pausado con sonido.pausar().

```
cuando se pulsa "c":
    sonido.seguir()
```

**Error típico:** Llamarlo continuar: es seguir. Chispa te avisa con un error que explica qué pasa.

```
cuando se pulsa "c":
    sonido.continuar()
```

#### `sonido.tono(frecuencia, segundos)`

Un pitido generado, sin archivos.

```
cuando se pulsa "espacio":
    sonido.tono(880, 0.1)
```

**Error típico:** Darle el nombre de la nota: es la frecuencia en números (440 es La). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sonido.tono("La")
```

#### `sonido.volumen`

Volumen de los efectos, de 0 a 1.

```
cuando empieza:
    sonido.volumen = 0.5
```

**Error típico:** Usar porcentajes: va de 0 a 1. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    sonido.volumen = 50
```

#### `musica.reproducir("nombre", fundido)`

Pone una música en bucle (para la anterior).

```
cuando empieza:
    musica.reproducir("tema", 2)
```

**Error típico:** Ponerla en cada fotograma: basta una vez, en cuando empieza; ya suena en bucle. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    musica.reproducir("tema")
```

#### `musica.parar(fundido)`

Para la música.

```
cuando toco Meta:
    musica.parar(2)
```

**Error típico:** Darle el nombre: parar no lo necesita (solo hay una música); el número es el fundido. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    musica.parar("tema")
```

#### `musica.pausar()`

Pone la música en pausa (recuerda por dónde iba).

```
cuando se pulsa "p":
    musica.pausar()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando se pulsa "p":
    musica.pausar
```

#### `musica.seguir()`

Sigue la música por donde iba.

```
cuando se pulsa "c":
    musica.seguir()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando se pulsa "c":
    musica.seguir
```

#### `musica.volumen`

Volumen de la música, de 0 a 1.

```
cuando empieza:
    musica.volumen = 0.3
```

**Error típico:** Darle un texto: es un número de 0 a 1. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    musica.volumen = "bajo"
```

#### `musica.actual`

El nombre de la música que suena (o nulo).

```
cuando empieza:
    si musica.actual == nulo:
        musica.reproducir("tema")
```

**Error típico:** Darle un valor: solo se lee. Para poner música, musica.reproducir("tema"). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    musica.actual = "tema"
```

### Tiempo y temporizadores

Para que algo pase dentro de un rato o cada cierto tiempo, hay eventos y funciones de tiempo. esperar() para ESE evento sin parar el juego.

#### `cuando cada 2 segundos`

Se ejecuta una y otra vez, cada cierto tiempo.

```
cuando cada 2 segundos:
    crear("Enemigo", 900, 300)
```

**Error típico:** Poner segundo en singular con un 2: con 1 vale segundo, con más, segundos. (Chispa acepta los dos, pero mejor bien escrito.) El error de verdad es olvidar el número. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada 2 segundo:
    crear("Enemigo", 900, 300)
```

#### `cuando pasen 3 segundos`

Se ejecuta UNA sola vez, ese tiempo después de que aparezca el objeto.

```
cuando pasen 3 segundos:
    destruir(yo)
```

**Error típico:** Olvidar el número de segundos. Chispa te avisa con un error que explica qué pasa.

```
cuando pasen segundos:
    destruir(yo)
```

#### `esperar(segundos)`

Pausa ESTE evento un rato, sin parar el juego.

```
cuando empieza:
    yo.visible = falso
    esperar(0.5)
    yo.visible = verdadero
```

**Error típico:** Darle un texto: son segundos, un número. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    esperar("1 segundo")
```

#### `cronometro()`

Un cronómetro nuevo, que empieza a contar ya.

```
cuando empieza:
    variable crono = cronometro()
    esperar(0.5)
    mostrar(crono.segundos)
```

**Error típico:** Olvidar los paréntesis: cronometro() crea un cronómetro nuevo. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    variable crono = cronometro
    mostrar(crono.segundos)
```

#### `tiempo.total`

Segundos que lleva funcionando el juego.

```
cuando cada fotograma:
    yo.texto = "Tiempo: {redondear(tiempo.total)}"
```

**Error típico:** Darle un valor: solo se lee. Para contar desde ahora, usa un cronometro(). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    tiempo.total = 0
```

#### `tiempo.escala`

La velocidad del tiempo: 1 = normal, 0.5 = cámara lenta, 2 = el doble de rápido, 0 = pausa.

```
cuando empieza:
    tiempo.escala = 0.5
```

**Error típico:** Darle un texto: es un número (1 normal, 0.5 lento). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    tiempo.escala = "lento"
```

#### `tiempo.pausado`

Verdadero si el juego está en pausa (tiempo.pausar()).

```
cuando cada fotograma:
    si tiempo.pausado:
        yo.texto = "PAUSA"
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    si tiempo.pausado():
        mostrar("pausa")
```

#### `tiempo.pausar()`

Pone el juego en pausa: todo se para (física, animaciones, cronómetros), pero las teclas siguen funcionando para poder quitarla.

```
cuando se pulsa "p":
    si tiempo.pausado:
        tiempo.seguir()
    sino:
        tiempo.pausar()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando se pulsa "p":
    tiempo.pausar
```

#### `tiempo.seguir()`

Quita la pausa.

```
cuando se pulsa "c":
    tiempo.seguir()
```

**Error típico:** Llamarlo continuar: es seguir. Chispa te avisa con un error que explica qué pasa.

```
cuando se pulsa "c":
    tiempo.continuar()
```

#### `tiempo.fps`

Fotogramas por segundo: cuántas veces por segundo se dibuja el juego (60 es lo normal).

```
cuando cada fotograma:
    yo.texto = "FPS: {tiempo.fps}"
```

**Error típico:** Darle un valor: solo se lee (lo decide el ordenador). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    tiempo.fps = 120
```

### Animaciones y partículas

Las animaciones se hacen en el editor (fotogramas) y se ponen con yo.animar(). Las partículas son efectos ya hechos: explosiones, humo, confeti...

#### `yo.animar("nombre")`

Empieza una animación del proyecto.

```
cuando empieza:
    yo.animar("correr")
```

**Error típico:** Escribir mal el nombre: tiene que ser una animación del proyecto. Chispa sugiere la parecida. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.animar("corer")
```

#### `yo.animacion`

La animación que suena ahora (o nulo).

```
cuando cada fotograma:
    si yo.animacion != "correr":
        yo.animacion = "correr"
```

**Error típico:** Olvidar las comillas del nombre. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.animacion = correr
```

#### `yo.pararAnimacion()`

Para la animación (se queda en el fotograma actual).

```
cuando empieza:
    yo.animar("correr")
    esperar(1)
    yo.pararAnimacion()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.pararAnimacion
```

#### `cuando termina la animacion`

Se ejecuta cuando termina una animación que no se repite.

```
cuando empieza:
    yo.animar("golpe")

cuando termina la animacion:
    yo.animar("correr")
```

**Error típico:** Esperarlo en una animación que se repite: una que se repite no termina nunca. Quita «repetir» en el editor de animaciones. Esto no da error: funciona, pero no hace lo que querías.

```
cuando termina la animacion:
    yo.animar("correr")
# con una animacion que se repite
```

#### `particulas("tipo", x, y)`

Crea un efecto de partículas.

```
cuando empieza:
    particulas("explosion", yo.x, yo.y)
```

**Error típico:** Escribir mal el tipo: hay explosion, humo, chispas, polvo, confeti y estrellas. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    particulas("explocion", yo.x, yo.y)
```

### Formas

Un objeto puede tener muchas formas: rectángulo, círculo, triángulo, estrella, corazón, flecha... y choca con su forma de verdad (una pelota rueda por una rampa). Algunas formas tienen datos propios: los lados de un polígono, el hueco de un anillo...

#### `yo.forma`

La forma del dibujo: "rectangulo", "circulo", "triangulo", "elipse", "poligono", "estrella", "rombo", "corazon", "flecha", "linea", "capsula", "redondeado", "anillo", "arco", "camino" o "texto".

```
cuando empieza:
    yo.forma = "estrella"
```

**Error típico:** Inventarse una forma: un hexágono es un "poligono" con yo.lados = 6. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.forma = "hexagono"
```

#### `yo.lados`

Cuántos lados tiene un polígono (6 si no se dice) o cuántas puntas una estrella (5).

```
cuando empieza:
    yo.forma = "poligono"
    yo.lados = 8
```

**Error típico:** Darle menos de 3 lados: con 2 no hay forma. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.forma = "poligono"
    yo.lados = 2
```

#### `yo.radioInterior`

Lo grande que es el hueco de una estrella, un anillo o un arco, de 0 a 1 (0,5 en la estrella y 0,6 en el anillo).

```
cuando empieza:
    yo.forma = "anillo"
    yo.radioInterior = 0.8
```

**Error típico:** Darlo en píxeles: va de 0 (sin hueco) a 1 (hueco del todo). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.forma = "anillo"
    yo.radioInterior = 30
```

#### `yo.radioEsquina`

En un rectángulo redondeado, el radio de las esquinas en píxeles.

```
cuando empieza:
    yo.forma = "redondeado"
    yo.radioEsquina = 12
```

**Error típico:** Ponerlo en un rectángulo normal: solo se nota con yo.forma = "redondeado". Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.radioEsquina = 12
```

#### `yo.inicioArco`

Dónde empieza un arco, en grados (0 = derecha, 90 = arriba).

```
cuando empieza:
    yo.forma = "arco"
    yo.inicioArco = 90
```

**Error típico:** Darle un texto: son grados (90 = arriba). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.forma = "arco"
    yo.inicioArco = "arriba"
```

#### `yo.finArco`

Dónde termina un arco, en grados (180 si no se dice: medio anillo).

```
cuando empieza:
    yo.forma = "arco"
    yo.finArco = 270
```

**Error típico:** Poner el mismo ángulo al principio y al final: el arco no tiene nada que dibujar. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.forma = "arco"
    yo.inicioArco = 180
    yo.finArco = 180
```

#### `yo.grosor`

Lo gorda que es una línea o un camino abierto, en píxeles.

```
cuando empieza:
    yo.forma = "linea"
    yo.grosor = 10
```

**Error típico:** Darle un texto: son píxeles. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.forma = "linea"
    yo.grosor = "gordo"
```

#### `yo.formaColision`

Cómo choca: "auto" (con su forma, salvo los rectángulos), "caja" (como un rectángulo) o "figura" (con su forma, también girada).

```
cuando empieza:
    yo.forma = "estrella"
    yo.formaColision = "caja"
```

**Error típico:** Inventarse el valor: es "auto", "caja" o "figura". Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.formaColision = "cuadrado"
```

#### `yo.ponerCamino(puntos, cerrado)`

Le da una forma libre: una lista de puntos (vectores, desde su centro).

```
cuando empieza:
    yo.ponerCamino([vector(-50, -30), vector(0, 40), vector(50, -30)])
```

**Error típico:** Olvidar los corchetes: los puntos van en UNA lista. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.ponerCamino(vector(-50, 0), vector(50, 0))
```

### Colores y estilo

Además de un color, una forma puede tener un degradado, un patrón o una imagen por dentro, un borde, sombra y resplandor. Y se puede elegir cómo se mezcla con lo de detrás (sumar luz queda genial en fuegos y poderes). Hay paletas de colores listas que quedan bien juntos.

#### `yo.relleno`

Cómo se rellena la forma: "color" (lo normal), "degradado" (de color a color2), "radial" (degradado redondo, del centro hacia fuera), "patron" (rayas, puntos...) o "imagen" (una imagen repetida).

```
cuando empieza:
    yo.relleno = "degradado"
    yo.color = "amarillo"
    yo.color2 = "rojo"
```

**Error típico:** Escribirlo mal: Chispa te dice el parecido ("degradado"). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.relleno = "degradao"
```

#### `yo.color2`

El segundo color: el final de un degradado o el dibujo de un patrón.

```
cuando empieza:
    yo.relleno = "radial"
    yo.color2 = "azul"
```

**Error típico:** Ponerlo con el relleno normal: color2 solo se ve en degradados y patrones. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.color2 = "azul"
```

#### `yo.anguloDegradado`

Hacia dónde va el degradado, en grados: 0 = de izquierda a derecha, 90 = de abajo arriba (lo normal).

```
cuando empieza:
    yo.relleno = "degradado"
    yo.anguloDegradado = 0
```

**Error típico:** Darle un texto: son grados (0 = horizontal). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.relleno = "degradado"
    yo.anguloDegradado = "horizontal"
```

#### `yo.patron`

El dibujo del relleno "patron": "rayas", "puntos", "cuadros", "rombos", "ondas" o "ladrillos" (con color de fondo y color2 de dibujo).

```
cuando empieza:
    yo.relleno = "patron"
    yo.patron = "cuadros"
    yo.color2 = "negro"
```

**Error típico:** Olvidar yo.relleno = "patron": sin eso el patrón no se ve. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.patron = "cuadros"
```

#### `yo.imagenRelleno`

La imagen del proyecto que se repite dentro de la forma, con relleno "imagen".

```
cuando empieza:
    yo.relleno = "imagen"
    yo.imagenRelleno = "jugador"
```

**Error típico:** Usar una imagen que no existe: Chispa dice cuáles hay. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.relleno = "imagen"
    yo.imagenRelleno = "ladrilloo"
```

#### `yo.borde`

El grosor del borde en píxeles (0 = sin borde).

```
cuando empieza:
    yo.borde = 4
    yo.colorBorde = "blanco"
```

**Error típico:** Darle un texto: el borde son píxeles. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.borde = "gordo"
```

#### `yo.colorBorde`

El color del borde (negro si no se dice).

```
cuando empieza:
    yo.borde = 3
    yo.colorBorde = "negro"
```

**Error típico:** Inventarse un color: Chispa avisa y propone el parecido. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.borde = 3
    yo.colorBorde = "blanquito"
```

#### `yo.bordeDiscontinuo`

Si es verdadero, el borde es a rayitas (como una línea de recortar).

```
cuando empieza:
    yo.borde = 2
    yo.bordeDiscontinuo = verdadero
```

**Error típico:** Olvidar el grosor: sin yo.borde no hay borde que cortar. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.bordeDiscontinuo = verdadero
```

#### `yo.sombra`

El color de la sombra (con algo de transparencia queda mejor: "#00000088").

```
cuando empieza:
    yo.sombra = "#00000088"
```

**Error típico:** Darle un texto que no es un color: la sombra es un color (o verdadero). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.sombra = "sombra"
```

#### `yo.sombraX`

Cuánto se aparta la sombra hacia la derecha, en píxeles (6).

```
cuando empieza:
    yo.sombra = verdadero
    yo.sombraX = 12
```

**Error típico:** Moverla sin poner yo.sombra: no hay sombra que mover. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.sombraX = 12
```

#### `yo.sombraY`

Cuánto se aparta la sombra hacia arriba, en píxeles (-6: hacia abajo).

```
cuando empieza:
    yo.sombra = verdadero
    yo.sombraY = -12
```

**Error típico:** Ponerla en positivo para bajarla: en Chispa la Y va hacia ARRIBA, así que la sombra sube. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.sombra = verdadero
    yo.sombraY = 12
```

#### `yo.desenfoqueSombra`

Lo borrosa que es la sombra (0 = con bordes duros).

```
cuando empieza:
    yo.sombra = verdadero
    yo.desenfoqueSombra = 0
```

**Error típico:** Darle un texto: son píxeles. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.sombra = verdadero
    yo.desenfoqueSombra = "mucho"
```

#### `yo.resplandor`

Un brillo alrededor del objeto, de ese color (nulo lo quita).

```
cuando empieza:
    yo.resplandor = "amarillo"
```

**Error típico:** Darle un texto que no es un color. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.resplandor = "brillante"
```

#### `yo.tamanoResplandor`

Lo grande que es el resplandor, en píxeles (16).

```
cuando empieza:
    yo.resplandor = "amarillo"
    yo.tamanoResplandor = 30
```

**Error típico:** Cambiar el tamaño sin poner yo.resplandor: no hay brillo. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.tamanoResplandor = 30
```

#### `yo.mezcla`

Cómo se junta con lo que hay detrás: "normal", "sumar" (luz que se suma: fuego, magia), "multiplicar" (sombras), "pantalla", "superponer", "oscurecer", "aclarar" o "diferencia".

```
cuando empieza:
    yo.mezcla = "sumar"
```

**Error típico:** Escribirlo mal: es "sumar" (Chispa propone el parecido). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.mezcla = "suma"
```

#### `paleta("nombre", n)`

Los colores de una paleta lista ("pastel", "retro", "neon", "natural", "oceano", "fuego", "bosque", "caramelo", "grises", "arcoiris").

```
cuando empieza:
    yo.color = paleta("neon", 3)
```

**Error típico:** Pedir un color que no hay: cada paleta tiene 8 (del 1 al 8). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.color = paleta("neon", 9)
```

#### `mezclarColores(color1, color2, cuanto)`

El color que sale de mezclar dos: con 0 da el primero, con 1 el segundo y con 0.5 el de en medio.

```
cuando empieza:
    yo.color = mezclarColores("rojo", "amarillo", 0.5)
```

**Error típico:** Escribir mal un color: no se puede mezclar. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.color = mezclarColores("rojo", "amarilo", 0.5)
```

### Efectos especiales

Con un solo comando: explosiones, fuego, humo, rayos, lluvia... Están todos en efecto. El sitio puede ser un objeto (el efecto lo sigue), un vector, dos números o nada (donde está este objeto). Los que duran (fuego, humo, lluvia...) siguen hasta que los paras.

#### `efecto.explosion(sitio, tamaño)`

Una explosión: fuego, humo, un destello y una onda.

```
cuando toco Enemigo:
    efecto.explosion(otro)
    destruir(otro)
```

**Error típico:** Darle tamaño 0: una explosión tiene que tener algo de tamaño. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.explosion(yo, 0)
```

#### `efecto.fuego(sitio, segundos)`

Fuego que no se apaga (o que dura esos segundos).

```
cuando empieza:
    efecto.fuego(yo)
```

**Error típico:** Darle 0 segundos: el fuego no duraría nada. Sin segundos, dura siempre. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.fuego(yo, 0)
```

#### `efecto.humo(sitio, segundos)`

Humo que sube y se deshace.

```
cuando empieza:
    efecto.humo(yo, 3)
```

**Error típico:** Poner yo entre comillas: es el objeto, no un texto. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.humo("yo")
```

#### `efecto.chispas(sitio)`

Un puñado de chispas que brillan.

```
cuando toco Enemigo:
    efecto.chispas(otro)
```

**Error típico:** Darle un objeto que no existe (nulo). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.chispas(nulo)
```

#### `efecto.rayo(desde, hasta, color)`

Un rayo eléctrico en zigzag entre dos sitios (si son objetos, los sigue).

```
cuando se pulsa "espacio":
    efecto.rayo(yo, buscar("Enemigo"))
```

**Error típico:** Darle un solo sitio: un rayo va de un sitio a otro. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.rayo(yo)
```

#### `efecto.estela(objeto, segundos)`

Una estela detrás del objeto: copias de él que se apagan (para cosas que van rápido).

```
cuando empieza:
    efecto.estela(yo)
```

**Error típico:** Darle un punto: la estela va detrás de un objeto. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.estela(100, 200)
```

#### `efecto.onda(sitio, radio)`

Una onda expansiva: un anillo que crece y se apaga.

```
cuando toco Enemigo:
    efecto.onda(yo, 200)
```

**Error típico:** Darle un texto: el radio son píxeles. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.onda(yo, "grande")
```

#### `efecto.destello(sitio, tamaño)`

Un destello de luz redondo, muy rápido.

```
cuando toco Moneda:
    efecto.destello(otro, 100)
```

**Error típico:** Darle un texto: el tamaño son píxeles. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.destello(yo, "mucho")
```

#### `efecto.lluvia(intensidad)`

Lluvia por toda la pantalla.

```
cuando empieza:
    efecto.lluvia(2)
```

**Error típico:** Pasarse de intensidad: va de 0 a 10 (3 ya es una tormenta). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.lluvia(50)
```

#### `efecto.nieve(intensidad)`

Nieve cayendo por toda la pantalla (0 la para).

```
cuando empieza:
    efecto.nieve()
```

**Error típico:** Ponerle 0 pensando que empieza poco a poco: con 0 la nieve se PARA. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    efecto.nieve(0)
```

#### `efecto.hojas(intensidad)`

Hojas de otoño cayendo y girando (0 las para).

```
cuando empieza:
    efecto.hojas()
```

**Error típico:** Darle una intensidad negativa: va de 0 a 10. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.hojas(-1)
```

#### `efecto.burbujas(sitio, segundos)`

Burbujas que suben haciendo eses.

```
cuando empieza:
    efecto.burbujas(yo)
```

**Error típico:** Darle segundos negativos. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.burbujas(yo, -2)
```

#### `efecto.confeti(sitio)`

Confeti de colores, para celebrar.

```
cuando toco Meta:
    efecto.confeti(otro)
```

**Error típico:** Darle un texto: el sitio es un objeto o una posición. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.confeti("fiesta")
```

#### `efecto.sangre(sitio)`

Gotas de sangre.

```
cuando toco Enemigo:
    efecto.sangre(yo)
```

**Error típico:** Esperar que salga roja: con efecto.suave (lo normal) sale tinta de colores. Para que sea roja: efecto.suave = falso. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    efecto.sangre(yo)
    # y esperar que salga roja
```

#### `efecto.tinta(sitio)`

Una salpicadura de tinta de colores.

```
cuando toco Enemigo:
    efecto.tinta(otro)
```

**Error típico:** Darle un objeto que no existe (nulo). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.tinta(nulo)
```

#### `efecto.polvo(objeto)`

Polvo a los pies del objeto (al saltar o al caer).

```
cuando se pulsa "espacio":
    si yo.saltar(600):
        efecto.polvo(yo)
```

**Error típico:** Darle un punto: el polvo sale de los pies de un objeto. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.polvo(100, 50)
```

#### `efecto.golpe(objeto, daño)`

Un golpe: chispitas y el número de daño, que sube y se desvanece.

```
cuando toco Enemigo:
    efecto.golpe(otro, 25)
```

**Error típico:** Olvidar a quién se golpea: primero el objeto, luego el daño. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.golpe(25)
```

#### `efecto.texto("texto", sitio, color)`

Un texto que sube y se desvanece: "+1", "¡Bien!"...

```
cuando toco Moneda:
    efecto.texto("+1", otro, "amarillo")
```

**Error típico:** Inventarse el color: "dorado" no es un color de Chispa (usa "amarillo" o "#ffd700"). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.texto("+1", yo, "dorado")
```

#### `efecto.usar("nombre", sitio, segundos)`

Un efecto hecho por ti en el editor de partículas (Proyecto > Efectos).

```
cuando empieza:
    efecto.usar("fuego", yo)
```

**Error típico:** Usar un efecto que no has hecho: los propios se hacen en Proyecto > Efectos. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.usar("magia", yo)
```

#### `efecto.parar("nombre", sitio)`

Para los efectos que duran: los de ese nombre (y de ese objeto, si se dice), o todos si no se dice nada.

```
cuando empieza:
    efecto.fuego(yo)
    esperar(2)
    efecto.parar("fuego", yo)
```

**Error típico:** Escribir mal el nombre: Chispa propone el parecido. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.parar("fuegos")
```

#### `efecto.suave`

Versión suave para los más pequeños: si es verdadero (lo normal), la sangre sale como tinta de colores.

```
cuando empieza:
    efecto.suave = falso
```

**Error típico:** Darle un texto: es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    efecto.suave = "si"
```

#### `yo.polvo`

Si es verdadero, levanta polvo al saltar y al caer al suelo (necesita física).

```
cuando empieza:
    yo.polvo = verdadero
```

**Error típico:** Darle un texto: es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.polvo = "mucho"
```

#### `yo.efecto`

El efecto que lleva siempre puesto: "fuego", "humo", "burbujas" o "estela" (nulo lo quita).

```
cuando empieza:
    yo.efecto = "fuego"
```

**Error típico:** Ponerle un efecto de golpe: yo.efecto es uno que dura (fuego, humo, burbujas, estela). Para explotar: efecto.explosion(yo). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.efecto = "explosion"
```

### Efectos de pantalla y de objeto

Para que un juego se SIENTA bien: la pantalla tiembla, se congela un instante al dar un golpe, destella... Y filtros para todo lo que se ve (blanco y negro, pixelado, tele antigua) o para un objeto (contorno, brillo). Al cambiar de escena, una transición: fundido, barrido, círculo o pixelado.

#### `tiempo.congelar(segundos)`

Congela el juego un instante (0,08 segundos si no se dice): al dar un golpe fuerte, se nota mucho más.

```
cuando toco Enemigo:
    tiempo.congelar(0.1)
    escena.camara.temblar(8, 0.2)
```

**Error típico:** Congelar mucho rato: congelar es un instante (hasta 5 segundos). Para parar el juego, tiempo.pausar(). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    tiempo.congelar(30)
```

#### `pantalla.flash(color, segundos)`

Toda la pantalla de un color (blanco si no se dice) que se apaga enseguida: golpes fuertes, rayos, fotos.

```
cuando toco Enemigo:
    pantalla.flash("blanco", 0.2)
```

**Error típico:** Darle algo que no es un color: el primer dato es el color. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.flash("relampago")
```

#### `pantalla.normal()`

Quita todos los filtros de pantalla.

```
cuando se pulsa "n":
    pantalla.normal()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.normal
```

#### `pantalla.grises`

Escala de grises: 0 = colores normales, 1 = blanco y negro.

```
cuando empieza:
    pantalla.grises = 1
```

**Error típico:** Darle un porcentaje: va de 0 a 1 (1 = blanco y negro del todo). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.grises = 100
```

#### `pantalla.desenfoque`

Todo borroso (en píxeles).

```
cuando se pulsa "p":
    pantalla.desenfoque = 4
```

**Error típico:** Darle un número negativo. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.desenfoque = -2
```

#### `pantalla.pixelado`

Todo con «píxeles gordos» de ese tamaño (1 = normal).

```
cuando empieza:
    pantalla.pixelado = 4
```

**Error típico:** Darle 0: el tamaño normal de los píxeles es 1. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.pixelado = 0
```

#### `pantalla.brillo`

El brillo de todo: 1 = normal, 0.5 = más oscuro, 1.5 = más claro.

```
cuando empieza:
    pantalla.brillo = 0.6
```

**Error típico:** Darle un número negativo: 0 ya es todo negro. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.brillo = -1
```

#### `pantalla.vineta`

Viñeta: los bordes de la pantalla más oscuros, de 0 a 1.

```
cuando empieza:
    pantalla.vineta = 0.7
```

**Error típico:** Pasarse: va de 0 a 1. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.vineta = 5
```

#### `pantalla.aberracion`

Aberración cromática: los colores se separan un poco (píxeles).

```
cuando toco Enemigo:
    pantalla.aberracion = 5
    esperar(0.3)
    pantalla.aberracion = 0
```

**Error típico:** Darle un texto: son píxeles. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.aberracion = "mucha"
```

#### `pantalla.crt`

Efecto de tele antigua: rayas, bordes oscuros y colores algo separados.

```
cuando empieza:
    pantalla.crt = verdadero
```

**Error típico:** Darle un texto: es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.crt = "si"
```

#### `pantalla.bloom`

Lo brillante deja un halo de luz alrededor, de 0 a 1 (fuego, neón, magia).

```
cuando empieza:
    pantalla.bloom = 0.6
```

**Error típico:** Pasarse: va de 0 a 1. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.bloom = 2
```

#### `yo.contorno`

Una línea de color alrededor de todo el objeto (nulo la quita).

```
cuando cada fotograma:
    si yo.ratonEncima:
        yo.contorno = "blanco"
    sino:
        yo.contorno = nulo
```

**Error típico:** Inventarse un color: Chispa propone el parecido. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.contorno = "blanquito"
```

#### `yo.grosorContorno`

Lo gordo que es el contorno, en píxeles (3).

```
cuando empieza:
    yo.contorno = "amarillo"
    yo.grosorContorno = 5
```

**Error típico:** Cambiar el grosor sin poner yo.contorno: no hay contorno que engordar. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.grosorContorno = 5
```

#### `yo.brillo`

El brillo del objeto: 1 = normal, 0.5 = más oscuro, 2 = el doble de claro.

```
cuando cada fotograma:
    si yo.ratonEncima:
        yo.brillo = 1.4
    sino:
        yo.brillo = 1
```

**Error típico:** Darle un número negativo: 0 ya es negro. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.brillo = -1
```

#### `yo.grises`

El objeto en escala de grises, de 0 (colores) a 1 (blanco y negro).

```
cuando empieza:
    yo.grises = 1
```

**Error típico:** Darle un porcentaje: va de 0 a 1. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.grises = 50
```

#### `yo.desenfoque`

El objeto borroso (en píxeles): cosas lejanas, fantasmas...

```
cuando empieza:
    yo.desenfoque = 3
```

**Error típico:** Darle un texto: son píxeles. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.desenfoque = "poco"
```

#### `yo.flash(color, segundos)`

El objeto entero de un color (blanco si no se dice) un momento: al recibir un golpe.

```
cuando toco Enemigo:
    yo.flash()
    tiempo.congelar(0.08)
```

**Error típico:** Darle segundos negativos. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.flash("rojo", -1)
```

### Luces y oscuridad

Para cuevas y noches: la escena se oscurece (escena.oscuridad) y los objetos llevan luz (yo.luz). Una luz puede ser de punto (antorcha) o un foco (linterna), de colores, que parpadea, y que hace sombras con las paredes.

#### `escena.oscuridad`

Oscuridad de la escena, de 0 (de día: no hacen falta luces) a 1 (negro donde no llega ninguna luz).

```
cuando empieza:
    escena.oscuridad = 0.9
```

**Error típico:** Darle un porcentaje: va de 0 a 1 (0.9 es casi negro). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.oscuridad = 90
```

#### `escena.luzAmbiente`

El color de la oscuridad (negro si no se dice).

```
cuando empieza:
    escena.oscuridad = 0.8
    escena.luzAmbiente = "#0a1030"
```

**Error típico:** Darle algo que no es un color: es el COLOR de la oscuridad. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.luzAmbiente = "noche"
```

#### `yo.luz`

Si es verdadero, el objeto lleva una luz (se ve cuando la escena tiene oscuridad).

```
cuando empieza:
    escena.oscuridad = 0.9
    yo.luz = verdadero
```

**Error típico:** Encender una luz sin oscuridad: de día no se nota. Pon también escena.oscuridad = 0.9. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.luz = verdadero
```

#### `yo.tipoLuz`

"punto" (alumbra alrededor, como una antorcha) o "foco" (un cono hacia donde mira el objeto, como una linterna).

```
cuando empieza:
    yo.luz = verdadero
    yo.tipoLuz = "foco"
```

**Error típico:** Inventarse el tipo: es "punto" o "foco". Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.tipoLuz = "linterna"
```

#### `yo.colorLuz`

El color de la luz (blanca si no se dice): tiñe un poco lo que ilumina.

```
cuando empieza:
    yo.luz = verdadero
    yo.colorLuz = "naranja"
```

**Error típico:** Darle algo que no es un color. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.colorLuz = "fuego"
```

#### `yo.radioLuz`

Hasta dónde llega la luz, en píxeles (220).

```
cuando empieza:
    yo.luz = verdadero
    yo.radioLuz = 300
```

**Error típico:** Leerlo sin luz: primero yo.luz = verdadero. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(yo.radioLuz)
```

#### `yo.intensidadLuz`

Lo fuerte que es la luz, de 0 (apagada) a 1 (normal); más de 1 llega más lejos.

```
cuando empieza:
    yo.luz = verdadero
    yo.intensidadLuz = 0.6
```

**Error típico:** Darle un porcentaje: va de 0 a 1 (puede pasar un poco de 1, hasta 10). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.intensidadLuz = 50
```

#### `yo.anguloLuz`

En un foco: lo abierto que es el cono, en grados (60).

```
cuando empieza:
    yo.luz = verdadero
    yo.tipoLuz = "foco"
    yo.anguloLuz = 40
```

**Error típico:** Cambiar el ángulo de una luz de punto: solo se nota en un foco (yo.tipoLuz = "foco"). Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    yo.luz = verdadero
    yo.anguloLuz = 40
```

#### `yo.luzConSombras`

Si es verdadero, lo sólido tapa la luz y hace sombra (las paredes de un laberinto).

```
cuando empieza:
    yo.luz = verdadero
    yo.luzConSombras = verdadero
```

**Error típico:** Darle un texto: es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.luzConSombras = "si"
```

#### `yo.parpadeoLuz`

La luz tiembla como una llama, de 0 (quieta) a 1 (mucho).

```
cuando empieza:
    yo.luz = verdadero
    yo.colorLuz = "naranja"
    yo.parpadeoLuz = 0.5
```

**Error típico:** Pasarse: va de 0 a 1. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.parpadeoLuz = 3
```

### Letras, dibujo y azar que se repite

Los textos pueden tener otro tipo de letra (hay 7 listas, y puedes importar las tuyas en Proyecto > Letras). Con dibujar también hay elipses y polígonos. Y con semilla() el azar se repite: para mundos al azar que son iguales para todos.

#### `yo.letra`

El tipo de letra de su texto.

```
cuando empieza:
    yo.texto = "FIN"
    yo.letra = "pixel"
```

**Error típico:** Escribirla mal: Chispa te dice la parecida ("pixel"). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.letra = "pixels"
```

#### `dibujar.elipse(x, y, ancho, alto, color, relleno)`

Un círculo aplastado con su centro en (x, y): ancho y alto es lo que mide entera.

```
cuando cada fotograma:
    dibujar.elipse(yo.x, yo.y - 30, 80, 20, "negro", verdadero)
```

**Error típico:** Darle solo un tamaño: una elipse tiene ancho Y alto (con uno solo, usa dibujar.circulo). Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.elipse(yo.x, yo.y, 120)
```

#### `dibujar.poligono(puntos, color, relleno, grosor)`

Una forma con los puntos que quieras: una lista de vectores, en orden (se cierra sola).

```
cuando cada fotograma:
    dibujar.poligono([vector(100, 100), vector(200, 100), vector(150, 180)], "amarillo", verdadero)
```

**Error típico:** Darle solo 2 puntos: eso es una línea. Un polígono necesita 3 o más. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.poligono([vector(100, 100), vector(200, 100)], "amarillo")
```

#### `dibujar.enPantalla.elipse(x, y, ancho, alto, color, relleno)`

Una elipse en la pantalla, con el centro en (x, y).

```
cuando cada fotograma:
    dibujar.enPantalla.elipse(480, 60, 300, 40, "blanco")
```

**Error típico:** Inventarse un color. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.enPantalla.elipse(480, 60, 300, 40, "blanquito")
```

#### `dibujar.enPantalla.poligono(puntos, color, relleno, grosor)`

Una forma con los puntos que quieras (una lista de vectores) en la pantalla.

```
cuando cada fotograma:
    dibujar.enPantalla.poligono([vector(20, 20), vector(60, 20), vector(40, 55)], "rojo", verdadero)
```

**Error típico:** Olvidar los corchetes: los puntos van en UNA lista. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    dibujar.enPantalla.poligono(vector(20, 20), vector(60, 20), vector(40, 55))
```

#### `semilla(numero)`

Hace que el azar SE REPITA: con la misma semilla, aleatorio(), elegir(), probabilidad() y lista.mezclar() dan siempre lo mismo y en el mismo orden.

```
cuando empieza:
    semilla(2026)
    mostrar(aleatorio(1, 100))
```

**Error típico:** Darle un texto: la semilla es un número. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    semilla("hoy")
```

### Controles de interfaz

En el editor (Añadir > Interfaz) hay controles ya hechos: botón, barra, campo de texto, deslizador, casilla, lista, menú, ventana, inventario, minimapa e icono con contador. Todos tienen yo.valor (lo que valen) y avisan con «cuando cambia:». En estos ejemplos la escena tiene uno de cada, con su nombre: Barra, Deslizador, Casilla, Campo, Lista, Menu, Ventana e Inventario.

#### `yo.valor`

En un CONTROL de interfaz, lo que vale: el número de una barra, un deslizador o un icono con contador; verdadero o falso en una casilla; el texto de un campo; la opción elegida de una lista o un menú; lo que hay en la casilla elegida de un inventario.

```
cuando empieza:
    buscar("Barra").valor = 40
```

**Error típico:** Pedírselo a un objeto que no es un control: solo lo tienen las barras, deslizadores, casillas, campos, listas... Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.valor = 40
    mostrar(buscar("Jugador").valor)
```

#### `cuando cambia`

En el script de un CONTROL de interfaz: se ejecuta cuando quien juega cambia lo que vale (mueve el deslizador, marca la casilla, escribe en el campo, elige en la lista o pulsa una opción del menú).

```
cuando cambia:
    mostrar("ahora vale", yo.valor)
```

**Error típico:** Mirar el valor en cada fotograma: funciona, pero es más fácil poner «cuando cambia:» en el script del deslizador. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    sonido.volumen = buscar("Deslizador").valor / 100
```

#### `yo.minimo`

En una barra o un deslizador: el valor más bajo (0 si no se dice).

```
cuando empieza:
    buscar("Deslizador").minimo = 10
```

**Error típico:** Ponérselo a una casilla: el mínimo es de las barras y los deslizadores. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Casilla").minimo = 10
```

#### `yo.maximo`

En una barra o un deslizador: el valor más alto (100 si no se dice).

```
cuando empieza:
    buscar("Barra").maximo = 200
    buscar("Barra").valor = 200
```

**Error típico:** Un máximo menor que el mínimo: la barra no tendría recorrido. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Barra").maximo = -5
```

#### `yo.opciones`

En una lista o un menú: sus opciones, una lista de textos.

```
cuando empieza:
    buscar("Menu").opciones = ["Jugar", "Salir"]
```

**Error típico:** Darle un texto: las opciones son una LISTA, entre corchetes. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Menu").opciones = "Jugar"
```

#### `yo.elegido`

En una lista, un menú o un inventario: el número de la opción (o la casilla) elegida.

```
cuando empieza:
    buscar("Lista").elegido = 2
```

**Error típico:** Elegir una opción que no hay. La primera es la 1. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Lista").elegido = 99
```

#### `yo.activado`

En un control: si se puede usar.

```
cuando empieza:
    buscar("Casilla").activado = falso
```

**Error típico:** Darle un texto: es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Casilla").activado = "no"
```

#### `yo.titulo`

En una ventana: lo que pone en su barra de arriba.

```
cuando empieza:
    buscar("Ventana").titulo = "Tienda"
```

**Error típico:** Ponérselo a una barra: el título es de las ventanas. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Barra").titulo = "Vida"
```

#### `yo.abrir()`

Enseña un control con todo lo que lleva dentro (sus hijos: lo pegado a él con pegarA).

```
cuando se pulsa "i":
    buscar("Ventana").abrir()
```

**Error típico:** Darle un valor: abrir es una acción, lleva paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Ventana").abrir = verdadero
```

#### `yo.cerrar()`

Esconde un control con todo lo que lleva dentro.

```
cuando empieza:
    buscar("Ventana").cerrar()
```

**Error típico:** Esconder solo la ventana: lo que lleva dentro se queda a la vista. cerrar() lo esconde todo. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    buscar("Ventana").visible = falso
```

#### `yo.enfocar()`

En un campo de texto: empieza a escribir en él, como si se hiciera clic.

```
cuando empieza:
    buscar("Campo").enfocar()
```

**Error típico:** Enfocar una lista: solo se escribe en los campos de texto. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Lista").enfocar()
```

#### `yo.meter("cosa", cantidad)`

En un inventario: mete esa cosa (una si no se dice cuántas).

```
cuando empieza:
    buscar("Inventario").meter("llave")
    buscar("Inventario").meter("moneda", 5)
```

**Error típico:** Meter cero: la cantidad tiene que ser más de 0. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Inventario").meter("llave", 0)
```

#### `yo.sacar("cosa", cantidad)`

En un inventario: saca esa cosa (una si no se dice cuántas).

```
cuando empieza:
    buscar("Inventario").meter("llave")
    mostrar(buscar("Inventario").sacar("llave"))
```

**Error típico:** Olvidar las comillas: el nombre de la cosa es un texto. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Inventario").sacar(llave)
```

#### `yo.cuantos("cosa")`

En un inventario: cuántas hay de esa cosa.

```
cuando empieza:
    mostrar(buscar("Inventario").cuantos("moneda"))
```

**Error típico:** Preguntárselo a una barra: es de los inventarios. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(buscar("Barra").cuantos("moneda"))
```

#### `yo.vaciar()`

En un inventario: lo deja vacío.

```
cuando empieza:
    buscar("Inventario").vaciar()
```

**Error típico:** Vaciar una lista: es de los inventarios. Para una lista: yo.opciones = [] Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    buscar("Lista").vaciar()
```

### Ejercicios del nivel 3

1. **Disparos.** Cada medio segundo, crea una Bala donde está el objeto y dale velocidad hacia la derecha. (Para que no se acumulen, en el editor ponle a la plantilla Bala un script con «cuando salgo de la pantalla: destruir(yo)».)
2. **Cuenta atrás.** El objeto enseña «Tiempo: 10» y cada segundo baja uno. Al llegar a 0, cambia a la escena Fin.
3. **Un buen golpe.** Al tocar un Enemigo: partículas de explosión, el efecto de sonido «explosion», la cámara tiembla y el objeto parpadea.

Las soluciones, en [Soluciones](#soluciones) (nivel 3).

### Mini proyecto: Esquiva los meteoritos

Caen meteoritos cada segundo. Te mueves con las flechas; si uno te da, explota, suena, la cámara tiembla y pierdes una vida. Con 0 vidas, la pantalla se oscurece y pasa a la escena Fin. Junta crear/destruir, física, escenas, interfaz, sonido, tiempo y partículas.

**Qué poner en la escena:**

- La escena con **gravedad 0**, y otra escena llamada **Fin**.
- Un **Jugador** con Colisión, Física y el script **jugador.chs**.
- Un **Objeto vacío** llamado **Generador** con el script **generador.chs**.
- Una **plantilla Meteorito** (un círculo) con Colisión, Física y el script **meteorito.chs**.
- Un **Texto** llamado **Marcador** con el script **marcador.chs**.

**jugador.chs**

```
cuando cada fotograma:
    yo.moverConFlechas(350)

cuando toco Meteorito:
    destruir(otro)
    juego.vidas -= 1
    particulas("explosion", yo.x, yo.y)
    sonido.efecto("golpe")
    escena.camara.temblar(8, 0.3)
    yo.parpadear(1)
    si juego.vidas <= 0:
        pantalla.oscurecer(1)
        esperar(1)
        escena.cambiar("Fin")
```

**generador.chs**

```
cuando cada 1 segundo:
    variable m = crear("Meteorito", aleatorio(40, pantalla.ancho - 40), pantalla.alto - 20)
    m.velocidad = vector(0, -aleatorio(150, 300))
```

**meteorito.chs**

```
cuando empieza:
    yo.color = elegir(["gris", "marron", "naranja"])

cuando salgo de la pantalla:
    destruir(yo)
```

**marcador.chs**

```
cuando empieza:
    juego.vidas = 3

cuando cada fotograma:
    yo.texto = "Vidas: {juego.vidas}   Tiempo: {redondear(tiempo.total)}"
```

Cuando funcione, cámbialo: más enemigos, otro color, un sonido nuevo... ¡Es tuyo!

## Nivel 4: Avanzado

Lo que hace que un juego parezca de verdad: objetos que se avisan entre ellos, personajes que hablan, enemigos que te buscan rodeando las paredes, efectos, mando y récords que se guardan. Y cómo encontrar los fallos con el depurador.

### Mensajes entre objetos y datos globales

Los objetos pueden avisarse con mensajes (enviar y cuando recibo) y compartir datos en juego, que ven todos los scripts. aLaVez hace dos cosas a la vez.

#### `enviar("mensaje", dato)`

Avisa a todos los objetos que tengan 'cuando recibo "mensaje"'.

```
cuando toco Jugador:
    enviar("abrir_puerta")

cuando recibo "abrir_puerta":
    yo.ocultar()
```

**Error típico:** Olvidar las comillas del mensaje. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    enviar(abrir_puerta)
```

#### `cuando recibo "mensaje"`

Se ejecuta cuando alguien hace enviar("mensaje") en cualquier script (le llega a TODOS los que lo escuchen, al empezar el siguiente fotograma).

```
cuando empieza:
    enviar("hola", 5)

cuando recibo "hola":
    mostrar("Me llega", dato)
```

**Error típico:** Escribir el mensaje distinto al enviarlo y al recibirlo: no pasa nada (Chispa avisa en amarillo, con el parecido). Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    enviar("abrir_puerta")

cuando recibo "abrir_puera":
    yo.ocultar()
```

#### `dato`

Dentro de 'cuando recibo': lo que se envio junto al mensaje con enviar("mensaje", dato).

```
cuando empieza:
    enviar("dano", 10)

cuando recibo "dano":
    mostrar("Pierdo", dato)
```

**Error típico:** Usar dato fuera de cuando recibo: solo existe dentro. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(dato)
```

#### `juego`

Datos compartidos por todos los scripts (puntos, vidas...).

```
cuando empieza:
    juego.puntos = 0
    juego.puntos += 1
    mostrar(juego.puntos)
```

**Error típico:** Sumar a un dato que todavía no existe: dale valor antes (juego.puntos = 0), o ponlo en «Datos del juego» del editor. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    juego.puntos += 1
```

#### `aLaVez(funcion, valores...)`

Empieza a ejecutar una funcion POR SU CUENTA, como si fuera otro evento: quien la llama sigue sin esperar a que acabe.

```
funcion lluvia(veces):
    repetir veces veces:
        crear("Gota", aleatorio(0, 900), 540)
        esperar(0.2)

cuando empieza:
    aLaVez(lluvia, 3)
    mostrar("esto sale enseguida")
```

**Error típico:** Poner paréntesis a la función: se escribe su nombre solo, y los valores detrás: aLaVez(lluvia, 3). Chispa te avisa con un error que explica qué pasa.

```
funcion lluvia(veces):
    esperar(0.2)

cuando empieza:
    aLaVez(lluvia(3))
```

### Ir a sitios esquivando paredes

irHacia busca el camino por el mapa y rodea las paredes. En el editor, la sección Comportamiento (perseguir, huir, seguir) hace lo mismo sin código.

#### `yo.irHacia(destino, rapidez)`

Va hasta un sitio o detras de un objeto (lo sigue aunque se mueva), RODEANDO las paredes del mapa de casillas si el juego se ve desde arriba.

```
cuando empieza:
    yo.irHacia(buscar("Jugador"), 120)
```

**Error típico:** Pasarle el nombre: hay que darle el objeto (buscar("Jugador")) o una posición. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.irHacia("Jugador", 120)
```

#### `yo.parar()`

Deja de ir a donde iba (irHacia, irA) y se queda quieto.

```
cuando empieza:
    yo.irHacia(buscar("Jugador"))

cuando toco Jugador:
    yo.parar()
```

**Error típico:** Olvidar los paréntesis. Chispa te avisa con un error que explica qué pasa.

```
cuando toco Jugador:
    yo.parar
```

#### `yo.yendo`

Verdadero mientras va hacia el sitio de yo.irHacia().

```
cuando cada fotograma:
    si no yo.yendo:
        yo.irHacia(vector(aleatorio(0, 900), aleatorio(0, 500)))
```

**Error típico:** Darle un valor: solo se lee. Para pararlo, yo.parar(). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.yendo = falso
```

#### `yo.atravesar("Nombre")`

Deja de chocar con los objetos de ese nombre, tipo o etiqueta: pasa a traves de ellos.

```
cuando se pulsa "x":
    yo.atravesar("Enemigo")
    esperar(0.2)
    yo.dejarDeAtravesar("Enemigo")
```

**Error típico:** Olvidar las comillas del nombre. Chispa te avisa con un error que explica qué pasa.

```
cuando se pulsa "x":
    yo.atravesar(Enemigo)
```

#### `yo.dejarDeAtravesar("Nombre")`

Vuelve a chocar con los objetos de ese nombre, tipo o etiqueta.

```
cuando empieza:
    yo.atravesar("Enemigo")
    esperar(1)
    yo.dejarDeAtravesar("Enemigo")
```

**Error típico:** Olvidar qué: el nombre, tipo o etiqueta. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    yo.dejarDeAtravesar()
```

### Rayos y diálogos

Un rayo es una línea invisible que dice qué toca primero (para saber si un enemigo te ve). Los diálogos enseñan conversaciones con opciones.

#### `rayo(desde, direccion, largo)`

Lanza una linea invisible y dice lo primero que toca (un objeto con colision o una casilla solida), o nulo.

```
cuando empieza:
    variable r = rayo(yo, buscar("Jugador"), 400)
    si r != nulo:
        mostrar("Veo", r.objeto.nombre)
```

**Error típico:** No comprobar si es nulo: si el rayo no toca nada (aquí, hacia arriba no hay nada), da nulo y nulo no tiene objeto. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(rayo(yo, 90, 50).objeto.nombre)
```

#### `dialogo("quien", "texto", opciones)`

Una caja de dialogo abajo de la pantalla: el texto sale letra a letra y se pasa con espacio, intro o clic.

```
cuando toco Jugador:
    variable r = dialogo("Ana", "Me ayudas?", ["Si", "No"])
    si r == "Si":
        mostrar("Gracias")
```

**Error típico:** Poner las opciones sueltas: van en UNA lista, con corchetes: ["Si", "No"]. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    dialogo("Ana", "Me ayudas?", "Si", "No")
```

### Animar valores

animar() cambia algo poco a poco (la posición, el tamaño, el color...). interpolar y ruido sirven para movimientos suaves y naturales.

#### `animar(sitio, hasta, segundos, suavizado)`

Cambia algo POCO A POCO hasta un valor en esos segundos (0.5 si no se dice): la posición, el tamaño, el giro, la opacidad, un color...

```
cuando empieza:
    animar(yo.tamano, 2, 0.5)
    animar(yo.color, "rojo", 1, "lineal")
```

**Error típico:** Inventarse el suavizado: los que hay son suave, lineal, entrada, salida, rebote, elastico y atras. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    animar(yo.x, 300, 1, "rapido")
```

#### `interpolar(desde, hasta, cuanto)`

Un valor entre dos: con 0 da el primero, con 1 el segundo, con 0.5 el de en medio.

```
cuando cada fotograma:
    yo.x = interpolar(yo.x, raton.x, 0.1)
```

**Error típico:** Poner un número grande: el último va de 0 a 1 (0.1 = un poco cada vez). Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    yo.x = interpolar(yo.x, raton.x, 10)
```

#### `ruido(x, y)`

Un número entre 0 y 1 «al azar pero suave»: cambia poco a poco al cambiar x.

```
cuando cada fotograma:
    yo.y = 200 + ruido(tiempo.total) * 100
```

**Error típico:** Darle siempre el mismo número: el ruido cambia al cambiar x; con un número fijo, siempre da lo mismo. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    yo.y = 200 + ruido(5) * 100
```

### Efectos: fundidos, sonidos y cámara lenta

Pequeños efectos que hacen que un juego se sienta mejor: fundidos a negro, sonidos generados y cámara lenta.

#### `pantalla.oscurecer(segundos, color, cuanto)`

Fundido: la pantalla se va poniendo de un color (negro si no se dice) durante esos segundos.

```
cuando empieza:
    pantalla.oscurecer(0.2, "negro", 0.5)
```

**Error típico:** Poner primero el color: primero van los segundos. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.oscurecer("negro")
```

#### `pantalla.aclarar(segundos)`

Quita el fundido poco a poco.

```
cuando empieza:
    pantalla.oscurecer(0.5)
    esperar(0.5)
    pantalla.aclarar(1)
```

**Error típico:** Darle un texto: son segundos. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.aclarar("rapido")
```

#### `sonido.efecto("nombre", volumen, tono)`

Un efecto de sonido que se GENERA solo, sin archivos: disparo, laser, explosion, golpe, salto, moneda, poder, dash, escudo, hielo, fuego, rayo, subir, perder, clic, alarma, dano.

```
cuando toco Moneda:
    sonido.efecto("moneda")
```

**Error típico:** Escribir mal el efecto: los que hay son disparo, laser, explosion, golpe, salto, moneda, poder, dash, escudo, hielo, fuego, rayo, subir, perder, clic, alarma y dano. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sonido.efecto("explocion")
```

#### `tiempo.camaraLenta(velocidad, segundos)`

Cámara lenta durante un rato y luego vuelve sola a la normalidad.

```
cuando toco Enemigo:
    tiempo.camaraLenta(0.3, 1)
```

**Error típico:** Decir la velocidad con palabras: es un número (0.3 = muy lento, 0.5 = la mitad), y luego los segundos. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    tiempo.camaraLenta("lento")
```

### Mando, móvil y web

Chispa entiende mandos de consola (el mando ya hace de teclado) y sabe si se juega en un móvil.

#### `mando.conectado`

Verdadero si hay un mando conectado.

```
cuando empieza:
    si mando.conectado:
        mostrar("Mando listo")
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    si mando.conectado():
        mostrar("listo")
```

#### `mando.ejeX`

La palanca izquierda de lado: de -1 (izquierda) a 1 (derecha).

```
cuando cada fotograma:
    yo.x += mando.ejeX * 300 * delta
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    yo.x += mando.ejex()
```

#### `mando.ejeY`

La palanca izquierda de arriba abajo: de -1 (abajo) a 1 (arriba).

```
cuando cada fotograma:
    yo.y += mando.ejeY * 300 * delta
```

**Error típico:** Restar para subir: el eje Y del mando es 1 hacia ARRIBA, como la Y de Chispa. Se suma. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    yo.y -= mando.ejeY * 300 * delta
```

#### `mando.ejeDerechoX`

La palanca derecha de lado (de -1 a 1).

```
cuando cada fotograma:
    yo.rotacion = angulo(vector(0, 0), vector(mando.ejeDerechoX, mando.ejeDerechoY))
```

**Error típico:** Olvidar si es X o Y: son ejeDerechoX y ejeDerechoY. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    mostrar(mando.ejeDerecho)
```

#### `mando.ejeDerechoY`

La palanca derecha de arriba abajo (de -1 a 1).

```
cuando cada fotograma:
    mostrar(mando.ejeDerechoY)
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    mostrar(mando.ejederechoy())
```

#### `mando.pulsado("boton")`

Verdadero mientras el boton esta pulsado.

```
cuando cada fotograma:
    si mando.pulsado("rt"):
        yo.x += 400 * delta
```

**Error típico:** Usar los nombres de otra consola: son a, b, x, y, lb, rb, lt, rt, select, start... Chispa te avisa con un error que explica qué pasa.

```
cuando cada fotograma:
    si mando.pulsado("R2"):
        mostrar("dispara")
```

#### `mando.sePulso("boton")`

Verdadero solo en el fotograma en que se pulsa el boton.

```
cuando cada fotograma:
    si mando.sePulso("a"):
        yo.saltar(600)
```

**Error típico:** Olvidar los paréntesis y el botón: sin () no se pregunta nada, y el si se cumple siempre. Es mando.sePulso("a"). Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    si mando.sePulso:
        mostrar("a")
```

#### `mando.vibrar(segundos, fuerza)`

Hace vibrar el mando (fuerza de 0 a 1).

```
cuando toco Enemigo:
    mando.vibrar(0.3)
```

**Error típico:** Darle un texto: son segundos (y la fuerza, de 0 a 1). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mando.vibrar("fuerte")
```

#### `sistema.movil`

Verdadero si se está jugando en un móvil o una tableta (con pantalla táctil).

```
cuando empieza:
    si sistema.movil:
        mostrar("Juegas en el movil")
```

**Error típico:** Ponerle paréntesis: es un dato. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    si sistema.movil():
        mostrar("movil")
```

#### `sistema.abrirWeb("direccion")`

Abre una página web en otra pestaña (por ejemplo, la de tu juego en itch.io).

```
cuando hago clic encima:
    sistema.abrirWeb("https://itch.io")
```

**Error típico:** Olvidar el https:// del principio. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sistema.abrirWeb("itch.io")
```

### Guardar datos

guardar() deja un dato en el navegador aunque se cierre el juego (récords, niveles). Cada juego tiene sus datos: otro juego no los puede leer.

#### `guardar("clave", valor)`

Guarda un dato del jugador en el navegador (se conserva al cerrar el juego): récords, niveles, opciones...

```
cuando empieza:
    guardar("record", 1500)
```

**Error típico:** Guardar un objeto: solo se guardan números, textos, listas, tablas y vectores. Guarda sus datos (yo.x, yo.vida...). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    guardar("jugador", yo)
```

#### `cargar("clave", porDefecto)`

Lee un dato guardado con guardar().

```
cuando empieza:
    variable record = cargar("record", 0)
    mostrar("Record:", record)
```

**Error típico:** Escribir la clave distinta al guardar y al cargar: si no la encuentra, da el valor por defecto sin avisar. Esto no da error: funciona, pero no hace lo que querías.

```
cuando empieza:
    variable record = cargar("recrod", 0)
    # y no entender por que siempre es 0
```

#### `borrarGuardado("clave")`

Borra un dato guardado.

```
cuando se pulsa "r":
    borrarGuardado("record")
```

**Error típico:** Olvidar las comillas de la clave. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    borrarGuardado(record)
```

### Juntas: cuerdas, muelles y bisagras

Para unir objetos: una cuerda (péndulos, ganchos), un muelle (cosas que botan) o una bisagra (puertas, balancines). El objeto que cuelga necesita Física; el otro extremo puede ser un objeto o un punto: vector(x, y).

#### `junta.cuerda(objeto, otro, largo, color)`

Una cuerda: no deja que se separen más de su largo (si no se dice, lo lejos que están ahora).

```
cuando empieza:
    junta.cuerda(yo, vector(yo.x, yo.y + 200))
```

**Error típico:** Dar el punto con dos números: aquí el punto es un vector(400, 300). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    junta.cuerda(yo, 400, 300)
```

#### `junta.muelle(objeto, otro, largo, rigidez, color)`

Un muelle: tira hacia su largo, más fuerte cuanto más lejos, y se queda botando.

```
cuando empieza:
    junta.muelle(yo, vector(yo.x, yo.y + 150), 100, 60)
```

**Error típico:** Rigidez 0: un muelle que no tira no es un muelle (lo normal es 60). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    junta.muelle(yo, vector(yo.x, yo.y + 150), 100, 0)
```

#### `junta.bisagra(objeto, eje, color)`

Una bisagra: el objeto se queda siempre a la misma distancia del eje (un punto u otro objeto) y gira a su alrededor, como una puerta, un péndulo rígido o un balancín.

```
cuando empieza:
    junta.bisagra(yo, vector(yo.x, yo.y + 150))
```

**Error típico:** Unir un objeto consigo mismo: el eje tiene que ser otro objeto o un punto. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    junta.bisagra(yo, yo)
```

#### `junta.quitar(objeto, otro)`

Suelta las juntas de un objeto: todas, o solo las que lo unen con otro.

```
cuando empieza:
    junta.cuerda(yo, vector(yo.x, yo.y + 200))

cuando se pulsa "espacio":
    junta.quitar(yo)
```

**Error típico:** Darle el nombre entre comillas: quiere el objeto. Usa junta.quitar(buscar("Bola")). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    junta.quitar("Bola")
```

#### `junta.visibles`

Si las juntas se dibujan (verdadero, lo normal) o no (falso: para dibujarlas a tu manera).

```
cuando empieza:
    junta.visibles = falso
```

**Error típico:** Darle un texto: es verdadero o falso. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    junta.visibles = "no"
```

### Pantalla dividida y varias cámaras

Para jugar varios en el mismo ordenador: la pantalla se divide en trozos y cada trozo tiene su cámara, que sigue a un jugador. La interfaz (lo fijo) se dibuja una sola vez, por encima de todo.

#### `pantalla.dividir(cuantas, como)`

Divide la pantalla en 2, 3 o 4 trozos, cada uno con su cámara (escena.camaraDe(2)...): para jugar varios en el mismo ordenador.

```
cuando empieza:
    pantalla.dividir(2)
```

**Error típico:** Pedir demasiados trozos: como mucho son 4. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    pantalla.dividir(8)
```

#### `escena.camaraDe(numero)`

Con la pantalla dividida (pantalla.dividir), la cámara de ese trozo: la 1 es la de siempre (escena.camara), la 2 la del segundo trozo...

```
cuando empieza:
    pantalla.dividir(2)
    escena.camaraDe(2).seguir(yo)
```

**Error típico:** Usar la cámara 2 sin dividir la pantalla: primero pantalla.dividir(2). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    escena.camaraDe(2).seguir(yo)
```

### Sonido con sitio y música que cambia

Los sonidos se pueden HACER en el editor (Proyecto > Sonidos > +) y la música también (Proyecto > Música > +). Un sonido puede sonar en un sitio del mundo (más flojo cuanto más lejos, y por su lado), cambiar mientras suena, y la música puede tener capas que entran y salen según lo que pasa en el juego.

#### `sonido.reproducirEn("nombre", sitio, alcance, volumen)`

Reproduce un sonido EN UN SITIO del mundo (un objeto o un vector): suena más flojo cuanto más lejos está del oyente, y por el altavoz del lado donde está.

```
cuando empieza:
    sonido.reproducirEn("salto", yo, 900)
```

**Error típico:** Dar el sitio con dos números: aquí es un objeto o un vector(400, 300). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sonido.reproducirEn("salto", 400, 300)
```

#### `sonido.bucleEn("nombre", sitio, alcance, volumen)`

Un sonido que no para, pegado a un objeto o a un punto: una cascada, un motor, una hoguera.

```
cuando empieza:
    sonido.bucleEn("salto", yo, 600)
```

**Error típico:** Alcance 0: no se oiría nunca. Es hasta dónde se oye, en píxeles. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sonido.bucleEn("salto", yo, 0)
```

#### `sonido.ponerVolumen("nombre", volumen, segundos)`

Cambia el volumen de un sonido QUE YA ESTÁ SONANDO (de 0 a 1).

```
cuando empieza:
    sonido.bucle("salto")
    sonido.ponerVolumen("salto", 0.2, 1)
```

**Error típico:** Darle un porcentaje: el volumen va de 0 a 1. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sonido.ponerVolumen("salto", 20)
```

#### `sonido.ponerTono("nombre", tono, segundos)`

Cambia el tono (y la velocidad) de un sonido que ya está sonando: 1 = normal, 2 = más agudo y rápido.

```
cuando empieza:
    sonido.bucle("salto")
    sonido.ponerTono("salto", 1.5, 0.5)
```

**Error típico:** Tono 0: el sonido se quedaría parado. Tiene que ser mayor que 0 (1 = normal). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sonido.ponerTono("salto", 0)
```

#### `sonido.ponerPan("nombre", lado, segundos)`

Por qué lado suena un sonido que ya está sonando: -1 = izquierda, 0 = centro, 1 = derecha.

```
cuando empieza:
    sonido.bucle("salto")
    sonido.ponerPan("salto", -1)
```

**Error típico:** Darle un texto: es un número de -1 (izquierda) a 1 (derecha). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sonido.ponerPan("salto", "izquierda")
```

#### `sonido.oyente`

Quién escucha los sonidos con sitio (sonido.reproducirEn, sonido.bucleEn): un objeto, o nulo para que sea el centro de la cámara (lo normal).

```
cuando empieza:
    sonido.oyente = yo
```

**Error típico:** Darle el nombre entre comillas: quiere el objeto. Usa buscar("Jugador"). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    sonido.oyente = "Jugador"
```

#### `musica.cruzar("nombre", segundos)`

Pasa a otra música CRUZÁNDOLAS: la que suena baja mientras la nueva sube (2 segundos si no se dice).

```
cuando empieza:
    musica.reproducir("tema")

cuando se pulsa "espacio":
    musica.cruzar("salto", 2)
```

**Error típico:** Segundos negativos: el cruce dura de 0 a 60. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    musica.cruzar("tema", -1)
```

#### `musica.capa(numero, volumen, segundos)`

Sube o baja UNA capa de la música que suena.

```
cuando empieza:
    musica.reproducir("tema")
    musica.capa(1, 0.5, 2)
```

**Error típico:** Pedir una capa que no hay: una canción tiene tantas capas como pistas (y un archivo importado, una). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    musica.reproducir("tema")
    musica.capa(5, 1)
```

#### `musica.intensidad`

Música adaptativa con un solo número: con 0 solo suena la primera capa, con 1 todas, y en medio van entrando una a una.

```
cuando empieza:
    musica.reproducir("tema")
    musica.intensidad = 0.5
```

**Error típico:** Darle un porcentaje: va de 0 a 1. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    musica.intensidad = 50
```

#### `musica.tono`

La velocidad de la música (y su tono): 1 = normal, 1.2 = más rápida y aguda, 0.8 = más lenta y grave.

```
cuando empieza:
    musica.reproducir("tema")
    musica.tono = 1.2
```

**Error típico:** Pasarse: va de 0.25 a 4 (1 = normal). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    musica.tono = 10
```

### Pantallas listas y tabla de puntuaciones

En el editor, el botón «Pantallas listas» (junto a las escenas) añade un menú principal, opciones, créditos, tabla de puntuaciones, fin del juego y pausa, ya conectados. La tabla guarda las 10 mejores puntuaciones con su nombre en el ordenador de quien juega.

#### `puntuaciones.guardar("nombre", puntos)`

Apunta una puntuación en la tabla.

```
cuando empieza:
    variable puesto = puntuaciones.guardar("Ana", 1200)
    mostrar("puesto", puesto)
```

**Error típico:** Olvidar el nombre: primero el nombre, luego los puntos. Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    puntuaciones.guardar(1200)
```

#### `puntuaciones.lista()`

Las mejores puntuaciones, de mayor a menor: una lista de tablas con nombre y puntos.

```
cuando empieza:
    para cada p en puntuaciones.lista():
        mostrar(p.nombre, p.puntos)
```

**Error típico:** Pedirle el nombre a la lista entera: hay que recorrerla (para cada p en ...) o coger una: puntuaciones.lista()[1].nombre Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    mostrar(puntuaciones.lista().nombre)
```

#### `puntuaciones.entra(puntos)`

Verdadero si esos puntos entrarían en la tabla (hay hueco, o superan a la última).

```
cuando empieza:
    si puntuaciones.entra(500):
        mostrar("entra en la tabla")
```

**Error típico:** Darle un texto: quiere los puntos (un número). Chispa te avisa con un error que explica qué pasa.

```
cuando empieza:
    si puntuaciones.entra("muchos"):
        mostrar("si")
```

#### `puntuaciones.borrar()`

Deja la tabla vacía.

```
cuando se pulsa "b":
    puntuaciones.borrar()
```

**Error típico:** Borrarla en cada fotograma: nunca se guardaría nada. Esto no da error: funciona, pero no hace lo que querías.

```
cuando cada fotograma:
    puntuaciones.borrar()
```

### Depurar: encontrar los fallos

Un fallo (un *bug*) casi nunca es un misterio: es una línea que no hace lo que crees. Estas son las herramientas de Chispa para verlo:

- **Los errores te dicen la línea y qué pasa.** Mientras escribes, lo que está mal se subraya en rojo; pasa el ratón por encima para leer la explicación y la pista («¿Querías decir...?»). En la pestaña **Problemas** están todos: haz clic en uno para ir a su línea.
- **mostrar()** es la herramienta más sencilla: pon `mostrar("aqui llego", yo.x)` en el sitio que no entiendes y mira la consola.
- **Puntos de parada.** Haz clic en el número de una línea: sale un punto rojo. Al ejecutar, el juego se para justo antes de esa línea y en la pestaña **Depurar** ves cuánto vale cada variable (también las de `juego` y las de `yo`). **F10** ejecuta la siguiente línea, **F11** entra en una función y **F8** sigue jugando.
- **Órdenes en la consola.** Con el juego en marcha, abajo de la consola puedes escribir una línea de Chispa y pulsar Intro: `juego.vidas = 99`, `buscar("Jugador").x = 500`, `mostrar(contar("Enemigo"))`. Sirve para probar cosas sin tocar el código.
- **Avisos amarillos.** No son errores, pero casi siempre esconden uno: un mensaje que nadie recibe, un dato de `juego` que nadie guarda, una variable que no se usa...
- **tiempo.fps** te dice si el juego va lento: `yo.texto = "FPS: {tiempo.fps}"`. Si baja mucho de 60, hay demasiadas cosas (o un bucle muy grande en cada fotograma).

**El método:** 1) mira el error y su línea; 2) si no hay error, pon un mostrar() o un punto de parada antes de lo que falla; 3) comprueba si cada variable vale lo que crees; 4) cambia UNA cosa y vuelve a probar.

### Ejercicios del nivel 4

1. **Mensajes con dato.** Al empezar, envía el mensaje «puntos» dos veces, con 10 y con 5. Al recibirlo, suma el dato a juego.total y enséñalo.
2. **El récord.** Con unos puntos de 120, carga el récord guardado (0 si no hay). Si lo has superado, guárdalo y dilo; si no, di cuál sigue siendo el récord.
3. **El vigilante.** Cada medio segundo, lanza un rayo hacia el Jugador. Si lo primero que toca es el Jugador (nada lo tapa), ve hacia él con irHacia.

Las soluciones, en [Soluciones](#soluciones) (nivel 4).

### Mini proyecto: La aldea

Ana ha perdido la llave de su casa. Si hablas con ella (tocándola), te pide ayuda con un diálogo con opciones. Al coger la llave, un mensaje abre la puerta, que se desvanece. Un perro te sigue sin chocar con nada, y la misión se guarda aunque cierres el juego. Junta mensajes, datos de juego, diálogos, irHacia, animar, efectos y datos guardados.

**Qué poner en la escena:**

- La escena con **gravedad 0**.
- Un **Jugador** con Colisión, Física y el script **jugador.chs**.
- Un objeto **Ana** con Colisión y el script **ana.chs**.
- Una **Llave** con Colisión (sin «sólido»), una **Puerta** con Colisión y el script **puerta.chs**, y un **Perro** con Colisión (sin «sólido»), Física y el script **perro.chs**.
- Un **Texto** llamado **Marcador** con el script **marcador.chs**.

**jugador.chs**

```
cuando cada fotograma:
    yo.moverConFlechas(250)

cuando toco Llave:
    destruir(otro)
    sonido.efecto("moneda")
    enviar("abrir_puerta")
```

**ana.chs**

```
cuando toco Jugador:
    si juego.mision == 0:
        variable r = dialogo("Ana", "Se me ha perdido la llave de casa. Me ayudas?", ["Si", "No"])
        si r == "Si":
            juego.mision = 1
            dialogo("Ana", "Gracias! Creo que la vi junto al pozo.")
    sino si juego.mision == 2:
        dialogo("Ana", "Ya esta abierta. Eres de fiar!")
```

**puerta.chs**

```
cuando recibo "abrir_puerta":
    juego.mision = 2
    guardar("aldea_mision", 2)
    sonido.efecto("subir")
    animar(yo.opacidad, 0, 1)
    esperar(1)
    destruir(yo)
```

**perro.chs**

```
cuando cada 0.5 segundos:
    variable jugador = buscar("Jugador")
    si jugador != nulo:
        si yo.distanciaA(jugador) > 80:
            yo.irHacia(jugador, 200)
        sino:
            yo.parar()
```

**marcador.chs**

```
cuando empieza:
    juego.mision = cargar("aldea_mision", 0)

cuando cada fotograma:
    si juego.mision == 0:
        yo.texto = "Habla con Ana"
    sino si juego.mision == 1:
        yo.texto = "Busca la llave"
    sino:
        yo.texto = "Mision cumplida"
```

Cuando funcione, cámbialo: más enemigos, otro color, un sonido nuevo... ¡Es tuyo!

## Soluciones

Hay muchas formas buenas de resolver cada ejercicio: si la tuya funciona, está bien. Estas son solo una de ellas.

### Soluciones del nivel 1

**1.** Cuenta atrás.

```
para cada n en rango(10, 1):
    mostrar(n)
mostrar("Despegue")
```

**2.** Pares e impares.

```
funcion esPar(n):
    devolver n % 2 == 0

cuando empieza:
    para cada n en rango(1, 6):
        si esPar(n):
            mostrar(n, "es par")
        sino:
            mostrar(n, "es impar")
```

**3.** La lista de la compra.

```
variable compra = ["pan", "leche"]
compra.añadir("huevos")
compra.ordenar()
mostrar("Tengo que comprar", compra.longitud, "cosas:", compra.unir(", "))
```

### Soluciones del nivel 2

**1.** Ir y volver.

```
variable direccion = 1

cuando cada fotograma:
    yo.x += 150 * direccion * delta
    si yo.x > 800:
        direccion = -1
    si yo.x < 100:
        direccion = 1
```

**2.** Cambia de color.

```
cuando se pulsa "espacio":
    yo.color = elegir(["rojo", "verde", "azul", "amarillo"])
```

**3.** Vigila el ratón.

```
cuando cada fotograma:
    yo.mirarA(raton.posicion)

cuando toco Moneda:
    mostrar("Tocado")
```

### Soluciones del nivel 3

**1.** Disparos.

```
cuando cada 0.5 segundos:
    variable b = crear("Bala", yo.x, yo.y)
    b.velocidad = vector(500, 0)
```

**2.** Cuenta atrás.

```
variable quedan = 10

cuando empieza:
    yo.texto = "Tiempo: {quedan}"

cuando cada 1 segundo:
    quedan -= 1
    si quedan <= 0:
        escena.cambiar("Fin")
```

**3.** Un buen golpe.

```
cuando toco Enemigo:
    particulas("explosion", yo.x, yo.y)
    sonido.efecto("explosion")
    escena.camara.temblar(10, 0.3)
    yo.parpadear(1)
```

### Soluciones del nivel 4

**1.** Mensajes con dato.

```
cuando empieza:
    juego.total = 0
    enviar("puntos", 10)
    enviar("puntos", 5)

cuando recibo "puntos":
    juego.total += dato
    mostrar("Total:", juego.total)
```

**2.** El récord.

```
cuando empieza:
    variable puntos = 120
    variable record = cargar("record", 0)
    si puntos > record:
        guardar("record", puntos)
        mostrar("Nuevo record:", puntos)
    sino:
        mostrar("El record sigue siendo", record)
```

**3.** El vigilante.

```
cuando cada 0.5 segundos:
    variable jugador = buscar("Jugador")
    si jugador != nulo:
        variable r = rayo(yo, jugador, 500)
        si r != nulo:
            si r.objeto == jugador:
                yo.irHacia(jugador, 150)
```
