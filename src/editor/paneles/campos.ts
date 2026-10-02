/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CAMPOS del panel de propiedades: número, texto, color, casilla y lista.
 *
 * Todos siguen la misma idea:
 *   - Se guardan al pulsar Intro o al salir del campo (no letra a letra).
 *   - Tienen una ayuda al pasar el ratón (title) que explica qué hacen.
 *   - Llevan `data-ruta`, para que al redibujar el panel el cursor vuelva al
 *     mismo campo.
 *
 * Los campos de número se pueden cambiar ARRASTRANDO su nombre a izquierda o
 * derecha, como en Unity y Godot.
 */
import { resolverColor } from '../../motor/Color';
import { abrirSelectorColor } from '../interfaz/SelectorColor';
import { h } from '../interfaz/dom';

export interface OpcionesNumero {
  paso?: number;
  min?: number;
  max?: number;
  /** Si se permite dejarlo vacío (= valor por defecto). */
  vacio?: string;
  ayuda?: string;
  /** Para cambios largos (arrastrar): se llaman al empezar y terminar. */
  empezar?: () => void;
  terminar?: () => void;
}

function fila(etiqueta: HTMLElement | string, control: HTMLElement, ayuda?: string): HTMLElement {
  return h('label', { class: 'campo-fila', title: ayuda }, typeof etiqueta === 'string' ? h('span', { class: 'campo-etiqueta' }, etiqueta) : etiqueta, control);
}

export function campoNumero(etiqueta: string, ruta: string, valor: number | undefined, alCambiar: (v: number | undefined) => void, o: OpcionesNumero = {}): HTMLElement {
  const limitar = (v: number) => Math.min(o.max ?? Infinity, Math.max(o.min ?? -Infinity, v));
  const entrada = h('input', {
    type: 'number',
    class: 'campo',
    step: String(o.paso ?? 1),
    value: valor === undefined ? '' : String(valor),
    placeholder: o.vacio ?? '',
    'data-ruta': ruta,
    onchange: () => {
      const t = entrada.value.trim().replace(',', '.');
      if (t === '') return alCambiar(o.vacio !== undefined ? undefined : 0);
      const n = Number(t);
      if (Number.isFinite(n)) alCambiar(limitar(n));
    },
  });
  // Arrastrar la etiqueta para cambiar el número
  const nombre = h('span', { class: 'campo-etiqueta arrastrable' }, etiqueta);
  nombre.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const inicioX = e.clientX;
    const inicial = Number(entrada.value) || 0;
    const paso = o.paso ?? 1;
    let movido = false;
    nombre.setPointerCapture(e.pointerId);
    const mover = (ev: PointerEvent) => {
      const pasos = Math.round((ev.clientX - inicioX) / 3);
      if (pasos === 0 && !movido) return;
      if (!movido) o.empezar?.();
      movido = true;
      const v = limitar(Math.round((inicial + pasos * paso) / paso) * paso);
      entrada.value = String(Number(v.toFixed(4)));
      alCambiar(Number(v.toFixed(4)));
    };
    const soltar = () => {
      nombre.removeEventListener('pointermove', mover);
      nombre.removeEventListener('pointerup', soltar);
      if (movido) o.terminar?.();
      else entrada.focus();
    };
    nombre.addEventListener('pointermove', mover);
    nombre.addEventListener('pointerup', soltar);
  });
  return fila(nombre, entrada, o.ayuda ?? `${etiqueta} (arrastra el nombre para cambiarlo)`);
}

let numeroDeLista = 0;

/** `sugerencias`: valores que se ofrecen al escribir (se puede escribir otra cosa). */
export function campoTexto(etiqueta: string, ruta: string, valor: string | undefined, alCambiar: (v: string) => void, ayuda?: string, placeholder = '', sugerencias: string[] = []): HTMLElement {
  const entrada = h('input', { type: 'text', class: 'campo', value: valor ?? '', placeholder, spellcheck: 'false', 'data-ruta': ruta, onchange: () => alCambiar(entrada.value) });
  const f = fila(etiqueta, entrada, ayuda);
  if (sugerencias.length) {
    const id = `sugerencias-${++numeroDeLista}`;
    entrada.setAttribute('list', id);
    f.append(h('datalist', { id }, sugerencias.map((s) => h('option', { value: s }))));
  }
  return f;
}

export function campoCasilla(etiqueta: string, ruta: string, valor: boolean, alCambiar: (v: boolean) => void, ayuda?: string): HTMLElement {
  const entrada = h('input', { type: 'checkbox', checked: valor, 'data-ruta': ruta, onchange: () => alCambiar(entrada.checked) });
  return h('label', { class: 'campo-fila casilla', title: ayuda }, h('span', { class: 'campo-etiqueta' }, etiqueta), h('span', { class: 'contenedor-casilla' }, entrada));
}

export function campoLista(etiqueta: string, ruta: string, valor: string, opciones: [string, string][], alCambiar: (v: string) => void, ayuda?: string): HTMLElement {
  const lista = h('select', { class: 'campo', 'data-ruta': ruta, onchange: () => alCambiar(lista.value) },
    opciones.map(([v, texto]) => h('option', { value: v, selected: v === valor }, texto)),
  );
  return fila(etiqueta, lista, ayuda);
}

/** Convierte cualquier color (nombre en español, #abc, rgb()...) a #rrggbb para el selector de color. */
export function aHex(color: string): string {
  const c = resolverColor(color).trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('').toLowerCase();
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c);
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  return '#ffffff';
}

/**
 * Color: un cuadrado que abre el selector de color (rueda, cuentagotas,
 * paletas...) y un texto para escribir "rojo" o "#ff0000".
 */
export function campoColor(etiqueta: string, ruta: string, valor: string, alCambiar: (v: string) => void, ayuda = 'Un nombre (rojo, azul...) o un código como #ff8800'): HTMLElement {
  const texto = h('input', { type: 'text', class: 'campo', value: valor, spellcheck: 'false', 'data-ruta': ruta, onchange: () => texto.value.trim() && alCambiar(texto.value.trim()) });
  // Mientras se arrastra por la rueda llegan muchos cambios: se aplican juntos, cuando para un momento
  let pendiente: ReturnType<typeof setTimeout> | null = null;
  const selector = h('button', { type: 'button', class: 'selector-color', style: `background: ${resolverColor(valor)}`, title: 'Elegir un color (rueda, cuentagotas, paletas...)', 'aria-label': `Elegir el color de ${etiqueta}`, 'data-ruta-color': ruta, onclick: () => {
    abrirSelectorColor(selector, texto.value || valor, (c) => {
      texto.value = c;
      selector.style.background = resolverColor(c);
      if (pendiente) clearTimeout(pendiente);
      pendiente = setTimeout(() => alCambiar(c), 120);
    });
  } });
  return fila(etiqueta, h('span', { class: 'campo-color' }, selector, texto), ayuda);
}

/** Una sección que se puede plegar, con un interruptor opcional (para quitar o poner un componente). */
export function seccion(titulo: string, contenido: (HTMLElement | null)[], o: { activo?: boolean; alActivar?: (v: boolean) => void; ayuda?: string; plegada?: boolean } = {}): HTMLElement {
  const cuerpo = h('div', { class: 'seccion-cuerpo' }, contenido);
  const interruptor =
    o.alActivar &&
    h('input', {
      type: 'checkbox',
      class: 'interruptor',
      checked: o.activo ?? true,
      title: o.activo ? `Quitar ${titulo.toLowerCase()}` : `Añadir ${titulo.toLowerCase()}`,
      onclick: (e: Event) => e.stopPropagation(),
      onchange: (e: Event) => o.alActivar!((e.target as HTMLInputElement).checked),
    });
  const detalles = h('details', { class: `seccion ${o.activo === false ? 'inactiva' : ''}`, open: !o.plegada && o.activo !== false },
    h('summary', { title: o.ayuda }, h('span', { class: 'seccion-titulo' }, titulo), interruptor),
    cuerpo,
  );
  return detalles;
}
