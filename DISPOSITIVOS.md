# Dispositivos objetivo

**Regla permanente, desde Chispa 1.2:** todo lo nuevo (comandos, editor,
plantillas, juegos de prueba) tiene que funcionar bien en estos dispositivos.
Si algo no puede, se dice en el informe; no se deja roto.

## Donde tienen que funcionar el editor y los juegos exportados

- Móviles Android (Chrome) y iPhone (Safari), en vertical y en horizontal.
- Tabletas Android y iPad, con y sin teclado físico ni ratón.
- Chromebooks y portátiles pequeños (1366×768 y 1280×720).
- PCs con pantalla táctil, y pantallas plegables o que cambian de tamaño.
- Mandos Bluetooth y USB en cualquiera de ellos.
- Escritorio normal (Windows, Mac, Linux), sin perder nada de lo actual.

## Lo que suele fallar y hay que resolver

- **Safari de iPhone y iPad:** el audio solo suena tras un toque del usuario,
  la pantalla completa funciona distinto, «instalar en inicio» se hace con
  otro menú, y hay que respetar la zona segura (notch y barra inferior).
  Revisarlo todo y documentarlo.
- **Teclado en pantalla:** que no tape el editor de código ni los campos.
- **Rotar la pantalla o cambiar el tamaño de la ventana:** sin perder el
  proyecto ni la partida.
- **Batería y calor:** opción de limitar a 30 fotogramas por segundo y bajar
  efectos.
- **Móviles de gama baja:** calidad adaptable automática.

## Pruebas

Las pruebas del navegador simulan varios dispositivos: móvil pequeño, móvil
grande, tableta en vertical y en horizontal, portátil pequeño y escritorio.
Lo que no se pueda probar sin un aparato real se apunta en
`PRUEBAS_PENDIENTES.md`, con lo que habría que revisar a mano.
