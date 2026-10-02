/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * RENDIMIENTO (día 6, bloque 2): las estampas (dibujos ya hechos de las formas con
 * sombra, resplandor...), las partículas diminutas y el mapa de luz. Aquí se prueba
 * la lógica; que se VE igual y lo que tarda se mide en el navegador de verdad
 * (pruebas-navegador/editor.mjs, «rendimiento»).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LADO_MAXIMO_ESTAMPA, MAXIMO_ESTAMPAS, cuantasEstampas, estampa, estampasActivas, numeroDe, olvidarEstampas, usarEstampas } from '../src/motor/Estampas';
import { PARTICULA_DIMINUTA, Particulas, type ConfigParticulas } from '../src/objetos/Particulas';
import type { Renderizador } from '../src/motor/Renderizador';

/** Un lienzo de mentira con contexto (el de las pruebas no tiene). */
function conLienzos() {
  const hechos: { width: number; height: number }[] = [];
  const original = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((etiqueta: string) => {
    if (etiqueta !== 'canvas') return original(etiqueta);
    const lienzo = { width: 0, height: 0, getContext: () => ({ lienzo }) };
    hechos.push(lienzo);
    return lienzo as unknown as HTMLElement;
  }) as typeof document.createElement);
  return hechos;
}

afterEach(() => {
  vi.restoreAllMocks();
  usarEstampas(true);
  olvidarEstampas();
});

describe('Estampas', () => {
  it('la misma clave da la misma estampa, y solo se pinta una vez', () => {
    conLienzos();
    let pintadas = 0;
    const a = estampa('estrella|roja', 40.2, 30, () => pintadas++);
    const b = estampa('estrella|roja', 40.2, 30, () => pintadas++);
    expect(a).not.toBeNull();
    expect(b).toBe(a);
    expect(pintadas).toBe(1);
    // El tamaño, en píxeles enteros (hacia arriba)
    expect([a!.width, a!.height]).toEqual([41, 30]);
    expect(estampa('estrella|azul', 40, 30, () => pintadas++)).not.toBe(a);
    expect(cuantasEstampas()).toBe(2);
  });

  it('se guardan las últimas usadas: al llenarse, se tira la que hace más que no se usa', () => {
    conLienzos();
    for (let i = 0; i < MAXIMO_ESTAMPAS; i++) estampa(`e${i}`, 8, 8, () => {});
    expect(cuantasEstampas()).toBe(MAXIMO_ESTAMPAS);
    // La primera se usa otra vez: ya no es la más vieja
    let repintada = false;
    estampa('e0', 8, 8, () => (repintada = true));
    estampa('nueva', 8, 8, () => {});
    expect(cuantasEstampas()).toBe(MAXIMO_ESTAMPAS);
    estampa('e0', 8, 8, () => (repintada = true));
    expect(repintada).toBe(false);
    // La que se ha tirado es la segunda (e1): al pedirla, se pinta de nuevo
    let otraVez = false;
    estampa('e1', 8, 8, () => (otraVez = true));
    expect(otraVez).toBe(true);
  });

  it('lo demasiado grande, lo vacío o sin lienzo no se estampa (se pintará directamente)', () => {
    const hechos = conLienzos();
    expect(estampa('grande', LADO_MAXIMO_ESTAMPA + 1, 10, () => {})).toBeNull();
    expect(estampa('vacia', 0, 10, () => {})).toBeNull();
    expect(estampa('rara', Number.NaN, 10, () => {})).toBeNull();
    expect(hechos.length).toBe(0);
    vi.restoreAllMocks();
    // El lienzo de las pruebas no tiene contexto: tampoco
    expect(estampa('sin-contexto', 10, 10, () => {})).toBeNull();
    expect(cuantasEstampas()).toBe(0);
  });

  it('se pueden apagar (para comparar) y al apagarlas se olvidan', () => {
    conLienzos();
    estampa('a', 8, 8, () => {});
    usarEstampas(false);
    expect(estampasActivas()).toBe(false);
    expect(cuantasEstampas()).toBe(0);
    expect(estampa('a', 8, 8, () => {})).toBeNull();
    usarEstampas(true);
    expect(estampa('a', 8, 8, () => {})).not.toBeNull();
  });

  it('cada cosa tiene su número para la clave: el mismo siempre, distinto del de otra', () => {
    const a = {};
    const b = {};
    expect(numeroDe(a)).toBe(numeroDe(a));
    expect(numeroDe(a)).not.toBe(numeroDe(b));
    expect(numeroDe(null)).toBe(0);
    expect(numeroDe(undefined)).toBe(0);
    expect(numeroDe(a)).toBeGreaterThan(0);
  });
});

describe('Partículas', () => {
  /** Pinta 20 partículas de ese tamaño, con el lienzo a esa escala, y cuenta qué se ha usado. */
  function pintar(tamano: number, escala: number, forma?: 'circulo' | 'anillo') {
    const p = new Particulas();
    p.emitir({ cantidad: 20, colores: ['rojo'], colorFinal: 'amarillo', velocidad: 10, vida: 5, tamano, gravedad: 0, dispersion: 360, direccion: 90, encoger: false, ...(forma ? { forma } : {}) } as ConfigParticulas, 100, 100);
    const cuenta = { fillRect: 0, arc: 0 };
    const estilos = new Set<string>();
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_, nombre: string) => {
        if (nombre === 'getTransform') return () => ({ a: escala, b: 0 });
        if (nombre === 'fillRect') return () => cuenta.fillRect++;
        if (nombre === 'arc') return () => cuenta.arc++;
        return () => {};
      },
      set: (_, nombre: string, valor) => {
        if (nombre === 'fillStyle') estilos.add(String(valor));
        return true;
      },
    });
    p.dibujar({ ctx } as unknown as Renderizador, (x, y) => ({ x, y }));
    return { ...cuenta, estilos };
  }

  it('las diminutas en el lienzo se pintan como cuadraditos; las que se ven bien, redondas', () => {
    expect(pintar(2, 1)).toMatchObject({ fillRect: 20, arc: 0 });
    expect(pintar(8, 1)).toMatchObject({ fillRect: 0, arc: 20 });
    // Lo que cuenta es lo que miden EN EL LIENZO: 8 puntos con el juego a un cuarto son 2 píxeles
    expect(pintar(8, 0.25)).toMatchObject({ fillRect: 20, arc: 0 });
    expect(pintar(2, 4)).toMatchObject({ fillRect: 0, arc: 20 });
    expect(PARTICULA_DIMINUTA).toBeGreaterThan(2);
    expect(PARTICULA_DIMINUTA).toBeLessThan(5);
  });

  it('un anillo diminuto sigue siendo un anillo (un cuadradito relleno no se le parece)', () => {
    expect(pintar(2, 1, 'anillo')).toMatchObject({ fillRect: 0, arc: 20 });
  });

  it('el color que va cambiando se escribe como rgb(...) válido', () => {
    const { estilos } = pintar(8, 1);
    for (const e of estilos) expect(e).toMatch(/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/);
    expect(estilos.size).toBeGreaterThan(0);
  });
});
