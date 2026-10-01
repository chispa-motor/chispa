/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EFECTOS ESPECIALES LISTOS: explosión, fuego, humo, rayo eléctrico, estela,
 * onda expansiva, destello, lluvia, nieve, hojas, burbujas, confeti,
 * tinta/sangre, polvo y golpes con números de daño.
 *
 * Hay tres clases de efectos:
 *   - de golpe: unas partículas que salen a la vez (explosión, confeti...);
 *   - que duran: un EMISOR que suelta partículas cada segundo, en un sitio o
 *     pegado a un objeto (fuego, humo, estela, burbujas) o por toda la
 *     pantalla (lluvia, nieve, hojas);
 *   - dibujos especiales que no son partículas: el rayo (una línea en zigzag
 *     que cambia en cada fotograma), la onda (un anillo que crece), el
 *     destello (un brillo redondo) y los números que suben al dar un golpe.
 *
 * Las recetas (qué partículas lleva cada uno) están en RECETAS: las mismas
 * se usan desde Chispa (efecto.fuego(yo)), desde el editor (la sección
 * Efecto de un objeto, el clima de una escena) y en el editor de partículas.
 */
import type { Renderizador } from '../motor/Renderizador';
import { resolverColor } from '../motor/Color';
import type { ObjetoJuego } from './ObjetoJuego';
import { Particulas, type ConfigParticulas } from './Particulas';
import { Sprite } from './componentes/Sprite';
import { sinPrototipo } from '../utilidades/seguro';

/** Las recetas de partículas de cada efecto (lo que no se dice, como en ConfigParticulas). */
export const RECETAS: Record<string, ConfigParticulas> = sinPrototipo({
  fuego: { cantidad: 0, porSegundo: 70, colores: ['#fff3a0', '#ffc23a', '#ff7a1f'], colorFinal: '#a01010', velocidad: 80, vida: 0.75, tamano: 16, tamanoFinal: 0.15, gravedad: -0.12, dispersion: 35, direccion: 90, encoger: true, mezcla: 'sumar', area: 8 },
  humo: { cantidad: 0, porSegundo: 14, colores: ['#9aa1aa', '#7d848d', '#b8bec6'], velocidad: 45, vida: 2, tamano: 16, tamanoFinal: 2.6, gravedad: -0.05, dispersion: 40, direccion: 90, encoger: false, vaiven: 10, opacidad: 0.55 },
  burbujas: { cantidad: 0, porSegundo: 6, colores: ['#bfe9ff', '#e6f7ff'], velocidad: 55, vida: 2.4, tamano: 12, gravedad: -0.04, dispersion: 30, direccion: 90, encoger: false, forma: 'anillo', vaiven: 12, area: 10 },
  estela: { cantidad: 0, porSegundo: 70, colores: ['blanco'], velocidad: 0, vida: 0.35, tamano: 20, tamanoFinal: 0, gravedad: 0, dispersion: 0, direccion: 90, encoger: true, opacidad: 0.55 },
  lluvia: { cantidad: 0, porSegundo: 160, colores: ['#9ec9ff', '#c4defc'], velocidad: 950, vida: 1.6, tamano: 6, gravedad: 0, dispersion: 4, direccion: 260, encoger: false, forma: 'linea', opacidad: 0.6 },
  nieve: { cantidad: 0, porSegundo: 45, colores: ['blanco', '#e8f4ff'], velocidad: 70, vida: 12, tamano: 6, gravedad: 0, dispersion: 20, direccion: 270, encoger: false, vaiven: 22, opacidad: 0.9 },
  hojas: { cantidad: 0, porSegundo: 7, colores: ['#d9822b', '#c0392b', '#e5b84b', '#8a5a2b', '#7aa33a'], velocidad: 75, vida: 12, tamano: 14, gravedad: 0, dispersion: 25, direccion: 262, encoger: false, forma: 'hoja', vaiven: 45, giro: 200 },
  explosion: { cantidad: 45, colores: ['#fff3a0', '#ffc23a', '#ff7a1f'], colorFinal: '#5a1010', velocidad: 340, vida: 0.7, tamano: 12, tamanoFinal: 0.2, gravedad: 0.2, dispersion: 360, direccion: 90, encoger: true, mezcla: 'sumar', rozamiento: 0.6 },
  humoExplosion: { cantidad: 14, colores: ['#6b7079', '#8a9099'], velocidad: 90, vida: 1.4, tamano: 20, tamanoFinal: 2, gravedad: -0.05, dispersion: 360, direccion: 90, encoger: false, rozamiento: 0.8, opacidad: 0.5 },
  chispas: { cantidad: 25, colores: ['amarillo', 'blanco', '#ffd27a'], velocidad: 420, vida: 0.45, tamano: 4, gravedad: 0.6, dispersion: 360, direccion: 90, encoger: true, forma: 'chispa', mezcla: 'sumar' },
  confeti: { cantidad: 70, colores: ['rojo', 'amarillo', 'verde', 'azul', 'rosa', 'cian'], velocidad: 420, vida: 1.8, tamano: 8, gravedad: 0.45, dispersion: 70, direccion: 90, encoger: false, forma: 'cuadrado', giro: 720, rozamiento: 0.5, vaiven: 8 },
  sangre: { cantidad: 22, colores: ['#b3121b', '#8a0d14', '#d92a2a'], velocidad: 260, vida: 0.8, tamano: 6, gravedad: 1, dispersion: 120, direccion: 90, encoger: true },
  tinta: { cantidad: 22, colores: ['#5b3cc4', '#2f6fde', '#b34fd1', '#ffd23f'], velocidad: 240, vida: 0.8, tamano: 7, gravedad: 0.8, dispersion: 140, direccion: 90, encoger: true, forma: 'estrella', giro: 360 },
  polvo: { cantidad: 8, colores: ['#d8c6a4', '#b9a789', '#e8dcc4'], velocidad: 90, vida: 0.5, tamano: 8, tamanoFinal: 1.8, gravedad: -0.02, dispersion: 40, direccion: 0, encoger: false, rozamiento: 2, opacidad: 0.8 },
  golpe: { cantidad: 10, colores: ['blanco', 'amarillo'], velocidad: 300, vida: 0.25, tamano: 4, gravedad: 0, dispersion: 360, direccion: 90, encoger: true, forma: 'chispa', mezcla: 'sumar' },
});

/** Los efectos que duran y se pueden poner a un objeto desde el editor (sección Efecto). */
export const EFECTOS_CONTINUOS = ['fuego', 'humo', 'burbujas', 'estela'] as const;
/** El clima de una escena (por toda la pantalla). */
export const CLIMAS = ['lluvia', 'nieve', 'hojas'] as const;
export type Clima = (typeof CLIMAS)[number];

/** Donde está un efecto: un punto fijo o pegado a un objeto (sigue al objeto). */
export type Sitio = { x: number; y: number } | ObjetoJuego;
const esObjeto = (s: Sitio): s is ObjetoJuego => 'transformacion' in s;
const posicionDe = (s: Sitio) => (esObjeto(s) ? s.transformacion.posicion : s);

interface Emisor {
  nombre: string;
  config: ConfigParticulas;
  sitio: Sitio | 'pantalla';
  /** Segundos que le quedan (Infinity = hasta que se pare o se destruya el objeto). */
  restante: number;
  acumulado: number;
  /** Cuánto: 1 normal, 2 el doble de partículas. */
  intensidad: number;
}

interface Rayo {
  desde: Sitio;
  hasta: Sitio;
  vida: number;
  total: number;
  color: string;
  puntos: { x: number; y: number }[];
}

interface Anillo {
  x: number;
  y: number;
  radio: number;
  vida: number;
  total: number;
  color: string;
  /** onda: un anillo que crece; destello: un brillo redondo. */
  clase: 'onda' | 'destello';
}

interface TextoFlotante {
  x: number;
  y: number;
  texto: string;
  vida: number;
  total: number;
  color: string;
  tamano: number;
}

/** Como mucho, tantos efectos que duran a la vez (más no se distinguen y el juego iría lento). */
export const MAXIMO_EMISORES = 200;

export class Efectos {
  readonly particulas = new Particulas();
  private emisores: Emisor[] = [];
  private rayos: Rayo[] = [];
  private anillos: Anillo[] = [];
  private textos: TextoFlotante[] = [];
  /** Versión suave (para los más pequeños): la sangre sale como tinta de colores. */
  suave = true;

  get azar(): () => number {
    return this.particulas.azar;
  }

  /** Cuántos efectos que duran hay (para las pruebas y el depurador). */
  get emisoresActivos(): number {
    return this.emisores.length;
  }

  /** El efecto que dura que lleva puesto un objeto (o null). */
  nombreEn(o: ObjetoJuego): string | null {
    return this.emisores.find((e) => e.sitio === o)?.nombre ?? null;
  }

  /** ¿Hay un efecto que dura con ese nombre (y en ese objeto, si se dice)? */
  tiene(nombre: string, objeto?: ObjetoJuego): boolean {
    return this.emisores.some((e) => e.nombre === nombre && (!objeto || e.sitio === objeto));
  }

  // ───────────────────────── Efectos de golpe ─────────────────────────

  explosion(x: number, y: number, tamano = 1): void {
    const t = Math.max(0.1, Math.min(10, tamano));
    const fuego = { ...RECETAS.explosion, velocidad: RECETAS.explosion.velocidad * t, tamano: RECETAS.explosion.tamano * Math.sqrt(t) };
    this.particulas.emitir(fuego, x, y, RECETAS.explosion.cantidad * Math.sqrt(t));
    this.particulas.emitir(RECETAS.humoExplosion, x, y, RECETAS.humoExplosion.cantidad * Math.sqrt(t));
    this.destello(x, y, 90 * t);
    this.onda(x, y, 110 * t, '#ffd27a');
  }

  /** Una receta de golpe en un punto. */
  lanzar(receta: ConfigParticulas, x: number, y: number, cuantas?: number): void {
    this.particulas.emitir(receta, x, y, cuantas);
  }

  /** Sangre (o, en la versión suave, tinta de colores con estrellitas). */
  sangre(x: number, y: number): void {
    this.lanzar(this.suave ? RECETAS.tinta : RECETAS.sangre, x, y);
  }

  /** Polvo a los pies de un objeto (al saltar o al caer): dos nubecitas, una a cada lado. */
  polvo(o: ObjetoJuego): void {
    const s = o.obtener(Sprite);
    const pies = o.transformacion.posicion.y - (s ? s.altoFinal / 2 : 0) + 3;
    const x = o.transformacion.posicion.x;
    this.particulas.emitir({ ...RECETAS.polvo, direccion: 0 }, x + 4, pies);
    this.particulas.emitir({ ...RECETAS.polvo, direccion: 180 }, x - 4, pies);
  }

  /** Un golpe: chispitas y, si se dice, un número de daño que sube y se desvanece. */
  golpe(o: ObjetoJuego, dano: string | null): void {
    const p = o.transformacion.posicion;
    const s = o.obtener(Sprite);
    this.lanzar(RECETAS.golpe, p.x, p.y);
    if (dano !== null) this.texto(dano, p.x, p.y + (s ? s.altoFinal / 2 : 16) + 6, '#ff4545');
  }

  texto(texto: string, x: number, y: number, color = 'blanco', tamano = 26): void {
    if (this.textos.length > 100) this.textos.shift();
    this.textos.push({ x: x + (this.azar() - 0.5) * 16, y, texto, vida: 0.9, total: 0.9, color: resolverColor(color), tamano });
  }

  onda(x: number, y: number, radio = 150, color = 'blanco'): void {
    if (this.anillos.length > 100) this.anillos.shift();
    this.anillos.push({ x, y, radio: Math.max(1, radio), vida: 0.5, total: 0.5, color: resolverColor(color), clase: 'onda' });
  }

  destello(x: number, y: number, tamano = 120, color = 'blanco'): void {
    if (this.anillos.length > 100) this.anillos.shift();
    this.anillos.push({ x, y, radio: Math.max(1, tamano / 2), vida: 0.22, total: 0.22, color: resolverColor(color), clase: 'destello' });
  }

  /** Un rayo eléctrico de un sitio a otro (si son objetos, los sigue mientras dura). */
  rayo(desde: Sitio, hasta: Sitio, color = '#9fe8ff', segundos = 0.3): void {
    if (this.rayos.length > 50) this.rayos.shift();
    const r: Rayo = { desde, hasta, vida: segundos, total: segundos, color: resolverColor(color), puntos: [] };
    this.zigzag(r);
    this.rayos.push(r);
    const p = posicionDe(hasta);
    this.lanzar(RECETAS.chispas, p.x, p.y, 8);
  }

  // ───────────────────────── Efectos que duran ─────────────────────────

  /** Un efecto que dura, en un sitio, pegado a un objeto o por toda la pantalla. Si ya había uno igual ahí, se cambia. */
  empezar(nombre: string, config: ConfigParticulas, sitio: Sitio | 'pantalla', segundos = Infinity, intensidad = 1): void {
    this.parar(nombre, sitio === 'pantalla' ? undefined : sitio, sitio === 'pantalla');
    if (this.emisores.length >= MAXIMO_EMISORES) this.emisores.shift();
    this.emisores.push({ nombre, config, sitio, restante: segundos, acumulado: 0, intensidad: Math.max(0, intensidad) });
  }

  /**
   * Para efectos que duran: los de ese nombre (y de ese objeto o sitio, si se
   * dice), o todos si no se dice nombre. Las partículas que ya han salido
   * terminan su vida (no desaparecen de golpe).
   */
  parar(nombre?: string, sitio?: Sitio, soloPantalla = false): void {
    this.emisores = this.emisores.filter((e) => {
      if (nombre !== undefined && e.nombre !== nombre) return true;
      if (soloPantalla) return e.sitio !== 'pantalla';
      if (sitio === undefined) return false;
      if (e.sitio === sitio) return false;
      // Un punto: vale si está en el mismo sitio
      return !(e.sitio !== 'pantalla' && !esObjeto(e.sitio) && !esObjeto(sitio) && e.sitio.x === sitio.x && e.sitio.y === sitio.y);
    });
  }

  /** Quita los efectos pegados a un objeto que se destruye. */
  olvidar(o: ObjetoJuego): void {
    this.emisores = this.emisores.filter((e) => e.sitio !== o);
    this.rayos = this.rayos.filter((r) => r.desde !== o && r.hasta !== o);
  }

  /** `vista`: lo que se ve del mundo (para que la lluvia caiga donde mira la cámara). */
  actualizar(dt: number, vista: { izquierda: number; derecha: number; abajo: number; arriba: number }): void {
    for (const e of this.emisores) {
      e.restante -= dt;
      const sitio = e.sitio;
      if (sitio !== 'pantalla' && esObjeto(sitio) && sitio.destruido) {
        e.restante = 0;
        continue;
      }
      e.acumulado += (e.config.porSegundo ?? 0) * e.intensidad * dt;
      const n = Math.floor(e.acumulado);
      if (n <= 0) continue;
      e.acumulado -= n;
      if (sitio === 'pantalla') {
        // El clima: sale por arriba de lo que se ve (y un poco por los lados, por si va inclinado)
        const ancho = vista.derecha - vista.izquierda;
        for (let i = 0; i < n; i++) this.particulas.emitir(e.config, vista.izquierda - ancho * 0.15 + this.azar() * ancho * 1.3, vista.arriba + 20, 1);
      } else if (esObjeto(sitio) && e.nombre === 'estela') {
        // La estela: copias del objeto (su color y su tamaño) que se quedan atrás y se apagan
        const s = sitio.obtener(Sprite);
        const config = s ? { ...e.config, colores: [s.imagen ? 'blanco' : s.color], tamano: Math.min(s.anchoFinal, s.altoFinal) * 0.9 } : e.config;
        this.particulas.emitir(config, sitio.transformacion.posicion.x, sitio.transformacion.posicion.y, n);
      } else {
        const p = posicionDe(sitio);
        this.particulas.emitir(e.config, p.x, p.y, n);
      }
    }
    this.emisores = this.emisores.filter((e) => e.restante > 0);
    this.particulas.actualizar(dt);
    for (const r of this.rayos) {
      r.vida -= dt;
      this.zigzag(r);
    }
    this.rayos = this.rayos.filter((r) => r.vida > 0);
    for (const a of this.anillos) a.vida -= dt;
    this.anillos = this.anillos.filter((a) => a.vida > 0);
    for (const t of this.textos) {
      t.vida -= dt;
      t.y += 70 * dt;
    }
    this.textos = this.textos.filter((t) => t.vida > 0);
  }

  /** Un rayo es un zigzag que cambia en cada fotograma (así parece que chisporrotea). */
  private zigzag(r: Rayo): void {
    const a = posicionDe(r.desde);
    const b = posicionDe(r.hasta);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const largo = Math.hypot(dx, dy) || 1;
    const tramos = Math.max(3, Math.min(24, Math.round(largo / 18)));
    const nx = -dy / largo;
    const ny = dx / largo;
    r.puntos = Array.from({ length: tramos + 1 }, (_, i) => {
      const t = i / tramos;
      const desvio = i === 0 || i === tramos ? 0 : (this.azar() - 0.5) * Math.min(40, largo * 0.15);
      return { x: a.x + dx * t + nx * desvio, y: a.y + dy * t + ny * desvio };
    });
  }

  /**
   * `parte`: todo, o (cuando hay oscuridad y luces) primero lo normal y,
   * encima de la oscuridad, lo que da luz (lo que brilla, rayos y destellos).
   */
  dibujar(r: Renderizador, aPantalla: (x: number, y: number) => { x: number; y: number }, parte: 'todo' | 'normal' | 'luz' = 'todo'): void {
    const ctx = r.ctx;
    this.particulas.dibujar(r, aPantalla, parte === 'todo' ? 'todas' : parte === 'normal' ? 'normales' : 'brillantes');
    const rayos = parte === 'normal' ? [] : this.rayos;
    const anillos = parte === 'todo' ? this.anillos : this.anillos.filter((a) => (a.clase === 'destello') === (parte === 'luz'));
    const textos = parte === 'luz' ? [] : this.textos;
    if (!rayos.length && !anillos.length && !textos.length) return;
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const a of anillos) {
      const t = 1 - a.vida / a.total; // 0 → 1
      const s = aPantalla(a.x, a.y);
      ctx.globalAlpha = 1 - t;
      if (a.clase === 'onda') {
        ctx.strokeStyle = a.color;
        ctx.lineWidth = Math.max(1, 10 * (1 - t));
        ctx.beginPath();
        ctx.arc(s.x, s.y, a.radio * (0.2 + 0.8 * Math.sqrt(t)), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const radio = a.radio * (0.5 + t);
        const g = ctx.createRadialGradient?.(s.x, s.y, 0, s.x, s.y, radio);
        if (g) {
          g.addColorStop(0, a.color);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
        } else ctx.fillStyle = a.color;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(s.x, s.y, radio, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    for (const rayo of rayos) {
      const puntos = rayo.puntos.map((p) => aPantalla(p.x, p.y));
      ctx.globalAlpha = Math.min(1, (rayo.vida / rayo.total) * 2);
      // Tres pasadas: brillo ancho, color y el centro blanco
      for (const [ancho, color] of [[9, rayo.color], [4, rayo.color], [1.5, '#ffffff']] as const) {
        ctx.globalAlpha *= ancho === 9 ? 0.35 : 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = ancho;
        ctx.beginPath();
        puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        ctx.globalAlpha = Math.min(1, (rayo.vida / rayo.total) * 2);
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of textos) {
      const s = aPantalla(t.x, t.y);
      const k = t.vida / t.total;
      ctx.globalAlpha = Math.min(1, k * 2);
      // Al salir da un saltito (crece y vuelve a su tamaño)
      const tam = t.tamano * (1 + Math.max(0, k - 0.75) * 2);
      ctx.font = `bold ${tam}px system-ui, "Segoe UI", sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(t.texto, s.x, s.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.texto, s.x, s.y);
    }
    ctx.restore();
  }

  vaciar(): void {
    this.particulas.vaciar();
    this.emisores = [];
    this.rayos = [];
    this.anillos = [];
    this.textos = [];
  }
}
