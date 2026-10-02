/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * La ventana «Recursos listos»: los dibujos, los sonidos y la música que
 * trae Chispa (ver src/recursos). Un clic los añade al proyecto; los
 * personajes, enemigos y objetos, además, se ponen en la escena.
 */
import { CATEGORIAS_DIBUJOS, DIBUJOS, imagenDeDibujo, type CategoriaDibujo } from '../../recursos/dibujos';
import { CANCIONES_LISTAS, SONIDOS_LISTOS } from '../../recursos/sonidos';
import { FRECUENCIA_MUESTREO, generarSonido } from '../../sonido/generador';
import { FRECUENCIA_MUSICA, renderizarCancion } from '../../sonido/musica';
import type { EstadoEditor } from '../estado/EstadoEditor';
import { abrirDialogo, notificar } from '../interfaz/dialogos';
import { h, rellenar } from '../interfaz/dom';
import { callar, tocar } from './audioEditor';

const NOMBRES_CATEGORIAS: Record<CategoriaDibujo, string> = { personajes: 'Personajes', enemigos: 'Enemigos', objetos: 'Objetos', casillas: 'Casillas para mapas' };

export type SeccionRecursos = 'dibujos' | 'sonidos' | 'musica';

export function abrirRecursosListos(estado: EstadoEditor, seccion: SeccionRecursos = 'dibujos'): void {
  const cuerpo = h('div', { class: 'cuerpo-recursos' });
  let actual = seccion;

  const pintar = () => {
    const p = estado.proyecto;
    if (actual === 'dibujos') {
      rellenar(cuerpo,
        h('p', { class: 'nota' }, 'Dibujos de 16×16 píxeles hechos para Chispa: puedes usarlos en cualquier juego. Un clic los añade al proyecto (y los personajes, enemigos y objetos, también a la escena).'),
        ...CATEGORIAS_DIBUJOS.flatMap((categoria) => [
          h('h4', { class: 'titulo-grupo-sonido' }, NOMBRES_CATEGORIAS[categoria]),
          h('div', { class: 'rejilla-dibujos' },
            DIBUJOS.filter((d) => d.categoria === categoria).map((d) => {
              const esta = Object.prototype.hasOwnProperty.call(p.imagenes, d.nombre);
              return h('button', { class: `ficha-dibujo ${esta ? 'esta' : ''}`, 'data-dibujo': d.nombre, title: esta ? `«${d.nombre}» ya está en el proyecto (clic: ponerlo otra vez en la escena)` : `Añadir «${d.nombre}»`, onclick: () => {
                const r = estado.anadirRecursoListo('dibujo', d.nombre, categoria !== 'casillas');
                notificar(categoria === 'casillas' ? `Casilla «${r}» añadida a Proyecto > Imágenes. Elígela en tu mapa: inspector > tipos de casilla > imagen.` : `«${r}» añadido al proyecto y a la escena.`, 'ok');
                pintar();
              } }, h('img', { src: imagenDeDibujo(d.nombre) ?? '', alt: d.titulo, draggable: 'false' }), h('span', {}, d.titulo), esta ? h('span', { class: 'marca-esta' }, '✓') : null);
            }),
          ),
        ]),
      );
      return;
    }
    const filas = actual === 'sonidos'
      ? SONIDOS_LISTOS.map((s) => ({ nombre: s.nombre, titulo: s.titulo, esta: Object.prototype.hasOwnProperty.call(p.sonidosHechos ?? {}, s.nombre), escuchar: () => void tocar(generarSonido(s.sonido), FRECUENCIA_MUESTREO), uso: `sonido.reproducir("${s.nombre}")` }))
      : CANCIONES_LISTAS.map((c) => ({ nombre: c.nombre, titulo: c.titulo, esta: Object.prototype.hasOwnProperty.call(p.canciones ?? {}, c.nombre), escuchar: () => void tocar(renderizarCancion(c.cancion), FRECUENCIA_MUSICA), uso: `musica.reproducir("${c.nombre}")` }));
    rellenar(cuerpo,
      h('p', { class: 'nota' }, actual === 'sonidos'
        ? 'Efectos hechos con el generador de sonidos de Chispa. Al añadirlos puedes abrirlos y retocarlos (Proyecto > Sonidos).'
        : 'Canciones hechas con el editor de música de Chispa. Al añadirlas puedes abrirlas y cambiarlas (Proyecto > Música).'),
      ...filas.map((f) =>
        h('div', { class: 'fila-recurso-listo', 'data-recurso': f.nombre },
          h('button', { class: 'boton', title: 'Escuchar', 'aria-label': `Escuchar ${f.titulo}`, onclick: f.escuchar }, '▶'),
          h('span', { class: 'nombre' }, h('strong', {}, f.titulo), h('code', {}, f.uso)),
          h('button', { class: `boton ${f.esta ? '' : 'principal'}`, disabled: f.esta, 'data-accion': 'anadir', onclick: () => {
            const r = estado.anadirRecursoListo(actual === 'sonidos' ? 'sonido' : 'cancion', f.nombre);
            notificar(`«${r}» añadido. En el código: ${f.uso.replace(f.nombre, r ?? f.nombre)}`, 'ok');
            pintar();
          } }, f.esta ? '✓ Añadido' : 'Añadir'),
        ),
      ),
    );
  };

  const pestanas = h('div', { class: 'pestanas-recursos' });
  const pintarPestanas = () =>
    rellenar(pestanas, ...([['dibujos', 'Dibujos'], ['sonidos', 'Sonidos'], ['musica', 'Música']] as [SeccionRecursos, string][]).map(([s, texto]) =>
      h('button', { class: `chip ${actual === s ? 'activo' : ''}`, 'data-seccion': s, onclick: () => {
        actual = s;
        callar();
        pintarPestanas();
        pintar();
      } }, texto)));
  pintarPestanas();
  pintar();
  abrirDialogo('Recursos listos', h('div', { class: 'recursos-listos' }, pestanas, cuerpo), [{ texto: 'Cerrar', clase: 'principal', alPulsar: callar }], 'dialogo-recursos');
}
