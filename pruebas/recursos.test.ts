/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * RECURSOS (noche, bloque 2): dónde se usa cada imagen, sonido y animación,
 * cambiarles el nombre en todas partes, el editor de pixel art e importar archivos.
 */
import { describe, expect, it } from 'vitest';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { PixelArt, pixelesDesdeRGBA } from '../src/editor/recursos/PixelArt';
import { importarArchivos, resumenImportar, tipoDeArchivo } from '../src/editor/recursos/importar';
import { imagenPrueba, sonidoPrueba } from './ayudantes';

function conRecursos(): EstadoEditor {
  const e = new EstadoEditor();
  e.agregarImagen('nave.png', imagenPrueba('AAA'));
  e.agregarImagen('roca.png', imagenPrueba('BBB'));
  e.agregarSonido('pum.wav', sonidoPrueba('CCC'));
  e.crearAnimacion('volar', ['nave']);
  e.crearObjeto('imagen', 0, 0, 'nave');
  e.crearObjeto('mapa', 0, 0);
  e.ponerTipoCasilla(e.seleccion!, 'piedra', { imagen: 'roca', solida: true });
  e.crearPlantillaVacia('Bala');
  e.cambiarPropiedad({ tipo: 'plantilla', nombre: 'Bala' }, 'sprite.imagen', 'roca');
  e.crearScriptSuelto('reglas');
  e.cambiarCodigo('reglas.chs', 'cuando empieza:\n    yo.imagen = "nave"\n    sonido.reproducir("pum")\n    # "nave" en un comentario no cuenta\n    yo.animar("Volar")\n');
  return e;
}

describe('Dónde se usa cada recurso', () => {
  it('imágenes: objetos, plantillas, casillas, animaciones y código', () => {
    const e = conRecursos();
    expect(e.usosDe('imagen', 'nave')).toEqual(['Nave (escena Principal)', 'la animación «volar»', 'reglas.chs (línea 2)']);
    expect(e.usosDe('imagen', 'roca')).toEqual(['la casilla «piedra» de Mapa (escena Principal)', 'la plantilla Bala']);
  });

  it('sonidos y animaciones (en el código, sin importar mayúsculas)', () => {
    const e = conRecursos();
    expect(e.usosDe('sonido', 'pum')).toEqual(['reglas.chs (línea 3)']);
    expect(e.usosDe('animacion', 'volar')).toEqual(['reglas.chs (línea 5)']);
    expect(e.usosDe('sonido', 'otro')).toEqual([]);
  });
});

describe('Cambiar el nombre de un recurso', () => {
  it('cambia en todas partes (también el código) y se deshace de una vez', () => {
    const e = conRecursos();
    const antes = JSON.stringify(e.proyecto);
    expect(e.renombrarRecurso('imagen', 'nave', 'Cohete')).toBe('Cohete');
    expect(Object.keys(e.proyecto.imagenes)).toEqual(['Cohete', 'roca']); // en el mismo sitio de la lista
    expect(e.escena.objetos[0].sprite?.imagen).toBe('Cohete');
    expect(e.proyecto.animaciones.volar.fotogramas).toEqual(['Cohete']);
    expect(e.proyecto.scripts['reglas.chs']).toContain('yo.imagen = "Cohete"');
    e.renombrarRecurso('imagen', 'roca', 'Pedrusco');
    expect(e.escena.objetos[1].mapa?.tipos.piedra.imagen).toBe('Pedrusco');
    expect(e.proyecto.plantillas.Bala.sprite?.imagen).toBe('Pedrusco');
    e.deshacer();
    e.deshacer();
    expect(JSON.stringify(e.proyecto)).toBe(antes);
  });

  it('sonidos y animaciones; un nombre repetido o vacío no se acepta', () => {
    const e = conRecursos();
    e.renombrarRecurso('sonido', 'pum', 'explosion');
    expect(e.proyecto.scripts['reglas.chs']).toContain('sonido.reproducir("explosion")');
    e.renombrarRecurso('animacion', 'volar', 'planear');
    expect(e.proyecto.scripts['reglas.chs']).toContain('yo.animar("planear")');
    expect(e.renombrarRecurso('imagen', 'nave', 'roca')).toBe('roca2');
    expect(e.renombrarRecurso('imagen', 'roca', '   ')).toBe('roca');
  });

  it('borrar una imagen la quita también de las casillas del mapa', () => {
    const e = conRecursos();
    e.borrarImagen('roca');
    expect(e.escena.objetos[1].mapa?.tipos.piedra.imagen).toBeUndefined();
    expect(e.proyecto.plantillas.Bala.sprite?.imagen).toBeUndefined();
  });
});

describe('Guardar un dibujo', () => {
  it('un fotograma es una imagen; varios, imágenes numeradas y una animación', () => {
    const e = new EstadoEditor();
    expect(e.guardarDibujo('Gato', [imagenPrueba('png1')])).toBe('Gato');
    expect(e.proyecto.imagenes.Gato).toBe(imagenPrueba('png1'));
    // Un dibujo NUEVO con el mismo nombre no pisa el anterior
    expect(e.guardarDibujo('Gato', [imagenPrueba('png2')])).toBe('Gato2');
    // Editando, sí se sobrescribe
    e.guardarDibujo('Gato', [imagenPrueba('png3')], 8, { sobrescribir: true });
    expect(e.proyecto.imagenes.Gato).toBe(imagenPrueba('png3'));
    expect(e.guardarDibujo('Andar', [imagenPrueba('a'), imagenPrueba('b'), imagenPrueba('c')], 12)).toBe('Andar');
    expect(e.proyecto.animaciones.Andar).toEqual({ fotogramas: ['Andar1', 'Andar2', 'Andar3'], velocidad: 12, repetir: true });
    expect(e.proyecto.imagenes.Andar2).toBe(imagenPrueba('b'));
    // Una animación editada sigue siendo una animación aunque tenga un solo fotograma
    e.guardarDibujo('Andar', [imagenPrueba('z')], 5, { sobrescribir: true, animacion: true });
    expect(e.proyecto.animaciones.Andar.fotogramas).toEqual(['Andar1']);
    expect(e.proyecto.imagenes.Andar1).toBe(imagenPrueba('z'));
  });
});

describe('Pixel art', () => {
  it('lápiz, goma y línea sin huecos', () => {
    const d = new PixelArt(8, 8);
    d.pintar(1, 1, '#ff0000');
    expect(d.obtener(1, 1)).toBe('#ff0000');
    d.pintar(1, 1, null);
    expect(d.obtener(1, 1)).toBeNull();
    d.linea(0, 0, 7, 3, '#000000');
    // Una línea continua: en cada columna hay al menos un píxel pintado
    for (let x = 0; x < 8; x++) expect([0, 1, 2, 3].some((y) => d.obtener(x, y) === '#000000'), `columna ${x}`).toBe(true);
    d.pintar(99, 99, '#fff'); // fuera: no pasa nada
    expect(d.obtener(99, 99)).toBeNull();
  });

  it('el cubo rellena la zona cerrada, sin salirse por las esquinas', () => {
    const d = new PixelArt(5, 5);
    // Un cuadrado hueco de 3 × 3
    for (const [x, y] of [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3], [3, 3]]) d.pintar(x, y, '#000000');
    d.rellenar(2, 2, '#ff0000');
    expect(d.obtener(2, 2)).toBe('#ff0000');
    expect(d.obtener(0, 0)).toBeNull();
    d.rellenar(0, 0, '#00ff00');
    expect(d.obtener(4, 4)).toBe('#00ff00');
    expect(d.obtener(2, 2)).toBe('#ff0000');
  });

  it('deshacer y rehacer por trazos', () => {
    const d = new PixelArt(4, 4);
    d.apuntar();
    d.linea(0, 0, 3, 0, '#000000');
    d.apuntar();
    d.pintar(0, 3, '#ffffff');
    expect(d.deshacer()).toBe(true);
    expect(d.obtener(0, 3)).toBeNull();
    expect(d.obtener(3, 0)).toBe('#000000');
    d.deshacer();
    expect(d.obtener(3, 0)).toBeNull();
    expect(d.deshacer()).toBe(false);
    d.rehacer();
    expect(d.obtener(3, 0)).toBe('#000000');
  });

  it('fotogramas: duplicar, nuevo, mover, borrar; voltear', () => {
    const d = new PixelArt(3, 1);
    d.pintar(0, 0, '#111111');
    d.duplicarFotograma();
    expect(d.fotogramas).toHaveLength(2);
    expect(d.actual).toBe(1);
    expect(d.obtener(0, 0)).toBe('#111111');
    d.voltear();
    expect([d.obtener(0, 0), d.obtener(2, 0)]).toEqual([null, '#111111']);
    d.nuevoFotograma();
    expect(d.estaVacio()).toBe(true);
    d.moverFotograma(-1);
    expect(d.actual).toBe(1);
    expect(d.estaVacio(1)).toBe(true);
    d.borrarFotograma();
    expect(d.fotogramas).toHaveLength(2);
    d.borrarFotograma();
    d.borrarFotograma(); // el último no se borra: se limpia
    expect(d.fotogramas).toHaveLength(1);
    expect(d.estaVacio()).toBe(true);
  });

  it('leer los píxeles de una imagen (lo casi transparente cuenta como vacío)', () => {
    const datos = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 10]);
    expect(pixelesDesdeRGBA(datos, 2, 1)).toEqual(['#ff0000', null]);
  });
});

describe('Importar archivos', () => {
  it('reconoce imágenes y sonidos por su tipo o su extensión', () => {
    expect(tipoDeArchivo({ name: 'a.png', type: '' })).toBe('imagen');
    expect(tipoDeArchivo({ name: 'x', type: 'audio/mpeg' })).toBe('sonido');
    expect(tipoDeArchivo({ name: 'salto.OGG', type: '' })).toBe('sonido');
    expect(tipoDeArchivo({ name: 'notas.txt', type: 'text/plain' })).toBeNull();
  });

  it('importa varios a la vez y explica lo que no ha podido', async () => {
    const e = new EstadoEditor();
    const r = await importarArchivos(e, [
      // Por dentro, un PNG y un WAV de verdad (empiezan con su firma), aunque el navegador diga otro tipo
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2])], 'Mi Nave.png', { type: '' }),
      new File(['RIFF\0\0\0\0WAVEyy'], 'pum.wav', { type: 'audio/wav' }),
      new File(['z'], 'deberes.txt', { type: 'text/plain' }),
      // Un archivo disfrazado: se llama .png pero es texto
      new File(['<script>alert(1)</script>'], 'trampa.png', { type: 'image/png' }),
    ]);
    expect(r.imagenes).toEqual(['MiNave']);
    expect(r.sonidos).toEqual(['pum']);
    expect(r.rechazados).toEqual(['"deberes.txt" no es una imagen, un sonido ni un tipo de letra', '"trampa.png" no es de verdad una imagen (o está dañado)']);
    // Se guarda con el tipo de verdad, no con el que decía el navegador
    expect(e.proyecto.imagenes.MiNave).toMatch(/^data:image\/png;base64,/);
    const m = resumenImportar(r)!;
    expect(m.tipo).toBe('ok');
    expect(m.texto).toContain('Imagen: MiNave');
    expect(m.texto).toContain('No se ha podido');
  });
});
