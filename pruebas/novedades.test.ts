/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CADA COMANDO NUEVO DE CHISPA 1.1 TIENE TODO LO QUE TIENE QUE TENER:
 * ayuda en el editor (ficha), autocompletado, sale en el manual, tiene su
 * bloque en el modo bloques, y está en el curso (que comprueba su ejemplo y
 * su error típico: ver curso.test.ts).
 *
 * La lista de comandos nuevos es la del curso de novedades (cursoNovedades.ts):
 * si un comando nuevo no está ahí, el test de la API completa (curso.test.ts) falla.
 */
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { agregarNovedades } from '../src/chispa/api/cursoNovedades';
import { fichasDeLaApi } from '../src/chispa/api/aprende';
import { generarManual } from '../src/chispa/api/manual';
import { fuenteAutocompletado } from '../src/editor/codigo/autocompletado';
import { ACCIONES, DATOS_CON_BLOQUE, EVENTOS } from '../src/editor/bloques/modelo';
import { proyectoVacio } from '../src/proyecto/formato';

const nuevos: string[] = [];
agregarNovedades(() => {}, (id) => void nuevos.push(id));

function sugerencias(texto: string): string[] {
  const estado = EditorState.create({ doc: texto });
  const r = fuenteAutocompletado(() => proyectoVacio())(new CompletionContext(estado, texto.length, true));
  return r && 'options' in r ? r.options.map((o) => o.label) : [];
}

/** Cómo se escribe el comando delante de su nombre: yo.forma, efecto.explosion... */
function prefijo(grupo: string): string {
  if (grupo === 'objeto') return 'yo.';
  if (grupo === 'funcion' || grupo === 'evento' || grupo === 'palabra' || grupo === 'especial') return '';
  return `${grupo}.`;
}

describe('Comandos nuevos de Chispa 1.1', () => {
  it('hay comandos nuevos, y todos existen en la API', () => {
    expect(nuevos.length).toBeGreaterThan(0);
    const api = new Set(fichasDeLaApi().map((f) => f.id));
    expect(nuevos.filter((id) => !api.has(id))).toEqual([]);
  });

  it('cada uno sale en el autocompletado', () => {
    const faltan = nuevos.filter((id) => {
      const [grupo, nombre] = id.split(':');
      if (grupo === 'evento') return false; // los eventos se completan al escribir «cuando»
      const texto = prefijo(grupo) ? prefijo(grupo) : nombre.slice(0, 3);
      return !sugerencias(texto).includes(nombre);
    });
    expect(faltan).toEqual([]);
  });

  it('cada uno sale en el manual', () => {
    const manual = generarManual();
    const fichas = new Map(fichasDeLaApi().map((f) => [f.id, f]));
    expect(nuevos.filter((id) => !manual.includes(fichas.get(id)!.doc.firma))).toEqual([]);
  });

  it('cada uno tiene su bloque en el modo bloques', () => {
    const funciones = new Set(ACCIONES.map((a) => a.funcion));
    const datos = new Set(DATOS_CON_BLOQUE.map((d) => d.objetivo));
    const faltan = nuevos.filter((id) => {
      const [grupo, nombre] = id.split(':');
      if (grupo === 'evento') return !EVENTOS.some((e) => e.texto.replace(' …', '').startsWith(nombre.split(' N ')[0]));
      const escrito = `${prefijo(grupo)}${nombre}`;
      return !funciones.has(escrito) && !datos.has(escrito);
    });
    expect(faltan).toEqual([]);
  });
});
