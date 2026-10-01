/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * ESTILO: cómo se pinta una forma por dentro y por fuera.
 *
 *   - relleno: un color, un degradado (lineal o redondo), un patrón (rayas,
 *     puntos...) o una imagen repetida;
 *   - borde: grosor, color y si es discontinuo;
 *   - sombra (desplazada y borrosa) y resplandor (brillo alrededor);
 *   - modo de mezcla: cómo se junta con lo que hay debajo (sumar luz,
 *     multiplicar...).
 *
 * Lo usan el Sprite (los objetos) y el editor (las vistas previas). Todo se
 * dibuja con el lienzo (Canvas 2D) del navegador.
 */
import { colorAComponentes, componentesAColor, resolverColor } from './Color';
import { normalizar } from '../utilidades/texto';

export const TIPOS_RELLENO = ['color', 'degradado', 'radial', 'patron', 'imagen'] as const;
export type TipoRelleno = (typeof TIPOS_RELLENO)[number];

export const PATRONES = ['rayas', 'puntos', 'cuadros', 'rombos', 'ondas', 'ladrillos'] as const;
export type Patron = (typeof PATRONES)[number];

/** Modos de mezcla: el nombre en Chispa y el del lienzo del navegador. */
export const MEZCLAS = {
  normal: 'source-over',
  sumar: 'lighter',
  multiplicar: 'multiply',
  pantalla: 'screen',
  superponer: 'overlay',
  oscurecer: 'darken',
  aclarar: 'lighten',
  diferencia: 'difference',
} as const satisfies Record<string, GlobalCompositeOperation>;
export type Mezcla = keyof typeof MEZCLAS;
export const NOMBRES_MEZCLAS = Object.keys(MEZCLAS) as Mezcla[];

/** Todo lo que hace falta para pintar una forma (con los valores por defecto ya puestos). */
export interface Estilo {
  color: string;
  relleno: TipoRelleno;
  color2: string;
  /** Degradado lineal: hacia dónde va, en grados (0 = de izquierda a derecha, 90 = de abajo arriba). */
  anguloDegradado: number;
  patron: Patron;
  /** Relleno con imagen: la imagen ya cargada. */
  imagenRelleno: CanvasImageSource | null;
  borde: number;
  colorBorde: string;
  bordeDiscontinuo: boolean;
  sombra: string | null;
  sombraX: number;
  sombraY: number;
  desenfoqueSombra: number;
  resplandor: string | null;
  tamanoResplandor: number;
  mezcla: Mezcla;
}

export const ESTILO_POR_DEFECTO: Estilo = {
  color: 'blanco',
  relleno: 'color',
  color2: 'negro',
  anguloDegradado: 90,
  patron: 'rayas',
  imagenRelleno: null,
  borde: 0,
  colorBorde: 'negro',
  bordeDiscontinuo: false,
  sombra: null,
  sombraX: 6,
  sombraY: -6,
  desenfoqueSombra: 8,
  resplandor: null,
  tamanoResplandor: 16,
  mezcla: 'normal',
};

/** ¿Es un estilo sencillo (solo un color)? Entonces se dibuja por el camino rápido de siempre. */
export function esSencillo(e: Pick<Estilo, 'relleno' | 'borde' | 'sombra' | 'resplandor' | 'mezcla'>): boolean {
  return e.relleno === 'color' && e.borde <= 0 && !e.sombra && !e.resplandor && e.mezcla === 'normal';
}

// ───────────────────────── Paletas ─────────────────────────

/**
 * PALETAS LISTAS: grupos de colores que quedan bien juntos. Los colores son
 * propios de Chispa (elegidos a mano), no copiados de ninguna paleta famosa.
 */
export const PALETAS: Record<string, string[]> = {
  pastel: ['#ffb3ba', '#ffd8b1', '#fff3b0', '#c9f2c7', '#b5ead7', '#bde0fe', '#cdb4f6', '#f8c8dc'],
  retro: ['#20152e', '#4b2a4f', '#a8414f', '#e8774a', '#f7c873', '#9bd46a', '#3c9c6b', '#2f5f7a'],
  neon: ['#ff2e88', '#ff9f1c', '#f9f871', '#2bff88', '#00e5ff', '#4d7cff', '#b14dff', '#ffffff'],
  natural: ['#3f5a2a', '#6f8f3a', '#a7c06a', '#e3d6a4', '#b8875a', '#7a5233', '#5d7f8f', '#cfe3e8'],
  oceano: ['#03254c', '#1167b1', '#187bcd', '#2a9df4', '#7ad3f7', '#d0efff', '#f4e4c1', '#2bb3a3'],
  fuego: ['#2b0a0a', '#7a1414', '#c62d1f', '#f05a1a', '#ff9a1f', '#ffd23c', '#fff1a8', '#4a3c3c'],
  bosque: ['#14281d', '#2d4a32', '#4f7942', '#86a873', '#c2d6a4', '#6b4f3a', '#a67b5b', '#e9e4d0'],
  caramelo: ['#ff6fa8', '#ffa6c9', '#ffd1e3', '#9ee6ff', '#b8f2c4', '#fff4a3', '#c7a6ff', '#ffffff'],
  grises: ['#000000', '#1f1f1f', '#3d3d3d', '#5e5e5e', '#828282', '#a8a8a8', '#d1d1d1', '#ffffff'],
  arcoiris: ['#e63946', '#f4a261', '#f9e04b', '#52b788', '#3a86ff', '#5e3cc4', '#9d4edd', '#ff70a6'],
};
export const NOMBRES_PALETAS = Object.keys(PALETAS);

// ───────────────────────── Colores ─────────────────────────

/** Mezcla dos colores: cuanto = 0 da el primero, 1 el segundo. null si alguno no se puede leer. */
export function mezclarColores(a: string, b: string, cuanto: number): string | null {
  const ca = colorAComponentes(a);
  const cb = colorAComponentes(b);
  if (!ca || !cb) return null;
  const t = Math.min(1, Math.max(0, cuanto));
  return componentesAColor([0, 1, 2, 3].map((i) => ca[i] + (cb[i] - ca[i]) * t) as [number, number, number, number]);
}

/** De #rrggbb a tono (0-360), saturación (0-1) y brillo (0-1). */
export function aHSV(color: string): { h: number; s: number; v: number; a: number } {
  const c = colorAComponentes(color) ?? [255, 255, 255, 1];
  const [r, g, b] = [c[0] / 255, c[1] / 255, c[2] / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max, a: c[3] };
}

/** De tono, saturación y brillo a #rrggbb. */
export function desdeHSV(h: number, s: number, v: number, a = 1): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return componentesAColor([(r + m) * 255, (g + m) * 255, (b + m) * 255, a]);
}

// ───────────────────────── Pintar ─────────────────────────

const patrones = new Map<string, CanvasPattern | null>();

/** Un patrón de 16 × 16 píxeles que se repite (se crea una vez por cada combinación de colores). */
function patronDe(ctx: CanvasRenderingContext2D, patron: Patron, fondo: string, dibujo: string): CanvasPattern | string {
  const clave = `${patron}|${fondo}|${dibujo}`;
  if (!patrones.has(clave)) {
    if (patrones.size > 200) patrones.clear();
    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = 16;
    const c = lienzo.getContext('2d');
    if (!c) patrones.set(clave, null);
    else {
      c.fillStyle = resolverColor(fondo);
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = c.strokeStyle = resolverColor(dibujo);
      c.lineWidth = 3;
      switch (patron) {
        case 'puntos':
          c.beginPath();
          c.arc(8, 8, 3.5, 0, Math.PI * 2);
          c.fill();
          break;
        case 'cuadros':
          c.fillRect(0, 0, 8, 8);
          c.fillRect(8, 8, 8, 8);
          break;
        case 'rombos':
          c.beginPath();
          c.moveTo(8, 1);
          c.lineTo(15, 8);
          c.lineTo(8, 15);
          c.lineTo(1, 8);
          c.closePath();
          c.fill();
          break;
        case 'ondas':
          c.beginPath();
          c.moveTo(0, 8);
          c.bezierCurveTo(4, 2, 4, 2, 8, 8);
          c.bezierCurveTo(12, 14, 12, 14, 16, 8);
          c.stroke();
          break;
        case 'ladrillos':
          c.lineWidth = 1.5;
          c.beginPath();
          c.moveTo(0, 0.75);
          c.lineTo(16, 0.75);
          c.moveTo(0, 8.75);
          c.lineTo(16, 8.75);
          c.moveTo(4, 0);
          c.lineTo(4, 8);
          c.moveTo(12, 8);
          c.lineTo(12, 16);
          c.stroke();
          break;
        default: // rayas en diagonal
          c.beginPath();
          for (const d of [-16, 0, 16]) {
            c.moveTo(d, 16);
            c.lineTo(d + 16, 0);
          }
          c.stroke();
      }
      patrones.set(clave, ctx.createPattern(lienzo, 'repeat'));
    }
  }
  return patrones.get(clave) ?? resolverColor(fondo);
}

/** Con qué se rellena: un color, un degradado o un patrón (en coordenadas de la forma: centro en 0, 0 y la Y hacia arriba). */
export function pinturaDe(ctx: CanvasRenderingContext2D, e: Estilo, ancho: number, alto: number): string | CanvasGradient | CanvasPattern {
  const c1 = resolverColor(e.color);
  switch (e.relleno) {
    case 'degradado': {
      const a = (e.anguloDegradado * Math.PI) / 180;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const largo = (Math.abs(dx) * ancho + Math.abs(dy) * alto) / 2;
      const g = ctx.createLinearGradient(-dx * largo, -dy * largo, dx * largo, dy * largo);
      g.addColorStop(0, c1);
      g.addColorStop(1, resolverColor(e.color2));
      return g;
    }
    case 'radial': {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(ancho, alto) / 2);
      g.addColorStop(0, c1);
      g.addColorStop(1, resolverColor(e.color2));
      return g;
    }
    case 'patron':
      return patronDe(ctx, e.patron, e.color, e.color2);
    case 'imagen': {
      if (!e.imagenRelleno) return c1;
      const p = ctx.createPattern(e.imagenRelleno, 'repeat');
      if (!p) return c1;
      // La forma se dibuja con la Y hacia arriba: la imagen se da la vuelta para verse derecha
      p.setTransform?.(new DOMMatrix().scale(1, -1));
      return p;
    }
    default:
      return c1;
  }
}

/**
 * Pinta una forma con todo su estilo. `trazar` hace el camino de la forma
 * (en coordenadas de la forma). El lienzo ya tiene puesto el sitio, el giro
 * y el volteo de la forma.
 *
 * DECISIÓN: la sombra y el resplandor se pintan SOLO como sombra (la forma se
 * dibuja muy lejos, fuera del lienzo, y su sombra se trae de vuelta). Así, con
 * una forma medio transparente, la sombra no se ve a través de ella dos veces.
 */
export function pintarConEstilo(
  ctx: CanvasRenderingContext2D,
  e: Estilo,
  ancho: number,
  alto: number,
  trazar: () => void,
  opciones: { linea?: number; imagen?: (ctx: CanvasRenderingContext2D) => void } = {},
): void {
  const linea = opciones.linea ?? null;
  ctx.save();
  ctx.globalCompositeOperation = MEZCLAS[e.mezcla] ?? 'source-over';
  const pintura = pinturaDe(ctx, e, ancho, alto);
  const m = ctx.getTransform();
  // Cuánto mide un píxel de la forma en el lienzo (las sombras no se giran ni se escalan solas)
  const escala = Math.hypot(m.a, m.b) || 1;
  const lejos = (ctx.canvas?.width ?? 2000) + 2000;
  const soloSombra = (color: string, dx: number, dy: number, borroso: number) => {
    ctx.save();
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e + lejos, m.f);
    ctx.shadowColor = resolverColor(color);
    ctx.shadowBlur = borroso * escala;
    ctx.shadowOffsetX = -lejos + dx * escala;
    ctx.shadowOffsetY = -dy * escala; // en el mundo la Y va hacia arriba; en el lienzo, hacia abajo
    pintarCuerpo('negro');
    ctx.restore();
  };
  const pintarCuerpo = (relleno: string | CanvasGradient | CanvasPattern) => {
    // Una imagen: su sombra sigue su dibujo (lo transparente no hace sombra)
    if (opciones.imagen) opciones.imagen(ctx);
    trazar();
    if (opciones.imagen) {
      // nada más que rellenar: la imagen ya está
    } else if (linea !== null) {
      ctx.strokeStyle = relleno;
      ctx.lineWidth = linea;
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.stroke();
    } else {
      ctx.fillStyle = relleno;
      ctx.fill('evenodd');
    }
    if (e.borde > 0) {
      ctx.strokeStyle = resolverColor(e.colorBorde);
      ctx.lineWidth = e.borde;
      ctx.setLineDash(e.bordeDiscontinuo ? [e.borde * 3, e.borde * 2] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };
  if (e.resplandor) {
    soloSombra(e.resplandor, 0, 0, e.tamanoResplandor);
    soloSombra(e.resplandor, 0, 0, e.tamanoResplandor / 2);
  }
  if (e.sombra) soloSombra(e.sombra, e.sombraX, e.sombraY, e.desenfoqueSombra);
  pintarCuerpo(pintura);
  ctx.restore();
}

/** "Sumar" → "sumar"; null si no es un modo de mezcla. */
export function leerMezcla(texto: string): Mezcla | null {
  const t = normalizar(texto) as Mezcla;
  return t in MEZCLAS ? t : null;
}
