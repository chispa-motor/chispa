/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * GESTOS CON LOS DEDOS en la escena del editor.
 *
 * El navegador solo dice «este dedo ha bajado, se ha movido, ha subido».
 * Aquí se convierte eso en lo que la persona quiere hacer:
 *
 *  - UN dedo: lo mismo que el ratón (tocar para seleccionar, arrastrar para mover).
 *  - DOS dedos: mover la vista (los dos a la vez) y acercarla o alejarla (pellizcar).
 *  - Un dedo QUIETO un rato: pulsación larga (el menú del objeto).
 *
 * No toca la página ni el lienzo: recibe los dedos y avisa. Así se puede
 * probar sin navegador.
 */

/** Cuánto hay que dejar el dedo quieto para la pulsación larga (milisegundos). */
export const ESPERA_PULSACION_LARGA = 550;
/** Si el dedo se mueve más que esto (píxeles), ya no es un toque quieto: es arrastrar. */
export const HOLGURA_DEDO = 10;

export interface AvisosDeGestos {
  /** Un dedo lleva un rato quieto en ese punto. */
  pulsacionLarga(x: number, y: number): void;
  /** Ha bajado el segundo dedo: lo que estuviera haciendo el primero se deja. */
  empiezanDosDedos(): void;
  /**
   * Los dos dedos se han movido: la vista se desplaza (dx, dy) y se acerca `factor` veces
   * (1 = igual) alrededor del punto (cx, cy), que es el centro de los dos dedos.
   */
  dosDedos(dx: number, dy: number, factor: number, cx: number, cy: number): void;
}

interface Dedo {
  x: number;
  y: number;
  /** Dónde bajó (para saber si se ha movido). */
  x0: number;
  y0: number;
}

export class Gestos {
  private dedos = new Map<number, Dedo>();
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  /** Ya ha saltado la pulsación larga con este dedo: lo que haga hasta levantarlo no cuenta. */
  private larga = false;
  /** Ha habido dos dedos: hasta que se levanten todos, el que quede no arrastra nada. */
  private huboDos = false;

  constructor(private avisos: AvisosDeGestos) {}

  get cuantos(): number {
    return this.dedos.size;
  }

  /** ¿Lo que haga ahora el dedo hay que ignorarlo? (tras una pulsación larga o un gesto de dos dedos) */
  get ignorarUno(): boolean {
    return this.larga || this.huboDos;
  }

  private quitarEspera(): void {
    if (this.temporizador !== null) clearTimeout(this.temporizador);
    this.temporizador = null;
  }

  /**
   * Baja un dedo. Devuelve qué es: 'uno' (el primero: se trata como el ratón),
   * 'dos' (el segundo: empieza el gesto de la vista) o 'sobra' (un tercero: no hace nada).
   */
  bajar(id: number, x: number, y: number): 'uno' | 'dos' | 'sobra' {
    if (this.dedos.size >= 2 && !this.dedos.has(id)) return 'sobra';
    this.dedos.set(id, { x, y, x0: x, y0: y });
    if (this.dedos.size === 1) {
      this.larga = false;
      this.huboDos = false;
      this.quitarEspera();
      this.temporizador = setTimeout(() => {
        this.temporizador = null;
        const d = this.dedos.get(id);
        if (!d || this.dedos.size !== 1) return;
        this.larga = true;
        this.avisos.pulsacionLarga(d.x, d.y);
      }, ESPERA_PULSACION_LARGA);
      return 'uno';
    }
    this.quitarEspera();
    this.huboDos = true;
    this.avisos.empiezanDosDedos();
    return 'dos';
  }

  /** Se mueve un dedo. Devuelve 'uno' (seguir como el ratón), 'dos' (ya se ha avisado del gesto) o 'nada'. */
  mover(id: number, x: number, y: number): 'uno' | 'dos' | 'nada' {
    const d = this.dedos.get(id);
    if (!d) return 'nada';
    if (this.dedos.size === 2) {
      const [a, b] = [...this.dedos.values()];
      const antes = { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, distancia: Math.hypot(a.x - b.x, a.y - b.y) };
      d.x = x;
      d.y = y;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const distancia = Math.hypot(a.x - b.x, a.y - b.y);
      // Con los dedos casi juntos la cuenta se dispara: entonces solo se mueve
      const factor = antes.distancia > 20 && distancia > 20 ? distancia / antes.distancia : 1;
      this.avisos.dosDedos(cx - antes.cx, cy - antes.cy, factor, cx, cy);
      return 'dos';
    }
    d.x = x;
    d.y = y;
    if (Math.hypot(x - d.x0, y - d.y0) > HOLGURA_DEDO) this.quitarEspera();
    return this.ignorarUno ? 'nada' : 'uno';
  }

  /** ¿Ese dedo se ha movido de donde bajó? (si no, ha sido un toque) */
  seHaMovido(id: number): boolean {
    const d = this.dedos.get(id);
    return !!d && Math.hypot(d.x - d.x0, d.y - d.y0) > HOLGURA_DEDO;
  }

  /** Sube un dedo (o el navegador lo cancela). */
  subir(id: number): void {
    this.dedos.delete(id);
    this.quitarEspera();
    // «ignorarUno» no se apaga aquí sino al bajar el siguiente dedo: así quien pregunte al soltar aún lo sabe
  }

  /** Se olvida de todo (al cambiar de escena, al perder el foco...). */
  soltarTodo(): void {
    this.dedos.clear();
    this.quitarEspera();
    this.larga = false;
    this.huboDos = false;
  }
}
