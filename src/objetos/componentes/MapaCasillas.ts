/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * MapaCasillas (tilemap): una cuadrícula de casillas iguales para construir
 * niveles rápido, "pintando" en el editor.
 *
 * - Cada TIPO de casilla (suelo, agua, pinchos...) tiene un aspecto (imagen o
 *   color) y dice si es sólida (se choca con ella) o fantasma (se atraviesa,
 *   pero avisa con "cuando toco").
 * - Las casillas se guardan en un diccionario "columna,fila" → tipo. Solo se
 *   guardan las que tienen algo, así un mapa enorme casi vacío no ocupa nada.
 *
 * Coordenadas (Y hacia ARRIBA): la posición del objeto es la esquina inferior
 * izquierda de la casilla (0, 0). La columna crece hacia la derecha y la fila
 * hacia ARRIBA.
 *
 * DECISIÓN: los mapas no giran ni se escalan. Así el cálculo de qué casillas
 * toca un objeto es una simple división, rapidísima aunque haya miles.
 */
import { Componente } from '../Componente';
import type { Caja } from './Colision';
import type { Renderizador } from '../../motor/Renderizador';
import { resolverColor } from '../../motor/Color';
import { normalizar } from '../../utilidades/texto';
import { propio } from '../../utilidades/seguro';

export interface TipoCasilla {
  imagen?: string;
  color?: string;
  /** verdadero = pared/suelo; falso = fantasma (se atraviesa pero se detecta). */
  solida: boolean;
  /** Si es sólida: solo para a lo que cae encima (se atraviesa desde abajo y los lados). */
  soloDesdeArriba?: boolean;
  /** Es una PUERTA: una casilla sólida que se puede abrir y cerrar (mapa.abrirPuerta). Abierta, se pasa por ella. */
  puerta?: boolean;
  /**
   * SUELO A OTRA ALTURA (solo en casillas que no son sólidas): cuántos píxeles está levantado.
   * En la vista en primera persona (vista3d) se ve como una tarima, y solo se sube a ella si el
   * escalón es pequeño (ESCALON) o por una rampa.
   */
  altura?: number;
  /** Es una RAMPA: hacia qué lado sube. Va de `alturaBaja` (0 si no se dice) a `altura`. */
  rampa?: Rampa;
  alturaBaja?: number;
}

export const RAMPAS = ['derecha', 'izquierda', 'arriba', 'abajo'] as const;
export type Rampa = (typeof RAMPAS)[number];
/** El escalón más alto que se sube andando, en casillas (0,2 = la quinta parte del lado de una casilla). */
export const ESCALON = 0.2;
/** Lo más alto que puede estar un suelo, en casillas (más arriba, quien mira se daría con el techo). */
export const ALTURA_MAXIMA_SUELO = 0.45;

/** Cómo está una puerta: de 0 (cerrada) a 1 (abierta del todo), hacia dónde va y a qué velocidad (por segundo). */
interface EstadoPuerta {
  apertura: number;
  objetivo: number;
  velocidad: number;
}

/** Desde cuánta apertura se puede pasar por una puerta (no hace falta esperar a que acabe de abrirse). */
export const APERTURA_PARA_PASAR = 0.7;
/** Lo que tarda una puerta en abrirse o cerrarse si no se dice. */
export const SEGUNDOS_PUERTA = 0.6;

export interface CasillaEncontrada {
  columna: number;
  fila: number;
  tipo: string;
  caja: Caja;
}

export class MapaCasillas extends Componente {
  /** Tamaño de cada casilla en píxeles. */
  tamano = 48;
  /** Orden de dibujo (como en los sprites). Por defecto, detrás de casi todo. */
  capa = -1;
  /** Tipos de casilla disponibles: nombre → aspecto y si es sólida. */
  tipos: Record<string, TipoCasilla> = {};
  /** "columna,fila" → nombre del tipo. */
  readonly celdas = new Map<string, string>();

  private get origen() {
    return this.objeto.posicion;
  }

  /** Sube cada vez que cambia una casilla: quien se guarda el mapa «ya preparado» (la vista 3D) sabe que tiene que rehacerlo. */
  version = 0;
  /** Las puertas que no están cerradas del todo: "columna,fila" → cómo están. */
  private readonly puertas = new Map<string, EstadoPuerta>();

  // ───────────────────────── Puertas ─────────────────────────

  /** ¿Es una puerta la casilla que hay ahí? */
  esPuerta(columna: number, fila: number): boolean {
    const tipo = this.obtener(columna, fila);
    return tipo !== null && propio(this.tipos, tipo)?.puerta === true;
  }

  /** Cuánto está abierta la puerta de esa casilla: de 0 (cerrada) a 1 (abierta del todo). */
  apertura(columna: number, fila: number): number {
    return this.puertas.get(`${columna},${fila}`)?.apertura ?? 0;
  }

  /** ¿Se puede pasar ya por esa puerta? */
  abierta(columna: number, fila: number): boolean {
    return this.puertas.size > 0 && this.apertura(columna, fila) >= APERTURA_PARA_PASAR;
  }

  /** Abre (hacia = 1) o cierra (hacia = 0) la puerta de una casilla, poco a poco. Con 0 segundos, de golpe. */
  moverPuerta(columna: number, fila: number, hacia: 0 | 1, segundos = SEGUNDOS_PUERTA): void {
    const clave = `${columna},${fila}`;
    const p = this.puertas.get(clave) ?? { apertura: 0, objetivo: 0, velocidad: 0 };
    p.objetivo = hacia;
    if (segundos <= 0) p.apertura = hacia;
    else p.velocidad = 1 / segundos;
    if (p.apertura === 0 && p.objetivo === 0) this.puertas.delete(clave);
    else this.puertas.set(clave, p);
    this.version++;
  }

  /** ¿Es sólida (para de verdad) la casilla de ese sitio? Una puerta abierta no lo es. */
  solidaEn(columna: number, fila: number, tipo: string): boolean {
    return this.esSolida(tipo) && !this.abierta(columna, fila);
  }

  actualizar(dt: number): void {
    if (!this.puertas.size) return;
    for (const [clave, p] of this.puertas) {
      if (p.apertura === p.objetivo) continue;
      const paso = p.velocidad * dt;
      p.apertura = p.objetivo > p.apertura ? Math.min(p.objetivo, p.apertura + paso) : Math.max(p.objetivo, p.apertura - paso);
      if (p.apertura === 0 && p.objetivo === 0) this.puertas.delete(clave);
    }
  }

  // ───────────────────────── Suelos a distintas alturas ─────────────────────────

  /** ¿Hay algún tipo de casilla con el suelo levantado? (si no, todo lo de las alturas se salta) */
  get tieneRelieve(): boolean {
    for (const nombre in this.tipos) {
      const t = this.tipos[nombre];
      if (!t.solida && ((t.altura ?? 0) > 0 || (t.alturaBaja ?? 0) > 0)) return true;
    }
    return false;
  }

  /** Lo mismo que `tieneRelieve`, guardado: lo actualiza la física en cada paso (para no recorrer los tipos por cada cuerpo). */
  conRelieve = false;

  /** El escalón más alto que se sube andando, en píxeles. */
  get escalon(): number {
    return this.tamano * ESCALON;
  }

  /** Entre qué alturas (en píxeles) va el suelo de un tipo de casilla: [la baja, la alta]. Las sólidas, 0. */
  alturasDe(tipo: string | null): [number, number] {
    const t = tipo ? propio(this.tipos, tipo) : undefined;
    if (!t || t.solida) return [0, 0];
    const tope = this.tamano * ALTURA_MAXIMA_SUELO;
    const alta = Math.min(tope, Math.max(0, t.altura ?? 0));
    if (!t.rampa) return [alta, alta];
    return [Math.min(tope, Math.max(0, t.alturaBaja ?? 0)), alta];
  }

  /** A qué altura está el suelo en un punto del mundo, en píxeles (0 = el suelo de siempre). */
  alturaEn(x: number, y: number): number {
    const c = this.columnaEn(x);
    const f = this.filaEn(y);
    const tipo = this.celdas.get(`${c},${f}`);
    if (!tipo) return 0;
    const t = propio(this.tipos, tipo);
    if (!t || t.solida || (!t.altura && !t.alturaBaja)) return 0;
    const [baja, alta] = this.alturasDe(tipo);
    if (!t.rampa) return alta;
    const u = (x - this.origen.x) / this.tamano - c;
    const v = (y - this.origen.y) / this.tamano - f;
    const cuanto = t.rampa === 'derecha' ? u : t.rampa === 'izquierda' ? 1 - u : t.rampa === 'arriba' ? v : 1 - v;
    return baja + (alta - baja) * Math.min(1, Math.max(0, cuanto));
  }

  /**
   * ¿Es esta casilla un ESCALÓN demasiado alto para quien está a la altura `desde` (píxeles) en
   * el punto (x, y)? Se mira la altura de la casilla en su punto más cercano a quien anda.
   */
  esEscalon(columna: number, fila: number, x: number, y: number, desde: number): boolean {
    const caja = this.cajaDe(columna, fila);
    const px = Math.min(caja.derecha - 0.01, Math.max(caja.izquierda + 0.01, x));
    const py = Math.min(caja.arriba - 0.01, Math.max(caja.abajo + 0.01, y));
    return this.alturaEn(px, py) - desde > this.escalon + 0.01;
  }

  /** La altura del suelo bajo una caja: la más alta de su centro y sus cuatro esquinas (un pelín hacia dentro). */
  alturaBajo(caja: Caja): number {
    const m = 2;
    const x0 = caja.izquierda + m;
    const x1 = caja.derecha - m;
    const y0 = caja.abajo + m;
    const y1 = caja.arriba - m;
    return Math.max(this.alturaEn((x0 + x1) / 2, (y0 + y1) / 2), this.alturaEn(x0, y0), this.alturaEn(x1, y0), this.alturaEn(x0, y1), this.alturaEn(x1, y1));
  }

  // ───────────────────────── Leer y cambiar casillas ─────────────────────────

  obtener(columna: number, fila: number): string | null {
    return this.celdas.get(`${columna},${fila}`) ?? null;
  }

  poner(columna: number, fila: number, tipo: string): void {
    this.celdas.set(`${columna},${fila}`, this.tipoExistente(tipo) ?? tipo);
    this.puertas.delete(`${columna},${fila}`);
    this.version++;
  }

  quitar(columna: number, fila: number): void {
    this.celdas.delete(`${columna},${fila}`);
    this.puertas.delete(`${columna},${fila}`);
    this.version++;
  }

  /** Busca el nombre del tipo sin importar mayúsculas ni tildes. */
  tipoExistente(tipo: string): string | null {
    const n = normalizar(tipo);
    return Object.keys(this.tipos).find((t) => normalizar(t) === n) ?? null;
  }

  /** Columna y fila de la casilla que hay en un punto del mundo. */
  columnaEn(x: number): number {
    return Math.floor((x - this.origen.x) / this.tamano);
  }
  filaEn(y: number): number {
    return Math.floor((y - this.origen.y) / this.tamano);
  }

  /** Centro de una casilla, en coordenadas del mundo. */
  centroDe(columna: number, fila: number): { x: number; y: number } {
    return { x: this.origen.x + (columna + 0.5) * this.tamano, y: this.origen.y + (fila + 0.5) * this.tamano };
  }

  cajaDe(columna: number, fila: number): Caja {
    const x = this.origen.x + columna * this.tamano;
    const y = this.origen.y + fila * this.tamano;
    return { izquierda: x, derecha: x + this.tamano, abajo: y, arriba: y + this.tamano };
  }

  /** Todas las casillas que toca una caja (con un margen opcional). */
  casillasEn(caja: Caja, margen = 0): CasillaEncontrada[] {
    const t = this.tamano;
    const c0 = Math.floor((caja.izquierda - margen - this.origen.x) / t);
    const c1 = Math.floor((caja.derecha + margen - this.origen.x - 1e-6) / t);
    const f0 = Math.floor((caja.abajo - margen - this.origen.y) / t);
    const f1 = Math.floor((caja.arriba + margen - this.origen.y - 1e-6) / t);
    const res: CasillaEncontrada[] = [];
    // Si la caja es enorme (más casillas que celdas ocupadas), es más rápido recorrer las celdas
    if ((c1 - c0 + 1) * (f1 - f0 + 1) > this.celdas.size) {
      for (const [clave, tipo] of this.celdas) {
        const [c, f] = clave.split(',').map(Number);
        if (c >= c0 && c <= c1 && f >= f0 && f <= f1) res.push({ columna: c, fila: f, tipo, caja: this.cajaDe(c, f) });
      }
      return res;
    }
    for (let c = c0; c <= c1; c++) {
      for (let f = f0; f <= f1; f++) {
        const tipo = this.celdas.get(`${c},${f}`);
        if (tipo) res.push({ columna: c, fila: f, tipo, caja: this.cajaDe(c, f) });
      }
    }
    return res;
  }

  esSolida(tipo: string): boolean {
    return propio(this.tipos, tipo)?.solida ?? true;
  }

  /** La caja que rodea todas las casillas (para la cámara y el editor). */
  limites(): Caja | null {
    if (this.celdas.size === 0) return null;
    let c0 = Infinity, c1 = -Infinity, f0 = Infinity, f1 = -Infinity;
    for (const clave of this.celdas.keys()) {
      const [c, f] = clave.split(',').map(Number);
      c0 = Math.min(c0, c); c1 = Math.max(c1, c); f0 = Math.min(f0, f); f1 = Math.max(f1, f);
    }
    const a = this.cajaDe(c0, f0);
    const b = this.cajaDe(c1, f1);
    return { izquierda: a.izquierda, abajo: a.abajo, derecha: b.derecha, arriba: b.arriba };
  }

  // ───────────────────────── Dibujo ─────────────────────────

  /**
   * Dibuja las casillas visibles. `aPantalla` convierte un punto del mundo al
   * sistema de dibujo actual (lo prepara la Escena, con cámara y zoom).
   */
  dibujarVisibles(r: Renderizador, visible: Caja, aPantalla: (x: number, y: number) => { x: number; y: number }): void {
    const t = this.tamano;
    // +1 píxel para que no se vean rayas finas entre casillas al hacer zoom
    const lado = t + 0.75;
    for (const c of this.casillasEn(visible)) {
      const tipo = propio(this.tipos, c.tipo);
      const centro = aPantalla(c.caja.izquierda + t / 2, c.caja.abajo + t / 2);
      // Una puerta que se abre: se va haciendo transparente (abierta del todo, queda su sombra)
      const abre = this.puertas.size ? this.apertura(c.columna, c.fila) : 0;
      if (abre > 0) r.ctx.globalAlpha = 1 - abre * 0.8;
      if (tipo?.imagen) {
        r.imagen(this.objeto.escena!.motor.recursos.imagen(tipo.imagen), centro.x, centro.y, { ancho: lado, alto: lado });
      } else {
        r.ctx.fillStyle = resolverColor(tipo?.color ?? 'gris');
        r.ctx.fillRect(centro.x - lado / 2, centro.y - lado / 2, lado, lado);
      }
      if (abre > 0) r.ctx.globalAlpha = 1;
    }
  }
}
