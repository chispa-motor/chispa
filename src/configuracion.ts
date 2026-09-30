/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CONFIGURACIÓN DE CHISPA: los datos que puede que quieras cambiar, todos aquí.
 *
 *   - donaciones:  el enlace del botón «Apoya Chispa» (menú Ayuda). Mientras
 *                  esté vacío, el botón da las gracias y no abre nada.
 *   - repositorio: dónde está el código de Chispa. Sale en «Acerca de Chispa»
 *                  y en cada juego exportado (la licencia MPL 2.0 pide decir
 *                  dónde se puede conseguir el código del motor).
 *
 * Tienen que empezar por https://. Un test lo comprueba.
 */
export const CONFIGURACION = {
  /** El enlace para donar (Ko-fi, GitHub Sponsors, Patreon...). Vacío = todavía no hay. */
  donaciones: '',
  /** Dónde está el código de Chispa. */
  repositorio: 'https://github.com/rodrigodemartin827-debug/chispa',
};

/** Quién hace Chispa (lo que sale en «Acerca de Chispa»). La lista completa, en CREDITOS.md. */
export const AUTOR = 'Rodrigo';

export const LICENCIA = { nombre: 'Mozilla Public License 2.0 (MPL 2.0)', corto: 'MPL-2.0', enlace: 'https://mozilla.org/MPL/2.0/' };
