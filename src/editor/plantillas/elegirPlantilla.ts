/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * La ventana «Proyecto nuevo»: empezar en blanco o desde una PLANTILLA (un
 * juego pequeño ya hecho: plataformas, naves, puzle...). Ver src/plantillas.
 */
import { proyectoMinimo } from '../../ejemplos/minimo/proyecto';
import { PLANTILLAS } from '../../plantillas/indice';
import { proyectoVacio, type DefProyecto } from '../../proyecto/formato';
import { imagenDeDibujo } from '../../recursos/dibujos';
import { abrirDialogo } from '../interfaz/dialogos';
import { h } from '../interfaz/dom';

interface Ficha {
  id: string;
  titulo: string;
  descripcion: string;
  controles?: string;
  dibujo?: string;
  color: string;
  crear: () => DefProyecto;
}

/** Todo lo que se puede elegir: en blanco, el ejemplo mínimo y las plantillas. */
export function fichasDeProyecto(): Ficha[] {
  return [
    { id: 'vacio', titulo: 'En blanco', descripcion: 'Una escena vacía, para hacerlo todo a tu manera.', color: '#1e2233', crear: () => proyectoVacio('Mi juego') },
    ...PLANTILLAS,
    { id: 'ejemplo', titulo: 'Ejemplo mínimo', descripcion: 'Un cuadrado con un script muy corto: para ver cómo es el código.', color: '#1e2233', crear: () => structuredClone(proyectoMinimo) },
  ];
}

/** Abre la ventana y devuelve el proyecto elegido (o null si se cancela o se cierra). */
export function elegirPlantilla(hayProyecto: boolean): Promise<DefProyecto | null> {
  return new Promise((resolver) => {
    let elegido: DefProyecto | null = null;
    let cerrar = () => {};
    const fichas = fichasDeProyecto().map((f) =>
      h('button', {
        class: 'ficha-plantilla', 'data-plantilla': f.id,
        onclick: () => {
          elegido = f.crear();
          cerrar();
        },
      },
      h('span', { class: 'muestra-plantilla', style: `background:${f.color}` }, f.dibujo ? h('img', { src: imagenDeDibujo(f.dibujo) ?? '', alt: '', draggable: 'false' }) : h('span', { class: 'mas-plantilla' }, f.id === 'vacio' ? '+' : '▢')),
      h('strong', {}, f.titulo),
      h('span', { class: 'nota' }, f.descripcion),
      f.controles ? h('span', { class: 'teclas-plantilla' }, f.controles) : null),
    );
    const contenido = h('div', { class: 'elegir-plantilla' },
      h('p', {}, hayProyecto ? 'El proyecto actual se cerrará. Si quieres conservarlo, descárgalo antes con «Guardar».' : 'Elige cómo quieres empezar.'),
      h('p', { class: 'nota' }, 'Las plantillas son juegos pequeños que ya funcionan, con el código comentado: pruébalos con «Ejecutar» y cámbialos para hacer el tuyo.'),
      h('div', { class: 'rejilla-plantillas' }, fichas),
    );
    const cerrarDialogo = abrirDialogo('Proyecto nuevo', contenido, [{ texto: 'Cancelar' }], 'dialogo-plantillas');
    // Se cierre como se cierre (una ficha, Cancelar, Escape o un clic fuera), se contesta una sola vez
    const fondo = contenido.closest('.dialogo-fondo')!;
    const vigia = new MutationObserver(() => {
      if (fondo.isConnected) return;
      vigia.disconnect();
      resolver(elegido);
    });
    vigia.observe(document.body, { childList: true });
    cerrar = cerrarDialogo;
  });
}
