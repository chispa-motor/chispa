/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * OPERACIONES CON FORMAS (en el editor):
 *   - unir varias formas en una, o restarle a una las demás (una puerta con
 *     un agujero, una luna con un bocado...), con `polygon-clipping`;
 *   - pasar cualquier forma a un camino de la pluma (para retocarla punto a punto);
 *   - dejar un camino bien encajado en su objeto (sus puntos de -0,5 a 0,5);
 *   - convertir una forma (con su estilo) en una imagen PNG.
 */
import polygonClipping, { type MultiPolygon } from 'polygon-clipping';
import { aMundo, aplanarCamino, figuraDe, type Forma, type Punto, type PuntoCamino } from '../../objetos/formas/figuras';
import type { DefObjeto, DefSprite } from '../../proyecto/formato';
import { Renderizador } from '../../motor/Renderizador';
import { ObjetoJuego } from '../../objetos/ObjetoJuego';
import { Sprite } from '../../objetos/componentes/Sprite';

/** ¿Se puede unir o restar? (las formas sí; los textos y las imágenes no) */
export function esFormaCombinable(def: DefObjeto): boolean {
  return !!def.sprite && !def.sprite.imagen && def.sprite.forma !== 'texto' && !def.mapa;
}

/** Los datos de la figura de un sprite, con su tamaño de verdad (con la escala). */
function datosDe(s: DefSprite, escala = 1) {
  return {
    forma: (s.forma ?? 'rectangulo') as Forma,
    ancho: (s.ancho ?? 64) * escala,
    alto: (s.alto ?? 64) * escala,
    lados: s.lados,
    radioInterior: s.radioInterior,
    radioEsquina: s.radioEsquina,
    inicioArco: s.inicioArco,
    finArco: s.finArco,
    grosor: s.grosor,
    puntos: s.puntos,
    cerrado: s.cerrado,
    figuras: s.figuras,
  };
}

/** La forma de un objeto en el mundo, como polígonos con agujeros (para polygon-clipping). */
export function formaEnElMundo(def: DefObjeto): MultiPolygon {
  const s = def.sprite!;
  const f = figuraDe(datosDe(s, def.escala ?? 1));
  const mover = (p: Punto[]) => aMundo(p, def.x ?? 0, def.y ?? 0, def.rotacion ?? 0, s.voltear ?? false, false).map((q): [number, number] => [q.x, q.y]);
  // Un camino abierto (una línea) no tiene relleno: se usan sus trozos gruesos
  const poligonos: Punto[][][] = f.trazo ? f.piezas.filter((p): p is Punto[] => Array.isArray(p)).map((p) => [p]) : f.anillos;
  return poligonos.map((pol) => pol.map((anillo) => cerrarAnillo(mover(anillo))));
}

const cerrarAnillo = (a: [number, number][]) => (a.length && (a[0][0] !== a.at(-1)![0] || a[0][1] !== a.at(-1)![1]) ? [...a, a[0]] : a);

/**
 * Une (o resta) las formas de varios objetos y devuelve el objeto nuevo,
 * colocado donde quedan. Restar: al PRIMERO se le quitan los demás. null si
 * no queda nada (por ejemplo, si lo que restas lo tapa entero).
 */
export function combinarFormas(defs: DefObjeto[], modo: 'unir' | 'restar'): DefObjeto | null {
  const formas = defs.map(formaEnElMundo).filter((m) => m.length) as MultiPolygon[];
  if (formas.length < 2) return null;
  const [primera, ...resto] = formas;
  const resultado = modo === 'unir' ? polygonClipping.union(primera, ...resto) : polygonClipping.difference(primera, ...resto);
  const limpio = resultado.map((pol) => pol.map((anillo) => anillo.slice(0, -1)).filter((a) => a.length >= 3)).filter((pol) => pol.length);
  if (!limpio.length) return null;
  const todos = limpio.flat(2);
  const xs = todos.map((p) => p[0]);
  const ys = todos.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const ancho = Math.max(1, x1 - x0);
  const alto = Math.max(1, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const redondo = (n: number) => Math.round(n * 10000) / 10000;
  const figuras = limpio.map((pol) => pol.map((anillo) => anillo.map(([x, y]) => ({ x: redondo((x - cx) / ancho), y: redondo((y - cy) / alto) }))));
  const base = defs[0];
  const { forma: _f, lados: _l, radioInterior: _r, radioEsquina: _e, inicioArco: _i, finArco: _a, grosor: _g, puntos: _p, cerrado: _c, voltear: _v, ...estilo } = base.sprite!;
  return {
    x: Math.round(cx * 100) / 100,
    y: Math.round(cy * 100) / 100,
    sprite: { ...estilo, forma: 'camino', figuras, ancho: Math.round(ancho * 100) / 100, alto: Math.round(alto * 100) / 100 },
    ...(defs.some((d) => d.colision) ? { colision: {} } : {}),
    ...(base.fisica ? { fisica: structuredClone(base.fisica) } : {}),
  };
}

/** El borde de cualquier forma como puntos de la pluma (para retocarla). El primer polígono, sin agujeros. */
export function caminoDeForma(s: DefSprite): PuntoCamino[] {
  if (s.forma === 'camino' && s.puntos?.length && !s.figuras?.length) return structuredClone(s.puntos);
  const ancho = s.ancho ?? 64;
  const alto = s.alto ?? 64;
  const f = figuraDe(datosDe(s));
  const borde = f.trazo?.puntos ?? f.anillos[0]?.[0] ?? [];
  // Muchos puntos (un círculo tiene 48): se quitan los que casi no cambian la forma
  return simplificar(borde, Math.max(ancho, alto) * 0.01).map((p) => ({ x: redondo4(p.x / ancho), y: redondo4(p.y / alto) }));
}
const redondo4 = (n: number) => Math.round(n * 10000) / 10000;

/** Quita los puntos que casi no cambian la forma (algoritmo de Ramer-Douglas-Peucker, en un polígono cerrado). */
export function simplificar(puntos: Punto[], tolerancia: number): Punto[] {
  if (puntos.length <= 4) return puntos;
  const rdp = (ps: Punto[]): Punto[] => {
    if (ps.length < 3) return ps;
    const a = ps[0];
    const b = ps[ps.length - 1];
    let peor = 0;
    let indice = 0;
    for (let i = 1; i < ps.length - 1; i++) {
      const d = distanciaALinea(ps[i], a, b);
      if (d > peor) {
        peor = d;
        indice = i;
      }
    }
    if (peor <= tolerancia) return [a, b];
    return [...rdp(ps.slice(0, indice + 1)).slice(0, -1), ...rdp(ps.slice(indice))];
  };
  // Se parte por el punto más lejano al primero, para que el cierre no se coma una esquina
  let lejos = 0;
  for (let i = 1; i < puntos.length; i++) if (Math.hypot(puntos[i].x - puntos[0].x, puntos[i].y - puntos[0].y) > Math.hypot(puntos[lejos].x - puntos[0].x, puntos[lejos].y - puntos[0].y)) lejos = i;
  const ida = rdp(puntos.slice(0, lejos + 1));
  const vuelta = rdp([...puntos.slice(lejos), puntos[0]]);
  const res = [...ida.slice(0, -1), ...vuelta.slice(0, -1)];
  return res.length >= 3 ? res : puntos;
}

function distanciaALinea(p: Punto, a: Punto, b: Punto): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy);
  if (l < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / l;
}

/**
 * Encaja un camino en su objeto: lo que ocupa pasa a ser el tamaño del
 * objeto y los puntos quedan de -0,5 a 0,5. Devuelve también cuánto se
 * mueve el centro (para dejar el dibujo en el mismo sitio de la escena).
 */
export function encajarCamino(puntos: PuntoCamino[], cerrado: boolean, ancho: number, alto: number): { puntos: PuntoCamino[]; ancho: number; alto: number; dx: number; dy: number } {
  const plano = aplanarCamino(puntos, cerrado);
  if (plano.length < 2) return { puntos, ancho, alto, dx: 0, dy: 0 };
  const xs = plano.map((p) => p.x);
  const ys = plano.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const sx = Math.max(1e-6, x1 - x0);
  const sy = Math.max(1e-6, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const n = (p: Punto): Punto => ({ x: redondo4((p.x - cx) / sx), y: redondo4((p.y - cy) / sy) });
  return {
    puntos: puntos.map((p) => ({ ...n(p), ...(p.entrada ? { entrada: n(p.entrada) } : {}), ...(p.salida ? { salida: n(p.salida) } : {}) })),
    ancho: Math.max(1, Math.round(ancho * sx)),
    alto: Math.max(1, Math.round(alto * sy)),
    dx: Math.round(cx * ancho),
    dy: Math.round(cy * alto),
  };
}

/**
 * Dibuja la forma de un objeto (con su relleno y su borde) en una imagen
 * PNG del mismo tamaño, al doble de resolución para que se vea nítida.
 * La sombra, el resplandor y la mezcla NO se meten en la imagen: se quedan
 * en el objeto (así no se salen de la imagen ni se pintan dos veces).
 */
export function formaAPNG(def: DefObjeto): string | null {
  const s = def.sprite;
  if (!s || s.forma === 'texto' || s.imagen) return null;
  const ancho = Math.max(1, Math.round(s.ancho ?? 64));
  const alto = Math.max(1, Math.round(s.alto ?? 64));
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho * 2;
  lienzo.height = alto * 2;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return null;
  ctx.scale(2, 2);
  // Un objeto suelto con solo su dibujo, en el centro de la imagen (el borde entra entero)
  const o = new ObjetoJuego('imagen', 'imagen');
  const sprite = o.agregar(new Sprite());
  const borde = s.borde ?? 0;
  const { sombra: _s, resplandor: _r, mezcla: _m, voltear: _v, imagen: _i, ...dibujo } = s;
  Object.assign(sprite, dibujo, { ancho: Math.max(1, ancho - borde), alto: Math.max(1, alto - borde), sombra: null, resplandor: null, mezcla: 'normal' });
  const r = Object.assign(Object.create(Renderizador.prototype) as Renderizador, { ctx });
  sprite.dibujarEn(r, ancho / 2, alto / 2);
  return lienzo.toDataURL('image/png');
}
