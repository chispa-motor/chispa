# Novedades de Chispa 1.4

Chispa 1.4 trae **Programar juntos**: varias personas hacen el mismo juego **a
la vez**, cada una desde su ordenador, tablet o móvil, como en un documento
compartido. Lo que hace uno lo ven los demás al momento: el código, los
objetos, las escenas, todo. Todo lo que hiciste con las versiones anteriores
**sigue funcionando igual**, y quien no usa salas no nota nada.

> Lo de la versión anterior está en [NOVEDADES_1.3.md](NOVEDADES_1.3.md).

## Crear una sala o entrar con un código

- Botón **«Juntos»** arriba (en el móvil, en el menú ☰).
- **Crear una sala** con el proyecto que tienes abierto. Sale un código como
  `K7Q-MX4-P2R`, fácil de leer en voz alta en clase, y un botón para copiar un
  **enlace** que abre Chispa y entra directamente.
- **Entrar con un código**: se abre el proyecto de la sala. El tuyo se queda
  guardado en «Mis proyectos».
- Aquí nadie escribe su nombre: cada uno es **un animal de un color** («Zorro
  naranja», «Rana turquesa»), al azar. Se puede cambiar por otro al azar.

## Lo que se ve de los demás

- En el **código**, el cursor de cada uno, de su color, y lo que escribe letra a
  letra. Dos personas pueden escribir en el mismo script a la vez sin pisarse.
- En la **escena**, un borde de su color con su nombre alrededor del objeto que
  tiene seleccionado.
- En las **pestañas**, un circulito en el script donde está cada uno.
- Arriba, los circulitos de quién está en la sala. Al tocarlos se ve la lista,
  qué está haciendo cada uno y si la conexión va bien.

## Deshacer solo lo tuyo

Dentro de una sala, **Deshacer** deshace lo que has hecho tú, sin tocar lo que
han hecho los demás mientras tanto. En el código, igual: Ctrl+Z deshace lo que
has escrito tú.

## El dueño de la sala

Quien la crea puede **sacar a alguien** (no puede volver a entrar desde ese
aparato), **poner el candado** (que no entre nadie más: útil cuando ya está toda
la clase) y **cerrar la sala** para todos (se borra; cada uno se queda con su
copia).

## Si se corta internet

Se vuelve a conectar sola. Lo que hagas mientras tanto se manda al volver y se
junta con lo de los demás.

## Seguridad (lo usan chavales)

- **Sin chat, sin cuentas y sin nombres de verdad.** Los nombres de animal que
  llegan de otros se comprueban: si alguien hace trampas con un nombre que no es
  de la lista, sale «Invitado».
- **Salas privadas**: solo se entra con el código, que es largo y al azar. No
  hay lista de salas.
- **Lo que llega de otros se comprueba entero** antes de usarlo, igual que al
  abrir un archivo: si alguien manda un proyecto roto o con trampas (por ejemplo
  una imagen de internet que avisaría a otra web de quién juega), no se aplica.
- Una sala vacía 7 días se borra sola. El servidor no guarda nada de las
  personas. Todo está en [AUDITORIA_SEGURIDAD.md](AUDITORIA_SEGURIDAD.md)
  («Chispa 1.4»).

## El servidor de salas

Para que los editores se encuentren hace falta un servidor. Está en
`servidor-salas/` y funciona en Cloudflare con el **plan gratis**. Cómo subirlo,
cuánto aguanta y qué guarda: [SERVIDOR_SALAS.md](SERVIDOR_SALAS.md).

## Para quien modifica Chispa

- `src/colaborar/`: las diferencias entre proyectos, el proyecto dentro de Yjs,
  el vínculo con el editor y la conexión con la sala.
- `src/editor/juntos/ControlJuntos.ts`: lo que se ve.
- `servidor-salas/`: el servidor (lógica en `logica.ts`, lo de Cloudflare en
  `index.ts`).
- Tests: `pruebas/colaborar.test.ts` (dos y tres editores unidos en memoria),
  `pruebas/servidor-salas.test.ts`, `servidor-salas/probar-salas.mjs` (contra
  el servidor de verdad) y `npm run pruebas:juntos` (dos navegadores, uno de
  ordenador y uno de móvil).
