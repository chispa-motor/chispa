/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL CURSO (APRENDE_CHISPA.md) Y LA CHULETA (CHULETA_CHISPA.md):
 *   - están todos los comandos de la API, ni uno más ni uno menos;
 *   - cada ejemplo, cada línea de la chuleta, cada ejercicio y cada mini
 *     proyecto se EJECUTA en un juego de prueba sin ningún error;
 *   - cada «error típico» que dice que da error, lo da de verdad (y los de
 *     lógica funcionan sin error: el fallo es que no hacen lo que querías);
 *   - en el código no hay tildes (fuera de los textos y los comentarios);
 *   - los dos .md están al día (si fallan: npm run manual).
 */
import { describe, expect, it } from 'vitest';
import { COMANDOS_CURSO, EJEMPLO_BASE, FUNCION_BASE, NIVELES_CURSO, TEMAS_CURSO } from '../src/chispa/api/curso';
import { fichasDeLaApi, generarAprende, generarChuleta } from '../src/chispa/api/aprende';
import { ErrorChispa, ErrorCompilacion } from '../src/chispa/errores/ErrorChispa';
import { quitarTildes } from '../src/utilidades/texto';
import { juegoDePrueba, type OpcionesJuegoPrueba } from './ayudantes';
import type { DefObjeto } from '../src/proyecto/formato';

// ───────────────────────── El mundo de prueba ─────────────────────────

const caja = (x: number, y: number, extra: Partial<DefObjeto> = {}): Partial<DefObjeto> => ({ x, y, sprite: { ancho: 40, alto: 40 }, colision: {}, ...extra });

/** Lo que hay en la escena donde se ejecutan los ejemplos (lo mismo que se explica en el curso). */
function mundo(scripts: Record<string, string>, proyecto?: { objetos: DefObjeto[]; gravedad?: number }): OpcionesJuegoPrueba {
  return {
    scripts,
    gravedad: proyecto?.gravedad,
    // Un mini proyecto trae su propia escena; los ejemplos usan la de siempre
    escena: proyecto ? proyecto.objetos : [
      { nombre: 'Prueba', ...caja(200, 200, { fisica: {} }), script: 'prueba.chs' },
      { nombre: 'Jugador', ...caja(400, 200) },
      { nombre: 'Moneda', ...caja(600, 200, { colision: { solido: false } }) },
      { nombre: 'Enemigo', ...caja(800, 200) },
      { nombre: 'Meta', ...caja(900, 100, { colision: { solido: false } }) },
      { nombre: 'Plataforma', ...caja(300, 450, { recorrido: { puntos: [{ x: 150, y: 0 }] } }) },
      // Un control de interfaz de cada clase (los que se añaden en el editor con Añadir > Interfaz)
      ...(['barra', 'deslizador', 'casilla', 'campo', 'lista', 'menu', 'ventana', 'inventario'] as const).map((tipo, i): DefObjeto => ({
        nombre: tipo[0].toUpperCase() + tipo.slice(1), x: 100, y: 500 - i * 40,
        sprite: { ancho: 200, alto: 30, fijo: true, tamano: 16 },
        control: { tipo, ...(tipo === 'lista' || tipo === 'menu' ? { opciones: ['Uno', 'Dos', 'Tres'] } : {}) },
      })),
      { nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 32, tipos: { suelo: { solida: true }, agua: { solida: false }, hielo: { solida: true } }, celdas: { '0,0': 'suelo', '1,0': 'suelo', '2,0': 'hielo' } } },
    ],
    plantillas: {
      Bala: caja(0, 0, { fisica: { gravedad: 0 } }),
      Enemigo: caja(0, 0),
      Gota: caja(0, 0),
      Premio: caja(0, 0),
      Espada: caja(0, 0),
      ...(proyecto ? plantillasDeProyectos : {}),
    },
    escenas: { Nivel2: { colorFondo: 'negro', objetos: [] }, Fin: { colorFondo: 'negro', objetos: [] } },
    sonidos: { salto: '', motor: '', tema: '', disparo: '' },
    imagenes: { jugador: '', jugador_herido: '', correr1: '', correr2: '', golpe1: '' },
    animaciones: { correr: { fotogramas: ['correr1', 'correr2'], velocidad: 8, repetir: true }, golpe: { fotogramas: ['golpe1'], velocidad: 8, repetir: false } },
  };
}

/** Las plantillas que usan los mini proyectos (se crean igual en el editor). */
const plantillasDeProyectos: Record<string, Partial<DefObjeto>> = Object.assign({}, ...NIVELES_CURSO.map((n) => n.proyecto.plantillas ?? {}));

const sangrar = (t: string, n = 1) => t.split('\n').map((l) => (l ? '    '.repeat(n) + l : l)).join('\n');
/** Un trozo suelto (sin «cuando») se ejecuta al empezar. */
const comoScript = (codigo: string) => (/^(cuando|funcion)\b/m.test(codigo) ? codigo : `cuando empieza:\n${sangrar(codigo)}`);

/**
 * Ejecuta un script como el de «Prueba» durante medio segundo (o solo lo
 * prepara, sin jugar). Devuelve los errores (de escritura o al jugar) y los
 * avisos amarillos.
 */
function ejecutar(codigo: string, jugar = true): { errores: string[]; avisos: string[] } {
  try {
    const j = juegoDePrueba(mundo({ 'prueba.chs': codigo }));
    if (jugar) j.avanzar(30);
    return { errores: j.errores.map((e) => e.error.message), avisos: j.avisos.filter((a) => a.archivo === 'prueba.chs').map((a) => a.mensaje) };
  } catch (e) {
    if (e instanceof ErrorCompilacion) return { errores: e.errores.map((x) => x.message), avisos: [] };
    if (e instanceof ErrorChispa) return { errores: [e.message], avisos: [] };
    throw e;
  }
}

/** Una línea de la chuleta, con las variables de EJEMPLO_BASE, dentro del evento que necesite. */
function lineaDeChuleta(corto: string): string {
  // Lo de dentro de un bloque: en un mientras, romper (si no, no terminaría nunca)
  const cuerpo = corto.trimEnd().endsWith(':') ? `${corto}\n    ${/^mientras\b/.test(corto) ? 'romper' : 'mostrar(1)'}` : corto;
  if (/^(cuando|funcion)\b/.test(corto)) return cuerpo;
  let dentro = cuerpo;
  // Un sino necesita su si delante
  if (/^sino\b/.test(corto)) dentro = `si falso:\n    mostrar(0)\n${cuerpo}`;
  if (/^(romper|continuar)$/.test(corto)) dentro = `mientras falso:\n${sangrar(cuerpo)}`;
  if (/^devolver\b/.test(corto)) return `funcion f(n):\n${sangrar(cuerpo)}`;
  const evento = /\botro\b|\bcasilla\b/.test(corto) ? 'cuando toco:' : /\bdato\b/.test(corto) ? 'cuando recibo "algo":' : 'cuando empieza:';
  return `${FUNCION_BASE}\n\n${evento}\n${sangrar(EJEMPLO_BASE)}\n${sangrar(dentro)}`;
}

/** Código sin los textos entre comillas ni los comentarios (para buscar tildes). */
const soloCodigo = (codigo: string) => codigo.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/#.*$/gm, '');

// ───────────────────────── Los tests ─────────────────────────

describe('El curso y la chuleta', () => {
  it('están TODOS los comandos de la API (y ninguno inventado)', () => {
    const api = fichasDeLaApi().map((f) => f.id).sort();
    const curso = COMANDOS_CURSO.map((c) => c.id).sort();
    expect(curso).toEqual(api);
    expect(TEMAS_CURSO.flatMap((t) => t.ids).sort()).toEqual(api);
    expect(api.length).toBe(fichasDeLaApi().length);
  });

  it('la chuleta tiene una línea por cada comando', () => {
    const chuleta = generarChuleta();
    const filas = chuleta.split('\n').filter((l) => l.startsWith('| `'));
    expect(filas.length).toBe(fichasDeLaApi().length);
    // Cada comando sale en SU fila (con su nombre tal cual se escribe)
    for (const f of fichasDeLaApi()) expect(chuleta, f.id).toContain('| `' + f.etiqueta.replace(/\|/g, '\\|') + '` |');
  });

  for (const nivel of [1, 2, 3, 4]) {
    it(`nivel ${nivel}: cada ejemplo funciona de verdad, sin errores`, () => {
      const temas = TEMAS_CURSO.filter((t) => t.nivel === nivel);
      const malos: string[] = [];
      for (const id of temas.flatMap((t) => t.ids)) {
        const c = COMANDOS_CURSO.find((x) => x.id === id)!;
        const { errores } = ejecutar(comoScript(c.ejemplo));
        if (errores.length) malos.push(`${id}: ${errores[0]}`);
      }
      expect(malos).toEqual([]);
    });

    it(`nivel ${nivel}: cada línea de la chuleta funciona`, () => {
      const malos: string[] = [];
      for (const id of TEMAS_CURSO.filter((t) => t.nivel === nivel).flatMap((t) => t.ids)) {
        const c = COMANDOS_CURSO.find((x) => x.id === id)!;
        expect(c.corto.includes('\n'), `${id}: la línea de la chuleta tiene que ser UNA línea`).toBe(false);
        const { errores } = ejecutar(lineaDeChuleta(c.corto));
        if (errores.length) malos.push(`${id}: ${errores[0]}`);
      }
      expect(malos).toEqual([]);
    });

    it(`nivel ${nivel}: cada error típico es de verdad un error (y los de lógica funcionan, pero hacen otra cosa)`, () => {
      const malos: string[] = [];
      for (const id of TEMAS_CURSO.filter((t) => t.nivel === nivel).flatMap((t) => t.ids)) {
        const c = COMANDOS_CURSO.find((x) => x.id === id)!;
        // Los de lógica solo se preparan (sin jugar): algunos hacen cosas a lo bestia a propósito (clonar sin parar...)
        const { errores, avisos } = ejecutar(comoScript(c.error.mal), c.error.tipo === 'error');
        if (c.error.tipo === 'error' && errores.length + avisos.length === 0) malos.push(`${id}: dice que Chispa avisa, pero funciona sin decir nada: ${c.error.mal}`);
        if (c.error.tipo === 'logica' && errores.length > 0) malos.push(`${id}: dice que es de lógica, pero da error: ${errores[0]}`);
      }
      expect(malos).toEqual([]);
    });
  }

  it('los ejercicios (con sus soluciones) y los mini proyectos funcionan', () => {
    const malos: string[] = [];
    for (const n of NIVELES_CURSO) {
      expect(n.ejercicios.length, `nivel ${n.numero}`).toBeGreaterThanOrEqual(3);
      n.ejercicios.forEach((e, i) => {
        const { errores } = ejecutar(comoScript(e.solucion));
        if (errores.length) malos.push(`nivel ${n.numero}, ejercicio ${i + 1}: ${errores[0]}`);
      });
      try {
        const j = juegoDePrueba(mundo(n.proyecto.scripts, n.proyecto));
        j.avanzar(180);
        for (const e of j.errores) malos.push(`mini proyecto ${n.numero}: ${e.error.message}`);
      } catch (e) {
        malos.push(`mini proyecto ${n.numero}: ${(e as Error).message}`);
      }
    }
    expect(malos).toEqual([]);
  });

  it('en el código no hay tildes (solo en los textos entre comillas y en los comentarios)', () => {
    const trozos = [
      ...COMANDOS_CURSO.flatMap((c) => [c.ejemplo, c.corto, c.error.mal]),
      ...NIVELES_CURSO.flatMap((n) => [...n.ejercicios.map((e) => e.solucion), ...Object.values(n.proyecto.scripts)]),
    ];
    // La ñ no es una tilde (lista.añadir es la forma oficial)
    const conTilde = trozos.filter((t) => quitarTildes(soloCodigo(t).replace(/ñ/g, 'n')) !== soloCodigo(t).replace(/ñ/g, 'n'));
    expect(conTilde).toEqual([]);
  });

  it('APRENDE_CHISPA.md y CHULETA_CHISPA.md están al día (si falla: npm run manual)', async () => {
    await expect(generarAprende()).toMatchFileSnapshot('../APRENDE_CHISPA.md');
    await expect(generarChuleta()).toMatchFileSnapshot('../CHULETA_CHISPA.md');
  });
});
