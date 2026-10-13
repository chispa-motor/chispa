/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PRUEBA DE «PROGRAMAR JUNTOS» EN NAVEGADORES DE VERDAD: npm run pruebas:juntos
 *
 * Arranca el servidor de salas en tu ordenador (servidor-salas, con wrangler), compila el editor
 * apuntando a él y abre DOS editores a la vez: uno de ordenador (Ana) y uno de móvil con el dedo
 * (Beto). Ana crea una sala, Beto entra con el enlace, y se comprueba que lo que hace cada uno le
 * llega al otro: objetos, código (con el cursor del otro a la vista), deshacer solo lo tuyo, el
 * candado y sacar a alguien de la sala.
 *
 * La primera vez hay que instalar el servidor: cd servidor-salas && npm install
 */
import { chromium, devices } from 'playwright';
import { build, preview } from 'vite';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const SERVIDOR = 'http://127.0.0.1:8787';
const raiz = process.cwd();

async function servidorVivo() {
  try {
    return (await fetch(SERVIDOR)).ok;
  } catch {
    return false;
  }
}

// 1. El servidor de salas (si no está ya en marcha)
let wrangler = null;
if (!(await servidorVivo())) {
  const carpeta = join(raiz, 'servidor-salas');
  if (!existsSync(join(carpeta, 'node_modules', 'wrangler'))) {
    console.log('Falta instalar el servidor de salas: cd servidor-salas && npm install');
    process.exit(1);
  }
  wrangler = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['wrangler', 'dev', '--port', '8787', '--ip', '127.0.0.1'], { cwd: carpeta, env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' }, stdio: 'ignore', shell: process.platform === 'win32' });
  for (let i = 0; i < 120 && !(await servidorVivo()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await servidorVivo())) {
    console.log('No he podido arrancar el servidor de salas.');
    wrangler.kill();
    process.exit(1);
  }
}

// 2. El editor, compilado para usar ese servidor
process.env.VITE_SERVIDOR_SALAS = SERVIDOR;
if (!existsSync(join(raiz, 'public', 'reproductor.js'))) execSync('npm run reproductor', { stdio: 'inherit' });
await build({ logLevel: 'error', build: { outDir: 'dist-juntos', emptyOutDir: true } });
const web = await preview({ build: { outDir: 'dist-juntos' }, preview: { port: 4173, strictPort: true }, logLevel: 'silent' });
const direccion = web.resolvedUrls.local[0].replace('127.0.0.1', 'localhost');

const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctxAna = await navegador.newContext({ viewport: { width: 1440, height: 860 } });
await ctxAna.grantPermissions(['clipboard-read', 'clipboard-write']);
const ctxBeto = await navegador.newContext({ ...devices['Pixel 7'] });

let fallos = 0;
const errores = [];
/** CAPTURAS=carpeta guarda fotos de cómo se ve (para revisarlo a ojo). */
const capturar = async (p, nombre) => process.env.CAPTURAS && p.screenshot({ path: join(process.env.CAPTURAS, `${nombre}.png`) });
function comprobar(cond, texto) {
  console.log(`  ${cond ? '✓' : '✗'} ${texto}`);
  if (!cond) fallos++;
}
async function hasta(p, fn, arg, ms = 8000) {
  try {
    await p.waitForFunction(fn, arg, { timeout: ms, polling: 100 });
    return true;
  } catch {
    return false;
  }
}
async function abrir(ctx, url) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await p.goto(url);
  await p.waitForFunction(() => window.chispa);
  return p;
}

console.log(`Programar juntos (editor en ${direccion}, salas en ${SERVIDOR}):`);
try {
  // ── Ana crea la sala
  const ana = await abrir(ctxAna, direccion + '?limpio');
  await ana.click('.boton-juntos');
  await ana.getByRole('button', { name: /Crear una sala/ }).click();
  comprobar(await hasta(ana, () => document.querySelector('.codigo-grande-juntos')?.textContent?.length === 11), 'Ana crea una sala y ve el código');
  const codigo = (await ana.textContent('.codigo-grande-juntos')).replace(/-/g, '');
  const enlace = await ana.evaluate(() => {
    const u = new URL(location.href);
    u.search = '';
    return u.toString();
  });
  await ana.getByRole('button', { name: 'Seguir' }).click();

  // ── Beto entra con el enlace desde el móvil
  const beto = await abrir(ctxBeto, `${enlace}?sala=${codigo}`);
  comprobar(await hasta(beto, () => document.querySelector('.campo-codigo-juntos')?.value.length > 0), 'El enlace abre la ventana para entrar, con el código ya puesto');
  await beto.getByRole('button', { name: /Entrar/ }).tap();
  comprobar(await hasta(beto, () => !!window.chispa.juntos.sesion), 'Beto entra en la sala (con el dedo, en el móvil)');
  const nombreAna = await ana.evaluate(() => window.chispa.estado.proyecto.nombre);
  comprobar(await beto.evaluate((n) => window.chispa.estado.proyecto.nombre === n, nombreAna), 'Beto tiene el proyecto de Ana');
  comprobar(await hasta(ana, () => window.chispa.juntos.sesion.participantes().length === 2), 'Ana ve que Beto ha entrado');
  comprobar(await hasta(ana, () => document.querySelectorAll('.boton-juntos .circulo-juntos').length === 2), 'En la barra de Ana salen los dos');

  // ── Objetos: lo que hace uno le aparece al otro
  await ana.evaluate(() => {
    const e = window.chispa.estado;
    e.crearObjeto('circulo', 200, 100);
    e.renombrar(e.seleccion, 'Pelota');
  });
  comprobar(await hasta(beto, () => window.chispa.estado.escena.objetos.some((o) => o.nombre === 'Pelota')), 'Ana crea «Pelota» y a Beto le aparece');
  await beto.evaluate(() => {
    const e = window.chispa.estado;
    const i = e.escena.objetos.findIndex((o) => o.nombre === 'Pelota');
    e.seleccionar({ tipo: 'escena', escena: e.escenaActual, indice: i });
    e.moverObjeto(e.seleccion, 321, 123);
  });
  comprobar(await hasta(ana, () => window.chispa.estado.escena.objetos.find((o) => o.nombre === 'Pelota')?.x === 321), 'Beto la mueve y a Ana se le mueve');
  comprobar(await hasta(ana, () => window.chispa.juntos.sesion.participantes().some((p) => !p.yo && p.objeto === 'Pelota')), 'Ana ve qué objeto tiene seleccionado Beto');

  // ── Código: escribir a la vez, viendo el cursor del otro
  const archivo = await ana.evaluate(() => {
    const e = window.chispa.estado;
    const a = e.crearScriptSuelto('juntos');
    e.abrirScript(a);
    return a;
  });
  comprobar(await hasta(beto, (a) => a in window.chispa.estado.proyecto.scripts, archivo), 'Ana crea un script y a Beto le aparece');
  await beto.evaluate((a) => window.chispa.estado.abrirScript(a), archivo);
  await beto.waitForSelector('.cm-content');
  await beto.locator('.cm-content').tap();
  await beto.keyboard.press('Control+End');
  await beto.keyboard.type('cuando empieza:\n    mostrar("hola desde el movil")\n', { delay: 15 });
  comprobar(await hasta(ana, (a) => window.chispa.estado.proyecto.scripts[a].includes('hola desde el movil'), archivo), 'Beto escribe en el móvil y Ana lo ve en su script');
  await ana.locator('.cm-content').click();
  await ana.keyboard.press('Control+Home');
  await ana.keyboard.type('# arriba escribe Ana\n', { delay: 15 });
  comprobar(await hasta(beto, (a) => window.chispa.estado.proyecto.scripts[a].startsWith('# arriba escribe Ana'), archivo), 'Escribiendo los dos a la vez no se pierde nada');
  comprobar(await hasta(ana, () => !!document.querySelector('.cm-ySelectionCaret')), 'Ana ve el cursor de Beto en el código');
  comprobar(await hasta(ana, () => document.querySelector('.pestana[data-pestana$=".chs"] .gente-pestana .circulo-juntos') !== null), 'La pestaña del script marca que Beto está ahí');
  await capturar(ana, 'juntos-codigo-ordenador');
  await capturar(beto, 'juntos-codigo-movil');
  const textoAna = await ana.evaluate((a) => window.chispa.estado.proyecto.scripts[a], archivo);
  const textoBeto = await beto.evaluate((a) => window.chispa.estado.proyecto.scripts[a], archivo);
  comprobar(textoAna === textoBeto, 'Los dos tienen exactamente el mismo código');

  // ── Bloques: si Beto ve el script en bloques y Ana escribe, a Beto se le actualizan
  await beto.getByRole('tab', { name: 'Bloques' }).tap();
  await beto.waitForSelector('.area-bloques .bloque');
  const bloquesAntes = await beto.locator('.area-bloques .bloque').count();
  await ana.locator('.cm-content').click();
  await ana.keyboard.press('Control+End');
  await ana.keyboard.type('cuando cada fotograma:\n    yo.x += 1\n', { delay: 10 });
  comprobar(await hasta(beto, (n) => document.querySelectorAll('.area-bloques .bloque').length > n, bloquesAntes), 'Beto lo ve en bloques y, cuando Ana escribe, le salen los bloques nuevos');
  await beto.getByRole('tab', { name: 'Código' }).tap();

  // ── Deshacer solo lo tuyo
  await ana.evaluate(() => window.chispa.estado.activarPestana('escena'));
  await ana.waitForTimeout(700);
  await beto.evaluate(() => window.chispa.estado.crearObjeto('rectangulo', 50, 50));
  await ana.waitForTimeout(700);
  await ana.evaluate(() => window.chispa.estado.crearObjeto('texto', 10, 10));
  await ana.waitForTimeout(300);
  const nAntes = await beto.evaluate(() => window.chispa.estado.escena.objetos.length);
  await ana.evaluate(() => window.chispa.estado.deshacer());
  comprobar(await hasta(beto, (n) => window.chispa.estado.escena.objetos.length === n - 1 && window.chispa.estado.escena.objetos.some((o) => o.nombre.startsWith('Cuadrado')), nAntes), 'Ana deshace y se va SU texto, pero el cuadrado de Beto se queda');

  // ── Candado
  await ana.click('.boton-juntos');
  await ana.waitForTimeout(400);
  await capturar(ana, 'juntos-sala-ordenador');
  await ana.getByLabel(/Poner el candado/).check();
  comprobar(await hasta(beto, () => window.chispa.juntos.sesion?.bloqueada === true), 'Ana pone el candado y Beto se entera');
  // (Carla en otro navegador: en el de Ana entraría como dueña, porque ese navegador guarda la llave de la sala)
  const ctxCarla = await navegador.newContext({ viewport: { width: 1280, height: 720 } });
  const carla = await abrir(ctxCarla, `${enlace}?sala=${codigo}&limpio`);
  await carla.getByRole('button', { name: /Entrar/ }).click();
  comprobar(await hasta(carla, () => /candado/.test(document.querySelector('.error-juntos')?.textContent ?? '')), 'Con candado, alguien nuevo no puede entrar (y se le explica)');
  await ctxCarla.close();
  await ana.getByLabel(/Poner el candado/).uncheck();

  // ── Sacar a alguien
  await ana.getByRole('button', { name: 'Sacar' }).click();
  await ana.locator('.dialogo').last().getByRole('button', { name: 'Sacar' }).click();
  comprobar(await hasta(beto, () => !window.chispa.juntos.sesion && /te ha sacado/.test(document.body.innerText)), 'Ana saca a Beto y a Beto se le explica');
  comprobar(await beto.evaluate((a) => a in window.chispa.estado.proyecto.scripts, archivo), 'Beto se queda con su copia del proyecto');
  comprobar(await hasta(ana, () => window.chispa.juntos.sesion.participantes().length === 1), 'Ana ya no ve a Beto');

  // ── Salir
  await ana.locator('.dialogo').getByRole('button', { name: 'Salir de la sala' }).click();
  comprobar(await hasta(ana, () => !window.chispa.juntos.sesion && !!document.querySelector('.boton-juntos:not(.en-sala)')), 'Ana sale de la sala y el editor vuelve a ser normal');
  await ana.evaluate(() => window.chispa.estado.crearObjeto('circulo', 0, 0));
  comprobar(await ana.evaluate(() => window.chispa.estado.puedeDeshacer), 'Fuera de la sala, deshacer vuelve a funcionar como siempre');

  comprobar(errores.length === 0, `Sin errores en las páginas${errores.length ? `: ${errores.join(' | ')}` : ''}`);
} catch (e) {
  fallos++;
  console.log(`  ✗ ${String(e.message ?? e).split('\n')[0]}`);
} finally {
  await navegador.close();
  await web.close();
  wrangler?.kill();
}
console.log(fallos ? `\n${fallos} prueba(s) han fallado` : '\nTodo bien: se puede programar juntos.');
process.exit(fallos ? 1 : 0);
