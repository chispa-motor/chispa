/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * TIPOS DE LETRA: con qué letra se escribe un texto.
 *
 * Hay dos clases:
 *   - Las LISTAS ("normal", "redonda", "clasica", "maquina", "manuscrita",
 *     "titulo" y "pixel"): usan letras que ya trae el ordenador, así que no
 *     ocupan nada ni hay que importar nada. En cada ordenador pueden verse un
 *     poco distintas (cada uno trae las suyas), pero siempre con el mismo aire.
 *   - Las TUYAS: archivos de letra (.ttf, .otf, .woff, .woff2) importados al
 *     proyecto. Van dentro del proyecto, y se ven igual en todas partes.
 *
 * La letra "pixel" es de Chispa (letraPixel.ts): una letra de puntos de 5×7,
 * dibujada a mano, con sus tildes y eñes. Se ve igual en todos los ordenadores.
 *
 * SEGURIDAD: las letras del proyecto se cargan desde sus bytes (FontFace con
 * un ArrayBuffer), nunca desde una dirección; el juego exportado sigue sin
 * poder pedir letras a internet (font-src 'none').
 */

import { ALTO_LETRA_PIXEL, FILAS_DE_TILDE, puntosDeTexto } from './letraPixel';

/** Las letras listas y las del ordenador que usa cada una (de la más deseada a la que siempre hay). */
const FAMILIAS: Record<string, string> = {
  normal: 'system-ui, "Segoe UI", sans-serif',
  redonda: '"Arial Rounded MT Bold", "Varela Round", "Nunito", "Comic Sans MS", "Trebuchet MS", system-ui, sans-serif',
  clasica: 'Georgia, "Times New Roman", "DejaVu Serif", serif',
  maquina: '"Cascadia Mono", Consolas, "DejaVu Sans Mono", "Courier New", monospace',
  manuscrita: '"Segoe Print", "Comic Sans MS", "Bradley Hand", "Chalkboard SE", cursive',
  titulo: 'Impact, "Haettenschweiler", "Arial Black", "DejaVu Sans Condensed", sans-serif',
  pixel: '"Cascadia Mono", Consolas, "DejaVu Sans Mono", "Courier New", monospace',
};

export const LETRAS = Object.keys(FAMILIAS);

/** Las letras del proyecto que ya están cargadas: nombre → familia con la que se dibuja. */
const propias = new Map<string, string>();

/** Como mucho, estas letras propias por proyecto. */
export const MAXIMO_LETRAS = 20;

/** El nombre de familia de una letra del proyecto (solo letras, números y guiones: no puede romper el CSS). */
function familiaDe(nombre: string): string {
  let h = 0;
  for (const c of nombre) h = (Math.imul(h, 31) + c.codePointAt(0)!) | 0;
  return `chispa-${nombre.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}-${(h >>> 0).toString(36)}`;
}

/** data:font/ttf;base64,AAEAAA... → sus bytes. */
function bytesDe(dataURL: string): ArrayBuffer | null {
  const coma = dataURL.indexOf(',');
  if (coma < 0) return null;
  try {
    const bin = atob(dataURL.slice(coma + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  } catch {
    return null;
  }
}

/**
 * Carga una letra del proyecto. Si el archivo está mal o el navegador no
 * sabe, no pasa nada: ese texto se verá con la letra normal.
 */
export async function cargarLetra(nombre: string, dataURL: string): Promise<boolean> {
  if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) return false;
  const bytes = bytesDe(dataURL);
  if (!bytes) return false;
  const familia = familiaDe(nombre);
  try {
    const cara = new FontFace(familia, bytes);
    await cara.load();
    document.fonts.add(cara);
    propias.set(nombre, familia);
    cacheLetraPixel.clear();
    return true;
  } catch {
    return false;
  }
}

/** Los nombres de las letras del proyecto (aunque alguna no se haya podido cargar: su texto sale con la normal). */
let declaradas: string[] = [];

/** Olvida las letras del proyecto anterior (al abrir otro) y apunta los nombres de las del nuevo. */
export function olvidarLetras(nombres: string[] = []): void {
  propias.clear();
  declaradas = [...nombres];
  cacheLetraPixel.clear();
}

/** Apunta los nombres de las letras del proyecto (sin tocar las ya cargadas). */
export function declararLetras(nombres: string[]): void {
  declaradas = [...nombres];
}

/** Todas las letras que se pueden usar ahora: las listas y las del proyecto. */
export function letrasDisponibles(): string[] {
  return [...LETRAS, ...declaradas.filter((n) => !LETRAS.includes(n))];
}

/** ¿Existe esta letra? (una de las listas o una del proyecto ya cargada) */
export function hayLetra(nombre: string): boolean {
  return Object.prototype.hasOwnProperty.call(FAMILIAS, nombre) || propias.has(nombre) || declaradas.includes(nombre);
}

/** Lo que se escribe en ctx.font para esta letra. */
export function familiaCss(letra: string | undefined): string {
  if (!letra) return FAMILIAS.normal;
  const propia = propias.get(letra);
  if (propia) return `"${propia}", ${FAMILIAS.normal}`;
  return Object.prototype.hasOwnProperty.call(FAMILIAS, letra) ? FAMILIAS[letra] : FAMILIAS.normal;
}

// ───────────────────────── La letra «pixel» ─────────────────────────

/** Alto en puntos de la letra pixel (un punto = un píxel gordo). */
const ALTO_PIXEL = ALTO_LETRA_PIXEL;

/** Un texto en píxeles gordos, listo para agrandarlo sin suavizar. */
export interface DibujoPixel {
  lienzo: HTMLCanvasElement;
  /** Puntos vacíos a la izquierda del texto. */
  margen: number;
  /** La fila que es «arriba del texto» y la que es su centro (para colocarlo). */
  arriba: number;
  centro: number;
}

const cacheLetraPixel = new Map<string, DibujoPixel | null>();

/**
 * El texto con la letra pixel: un lienzo pequeño (un punto = un píxel gordo)
 * con el texto en ese color. Normalmente con la letra de puntos de Chispa
 * (letraPixel.ts: igual en todos los ordenadores); si el texto lleva algún
 * signo que esa letra no tiene (un emoji, otro alfabeto), con una letra del
 * ordenador escrita muy pequeña y sin grises. null si no se puede (sin lienzo).
 */
export function textoPixel(texto: string, color: string, negrita: boolean): DibujoPixel | null {
  const clave = `${negrita ? 'n' : ''}|${color}|${texto}`;
  if (cacheLetraPixel.has(clave)) return cacheLetraPixel.get(clave)!;
  if (cacheLetraPixel.size > 400) cacheLetraPixel.clear();
  let dibujo: DibujoPixel | null = null;
  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const puntos = ctx ? puntosDeTexto(texto) : null;
    if (ctx && puntos) {
      c.width = Math.max(1, Math.min(4096, puntos[0].length + (negrita ? 1 : 0)));
      c.height = ALTO_PIXEL;
      ctx.fillStyle = color;
      puntos.forEach((fila, y) => {
        // Cada tramo seguido de puntos, de una vez (la negrita: un punto más de ancho)
        for (let x = 0; x < fila.length; x++) {
          if (fila[x] !== '#') continue;
          let fin = x;
          while (fila[fin + 1] === '#') fin++;
          ctx.fillRect(x, y, fin - x + 1 + (negrita ? 1 : 0), 1);
          x = fin;
        }
      });
      dibujo = { lienzo: c, margen: 0, arriba: FILAS_DE_TILDE - 1, centro: FILAS_DE_TILDE + 3.5 };
    } else if (ctx && typeof ctx.getImageData === 'function') {
      const fuente = `${negrita ? 'bold ' : ''}${ALTO_PIXEL}px ${FAMILIAS.pixel}`;
      ctx.font = fuente;
      c.width = Math.max(1, Math.min(2048, Math.ceil(ctx.measureText(texto).width) + 2));
      c.height = ALTO_PIXEL + 4;
      // Cambiar el tamaño del lienzo borra su configuración: se pone otra vez
      ctx.font = fuente;
      ctx.textBaseline = 'top';
      ctx.fillStyle = color;
      ctx.fillText(texto, 1, 2);
      const datos = ctx.getImageData(0, 0, c.width, c.height);
      const d = datos.data;
      // Sin grises: cada punto, pintado del todo o nada
      for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 105 ? 255 : 0;
      ctx.putImageData(datos, 0, 0);
      dibujo = { lienzo: c, margen: 1, arriba: 2, centro: 2 + ALTO_PIXEL / 2 };
    }
  } catch {
    dibujo = null;
  }
  cacheLetraPixel.set(clave, dibujo);
  return dibujo;
}

/** Cuánto se agranda la letra pixel para un tamaño de texto. */
export function escalaPixel(tamano: number): number {
  return Math.max(1, Math.round(tamano / ALTO_PIXEL));
}
