/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PUBLICAR (sesión 3, bloque 5): el .zip para itch.io, el index.html para
 * GitHub Pages y los pasos que enseña el editor.
 */
import { describe, expect, it } from 'vitest';
import { crc32, crearZip } from '../src/exportar/zip';
import { nombreCorto, prepararPublicacion } from '../src/exportar/publicar';
import { proyectoVacio } from '../src/proyecto/formato';

/** Lee un .zip "a mano" siguiendo el formato: desde el final (el directorio central) hasta los datos. */
function leerZip(zip: Uint8Array): { nombre: string; texto: string; crcBien: boolean; metodo: number; utf8: boolean }[] {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const fin = zip.length - 22;
  expect(v.getUint32(fin, true)).toBe(0x06054b50);
  const entradas = v.getUint16(fin + 10, true);
  let c = v.getUint32(fin + 16, true);
  expect(c + v.getUint32(fin + 12, true)).toBe(fin); // el directorio central acaba justo donde empieza el final
  const archivos = [];
  for (let k = 0; k < entradas; k++) {
    expect(v.getUint32(c, true)).toBe(0x02014b50);
    const largo = v.getUint16(c + 28, true);
    const local = v.getUint32(c + 42, true);
    const crc = v.getUint32(c + 16, true);
    expect(v.getUint32(local, true)).toBe(0x04034b50);
    const largoLocal = v.getUint16(local + 26, true);
    const tamano = v.getUint32(local + 18, true);
    const datos = zip.subarray(local + 30 + largoLocal, local + 30 + largoLocal + tamano);
    archivos.push({
      nombre: new TextDecoder().decode(zip.subarray(c + 46, c + 46 + largo)),
      texto: new TextDecoder().decode(datos),
      crcBien: crc32(datos) === crc && v.getUint32(local + 14, true) === crc,
      metodo: v.getUint16(local + 8, true),
      utf8: (v.getUint16(local + 6, true) & 0x0800) !== 0,
    });
    c += 46 + largo;
  }
  return archivos;
}

describe('ZIP', () => {
  it('CRC-32 da los valores de referencia', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
    expect(crc32(new TextEncoder().encode('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
  });

  it('crea un zip que se puede leer: nombres (también con ñ y carpetas), contenido y huellas', () => {
    const zip = crearZip([
      { nombre: 'index.html', contenido: '<h1>Hola</h1>', fecha: new Date(2026, 8, 29, 10, 30, 12) },
      { nombre: 'img/niño.txt', contenido: 'ñandú' },
      { nombre: 'vacio.txt', contenido: new Uint8Array() },
    ]);
    const archivos = leerZip(zip);
    expect(archivos.map((a) => [a.nombre, a.texto])).toEqual([['index.html', '<h1>Hola</h1>'], ['img/niño.txt', 'ñandú'], ['vacio.txt', '']]);
    expect(archivos.every((a) => a.crcBien && a.metodo === 0 && a.utf8)).toBe(true);
  });

  it('la fecha va en el formato de MS-DOS', () => {
    const zip = crearZip([{ nombre: 'a', contenido: 'x', fecha: new Date(2026, 8, 29, 10, 30, 12) }]);
    const v = new DataView(zip.buffer);
    const hora = v.getUint16(10, true);
    const dia = v.getUint16(12, true);
    expect([hora >> 11, (hora >> 5) & 63, (hora & 31) * 2]).toEqual([10, 30, 12]);
    expect([(dia >> 9) + 1980, (dia >> 5) & 15, dia & 31]).toEqual([2026, 9, 29]);
  });
});

describe('Publicar', () => {
  const proyecto = { ...proyectoVacio('¡Mi Juego del Ñandú!'), ancho: 800, alto: 600 };
  const reproductor = 'console.log("reproductor")';

  it('nombres cortos para archivos y repositorios', () => {
    expect(nombreCorto('¡Mi Juego del Ñandú!')).toBe('mi-juego-del-nandu');
    expect(nombreCorto('***')).toBe('mi-juego');
  });

  it('itch.io: un zip con index.html dentro, y los pasos con el tamaño del juego', () => {
    const p = prepararPublicacion(proyecto, reproductor, 'itch');
    expect(p.descarga.nombre).toBe('mi-juego-del-nandu-itch.zip');
    expect(p.descarga.tipo).toBe('application/zip');
    const [index] = leerZip(p.descarga.contenido as Uint8Array);
    expect(index.nombre).toBe('index.html');
    expect(index.texto).toContain('<script type="application/json" id="proyecto-chispa">');
    expect(index.texto).toContain('reproductor');
    const pasos = p.pasos.join('\n');
    for (const t of ['Upload new project', 'Kind of project', '**HTML**', 'played in the browser', 'Viewport dimensions', '**800**', '**600**', 'Public']) expect(pasos).toContain(t);
    expect(p.enlace?.url).toBe('https://itch.io/game/new');
  });

  it('GitHub Pages: index.html y los pasos para activar Pages', () => {
    const p = prepararPublicacion(proyecto, reproductor, 'github');
    expect(p.descarga.nombre).toBe('index.html');
    expect(p.descarga.contenido).toContain('proyecto-chispa');
    const pasos = p.pasos.join('\n');
    for (const t of ['New repository', 'mi-juego-del-nandu', 'uploading an existing file', 'Commit changes', 'Settings', 'Pages', 'Deploy from a branch', 'main', 'github.io/mi-juego-del-nandu/']) expect(pasos).toContain(t);
  });

  it('un archivo suelto: .html con el nombre del juego', () => {
    const p = prepararPublicacion(proyecto, reproductor, 'archivo');
    expect(p.descarga.nombre).toBe('mi-juego-del-nandu.html');
    expect(p.pasos[0]).toMatch(/\d+ KB/);
  });

  it('las negritas de los pasos están bien escritas', () => {
    for (const d of ['itch', 'github', 'archivo'] as const) {
      const p = prepararPublicacion(proyecto, reproductor, d);
      // Las negritas están bien cerradas, y no quedan asteriscos sueltos
      for (const paso of p.pasos) {
        expect((paso.match(/\*\*/g) ?? []).length % 2).toBe(0);
        expect(paso.replace(/\*\*/g, '')).not.toContain('*');
      }
    }
  });
});
