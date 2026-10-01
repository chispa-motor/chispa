/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * FIGURAS: de una forma ("estrella", "corazon", un camino dibujado con la
 * pluma...) a sus puntos.
 *
 * Una figura se calcula UNA vez para cada tamaño y se guarda (cache): el
 * dibujo y la colisión usan los MISMOS puntos, así lo que ves es lo que choca.
 *
 *   - anillos: lo que se rellena. Cada polígono es [borde de fuera, agujeros...].
 *   - trazo: un camino abierto (una línea gruesa que no se rellena).
 *   - piezas: la figura partida en trozos CONVEXOS (sin entrantes), que es lo
 *     que sabe hacer chocar el sistema físico (ver sat.ts).
 *
 * Coordenadas: en píxeles, con el centro del objeto en (0, 0) y la Y hacia
 * ARRIBA (como en el mundo). Los caminos de la pluma se guardan en unidades
 * del tamaño (de -0,5 a 0,5): así, si cambias el ancho, el dibujo se estira.
 */
import earcut from 'earcut';

export interface Punto {
  x: number;
  y: number;
}
export type Poligono = Punto[];

/** Un punto de un camino de la pluma, con sus tiradores de curva (si es curva). */
export interface PuntoCamino extends Punto {
  /** Tirador de la curva que LLEGA al punto (unidades del tamaño, como x e y). */
  entrada?: Punto;
  /** Tirador de la curva que SALE del punto. */
  salida?: Punto;
}

export const FORMAS = [
  'rectangulo', 'circulo', 'texto', 'triangulo', 'elipse', 'poligono', 'estrella', 'rombo',
  'corazon', 'flecha', 'linea', 'capsula', 'redondeado', 'anillo', 'arco', 'camino',
] as const;
export type Forma = (typeof FORMAS)[number];

/** Las formas que se pueden dibujar (todas menos el texto), con su nombre para el editor. */
export const FORMAS_DIBUJO: { forma: Forma; texto: string }[] = [
  { forma: 'rectangulo', texto: 'Rectángulo' },
  { forma: 'circulo', texto: 'Círculo' },
  { forma: 'triangulo', texto: 'Triángulo' },
  { forma: 'elipse', texto: 'Elipse' },
  { forma: 'poligono', texto: 'Polígono' },
  { forma: 'estrella', texto: 'Estrella' },
  { forma: 'rombo', texto: 'Rombo' },
  { forma: 'corazon', texto: 'Corazón' },
  { forma: 'flecha', texto: 'Flecha' },
  { forma: 'linea', texto: 'Línea' },
  { forma: 'capsula', texto: 'Cápsula' },
  { forma: 'redondeado', texto: 'Rectángulo redondeado' },
  { forma: 'anillo', texto: 'Anillo' },
  { forma: 'arco', texto: 'Arco' },
  { forma: 'camino', texto: 'Camino libre' },
];

/** Lo que hace falta para calcular una figura. Lo que no se dice tiene un valor por defecto. */
export interface DatosFigura {
  forma: Forma;
  ancho: number;
  alto: number;
  /** Polígono: número de lados (6). Estrella: número de puntas (5). */
  lados?: number;
  /** Estrella, anillo y arco: lo grande que es el hueco de dentro, de 0 a 1 (0,5 / 0,6 / 0,6). */
  radioInterior?: number;
  /** Rectángulo redondeado: radio de las esquinas en píxeles (un 20 % del lado corto). */
  radioEsquina?: number;
  /** Arco: de qué ángulo a qué ángulo, en grados (0 = derecha, 90 = arriba). 0 → 180. */
  inicioArco?: number;
  finArco?: number;
  /** Línea y camino abierto: grosor en píxeles (6). */
  grosor?: number;
  /** Camino: sus puntos (unidades del tamaño). */
  puntos?: PuntoCamino[];
  /** Camino: ¿se cierra (se rellena) o es una línea? (cerrado por defecto). */
  cerrado?: boolean;
  /**
   * Camino hecho al unir o restar formas: polígonos con agujeros, en unidades
   * del tamaño ([borde, agujero, agujero...], [otro trozo...]).
   */
  figuras?: Punto[][][];
}

export interface Figura {
  anillos: Poligono[][];
  trazo: { puntos: Punto[]; grosor: number } | null;
  piezas: Poligono[];
}

/** Valores por defecto de cada dato de las formas (los mismos en el motor, el editor y la ayuda). */
export const POR_DEFECTO = { lados: 6, puntas: 5, radioInteriorEstrella: 0.5, radioInteriorAnillo: 0.6, desde: 0, hasta: 180, grosor: 6 } as const;
/** Límites para que nadie pida una estrella de un millón de puntas (se congelaría el navegador). */
export const MAX_LADOS = 64;
export const MAX_PUNTOS_CAMINO = 400;

const SEGMENTOS_ELIPSE = 48;
const SEGMENTOS_CURVA = 12;

// ───────────────────────── La figura de cada forma ─────────────────────────

const cache = new Map<string, Figura>();

/** La figura de una forma con ese tamaño (se calcula una vez y se guarda). */
export function figuraDe(d: DatosFigura): Figura {
  const clave = claveDe(d);
  let f = cache.get(clave);
  if (!f) {
    f = calcular(d);
    if (cache.size > 2000) cache.clear(); // por si un juego cambia el tamaño en cada fotograma
    cache.set(clave, f);
  }
  return f;
}

function claveDe(d: DatosFigura): string {
  const caminos = d.forma === 'camino' ? JSON.stringify([d.puntos ?? null, d.figuras ?? null, d.cerrado ?? true]) : '';
  return `${d.forma}|${r2(d.ancho)}|${r2(d.alto)}|${d.lados ?? ''}|${d.radioInterior ?? ''}|${d.radioEsquina ?? ''}|${d.inicioArco ?? ''}|${d.finArco ?? ''}|${d.grosor ?? ''}|${caminos}`;
}
const r2 = (n: number) => Math.round(n * 100) / 100;

function calcular(d: DatosFigura): Figura {
  const w = Math.max(0.01, d.ancho);
  const h = Math.max(0.01, d.alto);
  const convexa = (p: Poligono): Figura => ({ anillos: [[p]], trazo: null, piezas: [p] });
  const concava = (p: Poligono): Figura => ({ anillos: [[p]], trazo: null, piezas: trocear([p]) });
  switch (d.forma) {
    case 'circulo':
    case 'elipse':
      return convexa(elipse(w / 2, h / 2, 0, 360, SEGMENTOS_ELIPSE));
    case 'triangulo':
      return convexa([{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: 0, y: h / 2 }]);
    case 'rombo':
      return convexa([{ x: 0, y: h / 2 }, { x: -w / 2, y: 0 }, { x: 0, y: -h / 2 }, { x: w / 2, y: 0 }]);
    case 'poligono': {
      const n = entero(d.lados ?? POR_DEFECTO.lados, 3, MAX_LADOS);
      return convexa(Array.from({ length: n }, (_, i) => enElipse(w / 2, h / 2, 90 + (360 * i) / n)));
    }
    case 'estrella': {
      const n = entero(d.lados ?? POR_DEFECTO.puntas, 3, MAX_LADOS);
      const ri = limitar(d.radioInterior ?? POR_DEFECTO.radioInteriorEstrella, 0.05, 1);
      const puntos = Array.from({ length: n * 2 }, (_, i) => {
        const r = i % 2 === 0 ? 1 : ri;
        return enElipse((w / 2) * r, (h / 2) * r, 90 + (180 * i) / n);
      });
      return concava(puntos);
    }
    case 'corazon':
      return concava(corazon(w, h));
    case 'flecha':
      return concava([
        { x: -w / 2, y: -h * 0.18 }, { x: w * 0.1, y: -h * 0.18 }, { x: w * 0.1, y: -h / 2 },
        { x: w / 2, y: 0 },
        { x: w * 0.1, y: h / 2 }, { x: w * 0.1, y: h * 0.18 }, { x: -w / 2, y: h * 0.18 },
      ]);
    case 'linea': {
      // De la esquina de abajo a la izquierda a la de arriba a la derecha (gíralo o voltéalo para otras)
      const p = segmentoGrueso({ x: -w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, Math.max(1, d.grosor ?? POR_DEFECTO.grosor));
      return convexa(p);
    }
    case 'capsula':
      return convexa(redondeado(w, h, Math.min(w, h) / 2));
    case 'redondeado':
      return convexa(redondeado(w, h, limitar(d.radioEsquina ?? Math.min(w, h) * 0.2, 0, Math.min(w, h) / 2)));
    case 'anillo':
      return anillo(w, h, limitar(d.radioInterior ?? POR_DEFECTO.radioInteriorAnillo, 0.05, 0.98), 0, 360);
    case 'arco':
      return anillo(w, h, limitar(d.radioInterior ?? POR_DEFECTO.radioInteriorAnillo, 0, 0.98), d.inicioArco ?? POR_DEFECTO.desde, d.finArco ?? POR_DEFECTO.hasta);
    case 'camino':
      return camino(d, w, h);
    default:
      // rectángulo (y texto: su caja)
      return convexa([{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }]);
  }
}

const entero = (n: number, min: number, max: number) => Math.round(limitar(Number.isFinite(n) ? n : min, min, max));
const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

function enElipse(rx: number, ry: number, grados: number): Punto {
  const a = (grados * Math.PI) / 180;
  return { x: Math.cos(a) * rx, y: Math.sin(a) * ry };
}

function elipse(rx: number, ry: number, desde: number, hasta: number, segmentos: number): Poligono {
  const completa = Math.abs(hasta - desde) >= 360;
  const n = completa ? segmentos : Math.max(2, Math.ceil((segmentos * Math.abs(hasta - desde)) / 360));
  const total = completa ? n : n + 1;
  return Array.from({ length: total }, (_, i) => enElipse(rx, ry, desde + ((hasta - desde) * i) / n));
}

function corazon(w: number, h: number): Poligono {
  // La curva clásica del corazón, encajada en el ancho y el alto
  const crudos = Array.from({ length: 56 }, (_, i) => {
    const t = (Math.PI * 2 * i) / 56;
    return { x: 16 * Math.sin(t) ** 3, y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) };
  });
  return encajar(crudos, w, h);
}

/** Estira unos puntos para que ocupen justo w × h, centrados. */
function encajar(puntos: Poligono, w: number, h: number): Poligono {
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return puntos.map((p) => ({ x: ((p.x - x0) / (x1 - x0 || 1) - 0.5) * w, y: ((p.y - y0) / (y1 - y0 || 1) - 0.5) * h }));
}

function redondeado(w: number, h: number, r: number): Poligono {
  if (r <= 0.5) return [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }];
  const esquinas = [
    { cx: w / 2 - r, cy: -h / 2 + r, desde: -90 },
    { cx: w / 2 - r, cy: h / 2 - r, desde: 0 },
    { cx: -w / 2 + r, cy: h / 2 - r, desde: 90 },
    { cx: -w / 2 + r, cy: -h / 2 + r, desde: 180 },
  ];
  const res: Poligono = [];
  for (const e of esquinas) {
    for (let i = 0; i <= 8; i++) {
      const p = enElipse(r, r, e.desde + (90 * i) / 8);
      const q = { x: e.cx + p.x, y: e.cy + p.y };
      const ultimo = res[res.length - 1];
      if (!ultimo || Math.hypot(ultimo.x - q.x, ultimo.y - q.y) > 0.01) res.push(q);
    }
  }
  return res;
}

/** Un anillo (o un trozo de él: un arco): el borde de fuera y el de dentro. Se trocea en cuadriláteros. */
function anillo(w: number, h: number, ri: number, desde: number, hasta: number): Figura {
  if (hasta < desde) [desde, hasta] = [hasta, desde];
  const completo = hasta - desde >= 360;
  const fuera = elipse(w / 2, h / 2, desde, completo ? desde + 360 : hasta, SEGMENTOS_ELIPSE);
  const dentro = elipse((w / 2) * ri, (h / 2) * ri, desde, completo ? desde + 360 : hasta, SEGMENTOS_ELIPSE);
  const piezas: Poligono[] = [];
  const n = completo ? fuera.length : fuera.length - 1;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % fuera.length;
    piezas.push(ri > 0.001 ? [dentro[i], fuera[i], fuera[j], dentro[j]] : [{ x: 0, y: 0 }, fuera[i], fuera[j]]);
  }
  const anillos = completo ? [[fuera, [...dentro].reverse()]] : [[[...fuera, ...[...dentro].reverse()]]];
  return { anillos, trazo: null, piezas };
}

function segmentoGrueso(a: Punto, b: Punto, grosor: number): Poligono {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * (grosor / 2);
  const ny = (dx / l) * (grosor / 2);
  return [{ x: a.x - nx, y: a.y - ny }, { x: b.x - nx, y: b.y - ny }, { x: b.x + nx, y: b.y + ny }, { x: a.x + nx, y: a.y + ny }];
}

// ───────────────────────── Caminos (pluma, unir, restar) ─────────────────────────

/** Los puntos de un camino de la pluma, con sus curvas convertidas en tramitos rectos (unidades del tamaño). */
export function aplanarCamino(puntos: PuntoCamino[], cerrado: boolean): Punto[] {
  const res: Punto[] = [];
  const n = puntos.length;
  if (n === 0) return res;
  const tramos = cerrado ? n : n - 1;
  res.push({ x: puntos[0].x, y: puntos[0].y });
  for (let i = 0; i < tramos; i++) {
    const a = puntos[i];
    const b = puntos[(i + 1) % n];
    if (a.salida || b.entrada) {
      const c1 = a.salida ?? a;
      const c2 = b.entrada ?? b;
      for (let k = 1; k <= SEGMENTOS_CURVA; k++) res.push(bezier(a, c1, c2, b, k / SEGMENTOS_CURVA));
    } else res.push({ x: b.x, y: b.y });
  }
  if (cerrado && res.length > 1) res.pop(); // el último es el primero otra vez
  return res;
}

function bezier(a: Punto, c1: Punto, c2: Punto, b: Punto, t: number): Punto {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
}

function camino(d: DatosFigura, w: number, h: number): Figura {
  const escalar = (p: Punto): Punto => ({ x: p.x * w, y: p.y * h });
  if (d.figuras?.length) {
    const anillos = d.figuras.map((pol) => pol.map((anillo) => anillo.map(escalar))).filter((pol) => pol.length && pol[0].length >= 3);
    return { anillos, trazo: null, piezas: anillos.flatMap(trocear) };
  }
  const puntos = (d.puntos ?? []).slice(0, MAX_PUNTOS_CAMINO);
  const cerrado = d.cerrado ?? true;
  const plano = aplanarCamino(puntos, cerrado).map(escalar);
  if (cerrado && plano.length >= 3) return { anillos: [[plano]], trazo: null, piezas: trocear([plano]) };
  // Abierto (o con menos de 3 puntos): una línea gruesa
  const grosor = Math.max(1, d.grosor ?? POR_DEFECTO.grosor);
  const piezas: Poligono[] = [];
  for (let i = 0; i + 1 < plano.length; i++) piezas.push(segmentoGrueso(plano[i], plano[i + 1], grosor));
  return { anillos: [], trazo: { puntos: plano, grosor }, piezas };
}

// ───────────────────────── Trocear en piezas convexas ─────────────────────────

/**
 * Parte un polígono (con agujeros) en trozos convexos: primero en triángulos
 * (earcut) y luego junta los triángulos vecinos mientras el resultado siga
 * siendo convexo. Así un corazón son unas pocas piezas y no cincuenta.
 */
export function trocear(poligono: Poligono[]): Poligono[] {
  const planos: number[] = [];
  const agujeros: number[] = [];
  const todos: Punto[] = [];
  poligono.forEach((anillo, i) => {
    if (i > 0) agujeros.push(todos.length);
    for (const p of anillo) {
      planos.push(p.x, p.y);
      todos.push(p);
    }
  });
  const indices = earcut(planos, agujeros.length ? agujeros : undefined);
  let piezas: number[][] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const t = [indices[i], indices[i + 1], indices[i + 2]];
    if (Math.abs(areaConSigno(t.map((k) => todos[k]))) > 1e-6) piezas.push(t);
  }
  piezas = juntarConvexas(piezas, todos);
  return piezas.map((pz) => {
    const pol = pz.map((k) => todos[k]);
    return areaConSigno(pol) < 0 ? pol.reverse() : pol;
  });
}

/** Junta trozos vecinos (que comparten un lado) si al juntarlos sigue siendo convexo. */
function juntarConvexas(piezas: number[][], puntos: Punto[]): number[][] {
  let cambiado = true;
  while (cambiado) {
    cambiado = false;
    busqueda: for (let i = 0; i < piezas.length; i++) {
      for (let j = i + 1; j < piezas.length; j++) {
        const unida = unirPorLado(piezas[i], piezas[j]);
        if (unida && esConvexa(unida.map((k) => puntos[k]))) {
          piezas[i] = unida;
          piezas.splice(j, 1);
          cambiado = true;
          break busqueda;
        }
      }
    }
  }
  return piezas;
}

/** Si dos trozos comparten un lado (a→b en uno, b→a en el otro), el trozo unido. */
function unirPorLado(p: number[], q: number[]): number[] | null {
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    for (let j = 0; j < q.length; j++) {
      if (q[j] === b && q[(j + 1) % q.length] === a) {
        // p: ... a b ...  y  q: ... b a ...  →  p hasta a, luego q desde después de a hasta antes de b, luego b...
        const res: number[] = [];
        for (let k = 0; k < p.length; k++) {
          const idx = (i + 1 + k) % p.length; // empieza en b
          res.push(p[idx]);
          if (idx === i) break; // hasta a
        }
        // ahora res = [b, ..., a]; añadimos los de q entre a y b (sin repetirlos)
        for (let k = 2; k < q.length; k++) res.push(q[(j + k) % q.length]);
        return res;
      }
    }
  }
  return null;
}

export function areaConSigno(p: Poligono): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const s = p[i];
    const t = p[(i + 1) % p.length];
    a += s.x * t.y - t.x * s.y;
  }
  return a / 2;
}

export function esConvexa(p: Poligono): boolean {
  let signo = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    const c = p[(i + 2) % p.length];
    const cruz = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cruz) < 1e-9) continue;
    const s = Math.sign(cruz);
    if (signo === 0) signo = s;
    else if (s !== signo) return false;
  }
  return true;
}

// ───────────────────────── De lo local al mundo ─────────────────────────

/** Gira (grados, contra las agujas del reloj), voltea y mueve unos puntos. */
export function aMundo(p: Poligono, x: number, y: number, rotacion: number, voltearX = false, voltearY = false): Poligono {
  const a = (rotacion * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const fx = voltearX ? -1 : 1;
  const fy = voltearY ? -1 : 1;
  return p.map((q) => {
    const px = q.x * fx;
    const py = q.y * fy;
    return { x: x + px * c - py * s, y: y + px * s + py * c };
  });
}

/** Lo contrario de aMundo: un punto del mundo, visto desde el centro de la figura (sin girar ni voltear). */
export function aLocal(p: Punto, x: number, y: number, rotacion: number, voltearX = false, voltearY = false): Punto {
  const a = (-rotacion * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = p.x - x;
  const dy = p.y - y;
  return { x: (dx * c - dy * s) * (voltearX ? -1 : 1), y: (dx * s + dy * c) * (voltearY ? -1 : 1) };
}

/** ¿Está el punto dentro de la figura (con sus agujeros)? Coordenadas locales. */
export function puntoEnFigura(f: Figura, p: Punto): boolean {
  if (f.trazo) {
    const g = f.trazo.grosor / 2;
    for (let i = 0; i + 1 < f.trazo.puntos.length; i++) if (distanciaASegmento(p, f.trazo.puntos[i], f.trazo.puntos[i + 1]) <= g) return true;
  }
  return f.anillos.some((pol) => pol.reduce((dentro, anillo) => (puntoEnPoligono(anillo, p) ? !dentro : dentro), false));
}

export function puntoEnPoligono(pol: Poligono, p: Punto): boolean {
  let dentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const a = pol[i];
    const b = pol[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

function distanciaASegmento(p: Punto, a: Punto, b: Punto): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
