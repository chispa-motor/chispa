/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * GENERADOR DE EFECTOS DE SONIDO (la ventana del editor): se pulsa un botón
 * (Salto, Moneda, Explosión...) y sale un sonido nuevo cada vez; se retoca con
 * los deslizadores, se escucha y se guarda en el proyecto con un nombre.
 * Luego se usa como cualquier sonido: sonido.reproducir("nombre").
 *
 * En el proyecto se guardan sus números (no un archivo): ocupa muy poco y se
 * puede volver a abrir para cambiarlo.
 */
import {
  FRECUENCIA_MUESTREO, LIMITES_SONIDO, NOMBRES_TIPOS_SONIDO, ONDAS, SONIDO_BASE, TIPOS_DE_SONIDO,
  duracionDe, generarSonido, mutarSonido, sonidoDeTipo, type Onda, type ParamsSonido,
} from '../../sonido/generador';
import type { EstadoEditor } from '../estado/EstadoEditor';
import { abrirDialogo, notificar } from '../interfaz/dialogos';
import { h } from '../interfaz/dom';
import { callar, tocar } from './audioEditor';

type Dato = Exclude<keyof ParamsSonido, 'onda' | 'semilla'>;

/** Los deslizadores, por grupos: dato, texto, paso y ayuda. */
const GRUPOS: [string, [Dato, string, number, string][]][] = [
  ['Volumen en el tiempo', [
    ['ataque', 'ataque', 0.005, 'Segundos que tarda en subir el volumen (0 = empieza de golpe)'],
    ['sostenido', 'sostenido', 0.005, 'Segundos que se mantiene'],
    ['golpe', 'golpe', 0.01, 'Fuerza extra al principio: un golpe seco'],
    ['caida', 'caída', 0.005, 'Segundos que tarda en apagarse'],
  ]],
  ['Nota', [
    ['frecuencia', 'nota', 1, 'Lo aguda o grave que es (hercios: 440 es un La)'],
    ['deslizar', 'deslizar', 0.05, 'La nota sube (+) o baja (−) mientras suena'],
    ['acelerar', 'acelerar', 0.1, 'El deslizar cambia: empieza subiendo y acaba bajando, o al revés'],
    ['frecuenciaMinima', 'corte', 1, 'Si la nota baja de aquí, el sonido se corta (0 = no se corta)'],
    ['vibrato', 'vibrato', 0.1, 'Cuánto tiembla la nota'],
    ['velocidadVibrato', 'vel. vibrato', 0.5, 'Cuántas veces por segundo tiembla'],
    ['salto', 'salto', 1, 'Un cambio de nota de golpe (el «tilín» de una moneda), en semitonos'],
    ['cuandoSalta', 'cuándo salta', 0.005, 'A los cuántos segundos da el salto (0 = no salta)'],
    ['repetir', 'repetir', 0.005, 'Cada cuántos segundos vuelve a empezar la nota (0 = no se repite)'],
  ]],
  ['Onda cuadrada', [
    ['ancho', 'ancho', 0.01, 'El ancho de la onda cuadrada: cambia su timbre (0.5 = cuadrada del todo)'],
    ['cambioAncho', 'cambio', 0.02, 'El ancho cambia mientras suena'],
  ]],
  ['Filtros y eco', [
    ['quitarAgudos', 'quitar agudos', 10, 'Apaga lo que está por encima de esta frecuencia (a tope = no quita nada)'],
    ['cambioAgudos', 'se mueve', 0.05, 'El filtro de agudos se cierra (−) o se abre (+) mientras suena'],
    ['resonancia', 'silbido', 0.01, 'El filtro «silba» en su frecuencia'],
    ['quitarGraves', 'quitar graves', 5, 'Apaga lo que está por debajo de esta frecuencia (0 = no quita nada)'],
    ['cambioGraves', 'se mueve', 0.05, 'El filtro de graves se mueve mientras suena'],
    ['eco', 'eco', 0.1, 'Un eco muy corto (milisegundos): suena a láser o a avión'],
    ['cambioEco', 'cambio de eco', 0.5, 'El eco cambia mientras suena'],
  ]],
  ['Volumen', [['volumen', 'volumen', 0.01, 'Lo fuerte que suena']]],
];

const NOMBRES_ONDAS: Record<Onda, string> = { cuadrada: 'Cuadrada', sierra: 'Sierra', seno: 'Suave (seno)', triangulo: 'Triángulo', ruido: 'Ruido' };

/** Abre el generador (con un sonido del proyecto para cambiarlo, o vacío para hacer uno nuevo). */
export function abrirEditorSonidos(estado: EstadoEditor, editar?: string): void {
  let p: ParamsSonido = { ...(editar ? estado.proyecto.sonidosHechos?.[editar] : undefined) ?? sonidoDeTipo('moneda') };
  let muestras = generarSonido(p);

  const lienzo = h('canvas', { class: 'lienzo-sonido', width: '360', height: '110', 'aria-label': 'La forma del sonido' });
  const duracion = h('span', { class: 'nota' }, '');
  const controles = h('div', { class: 'controles-particulas' });
  const nombre = h('input', { class: 'campo', type: 'text', value: editar ?? 'miSonido', spellcheck: 'false', 'aria-label': 'Nombre del sonido', 'data-ruta': 'sonido.nombre' });
  const codigo = h('code', {}, nombre.value);
  nombre.addEventListener('input', () => (codigo.textContent = nombre.value));

  /** Pinta la forma del sonido: cada columna, de su valor más bajo al más alto. */
  function pintar(): void {
    const ctx = lienzo.getContext('2d');
    duracion.textContent = `Dura ${duracionDe(p).toFixed(2)} s`;
    if (!ctx) return;
    ctx.fillStyle = '#141824';
    ctx.fillRect(0, 0, 360, 110);
    ctx.fillStyle = '#f1c40f';
    const porColumna = muestras.length / 360;
    for (let x = 0; x < 360; x++) {
      let min = 0;
      let max = 0;
      for (let i = Math.floor(x * porColumna); i < (x + 1) * porColumna && i < muestras.length; i++) {
        if (muestras[i] < min) min = muestras[i];
        if (muestras[i] > max) max = muestras[i];
      }
      ctx.fillRect(x, 55 - max * 52, 1, Math.max(1, (max - min) * 52));
    }
  }

  function sonar(): void {
    muestras = generarSonido(p);
    pintar();
    tocar(muestras, FRECUENCIA_MUESTREO);
  }

  function pintarControles(): void {
    const onda = h('select', { class: 'campo', 'data-ruta': 'sonido.onda', 'aria-label': 'Onda' }, ONDAS.map((o) => h('option', { value: o, selected: p.onda === o }, NOMBRES_ONDAS[o])));
    onda.addEventListener('change', () => {
      p.onda = onda.value as Onda;
      pintarControles();
      sonar();
    });
    const grupos = GRUPOS.filter(([titulo]) => titulo !== 'Onda cuadrada' || p.onda === 'cuadrada').flatMap(([titulo, filas]) => [
      h('h4', { class: 'titulo-grupo-sonido' }, titulo),
      ...filas.map(([k, texto, paso, ayuda]) => {
        const [min, max] = LIMITES_SONIDO[k];
        // Los números grandes (hercios), sin decimales; los pequeños, con dos
        const escribir = (v: number) => (paso >= 1 ? String(Math.round(v)) : String(Math.round(v * 100) / 100));
        const valor = h('span', { class: 'valor-deslizador' }, escribir(p[k]));
        const control = h('input', { type: 'range', min: String(min), max: String(max), step: String(paso), value: String(p[k]), 'data-ruta': `sonido.${k}`, 'aria-label': texto });
        control.addEventListener('input', () => {
          p[k] = Number(control.value);
          valor.textContent = escribir(p[k]);
        });
        // Suena al soltar el deslizador (no en cada milímetro)
        control.addEventListener('change', sonar);
        return h('label', { class: 'fila-particula', title: ayuda }, h('span', {}, texto), control, valor);
      }),
    ]);
    controles.replaceChildren(h('div', { class: 'fila-particula' }, h('span', {}, 'onda'), onda), ...grupos);
  }

  const cambiar = (nuevo: ParamsSonido) => {
    p = nuevo;
    pintarControles();
    sonar();
  };
  const tipos = h('div', { class: 'botones-sonido' },
    TIPOS_DE_SONIDO.map((t) => h('button', { class: 'boton', 'data-tipo': t, title: `Un sonido nuevo de «${NOMBRES_TIPOS_SONIDO[t]}». Cada vez que pulsas sale uno distinto.`, onclick: () => cambiar(sonidoDeTipo(t)) }, NOMBRES_TIPOS_SONIDO[t])),
  );
  const acciones = h('div', { class: 'botones-sonido' },
    h('button', { class: 'boton principal', 'data-accion': 'escuchar', onclick: sonar }, '▶ Escuchar'),
    h('button', { class: 'boton', 'data-accion': 'variar', title: 'El mismo sonido, cambiado un poquito', onclick: () => cambiar(mutarSonido(p)) }, 'Variar un poco'),
    h('button', { class: 'boton', 'data-accion': 'limpiar', title: 'Empezar de un pitido sencillo', onclick: () => cambiar({ ...SONIDO_BASE }) }, 'Empezar de cero'),
  );

  pintarControles();
  pintar();
  const contenido = h('div', { class: 'editor-particulas editor-sonidos' },
    h('div', { class: 'columna-vista' },
      h('p', { class: 'nota' }, 'Pulsa un botón hasta que salga un sonido que te guste:'),
      tipos,
      lienzo,
      duracion,
      acciones,
      h('div', { class: 'fila-nombre' }, h('span', {}, 'Nombre:'), nombre),
      h('p', { class: 'nota' }, 'En el código: sonido.reproducir("', codigo, '")'),
    ),
    controles,
  );
  abrirDialogo(editar ? `Sonido: ${editar}` : 'Nuevo efecto de sonido', contenido, [
    { texto: 'Cancelar', alPulsar: callar },
    {
      texto: 'Guardar',
      clase: 'principal',
      alPulsar: () => {
        const guardado = estado.guardarSonidoHecho(nombre.value, p, editar);
        if (!guardado) {
          notificar('El nombre tiene que tener alguna letra (como mucho 40).', 'error');
          return false;
        }
        callar();
        notificar(`Sonido «${guardado}» guardado. En el código: sonido.reproducir("${guardado}")`, 'ok');
        return true;
      },
    },
  ], 'dialogo-particulas');
}
