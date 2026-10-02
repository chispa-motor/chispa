/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * «LO QUE FALTABA DE LÖVE» (día 2, bloque 4): azar con semilla, tipos de
 * letra, elipses y polígonos al dibujar, juntas físicas (cuerda, muelle y
 * bisagra) y pantalla dividida con varias cámaras.
 */
import { describe, expect, it } from 'vitest';
import { azar, ponerSemilla } from '../src/utilidades/azar';
import { LETRAS, familiaCss, hayLetra } from '../src/motor/Letras';
import { filasDeLetra, letrasDeLaLetraPixel, puntosDeTexto, sePuedeEscribir } from '../src/motor/letraPixel';
import { formatoLetra, problemaLetra } from '../src/proyecto/archivos';
import { migrarProyecto, proyectoVacio } from '../src/proyecto/formato';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { importarArchivos, tipoDeArchivo } from '../src/editor/recursos/importar';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { Fisica } from '../src/objetos/componentes/Fisica';
import { MAXIMO_JUNTAS } from '../src/objetos/Juntas';
import { Vector2 } from '../src/motor/Vector2';
import { juegoDePrueba, unObjeto } from './ayudantes';

const LETRA_PRUEBA = 'data:font/ttf;base64,AAEAAAAAAAAAAAAA';

/** Un lienzo de mentira que apunta lo que se le pone y cuenta lo que se le pide. */
function lienzo() {
  const puesto: Record<string, unknown[]> = {};
  const cuenta: Record<string, number> = {};
  const llamadas: [string, unknown[]][] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => {
      if (k in t) return t[k];
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'canvas') return { width: 960, height: 540 };
      return (...a: unknown[]) => {
        cuenta[k] = (cuenta[k] ?? 0) + 1;
        llamadas.push([k, a]);
      };
    },
    set: (t, k: string, v) => {
      t[k] = v;
      (puesto[k] ??= []).push(v);
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, puesto, cuenta, llamadas };
}

describe('Azar con semilla', () => {
  it('con la misma semilla salen los mismos números; sin semilla, azar de verdad', () => {
    ponerSemilla(42);
    const a = [azar(), azar(), azar()];
    ponerSemilla(42);
    expect([azar(), azar(), azar()]).toEqual(a);
    ponerSemilla(43);
    expect([azar(), azar(), azar()]).not.toEqual(a);
    expect(a.every((n) => n >= 0 && n < 1)).toBe(true);
    ponerSemilla(null);
  });

  it('el generador reparte bien (ni se atasca ni se va a un lado)', () => {
    ponerSemilla(7);
    const cubos = new Array(10).fill(0);
    for (let i = 0; i < 20_000; i++) cubos[Math.floor(azar() * 10)]++;
    for (const c of cubos) expect(c).toBeGreaterThan(1800), expect(c).toBeLessThan(2200);
    ponerSemilla(null);
  });

  it('desde Chispa: aleatorio, elegir, probabilidad y mezclar se repiten', () => {
    const codigo = 'cuando empieza:\n    semilla(2026)\n    variable l = [1, 2, 3, 4, 5, 6]\n    l.mezclar()\n    mostrar(aleatorio(1, 1000), elegir(["a", "b", "c", "d"]), probabilidad(50), l)';
    const uno = unObjeto(codigo);
    const dos = unObjeto(codigo);
    expect(uno.errores).toEqual([]);
    expect(uno.salida).toEqual(dos.salida);
    expect(uno.salida[0]).toMatch(/^\d+ [abcd] (verdadero|falso) \[/);
    // Otra semilla, otra partida
    const tres = unObjeto(codigo.replace('2026', '2027'));
    expect(tres.salida).not.toEqual(uno.salida);
  });

  it('cada partida empieza sin semilla, semilla() la quita y un texto da un error claro', () => {
    unObjeto('cuando empieza:\n    semilla(5)');
    const a = unObjeto('cuando empieza:\n    mostrar(aleatorio(1, 1000000000))');
    const b = unObjeto('cuando empieza:\n    mostrar(aleatorio(1, 1000000000))');
    expect(a.salida).not.toEqual(b.salida);
    const quitada = unObjeto('cuando empieza:\n    semilla(5)\n    semilla()\n    mostrar(aleatorio(1, 1000000000))');
    const otra = unObjeto('cuando empieza:\n    semilla(5)\n    semilla()\n    mostrar(aleatorio(1, 1000000000))');
    expect(quitada.salida).not.toEqual(otra.salida);
    const malo = unObjeto('cuando empieza:\n    semilla("hoy")');
    expect(malo.errores[0]?.error.message).toMatch(/semilla/);
  });

  it('las partículas no gastan números de la semilla (lo que solo se ve no cambia el juego)', () => {
    const sin = unObjeto('cuando empieza:\n    semilla(9)\n    mostrar(aleatorio(1, 1000000))');
    const con = unObjeto('cuando empieza:\n    semilla(9)\n    efecto.explosion(yo)\n    particulas("confeti", 0, 0)\n    mostrar(aleatorio(1, 1000000))');
    expect(con.errores).toEqual([]);
    expect(con.salida).toEqual(sin.salida);
  });
});

describe('Tipos de letra', () => {
  it('hay 7 letras listas, cada una con sus letras del ordenador', () => {
    expect(LETRAS).toEqual(['normal', 'redonda', 'clasica', 'maquina', 'manuscrita', 'titulo', 'pixel']);
    for (const l of LETRAS) expect(familiaCss(l)).toMatch(/(sans-serif|serif|monospace|cursive)$/);
    expect(familiaCss('clasica')).toContain('Georgia');
    // Una que no existe (o que se ha borrado): la normal, sin romper nada
    expect(familiaCss('noexiste')).toBe(familiaCss('normal'));
    expect(familiaCss('constructor')).toBe(familiaCss('normal'));
    expect(hayLetra('__proto__')).toBe(false);
  });

  it('yo.letra cambia la letra del texto, y se dibuja con ella', () => {
    const j = unObjeto('cuando empieza:\n    yo.letra = "Clasica"\n    mostrar(yo.letra)', { sprite: { forma: 'texto', texto: 'Hola', tamano: 20 } });
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['clasica']);
    const malo = unObjeto('cuando empieza:\n    yo.letra = "pixels"', { sprite: { forma: 'texto', texto: 'Hola' } });
    expect(malo.errores[0]?.error.message).toMatch(/no hay ningún tipo de letra llamado "pixels"/);
    expect(malo.errores[0]?.error.pista).toMatch(/pixel/);
  });

  it('la letra del editor llega al juego, y dibujar.texto acepta una letra', () => {
    const j = unObjeto('cuando cada fotograma:\n    dibujar.texto("FIN", 100, 100, "blanco", 30, "titulo")', { sprite: { forma: 'texto', texto: 'Hola', letra: 'maquina' } });
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    expect(j.buscar('Prueba').obtener(Sprite)!.letra).toBe('maquina');
    expect(j.juego.escena.dibujos).toEqual([{ tipo: 'texto', texto: 'FIN', x: 100, y: 100, color: 'blanco', tamano: 30, letra: 'titulo' }]);
    const textos: unknown[] = [];
    const { ctx } = lienzo();
    const r = { ctx, ancho: 960, alto: 540, fondo: 'negro', texto: (...a: unknown[]) => textos.push(a), rectangulo() {}, circulo() {}, linea() {}, figura() {} };
    j.juego.escena.dibujar(r as never);
    expect(textos.some((t) => (t as [string, number, number, { letra?: string }])[3].letra === 'titulo')).toBe(true);
    expect(textos.some((t) => (t as [string, number, number, { letra?: string }])[3].letra === 'maquina')).toBe(true);
    const malo = unObjeto('cuando empieza:\n    dibujar.texto("FIN", 100, 100, "blanco", 30, "gotica")');
    expect(malo.errores[0]?.error.message).toMatch(/tipo de letra/);
  });

  it('un archivo de letra se reconoce por dentro, no por su nombre', () => {
    const bytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
    expect(formatoLetra(bytes('wOF2....'))).toBe('woff2');
    expect(formatoLetra(bytes('wOFF....'))).toBe('woff');
    expect(formatoLetra(bytes('OTTO....'))).toBe('otf');
    expect(formatoLetra(new Uint8Array([0, 1, 0, 0, 0]))).toBe('ttf');
    expect(formatoLetra(bytes('<html>'))).toBeNull();
    expect(problemaLetra(LETRA_PRUEBA)).toBeNull();
    expect(problemaLetra('https://fonts.example/letra.ttf')).toMatch(/dirección de internet/);
    expect(problemaLetra('data:font/ttf;base64,' + btoa('<script>alert(1)</script>'))).toMatch(/por dentro no lo es/);
    expect(problemaLetra('data:font/woff2;base64,AAEAAAAAAAAAAAAA')).toMatch(/por dentro es ttf/);
    expect(problemaLetra('data:text/html;base64,AAEAAAAAAAAAAAAA')).toMatch(/solo pueden ser TTF/);
    expect(problemaLetra('data:font/ttf;base64,' + 'A'.repeat(6 * 1024 * 1024))).toMatch(/demasiado grande/);
  });

  it('se importan al proyecto, se guardan, se usan en el juego y se borran (con deshacer)', async () => {
    const e = new EstadoEditor();
    expect(tipoDeArchivo({ name: 'Comica.ttf', type: '' })).toBe('letra');
    const buena = new File([new Uint8Array([0, 1, 0, 0, 0, 12, 0, 128])], 'Mi Letra.ttf', { type: 'application/octet-stream' });
    const falsa = new File(['<html>hola</html>'], 'trampa.ttf', { type: 'font/ttf' });
    const r = await importarArchivos(e, [buena, falsa]);
    expect(r.letras).toEqual(['MiLetra']);
    expect(r.rechazados).toEqual(['"trampa.ttf" no es de verdad un tipo de letra (o está dañado)']);
    expect(e.proyecto.letras?.MiLetra).toMatch(/^data:font\/ttf;base64,/);
    // No puede llamarse como una de las listas
    expect(e.agregarLetra('pixel.ttf', LETRA_PRUEBA)).toBe('pixel2');
    // El proyecto guardado se vuelve a abrir, y una letra mala no pasa
    const copia = migrarProyecto(JSON.parse(JSON.stringify(e.proyecto)));
    expect(Object.keys(copia.letras ?? {})).toEqual(['MiLetra', 'pixel2']);
    expect(() => migrarProyecto({ ...proyectoVacio(), letras: { mala: 'https://x.example/a.ttf' } })).toThrow(/letras/);
    expect(() => migrarProyecto({ ...proyectoVacio(), letras: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`l${i}`, LETRA_PRUEBA])) })).toThrow();
    // En el juego se puede elegir por su nombre
    copia.escenas.Principal.objetos = [{ nombre: 'T', script: 't.chs', sprite: { forma: 'texto', texto: 'Hola' } }];
    copia.scripts['t.chs'] = 'cuando empieza:\n    yo.letra = "miletra"\n    mostrar(yo.letra)';
    const j = juegoDePrueba({ proyecto: copia });
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['MiLetra']);
    // Borrarla deja los textos con la letra normal
    e.crearObjeto('texto', 0, 0);
    e.cambiarPropiedad(e.seleccion!, 'sprite.letra', 'MiLetra');
    e.borrarLetra('MiLetra');
    expect(e.seleccionado?.sprite?.letra).toBeUndefined();
    expect(e.proyecto.letras).toEqual({ pixel2: LETRA_PRUEBA });
    e.deshacer();
    expect(Object.keys(e.proyecto.letras ?? {})).toEqual(['MiLetra', 'pixel2']);
  });
});

describe('La letra pixel de Chispa', () => {
  it('todas sus letras miden 5×7 (más 2 filas de tildes) y no hay dos iguales', () => {
    const todas = letrasDeLaLetraPixel();
    expect(todas.length).toBeGreaterThan(130);
    const vistas = new Map<string, string>();
    for (const l of todas) {
      const filas = filasDeLetra(l)!;
      expect(filas, l).toHaveLength(9);
      for (const f of filas) expect(f, l).toMatch(/^[.#]{5}$/);
      const clave = filas.join('');
      if (l !== ' ') expect(clave, l).toContain('#');
      expect(vistas.get(clave), `«${l}» es igual que «${vistas.get(clave)}»`).toBeUndefined();
      vistas.set(clave, l);
    }
  });

  it('tiene todo lo que se escribe en español (y el teclado entero)', () => {
    const frase = 'El veloz murciélago hindú comía feliz cardillo y kiwi. ¿La cigüeña tocaba el saxofón? ¡SÍ! ÁÉÍÓÚÜÑ ñ';
    expect(sePuedeEscribir(frase)).toBe(true);
    for (let c = 32; c < 127; c++) expect(sePuedeEscribir(String.fromCharCode(c)), String.fromCharCode(c)).toBe(true);
    expect(sePuedeEscribir('日本')).toBe(false);
    expect(sePuedeEscribir('constructor')).toBe(true); // son letras, no un truco
    expect(filasDeLetra('__proto__')).toBeNull();
  });

  it('las tildes: en las minúsculas dentro de la letra; en las mayúsculas, encima', () => {
    expect(filasDeLetra('a')!.slice(0, 4)).toEqual(['.....', '.....', '.....', '.....']);
    expect(filasDeLetra('á')!.slice(0, 4)).toEqual(['.....', '.....', '...#.', '..#..']);
    expect(filasDeLetra('Á')!.slice(0, 3)).toEqual(['...#.', '..#..', '.###.']);
    expect(filasDeLetra('ñ')![2]).toBe('.###.');
    // La í pierde su punto (va la tilde en su sitio)
    expect(filasDeLetra('í')!.slice(2, 4)).toEqual(['...#.', '..#..']);
  });

  it('un texto son sus letras con una columna vacía en medio', () => {
    const filas = puntosDeTexto('Hi')!;
    expect(filas).toHaveLength(9);
    expect(filas[2]).toBe('#...#...#..');
    expect(filas.every((f) => f.length === 11)).toBe(true);
    expect(puntosDeTexto('a→日')).toBeNull();
    expect(puntosDeTexto('')!.every((f) => f === '')).toBe(true);
  });
});

describe('dibujar.elipse y dibujar.poligono', () => {
  it('se apuntan para dibujarse en este fotograma, en el mundo o en la pantalla', () => {
    const j = unObjeto('cuando cada fotograma:\n    dibujar.elipse(100, 200, 80, 40, "verde", verdadero)\n    dibujar.enPantalla.poligono([vector(0, 0), vector(50, 0), vector(25, 40)], "rojo")');
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    expect(j.juego.escena.dibujos).toEqual([
      { tipo: 'elipse', x: 100, y: 200, ancho: 80, alto: 40, color: 'verde', relleno: true },
      { tipo: 'poligono', puntos: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 25, y: 40 }], color: 'rojo', relleno: false, grosor: 2, fijo: true },
    ]);
    const { ctx, llamadas, cuenta } = lienzo();
    j.juego.escena.dibujar({ ctx, ancho: 960, alto: 540, fondo: 'negro', rectangulo() {}, circulo() {}, figura() {}, texto() {} } as never);
    // La elipse, con la Y dada la vuelta (el mundo va hacia arriba) y sus radios (la mitad del ancho y del alto)
    const elipse = llamadas.find(([k]) => k === 'ellipse')![1];
    expect(elipse.slice(0, 4)).toEqual([100 - 480, 270 - 200, 40, 20]);
    // El polígono en la pantalla: (0,0) abajo a la izquierda
    expect(llamadas.filter(([k]) => k === 'moveTo' || k === 'lineTo').map(([, a]) => a)).toEqual([[0, 540], [50, 540], [25, 500]]);
    expect(cuenta.fill).toBe(1);
    expect(cuenta.stroke).toBe(1);
  });

  it('errores claros: pocos puntos, sin corchetes, puntos que no son vectores, colores inventados', () => {
    const error = (codigo: string) => {
      const j = unObjeto(`cuando empieza:\n    ${codigo}`);
      return j.errores[0]?.error.message ?? '';
    };
    expect(error('dibujar.poligono([vector(0, 0), vector(1, 1)])')).toMatch(/3 puntos o más/);
    expect(error('dibujar.poligono(vector(0, 0), vector(1, 1), vector(2, 0))')).toMatch(/lista de puntos/);
    expect(error('dibujar.poligono([1, 2, 3])')).toMatch(/punto 1 del polígono no es un vector/);
    expect(error('dibujar.elipse(0, 0, 10)')).toMatch(/elipse/);
    expect(error('dibujar.elipse(0, 0, 10, 10, "verdoso")')).toMatch(/color/);
  });
});

describe('Juntas físicas', () => {
  const bola = (codigo: string, extra = {}) =>
    juegoDePrueba({
      scripts: { 'b.chs': codigo },
      escena: [
        { nombre: 'Bola', x: 300, y: 300, sprite: { ancho: 20, alto: 20 }, fisica: {}, script: 'b.chs', ...extra },
        { nombre: 'Gancho', x: 300, y: 400, sprite: { ancho: 10, alto: 10 } },
      ],
    });

  it('cuerda: cuelga del punto y no se aleja más de su largo (pero puede estar floja)', () => {
    const j = bola('cuando empieza:\n    junta.cuerda(yo, vector(300, 400), 150)');
    const o = j.buscar('Bola');
    let maxima = 0;
    for (let i = 0; i < 180; i++) {
      j.avanzar(1);
      maxima = Math.max(maxima, Math.hypot(o.posicion.x - 300, o.posicion.y - 400));
    }
    expect(j.errores).toEqual([]);
    expect(maxima).toBeLessThan(151);
    // Ha caído hasta quedar colgando justo debajo, quieta
    expect(o.posicion.y).toBeCloseTo(250, 0);
    expect(Math.abs(o.obtener(Fisica)!.velocidad.y)).toBeLessThan(30);
    // Más cerca que su largo: floja, no la mueve
    const floja = bola('cuando empieza:\n    yo.gravedad = 0\n    junta.cuerda(yo, vector(300, 400), 500)');
    floja.avanzar(30);
    expect(floja.buscar('Bola').posicion.y).toBe(300);
  });

  it('cuerda: de lado, se balancea como un péndulo (pasa al otro lado)', () => {
    const j = bola('cuando empieza:\n    yo.x = 400\n    yo.y = 400\n    junta.cuerda(yo, vector(300, 400))');
    const o = j.buscar('Bola');
    let minimaX = 400;
    for (let i = 0; i < 120; i++) {
      j.avanzar(1);
      minimaX = Math.min(minimaX, o.posicion.x);
      expect(Math.hypot(o.posicion.x - 300, o.posicion.y - 400)).toBeLessThan(101);
    }
    expect(minimaX).toBeLessThan(230);
  });

  it('entre dos objetos: el que pesa más tira del otro; uno sin Física no se mueve', () => {
    const j = bola('cuando empieza:\n    junta.cuerda(yo, buscar("Gancho"), 50)');
    j.avanzar(60);
    expect(j.buscar('Gancho').posicion.y).toBe(400);
    expect(j.buscar('Bola').posicion.y).toBeCloseTo(350, 0);
    // Si el gancho se mueve, la bola va detrás
    j.buscar('Gancho').posicion.x = 500;
    j.avanzar(120);
    expect(j.buscar('Bola').posicion.x).toBeGreaterThan(450);
  });

  it('muelle: bota alrededor de su largo y acaba parándose', () => {
    const j = bola('cuando empieza:\n    yo.gravedad = 0\n    junta.muelle(yo, vector(300, 400), 40, 80)');
    const o = j.buscar('Bola');
    const distancias: number[] = [];
    for (let i = 0; i < 600; i++) {
      j.avanzar(1);
      distancias.push(400 - o.posicion.y);
    }
    expect(j.errores).toEqual([]);
    // Se pasa de largo (bota) y vuelve
    expect(Math.min(...distancias)).toBeLessThan(38);
    expect(Math.max(...distancias.slice(30))).toBeGreaterThan(42);
    // y al final, quieto en su largo
    expect(distancias[599]).toBeCloseTo(40, 0);
  });

  it('bisagra: la distancia al eje no cambia y el objeto gira con ella', () => {
    const j = bola('cuando empieza:\n    yo.x = 400\n    yo.y = 400\n    junta.bisagra(yo, vector(300, 400))');
    const o = j.buscar('Bola');
    for (let i = 0; i < 40; i++) {
      j.avanzar(1);
      expect(Math.hypot(o.posicion.x - 300, o.posicion.y - 400)).toBeCloseTo(100, 0);
    }
    // Ha bajado girando: su giro es el ángulo que ha recorrido (hacia abajo: negativo)
    const angulo = (Math.atan2(o.posicion.y - 400, o.posicion.x - 300) * 180) / Math.PI;
    expect(angulo).toBeLessThan(-10);
    expect(o.transformacion.rotacion).toBeCloseTo(angulo, 3);
  });

  it('junta.quitar las suelta (todas o solo con un objeto), y se quitan solas al destruir un objeto o cambiar de escena', () => {
    const j = bola('cuando empieza:\n    junta.cuerda(yo, vector(300, 400), 50)\n    junta.muelle(yo, buscar("Gancho"))\n    mostrar(junta.quitar(yo, buscar("Gancho")))\n    mostrar(junta.quitar())\n    junta.cuerda(yo, buscar("Gancho"), 50)');
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['1', '1']);
    expect(j.juego.escena.juntas.lista).toHaveLength(1);
    j.juego.escena.destruir(j.buscar('Gancho'));
    j.avanzar(2);
    expect(j.juego.escena.juntas.lista).toHaveLength(0);
    j.juego.escena.juntas.agregar('cuerda', j.buscar('Bola'), { x: 0, y: 0 }, 10);
    j.juego.escena.vaciar();
    expect(j.juego.escena.juntas.lista).toHaveLength(0);
  });

  it('repetir la misma junta la cambia (no se amontonan), y hay un máximo', () => {
    const j = bola('cuando cada fotograma:\n    junta.cuerda(yo, buscar("Gancho"), 80)');
    j.avanzar(30);
    expect(j.juego.escena.juntas.lista).toHaveLength(1);
    const juntas = j.juego.escena.juntas;
    for (let i = 0; i < MAXIMO_JUNTAS + 20; i++) juntas.agregar('cuerda', j.buscar('Bola'), { x: i, y: 0 }, 10);
    expect(juntas.lista).toHaveLength(MAXIMO_JUNTAS);
  });

  it('se dibujan (la cuerda, una línea; el muelle, en zigzag; la bisagra, con su eje) salvo con junta.visibles = falso', () => {
    const j = bola('cuando empieza:\n    yo.gravedad = 0\n    junta.cuerda(yo, vector(300, 400), 500, "rojo")\n    junta.muelle(yo, buscar("Gancho"), 100, 60, "verde")');
    const pintar = () => {
      const l = lienzo();
      j.juego.escena.dibujar({ ctx: l.ctx, ancho: 960, alto: 540, fondo: 'negro', rectangulo() {}, circulo() {}, figura() {}, texto() {} } as never);
      return l;
    };
    const visto = pintar();
    expect(visto.cuenta.stroke).toBe(2);
    expect(visto.puesto.strokeStyle).toEqual(expect.arrayContaining(['#e74c3c', '#2ecc71']));
    // El muelle tiene muchos más tramos que la cuerda
    expect(visto.cuenta.lineTo).toBeGreaterThan(8);
    j.juego.escena.juntas.visibles = false;
    expect(pintar().cuenta.stroke).toBeUndefined();
  });

  it('errores claros', () => {
    const error = (codigo: string, extra = {}) => bola(`cuando empieza:\n    ${codigo}`, extra).errores[0]?.error;
    expect(error('junta.cuerda(yo, 400, 300)')?.message).toMatch(/otro objeto o un punto/);
    expect(error('junta.cuerda(yo, buscar("Nadie"))')?.message).toMatch(/nulo/);
    expect(error('junta.cuerda("Bola", vector(0, 0))')?.message).toMatch(/necesita un objeto/);
    expect(error('junta.bisagra(yo, yo)')?.message).toMatch(/consigo mismo/);
    expect(error('junta.muelle(yo, vector(0, 0), 100, 0)')?.message).toMatch(/rigidez/);
    expect(error('junta.muelle(yo, vector(0, 0), -5)')?.message).toMatch(/largo/);
    expect(error('junta.cuerda(yo, vector(0, 0), 100, "rojizo")')?.message).toMatch(/color/);
    expect(error('junta.visibles = "no"')?.message).toMatch(/visibles/);
    // Sin Física no hay nada que mover
    const sinFisica = error('junta.cuerda(yo, vector(0, 0))', { fisica: undefined });
    expect(sinFisica?.message).toMatch(/no tiene Física/);
    expect(sinFisica?.pista).toMatch(/inspector/);
  });
});

describe('Pantalla dividida y varias cámaras', () => {
  const dosJugadores = (codigo: string) =>
    juegoDePrueba({
      scripts: { 'a.chs': codigo },
      escena: [
        { nombre: 'Uno', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, script: 'a.chs' },
        { nombre: 'Dos', x: 3000, y: 2000, sprite: { ancho: 20, alto: 20 } },
        { nombre: 'Marcador', x: 20, y: 500, sprite: { forma: 'texto', texto: 'Puntos', fijo: true } },
      ],
    });

  it('pantalla.dividir reparte la pantalla: columnas, filas, tres y cuatro', () => {
    const j = dosJugadores('cuando empieza:\n    pantalla.dividir(2)');
    const e = j.juego.escena;
    const cajas = () => e.vistas().map((v) => [v.x, v.y, v.ancho, v.alto]);
    expect(cajas()).toEqual([[0, 0, 480, 540], [480, 0, 480, 540]]);
    e.dividir(2, 'filas');
    expect(cajas()).toEqual([[0, 0, 960, 270], [0, 270, 960, 270]]);
    e.dividir(3);
    expect(cajas()).toEqual([[0, 0, 480, 270], [480, 0, 480, 270], [0, 270, 960, 270]]);
    e.dividir(4);
    expect(cajas()).toEqual([[0, 0, 480, 270], [480, 0, 480, 270], [0, 270, 480, 270], [480, 270, 480, 270]]);
    // Cada cámara sabe lo que mide su trozo (para centrar bien)
    expect(e.camaras.map((c) => [c.anchoPantalla, c.altoPantalla])).toEqual([[480, 270], [480, 270], [480, 270], [480, 270]]);
    e.dividir(1);
    expect(cajas()).toEqual([[0, 0, 960, 540]]);
    expect([e.camara.anchoPantalla, e.camara.altoPantalla]).toEqual([960, 540]);
  });

  it('cada cámara sigue a su jugador, con su zoom', () => {
    const j = dosJugadores('cuando empieza:\n    pantalla.dividir(2)\n    escena.camara.seguir(yo)\n    escena.camaraDe(2).seguir(buscar("Dos"))\n    escena.camaraDe(2).zoom = 2\n    mostrar(escena.camaraDe(1).x, escena.camaraDe(2).x, escena.camaraDe(2).zoom)');
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['100 3000 2']);
    j.buscar('Dos').posicion.x = 3400;
    j.avanzar(120);
    const [uno, dos] = j.juego.escena.camaras;
    expect(uno.posicion.x).toBeCloseTo(100, 0);
    expect(dos.posicion.x).toBeCloseTo(3400, 0);
    // Lo que ve cada una: su trozo (480 de ancho), y la segunda con zoom 2 ve la mitad
    expect(uno.zonaVisible().derecha - uno.zonaVisible().izquierda).toBe(480);
    expect(dos.zonaVisible().derecha - dos.zonaVisible().izquierda).toBe(240);
  });

  it('se dibuja el mundo una vez por cámara (recortado a su trozo) y la interfaz una sola vez', () => {
    const j = dosJugadores('cuando empieza:\n    pantalla.dividir(2)\n    escena.camara.seguir(yo)\n    escena.camaraDe(2).seguir(buscar("Dos"))');
    const { ctx, cuenta, llamadas } = lienzo();
    const rectangulos: number[][] = [];
    const textos: unknown[] = [];
    const r = { ctx, ancho: 960, alto: 540, fondo: 'negro', rectangulo: (...a: number[]) => rectangulos.push(a), circulo() {}, figura() {}, texto: (...a: unknown[]) => textos.push(a) };
    j.juego.escena.dibujar(r as never);
    expect(cuenta.clip).toBe(2);
    expect(llamadas.filter(([k]) => k === 'rect').map(([, a]) => a)).toEqual([[0, 0, 480, 540], [480, 0, 480, 540]]);
    // «Uno» se ve en la primera cámara y «Dos» en la segunda: un rectángulo cada uno
    expect(rectangulos).toHaveLength(2);
    expect(textos).toHaveLength(1);
  });

  it('el ratón apunta al mundo del trozo que tiene debajo', () => {
    const j = dosJugadores('cuando empieza:\n    pantalla.dividir(2)\n    escena.camaraDe(2).seguir(buscar("Dos"))');
    const e = j.juego.escena;
    j.entrada.posicionRaton = new Vector2(240, 270); // el centro del trozo izquierdo
    expect(e.ratonEnMundo()).toMatchObject({ x: 480, y: 270 }); // la cámara 1 sigue mirando a donde miraba
    j.entrada.posicionRaton = new Vector2(720, 270); // el centro del derecho: donde está «Dos»
    expect(e.ratonEnMundo()).toMatchObject({ x: 3000, y: 2000 });
    expect(e.ratonEncima(j.buscar('Dos'))).toBe(true);
  });

  it('al cambiar de escena la pantalla vuelve a estar entera', () => {
    const p = proyectoVacio();
    p.escenas.Principal.objetos = [{ nombre: 'A', script: 'a.chs' }];
    p.escenas.Otra = { colorFondo: 'negro', objetos: [] };
    p.scripts['a.chs'] = 'cuando empieza:\n    pantalla.dividir(4)\n    escena.cambiar("Otra")';
    const j = juegoDePrueba({ proyecto: migrarProyecto(p) });
    expect(j.juego.escena.camaras).toHaveLength(4);
    j.avanzar(2);
    expect(j.juego.nombreEscena).toBe('Otra');
    expect(j.juego.escena.camaras).toHaveLength(1);
    expect(j.juego.escena.camara.anchoPantalla).toBe(960);
  });

  it('errores claros: demasiados trozos, una división inventada, una cámara que no hay', () => {
    const error = (codigo: string) => dosJugadores(`cuando empieza:\n    ${codigo}`).errores[0]?.error;
    expect(error('pantalla.dividir(8)')?.message).toMatch(/2, 3 o 4 trozos/);
    expect(error('pantalla.dividir(2, "diagonal")')?.message).toMatch(/"columnas".*"filas"/);
    expect(error('escena.camaraDe(2).seguir(yo)')?.message).toMatch(/no hay cámara 2/);
    expect(error('escena.camaraDe(2).seguir(yo)')?.pista).toMatch(/pantalla.dividir\(2\)/);
    expect(error('pantalla.dividir(2)\n    escena.camaraDe(3).zoom = 2')?.message).toMatch(/hay 2 cámaras/);
  });
});
