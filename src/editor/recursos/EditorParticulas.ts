/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EDITOR DE PARTÍCULAS: hacer efectos propios moviendo deslizadores y
 * viéndolos a la vez. Se empieza desde uno de los efectos listos (fuego,
 * explosión, nieve...) y se cambia lo que se quiera. Se guarda con un nombre
 * en el proyecto, y se usa con efecto.usar("nombre", yo) o en la sección
 * Efecto de un objeto.
 */
import { RECETAS } from '../../objetos/Efectos';
import { FORMAS_PARTICULA, Particulas, TIPOS_PARTICULAS, type ConfigParticulas } from '../../objetos/Particulas';
import type { Renderizador } from '../../motor/Renderizador';
import type { EstadoEditor } from '../estado/EstadoEditor';
import { abrirDialogo, notificar } from '../interfaz/dialogos';
import { h } from '../interfaz/dom';
import { campoColor } from '../paneles/campos';

/** Los efectos listos desde los que se puede empezar. */
export const BASES_PARTICULAS: Record<string, ConfigParticulas> = {
  ...Object.fromEntries(Object.entries(RECETAS).filter(([n]) => n !== 'humoExplosion' && n !== 'estela')),
  estrellas: TIPOS_PARTICULAS.estrellas,
};

/** Los deslizadores: dato, texto, mínimo, máximo, paso y ayuda. */
const DESLIZADORES: [keyof ConfigParticulas, string, number, number, number, string][] = [
  ['cantidad', 'de golpe', 0, 200, 1, 'Cuántas salen de golpe al usarlo'],
  ['porSegundo', 'por segundo', 0, 300, 1, 'Cuántas salen cada segundo (0 = solo de golpe; más de 0 = un efecto que dura, como el fuego)'],
  ['velocidad', 'velocidad', 0, 1200, 10, 'Lo rápido que salen (píxeles por segundo)'],
  ['direccion', 'dirección', 0, 360, 5, 'Hacia dónde salen, en grados: 90 = arriba, 270 = abajo, 0 = derecha'],
  ['dispersion', 'abanico', 0, 360, 5, 'Lo abierto que es el abanico: 0 = todas en la misma dirección, 360 = en todas'],
  ['vida', 'vida', 0.05, 6, 0.05, 'Cuántos segundos dura cada partícula'],
  ['tamano', 'tamaño', 1, 80, 1, 'El tamaño al salir (píxeles)'],
  ['tamanoFinal', 'tamaño final', 0, 4, 0.05, 'El tamaño al morir comparado con el de salida: 0 = desaparecen, 2 = el doble (humo)'],
  ['gravedad', 'gravedad', -1, 2, 0.05, '1 = caen como todo, 0 = flotan, negativo = suben'],
  ['rozamiento', 'aire', 0, 5, 0.1, 'Lo que las frena el aire'],
  ['giro', 'giro', 0, 1200, 10, 'Lo que giran (grados por segundo, como mucho)'],
  ['vaiven', 'vaivén', 0, 100, 1, 'Lo que se mueven de lado a lado (hojas, nieve)'],
  ['area', 'área', 0, 120, 1, 'Desde dónde salen: un círculo de este radio (0 = de un punto)'],
  ['opacidad', 'opacidad', 0.05, 1, 0.05, 'Lo opacas que empiezan (1 = del todo)'],
];

/** Un valor de la configuración, con su valor por defecto. */
function valor(c: ConfigParticulas, k: keyof ConfigParticulas): number {
  const v = c[k];
  if (typeof v === 'number') return v;
  if (k === 'tamanoFinal') return c.encoger ? 0 : 1;
  if (k === 'opacidad') return 1;
  return 0;
}

/** Abre el editor (con un efecto del proyecto para cambiarlo, o vacío para hacer uno nuevo). */
export function abrirEditorParticulas(estado: EstadoEditor, editar?: string): void {
  const inicial = editar ? estado.proyecto.efectos?.[editar] : undefined;
  let config: ConfigParticulas = structuredClone(inicial ?? BASES_PARTICULAS.fuego);
  // Lo que antes se decía con «encoger», ahora con el tamaño final
  if (config.tamanoFinal === undefined) config.tamanoFinal = config.encoger ? 0 : 1;

  const sistema = new Particulas();
  const lienzo = h('canvas', { class: 'lienzo-particulas', width: '360', height: '300', 'aria-label': 'Vista previa del efecto' });
  const controles = h('div', { class: 'controles-particulas' });
  const nombre = h('input', { class: 'campo', type: 'text', value: editar ?? 'miEfecto', spellcheck: 'false', 'aria-label': 'Nombre del efecto', 'data-ruta': 'efecto.nombre' });
  const base = h('select', { class: 'campo', 'aria-label': 'Empezar desde', 'data-ruta': 'efecto.base' },
    h('option', { value: '' }, 'Empezar desde…'),
    Object.keys(BASES_PARTICULAS).map((n) => h('option', { value: n }, n)),
  );
  base.addEventListener('change', () => {
    if (!base.value) return;
    config = structuredClone(BASES_PARTICULAS[base.value]);
    if (config.tamanoFinal === undefined) config.tamanoFinal = config.encoger ? 0 : 1;
    base.value = '';
    sistema.vaciar();
    pintarControles();
  });

  function pintarControles(): void {
    const filas = DESLIZADORES.map(([k, texto, min, max, paso, ayuda]) => {
      const etiqueta = h('span', { class: 'valor-deslizador' }, String(valor(config, k)));
      const control = h('input', { type: 'range', min: String(min), max: String(max), step: String(paso), value: String(valor(config, k)), 'data-ruta': `efecto.${k}`, 'aria-label': texto });
      control.addEventListener('input', () => {
        (config[k] as number) = Number(control.value);
        etiqueta.textContent = control.value;
        if (k === 'tamanoFinal') config.encoger = Number(control.value) < 1;
      });
      return h('label', { class: 'fila-particula', title: ayuda }, h('span', {}, texto), control, etiqueta);
    });
    const colores = h('div', { class: 'colores-particula' },
      config.colores.map((c, i) => h('div', { class: 'color-particula' },
        campoColor(`color ${i + 1}`, `efecto.color${i}`, c, (v) => {
          config.colores[i] = v;
        }),
        config.colores.length > 1 ? h('button', { class: 'boton-enlace', title: 'Quitar este color', onclick: () => {
          config.colores.splice(i, 1);
          pintarControles();
        } }, '✕') : null,
      )),
      config.colores.length < 6 ? h('button', { class: 'boton-enlace', onclick: () => {
        config.colores.push('blanco');
        pintarControles();
      } }, '+ Otro color') : null,
    );
    const forma = h('select', { class: 'campo', 'data-ruta': 'efecto.forma', 'aria-label': 'Forma' }, FORMAS_PARTICULA.map((f) => h('option', { value: f, selected: (config.forma ?? 'circulo') === f }, f)));
    forma.addEventListener('change', () => (config.forma = forma.value as ConfigParticulas['forma']));
    const brillo = h('input', { type: 'checkbox', checked: config.mezcla === 'sumar', 'data-ruta': 'efecto.mezcla' });
    brillo.addEventListener('change', () => (config.mezcla = brillo.checked ? 'sumar' : 'normal'));
    const cambiaColor = h('input', { type: 'checkbox', checked: !!config.colorFinal, 'data-ruta': 'efecto.cambiaColor' });
    cambiaColor.addEventListener('change', () => {
      config.colorFinal = cambiaColor.checked ? '#000000' : undefined;
      pintarControles();
    });
    controles.replaceChildren(...[
      h('div', { class: 'fila-particula' }, h('span', {}, 'forma'), forma),
      colores,
      h('label', { class: 'casilla-particula', title: 'Cambian de color mientras viven' }, cambiaColor, ' Acaban de otro color'),
      config.colorFinal ? campoColor('color final', 'efecto.colorFinal', config.colorFinal, (v) => (config.colorFinal = v)) : null,
      h('label', { class: 'casilla-particula', title: 'Mezcla «sumar»: la luz se suma y brillan (fuego, chispas, magia)' }, brillo, ' Brillan (suman luz)'),
      ...filas,
    ].filter((x): x is HTMLElement => x !== null));
  }

  // La vista previa: el efecto en marcha, en el centro (los de golpe se repiten cada segundo y medio)
  const r = { ctx: lienzo.getContext('2d') } as Renderizador;
  let ultimo = performance.now();
  let reloj = 0;
  let acumulado = 0;
  let animando = true;
  const paso = (ahora: number) => {
    if (!animando || !lienzo.isConnected) return;
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    reloj -= dt;
    if ((config.porSegundo ?? 0) > 0) {
      acumulado += (config.porSegundo ?? 0) * dt;
      const n = Math.floor(acumulado);
      acumulado -= n;
      if (n) sistema.emitir(config, 0, 0, n);
    } else if (reloj <= 0) {
      sistema.emitir(config, 0, 0);
      reloj = 1.5;
    }
    sistema.actualizar(dt);
    if (r.ctx) {
      r.ctx.fillStyle = '#141824';
      r.ctx.fillRect(0, 0, 360, 300);
      sistema.dibujar(r, (x, y) => ({ x: 180 + x, y: 170 - y }));
    }
    requestAnimationFrame(paso);
  };

  pintarControles();
  const contenido = h('div', { class: 'editor-particulas' },
    h('div', { class: 'columna-vista' },
      lienzo,
      h('div', { class: 'fila-nombre' }, h('span', {}, 'Nombre:'), nombre),
      base,
      h('p', { class: 'nota' }, 'Úsalo en el código con efecto.usar("', h('code', {}, nombre.value), '", yo), o ponlo a un objeto en su sección Efecto.'),
    ),
    controles,
  );
  nombre.addEventListener('input', () => {
    const codigo = contenido.querySelector('.columna-vista code');
    if (codigo) codigo.textContent = nombre.value;
  });
  abrirDialogo(editar ? `Efecto: ${editar}` : 'Nuevo efecto de partículas', contenido, [
    { texto: 'Cancelar', alPulsar: () => void (animando = false) },
    {
      texto: 'Guardar',
      clase: 'principal',
      alPulsar: () => {
        const n = nombre.value.trim();
        if (n in RECETAS || n in TIPOS_PARTICULAS) {
          notificar(`«${n}» ya es un efecto de Chispa. Ponle otro nombre al tuyo.`, 'error');
          return false;
        }
        const guardado = estado.guardarEfecto(n, config, editar);
        if (!guardado) {
          notificar('El nombre tiene que empezar por una letra y tener solo letras, números, espacios o _ (como mucho 40).', 'error');
          return false;
        }
        animando = false;
        notificar(`Efecto «${guardado}» guardado. En el código: efecto.usar("${guardado}", yo)`, 'ok');
        return true;
      },
    },
  ], 'dialogo-particulas');
  requestAnimationFrame(paso);
}
