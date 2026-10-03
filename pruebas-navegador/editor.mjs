/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PRUEBAS EN UN NAVEGADOR DE VERDAD: npm run pruebas:navegador
 *
 * Los tests normales (npm run pruebas) no tienen pantalla. Estos abren el
 * editor compilado en Chromium y lo usan como una persona: ejecutar el juego,
 * escribir código con errores, pintar un mapa, exportar el juego y abrirlo...
 *
 * La primera vez hay que descargar el navegador: npx playwright install chromium
 * (Si ya tienes un Chromium, puedes indicarlo con la variable CHROMIUM=ruta.)
 *
 * Con RUTA_BASE=/chispa/ el editor se sirve en esa carpeta, igual que en
 * GitHub Pages (chispa-motor.github.io/chispa/): así se comprueba que todo
 * funciona también desde allí. El workflow de GitHub lo hace así.
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const carpeta = mkdtempSync(join(tmpdir(), 'chispa-'));
const RUTA_BASE = process.env.RUTA_BASE ?? '/';
// En GitHub Actions (CI) los ordenadores son compartidos y van más lentos y a
// trompicones: los límites de rendimiento se relajan al doble. En tu ordenador, estrictos.
const HOLGURA = process.env.CI ? 2 : 1;
const servidor = await preview({ base: RUTA_BASE, preview: { port: 4321, strictPort: false }, logLevel: 'silent' });
const direccion = servidor.resolvedUrls.local[0];
const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 860 }, acceptDownloads: true });
await contexto.grantPermissions(['clipboard-read', 'clipboard-write']);

let fallos = 0;
async function prueba(nombre, fn) {
  // SOLO="texto" ejecuta solo las pruebas que lo llevan en el nombre (para repetir una que falla)
  if (process.env.SOLO && !nombre.includes(process.env.SOLO)) return;
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
    if (process.env.CAPTURA) await pagina.screenshot({ path: process.env.CAPTURA }).catch(() => {});
  } finally {
    await pagina.close();
  }
}
function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}
const estado = (p, fn, arg) => p.evaluate(fn, arg);
const textoDe = (p, selector) => p.$eval(selector, (el) => el.innerText);

console.log(`Pruebas en el navegador (en ${direccion}):`);

await prueba('todo se carga desde la carpeta del editor (como en GitHub Pages), sin pedir nada fuera', async () => {
  const p = await contexto.newPage();
  const pedidas = [];
  p.on('request', (r) => pedidas.push(r.url()));
  const errores = [];
  p.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await p.goto(direccion + '?limpio');
  await p.waitForFunction(() => window.chispa);
  // Abrir cosas que cargan partes del editor más tarde (código, ayuda)
  await p.evaluate(() => window.chispa.estado.abrirScript(Object.keys(window.chispa.estado.proyecto.scripts)[0]));
  await p.click('button:has-text("Ayuda")');
  await p.waitForSelector('.dialogo');
  const base = new URL(direccion);
  const fuera = pedidas.filter((u) => !u.startsWith('data:') && !u.startsWith('blob:') && (new URL(u).origin !== base.origin || !new URL(u).pathname.startsWith(base.pathname)));
  await p.close();
  comprobar(fuera.length === 0, 'se ha pedido algo fuera de la carpeta del editor: ' + fuera.join(', '));
  comprobar(errores.length === 0, 'errores en la página: ' + errores.join(' | '));
  comprobar(pedidas.some((u) => /\/assets\/.+\.css/.test(u)), 'no se han cargado los estilos');
});

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

await prueba('la primera vez ofrece el tutorial, y el tutorial se hace entero haciendo clic donde señala', async () => {
  // Primera visita de verdad: un navegador sin nada guardado (ni proyectos de otras pruebas ni la marca del tutorial)
  const limpio = await navegador.newContext({ viewport: { width: 1440, height: 860 } });
  const p = await limpio.newPage();
  const erroresLimpio = [];
  p.on('pageerror', (e) => erroresLimpio.push(e.message));
  try {
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
  comprobar(!erroresLimpio.length, 'Errores en la página: ' + erroresLimpio.join(' | '));
  } finally {
    await limpio.close();
  }
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

await prueba('día 2: los filtros de pantalla, el flash y las transiciones se ven de verdad', async (p) => {
  // Un cuadrado rojo que llena el centro de la pantalla
  await estado(p, () => {
    const e = window.chispa.estado;
    const cuadrado = { tipo: 'escena', escena: 'Principal', indice: 0 };
    e.cambiarPropiedad(cuadrado, 'sprite.color', '#ff0000');
    e.cambiarPropiedad(cuadrado, 'sprite.ancho', 400);
    e.cambiarPropiedad(cuadrado, 'sprite.alto', 300);
    e.cambiarCodigo('cuadrado.chs', 'cuando empieza:\n    yo.x = 480\n    yo.y = 270');
  });
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(300);
  /** El color del centro del juego (r, g, b), y si dos píxeles vecinos son iguales. */
  const centro = () => estado(p, () => {
    const c = document.querySelector('.lienzo-juego');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;
    return [d[0], d[1], d[2]];
  });
  const orden = (codigo) => estado(p, (c) => window.chispa.vistaJuego.juego.ejecutarOrden(c), codigo);
  let c = await centro();
  comprobar(c[0] > 200 && c[1] < 60, 'el centro no es rojo: ' + c);
  await orden('pantalla.grises = 1');
  await p.waitForTimeout(150);
  c = await centro();
  comprobar(Math.abs(c[0] - c[1]) < 8 && Math.abs(c[1] - c[2]) < 8, 'con grises el rojo no se ha vuelto gris: ' + c);
  await orden('pantalla.normal()');
  await orden('pantalla.flash("blanco", 2)');
  await p.waitForTimeout(100);
  c = await centro();
  comprobar(c[0] > 230 && c[1] > 180 && c[2] > 180, 'el flash no pone la pantalla blanca: ' + c);
  await p.waitForTimeout(2100);
  // Tele antigua y pixelado: se dibujan sin errores
  await orden('pantalla.crt = verdadero');
  await orden('pantalla.pixelado = 6');
  await orden('pantalla.bloom = 0.5');
  await orden('pantalla.aberracion = 4');
  await p.waitForTimeout(200);
  // Una transición en círculo: a mitad, el centro se ve y la esquina está tapada (negra)
  await estado(p, () => window.chispa.vistaJuego.juego.escena.fundir(0.6, 0, 'negro', 'circulo'));
  await orden('pantalla.normal()');
  await p.waitForTimeout(120);
  const esquina = await estado(p, () => {
    const cv = document.querySelector('.lienzo-juego');
    return [...cv.getContext('2d').getImageData(2, 2, 1, 1).data].slice(0, 3);
  });
  c = await centro();
  comprobar(esquina.every((v) => v < 10) && c[0] > 200, 'el círculo no tapa los bordes y deja ver el centro: ' + esquina + ' / ' + c);
});

await prueba('día 2: oscuridad, luces y sombras se ven de verdad', async (p) => {
  // Fondo claro y oscuridad casi total; una luz en el centro y un muro a su derecha que hace sombra
  await estado(p, () => {
    const e = window.chispa.estado;
    e.cambiarEscenaPropiedad('colorFondo', '#c8c8c8');
    e.cambiarEscenaPropiedad('oscuridad', 0.95);
    e.crearObjeto('vacio', 480, 270);
    e.renombrar(e.seleccion, 'Farol');
    e.cambiarPropiedad(e.seleccion, 'luz', { radio: 400, sombras: true });
    e.crearObjeto('rectangulo', 560, 270);
    e.cambiarPropiedad(e.seleccion, 'sprite.alto', 200);
    e.cambiarPropiedad(e.seleccion, 'sprite.ancho', 20);
  });
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(300);
  const brillo = (fx, fy) => estado(p, ([fx, fy]) => {
    const c = document.querySelector('.lienzo-juego');
    const d = c.getContext('2d').getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data;
    return d[0] + d[1] + d[2];
  }, [fx, fy]);
  const cerca = await brillo(0.5 - 60 / 960, 0.5);
  const lejos = await brillo(0.03, 0.05);
  const detras = await brillo(0.5 + 140 / 960, 0.5);
  comprobar(cerca > 300, `junto a la luz no se ve: ${cerca}`);
  comprobar(lejos < 60, `lejos de la luz no está oscuro: ${lejos}`);
  comprobar(detras < cerca / 3, `detrás del muro no hay sombra: ${detras} (junto a la luz: ${cerca})`);
});

await prueba('día 2: pantalla dividida, cuerda y letra pixel se ven de verdad', async (p) => {
  await estado(p, () => {
    const e = window.chispa.estado;
    e.cambiarEscenaPropiedad('colorFondo', '#204060');
    // El cuadrado de siempre (rojo) y otro verde muy lejos: cada uno en su mitad de la pantalla
    e.cambiarCodigo('cuadrado.chs', 'cuando empieza:\n    yo.color = "#ff0000"\n    pantalla.dividir(2)\n    escena.camara.seguir(yo)\n    escena.camaraDe(2).seguir(buscar("Lejos"))\n    junta.cuerda(buscar("Bola"), buscar("Lejos"), 60, "amarillo")\n');
    e.crearObjeto('rectangulo', 3000, 2000);
    e.renombrar(e.seleccion, 'Lejos');
    e.cambiarPropiedad(e.seleccion, 'sprite.color', '#00ff00');
    e.crearObjeto('circulo', 3000, 1990);
    e.renombrar(e.seleccion, 'Bola');
    e.activarComponente(e.seleccion, 'fisica', true);
    e.crearObjeto('texto', 20, 520);
    e.cambiarPropiedad(e.seleccion, 'sprite.texto', 'PUNTOS: 120 ñ');
    e.cambiarPropiedad(e.seleccion, 'sprite.letra', 'pixel');
  });
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(1200);
  const color = (fx, fy) => estado(p, ([fx, fy]) => {
    const c = document.querySelector('.lienzo-juego');
    return [...c.getContext('2d').getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data].slice(0, 3);
  }, [fx, fy]);
  const izquierda = await color(0.25, 0.5);
  const derecha = await color(0.75 + 15 / 960, 0.5 - 15 / 540); // (en el centro justo acaba la cuerda)
  const raya = await color(0.5, 0.3);
  comprobar(izquierda[0] > 200 && izquierda[1] < 60, `en la mitad izquierda no está el cuadrado rojo: ${izquierda}`);
  comprobar(derecha[1] > 200 && derecha[0] < 60, `en la mitad derecha no está el cuadrado verde: ${derecha}`);
  comprobar(raya[0] + raya[1] + raya[2] < 100, `no hay raya entre las dos mitades: ${raya}`);
  // La bola cuelga de la cuerda, 60 píxeles por debajo del cuadrado verde (y no se ha caído del mundo)
  const bola = await estado(p, () => {
    const o = window.chispa.juego?.escena.buscar('Bola');
    return o ? [o.posicion.x, o.posicion.y] : null;
  });
  if (bola) comprobar(Math.abs(bola[1] - 1940) < 3 && Math.abs(bola[0] - 3000) < 3, `la bola no cuelga de la cuerda: ${bola}`);
  // La letra pixel no tiene grises: en la zona del texto, cada punto es de un color «entero»
  const tonos = await estado(p, () => {
    const c = document.querySelector('.lienzo-juego');
    const k = c.width / 960;
    const d = c.getContext('2d').getImageData(Math.floor(20 * k), Math.floor(8 * k), Math.floor(200 * k), Math.floor(26 * k)).data;
    const vistos = new Set();
    for (let i = 0; i < d.length; i += 4) vistos.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    return [...vistos];
  });
  comprobar(tonos.includes('255,255,255'), 'el texto con letra pixel no se ve');
  comprobar(tonos.length <= 4, `la letra pixel tiene bordes suaves (${tonos.length} tonos): ${tonos.slice(0, 8).join(' · ')}`);
});

await prueba('día 3: hacer un sonido y una canción en el editor, y usarlos en el juego', async (p) => {
  await p.click('.pestana-panel:has-text("Proyecto")');
  // El generador de efectos: un botón da un sonido, se ve su forma y se guarda
  await p.click('button[title^="Hacer un efecto de sonido"]');
  await p.waitForSelector('.editor-sonidos');
  await p.click('.botones-sonido [data-tipo="explosion"]');
  comprobar(await p.inputValue('[data-ruta="sonido.onda"]') === 'ruido', 'el botón Explosión no da un sonido de ruido');
  const pintado = await estado(p, () => {
    const c = document.querySelector('.lienzo-sonido');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let amarillos = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 150 && d[i + 2] < 100) amarillos++;
    return amarillos;
  });
  comprobar(pintado > 300, `no se ve la forma del sonido (${pintado} puntos)`);
  await p.click('.botones-sonido [data-accion="variar"]');
  await p.fill('[data-ruta="sonido.nombre"]', 'bum');
  await p.click('.dialogo .boton.principal:has-text("Guardar")');
  await p.waitForFunction(() => 'bum' in (window.chispa.estado.proyecto.sonidosHechos ?? {}));
  // El editor de música: el ejemplo, una nota más con un clic, otra pista, y se guarda
  await p.click('button[title^="Nueva canción"]');
  await p.waitForSelector('.editor-musica');
  await p.click('.editor-musica [data-accion="ejemplo"]');
  const antes = await estado(p, () => document.querySelectorAll('.pista-musica').length);
  comprobar(antes === 3, `el ejemplo debería tener 3 pistas, y tiene ${antes}`);
  const rejilla = await p.locator('.rejilla-musica').boundingBox();
  await p.mouse.click(rejilla.x + 22 * 14 + 11, rejilla.y + 9);
  await p.click('.editor-musica [data-accion="nueva-pista"]');
  comprobar((await estado(p, () => document.querySelectorAll('.pista-musica').length)) === 4, 'no se ha añadido la pista');
  await p.click('.editor-musica [data-accion="tocar"]');
  await p.waitForTimeout(400);
  comprobar(await estado(p, () => getComputedStyle(document.querySelector('.raya-musica')).display !== 'none'), 'al escuchar la canción no avanza la raya');
  await p.click('.editor-musica [data-accion="tocar"]');
  await p.fill('[data-ruta="cancion.nombre"]', 'aventura');
  await p.click('.dialogo .boton.principal:has-text("Guardar")');
  await p.waitForFunction(() => 'aventura' in (window.chispa.estado.proyecto.canciones ?? {}));
  const cancion = await estado(p, () => window.chispa.estado.proyecto.canciones.aventura);
  comprobar(cancion.pistas.length === 4 && cancion.pistas[0].notas.length === 13, `la canción guardada no es la del editor: ${cancion.pistas.length} pistas, ${cancion.pistas[0].notas.length} notas`);
  comprobar((await textoDe(p, '.panel-izquierdo')).includes('bum') && (await textoDe(p, '.panel-izquierdo')).includes('aventura'), 'el sonido y la canción no salen en el panel del proyecto');
  // En el juego: suenan (de verdad: el navegador tiene audio) y la música tiene sus capas
  await estado(p, () => window.chispa.estado.cambiarCodigo('cuadrado.chs', 'cuando empieza:\n    sonido.reproducir("bum")\n    sonido.bucleEn("bum", yo, 500)\n    musica.intensidad = 0.5\n    musica.reproducir("aventura")\n    musica.tono = 1.1\n    mostrar("suena " + musica.actual)\n'));
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(500);
  comprobar((await textoDe(p, '.consola-editor')).includes('suena aventura'), 'la música no ha empezado');
  comprobar(!(await p.$('.consola-editor .mensaje.error')), 'errores en la consola: ' + (await textoDe(p, '.consola-editor')).slice(-300));
});

await prueba('día 4: controles de interfaz puestos desde el menú Añadir, usados con el ratón y el teclado de verdad', async (p) => {
  await p.click('.boton-anadir');
  await p.click('[data-control="casilla"]');
  await p.click('.boton-anadir');
  await p.click('[data-control="deslizador"]');
  await p.click('.boton-anadir');
  await p.click('[data-control="campo"]');
  comprobar((await textoDe(p, '.inspector, .panel-derecho')).includes('Control: Campo de texto'), 'el inspector no enseña la sección del control');
  // Cada uno en su sitio y con su script (lo que hace quien juega llega a «cuando cambia»)
  await estado(p, () => {
    const e = window.chispa.estado;
    const sitios = { Casilla: [200, 400], Deslizador: [200, 300], Campo: [200, 200] };
    e.escena.objetos.forEach((o, i) => {
      if (!sitios[o.nombre]) return;
      e.seleccionarIndice(i);
      e.cambiarPropiedad(e.seleccion, 'x', sitios[o.nombre][0]);
      e.cambiarPropiedad(e.seleccion, 'y', sitios[o.nombre][1]);
      const archivo = e.crearScriptPara(e.seleccion);
      e.cambiarCodigo(archivo, 'cuando cambia:\n    mostrar(yo.nombre + "=" + yo.valor)\n');
    });
  });
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(300);
  const caja = await p.locator('.lienzo-juego').boundingBox();
  // Del juego (960×540, la Y hacia arriba) a la página
  const sitio = (x, y) => ({ x: caja.x + (x / 960) * caja.width, y: caja.y + ((540 - y) / 540) * caja.height });
  const clic = async (x, y) => p.mouse.click(sitio(x, y).x, sitio(x, y).y);
  await clic(105, 400); // el cuadradito de la casilla (a la izquierda del todo)
  await p.waitForTimeout(100);
  // El deslizador: se coge por el medio y se arrastra a la derecha del todo
  await p.mouse.move(sitio(200, 300).x, sitio(200, 300).y);
  await p.mouse.down();
  await p.mouse.move(sitio(400, 300).x, sitio(400, 300).y, { steps: 4 });
  await p.mouse.up();
  await p.waitForTimeout(100);
  // El campo: clic y a escribir (con eñe y mayúsculas); la «a» no es una orden mientras se escribe
  await clic(200, 200);
  await p.waitForTimeout(100);
  // La Ñ no está en el teclado «de mentira» de la prueba: se manda su tecla a mano (en un teclado de verdad llega igual)
  await estado(p, () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Ñ', code: 'Semicolon', bubbles: true })));
  await p.keyboard.type('u 7', { delay: 50 });
  await p.waitForTimeout(80);
  await p.keyboard.press('Backspace');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  const consola = await textoDe(p, '.consola-editor');
  comprobar(consola.includes('Casilla=verdadero'), 'la casilla no se ha marcado: ' + consola.slice(-200));
  comprobar(consola.includes('Deslizador=100'), 'el deslizador no ha llegado al final: ' + consola.slice(-200));
  const campos = consola.split('\n').filter((l) => l.includes('Campo=')).map((l) => l.slice(l.indexOf('Campo=') + 6).trim());
  comprobar(campos.includes('Ñu 7') && campos[campos.length - 1] === 'Ñu', 'lo escrito en el campo no es lo tecleado: ' + JSON.stringify(campos));
  comprobar(!(await p.$('.consola-editor .mensaje.error')), 'errores en la consola: ' + consola.slice(-300));
});

await prueba('día 4: «Pantallas listas» añade menú, opciones, puntuaciones, fin y pausa, y se juegan', async (p) => {
  await p.click('.selector-escena button[title^="Pantallas listas"]');
  await p.waitForSelector('.pantallas-listas');
  comprobar((await p.$$('.fila-pantalla input:checked')).length === 6, 'no salen las 6 pantallas marcadas');
  await p.click('.dialogo .boton.principal:has-text("Añadir")');
  await p.waitForFunction(() => Object.keys(window.chispa.estado.proyecto.escenas).length === 6);
  const proyecto = await estado(p, () => ({ escenas: Object.keys(window.chispa.estado.proyecto.escenas), inicial: window.chispa.estado.proyecto.escenaInicial }));
  comprobar(proyecto.inicial === 'Menu' && proyecto.escenas.join() === 'Principal,Menu,Opciones,Creditos,Records,Fin', 'escenas: ' + JSON.stringify(proyecto));
  // La segunda vez, las que ya están salen sin marcar (solo la pausa, que no es una escena)
  await p.click('.selector-escena button[title^="Pantallas listas"]');
  comprobar((await p.$$('.fila-pantalla input:checked')).length === 1, 'las pantallas que ya están no deberían salir marcadas');
  await p.click('.dialogo .boton:has-text("Cancelar")');
  // A jugar: el menú, con el teclado, hasta Opciones y vuelta; luego al juego y pausa
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.includes('escena Menu'));
  await p.waitForTimeout(400);
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(60);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.includes('escena Opciones'), null, { timeout: 5000 });
  await p.waitForTimeout(500);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.includes('escena Menu'), null, { timeout: 5000 });
  await p.waitForTimeout(500);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.includes('escena Principal'), null, { timeout: 5000 });
  await p.waitForTimeout(500);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  // La ventana de pausa, en el centro de la pantalla: su barra de título es azul
  const azul = await estado(p, () => {
    const c = document.querySelector('.lienzo-juego');
    const d = c.getContext('2d').getImageData(Math.floor(c.width * 0.5), Math.floor(c.height * (0.5 - 115 / 540)), 1, 1).data;
    return d[2] > 200 && d[0] < 120;
  });
  comprobar(azul, 'al pulsar Escape en el juego no sale la ventana de pausa');
  comprobar(!(await p.$('.consola-editor .mensaje.error')), 'errores en la consola: ' + (await textoDe(p, '.consola-editor')).slice(-300));
});

await prueba('depurar: clic en el número de línea, el juego se para, se ven las variables y se va paso a paso', async (p) => {
  const codigo = 'variable vueltas = 0\ncuando cada fotograma:\n    vueltas += 1\n    variable doble = vueltas * 2\n    yo.x += 1\n';
  await estado(p, (c) => {
    window.chispa.estado.cambiarCodigo('cuadrado.chs', c);
    window.chispa.estado.abrirScript('cuadrado.chs');
  }, codigo);
  await p.waitForTimeout(200);
  const numero = (n) => p.locator('.zona-codigo .caja-script:not([style*="none"]) .cm-editor .cm-lineNumbers .cm-gutterElement', { hasText: new RegExp('^' + n + '$') });
  await numero(4).click();
  await p.waitForSelector('.cm-gutter-puntos .cm-gutterElement:not([style*="hidden"]) .punto-parada');
  await p.keyboard.press('F5');
  await p.waitForSelector('.estado-depuracion.parado', { timeout: 5000 });
  const variables = async () => estado(p, () => Object.fromEntries([...document.querySelectorAll('.variables-depuracion tr')].map((tr) => [tr.children[0].textContent, tr.children[1].textContent])));
  let v = await variables();
  comprobar(v.vueltas === '1' && v.doble === undefined, 'variables al parar en la línea 4: ' + JSON.stringify(v));
  comprobar(await p.$('.cm-linea-parada'), 'no se resalta la línea donde está parado');
  comprobar((await textoDe(p, '.estado-juego')).startsWith('En pausa'), 'el juego no se ha puesto en pausa');
  await p.keyboard.press('F10');
  await p.waitForFunction(() => document.querySelector('.estado-depuracion')?.textContent.includes('línea 5'));
  v = await variables();
  comprobar(v.doble === '2', 'después de un paso, doble debería valer 2: ' + JSON.stringify(v));
  await p.keyboard.press('F8');
  await p.waitForFunction(() => document.querySelector('.estado-depuracion')?.textContent.includes('línea 4'));
  v = await variables();
  comprobar(v.vueltas === '2', 'al continuar, debería parar otra vez en la 4 con vueltas = 2: ' + JSON.stringify(v));
  // Quitar el punto y continuar: el juego sigue sin pararse
  await numero(4).click();
  await p.click('.botones-depuracion button:has-text("Continuar")');
  await p.waitForTimeout(400);
  comprobar((await textoDe(p, '.estado-juego')).startsWith('Jugando'), 'al quitar el punto y continuar, el juego tendría que seguir');
  comprobar(!(await p.$('.cm-linea-parada')), 'sigue resaltada la línea');
});

await prueba('recursos: dibujar un sprite de dos fotogramas, soltar un sonido encima y borrar avisando de dónde se usa', async (p) => {
  await p.click('.pestana-panel:has-text("Proyecto")');
  await p.click('.grupo-proyecto:has(summary:has-text("Imágenes")) button[title^="Dibujar"]');
  await p.waitForSelector('.lienzo-pixel');
  const lienzo = await p.locator('.lienzo-pixel').boundingBox();
  const casilla = (x, y) => ({ x: lienzo.x + (x + 0.5) * (lienzo.width / 16), y: lienzo.y + (y + 0.5) * (lienzo.height / 16) });
  // Un trazo con el lápiz, de (2, 2) a (12, 2)
  let a = casilla(2, 2);
  const b = casilla(12, 2);
  await p.mouse.move(a.x, a.y);
  await p.mouse.down();
  await p.mouse.move(b.x, b.y, { steps: 4 });
  await p.mouse.up();
  // Segundo fotograma (copia) y un punto más
  await p.click('.botones-fotogramas button[title^="Nuevo fotograma: una copia"]');
  a = casilla(7, 9);
  await p.mouse.click(a.x, a.y);
  await p.fill('.columna-opciones input.campo', 'Bicho');
  await p.click('.dialogo button:has-text("Guardar")');
  const r = await estado(p, async () => {
    const pr = window.chispa.estado.proyecto;
    const carga = (url) => new Promise((ok) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); ok({ w: i.width, h: i.height, fila2: [...Array(16).keys()].filter((k) => x.getImageData(k, 2, 1, 1).data[3] > 0).length, punto: x.getImageData(7, 9, 1, 1).data[3] }); }; i.src = url; });
    return { anim: pr.animaciones.Bicho, f1: await carga(pr.imagenes.Bicho1), f2: await carga(pr.imagenes.Bicho2) };
  });
  comprobar(r.anim?.fotogramas.join() === 'Bicho1,Bicho2', 'no se ha creado la animación: ' + JSON.stringify(r.anim));
  comprobar(r.f1.w === 16 && r.f1.fila2 === 11 && r.f1.punto === 0, 'el primer fotograma no es el trazo dibujado: ' + JSON.stringify(r.f1));
  comprobar(r.f2.fila2 === 11 && r.f2.punto > 0, 'el segundo fotograma no tiene el trazo más el punto: ' + JSON.stringify(r.f2));
  // Soltar un archivo de sonido encima del editor
  await p.evaluate(() => {
    const dt = new DataTransfer();
    // Un WAV de verdad por dentro (RIFF....WAVE): los archivos disfrazados se rechazan
    dt.items.add(new File([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69])], 'Salto Alto.wav', { type: 'audio/wav' }));
    const raiz = document.getElementById('editor');
    raiz.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    raiz.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await p.waitForFunction(() => 'SaltoAlto' in window.chispa.estado.proyecto.sonidos);
  // Borrar una imagen usada: el aviso dice dónde se usa
  await p.hover('.imagen-recurso:has(span:text-is("Bicho1"))');
  await p.click('.imagen-recurso:has(span:text-is("Bicho1")) button[title^="Borrar"]');
  comprobar((await textoDe(p, '.dialogo')).includes('la animación «Bicho»'), 'el aviso de borrar no dice que la usa la animación');
  await p.click('.dialogo button:has-text("Cancelar")');
});

await prueba('«Datos del juego» en el inspector: se crean sin código y el juego empieza con ellos', async (p) => {
  await estado(p, () => window.chispa.estado.seleccionar(null));
  await p.click('[data-ruta="juego.nuevo"]');
  await p.fill('.dialogo input.campo', 'vidas');
  await p.click('.dialogo button:has-text("Aceptar")');
  await p.fill('.dialogo input.campo', '3');
  await p.click('.dialogo button:has-text("Aceptar")');
  await p.waitForSelector('[data-ruta="juego.vidas"]');
  const datos = await estado(p, () => window.chispa.estado.proyecto.datos);
  comprobar(datos?.vidas === 3, 'el dato no se ha guardado como número: ' + JSON.stringify(datos));
  comprobar((await p.getAttribute('.propiedad-propia code', 'title')) === 'En el código: juego.vidas', 'no explica cómo se usa en el código');
});

await prueba('órdenes en la consola mientras se juega: valores, cambios y errores', async (p) => {
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  const orden = async (t) => {
    await p.fill('.orden-consola', t);
    await p.press('.orden-consola', 'Enter');
    await p.waitForTimeout(100);
  };
  await orden('juego.prueba = 2 + 3');
  await orden('juego.prueba * 2');
  await orden('mostar(1)');
  const texto = await textoDe(p, '.consola-editor');
  comprobar(texto.includes('= 10'), 'no enseña el valor de la orden: ' + texto.slice(-200));
  comprobar(texto.includes('mostrar'), 'el error de la orden no sugiere mostrar');
  await p.press('.orden-consola', 'ArrowUp');
  comprobar((await p.inputValue('.orden-consola')) === 'mostar(1)', 'la flecha arriba no recupera la orden anterior');
});

await prueba('la Arena de Habilidades (el ejemplo grande) se abre, se juega y no da errores', async (p) => {
  const [elegir] = await Promise.all([p.waitForEvent('filechooser'), p.click('button[title^="Abrir un proyecto"]')]);
  await elegir.setFiles('proyectos/arena-de-habilidades/arena-de-habilidades.chispa.json');
  await p.waitForFunction(() => window.chispa.estado.proyecto.nombre === 'Arena de Habilidades');
  comprobar((await textoDe(p, '.lista-problemas')).includes('Ningún problema'), 'el proyecto tiene problemas');
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.locator('canvas.lienzo-juego').click();
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.includes('Arena'), null, { timeout: 5000 });
  for (let i = 0; i < 20; i++) {
    await p.keyboard.down('d');
    await p.keyboard.press(String((i % 4) + 1));
    await p.waitForTimeout(80);
    await p.keyboard.up('d');
  }
  comprobar(!(await p.$('.consola-editor .mensaje.error')), 'errores en la consola: ' + (await textoDe(p, '.consola-editor')).slice(-300));
});

await prueba('modo bloques: arrastrar bloques escribe el código, y avisa si el código no se puede pasar', async (p) => {
  const archivo = await estado(p, () => Object.keys(window.chispa.estado.proyecto.scripts)[0]);
  await estado(p, (a) => window.chispa.estado.abrirScript(a), archivo);
  await p.click('.modo-script .modo:has-text("Bloques")');
  await p.waitForSelector('.editor-bloques .bloque.tipo-evento');
  await p.click('.categoria-bloques:has-text("Control")');
  await p.dragAndDrop('.bloque-paleta:has-text("esperar")', '.bloque.tipo-evento .boca-bloque .lista-bloques');
  let codigo = await estado(p, (a) => window.chispa.estado.proyecto.scripts[a], archivo);
  comprobar(codigo.includes('    esperar(1)'), 'arrastrar «esperar» no ha escrito esperar(1) dentro del evento');
  // Cambiar un hueco cambia el código
  const hueco = p.locator('.bloque.tipo-accion input.campo-bloque').filter({ hasText: '' }).last();
  await hueco.fill('2');
  await hueco.press('Enter');
  await p.waitForTimeout(400);
  codigo = await estado(p, (a) => window.chispa.estado.proyecto.scripts[a], archivo);
  comprobar(/esperar\(2\)|mostrar\(2\)/.test(codigo), 'escribir en un hueco no cambia el código');
  // Borrar con la ✕
  const antes = await p.locator('.area-bloques .bloque').count();
  await p.hover('.area-bloques .bloque.tipo-accion .cabeza-bloque');
  await p.click('.area-bloques .bloque.tipo-accion .quitar-bloque');
  comprobar((await p.locator('.area-bloques .bloque').count()) === antes - 1, 'la ✕ no quita el bloque');
  // Volver al código, romperlo y pedir bloques: no se puede y lo explica
  await p.click('.modo-script .modo:has-text("Código")');
  await estado(p, (a) => window.chispa.estado.cambiarCodigo(a, 'cuando empieza:\n    mientas 1:\n        mostrar(1)\n'), archivo);
  await p.click('.modo-script .modo:has-text("Bloques")');
  await p.waitForSelector('.dialogo:has-text("No se puede pasar a bloques")');
  comprobar((await textoDe(p, '.dialogo')).includes('línea 2'), 'no dice en qué línea está el error');
  await p.click('.dialogo button:has-text("Entendido")');
});

await prueba('ajustes (tema claro, letra) se guardan; F1 enseña los atajos; Ctrl+B cambia a bloques', async (p) => {
  await p.keyboard.press('Control+,');
  await p.waitForSelector('.dialogo:has-text("Ajustes")');
  await p.click('.opcion-tema[data-tema="claro"]');
  await p.locator('input[data-ajuste="letraCodigo"]').fill('20');
  await p.click('.dialogo button:has-text("Cerrar")');
  comprobar((await p.evaluate(() => document.documentElement.dataset.tema)) === 'claro', 'no se pone el tema claro');
  await p.reload();
  await p.waitForFunction(() => window.chispa);
  comprobar((await p.evaluate(() => document.documentElement.dataset.tema)) === 'claro', 'el tema no se recuerda al volver');
  comprobar((await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tamano-codigo').trim())) === '20px', 'la letra del código no se recuerda');
  await p.keyboard.press('F1');
  await p.waitForSelector('.dialogo:has-text("Atajos de teclado")');
  comprobar((await textoDe(p, '.dialogo')).includes('Cambiar el script abierto entre código y bloques'), 'faltan atajos en la ventana');
  await p.click('.dialogo button:has-text("Cerrar")');
  const archivo = await estado(p, () => Object.keys(window.chispa.estado.proyecto.scripts)[0]);
  await estado(p, (a) => window.chispa.estado.abrirScript(a), archivo);
  await p.keyboard.press('Control+b');
  await p.waitForSelector('.editor-bloques .bloque');
  // Lo dejamos como estaba, para las demás pruebas
  await p.evaluate(() => localStorage.removeItem('chispa-ajustes'));
});

await prueba('si el navegador se cierra de golpe, el proyecto se recupera al volver', async () => {
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 860 } });
  const p = await ctx.newPage();
  await p.goto(direccion + '?limpio');
  await p.waitForFunction(() => window.chispa);
  await p.evaluate(() => window.chispa.estado.renombrarProyecto('Mi juego que no quiero perder'));
  await p.waitForTimeout(1800); // el guardado automático (un momento después del cambio)
  await p.close({ runBeforeUnload: false }); // sin avisar: como si se cerrara de golpe
  const q = await ctx.newPage();
  await q.goto(direccion);
  await q.waitForFunction(() => window.chispa?.estado.proyecto.nombre === 'Mi juego que no quiero perder', null, { timeout: 5000 });
  await q.waitForSelector('.notificacion:has-text("Recuperado «Mi juego que no quiero perder»")', { timeout: 3000 });
  await ctx.close();
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
    await p.click('.zona-codigo .caja-script:not([style*="none"]) .cm-content');
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

await prueba('día 1: formas, estilo con el selector de color, pluma, unir y la biblioteca', async (p) => {
  // Una estrella desde el menú «Más formas»
  await p.click('.boton-anadir');
  await p.click('[data-forma="estrella"]');
  comprobar((await estado(p, () => window.chispa.estado.seleccionado.sprite.forma)) === 'estrella', 'no se ha añadido la estrella');
  comprobar(await p.isVisible('[data-ruta="sprite.lados"]'), 'el inspector no enseña las puntas de la estrella');
  // El selector de color: una paleta lista cambia el color del objeto
  await p.click('.inspector .selector-color');
  await p.waitForSelector('.selector-color-ventana');
  await p.selectOption('.selector-color-ventana select', 'neon');
  await p.click('.selector-color-ventana [data-color="#2bff88"]');
  await p.waitForFunction(() => window.chispa.estado.seleccionado.sprite.color === '#2bff88');
  await p.keyboard.press('Escape');
  // Estilo: degradado y sombra (se dibuja sin errores). La sección empieza plegada.
  await p.click('.seccion-titulo:has-text("Estilo")');
  await p.selectOption('[data-ruta="sprite.relleno"]', 'degradado');
  await p.check('[data-ruta="sprite.sombra"]');
  comprobar((await estado(p, () => window.chispa.estado.seleccionado.sprite.sombra)) === '#00000088', 'no se ha puesto la sombra');
  // Unir la estrella con el cuadrado del ejemplo
  await estado(p, () => window.chispa.estado.seleccionarVarios([0, window.chispa.estado.escena.objetos.length - 1]));
  await p.click('button:has-text("Unir formas")');
  comprobar((await estado(p, () => window.chispa.estado.seleccionado.nombre)) === 'Union', 'no se han unido las formas');
  // La pluma: tres puntos y clic en el primero para cerrar
  await p.click('.boton-anadir');
  await p.click('.opcion-menu:has-text("Dibujar con la pluma")');
  const lienzo = await p.locator('.lienzo-pluma').boundingBox();
  const punto = (fx, fy) => p.mouse.click(lienzo.x + lienzo.width * fx, lienzo.y + lienzo.height * fy);
  await punto(0.3, 0.7);
  await punto(0.7, 0.7);
  await punto(0.5, 0.3);
  await punto(0.3, 0.7);
  await p.click('.dialogo button:has-text("Aceptar")');
  const camino = await estado(p, () => window.chispa.estado.seleccionado.sprite);
  comprobar(camino.forma === 'camino' && camino.puntos.length === 3 && camino.cerrado === undefined, 'la pluma no ha guardado un triángulo cerrado');
  // La biblioteca: arrastrar una moneda a la escena
  await p.click('.pestana-panel:has-text("Biblioteca")');
  await p.fill('.buscador-biblioteca', 'moneda');
  await p.locator('[data-biblioteca="moneda"]').dragTo(p.locator('.lienzo-escena'));
  comprobar((await estado(p, () => window.chispa.estado.escena.objetos.some((o) => o.nombre === 'Moneda'))), 'no se ha soltado la moneda en la escena');
  // Y se juega sin errores
  await p.keyboard.press('F5');
  await p.waitForTimeout(500);
  await p.keyboard.press('F5');
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
  await juego.waitForTimeout(2400);
  const panel = await juego.$eval('#panel-error', (el) => el.hidden);
  await juego.close();
  comprobar(panel, 'el juego exportado enseña un error');
  comprobar(mensajes.some((m) => m.includes('¡Hola!')), 'el juego exportado no ha arrancado: ' + mensajes.join(' | '));
});

await prueba('seguridad: el juego exportado funciona con su CSP, y un script colado en la página no se ejecuta', async (p) => {
  await p.click('button:has-text("Exportar")');
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('.destino-archivo')]);
  const archivo = join(carpeta, 'con-trampa.html');
  await descarga.saveAs(archivo);
  const html = readFileSync(archivo, 'utf8');
  comprobar(html.includes('Content-Security-Policy'), 'el juego exportado no lleva CSP');
  // Alguien mete su propio código en la página (por ejemplo, al volver a subirla a otra web)
  writeFileSync(archivo, html.replace('</body>', '<script>window.hackeado = 1; fetch("https://malo.example/")</script><img src="https://malo.example/x.png"></body>'));
  const juego = await contexto.newPage();
  const mensajes = [];
  const salieron = [];
  juego.on('console', (m) => mensajes.push(m.text()));
  juego.on('pageerror', (e) => mensajes.push('ERROR ' + e.message));
  // Una petición bloqueada por la CSP falla con ERR_BLOCKED_BY_CSP; si alguna llega a salir, mal
  juego.on('requestfailed', (r) => r.url().startsWith('http') && !/csp/i.test(r.failure()?.errorText ?? '') && salieron.push(r.url() + ' ' + r.failure()?.errorText));
  juego.on('requestfinished', (r) => r.url().startsWith('http') && salieron.push(r.url()));
  await juego.goto(pathToFileURL(archivo).href);
  await juego.waitForTimeout(2400);
  const hackeado = await juego.evaluate(() => window.hackeado);
  const arranco = mensajes.some((m) => m.includes('¡Hola!'));
  await juego.close();
  comprobar(arranco, 'el juego no arranca con la CSP: ' + mensajes.join(' | '));
  comprobar(hackeado === undefined, 'el script colado se ha ejecutado');
  comprobar(salieron.length === 0, 'la página ha pedido algo a internet: ' + salieron.join(', '));
  // Lo único que la CSP bloquea es lo que se coló (nada del propio juego)
  const bloqueados = mensajes.filter((m) => /Content Security Policy/i.test(m));
  comprobar(bloqueados.length > 0 && bloqueados.every((m) => /inline script|malo\.example/i.test(m)), 'la CSP bloquea algo del juego: ' + bloqueados.join(' | '));
});

await prueba('seguridad: un proyecto con HTML en los nombres y textos no mete HTML en el editor', async (p) => {
  const cuantos = () => p.evaluate(() => document.querySelectorAll('script, iframe, object, img[src="x"]').length);
  const antes = await cuantos();
  await estado(p, () => {
    const trampa = '<img src=x onerror="window.hackeado=1"><script>window.hackeado=2</script>';
    const e = window.chispa.estado;
    e.abrir({
      formato: 'chispa-proyecto', version: 2, nombre: trampa,
      scripts: { 'a.chs': 'cuando empieza:\n    mostrar("' + trampa.replace(/"/g, "'") + '")\n    dialogo("' + trampa.replace(/"/g, "'") + '", "hola")\n' },
      escenas: { Principal: { colorFondo: 'negro', objetos: [{ nombre: trampa, script: 'a.chs', sprite: { forma: 'texto', texto: trampa } }] } },
      datos: { [trampa]: trampa },
    });
    e.seleccionar({ tipo: 'escena', escena: 'Principal', indice: 0 });
  });
  await p.keyboard.press('F5');
  await p.waitForTimeout(700);
  // Errores con HTML dentro (por ejemplo, una variable que no existe con un nombre raro)
  await estado(p, () => window.chispa.ejecutarOrden?.('mostrar("<b>negrita</b>")'));
  await p.waitForTimeout(200);
  comprobar(await p.evaluate(() => window.hackeado) === undefined, 'se ha ejecutado código del proyecto');
  comprobar((await cuantos()) === antes, 'el proyecto ha metido etiquetas HTML en la página');
  comprobar((await p.evaluate(() => document.body.innerText)).includes('<b>negrita</b>'), 'el texto con HTML no se enseña tal cual en la consola');
});

await prueba('seguridad: el editor compilado lleva CSP y abrir un proyecto con imágenes de internet da un error claro', async (p) => {
  comprobar(await p.evaluate(() => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')), 'el editor no lleva CSP');
  const [eleccion] = await Promise.all([p.waitForEvent('filechooser'), p.click('button:has-text("Abrir")')]);
  const archivo = join(carpeta, 'espia.chispa.json');
  writeFileSync(archivo, JSON.stringify({ formato: 'chispa-proyecto', version: 2, nombre: 'Espía', imagenes: { foto: 'https://malo.example/espia.png' }, escenas: { Principal: { colorFondo: 'negro', objetos: [] } } }));
  await eleccion.setFiles(archivo);
  await p.waitForSelector('.dialogo');
  const texto = await textoDe(p, '.dialogo');
  comprobar(texto.includes('por seguridad no se abre') && texto.includes('imagenes → foto'), 'el error no explica el problema: ' + texto);
});

await prueba('Ayuda: «Acerca de Chispa» con la versión 1.2.0 y «Apoya Chispa», que nunca salta solo', async (p) => {
  // Un rato con el editor abierto (y un juego en marcha): no sale ningún aviso por su cuenta
  await p.keyboard.press('F5');
  await p.waitForTimeout(4000);
  comprobar(!(await p.$('.dialogo')), 'ha salido una ventana sin pulsar nada');
  await p.click('button:has-text("Ayuda")');
  comprobar((await textoDe(p, '.ayuda-chispa')).includes('Chispa 1.2.0'), 'la Ayuda no dice la versión');
  await p.click('.boton-acerca');
  const acerca = await textoDe(p, '.dialogo');
  comprobar(acerca.includes('Versión 1.2.0') && acerca.includes('Rodrigo') && acerca.includes('Mozilla Public License 2.0'), 'Acerca de no enseña versión, autor y licencia: ' + acerca);
  const terceros = await p.getAttribute('.acerca-de a[href="licencias-de-terceros.txt"]', 'href');
  const respuesta = await p.request.get(new URL(terceros, direccion).href);
  comprobar(respuesta.ok() && (await respuesta.text()).includes('@codemirror/view'), 'las licencias de terceros no van con el editor');
  await p.click('.dialogo button:has-text("Apoya Chispa")');
  await p.waitForSelector('.dialogo:has-text("Gracias por querer apoyar Chispa")');
  await p.click('.dialogo button:has-text("Cerrar")');
});

await prueba('rendimiento: 2000 objetos (con física amontonados, y con script)', async (p) => {
  for (const [fisica, maximo] of [[true, 40 * HOLGURA], [false, 20 * HOLGURA]]) {
    await estado(p, (fisica) => {
      const e = window.chispa.estado;
      e.abrir({ formato: 'chispa-proyecto', version: 2, nombre: 'r', ancho: 960, alto: 540, imagenes: {}, sonidos: {}, animaciones: {}, plantillas: {},
        scripts: { 'm.chs': 'variable v = aleatorio(50, 150)\ncuando cada fotograma:\n    yo.rotar(90 * delta)\n    yo.x += v * delta\n    si yo.x > 950:\n        yo.x = 10' },
        escenas: { Principal: { colorFondo: '#111', objetos: [] } }, escenaInicial: 'Principal' });
      e.empezarCambioLargo();
      e.crearObjeto('mapa', 0, 0);
      e.pintarRectangulo(e.seleccion, 0, 0, 19, 0, 'suelo');
      for (let i = 0; i < 2000; i++) {
        e.crearObjeto(i % 2 ? 'circulo' : 'rectangulo', 20 + (i % 50) * 18, 60 + Math.floor(i / 50) * 12);
        if (fisica) e.activarComponente(e.seleccion, 'fisica', true);
        else e.asignarScript(e.seleccion, 'm.chs');
        e.cambiarPropiedad(e.seleccion, 'sprite.ancho', 10);
        e.cambiarPropiedad(e.seleccion, 'sprite.alto', 10);
      }
      e.terminarCambioLargo();
    }, fisica);
    await p.keyboard.press('F5');
    await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'), null, { timeout: 15000 });
    await p.waitForTimeout(2000);
    // Lo que tarda el motor en un fotograma (sin contar lo que tarda el navegador en pintar)
    const ms = await estado(p, () => {
      const m = window.chispa.vistaJuego.motor;
      const t = performance.now();
      for (let i = 0; i < 20; i++) m.escena.actualizar(1 / 60);
      return (performance.now() - t) / 20;
    });
    console.log(`      (2000 objetos ${fisica ? 'con física amontonados' : 'con script'}: ${ms.toFixed(1)} ms por fotograma)`);
    comprobar(ms < maximo, `un fotograma tarda ${ms.toFixed(1)} ms (como mucho ${maximo})`);
    await p.keyboard.press('Shift+F5');
  }
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
  comprobar(fps > 30 / HOLGURA, `el editor va a ${fps.toFixed(0)} fotogramas por segundo`);
  // Y el juego con esos 500 objetos
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(3000);
  const juego = await estado(p, () => window.chispa.vistaJuego.motor.tiempo.fps);
  console.log(`      (juego con 500 objetos con física amontonados: ${juego} fotogramas por segundo)`);
  comprobar(juego > 30 / HOLGURA, `el juego va a ${juego} fotogramas por segundo`);
});

// ───────────────────────── Día 5: plantillas, recursos listos e itch.io en un clic ─────────────────────────

await prueba('plantillas: cada una se abre desde «Proyecto nuevo», se ve en el editor y se juega sin errores', async (p) => {
  for (const id of ['plataformas', 'aventura', 'naves', 'puzzle', 'carreras', 'cartas', 'historia']) {
    await p.click('[aria-label="Proyecto nuevo"]');
    comprobar((await p.$$('[data-plantilla]')).length === 9, 'faltan fichas en «Proyecto nuevo»');
    await p.click(`[data-plantilla="${id}"]`);
    await p.waitForTimeout(500);
    // El editor dibuja la escena con sus imágenes (y no deja el lienzo descolocado si aún no habían cargado)
    const vista = await estado(p, () => {
      const v = window.chispa.vistaEscena;
      const t = v.r.ctx.getTransform();
      return { objetos: v.objetos.length, imagenes: v.imagenesCargadas.size, e: t.e, f: t.f };
    });
    comprobar(vista.objetos > 2 && vista.imagenes >= 3, `${id}: el editor no ha cargado la escena`);
    comprobar(Math.abs(vista.e) < 1 && Math.abs(vista.f) < 1, `${id}: el lienzo de la escena se ha quedado descolocado (${vista.e}, ${vista.f})`);
    await p.keyboard.press('F5');
    await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
    await p.waitForTimeout(700);
    await p.keyboard.press('Space');
    await p.keyboard.down('ArrowRight');
    await p.waitForTimeout(500);
    await p.keyboard.up('ArrowRight');
    const errores = await p.$$eval('.consola-editor .mensaje.error', (l) => l.map((x) => x.textContent));
    comprobar(errores.length === 0, `${id}: errores al jugar: ${errores.join(' | ')}`);
    comprobar((await textoDe(p, '.estado-juego')).startsWith('Jugando'), `${id}: el juego se ha parado`);
    await p.keyboard.press('Escape');
    await p.click('button:has-text("Parar")');
  }
});

await prueba('recursos listos: un dibujo va al proyecto y a la escena; un sonido y una canción, al proyecto', async (p) => {
  await estado(p, () => window.chispa.estado.abrir({ formato: 'chispa-proyecto', version: 3, nombre: 'Recursos', ancho: 960, alto: 540, imagenes: {}, sonidos: {}, animaciones: {}, scripts: {}, plantillas: {}, escenas: { Principal: { colorFondo: 'negro', objetos: [] } }, escenaInicial: 'Principal' }));
  await p.click('.pestana-panel:nth-child(2)');
  await p.click('[aria-label^="Dibujos listos"]');
  await p.waitForSelector('[data-dibujo="gato"]');
  comprobar((await p.$$('[data-dibujo]')).length === 34, 'no están los 34 dibujos');
  await p.click('[data-dibujo="gato"]');
  await p.click('[data-dibujo="hierba"]');
  await p.click('[data-seccion="sonidos"]');
  await p.click('[data-recurso="moneda"] [data-accion="anadir"]');
  await p.click('[data-seccion="musica"]');
  await p.click('[data-recurso="accion"] [data-accion="anadir"]');
  const r = await estado(p, () => {
    const pr = window.chispa.estado.proyecto;
    return { imagenes: Object.keys(pr.imagenes), objetos: pr.escenas.Principal.objetos.map((o) => o.sprite?.imagen), sonidos: Object.keys(pr.sonidosHechos ?? {}), canciones: Object.keys(pr.canciones ?? {}) };
  });
  comprobar(r.imagenes.join() === 'gato,hierba', 'las imágenes no están: ' + r.imagenes);
  comprobar(r.objetos.join() === 'gato', 'solo el gato va a la escena: ' + r.objetos);
  comprobar(r.sonidos.join() === 'moneda' && r.canciones.join() === 'accion', 'faltan el sonido o la canción');
  comprobar(await p.$eval('[data-recurso="accion"] [data-accion="anadir"]', (b) => b.disabled), 'lo ya añadido se puede añadir otra vez');
  await p.keyboard.press('Escape');
});

await prueba('itch.io en un clic: el zip se descarga al pulsar el botón, con icono, nombre y pantalla de carga; y hay portada', async (p) => {
  await p.click('[aria-label="Proyecto nuevo"]');
  await p.click('[data-plantilla="naves"]');
  await estado(p, () => {
    window.chispa.estado.renombrarProyecto('Ovnis <3');
    window.chispa.estado.ponerIcono('nave');
  });
  const [zip] = await Promise.all([p.waitForEvent('download'), p.click('.boton-itch')]);
  comprobar(zip.suggestedFilename() === 'ovnis-3-itch.zip', 'el zip no se llama bien: ' + zip.suggestedFilename());
  const rutaZip = join(carpeta, zip.suggestedFilename());
  await zip.saveAs(rutaZip);
  const index = sacarDelZip(readFileSync(rutaZip), 'index.html');
  comprobar(index.includes('<link rel="icon" href="data:image/png;base64,'), 'la página no lleva el icono');
  comprobar(index.includes('<h1>Ovnis &lt;3</h1>') && index.includes('Hecho con <b>Chispa</b>'), 'la página no lleva la pantalla de carga con el nombre');
  comprobar((await textoDe(p, '.pasos-publicar')).includes('Ovnis <3'), 'los pasos no dicen el nombre del juego');
  // La portada: un PNG de 630×500
  const [portada] = await Promise.all([p.waitForEvent('download'), p.click('[data-accion="portada"]')]);
  comprobar(portada.suggestedFilename() === 'ovnis-3-portada.png', 'la portada no se llama bien: ' + portada.suggestedFilename());
  const rutaPortada = join(carpeta, portada.suggestedFilename());
  await portada.saveAs(rutaPortada);
  const png = readFileSync(rutaPortada);
  comprobar(png.readUInt32BE(16) === 630 && png.readUInt32BE(20) === 500, 'la portada no mide 630×500');
  await p.keyboard.press('Escape');

  // El juego exportado: primero la pantalla de carga (con el juego SIN empezar), luego el juego
  const archivo = join(carpeta, 'ovnis.html');
  writeFileSync(archivo, index);
  const juego = await contexto.newPage();
  const errores = [];
  juego.on('pageerror', (e) => errores.push(e.message));
  juego.on('console', (m) => /Content Security Policy/i.test(m.text()) && errores.push(m.text()));
  await juego.goto(pathToFileURL(archivo).href);
  const carga = await juego.evaluate(() => {
    const c = document.getElementById('cargando');
    const img = c?.querySelector('img');
    return { texto: c?.textContent ?? '', visible: !!c && getComputedStyle(c).opacity === '1', icono: img ? img.naturalWidth : 0, pixel: img ? getComputedStyle(img).imageRendering : '', lienzo: document.querySelector('#lienzo').width };
  });
  comprobar(carga.visible && carga.texto.includes('Ovnis <3') && carga.texto.includes('Hecho con Chispa'), 'no se ve la pantalla de carga: ' + JSON.stringify(carga));
  comprobar(carga.icono === 16 && carga.pixel === 'pixelated', 'el icono de la pantalla de carga no se ve bien: ' + JSON.stringify(carga));
  await juego.waitForTimeout(2400);
  const despues = await juego.evaluate(() => ({ carga: !!document.getElementById('cargando'), error: !document.getElementById('panel-error').hidden, titulo: document.title, icono: document.querySelector('link[rel="icon"]')?.href.slice(0, 22), lienzo: document.querySelector('#lienzo').width }));
  await juego.close();
  comprobar(!despues.carga, 'la pantalla de carga no se quita');
  comprobar(!despues.error && errores.length === 0, 'el juego exportado da errores: ' + errores.join(' | '));
  comprobar(despues.titulo === 'Ovnis <3' && despues.icono === 'data:image/png;base64,', 'la página no lleva el nombre o el icono');
  comprobar(despues.lienzo > 1, 'el juego no ha empezado');
});

// ───────────────────────── Día 6: la prueba de principiante de la 1.1 ─────────────────────────

await prueba('principiante 4: un juego solo con bloques y sin código (dibujos listos, bloques, dato del juego, contador y enemigo)', async (p) => {
  await p.click('[aria-label="Proyecto nuevo"]');
  await p.click('[data-plantilla="vacio"]');
  await p.click('.pestana-panel:has-text("Proyecto")');
  await p.click('[aria-label^="Dibujos listos"]');
  for (const d of ['heroe', 'gema', 'fantasma']) await p.click(`[data-dibujo="${d}"]`);
  await p.click('[data-seccion="sonidos"]');
  await p.click('[data-recurso="moneda"] [data-accion="anadir"]');
  comprobar((await p.$$('#notificaciones .notificacion')).length <= 3, 'hay más de tres avisos a la vez');
  await p.keyboard.press('Escape');
  let objetos = await estado(p, () => window.chispa.estado.escena.objetos.map((o) => ({ n: o.nombre, x: o.x, y: o.y })));
  comprobar(objetos.map((o) => o.n).join() === 'Heroe,Gema,Fantasma', 'los objetos no se llaman con mayúscula: ' + JSON.stringify(objetos));
  comprobar(new Set(objetos.map((o) => o.x + ',' + o.y)).size === 3, 'los dibujos han quedado amontonados: ' + JSON.stringify(objetos));
  comprobar(await estado(p, () => window.chispa.estado.proyecto.pixelArt), 'no se han activado los píxeles nítidos');

  // El script del héroe, solo con bloques
  await p.click('.pestana-panel:has-text("Escena")');
  await p.click('.nodo:has-text("Heroe")');
  await p.click('button:has-text("Crear script")');
  await p.waitForSelector('.cm-content');
  await p.keyboard.press('Control+b');
  await p.waitForSelector('.editor-bloques');
  comprobar(await p.$('.categoria-bloques:has-text("Interfaz")'), 'no hay categoría «Interfaz» en los bloques');
  const cat = (c) => p.click(`.categoria-bloques:has-text("${c}")`);
  const boca = (clase) => p.evaluate((c) => `.bloque[data-id="${[...document.querySelectorAll('.area-bloques .bloque.tipo-evento')].filter((x) => x.querySelector('select')?.value === c).pop().dataset.id}"] .boca-bloque .lista-bloques`, clase);
  await cat('Eventos');
  // «cuando toco» sale ya con un objeto de la escena (la gema), no con «Moneda»
  comprobar((await textoDe(p, '.bloque-paleta:has-text("cuando toco")')).includes('Gema'), '«cuando toco» no sale con un objeto de la escena');
  await p.dragAndDrop('.bloque-paleta:has-text("cuando cada fotograma")', '.area-bloques');
  await p.dragAndDrop('.bloque-paleta:has-text("cuando toco")', '.area-bloques');
  await cat('Movimiento');
  await p.dragAndDrop('.bloque-paleta:has-text("moverme con las flechas")', await boca('fotograma'));
  await cat('Objetos');
  await p.dragAndDrop('.bloque-paleta:has-text("destruir")', await boca('toco'));
  await cat('Variables');
  await p.dragAndDrop('.bloque-paleta:has-text("juego.puntos")', await boca('toco'));
  await cat('Sonido');
  // «reproducir el sonido» sale con el sonido que hay en el proyecto
  await p.dragAndDrop('.bloque-paleta:has-text("reproducir el sonido"):not(:has-text("en"))', await boca('toco'));
  const codigo = await estado(p, () => Object.values(window.chispa.estado.proyecto.scripts)[0]);
  comprobar(codigo.includes('cuando toco Gema:') && codigo.includes('sonido.reproducir("moneda")') && codigo.includes('yo.moverConFlechas(300)'), 'los bloques no han escrito el código esperado:\n' + codigo);

  // Sin el dato del juego, el error dice cómo crearlo sin código
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.click('.vista-juego canvas');
  await p.keyboard.down('ArrowRight');
  await p.waitForFunction(() => document.querySelector('.consola-editor .mensaje.error'), null, { timeout: 5000 });
  await p.keyboard.up('ArrowRight');
  comprobar((await textoDe(p, '.consola-editor')).includes('Datos del juego'), 'el error de juego.puntos no dice cómo crear el dato');
  await p.click('.controles-juego .parar');

  // El dato del juego, el contador y el enemigo, desde el inspector
  await p.click('.pestana:has-text("Escena")');
  await p.click('.lienzo-escena', { position: { x: 30, y: 30 } });
  await p.click('button:has-text("+ Nuevo dato")');
  await p.fill('.dialogo input', 'puntos');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.dialogo:has-text("Valor inicial")');
  await p.keyboard.press('Enter');
  await p.click('.boton-anadir');
  await p.click('[data-control="icono"]');
  const icono = await estado(p, () => window.chispa.estado.seleccionado);
  comprobar(icono.x < 100 && icono.y > 480, 'el contador no sale arriba a la izquierda: ' + icono.x + ',' + icono.y);
  comprobar((await p.$$('datalist option[value="juego.puntos"]')).length === 1, 'el campo «dato» no ofrece juego.puntos');
  await p.fill('[data-ruta="control.dato"]', 'puntos');
  await p.keyboard.press('Enter');
  comprobar((await estado(p, () => window.chispa.estado.seleccionado.control.dato)) === 'juego.puntos', '«puntos» no se ha convertido en juego.puntos');
  await p.click('.nodo:has-text("Fantasma")');
  await p.check('details.seccion:has(.seccion-titulo:text-is("Comportamiento")) .interruptor');
  comprobar((await estado(p, () => window.chispa.estado.seleccionado.comportamiento.objetivo)) === 'Heroe', 'el fantasma no persigue al héroe');

  // Y se juega: coge la gema, suma un punto y el fantasma viene
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.click('.vista-juego canvas');
  await p.keyboard.down('ArrowRight');
  await p.waitForTimeout(700);
  await p.keyboard.up('ArrowRight');
  const fin = await estado(p, () => {
    const j = window.chispa.vistaJuego.juego;
    return { objetos: j.escena.objetos.filter((o) => !o.destruido).map((o) => o.nombre), fantasma: j.escena.buscar('Fantasma').posicion.x };
  });
  comprobar(!fin.objetos.includes('Gema'), 'no ha cogido la gema');
  comprobar(fin.fantasma > objetos[2].x + 5, 'el fantasma no persigue');
  comprobar(!(await p.$('.consola-editor .mensaje.error')), 'errores al jugar: ' + (await textoDe(p, '.consola-editor')).slice(-300));
});

await prueba('principiante 4: la pausa de «Pantallas listas» no tapa la escena en el editor, y renombrar un objeto no rompe el juego', async (p) => {
  await p.click('[aria-label="Proyecto nuevo"]');
  await p.click('[data-plantilla="naves"]');
  await p.click('.pestana-panel:has-text("Proyecto")');
  await p.click('[aria-label^="Pantallas listas"]');
  await p.click('.dialogo-botones .principal');
  await p.waitForTimeout(300);
  const ocultos = await estado(p, () => window.chispa.estado.proyecto.escenas.Espacio.objetos.filter((o) => o.sprite?.visible === false).map((o) => o.nombre));
  comprobar(ocultos.join() === 'VentanaPausa,MenuPausa', 'la pausa no empieza oculta: ' + ocultos);
  // Renombrar la nave: «cuando toco Nave» pasa a «cuando toco Cohete» y el juego sigue funcionando
  await estado(p, () => {
    const e = window.chispa.estado;
    e.renombrar({ tipo: 'escena', escena: 'Espacio', indice: e.proyecto.escenas.Espacio.objetos.findIndex((o) => o.nombre === 'Nave') }, 'Cohete');
    e.renombrar({ tipo: 'plantilla', nombre: 'Ovni' }, 'Marciano');
  });
  const scripts = await estado(p, () => window.chispa.estado.proyecto.scripts);
  comprobar(scripts['oleadas.chs'].includes('crear("Marciano"') && scripts['bala.chs'].includes('cuando toco Marciano:'), 'renombrar la plantilla no ha cambiado el código');
  comprobar((await estado(p, () => window.chispa.inferior.revisar())) === 0, 'hay errores después de renombrar');
});

// ───────────────────────── Día 6: rendimiento y pantallas pequeñas ─────────────────────────

await prueba('pantallas de portátil: en 1366×768 y en 1280×720 cabe todo (barra, bloques, ventanas)', async (p) => {
  for (const [ancho, alto] of [[1366, 768], [1280, 720]]) {
    await p.setViewportSize({ width: ancho, height: alto });
    await p.click('[aria-label="Proyecto nuevo"]');
    await p.click('[data-plantilla="plataformas"]');
    await p.waitForTimeout(300);
    /** Lo que se sale de la ventana (sin estar dentro de algo que se desplaza) o se pisa con otra cosa. */
    const fuera = () => estado(p, () => {
      const mal = [];
      for (const el of document.querySelectorAll('button, input, select, .pestana, .pestana-panel, h2, .dialogo, .grupo-barra, .nombre-proyecto')) {
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height || getComputedStyle(el).visibility === 'hidden') continue;
        if (b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1 && b.left >= -1 && b.top >= -1) continue;
        let pa = el.parentElement;
        let desplazable = false;
        while (pa && !desplazable) {
          const e = getComputedStyle(pa);
          desplazable = /(auto|scroll)/.test(e.overflowY + e.overflowX);
          pa = pa.parentElement;
        }
        if (!desplazable) mal.push((el.className || el.tagName) + ' «' + (el.textContent || '').trim().slice(0, 20) + '»');
      }
      if (document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight) mal.push('la página entera se desplaza');
      return mal;
    });
    const comprobarQueCabe = async (donde) => {
      const mal = await fuera();
      comprobar(mal.length === 0, `${ancho}×${alto}, ${donde}: se sale ${mal.slice(0, 5).join(', ')}`);
    };
    await comprobarQueCabe('la escena');
    // El nombre del proyecto se lee entero y los botones de la barra no se pisan
    const barra = await estado(p, () => {
      const cajas = [...document.querySelectorAll('.barra-principal .grupo-barra, .barra-principal .nombre-proyecto')].map((e) => e.getBoundingClientRect());
      const nombre = document.querySelector('.nombre-proyecto span');
      return { pisan: cajas.some((a, i) => cajas.some((b, j) => j > i && a.left < b.right - 1 && b.left < a.right - 1)), cortado: nombre.scrollWidth > nombre.clientWidth + 1 };
    });
    comprobar(!barra.pisan && !barra.cortado, `${ancho}×${alto}: la barra de arriba no cabe (${JSON.stringify(barra)})`);
    // Los bloques: las diez categorías se ven, sin salirse de su columna
    await p.click('.nodo:has-text("Jugador")');
    await p.click('button:has-text("Abrir el código")');
    await p.waitForSelector('.cm-content');
    await p.keyboard.press('Control+b');
    await p.waitForSelector('.editor-bloques');
    const categorias = await estado(p, () => {
      const columna = [...document.querySelectorAll('.categorias-bloques')].find((c) => c.offsetParent).getBoundingClientRect();
      return [...document.querySelectorAll('.categoria-bloques')].filter((c) => c.offsetParent).map((c) => { const b = c.getBoundingClientRect(); return b.top >= columna.top - 1 && b.bottom <= columna.bottom + 1; });
    });
    comprobar(categorias.length === 11 && categorias.every(Boolean), `${ancho}×${alto}: las categorías de los bloques no caben: ${categorias}`);
    // Y no queda por debajo el editor del proyecto anterior (se quedaba su caja al abrir otro proyecto)
    comprobar(await estado(p, () => document.querySelectorAll('.caja-script').length) === 1, `${ancho}×${alto}: queda la caja de un script del proyecto anterior`);
    await comprobarQueCabe('los bloques');
    // Las ventanas grandes: se ven enteras o se desplazan por dentro, y sus botones se pueden pulsar
    await p.click('.pestana-panel:has-text("Proyecto")');
    for (const [boton, nombre] of [['[aria-label^="Hacer un efecto de sonido"]', 'el generador de sonidos'], ['[aria-label^="Nueva canción"]', 'el editor de música'], ['[aria-label^="Dibujos listos"]', 'los recursos listos'], ['[aria-label^="Pantallas listas"]', 'las pantallas listas']]) {
      await p.click(boton);
      await p.waitForSelector('.dialogo');
      await comprobarQueCabe(nombre);
      const botones = await estado(p, () => {
        const d = document.querySelector('.dialogo');
        const ultimo = [...d.querySelectorAll('.dialogo-botones button')].pop();
        ultimo.scrollIntoView({ block: 'nearest' });
        const b = ultimo.getBoundingClientRect();
        const encima = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return { dentro: b.bottom <= innerHeight && b.top >= 0, libre: encima === ultimo || ultimo.contains(encima) };
      });
      comprobar(botones.dentro && botones.libre, `${ancho}×${alto}, ${nombre}: el botón de abajo no se puede pulsar (${JSON.stringify(botones)})`);
      await p.keyboard.press('Escape');
    }
    await p.click('.pestana-panel:has-text("Escena")');
  }
});

await prueba('estampas: lo que tiene sombra, resplandor, contorno o degradado se ve igual con ellas que sin ellas', async (p) => {
  await p.click('[aria-label="Proyecto nuevo"]');
  await p.click('[data-plantilla="cartas"]');
  await estado(p, () => {
    const e = window.chispa.estado;
    const formas = ['circulo', 'rectangulo', 'estrella', 'corazon', 'triangulo', 'flecha'];
    const estilos = [
      { sombra: '#000000a0', sombraX: 8, sombraY: -8, desenfoqueSombra: 8 },
      { resplandor: 'cian', tamanoResplandor: 18 },
      { contorno: 'blanco', grosorContorno: 4 },
      { relleno: 'degradado', color2: 'morado', borde: 4, colorBorde: 'negro' },
      { relleno: 'radial', color2: 'azul', sombra: 'negro', resplandor: 'amarillo', borde: 3 },
      { relleno: 'radial', color2: 'azul', contorno: 'rojo', opacidad: 0.6, sombra: '#000000' },
    ];
    const objetos = [];
    formas.forEach((forma, i) => estilos.forEach((estilo, j) => objetos.push({ nombre: `F${i}_${j}`, x: 90 + j * 150, y: 60 + i * 80, sprite: { forma, color: ['rojo', 'verde', 'naranja'][i % 3], ancho: 60, alto: 50, ...estilo, ...(i === 5 ? { voltear: true } : {}) } })));
    ['gema', 'corazon', 'llave'].forEach((img, i) => objetos.push({ nombre: 'I' + i, x: 880, y: 100 + i * 150, sprite: { imagen: img, ancho: 80, alto: 80, sombra: '#000000', resplandor: i === 1 ? 'rosa' : undefined, contorno: i === 2 ? 'blanco' : undefined, grosorContorno: 4 } }));
    const pr = JSON.parse(e.aJSON());
    pr.scripts = {};
    pr.plantillas = {};
    pr.escenas = { Mesa: { colorFondo: '#33415c', gravedad: 0, objetos } };
    e.abrir(pr);
  });
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(600);
  const r = await estado(p, () => {
    const m = window.chispa.vistaJuego.motor;
    const c = m.renderizador.ctx;
    const foto = (si) => {
      window.chispa.estampas.usar(si);
      for (let i = 0; i < 3; i++) m.escena.dibujar(m.renderizador);
      return { datos: c.getImageData(0, 0, c.canvas.width, c.canvas.height).data, estampas: window.chispa.estampas.cuantas() };
    };
    const sin = foto(false);
    // Para que se hagan de nuevo (cada dibujo recuerda las suyas): se reinicia la escena
    const con = foto(true);
    let suma = 0;
    let distintos = 0;
    for (let i = 0; i < sin.datos.length; i++) {
      const d = Math.abs(sin.datos[i] - con.datos[i]);
      suma += d;
      if (d > 40) distintos++;
    }
    let pintado = 0;
    for (let i = 0; i < con.datos.length; i += 4) if (con.datos[i] !== 0x33 || con.datos[i + 1] !== 0x41) pintado++;
    return { media: suma / sin.datos.length, distintos: distintos / sin.datos.length, pintado: pintado / (con.datos.length / 4) };
  });
  comprobar(r.pintado > 0.1, 'no se ha dibujado nada: ' + JSON.stringify(r));
  // Solo cambian los bordes (el suavizado no cae en los mismos píxeles): de media, casi nada
  comprobar(r.media < 4 && r.distintos < 0.04, 'con estampas no se ve igual que sin ellas: ' + JSON.stringify(r));
  await estado(p, () => window.chispa.estampas.usar(true));
});

await prueba('rendimiento: 500 objetos con efectos, luces y partículas', async (p) => {
  await estado(p, () => {
    const objetos = [];
    // Un suelo y unas plataformas de casillas: las luces con sombras chocan con ellas
    const celdas = {};
    for (let c = 0; c < 20; c++) celdas[`${c},0`] = 'suelo';
    for (let c = 4; c < 16; c += 3) celdas[`${c},5`] = 'suelo';
    objetos.push({ nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 48, tipos: { suelo: { color: '#5ad17a', solida: true } }, celdas } });
    for (let i = 0; i < 500; i++) {
      // Todos con algún efecto de estilo: sombra, resplandor, contorno, degradado con borde... (y uno de cada cinco, girando)
      const sprite = { forma: i % 3 === 0 ? 'circulo' : i % 3 === 1 ? 'rectangulo' : 'estrella', color: ['rojo', 'azul', 'verde', 'amarillo'][i % 4], ancho: 22, alto: 22 };
      if (i % 5 === 0) Object.assign(sprite, { sombra: '#00000080', sombraX: 4, sombraY: -4, desenfoqueSombra: 6 });
      if (i % 5 === 1) Object.assign(sprite, { resplandor: 'cian', tamanoResplandor: 14 });
      if (i % 5 === 2) Object.assign(sprite, { contorno: 'blanco', grosorContorno: 3 });
      if (i % 5 === 3) Object.assign(sprite, { relleno: 'degradado', color2: 'morado', borde: 2, colorBorde: 'negro' });
      if (i % 5 === 4) Object.assign(sprite, { borde: 2, colorBorde: 'blanco' });
      const o = { nombre: 'O' + i, x: 30 + (i % 30) * 30, y: 80 + Math.floor(i / 30) * 26, sprite, script: i % 5 === 4 ? 'gira.chs' : 'anda.chs' };
      // 50 llevan un efecto de partículas puesto, y 13 una luz (4 de ellas con sombras)
      if (i % 10 === 0) o.efecto = ['estela', 'fuego', 'humo', 'burbujas'][(i / 10) % 4];
      if (i % 40 === 0) o.luz = { color: ['#ffd9a0', 'cian', 'rosa'][(i / 40) % 3], radio: 160, sombras: i % 160 === 0, parpadeo: i % 80 === 0 ? 0.4 : 0 };
      objetos.push(o);
    }
    objetos.push({ nombre: 'Director', x: 0, y: 0, script: 'explosiones.chs' });
    window.chispa.estado.abrir({ formato: 'chispa-proyecto', version: 3, nombre: 'r', ancho: 960, alto: 540, imagenes: {}, sonidos: {}, animaciones: {}, plantillas: {},
      scripts: {
        'anda.chs': 'variable v = aleatorio(40, 140)\ncuando cada fotograma:\n    yo.x += v * delta\n    si yo.x > 950:\n        yo.x = 10\n',
        'gira.chs': 'variable v = aleatorio(40, 140)\ncuando cada fotograma:\n    yo.rotar(90 * delta)\n    yo.x += v * delta\n    si yo.x > 950:\n        yo.x = 10\n',
        'explosiones.chs': 'cuando cada 0.25 segundos:\n    efecto.explosion(vector(aleatorio(100, 860), aleatorio(100, 440)))\n    efecto.chispas(vector(aleatorio(100, 860), aleatorio(100, 440)))\n',
      },
      escenas: { Principal: { colorFondo: '#111', gravedad: 0, oscuridad: 0.8, objetos } }, escenaInicial: 'Principal' });
  });
  await p.keyboard.press('F5');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'), null, { timeout: 20000 });
  await p.waitForTimeout(3000);
  const medir = (conEstampas) => estado(p, (conEstampas) => {
    window.chispa.estampas.usar(conEstampas);
    const m = window.chispa.vistaJuego.motor;
    for (let i = 0; i < 5; i++) { m.escena.actualizar(1 / 60); m.escena.dibujar(m.renderizador); }
    const N = 40;
    const t = performance.now();
    for (let i = 0; i < N; i++) {
      m.escena.actualizar(1 / 60);
      m.escena.dibujar(m.renderizador);
    }
    // Lo que tarda el motor en hacer un fotograma: mover los 500 objetos y dar todas las órdenes de dibujo
    return { ms: (performance.now() - t) / N, particulas: m.escena.particulas.cantidad, objetos: m.escena.objetos.length };
  }, conEstampas);
  const sin = await medir(false);
  const con = await medir(true);
  const fps = await estado(p, () => window.chispa.vistaJuego.motor.tiempo.fps);
  console.log(`      (500 objetos con efectos, 13 luces y ${con.particulas} partículas: ${con.ms.toFixed(1)} ms por fotograma; sin las mejoras de la 1.1, ${sin.ms.toFixed(1)} ms. En este navegador de pruebas, sin tarjeta gráfica: ${fps} fotogramas por segundo)`);
  comprobar(con.objetos >= 500 && con.particulas > 300, 'la escena de la prueba no es la que tiene que ser: ' + JSON.stringify(con));
  comprobar(!(await p.$('.consola-editor .mensaje.error')), 'errores al jugar');
  // 60 fotogramas por segundo son 16,7 ms por fotograma. Este navegador de pruebas no tiene tarjeta gráfica (todo lo
  // pinta el procesador, que es mucho más lento que un ordenador normal): aquí se pide no pasar de 25 ms
  comprobar(con.ms < 25 * HOLGURA, `un fotograma tarda ${con.ms.toFixed(1)} ms (como mucho ${25 * HOLGURA})`);
  comprobar(con.ms < sin.ms * 0.8, `las mejoras de la 1.1 no se notan: ${con.ms.toFixed(1)} ms con ellas, ${sin.ms.toFixed(1)} sin ellas`);
});

await navegador.close();
await new Promise((r) => servidor.httpServer.close(r));
console.log(fallos ? `\n${fallos} prueba(s) han fallado.` : '\nTodas las pruebas del navegador han pasado.');
process.exit(fallos ? 1 : 0);
