/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LUCES 2D: oscuridad, luz ambiente, luces de punto (una antorcha), focos
 * (una linterna) y sombras simples.
 *
 * Cómo se dibuja: si la escena tiene oscuridad, se pinta un «mapa de luz»
 * aparte, todo del color de la oscuridad, y cada luz BORRA la oscuridad en
 * un círculo (o en un cono, si es un foco) que se va difuminando hacia el
 * borde. Luego el mapa de luz se pone encima del mundo (la interfaz va
 * encima de todo y siempre se ve). Las luces de color, además, tiñen un poco
 * lo que iluminan.
 *
 * Sombras: si una luz tiene sombras, solo ilumina lo que «ve» desde donde
 * está. Se lanzan rayos hacia las esquinas de los objetos sólidos y de las
 * casillas sólidas cercanas y se forma el polígono de lo que se ve
 * («polígono de visibilidad»). Los objetos sólidos tapan la luz; los
 * fantasmas, no.
 */
import { Componente } from './Componente';
import type { Renderizador } from '../motor/Renderizador';
import { colorAComponentes, resolverColor } from '../motor/Color';
import type { Escena } from './Escena';
import type { ObjetoJuego } from './ObjetoJuego';
import { Colision, type Caja } from './componentes/Colision';
import { MapaCasillas } from './componentes/MapaCasillas';
import { Sprite } from './componentes/Sprite';
import { esCirculo } from './formas/sat';

export type TipoLuz = 'punto' | 'foco';

/** Una luz pegada a un objeto. */
export class Luz extends Componente {
  tipo: TipoLuz = 'punto';
  color = 'blanco';
  /** Hasta dónde llega (píxeles). */
  radio = 220;
  /** Lo fuerte que es, de 0 a 1 (más de 1 llega más lejos con fuerza). */
  intensidad = 1;
  /** Foco: lo abierto que es el cono, en grados. Mira hacia donde mira el objeto (su rotación). */
  angulo = 60;
  /** ¿Las cosas sólidas tapan esta luz? */
  sombras = false;
  /** Parpadeo (antorchas, fuego): de 0 (quieta) a 1 (tiembla mucho). */
  parpadeo = 0;
  /** Lo que tiembla ahora (cambia poco a poco). */
  private temblor = 0;
  private fase = Math.random() * 100;

  actualizar(dt: number): void {
    if (this.parpadeo <= 0) return;
    this.fase += dt * 9;
    // Ruido suave: la suma de dos senos de distinta velocidad
    this.temblor = (Math.sin(this.fase) * 0.6 + Math.sin(this.fase * 2.37 + 1.3) * 0.4) * this.parpadeo;
  }

  /** El radio de verdad en este fotograma (con el parpadeo). */
  get radioActual(): number {
    return Math.max(1, this.radio * (1 + this.temblor * 0.12) * Math.max(0.05, Math.min(2, this.intensidad)));
  }
}

interface Segmento {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** Como mucho, tantos tramos que tapan la luz por cada luz (más, el juego iría lento). */
const MAXIMO_SEGMENTOS = 600;

/** Los tramos (en el mundo) que tapan la luz cerca de un punto: bordes de objetos sólidos y de casillas sólidas. */
export function segmentosQueTapan(escena: Escena, cx: number, cy: number, radio: number, duena: ObjetoJuego): Segmento[] {
  return queTapa(escena, cx, cy, radio, duena).segmentos;
}

/**
 * Lo que tapa la luz: sus tramos (para las sombras) y sus cajas (lo que tapa
 * también se ilumina por su cara: si no, las paredes se verían negras).
 */
function queTapa(escena: Escena, cx: number, cy: number, radio: number, duena: ObjetoJuego): { segmentos: Segmento[]; cajas: Caja[] } {
  const cajas: Caja[] = [];
  const zona: Caja = { izquierda: cx - radio, derecha: cx + radio, abajo: cy - radio, arriba: cy + radio };
  const res: Segmento[] = [];
  const caja = (c: Caja) => {
    res.push({ ax: c.izquierda, ay: c.abajo, bx: c.derecha, by: c.abajo });
    res.push({ ax: c.derecha, ay: c.abajo, bx: c.derecha, by: c.arriba });
    res.push({ ax: c.derecha, ay: c.arriba, bx: c.izquierda, by: c.arriba });
    res.push({ ax: c.izquierda, ay: c.arriba, bx: c.izquierda, by: c.abajo });
  };
  for (const o of escena.objetos) {
    if (o === duena || o.destruido) continue;
    const mapa = o.obtener(MapaCasillas);
    if (mapa?.activo) {
      bordesDeMapa(mapa, zona, res, cajas);
      continue;
    }
    const col = o.obtener(Colision);
    if (!col?.activo || !col.solido || o.obtener(Sprite)?.fijo) continue;
    const k = col.caja();
    if (k.derecha < zona.izquierda || k.izquierda > zona.derecha || k.arriba < zona.abajo || k.abajo > zona.arriba) continue;
    // Si el que lleva la luz está dentro de algo (una antorcha en una pared), eso no tapa su luz
    if (cx > k.izquierda && cx < k.derecha && cy > k.abajo && cy < k.arriba) continue;
    if (col.usaFigura()) {
      for (const p of col.piezas()) {
        // Un círculo, como un polígono de 12 lados (para las sombras basta)
        const pts = esCirculo(p) ? Array.from({ length: 12 }, (_, i) => ({ x: p.x + Math.cos((i * Math.PI) / 6) * p.r, y: p.y + Math.sin((i * Math.PI) / 6) * p.r })) : p;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          res.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
        }
      }
    } else caja(k);
    cajas.push(k);
    if (res.length > MAXIMO_SEGMENTOS) break;
  }
  return { segmentos: res.slice(0, MAXIMO_SEGMENTOS), cajas };
}

/**
 * Los bordes de las casillas sólidas de un mapa que dan a una casilla vacía
 * (los de dentro de una pared no tapan nada), juntando los que van seguidos.
 */
function bordesDeMapa(mapa: MapaCasillas, zona: Caja, res: Segmento[], cajas: Caja[]): void {
  const solida = (c: number, f: number) => {
    const t = mapa.obtener(c, f);
    return t !== null && mapa.esSolida(t);
  };
  const casillas = mapa.casillasEn(zona).filter((c) => mapa.esSolida(c.tipo));
  const t = mapa.tamano;
  // Bordes horizontales (arriba y abajo) y verticales (izquierda y derecha), juntados en tramos largos
  const horizontales = new Map<string, number[]>();
  const verticales = new Map<string, number[]>();
  for (const c of casillas) {
    // Las casillas con algún lado al aire se iluminan por esa cara
    if (!solida(c.columna, c.fila + 1) || !solida(c.columna, c.fila - 1) || !solida(c.columna - 1, c.fila) || !solida(c.columna + 1, c.fila)) cajas.push(c.caja);
    if (!solida(c.columna, c.fila + 1)) (horizontales.get(`${c.fila + 1}`) ?? horizontales.set(`${c.fila + 1}`, []).get(`${c.fila + 1}`)!).push(c.columna);
    if (!solida(c.columna, c.fila - 1)) (horizontales.get(`${c.fila}`) ?? horizontales.set(`${c.fila}`, []).get(`${c.fila}`)!).push(c.columna);
    if (!solida(c.columna - 1, c.fila)) (verticales.get(`${c.columna}`) ?? verticales.set(`${c.columna}`, []).get(`${c.columna}`)!).push(c.fila);
    if (!solida(c.columna + 1, c.fila)) (verticales.get(`${c.columna + 1}`) ?? verticales.set(`${c.columna + 1}`, []).get(`${c.columna + 1}`)!).push(c.fila);
  }
  const origen = mapa.cajaDe(0, 0);
  const tramos = (lista: number[]) => {
    const orden = [...new Set(lista)].sort((a, b) => a - b);
    const r: [number, number][] = [];
    for (const n of orden) {
      const ultimo = r[r.length - 1];
      if (ultimo && ultimo[1] === n) ultimo[1] = n + 1;
      else r.push([n, n + 1]);
    }
    return r;
  };
  for (const [fila, columnas] of horizontales) {
    const y = origen.abajo + Number(fila) * t;
    for (const [c0, c1] of tramos(columnas)) res.push({ ax: origen.izquierda + c0 * t, ay: y, bx: origen.izquierda + c1 * t, by: y });
  }
  for (const [columna, filas] of verticales) {
    const x = origen.izquierda + Number(columna) * t;
    for (const [f0, f1] of tramos(filas)) res.push({ ax: x, ay: origen.abajo + f0 * t, bx: x, by: origen.abajo + f1 * t });
  }
}

/**
 * Polígono de visibilidad: lo que se ve desde (cx, cy) hasta `radio`, con
 * los tramos que tapan. Se lanzan rayos a cada esquina (y un poquito a cada
 * lado, para pasar rozando) y se ordenan los puntos donde chocan.
 */
export function visibilidad(cx: number, cy: number, radio: number, tapan: Segmento[]): { x: number; y: number }[] {
  // El borde: un cuadrado alrededor de la luz (así los rayos siempre chocan con algo)
  const r = radio + 2;
  const segmentos: Segmento[] = [
    ...tapan,
    { ax: cx - r, ay: cy - r, bx: cx + r, by: cy - r },
    { ax: cx + r, ay: cy - r, bx: cx + r, by: cy + r },
    { ax: cx + r, ay: cy + r, bx: cx - r, by: cy + r },
    { ax: cx - r, ay: cy + r, bx: cx - r, by: cy - r },
  ];
  const angulos: number[] = [];
  for (const s of segmentos) {
    for (const [x, y] of [[s.ax, s.ay], [s.bx, s.by]]) {
      const a = Math.atan2(y - cy, x - cx);
      angulos.push(a - 0.0001, a, a + 0.0001);
    }
  }
  const puntos: { x: number; y: number; a: number }[] = [];
  for (const a of angulos) {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let mejor = Infinity;
    for (const s of segmentos) {
      // Intersección del rayo (cx + dx t) con el tramo (a + (b - a) u)
      const sx = s.bx - s.ax;
      const sy = s.by - s.ay;
      const den = dx * sy - dy * sx;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((s.ax - cx) * sy - (s.ay - cy) * sx) / den;
      const u = ((s.ax - cx) * dy - (s.ay - cy) * dx) / den;
      if (t > 0 && u >= 0 && u <= 1 && t < mejor) mejor = t;
    }
    if (mejor < Infinity) puntos.push({ x: cx + dx * mejor, y: cy + dy * mejor, a });
  }
  puntos.sort((p, q) => p.a - q.a);
  return puntos;
}

/** Lienzo del mapa de luz (uno, reutilizado). */
let lienzoLuz: HTMLCanvasElement | null = null;

/**
 * Pone la oscuridad y las luces encima del mundo. `aLocal` pasa del mundo a
 * las coordenadas de dibujo de la cámara (ya con el zoom puesto en `ctx`).
 */
export function dibujarLuces(r: Renderizador, escena: Escena, oscuridad: number, ambiente: string): void {
  if (oscuridad <= 0) return;
  const ctx = r.ctx;
  // A la mitad de resolución: la luz es suave, no hace falta más (y es 4 veces más rápido)
  const ancho = Math.max(1, Math.ceil(r.ancho / 2));
  const alto = Math.max(1, Math.ceil(r.alto / 2));
  lienzoLuz ??= document.createElement('canvas');
  if (lienzoLuz.width !== ancho || lienzoLuz.height !== alto) {
    lienzoLuz.width = ancho;
    lienzoLuz.height = alto;
  }
  const l = lienzoLuz.getContext('2d');
  if (!l) return;
  const cam = escena.camara;
  const centro = cam.centroDibujo();
  const aPantalla = (x: number, y: number) => ({ x: (r.ancho / 2 + (x - centro.x) * cam.zoom) / 2, y: (r.alto / 2 - (y - centro.y) * cam.zoom) / 2 });
  const escalaRadio = cam.zoom / 2;

  l.setTransform(1, 0, 0, 1, 0, 0);
  l.globalCompositeOperation = 'source-over';
  l.clearRect(0, 0, ancho, alto);
  const [ar, ag, ab] = colorAComponentes(ambiente) ?? [0, 0, 0, 1];
  l.fillStyle = `rgba(${ar},${ag},${ab},${Math.min(1, oscuridad)})`;
  l.fillRect(0, 0, ancho, alto);

  const luces: { luz: Luz; o: ObjetoJuego; forma: { x: number; y: number }[] | null; cajas: Caja[] }[] = [];
  const visible = cam.zonaVisible();
  for (const o of escena.objetos) {
    const luz = o.obtener(Luz);
    if (!luz?.activo || o.destruido) continue;
    const p = o.transformacion.posicion;
    const rad = luz.radioActual;
    if (p.x + rad < visible.izquierda || p.x - rad > visible.derecha || p.y + rad < visible.abajo || p.y - rad > visible.arriba) continue;
    const tapa = luz.sombras ? queTapa(escena, p.x, p.y, rad, o) : null;
    luces.push({ luz, o, forma: tapa ? visibilidad(p.x, p.y, rad, tapa.segmentos) : null, cajas: tapa?.cajas ?? [] });
  }

  // Cada luz borra la oscuridad (más en el centro, nada en el borde)
  l.globalCompositeOperation = 'destination-out';
  for (const { luz, o, forma, cajas } of luces) {
    trazarLuz(l, luz, o, forma, aPantalla, escalaRadio, 'blanco');
    // Lo que tapa la luz se ve por su cara (un poco menos que lo de delante)
    for (const k of cajas) trazarLuz(l, luz, o, cajaComoForma(k), aPantalla, escalaRadio, 'blanco', 0.8);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lienzoLuz, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  // Las luces de color tiñen un poco lo que iluminan
  const deColor = luces.filter(({ luz }) => resolverColor(luz.color) !== '#ffffff');
  if (deColor.length) {
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, ancho, alto);
    l.globalCompositeOperation = 'lighter';
    for (const { luz, o, forma } of deColor) trazarLuz(l, luz, o, forma, aPantalla, escalaRadio, luz.color);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35;
    ctx.drawImage(lienzoLuz, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
}

const cajaComoForma = (k: Caja) => [{ x: k.izquierda, y: k.abajo }, { x: k.derecha, y: k.abajo }, { x: k.derecha, y: k.arriba }, { x: k.izquierda, y: k.arriba }];

/** Dibuja una luz (degradado redondo, recortado al cono si es un foco y a lo que se ve si tiene sombras). */
function trazarLuz(
  l: CanvasRenderingContext2D,
  luz: Luz,
  o: ObjetoJuego,
  forma: { x: number; y: number }[] | null,
  aPantalla: (x: number, y: number) => { x: number; y: number },
  escalaRadio: number,
  color: string,
  cuanto = 1,
): void {
  const p = o.transformacion.posicion;
  const c = aPantalla(p.x, p.y);
  const radio = luz.radioActual * escalaRadio;
  l.save();
  l.beginPath();
  if (forma && forma.length > 2) {
    forma.forEach((q, i) => {
      const s = aPantalla(q.x, q.y);
      if (i === 0) l.moveTo(s.x, s.y);
      else l.lineTo(s.x, s.y);
    });
    l.closePath();
    l.clip();
    l.beginPath();
  }
  if (luz.tipo === 'foco') {
    // El cono mira hacia donde mira el objeto (en la pantalla la Y va hacia abajo: el ángulo cambia de signo)
    const mira = (-o.transformacion.rotacion * Math.PI) / 180;
    const medio = (Math.max(1, Math.min(360, luz.angulo)) * Math.PI) / 360;
    l.moveTo(c.x, c.y);
    l.arc(c.x, c.y, radio, mira - medio, mira + medio);
    l.closePath();
  } else l.arc(c.x, c.y, radio, 0, Math.PI * 2);
  const g = l.createRadialGradient(c.x, c.y, 0, c.x, c.y, radio);
  const [cr, cg, cb] = colorAComponentes(color) ?? [255, 255, 255, 1];
  const fuerza = Math.min(1, luz.intensidad) * cuanto;
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${fuerza})`);
  g.addColorStop(0.45, `rgba(${cr},${cg},${cb},${fuerza * 0.75})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  l.fillStyle = g;
  l.fill();
  l.restore();
}
