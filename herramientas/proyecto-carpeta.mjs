/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PROYECTO ↔ CARPETA: separa un proyecto .chispa.json en archivos sueltos y lo vuelve a juntar.
 *
 *   node herramientas/proyecto-carpeta.mjs desmontar juego.chispa.json carpeta/
 *   node herramientas/proyecto-carpeta.mjs montar carpeta/
 *
 * En la carpeta quedan:
 *   proyecto.json   → todo menos el código (escenas, plantillas, imágenes...)
 *   scripts/*.chs   → cada script en su archivo, para leerlo, compararlo o guardarlo en git
 * Al montar se crea carpeta/<nombre-de-la-carpeta>.chispa.json, que se abre en el editor.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';

const [orden, a, b] = process.argv.slice(2);

function desmontar(archivo, carpeta) {
  const p = JSON.parse(readFileSync(archivo, 'utf8'));
  mkdirSync(join(carpeta, 'scripts'), { recursive: true });
  for (const [nombre, codigo] of Object.entries(p.scripts ?? {})) writeFileSync(join(carpeta, 'scripts', nombre), codigo);
  const { scripts, ...resto } = p;
  writeFileSync(join(carpeta, 'proyecto.json'), JSON.stringify({ ...resto, scripts: Object.keys(scripts ?? {}) }, null, 2) + '\n');
  console.log(`Desmontado en ${carpeta}: ${Object.keys(scripts ?? {}).length} scripts.`);
}

function montar(carpeta) {
  const base = JSON.parse(readFileSync(join(carpeta, 'proyecto.json'), 'utf8'));
  const dir = join(carpeta, 'scripts');
  const nombres = Array.isArray(base.scripts) && base.scripts.length ? base.scripts : existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.chs')).sort() : [];
  const scripts = {};
  for (const n of nombres) scripts[n] = readFileSync(join(dir, n), 'utf8');
  const salida = join(carpeta, `${basename(carpeta.replace(/[\\/]+$/, ''))}.chispa.json`);
  writeFileSync(salida, JSON.stringify({ ...base, scripts }, null, 2) + '\n');
  console.log(`Montado ${salida}: ${nombres.length} scripts.`);
}

if (orden === 'desmontar' && a && b) desmontar(a, b);
else if (orden === 'montar' && a) montar(a);
else {
  console.log('Uso:\n  node herramientas/proyecto-carpeta.mjs desmontar juego.chispa.json carpeta/\n  node herramientas/proyecto-carpeta.mjs montar carpeta/');
  process.exit(1);
}
