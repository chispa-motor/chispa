/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * GEOMETRÍA DEL EDITOR DE ESCENAS (sin dibujar nada, para poder probarla).
 *
 * - CamaraEditor: la "cámara" con la que miras la escena mientras la editas.
 *   No es la cámara del juego: puedes alejarte, acercarte y moverte libremente.
 * - cajaDe(): el rectángulo que ocupa un objeto (para seleccionarlo con el ratón).
 * - marcoDelJuego(): el rectángulo del mundo que verá el jugador al empezar.
 *
 * Recuerda: en Chispa la Y crece hacia ARRIBA; en la pantalla crece hacia abajo.
 */
import type { DefEscena, DefObjeto, DefProyecto } from '../../proyecto/formato';

export interface Caja {
  izquierda: number;
  derecha: number;
  abajo: number;
  arriba: number;
}

export class CamaraEditor {
  /** Punto del mundo que está en el centro de la vista. */
  x = 480;
  y = 270;
  zoom = 1;
  /** Tamaño de la vista en píxeles de pantalla. */
  ancho = 800;
  alto = 600;

  aPantalla(x: number, y: number): { x: number; y: number } {
    return { x: this.ancho / 2 + (x - this.x) * this.zoom, y: this.alto / 2 - (y - this.y) * this.zoom };
  }

  aMundo(px: number, py: number): { x: number; y: number } {
    return { x: (px - this.ancho / 2) / this.zoom + this.x, y: (this.alto / 2 - py) / this.zoom + this.y };
  }

  /** Acerca o aleja manteniendo quieto el punto que hay bajo el ratón. */
  zoomEn(px: number, py: number, factor: number): void {
    const antes = this.aMundo(px, py);
    this.zoom = Math.min(8, Math.max(0.1, this.zoom * factor));
    const despues = this.aMundo(px, py);
    this.x += antes.x - despues.x;
    this.y += antes.y - despues.y;
  }

  /** Mueve la vista (al arrastrar con el botón central o con espacio). */
  desplazar(dxPantalla: number, dyPantalla: number): void {
    this.x -= dxPantalla / this.zoom;
    this.y += dyPantalla / this.zoom;
  }

  /** Coloca la vista para que quepa una caja entera, con un poco de margen. */
  encuadrar(c: Caja): void {
    this.x = (c.izquierda + c.derecha) / 2;
    this.y = (c.abajo + c.arriba) / 2;
    const z = Math.min(this.ancho / Math.max(1, c.derecha - c.izquierda), this.alto / Math.max(1, c.arriba - c.abajo));
    this.zoom = Math.min(4, Math.max(0.1, z * 0.85));
  }
}

/** El rectángulo del mundo que se ve al empezar el juego (según la cámara de la escena). */
export function marcoDelJuego(proyecto: DefProyecto, escena: DefEscena): Caja & { zoom: number } {
  const zoom = escena.camara?.zoom ?? 1;
  const cx = escena.camara?.x ?? proyecto.ancho / 2;
  const cy = escena.camara?.y ?? proyecto.alto / 2;
  const mw = proyecto.ancho / 2 / zoom;
  const mh = proyecto.alto / 2 / zoom;
  return { izquierda: cx - mw, derecha: cx + mw, abajo: cy - mh, arriba: cy + mh, zoom };
}

/**
 * Posición en el MUNDO donde se dibuja un objeto en el editor.
 * Los objetos `fijo` (interfaz) guardan su posición en la pantalla; en el
 * editor los enseñamos dentro del marco del juego.
 */
export function posicionEnEditor(def: DefObjeto, marco: Caja & { zoom: number }): { x: number; y: number } {
  if (def.sprite?.fijo) return { x: marco.izquierda + (def.x ?? 0) / marco.zoom, y: marco.abajo + (def.y ?? 0) / marco.zoom };
  return { x: def.x ?? 0, y: def.y ?? 0 };
}

/** Lo contrario: de una posición del mundo (en el editor) a la que se guarda en el objeto. */
export function posicionGuardada(def: DefObjeto, marco: Caja & { zoom: number }, x: number, y: number): { x: number; y: number } {
  if (def.sprite?.fijo) return { x: (x - marco.izquierda) * marco.zoom, y: (y - marco.abajo) * marco.zoom };
  return { x, y };
}

/** Tamaño por defecto de lo que no tiene dibujo (objetos vacíos). */
export const TAMANO_VACIO = 28;

/** Rectángulo que ocupa un objeto en el mundo del editor. */
export function cajaDe(def: DefObjeto, marco: Caja & { zoom: number }): Caja {
  const p = posicionEnEditor(def, marco);
  if (def.mapa) {
    const t = def.mapa.tamano;
    const claves = Object.keys(def.mapa.celdas);
    if (claves.length === 0) return { izquierda: p.x, derecha: p.x + t, abajo: p.y, arriba: p.y + t };
    let c0 = Infinity, c1 = -Infinity, f0 = Infinity, f1 = -Infinity;
    for (const k of claves) {
      const [c, f] = k.split(',').map(Number);
      c0 = Math.min(c0, c); c1 = Math.max(c1, c); f0 = Math.min(f0, f); f1 = Math.max(f1, f);
    }
    return { izquierda: p.x + c0 * t, derecha: p.x + (c1 + 1) * t, abajo: p.y + f0 * t, arriba: p.y + (f1 + 1) * t };
  }
  const escala = Math.abs(def.escala ?? 1) / (def.sprite?.fijo ? marco.zoom : 1);
  let ancho = TAMANO_VACIO;
  let alto = TAMANO_VACIO;
  let dx = 0;
  if (def.sprite) {
    ancho = (def.sprite.ancho ?? 64) * escala;
    alto = (def.sprite.alto ?? 64) * escala;
    // Un texto alineado a la izquierda EMPIEZA en su posición; a la derecha, TERMINA ahí
    if (def.sprite.forma === 'texto' && !def.sprite.imagen) {
      if (def.sprite.alinear === 'izquierda') dx = ancho / 2;
      else if (def.sprite.alinear === 'derecha') dx = -ancho / 2;
    }
  } else if (def.colision) {
    ancho = (def.colision.ancho ?? 64) * escala;
    alto = (def.colision.alto ?? 64) * escala;
  }
  return { izquierda: p.x + dx - ancho / 2, derecha: p.x + dx + ancho / 2, abajo: p.y - alto / 2, arriba: p.y + alto / 2 };
}

export function dentro(c: Caja, x: number, y: number, margen = 0): boolean {
  return x >= c.izquierda - margen && x <= c.derecha + margen && y >= c.abajo - margen && y <= c.arriba + margen;
}

/** Orden de dibujo (de atrás hacia delante): capa, y la interfaz siempre encima. */
export function ordenDeDibujo(def: DefObjeto): number {
  if (def.mapa && !def.sprite) return def.mapa.capa ?? -1;
  return (def.sprite?.fijo ? 1_000_000 : 0) + (def.sprite?.capa ?? 0);
}

/**
 * El objeto que hay bajo el ratón: el que se dibuja más ARRIBA.
 * Los mapas solo se eligen si se hace clic en una casilla pintada (o en su
 * esquina, si está vacío), para que no "tapen" lo que hay encima.
 */
export function objetoEn(objetos: DefObjeto[], marco: Caja & { zoom: number }, x: number, y: number, margen = 0): number | null {
  const indices = objetos.map((_, i) => i).sort((a, b) => ordenDeDibujo(objetos[a]) - ordenDeDibujo(objetos[b]) || a - b);
  for (let k = indices.length - 1; k >= 0; k--) {
    const i = indices[k];
    const def = objetos[i];
    if (def.mapa) {
      const t = def.mapa.tamano;
      const c = Math.floor((x - (def.x ?? 0)) / t);
      const f = Math.floor((y - (def.y ?? 0)) / t);
      const vacio = Object.keys(def.mapa.celdas).length === 0;
      if (def.mapa.celdas[`${c},${f}`] || (vacio && c === 0 && f === 0)) return i;
      continue;
    }
    if (dentro(cajaDe(def, marco), x, y, margen)) return i;
  }
  return null;
}

/** Redondea a la cuadrícula (para el imán). */
export function ajustar(valor: number, paso: number): number {
  return paso > 0 ? Math.round(valor / paso) * paso : Math.round(valor);
}

/** Paso de la cuadrícula que se ve bien con este zoom (ni muy apretada ni muy separada). */
export function pasoDeCuadricula(base: number, zoom: number): number {
  let paso = base;
  while (paso * zoom < 12) paso *= 2;
  while (paso * zoom > 120 && paso > 1) paso /= 2;
  return paso;
}
