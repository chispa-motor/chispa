/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * REPRODUCTOR: lo único que lleva dentro un juego exportado.
 *
 * Es el motor y el intérprete de Chispa, SIN el editor. Busca en la página el
 * proyecto (un JSON dentro de <script id="proyecto-chispa">) y lo pone en
 * marcha ocupando toda la ventana.
 *
 * Se compila aparte (vite.reproductor.config.ts) en un solo archivo,
 * public/reproductor.js, que el editor copia dentro de la página al exportar.
 */
import { Motor } from '../motor/Motor';
import { mostrarError } from '../motor/Errores';
import { ErrorCompilacion, formatearError } from '../chispa/errores/ErrorChispa';
import { ErrorMotor } from '../motor/Errores';
import { JuegoEnMarcha } from '../proyecto/JuegoEnMarcha';
import { migrarProyecto } from '../proyecto/formato';
import { esPantallaTactil, ponerControlesTactiles } from './ControlesTactiles';

async function empezar(): Promise<void> {
  const datos = document.getElementById('proyecto-chispa')?.textContent;
  const canvas = document.querySelector<HTMLCanvasElement>('#lienzo');
  if (!datos || !canvas) return mostrarError(new ErrorMotor('Esta página no contiene ningún juego de Chispa.'));
  try {
    const proyecto = migrarProyecto(JSON.parse(datos));
    document.title = proyecto.nombre;
    const motor = new Motor({ canvas, ancho: proyecto.ancho, alto: proyecto.alto, pixelArt: proyecto.pixelArt });
    // En el juego terminado, mostrar() solo escribe en la consola del navegador (F12):
    // es una herramienta para ti mientras lo programas, no para quien juega.
    await JuegoEnMarcha.arrancar(motor, proyecto, {
      alMostrar: (t) => console.log('[Chispa]', t),
      alAviso: () => {},
    });
    if (proyecto.controlesTactiles !== false && esPantallaTactil()) ponerControlesTactiles(motor.entrada, proyecto);
    canvas.focus();
  } catch (error) {
    if (error instanceof ErrorCompilacion) {
      mostrarError(new ErrorMotor(error.errores.map(formatearError).join('\n\n')));
    } else mostrarError(error);
  }
}

void empezar();
