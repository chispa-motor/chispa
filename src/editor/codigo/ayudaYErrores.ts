/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * ERRORES SUBRAYADOS y AYUDA AL PASAR EL RATÓN.
 *
 * - Errores: mientras escribes (con una pequeña pausa para no ir lento),
 *   revisamos el script con el mismo analizador que usa el motor. Cada error
 *   se subraya en rojo y cada aviso en amarillo; al pasar el ratón por encima
 *   sale el mensaje y la pista.
 *
 * - Ayuda: al pasar el ratón por una palabra de Chispa o de la API, sale su
 *   ficha: cómo se usa, qué hace y un ejemplo.
 */
import { forEachDiagnostic, linter, type Diagnostic } from '@codemirror/lint';
import { EditorView, hoverTooltip } from '@codemirror/view';
import { mostrarAyudaEn } from '../interfaz/ayudaAlTocar';
import type { Text } from '@codemirror/state';
import { buscarDoc, DOC_EVENTOS } from '../../chispa/api/documentacion';
import { explicarPila, type Diagnostico } from '../../chispa/errores/ErrorChispa';
import type { DefProyecto } from '../../proyecto/formato';
import { revisarScript } from '../../proyecto/Revision';
import { normalizar } from '../../utilidades/texto';
import { fichaDOM } from './autocompletado';

/** Convierte línea y columna (empiezan en 1) en una posición del documento. */
export function posicionEnDocumento(doc: Text, linea: number, columna: number): number {
  const l = doc.line(Math.min(Math.max(1, linea), doc.lines));
  return Math.min(l.to, l.from + Math.max(0, columna - 1));
}

/** Diagnóstico de Chispa → diagnóstico de CodeMirror (con el trozo exacto subrayado). */
export function aDiagnosticoCM(d: Diagnostico, doc: Text): Diagnostic {
  const desde = posicionEnDocumento(doc, d.pos.linea, d.pos.columna);
  const hasta = Math.min(doc.line(Math.min(d.pos.linea, doc.lines)).to, desde + Math.max(1, d.pos.longitud));
  const texto = [d.mensaje.charAt(0).toUpperCase() + d.mensaje.slice(1), ...explicarPila(d.pila), d.pista ? `💡 ${d.pista}` : ''].filter(Boolean).join('\n');
  return { from: desde, to: Math.max(hasta, desde + (desde < doc.length ? 1 : 0)), severity: d.gravedad === 'error' ? 'error' : 'warning', message: texto };
}

/** Revisa el script mientras se escribe. `archivo()` dice qué script es este editor. */
export function revisionEnVivo(archivo: () => string, proyecto: () => DefProyecto) {
  return linter(
    (vista) => {
      const doc = vista.state.doc;
      const p = proyecto();
      // Revisamos con el código ACTUAL del editor (puede ir por delante del guardado)
      return revisarScript(archivo(), doc.toString(), p).map((d) => aDiagnosticoCM(d, doc));
    },
    { delay: 350 },
  );
}

/**
 * La "ruta" de la palabra que hay en una posición: "teclado.pulsada",
 * "escena.camara.zoom", "yo.velocidad", "mostrar"...
 */
export function rutaEn(texto: string, indice: number): { ruta: string; desde: number; hasta: number } | null {
  const esLetra = (ch: string | undefined) => !!ch && /[\p{L}\p{N}_]/u.test(ch);
  if (!esLetra(texto[indice]) && !esLetra(texto[indice - 1])) return null;
  let a = esLetra(texto[indice]) ? indice : indice - 1;
  let b = a;
  while (a > 0 && esLetra(texto[a - 1])) a--;
  while (b < texto.length && esLetra(texto[b])) b++;
  // Hacia atrás, mientras haya "algo." delante
  let inicio = a;
  while (texto[inicio - 1] === '.') {
    let k = inicio - 1;
    while (k > 0 && esLetra(texto[k - 1])) k--;
    if (k === inicio - 1) break;
    inicio = k;
  }
  return { ruta: texto.slice(inicio, b), desde: a, hasta: b };
}

/** ¿Qué evento es esta línea "cuando ..."? */
export function eventoDeLinea(texto: string): (typeof DOC_EVENTOS)[number] | null {
  const t = normalizar(texto.trim()).replace(/^cuando\s+/, '');
  const clave =
    t.startsWith('empieza') ? 'cuando empieza'
    : t.startsWith('cada fotograma') ? 'cuando cada fotograma'
    : t.startsWith('cada') ? 'cuando cada N segundos'
    : t.startsWith('pasen') ? 'cuando pasen N segundos'
    : t.startsWith('se pulsa') ? 'cuando se pulsa'
    : t.startsWith('se mantiene') ? 'cuando se mantiene'
    : t.startsWith('se suelta') ? 'cuando se suelta'
    : t.startsWith('toco') ? 'cuando toco'
    : t.startsWith('dejo') ? 'cuando dejo de tocar'
    : t.startsWith('hago clic encima') ? 'cuando hago clic encima'
    : t.startsWith('hago') ? 'cuando hago clic'
    : t.startsWith('termina') ? 'cuando termina la animacion'
    : t.startsWith('salgo') ? 'cuando salgo de la pantalla'
    : /^(recib|llega|escucho|oigo)/.test(t) ? 'cuando recibo'
    : null;
  return DOC_EVENTOS.find((e) => e.nombre === clave) ?? null;
}

/** Palabras que forman parte de la línea de un evento (para enseñar la ayuda del evento). */
const PALABRAS_DE_EVENTO = new Set(['cuando', 'empieza', 'cada', 'fotograma', 'segundos', 'segundo', 'pasen', 'se', 'pulsa', 'mantiene', 'suelta', 'toco', 'dejo', 'de', 'tocar', 'hago', 'clic', 'encima', 'cambia', 'termina', 'la', 'animacion', 'salgo', 'pantalla', 'recibo', 'recibe', 'reciba', 'llega', 'escucho', 'oigo']);

/** La ficha de ayuda de la palabra que hay en esa posición del código (y dónde empieza y acaba la palabra), o null. */
export function fichaEn(vista: EditorView, pos: number): { desde: number; hasta: number; dom: () => HTMLElement } | null {
  const linea = vista.state.doc.lineAt(pos);
  const encontrada = rutaEn(linea.text, pos - linea.from);
  if (!encontrada) return null;
  const palabra = normalizar(linea.text.slice(encontrada.desde, encontrada.hasta));
  const esEvento = /^\s*cuando\s/i.test(linea.text) && PALABRAS_DE_EVENTO.has(palabra) && !encontrada.ruta.includes('.');
  const doc = esEvento ? eventoDeLinea(linea.text) : buscarDoc(encontrada.ruta);
  if (!doc) return null;
  return { desde: linea.from + encontrada.desde, hasta: linea.from + encontrada.hasta, dom: () => fichaDOM(doc) };
}

/** Ayuda al pasar el ratón por encima de una palabra. */
export const ayudaAlPasar = hoverTooltip((vista: EditorView, pos: number) => {
  const ficha = fichaEn(vista, pos);
  return ficha && { pos: ficha.desde, end: ficha.hasta, above: true, create: () => ({ dom: ficha.dom() }) };
});

/** Los errores y avisos subrayados que pasan por esa posición del código. */
export function problemasEn(vista: EditorView, pos: number): Diagnostic[] {
  const lista: Diagnostic[] = [];
  forEachDiagnostic(vista.state, (d, desde, hasta) => {
    if (pos >= desde && pos <= hasta) lista.push(d);
  });
  return lista;
}

/**
 * Enseña, en un bocadillo encima de la palabra, lo que con ratón sale al pasar por encima:
 * el error o el aviso subrayado y la ficha del comando. `soloProblemas`: sin la ficha.
 * Devuelve si ha enseñado algo.
 */
export function mostrarAyudaDelCodigo(vista: EditorView, pos: number, soloProblemas = false): boolean {
  const problemas = problemasEn(vista, pos);
  const ficha = soloProblemas ? null : fichaEn(vista, pos);
  if (!problemas.length && !ficha) return false;
  const caja = document.createElement('div');
  for (const d of problemas) {
    const p = document.createElement('div');
    p.className = `problema-bocadillo ${d.severity === 'error' ? 'error' : 'aviso'}`;
    p.textContent = d.message;
    caja.append(p);
  }
  if (ficha) caja.append(ficha.dom());
  const donde = vista.coordsAtPos(ficha?.desde ?? pos) ?? vista.coordsAtPos(pos);
  if (!donde) return false;
  mostrarAyudaEn({ left: donde.left, top: donde.top, bottom: donde.bottom, width: 40 }, caja, true, 9000);
  return true;
}

/** Cuánto hay que dejar el dedo sobre una palabra para ver su ayuda (milisegundos). */
export const ESPERA_AYUDA_CODIGO = 500;

/**
 * Con el dedo no se puede «pasar por encima»:
 *  - TOCAR algo subrayado (un error o un aviso) enseña su explicación.
 *  - DEJAR EL DEDO sobre una palabra enseña su ficha de ayuda (y el error, si lo hay).
 */
export const ayudaAlTocarCodigo = (() => {
  let espera = 0;
  let inicio: { x: number; y: number; t: number } | null = null;
  const cancelar = () => {
    clearTimeout(espera);
    inicio = null;
  };
  return EditorView.domEventHandlers({
    pointerdown(ev, vista) {
      cancelar();
      if (ev.pointerType === 'mouse') return;
      inicio = { x: ev.clientX, y: ev.clientY, t: Date.now() };
      const en = inicio;
      espera = window.setTimeout(() => {
        if (inicio !== en) return;
        inicio = null;
        const pos = vista.posAtCoords({ x: en.x, y: en.y });
        if (pos !== null) mostrarAyudaDelCodigo(vista, pos);
      }, ESPERA_AYUDA_CODIGO);
    },
    pointermove(ev) {
      if (inicio && Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) > 10) cancelar();
    },
    pointerup(ev, vista) {
      const era = inicio;
      cancelar();
      if (!era || ev.pointerType === 'mouse') return;
      // Un toque corto: si ahí hay un error subrayado, se explica
      const pos = vista.posAtCoords({ x: ev.clientX, y: ev.clientY });
      if (pos !== null) mostrarAyudaDelCodigo(vista, pos, true);
    },
    pointercancel: cancelar,
  });
})();
