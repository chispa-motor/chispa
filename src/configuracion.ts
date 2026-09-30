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
 *   - web:         dónde se usa Chispa sin instalar nada (GitHub Pages).
 *
 * Tienen que empezar por https://. Un test lo comprueba.
 */
export const CONFIGURACION = {
  /** El enlace para donar (Ko-fi, GitHub Sponsors, Patreon...). Vacío = todavía no hay. */
  donaciones: '',
  /** Dónde está el código de Chispa. */
  repositorio: 'https://github.com/chispa-motor/chispa',
  /** El editor en internet, para usarlo sin instalar nada (lo publica .github/workflows/publicar.yml). */
  web: 'https://chispa-motor.github.io/chispa/',
};

/** Quién hace Chispa (lo que sale en «Acerca de Chispa»). La lista completa, en CREDITOS.md. */
export const AUTOR = 'Rodrigo';

export const LICENCIA = { nombre: 'Mozilla Public License 2.0 (MPL 2.0)', corto: 'MPL-2.0', enlace: 'https://mozilla.org/MPL/2.0/' };
