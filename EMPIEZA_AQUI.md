# Empieza aquí: tu primer juego con Chispa

Esta guía es para ti si abres Chispa por primera vez. En unos 10 minutos
tendrás un personaje que anda, salta y recoge monedas, con un marcador de
puntos en la pantalla.

## 1. Arrancar el editor

En una terminal, dentro de la carpeta del motor:

```
npm install
npm run dev
```

La primera orden solo hace falta la primera vez. La segunda abre el editor en
el navegador (http://localhost:5173).

> **En Windows,** si PowerShell dice que «la ejecución de scripts está
> deshabilitada», escribe `npm.cmd install` y `npm.cmd run dev`. Si prefieres
> arreglarlo para siempre, ejecuta una vez
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y responde S.

## 2. Conoce la ventana

```
┌──────── Nuevo · Abrir · Guardar · Exportar ·   ▶ Ejecutar  ⏸  ⏹   · Ayuda ────────┐
│ ESCENA /     │  Escena  |  jugador.chs                    │  JUEGO            │
│ PROYECTO     │                                            │  (aquí se juega)  │
│ (tus objetos │  la escena (colocar objetos)               ├───────────────────┤
│  y scripts)  │  o el código                               │  PROPIEDADES      │
│              ├────────────────────────────────────────────┤  (del objeto      │
│              │  CONSOLA · PROBLEMAS · GUÍA                │   seleccionado)   │
└──────────────┴────────────────────────────────────────────┴───────────────────┘
```

- **Izquierda:** los objetos de la escena y el script de cada uno. En la
  pestaña *Proyecto* están las escenas, imágenes, sonidos y plantillas.
- **Centro:** la escena o el código de un script. En la escena:
  - Arrastra un objeto para moverlo.
  - Arrastra el fondo para moverte por la escena.
  - La rueda del ratón acerca y aleja.
  - Arriba ves la **x** y la **y** del ratón.
- **Derecha:** el juego funcionando y las propiedades del objeto seleccionado.
- **Abajo:** la consola, los problemas de tu código y la **Guía**. En la
  Guía están las **Recetas** («¿cómo hago…?») y todo el lenguaje, con buscador.

La primera vez se abre un ejemplo. Pulsa **▶ Ejecutar** (o F5) para verlo.

## 3. Tu primer juego

1. Pulsa **Nuevo → Vacío**.
2. **El jugador.** Pulsa **Añadir → Cuadrado**. En *Propiedades*, cámbiale el
   nombre a `Jugador` y activa **Física** con su interruptor. Con Física, cae
   y choca.
3. **El suelo.** Pulsa **Añadir → Mapa de casillas**. Ya tienes el pincel en
   la mano. Mantén pulsada **Mayús** y arrastra por la parte de abajo del
   recuadro de puntos (la pantalla del juego): pintarás una fila de suelo
   entera.
4. **Una plataforma.** Pulsa **V** para volver a la flecha. Luego
   **Añadir → Cuadrado**, llámalo `Plataforma` y hazlo alargado. Puedes
   arrastrar su esquina o cambiar *ancho* y *alto*. Un objeto **sin** Física
   no se mueve: sirve de suelo.
5. **Las monedas.** **Añadir → Círculo**, llámalo `Moneda`, ponle color
   `amarillo` y, en *Colisión*, quita **sólido** (así se atraviesa). Pulsa
   **Ctrl+D** para duplicarla un par de veces y coloca las copias por la
   escena. Se llamarán `Moneda2`, `Moneda3`…, pero todas son monedas.
6. **Los puntos.** **Añadir → Texto** (ya sale pegado a la pantalla, arriba a
   la izquierda). Pulsa **Crear script**, borra lo que hay y escribe:

   ```
   cuando cada fotograma:
       yo.texto = "Puntos: " + juego.puntos
   ```

7. **El jugador.** Selecciónalo en la lista de la izquierda, pulsa
   **Crear script**, borra lo que hay y escribe:

   ```
   cuando empieza:
       juego.puntos = 0

   cuando cada fotograma:
       yo.moverConFlechas(300)

   cuando se pulsa "espacio":
       yo.saltar(700)

   cuando toco Moneda:
       destruir(otro)
       juego.puntos += 1

   cuando salgo de la pantalla:
       escena.reiniciar()
   ```

8. Pulsa **▶ Ejecutar**, haz clic en el juego y usa las flechas y el espacio.

Qué significa cada trozo:

- `yo` es el objeto de este script.
- `otro` es lo que has tocado.
- `juego.puntos` es un dato que ven todos los scripts; por eso el texto puede
  enseñarlo.
- **La Y crece hacia arriba**: subir es sumar a la Y.

## 4. Cuando algo sale mal

- Si escribes algo mal, se **subraya en rojo** mientras escribes. Pasa el
  ratón por encima: te dice qué pasa y cómo arreglarlo («¿Querías decir…?»).
- Mientras haya errores, el botón **Ejecutar** se pone rojo. En la pestaña
  **Problemas** están todos; haz clic en uno para ir a su línea.
- Si algo falla con el juego en marcha, el error sale en la **Consola** y el
  resto del juego sigue funcionando.
- Si el juego no hace caso al teclado, haz clic en el juego (sale un aviso
  cuando las teclas van a otro sitio).
- ¿No sabes qué escribir? Escribe `yo.` o `teclado.` y espera: salen las
  sugerencias. Pasa el ratón por cualquier palabra para ver su explicación.
- Los nombres de teclas, colores, escenas y plantillas van **entre comillas**:
  `teclado.pulsada("derecha")`, `crear("Bala")`.
- Para ver qué está pasando, escribe `mostrar(algo)` en tu código: el valor
  sale en la consola.

## 5. Tu siguiente juego

En **Guía → Recetas** tienes el código de lo más común, con un botón para
copiarlo:

- **Disparar.** Crea la bala y pulsa **Plantilla** para convertirla en
  plantilla. Luego, desde la nave: `crear("Bala")`.
- **Enemigos que aparecen solos.** Usa un *Objeto vacío* con
  `cuando cada 1 segundo:`.
- **Explosiones:** `particulas("explosion")`.
- **Pantalla de fin.** Crea otra escena con el **+** que hay junto al nombre de
  la escena, y en ella un **Botón** con `cuando hago clic encima:`.
- **Juego visto desde arriba.** Sin nada seleccionado, pon la **gravedad** de
  la escena a `0`: `yo.moverConFlechas` irá en las cuatro direcciones.
- **Cámara que sigue al jugador.** Sin nada seleccionado, en *Cámara* elige al
  jugador en «seguir a» y marca «no salir del mapa».
- **Puertas a otra escena.** Crea un tipo de casilla `puerta` y escribe
  `cuando toco puerta:`.
- **El mismo jugador en otra escena.** Selecciónalo, **Ctrl+C**, cambia de
  escena y **Pegar**.

## 6. Guardar y compartir

- El editor **guarda solo** en tu navegador. Si cierras la pestaña, al volver
  está todo.
- **Guardar** (Ctrl+S) descarga tu proyecto como un archivo `.chispa.json`.
  Con **Abrir** lo recuperas, en este o en otro ordenador.
- **Exportar** crea una página `.html` con tu juego dentro. Se abre con doble
  clic y se puede subir a itch.io o enviarla a quien quieras.

Todo el lenguaje, con un ejemplo de cada cosa, está en **MANUAL_CHISPA.md**
(y en la pestaña **Guía** del editor).
