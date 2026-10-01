/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * FILTROS DE PANTALLA: cómo se ve el juego entero. Escala de grises,
 * desenfoque, pixelado, brillo, viñeta (bordes oscuros), aberración
 * cromática (los colores se separan un poco), efecto de tele antigua (CRT)
 * y «bloom» (lo brillante deja un halo de luz).
 *
 * Funcionan así: la escena se dibuja en un lienzo aparte (fuera de la vista)
 * y luego se copia a la pantalla con los filtros. Si no hay ningún filtro
 * puesto, se dibuja directamente, sin coste.
 */
import { resolverColor } from './Color';

export interface Filtros {
  /** 0 = colores normales, 1 = blanco y negro del todo. */
  grises: number;
  /** Píxeles de desenfoque (0 = nítido). */
  desenfoque: number;
  /** Tamaño de los «píxeles gordos» (1 = normal). */
  pixelado: number;
  /** 1 = normal, 0.5 = más oscuro, 1.5 = más claro. */
  brillo: number;
  /** Lo oscuros que son los bordes, de 0 a 1. */
  vineta: number;
  /** Píxeles que se separan los colores (0 = nada). */
  aberracion: number;
  /** Tele antigua: rayas, bordes oscuros y colores algo separados. */
  crt: boolean;
  /** Halo de luz alrededor de lo brillante, de 0 a 1. */
  bloom: number;
}

export const FILTROS_NORMALES: Filtros = { grises: 0, desenfoque: 0, pixelado: 1, brillo: 1, vineta: 0, aberracion: 0, crt: false, bloom: 0 };

/** Nombres de los filtros, para la ayuda y el editor. */
export const NOMBRES_FILTROS = Object.keys(FILTROS_NORMALES) as (keyof Filtros)[];

export function hayFiltros(f: Filtros): boolean {
  return f.grises > 0 || f.desenfoque > 0 || f.pixelado > 1 || f.brillo !== 1 || f.vineta > 0 || f.aberracion > 0 || f.crt || f.bloom > 0;
}

/** Lienzos auxiliares (se crean una vez y se reutilizan). */
const auxiliares = new Map<string, HTMLCanvasElement>();
function auxiliar(nombre: string, ancho: number, alto: number): HTMLCanvasElement {
  let c = auxiliares.get(nombre);
  if (!c) auxiliares.set(nombre, (c = document.createElement('canvas')));
  if (c.width !== ancho || c.height !== alto) {
    c.width = ancho;
    c.height = alto;
  }
  return c;
}

/**
 * Dibuja con filtros: `dibujar` pinta la escena en el lienzo que se le da
 * (con la misma transformación que la pantalla) y luego se copia a `ctx`.
 * `fondo` es el color de fondo (el lienzo aparte empieza vacío).
 */
export function dibujarConFiltros(ctx: CanvasRenderingContext2D, f: Filtros, fondo: string, dibujar: (otro: CanvasRenderingContext2D) => void): void {
  const ancho = ctx.canvas.width;
  const alto = ctx.canvas.height;
  const escena = auxiliar('escena', ancho, alto);
  const ectx = escena.getContext('2d');
  if (!ectx) return dibujar(ctx); // sin lienzos aparte (no debería pasar en un navegador)
  ectx.setTransform(1, 0, 0, 1, 0, 0);
  ectx.filter = 'none';
  ectx.globalAlpha = 1;
  ectx.globalCompositeOperation = 'source-over';
  ectx.fillStyle = resolverColor(fondo);
  ectx.fillRect(0, 0, ancho, alto);
  ectx.setTransform(ctx.getTransform());
  ectx.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
  dibujar(ectx);

  // La escala de la pantalla (los píxeles de los filtros son píxeles del juego, no de la pantalla)
  const k = ctx.getTransform().a || 1;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let fuente: HTMLCanvasElement = escena;

  // Pixelado: se encoge y se vuelve a agrandar sin suavizar
  if (f.pixelado > 1) {
    const p = Math.max(1, f.pixelado * k);
    const pequeno = auxiliar('pixelado', Math.max(1, Math.round(ancho / p)), Math.max(1, Math.round(alto / p)));
    const pctx = pequeno.getContext('2d')!;
    pctx.imageSmoothingEnabled = true;
    pctx.clearRect(0, 0, pequeno.width, pequeno.height);
    pctx.drawImage(escena, 0, 0, pequeno.width, pequeno.height);
    const grande = auxiliar('pixeladoGrande', ancho, alto);
    const gctx = grande.getContext('2d')!;
    gctx.imageSmoothingEnabled = false;
    gctx.clearRect(0, 0, ancho, alto);
    gctx.drawImage(pequeno, 0, 0, ancho, alto);
    fuente = grande;
  }

  const filtro = [
    f.desenfoque > 0 ? `blur(${f.desenfoque * k}px)` : '',
    f.grises > 0 ? `grayscale(${Math.min(1, f.grises)})` : '',
    f.brillo !== 1 ? `brightness(${Math.max(0, f.brillo)})` : '',
    f.crt ? 'contrast(1.1) saturate(1.15)' : '',
  ].filter(Boolean).join(' ');
  ctx.filter = filtro || 'none';
  ctx.drawImage(fuente, 0, 0);
  ctx.filter = 'none';

  // Aberración cromática: una copia rojiza a un lado y una azulada al otro, sumando luz
  const aberracion = f.aberracion + (f.crt ? 1.5 : 0);
  if (aberracion > 0) {
    const d = aberracion * k;
    for (const [color, dx] of [['#ff0000', d], ['#00b4ff', -d]] as const) {
      const tinte = auxiliar(`tinte${color}`, ancho, alto);
      const tctx = tinte.getContext('2d')!;
      tctx.globalCompositeOperation = 'source-over';
      tctx.clearRect(0, 0, ancho, alto);
      tctx.drawImage(fuente, 0, 0);
      tctx.globalCompositeOperation = 'multiply';
      tctx.fillStyle = color;
      tctx.fillRect(0, 0, ancho, alto);
      ctx.globalAlpha = 0.35;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(tinte, dx, 0);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Bloom: la escena borrosa y más clara, sumada encima (lo brillante brilla más)
  if (f.bloom > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, f.bloom) * 0.6;
    ctx.filter = `blur(${10 * k}px) brightness(1.1)`;
    ctx.drawImage(fuente, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Tele antigua: rayas horizontales oscuras
  if (f.crt) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    const paso = Math.max(2, Math.round(3 * k));
    for (let y = 0; y < alto; y += paso) ctx.fillRect(0, y, ancho, Math.max(1, Math.round(k)));
  }

  // Viñeta: los bordes, oscuros
  const vineta = Math.min(1, f.vineta + (f.crt ? 0.45 : 0));
  if (vineta > 0) {
    const g = ctx.createRadialGradient(ancho / 2, alto / 2, Math.min(ancho, alto) * 0.3, ancho / 2, alto / 2, Math.hypot(ancho, alto) / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${vineta})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ancho, alto);
  }
  ctx.restore();
}

// ───────────────────────── Siluetas (contorno y flash de los objetos) ─────────────────────────

const siluetas = new Map<string, HTMLCanvasElement>();

/**
 * Una imagen pintada entera de un color (lo transparente sigue transparente).
 * Sirve para el contorno de una imagen y para el flash al recibir un golpe.
 */
export function siluetaDe(img: CanvasImageSource & { width: number; height: number; src?: string }, color: string): HTMLCanvasElement | null {
  const clave = `${img.src ?? ''}|${img.width}x${img.height}|${color}`;
  let c = siluetas.get(clave);
  if (c) return c;
  if (siluetas.size > 200) siluetas.clear();
  c = document.createElement('canvas');
  c.width = Math.max(1, img.width);
  c.height = Math.max(1, img.height);
  const sctx = c.getContext('2d');
  if (!sctx) return null;
  sctx.drawImage(img, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = resolverColor(color);
  sctx.fillRect(0, 0, c.width, c.height);
  siluetas.set(clave, c);
  return c;
}
