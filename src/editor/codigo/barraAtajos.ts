/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * BARRA DE ATAJOS para programar con el dedo.
 *
 * En el teclado de un móvil, los dos puntos, los paréntesis y las comillas
 * están escondidos en otra pantalla del teclado, y no hay tabulador ni Ctrl+Z.
 * Esta barra va justo encima del teclado y pone con un toque lo que más se
 * escribe en Chispa: las palabras que abren un bloque (si, sino, mientras,
 * repetir, funcion, cuando), los dos puntos, los paréntesis, las comillas, la
 * sangría y deshacer.
 *
 * Lo que hace cada botón está en `cambioDeAtajo`, que no toca la pantalla: da
 * el cambio que hay que hacer en el código. Así se puede probar sin navegador.
 */
import { EditorSelection, type EditorState, type TransactionSpec } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { cursorCharLeft, cursorCharRight, indentLess, indentMore, redo, undo } from '@codemirror/commands';
import { startCompletion } from '@codemirror/autocomplete';
import { h } from '../interfaz/dom';
import { mostrarAyudaDelCodigo } from './ayudaYErrores';

export interface AtajoDeCodigo {
  id: string;
  /** Lo que se ve en el botón. */
  texto: string;
  ayuda: string;
  /** Para los botones que son un símbolo: se ven más grandes. */
  simbolo?: boolean;
}

export const ATAJOS_DE_CODIGO: AtajoDeCodigo[] = [
  { id: 'cuando', texto: 'cuando', ayuda: 'Escribe «cuando» y te enseña los eventos que hay (cuando empieza, cuando toco...)' },
  { id: 'si', texto: 'si', ayuda: 'Escribe «si :» y deja el cursor donde va la condición' },
  { id: 'sino', texto: 'sino', ayuda: 'Escribe «sino:» a la altura de su «si»' },
  { id: 'mientras', texto: 'mientras', ayuda: 'Escribe «mientras :» y deja el cursor donde va la condición' },
  { id: 'repetir', texto: 'repetir', ayuda: 'Escribe «repetir  veces:» y deja el cursor donde va el número' },
  { id: 'funcion', texto: 'funcion', ayuda: 'Escribe «funcion nombre():» con el nombre marcado para cambiarlo' },
  { id: 'dosPuntos', texto: ':', ayuda: 'Dos puntos (al final de cada si, mientras, cuando...)', simbolo: true },
  { id: 'parentesis', texto: '( )', ayuda: 'Paréntesis: deja el cursor dentro (o rodea lo que esté marcado)', simbolo: true },
  { id: 'comillas', texto: '" "', ayuda: 'Comillas para un texto: deja el cursor dentro (o rodea lo que esté marcado)', simbolo: true },
  { id: 'igual', texto: '=', ayuda: 'Igual', simbolo: true },
  { id: 'punto', texto: '.', ayuda: 'Punto (yo.x, juego.puntos...)', simbolo: true },
  { id: 'sangria', texto: '⇥', ayuda: 'Sangría: mete la línea hacia dentro (lo que va dentro de un si, un cuando...)', simbolo: true },
  { id: 'quitarSangria', texto: '⇤', ayuda: 'Quitar sangría: saca la línea hacia fuera', simbolo: true },
  { id: 'deshacer', texto: '↶', ayuda: 'Deshacer lo último que has escrito', simbolo: true },
  { id: 'rehacer', texto: '↷', ayuda: 'Rehacer', simbolo: true },
  { id: 'izquierda', texto: '◀', ayuda: 'Mover el cursor una letra a la izquierda', simbolo: true },
  { id: 'derecha', texto: '▶', ayuda: 'Mover el cursor una letra a la derecha', simbolo: true },
  { id: 'ayuda', texto: '?', ayuda: 'Ayuda de la palabra donde está el cursor (y la explicación del error, si lo hay)', simbolo: true },
];

/** Cuánto mide una sangría en Chispa. */
const SANGRIA = '    ';

/**
 * El cambio que hace un atajo de los que ESCRIBEN algo (los demás —sangría, deshacer, mover
 * el cursor, ayuda— son órdenes del editor: ver `usarAtajo`). null si ese atajo no escribe.
 */
export function cambioDeAtajo(estado: EditorState, id: string): TransactionSpec | null {
  const sel = estado.selection.main;
  const marcado = estado.sliceDoc(sel.from, sel.to);
  const linea = estado.doc.lineAt(sel.from);
  const antes = linea.text.slice(0, sel.from - linea.from);
  /** Sustituye lo marcado por `texto` y deja el cursor a `cursor` letras del principio (o marca de `cursor` a `hasta`). */
  const poner = (texto: string, cursor = texto.length, hasta = cursor, desde = sel.from): TransactionSpec => ({
    changes: { from: desde, to: sel.to, insert: texto },
    selection: EditorSelection.range(desde + cursor, desde + hasta),
    scrollIntoView: true,
    userEvent: 'input.atajo',
  });
  /** Una palabra que empieza una orden: si la línea ya tiene algo escrito delante, con un espacio antes. */
  const palabra = (t: string) => (antes.trim() === '' || /\s$/.test(antes) ? t : ` ${t}`);
  switch (id) {
    case 'cuando':
      return poner(palabra('cuando '));
    case 'si': {
      const t = palabra('si ');
      return poner(`${t}${marcado}:`, t.length + marcado.length);
    }
    case 'mientras': {
      const t = palabra('mientras ');
      return poner(`${t}${marcado}:`, t.length + marcado.length);
    }
    case 'repetir': {
      const t = palabra('repetir ');
      return poner(`${t}${marcado} veces:`, t.length + marcado.length);
    }
    case 'funcion': {
      const t = palabra('funcion ');
      return poner(`${t}nombre():`, t.length, t.length + 'nombre'.length);
    }
    case 'sino': {
      // En una línea vacía con sangría, «sino» va un nivel más fuera: a la altura de su «si»
      if (antes.trim() === '' && linea.text.trim() === '') {
        const fuera = antes.length >= SANGRIA.length ? antes.slice(SANGRIA.length) : '';
        const texto = `${fuera}sino:\n${fuera}${SANGRIA}`;
        return { changes: { from: linea.from, to: linea.to, insert: texto }, selection: EditorSelection.cursor(linea.from + texto.length), scrollIntoView: true, userEvent: 'input.atajo' };
      }
      return poner(palabra('sino:'));
    }
    case 'dosPuntos':
      return poner(':');
    case 'igual':
      return poner(antes === '' || /\s$/.test(antes) ? '= ' : ' = ');
    case 'punto':
      return poner('.');
    case 'parentesis':
      return poner(`(${marcado})`, 1, 1 + marcado.length);
    case 'comillas':
      return poner(`"${marcado}"`, 1, 1 + marcado.length);
    default:
      return null;
  }
}

/** Hace lo que dice un atajo en ese editor. Devuelve si lo ha hecho. */
export function usarAtajo(vista: EditorView, id: string): boolean {
  const cambio = cambioDeAtajo(vista.state, id);
  if (cambio) {
    vista.dispatch(cambio);
    // Tras «cuando», la lista de eventos; tras el punto, lo que tiene ese objeto
    if (id === 'cuando' || id === 'punto') startCompletion(vista);
    return true;
  }
  switch (id) {
    case 'sangria':
      return indentMore(vista);
    case 'quitarSangria':
      return indentLess(vista);
    case 'deshacer':
      return undo(vista);
    case 'rehacer':
      return redo(vista);
    case 'izquierda':
      return cursorCharLeft(vista);
    case 'derecha':
      return cursorCharRight(vista);
    case 'ayuda': {
      const pos = vista.state.selection.main.head;
      // La palabra de justo antes del cursor también vale (se acaba de escribir)
      return mostrarAyudaDelCodigo(vista, pos) || (pos > 0 && mostrarAyudaDelCodigo(vista, pos - 1));
    }
    default:
      return false;
  }
}

/**
 * La barra, para ponerla debajo del código. `vista` da el editor al que escribe.
 * Los botones NO se llevan el foco: el cursor sigue en el código y el teclado no se esconde.
 */
export function barraDeAtajos(vista: () => EditorView | null): HTMLElement {
  const noEnfocar = (e: Event) => e.preventDefault();
  return h('div', { class: 'barra-atajos', role: 'toolbar', 'aria-label': 'Atajos para escribir código' },
    ATAJOS_DE_CODIGO.map((a) =>
      h('button', {
        class: `atajo-codigo ${a.simbolo ? 'simbolo' : ''}`,
        type: 'button',
        'data-atajo': a.id,
        title: a.ayuda,
        'aria-label': a.ayuda,
        tabindex: '-1',
        onmousedown: noEnfocar,
        onpointerdown: noEnfocar,
        onclick: () => {
          const v = vista();
          if (!v) return;
          usarAtajo(v, a.id);
          v.focus();
        },
      }, a.texto),
    ),
  );
}
