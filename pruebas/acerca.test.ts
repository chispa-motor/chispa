/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * «ACERCA DE CHISPA», «APOYA CHISPA» Y LA VERSIÓN 1.0.0.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { VERSION } from '../src/version';
import { AUTOR, CONFIGURACION } from '../src/configuracion';
import { abrirAcercaDe, abrirApoyo, enlaceAlRepositorio } from '../src/editor/acerca';
import { generarPaginaJuego } from '../src/exportar/exportar';
import { proyectoMinimo } from '../src/ejemplos/minimo/proyecto';

const dialogo = () => document.querySelector('.dialogo') as HTMLElement | null;
afterEach(() => {
  document.querySelectorAll('.dialogo-fondo').forEach((d) => d.remove());
  CONFIGURACION.donaciones = '';
  vi.restoreAllMocks();
});

describe('Versión', () => {
  it('es la 1.0.0, la misma en package.json y en package-lock.json', () => {
    expect(VERSION).toBe('1.0.0');
    expect(JSON.parse(readFileSync('package.json', 'utf8')).version).toBe(VERSION);
    expect(JSON.parse(readFileSync('package-lock.json', 'utf8')).version).toBe(VERSION);
  });

  it('los juegos exportados dicen con qué versión de Chispa se hicieron', () => {
    const pagina = generarPaginaJuego(proyectoMinimo, 'console.log(1)');
    expect(pagina).toContain(`<meta name="generator" content="Chispa ${VERSION}">`);
    expect(pagina).toContain(`Hecho con Chispa ${VERSION}`);
  });
});

describe('Acerca de Chispa', () => {
  it('enseña la versión, el autor, la licencia y los créditos', () => {
    abrirAcercaDe();
    const d = dialogo()!;
    expect(d.querySelector('h2')!.textContent).toBe('Acerca de Chispa');
    const texto = d.textContent!;
    expect(texto).toContain(`Versión ${VERSION}`);
    expect(texto).toContain(AUTOR);
    expect(texto).toContain('Mozilla Public License 2.0');
    expect(texto).toContain('Son tuyos');
    expect(texto).toContain('CodeMirror');
    const enlaces = [...d.querySelectorAll('a')];
    expect(enlaces.map((a) => a.getAttribute('href'))).toContain(enlaceAlRepositorio('CREDITOS.md'));
    expect(enlaces.map((a) => a.getAttribute('href'))).toContain('licencias-de-terceros.txt');
    // Los enlaces se abren aparte, sin decirle a la otra página de dónde vienes
    for (const a of enlaces) {
      expect(a.target).toBe('_blank');
      expect(a.rel).toBe('noopener noreferrer');
    }
  });
});

describe('Apoya Chispa', () => {
  it('con enlace: lo abre en otra pestaña (y nada más)', () => {
    CONFIGURACION.donaciones = 'https://ko-fi.com/ejemplo';
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    abrirApoyo();
    expect(abrir).toHaveBeenCalledWith('https://ko-fi.com/ejemplo', '_blank', 'noopener,noreferrer');
    expect(dialogo()).toBeNull();
  });

  it('sin enlace todavía: da las gracias y cuenta cómo ayudar, sin abrir nada', () => {
    const abrir = vi.spyOn(window, 'open').mockImplementation(() => null);
    abrirApoyo();
    expect(abrir).not.toHaveBeenCalled();
    expect(dialogo()!.textContent).toContain('¡Gracias por querer apoyar Chispa!');
  });

  it('nunca salta solo: solo se abre desde un botón que alguien pulsa', () => {
    const usos: string[] = [];
    for (const archivo of ['src/editor/Aplicacion.ts', 'src/editor/acerca.ts', 'src/editor/tutorial/Tutorial.ts', 'src/main.ts', 'src/editor/juego/VistaJuego.ts', 'src/exportar/exportar.ts']) {
      readFileSync(archivo, 'utf8').split('\n').forEach((linea, i) => {
        if (/\babrirApoyo\b/.test(linea) && !/export function abrirApoyo|^import /.test(linea.trim())) usos.push(`${archivo}:${i + 1}: ${linea.trim()}`);
      });
    }
    // Todos los usos son al pulsar un botón (onclick o alPulsar)
    expect(usos.length).toBeGreaterThan(0);
    for (const u of usos) expect(u).toMatch(/onclick|alPulsar/);
    // Y el juego exportado no lleva nada de donaciones
    expect(generarPaginaJuego(proyectoMinimo, 'console.log(1)')).not.toMatch(/apoya|donaci/i);
  });
});
