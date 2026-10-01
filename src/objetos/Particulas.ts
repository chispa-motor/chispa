/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Partículas: puntitos que salen disparados y se desvanecen (explosiones,
 * humo, chispas, lluvia...). No son objetos del juego: no tienen scripts ni
 * colisiones, así se pueden crear cientos sin que el juego vaya lento.
 *
 * Cada partícula puede tener una forma (círculo, cuadrado, línea, estrella,
 * anillo, hoja, chispa), cambiar de color y de tamaño mientras vive, girar,
 * moverse de lado a lado (vaivén) y frenar con el aire. Las que «suman luz»
 * (fuego, chispas, magia) se dibujan con la mezcla «sumar»: brillan.
 */
import type { Renderizador } from '../motor/Renderizador';
import { colorAComponentes, resolverColor } from '../motor/Color';
import { sinPrototipo } from '../utilidades/seguro';

export const FORMAS_PARTICULA = ['circulo', 'cuadrado', 'linea', 'estrella', 'anillo', 'hoja', 'chispa'] as const;
export type FormaParticula = (typeof FORMAS_PARTICULA)[number];

export interface ConfigParticulas {
  /** Cuántas salen de golpe. */
  cantidad: number;
  /** Uno o varios colores (se elige uno al azar para cada partícula). */
  colores: string[];
  /** Rapidez inicial (píxeles/segundo). */
  velocidad: number;
  /** Cuánto dura cada partícula (segundos). */
  vida: number;
  /** Tamaño inicial (diámetro, píxeles). */
  tamano: number;
  /** 1 = caen como todo; 0 = flotan; negativo = suben (humo). */
  gravedad: number;
  /** Ángulo del abanico en grados (360 = en todas direcciones). */
  dispersion: number;
  /** Dirección central en grados (90 = hacia arriba). */
  direccion: number;
  /** ¿Se hacen pequeñas al morir? (lo mismo que tamanoFinal = 0) */
  encoger: boolean;
  // ── Opcionales (lo que no se dice, como antes) ──
  forma?: FormaParticula;
  /** El color al que llegan al morir (si no se dice, no cambian). */
  colorFinal?: string;
  /** Tamaño al morir, comparado con el del principio: 0 = desaparecen, 2 = el doble (humo). */
  tamanoFinal?: number;
  /** Cuánto giran, como mucho, en grados por segundo. */
  giro?: number;
  /** Vaivén de lado a lado, en píxeles (hojas, nieve, burbujas). */
  vaiven?: number;
  /** Cuánto las frena el aire, de 0 (nada) a 1 (mucho). */
  rozamiento?: number;
  /** "sumar" = brillan (luz que se suma: fuego, chispas, magia). */
  mezcla?: 'normal' | 'sumar';
  /** Para los efectos que duran: cuántas salen cada segundo. */
  porSegundo?: number;
  /** Desde dónde salen: un círculo de este radio alrededor del punto (0 = del mismo punto). */
  area?: number;
  /** Lo opacas que empiezan, de 0 a 1. */
  opacidad?: number;
}

/** Tipos ya preparados, para usar con un solo nombre: particulas("explosion", x, y) */
export const TIPOS_PARTICULAS: Record<string, ConfigParticulas> = sinPrototipo({
  explosion: { cantidad: 40, colores: ['amarillo', 'naranja', 'rojo'], velocidad: 320, vida: 0.7, tamano: 8, gravedad: 0.3, dispersion: 360, direccion: 90, encoger: true },
  humo: { cantidad: 18, colores: ['gris', '#b0b6bf', '#8a9099'], velocidad: 60, vida: 1.4, tamano: 18, gravedad: -0.08, dispersion: 70, direccion: 90, encoger: false },
  chispas: { cantidad: 25, colores: ['amarillo', 'blanco'], velocidad: 420, vida: 0.4, tamano: 4, gravedad: 0.6, dispersion: 360, direccion: 90, encoger: true, forma: 'chispa', mezcla: 'sumar' },
  polvo: { cantidad: 12, colores: ['#c8b08a', '#a8916d'], velocidad: 90, vida: 0.5, tamano: 7, gravedad: 0.1, dispersion: 160, direccion: 90, encoger: true },
  confeti: { cantidad: 60, colores: ['rojo', 'amarillo', 'verde', 'azul', 'rosa', 'cian'], velocidad: 380, vida: 1.6, tamano: 7, gravedad: 0.5, dispersion: 60, direccion: 90, encoger: false, forma: 'cuadrado', giro: 720, rozamiento: 0.4 },
  estrellas: { cantidad: 16, colores: ['amarillo', 'blanco'], velocidad: 160, vida: 0.9, tamano: 6, gravedad: 0, dispersion: 360, direccion: 90, encoger: true, forma: 'estrella', giro: 360 },
});

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  vidaTotal: number;
  tamano: number;
  tamanoFinal: number;
  /** Color de salida y de llegada (r, g, b); el de llegada solo si cambia. */
  color: string;
  rgb: [number, number, number] | null;
  rgbFinal: [number, number, number] | null;
  gravedad: number;
  forma: FormaParticula;
  rotacion: number;
  giro: number;
  vaiven: number;
  fase: number;
  rozamiento: number;
  sumar: boolean;
  opacidad: number;
}

/** Como mucho, estas partículas a la vez (más no se ven, y el juego iría lento). */
export const MAXIMO_PARTICULAS = 3000;
const GRAVEDAD = 1500;

/** Una estrella de 5 puntas de radio 1 (se escala al dibujar). */
const ESTRELLA = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 1 : 0.45;
  const a = -Math.PI / 2 + (Math.PI * i) / 5;
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
});

export class Particulas {
  private lista: Particula[] = [];
  /** Para las pruebas: la función de azar (cambia con escena.semilla para que se repita igual). */
  azar: () => number = Math.random;

  get cantidad(): number {
    return this.lista.length;
  }

  /** Lanza las partículas de golpe. `cuantas` cambia la cantidad (si no, la de la configuración). */
  emitir(c: ConfigParticulas, x: number, y: number, cuantas = c.cantidad): void {
    const n = Math.min(Math.max(0, Math.floor(cuantas)), MAXIMO_PARTICULAS - this.lista.length);
    const azar = this.azar;
    const rgbFinal = c.colorFinal ? rgb(c.colorFinal) : null;
    const tamanoFinal = c.tamanoFinal ?? (c.encoger ? 0 : 1);
    for (let i = 0; i < n; i++) {
      const angulo = ((c.direccion + (azar() - 0.5) * c.dispersion) * Math.PI) / 180;
      const rapidez = c.velocidad * (0.4 + azar() * 0.6);
      const vida = c.vida * (0.6 + azar() * 0.4);
      const color = resolverColor(c.colores[Math.floor(azar() * c.colores.length)] ?? 'blanco');
      const area = c.area ?? 0;
      const aa = azar() * Math.PI * 2;
      const ra = Math.sqrt(azar()) * area;
      this.lista.push({
        x: x + Math.cos(aa) * ra,
        y: y + Math.sin(aa) * ra,
        vx: Math.cos(angulo) * rapidez,
        vy: Math.sin(angulo) * rapidez, // Y hacia arriba
        vida,
        vidaTotal: vida,
        tamano: c.tamano * (0.6 + azar() * 0.6),
        tamanoFinal,
        color,
        rgb: rgbFinal ? rgb(color) : null,
        rgbFinal,
        gravedad: c.gravedad,
        forma: c.forma ?? 'circulo',
        rotacion: azar() * 360,
        giro: (c.giro ?? 0) * (azar() * 2 - 1),
        vaiven: c.vaiven ?? 0,
        fase: azar() * Math.PI * 2,
        rozamiento: c.rozamiento ?? 0,
        sumar: c.mezcla === 'sumar',
        opacidad: c.opacidad ?? 1,
      });
    }
  }

  actualizar(dt: number): void {
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const p = this.lista[i];
      p.vy -= GRAVEDAD * p.gravedad * dt;
      if (p.rozamiento > 0) {
        const f = Math.exp(-p.rozamiento * 4 * dt);
        p.vx *= f;
        p.vy *= f;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vaiven) p.x += Math.cos(p.fase + (p.vidaTotal - p.vida) * 3) * p.vaiven * dt * 3;
      p.rotacion += p.giro * dt;
      p.vida -= dt;
      if (p.vida <= 0) {
        // Quitar sin mover todo el array: cambiamos por el último
        this.lista[i] = this.lista[this.lista.length - 1];
        this.lista.pop();
      }
    }
  }

  /** `cuales`: todas, solo las normales o solo las que brillan (con luces, las que brillan van encima de la oscuridad). */
  dibujar(r: Renderizador, aPantalla: (x: number, y: number) => { x: number; y: number }, cuales: 'todas' | 'normales' | 'brillantes' = 'todas'): void {
    const ctx = r.ctx;
    // Primero las normales y luego las que brillan (cambiar la mezcla cuesta: se hace una vez)
    for (const sumar of cuales === 'todas' ? [false, true] : [cuales === 'brillantes']) {
      let alguna = false;
      for (const p of this.lista) {
        if (p.sumar !== sumar) continue;
        if (!alguna && sumar) ctx.globalCompositeOperation = 'lighter';
        alguna = true;
        dibujarParticula(ctx, p, aPantalla(p.x, p.y));
      }
      if (alguna && sumar) ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  vaciar(): void {
    this.lista = [];
  }
}

function rgb(color: string): [number, number, number] | null {
  const c = colorAComponentes(color);
  return c ? [c[0], c[1], c[2]] : null;
}

function dibujarParticula(ctx: CanvasRenderingContext2D, p: Particula, s: { x: number; y: number }): void {
  const t = p.vida / p.vidaTotal; // 1 al nacer, 0 al morir
  ctx.globalAlpha = Math.max(0, Math.min(1, t * 1.5)) * p.opacidad;
  let color = p.color;
  if (p.rgb && p.rgbFinal) {
    const k = 1 - t;
    const c = p.rgb.map((v, i) => Math.round(v + (p.rgbFinal![i] - v) * k));
    color = `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  const tam = Math.max(0.5, p.tamano * (p.tamanoFinal + (1 - p.tamanoFinal) * t));
  const radio = tam / 2;
  ctx.fillStyle = color;
  switch (p.forma) {
    case 'cuadrado':
    case 'hoja':
    case 'estrella': {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate((p.rotacion * Math.PI) / 180);
      ctx.beginPath();
      if (p.forma === 'cuadrado') ctx.rect(-radio, -radio * 0.6, tam, tam * 0.6);
      else if (p.forma === 'hoja') ctx.ellipse(0, 0, radio, radio * 0.45, 0, 0, Math.PI * 2);
      else ESTRELLA.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * radio, y * radio) : ctx.lineTo(x * radio, y * radio)));
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'linea':
    case 'chispa': {
      // Una rayita en la dirección en que se mueve (lluvia, chispas)
      const v = Math.hypot(p.vx, p.vy) || 1;
      const largo = p.forma === 'linea' ? tam * 3 : Math.min(tam * 4, 4 + v * 0.03);
      ctx.strokeStyle = color;
      ctx.lineWidth = p.forma === 'linea' ? Math.max(1, tam / 3) : Math.max(1, tam / 2);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - (p.vx / v) * largo, s.y + (p.vy / v) * largo);
      ctx.stroke();
      break;
    }
    case 'anillo':
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, tam / 8);
      ctx.beginPath();
      ctx.arc(s.x, s.y, radio, 0, Math.PI * 2);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(s.x, s.y, radio, 0, Math.PI * 2);
      ctx.fill();
  }
}
