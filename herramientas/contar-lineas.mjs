/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Cuenta las líneas del proyecto por partes: npm run lineas
 *
 * Solo cuenta los archivos que están en Git (así nunca entran node_modules,
 * dist ni public/reproductor.js, que se generan solos).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PARTES = [
  ['Lenguaje (src/chispa)', (f) => f.startsWith('src/chispa/')],
  ['Motor (motor, objetos, proyecto, reproductor, sonido, utilidades)', (f) => /^src\/(motor|objetos|proyecto|reproductor|sonido|utilidades)\//.test(f)],
  ['Editor (editor, exportar, main, estilos, index.html)', (f) => /^src\/(editor|exportar)\//.test(f) || /^src\/(main\.ts|estilos\.css|vite-env\.d\.ts)$/.test(f) || f === 'index.html'],
  ['Tests (pruebas y pruebas-navegador)', (f) => f.startsWith('pruebas/') || f.startsWith('pruebas-navegador/')],
  ['Ejemplos, plantillas y recursos', (f) => /^src\/(ejemplos|demos|plantillas|recursos)\//.test(f) || f.startsWith('proyectos/')],
  ['Documentación (.md; MANUAL_CHISPA.md se genera solo)', (f) => f.endsWith('.md')],
  ['Configuración y herramientas', () => true],
];

const archivos = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !f.endsWith('package-lock.json') && !/\.(png|jpg|svg|ico|zip)$/.test(f));

const totales = new Map(PARTES.map(([n]) => [n, { archivos: 0, lineas: 0 }]));
for (const f of archivos) {
  const [nombre] = PARTES.find(([, cumple]) => cumple(f));
  const lineas = readFileSync(f, 'utf8').split('\n').length - (readFileSync(f, 'utf8').endsWith('\n') ? 1 : 0);
  const t = totales.get(nombre);
  t.archivos++;
  t.lineas += lineas;
}
let total = 0;
for (const [nombre, t] of totales) {
  total += t.lineas;
  console.log(`${nombre.padEnd(58)} ${String(t.archivos).padStart(4)} archivos ${String(t.lineas).padStart(7)} líneas`);
}
console.log(`${'TOTAL'.padEnd(58)} ${String(archivos.length).padStart(4)} archivos ${String(total).padStart(7)} líneas`);
