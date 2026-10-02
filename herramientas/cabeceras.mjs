/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CABECERAS DE LICENCIA: npm run cabeceras
 *
 * Pone al principio de cada archivo del motor la cabecera corta de la MPL 2.0
 * (el «Exhibit A» de la licencia). La frase de la licencia va en inglés porque
 * es el texto oficial de Mozilla y así vale en cualquier sitio.
 *
 * No se pone en los juegos de ejemplo (src/ejemplos y proyectos/): los juegos
 * son de quien los hace (ver EMPIEZA_AQUI.md, «¿De quién son mis juegos?»).
 *
 * pruebas/licencias.test.ts comprueba que ningún archivo se queda sin ella.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LINEAS = [
  'Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)',
  'SPDX-License-Identifier: MPL-2.0',
  '',
  'This Source Code Form is subject to the terms of the Mozilla Public',
  'License, v. 2.0. If a copy of the MPL was not distributed with this',
  'file, You can obtain one at https://mozilla.org/MPL/2.0/.',
];

/** La marca que dice que un archivo ya tiene su cabecera. */
export const MARCA = 'SPDX-License-Identifier: MPL-2.0';

export const CABECERA_CODIGO = ['/*', ...LINEAS.map((l) => (l ? ` * ${l}` : ' *')), ' */', ''].join('\n');
export const CABECERA_HTML = ['<!--', ...LINEAS.map((l) => (l ? `  ${l}` : '')), '-->', ''].join('\n');

/** Carpetas y archivos del motor. Los juegos de ejemplo no. */
const CARPETAS = ['src', 'pruebas', 'pruebas-navegador', 'herramientas'];
const SUELTOS = ['vite.config.ts', 'vite.reproductor.config.ts', 'index.html'];
// Tampoco en las plantillas de proyecto (cada carpeta de src/plantillas es un juego de partida, de dominio público)
const FUERA = [/^src[\\/]ejemplos[\\/]/, /^src[\\/]plantillas[\\/][^\\/]+[\\/]/];

export function archivosDelMotor(raiz = '.') {
  const lista = [];
  const recorrer = (dir) => {
    for (const n of readdirSync(join(raiz, dir))) {
      const r = join(dir, n);
      if (statSync(join(raiz, r)).isDirectory()) recorrer(r);
      else if (/\.(ts|mjs|js|css)$/.test(n) && !FUERA.some((f) => f.test(r))) lista.push(r);
    }
  };
  CARPETAS.forEach(recorrer);
  return [...lista, ...SUELTOS].sort();
}

/** El archivo con su cabecera (si ya la tenía, igual). */
export function conCabecera(ruta, texto) {
  if (texto.includes(MARCA)) return texto;
  if (ruta.endsWith('.html')) {
    const doctype = /^<!doctype html>\s*\n/i.exec(texto);
    return doctype ? doctype[0] + CABECERA_HTML + texto.slice(doctype[0].length) : CABECERA_HTML + texto;
  }
  // Un «#!» (programa que se ejecuta solo) tiene que seguir siendo la primera línea
  const shebang = /^#!.*\n/.exec(texto);
  return shebang ? shebang[0] + CABECERA_CODIGO + '\n' + texto.slice(shebang[0].length) : CABECERA_CODIGO + '\n' + texto;
}

if (process.argv[1]?.endsWith('cabeceras.mjs')) {
  let puestas = 0;
  for (const a of archivosDelMotor()) {
    const antes = readFileSync(a, 'utf8');
    const despues = conCabecera(a, antes);
    if (despues !== antes) {
      writeFileSync(a, despues);
      puestas++;
    }
  }
  console.log(`Cabecera puesta en ${puestas} archivos (de ${archivosDelMotor().length}).`);
}
