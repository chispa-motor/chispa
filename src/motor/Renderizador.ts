/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Renderizador: todo lo que se dibuja en pantalla pasa por aquí.
 *
 * DECISIÓN 1 — Resolución lógica fija (por defecto 960×540).
 *   El juego SIEMPRE piensa que la pantalla mide 960×540, aunque la ventana
 *   sea más grande o más pequeña. Nosotros escalamos el dibujo para que
 *   quepa, dejando bandas negras si la proporción no coincide.
 *   Ventaja: un objeto en x=900 está en el mismo sitio en cualquier monitor.
 *
 * DECISIÓN 2 — Pantallas de alta densidad (devicePixelRatio).
 *   En portátiles "retina" un píxel CSS son 2 píxeles reales. Si no lo
 *   tenemos en cuenta, todo se ve borroso. Por eso el lienzo interno es más
 *   grande que su tamaño en pantalla.
 *
 * DECISIÓN 3 — Este archivo trabaja en coordenadas de PANTALLA:
 *   (0,0) arriba a la izquierda y la Y crece HACIA ABAJO, que es como
 *   funciona el Canvas del navegador.
 *   ¡Pero el MUNDO del juego tiene la Y hacia ARRIBA! (como Unity y las
 *   matemáticas). La Cámara convierte de mundo a pantalla justo antes de
 *   llamar a estas funciones, así que desde Chispa nunca se ve este eje.
 *
 * Rotaciones en GRADOS (más intuitivo que radianes para principiantes).
 */
import { resolverColor } from './Color';
import { escalaPixel, familiaCss, textoPixel } from './Letras';
import { Vector2 } from './Vector2';
import type { Figura } from '../objetos/formas/figuras';

export interface EstiloForma {
  /** true = forma rellena (por defecto). false = solo el borde. */
  relleno?: boolean;
  /** Grosor del borde cuando relleno = false. */
  grosor?: number;
  /** Rotación en grados, alrededor del centro de la forma. */
  rotacion?: number;
}

export interface EstiloTexto {
  color?: string;
  tamano?: number;
  alinear?: 'izquierda' | 'centro' | 'derecha';
  negrita?: boolean;
  /** Sombra oscura debajo del texto, para que se lea sobre cualquier fondo. */
  sombra?: boolean;
  /** Qué representa la Y: la parte de arriba del texto (por defecto) o su centro. */
  vertical?: 'arriba' | 'medio';
  /** El tipo de letra: una de las listas ("redonda", "pixel"...) o una del proyecto (ver Letras.ts). */
  letra?: string;
}

export interface EstiloImagen {
  ancho?: number;
  alto?: number;
  rotacion?: number;
  /** Opacidad entre 0 (invisible) y 1 (opaca). */
  opacidad?: number;
  /** Voltear la imagen (útil para personajes que miran a izquierda/derecha). */
  voltearX?: boolean;
  /** Voltear de arriba abajo. */
  voltearY?: boolean;
}

const GRADOS_A_RADIANES = Math.PI / 180;
const ALINEACIONES = { izquierda: 'left', centro: 'center', derecha: 'right' } as const;

export class Renderizador {
  /** El lienzo donde se dibuja. Con filtros de pantalla, por un momento es un lienzo aparte (ver Filtros.ts). */
  ctx: CanvasRenderingContext2D;
  /** El color de fondo del fotograma (lo necesitan los filtros, que dibujan en un lienzo aparte). */
  fondo = 'negro';
  private observador: ResizeObserver;

  constructor(
    readonly canvas: HTMLCanvasElement,
    /** Ancho lógico del juego. */
    public ancho: number,
    /** Alto lógico del juego. */
    public alto: number,
    /** true = píxeles nítidos (pixel art), false = imágenes suavizadas. */
    private pixelArt = false,
    /**
     * Modo libre (lo usa el editor): el lienzo ocupa TODO su contenedor y el
     * tamaño lógico es el del contenedor (sin bandas negras ni proporción fija).
     */
    private libre = false,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador no permite dibujar el juego.');
    this.ctx = ctx;

    // Cada vez que cambia el tamaño del contenedor, recalculamos la escala.
    this.observador = new ResizeObserver(() => this.ajustarTamano());
    this.observador.observe(canvas.parentElement ?? document.body);
    this.ajustarTamano();
  }

  /** Recalcula el tamaño del lienzo para que quepa manteniendo la proporción. */
  ajustarTamano(): void {
    const contenedor = this.canvas.parentElement ?? document.body;
    const { width, height } = contenedor.getBoundingClientRect();

    if (this.libre) {
      this.ancho = Math.max(1, Math.floor(width));
      this.alto = Math.max(1, Math.floor(height));
    }
    // Escala que hace caber el juego sin deformarlo.
    const escalaCss = Math.max(0.01, Math.min(width / this.ancho, height / this.alto));
    const anchoCss = this.ancho * escalaCss;
    const altoCss = this.alto * escalaCss;
    this.canvas.style.width = `${anchoCss}px`;
    this.canvas.style.height = `${altoCss}px`;

    // Tamaño real en píxeles de la pantalla.
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(anchoCss * dpr);
    this.canvas.height = Math.round(altoCss * dpr);

    // Cambiar canvas.width reinicia el contexto, así que lo configuramos otra vez.
    // Esta transformación convierte coordenadas lógicas (960×540) a píxeles reales.
    this.ctx.setTransform(this.canvas.width / this.ancho, 0, 0, this.canvas.height / this.alto, 0, 0);
    this.ctx.imageSmoothingEnabled = !this.pixelArt;
  }

  /**
   * Convierte una posición de la ventana (la del ratón) a coordenadas del juego.
   * Sin esto, el ratón "no coincidiría" con lo dibujado al escalar la ventana.
   */
  aCoordenadasJuego(clientX: number, clientY: number): Vector2 {
    const r = this.canvas.getBoundingClientRect();
    return new Vector2(((clientX - r.left) / r.width) * this.ancho, ((clientY - r.top) / r.height) * this.alto);
  }

  // ───────────────────────── Dibujo ─────────────────────────

  /** Pinta toda la pantalla de un color. Se hace al principio de cada fotograma. */
  limpiar(color = 'negro'): void {
    this.fondo = color;
    this.ctx.fillStyle = resolverColor(color);
    this.ctx.fillRect(0, 0, this.ancho, this.alto);
  }

  /** Rectángulo. (x, y) es la esquina superior izquierda. */
  rectangulo(x: number, y: number, ancho: number, alto: number, color = 'blanco', estilo: EstiloForma = {}): void {
    const ctx = this.ctx;
    ctx.save();
    // Para rotar alrededor del centro: movemos el origen al centro, rotamos
    // y dibujamos desplazados medio tamaño hacia atrás.
    ctx.translate(x + ancho / 2, y + alto / 2);
    if (estilo.rotacion) ctx.rotate(estilo.rotacion * GRADOS_A_RADIANES);
    this.aplicarRellenoOBorde(-ancho / 2, -alto / 2, ancho, alto, color, estilo);
    ctx.restore();
  }

  /** Círculo. (x, y) es el centro. */
  circulo(x: number, y: number, radio: number, color = 'blanco', estilo: EstiloForma = {}): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, radio), 0, Math.PI * 2);
    if (estilo.relleno === false) {
      ctx.strokeStyle = resolverColor(color);
      ctx.lineWidth = estilo.grosor ?? 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = resolverColor(color);
      ctx.fill();
    }
  }

  /**
   * Una figura (estrella, corazón, camino...) con su centro en (x, y). Sus
   * puntos tienen la Y hacia ARRIBA (como el mundo), así que se da la vuelta
   * al dibujarla. Los agujeros (anillo, formas restadas) se quedan vacíos.
   */
  figura(f: Figura, x: number, y: number, rotacion: number, color = 'blanco', opciones: { voltearX?: boolean; voltearY?: boolean } = {}): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    if (rotacion) ctx.rotate(rotacion * GRADOS_A_RADIANES);
    ctx.scale(opciones.voltearX ? -1 : 1, opciones.voltearY ? 1 : -1);
    if (f.anillos.length) {
      ctx.beginPath();
      for (const pol of f.anillos) {
        for (const anillo of pol) {
          anillo.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.closePath();
        }
      }
      ctx.fillStyle = resolverColor(color);
      ctx.fill('evenodd');
    }
    if (f.trazo && f.trazo.puntos.length > 1) {
      ctx.beginPath();
      f.trazo.puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = resolverColor(color);
      ctx.lineWidth = f.trazo.grosor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  linea(x1: number, y1: number, x2: number, y2: number, color = 'blanco', grosor = 2): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = resolverColor(color);
    ctx.lineWidth = grosor;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  /** Texto. (x, y) es la parte de arriba del texto. */
  texto(texto: string, x: number, y: number, estilo: EstiloTexto = {}): void {
    const ctx = this.ctx;
    const tamano = estilo.tamano ?? 18;
    if (estilo.letra === 'pixel' && this.textoPixel(texto, x, y, tamano, estilo)) return;
    ctx.font = `${estilo.negrita ? 'bold ' : ''}${tamano}px ${familiaCss(estilo.letra)}`;
    ctx.fillStyle = resolverColor(estilo.color ?? 'blanco');
    ctx.textAlign = ALINEACIONES[estilo.alinear ?? 'izquierda'];
    ctx.textBaseline = estilo.vertical === 'medio' ? 'middle' : 'top';
    if (estilo.sombra) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(texto, x + 2, y + 2);
      ctx.restore();
    }
    ctx.fillText(texto, x, y);
  }

  /** El texto con la letra «pixel» (ver Letras.ts). false si aquí no se puede (se escribe con la letra normal). */
  private textoPixel(texto: string, x: number, y: number, tamano: number, estilo: EstiloTexto): boolean {
    const dibujo = textoPixel(texto, resolverColor(estilo.color ?? 'blanco'), !!estilo.negrita);
    if (!dibujo) return false;
    const ctx = this.ctx;
    const k = escalaPixel(tamano);
    const l = dibujo.lienzo;
    const ancho = (l.width - dibujo.margen * 2) * k;
    const alinear = estilo.alinear ?? 'izquierda';
    const izquierda = Math.round(alinear === 'centro' ? x - ancho / 2 : alinear === 'derecha' ? x - ancho : x) - dibujo.margen * k;
    const arriba = Math.round(estilo.vertical === 'medio' ? y - dibujo.centro * k : y - dibujo.arriba * k);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (estilo.sombra) {
      const sombra = textoPixel(texto, 'rgba(0,0,0,0.55)', !!estilo.negrita);
      if (sombra) ctx.drawImage(sombra.lienzo, izquierda + k, arriba + k, l.width * k, l.height * k);
    }
    ctx.drawImage(l, izquierda, arriba, l.width * k, l.height * k);
    ctx.restore();
    return true;
  }

  /**
   * Imagen. (x, y) es el CENTRO de la imagen.
   * DECISIÓN: centro y no esquina, porque así rotar y voltear se ven bien
   * (el objeto gira sobre sí mismo). Así funcionarán los sprites en la Fase 2.
   */
  imagen(img: HTMLImageElement, x: number, y: number, estilo: EstiloImagen = {}): void {
    const ctx = this.ctx;
    const ancho = estilo.ancho ?? img.width;
    const alto = estilo.alto ?? img.height;
    ctx.save();
    ctx.globalAlpha = estilo.opacidad ?? 1;
    // Un dibujo pequeño (pixel art) agrandado se ve nítido, con sus píxeles cuadrados, en vez de borroso
    if (img.width <= 64 && img.height <= 64 && ancho >= img.width * 2) ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y);
    if (estilo.rotacion) ctx.rotate(estilo.rotacion * GRADOS_A_RADIANES);
    if (estilo.voltearX || estilo.voltearY) ctx.scale(estilo.voltearX ? -1 : 1, estilo.voltearY ? -1 : 1);
    ctx.drawImage(img, -ancho / 2, -alto / 2, ancho, alto);
    ctx.restore();
  }

  /** Deja de vigilar el tamaño de la ventana (se usará al parar el juego en el editor). */
  destruir(): void {
    this.observador.disconnect();
  }

  private aplicarRellenoOBorde(x: number, y: number, w: number, h: number, color: string, estilo: EstiloForma): void {
    const ctx = this.ctx;
    if (estilo.relleno === false) {
      ctx.strokeStyle = resolverColor(color);
      ctx.lineWidth = estilo.grosor ?? 2;
      ctx.strokeRect(x, y, w, h);
    } else {
      ctx.fillStyle = resolverColor(color);
      ctx.fillRect(x, y, w, h);
    }
  }
}
