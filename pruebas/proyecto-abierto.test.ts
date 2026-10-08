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
      'README.md': ['Chispa', 'Empezar', 'Qué trae', 'Licencia', 'Apoya Chispa', 'docs/imagenes/arena.gif', 'CONTRIBUIR.md', 'Mozilla Public License 2.0', 'CC0', 'LICENCIA.md'],
      'EMPIEZA_AQUI.md': ['¿De quién son mis juegos?', 'Tuyos', 'MPL 2.0', 'dominio público'],
      'CONTRIBUIR.md': ['issue', 'Pull Request', 'npm run pruebas', 'SEGURIDAD.md'],
      'SEGURIDAD.md': ['Report a vulnerability', 'No abras una *issue* pública'],
      'NORMAS_COMUNIDAD.md': ['respeto', 'datos personales'],
      'CREDITOS.md': ['Rodrigo', 'Colaboradores'],
      'LICENCIAS_DEPENDENCIAS.md': ['Todos son compatibles con la MPL 2.0'],
      'AUDITORIA_SEGURIDAD.md': ['Problemas encontrados'],
      'proyectos/LICENCIA.md': ['dominio público', 'CC0'],
      'src/ejemplos/LICENCIA.md': ['dominio público', 'CC0'],
      'src/plantillas/LICENCIA.md': ['dominio público', 'CC0'],
      'src/recursos/LICENCIA.md': ['dominio público', 'CC0'],
      // La licencia en dos líneas: el motor, MPL 2.0; ejemplos, plantillas y recursos, CC0
      'LICENCIA.md': ['Mozilla Public License 2.0', 'CC0 1.0', 'proyectos/', 'src/plantillas/', 'src/recursos/'],
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

  it('GitHub Pages: el workflow pasa todos los tests (también en /chispa/) antes de publicar', () => {
    const w = leer('.github/workflows/publicar.yml');
    expect(w).toMatch(/on:\s*\n\s*push:\s*\n\s*branches: \[main\]/);
    expect(w).toContain('node-version: 22');
    const orden = ['npm ci', 'npm run pruebas', 'npm run build', 'pruebas-navegador/editor.mjs', 'upload-pages-artifact', 'deploy-pages'];
    const sitios = orden.map((paso) => w.indexOf(paso));
    expect(sitios.every((i) => i > 0), 'faltan pasos').toBe(true);
    expect([...sitios].sort((a, b) => a - b)).toEqual(sitios);
    expect(w).toContain('RUTA_BASE: /chispa/');
    expect(w).toContain('needs: probar');
    // Solo el paso de publicar puede escribir en Pages
    expect(w.slice(0, w.indexOf('jobs:'))).toContain('contents: read');
    expect(w.slice(0, w.indexOf('jobs:'))).not.toContain('pages: write');
  });

  it('el editor compilado usa rutas relativas: funciona en /chispa/ (GitHub Pages) o en cualquier otra carpeta', () => {
    expect(leer('vite.config.ts')).toMatch(/base: '\.\/'/);
    // La única ruta que empieza por / es la del código, y Vite la cambia por una relativa al compilar
    expect(leer('index.html').match(/(src|href)="\/(?!\/)[^"]*"/g)).toEqual(['src="/src/main.ts"']);
  });

  it('las direcciones son las de la organización chispa-motor (y el botón de la web está arriba del README)', async () => {
    const { CONFIGURACION } = await import('../src/configuracion');
    expect(CONFIGURACION.repositorio).toBe('https://github.com/chispa-motor/chispa');
    expect(CONFIGURACION.web).toBe('https://chispa-motor.github.io/chispa/');
    const readme = leer('README.md');
    expect(readme.indexOf('Usar Chispa ahora')).toBeGreaterThan(0);
    expect(readme.indexOf('Usar Chispa ahora')).toBeLessThan(readme.indexOf('## '));
    expect(readme).toContain('href="https://chispa-motor.github.io/chispa/"');
    expect(readme.indexOf('npm install')).toBeGreaterThan(readme.indexOf('### Si quieres modificar el propio Chispa'));
    // Ninguna dirección vieja en ningún sitio (escrita en dos trozos para que este archivo no se encuentre a sí mismo)
    const VIEJA = 'rodrigodemartin827' + '-debug';
    const viejas: string[] = [];
    const mirar = (dir: string) => {
      for (const n of readdirSync(dir, { withFileTypes: true })) {
        const r = join(dir, n.name);
        if (n.isDirectory()) { if (!['node_modules', 'dist', '.git'].includes(n.name)) mirar(r); }
        else if (/\.(md|ts|mjs|yml|json|html)$/.test(n.name) && leer(r).includes(VIEJA)) viejas.push(r);
      }
    };
    mirar('.');
    expect(viejas).toEqual([]);
  });

  it('.gitattributes: los .chs no cuentan como Haskell', () => {
    const g = leer('.gitattributes');
    expect(g).toMatch(/^\*\.chs linguist-language=Text$/m);
    expect(g).toMatch(/^\* text=auto eol=lf$/m);
  });

  it('las capturas del README existen y no son enormes', () => {
    for (const img of ['editor.png', 'codigo.png', 'bloques.png', 'arena.gif']) {
      const ruta = join('docs/imagenes', img);
      expect(existsSync(ruta), ruta).toBe(true);
      expect(readFileSync(ruta).length, ruta).toBeLessThan(3 * 1024 * 1024);
    }
  });
});
