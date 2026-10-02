/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * ESTAMPAS: dibujos ya hechos, para no repetir lo caro en cada fotograma.
 *
 * Pintar una forma con sombra, resplandor, contorno o degradado cuesta mucho
 * (sobre todo lo borroso). Pero casi siempre sale IGUAL un fotograma tras
 * otro: lo único que cambia es dónde está y cuánto ha girado. Así que se
 * pinta una vez en un lienzo pequeño aparte (la estampa) y, mientras nada
 * cambie, en cada fotograma solo se «pega» esa imagen, que es rapidísimo.
 *
 * Cada estampa tiene una CLAVE (un texto con todo lo que decide cómo se ve).
 * Dos objetos con el mismo aspecto comparten estampa: 500 estrellas iguales
 * con resplandor son una sola. Se guardan las últimas que se han usado.
 */

/** Como mucho, estas estampas a la vez (al llegar, se tiran las que hace más que no se usan). */
export const MAXIMO_ESTAMPAS = 400;
/** Una estampa no pasa de este tamaño (en píxeles): lo muy grande se pinta directamente. */
export const LADO_MAXIMO_ESTAMPA = 768;
/**
 * Entre todas no pasan de estos píxeles (unos 64 MB de memoria). Sin este tope, un juego con
 * cientos de objetos enormes, cada uno de un color, llenaría la memoria del ordenador.
 */
export const MAXIMO_PIXELES_ESTAMPAS = 16_000_000;
/** Una estampa tan reciente no se tira para hacer sitio a otra (si no, se harían y tirarían sin parar). */
const VIDA_MINIMA_MS = 2000;

const estampas = new Map<string, HTMLCanvasElement>();
/** Cuándo se hizo cada una. */
const nacidas = new WeakMap<HTMLCanvasElement, number>();
let pixeles = 0;
let activas = true;
let ahora = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/** Para las pruebas: otro reloj (en milisegundos), para no tener que esperar. */
export function ponerRelojDeEstampas(reloj: () => number): void {
  ahora = reloj;
}

/** Tira una estampa y suelta su memoria. Quien la tuviera guardada lo nota con `estampaTirada`. */
function tirar(clave: string): void {
  const lienzo = estampas.get(clave);
  if (!lienzo) return;
  estampas.delete(clave);
  pixeles -= lienzo.width * lienzo.height;
  lienzo.width = 0;
  lienzo.height = 0;
}
function tirarTodas(): void {
  for (const clave of [...estampas.keys()]) tirar(clave);
  pixeles = 0;
}
/** ¿Esa estampa ya se ha tirado? (No se puede pegar: hay que pedirla otra vez.) */
export const estampaTirada = (lienzo: HTMLCanvasElement): boolean => lienzo.width === 0 || lienzo.height === 0;
/** Cuántos píxeles ocupan entre todas. */
export const pixelesDeEstampas = (): number => pixeles;

/** Para las pruebas: con `falso`, todo se pinta directamente (sin estampas). */
export function usarEstampas(si: boolean): void {
  activas = si;
  if (!si) tirarTodas();
}
export const estampasActivas = (): boolean => activas;
export const cuantasEstampas = (): number => estampas.size;
export function olvidarEstampas(): void {
  tirarTodas();
}

const numeros = new WeakMap<object, number>();
let siguiente = 1;
/** Un número distinto para cada cosa (una imagen, una lista de puntos): sirve para la clave. */
export function numeroDe(cosa: object | null | undefined): number {
  if (!cosa) return 0;
  let n = numeros.get(cosa);
  if (!n) numeros.set(cosa, (n = siguiente++));
  return n;
}

/**
 * La estampa de esa clave. Si no existe, se crea (de `ancho` × `alto` píxeles) y se
 * llama a `pintar` para dibujarla. null si no se puede (demasiado grande, sin lienzo, o no caben más).
 */
export function estampa(clave: string, ancho: number, alto: number, pintar: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement | null {
  if (!activas) return null;
  const ya = estampas.get(clave);
  if (ya) {
    // La más reciente, al final: las que se tiran son las del principio
    estampas.delete(clave);
    estampas.set(clave, ya);
    return ya;
  }
  const w = Math.ceil(ancho);
  const h = Math.ceil(alto);
  if (!(w >= 1 && h >= 1) || w > LADO_MAXIMO_ESTAMPA || h > LADO_MAXIMO_ESTAMPA || typeof document === 'undefined') return null;
  // Se hace sitio tirando las que hace más que no se piden. Si la más vieja es recién hecha, es que
  // en este juego no caben todas: esta no se hace (y ese objeto se pinta directamente, como siempre)
  const t = ahora();
  while (estampas.size >= MAXIMO_ESTAMPAS || pixeles + w * h > MAXIMO_PIXELES_ESTAMPAS) {
    const vieja = estampas.keys().next().value;
    if (vieja === undefined) break;
    if (t - (nacidas.get(estampas.get(vieja)!) ?? 0) < VIDA_MINIMA_MS) return null;
    tirar(vieja);
  }
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return null;
  pintar(ctx);
  estampas.set(clave, lienzo);
  nacidas.set(lienzo, t);
  pixeles += w * h;
  return lienzo;
}
