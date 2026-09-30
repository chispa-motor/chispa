/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LICENCIAS DE LAS DEPENDENCIAS: npm run licencias
 *
 * Lee package-lock.json y la licencia de cada paquete, y escribe:
 *   - LICENCIAS_DEPENDENCIAS.md: la lista, y si cada una es compatible con la MPL 2.0;
 *   - public/licencias-de-terceros.txt: el texto de la licencia de cada paquete
 *     que va DENTRO del editor (las MIT piden que su aviso viaje con el código).
 *
 * pruebas/licencias.test.ts comprueba que los dos archivos están al día y que
 * no entra ninguna dependencia con una licencia que no encaje.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Licencias que se pueden usar junto con la MPL 2.0 (todas «permisivas», o la propia MPL). */
export const COMPATIBLES = {
  MIT: 'Permisiva: se puede usar en cualquier proyecto guardando su aviso de copyright.',
  ISC: 'Permisiva, casi igual que la MIT.',
  'BSD-2-Clause': 'Permisiva: guardar su aviso de copyright.',
  'BSD-3-Clause': 'Permisiva: guardar su aviso y no usar su nombre para anunciarse.',
  'Apache-2.0': 'Permisiva: guardar su aviso (y su archivo NOTICE, si tiene). Aquí solo la usan herramientas para desarrollar, que no se reparten.',
  '0BSD': 'Permisiva, sin condiciones.',
  'CC0-1.0': 'Dominio público.',
  'MPL-2.0': 'La misma licencia que Chispa.',
};

export function leerDependencias(raiz = '.') {
  const lock = JSON.parse(readFileSync(join(raiz, 'package-lock.json'), 'utf8'));
  const deps = [];
  for (const [ruta, info] of Object.entries(lock.packages)) {
    if (!ruta) continue;
    const nombre = ruta.slice(ruta.lastIndexOf('node_modules/') + 'node_modules/'.length);
    let licencia = info.license ?? null;
    const pj = join(raiz, ruta, 'package.json');
    if (existsSync(pj)) {
      const p = JSON.parse(readFileSync(pj, 'utf8'));
      licencia = typeof p.license === 'string' ? p.license : p.license?.type ?? licencia;
    }
    deps.push({ nombre, version: info.version, licencia: licencia ?? 'DESCONOCIDA', desarrollo: !!info.dev, soloEnOtrosSistemas: !!info.optional && !existsSync(pj), ruta: join(raiz, ruta) });
  }
  return deps.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** ¿Es compatible? Admite "MIT OR Apache-2.0" (vale si alguna lo es). */
export function esCompatible(licencia) {
  return licencia.replace(/[()]/g, '').split(/\s+OR\s+/).some((l) => l.trim() in COMPATIBLES);
}

function textoDeLicencia(ruta) {
  if (!existsSync(ruta)) return null;
  const archivo = readdirSync(ruta).find((n) => /^(licen[cs]e|copying)(\.md|\.txt)?$/i.test(n));
  return archivo ? readFileSync(join(ruta, archivo), 'utf8').trim() : null;
}

export function generarMarkdown(deps) {
  const enElEditor = deps.filter((d) => !d.desarrollo);
  const paraDesarrollar = deps.filter((d) => d.desarrollo && !d.soloEnOtrosSistemas);
  const binarios = deps.filter((d) => d.soloEnOtrosSistemas);
  const cuenta = {};
  for (const d of deps) cuenta[d.licencia] = (cuenta[d.licencia] ?? 0) + 1;
  const incompatibles = deps.filter((d) => !esCompatible(d.licencia));
  const fila = (d) => `| ${d.nombre} | ${d.version} | ${d.licencia} | ${esCompatible(d.licencia) ? 'Sí' : '**NO**'} |`;
  return [
    '# Licencias de las dependencias',
    '',
    '> Este archivo se genera solo con `npm run licencias` (no lo cambies a mano).',
    '',
    'Chispa tiene licencia **MPL 2.0**. Todo lo que usa de otras personas tiene',
    'que tener una licencia **compatible**: que deje usarlo dentro de un proyecto',
    'MPL 2.0 y repartirlo. Las licencias «permisivas» (MIT, BSD, ISC, Apache 2.0)',
    'lo permiten todas: solo piden que su aviso de copyright viaje con el código.',
    '',
    '## Resumen',
    '',
    `- **${deps.length} paquetes** en total (contando los que usan los que usamos).`,
    `- **${incompatibles.length === 0 ? 'Todos son compatibles con la MPL 2.0.' : `${incompatibles.length} NO son compatibles: ${incompatibles.map((d) => d.nombre).join(', ')}.`}**`,
    `- Por licencia: ${Object.entries(cuenta).sort((a, b) => b[1] - a[1]).map(([l, n]) => `${l} (${n})`).join(', ')}.`,
    `- **Dentro del editor** van ${enElEditor.length} (el editor de código, CodeMirror, y sus piezas). Sus avisos de licencia van con el editor, en \`public/licencias-de-terceros.txt\`.`,
    '- **Dentro de los juegos exportados no va ninguno**: el reproductor es solo código de Chispa.',
    `- Los demás (${paraDesarrollar.length + binarios.length}) solo sirven para **desarrollar y probar** Chispa (compilar, tests, navegador de pruebas). No se reparten con el editor ni con los juegos.`,
    '',
    '## Qué significa cada licencia',
    '',
    '| Licencia | Compatible | Qué pide |',
    '|---|---|---|',
    ...Object.keys(cuenta).sort().map((l) => `| ${l} | ${esCompatible(l) ? 'Sí' : '**NO**'} | ${COMPATIBLES[l] ?? 'Revisar a mano antes de usarla.'} |`),
    '',
    '## Dentro del editor',
    '',
    '| Paquete | Versión | Licencia | Compatible |',
    '|---|---|---|---|',
    ...enElEditor.map(fila),
    '',
    '## Solo para desarrollar y probar',
    '',
    '| Paquete | Versión | Licencia | Compatible |',
    '|---|---|---|---|',
    ...paraDesarrollar.map(fila),
    '',
    `Además hay ${binarios.length} paquetes con el programa ya compilado para otros sistemas (Windows, Mac, Linux ARM...) de esbuild y Rollup; npm solo instala el de tu ordenador. Todos son ${[...new Set(binarios.map((d) => d.licencia))].join(', ')}.`,
    '',
  ].join('\n');
}

export function generarAvisos(deps) {
  const enElEditor = deps.filter((d) => !d.desarrollo);
  const partes = [
    'LICENCIAS DE TERCEROS',
    '=====================',
    '',
    'El editor de Chispa lleva dentro estos paquetes de otras personas. Todos tienen',
    'licencia MIT, que pide que su aviso de copyright viaje con el código. Aquí están.',
    '(Los juegos exportados con Chispa no llevan ninguno.)',
    '',
  ];
  for (const d of enElEditor) {
    partes.push('-'.repeat(72), `${d.nombre} ${d.version} (${d.licencia})`, '-'.repeat(72), '', textoDeLicencia(d.ruta) ?? `Licencia ${d.licencia}: https://spdx.org/licenses/${d.licencia}.html`, '');
  }
  return partes.join('\n');
}

// npm run licencias
if (process.argv[1]?.endsWith('licencias.mjs')) {
  const deps = leerDependencias();
  writeFileSync('LICENCIAS_DEPENDENCIAS.md', generarMarkdown(deps));
  writeFileSync('public/licencias-de-terceros.txt', generarAvisos(deps));
  const malas = deps.filter((d) => !esCompatible(d.licencia));
  console.log(`${deps.length} paquetes. ${malas.length ? `NO compatibles: ${malas.map((d) => `${d.nombre} (${d.licencia})`).join(', ')}` : 'Todos compatibles con la MPL 2.0.'}`);
  if (malas.length) process.exitCode = 1;
}
