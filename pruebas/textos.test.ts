/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * TEXTOS CON HUECOS (bloque 1): "Puntos: {juego.puntos}".
 */
import { describe, expect, it } from 'vitest';
import { ErrorCompilacion } from '../src/chispa/errores/ErrorChispa';
import { errorDe, juegoDePrueba, mostrado, unObjeto, type OpcionesJuegoPrueba } from './ayudantes';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { tieneHuecos } from '../src/proyecto/TextosConHuecos';

function erroresAlPreparar(opciones: OpcionesJuegoPrueba): ErrorCompilacion {
  try {
    juegoDePrueba(opciones);
  } catch (e) {
    if (e instanceof ErrorCompilacion) return e;
    throw e;
  }
  throw new Error('Se esperaba un error al preparar el juego.');
}

describe('Textos con huecos en el lenguaje', () => {
  it('lo que va entre llaves se calcula y se mete en el texto', () => {
    expect(mostrado('variable vida = 3\nmostrar("Vida: {vida}")')).toBe('Vida: 3');
    expect(mostrado('variable a = 2\nmostrar("{a} + 1 = {a + 1}")')).toBe('2 + 1 = 3');
    expect(mostrado('mostrar("Tiempo: {redondear(2.6)} s")')).toBe('Tiempo: 3 s');
    expect(mostrado('variable l = ["a", "b"]\nmostrar("Primero: {l[1]}, hay {longitud(l)}")')).toBe('Primero: a, hay 2');
  });

  it('dos llaves seguidas son una llave de verdad', () => {
    expect(mostrado('mostrar("{{hola}}")')).toBe('{hola}');
  });

  it('errores: hueco sin cerrar, vacío o con un nombre que no existe (señalando la columna de dentro del texto)', () => {
    expect(errorDe('mostrar("Vida: {vida")').pista).toContain('{{');
    expect(errorDe('mostrar("Vida: {}")').message).toContain('vacío');
    const e = errorDe('variable vida = 3\nmostrar("Vida: {vidaa}")');
    expect(e.message).toContain("'vidaa'");
    expect(e.pista).toContain("'vida'");
    expect(e.posicion.columna).toBe(17);
  });

  it('sin huecos todo sigue igual', () => {
    expect(tieneHuecos('Hola')).toBe(false);
    expect(tieneHuecos('Hola {{ }}')).toBe(false);
    expect(tieneHuecos('Hola {nombre}')).toBe(true);
    expect(mostrado('mostrar("sin huecos")')).toBe('sin huecos');
  });
});

describe('Textos que se actualizan solos', () => {
  it('yo.texto = "Puntos: {juego.puntos}" se actualiza cuando cambian los puntos', () => {
    const j = unObjeto('cuando empieza:\n    juego.puntos = 0\n    yo.texto = "Puntos: {juego.puntos}"\ncuando se pulsa "espacio":\n    juego.puntos += 5\n    mostrar(yo.texto)\n');
    j.pulsar('Space', ' ');
    j.avanzar(1);
    expect(j.salida).toEqual(['Puntos: 5']);
  });

  it('un texto normal sustituye al que tenía huecos', () => {
    const j = unObjeto('cuando empieza:\n    juego.n = 1\n    yo.texto = "N: {juego.n}"\n    yo.texto = "fijo"\n    juego.n = 2\n    mostrar(yo.texto)\n');
    expect(j.salida).toEqual(['fijo']);
  });

  it('un texto del editor con huecos se actualiza solo, y puede usar las variables de su script', () => {
    const j = juegoDePrueba({
      scripts: { 'j.chs': 'cuando empieza:\n    juego.puntos = 0\ncuando cada fotograma:\n    juego.puntos += 1\n', 'p.chs': 'variable vidas = 3\n' },
      escena: [
        { nombre: 'Jugador', script: 'j.chs' },
        { nombre: 'Puntos', sprite: { forma: 'texto', texto: 'Puntos: {juego.puntos} · Vidas: {vidas}', fijo: true }, script: 'p.chs' },
        { nombre: 'Tiempo', sprite: { forma: 'texto', texto: '{redondear(tiempo.total)} s · {yo.nombre}' } },
      ],
    });
    j.avanzar(60);
    const texto = (n: string) => {
      const s = j.buscar(n).obtener(Sprite)!;
      s.actualizarTexto();
      return s.texto;
    };
    expect(texto('Puntos')).toBe('Puntos: 60 · Vidas: 3');
    expect(texto('Tiempo')).toBe('1 s · Tiempo');
    expect(j.errores).toEqual([]);
  });

  it('antes de ejecutar se revisan los textos del editor', () => {
    const e = erroresAlPreparar({ escena: [{ nombre: 'Puntos', sprite: { forma: 'texto', texto: 'Puntos: {juego.puntos + puntso}' } }] });
    expect(e.errores[0].mensajeCorto).toContain("en el texto de 'Puntos'");
    expect(e.errores[0].mensajeCorto).toContain("'puntso'");
    const mal = erroresAlPreparar({ escena: [{ nombre: 'T', sprite: { forma: 'texto', texto: 'Vida: {yo.vida' } }] });
    expect(mal.errores[0].pista).toContain('{{');
  });

  it('si un hueco falla mientras se juega, se avisa UNA vez y el juego sigue', () => {
    const j = juegoDePrueba({ escena: [{ nombre: 'Puntos', sprite: { forma: 'texto', texto: 'Puntos: {juego.puntos}' } }] });
    const s = j.buscar('Puntos').obtener(Sprite)!;
    for (let i = 0; i < 5; i++) s.actualizarTexto();
    expect(j.errores.length).toBe(1);
    expect(j.errores[0].error.message).toContain('juego.puntos');
    expect(j.errores[0].error.ubicacion.archivo).toBe('texto de Puntos');
  });
});

describe('Textos con huecos en el editor', () => {
  it('«Enseñar un dato»: ofrece los datos de juego de los scripts, los del objeto y el tiempo', async () => {
    const { datosParaTextos, insertarDato } = await import('../src/editor/estado/datosTextos');
    const { proyectoVacio } = await import('../src/proyecto/formato');
    const p = proyectoVacio();
    p.scripts['j.chs'] = 'cuando empieza:\n    juego.puntos = 0\n    juego.vidas = 3\n';
    const jugador = { nombre: 'Jugador', propiedades: { vida: 3 } };
    const texto = { nombre: 'Marcador', sprite: { forma: 'texto' as const, texto: 'Texto' } };
    const grupos = Object.fromEntries(datosParaTextos(p, [jugador, texto], texto));
    expect(grupos['Datos del juego'].map((x) => x[0])).toEqual(['{juego.puntos}', '{juego.vidas}']);
    expect(grupos['Otros objetos'][0][0]).toBe('{buscar("Jugador").vida}');
    expect(grupos.Tiempo[0][0]).toBe('{redondear(tiempo.total)}');
    // Un texto sin nada útil se sustituye por uno con nombre; si ya dice algo, se añade al final
    expect(insertarDato('Texto', '{juego.puntos}')).toBe('Puntos: {juego.puntos}');
    expect(insertarDato('Vidas:', '{juego.vidas}')).toBe('Vidas: {juego.vidas}');
    expect(insertarDato(undefined, '{redondear(tiempo.total)}')).toBe('Tiempo: {redondear(tiempo.total)}');
  });

  it('los huecos se colorean como código dentro del texto', async () => {
    const { parserChispa } = await import('../src/editor/codigo/lenguajeChispa');
    const { StringStream } = await import('@codemirror/language');
    const linea = 'mostrar("Vida: {yo.vida} y {{no}}")';
    const stream = new StringStream(linea, 4, 4);
    const estado = parserChispa.startState!(4);
    const trozos: [string, string | null][] = [];
    while (!stream.eol()) {
      const estilo = parserChispa.token(stream, estado);
      trozos.push([stream.current(), estilo]);
      stream.start = stream.pos;
    }
    expect(trozos).toEqual([
      ['mostrar', 'function'], ['(', 'punctuation'], ['"Vida: ', 'string'], ['{', 'special'], ['yo', 'special'], ['.', 'punctuation'], ['vida', 'propertyName'], ['}', 'special'],
      [' y {{no}}"', 'string'], [')', 'punctuation'],
    ]);
  });

  it('dentro de un hueco se autocompleta como en el código', async () => {
    const { EditorState } = await import('@codemirror/state');
    const { CompletionContext } = await import('@codemirror/autocomplete');
    const { fuenteAutocompletado } = await import('../src/editor/codigo/autocompletado');
    const { proyectoVacio } = await import('../src/proyecto/formato');
    const sugerir = (texto: string) => {
      const r = fuenteAutocompletado(() => proyectoVacio())(new CompletionContext(EditorState.create({ doc: texto }), texto.length, true));
      return r && 'options' in r ? r.options.map((o) => o.label) : [];
    };
    expect(sugerir('yo.texto = "Tiempo: {tiempo.')).toContain('total');
    expect(sugerir('yo.texto = "Tiempo: {redon')).toContain('redondear');
  });
});
