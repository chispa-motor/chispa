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
import { agregarNovedades12 } from '../src/chispa/api/cursoNovedades12';
import { agregarNovedades13 } from '../src/chispa/api/cursoNovedades13';
import { fichasDeLaApi } from '../src/chispa/api/aprende';
import { generarManual } from '../src/chispa/api/manual';
import { fuenteAutocompletado } from '../src/editor/codigo/autocompletado';
import { ACCIONES, DATOS_CON_BLOQUE, EVENTOS } from '../src/editor/bloques/modelo';
import { proyectoVacio } from '../src/proyecto/formato';

const nuevos: string[] = [];
agregarNovedades(() => {}, (id) => void nuevos.push(id));
/** Los de Chispa 1.2 (jugar en el móvil): los mismos requisitos. */
const nuevos12: string[] = [];
agregarNovedades12(() => {}, (id) => void nuevos12.push(id));
nuevos.push(...nuevos12);
/** Los de Chispa 1.3 (primera persona, puertas, mirar con el ratón): los mismos requisitos. */
const nuevos13: string[] = [];
agregarNovedades13(() => {}, (id) => void nuevos13.push(id));
nuevos.push(...nuevos13);

function sugerencias(texto: string): string[] {
  const estado = EditorState.create({ doc: texto });
  const r = fuenteAutocompletado(() => proyectoVacio())(new CompletionContext(estado, texto.length, true));
  return r && 'options' in r ? r.options.map((o) => o.label) : [];
}

/** Cómo se escribe el comando delante de su nombre: yo.forma, efecto.explosion... */
function prefijo(grupo: string): string {
  if (grupo === 'objeto') return 'yo.';
  // Los controles de un jugador se escriben detrás de controles(1), controles(2)...
  if (grupo === 'controles') return 'controles(1).';
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
    // Lo que se escribe con los bloques de la paleta: acciones («funcion(...)») y datos («objetivo = valor»).
    // Las funciones que dan un valor (paleta, mezclarColores...) salen dentro del valor de un bloque.
    const codigo = [...ACCIONES.map((a) => `${a.funcion}(`), ...DATOS_CON_BLOQUE.map((d) => `${d.objetivo} = ${d.valor}`)].join('\n');
    const faltan = nuevos.filter((id) => {
      const [grupo, nombre] = id.split(':');
      if (grupo === 'evento') return !EVENTOS.some((e) => e.texto.replace(' …', '').startsWith(nombre.split(' N ')[0]));
      const escrito = `${prefijo(grupo)}${nombre}`;
      // Lo que solo se lee de los controles (controles(1).x) sale dentro del valor de un bloque
      if (grupo === 'controles') return !new RegExp(`${escrito.replace(/[.()]/g, '\\$&')}(\\W|$)`, 'm').test(codigo);
      // Lo que solo se lee del móvil (tactil.x, tactil.gesto...) también sale dentro del valor de un bloque
      if ((nuevos12.includes(id) || nuevos13.includes(id)) && new RegExp(`(^|[^\\w.])${escrito.replace(/[.()]/g, '\\$&')}(\\W|$)`, 'm').test(codigo)) return false;
      return !new RegExp(`(^|[^\\w.])${escrito.replace(/[.()]/g, '\\$&')}(\\(| =)`, 'm').test(codigo);
    });
    expect(faltan).toEqual([]);
  });

  it('dentro de las comillas sugiere las opciones de los datos nuevos', () => {
    expect(sugerencias('yo.forma = "')).toEqual(expect.arrayContaining(['estrella', 'corazon', 'camino']));
    expect(sugerencias('yo.mezcla = "')).toContain('sumar');
    expect(sugerencias('yo.relleno = "')).toContain('degradado');
    expect(sugerencias('yo.colorBorde = "')).toContain('rojo');
    expect(sugerencias('efecto.usar("')).toContain('fuego');
    expect(sugerencias('yo.efecto = "')).toEqual(['fuego', 'humo', 'burbujas', 'estela']);
  });
});
