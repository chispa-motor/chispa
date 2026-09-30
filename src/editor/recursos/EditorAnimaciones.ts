/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EDITOR DE ANIMACIONES: una animación es una lista de imágenes que se van
 * cambiando. Aquí se eligen las imágenes (en orden), se cambian de sitio,
 * se elige la velocidad y si se repite, y se ve cómo queda mientras tanto.
 */
import type { EstadoEditor } from '../estado/EstadoEditor';
import { abrirDialogo } from '../interfaz/dialogos';
import { botonIcono, h, rellenar } from '../interfaz/dom';
import { abrirEditorPixelArt } from './EditorPixelArt';

export function abrirEditorAnimacion(e: EstadoEditor, nombre: string): void {
  const anim = e.proyecto.animaciones[nombre];
  if (!anim) return;
  const fotogramas = [...anim.fotogramas];
  const velocidad = h('input', { type: 'number', class: 'campo', min: '1', max: '60', value: String(anim.velocidad), title: 'Fotogramas por segundo: más = más rápida' });
  const repetir = h('input', { type: 'checkbox', checked: anim.repetir });
  const tira = h('div', { class: 'tira-fotogramas' });
  const previa = h('img', { class: 'previa-animacion', alt: 'Vista previa' });
  const imagen = (n: string) => e.proyecto.imagenes[n] ?? '';

  const pintarTira = () =>
    rellenar(tira, fotogramas.length
      ? fotogramas.map((f, i) =>
          h('div', { class: 'fotograma' },
            h('img', { src: imagen(f), alt: f }),
            h('span', {}, `${i + 1}. ${f}`),
            h('div', { class: 'botones-fotograma' },
              botonIcono('izquierda', 'Antes', () => mover(i, -1), undefined, 'pequeno'),
              botonIcono('derecha', 'Después', () => mover(i, 1), undefined, 'pequeno'),
              botonIcono('cerrar', 'Quitar este fotograma', () => {
                fotogramas.splice(i, 1);
                pintarTira();
              }, undefined, 'pequeno'),
            ),
          ))
      : h('p', { class: 'nota' }, 'Haz clic en las imágenes de abajo, en orden, para añadir fotogramas.'));
  const mover = (i: number, hacia: -1 | 1) => {
    const j = i + hacia;
    if (j < 0 || j >= fotogramas.length) return;
    [fotogramas[i], fotogramas[j]] = [fotogramas[j], fotogramas[i]];
    pintarTira();
  };
  pintarTira();

  // Vista previa: cambia de imagen a la velocidad elegida. Si no se repite, se queda un segundo en la última y vuelve a empezar.
  let paso = 0;
  let temporizador = 0;
  const siguiente = () => {
    const v = Math.max(1, Number(velocidad.value) || 8);
    const n = fotogramas.length;
    if (n) {
      const i = repetir.checked ? paso % n : Math.min(paso % (n + v), n - 1);
      previa.src = imagen(fotogramas[i]);
      paso++;
    } else previa.removeAttribute('src');
    temporizador = window.setTimeout(siguiente, 1000 / v);
  };
  siguiente();

  const disponibles = h('div', { class: 'rejilla-imagenes pequena' },
    Object.entries(e.proyecto.imagenes).map(([n, url]) =>
      h('button', { class: 'imagen-recurso', title: `Añadir "${n}"`, onclick: () => {
        fotogramas.push(n);
        pintarTira();
      } }, h('img', { src: url, alt: n }), h('span', {}, n))),
  );

  const guardar = () =>
    e.cambiarAnimacion(nombre, { fotogramas, velocidad: Math.max(1, Number(velocidad.value) || 8), repetir: repetir.checked });

  const contenido = h('div', { class: 'editor-animacion' },
    h('div', { class: 'cabecera-animacion' },
      h('div', {}, h('h3', {}, 'Fotogramas (en orden)'), tira),
      h('div', { class: 'caja-previa' }, h('h3', {}, 'Así se ve'), previa),
    ),
    h('h3', {}, 'Imágenes del proyecto: clic para añadir'), disponibles,
    h('div', { class: 'dos-columnas' },
      h('label', { class: 'campo-fila' }, h('span', { class: 'campo-etiqueta' }, 'fotogramas por segundo'), velocidad),
      h('label', { class: 'campo-fila casilla' }, h('span', { class: 'campo-etiqueta' }, 'repetir'), repetir),
    ),
    h('p', { class: 'nota' }, 'En el código: ', h('code', {}, `yo.animar("${nombre}")`), '. Si no se repite, al acabar avisa con "cuando termina la animacion".'),
  );
  abrirDialogo(`Animación: ${nombre}`, contenido, [
    { texto: 'Cancelar', alPulsar: () => clearTimeout(temporizador) },
    {
      texto: 'Dibujar los fotogramas',
      alPulsar: () => {
        clearTimeout(temporizador);
        guardar();
        void abrirEditorPixelArt(e, { animacion: nombre });
      },
    },
    { texto: 'Guardar', clase: 'principal', alPulsar: () => (clearTimeout(temporizador), guardar()) },
  ], 'dialogo-ancho');
}
