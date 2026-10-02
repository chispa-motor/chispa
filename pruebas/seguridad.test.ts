/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * SEGURIDAD: cada ataque que se probó en la auditoría (AUDITORIA_SEGURIDAD.md)
 * está aquí, para que nunca vuelva a funcionar.
 */
import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ErrorChispa } from '../src/chispa/errores/ErrorChispa';
import { deserializar } from '../src/chispa/api/guardado';
import { LIMITE_OBJETOS, LIMITE_MENSAJES } from '../src/proyecto/JuegoEnMarcha';
import { LIMITE_HILOS } from '../src/chispa/ScriptChispa';
import { migrarProyecto, proyectoVacio } from '../src/proyecto/formato';
import { problemaDataURL } from '../src/proyecto/archivos';
import { esColorValido } from '../src/motor/Color';
import { generarPaginaJuego } from '../src/exportar/exportar';
import { huellaCSP, sha256 } from '../src/utilidades/sha256';
import { proyectoMinimo } from '../src/ejemplos/minimo/proyecto';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { MAXIMO_HISTORIAL, MAXIMO_VOCES } from '../src/motor/Sonido';
import { LADO_MAXIMO_ESTAMPA, MAXIMO_PIXELES_ESTAMPAS, estampa, estampaTirada, olvidarEstampas, pixelesDeEstampas, ponerRelojDeEstampas } from '../src/motor/Estampas';
import { MAXIMO_SEGUNDOS_DE_MUSICA, MAXIMO_SEGUNDOS_DE_SONIDOS, audioQueCabe } from '../src/proyecto/JuegoEnMarcha';
import { duracionDeCancion } from '../src/sonido/musica';
import { duracionDe } from '../src/sonido/generador';
import { plantillaPorId } from '../src/plantillas/indice';
import { IMAGEN_PRUEBA, SONIDO_PRUEBA, ejecutar, errorDe, juegoDePrueba } from './ayudantes';

// ───────────────────────── 1. Salir del intérprete ─────────────────────────

describe('Nadie puede salir del intérprete de Chispa a JavaScript', () => {
  // Los "tesoros" escondidos de JavaScript: con cualquiera de ellos se podría llegar a Function y ejecutar código
  const secretos = ['constructor', '__proto__', 'prototype', 'toString', 'valueOf', 'hasOwnProperty', '__defineGetter__', 'isPrototypeOf', 'call', 'apply', 'bind'];
  const dueños = ['[1, 2]', '"hola"', '{}', 'vector(1, 2)', 'teclado', 'raton', 'sonido', 'escena', 'escena.camara', 'tiempo', 'pantalla', 'dibujar', 'mando', 'sistema'];

  for (const d of dueños) {
    it(`${d}.constructor, ${d}.__proto__... dan un error de Chispa`, () => {
      for (const s of secretos) {
        let error: unknown = null;
        try {
          ejecutar(`variable x = ${d}.${s}\nmostrar(x)`, { analisis: false });
        } catch (e) {
          error = e;
        }
        // O no existe (error de Chispa), o es un dato normal (una tabla vacía no tiene esa clave)
        expect(error, `${d}.${s}`).toBeInstanceOf(ErrorChispa);
      }
    });
  }

  it('lo mismo en un juego: yo.constructor, buscar(...).__proto__, juego.constructor', () => {
    for (const codigo of ['mostrar(yo.constructor)', 'mostrar(yo.__proto__)', 'mostrar(buscar("A").constructor)', 'mostrar(juego.constructor)']) {
      const j = juegoDePrueba({ scripts: { 'a.chs': `cuando empieza:\n    ${codigo}` }, escena: [{ nombre: 'A', script: 'a.chs' }] });
      j.avanzar(1);
      expect(j.salida, codigo).toEqual([]);
    }
  });

  it('los nombres raros en textos no llegan a las tablas internas (teclas, efectos, colores, suavizados, escenas)', () => {
    const codigos = [
      'mostrar(teclado.pulsada(t))',
      'sonido.efecto(t)',
      'animar(yo.x, 3, 1, t)',
      'escena.cambiar(t)',
      'crear(t)',
      'raton.pulsado(t)',
      'mando.pulsado(t)',
    ];
    for (const c of codigos) {
      for (const t of ['constructor', '__proto__', 'toString']) {
        const j = juegoDePrueba({ scripts: { 'a.chs': `cuando empieza:\n    variable t = "${t}"\n    ${c}` }, escena: [{ nombre: 'A', script: 'a.chs', sprite: {} }] });
        j.avanzar(1);
        // Tiene que ser un error de Chispa explicado (o nada), nunca un fallo de JavaScript
        for (const { error } of j.errores) expect(error, `${c} con "${t}"`).toBeInstanceOf(ErrorChispa);
      }
    }
  });

  it('window, document, globalThis, eval, Function, fetch no existen', () => {
    for (const n of ['window', 'document', 'globalThis', 'eval', 'Function', 'fetch', 'process', 'require', 'localStorage', 'self', 'top', 'parent', 'XMLHttpRequest']) {
      expect(errorDe(`mostrar(${n})`, { analisis: false }).message, n).toContain('no existe');
    }
  });

  it('una tabla con la clave "__proto__" es solo un dato', () => {
    expect(ejecutar('variable t = {}\nt["__proto__"] = 5\nt["constructor"] = 6\nmostrar(t["__proto__"] + t["constructor"])').salida).toEqual(['11']);
  });

  it('el código del motor no usa innerHTML, eval ni new Function (ningún texto puede convertirse en HTML o en código)', () => {
    const peligrosos = /\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(|new Function\s*\(|setTimeout\(\s*['"`]|setInterval\(\s*['"`]|srcdoc/;
    const archivos: string[] = [];
    const recorrer = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const r = join(dir, n);
        if (statSync(r).isDirectory()) recorrer(r);
        else if (/\.(ts|mjs|js)$/.test(n)) archivos.push(r);
      }
    };
    recorrer('src');
    const malos = archivos.flatMap((a) =>
      readFileSync(a, 'utf8')
        .split('\n')
        .map((linea, i) => ({ linea, i }))
        .filter(({ linea }) => !/^\s*(\/\/|\*|\/\*)/.test(linea) && peligrosos.test(linea))
        .map(({ i }) => `${a}:${i + 1}`),
    );
    expect(malos).toEqual([]);
  });
});

// ───────────────────────── 2. Proyectos de otras personas ─────────────────────────

describe('Abrir un .chispa.json de otra persona', () => {
  const base = () => JSON.parse(JSON.stringify(proyectoVacio('Prueba'))) as Record<string, any>;
  const rechaza = (cambiar: (p: Record<string, any>) => void, texto: RegExp) => {
    const p = base();
    cambiar(p);
    expect(() => migrarProyecto(p)).toThrow(texto);
  };

  it('imágenes y sonidos de internet: rechazados (avisarían a otro servidor de que lo has abierto)', () => {
    rechaza((p) => (p.imagenes.espia = 'https://malo.example/pixel.png?quien=tu'), /imagenes → espia.*dirección de internet/);
    rechaza((p) => (p.imagenes.espia = '//malo.example/x.png'), /dirección de internet/);
    rechaza((p) => (p.sonidos.espia = 'http://malo.example/a.mp3'), /sonidos → espia/);
    rechaza((p) => (p.imagenes.local = 'file:///C:/Users/tu/secreto.png'), /dirección de internet o del ordenador/);
    rechaza((p) => (p.imagenes.x = 'imagenes/nave.png'), /no es una imagen guardado dentro del proyecto/);
  });

  it('código disfrazado de imagen o sonido: rechazado', () => {
    rechaza((p) => (p.imagenes.x = 'javascript:alert(1)'), /imagenes → x/);
    rechaza((p) => (p.imagenes.x = 'data:text/html;base64,' + btoa('<script>alert(1)</script>')), /text\/html/);
    rechaza((p) => (p.imagenes.x = 'data:image/png;base64,' + btoa('<script>alert(1)</script>')), /por dentro no lo es/);
    rechaza((p) => (p.imagenes.x = 'data:image/svg+xml;base64,' + btoa('<svg onload="alert(1)"></svg>')), /código dentro/);
    rechaza((p) => (p.imagenes.x = 'data:image/svg+xml;base64,' + btoa('<svg><script>alert(1)</script></svg>')), /código dentro/);
    rechaza((p) => (p.imagenes.x = 'data:image/svg+xml;base64,' + btoa('<svg><image href="https://malo.example/x.png"/></svg>')), /internet/);
    rechaza((p) => (p.sonidos.x = IMAGEN_PRUEBA.replace('image/png', 'audio/wav')), /por dentro es una imagen/);
    rechaza((p) => (p.imagenes.x = 'data:image/png,sin-base64'), /bien guardado/);
  });

  it('las imágenes y sonidos de verdad sí se abren (también SVG sin código)', () => {
    const p = base();
    p.imagenes.nave = IMAGEN_PRUEBA;
    p.imagenes.dibujo = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>');
    p.sonidos.pum = SONIDO_PRUEBA;
    expect(Object.keys(migrarProyecto(p).imagenes)).toEqual(['nave', 'dibujo']);
  });

  it('una imagen enorme (más de 15 MB): rechazada', () => {
    expect(problemaDataURL('data:image/png;base64,' + 'A'.repeat(21 * 1024 * 1024), 'imagen')).toMatch(/demasiado grande/);
  });

  it('colores con trucos de CSS: rechazados', () => {
    for (const malo of ['red; background-image: url(https://malo.example/x)', 'url(//malo.example/x)', 'rgb(1,2,3) url(x)', 'rgb(0,0,0);x:y', 'expression(alert(1))', '#fff"><script>']) {
      expect(esColorValido(malo), malo).toBe(false);
      rechaza((p) => (p.escenas.Principal.colorFondo = malo), /no es un color/);
    }
    for (const bueno of ['rojo', '#ff8800', '#f80', 'rgb(10, 20, 30)', 'rgba(0,0,0,0.5)', 'hsl(120deg 50% 50%)', 'transparente']) expect(esColorValido(bueno), bueno).toBe(true);
  });

  it('"__proto__" como nombre: rechazado (cambiaría la «familia» de los objetos al copiarlos)', () => {
    const texto = '{"formato":"chispa-proyecto","version":2,"escenas":{"Principal":{"colorFondo":"negro","objetos":[]}},"plantillas":{"__proto__":{"x":1}}}';
    expect(() => migrarProyecto(JSON.parse(texto))).toThrow(/__proto__.*reservado/);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('cada cosa con su tipo, y el error dice exactamente dónde está el problema', () => {
    rechaza((p) => (p.escenas.Principal.objetos = [{ nombre: 'A', x: 'mucho' }]), /escenas → Principal → objetos → 1 → x».*tendría que ser un número/);
    rechaza((p) => (p.scripts['a.chs'] = 42), /scripts → a\.chs.*texto/);
    rechaza((p) => (p.escenas.Principal.objetos = [{ sprite: { forma: '<b>' } }]), /forma/);
    rechaza((p) => (p.escenas = []), /escenas.*grupo de datos/);
    rechaza((p) => (p.ancho = 1e9), /ancho.*se sale/);
    rechaza((p) => (p.escenas.Principal.objetos = [{ x: Infinity }]), /número/);
    rechaza((p) => (p.nombre = 'a'.repeat(5000)), /demasiado largo/);
    rechaza((p) => (p.escenas.Principal.objetos = [{ nombre: 'A\u0000B' }]), /invisibles/);
    rechaza((p) => (p.escenas.Principal.objetos = [{ mapa: { tamano: 32, tipos: {}, celdas: { 'a,b': 'x' } } }]), /columna,fila/);
    expect(() => migrarProyecto('hola')).toThrow(/no es un proyecto de Chispa/);
    expect(() => migrarProyecto(null)).toThrow(/no es un proyecto de Chispa/);
  });

  it('demasiadas cosas: rechazado antes de congelar el navegador', () => {
    rechaza((p) => (p.escenas.Principal.objetos = Array.from({ length: 20_001 }, () => ({}))), /demasiados elementos/);
    rechaza((p) => (p.scripts = Object.fromEntries(Array.from({ length: 2001 }, (_, i) => [`s${i}.chs`, '']))), /demasiadas cosas/);
  });

  it('lo que no se conoce no llega al editor', () => {
    const p = base();
    p.truco = '<script>alert(1)</script>';
    p.escenas.Principal.objetos = [{ nombre: 'A', alHacerClic: 'alert(1)', sprite: { onload: 'x', color: 'rojo' } }];
    const limpio = migrarProyecto(p) as unknown as Record<string, any>;
    expect(limpio.truco).toBeUndefined();
    expect(limpio.escenas.Principal.objetos[0]).toEqual({ nombre: 'A', sprite: { color: 'rojo' } });
  });

  it('los proyectos buenos se abren sin perder nada (la Arena y el ejemplo)', () => {
    const arena = JSON.parse(readFileSync('proyectos/arena-de-habilidades/arena-de-habilidades.chispa.json', 'utf8'));
    for (const original of [arena, proyectoMinimo]) {
      const abierto = migrarProyecto(structuredClone(original));
      const { id: _id, ...sinId } = abierto;
      expect({ ...sinId, id: original.id }).toMatchObject(JSON.parse(JSON.stringify({ ...original })));
      // Y abrirlo otra vez da lo mismo
      expect(migrarProyecto(structuredClone(abierto))).toEqual(abierto);
    }
  });

  it('los textos con HTML (nombres, diálogos) se abren como texto normal: el editor nunca los convierte en HTML', () => {
    const p = base();
    p.nombre = '<img src=x onerror=alert(1)>';
    p.escenas.Principal.objetos = [{ nombre: '<b>jefe</b>', sprite: { forma: 'texto', texto: '<script>alert(1)</script>' } }];
    const abierto = migrarProyecto(p);
    expect(abierto.nombre).toBe('<img src=x onerror=alert(1)>');
  });
});

// ───────────────────────── 3. Límites ─────────────────────────

describe('Límites: ningún juego puede congelar o llenar la memoria del navegador', () => {
  it('una función que se llama a sí misma sin parar', () => {
    const e = errorDe('funcion f(n):\n    devolver f(n + 1)\nmostrar(f(1))', { analisis: false });
    expect(e.message).toMatch(/se ha metido demasiadas veces una dentro de otra/);
    expect(e.pista).toMatch(/caso en el que NO lo haga/);
  });

  it('una función que se llama a sí misma unas pocas veces sí funciona', () => {
    expect(ejecutar('funcion f(n):\n    si n <= 0:\n        devolver 0\n    devolver f(n - 1) + 1\nmostrar(f(100))').salida).toEqual(['100']);
  });

  it('textos que se duplican (t = t + t) y reemplazar que no para de crecer', () => {
    expect(errorDe('variable t = "a"\nrepetir 40 veces:\n    t = t + t').message).toMatch(/texto tendría .* letras/);
    expect(errorDe('variable t = "ab"\nrepetir 30 veces:\n    t = t.reemplazar("a", "aa")').message).toMatch(/texto tendría/);
    expect(errorDe('variable t = "a"\nrepetir 30 veces:\n    t = "{t}{t}"').message).toMatch(/texto tendría/);
  });

  it('listas que se duplican y listas enormes', () => {
    expect(errorDe('variable l = [1]\nrepetir 40 veces:\n    l = l + l').message).toMatch(/lista tendría/);
    expect(errorDe('variable l = rango(1, 100000000)').message).toMatch(/demasiados/);
  });

  it('bucles infinitos, también si dentro se lanza otro hilo (aLaVez) o se crean objetos', () => {
    const casos = [
      'cuando empieza:\n    mientras verdadero:\n        variable a = 1',
      'cuando empieza:\n    mientras verdadero:\n        aLaVez(f)\nfuncion f():\n    esperar(1)',
      'cuando empieza:\n    mientras verdadero:\n        aLaVez(g)\nfuncion g():\n    variable x = 1',
      'cuando empieza:\n    mientras verdadero:\n        destruir(crear("B", 0, 0))',
    ];
    for (const c of casos) {
      const j = juegoDePrueba({ scripts: { 'a.chs': c, 'b.chs': 'cuando empieza:\n    variable x = 1' }, plantillas: { B: { script: 'b.chs' } }, escena: [{ nombre: 'A', script: 'a.chs' }] });
      const t0 = Date.now();
      j.avanzar(1);
      expect(j.errores.length, c).toBe(1);
      expect(Date.now() - t0, c).toBeLessThan(15_000);
    }
  });

  it('un objeto que se clona (o crea su misma plantilla) en «cuando empieza» no rompe el juego: error claro', () => {
    for (const [scripts, plantillas] of [
      [{ 'a.chs': 'cuando empieza:\n    clonar(yo)' }, {}],
      [{ 'a.chs': 'cuando empieza:\n    yo.clonar()' }, {}],
      [{ 'a.chs': 'cuando empieza:\n    crear("B", 0, 0)', 'b.chs': 'cuando empieza:\n    crear("B", 0, 0)' }, { B: { script: 'b.chs' } }],
    ] as const) {
      const j = juegoDePrueba({ scripts: { ...scripts }, plantillas: { ...plantillas }, escena: [{ nombre: 'A', script: 'a.chs' }] });
      j.avanzar(2);
      expect(j.errores.map((e) => e.error.message).join()).toMatch(/crea otro objeto en su «cuando empieza», y ese otro crea otro/);
      expect(j.errores.every((e) => e.error instanceof ErrorChispa)).toBe(true);
    }
  });

  it('millones de objetos, de hilos (aLaVez) o de mensajes', () => {
    const casos: [string, RegExp][] = [
      ['repetir 900000 veces:\n        crear("B", 0, 0)', new RegExp(`${LIMITE_OBJETOS.toLocaleString('es')} objetos`)],
      ['repetir 900000 veces:\n        aLaVez(f)', new RegExp(`${LIMITE_HILOS.toLocaleString('es')} cosas haciéndose a la vez`)],
      ['repetir 900000 veces:\n        enviar("x")', new RegExp(`más de ${LIMITE_MENSAJES.toLocaleString('es')} mensajes`)],
    ];
    for (const [c, error] of casos) {
      const j = juegoDePrueba({
        scripts: { 'a.chs': `cuando empieza:\n    ${c}\nfuncion f():\n    esperar(1)\ncuando recibo "x":\n    variable z = 1` },
        plantillas: { B: {} },
        escena: [{ nombre: 'A', script: 'a.chs' }],
      });
      j.avanzar(2);
      expect(j.errores.map((e) => e.error.message).join(), c).toMatch(error);
    }
  });
});

// ───────────────────────── 4. Datos guardados ─────────────────────────

describe('Los datos guardados de un juego no los lee otro', () => {
  it('dos proyectos con el MISMO nombre no comparten los récords (se guardan por su identificador)', () => {
    const navegador = new Map<string, string>();
    const mio = juegoDePrueba({ almacen: navegador, scripts: { 'a.chs': 'cuando empieza:\n    guardar("record", 999)' }, escena: [{ nombre: 'A', script: 'a.chs' }] });
    mio.avanzar(1);
    const p = migrarProyecto({ ...proyectoVacio('prueba'), id: 'otro-proyecto-1234' });
    p.scripts['a.chs'] = 'cuando empieza:\n    mostrar(cargar("record", "nada"))';
    p.escenas.Principal.objetos = [{ nombre: 'A', script: 'a.chs' }];
    const suyo = juegoDePrueba({ almacen: navegador, proyecto: p });
    suyo.avanzar(1);
    expect(suyo.salida).toEqual(['nada']);
  });

  it('cada proyecto nuevo tiene su propio identificador, imposible de adivinar', () => {
    const a = proyectoVacio().id!;
    const b = proyectoVacio().id!;
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('datos guardados rotos o cambiados a mano no rompen el juego', () => {
    for (const roto of ['{', '{"__tabla": 5}', '{"__tabla": [[1, 2]]}', '{"__vector": ["a"]}', '[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[1]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]', '1e999']) {
      expect(() => deserializar(roto), roto).not.toThrow();
    }
  });
});

// ───────────────────────── 5. Juegos exportados ─────────────────────────

describe('Juegos exportados: política de seguridad (CSP)', () => {
  const pagina = generarPaginaJuego({ ...proyectoMinimo, nombre: 'Mi juego </title><script>alert(1)</script>' }, 'console.log("reproductor")');

  it('lleva una CSP estricta: nada de internet y solo SU código', () => {
    const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(pagina)![1].replace(/&#39;/g, "'");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toMatch(/script-src 'sha256-[A-Za-z0-9+/=]+'(;|$)/);
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|https?:|\*/);
  });

  it('la huella del código y de los estilos es la de verdad (si no, el juego no arrancaría)', () => {
    const csp = /Content-Security-Policy" content="([^"]+)"/.exec(pagina)![1].replace(/&#39;/g, "'");
    const script = /<script>([\s\S]*?)<\/script>/.exec(pagina)![1];
    const estilos = [...pagina.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    const huella = (t: string) => `'sha256-${createHash('sha256').update(t, 'utf8').digest('base64')}'`;
    expect(csp).toContain(huella(script));
    for (const e of estilos) expect(csp).toContain(huella(e));
    // Otro código (aunque alguien lo colara en la página) tendría otra huella
    expect(csp).not.toContain(huella('alert(1)'));
  });

  it('el nombre del juego con HTML no se convierte en HTML', () => {
    expect(pagina).not.toContain('<script>alert(1)</script>');
    expect(pagina).toContain('&lt;/title&gt;&lt;script&gt;');
  });

  it('SHA-256 hecho a mano = el de Node', () => {
    for (const t of ['', 'abc', 'a'.repeat(1000), '¡Hola, Chispa! ñ 🎮', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64)]) {
      const nuestro = Buffer.from(sha256(new TextEncoder().encode(t))).toString('hex');
      expect(nuestro, t.slice(0, 10)).toBe(createHash('sha256').update(t, 'utf8').digest('hex'));
    }
    expect(huellaCSP('abc')).toBe(`'sha256-${createHash('sha256').update('abc').digest('base64')}'`);
  });
});

// ───────────────────────── 6. Otras cosas ─────────────────────────

describe('Otras protecciones', () => {
  it('sistema.abrirWeb pasa por quien usa el juego (el editor pregunta antes) y solo acepta http(s)', () => {
    const abiertas: string[] = [];
    const j = juegoDePrueba({ abrirWeb: (u) => abiertas.push(u), scripts: { 'a.chs': 'cuando empieza:\n    sistema.abrirWeb("https://itch.io")\n    sistema.abrirWeb("javascript:alert(1)")' }, escena: [{ nombre: 'A', script: 'a.chs' }] });
    j.avanzar(1);
    expect(abiertas).toEqual(['https://itch.io']);
    expect(j.errores[0].error.message).toMatch(/https:\/\//);
  });

  it('en el editor, "__proto__" no puede ser el nombre de nada', () => {
    const e = new EstadoEditor();
    e.crearEscena('__proto__');
    expect(Object.keys(e.proyecto.escenas)).not.toContain('__proto__');
    e.cambiarDatoJuego('__proto__', 5);
    expect(Object.keys(e.proyecto.datos ?? {})).not.toContain('__proto__');
    expect(Object.getPrototypeOf(e.proyecto.escenas)).toBe(Object.prototype);
  });

  it('en el editor no se puede añadir una imagen que no lo es', () => {
    const e = new EstadoEditor();
    expect(() => e.agregarImagen('trampa.png', 'data:image/png;base64,' + btoa('<script>alert(1)</script>'))).toThrow(/No se puede añadir «trampa.png»/);
    expect(() => e.agregarSonido('espia.mp3', 'https://malo.example/a.mp3')).toThrow(/internet/);
  });
});

// ───────────────────────── 7. Lo nuevo de Chispa 1.1 ─────────────────────────

describe('Chispa 1.1: lo nuevo tampoco puede congelar el juego ni llenar la memoria', () => {
  const objeto = (codigo: string) => juegoDePrueba({
    scripts: { 'p.chs': codigo }, gravedad: 0, sonidos: { salto: SONIDO_PRUEBA },
    escena: [{ nombre: 'Prueba', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, script: 'p.chs' }, { nombre: 'Otro', x: 300, y: 100, sprite: { ancho: 20, alto: 20 } }],
  });

  it('sonidos sin fin: como mucho suenan MAXIMO_VOCES a la vez y el historial no crece sin parar', () => {
    const j = objeto('cuando cada fotograma:\n    repetir 2000 veces:\n        sonido.bucleEn("salto", vector(aleatorio(0, 9000), aleatorio(0, 9000)), 100)\n        sonido.reproducir("salto")');
    const t0 = performance.now();
    j.avanzar(5);
    expect(j.errores).toEqual([]);
    expect(j.juego.motor.sonido.cuantasVoces).toBeLessThanOrEqual(MAXIMO_VOCES);
    expect(j.juego.motor.sonido.cuantasVoces).toBeGreaterThan(0);
    expect(j.juego.motor.sonido.historial.length).toBeLessThanOrEqual(MAXIMO_HISTORIAL * 2);
    expect(performance.now() - t0).toBeLessThan(5000);
  });

  it('el mismo bucle en el mismo sitio no se amontona', () => {
    const j = objeto('cuando cada fotograma:\n    sonido.bucleEn("salto", yo, 100)\n    sonido.bucleEn("salto", vector(5, 5), 100)');
    j.avanzar(30);
    expect(j.juego.motor.sonido.cuantasVoces).toBe(2);
  });

  it('puntuaciones: un nombre de millones de letras no deja el juego parado, y se guarda recortado', () => {
    const j = objeto('cuando empieza:\n    variable t = "<img src=x onerror=alert(1)>     "\n    repetir 14 veces:\n        t = t + t\n    repetir 3000 veces:\n        puntuaciones.guardar(t + texto(aleatorio(0, 99999)), aleatorio(0, 999999))\n    mostrar(puntuaciones.lista().longitud, puntuaciones.lista()[1].nombre.longitud)');
    const t0 = performance.now();
    j.avanzar(2);
    expect(j.errores).toEqual([]);
    expect(performance.now() - t0).toBeLessThan(4000);
    const [cuantas, letras] = j.salida[0].split(' ').map(Number);
    expect(cuantas).toBeLessThanOrEqual(10);
    expect(letras).toBeLessThanOrEqual(16);
  });

  it('el aspecto en marcha tiene los mismos topes que en el archivo (un resplandor de un trillón no pasa)', () => {
    const enorme = '999999999999999999999';
    const j = objeto(`cuando empieza:\n    yo.borde = ${enorme}\n    yo.tamanoResplandor = ${enorme}\n    yo.desenfoqueSombra = ${enorme}\n    yo.grosorContorno = ${enorme}\n    yo.desenfoque = ${enorme}\n    yo.sombraX = ${enorme}\n    yo.sombraY = -${enorme}\n    yo.brillo = ${enorme}\n    mostrar(yo.borde, yo.tamanoResplandor, yo.desenfoqueSombra, yo.grosorContorno, yo.desenfoque, yo.sombraX, yo.sombraY, yo.brillo)\n    yo.borde = 3\n    yo.sombraX = -4\n    yo.brillo = 1.5\n    mostrar(yo.borde, yo.sombraX, yo.brillo)`);
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['1000 1000 1000 1000 1000 10000 -10000 100', '3 -4 1.5']);
  });

  it('el archivo sigue rechazando esos números fuera de sus topes', () => {
    for (const sprite of [{ tamanoResplandor: 1e21 }, { borde: -1 }, { desenfoqueSombra: 5000 }, { sombraX: 1e9 }]) {
      const p = JSON.parse(JSON.stringify(proyectoVacio('x')));
      p.escenas.Principal.objetos.push({ nombre: 'A', sprite });
      expect(() => migrarProyecto(p), JSON.stringify(sprite)).toThrow(/por seguridad no se abre/);
    }
  });

  it('canciones y sonidos hechos: solo se prepara lo que cabe en la memoria; lo demás se queda en silencio', () => {
    // 200 canciones del tamaño máximo: antes se convertían todas en sonido al empezar (unos 19 GB)
    const cancion = { tempo: 40, pasos: 256, bucle: true, pistas: Array.from({ length: 8 }, () => ({ instrumento: 'organo', volumen: 1, notas: [{ paso: 0, nota: 60, largo: 256 }] })) };
    const p = JSON.parse(JSON.stringify(proyectoVacio('x')));
    p.canciones = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`c${i}`, cancion]));
    p.sonidosHechos = Object.fromEntries(Array.from({ length: 2000 }, (_, i) => [`s${i}`, { sostenido: 1.5, caida: 2, ataque: 1 }]));
    const abierto = migrarProyecto(p);
    const cabe = audioQueCabe(abierto);
    const musica = [...cabe.canciones].reduce((s, n) => s + duracionDeCancion(abierto.canciones![n]) * abierto.canciones![n].pistas.length, 0);
    const sonidos = [...cabe.sonidos].reduce((s, n) => s + duracionDe(abierto.sonidosHechos![n]), 0);
    expect(musica).toBeLessThanOrEqual(MAXIMO_SEGUNDOS_DE_MUSICA);
    expect(sonidos).toBeLessThanOrEqual(MAXIMO_SEGUNDOS_DE_SONIDOS);
    expect(cabe.canciones.size).toBeGreaterThan(0);
    expect(cabe.canciones.size).toBeLessThan(200);
    expect(cabe.sonidos.size).toBeLessThan(2000);
    expect(cabe.fuera.length).toBe(200 - cabe.canciones.size + 2000 - cabe.sonidos.size);
    // Las primeras entran, las últimas no
    expect(cabe.canciones.has('c0')).toBe(true);
    expect(cabe.canciones.has('c199')).toBe(false);
  });

  it('en los juegos normales (todas las plantillas) cabe todo el sonido', () => {
    for (const id of ['plataformas', 'aventura', 'naves', 'puzzle', 'carreras', 'cartas', 'historia']) {
      const proyecto = migrarProyecto(plantillaPorId(id)!.crear());
      expect(audioQueCabe(proyecto).fuera, id).toEqual([]);
    }
  });

  it('estampas: entre todas no pasan de MAXIMO_PIXELES_ESTAMPAS, y las que se tiran sueltan su memoria', () => {
    const original = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((etiqueta: string) => {
      if (etiqueta !== 'canvas') return original(etiqueta);
      const lienzo = { width: 0, height: 0, getContext: () => ({ lienzo }) };
      return lienzo as unknown as HTMLElement;
    }) as typeof document.createElement);
    let ahora = 1000;
    ponerRelojDeEstampas(() => ahora);
    olvidarEstampas();
    try {
      // Cientos de objetos enormes, cada uno distinto: antes eran 400 lienzos de 768 × 768 (casi 1 GB)
      const hechas: (HTMLCanvasElement | null)[] = [];
      for (let i = 0; i < 400; i++) hechas.push(estampa(`grande${i}`, LADO_MAXIMO_ESTAMPA, LADO_MAXIMO_ESTAMPA, () => {}));
      expect(pixelesDeEstampas()).toBeLessThanOrEqual(MAXIMO_PIXELES_ESTAMPAS);
      const caben = Math.floor(MAXIMO_PIXELES_ESTAMPAS / (LADO_MAXIMO_ESTAMPA * LADO_MAXIMO_ESTAMPA));
      expect(hechas.filter(Boolean).length).toBe(caben);
      // Las que no caben no se hacen (ese objeto se pinta directamente): no se tiran las recién hechas
      expect(hechas[399]).toBeNull();
      expect(estampaTirada(hechas[0]!)).toBe(false);
      // Al rato sí se puede hacer sitio: la más vieja se tira y su lienzo se queda vacío (suelta la memoria)
      ahora += 5000;
      expect(estampa('otra', LADO_MAXIMO_ESTAMPA, LADO_MAXIMO_ESTAMPA, () => {})).not.toBeNull();
      expect(estampaTirada(hechas[0]!)).toBe(true);
      expect(hechas[0]!.width).toBe(0);
      expect(pixelesDeEstampas()).toBeLessThanOrEqual(MAXIMO_PIXELES_ESTAMPAS);
      olvidarEstampas();
      expect(pixelesDeEstampas()).toBe(0);
      expect(estampaTirada(hechas[1]!)).toBe(true);
    } finally {
      ponerRelojDeEstampas(() => performance.now());
      olvidarEstampas();
      vi.restoreAllMocks();
    }
  });

  it('encuadrar una lista enorme da un error claro, y un texto de efecto larguísimo se recorta', () => {
    const j = objeto('variable l = []\ncuando empieza:\n    repetir 5000 veces:\n        l.añadir(yo)\n    escena.camara.encuadrar(l)');
    j.avanzar(2);
    expect(j.errores[0].error.mensajeCorto).toMatch(/admite 100 objetos como mucho, y le das 5000/);
    const k = objeto('cuando empieza:\n    variable t = "a"\n    repetir 19 veces:\n        t = t + t\n    efecto.texto(t, yo)');
    const t0 = performance.now();
    k.avanzar(5);
    expect(k.errores).toEqual([]);
    expect(performance.now() - t0).toBeLessThan(2000);
  });

  it('lo nuevo tampoco deja llegar a JavaScript: junta, efecto, puntuaciones, controles, luces', () => {
    for (const codigo of ['mostrar(junta.constructor)', 'mostrar(efecto.constructor)', 'mostrar(puntuaciones.__proto__)', 'mostrar(controles(1).constructor)', 'mostrar(musica.constructor)', 'mostrar(escena.camaraDe(1).constructor)']) {
      // O no deja ni empezar (lo ve la revisión), o da un error al llegar: nunca enseña nada
      let salida: string[] = [];
      try {
        const j = objeto(`cuando empieza:\n    ${codigo}`);
        j.avanzar(1);
        salida = j.salida;
        expect(j.errores.length, codigo).toBe(1);
      } catch (e) {
        expect(String((e as Error).message), codigo).toMatch(/no tiene nada llamado/);
      }
      expect(salida, codigo).toEqual([]);
    }
    // Y los nombres con trampa se rechazan con un error de Chispa, no se cuelan
    for (const codigo of ['efecto.usar("__proto__", yo)', 'yo.efecto = "constructor"', 'yo.patron = "constructor"', 'yo.mezcla = "toString"', 'yo.forma = "__proto__"', 'controles(1).ponerTecla("__proto__", "a")']) {
      let salida: string[] = [];
      try {
        const j = objeto(`cuando empieza:\n    ${codigo}\n    mostrar("sigue")`);
        j.avanzar(1);
        salida = j.salida;
        expect(j.errores.length, codigo).toBe(1);
      } catch (e) {
        expect(e, codigo).toBeInstanceOf(Error);
      }
      expect(salida, codigo).toEqual([]);
    }
  });

  it('un icono o una letra con trampa en el archivo no pasan', () => {
    const p = JSON.parse(JSON.stringify(proyectoVacio('x')));
    p.letras = { 'x; } body { display: none': IMAGEN_PRUEBA };
    expect(() => migrarProyecto(p)).toThrow(/por seguridad no se abre/);
    const q = JSON.parse(JSON.stringify(proyectoVacio('x')));
    // El icono es el NOMBRE de una imagen del proyecto: cualquier otra cosa se quita sin más
    q.icono = 'javascript:alert(1)';
    expect(migrarProyecto(q).icono).toBeUndefined();
    expect(generarPaginaJuego(migrarProyecto(q), 'console.log(1)')).not.toContain('javascript:alert');
    const r = JSON.parse(JSON.stringify(proyectoVacio('x')));
    r.icono = '__proto__';
    expect(migrarProyecto(r).icono).toBeUndefined();
  });

  it('en el editor, cambiar el nombre de un objeto por uno con comillas no escribe nada raro en el código', () => {
    const e = new EstadoEditor();
    e.abrir(plantillaPorId('historia')!.crear());
    const antes = { ...e.proyecto.scripts };
    const indice = e.escena.objetos.findIndex((o) => o.nombre === 'Jugador');
    e.renombrar({ tipo: 'escena', escena: e.escenaActual, indice }, 'X");sistema.abrirWeb("http://malo.example');
    expect(e.proyecto.scripts).toEqual(antes);
    for (const codigo of Object.values(e.proyecto.scripts)) expect(codigo).not.toContain('abrirWeb');
  });
});
