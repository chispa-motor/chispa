/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * RECURSOS LISTOS (día 5, bloque 2): los dibujos, los sonidos y la música
 * que trae Chispa. Que sean imágenes y sonidos DE VERDAD (un PNG bien hecho,
 * un sonido que se oye), que se añadan al proyecto sin repetirse y que un
 * juego los pueda usar.
 */
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { CATEGORIAS_DIBUJOS, DIBUJOS, PALETA, coloresDe, dibujosEscritos, imagenDeDibujo } from '../src/recursos/dibujos';
import { codificarPNG, pngADataURL } from '../src/recursos/png';
import { CANCIONES_LISTAS, SONIDOS_LISTOS } from '../src/recursos/sonidos';
import { problemaDataURL } from '../src/proyecto/archivos';
import { migrarProyecto } from '../src/proyecto/formato';
import { revisarProyecto } from '../src/proyecto/Revision';
import { generarSonido } from '../src/sonido/generador';
import { renderizarCancion } from '../src/sonido/musica';
import { juegoDePrueba } from './ayudantes';

/** Lee un PNG de los nuestros: sus trozos, y los píxeles ya descomprimidos. */
function leerPNG(png: Uint8Array) {
  const vista = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const trozos: { tipo: string; datos: Uint8Array; crc: number }[] = [];
  let i = 8;
  while (i < png.length) {
    const largo = vista.getUint32(i);
    const tipo = String.fromCharCode(...png.slice(i + 4, i + 8));
    trozos.push({ tipo, datos: png.slice(i + 8, i + 8 + largo), crc: vista.getUint32(i + 8 + largo) });
    i += 12 + largo;
  }
  const cabecera = trozos.find((t) => t.tipo === 'IHDR')!.datos;
  const c = new DataView(cabecera.buffer, cabecera.byteOffset);
  const ancho = c.getUint32(0);
  const alto = c.getUint32(4);
  // inflateSync comprueba también la suma Adler32
  const crudo = inflateSync(Buffer.concat(trozos.filter((t) => t.tipo === 'IDAT').map((t) => Buffer.from(t.datos))));
  return { ancho, alto, trozos, crudo, bits: cabecera[8], color: cabecera[9] };
}

const deBase64 = (url: string) => new Uint8Array(Buffer.from(url.split(',')[1], 'base64'));

describe('El codificador de PNG', () => {
  it('hace un PNG de verdad: firma, cabecera, datos y final', () => {
    const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const png = codificarPNG(3, 2, rgba);
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const { ancho, alto, trozos, crudo, bits, color } = leerPNG(png);
    expect([ancho, alto, bits, color]).toEqual([3, 2, 8, 6]);
    expect(trozos.map((t) => t.tipo)).toEqual(['IHDR', 'IDAT', 'IEND']);
    // Cada fila: un 0 (sin filtro) y sus píxeles, tal cual
    expect([...crudo]).toEqual([0, ...rgba.slice(0, 12), 0, ...rgba.slice(12)]);
  });

  it('aguanta una imagen grande (más de un bloque de 65535 bytes)', () => {
    const lado = 200;
    const rgba = new Uint8Array(lado * lado * 4).map((_, i) => (i * 7) % 256);
    const { crudo, ancho } = leerPNG(codificarPNG(lado, lado, rgba));
    expect(ancho).toBe(lado);
    expect(crudo.length).toBe(lado * (lado * 4 + 1));
    expect(crudo[1]).toBe(rgba[0]);
    expect(crudo[crudo.length - 1]).toBe(rgba[rgba.length - 1]);
  });

  it('no acepta medidas que no cuadran con los datos', () => {
    expect(() => codificarPNG(2, 2, new Uint8Array(3))).toThrow();
    expect(() => codificarPNG(0, 2, new Uint8Array(0))).toThrow();
  });

  it('da una "data URL" que el proyecto acepta como imagen', () => {
    expect(problemaDataURL(pngADataURL(codificarPNG(1, 1, new Uint8Array([1, 2, 3, 255]))), 'imagen')).toBeNull();
  });
});

describe('Los dibujos que trae Chispa', () => {
  it('hay de todo: personajes, enemigos, objetos y casillas para mapas', () => {
    for (const categoria of CATEGORIAS_DIBUJOS) expect(DIBUJOS.filter((d) => d.categoria === categoria).length).toBeGreaterThanOrEqual(5);
    const nombres = DIBUJOS.map((d) => d.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    // Nombres sencillos: sin tildes, sin espacios, en minúsculas
    for (const n of nombres) expect(n).toMatch(/^[a-z][a-z0-9]*$/);
  });

  it('los escritos a mano son de 16×16 y solo usan letras de la paleta', () => {
    for (const d of dibujosEscritos()) {
      const colores = coloresDe(d);
      expect(colores.length, d.nombre).toBe(16);
      for (const fila of colores) {
        expect(fila.length, d.nombre).toBe(16);
        for (const letra of fila) expect(letra === '.' || letra in PALETA, `${d.nombre}: «${letra}»`).toBe(true);
      }
      // Que no sea un cuadrado liso ni esté vacío: tiene hueco y tiene dibujo
      const llenos = colores.flat().filter((l) => l !== '.').length;
      expect(llenos, d.nombre).toBeGreaterThan(20);
      expect(new Set(colores.flat()).size, d.nombre).toBeGreaterThanOrEqual(3);
    }
  });

  it('cada uno es un PNG de 16×16 que el proyecto acepta', () => {
    for (const d of DIBUJOS) {
      const url = imagenDeDibujo(d.nombre)!;
      expect(problemaDataURL(url, 'imagen'), d.nombre).toBeNull();
      const { ancho, alto, crudo } = leerPNG(deBase64(url));
      expect([ancho, alto], d.nombre).toEqual([16, 16]);
      expect(crudo.length).toBe(16 * 65);
    }
    expect(imagenDeDibujo('no-existe')).toBeNull();
  });

  it('las casillas llenan todo el cuadro (no dejan huecos en el mapa) y no hay dos dibujos iguales', () => {
    const vistos = new Set<string>();
    for (const d of DIBUJOS) {
      const url = imagenDeDibujo(d.nombre)!;
      expect(vistos.has(url), d.nombre).toBe(false);
      vistos.add(url);
      if (d.categoria !== 'casillas') continue;
      const { crudo } = leerPNG(deBase64(url));
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) expect(crudo[y * 65 + 1 + x * 4 + 3], d.nombre).toBe(255);
    }
  });
});

describe('Los sonidos y la música que trae Chispa', () => {
  it('cada efecto se oye, no satura y dura lo que un efecto', () => {
    const nombres = SONIDOS_LISTOS.map((s) => s.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const s of SONIDOS_LISTOS) {
      expect(s.nombre).toMatch(/^[a-z][a-z0-9]*$/);
      const muestras = generarSonido(s.sonido);
      let pico = 0;
      for (const m of muestras) pico = Math.max(pico, Math.abs(m));
      expect(pico, s.nombre).toBeGreaterThan(0.05);
      expect(pico, s.nombre).toBeLessThanOrEqual(1);
      expect(muestras.length / 44100, s.nombre).toBeLessThan(2.5);
    }
  });

  it('cada canción tiene varias pistas con notas, y suena', () => {
    for (const c of CANCIONES_LISTAS) {
      expect(c.cancion.pistas.length, c.nombre).toBeGreaterThanOrEqual(3);
      for (const p of c.cancion.pistas) {
        expect(p.notas.length, c.nombre).toBeGreaterThan(0);
        for (const n of p.notas) expect(n.paso + n.largo, c.nombre).toBeLessThanOrEqual(c.cancion.pasos);
      }
      const muestras = renderizarCancion(c.cancion);
      let pico = 0;
      for (const m of muestras) pico = Math.max(pico, Math.abs(m));
      expect(pico, c.nombre).toBeGreaterThan(0.05);
      expect(pico, c.nombre).toBeLessThanOrEqual(1);
    }
  });
});

describe('Añadirlos al proyecto', () => {
  it('un dibujo se añade una sola vez, y se puede poner en la escena', () => {
    const e = new EstadoEditor();
    const antes = e.escena.objetos.length;
    expect(e.anadirRecursoListo('dibujo', 'heroe', true)).toBe('heroe');
    expect(e.proyecto.imagenes.heroe).toBe(imagenDeDibujo('heroe'));
    expect(e.escena.objetos.length).toBe(antes + 1);
    expect(e.anadirRecursoListo('dibujo', 'heroe', true)).toBe('heroe');
    expect(Object.keys(e.proyecto.imagenes).filter((n) => n.startsWith('heroe'))).toEqual(['heroe']);
    expect(e.escena.objetos.length).toBe(antes + 2);
    // Una casilla solo va a las imágenes
    e.anadirRecursoListo('dibujo', 'hierba');
    expect(e.escena.objetos.length).toBe(antes + 2);
    // Se deshace de una vez: el dibujo y el objeto
    e.deshacer();
    expect(e.proyecto.imagenes.hierba).toBeUndefined();
    e.deshacer();
    expect(e.escena.objetos.length).toBe(antes + 1);
  });

  it('si ya había OTRA imagen con ese nombre, no la pisa', () => {
    const e = new EstadoEditor();
    const mia = pngADataURL(codificarPNG(1, 1, new Uint8Array([9, 9, 9, 255])));
    e.agregarImagen('gato', mia);
    const final = e.anadirRecursoListo('dibujo', 'gato')!;
    expect(final).not.toBe('gato');
    expect(e.proyecto.imagenes.gato).toBe(mia);
    expect(e.proyecto.imagenes[final]).toBe(imagenDeDibujo('gato'));
  });

  it('los sonidos y las canciones se añaden sin repetirse, y lo que no existe no hace nada', () => {
    const e = new EstadoEditor();
    expect(e.anadirRecursoListo('sonido', 'moneda')).toBe('moneda');
    expect(e.anadirRecursoListo('sonido', 'moneda')).toBe('moneda');
    expect(Object.keys(e.proyecto.sonidosHechos ?? {})).toEqual(['moneda']);
    expect(e.anadirRecursoListo('cancion', 'misterio')).toBe('misterio');
    expect(e.anadirRecursoListo('cancion', 'misterio')).toBe('misterio');
    expect(Object.keys(e.proyecto.canciones ?? {})).toEqual(['misterio']);
    // Es una copia: cambiarla en el proyecto no cambia la de Chispa
    e.proyecto.canciones!.misterio.tempo = 200;
    expect(CANCIONES_LISTAS.find((c) => c.nombre === 'misterio')!.cancion.tempo).toBe(84);
    for (const tipo of ['dibujo', 'sonido', 'cancion'] as const) expect(e.anadirRecursoListo(tipo, '__proto__')).toBeNull();
    expect(e.anadirRecursoListo('dibujo', 'constructor')).toBeNull();
  });

  it('un proyecto con TODOS los recursos se guarda, se abre y se juega sin avisos', () => {
    const e = new EstadoEditor();
    for (const d of DIBUJOS) e.anadirRecursoListo('dibujo', d.nombre, d.categoria !== 'casillas');
    for (const s of SONIDOS_LISTOS) e.anadirRecursoListo('sonido', s.nombre);
    for (const c of CANCIONES_LISTAS) e.anadirRecursoListo('cancion', c.nombre);
    const indice = e.escena.objetos.findIndex((o) => o.sprite?.imagen === 'heroe');
    expect(indice).toBeGreaterThanOrEqual(0);
    const archivo = e.crearScriptPara({ tipo: 'escena', escena: e.escenaActual, indice })!;
    e.cambiarCodigo(archivo, 'cuando empieza:\n    musica.reproducir("accion")\n    sonido.reproducir("moneda")\n    yo.imagen = "gato"\n');
    const abierto = migrarProyecto(JSON.parse(JSON.stringify(e.proyecto)));
    expect(Object.keys(abierto.imagenes).length).toBe(DIBUJOS.length);
    expect(Object.keys(abierto.sonidosHechos ?? {}).length).toBe(SONIDOS_LISTOS.length);
    expect(Object.keys(abierto.canciones ?? {}).length).toBe(CANCIONES_LISTAS.length);
    expect(revisarProyecto(abierto).errores).toEqual([]);
    const j = juegoDePrueba({ proyecto: abierto });
    j.avanzar(5);
    expect(j.errores).toEqual([]);
    expect(j.avisos).toEqual([]);
  });
});
