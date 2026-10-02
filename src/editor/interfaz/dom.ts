/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Ayudas para construir la interfaz con HTML sin librerías.
 *
 *   h('button', { class: 'boton', onclick: () => ... }, 'Texto')
 *
 * crea un <button class="boton">Texto</button> con su evento. Es una forma
 * corta y legible de construir trozos de página desde TypeScript.
 */
import { esColorValido, resolverColor } from '../../motor/Color';

type Hijo = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & { class?: string; style?: string };

export function h<K extends keyof HTMLElementTagNameMap>(etiqueta: K, props: Props = {}, ...hijos: (Hijo | Hijo[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave.startsWith('on') && typeof valor === 'function') el.addEventListener(clave.slice(2), valor as EventListener);
    else if (clave === 'class') el.className = String(valor);
    else if (clave === 'style') el.setAttribute('style', String(valor));
    else if (clave in el && typeof valor !== 'string') (el as unknown as Record<string, unknown>)[clave] = valor;
    else el.setAttribute(clave, valor === true ? '' : String(valor));
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(typeof hijo === 'object' ? hijo : String(hijo));
  }
  return el;
}

/**
 * Pinta el fondo de un elemento con un color que puede venir de un proyecto.
 * Nunca se escribe dentro de style="..." (ahí se podría colar otra cosa de
 * CSS, como url(...), que cargaría algo de internet): se comprueba que es un
 * color y se pone con backgroundColor, que solo admite colores.
 */
export function fondoDeColor<T extends HTMLElement>(el: T, color: string | undefined, siNoVale = 'gray'): T {
  el.style.backgroundColor = color && esColorValido(color) ? resolverColor(color) : siNoVale;
  return el;
}

/** Vacía un elemento y le pone hijos nuevos. */
export function rellenar(el: HTMLElement, ...hijos: (Hijo | Hijo[])[]): void {
  el.replaceChildren(...(hijos.flat().filter((x) => x !== null && x !== undefined && x !== false) as (Node | string)[]).map((x) => (typeof x === 'number' ? String(x) : x)));
}

// ───────────────────────── Iconos (SVG, trazos simples) ─────────────────────────

const TRAZOS: Record<string, string> = {
  jugar: 'M7 4.5v15l12-7.5z',
  pausa: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  parar: 'M6 6h12v12H6z',
  mas: 'M12 5v14M5 12h14',
  basura: 'M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7',
  copiar: 'M8 8h11v11H8zM5 16V5h11',
  deshacer: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  rehacer: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  guardar: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  abrir: 'M4 7v12h16V9h-8l-2-2zM4 7V5h6l2 2',
  exportar: 'M12 4v11M7.5 8.5 12 4l4.5 4.5M5 14v6h14v-6',
  nuevo: 'M6 3h8l4 4v14H6zM14 3v4h4M12 11v6M9 14h6',
  codigo: 'M9 7 4 12l5 5M15 7l5 5-5 5',
  escena: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4',
  mover: 'M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5',
  pincel: 'M14.5 4.5l5 5-9 9H5.5v-5zM12.5 6.5l5 5',
  goma: 'M8 20h12M5 15l8-8 6 6-6 6H9zM9 11l6 6',
  cuadricula: 'M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16',
  iman: 'M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4',
  centrar: 'M12 4v4M12 16v4M4 12h4M16 12h4M12 12h.01',
  ayuda: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  imagen: 'M4 5h16v14H4zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM20 16l-5-5-8 8',
  sonido: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  animacion: 'M4 6h16v12H4zM8 6v12M16 6v12M4 10h4M4 14h4M16 10h4M16 14h4',
  plantilla: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5',
  script: 'M6 3h9l4 4v14H6zM9 12l-2 2 2 2M14 12l2 2-2 2',
  estrella: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z',
  arriba: 'M12 19V5M6 11l6-6 6 6',
  abajo: 'M12 5v14M6 13l6 6 6-6',
  cerrar: 'M6 6l12 12M18 6 6 18',
  ampliar: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  lupa: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l4 4',
  objeto: 'M5 5h14v14H5z',
  circulo: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  texto: 'M5 6V4h14v2M12 4v16M9 20h6',
  nota: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  boton: 'M3 8h18v8H3zM8 12h8',
  mapa: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  vacio: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 9v6M9 12h6',
  consola: 'M4 5h16v14H4zM7 9l3 3-3 3M12 15h5',
  aviso: 'M12 3 2 20h20zM12 10v5M12 17.5h.01',
  error: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01',
  carpeta: 'M3 6h6l2 2h10v11H3z',
  reproducir: 'M8 5v14l11-7z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  descargar: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14',
  entrar: 'M5 5v6a4 4 0 0 0 4 4h9M14 11l4 4-4 4',
  cubo: 'M5 9l7-5 7 5-7 7zM19 13c1 2 2 3 2 4.5a2 2 0 0 1-4 0c0-1.5 1-2.5 2-4.5',
  cuentagotas: 'M14.5 4.5l5 5M12 7l5 5M16 4l4 4-9.5 9.5-4 1 1-4z',
  espejo: 'M12 3v18M8 7l-4 10h4zM16 7l4 10h-4z',
  izquierda: 'M19 12H5M11 6l-6 6 6 6',
  derecha: 'M5 12h14M13 6l6 6-6 6',
  ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  libro: 'M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5zM7 8h2M15 8h2',
  mundo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z',
};

export function icono(nombre: keyof typeof TRAZOS | string, tamano = 18): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(tamano));
  svg.setAttribute('height', String(tamano));
  svg.setAttribute('class', 'icono');
  svg.setAttribute('aria-hidden', 'true');
  const relleno = nombre === 'jugar' || nombre === 'pausa' || nombre === 'parar' || nombre === 'reproducir';
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', TRAZOS[nombre] ?? TRAZOS.objeto);
  path.setAttribute('fill', relleno ? 'currentColor' : 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', relleno ? '0' : '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

/** Botón con icono y (opcionalmente) texto y ayuda al pasar el ratón. */
export function botonIcono(nombreIcono: string, ayuda: string, alPulsar: () => void, texto?: string, clase = ''): HTMLButtonElement {
  return h('button', { class: `boton-icono ${clase}`, title: ayuda, 'aria-label': ayuda, onclick: alPulsar }, icono(nombreIcono), texto ? h('span', {}, texto) : null);
}
