# El servidor de salas (Programar juntos)

«Programar juntos» deja que varias personas hagan el mismo juego **a la vez**,
cada una desde su aparato. Para que los editores se encuentren por internet hace
falta un sitio donde quedar: el **servidor de salas**. Está en la carpeta
[`servidor-salas/`](servidor-salas/) y funciona en **Cloudflare** (Workers y
Durable Objects), con el **plan gratis**.

Mientras no haya servidor, el botón «Juntos» del editor explica que todavía no
está activado. Todo lo demás de Chispa funciona igual.

## Cómo funciona

- Cada sala es un **Durable Object**: un programa pequeño que Cloudflare pone en
  marcha cuando alguien entra, que guarda el proyecto de la sala en su propia
  base de datos y que **se duerme** (sin gastar) mientras nadie escribe.
- Los editores mandan sus cambios por una conexión WebSocket. La sala los junta
  con [Yjs](https://yjs.dev) (que mezcla cambios hechos a la vez sin que se
  pisen) y se los pasa a los demás.
- Se entra **solo con el código** de la sala (9 letras y números al azar, como
  `K7Q-MX4-P2R`). No hay lista de salas.
- Quien crea la sala es su **dueño**: su editor guarda una llave secreta con la
  que puede sacar a alguien, poner el candado (que no entre nadie más) y cerrar
  la sala. El servidor solo guarda la *huella* de esa llave, no la llave.
- Una sala sin nadie durante **7 días se borra sola**, con todo lo que tenía.

## Qué guarda y qué no

| Se guarda (en la sala, hasta que se borra) | No se guarda nunca |
|---|---|
| El proyecto que se está haciendo | Nombres de verdad (cada uno es un animal: «Zorro naranja») |
| La huella de la llave del dueño | Correos, cuentas o contraseñas (no hay cuentas) |
| Si tiene candado | Direcciones IP ni registros de quién entra (`observability` está apagado) |
| Los aparatos que el dueño ha sacado (un número al azar de cada navegador, para que no vuelvan) | Mensajes de chat (no hay chat) |

## Cuánto cuesta

Con el plan **gratis** de Cloudflare (sin tarjeta). Lo que da al día:

| Límite del plan gratis (cada día) | Qué es en Chispa |
|---|---|
| 100.000 peticiones | Cada vez que alguien entra en una sala es 1. Los mensajes que llegan cuentan 1 de cada 20: una clase de 25 escribiendo una hora entera son unas 5.000. |
| 13.000 GB-s de tiempo encendido | La sala solo cuenta mientras procesa un mensaje: dormida no gasta. |
| 100.000 escrituras en la base de datos | La sala guarda como mucho cada 4 segundos mientras alguien cambia algo. |
| 5 GB guardados | Un proyecto normal ocupa unos KB. Las salas viejas se borran solas. |

Si un día se pasara de algún límite, ese día las salas darían error (no se cobra
nada en el plan gratis) y al día siguiente vuelve a funcionar.

## Subirlo a tu cuenta (una vez)

Hace falta una **cuenta de Cloudflare**. Si eres menor de edad, créala con tus
padres: es un servicio con sus condiciones de uso.

1. Crea la cuenta en <https://dash.cloudflare.com/sign-up> (con el plan Free).
2. En una terminal, en la carpeta de Chispa:

   ```
   cd servidor-salas
   npm install
   npx wrangler login
   ```

   Se abre el navegador para que des permiso a Wrangler (la herramienta de
   Cloudflare). Acepta y vuelve a la terminal.

3. Súbelo:

   ```
   npx wrangler deploy
   ```

   Al terminar dice la dirección del servidor, algo como
   `https://chispa-salas.TU-NOMBRE.workers.dev`. La primera vez puede pedirte
   que elijas un subdominio `workers.dev`: pon el que quieras.

4. Comprueba que funciona (crea salas de prueba, escribe a la vez, saca a
   alguien y cierra la sala):

   ```
   node probar-salas.mjs https://chispa-salas.TU-NOMBRE.workers.dev https://chispa-motor.github.io
   ```

   Tiene que acabar con «Todo bien: el servidor de salas funciona».

5. Pon esa dirección en [`src/configuracion.ts`](src/configuracion.ts), en
   `servidorSalas`:

   ```ts
   servidorSalas: 'https://chispa-salas.TU-NOMBRE.workers.dev',
   ```

6. Sube Chispa como siempre (`git push origin main`). Al publicarse la web, el
   botón «Juntos» ya funciona. La política de seguridad del editor (CSP) deja
   conectarse a ese servidor y a ningún otro: se pone sola al compilar.

## Qué webs pueden usarlo

En [`servidor-salas/wrangler.toml`](servidor-salas/wrangler.toml), `ORIGENES`
dice qué webs pueden conectarse: la de Chispa (`https://chispa-motor.github.io`)
y las de pruebas en tu ordenador (`npm run dev` y `npm run preview`). Si algún
día Chispa está en otra dirección, añádela ahí y vuelve a hacer
`npx wrangler deploy`.

## Probarlo en tu ordenador, sin subir nada

```
cd servidor-salas
npm install
npm run local            (el servidor en http://127.0.0.1:8787)
```

En otra terminal, desde la carpeta de Chispa:

```
npm run pruebas:juntos
```

Arranca el servidor si no está en marcha, compila el editor apuntando a él y
abre dos editores a la vez (uno de ordenador y uno de móvil) que crean una sala,
escriben juntos, deshacen, ponen el candado y se sacan. Y
`node servidor-salas/probar-salas.mjs` prueba el servidor solo.

## Ver las salas o borrarlo todo

- En el panel de Cloudflare: **Workers & Pages → chispa-salas → Durable
  Objects** se ve cuántas salas hay. Desde ahí se puede borrar el Worker
  entero, con todas las salas.
- Una sala concreta la cierra su dueño desde el editor («Cerrar la sala para
  todos»): se borra al momento.

## Licencias

El servidor es parte de Chispa (MPL 2.0). Usa Yjs, y-protocols y lib0 (las tres
MIT), igual que el editor.
