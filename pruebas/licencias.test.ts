/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LICENCIAS: Chispa es MPL 2.0, y todo lo que usa tiene que ser compatible.
 * Si alguien añade una dependencia con otra licencia (por ejemplo GPL), falla.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error: es un módulo .mjs de herramientas (sin tipos)
import { esCompatible, generarAvisos, generarMarkdown, leerDependencias } from '../herramientas/licencias.mjs';
// @ts-expect-error: es un módulo .mjs de herramientas (sin tipos)
import { MARCA, archivosDelMotor, conCabecera } from '../herramientas/cabeceras.mjs';

describe('Licencias', () => {
  const deps = leerDependencias() as { nombre: string; licencia: string; desarrollo: boolean }[];

  it('todas las dependencias tienen una licencia compatible con la MPL 2.0', () => {
    expect(deps.filter((d) => !esCompatible(d.licencia)).map((d) => `${d.nombre}: ${d.licencia}`)).toEqual([]);
    expect(esCompatible('GPL-3.0')).toBe(false);
    expect(esCompatible('MIT OR Apache-2.0')).toBe(true);
  });

  it('LICENCIAS_DEPENDENCIAS.md y public/licencias-de-terceros.txt están al día (si falla: npm run licencias)', () => {
    expect(readFileSync('LICENCIAS_DEPENDENCIAS.md', 'utf8')).toBe(generarMarkdown(deps));
    expect(readFileSync('public/licencias-de-terceros.txt', 'utf8')).toBe(generarAvisos(deps));
  });

  it('LICENSE es el texto completo de la MPL 2.0, y package.json lo dice', () => {
    const licencia = readFileSync('LICENSE', 'utf8');
    expect(licencia.startsWith('Mozilla Public License Version 2.0')).toBe(true);
    for (const parte of ['1. Definitions', '2. License Grants and Conditions', '3. Responsibilities', '10. Versions of the License', 'Exhibit A - Source Code Form License Notice', 'Exhibit B']) expect(licencia).toContain(parte);
    expect(JSON.parse(readFileSync('package.json', 'utf8')).license).toBe('MPL-2.0');
  });

  it('cada archivo del motor empieza con la cabecera de la MPL 2.0 (si falla: npm run cabeceras)', () => {
    const archivos = archivosDelMotor() as string[];
    expect(archivos.length).toBeGreaterThan(100);
    const sin = archivos.filter((a) => !readFileSync(a, 'utf8').slice(0, 400).includes(MARCA));
    expect(sin).toEqual([]);
  });

  it('los juegos de ejemplo no llevan cabecera: son de quien los hace', () => {
    const archivos = archivosDelMotor() as string[];
    expect(archivos.some((a) => a.includes('ejemplos'))).toBe(false);
    expect(readFileSync('proyectos/arena-de-habilidades/scripts/' + 'jugador.chs', 'utf8')).not.toContain(MARCA);
  });

  it('la cabecera se pone bien en cada tipo de archivo (y no se pone dos veces)', () => {
    const ts = conCabecera('a.ts', 'const x = 1;\n');
    expect(ts.startsWith('/*\n * Chispa')).toBe(true);
    expect(conCabecera('a.ts', ts)).toBe(ts);
    expect(conCabecera('a.html', '<!doctype html>\n<html></html>\n').startsWith('<!doctype html>\n<!--')).toBe(true);
    expect(conCabecera('a.mjs', '#!/usr/bin/env node\nhola\n').startsWith('#!/usr/bin/env node\n/*')).toBe(true);
  });
});

describe('Los juegos exportados son de quien los hace', () => {
  it('llevan un aviso: el juego es de su autor; el motor es Chispa (MPL 2.0) y dice dónde está su código', async () => {
    const { generarPaginaJuego } = await import('../src/exportar/exportar');
    const { proyectoMinimo } = await import('../src/ejemplos/minimo/proyecto');
    const { CONFIGURACION } = await import('../src/configuracion');
    const pagina = generarPaginaJuego(proyectoMinimo, 'console.log(1)');
    const aviso = /^<!doctype html>\n<!--([\s\S]*?)-->/.exec(pagina)?.[1] ?? '';
    expect(aviso).toContain('EL JUEGO');
    expect(aviso).toContain('es de quien lo ha hecho');
    expect(aviso).toContain('Mozilla Public License 2.0');
    expect(aviso).toContain(CONFIGURACION.repositorio);
    // El proyecto del juego NO lleva cabecera MPL
    expect(/<script type="application\/json" id="proyecto-chispa">[\s\S]*?<\/script>/.exec(pagina)![0]).not.toContain('SPDX');
  });

  it('los enlaces de la configuración son https (o están vacíos)', async () => {
    const { CONFIGURACION } = await import('../src/configuracion');
    for (const [k, v] of Object.entries(CONFIGURACION)) expect(v === '' || /^https:\/\/[^\s"'<>]+$/.test(v), k).toBe(true);
    expect(CONFIGURACION.repositorio).not.toBe('');
  });
});
