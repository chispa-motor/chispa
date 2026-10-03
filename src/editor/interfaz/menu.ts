/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Un MENÚ que sale en un punto de la pantalla (el de la pulsación larga en la
 * escena, el de «Más» de la barra en el móvil). Se cierra al elegir algo, al
 * tocar fuera o con Escape, y nunca se sale de la pantalla.
 */
import { h, icono } from './dom';

export interface OpcionMenu {
  texto: string;
  icono?: string;
  ayuda?: string;
  /** En rojo (borrar). */
  peligro?: boolean;
  desactivada?: boolean;
  alPulsar: () => void;
}

let cerrarActual: (() => void) | null = null;

/** Cierra el menú que haya abierto (si hay). */
export function cerrarMenu(): void {
  cerrarActual?.();
}

/** Abre un menú con esas opciones junto al punto (x, y) de la ventana. Devuelve cómo cerrarlo. */
export function abrirMenu(x: number, y: number, opciones: (OpcionMenu | null)[], titulo?: string): () => void {
  cerrarMenu();
  const menu = h('div', { class: 'menu-flotante', role: 'menu', 'aria-label': titulo ?? 'Menú' },
    titulo ? h('div', { class: 'titulo-menu' }, titulo) : null,
    opciones.filter((o): o is OpcionMenu => !!o).map((o) => {
      const b = h('button', { class: `opcion-menu ${o.peligro ? 'peligro' : ''}`, role: 'menuitem', title: o.ayuda ?? '', onclick: () => {
        cerrar();
        o.alPulsar();
      } }, o.icono ? icono(o.icono, 18) : h('span', { class: 'sin-icono' }), h('span', {}, o.texto));
      b.disabled = !!o.desactivada;
      return b;
    }),
  );
  const fin = new AbortController();
  const cerrar = () => {
    menu.remove();
    fin.abort();
    if (cerrarActual === cerrar) cerrarActual = null;
  };
  cerrarActual = cerrar;
  document.body.append(menu);
  // Dentro de la pantalla (y de lo que se ve, si hay teclado)
  const caja = menu.getBoundingClientRect();
  const alto = window.visualViewport?.height ?? window.innerHeight;
  menu.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - caja.width - 8, x)))}px`;
  menu.style.top = `${Math.round(Math.max(8, Math.min(alto - caja.height - 8, y)))}px`;
  // Se cierra al tocar fuera (se espera un momento: el mismo toque que lo abre no lo cierra)
  setTimeout(() => {
    if (fin.signal.aborted) return;
    document.addEventListener('pointerdown', (e) => {
      if (!menu.contains(e.target as Node)) cerrar();
    }, { signal: fin.signal, capture: true });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cerrar();
    }
  }, { signal: fin.signal, capture: true });
  window.addEventListener('resize', cerrar, { signal: fin.signal });
  return cerrar;
}

/** Cuánto hay que dejar el dedo quieto para que salga el menú (milisegundos). */
export const ESPERA_MENU = 550;

/**
 * Le pone a un elemento un menú propio: sale con el botón derecho del ratón, con la tecla del
 * menú y dejando el dedo quieto encima. Es la manera de hacer SIN RATÓN lo que con ratón se hace
 * con doble clic o arrastrando (cambiar el nombre, cambiar el orden, poner algo en la escena...).
 */
export function conMenu<T extends HTMLElement>(el: T, opciones: () => (OpcionMenu | null)[], titulo?: string): T {
  el.dataset.menu = '';
  let abiertoEn = 0;
  const abrir = (x: number, y: number) => {
    // (en Android, dejar el dedo manda también «contextmenu»: que no salga dos veces)
    if (Date.now() - abiertoEn < 700) return;
    abiertoEn = Date.now();
    abrirMenu(x, y, opciones(), titulo);
  };
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    abrir(e.clientX, e.clientY);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    abrir(r.left + 20, r.bottom);
  });
  let espera = 0;
  let inicio: { x: number; y: number } | null = null;
  let tragarClic = false;
  const cancelar = () => {
    clearTimeout(espera);
    inicio = null;
  };
  el.addEventListener('pointerdown', (e) => {
    tragarClic = false;
    if (e.pointerType === 'mouse') return;
    cancelar();
    inicio = { x: e.clientX, y: e.clientY };
    // Con el dedo no se «arrastra» como con el ratón (en Android, dejar el dedo empezaría a arrastrar y no saldría el menú)
    if (el.draggable) {
      el.draggable = false;
      const devolver = () => {
        el.draggable = true;
        el.removeEventListener('pointerup', devolver);
        el.removeEventListener('pointercancel', devolver);
      };
      el.addEventListener('pointerup', devolver);
      el.addEventListener('pointercancel', devolver);
    }
    espera = window.setTimeout(() => {
      if (!inicio) return;
      tragarClic = true;
      abrir(inicio.x + 6, inicio.y + 6);
      inicio = null;
    }, ESPERA_MENU);
  });
  el.addEventListener('pointermove', (e) => {
    if (inicio && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 10) cancelar();
  });
  el.addEventListener('pointerup', cancelar);
  el.addEventListener('pointercancel', cancelar);
  el.addEventListener('pointerleave', cancelar);
  // El clic que llega al levantar el dedo tras abrir el menú no selecciona ni abre nada
  el.addEventListener('click', (e) => {
    if (!tragarClic) return;
    tragarClic = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
  return el;
}
