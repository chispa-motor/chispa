/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Compila el REPRODUCTOR (el motor sin el editor) en un único archivo,
 * public/reproductor.js. El editor lo mete dentro de la página al exportar.
 *
 * Se ejecuta solo antes de "npm run dev" y "npm run build" (ver package.json).
 */
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'public',
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: 'src/reproductor/reproductor.ts',
      name: 'ChispaReproductor',
      formats: ['iife'],
      fileName: () => 'reproductor.js',
    },
  },
  logLevel: 'warn',
});
