/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * TUTORIAL GUIADO: «¿Hacemos tu primer juego?».
 *
 * Va paso a paso DENTRO del propio editor: oscurece un poco todo menos el
 * sitio donde hay que hacer clic, y una burbuja explica qué hacer. No bloquea
 * nada (se puede hacer clic en cualquier sitio) y avanza solo en cuanto el
 * paso está hecho. Se puede saltar en cualquier momento y volver a abrir
 * desde Ayuda.
 *
 * DECISIÓN: se comprueba cada 200 ms si el paso está hecho y dónde está lo que
 * hay que resaltar. Es más sencillo y más robusto que escuchar cada clic: el
 * editor redibuja paneles enteros y los botones cambian a menudo.
 */
import { h } from '../interfaz/dom';
import { PASOS_TUTORIAL, type ContextoTutorial, type Memoria, type PasoTutorial } from './pasos';

export const CLAVE_TUTORIAL_VISTO = 'chispa-editor:tutorial-visto';

/** La parte del tutorial que no depende de la pantalla: qué paso toca y cuándo se pasa al siguiente. */
export class GuiaTutorial {
  indice = 0;
  terminado = false;
  private memoria: Memoria = {};

  constructor(
    private c: ContextoTutorial,
    readonly pasos: PasoTutorial[] = PASOS_TUTORIAL,
  ) {
    this.empezarPaso();
  }

  get paso(): PasoTutorial {
    return this.pasos[this.indice];
  }

  /** Mira si el paso actual ya está hecho y, si lo está, pasa al siguiente (o a varios). Devuelve si ha avanzado. */
  comprobar(): boolean {
    let avanzado = false;
    while (!this.terminado && this.paso.hecho?.(this.c, this.memoria)) {
      this.siguiente();
      avanzado = true;
    }
    return avanzado;
  }

  siguiente(): void {
    if (this.indice >= this.pasos.length - 1) {
      this.terminado = true;
      return;
    }
    this.indice++;
    this.empezarPaso();
  }

  hazloPorMi(): void {
    this.paso.hazloPorMi?.(this.c, this.memoria);
    this.comprobar();
  }

  private empezarPaso(): void {
    this.memoria = {};
    this.paso.alEmpezar?.(this.c, this.memoria);
  }
}

/** El tutorial en la pantalla: el foco, la burbuja y los botones. */
export class Tutorial {
  readonly guia: GuiaTutorial;
  private foco = h('div', { class: 'tutorial-foco', 'aria-hidden': 'true' });
  private burbuja = h('div', { class: 'tutorial-burbuja', role: 'dialog', 'aria-live': 'polite' });
  private temporizador = 0;
  private dibujado = -1;
  /** Paso en el que ya se ha llevado la vista hasta lo resaltado (solo una vez, para no pelear con quien mueve la vista). */
  private desplazadoEn = -1;

  constructor(
    c: ContextoTutorial,
    private alTerminar: () => void = () => {},
    private raiz: HTMLElement = document.body,
  ) {
    this.guia = new GuiaTutorial(c);
    this.raiz.append(this.foco, this.burbuja);
    this.actualizar();
    this.temporizador = window.setInterval(() => this.actualizar(), 200);
  }

  get abierto(): boolean {
    return this.temporizador !== 0;
  }

  cerrar(): void {
    clearInterval(this.temporizador);
    this.temporizador = 0;
    this.foco.remove();
    this.burbuja.remove();
    this.alTerminar();
  }

  /** Comprueba el paso, redibuja la burbuja si ha cambiado y coloca el foco. */
  actualizar(): void {
    if (!this.abierto && this.dibujado >= 0) return;
    this.guia.comprobar();
    if (this.guia.terminado) return this.cerrar();
    if (this.dibujado !== this.guia.indice) this.dibujarBurbuja();
    this.colocar();
  }

  private dibujarBurbuja(): void {
    const g = this.guia;
    const p = g.paso;
    this.dibujado = g.indice;
    const ultimo = g.indice === g.pasos.length - 1;
    const botones = h('div', { class: 'tutorial-botones' },
      ultimo ? null : h('button', { class: 'boton-enlace tutorial-saltar', title: 'Cerrar el tutorial (se puede volver a abrir desde Ayuda)', onclick: () => this.cerrar() }, 'Saltar el tutorial'),
      h('span', { class: 'espacio' }),
      p.hazloPorMi ? h('button', { class: 'boton tutorial-hazlo', onclick: () => {
        g.hazloPorMi();
        this.actualizar();
      } }, p.textoHazlo ?? 'Hazlo por mí') : null,
      p.siguiente || !p.hecho ? h('button', { class: 'boton principal tutorial-siguiente', onclick: () => {
        g.siguiente();
        this.actualizar();
      } }, g.indice === 0 ? '¡Empezamos!' : ultimo ? 'Terminar' : 'Siguiente') : null,
    );
    const partes: HTMLElement[] = [
      h('div', { class: 'tutorial-cabecera' },
        h('span', { class: 'tutorial-paso' }, `Paso ${g.indice + 1} de ${g.pasos.length}`),
        h('strong', {}, p.titulo),
      ),
      h('p', {}, ...conNegritas(p.texto)),
    ];
    if (p.codigo) partes.push(h('pre', { class: 'tutorial-codigo' }, p.codigo.trimEnd()));
    partes.push(botones);
    this.burbuja.replaceChildren(...partes);
  }

  /** Pone el foco encima de lo que hay que tocar, y la burbuja al lado. */
  private colocar(): void {
    const objetivo = this.guia.paso.objetivo?.(document);
    const visible = objetivo instanceof HTMLElement && objetivo.offsetParent !== null;
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    // Si lo que hay que tocar está fuera de la vista (por ejemplo, abajo del todo en Propiedades), la llevamos hasta allí
    if (visible && this.desplazadoEn !== this.guia.indice) {
      this.desplazadoEn = this.guia.indice;
      if (!dentroDeLaVista(objetivo)) objetivo.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
    const caja = visible ? objetivo.getBoundingClientRect() : null;
    if (!caja || caja.width === 0) {
      // Nada que resaltar: la burbuja en el centro
      this.foco.hidden = true;
      this.burbuja.classList.add('centrada');
      this.burbuja.style.left = `${Math.max(12, (ancho - this.burbuja.offsetWidth) / 2)}px`;
      this.burbuja.style.top = `${Math.max(12, (alto - this.burbuja.offsetHeight) / 3)}px`;
      return;
    }
    const margen = 6;
    this.foco.hidden = false;
    this.burbuja.classList.remove('centrada');
    Object.assign(this.foco.style, {
      left: `${caja.left - margen}px`,
      top: `${caja.top - margen}px`,
      width: `${caja.width + margen * 2}px`,
      height: `${caja.height + margen * 2}px`,
    });
    // La burbuja: a la derecha si cabe; si no, debajo; si no, encima; si no, a la izquierda
    const bw = this.burbuja.offsetWidth || 340;
    const bh = this.burbuja.offsetHeight || 160;
    const separacion = 16;
    let x: number;
    let y: number;
    const grande = caja.width > ancho * 0.4 || caja.height > alto * 0.5;
    if (grande && caja.right + separacion + bw < ancho) {
      // Objetivos grandes con sitio a su derecha: la burbuja fuera, sin tapar nada de lo resaltado
      x = caja.right + separacion;
      y = this.guia.paso.esquina === 'abajo' ? caja.bottom - bh : caja.top;
    } else if (grande) {
      // Objetivos grandes sin sitio fuera (la escena, el código): la burbuja dentro, en una esquina
      x = caja.right - bw - 16;
      y = this.guia.paso.esquina === 'abajo' ? caja.bottom - bh - 16 : caja.top + 16;
    } else if (caja.right + separacion + bw < ancho) {
      x = caja.right + separacion;
      y = caja.top + caja.height / 2 - bh / 2;
    } else if (caja.bottom + separacion + bh < alto) {
      x = caja.left + caja.width / 2 - bw / 2;
      y = caja.bottom + separacion;
    } else if (caja.top - separacion - bh > 0) {
      x = caja.left + caja.width / 2 - bw / 2;
      y = caja.top - separacion - bh;
    } else {
      x = caja.left - separacion - bw;
      y = caja.top + caja.height / 2 - bh / 2;
    }
    this.burbuja.style.left = `${Math.round(Math.min(Math.max(12, x), ancho - bw - 12))}px`;
    this.burbuja.style.top = `${Math.round(Math.min(Math.max(12, y), alto - bh - 12))}px`;
  }
}

/** ¿Se ve entero? (dentro de la ventana y de los paneles con barra de desplazamiento que lo contienen) */
function dentroDeLaVista(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.top < 0 || r.left < 0 || r.bottom > window.innerHeight || r.right > window.innerWidth) return false;
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (p.scrollHeight <= p.clientHeight && p.scrollWidth <= p.clientWidth) continue;
    const c = p.getBoundingClientRect();
    if (r.top < c.top || r.bottom > c.bottom || r.left < c.left || r.right > c.right) return false;
  }
  return true;
}

/** "Pulsa **Ejecutar**" → ["Pulsa ", <strong>Ejecutar</strong>] */
export function conNegritas(texto: string): (string | HTMLElement)[] {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, i) => (i % 2 ? h('strong', {}, parte) : parte)).filter((p) => p !== '');
}

/** ¿Ya se ha ofrecido el tutorial en este navegador? */
export function tutorialVisto(): boolean {
  try {
    return localStorage.getItem(CLAVE_TUTORIAL_VISTO) === 'si';
  } catch {
    return true; // sin almacenamiento, mejor no insistir en cada visita
  }
}

export function marcarTutorialVisto(): void {
  try {
    localStorage.setItem(CLAVE_TUTORIAL_VISTO, 'si');
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}
