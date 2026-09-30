/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PRUEBA DE PRINCIPIANTE (sesión 3, bloque 6): un test por cada problema que
 * se encontró haciendo el tutorial y dos juegos nuevos («Atrapa la fruta» y
 * «Sube a la cima»). Los que necesitan un navegador están en
 * pruebas-navegador/editor.mjs.
 */
import { describe, expect, it } from 'vitest';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { RECETAS } from '../src/chispa/api/documentacion';
import { unObjeto } from './ayudantes';

describe('Problemas de la prueba de principiante (sesión 3)', () => {
  it('los textos nuevos crecen hacia la derecha (un marcador largo no se corta por la izquierda)', () => {
    const e = new EstadoEditor();
    e.crearObjeto('texto', 32, 500);
    expect(e.seleccionado?.sprite?.alinear).toBe('izquierda');
  });

  it('receta para moverse solo a los lados: con las flechas no sube ni baja', () => {
    const receta = RECETAS.find((r) => r.titulo.startsWith('Moverse solo a los lados'))!;
    const j = unObjeto(receta.codigo, { x: 300, y: 60 });
    j.pulsar('ArrowRight', 'ArrowRight');
    j.pulsar('ArrowUp', 'ArrowUp');
    j.avanzar(30);
    const o = j.buscar('Prueba');
    expect(o.posicion.x).toBeGreaterThan(400);
    expect(o.posicion.y).toBe(60);
  });
});
