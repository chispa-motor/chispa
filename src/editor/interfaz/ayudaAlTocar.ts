/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * AYUDA AL TOCAR: con el dedo no se puede «pasar por encima» de un botón
 * para leer su ayuda (el `title`). Así que, con el dedo:
 *
 *  - Dejar el dedo quieto sobre un botón (medio segundo) enseña su ayuda en
 *    un bocadillo, y al levantar el dedo el botón NO se pulsa.
 *  - Tocar algo que no hace nada al pulsarlo (una etiqueta, un valor) enseña
 *    su ayuda al momento.
 *
 * Con ratón no cambia nada: el navegador sigue enseñando el `title`.
 */

/** Cuánto hay que dejar el dedo quieto (milisegundos). */
export const ESPERA_AYUDA = 500;
/** Si el dedo se mueve más que esto (píxeles), es que está arrastrando o desplazando. */
export const MOVIMIENTO_MAXIMO = 10;
/** Cuánto se queda el bocadillo si no se toca nada más (milisegundos). */
export const DURACION_AYUDA = 4000;

const SE_PULSA = 'button, a, input, select, textarea, label, summary, [role="button"], [role="tab"], [onclick], .pestana, .nodo, .cm-content';

/** El elemento con ayuda más cercano a lo que se ha tocado, y su texto. */
export function ayudaDe(objetivo: EventTarget | null): { elemento: HTMLElement; texto: string } | null {
  const el = objetivo instanceof Element ? objetivo.closest<HTMLElement>('[title], [data-ayuda]') : null;
  const texto = (el?.getAttribute('title') || el?.dataset.ayuda || '').trim();
  return el && texto ? { elemento: el, texto } : null;
}

/** ¿Tocar eso hace algo? (entonces la ayuda sale solo dejando el dedo quieto) */
export const sePulsa = (el: Element): boolean => !!el.closest(SE_PULSA);

let bocadillo: HTMLElement | null = null;
let temporizadorQuitar = 0;

export function quitarAyuda(): void {
  bocadillo?.remove();
  bocadillo = null;
  clearTimeout(temporizadorQuitar);
}

/** Enseña un bocadillo de ayuda junto a un elemento (debajo si cabe; si no, encima). */
export function mostrarAyuda(elemento: HTMLElement, texto: string): HTMLElement {
  return mostrarAyudaEn(elemento.getBoundingClientRect(), texto);
}

/**
 * Enseña un bocadillo junto a un rectángulo de la ventana, con un texto o con lo que se le dé
 * (la ficha de un comando, un error del código). `encima`: mejor por encima (lo que está debajo
 * del dedo lo tapa la mano, y el teclado de pantalla).
 */
export function mostrarAyudaEn(r: { left: number; top: number; bottom: number; width: number }, contenido: string | Node, encima = false, duracion = DURACION_AYUDA): HTMLElement {
  quitarAyuda();
  const b = document.createElement('div');
  b.className = 'bocadillo-ayuda';
  b.setAttribute('role', 'tooltip');
  if (typeof contenido === 'string') b.textContent = contenido;
  else {
    b.classList.add('con-ficha');
    b.append(contenido);
  }
  document.body.append(b);
  const ancho = Math.min(typeof contenido === 'string' ? 300 : 460, window.innerWidth - 16);
  b.style.maxWidth = `${ancho}px`;
  const caja = b.getBoundingClientRect();
  const alto = window.visualViewport?.height ?? window.innerHeight;
  const izquierda = Math.max(8, Math.min(window.innerWidth - caja.width - 8, r.left + r.width / 2 - caja.width / 2));
  const cabeDebajo = r.bottom + 8 + caja.height <= alto - 8;
  const cabeEncima = r.top - caja.height - 8 >= 8;
  const debajo = encima ? !cabeEncima && cabeDebajo : cabeDebajo;
  b.style.left = `${Math.round(izquierda)}px`;
  b.style.top = `${Math.round(debajo ? r.bottom + 8 : Math.max(8, r.top - caja.height - 8))}px`;
  bocadillo = b;
  temporizadorQuitar = window.setTimeout(quitarAyuda, duracion);
  return b;
}

/**
 * Pone la ayuda al tocar en toda la página. Devuelve cómo quitarla.
 * Solo atiende a los toques (pointerType "touch" o "pen"): el ratón sigue como siempre.
 */
export function activarAyudaAlTocar(raiz: Document = document): () => void {
  let espera = 0;
  let inicio: { x: number; y: number; id: number } | null = null;
  /** Se ha enseñado la ayuda con el dedo aún puesto: el clic que viene al levantarlo no cuenta. */
  let tragarClic = false;
  const cancelar = () => {
    clearTimeout(espera);
    inicio = null;
  };
  const fin = new AbortController();
  const o = { signal: fin.signal, capture: true, passive: true } as const;

  raiz.addEventListener('pointerdown', (ev) => {
    tragarClic = false;
    if (ev.pointerType === 'mouse') return;
    const dentro = bocadillo && ev.target instanceof Node && bocadillo.contains(ev.target);
    if (!dentro) quitarAyuda();
    cancelar();
    const ayuda = ayudaDe(ev.target);
    if (!ayuda) return;
    inicio = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    if (!sePulsa(ayuda.elemento)) return; // se enseña al levantar el dedo (si no ha arrastrado)
    // Lo que tiene su propio menú al dejar el dedo (una fila de la lista de objetos) enseña el menú, no la ayuda
    if (ev.target instanceof Element && ev.target.closest('[data-menu]')) return;
    espera = window.setTimeout(() => {
      inicio = null;
      tragarClic = true;
      mostrarAyuda(ayuda.elemento, ayuda.texto);
    }, ESPERA_AYUDA);
  }, o);
  raiz.addEventListener('pointermove', (ev) => {
    if (inicio && ev.pointerId === inicio.id && Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) > MOVIMIENTO_MAXIMO) cancelar();
  }, o);
  raiz.addEventListener('pointerup', (ev) => {
    const era = inicio;
    cancelar();
    if (!era || ev.pointerId !== era.id || ev.pointerType === 'mouse') return;
    const ayuda = ayudaDe(ev.target);
    if (ayuda && !sePulsa(ayuda.elemento)) mostrarAyuda(ayuda.elemento, ayuda.texto);
  }, o);
  raiz.addEventListener('pointercancel', cancelar, o);
  raiz.addEventListener('scroll', cancelar, o);
  // El clic que llega justo después de enseñar la ayuda no pulsa el botón
  raiz.addEventListener('click', (ev) => {
    if (!tragarClic) return;
    tragarClic = false;
    ev.preventDefault();
    ev.stopPropagation();
  }, { signal: fin.signal, capture: true });
  // El menú del navegador (al dejar el dedo) taparía el bocadillo
  raiz.addEventListener('contextmenu', (ev) => {
    if (tragarClic || bocadillo) ev.preventDefault();
  }, { signal: fin.signal, capture: true });
  return () => {
    fin.abort();
    cancelar();
    quitarAyuda();
  };
}
