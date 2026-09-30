/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Revisa un proyecto .chispa.json sin abrir el editor: enseña todos los
 * errores y avisos, como el panel «Problemas».
 *   npx tsx herramientas/revisar-proyecto.ts proyectos/arena-de-habilidades/arena-de-habilidades.chispa.json
 */
import { readFileSync } from 'node:fs';
import { migrarProyecto } from '../src/proyecto/formato';
import { revisarProyecto } from '../src/proyecto/Revision';
import { formatearDiagnostico } from '../src/chispa/errores/ErrorChispa';

const archivo = process.argv[2];
if (!archivo) {
  console.log('Uso: npx tsx herramientas/revisar-proyecto.ts juego.chispa.json');
  process.exit(1);
}
const proyecto = migrarProyecto(JSON.parse(readFileSync(archivo, 'utf8')));
const r = revisarProyecto(proyecto);
let n = 0;
for (const [nombre, diagnosticos] of r.porArchivo) {
  const lineas = proyecto.scripts[nombre]?.split('\n');
  for (const d of diagnosticos) {
    n++;
    console.log(formatearDiagnostico({ ...d, archivo: d.archivo ?? nombre }, lineas) + '\n');
  }
}
console.log(n ? `${r.errores.length} errores y ${r.avisos.length} avisos.` : 'Todo bien: ni errores ni avisos.');
process.exit(r.errores.length ? 1 : 0);
