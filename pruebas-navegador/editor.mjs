/**
 * PRUEBAS EN UN NAVEGADOR DE VERDAD: npm run pruebas:navegador
 *
 * Los tests normales (npm run pruebas) no tienen pantalla. Estos abren el
 * editor compilado en Chromium y lo usan como una persona: ejecutar el juego,
 * escribir código con errores, pintar un mapa, exportar el juego y abrirlo...
 *
 * La primera vez hay que descargar el navegador: npx playwright install chromium
 * (Si ya tienes un Chromium, puedes indicarlo con la variable CHROMIUM=ruta.)
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const carpeta = mkdtempSync(join(tmpdir(), 'chispa-'));
const servidor = await preview({ preview: { port: 4321, strictPort: false }, logLevel: 'silent' });
const direccion = servidor.resolvedUrls.local[0];
const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 860 }, acceptDownloads: true });
await contexto.grantPermissions(['clipboard-read', 'clipboard-write']);

let fallos = 0;
async function prueba(nombre, fn) {
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  try {
    await pagina.goto(direccion + '?limpio');
    await pagina.waitForFunction(() => window.chispa);
    await fn(pagina);
    if (errores.length) throw new Error('Errores en la página: ' + errores.join(' | '));
    console.log(`  ✓ ${nombre}`);
  } catch (e) {
    fallos++;
    console.log(`  ✗ ${nombre}\n      ${String(e.message ?? e).split('\n')[0]}`);
  } finally {
    await pagina.close();
  }
}
function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}
const estado = (p, fn, arg) => p.evaluate(fn, arg);
const textoDe = (p, selector) => p.$eval(selector, (el) => el.innerText);

console.log('Pruebas en el navegador:');

await prueba('el editor arranca con el ejemplo y F5 ejecuta el juego', async (p) => {
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(300);
  comprobar((await textoDe(p, '.consola-editor')).includes('¡Hola!'), 'mostrar() no ha llegado a la consola');
  await p.click('.controles-juego .pausar');
  comprobar((await textoDe(p, '.estado-juego')).startsWith('En pausa'), 'no se ha pausado');
  await p.click('.controles-juego .parar');
  comprobar((await textoDe(p, '.estado-juego')).startsWith('Parado'), 'no se ha parado');
});

await prueba('un texto con «Enseñar un dato» se actualiza solo en el juego', async (p) => {
  await estado(p, () => window.chispa.estado.cambiarCodigo('cuadrado.chs', 'cuando empieza:\n    juego.puntos = 0\ncuando cada fotograma:\n    juego.puntos += 1\n'));
  await p.click('.boton-anadir');
  await p.click('.opcion-menu:has-text("Texto")');
  await p.selectOption('.menu-datos', '{juego.puntos}');
  const texto = await estado(p, () => window.chispa.estado.seleccionado.sprite.texto);
  comprobar(texto === 'Puntos: {juego.puntos}', 'el texto no tiene el dato: ' + texto);
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(500);
  const enJuego = await estado(p, () => window.chispa.vistaJuego.juego.escena.buscar('Texto').obtener ? window.chispa.vistaJuego.juego.escena.objetos.find((o) => o.nombre === 'Texto').todosLosComponentes.find((c) => 'textoVivo' in c).texto : '');
  comprobar(/^Puntos: \d+$/.test(enJuego) && enJuego !== 'Puntos: 0', 'el texto no se actualiza: ' + enJuego);
});

await prueba('una plataforma con Recorrido: se arrastra su punto y se mueve al jugar', async (p) => {
  await p.click('.nodo');
  await p.check('details.seccion:has(.seccion-titulo:text-is("Recorrido")) .interruptor');
  const def = await estado(p, () => window.chispa.estado.escena.objetos[0]);
  comprobar(def.recorrido?.puntos?.length === 1, 'no se ha añadido el recorrido');
  const lienzo = await p.locator('.lienzo-escena').boundingBox();
  const asa = await estado(p, (d) => window.chispa.vistaEscena.camara.aPantalla(d.x + d.recorrido.puntos[0].x, d.y + d.recorrido.puntos[0].y), def);
  await p.mouse.move(lienzo.x + asa.x, lienzo.y + asa.y);
  await p.mouse.down();
  await p.mouse.move(lienzo.x + asa.x, lienzo.y + asa.y + 80, { steps: 6 });
  await p.mouse.up();
  const punto = await estado(p, () => window.chispa.estado.escena.objetos[0].recorrido.puntos[0]);
  comprobar(Math.abs(punto.y) > 20, 'arrastrar el punto no lo ha movido: ' + JSON.stringify(punto));
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(600);
  const enJuego = await estado(p, (n) => window.chispa.vistaJuego.juego.escena.objetos.find((o) => o.nombre === n).posicion, def.nombre);
  comprobar(enJuego.x !== def.x || enJuego.y !== def.y, 'la plataforma no se mueve al jugar');
});

await prueba('seleccionar varios con un rectángulo y con Ctrl+clic, moverlos juntos y deshacer', async (p) => {
  await estado(p, () => {
    const e = window.chispa.estado;
    e.crearObjeto('circulo', 600, 270);
    e.crearObjeto('rectangulo', 720, 270);
    e.seleccionar(null);
  });
  const lienzo = await p.locator('.lienzo-escena').boundingBox();
  const pantalla = (x, y) => estado(p, ([x, y]) => window.chispa.vistaEscena.camara.aPantalla(x, y), [x, y]);
  const a = await pantalla(420, 330);
  const b = await pantalla(650, 210);
  // Rectángulo desde el fondo: coge el Cuadrado (480) y el Círculo (600), no el tercero (720)
  await p.mouse.move(lienzo.x + a.x, lienzo.y + a.y);
  await p.mouse.down();
  await p.mouse.move(lienzo.x + b.x, lienzo.y + b.y, { steps: 5 });
  await p.mouse.up();
  let sel = await estado(p, () => window.chispa.estado.indicesSeleccionados());
  comprobar(JSON.stringify(sel) === '[0,1]', 'el rectángulo no ha seleccionado los dos: ' + JSON.stringify(sel));
  comprobar((await textoDe(p, '.inspector')).includes('2 objetos seleccionados'), 'el inspector no dice que hay 2 seleccionados');
  // Ctrl+clic en el tercero lo añade
  const c = await pantalla(720, 270);
  await p.keyboard.down('Control');
  await p.mouse.click(lienzo.x + c.x, lienzo.y + c.y);
  await p.keyboard.up('Control');
  sel = await estado(p, () => window.chispa.estado.indicesSeleccionados());
  comprobar(sel.length === 3, 'Ctrl+clic no ha añadido el tercero: ' + JSON.stringify(sel));
  // Arrastrar uno mueve los tres
  const d = await pantalla(600, 270);
  await p.mouse.move(lienzo.x + d.x, lienzo.y + d.y);
  await p.mouse.down();
  await p.mouse.move(lienzo.x + d.x + 64, lienzo.y + d.y, { steps: 6 });
  await p.mouse.up();
  const xs = await estado(p, () => window.chispa.estado.escena.objetos.map((o) => o.x));
  comprobar(xs[0] > 480 && xs[1] > 600 && xs[2] > 720 && xs[1] - xs[0] === 120, 'no se han movido los tres juntos: ' + xs);
  // Un solo Ctrl+Z los devuelve
  await p.keyboard.press('Control+z');
  const vuelta = await estado(p, () => window.chispa.estado.escena.objetos.map((o) => o.x));
  comprobar(vuelta.join() === '480,600,720', 'deshacer no los ha devuelto: ' + vuelta);
  // Supr borra los tres
  await p.keyboard.press('Control+a');
  await p.keyboard.press('Delete');
  comprobar((await estado(p, () => window.chispa.estado.escena.objetos.length)) === 0, 'Supr no ha borrado todos');
});

await prueba('la primera vez ofrece el tutorial, y el tutorial se hace entero haciendo clic donde señala', async (p) => {
  // Primera visita (sin nada guardado): «¿Hacemos tu primer juego?»
  await p.evaluate(() => localStorage.clear());
  await p.goto(direccion);
  await p.waitForSelector('.dialogo:has-text("¿Hacemos tu primer juego?")', { timeout: 5000 });
  await p.click('.dialogo button:has-text("¡Vamos!")');
  const paso = async (titulo) => {
    try {
      await p.waitForFunction((t) => document.querySelector('.tutorial-burbuja strong')?.textContent === t, titulo, { timeout: 5000 });
    } catch {
      const actual = await p.evaluate(() => document.querySelector('.tutorial-burbuja strong')?.textContent ?? '(sin tutorial)');
      throw new Error(`esperaba el paso «${titulo}» y sigue en «${actual}»`);
    }
  };
  const centroDelFoco = async () => {
    await p.waitForTimeout(450); // lo que tarda el foco en llegar (se comprueba cada 200 ms y se mueve con una transición)
    const r = await p.locator('.tutorial-foco').boundingBox();
    comprobar(r, 'no hay nada resaltado');
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
  const clicEnFoco = async () => {
    const c = await centroDelFoco();
    await p.mouse.click(c.x, c.y);
  };
  const escribirNombre = async (nombre) => {
    await clicEnFoco();
    await p.keyboard.press('Control+a');
    await p.keyboard.type(nombre);
    await p.keyboard.press('Enter');
  };
  const lienzo = await p.locator('.lienzo-escena').boundingBox();
  const pantalla = (x, y) => estado(p, ([x, y]) => window.chispa.vistaEscena.camara.aPantalla(x, y), [x, y]);

  await paso('Tu primer juego');
  await p.click('.tutorial-siguiente');
  await paso('El jugador');
  await clicEnFoco();
  await paso('Ponle nombre');
  await escribirNombre('Jugador');
  await paso('Que caiga');
  await clicEnFoco();
  await paso('Un suelo');
  await clicEnFoco();
  await paso('Pinta el suelo');
  const a = await pantalla(8, 24);
  const b = await pantalla(952, 24);
  await p.keyboard.down('Shift');
  await p.mouse.move(lienzo.x + a.x, lienzo.y + a.y);
  await p.mouse.down();
  await p.mouse.move(lienzo.x + b.x, lienzo.y + b.y, { steps: 8 });
  await p.mouse.up();
  await p.keyboard.up('Shift');
  await paso('Vuelve a la flecha');
  await clicEnFoco();
  await paso('Una moneda');
  await clicEnFoco();
  await paso('Llámala Moneda');
  await escribirNombre('Moneda');
  await paso('Que se pueda atravesar');
  await clicEnFoco();
  await paso('Colócala');
  const m = await estado(p, () => window.chispa.estado.escena.objetos.find((o) => o.nombre === 'Moneda'));
  const j = await estado(p, () => window.chispa.estado.escena.objetos.find((o) => o.nombre === 'Jugador'));
  const desde = await pantalla(m.x, m.y);
  const hasta = await pantalla(j.x + 176, 128);
  await p.mouse.move(lienzo.x + desde.x, lienzo.y + desde.y);
  await p.mouse.down();
  await p.mouse.move(lienzo.x + hasta.x, lienzo.y + hasta.y, { steps: 8 });
  await p.mouse.up();
  await paso('Ahora, el código');
  await clicEnFoco();
  await paso('Su script');
  await clicEnFoco();
  await paso('Escribe el código');
  await p.click('.tutorial-hazlo');
  await paso('Vuelve a la escena');
  await clicEnFoco();
  await paso('Un marcador');
  await clicEnFoco();
  await paso('Enséñale los puntos');
  await centroDelFoco();
  await p.selectOption('.menu-datos', '{juego.puntos}');
  await paso('¡A jugar!');
  await clicEnFoco();
  await paso('Coge la moneda');
  await p.waitForTimeout(300);
  await clicEnFoco(); // clic en el juego para que reciba las teclas
  await p.keyboard.down('ArrowRight');
  await p.waitForTimeout(900);
  await p.keyboard.up('ArrowRight');
  await paso('¡Lo has hecho!');
  const puntos = await estado(p, () => window.chispa.vistaJuego.datoDelJuego('puntos'));
  comprobar(puntos === 1, 'los puntos no han subido: ' + puntos);
  await p.click('.tutorial-siguiente');
  await p.waitForFunction(() => !document.querySelector('.tutorial-burbuja'));
  // Al recargar, ya no se ofrece otra vez; se puede abrir desde Ayuda
  await p.goto(direccion);
  await p.waitForFunction(() => window.chispa);
  await p.waitForTimeout(300);
  comprobar(!(await p.$('.dialogo:has-text("¿Hacemos tu primer juego?")')), 'el tutorial se ofrece otra vez');
  await p.click('button:has-text("Ayuda")');
  await p.click('.dialogo button:has-text("Tutorial: tu primer juego")');
  await p.click('.dialogo button:has-text("Empezar el tutorial")');
  await paso('Tu primer juego');
});

await prueba('con la vista alejada, arrastrar un objeto pequeño lo mueve (no lo deforma)', async (p) => {
  const lienzo = await p.locator('.lienzo-escena').boundingBox();
  await p.mouse.move(lienzo.x + lienzo.width / 2, lienzo.y + lienzo.height / 2);
  for (let i = 0; i < 3; i++) await p.mouse.wheel(0, 300);
  await p.waitForTimeout(200);
  await estado(p, () => window.chispa.estado.crearObjeto('circulo', 700, 300));
  const antes = await estado(p, () => window.chispa.estado.seleccionado);
  const desde = await estado(p, ([x, y]) => window.chispa.vistaEscena.camara.aPantalla(x, y), [antes.x, antes.y]);
  await p.mouse.move(lienzo.x + desde.x, lienzo.y + desde.y);
  await p.mouse.down();
  await p.mouse.move(lienzo.x + desde.x + 40, lienzo.y + desde.y - 40, { steps: 6 });
  await p.mouse.up();
  const despues = await estado(p, () => window.chispa.estado.seleccionado);
  comprobar(despues.sprite.ancho === 64 && despues.sprite.alto === 64, 'se ha deformado: ' + JSON.stringify(despues.sprite));
  comprobar(despues.x > antes.x && despues.y > antes.y, 'no se ha movido');
});

await prueba('los comandos nuevos se dibujan en el juego de verdad (animar, fundido, dibujar, voltear)', async (p) => {
  const codigo = 'cuando empieza:\n    animar(yo.tamano, 2, 0.3, "rebote")\n    animar(yo.color, "rojo", 0.3)\n    yo.voltearVertical = verdadero\n    pantalla.oscurecer(0.2, "azul")\ncuando cada fotograma:\n    dibujar.linea(0, 0, yo.x, yo.y, "amarillo")\n    dibujar.circulo(yo.x, yo.y, 80)\n    dibujar.rectangulo(yo.x, yo.y, 100, 100, "verde")\n    dibujar.texto("hola", yo.x, yo.y + 60)\n';
  await estado(p, (c) => window.chispa.estado.cambiarCodigo('cuadrado.chs', c), codigo);
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(700);
  const r = await estado(p, () => {
    const j = window.chispa.vistaJuego.juego;
    const o = j.escena.objetos.find((x) => x.nombre === 'Cuadrado');
    return { alfa: j.escena.fundido.alfa, escala: o.transformacion.escala.x, color: o.todosLosComponentes.find((c) => 'voltearY' in c).color };
  });
  comprobar(r.alfa === 1 && r.escala === 2 && r.color === 'rojo', 'no ha hecho lo que se pedía: ' + JSON.stringify(r));
});

await prueba('los errores se subrayan mientras escribes y bloquean Ejecutar', async (p) => {
  await p.click('.nodo.hijo');
  await p.click('.cm-content');
  await p.keyboard.press('Control+a');
  await p.keyboard.type('cuando empieza:\nmostar("hola")', { delay: 5 });
  await p.waitForSelector('.cm-lintRange-error', { timeout: 3000 });
  await p.waitForTimeout(700);
  comprobar((await textoDe(p, '.lista-problemas')).includes('mostrar'), 'Problemas no sugiere "mostrar"');
  comprobar(await p.$('.controles-juego .ejecutar.bloqueado'), 'Ejecutar no se ha bloqueado');
  await p.keyboard.press('F5');
  await p.waitForTimeout(300);
  comprobar((await textoDe(p, '.consola-editor')).includes('No se puede ejecutar'), 'la consola no explica por qué no ejecuta');
});

await prueba('copiar código de un ejemplo, con o sin los espacios del principio, da la misma sangría', async (p) => {
  const esperado = 'cuando empieza:\n    juego.puntos = 0\n\ncuando toco Moneda:\n    destruir(otro)\n    juego.puntos += 1';
  for (const conEspacios of [true, false]) {
    const archivo = await estado(p, (n) => window.chispa.estado.crearScriptSuelto(n), conEspacios ? 'con' : 'sin');
    await p.waitForTimeout(150);
    await p.click('.zona-codigo .cm-editor:not([style*="none"]) .cm-content');
    await p.keyboard.press('Control+a');
    await p.keyboard.press('Delete');
    for (const linea of esperado.split('\n')) {
      await p.keyboard.type(conEspacios ? linea : linea.trimStart(), { delay: 3 });
      await p.keyboard.press('Enter');
    }
    const codigo = await estado(p, (a) => window.chispa.estado.proyecto.scripts[a], archivo);
    const limpio = codigo.split('\n').map((l) => l.trimEnd()).join('\n').trim();
    comprobar(limpio === esperado, `${conEspacios ? 'con' : 'sin'} espacios sale mal:\n` + codigo);
  }
});

await prueba('la sangría se pone sola al pulsar Intro', async (p) => {
  await estado(p, () => window.chispa.estado.crearScriptSuelto('sangria'));
  await p.click('.cm-content');
  await p.keyboard.press('Control+a');
  await p.keyboard.type('cuando empieza:\nsi verdadero:\nmostrar(1)\nsino:\nmostrar(2)', { delay: 5 });
  const codigo = await estado(p, () => window.chispa.estado.proyecto.scripts['sangria.chs']);
  comprobar(codigo === 'cuando empieza:\n    si verdadero:\n        mostrar(1)\n    sino:\n        mostrar(2)', 'sangría incorrecta: ' + JSON.stringify(codigo));
});

await prueba('añadir objetos, arrastrarlos y deshacer', async (p) => {
  const lienzo = await p.locator('.lienzo-escena').boundingBox();
  const x = lienzo.x + lienzo.width / 2;
  const y = lienzo.y + lienzo.height / 2;
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x + 80, y - 60, { steps: 6 });
  await p.mouse.up();
  const movido = await estado(p, () => window.chispa.estado.escena.objetos[0]);
  comprobar(movido.x !== 480 || movido.y !== 270, 'el objeto no se ha movido');
  await p.keyboard.press('Control+z');
  const vuelto = await estado(p, () => window.chispa.estado.escena.objetos[0]);
  comprobar(vuelto.x === 480 && vuelto.y === 270, 'deshacer no lo ha devuelto a su sitio');
  await p.click('.boton-anadir');
  await p.click('.opcion-menu:has-text("Texto")');
  // Copiar, crear otra escena y pegar (con el botón Pegar)
  await p.keyboard.press('Control+c');
  await p.click('.selector-escena .boton-icono');
  await p.fill('.dialogo input', 'Nivel2');
  await p.press('.dialogo input', 'Enter');
  comprobar((await textoDe(p, '.pestana.activa')).includes('Nivel2'), 'la pestaña no dice el nombre de la escena nueva');
  await p.click('button:has-text("Pegar")');
  comprobar((await estado(p, () => window.chispa.estado.escena.objetos.map((o) => o.nombre))).join() === 'Texto', 'no se ha pegado el texto en Nivel2');
  comprobar((await estado(p, () => window.chispa.estado.seleccionado.sprite.fijo)) === true, 'el texto nuevo no es de interfaz');
});

await prueba('pintar casillas (arrastrando y con Mayús) en un mapa', async (p) => {
  await p.click('.boton-anadir');
  await p.click('.opcion-menu:has-text("Mapa")');
  const lienzo = await p.locator('.lienzo-escena').boundingBox();
  const a = await estado(p, () => {
    const c = window.chispa.vistaEscena.camara;
    return [c.aPantalla(10, 20), c.aPantalla(300, 20), c.aPantalla(10, 200), c.aPantalla(200, 300)];
  });
  await p.mouse.move(lienzo.x + a[0].x, lienzo.y + a[0].y);
  await p.mouse.down();
  await p.mouse.move(lienzo.x + a[1].x, lienzo.y + a[1].y, { steps: 20 });
  await p.mouse.up();
  const pintadas = await estado(p, () => Object.keys(window.chispa.estado.seleccionado.mapa.celdas).length);
  comprobar(pintadas >= 6, `solo se han pintado ${pintadas} casillas`);
  await p.keyboard.down('Shift');
  await p.mouse.move(lienzo.x + a[2].x, lienzo.y + a[2].y);
  await p.mouse.down();
  await p.mouse.move(lienzo.x + a[3].x, lienzo.y + a[3].y, { steps: 5 });
  await p.mouse.up();
  await p.keyboard.up('Shift');
  const despues = await estado(p, () => Object.keys(window.chispa.estado.seleccionado.mapa.celdas).length);
  comprobar(despues >= pintadas + 12, 'Mayús + arrastrar no ha pintado un rectángulo');
});

await prueba('un sonido importado se carga y suena de verdad', async (p) => {
  await estado(p, () => {
    const n = 4000, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin((i / 8000) * 2 * Math.PI * 440) * 8000, true);
    let bin = '';
    new Uint8Array(buf).forEach((x) => (bin += String.fromCharCode(x)));
    const e = window.chispa.estado;
    e.agregarSonido('pitido.wav', 'data:audio/wav;base64,' + btoa(bin));
    e.cambiarCodigo('cuadrado.chs', 'cuando empieza:\n    sonido.reproducir("pitido")\n    musica.reproducir("pitido")\n');
  });
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  const audio = await estado(p, () => {
    const s = window.chispa.vistaJuego.motor.sonido;
    return [s.tieneSonido('pitido'), s.musicaActual];
  });
  comprobar(audio[0] === true && audio[1] === 'pitido', 'el sonido no se ha decodificado: ' + JSON.stringify(audio));
});

/** Saca un archivo de un .zip sin comprimir (como los que hace Chispa para itch.io). */
function sacarDelZip(zip, nombreBuscado) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  for (let i = 0; i + 30 <= zip.length && v.getUint32(i, true) === 0x04034b50; ) {
    const tamano = v.getUint32(i + 18, true);
    const largo = v.getUint16(i + 26, true);
    const nombre = new TextDecoder().decode(zip.subarray(i + 30, i + 30 + largo));
    const datos = zip.subarray(i + 30 + largo, i + 30 + largo + tamano);
    if (nombre === nombreBuscado) return new TextDecoder().decode(datos);
    i += 30 + largo + tamano;
  }
  return null;
}

await prueba('publicar: el zip de itch.io y el index.html de GitHub Pages, con sus pasos', async (p) => {
  await p.click('button:has-text("Exportar")');
  const [zip] = await Promise.all([p.waitForEvent('download'), p.click('.destino-itch')]);
  comprobar(/-itch\.zip$/.test(zip.suggestedFilename()), 'el zip no se llama bien: ' + zip.suggestedFilename());
  const rutaZip = join(carpeta, zip.suggestedFilename());
  await zip.saveAs(rutaZip);
  const index = sacarDelZip(readFileSync(rutaZip), 'index.html');
  comprobar(index?.includes('proyecto-chispa'), 'el zip no lleva un index.html con el juego');
  const pasos = await textoDe(p, '.pasos-publicar');
  comprobar(pasos.includes('Kind of project') && pasos.includes('960') && pasos.includes('played in the browser'), 'faltan pasos de itch.io');
  comprobar(await p.$('.botones-publicar a[href="https://itch.io/game/new"]'), 'no hay enlace a itch.io');
  await p.click('button:has-text("Otras opciones")');
  const [html] = await Promise.all([p.waitForEvent('download'), p.click('.destino-github')]);
  comprobar(html.suggestedFilename() === 'index.html', 'para GitHub Pages tiene que llamarse index.html');
  comprobar((await textoDe(p, '.pasos-publicar')).includes('Settings'), 'faltan pasos de GitHub Pages');
});

await prueba('exportar el juego y que funcione solo, sin el editor', async (p) => {
  await p.click('button:has-text("Exportar")');
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('.destino-archivo')]);
  const archivo = join(carpeta, descarga.suggestedFilename());
  await descarga.saveAs(archivo);
  comprobar(readFileSync(archivo, 'utf8').includes('proyecto-chispa'), 'la página no lleva el proyecto dentro');
  const juego = await contexto.newPage();
  const mensajes = [];
  juego.on('console', (m) => mensajes.push(m.text()));
  juego.on('pageerror', (e) => mensajes.push('ERROR ' + e.message));
  await juego.goto(pathToFileURL(archivo).href);
  await juego.waitForTimeout(800);
  const panel = await juego.$eval('#panel-error', (el) => el.hidden);
  await juego.close();
  comprobar(panel, 'el juego exportado enseña un error');
  comprobar(mensajes.some((m) => m.includes('¡Hola!')), 'el juego exportado no ha arrancado: ' + mensajes.join(' | '));
});

await prueba('rendimiento: 500 objetos en la escena', async (p) => {
  await estado(p, () => {
    const e = window.chispa.estado;
    e.empezarCambioLargo();
    // Un suelo y 500 objetos CON FÍSICA que caen y se amontonan (lo más costoso para el motor)
    e.crearObjeto('mapa', 0, 0);
    e.pintarRectangulo(e.seleccion, 0, 0, 19, 0, 'suelo');
    for (let i = 0; i < 500; i++) {
      e.crearObjeto(i % 2 ? 'circulo' : 'rectangulo', 40 + (i % 25) * 36, 100 + Math.floor(i / 25) * 36);
      e.activarComponente(e.seleccion, 'fisica', true);
      e.cambiarPropiedad(e.seleccion, 'sprite.ancho', 20);
      e.cambiarPropiedad(e.seleccion, 'sprite.alto', 20);
    }
    e.terminarCambioLargo();
  });
  // Arrastrar un objeto con 500 en la escena: cuánto tarda cada fotograma
  const lienzo = await p.locator('.lienzo-escena').boundingBox();
  const inicio = await estado(p, () => window.chispa.vistaEscena.camara.aPantalla(40, 100));
  const medida = await estado(p, () => {
    window.__tiempos = [];
    let anterior = performance.now();
    const medir = (t) => {
      window.__tiempos.push(t - anterior);
      anterior = t;
      if (window.__tiempos.length < 200) requestAnimationFrame(medir);
    };
    requestAnimationFrame(medir);
  });
  void medida;
  await p.mouse.move(lienzo.x + inicio.x, lienzo.y + inicio.y);
  await p.mouse.down();
  for (let i = 0; i < 40; i++) await p.mouse.move(lienzo.x + inicio.x + i * 5, lienzo.y + inicio.y - i * 3);
  await p.mouse.up();
  await p.waitForTimeout(500);
  const fps = await estado(p, () => {
    const t = window.__tiempos.slice(5);
    return 1000 / (t.reduce((a, b) => a + b, 0) / t.length);
  });
  console.log(`      (editor con 500 objetos, arrastrando: ${fps.toFixed(0)} fotogramas por segundo)`);
  comprobar(fps > 30, `el editor va a ${fps.toFixed(0)} fotogramas por segundo`);
  // Y el juego con esos 500 objetos
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(3000);
  const juego = await estado(p, () => window.chispa.vistaJuego.motor.tiempo.fps);
  console.log(`      (juego con 500 objetos con física amontonados: ${juego} fotogramas por segundo)`);
  comprobar(juego > 30, `el juego va a ${juego} fotogramas por segundo`);
});

await navegador.close();
await new Promise((r) => servidor.httpServer.close(r));
console.log(fallos ? `\n${fallos} prueba(s) han fallado.` : '\nTodas las pruebas del navegador han pasado.');
process.exit(fallos ? 1 : 0);
