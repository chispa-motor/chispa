/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * La ventana «Pantallas listas»: se marcan las que se quieren (menú,
 * opciones, créditos, puntuaciones, fin del juego, pausa), se dice cuál es
 * la escena del juego y se añaden todas, ya conectadas entre sí.
 */
import type { EstadoEditor } from '../estado/EstadoEditor';
import { abrirDialogo, notificar } from '../interfaz/dialogos';
import { h } from '../interfaz/dom';
import { INFO_PANTALLAS, PANTALLAS, type TipoPantalla } from './pantallas';

export function abrirPantallasListas(estado: EstadoEditor): void {
  const p = estado.proyecto;
  const casillas = new Map<TipoPantalla, HTMLInputElement>();
  const filas = PANTALLAS.map((tipo) => {
    const info = INFO_PANTALLAS[tipo];
    // Las que ya están (con su nombre de siempre) salen sin marcar: marcarlas haría otra (Menu2...)
    const yaEsta = !!info.escena && Object.prototype.hasOwnProperty.call(p.escenas, info.escena);
    const casilla = h('input', { type: 'checkbox', checked: !yaEsta, 'data-pantalla': tipo });
    casillas.set(tipo, casilla);
    return h('label', { class: 'fila-pantalla' }, casilla, h('span', {}, h('strong', {}, info.nombre), yaEsta ? h('em', {}, ' (ya la tienes)') : null, h('br', {}), h('span', { class: 'nota' }, info.ayuda)));
  });
  const escenas = Object.keys(p.escenas);
  const juego = h('select', { class: 'campo', 'data-ruta': 'pantallas.juego', 'aria-label': 'La escena del juego' }, escenas.map((e) => h('option', { value: e, selected: e === estado.escenaActual }, e)));
  const empezar = h('input', { type: 'checkbox', checked: true, 'data-ruta': 'pantallas.empezar' });
  const contenido = h('div', { class: 'pantallas-listas' },
    h('p', {}, 'Las pantallas que tiene casi cualquier juego, ya hechas y conectadas. Son escenas normales: luego puedes abrirlas y cambiar lo que quieras.'),
    ...filas,
    h('label', { class: 'campo-musica' }, '«Jugar» lleva a la escena', juego),
    h('label', { class: 'casilla-particula' }, empezar, ' El juego empieza por el menú'),
  );
  abrirDialogo('Pantallas listas', contenido, [
    { texto: 'Cancelar' },
    {
      texto: 'Añadir',
      clase: 'principal',
      alPulsar: () => {
        const cuales = PANTALLAS.filter((t) => casillas.get(t)!.checked);
        if (!cuales.length) {
          notificar('Marca alguna pantalla.', 'error');
          return false;
        }
        const plan = estado.anadirPantallas(cuales, { escenaDeJuego: juego.value, empezarPorMenu: empezar.checked });
        const nuevas = Object.keys(plan.escenas);
        notificar(
          [nuevas.length ? `Escenas nuevas: ${nuevas.join(', ')}.` : '', plan.enElJuego.length ? `La pausa está en «${plan.escenaDeJuego}» (Escape o P).` : '', plan.necesitaPuntos ? 'Las puntuaciones usan juego.puntos: súmale puntos en tu juego, y al acabar: escena.cambiar("' + (plan.nombres.fin ?? 'Fin') + '").' : ''].filter(Boolean).join(' '),
          'ok',
        );
        return true;
      },
    },
  ], 'dialogo-pantallas');
}
