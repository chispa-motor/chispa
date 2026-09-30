/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Consola sencilla de la página: aquí aparece lo que escribe `mostrar()` y
 * los errores y avisos de los scripts.
 *
 * DECISIÓN: mostrarlo DENTRO de la página y no solo en la consola del
 * navegador (F12), porque la persona que empieza no sabe que existe F12.
 * (La Zona de Programación tiene su propia consola, más completa.)
 */
export type TipoMensaje = 'normal' | 'error' | 'aviso';

const MAXIMO_LINEAS = 8;
let lineas: { texto: string; tipo: TipoMensaje }[] = [];

export function escribirEnConsola(texto: string, tipo: TipoMensaje = 'normal'): void {
  (tipo === 'error' ? console.error : tipo === 'aviso' ? console.warn : console.log)('[Chispa]', texto);
  const panel = document.getElementById('consola');
  if (!panel) return;
  lineas.push({ texto, tipo });
  if (lineas.length > MAXIMO_LINEAS) lineas = lineas.slice(-MAXIMO_LINEAS);
  panel.replaceChildren(
    ...lineas.map((l) => {
      const div = document.createElement('div');
      div.className = `linea-${l.tipo}`;
      div.textContent = l.tipo === 'normal' ? '› ' + l.texto : l.texto;
      return div;
    }),
  );
  panel.hidden = false;
}

export function limpiarConsola(): void {
  lineas = [];
  const panel = document.getElementById('consola');
  if (panel) {
    panel.replaceChildren();
    panel.hidden = true;
  }
}
