/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LA PORTADA del juego para su página de itch.io: una imagen de 630×500 (el
 * tamaño que pide itch) con el color de fondo de la primera escena, el icono
 * del juego en grande y su nombre. Se dibuja en un lienzo del navegador.
 */
import { iconoDelJuego } from '../../exportar/exportar';
import { resolverColor } from '../../motor/Color';
import type { DefProyecto } from '../../proyecto/formato';

export const ANCHO_PORTADA = 630;
export const ALTO_PORTADA = 500;

/** Parte el nombre en líneas que quepan (como mucho tres; lo que sobre, con puntos suspensivos). */
export function lineasDeTitulo(nombre: string, cabe: (texto: string) => boolean, maximo = 3): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of nombre.trim().split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (cabe(prueba) || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  if (lineas.length > maximo) {
    lineas.length = maximo;
    lineas[maximo - 1] += '…';
  }
  // Una palabra sola más larga que el hueco: se recorta
  return lineas.map((l) => {
    let t = l;
    while (t.length > 2 && !cabe(t)) t = `${t.slice(0, -2)}…`;
    return t;
  });
}

function cargarImagen(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolver) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null);
    img.src = url;
  });
}

/** Dibuja la portada y la devuelve como PNG. null si el navegador no deja (sin lienzo). */
export async function hacerPortada(proyecto: DefProyecto): Promise<Uint8Array | null> {
  try {
    const lienzo = document.createElement('canvas');
    lienzo.width = ANCHO_PORTADA;
    lienzo.height = ALTO_PORTADA;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return null;
    // El fondo de la primera escena, un poco más oscuro por abajo para que se lea el nombre
    const fondo = proyecto.escenas[proyecto.escenaInicial]?.colorFondo ?? '#1e2233';
    ctx.fillStyle = resolverColor(fondo);
    ctx.fillRect(0, 0, ANCHO_PORTADA, ALTO_PORTADA);
    const sombra = ctx.createLinearGradient(0, ALTO_PORTADA * 0.45, 0, ALTO_PORTADA);
    sombra.addColorStop(0, '#00000000');
    sombra.addColorStop(1, '#000000b0');
    ctx.fillStyle = sombra;
    ctx.fillRect(0, 0, ANCHO_PORTADA, ALTO_PORTADA);

    const icono = iconoDelJuego(proyecto);
    const imagen = icono ? await cargarImagen(icono) : null;
    if (imagen && imagen.width > 0 && imagen.height > 0) {
      // Lo más grande que quepa en 240×240, sin deformar; el pixel art, con los píxeles nítidos
      const escala = Math.min(240 / imagen.width, 240 / imagen.height);
      const w = imagen.width * escala;
      const h = imagen.height * escala;
      ctx.imageSmoothingEnabled = !proyecto.pixelArt;
      ctx.drawImage(imagen, (ANCHO_PORTADA - w) / 2, 150 - h / 2 + 20, w, h);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 54px system-ui, "Segoe UI", sans-serif';
    ctx.lineJoin = 'round';
    const lineas = lineasDeTitulo(proyecto.nombre, (t) => ctx.measureText(t).width <= ANCHO_PORTADA - 60);
    const centro = imagen ? 380 : ALTO_PORTADA / 2;
    lineas.forEach((linea, i) => {
      const y = centro + (i - (lineas.length - 1) / 2) * 60;
      ctx.strokeStyle = '#000000c0';
      ctx.lineWidth = 8;
      ctx.strokeText(linea, ANCHO_PORTADA / 2, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(linea, ANCHO_PORTADA / 2, y);
    });

    const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/png'));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
