/**
 * Partículas: puntitos que salen disparados y se desvanecen (explosiones,
 * humo, chispas...). No son objetos del juego: no tienen scripts ni
 * colisiones, así se pueden crear cientos sin que el juego vaya lento.
 */
import type { Renderizador } from '../motor/Renderizador';
import { resolverColor } from '../motor/Color';

export interface ConfigParticulas {
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
  /** ¿Se hacen pequeñas al morir? */
  encoger: boolean;
}

/** Tipos ya preparados, para usar con un solo nombre: particulas("explosion", x, y) */
export const TIPOS_PARTICULAS: Record<string, ConfigParticulas> = {
  explosion: { cantidad: 40, colores: ['amarillo', 'naranja', 'rojo'], velocidad: 320, vida: 0.7, tamano: 8, gravedad: 0.3, dispersion: 360, direccion: 90, encoger: true },
  humo: { cantidad: 18, colores: ['gris', '#b0b6bf', '#8a9099'], velocidad: 60, vida: 1.4, tamano: 18, gravedad: -0.08, dispersion: 70, direccion: 90, encoger: false },
  chispas: { cantidad: 25, colores: ['amarillo', 'blanco'], velocidad: 420, vida: 0.4, tamano: 4, gravedad: 0.6, dispersion: 360, direccion: 90, encoger: true },
  polvo: { cantidad: 12, colores: ['#c8b08a', '#a8916d'], velocidad: 90, vida: 0.5, tamano: 7, gravedad: 0.1, dispersion: 160, direccion: 90, encoger: true },
  confeti: { cantidad: 60, colores: ['rojo', 'amarillo', 'verde', 'azul', 'rosa', 'cian'], velocidad: 380, vida: 1.6, tamano: 7, gravedad: 0.5, dispersion: 60, direccion: 90, encoger: false },
  estrellas: { cantidad: 16, colores: ['amarillo', 'blanco'], velocidad: 160, vida: 0.9, tamano: 6, gravedad: 0, dispersion: 360, direccion: 90, encoger: true },
};

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  vidaTotal: number;
  tamano: number;
  color: string;
  gravedad: number;
  encoger: boolean;
}

const MAXIMO = 3000;
const GRAVEDAD = 1500;

export class Particulas {
  private lista: Particula[] = [];

  get cantidad(): number {
    return this.lista.length;
  }

  emitir(c: ConfigParticulas, x: number, y: number): void {
    const n = Math.min(Math.max(0, Math.floor(c.cantidad)), MAXIMO - this.lista.length);
    for (let i = 0; i < n; i++) {
      const angulo = ((c.direccion + (Math.random() - 0.5) * c.dispersion) * Math.PI) / 180;
      const rapidez = c.velocidad * (0.4 + Math.random() * 0.6);
      const vida = c.vida * (0.6 + Math.random() * 0.4);
      this.lista.push({
        x,
        y,
        vx: Math.cos(angulo) * rapidez,
        vy: Math.sin(angulo) * rapidez, // Y hacia arriba
        vida,
        vidaTotal: vida,
        tamano: c.tamano * (0.6 + Math.random() * 0.6),
        color: resolverColor(c.colores[Math.floor(Math.random() * c.colores.length)] ?? 'blanco'),
        gravedad: c.gravedad,
        encoger: c.encoger,
      });
    }
  }

  actualizar(dt: number): void {
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const p = this.lista[i];
      p.vy -= GRAVEDAD * p.gravedad * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vida -= dt;
      if (p.vida <= 0) {
        // Quitar sin mover todo el array: cambiamos por el último
        this.lista[i] = this.lista[this.lista.length - 1];
        this.lista.pop();
      }
    }
  }

  dibujar(r: Renderizador, aPantalla: (x: number, y: number) => { x: number; y: number }): void {
    const ctx = r.ctx;
    for (const p of this.lista) {
      const t = p.vida / p.vidaTotal;
      const s = aPantalla(p.x, p.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, t * 1.5));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0.5, (p.encoger ? p.tamano * t : p.tamano) / 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  vaciar(): void {
    this.lista = [];
  }
}
