/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CAPTURAS PARA EL README: npm run capturas
 *
 * Abre el editor compilado en Chromium (como las pruebas del navegador), hace
 * fotos de verdad y graba un GIF de la Arena de Habilidades jugándose. Se
 * guardan en docs/imagenes/. Hace falta haber compilado antes (npm run build)
 * y tener ffmpeg para el GIF.
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DESTINO = 'docs/imagenes';
mkdirSync(DESTINO, { recursive: true });
const temporal = mkdtempSync(join(tmpdir(), 'chispa-capturas-'));
const servidor = await preview({ preview: { port: 4322, strictPort: false }, logLevel: 'silent' });
const direccion = servidor.resolvedUrls.local[0];
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 1, acceptDownloads: true });
const p = await contexto.newPage();
const esperar = (ms) => p.waitForTimeout(ms);

async function abrirArena() {
  await p.goto(direccion + '?limpio');
  await p.waitForFunction(() => window.chispa);
  const [elegir] = await Promise.all([p.waitForEvent('filechooser'), p.click('button[title^="Abrir un proyecto"]')]);
  await elegir.setFiles('proyectos/arena-de-habilidades/arena-de-habilidades.chispa.json');
  await p.waitForFunction(() => window.chispa.estado.proyecto.nombre === 'Arena de Habilidades');
  await esperar(400);
}

// 1. El editor con la Arena abierta (esperando a que se vaya el aviso de «Abierto»)
await abrirArena();
await esperar(3200);
await p.screenshot({ path: join(DESTINO, 'editor.png') });
console.log('  editor.png');

// 2. El código: el script del jugador
await p.evaluate(() => window.chispa.estado.abrirScript('jugador.chs'));
await esperar(500);
await p.screenshot({ path: join(DESTINO, 'codigo.png') });
console.log('  codigo.png');

// 3. Los bloques: un script pequeño, en modo bloques
await p.goto(direccion + '?limpio');
await p.waitForFunction(() => window.chispa);
await p.evaluate(() => {
  const e = window.chispa.estado;
  const archivo = Object.keys(e.proyecto.scripts)[0];
  e.cambiarCodigo(archivo, 'cuando empieza:\n    juego.puntos = 0\n\ncuando cada fotograma:\n    yo.moverConFlechas(300)\n\ncuando se pulsa "espacio":\n    yo.saltar(700)\n    sonido.efecto("salto")\n\ncuando toco Moneda:\n    destruir(otro)\n    juego.puntos += 1\n');
  e.abrirScript(archivo);
});
await p.click('.modo-script .modo:has-text("Bloques")');
await p.waitForSelector('.editor-bloques .bloque.tipo-evento');
await esperar(400);
await p.screenshot({ path: join(DESTINO, 'bloques.png') });
console.log('  bloques.png');

// 4. El GIF: la Arena exportada, jugándose a pantalla completa
await abrirArena();
await p.click('button:has-text("Exportar")');
const [descarga] = await Promise.all([p.waitForEvent('download'), p.click('.destino-archivo')]);
const pagina = join(temporal, 'arena.html');
await descarga.saveAs(pagina);
const juego = await contexto.newPage();
await juego.setViewportSize({ width: 960, height: 540 });
await juego.goto(pathToFileURL(pagina).href);
await juego.waitForTimeout(600);
await juego.mouse.click(480, 270);
await juego.keyboard.press('Enter');
await juego.waitForTimeout(1500);
const fotogramas = join(temporal, 'f');
mkdirSync(fotogramas);
// Un «jugador»: da vueltas por la arena y usa las habilidades
const pasos = [
  ['d', '1'], ['d', '1'], ['s', '2'], ['s', '1'], ['a', '3'], ['a', '1'], ['w', '4'], ['w', '1'],
  ['d', '1'], ['s', '2'], ['a', '1'], ['w', '3'], ['d', '1'], ['d', '1'], ['s', '1'], ['a', '2'],
];
let n = 0;
for (let vuelta = 0; vuelta < 2; vuelta++) {
  for (const [direccionTecla, habilidad] of pasos) {
    await juego.keyboard.down(direccionTecla);
    await juego.mouse.move(480 + Math.cos(n / 5) * 300, 270 + Math.sin(n / 5) * 180);
    await juego.keyboard.press(habilidad);
    for (let i = 0; i < 2; i++) {
      await juego.screenshot({ path: join(fotogramas, `${String(n++).padStart(4, '0')}.png`) });
      await juego.waitForTimeout(40);
    }
    await juego.keyboard.up(direccionTecla);
  }
}
await juego.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '10', '-i', join(fotogramas, '%04d.png'), '-vf', 'scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', join(DESTINO, 'arena.gif')]);
console.log(`  arena.gif (${n} fotogramas)`);

await navegador.close();
await servidor.close();
rmSync(temporal, { recursive: true, force: true });
console.log(`Capturas guardadas en ${DESTINO}/`);
