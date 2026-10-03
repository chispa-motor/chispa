/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LOS ICONOS DE LA APP (para instalar el juego en el móvil): el icono del
 * juego, pintado a 192 y a 512 píxeles sobre el color de fondo del juego.
 *
 * Se deja un margen alrededor: Android recorta los iconos en círculo o en
 * cuadrado redondeado, y lo que está cerca del borde se pierde.
 */
import type { DefProyecto } from '../../proyecto/formato';
import { iconoDelJuego } from '../../exportar/exportar';
import { LADOS_ICONO, colorDeLaApp, type IconosDeApp } from '../../exportar/pwa';

/** La parte del icono que seguro que se ve aunque el móvil lo recorte en círculo (el 80 % del centro). */
export const ZONA_SEGURA = 0.8;

function cargar(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolver) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null);
    img.src = url;
  });
}

function aPNG(lienzo: HTMLCanvasElement): Promise<Uint8Array | null> {
  return new Promise((resolver) => {
    try {
      lienzo.toBlob((b) => (b ? void b.arrayBuffer().then((a) => resolver(new Uint8Array(a))) : resolver(null)), 'image/png');
    } catch {
      resolver(null);
    }
  });
}

/**
 * Los iconos de la app con el icono del juego. null si el juego no tiene icono o el navegador
 * no deja pintarlo (entonces se usa el de por defecto: ver exportar/pwa.ts).
 */
export async function hacerIconos(proyecto: DefProyecto): Promise<IconosDeApp | null> {
  const datos = iconoDelJuego(proyecto);
  if (!datos || typeof document === 'undefined') return null;
  const img = await cargar(datos);
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;
  const iconos: Partial<IconosDeApp> = {};
  for (const lado of LADOS_ICONO) {
    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = lado;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = colorDeLaApp(proyecto);
    ctx.fillRect(0, 0, lado, lado);
    // El dibujo, entero y sin deformar, dentro de la zona segura (los dibujos de píxeles, con los píxeles nítidos)
    ctx.imageSmoothingEnabled = !proyecto.pixelArt;
    const f = (lado * ZONA_SEGURA) / Math.max(img.naturalWidth, img.naturalHeight);
    const w = img.naturalWidth * f;
    const h = img.naturalHeight * f;
    ctx.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);
    const png = await aPNG(lienzo);
    if (!png) return null;
    iconos[lado] = png;
  }
  return iconos as IconosDeApp;
}
