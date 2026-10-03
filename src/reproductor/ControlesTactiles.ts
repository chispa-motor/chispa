/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CONTROLES TÁCTILES: botones en la pantalla para jugar en el móvil.
 *
 * DECISIÓN: salen SOLOS, sin configurar nada. Se mira qué teclas usan los
 * scripts ("izquierda", "espacio"...) y se ponen esos botones: una cruceta
 * a la izquierda para las direcciones y botones redondos a la derecha para
 * lo demás. Al tocarlos, el juego cree que se ha pulsado esa tecla.
 * Solo aparecen en pantallas táctiles, y se pueden quitar en el proyecto.
 * Tocar la pantalla del juego sigue contando como hacer clic.
 */
import type { Entrada } from '../motor/Entrada';
import type { DefProyecto } from '../proyecto/formato';
import { normalizarNombreTecla } from '../motor/Entrada';
import { sinPrototipo } from '../utilidades/seguro';

const DIRECCIONES: Record<string, 'arriba' | 'abajo' | 'izquierda' | 'derecha'> = sinPrototipo({
  arriba: 'arriba', abajo: 'abajo', izquierda: 'izquierda', derecha: 'derecha', w: 'arriba', s: 'abajo', a: 'izquierda', d: 'derecha',
});
/** Como mucho, estos botones de acción (más no caben en un móvil). */
const MAXIMO_ACCIONES = 6;

export interface TeclasDelJuego {
  /** Cada dirección de la cruceta y las teclas que pulsa (flecha y, si se usan, WASD). */
  direcciones: Partial<Record<'arriba' | 'abajo' | 'izquierda' | 'derecha', string[]>>;
  /** Las demás teclas, en el orden en que aparecen. */
  acciones: string[];
}

/** Las teclas que usa el juego: las de «cuando se pulsa/mantiene/suelta» y las de teclado.xxx("..."). */
export function teclasDelJuego(proyecto: DefProyecto): TeclasDelJuego {
  const usadas: string[] = [];
  const patron = /(?:cuando\s+se\s+(?:pulsa|mantiene|suelta)\s+|teclado\s*\.\s*\w+\s*\(\s*)((?:"[^"\n]*"\s*,?\s*)+)/giu;
  for (const codigo of Object.values(proyecto.scripts)) {
    for (const m of codigo.matchAll(patron)) {
      for (const t of m[1].matchAll(/"([^"\n]*)"/g)) {
        const n = normalizarNombreTecla(t[1]);
        if (n && !usadas.includes(n)) usadas.push(n);
      }
    }
  }
  // moverConFlechas() usa las flechas sin nombrarlas
  if (Object.values(proyecto.scripts).some((c) => /moverconflechas/i.test(c))) for (const f of ['izquierda', 'derecha', 'arriba', 'abajo']) if (!usadas.includes(f)) usadas.push(f);
  const r: TeclasDelJuego = { direcciones: {}, acciones: [] };
  for (const t of usadas) {
    const d = DIRECCIONES[t];
    if (d) (r.direcciones[d] ??= []).push(t);
    else if (r.acciones.length < MAXIMO_ACCIONES) r.acciones.push(t);
  }
  return r;
}

/** ¿Es una pantalla que se toca con el dedo? */
export function esPantallaTactil(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
}

/** Los estilos de los controles en pantalla (los mismos para los automáticos y para los que pone el juego). */
export { ESTILOS_TACTILES } from '../motor/Tactil';

const FLECHAS = { arriba: '▲', abajo: '▼', izquierda: '◀', derecha: '▶' };

/**
 * Pone los botones que hacen falta para las teclas que usa el juego: una cruceta abajo a la
 * izquierda y los de acción abajo a la derecha. Devuelve cuántos ha puesto.
 *
 * Son «automáticos»: si el script del juego pone sus propios controles (tactil.joystick(),
 * tactil.boton()...), estos se quitan solos. Y, como todos los controles en pantalla, solo se
 * ven cuando se juega con el dedo.
 */
export function ponerControlesTactiles(entrada: Entrada, proyecto: DefProyecto): number {
  const t = entrada.tactil;
  // Si el juego ya ha puesto los suyos (en «cuando empieza»), no se añade nada
  if (t.conControlesPropios) return 0;
  const teclas = teclasDelJuego(proyecto);
  let puestos = 0;
  const sitio = { arriba: { dx: 116, dy: 192 }, abajo: { dx: 116, dy: 48 }, izquierda: { dx: 44, dy: 120 }, derecha: { dx: 188, dy: 120 } };
  for (const [d, pulsa] of Object.entries(teclas.direcciones) as ['arriba' | 'abajo' | 'izquierda' | 'derecha', string[]][]) {
    if (t.boton(d, pulsa, { texto: FLECHAS[d], clase: 'flecha', sitio: { x: 0, y: 0, ...sitio[d] }, automatico: true })) puestos++;
  }
  // Los de acción, en filas de tres desde la esquina de abajo a la derecha
  teclas.acciones.forEach((tecla, i) => {
    if (t.boton(tecla, [tecla], { texto: tecla === 'espacio' ? '⎵' : tecla, sitio: { x: 1, y: 0, dx: -(52 + (i % 3) * 84), dy: 56 + Math.floor(i / 3) * 84 }, automatico: true })) puestos++;
  });
  return puestos;
}
