# Empieza aquí: tu primer juego con Chispa

Esta guía es para ti si abres Chispa por primera vez. En 10 minutos tendrás
un cuadrado que se mueve con las flechas, salta y recoge una moneda.

## 1. Arrancar el editor

En una terminal, dentro de la carpeta del motor:

```
npm install
npm run dev
```

La primera orden solo hace falta la primera vez. La segunda abre el editor en
el navegador (http://localhost:5173).

> En Windows, si PowerShell dice que «la ejecución de scripts está
> deshabilitada», usa `npm.cmd install` y `npm.cmd run dev`.

## 2. Conoce la ventana

```
┌──────────── Nuevo · Abrir · Guardar · Exportar ·  ▶ Ejecutar  ⏸  ⏹ ────────────┐
│ ESCENA /     │  Escena  |  jugador.chs                    │  JUEGO            │
│ PROYECTO     │                                            │  (aquí se juega)  │
│ (tus objetos │  la escena (colocar objetos)               ├───────────────────┤
│  y scripts)  │  o el código                               │  PROPIEDADES      │
│              ├────────────────────────────────────────────┤  (del objeto      │
│              │  CONSOLA · PROBLEMAS · GUÍA                │   seleccionado)   │
└──────────────┴────────────────────────────────────────────┴───────────────────┘
```

- **Izquierda:** los objetos de la escena y el script de cada uno. En la pestaña
  *Proyecto* están las escenas, imágenes, sonidos, plantillas y animaciones.
- **Centro:** la escena (arrastra objetos, rueda = zoom, arrastra el fondo para
  moverte) o el código de un script.
- **Derecha:** el juego funcionando y las propiedades del objeto seleccionado.
- **Abajo:** la consola (lo que escribe `mostrar()` y los errores), los
  problemas de tu código y la **Guía**, con toda la documentación y un buscador.

La primera vez se abre un ejemplo. Pulsa **▶ Ejecutar** (o F5) para verlo.

## 3. Tu primer juego

1. Pulsa **Nuevo → Vacío**.
2. Pulsa **Añadir → Cuadrado**. En *Propiedades*, cámbiale el nombre a `Jugador`
   y activa **Física** con su interruptor.
3. Pulsa **Añadir → Mapa de casillas**. Con el pincel, pinta un suelo en la
   parte de abajo de la pantalla del juego (el recuadro de puntos).
4. Pulsa **Añadir → Círculo**. Llámalo `Moneda`, ponlo en el aire y, en
   *Colisión*, quita **sólido** (así se atraviesa).
5. Selecciona el `Jugador` y pulsa **Crear script**. Borra lo que hay y escribe:

```
# El jugador: flechas para moverse, espacio para saltar
variable rapidez = 300

cuando cada fotograma:
    si teclado.pulsada("derecha"):
        yo.x += rapidez * delta
    si teclado.pulsada("izquierda"):
        yo.x -= rapidez * delta

cuando se pulsa "espacio":
    yo.saltar(700)

cuando toco Moneda:
    destruir(otro)
    sonido.tono(880, 0.1)
    mostrar("¡Moneda!")
```

6. Pulsa **▶ Ejecutar**. Haz clic en el juego y usa las flechas y el espacio.

**Recuerda:** la Y crece hacia **arriba** (subir = sumar a la Y), y
`* delta` hace que el juego vaya igual de rápido en cualquier ordenador.

## 4. Cuando algo sale mal

- Si escribes algo mal, se **subraya en rojo** mientras escribes. Pasa el ratón
  por encima: te dice qué pasa y cómo arreglarlo («¿Querías decir…?»).
- Mientras haya errores, el botón **Ejecutar** se pone rojo. En la pestaña
  **Problemas** están todos; haz clic en uno para ir a su línea.
- Si algo falla con el juego en marcha, el error sale en la **Consola** y el
  resto del juego sigue funcionando.
- ¿No sabes qué palabra usar? Escribe `yo.` o `teclado.` y espera: salen las
  sugerencias. Pasa el ratón por cualquier palabra para ver su explicación.

## 5. Guardar y compartir

- El editor **guarda solo** en tu navegador. Si cierras la pestaña, al volver
  está todo.
- **Guardar** (Ctrl+S) descarga tu proyecto como un archivo `.chispa.json`.
  Con **Abrir** lo recuperas, en este o en otro ordenador.
- **Exportar** crea una página `.html` con tu juego dentro. Se abre con doble
  clic y se puede subir a itch.io o enviarla a quien quieras.

## 6. ¿Y ahora qué?

Abre la pestaña **Guía** y busca lo que necesites: `camara` (para que siga al
jugador), `crear` (disparar), `particulas`, `musica`, `guardar` (récords),
`escena.cambiar` (niveles)… Cada ficha trae un ejemplo que puedes copiar.

La descripción completa del lenguaje está en **ESPECIFICACION_CHISPA.md**.
