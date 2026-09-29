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

export interface TipoCasilla {
  imagen?: string;
  color?: string;
  /** verdadero = pared/suelo; falso = fantasma (se atraviesa pero se detecta). */
  solida: boolean;
  /** Si es sólida: solo para a lo que cae encima (se atraviesa desde abajo y los lados). */
  soloDesdeArriba?: boolean;
}

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

  // ───────────────────────── Leer y cambiar casillas ─────────────────────────

  obtener(columna: number, fila: number): string | null {
    return this.celdas.get(`${columna},${fila}`) ?? null;
  }

  poner(columna: number, fila: number, tipo: string): void {
    this.celdas.set(`${columna},${fila}`, this.tipoExistente(tipo) ?? tipo);
  }

  quitar(columna: number, fila: number): void {
    this.celdas.delete(`${columna},${fila}`);
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
    return this.tipos[tipo]?.solida ?? true;
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
      const tipo = this.tipos[c.tipo];
      const centro = aPantalla(c.caja.izquierda + t / 2, c.caja.abajo + t / 2);
      if (tipo?.imagen) {
        r.imagen(this.objeto.escena!.motor.recursos.imagen(tipo.imagen), centro.x, centro.y, { ancho: lado, alto: lado });
      } else {
        r.ctx.fillStyle = resolverColor(tipo?.color ?? 'gris');
        r.ctx.fillRect(centro.x - lado / 2, centro.y - lado / 2, lado, lado);
      }
    }
  }
}
