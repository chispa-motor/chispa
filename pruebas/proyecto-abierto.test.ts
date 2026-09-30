/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PROYECTO ABIERTO: los archivos que necesita Chispa para ser código abierto
 * están, dicen lo que tienen que decir y sus enlaces funcionan.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const leer = (a: string) => readFileSync(a, 'utf8');

describe('Archivos del proyecto abierto', () => {
  it('están todos, en español', () => {
    const quePide: Record<string, string[]> = {
      'README.md': ['Chispa', 'Empezar', 'Qué trae', 'Licencia', 'Apoya Chispa', 'docs/imagenes/arena.gif', 'CONTRIBUIR.md'],
      'EMPIEZA_AQUI.md': ['¿De quién son mis juegos?', 'Tuyos', 'MPL 2.0', 'dominio público'],
      'CONTRIBUIR.md': ['issue', 'Pull Request', 'npm run pruebas', 'SEGURIDAD.md'],
      'SEGURIDAD.md': ['Report a vulnerability', 'No abras una *issue* pública'],
      'NORMAS_COMUNIDAD.md': ['respeto', 'datos personales'],
      'CREDITOS.md': ['Rodrigo', 'Colaboradores'],
      'LICENCIAS_DEPENDENCIAS.md': ['Todos son compatibles con la MPL 2.0'],
      'AUDITORIA_SEGURIDAD.md': ['Problemas encontrados'],
      'proyectos/LICENCIA.md': ['dominio público', 'CC0'],
      'src/ejemplos/LICENCIA.md': ['dominio público', 'CC0'],
    };
    for (const [archivo, frases] of Object.entries(quePide)) {
      expect(existsSync(archivo), archivo).toBe(true);
      const texto = leer(archivo);
      for (const f of frases) expect(texto, `${archivo}: «${f}»`).toContain(f);
    }
  });

  it('los enlaces y las imágenes de la documentación llevan a archivos que existen', () => {
    const documentos = readdirSync('.').filter((n) => n.endsWith('.md')).concat(['proyectos/LICENCIA.md', 'src/ejemplos/LICENCIA.md', 'proyectos/arena-de-habilidades/LEEME.md']);
    const rotos: string[] = [];
    for (const doc of documentos) {
      for (const m of leer(doc).matchAll(/\]\(([^)\s]+)\)/g)) {
        const destino = m[1].split('#')[0];
        if (!destino || /^(https?:|mailto:)/.test(destino)) continue;
        if (!existsSync(join(dirname(doc), decodeURI(destino)))) rotos.push(`${doc} → ${m[1]}`);
      }
    }
    expect(rotos).toEqual([]);
  });

  it('las capturas del README existen y no son enormes', () => {
    for (const img of ['editor.png', 'codigo.png', 'bloques.png', 'arena.gif']) {
      const ruta = join('docs/imagenes', img);
      expect(existsSync(ruta), ruta).toBe(true);
      expect(readFileSync(ruta).length, ruta).toBeLessThan(3 * 1024 * 1024);
    }
  });
});
