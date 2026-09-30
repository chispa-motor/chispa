/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Diálogos propios (en vez de prompt() y confirm() del navegador, que son
 * feos, están en el idioma del navegador y bloquean la página).
 */
import { h } from './dom';

interface BotonDialogo {
  texto: string;
  clase?: string;
  /** Si devuelve falso, el diálogo no se cierra. */
  alPulsar?: () => boolean | void;
}

/** Abre un diálogo con un contenido y unos botones. Devuelve la función para cerrarlo. */
export function abrirDialogo(titulo: string, contenido: HTMLElement | string, botones: BotonDialogo[], clase = ''): () => void {
  const fondo = h('div', { class: 'dialogo-fondo' });
  const cerrar = () => {
    fondo.remove();
    document.removeEventListener('keydown', teclas, true);
  };
  const pie = h(
    'div',
    { class: 'dialogo-botones' },
    botones.map((b) =>
      h('button', { class: `boton ${b.clase ?? ''}`, onclick: () => b.alPulsar?.() !== false && cerrar() }, b.texto),
    ),
  );
  const caja = h('div', { class: `dialogo ${clase}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, h('h2', {}, titulo), typeof contenido === 'string' ? h('p', {}, contenido) : contenido, pie);
  fondo.append(caja);
  fondo.addEventListener('mousedown', (e) => e.target === fondo && cerrar());
  // Escape cierra; Intro pulsa el botón principal
  const teclas = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cerrar();
    } else if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
      const principal = pie.querySelector<HTMLButtonElement>('.principal');
      if (principal) {
        e.preventDefault();
        principal.click();
      }
    }
  };
  document.addEventListener('keydown', teclas, true);
  document.body.append(fondo);
  (caja.querySelector('input, select, textarea, .principal') as HTMLElement | null)?.focus();
  return cerrar;
}

/** Pide un texto. Devuelve null si se cancela. */
export function pedirTexto(titulo: string, explicacion: string, valorInicial = ''): Promise<string | null> {
  return new Promise((resolver) => {
    const campo = h('input', { type: 'text', class: 'campo', value: valorInicial, spellcheck: 'false' });
    let hecho = false;
    abrirDialogo(titulo, h('div', {}, h('p', {}, explicacion), campo), [
      { texto: 'Cancelar', alPulsar: () => void resolver(null) },
      {
        texto: 'Aceptar',
        clase: 'principal',
        alPulsar: () => {
          hecho = true;
          resolver(campo.value.trim() || null);
        },
      },
    ]);
    setTimeout(() => {
      campo.focus();
      campo.select();
    });
    void hecho;
  });
}

/** Pregunta sí o no. */
export function confirmar(titulo: string, mensaje: string, textoSi = 'Sí', peligro = false): Promise<boolean> {
  return new Promise((resolver) => {
    abrirDialogo(titulo, mensaje, [
      { texto: 'Cancelar', alPulsar: () => void resolver(false) },
      { texto: textoSi, clase: `principal ${peligro ? 'peligro' : ''}`, alPulsar: () => void resolver(true) },
    ]);
  });
}

/** Un aviso con un solo botón. */
export function avisar(titulo: string, mensaje: string | HTMLElement): void {
  abrirDialogo(titulo, mensaje, [{ texto: 'Entendido', clase: 'principal' }]);
}

/** Mensaje pequeño que desaparece solo (abajo a la derecha). */
export function notificar(texto: string, tipo: 'normal' | 'error' | 'ok' = 'normal'): void {
  let zona = document.getElementById('notificaciones');
  if (!zona) {
    zona = h('div', { id: 'notificaciones' });
    document.body.append(zona);
  }
  const n = h('div', { class: `notificacion ${tipo}` }, texto);
  zona.append(n);
  setTimeout(() => n.classList.add('saliendo'), 2600);
  setTimeout(() => n.remove(), 3000);
}
