/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * JUNTAS FÍSICAS: unir dos objetos (o un objeto y un punto del mundo).
 *
 *   - CUERDA: no deja que se separen más de su largo. Más cerca, está floja
 *     y no hace nada. Sirve para péndulos, lianas, ganchos y cadenas.
 *   - MUELLE: tira hacia su largo de reposo, más fuerte cuanto más lejos
 *     (y empuja si se acercan de más). Sirve para gomas, amortiguadores y
 *     cosas que se bambolean.
 *   - BISAGRA: la distancia al eje es siempre la misma, y el objeto gira
 *     con él. Sirve para puertas, palancas, balancines y aspas.
 *
 * Cómo se resuelven: después de la física de cada fotograma, las cuerdas y
 * las bisagras COLOCAN los objetos donde tienen que estar (varias pasadas,
 * para que una cadena de cuerdas quede bien) y les quitan la velocidad que
 * los separaba. Los muelles cambian la velocidad, como una fuerza.
 * Cada objeto se mueve según lo que pesa: uno estático (o sin Física) no se
 * mueve, es el otro el que cuelga de él.
 */
import type { Renderizador } from '../motor/Renderizador';
import { resolverColor } from '../motor/Color';
import type { ObjetoJuego } from './ObjetoJuego';
import { Fisica } from './componentes/Fisica';

export const TIPOS_JUNTA = ['cuerda', 'muelle', 'bisagra'] as const;
export type TipoJunta = (typeof TIPOS_JUNTA)[number];

export interface Junta {
  tipo: TipoJunta;
  a: ObjetoJuego;
  /** El otro objeto, o null si está sujeta a un punto fijo del mundo. */
  b: ObjetoJuego | null;
  /** El punto fijo (si b es null). */
  punto: { x: number; y: number };
  largo: number;
  /** Solo en los muelles: lo fuerte que tira. */
  rigidez: number;
  color: string;
  /** Solo en las bisagras: el ángulo al eje y el giro del objeto cuando se puso. */
  anguloInicial: number;
  rotacionInicial: number;
}

/** Como mucho, estas juntas a la vez. */
export const MAXIMO_JUNTAS = 500;
/** Rigidez de un muelle si no se dice, y la mayor que aguanta sin volverse loco. */
export const RIGIDEZ_NORMAL = 60;
export const RIGIDEZ_MAXIMA = 1500;

export class Juntas {
  lista: Junta[] = [];
  /** ¿Se dibujan? (la cuerda como una línea, el muelle en zigzag, la bisagra con su eje) */
  visibles = true;

  /** Une `a` con `b` (un objeto o un punto). Si ya había una junta de ese tipo entre los dos, la cambia. */
  agregar(tipo: TipoJunta, a: ObjetoJuego, b: ObjetoJuego | { x: number; y: number }, largo: number | null, rigidez = RIGIDEZ_NORMAL, color = 'blanco'): Junta | null {
    const objeto = 'posicion' in b ? b : null;
    const punto = objeto ? { x: 0, y: 0 } : { x: (b as { x: number }).x, y: (b as { y: number }).y };
    const fin = objeto ? objeto.posicion : punto;
    const dx = a.posicion.x - fin.x;
    const dy = a.posicion.y - fin.y;
    const junta: Junta = {
      tipo, a, b: objeto, punto,
      largo: largo ?? Math.hypot(dx, dy),
      rigidez, color,
      anguloInicial: Math.atan2(dy, dx),
      rotacionInicial: a.transformacion.rotacion,
    };
    const igual = this.lista.findIndex((j) => j.tipo === tipo && j.a === a && j.b === objeto && (objeto || (j.punto.x === punto.x && j.punto.y === punto.y)));
    if (igual >= 0) this.lista[igual] = junta;
    else if (this.lista.length >= MAXIMO_JUNTAS) return null;
    else this.lista.push(junta);
    return junta;
  }

  /** Quita las juntas de un objeto (todas, o solo las que lo unen con `otro`). Devuelve cuántas. */
  quitar(o: ObjetoJuego, otro?: ObjetoJuego): number {
    const antes = this.lista.length;
    this.lista = this.lista.filter((j) => !((j.a === o || j.b === o) && (!otro || j.a === otro || j.b === otro)));
    return antes - this.lista.length;
  }

  /** Las juntas de un objeto. */
  de(o: ObjetoJuego): Junta[] {
    return this.lista.filter((j) => j.a === o || j.b === o);
  }

  vaciar(): void {
    this.lista = [];
    this.visibles = true;
  }

  /** Se llama después de la física de cada fotograma. `sujeto` dice si un objeto no se puede mover ahora (lo lleva el ratón). */
  actualizar(dt: number, sujeto: (o: ObjetoJuego) => boolean = () => false): void {
    if (!this.lista.length) return;
    if (this.lista.some((j) => j.a.destruido || j.b?.destruido)) this.lista = this.lista.filter((j) => !j.a.destruido && !j.b?.destruido);
    if (dt <= 0) return;

    /** Lo fácil que es mover un objeto: 1/masa, o 0 si no se mueve (estático, sin Física, o en la mano). */
    const movilidad = (o: ObjetoJuego | null): [number, Fisica | null] => {
      const f = o?.obtener(Fisica) ?? null;
      if (!o || !f || f.estatico || !f.activo || sujeto(o)) return [0, f];
      return [1 / Math.max(0.001, f.masa), f];
    };

    for (let pasada = 0; pasada < 4; pasada++) {
      for (const j of this.lista) {
        // Los muelles son una fuerza: una vez por fotograma
        if (j.tipo === 'muelle' && pasada > 0) continue;
        const [wa, fa] = movilidad(j.a);
        const [wb, fb] = movilidad(j.b);
        const w = wa + wb;
        if (w === 0) continue;
        const pa = j.a.posicion;
        const pb = j.b ? j.b.posicion : j.punto;
        let dx = pb.x - pa.x;
        let dy = pb.y - pa.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 1e-6) {
          // Uno encima del otro: se separan hacia abajo (como si colgara)
          dx = 0;
          dy = 1;
          dist = 1e-6;
        }
        const nx = dx / dist;
        const ny = dy / dist;
        const falta = dist - j.largo;
        // La velocidad con la que se separan (positiva) o se acercan (negativa)
        const vax = wa ? fa!.velocidad.x : 0;
        const vay = wa ? fa!.velocidad.y : 0;
        const vbx = wb ? fb!.velocidad.x : 0;
        const vby = wb ? fb!.velocidad.y : 0;
        const separa = (vbx - vax) * nx + (vby - vay) * ny;

        if (j.tipo === 'muelle') {
          const k = Math.min(RIGIDEZ_MAXIMA, Math.max(0, j.rigidez));
          // Un poco de freno, para que no se quede botando para siempre
          const fuerza = (k * falta + 2 * Math.sqrt(k) * 0.12 * separa) * dt;
          if (wa) {
            fa!.velocidad.x += nx * fuerza * (wa / w);
            fa!.velocidad.y += ny * fuerza * (wa / w);
          }
          if (wb) {
            fb!.velocidad.x -= nx * fuerza * (wb / w);
            fb!.velocidad.y -= ny * fuerza * (wb / w);
          }
          continue;
        }
        // Una cuerda floja no hace nada
        if (j.tipo === 'cuerda' && falta <= 0) continue;
        if (wa) {
          pa.x += nx * falta * (wa / w);
          pa.y += ny * falta * (wa / w);
        }
        if (wb && j.b) {
          j.b.posicion.x -= nx * falta * (wb / w);
          j.b.posicion.y -= ny * falta * (wb / w);
        }
        // Se quita la velocidad a lo largo de la junta (la cuerda, solo la que los separa)
        if (j.tipo === 'bisagra' || separa > 0) {
          if (wa) {
            fa!.velocidad.x += nx * separa * (wa / w);
            fa!.velocidad.y += ny * separa * (wa / w);
          }
          if (wb) {
            fb!.velocidad.x -= nx * separa * (wb / w);
            fb!.velocidad.y -= ny * separa * (wb / w);
          }
        }
      }
    }

    // Lo que cuelga de una bisagra gira con ella
    for (const j of this.lista) {
      if (j.tipo !== 'bisagra') continue;
      const eje = j.b ? j.b.posicion : j.punto;
      const angulo = Math.atan2(j.a.posicion.y - eje.y, j.a.posicion.x - eje.x);
      j.a.transformacion.rotacion = j.rotacionInicial + ((angulo - j.anguloInicial) * 180) / Math.PI;
    }
  }

  /** Las dibuja (dentro de la cámara): la cuerda es una línea, el muelle un zigzag y la bisagra una barra con su eje. */
  dibujar(r: Renderizador, aLocal: (x: number, y: number) => { x: number; y: number }): void {
    if (!this.visibles || !this.lista.length) return;
    const ctx = r.ctx;
    for (const j of this.lista) {
      if (j.a.destruido || j.b?.destruido) continue;
      const fin = j.b ? j.b.posicion : j.punto;
      const a = aLocal(j.a.posicion.x, j.a.posicion.y);
      const b = aLocal(fin.x, fin.y);
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle = resolverColor(j.color);
      ctx.lineWidth = j.tipo === 'bisagra' ? 4 : 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      if (j.tipo === 'muelle') {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const largo = Math.hypot(dx, dy) || 1;
        const vueltas = 10;
        for (let i = 1; i < vueltas; i++) {
          const t = i / vueltas;
          const lado = (i % 2 === 0 ? 1 : -1) * 7;
          ctx.lineTo(a.x + dx * t + (-dy / largo) * lado, a.y + dy * t + (dx / largo) * lado);
        }
      }
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (j.tipo === 'bisagra') {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
