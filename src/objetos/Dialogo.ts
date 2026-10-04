/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CAJA DE DIÁLOGO: un texto abajo de la pantalla que aparece letra a letra,
 * con el nombre de quien habla y, si se quiere, opciones para elegir.
 *
 *   dialogo("Hola")                         → espera a que se pulse espacio, intro o clic
 *   dialogo("Ana", "¿Me ayudas?")           → con el nombre de quien habla
 *   dialogo("Ana", "¿Me ayudas?", ["Sí", "No"]) → devuelve la opción elegida
 *
 * DECISIÓN: mientras hay un diálogo, el JUEGO SE PARA (ni scripts, ni física).
 * Así nadie tiene que acordarse de parar al jugador mientras habla, y la
 * tecla que pasa el diálogo no hace saltar al personaje a la vez.
 * Los diálogos que se piden a la vez se enseñan uno detrás de otro.
 */
import type { Entrada } from '../motor/Entrada';
import type { Renderizador } from '../motor/Renderizador';

/** Letras por segundo. */
export const VELOCIDAD_LETRAS = 45;

export class CajaDialogo {
  /** Cuántas letras se ven ya. */
  letras = 0;
  /** La opción marcada (si hay opciones). */
  marcada = 0;
  terminado = false;
  /** Lo que se ha elegido (o null si no había opciones). */
  elegida: string | null = null;
  /** Dónde está dibujada cada opción (para elegirla con el ratón o el dedo). */
  private zonas: { x: number; y: number; ancho: number; alto: number }[] = [];
  private tiempo = 0;

  constructor(
    readonly texto: string,
    readonly quien: string | null = null,
    readonly opciones: string[] = [],
  ) {}

  get completo(): boolean {
    return this.letras >= this.texto.length;
  }

  /** Avanza las letras y mira las teclas. `raton`: dónde está el ratón en la pantalla (Y hacia abajo). */
  actualizar(dt: number, entrada: Entrada, raton: { x: number; y: number }): void {
    this.tiempo += dt;
    if (!this.completo) this.letras = Math.min(this.texto.length, this.letras + VELOCIDAD_LETRAS * dt);
    // Con el mando también, aunque no esté haciendo de teclado (mando.comoTeclado = falso): A acepta y la cruceta o la palanca eligen
    const mando = entrada.mando.pulsados;
    const aceptar = entrada.sePulso('espacio') || entrada.sePulso('enter') || entrada.ratonSePulso() || (!entrada.mandoHaceDeTeclado && (mando.has('a') || mando.has('start')));
    if (this.opciones.length && this.completo) {
      const n = this.opciones.length;
      const sinTeclado = !entrada.mandoHaceDeTeclado;
      if (entrada.sePulso('arriba') || entrada.sePulso('w') || (sinTeclado && mando.has('arriba'))) this.marcada = (this.marcada + n - 1) % n;
      if (entrada.sePulso('abajo') || entrada.sePulso('s') || (sinTeclado && mando.has('abajo'))) this.marcada = (this.marcada + 1) % n;
      for (let i = 0; i < Math.min(n, 9); i++) if (entrada.sePulso(String(i + 1))) return this.elegir(i);
      const encima = this.zonas.findIndex((z) => raton.x >= z.x && raton.x <= z.x + z.ancho && raton.y >= z.y && raton.y <= z.y + z.alto);
      if (encima >= 0) this.marcada = encima;
    }
    if (!aceptar) return;
    // La primera pulsación enseña todo el texto de golpe; la siguiente pasa
    if (!this.completo) this.letras = this.texto.length;
    else if (this.opciones.length) this.elegir(this.marcada);
    else this.terminado = true;
  }

  private elegir(i: number): void {
    this.marcada = i;
    this.elegida = this.opciones[i];
    this.terminado = true;
  }

  dibujar(r: Renderizador): void {
    const ctx = r.ctx;
    const margen = 20;
    const tamano = Math.max(16, Math.round(r.alto / 28));
    const lineasTexto = partirEnLineas(this.texto.slice(0, Math.floor(this.letras)), r.ancho - margen * 4, (t) => medir(r, t, tamano));
    const alto = margen * 2 + (Math.max(2, lineasTexto.length) + this.opciones.length) * tamano * 1.35;
    const x = margen;
    const y = r.alto - alto - margen;
    ctx.save();
    ctx.globalAlpha = 0.9;
    r.rectangulo(x, y, r.ancho - margen * 2, alto, '#101422', { relleno: true });
    ctx.globalAlpha = 1;
    r.rectangulo(x, y, r.ancho - margen * 2, alto, '#e8ecff', { relleno: false, grosor: 3 });
    if (this.quien) {
      const ancho = medir(r, this.quien, tamano) + margen * 1.5;
      r.rectangulo(x + margen, y - tamano * 0.9, ancho, tamano * 1.6, '#f1c40f', { relleno: true });
      r.texto(this.quien, x + margen * 1.75, y - tamano * 0.6, { color: '#101422', tamano, negrita: true });
    }
    lineasTexto.forEach((l, i) => r.texto(l, x + margen, y + margen + i * tamano * 1.35, { color: 'blanco', tamano }));
    this.zonas = [];
    if (this.completo) {
      const arriba = y + margen + Math.max(2, lineasTexto.length) * tamano * 1.35;
      this.opciones.forEach((o, i) => {
        const oy = arriba + i * tamano * 1.35;
        this.zonas.push({ x: x + margen, y: oy, ancho: r.ancho - margen * 6, alto: tamano * 1.3 });
        const marcada = i === this.marcada;
        r.texto(`${marcada ? '▶ ' : '   '}${i + 1}. ${o}`, x + margen * 2, oy, { color: marcada ? '#f1c40f' : '#c0c7d1', tamano, negrita: marcada });
      });
      // Un triángulo que parpadea: "pulsa para seguir"
      if (!this.opciones.length && Math.floor(this.tiempo * 2) % 2 === 0) r.texto('▼', r.ancho - margen * 3, y + alto - margen - tamano, { color: '#f1c40f', tamano });
    }
    ctx.restore();
  }
}

function medir(r: Renderizador, texto: string, tamano: number): number {
  r.ctx.font = `${tamano}px system-ui, "Segoe UI", sans-serif`;
  return r.ctx.measureText(texto).width;
}

/** Parte un texto en líneas que quepan en `ancho` (sin cortar palabras si se puede). Respeta los saltos de línea. */
export function partirEnLineas(texto: string, ancho: number, medirTexto: (t: string) => number): string[] {
  const lineas: string[] = [];
  for (const parrafo of texto.split('\n')) {
    let actual = '';
    for (const palabra of parrafo.split(' ')) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (actual && medirTexto(prueba) > ancho) {
        lineas.push(actual);
        actual = palabra;
      } else actual = prueba;
    }
    lineas.push(actual);
  }
  return lineas;
}
