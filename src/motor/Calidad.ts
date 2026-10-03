/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CALIDAD ADAPTABLE: que el mismo juego vaya bien en un móvil barato y se vea
 * lo mejor posible en un ordenador.
 *
 * Hay tres niveles. Cada uno dice cuánto se gasta en lo que más cuesta:
 *
 *              píxeles del lienzo   partículas   sombras de las luces   filtros caros
 *   alta       hasta 2 por punto    todas        sí                     sí
 *   media      hasta 1,5            el 60 %      sí                     sí
 *   baja       1                    el 35 %      no                     no (bloom, desenfoque, aberración)
 *
 * (Una pantalla de móvil tiene 3 píxeles por cada punto: pintarlos todos es
 * pintar 9 veces más que con 1. Bajar eso es lo que más se nota.)
 *
 * En AUTOMÁTICO se mide lo que tarda cada fotograma: si el juego va a
 * trompicones se baja un nivel, y si va sobrado un buen rato se vuelve a
 * subir. Si al subir vuelve a ir mal, ya no se sube más a ese nivel (para no
 * estar cambiando todo el rato).
 *
 * El LÍMITE DE FOTOGRAMAS (30 por segundo) no cambia cómo se ve: hace que el
 * aparato trabaje la mitad, y gaste menos batería y se caliente menos.
 *
 * Es un solo estado para todo el motor (como las estampas): lo leen el
 * renderizador, las partículas, las luces y los filtros.
 */

export type NivelCalidad = 'baja' | 'media' | 'alta';
export type ModoCalidad = NivelCalidad | 'auto';
export const MODOS_CALIDAD: ModoCalidad[] = ['auto', 'alta', 'media', 'baja'];
const ORDEN: NivelCalidad[] = ['baja', 'media', 'alta'];

export interface AjustesCalidad {
  /** Como mucho, estos píxeles del lienzo por cada punto de la pantalla. */
  resolucion: number;
  /** Por cuánto se multiplican las partículas que se lanzan (de 0 a 1). */
  particulas: number;
  /** ¿Las luces hacen sombras? */
  sombrasDeLuz: boolean;
  /** ¿Se hacen los filtros de pantalla que más cuestan (bloom, desenfoque, aberración)? */
  filtrosCaros: boolean;
}

export const AJUSTES_CALIDAD: Record<NivelCalidad, AjustesCalidad> = {
  alta: { resolucion: 2, particulas: 1, sombrasDeLuz: true, filtrosCaros: true },
  media: { resolucion: 1.5, particulas: 0.6, sombrasDeLuz: true, filtrosCaros: true },
  baja: { resolucion: 1, particulas: 0.35, sombrasDeLuz: false, filtrosCaros: false },
};

/** Cada cuánto se decide en automático (segundos), y cuántas veces seguidas tiene que ir sobrado para subir. */
export const VENTANA_CALIDAD = 1.5;
export const VENTANAS_PARA_SUBIR = 4;
/** Tras subir un nivel, si en estas mediciones vuelve a ir mal, ese nivel no vale para este aparato. */
export const VENTANAS_DE_PRUEBA = 8;
/** Va «a trompicones» si un fotograma tarda este tanto más de lo que debería. */
export const HOLGURA_LENTO = 1.3;
/** Límite de fotogramas por segundo: entre estos valores (0 = sin límite). */
export const FPS_MINIMO = 15;
export const FPS_MAXIMO = 240;

export class Calidad {
  private _modo: ModoCalidad = 'alta';
  private _nivel: NivelCalidad = 'alta';
  /** En automático, lo más alto a lo que se puede subir (baja si subir ha ido mal). */
  private techo: NivelCalidad = 'alta';
  private tiempo = 0;
  private fotogramas = 0;
  private sobrado = 0;
  /** Cuántas veces se ha medido desde la última subida (si enseguida va mal, ese nivel no vale para este aparato). */
  private desdeLaSubida = Infinity;
  /** Fotogramas por segundo como mucho (0 = los que dé la pantalla). */
  maximoFps = 0;
  /** Avisa cuando cambia el nivel (el renderizador tiene que cambiar el tamaño del lienzo). */
  alCambiar: (nivel: NivelCalidad) => void = () => {};

  get modo(): ModoCalidad {
    return this._modo;
  }
  set modo(m: ModoCalidad) {
    this._modo = m;
    this.techo = 'alta';
    this.sobrado = 0;
    this.tiempo = this.fotogramas = 0;
    this.desdeLaSubida = Infinity;
    // En automático se empieza por arriba: si el aparato no puede, se nota en un segundo
    this.poner(m === 'auto' ? 'alta' : m);
  }

  get nivel(): NivelCalidad {
    return this._nivel;
  }

  get ajustes(): AjustesCalidad {
    return AJUSTES_CALIDAD[this._nivel];
  }

  private poner(n: NivelCalidad): void {
    if (n === this._nivel) return;
    this._nivel = n;
    this.alCambiar(n);
  }

  /** Lo que debería tardar un fotograma (segundos): el del límite, o el de una pantalla normal de 60. */
  get intervaloObjetivo(): number {
    return this.maximoFps > 0 ? 1 / this.maximoFps : 1 / 60;
  }

  /**
   * Se llama en cada fotograma con lo que ha tardado (segundos, de verdad). En automático,
   * decide si hay que bajar o subir el nivel. Devuelve el nivel.
   */
  medir(dtReal: number): NivelCalidad {
    if (this._modo !== 'auto' || !(dtReal > 0)) return this._nivel;
    // Un parón largo (cambiar de pestaña, cargar algo) no es que el juego vaya lento
    if (dtReal > 0.25) return this._nivel;
    this.tiempo += dtReal;
    this.fotogramas++;
    if (this.tiempo < VENTANA_CALIDAD) return this._nivel;
    const medio = this.tiempo / this.fotogramas;
    this.tiempo = this.fotogramas = 0;
    const i = ORDEN.indexOf(this._nivel);
    this.desdeLaSubida++;
    if (medio > this.intervaloObjetivo * HOLGURA_LENTO) {
      // Va a trompicones: un nivel menos. Si hace poco que se subió a este, a este ya no se vuelve
      if (this.desdeLaSubida <= VENTANAS_DE_PRUEBA) this.techo = ORDEN[Math.max(0, i - 1)];
      this.sobrado = 0;
      this.desdeLaSubida = Infinity;
      if (i > 0) this.poner(ORDEN[i - 1]);
    } else if (medio <= this.intervaloObjetivo * 1.08) {
      if (i < ORDEN.indexOf(this.techo) && ++this.sobrado >= VENTANAS_PARA_SUBIR) {
        this.sobrado = 0;
        this.desdeLaSubida = 0;
        this.poner(ORDEN[i + 1]);
      }
    } else this.sobrado = 0;
    return this._nivel;
  }

  /** ¿Toca saltarse este fotograma para no pasar del límite? `transcurrido`: milisegundos desde el anterior. */
  saltar(transcurrido: number): boolean {
    // (2 ms de margen: el navegador no llama exactamente cada 16,67)
    return this.maximoFps > 0 && transcurrido < 1000 / this.maximoFps - 2;
  }

  /** Vuelve a lo de siempre (al parar el juego). */
  reiniciar(): void {
    this.maximoFps = 0;
    this.modo = 'alta';
  }
}

/** La calidad de ahora (un solo estado para todo el motor). */
export const calidad = new Calidad();
