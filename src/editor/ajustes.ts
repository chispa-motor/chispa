/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * AJUSTES DEL EDITOR: tema claro u oscuro y tamaño de la letra.
 *
 * Son de quien usa el editor, no del juego: se guardan en el navegador
 * (localStorage) y no van dentro del proyecto. Se aplican con variables de
 * CSS en <html>: el tema con data-tema="claro", la letra del código con
 * --tamano-codigo y la del editor con --zoom-interfaz.
 */
import { h } from './interfaz/dom';
import { abrirDialogo } from './interfaz/dialogos';

export interface Ajustes {
  tema: 'oscuro' | 'claro';
  /** Tamaño de la letra del código, en píxeles. */
  letraCodigo: number;
  /** Tamaño de la letra del resto del editor, en píxeles. */
  letraInterfaz: number;
}

export const AJUSTES_POR_DEFECTO: Ajustes = { tema: 'oscuro', letraCodigo: 15, letraInterfaz: 13.5 };
export const LIMITES = { letraCodigo: [11, 26], letraInterfaz: [11, 19] } as const;
const CLAVE = 'chispa-ajustes';

/** Lo guardado (arreglado si está mal: un número fuera de sus límites, un tema que no existe...). */
export function leerAjustes(texto: string | null): Ajustes {
  let a: Partial<Ajustes> = {};
  try {
    a = texto ? JSON.parse(texto) : {};
  } catch {
    a = {};
  }
  const numero = (v: unknown, [min, max]: readonly [number, number], d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
  return {
    tema: a.tema === 'claro' ? 'claro' : 'oscuro',
    letraCodigo: numero(a.letraCodigo, LIMITES.letraCodigo, AJUSTES_POR_DEFECTO.letraCodigo),
    letraInterfaz: numero(a.letraInterfaz, LIMITES.letraInterfaz, AJUSTES_POR_DEFECTO.letraInterfaz),
  };
}

export function cargarAjustes(): Ajustes {
  try {
    return leerAjustes(localStorage.getItem(CLAVE));
  } catch {
    return { ...AJUSTES_POR_DEFECTO };
  }
}

export function guardarAjustes(a: Ajustes): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(a));
  } catch {
    // Sin almacenamiento (modo incógnito...): se usan solo mientras la página esté abierta
  }
}

export function aplicarAjustes(a: Ajustes, raiz: HTMLElement = document.documentElement): void {
  raiz.dataset.tema = a.tema;
  raiz.style.setProperty('--tamano-codigo', `${a.letraCodigo}px`);
  raiz.style.setProperty('--tamano-interfaz', `${a.letraInterfaz}px`);
  // Los paneles se agrandan todos a la vez (zoom), para que no se descoloque nada
  raiz.style.setProperty('--zoom-interfaz', String(Math.round((a.letraInterfaz / AJUSTES_POR_DEFECTO.letraInterfaz) * 1000) / 1000));
}

/** La ventana de ajustes: cada cambio se ve al momento y se guarda. */
export function abrirAjustes(): void {
  const a = cargarAjustes();
  const cambiar = (nuevo: Partial<Ajustes>) => {
    Object.assign(a, nuevo);
    aplicarAjustes(a);
    guardarAjustes(a);
    rellenarValores();
  };
  const tema = (t: Ajustes['tema'], texto: string) =>
    h('button', { class: `opcion-tema ${a.tema === t ? 'activa' : ''}`, 'data-tema': t, onclick: () => cambiar({ tema: t }) }, texto);
  const temas = h('div', { class: 'opciones-tema' });
  const deslizador = (clave: 'letraCodigo' | 'letraInterfaz') => {
    const [min, max] = LIMITES[clave];
    return h('input', { type: 'range', min: String(min), max: String(max), step: '0.5', value: String(a[clave]), 'data-ajuste': clave, oninput: (e: Event) => cambiar({ [clave]: Number((e.target as HTMLInputElement).value) }) });
  };
  const valorCodigo = h('span', { class: 'valor-ajuste' });
  const valorInterfaz = h('span', { class: 'valor-ajuste' });
  const rellenarValores = () => {
    temas.replaceChildren(tema('oscuro', '🌙 Oscuro'), tema('claro', '☀️ Claro'));
    valorCodigo.textContent = `${a.letraCodigo} px`;
    valorInterfaz.textContent = `${a.letraInterfaz} px`;
  };
  rellenarValores();
  abrirDialogo('Ajustes', h('div', { class: 'ajustes' },
    h('h3', {}, 'Tema'), temas,
    h('h3', {}, 'Letra del código'), h('div', { class: 'fila-ajuste' }, deslizador('letraCodigo'), valorCodigo),
    h('h3', {}, 'Letra del editor'), h('div', { class: 'fila-ajuste' }, deslizador('letraInterfaz'), valorInterfaz),
    h('p', { class: 'nota' }, 'Se guardan en este navegador (no van dentro del proyecto). Atajo: Ctrl + ,'),
  ), [
    { texto: 'Volver a lo de siempre', alPulsar: () => cambiar({ ...AJUSTES_POR_DEFECTO }) },
    { texto: 'Cerrar', clase: 'principal' },
  ]);
}
