/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * SELECTOR DE COLOR del editor: una ventanita que sale al pulsar el cuadrado
 * de color de cualquier campo.
 *
 *   - la RUEDA: alrededor, el tono (rojo, amarillo, verde...); hacia el
 *     centro, menos intenso (hasta el blanco). Debajo, el brillo (hasta el
 *     negro) y la transparencia;
 *   - el código (#ff8800) para escribirlo o copiarlo;
 *   - el CUENTAGOTAS: coge un color de cualquier sitio de la pantalla (con
 *     el del navegador si lo tiene; si no, de lo que se ve en la escena);
 *   - MIS COLORES: los que guardas (van dentro del proyecto);
 *   - PALETAS LISTAS: pastel, retro, neón, natural... (las mismas que paleta() en Chispa).
 */
import { NOMBRES_COLORES, colorAComponentes, componentesAColor, esColorValido, resolverColor } from '../../motor/Color';
import { PALETAS, aHSV, desdeHSV } from '../../motor/Estilo';
import { h, icono } from './dom';

/** De dónde salen y dónde se guardan «Mis colores» (lo pone el editor al arrancar). */
export const misColores = {
  leer: (): string[] => [],
  guardar: (_colores: string[]): void => {},
};

interface EyeDropperNavegador {
  open(): Promise<{ sRGBHex: string }>;
}

let abierto: { cerrar: () => void } | null = null;

/** Abre el selector debajo de `ancla`. Cada cambio llama a `alElegir` (se puede llamar muchas veces). */
export function abrirSelectorColor(ancla: HTMLElement, inicial: string, alElegir: (color: string) => void): HTMLElement {
  abierto?.cerrar();
  let hsv = aHSV(resolverColor(inicial));
  const TAM = 168;

  const rueda = h('canvas', { class: 'rueda-color', width: String(TAM), height: String(TAM), title: 'Tono (alrededor) e intensidad (hacia el centro)' });
  const marca = h('div', { class: 'marca-rueda' });
  const brillo = h('input', { type: 'range', min: '0', max: '100', class: 'deslizador-brillo', 'aria-label': 'Brillo', title: 'Brillo: hacia la izquierda, más oscuro' });
  const opacidad = h('input', { type: 'range', min: '0', max: '100', class: 'deslizador-opacidad', 'aria-label': 'Transparencia', title: 'A la izquierda, transparente; a la derecha, se ve entero' });
  const codigo = h('input', { type: 'text', class: 'campo codigo-color', spellcheck: 'false', 'aria-label': 'Código del color', title: 'Un código como #ff8800, o un nombre: rojo, azul...' });
  const muestra = h('div', { class: 'muestra-color' });
  const listaMios = h('div', { class: 'muestras' });
  const listaPaleta = h('div', { class: 'muestras' });
  const selectorPaleta = h('select', { class: 'campo', 'aria-label': 'Paleta lista' }, Object.keys(PALETAS).map((n) => h('option', { value: n }, n)));

  const actual = () => desdeHSV(hsv.h, hsv.s, hsv.v, hsv.a);
  const elegir = (color: string, desdeCodigo = false) => {
    hsv = aHSV(resolverColor(color));
    pintar(desdeCodigo);
    alElegir(color.startsWith('#') || desdeCodigo ? color : actual());
  };
  const cambiarHSV = () => {
    pintar();
    alElegir(actual());
  };

  function pintarRueda(): void {
    const ctx = rueda.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(TAM, TAM);
    const r = TAM / 2;
    for (let y = 0; y < TAM; y++) {
      for (let x = 0; x < TAM; x++) {
        const dx = x - r + 0.5;
        const dy = r - y - 0.5;
        const d = Math.hypot(dx, dy) / r;
        if (d > 1) continue;
        const tono = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        const c = colorAComponentes(desdeHSV(tono, d, hsv.v)) ?? [0, 0, 0, 1];
        const i = (y * TAM + x) * 4;
        img.data[i] = c[0];
        img.data[i + 1] = c[1];
        img.data[i + 2] = c[2];
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  let brilloPintado = -1;
  function pintar(desdeCodigo = false): void {
    if (brilloPintado !== hsv.v) {
      pintarRueda();
      brilloPintado = hsv.v;
    }
    const a = (hsv.h * Math.PI) / 180;
    marca.style.left = `${TAM / 2 + Math.cos(a) * hsv.s * (TAM / 2)}px`;
    marca.style.top = `${TAM / 2 - Math.sin(a) * hsv.s * (TAM / 2)}px`;
    brillo.value = String(Math.round(hsv.v * 100));
    opacidad.value = String(Math.round(hsv.a * 100));
    if (!desdeCodigo) codigo.value = actual();
    muestra.style.background = actual();
    brillo.style.setProperty('--color-pleno', desdeHSV(hsv.h, hsv.s, 1));
    opacidad.style.setProperty('--color-pleno', desdeHSV(hsv.h, hsv.s, hsv.v));
  }

  // La rueda: arrastrar con el ratón
  const desdeRueda = (e: PointerEvent) => {
    const caja = rueda.getBoundingClientRect();
    const escala = TAM / (caja.width || TAM);
    const dx = (e.clientX - caja.left) * escala - TAM / 2;
    const dy = TAM / 2 - (e.clientY - caja.top) * escala;
    hsv.h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    hsv.s = Math.min(1, Math.hypot(dx, dy) / (TAM / 2));
    if (hsv.v === 0) hsv.v = 1; // con brillo 0 todo es negro: al tocar la rueda se ilumina
    cambiarHSV();
  };
  rueda.addEventListener('pointerdown', (e) => {
    rueda.setPointerCapture?.(e.pointerId);
    desdeRueda(e);
    const mover = (ev: PointerEvent) => desdeRueda(ev);
    const soltar = () => {
      rueda.removeEventListener('pointermove', mover);
      rueda.removeEventListener('pointerup', soltar);
    };
    rueda.addEventListener('pointermove', mover);
    rueda.addEventListener('pointerup', soltar);
  });
  brillo.addEventListener('input', () => {
    hsv.v = Number(brillo.value) / 100;
    cambiarHSV();
  });
  opacidad.addEventListener('input', () => {
    hsv.a = Number(opacidad.value) / 100;
    cambiarHSV();
  });
  codigo.addEventListener('change', () => {
    const t = codigo.value.trim();
    if (esColorValido(t)) elegir(t, true);
    else codigo.classList.add('mal');
  });
  codigo.addEventListener('input', () => codigo.classList.remove('mal'));

  const boton = (color: string, titulo = color) =>
    h('button', { class: 'muestra', style: `background: ${resolverColor(color)}`, title: titulo, 'aria-label': `Color ${titulo}`, 'data-color': color, onclick: () => elegir(color) });

  function pintarMios(): void {
    const mios = misColores.leer();
    listaMios.replaceChildren(
      ...mios.map((c) => {
        const b = boton(c);
        b.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          misColores.guardar(misColores.leer().filter((x) => x !== c));
          pintarMios();
        });
        b.title = `${c} (clic derecho: quitarlo)`;
        return b;
      }),
      h('button', { class: 'muestra guardar-color', title: 'Guardar este color en «Mis colores»', 'aria-label': 'Guardar este color', onclick: () => {
        misColores.guardar([...misColores.leer(), actual()]);
        pintarMios();
      } }, '+'),
    );
  }
  const pintarPaleta = () => listaPaleta.replaceChildren(...PALETAS[selectorPaleta.value].map((c) => boton(c)));
  selectorPaleta.addEventListener('change', pintarPaleta);

  const cuentagotas = h('button', { class: 'boton-icono', title: 'Cuentagotas: coge un color de la pantalla', 'aria-label': 'Cuentagotas', onclick: () => void usarCuentagotas((c) => elegir(c)) }, icono('cuentagotas', 16));

  const ventana = h('div', { class: 'selector-color-ventana', role: 'dialog', 'aria-label': 'Elegir un color' },
    h('div', { class: 'zona-rueda' }, rueda, marca),
    h('label', { class: 'fila-deslizador' }, h('span', {}, 'Brillo'), brillo),
    h('label', { class: 'fila-deslizador' }, h('span', {}, 'Opaco'), opacidad),
    h('div', { class: 'fila-codigo' }, muestra, codigo, cuentagotas),
    h('div', { class: 'titulo-muestras' }, 'Colores de Chispa'),
    h('div', { class: 'muestras' }, NOMBRES_COLORES.filter((n) => n !== 'violeta' && n !== 'transparente').map((n) => boton(n, n))),
    h('div', { class: 'titulo-muestras' }, 'Mis colores'),
    listaMios,
    h('div', { class: 'titulo-muestras' }, 'Paletas listas ', selectorPaleta),
    listaPaleta,
  );

  const caja = ancla.getBoundingClientRect();
  ventana.style.left = `${Math.max(4, Math.min(caja.left, window.innerWidth - 230))}px`;
  ventana.style.top = `${Math.min(caja.bottom + 4, window.innerHeight - 470)}px`;
  document.body.append(ventana);
  pintarMios();
  pintarPaleta();
  pintar();

  const fuera = (e: Event) => {
    if (!ventana.contains(e.target as Node) && e.target !== ancla && !esperandoCuentagotas) cerrar();
  };
  const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
  function cerrar(): void {
    ventana.remove();
    document.removeEventListener('pointerdown', fuera, true);
    document.removeEventListener('keydown', tecla, true);
    if (abierto?.cerrar === cerrar) abierto = null;
  }
  setTimeout(() => document.addEventListener('pointerdown', fuera, true));
  document.addEventListener('keydown', tecla, true);
  abierto = { cerrar };
  return ventana;
}

let esperandoCuentagotas = false;

/**
 * Coge un color de la pantalla. Con el cuentagotas del navegador (Chrome,
 * Edge), de cualquier sitio. Si no lo tiene (Firefox, Safari), el siguiente
 * clic en un dibujo del editor (la escena, el editor de píxeles...) coge el
 * color de ese punto.
 */
export async function usarCuentagotas(alCoger: (color: string) => void): Promise<void> {
  const Navegador = (window as unknown as { EyeDropper?: new () => EyeDropperNavegador }).EyeDropper;
  if (Navegador) {
    try {
      alCoger((await new Navegador().open()).sRGBHex);
    } catch {
      // cancelado con Escape: no pasa nada
    }
    return;
  }
  esperandoCuentagotas = true;
  document.body.classList.add('cogiendo-color');
  const clic = (e: PointerEvent) => {
    const lienzo = e.target instanceof HTMLCanvasElement ? e.target : null;
    if (lienzo) {
      e.preventDefault();
      e.stopPropagation();
      const color = colorEnLienzo(lienzo, e.clientX, e.clientY);
      if (color) alCoger(color);
    }
    terminar();
  };
  const terminar = () => {
    esperandoCuentagotas = false;
    document.body.classList.remove('cogiendo-color');
    document.removeEventListener('pointerdown', clic, true);
  };
  setTimeout(() => document.addEventListener('pointerdown', clic, true));
}

/** El color de un punto de un lienzo (coordenadas de la ventana). */
export function colorEnLienzo(lienzo: HTMLCanvasElement, clientX: number, clientY: number): string | null {
  const caja = lienzo.getBoundingClientRect();
  const x = Math.floor(((clientX - caja.left) / (caja.width || 1)) * lienzo.width);
  const y = Math.floor(((clientY - caja.top) / (caja.height || 1)) * lienzo.height);
  try {
    const d = lienzo.getContext('2d')?.getImageData(x, y, 1, 1).data;
    return d ? componentesAColor([d[0], d[1], d[2], d[3] / 255]) : null;
  } catch {
    return null;
  }
}
