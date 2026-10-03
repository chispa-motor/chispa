/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PRUEBAS EN MÓVILES Y TABLETAS SIMULADOS: node pruebas-navegador/moviles.mjs
 * (después de `npm run build`; `npm run pruebas:navegador` lo hace todo).
 *
 * El mismo Chromium de las otras pruebas, pero haciéndose pasar por varios
 * aparatos (ver DISPOSITIVOS.md): con su tamaño de pantalla, sin ratón y con
 * TOQUES de verdad (uno o dos dedos), que es como se usa un móvil.
 *
 * Lo que un navegador de ordenador no puede simular (el teclado de pantalla de
 * verdad, Safari, el notch, la vibración...) está en PRUEBAS_PENDIENTES.md.
 *
 * SOLO="texto" ejecuta solo las pruebas con ese texto en el nombre.
 * APARATO="movil pequeno" ejecuta solo en ese aparato.
 */
import { chromium } from 'playwright';
import { preview } from 'vite';

const RUTA_BASE = process.env.RUTA_BASE ?? '/';
const servidor = await preview({ base: RUTA_BASE, preview: { port: 4331, strictPort: false }, logLevel: 'silent' });
const direccion = servidor.resolvedUrls.local[0];
const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

/** Los aparatos de DISPOSITIVOS.md. `tactil`: sin ratón, con el dedo. */
export const APARATOS = [
  { nombre: 'movil pequeno', ancho: 360, alto: 640, tactil: true, disposicion: 'movil' },
  { nombre: 'movil grande', ancho: 430, alto: 932, tactil: true, disposicion: 'movil' },
  { nombre: 'movil tumbado', ancho: 800, alto: 360, tactil: true, disposicion: 'movil' },
  { nombre: 'tablet vertical', ancho: 820, alto: 1180, tactil: true, disposicion: 'tablet' },
  { nombre: 'tablet horizontal', ancho: 1180, alto: 820, tactil: true, disposicion: 'tablet' },
  { nombre: 'portatil pequeno', ancho: 1366, alto: 768, tactil: false, disposicion: 'escritorio' },
  { nombre: 'escritorio', ancho: 1440, alto: 860, tactil: false, disposicion: 'escritorio' },
];
const aparato = (nombre) => APARATOS.find((a) => a.nombre === nombre);
const COMPACTOS = APARATOS.filter((a) => a.disposicion !== 'escritorio');
const TACTILES = APARATOS.filter((a) => a.tactil);

let fallos = 0;
let hechas = 0;
function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}
const estado = (p, fn, arg) => p.evaluate(fn, arg);

/** Los dedos: toques de verdad (los que el navegador recibiría de la pantalla), de uno o dos dedos. */
function dedos(cdp) {
  const enviar = (type, puntos) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: puntos.map((q, i) => ({ x: Math.round(q.x), y: Math.round(q.y), id: q.id ?? i })) });
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  return {
    /** Un toque corto. */
    async tocar(x, y) {
      await enviar('touchStart', [{ x, y }]);
      await espera(40);
      await enviar('touchEnd', []);
      await espera(60);
    },
    /** Arrastrar con un dedo. */
    async arrastrar(x0, y0, x1, y1, pasos = 8) {
      await enviar('touchStart', [{ x: x0, y: y0 }]);
      for (let i = 1; i <= pasos; i++) {
        await enviar('touchMove', [{ x: x0 + ((x1 - x0) * i) / pasos, y: y0 + ((y1 - y0) * i) / pasos }]);
        await espera(12);
      }
      await enviar('touchEnd', []);
      await espera(60);
    },
    /** Dejar el dedo quieto. */
    async dejar(x, y, ms = 750) {
      await enviar('touchStart', [{ x, y }]);
      await espera(ms);
      await enviar('touchEnd', []);
      await espera(80);
    },
    /** Dos dedos: de (a0, b0) a (a1, b1). Sirve para pellizcar y para mover la vista. */
    async dos(a0, b0, a1, b1, pasos = 8) {
      await enviar('touchStart', [{ ...a0, id: 0 }]);
      await espera(20);
      await enviar('touchStart', [{ ...a0, id: 0 }, { ...b0, id: 1 }]);
      for (let i = 1; i <= pasos; i++) {
        const t = i / pasos;
        await enviar('touchMove', [{ x: a0.x + (a1.x - a0.x) * t, y: a0.y + (a1.y - a0.y) * t, id: 0 }, { x: b0.x + (b1.x - b0.x) * t, y: b0.y + (b1.y - b0.y) * t, id: 1 }]);
        await espera(12);
      }
      await enviar('touchEnd', [{ ...a1, id: 0 }]);
      await enviar('touchEnd', []);
      await espera(60);
    },
  };
}

/**
 * Una prueba en uno o varios aparatos. `fn(p, a, d)`: la página, el aparato y los dedos.
 */
async function prueba(nombre, aparatos, fn, opciones = {}) {
  if (process.env.SOLO && !nombre.includes(process.env.SOLO)) return;
  for (const a of aparatos) {
    if (process.env.APARATO && a.nombre !== process.env.APARATO) continue;
    const contexto = await navegador.newContext({ viewport: { width: a.ancho, height: a.alto }, hasTouch: a.tactil, isMobile: a.tactil, deviceScaleFactor: a.tactil ? 2 : 1, acceptDownloads: true });
    const p = await contexto.newPage();
    const errores = [];
    p.on('pageerror', (e) => errores.push(e.message));
    p.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    hechas++;
    try {
      await p.goto(direccion + (opciones.direccion ?? '?limpio'));
      await p.waitForFunction(() => window.chispa);
      await p.waitForTimeout(350);
      await fn(p, a, dedos(await contexto.newCDPSession(p)));
      if (errores.length) throw new Error('Errores en la página: ' + errores.join(' | '));
      console.log(`  ✓ [${a.nombre}] ${nombre}`);
    } catch (e) {
      fallos++;
      console.log(`  ✗ [${a.nombre}] ${nombre}\n      ${String(e.message ?? e).split('\n')[0]}`);
      if (process.env.CAPTURA) await p.screenshot({ path: process.env.CAPTURA }).catch(() => {});
    } finally {
      await contexto.close();
    }
  }
}

/** Dónde está en la ventana el objeto `i` de la escena (su centro), y el lienzo de la escena. */
const sitioDe = (p, i) => estado(p, (indice) => {
  const app = window.chispa;
  const lienzo = document.querySelector('.lienzo-escena').getBoundingClientRect();
  const o = app.estado.escena.objetos[indice];
  const q = app.vistaEscena.camara.aPantalla(o.x ?? 0, o.y ?? 0);
  return { x: lienzo.left + q.x, y: lienzo.top + q.y, lienzo: { x: lienzo.left, y: lienzo.top, ancho: lienzo.width, alto: lienzo.height } };
}, i);

/** Lo que se sale de la ventana (sin estar dentro de algo que se desplaza). */
const loQueSeSale = (p) => estado(p, () => {
  const mal = [];
  for (const el of document.querySelectorAll('button, input, select, .pestana, .pestana-panel, h2, .dialogo, .grupo-barra, .nombre-proyecto, .boton-navegacion')) {
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height || getComputedStyle(el).visibility === 'hidden') continue;
    if (b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1 && b.left >= -1 && b.top >= -1) continue;
    let pa = el.parentElement;
    let desplazable = false;
    let escondido = false;
    while (pa && !desplazable && !escondido) {
      const e = getComputedStyle(pa);
      desplazable = /(auto|scroll)/.test(e.overflowY + e.overflowX);
      escondido = e.visibility === 'hidden' || pa.classList.contains('vista-juego');
      pa = pa.parentElement;
    }
    if (!desplazable && !escondido) mal.push((el.className || el.tagName) + ' «' + (el.textContent || '').trim().slice(0, 20) + '»');
  }
  if (document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight) mal.push('la página entera se desplaza');
  return mal;
});

/** Lo que se puede pulsar y mide menos de 44 px (de lo que se ve ahora mismo). */
const botonesPequenos = (p) => estado(p, () => {
  const mal = [];
  const visibles = (el) => {
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) return false;
    for (let x = el; x; x = x.parentElement) {
      const e = getComputedStyle(x);
      if (e.visibility === 'hidden' || e.display === 'none' || e.opacity === '0') return false;
    }
    // Lo que está tapado o fuera de la pantalla no se puede pulsar: no cuenta
    const dentro = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, b.left + b.width / 2)), Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2)));
    return !!dentro && (el === dentro || el.contains(dentro) || dentro.contains(el));
  };
  for (const el of document.querySelectorAll('button, [role=tab], select, input:not([type=hidden]), a[href], summary')) {
    if (!visibles(el)) continue;
    const b = el.getBoundingClientRect();
    // Las casillas de marcar son de 24 px, pero su fila entera (de 44) se puede tocar
    const caja = el.matches('input[type=checkbox], input[type=radio], input[type=color]') ? (el.closest('label, .campo-fila, .fila') ?? el).getBoundingClientRect() : b;
    if (Math.min(caja.width, caja.height) < 43.5) mal.push(`${el.tagName}.${el.className}${el.type ? '[' + el.type + ']' : ''} «${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}» ${Math.round(caja.width)}×${Math.round(caja.height)}`);
  }
  return mal;
});

console.log(`Pruebas en móviles y tabletas simulados (en ${direccion}):`);

// ═════════════════════════ BLOQUE 1: el editor adaptable ═════════════════════════

await prueba('cada aparato tiene su disposición: cajones y barra de abajo en móvil y tablet, y el escritorio como siempre', APARATOS, async (p, a) => {
  const e = await estado(p, () => ({ clases: document.getElementById('editor').className, nav: getComputedStyle(document.querySelector('.navegacion-abajo')).display, izquierda: getComputedStyle(document.querySelector('.columna-izquierda')).visibility, disposicion: window.chispa.dispositivo }));
  comprobar(e.disposicion.disposicion === a.disposicion, `la disposición es «${e.disposicion.disposicion}» y tenía que ser «${a.disposicion}»`);
  comprobar(e.disposicion.tactil === a.tactil, `táctil: ${e.disposicion.tactil}`);
  if (a.disposicion === 'escritorio') {
    comprobar(e.nav === 'none' && e.izquierda === 'visible', 'en el escritorio no tiene que haber barra de abajo, y los paneles se ven');
    comprobar(await p.isVisible('.inspector') && await p.isVisible('.panel-inferior') && await p.isVisible('.vista-juego'), 'en el escritorio se ven los tres paneles');
  } else {
    comprobar(e.nav !== 'none' && e.izquierda === 'hidden', 'tiene que haber barra de abajo y los paneles, cerrados');
    comprobar(await p.locator('.boton-navegacion').count() === 6, 'la barra de abajo tiene seis botones');
  }
  const mal = await loQueSeSale(p);
  comprobar(mal.length === 0, `se sale de la pantalla: ${mal.slice(0, 4).join(', ')}`);
});

await prueba('la barra de abajo abre y cierra cada cajón, y nada se sale de la pantalla', COMPACTOS, async (p, a, d) => {
  const centro = async (selector) => {
    const b = await p.locator(selector).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  for (const [cajon, selector] of [['objetos', '.panel-izquierdo'], ['propiedades', '.inspector'], ['consola', '.panel-inferior'], ['juego', '.vista-juego']]) {
    const c = await centro(`[data-ir=${cajon}]`);
    await d.tocar(c.x, c.y);
    await p.waitForTimeout(260);
    comprobar((await estado(p, () => window.chispa.cajon)) === cajon, `no se ha abierto el cajón «${cajon}»`);
    const caja = await p.locator(selector).boundingBox();
    comprobar(caja && caja.x >= -1 && caja.x + caja.width <= a.ancho + 1 && caja.y >= -1 && caja.y + caja.height <= a.alto + 1 && caja.width > 200, `el cajón «${cajon}» no cabe en la pantalla: ${JSON.stringify(caja)}`);
    const mal = await loQueSeSale(p);
    comprobar(mal.length === 0, `con «${cajon}» abierto se sale: ${mal.slice(0, 4).join(', ')}`);
    comprobar((await estado(p, (x) => document.querySelector(`[data-ir=${x}]`).classList.contains('activo'), cajon)), `el botón «${cajon}» no está marcado`);
    // Se cierra tocando otra vez
    await d.tocar(c.x, c.y);
    await p.waitForTimeout(260);
    comprobar((await estado(p, () => window.chispa.cajon)) === '', `no se ha cerrado el cajón «${cajon}»`);
  }
  // En la tablet, tocar lo oscuro de al lado también cierra
  if (a.disposicion === 'tablet') {
    const c = await centro('[data-ir=objetos]');
    await d.tocar(c.x, c.y);
    await p.waitForTimeout(260);
    await d.tocar(a.ancho - 40, a.alto / 2);
    await p.waitForTimeout(260);
    comprobar((await estado(p, () => window.chispa.cajon)) === '', 'tocar fuera del cajón no lo cierra');
  }
  // «Código» abre el script del ejemplo y «Escena» vuelve
  let c = await centro('[data-ir=codigo]');
  await d.tocar(c.x, c.y);
  await p.waitForSelector('.cm-content');
  comprobar(await p.isVisible('.cm-content'), 'no se ve el código');
  c = await centro('[data-ir=escena]');
  await d.tocar(c.x, c.y);
  comprobar(await p.isVisible('.lienzo-escena'), 'no se ve la escena');
});

await prueba('con el dedo, todo lo que se pulsa mide al menos 44 píxeles (en la escena, en cada cajón y en las ventanas)', TACTILES, async (p, a) => {
  const revisar = async (donde) => {
    const mal = await botonesPequenos(p);
    comprobar(mal.length === 0, `${donde}: ${mal.length} cosas de menos de 44 px: ${mal.slice(0, 5).join(' · ')}`);
  };
  await revisar('la escena');
  for (const cajon of ['objetos', 'propiedades', 'consola', 'juego']) {
    await estado(p, (c) => window.chispa.abrirCajon(c), cajon);
    await p.waitForTimeout(240);
    await revisar(`el cajón «${cajon}»`);
  }
  // Con un objeto seleccionado, sus propiedades
  await estado(p, () => {
    window.chispa.estado.seleccionarIndice(0);
    window.chispa.abrirCajon('propiedades');
  });
  await p.waitForTimeout(240);
  await revisar('las propiedades de un objeto');
  // El código
  await estado(p, () => {
    window.chispa.abrirCajon('');
    window.chispa.estado.abrirScript(Object.keys(window.chispa.estado.proyecto.scripts)[0]);
  });
  await p.waitForSelector('.cm-content');
  await revisar('el código');
  // El menú de añadir y las ventanas más usadas
  await estado(p, () => window.chispa.estado.activarPestana('escena'));
  await p.tap('.boton-anadir');
  await revisar('el menú de añadir');
  await p.tap('.boton-anadir');
  if (a.disposicion === 'movil') {
    await p.tap('.boton-mas');
    await revisar('el menú «Más»');
    await p.tap('.menu-flotante .opcion-menu:has-text("Ayuda")');
  } else await p.tap('[aria-label^="Ayuda"]');
  await p.waitForSelector('.dialogo');
  await revisar('la ventana de ayuda');
  await p.tap('.dialogo-botones .principal');
  await estado(p, () => window.chispa.revisarDispositivo());
});

await prueba('con el dedo, las ventanas del editor (plantillas, ajustes, sonidos, música, dibujos, pantallas, color, píxeles) caben y sus botones miden 44 píxeles', TACTILES, async (p, a) => {
  const problemas = [];
  const revisar = async (donde) => {
    const mal = await botonesPequenos(p);
    if (mal.length) problemas.push(`${donde}: ${mal.length} de menos de 44 px (${mal.slice(0, 3).join(' · ')})`);
    const fuera = await loQueSeSale(p);
    if (fuera.length) problemas.push(`${donde}: se sale ${fuera.slice(0, 3).join(', ')}`);
    // El último botón de la ventana se puede pulsar (no queda tapado ni fuera)
    const boton = await estado(p, () => {
      const d = document.querySelector('.dialogo');
      const ultimo = d && [...d.querySelectorAll('.dialogo-botones button')].pop();
      if (!ultimo) return null;
      ultimo.scrollIntoView({ block: 'nearest' });
      const b = ultimo.getBoundingClientRect();
      const encima = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return { dentro: b.bottom <= innerHeight + 1 && b.top >= 0, libre: encima === ultimo || ultimo.contains(encima) };
    });
    if (boton && !(boton.dentro && boton.libre)) problemas.push(`${donde}: el botón de abajo no se puede pulsar`);
  };
  const cerrar = async () => {
    await p.keyboard.press('Escape');
    await p.waitForTimeout(80);
    if (await p.isVisible('.dialogo')) await p.keyboard.press('Escape');
  };
  // Las pestañas del panel de la izquierda
  await estado(p, () => window.chispa.abrirCajon('objetos'));
  await p.waitForTimeout(250);
  for (const pestana of ['Proyecto', 'Biblioteca', 'Escena']) {
    await p.tap(`.panel-izquierdo .pestana-panel:has-text("${pestana}")`);
    await p.waitForTimeout(120);
    await revisar(`la pestaña ${pestana}`);
    const izquierda = await estado(p, () => document.querySelector('.panel-izquierdo').getBoundingClientRect().left - document.querySelector('.cuerpo-editor').getBoundingClientRect().left);
    if (Math.abs(izquierda) > 1) problemas.push(`la pestaña ${pestana}: el panel sale desplazado (${izquierda} px)`);
  }
  // Las ventanas que se abren desde «Proyecto»
  await p.tap('.panel-izquierdo .pestana-panel:has-text("Proyecto")');
  for (const [boton, nombre] of [['[aria-label^="Hacer un efecto de sonido"]', 'el generador de sonidos'], ['[aria-label^="Nueva canción"]', 'el editor de música'], ['[aria-label^="Dibujos listos"]', 'los recursos listos'], ['[aria-label^="Pantallas listas"]', 'las pantallas listas'], ['[aria-label^="Dibujar"]', 'el editor de píxeles']]) {
    if (!(await p.locator(boton).count())) {
      problemas.push(`no encuentro el botón de ${nombre}`);
      continue;
    }
    await p.locator(boton).first().scrollIntoViewIfNeeded();
    await p.locator(boton).first().tap();
    await p.waitForSelector('.dialogo');
    await p.waitForTimeout(150);
    await revisar(nombre);
    await cerrar();
  }
  await estado(p, () => window.chispa.abrirCajon(''));
  await p.waitForTimeout(350);
  // Proyecto nuevo (las plantillas), Ajustes y Exportar
  for (const [metodo, nombre] of [['nuevo', 'las plantillas'], ['exportar', 'exportar']]) {
    await estado(p, (m) => void window.chispa[m](), metodo);
    await p.waitForSelector('.dialogo');
    await p.waitForTimeout(150);
    await revisar(nombre);
    await cerrar();
  }
  // El selector de color (desde las propiedades de un objeto)
  await estado(p, () => {
    window.chispa.estado.seleccionarIndice(0);
    window.chispa.abrirCajon('propiedades');
  });
  await p.waitForTimeout(250);
  await p.locator('.inspector .selector-color').first().tap();
  await p.waitForSelector('.selector-color-ventana');
  await revisar('el selector de color');
  comprobar(problemas.length === 0, problemas.join(' ‖ '));
});

await prueba('escena con el dedo: tocar selecciona, arrastrar mueve, tocar el fondo quita la selección y arrastrarlo mueve la vista', TACTILES, async (p, a, d) => {
  let s = await sitioDe(p, 0);
  await d.tocar(s.x, s.y);
  comprobar((await estado(p, () => window.chispa.estado.seleccion?.indice)) === 0, 'tocar el objeto no lo ha seleccionado');
  const antes = await estado(p, () => ({ x: window.chispa.estado.escena.objetos[0].x, y: window.chispa.estado.escena.objetos[0].y }));
  comprobar(antes.x === 480 && antes.y === 270, 'un toque suelto ha movido el objeto');
  // Arrastrar
  await d.arrastrar(s.x, s.y, s.x + 60, s.y - 40);
  const despues = await estado(p, () => ({ x: window.chispa.estado.escena.objetos[0].x, y: window.chispa.estado.escena.objetos[0].y }));
  comprobar(despues.x > antes.x && despues.y > antes.y, `arrastrar no ha movido el objeto (${JSON.stringify(despues)})`);
  // Se deshace de una vez (el botón de arriba)
  await p.tap('[aria-label^="Deshacer"]');
  const vuelto = await estado(p, () => ({ x: window.chispa.estado.escena.objetos[0].x, y: window.chispa.estado.escena.objetos[0].y }));
  comprobar(vuelto.x === 480 && vuelto.y === 270, 'deshacer no lo ha devuelto a su sitio de una vez');
  // Arrastrar el fondo mueve la vista (y no selecciona con un rectángulo)
  s = await sitioDe(p, 0);
  const fondo = { x: s.lienzo.x + 30, y: s.lienzo.y + 40 };
  const camara0 = await estado(p, () => ({ x: window.chispa.vistaEscena.camara.x, y: window.chispa.vistaEscena.camara.y }));
  await d.arrastrar(fondo.x, fondo.y, fondo.x + 50, fondo.y + 30);
  const camara1 = await estado(p, () => ({ x: window.chispa.vistaEscena.camara.x, y: window.chispa.vistaEscena.camara.y }));
  comprobar(camara0.x !== camara1.x || camara0.y !== camara1.y, 'arrastrar el fondo con un dedo no mueve la vista');
  comprobar((await estado(p, () => window.chispa.estado.seleccion?.indice)) === 0, 'mover la vista no tiene que quitar la selección');
  // Un toque suelto en el fondo quita la selección
  await d.tocar(fondo.x, fondo.y);
  comprobar((await estado(p, () => window.chispa.estado.seleccion)) === null, 'tocar el fondo no quita la selección');
});

await prueba('escena con dos dedos: pellizcar acerca y aleja, y moverlos juntos mueve la vista sin tocar los objetos', TACTILES, async (p, a, d) => {
  const s = await sitioDe(p, 0);
  const c = { x: s.lienzo.x + s.lienzo.ancho / 2, y: s.lienzo.y + s.lienzo.alto / 2 };
  const leer = () => estado(p, () => ({ zoom: window.chispa.vistaEscena.camara.zoom, x: window.chispa.vistaEscena.camara.x, y: window.chispa.vistaEscena.camara.y, objeto: JSON.stringify(window.chispa.estado.escena.objetos[0]), pasos: window.chispa.estado.puedeDeshacer }));
  const v0 = await leer();
  // Separar los dedos: se acerca
  await d.dos({ x: c.x - 30, y: c.y }, { x: c.x + 30, y: c.y }, { x: c.x - 90, y: c.y }, { x: c.x + 90, y: c.y });
  const v1 = await leer();
  comprobar(v1.zoom > v0.zoom * 2, `separar los dedos no acerca la vista (${v0.zoom} → ${v1.zoom})`);
  // Juntarlos: se aleja
  await d.dos({ x: c.x - 90, y: c.y }, { x: c.x + 90, y: c.y }, { x: c.x - 30, y: c.y }, { x: c.x + 30, y: c.y });
  const v2 = await leer();
  comprobar(Math.abs(v2.zoom - v0.zoom) < v0.zoom * 0.15, `juntar los dedos no la deja como estaba (${v0.zoom} → ${v2.zoom})`);
  // Los dos a la vez hacia un lado: se mueve la vista sin cambiar el zoom
  await d.dos({ x: c.x - 40, y: c.y }, { x: c.x + 40, y: c.y }, { x: c.x - 40 + 70, y: c.y + 50 }, { x: c.x + 40 + 70, y: c.y + 50 });
  const v3 = await leer();
  comprobar(Math.abs(v3.zoom - v2.zoom) < v2.zoom * 0.05 && (v3.x !== v2.x || v3.y !== v2.y), 'mover los dos dedos juntos no mueve la vista');
  // Nada de esto ha tocado el objeto que había debajo, ni ha dejado pasos de deshacer
  comprobar(v3.objeto === v0.objeto && v3.pasos === v0.pasos, 'el gesto de dos dedos ha cambiado el objeto de debajo');
});

await prueba('escena: dejar el dedo quieto abre el menú del objeto (duplicar, borrar, su código) y el de la escena', TACTILES, async (p, a, d) => {
  const s = await sitioDe(p, 0);
  await d.dejar(s.x, s.y);
  await p.waitForSelector('.menu-flotante');
  const opciones = await p.locator('.menu-flotante .opcion-menu').allInnerTexts();
  comprobar(['Abrir su código', 'Duplicar', 'Copiar', 'Borrar'].every((t) => opciones.some((o) => o.includes(t))), `faltan opciones en el menú: ${opciones}`);
  comprobar((a.disposicion === 'escritorio') === !opciones.some((o) => o.includes('Propiedades')), 'en móvil y tablet el menú lleva «Propiedades»');
  comprobar((await estado(p, () => JSON.stringify([window.chispa.estado.escena.objetos[0].x, window.chispa.estado.escena.objetos[0].y]))) === '[480,270]', 'la pulsación larga ha movido el objeto');
  const cabe = await estado(p, () => {
    const b = document.querySelector('.menu-flotante').getBoundingClientRect();
    return b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight;
  });
  comprobar(cabe, 'el menú se sale de la pantalla');
  await p.tap('.menu-flotante .opcion-menu:has-text("Duplicar")');
  comprobar((await estado(p, () => window.chispa.estado.escena.objetos.length)) === 2, 'Duplicar no ha duplicado');
  comprobar(!(await p.isVisible('.menu-flotante')), 'el menú no se cierra al elegir');
  // Propiedades abre el cajón
  if (a.disposicion !== 'escritorio') {
    const q = await sitioDe(p, 0);
    await d.dejar(q.x, q.y);
    await p.tap('.menu-flotante .opcion-menu:has-text("Propiedades")');
    await p.waitForTimeout(250);
    comprobar((await estado(p, () => window.chispa.cajon)) === 'propiedades', '«Propiedades» no abre el cajón');
    await estado(p, () => window.chispa.abrirCajon(''));
    await p.waitForTimeout(250);
  }
  // En el fondo: el menú de la escena; tocar fuera lo cierra
  const fondo = { x: s.lienzo.x + 24, y: s.lienzo.y + 30 };
  await d.dejar(fondo.x, fondo.y);
  await p.waitForSelector('.menu-flotante');
  comprobar((await p.locator('.menu-flotante .opcion-menu').allInnerTexts()).some((o) => o.includes('Pegar')), 'el menú de la escena no tiene «Pegar»');
  await d.tocar(s.lienzo.x + s.lienzo.ancho - 20, s.lienzo.y + s.lienzo.alto - 20);
  await p.waitForTimeout(100);
  comprobar(!(await p.isVisible('.menu-flotante')), 'tocar fuera no cierra el menú');
});

await prueba('sin ratón: lo que era doble clic o arrastrar está en el menú de dejar el dedo (renombrar, cambiar el orden, poner en la escena)', TACTILES, async (p, a, d) => {
  await estado(p, () => {
    const e = window.chispa.estado;
    window.chispa.vistaEscena.anadir('circulo');
    e.seleccionarIndice(0);
    window.chispa.abrirCajon('objetos');
  });
  await p.waitForTimeout(300);
  const fila = async (texto) => {
    const b = await p.locator(`.arbol .nodo:not(.hijo):has-text("${texto}")`).first().boundingBox();
    return { x: b.x + 60, y: b.y + b.height / 2 };
  };
  // Dejar el dedo en la fila del objeto: su menú
  let f = await fila('Cuadrado');
  await d.dejar(f.x, f.y);
  await p.waitForSelector('.menu-flotante');
  const opciones = await p.locator('.menu-flotante .opcion-menu').allInnerTexts();
  comprobar(['Cambiar el nombre', 'Duplicar', 'Subir en la lista', 'Bajar en la lista', 'Borrar'].every((t) => opciones.some((o) => o.includes(t))), `faltan opciones: ${opciones}`);
  // Bajar en la lista (lo que con ratón es arrastrar la fila)
  const antes = await estado(p, () => window.chispa.estado.escena.objetos.map((o) => o.nombre).join());
  await p.tap('.menu-flotante .opcion-menu:has-text("Bajar en la lista")');
  const despues = await estado(p, () => window.chispa.estado.escena.objetos.map((o) => o.nombre).join());
  comprobar(antes !== despues && despues.endsWith('Cuadrado'), `no ha cambiado el orden: ${antes} → ${despues}`);
  // Cambiar el nombre (lo que con ratón es doble clic)
  f = await fila('Cuadrado');
  await d.dejar(f.x, f.y);
  await p.tap('.menu-flotante .opcion-menu:has-text("Cambiar el nombre")');
  await p.waitForSelector('.dialogo input');
  await p.fill('.dialogo input', 'Heroe');
  await p.tap('.dialogo .principal');
  comprobar((await estado(p, () => window.chispa.estado.escena.objetos.some((o) => o.nombre === 'Heroe'))), 'no se ha cambiado el nombre');
  // Un toque corto sigue seleccionando, sin abrir el menú
  f = await fila('Heroe');
  await d.tocar(f.x, f.y);
  comprobar(!(await p.isVisible('.menu-flotante')), 'un toque corto abre el menú');
  comprobar((await estado(p, () => window.chispa.estado.seleccionado?.nombre)) === 'Heroe', 'un toque corto no selecciona');
  // Una imagen del proyecto: «Poner en la escena» (lo que con ratón es arrastrarla)
  await estado(p, () => window.chispa.estado.anadirRecursoListo('dibujo', 'moneda'));
  await p.tap('.panel-izquierdo .pestana-panel:has-text("Proyecto")');
  await p.waitForTimeout(150);
  const imagen = await p.locator('.imagen-recurso').first();
  if (await imagen.count()) {
    await imagen.scrollIntoViewIfNeeded();
    const b = await imagen.boundingBox();
    const cuantos = await estado(p, () => window.chispa.estado.escena.objetos.length);
    await d.dejar(b.x + b.width / 2, b.y + 20);
    await p.waitForSelector('.menu-flotante');
    await p.tap('.menu-flotante .opcion-menu:has-text("Poner en la escena")');
    comprobar((await estado(p, () => window.chispa.estado.escena.objetos.length)) === cuantos + 1, '«Poner en la escena» no crea el objeto');
  } else throw new Error('no hay ninguna imagen en el proyecto para probar');
});

await prueba('el código con el dedo: tocar un error subrayado lo explica, y dejar el dedo en un comando enseña su ficha', TACTILES, async (p, a, d) => {
  await estado(p, () => {
    const e = window.chispa.estado;
    e.cambiarCodigo('cuadrado.chs', 'cuando empieza:\n    mostrar(vidaa)\n    yo.rotar(90)\n');
    e.abrirScript('cuadrado.chs');
  });
  await p.waitForSelector('.cm-lintRange-error', { timeout: 8000 });
  const error = await p.locator('.cm-lintRange-error').first().boundingBox();
  await d.tocar(error.x + error.width / 2, error.y + error.height / 2);
  await p.waitForSelector('.bocadillo-ayuda');
  comprobar((await p.innerText('.bocadillo-ayuda')).includes('vidaa'), 'el bocadillo no explica el error');
  const cabe = () => estado(p, () => {
    const c = document.querySelector('.bocadillo-ayuda').getBoundingClientRect();
    return c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight;
  });
  comprobar(await cabe(), 'el bocadillo del error se sale de la pantalla');
  // Dejar el dedo sobre «rotar»: su ficha
  const donde = await estado(p, () => {
    const v = window.chispa.editorCodigo.pestanas.get('cuadrado.chs').vista;
    const pos = v.state.doc.toString().indexOf('rotar') + 2;
    const c = v.coordsAtPos(pos);
    return { x: c.left, y: (c.top + c.bottom) / 2 };
  });
  await d.dejar(donde.x, donde.y, 700);
  await p.waitForSelector('.bocadillo-ayuda .ficha-ayuda');
  comprobar((await p.innerText('.bocadillo-ayuda')).includes('rotar'), 'no sale la ficha de rotar');
  comprobar(await cabe(), 'la ficha se sale de la pantalla');
});

await prueba('editor de música y pluma con el dedo: un toque pone una nota del largo elegido, y hay botón para la curva', TACTILES, async (p, a, d) => {
  await estado(p, () => window.chispa.abrirCajon('objetos'));
  await p.waitForTimeout(250);
  await p.tap('.panel-izquierdo .pestana-panel:has-text("Proyecto")');
  await p.locator('[aria-label^="Nueva canción"]').first().tap();
  await p.waitForSelector('.rejilla-musica');
  await p.selectOption('[aria-label="Largo de las notas nuevas"]', '4');
  await p.locator('.rejilla-musica').scrollIntoViewIfNeeded();
  // Un sitio de la rejilla que se vea (no debajo de las teclas del piano, que se quedan pegadas a la izquierda)
  const sitio = await estado(p, () => {
    const r = document.querySelector('.rejilla-musica').getBoundingClientRect();
    const teclas = document.querySelector('.teclas-musica').getBoundingClientRect();
    let marco = document.querySelector('.rejilla-musica').parentElement;
    while (marco && !/(auto|scroll)/.test(getComputedStyle(marco).overflowY + getComputedStyle(marco).overflowX)) marco = marco.parentElement;
    const m = marco.getBoundingClientRect();
    return { x: Math.max(r.left, teclas.right, m.left) + 30, y: Math.max(r.top, m.top) + 40 };
  });
  await d.tocar(sitio.x, sitio.y);
  await p.waitForTimeout(200);
  await p.tap('.dialogo-botones .principal');
  const notas = await estado(p, () => Object.values(window.chispa.estado.proyecto.canciones ?? {}).flatMap((c) => c.pistas.flatMap((x) => x.notas)));
  comprobar(notas.length === 1 && notas[0].largo === 4, `la nota puesta con el dedo: ${JSON.stringify(notas)}`);
  // La pluma: con ratón, la curva es un doble clic en el punto; sin ratón, un botón
  await estado(p, () => {
    window.chispa.abrirCajon('');
    window.chispa.estado.activarPestana('escena');
  });
  await p.waitForTimeout(300);
  await p.tap('.boton-anadir');
  await p.tap('.opcion-menu:has-text("Dibujar con la pluma")');
  await p.waitForSelector('.editor-pluma canvas');
  const lienzo = await p.locator('.editor-pluma canvas').boundingBox();
  for (const [x, y] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.7]]) await d.tocar(lienzo.x + lienzo.width * x, lienzo.y + lienzo.height * y);
  comprobar(await p.isVisible('[data-accion="curva"]'), 'no hay botón para la curva');
  await p.tap('[data-accion="curva"]');
  await p.tap('.dialogo-botones .principal');
  const puntos = await estado(p, () => window.chispa.estado.seleccionado?.sprite?.puntos ?? []);
  comprobar(puntos.length === 3, `con el dedo no se han puesto los tres puntos: ${JSON.stringify(puntos)}`);
  comprobar(puntos.some((q) => q.entrada || q.salida || q.e || q.s || Object.keys(q).length > 2), `el botón de la curva no ha curvado el punto: ${JSON.stringify(puntos)}`);
});

await prueba('la ayuda sale al tocar: dejar el dedo sobre un botón enseña su ayuda y NO lo pulsa', TACTILES, async (p, a, d) => {
  const b = await p.locator('[aria-label^="Ver la cuadrícula"]').boundingBox();
  const antes = await estado(p, () => window.chispa.vistaEscena.verCuadricula);
  await d.dejar(b.x + b.width / 2, b.y + b.height / 2, 700);
  comprobar(await p.isVisible('.bocadillo-ayuda'), 'no ha salido el bocadillo de ayuda');
  comprobar((await p.innerText('.bocadillo-ayuda')).includes('cuadrícula'), 'el bocadillo no dice la ayuda del botón');
  comprobar((await estado(p, () => window.chispa.vistaEscena.verCuadricula)) === antes, 'dejar el dedo ha pulsado el botón');
  const cabe = await estado(p, () => {
    const c = document.querySelector('.bocadillo-ayuda').getBoundingClientRect();
    return c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight;
  });
  comprobar(cabe, 'el bocadillo se sale de la pantalla');
  // Un toque normal sí pulsa, y quita el bocadillo
  await d.tocar(b.x + b.width / 2, b.y + b.height / 2);
  comprobar((await estado(p, () => window.chispa.vistaEscena.verCuadricula)) !== antes, 'un toque normal no pulsa el botón');
  comprobar(!(await p.isVisible('.bocadillo-ayuda')), 'el bocadillo no se quita al tocar otra cosa');
  // Lo que no es un botón (el zoom de la escena) enseña su ayuda con un toque
  const z = await p.locator('.etiqueta-zoom').boundingBox();
  await d.tocar(z.x + z.width / 2, z.y + z.height / 2);
  comprobar(await p.isVisible('.bocadillo-ayuda'), 'tocar una etiqueta con ayuda no la enseña');
});

await prueba('campo de texto del juego: al tocarlo se enfoca un campo de verdad (sale el teclado) y lo que se escribe llega al juego', TACTILES, async (p, a, d) => {
  await estado(p, () => {
    const e = window.chispa.estado;
    const proyecto = JSON.parse(e.aJSON());
    e.abrir({ ...proyecto, scripts: { ...proyecto.scripts, 'campo.chs': 'cuando cambia:\n    juego.nombre = yo.valor\n' }, datos: { nombre: '' } });
    window.chispa.vistaEscena.anadirControl('campo');
    e.cambiarPropiedad(e.seleccion, 'script', 'campo.chs');
    e.cambiarPropiedad(e.seleccion, 'nombre', 'Campo');
  });
  await p.tap('.controles-juego .ejecutar');
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(300);
  comprobar((await estado(p, () => window.chispa.cajon)) === 'juego', 'al ejecutar en el móvil no se pasa a la pantalla del juego');
  // Dónde está el campo en la pantalla: en el centro de la pantalla del juego
  const lienzo = await p.locator('.lienzo-juego').boundingBox();
  comprobar(lienzo.width > 200 && lienzo.x >= 0 && lienzo.x + lienzo.width <= a.ancho + 1, 'el juego no cabe en la pantalla');
  const c = { x: lienzo.x + lienzo.width / 2, y: lienzo.y + lienzo.height / 2 };
  await d.tocar(c.x, c.y);
  await p.waitForTimeout(120);
  const foco = await estado(p, () => ({ clase: document.activeElement?.className, etiqueta: document.activeElement?.tagName, letra: parseFloat(getComputedStyle(document.activeElement).fontSize) }));
  comprobar(foco.etiqueta === 'INPUT' && foco.clase === 'teclado-chispa', `al tocar el campo no se ha enfocado el campo de la página (está enfocado ${foco.etiqueta}.${foco.clase})`);
  comprobar(foco.letra >= 16, 'el campo invisible tiene la letra pequeña: Safari acercaría la página');
  // Escribir (como lo manda un teclado de pantalla: sin teclas, cambiando el texto del campo)
  await p.keyboard.insertText('Ana');
  await p.keyboard.insertText('ñ');
  await p.waitForTimeout(150);
  comprobar((await estado(p, () => window.chispa.vistaJuego.datoDelJuego('nombre'))) === 'Anañ', `lo escrito no llega al juego: «${await estado(p, () => window.chispa.vistaJuego.datoDelJuego('nombre'))}»`);
  await p.keyboard.press('Backspace');
  await p.waitForTimeout(120);
  comprobar((await estado(p, () => window.chispa.vistaJuego.datoDelJuego('nombre'))) === 'Ana', 'borrar no borra una letra');
  // El texto predictivo cambia la palabra entera de golpe
  await estado(p, () => {
    const t = document.activeElement;
    t.value = 'Analía';
    t.dispatchEvent(new InputEvent('input', { inputType: 'insertReplacementText', data: 'Analía' }));
  });
  await p.waitForTimeout(120);
  comprobar((await estado(p, () => window.chispa.vistaJuego.datoDelJuego('nombre'))) === 'Analía', 'cambiar la palabra entera (texto predictivo) no llega bien');
  // Intro termina de escribir y quita el teclado
  await p.keyboard.press('Enter');
  await p.waitForTimeout(150);
  comprobar((await estado(p, () => document.activeElement?.className)) !== 'teclado-chispa', 'Intro no quita el teclado');
  // Tocar fuera del campo no lo saca
  await d.tocar(lienzo.x + 12, lienzo.y + 12);
  await p.waitForTimeout(100);
  comprobar((await estado(p, () => document.activeElement?.className)) !== 'teclado-chispa', 'tocar fuera del campo saca el teclado');
});

await prueba('el teclado de pantalla no tapa el código: el editor se encoge a lo que se ve y la línea del cursor queda a la vista', [aparato('movil pequeno'), aparato('movil grande'), aparato('tablet vertical')], async (p, a, d) => {
  await estado(p, () => {
    const e = window.chispa.estado;
    e.cambiarCodigo('cuadrado.chs', Array.from({ length: 60 }, (_, i) => `# línea ${i + 1}`).join('\n') + '\n');
    e.abrirScript('cuadrado.chs');
  });
  await p.waitForSelector('.cm-content');
  // Tocar el código lo enfoca; al salir el teclado, Android encoge la ventana (aquí se hace a mano)
  const codigo = await p.locator('.cm-scroller').boundingBox();
  await d.tocar(codigo.x + 120, codigo.y + codigo.height - 30);
  await p.waitForTimeout(150);
  comprobar(await estado(p, () => !!document.activeElement?.closest('.cm-editor')), 'tocar el código no lo enfoca');
  const altoTeclado = Math.round(a.alto * 0.42);
  await p.setViewportSize({ width: a.ancho, height: a.alto - altoTeclado });
  await p.waitForTimeout(250);
  const e = await estado(p, () => {
    const editor = document.getElementById('editor');
    const cursor = document.querySelector('.cm-cursor-primary, .cm-cursor')?.getBoundingClientRect() ?? document.querySelector('.cm-activeLine').getBoundingClientRect();
    return { teclado: editor.classList.contains('con-teclado'), nav: getComputedStyle(document.querySelector('.navegacion-abajo')).display, alto: editor.getBoundingClientRect().height, abajo: editor.getBoundingClientRect().bottom, cursor: { top: cursor.top, bottom: cursor.bottom }, visible: innerHeight, disposicion: window.chispa.dispositivo.disposicion };
  });
  comprobar(e.teclado, 'no se ha notado que ha salido el teclado');
  comprobar(e.nav === 'none', 'con el teclado fuera, la barra de abajo tiene que quitarse');
  comprobar(e.abajo <= e.visible + 1, `el editor (${e.abajo}) sigue por debajo de lo que se ve (${e.visible})`);
  comprobar(e.cursor.top >= 0 && e.cursor.bottom <= e.visible + 1, `la línea del cursor queda tapada por el teclado (${JSON.stringify(e.cursor)}, se ven ${e.visible})`);
  comprobar(e.disposicion === a.disposicion, `al salir el teclado el aparato ha pasado a «${e.disposicion}»`);
  // Al quitarse el teclado, todo vuelve
  await p.setViewportSize({ width: a.ancho, height: a.alto });
  await p.waitForTimeout(250);
  comprobar(await estado(p, () => !document.getElementById('editor').classList.contains('con-teclado') && getComputedStyle(document.querySelector('.navegacion-abajo')).display !== 'none'), 'al quitarse el teclado no vuelve la barra de abajo');
});

await prueba('girar la pantalla o cambiar el tamaño de la ventana no pierde el proyecto ni la partida', [aparato('movil grande'), aparato('tablet vertical'), aparato('escritorio')], async (p, a) => {
  await estado(p, () => {
    const e = window.chispa.estado;
    e.cambiarCodigo('cuadrado.chs', 'cuando empieza:\n    juego.cuenta = 0\ncuando cada fotograma:\n    juego.cuenta += 1\n');
    e.moverObjeto(e.seleccion ?? { tipo: 'escena', escena: e.escenaActual, indice: 0 }, 123, 45);
  });
  await estado(p, () => window.chispa.ejecutar());
  await p.waitForFunction(() => document.querySelector('.estado-juego')?.textContent?.startsWith('Jugando'));
  await p.waitForTimeout(300);
  const antes = await estado(p, () => ({ proyecto: window.chispa.estado.aJSON(), cuenta: window.chispa.vistaJuego.datoDelJuego('cuenta') }));
  comprobar(antes.cuenta > 2, 'el juego no está en marcha');
  // Girar, estrechar hasta el tamaño de un móvil, ensanchar hasta el escritorio y volver
  for (const [ancho, alto] of [[a.alto, a.ancho], [360, 640], [1440, 860], [700, 500], [a.ancho, a.alto]]) {
    await p.setViewportSize({ width: ancho, height: alto });
    await p.waitForTimeout(400);
    const mal = await loQueSeSale(p);
    comprobar(mal.length === 0, `a ${ancho}×${alto} se sale: ${mal.slice(0, 3).join(', ')}`);
    const lienzo = await estado(p, () => {
      const b = document.querySelector('.lienzo-juego')?.getBoundingClientRect();
      return b ? { ancho: b.width, alto: b.height } : null;
    });
    comprobar(lienzo && lienzo.ancho > 50 && lienzo.alto > 30, `a ${ancho}×${alto} el juego se queda sin pantalla: ${JSON.stringify(lienzo)}`);
  }
  const despues = await estado(p, () => ({ proyecto: window.chispa.estado.aJSON(), cuenta: window.chispa.vistaJuego.datoDelJuego('cuenta'), estado: window.chispa.vistaJuego.estadoJuego }));
  comprobar(despues.proyecto === antes.proyecto, 'el proyecto ha cambiado al girar');
  comprobar(despues.estado === 'jugando' && despues.cuenta > antes.cuenta, `la partida no ha seguido (${antes.cuenta} → ${despues.cuenta}, ${despues.estado})`);
});

await prueba('un ordenador con pantalla táctil: los gestos funcionan con el dedo sin dejar de funcionar el ratón, y «Botones grandes: Siempre» los agranda', [aparato('escritorio')], async (p, a) => {
  // (un contexto con ratón Y dedo, como un portátil táctil)
  const contexto = await navegador.newContext({ viewport: { width: a.ancho, height: a.alto }, hasTouch: true });
  const q = await contexto.newPage();
  try {
    await q.goto(direccion + '?limpio');
    await q.waitForFunction(() => window.chispa);
    const d = dedos(await contexto.newCDPSession(q));
    comprobar((await estado(q, () => window.chispa.dispositivo.disposicion)) === 'escritorio', 'con ratón y pantalla táctil sigue siendo el escritorio');
    const s = await sitioDe(q, 0);
    const zoom0 = await estado(q, () => window.chispa.vistaEscena.camara.zoom);
    await d.dos({ x: s.x - 30, y: s.y + 90 }, { x: s.x + 30, y: s.y + 90 }, { x: s.x - 90, y: s.y + 90 }, { x: s.x + 90, y: s.y + 90 });
    comprobar((await estado(q, () => window.chispa.vistaEscena.camara.zoom)) > zoom0 * 2, 'pellizcar no funciona en el escritorio táctil');
    await estado(q, () => window.chispa.vistaEscena.encuadrar(false));
    // El ratón, como siempre: arrastrar mueve el objeto
    const r = await sitioDe(q, 0);
    await q.mouse.move(r.x, r.y);
    await q.mouse.down();
    await q.mouse.move(r.x + 80, r.y - 60, { steps: 6 });
    await q.mouse.up();
    comprobar((await estado(q, () => window.chispa.estado.escena.objetos[0].x)) !== 480, 'el ratón ya no mueve el objeto');
    // Ajustes > Botones grandes > Siempre
    await q.click('button:has-text("Ajustes")');
    await q.click('[data-botones="si"]');
    comprobar(await estado(q, () => document.getElementById('editor').classList.contains('tactil')), '«Siempre» no pone los botones grandes');
    const alto = await estado(q, () => document.querySelector('.barra-escena .boton-icono').getBoundingClientRect().height);
    comprobar(alto >= 44, `los botones miden ${alto} px`);
    await q.click('[data-botones="no"]');
    comprobar(await estado(q, () => !document.getElementById('editor').classList.contains('tactil')), '«Nunca» no los devuelve a su tamaño');
    comprobar((await estado(q, () => document.querySelector('.barra-escena .boton-icono').getBoundingClientRect().height)) < 44, 'con «Nunca» siguen grandes');
  } finally {
    await contexto.close();
  }
});

await navegador.close();
await new Promise((r) => servidor.httpServer.close(r));
console.log(fallos ? `\n${fallos} de ${hechas} prueba(s) han fallado.` : `\nLas ${hechas} pruebas en móviles y tabletas han pasado.`);
process.exit(fallos ? 1 : 0);
