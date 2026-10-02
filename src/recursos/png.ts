/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * UN PNG HECHO A MANO: convierte unos píxeles (rojo, verde, azul y
 * transparencia de cada uno) en un archivo PNG, sin lienzo ni navegador.
 * Sirve para los dibujos que trae Chispa: se guardan como letras (legibles)
 * y se convierten en imágenes de verdad al usarlos.
 *
 * Un PNG son «trozos» (cabecera, datos, fin), cada uno con su longitud, su
 * nombre y un número de comprobación (CRC). Los datos van «comprimidos» con
 * zlib; aquí se usa la forma más simple, sin comprimir de verdad (bloques
 * «guardados»): los dibujos son tan pequeños que no merece la pena más.
 */

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const x of bytes) {
    a = (a + x) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function trozo(nombre: string, datos: Uint8Array): Uint8Array {
  const r = new Uint8Array(12 + datos.length);
  const v = new DataView(r.buffer);
  v.setUint32(0, datos.length);
  for (let i = 0; i < 4; i++) r[4 + i] = nombre.charCodeAt(i);
  r.set(datos, 8);
  v.setUint32(8 + datos.length, crc32(r.subarray(4, 8 + datos.length)));
  return r;
}

/** Los píxeles (4 bytes cada uno: rojo, verde, azul, opacidad; de arriba abajo y de izquierda a derecha) → un archivo PNG. */
export function codificarPNG(ancho: number, alto: number, rgba: Uint8Array): Uint8Array {
  if (!(ancho >= 1 && alto >= 1) || rgba.length !== ancho * alto * 4) throw new Error('El número de píxeles no coincide con el tamaño de la imagen.');
  // Cada fila empieza con un 0 («sin filtro») y luego sus píxeles
  const filas = new Uint8Array((ancho * 4 + 1) * alto);
  for (let y = 0; y < alto; y++) filas.set(rgba.subarray(y * ancho * 4, (y + 1) * ancho * 4), y * (ancho * 4 + 1) + 1);
  // zlib con bloques «guardados» (de 65535 bytes como mucho): 2 bytes de cabecera, 5 por bloque y 4 de comprobación
  const cuantos = Math.max(1, Math.ceil(filas.length / 65535));
  const datos = new Uint8Array(2 + cuantos * 5 + filas.length + 4);
  datos.set([0x78, 0x01]);
  let pos = 2;
  for (let i = 0; i < cuantos; i++) {
    const desde = i * 65535;
    const n = Math.min(65535, filas.length - desde);
    datos.set([i === cuantos - 1 ? 1 : 0, n & 0xff, n >> 8, ~n & 0xff, (~n >> 8) & 0xff], pos);
    datos.set(filas.subarray(desde, desde + n), pos + 5);
    pos += 5 + n;
  }
  new DataView(datos.buffer).setUint32(pos, adler32(filas));

  const cabecera = new Uint8Array(13);
  const v = new DataView(cabecera.buffer);
  v.setUint32(0, ancho);
  v.setUint32(4, alto);
  cabecera.set([8, 6, 0, 0, 0], 8); // 8 bits por color, con transparencia (RGBA)
  const partes = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), trozo('IHDR', cabecera), trozo('IDAT', datos), trozo('IEND', new Uint8Array(0))];
  const png = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
  let en = 0;
  for (const p of partes) {
    png.set(p, en);
    en += p.length;
  }
  return png;
}

/** Un PNG como "data:image/png;base64,..." (como van las imágenes en un proyecto). */
export function pngADataURL(png: Uint8Array): string {
  let binario = '';
  for (let i = 0; i < png.length; i += 0x8000) binario += String.fromCharCode(...png.subarray(i, i + 0x8000));
  return `data:image/png;base64,${btoa(binario)}`;
}
