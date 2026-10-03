/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CHISPA COMO APP: instalar el editor en la pantalla de inicio y usarlo sin internet.
 *
 * El service worker (sw.js, hecho al compilar: ver vite.config.ts) guarda los archivos
 * del editor en el aparato. Instalar es cosa del navegador, y cada uno lo hace a su manera:
 *   - Chrome y Edge (Android, Chromebook, ordenador) avisan de que se puede instalar
 *     («beforeinstallprompt»): se guarda el aviso y el botón de Ajustes lo usa.
 *   - Safari (iPhone, iPad) NO avisa ni deja hacerlo desde un botón: hay que ir a
 *     Compartir > «Añadir a pantalla de inicio». Se explica con palabras.
 */

interface AvisoDeInstalar extends Event {
  prompt(): Promise<unknown>;
}

let aviso: AvisoDeInstalar | null = null;
let preparado = false;

/** Apunta el service worker y se queda con el aviso de «se puede instalar». Solo en el editor compilado. */
export function prepararApp(compilado: boolean = import.meta.env.PROD): void {
  if (preparado) return;
  preparado = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    aviso = e as AvisoDeInstalar;
  });
  window.addEventListener('appinstalled', () => (aviso = null));
  // Solo en sitios seguros (https o localhost): en los demás el navegador no deja, y no pasa nada
  if (compilado && 'serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      /* sin service worker el editor va igual, solo que necesita internet para abrirse */
    });
  }
}

/** ¿Está abierto como app (desde la pantalla de inicio)? */
export function abiertoComoApp(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as { standalone?: boolean }).standalone === true;
}

/** ¿El navegador deja instalar desde un botón? */
export const sePuedeInstalarConBoton = (): boolean => aviso !== null;

/** Abre la ventana de instalar del navegador. Devuelve si se ha podido abrir. */
export async function instalar(): Promise<boolean> {
  if (!aviso) return false;
  const a = aviso;
  aviso = null;
  try {
    await a.prompt();
    return true;
  } catch {
    return false;
  }
}

export type Navegador = 'safari-movil' | 'android' | 'otro';

export function queNavegador(agente = navigator.userAgent, puntosTactiles = navigator.maxTouchPoints ?? 0): Navegador {
  // (un iPad moderno dice que es un Mac: se le reconoce porque tiene pantalla táctil)
  if (/iPhone|iPad|iPod/.test(agente) || (/Macintosh/.test(agente) && puntosTactiles > 1)) return 'safari-movil';
  if (/Android/.test(agente)) return 'android';
  return 'otro';
}

/** Cómo se instala en este aparato, con palabras. */
export function comoInstalar(navegador: Navegador = queNavegador()): string {
  if (navegador === 'safari-movil') return 'En Safari: toca el botón de Compartir (el cuadrado con la flecha hacia arriba) y elige «Añadir a pantalla de inicio».';
  if (navegador === 'android') return 'En Chrome: abre el menú (los tres puntos de arriba) y elige «Instalar app» o «Añadir a pantalla de inicio».';
  return 'En Chrome o Edge: pulsa el icono de instalar que sale a la derecha de la barra de direcciones (o en el menú, «Instalar Chispa»).';
}
