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
import { migrarProyecto, proyectoVacio, type DefProyecto } from '../src/proyecto/formato';
import { generarPaginaJuego, iconoDelJuego, pantallaDeCarga } from '../src/exportar/exportar';
import { imagenDeDibujo } from '../src/recursos/dibujos';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { lineasDeTitulo } from '../src/editor/exportar/portada';

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
    for (const t of ['Upload new project', '¡Mi Juego del Ñandú!', 'Kind of project', '**HTML**', 'played in the browser', 'Viewport dimensions', '**800**', '**600**', 'Public']) expect(pasos).toContain(t);
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

// ───────────────────────── Día 5, bloque 3: icono, nombre y pantalla de carga ─────────────────────────

describe('El icono, el nombre y la pantalla de carga del juego exportado', () => {
  const PNG = imagenDeDibujo('gema')!;
  const conIcono = (): DefProyecto => ({ ...proyectoVacio('La Gema <b>Azul</b> & "más"'), imagenes: { gema: PNG }, icono: 'gema', pixelArt: true });

  it('la página lleva el icono (pestaña del navegador) y la pantalla de carga con el nombre y «Hecho con Chispa»', () => {
    const html = generarPaginaJuego(conIcono(), 'console.log(1)');
    expect(html).toContain(`<link rel="icon" href="${PNG}">`);
    const carga = /<div id="cargando"[\s\S]*?<\/div><\/div>/.exec(html)![0];
    expect(carga).toContain(`<img class="pixel" src="${PNG}" alt="">`);
    expect(carga).toContain('Hecho con <b>Chispa</b>');
    // El nombre va escapado: no puede meter HTML en la página
    expect(carga).toContain('<h1>La Gema &lt;b&gt;Azul&lt;/b&gt; &amp; &quot;más&quot;</h1>');
    expect(html).not.toContain('<b>Azul</b>');
    // La pantalla de carga va antes del código, para que se vea desde el primer momento
    expect(html.indexOf('id="cargando"')).toBeLessThan(html.indexOf('<script>'));
    expect(html.indexOf('id="cargando"')).toBeGreaterThan(html.indexOf('id="lienzo"'));
  });

  it('sin icono no hay <link> ni imagen, pero sí pantalla de carga; y se puede quitar', () => {
    const sin = proyectoVacio('Sin icono');
    const html = generarPaginaJuego(sin, 'console.log(1)');
    expect(html).not.toContain('rel="icon"');
    expect(pantallaDeCarga(sin)).not.toContain('<img');
    expect(pantallaDeCarga(sin)).toContain('<h1>Sin icono</h1>');
    const quitada = generarPaginaJuego({ ...conIcono(), pantallaDeCarga: false }, 'console.log(1)');
    expect(quitada).not.toContain('<div id="cargando"');
    expect(quitada).toContain('rel="icon"');
  });

  it('un icono que no es una imagen del proyecto (o no es una imagen de verdad) no se usa', () => {
    expect(iconoDelJuego({ ...conIcono(), icono: 'no-esta' })).toBeNull();
    expect(iconoDelJuego({ ...conIcono(), icono: '__proto__' })).toBeNull();
    expect(iconoDelJuego({ ...conIcono(), icono: 'toString' })).toBeNull();
    expect(iconoDelJuego({ ...conIcono(), imagenes: { gema: 'javascript:alert(1)' } })).toBeNull();
    expect(iconoDelJuego({ ...conIcono(), imagenes: { gema: 'https://malo.example/x.png' } })).toBeNull();
    expect(iconoDelJuego(conIcono())).toBe(PNG);
  });

  it('los estilos de la pantalla de carga entran en la política de seguridad (no hace falta ningún estilo suelto)', () => {
    const html = generarPaginaJuego(conIcono(), 'console.log(1)');
    const carga = /<div id="cargando"[\s\S]*?<\/div><\/div>/.exec(html)![0];
    expect(carga).not.toMatch(/style=|onload|onerror|<script/i);
    expect(html).toContain('#cargando{');
    expect(html).toMatch(/img-src data: blob:/);
  });

  it('al abrir un proyecto: el icono tiene que ser una de sus imágenes; la pantalla de carga solo se guarda si se quita', () => {
    const base = JSON.parse(JSON.stringify(conIcono()));
    expect(migrarProyecto(base).icono).toBe('gema');
    expect('pantallaDeCarga' in migrarProyecto(base)).toBe(false);
    expect(migrarProyecto({ ...base, icono: 'otra' }).icono).toBeUndefined();
    expect(migrarProyecto({ ...base, pantallaDeCarga: false }).pantallaDeCarga).toBe(false);
    expect('pantallaDeCarga' in migrarProyecto({ ...base, pantallaDeCarga: true })).toBe(false);
    expect(() => migrarProyecto({ ...base, icono: 7 })).toThrow();
    expect(() => migrarProyecto({ ...base, pantallaDeCarga: 'no' })).toThrow();
  });

  it('en el editor: poner y quitar el icono se deshace; borrar o renombrar su imagen lo arrastra', () => {
    const e = new EstadoEditor();
    e.agregarImagen('gema', PNG);
    e.agregarImagen('otra', imagenDeDibujo('llave')!);
    e.ponerIcono('gema');
    expect(e.proyecto.icono).toBe('gema');
    e.ponerIcono('no-existe');
    expect(e.proyecto.icono).toBeUndefined();
    e.deshacer();
    expect(e.proyecto.icono).toBe('gema');
    e.renombrarRecurso('imagen', 'gema', 'joya');
    expect(e.proyecto.icono).toBe('joya');
    e.borrarImagen('otra');
    expect(e.proyecto.icono).toBe('joya');
    e.borrarImagen('joya');
    expect(e.proyecto.icono).toBeUndefined();
    e.deshacer();
    expect(e.proyecto.icono).toBe('joya');
    e.cambiarAjusteProyecto('pantallaDeCarga', false);
    expect(e.proyecto.pantallaDeCarga).toBe(false);
    e.cambiarAjusteProyecto('pantallaDeCarga', true);
    expect('pantallaDeCarga' in e.proyecto).toBe(false);
    // Sin icono, quitarlo no cuenta como un cambio
    const limpio = new EstadoEditor();
    limpio.ponerIcono(null);
    expect(limpio.modificado).toBe(false);
  });

  it('itch.io: los pasos dicen el nombre del juego, y la portada (si la hay) se descarga aparte', () => {
    const sin = prepararPublicacion(conIcono(), 'console.log(1)', 'itch');
    expect(sin.portada).toBeUndefined();
    expect(sin.pasos.join('\n')).not.toContain('portada');
    expect(sin.pasos.join('\n')).toContain('su icono');
    expect(sin.pasos.join('\n')).toContain('**Title**');
    const con = prepararPublicacion(conIcono(), 'console.log(1)', 'itch', new Uint8Array([137, 80, 78, 71]));
    expect(con.portada).toEqual({ nombre: 'la-gema-b-azul-b-mas-portada.png', contenido: new Uint8Array([137, 80, 78, 71]), tipo: 'image/png' });
    expect(con.pasos.join('\n')).toContain('Cover image');
    // El zip sigue llevando solo el juego
    expect(leerZip(con.descarga.contenido as Uint8Array).map((a) => a.nombre)).toEqual(['index.html']);
    // La portada solo es para itch.io
    expect(prepararPublicacion(conIcono(), 'console.log(1)', 'github', new Uint8Array([1])).portada).toBeUndefined();
  });

  it('el título de la portada se parte en líneas que caben (tres como mucho)', () => {
    const cabe = (t: string) => t.length <= 10;
    expect(lineasDeTitulo('Mi juego', cabe)).toEqual(['Mi juego']);
    expect(lineasDeTitulo('La gran aventura del ñandú', cabe)).toEqual(['La gran', 'aventura', 'del ñandú']);
    expect(lineasDeTitulo('uno dos tres cuatro cinco seis siete ocho nueve diez once', cabe)).toHaveLength(3);
    expect(lineasDeTitulo('Supercalifragilistico', cabe)[0].length).toBeLessThanOrEqual(10);
    expect(lineasDeTitulo('   ', cabe)).toEqual([]);
  });
});
