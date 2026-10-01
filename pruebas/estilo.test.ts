/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * COLORES Y ESTILO (día 1, bloque 2): relleno (degradado, patrón, imagen),
 * borde, sombra, resplandor, mezcla, paletas y el selector de color del editor.
 */
import { describe, expect, it, vi } from 'vitest';
import { ESTILO_POR_DEFECTO, PALETAS, aHSV, desdeHSV, esSencillo, mezclarColores, pintarConEstilo, type Estilo } from '../src/motor/Estilo';
import { esColorValido } from '../src/motor/Color';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { migrarProyecto, proyectoVacio } from '../src/proyecto/formato';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { Inspector } from '../src/editor/paneles/Inspector';
import type { VistaEscena } from '../src/editor/escena/VistaEscena';
import { abrirSelectorColor, misColores } from '../src/editor/interfaz/SelectorColor';
import { errorDe, unObjeto } from './ayudantes';

/** Un lienzo de mentira que apunta todo lo que se le pide. */
function lienzoQueApunta() {
  const llamadas: string[] = [];
  const estado: Record<string, unknown> = {};
  const ctx = new Proxy(estado, {
    get(t, k: string) {
      if (k in t) return t[k];
      if (k === 'getTransform') return () => ({ a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 });
      if (k === 'canvas') return { width: 800 };
      if (k === 'createLinearGradient' || k === 'createRadialGradient')
        return (...a: number[]) => {
          llamadas.push(`${k}(${a.map((n) => Math.round(n)).join(',')})`);
          return { addColorStop: (o: number, c: string) => llamadas.push(`parada ${o} ${c}`) };
        };
      return (...a: unknown[]) => void llamadas.push(`${k}(${a.map((x) => (typeof x === 'number' ? Math.round(x) : typeof x === 'string' ? x : '·')).join(',')})`);
    },
    set(t, k: string, v) {
      t[k] = v;
      llamadas.push(`${k}=${typeof v === 'number' ? Math.round(v) : typeof v === 'string' ? v : '·'}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, llamadas };
}

const estilo = (cambios: Partial<Estilo>): Estilo => ({ ...ESTILO_POR_DEFECTO, color: 'rojo', ...cambios });

describe('Estilo: cómo se pinta', () => {
  it('un estilo de solo un color va por el camino rápido de siempre', () => {
    expect(esSencillo(ESTILO_POR_DEFECTO)).toBe(true);
    expect(esSencillo(estilo({ borde: 2 }))).toBe(false);
    expect(esSencillo(estilo({ mezcla: 'sumar' }))).toBe(false);
  });

  it('el degradado va de un lado al otro de la forma, en el ángulo pedido', () => {
    const { ctx, llamadas } = lienzoQueApunta();
    pintarConEstilo(ctx, estilo({ relleno: 'degradado', anguloDegradado: 0, color2: 'azul' }), 100, 50, () => {});
    expect(llamadas).toContain('createLinearGradient(-50,0,50,0)');
    expect(llamadas).toContain('parada 1 #3498db');
    const otra = lienzoQueApunta();
    pintarConEstilo(otra.ctx, estilo({ relleno: 'radial' }), 100, 50, () => {});
    expect(otra.llamadas).toContain('createRadialGradient(0,0,0,0,0,50)');
  });

  it('la sombra se pinta sola, lejos, y se trae a su sitio (no se ve a través de la forma)', () => {
    const { ctx, llamadas } = lienzoQueApunta();
    pintarConEstilo(ctx, estilo({ sombra: '#00000088', sombraX: 5, sombraY: -5, desenfoqueSombra: 4 }), 100, 50, () => {});
    // El lienzo de mentira escala ×2: la sombra se escala igual; en el lienzo la Y va hacia abajo
    expect(llamadas).toContain('shadowBlur=8');
    expect(llamadas).toContain('shadowOffsetY=10');
    expect(llamadas.some((l) => /^setTransform\(2,0,0,2,2810,20\)$/.test(l))).toBe(true);
    expect(llamadas.filter((l) => l.startsWith('fill(')).length).toBe(2); // la sombra y la forma
  });

  it('el borde discontinuo pinta a rayitas', () => {
    const { ctx, llamadas } = lienzoQueApunta();
    pintarConEstilo(ctx, estilo({ borde: 2, bordeDiscontinuo: true, colorBorde: 'blanco' }), 10, 10, () => {});
    expect(llamadas).toContain('lineWidth=2');
    expect(llamadas).toContain('strokeStyle=#ffffff');
    expect(llamadas).toContain('stroke()');
  });

  it('el modo de mezcla «sumar» es «lighter» en el lienzo', () => {
    const { ctx, llamadas } = lienzoQueApunta();
    pintarConEstilo(ctx, estilo({ mezcla: 'sumar' }), 10, 10, () => {});
    expect(llamadas).toContain('globalCompositeOperation=lighter');
  });

  it('un objeto con estilo se dibuja por el camino del estilo; uno sin estilo, por el de siempre', () => {
    const j = unObjeto('', { sprite: { forma: 'estrella', ancho: 50, alto: 50, borde: 3 } });
    const s = j.buscar('Prueba').obtener(Sprite)!;
    const { ctx, llamadas } = lienzoQueApunta();
    s.dibujarEn({ ctx } as never, 100, 100);
    expect(llamadas).toContain('lineWidth=3');
    s.borde = 0;
    const r = { ctx: lienzoQueApunta().ctx, figura: vi.fn() };
    s.dibujarEn(r as never, 100, 100);
    expect(r.figura).toHaveBeenCalled();
  });
});

describe('Colores y paletas', () => {
  it('las paletas listas tienen 8 colores válidos cada una', () => {
    for (const [nombre, colores] of Object.entries(PALETAS)) {
      expect(colores.length, nombre).toBe(8);
      for (const c of colores) expect(esColorValido(c), `${nombre}: ${c}`).toBe(true);
    }
  });

  it('mezclar colores y pasar de/a tono-saturación-brillo', () => {
    expect(mezclarColores('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mezclarColores('rojo', 'nada', 0.5)).toBeNull();
    for (const c of ['#ff8800', '#123456', '#ffffff', '#000000', '#3498db']) {
      const { h, s, v } = aHSV(c);
      expect(desdeHSV(h, s, v)).toBe(c);
    }
    expect(aHSV('#ff000080').a).toBeCloseTo(0.5, 1);
  });
});

describe('Estilo desde Chispa', () => {
  it('se pone y se lee todo el estilo', () => {
    const j = unObjeto([
      'cuando empieza:',
      '    yo.relleno = "Degradado"',
      '    yo.color2 = "azul"',
      '    yo.borde = 3',
      '    yo.sombra = verdadero',
      '    yo.resplandor = "cian"',
      '    yo.mezcla = "sumar"',
      '    mostrar(yo.relleno, yo.sombra, yo.mezcla)',
      '    yo.sombra = nulo',
      '    mostrar(yo.sombra)',
    ].join('\n'), { sprite: { ancho: 20, alto: 20 } });
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['degradado #00000088 sumar', 'nulo']);
    const s = j.buscar('Prueba').obtener(Sprite)!;
    expect([s.color2, s.borde, s.resplandor]).toEqual(['azul', 3, 'cian']);
  });

  it('los errores dicen qué se quería decir', () => {
    expect(errorDeObjeto('yo.relleno = "degradao"')).toMatch(/degradado/);
    expect(errorDeObjeto('yo.colorBorde = "blanquito"')).toMatch(/blanco/);
    expect(errorDeObjeto('yo.mezcla = "suma"')).toMatch(/sumar/);
    expect(errorDeObjeto('yo.sombra = "url(x)"')).toMatch(/color/);
  });

  it('paleta() y mezclarColores()', () => {
    expect(errorDe('mostrar(paleta("neo"))').message + errorDe('mostrar(paleta("neo"))').pista).toMatch(/neon/);
    expect(errorDe('mostrar(paleta("neon", 9))').message).toMatch(/del 1 al 8/);
    const j = unObjeto('cuando empieza:\n    mostrar(paleta("neon", 1))\n    mostrar(longitud(paleta("pastel")))\n    mostrar(mezclarColores("#000000", "#ffffff", 0.5))');
    j.avanzar(1);
    expect(j.salida).toEqual([PALETAS.neon[0], '8', '#808080']);
  });
});

function errorDeObjeto(linea: string): string {
  const j = unObjeto(`cuando empieza:\n    ${linea}`, { sprite: { ancho: 20, alto: 20 } });
  j.avanzar(1);
  const e = j.errores[0]?.error;
  return e ? `${e.message} ${e.pista ?? ''}` : '(sin error)';
}

describe('Estilo en el proyecto', () => {
  const con = (sprite: object) => ({ ...proyectoVacio(), escenas: { Principal: { colorFondo: 'negro', objetos: [{ nombre: 'X', sprite }] } } });
  it('se guarda y se abre; lo que no es válido no se abre', () => {
    const bueno = migrarProyecto(con({ relleno: 'patron', patron: 'ondas', color2: 'rojo', borde: 2, sombra: '#0008', resplandor: 'amarillo', mezcla: 'pantalla' }));
    expect(bueno.escenas.Principal.objetos[0].sprite?.patron).toBe('ondas');
    expect(() => migrarProyecto(con({ relleno: 'arcoiris' }))).toThrow(/relleno/);
    expect(() => migrarProyecto(con({ sombra: 'url(http://x)' }))).toThrow(/sombra/);
    expect(() => migrarProyecto(con({ mezcla: 'xor' }))).toThrow(/mezcla/);
    expect(() => migrarProyecto({ ...proyectoVacio(), colores: ['rojo', 'expression(alert(1))'] })).toThrow(/colores/);
  });
});

describe('El selector de color del editor', () => {
  const vistaFalsa = () => ({ herramienta: 'mover', tipoPincel: null, alCambiarHerramienta: () => {}, ponerHerramienta() {} }) as unknown as VistaEscena;

  it('elige colores de los de Chispa, de las paletas y escribiendo el código', () => {
    const elegidos: string[] = [];
    const ancla = document.createElement('button');
    document.body.append(ancla);
    const ventana = abrirSelectorColor(ancla, 'rojo', (c) => elegidos.push(c));
    ventana.querySelector<HTMLButtonElement>('[data-color="verde"]')!.click();
    expect(elegidos.at(-1)).toBe('#2ecc71');
    ventana.querySelector<HTMLButtonElement>(`[data-color="${PALETAS.pastel[0]}"]`)!.click();
    expect(elegidos.at(-1)).toBe(PALETAS.pastel[0]);
    const codigo = ventana.querySelector<HTMLInputElement>('.codigo-color')!;
    codigo.value = '#123456';
    codigo.dispatchEvent(new Event('change'));
    expect(elegidos.at(-1)).toBe('#123456');
    codigo.value = 'no es un color';
    codigo.dispatchEvent(new Event('change'));
    expect(codigo.classList.contains('mal')).toBe(true);
    expect(elegidos.at(-1)).toBe('#123456');
    // El brillo a 0 da negro
    const brillo = ventana.querySelector<HTMLInputElement>('.deslizador-brillo')!;
    brillo.value = '0';
    brillo.dispatchEvent(new Event('input'));
    expect(elegidos.at(-1)).toBe('#000000');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.selector-color-ventana')).toBeNull();
  });

  it('«Mis colores» se guardan en el proyecto (y se deshacen)', () => {
    const e = new EstadoEditor();
    new Inspector(e, vistaFalsa());
    const ancla = document.createElement('button');
    const ventana = abrirSelectorColor(ancla, '#ff8800', () => {});
    ventana.querySelector<HTMLButtonElement>('.guardar-color')!.click();
    expect(e.proyecto.colores).toEqual(['#ff8800']);
    expect(misColores.leer()).toEqual(['#ff8800']);
    // Los que no son colores no se guardan
    e.ponerMisColores(['rojo', 'url(x)', 'rojo']);
    expect(e.proyecto.colores).toEqual(['rojo']);
    e.deshacer();
    expect(e.proyecto.colores).toEqual(['#ff8800']);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });

  it('el inspector enseña el estilo y lo cambia', () => {
    const e = new EstadoEditor();
    const insp = new Inspector(e, vistaFalsa());
    e.crearObjeto('forma', 0, 0, undefined, 'corazon');
    const relleno = insp.elemento.querySelector<HTMLSelectElement>('[data-ruta="sprite.relleno"]')!;
    relleno.value = 'patron';
    relleno.dispatchEvent(new Event('change'));
    expect(e.seleccionado!.sprite?.relleno).toBe('patron');
    expect(insp.elemento.querySelector('[data-ruta="sprite.patron"]')).not.toBeNull();
    const sombra = insp.elemento.querySelector<HTMLInputElement>('[data-ruta="sprite.sombra"]')!;
    sombra.checked = true;
    sombra.dispatchEvent(new Event('change'));
    expect(e.seleccionado!.sprite?.sombra).toBe('#00000088');
    expect(insp.elemento.querySelector('[data-ruta="sprite.desenfoqueSombra"]')).not.toBeNull();
    relleno.value = 'color';
    insp.elemento.querySelector<HTMLSelectElement>('[data-ruta="sprite.relleno"]')!.value = 'color';
    insp.elemento.querySelector<HTMLSelectElement>('[data-ruta="sprite.relleno"]')!.dispatchEvent(new Event('change'));
    expect(e.seleccionado!.sprite?.relleno).toBeUndefined();
  });
});
