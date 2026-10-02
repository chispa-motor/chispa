/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * SONIDO (día 3): el generador de efectos, el editor de música (sus notas y
 * su sintetizador) y los comandos nuevos: sonido con sitio, cambios en vivo
 * y música adaptativa. (En los tests no hay altavoz: se comprueban las
 * muestras que se calculan y lo que se le pide al motor de sonido.)
 */
import { describe, expect, it } from 'vitest';
import {
  DURACION_MAXIMA, FRECUENCIA_MUESTREO, LIMITES_SONIDO, ONDAS, SONIDO_BASE, TIPOS_DE_SONIDO,
  aDataURL, aWAV, completarSonido, duracionDe, generarSonido, mutarSonido, sonidoDeTipo, type ParamsSonido,
} from '../src/sonido/generador';
import {
  FRECUENCIA_MUSICA, INSTRUMENTOS, TAMBORES, cambiarPasos, cancionDeEjemplo, cancionVacia, duracionDeCancion, frecuenciaDeNota,
  nombreDeNota, notaEn, notasDeEscala, ponerNota, quitarNota, renderizarCancion, renderizarPista, type DefCancion,
} from '../src/sonido/musica';
import { escalaDe } from '../src/editor/recursos/EditorMusica';
import { oirDesde } from '../src/motor/Sonido';
import { problemaDataURL } from '../src/proyecto/archivos';
import { migrarProyecto, nombresDeSonidos, proyectoVacio } from '../src/proyecto/formato';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { juegoDePrueba } from './ayudantes';

/** Un azar que se repite (para que los tests den siempre lo mismo). */
function azarCon(semilla: number): () => number {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const fuerza = (m: Float32Array, desde = 0, hasta = m.length) => {
  let suma = 0;
  for (let i = desde; i < hasta; i++) suma += m[i] * m[i];
  return Math.sqrt(suma / Math.max(1, hasta - desde));
};
/** Cuántas veces por segundo cruza el cero hacia arriba: la nota que suena (en ondas sencillas). */
const notaDe = (m: Float32Array, frecuenciaMuestreo: number, desde = 0, hasta = m.length) => {
  let cruces = 0;
  for (let i = desde + 1; i < hasta; i++) if (m[i - 1] < 0 && m[i] >= 0) cruces++;
  return cruces / ((hasta - desde) / frecuenciaMuestreo);
};

describe('Generador de efectos de sonido', () => {
  it('hace un sonido con la duración pedida, sin pasarse de -1 a 1, y que se oye', () => {
    const p: ParamsSonido = { ...SONIDO_BASE, onda: 'seno', sostenido: 0.3, caida: 0.2 };
    const m = generarSonido(p);
    expect(m.length).toBe(Math.round(0.5 * FRECUENCIA_MUESTREO));
    expect(duracionDe(p)).toBeCloseTo(0.5);
    expect(Math.max(...m)).toBeLessThanOrEqual(1);
    expect(Math.min(...m)).toBeGreaterThanOrEqual(-1);
    expect(fuerza(m)).toBeGreaterThan(0.1);
    // La envolvente: fuerte mientras se sostiene, casi nada al final de la caída
    expect(fuerza(m, 0, 10000)).toBeGreaterThan(fuerza(m, m.length - 3000) * 4);
    expect(Math.abs(m[m.length - 1])).toBeLessThan(0.01);
  });

  it('la nota es la que se pide (440 Hz = 440 vueltas por segundo), y deslizar la sube', () => {
    const m = generarSonido({ onda: 'seno', frecuencia: 440, sostenido: 0.5, caida: 0 });
    expect(notaDe(m, FRECUENCIA_MUESTREO)).toBeCloseTo(440, -1);
    const sube = generarSonido({ onda: 'seno', frecuencia: 220, deslizar: 2, sostenido: 1, caida: 0 });
    const mitad = sube.length / 2;
    // Una octava por cada medio segundo: al final suena el cuádruple de agudo que al principio
    expect(notaDe(sube, FRECUENCIA_MUESTREO, 0, 4000)).toBeLessThan(260);
    expect(notaDe(sube, FRECUENCIA_MUESTREO, mitad, mitad + 4000)).toBeGreaterThan(400);
    expect(notaDe(sube, FRECUENCIA_MUESTREO, sube.length - 4000)).toBeGreaterThan(780);
    // El salto (el «tilín» de la moneda): una octava más de golpe
    const salta = generarSonido({ onda: 'seno', frecuencia: 400, salto: 12, cuandoSalta: 0.25, sostenido: 0.5, caida: 0 });
    expect(notaDe(salta, FRECUENCIA_MUESTREO, 0, 10000)).toBeCloseTo(400, -1);
    expect(notaDe(salta, FRECUENCIA_MUESTREO, 12000, 22000)).toBeCloseTo(800, -1);
  });

  it('con los mismos números sale siempre el mismo sonido (también con ruido)', () => {
    const p = sonidoDeTipo('explosion', azarCon(3));
    expect(p.onda).toBe('ruido');
    expect([...generarSonido(p).slice(0, 2000)]).toEqual([...generarSonido(p).slice(0, 2000)]);
    expect([...generarSonido({ ...p, semilla: p.semilla + 1 }).slice(0, 2000)]).not.toEqual([...generarSonido(p).slice(0, 2000)]);
  });

  it('todas las ondas suenan, y los filtros quitan lo que dicen', () => {
    for (const onda of ONDAS) expect(fuerza(generarSonido({ onda, sostenido: 0.2 })), onda).toBeGreaterThan(0.05);
    const ruido = generarSonido({ onda: 'ruido', frecuencia: 2000, sostenido: 0.3, caida: 0 });
    const sinAgudos = generarSonido({ onda: 'ruido', frecuencia: 2000, sostenido: 0.3, caida: 0, quitarAgudos: 200 });
    const sinGraves = generarSonido({ onda: 'seno', frecuencia: 100, sostenido: 0.3, caida: 0, quitarGraves: 4000 });
    expect(fuerza(sinAgudos)).toBeLessThan(fuerza(ruido) * 0.5);
    expect(fuerza(sinGraves)).toBeLessThan(0.05);
  });

  it('el corte: si la nota baja demasiado, el sonido se acaba ahí', () => {
    const m = generarSonido({ onda: 'cuadrada', frecuencia: 800, deslizar: -6, frecuenciaMinima: 200, sostenido: 1, caida: 0 });
    // De 800 a 200 son dos octavas: a 6 octavas por segundo, un tercio de segundo
    expect(fuerza(m, 0, 10000)).toBeGreaterThan(0.2);
    expect(fuerza(m, Math.round(0.4 * FRECUENCIA_MUESTREO))).toBe(0);
  });

  it('cada botón (salto, moneda...) da sonidos distintos, válidos y que se oyen', () => {
    expect(TIPOS_DE_SONIDO).toEqual(['salto', 'moneda', 'explosion', 'disparo', 'golpe', 'powerup', 'menu', 'aleatorio']);
    for (const tipo of TIPOS_DE_SONIDO) {
      const vistos = new Set<string>();
      for (let semilla = 1; semilla <= 12; semilla++) {
        const p = sonidoDeTipo(tipo, azarCon(semilla * 7919));
        expect(completarSonido(p), `${tipo} ${semilla}`).toEqual(p); // ya está dentro de sus límites
        const m = generarSonido(p);
        expect(m.every(Number.isFinite), `${tipo} ${semilla}`).toBe(true);
        expect(fuerza(m), `${tipo} ${semilla} no se oye`).toBeGreaterThan(0.01);
        expect(duracionDe(p)).toBeLessThanOrEqual(DURACION_MAXIMA);
        vistos.add(JSON.stringify(p));
      }
      expect(vistos.size, tipo).toBe(12);
    }
    // Lo que hace que cada uno sea lo que es
    expect(sonidoDeTipo('salto', azarCon(1)).deslizar).toBeGreaterThan(0);
    expect(sonidoDeTipo('disparo', azarCon(1)).deslizar).toBeLessThan(0);
    expect(sonidoDeTipo('moneda', azarCon(1)).salto).toBeGreaterThan(0);
  });

  it('«variar un poco» se queda cerca y dentro de los límites; no enciende lo que estaba apagado', () => {
    const p = sonidoDeTipo('salto', azarCon(5));
    const q = mutarSonido(p, azarCon(9));
    expect(q).not.toEqual(p);
    expect(q.onda).toBe(p.onda);
    expect(q.semilla).toBe(p.semilla);
    expect(q.eco).toBe(0);
    expect(q.vibrato).toBe(0);
    expect(Math.abs(Math.log2(q.frecuencia / p.frecuencia))).toBeLessThan(0.5);
    for (const [k, [min, max]] of Object.entries(LIMITES_SONIDO)) {
      const v = q[k as keyof typeof LIMITES_SONIDO];
      expect(v >= min && v <= max, k).toBe(true);
    }
  });

  it('datos raros no lo rompen: se quedan en sus límites', () => {
    const p = completarSonido({ frecuencia: 1e9, sostenido: -5, caida: Infinity, volumen: NaN, onda: 'trompeta' as never });
    expect(p).toMatchObject({ frecuencia: 4000, sostenido: 0, onda: 'cuadrada' });
    const m = generarSonido({ ataque: 99, sostenido: 99, caida: 99 });
    expect(m.length).toBe(DURACION_MAXIMA * FRECUENCIA_MUESTREO);
    expect(generarSonido({ sostenido: 0, caida: 0, ataque: 0 }).length).toBeGreaterThan(0);
  });

  it('se puede guardar como un archivo WAV de verdad', () => {
    const m = generarSonido(sonidoDeTipo('moneda', azarCon(2)));
    const wav = aWAV(m);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    const v = new DataView(wav.buffer);
    expect(v.getUint32(24, true)).toBe(FRECUENCIA_MUESTREO);
    expect(v.getUint32(40, true)).toBe(m.length * 2);
    expect(wav.length).toBe(44 + m.length * 2);
    expect(problemaDataURL(aDataURL(wav), 'sonido')).toBeNull();
  });
});

describe('Sonidos hechos, en el proyecto', () => {
  it('se guardan con un nombre que no se repite (ni con los importados ni con las canciones), se cambian y se borran', () => {
    const e = new EstadoEditor();
    const p = sonidoDeTipo('salto', azarCon(1));
    expect(e.guardarSonidoHecho('Mi Salto!', p)).toBe('MiSalto');
    expect(e.guardarSonidoHecho('MiSalto', p)).toBe('MiSalto2');
    expect(e.guardarCancion('MiSalto', cancionDeEjemplo())).toBe('MiSalto3');
    expect(e.guardarSonidoHecho('   ', p)).toBeNull();
    expect(e.guardarSonidoHecho('__proto__', p)).toBe('rproto'); // un nombre «con truco» se queda en letras normales
    e.borrarSonidoHecho('rproto');
    expect(nombresDeSonidos(e.proyecto)).toEqual(expect.arrayContaining(['MiSalto', 'MiSalto2', 'MiSalto3']));
    // Cambiarlo (con el mismo nombre) no hace otro; cambiarle el nombre lo cambia también en el código
    e.crearObjeto('rectangulo', 0, 0);
    const archivo = e.crearScriptPara(e.seleccion!)!;
    e.cambiarCodigo(archivo, 'cuando empieza:\n    sonido.reproducir("MiSalto")');
    expect(e.guardarSonidoHecho('MiSalto', { ...p, frecuencia: 999 }, 'MiSalto')).toBe('MiSalto');
    expect(e.proyecto.sonidosHechos?.MiSalto.frecuencia).toBe(999);
    expect(e.guardarSonidoHecho('boing', p, 'MiSalto')).toBe('boing');
    expect(Object.keys(e.proyecto.sonidosHechos ?? {})).toEqual(['MiSalto2', 'boing']);
    expect(e.proyecto.scripts[archivo]).toContain('sonido.reproducir("boing")');
    e.borrarSonidoHecho('boing');
    e.borrarSonidoHecho('MiSalto2');
    expect(e.proyecto.sonidosHechos).toBeUndefined();
    e.deshacer();
    expect(Object.keys(e.proyecto.sonidosHechos ?? {})).toEqual(['MiSalto2']);
  });

  it('el proyecto guardado se vuelve a abrir; números fuera de sus límites o de más no pasan', () => {
    const p = proyectoVacio();
    p.sonidosHechos = { tilin: sonidoDeTipo('moneda', azarCon(4)) };
    p.canciones = { tema: cancionDeEjemplo() };
    const copia = migrarProyecto(JSON.parse(JSON.stringify(p)));
    expect(copia.sonidosHechos).toEqual(p.sonidosHechos);
    expect(copia.canciones).toEqual(p.canciones);
    const con = (cambio: object) => () => migrarProyecto({ ...proyectoVacio(), sonidosHechos: { x: { ...SONIDO_BASE, ...cambio } } });
    expect(con({ frecuencia: 1e9 })).toThrow(/frecuencia/);
    expect(con({ onda: 'trompeta' })).toThrow(/onda/);
    expect(con({ sostenido: 'mucho' })).toThrow(/sostenido/);
    // Lo que no es de un sonido, no se guarda
    expect(con({ virus: 1 })().sonidosHechos?.x).toEqual(SONIDO_BASE);
  });

  it('en el juego se usan como cualquier sonido, y el revisor de código los conoce', () => {
    const p = proyectoVacio();
    p.sonidosHechos = { tilin: sonidoDeTipo('moneda', azarCon(4)) };
    p.escenas.Principal.objetos = [{ nombre: 'A', script: 'a.chs' }];
    p.scripts['a.chs'] = 'cuando empieza:\n    sonido.reproducir("tilin", 0.5)\n    sonido.bucle("tilin")\n    mostrar(sonido.sonando("tilin"))';
    const j = juegoDePrueba({ proyecto: migrarProyecto(p) });
    expect(j.errores).toEqual([]);
    expect(j.avisos).toEqual([]);
    expect(j.salida).toEqual(['verdadero']);
    expect(j.motor.sonido.historial).toEqual(expect.arrayContaining(['reproducir tilin volumen 0.5', 'bucle tilin']));
    p.scripts['a.chs'] = 'cuando empieza:\n    sonido.reproducir("tilon")';
    expect(() => juegoDePrueba({ proyecto: migrarProyecto(p) })).toThrow(/tilon/);
  });
});

describe('Música: las notas y el sintetizador', () => {
  it('lo que dura: 4 pasos por pulso', () => {
    const c = cancionVacia();
    expect(c).toMatchObject({ tempo: 120, pasos: 32 });
    expect(duracionDeCancion(c)).toBeCloseTo(4); // 32 pasos = 8 pulsos, a 120 por minuto
    expect(duracionDeCancion({ ...c, tempo: 60 })).toBeCloseTo(8);
    expect(renderizarPista(c, c.pistas[0]).length).toBe(4 * FRECUENCIA_MUSICA);
  });

  it('los nombres de las notas y las escalas', () => {
    expect(nombreDeNota(60)).toBe('Do4');
    expect(nombreDeNota(69)).toBe('La4');
    expect(nombreDeNota(61)).toBe('Do#4');
    expect(frecuenciaDeNota(69)).toBeCloseTo(440);
    expect(frecuenciaDeNota(81)).toBeCloseTo(880);
    expect(notasDeEscala('pentatonica', 60, 72)).toEqual([72, 69, 67, 64, 62, 60]);
    expect(notasDeEscala('mayor', 60, 72)).toEqual([72, 71, 69, 67, 65, 64, 62, 60]);
    expect(notasDeEscala('todas', 60, 72)).toHaveLength(13);
    expect(notasDeEscala('inventada', 60, 62)).toEqual([62, 61, 60]);
  });

  it('cada instrumento suena, en su momento y con su nota', () => {
    for (const instrumento of INSTRUMENTOS) {
      const c: DefCancion = { tempo: 120, pasos: 16, bucle: false, pistas: [{ instrumento, volumen: 1, notas: [{ paso: 8, nota: instrumento === 'bateria' ? 0 : 69, largo: 4 }] }] };
      const m = renderizarPista(c, c.pistas[0]);
      const paso = m.length / 16;
      expect(m.every(Number.isFinite), instrumento).toBe(true);
      expect(Math.max(...m.map(Math.abs)), instrumento).toBeLessThanOrEqual(1.2);
      // Antes del paso 8, silencio; en el paso 8, suena
      expect(fuerza(m, 0, paso * 8 - 1), instrumento).toBe(0);
      expect(fuerza(m, paso * 8, paso * 10), instrumento).toBeGreaterThan(0.03);
      // La flauta y el órgano son casi senos: se les puede contar la nota (La = 440)
      if (instrumento === 'flauta') expect(notaDe(m, FRECUENCIA_MUSICA, paso * 9, paso * 12)).toBeCloseTo(440, -1);
    }
  });

  it('la batería: cada tambor suena distinto, y siempre igual', () => {
    const golpe = (tambor: number) => {
      const c: DefCancion = { tempo: 120, pasos: 4, bucle: false, pistas: [{ instrumento: 'bateria', volumen: 1, notas: [{ paso: 0, nota: tambor, largo: 1 }] }] };
      return renderizarPista(c, c.pistas[0]);
    };
    const sonidos = TAMBORES.map((_, i) => golpe(i));
    for (const [i, m] of sonidos.entries()) expect(fuerza(m, 0, 2000), TAMBORES[i]).toBeGreaterThan(0.02);
    // El bombo es grave (pocas vueltas); el charles, agudo y corto
    expect(notaDe(sonidos[0], FRECUENCIA_MUSICA, 0, 3000)).toBeLessThan(200);
    expect(notaDe(sonidos[2], FRECUENCIA_MUSICA, 0, 1500)).toBeGreaterThan(3000);
    expect(fuerza(sonidos[2], 6000, 9000)).toBeLessThan(0.001);
    expect([...golpe(1).slice(0, 500)]).toEqual([...sonidos[1].slice(0, 500)]);
  });

  it('en bucle no hay costura: lo que le sobra a la última nota suena al principio', () => {
    const con = (bucle: boolean): DefCancion => ({ tempo: 240, pasos: 4, bucle, pistas: [{ instrumento: 'campana', volumen: 1, notas: [{ paso: 3, nota: 72, largo: 1 }] }] });
    const enBucle = renderizarPista(con(true), con(true).pistas[0]);
    const sinBucle = renderizarPista(con(false), con(false).pistas[0]);
    expect(fuerza(enBucle, 0, 2000)).toBeGreaterThan(0.02);
    expect(fuerza(sinBucle, 0, 2000)).toBe(0);
  });

  it('varias pistas mezcladas no se pasan de fuerte', () => {
    const c = cancionDeEjemplo();
    const m = renderizarCancion(c);
    expect(m.length).toBe(Math.round(duracionDeCancion(c) * FRECUENCIA_MUSICA));
    expect(Math.max(...m.map(Math.abs))).toBeLessThanOrEqual(1);
    expect(fuerza(m)).toBeGreaterThan(0.05);
  });

  it('poner, alargar y quitar notas; cambiar lo que dura', () => {
    const c = cancionVacia();
    const p = c.pistas[0];
    expect(ponerNota(c, p, 4, 60, 3)).toEqual({ paso: 4, nota: 60, largo: 3 });
    expect(notaEn(p, 6, 60)).toMatchObject({ paso: 4 });
    expect(notaEn(p, 7, 60)).toBeNull();
    expect(notaEn(p, 5, 62)).toBeNull();
    // Otra nota a la misma altura que la pisa: la sustituye
    ponerNota(c, p, 5, 60, 1);
    expect(p.notas).toEqual([{ paso: 5, nota: 60, largo: 1 }]);
    // No se sale de la canción
    expect(ponerNota(c, p, 30, 64, 10)).toMatchObject({ largo: 2 });
    expect(ponerNota(c, p, 32, 64)).toBeNull();
    expect(quitarNota(p, 31, 64)).toBe(true);
    expect(quitarNota(p, 31, 64)).toBe(false);
    ponerNota(c, p, 14, 67, 4);
    cambiarPasos(c, 16);
    expect(p.notas).toEqual([{ paso: 5, nota: 60, largo: 1 }, { paso: 14, nota: 67, largo: 2 }]);
    // En la batería las notas duran siempre un paso
    c.pistas.push({ instrumento: 'bateria', volumen: 1, notas: [] });
    expect(ponerNota(c, c.pistas[1], 0, 0, 8)).toMatchObject({ largo: 1 });
  });

  it('la canción de ejemplo es una canción válida, y el editor la abre con la escala en la que cabe', () => {
    const c = cancionDeEjemplo();
    expect(c.pistas.map((p) => p.instrumento)).toEqual(['chip', 'bajo', 'bateria']);
    expect(migrarProyecto({ ...proyectoVacio(), canciones: { tema: c } }).canciones?.tema).toEqual(c);
    expect(escalaDe(c)).toBe('pentatonica');
    ponerNota(c, c.pistas[0], 0, 65);
    expect(escalaDe(c)).toBe('mayor');
    ponerNota(c, c.pistas[0], 0, 66);
    expect(escalaDe(c)).toBe('todas');
  });

  it('una canción mal hecha (o enorme) no pasa', () => {
    const con = (cambio: object) => () => migrarProyecto({ ...proyectoVacio(), canciones: { x: { ...cancionVacia(), ...cambio } } });
    expect(con({ tempo: 5000 })).toThrow(/tempo/);
    expect(con({ pasos: 1e6 })).toThrow(/pasos/);
    expect(con({ pistas: Array.from({ length: 9 }, () => ({ instrumento: 'piano', volumen: 1, notas: [] })) })).toThrow(/pistas/);
    expect(con({ pistas: [{ instrumento: 'gaita', volumen: 1, notas: [] }] })).toThrow(/instrumento/);
    expect(con({ pistas: [{ instrumento: 'piano', volumen: 1, notas: [{ paso: 0, nota: 9999, largo: 1 }] }] })).toThrow(/nota/);
    expect(con({ pistas: undefined })).toThrow(/pistas/);
  });
});

describe('Sonido con sitio', () => {
  it('más flojo cuanto más lejos, y por el lado donde está', () => {
    const yo = { x: 0, y: 0 };
    expect(oirDesde(yo, { x: 0, y: 0 }, 800, 480)).toEqual({ volumen: 1, pan: 0 });
    expect(oirDesde(yo, { x: 400, y: 0 }, 800, 480).volumen).toBeCloseTo(0.25);
    expect(oirDesde(yo, { x: 800, y: 0 }, 800, 480).volumen).toBe(0);
    expect(oirDesde(yo, { x: 5000, y: 0 }, 800, 480).volumen).toBe(0);
    expect(oirDesde(yo, { x: 240, y: 0 }, 800, 480).pan).toBeGreaterThan(0.3);
    expect(oirDesde(yo, { x: -240, y: 0 }, 800, 480).pan).toBeLessThan(-0.3);
    expect(oirDesde(yo, { x: 0, y: 300 }, 800, 480).pan).toBe(0);
    expect(Math.abs(oirDesde(yo, { x: -99999, y: 0 }, 800, 480).pan)).toBeLessThanOrEqual(1);
  });

  const escena = (codigo: string) =>
    juegoDePrueba({
      sonidos: { motor: '', pum: '' },
      scripts: { 'a.chs': codigo },
      escena: [
        { nombre: 'Coche', x: 480, y: 270, sprite: { ancho: 20, alto: 20 }, script: 'a.chs' },
        { nombre: 'Jugador', x: 480, y: 270, sprite: { ancho: 20, alto: 20 } },
      ],
    });

  it('sonido.bucleEn va con su objeto: se oye menos al alejarse, por su lado, y se para si el objeto se destruye', () => {
    const j = escena('cuando empieza:\n    sonido.bucleEn("motor", yo, 600)');
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    const s = j.motor.sonido;
    expect(s.estadoDe('motor')).toMatchObject({ volumenSitio: 1, pan: 0 });
    j.buscar('Coche').posicion.x = 780; // 300 a la derecha del centro de la cámara
    j.avanzar(1);
    expect(s.estadoDe('motor')!.volumenSitio).toBeCloseTo(0.25);
    expect(s.estadoDe('motor')!.pan).toBeGreaterThan(0.4);
    j.buscar('Coche').posicion.x = 5000;
    j.avanzar(1);
    expect(s.estadoDe('motor')!.volumenSitio).toBe(0);
    // Pedirlo en cada fotograma no lo amontona
    const repetido = escena('cuando cada fotograma:\n    sonido.bucleEn("motor", yo, 600)');
    repetido.avanzar(10);
    expect(repetido.motor.sonido.estaSonando('motor')).toBe(true);
    j.juego.escena.destruir(j.buscar('Coche'));
    j.avanzar(2);
    expect(s.estaSonando('motor')).toBe(false);
  });

  it('el oyente: la cámara, o el objeto que se diga', () => {
    const j = escena('cuando empieza:\n    sonido.bucleEn("motor", vector(480, 270), 600)\n    mostrar(sonido.oyente)\n    sonido.oyente = buscar("Jugador")\n    mostrar(sonido.oyente.nombre)');
    j.avanzar(1);
    expect(j.salida).toEqual(['nulo', 'Jugador']);
    j.buscar('Jugador').posicion.x = 480 + 600;
    j.avanzar(1);
    expect(j.motor.sonido.estadoDe('motor')!.volumenSitio).toBe(0);
    expect(j.motor.sonido.estadoDe('motor')!.pan).toBeLessThan(0);
    // Si el oyente desaparece, vuelve a ser la cámara
    j.juego.escena.destruir(j.buscar('Jugador'));
    j.avanzar(2);
    expect(j.motor.sonido.estadoDe('motor')!.volumenSitio).toBe(1);
  });

  it('sonido.reproducirEn: sin sitio, donde está quien lo pide; errores claros', () => {
    const j = escena('cuando empieza:\n    sonido.reproducirEn("pum")\n    sonido.reproducirEn("pum", buscar("Jugador"), 300, 0.5)');
    expect(j.errores).toEqual([]);
    expect(j.motor.sonido.historial).toEqual(expect.arrayContaining(['reproducir pum en sitio (alcance 800)', 'reproducir pum volumen 0.5 en sitio (alcance 300)']));
    const error = (linea: string) => {
      try {
        return escena(`cuando empieza:\n    ${linea}`).errores[0]?.error.message ?? '';
      } catch (e) {
        return (e as Error).message;
      }
    };
    expect(error('sonido.reproducirEn("pum", 400, 300)')).toMatch(/DÓNDE suena/);
    expect(error('sonido.reproducirEn("pum", buscar("Nadie"))')).toMatch(/nulo/);
    expect(error('sonido.bucleEn("motor", yo, 0)')).toMatch(/alcance/);
    expect(error('sonido.reproducirEn("pam", yo)')).toMatch(/pam/);
    expect(error('sonido.oyente = "Jugador"')).toMatch(/oyente/);
  });
});

describe('Cambios en vivo', () => {
  const juego = (codigo: string) => juegoDePrueba({ sonidos: { motor: '', tema: '', combate: '' }, scripts: { 'a.chs': codigo }, escena: [{ nombre: 'A', script: 'a.chs' }] });

  it('volumen, tono y lado de un sonido que ya suena', () => {
    const j = juego('cuando empieza:\n    sonido.bucle("motor")\n    mostrar(sonido.ponerVolumen("motor", 0.3, 1))\n    sonido.ponerTono("motor", 1.5)\n    sonido.ponerPan("motor", -1)\n    mostrar(sonido.ponerVolumen("tema", 0.3))');
    expect(j.errores).toEqual([]);
    // Devuelve cuántos sonidos ha cambiado: el motor suena; el tema, no
    expect(j.salida).toEqual(['1', '0']);
    expect(j.motor.sonido.estadoDe('motor')).toMatchObject({ volumen: 0.3, tono: 1.5, pan: -1 });
    expect(j.motor.sonido.historial).toContain('ajustar motor volumen 0.3 en 1');
    const error = (linea: string) => {
      try {
        return juego(`cuando empieza:\n    ${linea}`).errores[0]?.error.message ?? '';
      } catch (e) {
        return (e as Error).message;
      }
    };
    expect(error('sonido.ponerVolumen("motor", 20)')).toMatch(/de 0 \(callado\) a 1/);
    expect(error('sonido.ponerTono("motor", 0)')).toMatch(/tono/);
    expect(error('sonido.ponerPan("motor", 3)')).toMatch(/-1 \(izquierda\) a 1/);
    expect(error('sonido.ponerVolumen("motro", 1)')).toMatch(/motro/);
    expect(error('sonido.ponerVolumen("motor", 1, 999)')).toMatch(/de 0 a 60/);
    expect(error('sonido.reproducir("motor", 1, 1, 5)')).toMatch(/-1 \(izquierda\)/);
  });

  it('la música: tono, cruzar a otra y capas', () => {
    const j = juego('cuando empieza:\n    musica.reproducir("tema")\n    musica.tono = 1.25\n    mostrar(musica.tono)\n    musica.cruzar("combate", 3)\n    mostrar(musica.actual)');
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['1.25', 'combate']);
    expect(j.motor.sonido.historial).toEqual(['musica tema', 'parar musica fundido 3', 'cruzar musica combate 3']);
    // Parar el juego deja el tono como estaba
    j.motor.sonido.pararTodo();
    expect(j.motor.sonido.tonoMusica).toBe(1);
    const malo = juego('cuando empieza:\n    musica.tono = 10');
    expect(malo.errores[0]?.error.message).toMatch(/0.25/);
    // Un archivo importado es una sola capa
    const capa = juego('cuando empieza:\n    musica.reproducir("tema")\n    musica.capa(1, 0.5, 2)\n    musica.capa(2, 1)');
    expect(capa.motor.sonido.volumenDeCapa(1)).toBe(0.5);
    expect(capa.errores[0]?.error.message).toMatch(/no tiene capa 2: solo tiene una/);
    expect(capa.errores[0]?.error.pista).toMatch(/editor de música/);
  });

  it('música adaptativa: una canción del editor tiene una capa por pista, y la intensidad las va metiendo', () => {
    const p = proyectoVacio();
    p.canciones = { aventura: cancionDeEjemplo() };
    p.escenas.Principal.objetos = [{ nombre: 'A', script: 'a.chs' }];
    p.scripts['a.chs'] = 'cuando empieza:\n    musica.intensidad = 0\n    musica.reproducir("aventura")';
    const j = juegoDePrueba({ proyecto: migrarProyecto(p) });
    const s = j.motor.sonido;
    expect(j.errores).toEqual([]);
    expect(j.avisos).toEqual([]);
    expect(s.capasMusica).toBe(3);
    const capas = () => [1, 2, 3].map((i) => s.volumenDeCapa(i));
    // La intensidad puesta antes se recuerda: empieza solo con la primera capa
    expect(capas()).toEqual([1, 0, 0]);
    s.ponerIntensidad(0.5);
    expect(capas()).toEqual([1, 1, 0]);
    s.ponerIntensidad(0.75);
    expect(capas()).toEqual([1, 1, 0.5]);
    s.ponerIntensidad(1);
    expect(capas()).toEqual([1, 1, 1]);
    s.capaMusica(2, 0, 1);
    expect(capas()).toEqual([1, 0, 1]);
    expect(() => s.capaMusica(4, 1)).toThrow(/tiene 3/);
    // Sin música, no hace nada (ni da error)
    s.pararMusica();
    expect(() => s.capaMusica(2, 1)).not.toThrow();
    expect(s.capasMusica).toBe(0);
    const malo = juegoDePrueba({ scripts: { 'a.chs': 'cuando empieza:\n    musica.intensidad = 50' }, escena: [{ nombre: 'A', script: 'a.chs' }] });
    expect(malo.errores[0]?.error.message).toMatch(/de 0 \(tranquila/);
  });
});
