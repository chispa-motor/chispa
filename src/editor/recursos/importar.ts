/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * IMPORTAR ARCHIVOS: imágenes y sonidos del ordenador al proyecto.
 * Lo usan el botón «Importar» y soltar archivos encima del editor.
 */
import type { EstadoEditor } from '../estado/EstadoEditor';
import { leerComoDataURL } from '../escena/VistaEscena';
import { TAMANO_MAXIMO_ARCHIVO, TAMANO_MAXIMO_LETRA, formatoLetra, formatoReal, tipoRealDeArchivo } from '../../proyecto/archivos';
import { ErrorMotor } from '../../motor/Errores';

/** Más grande que esto no cabe bien en un proyecto que se guarda en el navegador. */
export const TAMANO_MAXIMO = TAMANO_MAXIMO_ARCHIVO;

/** El tipo que se escribe en la data URL, según lo que el archivo ES de verdad (no lo que dice su nombre). */
const MIME: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', mp3: 'audio/mpeg', webm: 'audio/webm', m4a: 'audio/mp4' };

/** data:application/octet-stream;base64,... → data:image/png;base64,... (con el tipo de verdad). */
function conTipoReal(datos: string): string {
  const coma = datos.indexOf(',');
  if (coma < 0 || !/;base64$/i.test(datos.slice(0, coma))) return datos;
  let inicio: Uint8Array;
  try {
    const bin = atob(datos.slice(coma + 1, coma + 1 + 88));
    inicio = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return datos;
  }
  const real = formatoReal(inicio);
  return real ? `data:${MIME[real.formato]};base64,${datos.slice(coma + 1)}` : datos;
}

/** Las fotos de un móvil miden 4000 píxeles y pesan varios megas: para un juego sobran. Por encima de esto, se reducen. */
export const LADO_MAXIMO_IMAGEN = 2048;
export const PESO_MAXIMO_IMAGEN = 1.5 * 1024 * 1024;
/** A esto se reduce el lado más largo de una imagen enorme. */
export const LADO_REDUCIDO = 1024;

/** El tamaño al que se queda una imagen de `ancho` × `alto` para que su lado más largo no pase de `maximo` (sin deformarla). */
export function tamanoReducido(ancho: number, alto: number, maximo = LADO_REDUCIDO): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto);
  if (!(mayor > maximo)) return { ancho, alto };
  const f = maximo / mayor;
  return { ancho: Math.max(1, Math.round(ancho * f)), alto: Math.max(1, Math.round(alto * f)) };
}

/** ¿Hay que reducirla? (mide o pesa demasiado para un juego) */
export function hayQueReducir(ancho: number, alto: number, peso: number): boolean {
  return Math.max(ancho, alto) > LADO_MAXIMO_IMAGEN || peso > PESO_MAXIMO_IMAGEN;
}

/**
 * Una foto de la galería del móvil → una imagen de un tamaño razonable para un juego.
 * Devuelve la data URL reducida y sus medidas, o null si no hace falta o no se puede
 * (entonces se importa tal cual, como siempre). Solo fotos y dibujos normales: los GIF
 * animados y los SVG se dejan como están.
 */
export async function reducirImagen(archivo: Blob, formato: string): Promise<{ datos: string; ancho: number; alto: number } | null> {
  if (!['png', 'jpeg', 'webp', 'bmp'].includes(formato) || typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  let mapa: ImageBitmap;
  try {
    // 'from-image': las fotos hechas con el móvil de lado salen derechas
    mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }
  try {
    if (!hayQueReducir(mapa.width, mapa.height, archivo.size)) return null;
    const t = tamanoReducido(mapa.width, mapa.height);
    const lienzo = document.createElement('canvas');
    lienzo.width = t.ancho;
    lienzo.height = t.alto;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mapa, 0, 0, t.ancho, t.alto);
    // Las fotos (JPEG) siguen siendo JPEG, que ocupa mucho menos; lo demás, PNG (puede tener partes transparentes)
    const datos = formato === 'jpeg' ? lienzo.toDataURL('image/jpeg', 0.86) : lienzo.toDataURL('image/png');
    return datos.startsWith('data:image/') ? { datos, ...t } : null;
  } catch {
    return null;
  } finally {
    mapa.close?.();
  }
}

export interface ResultadoImportar {
  imagenes: string[];
  sonidos: string[];
  letras: string[];
  /** Imágenes que se han reducido al importarlas (eran enormes), con su tamaño nuevo. */
  reducidas?: string[];
  /** Archivos que no se han podido importar, con el motivo. */
  rechazados: string[];
}

/** ¿Es una imagen o un sonido? Por el tipo que dice el navegador o, si no lo dice, por la extensión. */
export function tipoDeArchivo(archivo: { name: string; type: string }): 'imagen' | 'sonido' | 'letra' | null {
  if (archivo.type.startsWith('font/') || /\.(ttf|otf|woff2?)$/i.test(archivo.name)) return 'letra';
  if (archivo.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(archivo.name)) return 'imagen';
  if (archivo.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|aac|flac|webm)$/i.test(archivo.name)) return 'sonido';
  return null;
}

export async function importarArchivos(estado: EstadoEditor, archivos: Iterable<File>): Promise<ResultadoImportar> {
  const r: ResultadoImportar = { imagenes: [], sonidos: [], letras: [], rechazados: [] };
  for (const archivo of archivos) {
    const tipo = tipoDeArchivo(archivo);
    if (!tipo) {
      r.rechazados.push(`"${archivo.name}" no es una imagen, un sonido ni un tipo de letra`);
      continue;
    }
    if (tipo === 'letra') {
      r.letras.push(...(await importarLetra(estado, archivo, r.rechazados)));
      continue;
    }
    // No nos fiamos del nombre ni de lo que dice el navegador: miramos los primeros bytes
    const inicio = new Uint8Array(await archivo.slice(0, 16).arrayBuffer());
    // Las fotos HEIC del iPhone (si el navegador no las ha convertido solo) no se pueden usar en una web
    if (tipo === 'imagen' && /^ftyp(heic|heix|hevc|mif1|msf1|heif)/.test(String.fromCharCode(...inicio.slice(4, 12)))) {
      r.rechazados.push(`"${archivo.name}" es una foto en formato HEIC, que los navegadores no saben enseñar. En el iPhone: Ajustes > Cámara > Formatos > «El más compatible», o compártela como JPG`);
      continue;
    }
    // Una foto enorme (de la cámara del móvil) se reduce en vez de rechazarla o de engordar el proyecto
    // (hasta cuatro veces el tamaño máximo: más que eso ni se intenta abrir)
    const reducida = tipo === 'imagen' && archivo.size <= TAMANO_MAXIMO * 4 ? await reducirImagen(archivo, formatoReal(inicio)?.formato ?? '') : null;
    if (reducida) {
      try {
        const nombre = estado.agregarImagen(archivo.name, reducida.datos);
        r.imagenes.push(nombre);
        (r.reducidas ??= []).push(`${nombre} (ahora mide ${reducida.ancho}×${reducida.alto})`);
      } catch (e) {
        r.rechazados.push(e instanceof ErrorMotor ? e.message.replace(/^No se puede añadir /, '').replace(/\.$/, '') : `"${archivo.name}" no se ha podido leer`);
      }
      continue;
    }
    if (archivo.size > TAMANO_MAXIMO) {
      r.rechazados.push(`"${archivo.name}" es demasiado grande (más de ${TAMANO_MAXIMO / 1024 / 1024} MB)`);
      continue;
    }
    const real = await tipoRealDeArchivo(archivo);
    if (real !== tipo) {
      r.rechazados.push(real ? `"${archivo.name}" dice ser ${tipo === 'imagen' ? 'una imagen' : 'un sonido'}, pero por dentro es ${real === 'imagen' ? 'una imagen' : 'un sonido'}` : `"${archivo.name}" no es de verdad ${tipo === 'imagen' ? 'una imagen' : 'un sonido'} (o está dañado)`);
      continue;
    }
    try {
      const datos = conTipoReal(await leerComoDataURL(archivo));
      if (tipo === 'imagen') r.imagenes.push(estado.agregarImagen(archivo.name, datos));
      else r.sonidos.push(estado.agregarSonido(archivo.name, datos));
    } catch (e) {
      r.rechazados.push(e instanceof ErrorMotor ? e.message.replace(/^No se puede añadir /, '').replace(/\.$/, '') : `"${archivo.name}" no se ha podido leer`);
    }
  }
  return r;
}

/** Un tipo de letra: se mira por dentro (sus primeros bytes) y se guarda con su tipo de verdad. */
async function importarLetra(estado: EstadoEditor, archivo: File, rechazados: string[]): Promise<string[]> {
  if (archivo.size > TAMANO_MAXIMO_LETRA) {
    rechazados.push(`"${archivo.name}" es demasiado grande para ser un tipo de letra (más de ${TAMANO_MAXIMO_LETRA / 1024 / 1024} MB)`);
    return [];
  }
  const formato = formatoLetra(new Uint8Array(await archivo.slice(0, 16).arrayBuffer()));
  if (!formato) {
    rechazados.push(`"${archivo.name}" no es de verdad un tipo de letra (o está dañado)`);
    return [];
  }
  try {
    const datos = await leerComoDataURL(archivo);
    const coma = datos.indexOf(',');
    return [estado.agregarLetra(archivo.name, `data:font/${formato};base64,${datos.slice(coma + 1)}`)];
  } catch (e) {
    rechazados.push(e instanceof ErrorMotor ? e.message.replace(/^No se puede añadir /, '').replace(/\.$/, '') : `"${archivo.name}" no se ha podido leer`);
    return [];
  }
}

/** El mensaje para contar lo que ha pasado. */
export function resumenImportar(r: ResultadoImportar): { texto: string; tipo: 'ok' | 'error' } | null {
  const partes: string[] = [];
  if (r.imagenes.length) partes.push(`${r.imagenes.length === 1 ? 'Imagen' : 'Imágenes'}: ${r.imagenes.join(', ')}`);
  if (r.sonidos.length) partes.push(`${r.sonidos.length === 1 ? 'Sonido' : 'Sonidos'}: ${r.sonidos.join(', ')}`);
  if (r.letras.length) partes.push(`${r.letras.length === 1 ? 'Letra' : 'Letras'}: ${r.letras.join(', ')} (elígela en el inspector de un texto, o con yo.letra = "${r.letras[0]}")`);
  if (r.reducidas?.length) partes.push(`${r.reducidas.length === 1 ? 'Era muy grande y se ha reducido' : 'Eran muy grandes y se han reducido'}: ${r.reducidas.join(', ')}`);
  if (!partes.length && !r.rechazados.length) return null;
  const texto = [partes.length ? `Importado. ${partes.join(' · ')}.` : '', r.rechazados.length ? `No se ha podido: ${r.rechazados.join('; ')}. Se pueden importar imágenes (.png, .jpg, .gif, .svg), sonidos (.mp3, .ogg, .wav) y tipos de letra (.ttf, .otf, .woff, .woff2).` : ''].filter(Boolean).join(' ');
  return { texto, tipo: partes.length ? 'ok' : 'error' };
}
