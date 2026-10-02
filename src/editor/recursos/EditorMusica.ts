/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EDITOR DE MÚSICA (la ventana): una rejilla donde cada fila es una nota y
 * cada columna un momento (un «paso»). Se hace clic para poner una nota, se
 * arrastra hacia la derecha para alargarla y se hace clic encima para
 * quitarla. Hay varias pistas, cada una con su instrumento (piano, bajo,
 * batería...), un tempo y un botón para escucharla en bucle.
 *
 * Con una ESCALA puesta (lo normal: pentatónica) la rejilla solo enseña las
 * notas que suenan bien juntas: cuesta mucho que algo suene mal.
 *
 * La canción se guarda en el proyecto con un nombre y se usa como cualquier
 * música: musica.reproducir("nombre"). Cada pista es una capa que se puede
 * subir y bajar mientras se juega (musica.capa, musica.intensidad).
 */
import {
  ESCALAS, FRECUENCIA_MUSICA, INSTRUMENTOS, LIMITES_CANCION, NOMBRES_INSTRUMENTOS, PASOS_POR_PULSO, TAMBORES,
  cambiarPasos, cancionDeEjemplo, cancionVacia, duracionDeCancion, nombreDeNota, notasDeEscala, ponerNota, quitarNota,
  renderizarCancion, type DefCancion, type Instrumento, type NotaCancion,
} from '../../sonido/musica';
import type { EstadoEditor } from '../estado/EstadoEditor';
import { abrirDialogo, notificar } from '../interfaz/dialogos';
import { h } from '../interfaz/dom';
import { callar, porDondeVa, tocar } from './audioEditor';

const ANCHO_PASO = 22;
const ALTO_FILA = 18;
const ANCHO_TECLAS = 64;
const NOMBRES_ESCALAS: Record<string, string> = { pentatonica: 'Pentatónica (la más fácil)', mayor: 'Mayor (alegre)', menor: 'Menor (triste)', todas: 'Todas las notas' };
const NOMBRES_TAMBORES: Record<string, string> = { bombo: 'Bombo', caja: 'Caja', charles: 'Charles', plato: 'Plato', tom: 'Tom' };
/** Un color por pista (el de sus notas en la rejilla). */
const COLORES_PISTA = ['#f1c40f', '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#ff7eb6'];

/** La escala con menos notas en la que caben todas las de la canción (para abrirla sin esconder ninguna). */
export function escalaDe(c: DefCancion): string {
  const usadas = new Set(c.pistas.filter((p) => p.instrumento !== 'bateria').flatMap((p) => p.notas.map((n) => n.nota % 12)));
  return ['pentatonica', 'mayor', 'menor'].find((e) => [...usadas].every((n) => ESCALAS[e].includes(n))) ?? 'todas';
}

/** Abre el editor (con una canción del proyecto para cambiarla, o una vacía). */
export function abrirEditorMusica(estado: EstadoEditor, editar?: string): void {
  let cancion: DefCancion = structuredClone((editar ? estado.proyecto.canciones?.[editar] : undefined) ?? cancionVacia());
  let iPista = 0;
  let escala = escalaDe(cancion);
  let sonandoCancion = false;
  let abierto = true;

  const teclas = h('canvas', { class: 'teclas-musica' });
  const rejilla = h('canvas', { class: 'rejilla-musica', 'aria-label': 'Rejilla de notas: clic para poner o quitar una nota' });
  const zona = h('div', { class: 'zona-musica' }, teclas, rejilla);
  const barraPistas = h('div', { class: 'pistas-musica' });
  const nombre = h('input', { class: 'campo', type: 'text', value: editar ?? 'miCancion', spellcheck: 'false', 'aria-label': 'Nombre de la canción', 'data-ruta': 'cancion.nombre' });
  const codigo = h('code', {}, nombre.value);
  nombre.addEventListener('input', () => (codigo.textContent = nombre.value));
  const info = h('span', { class: 'nota' }, '');

  const pista = () => cancion.pistas[iPista];
  /** Las filas de la rejilla, de arriba abajo: las notas de la escala (o los tambores). */
  const filas = (): number[] => (pista().instrumento === 'bateria' ? TAMBORES.map((_, i) => i) : notasDeEscala(escala, pista().instrumento === 'bajo' ? 28 : 48, pista().instrumento === 'bajo' ? 60 : 88));

  function pintar(): void {
    const f = filas();
    const ancho = cancion.pasos * ANCHO_PASO;
    const alto = f.length * ALTO_FILA;
    for (const [c, w] of [[teclas, ANCHO_TECLAS], [rejilla, ancho]] as const) {
      if (c.width !== w || c.height !== alto) {
        c.width = w;
        c.height = alto;
      }
    }
    const t = teclas.getContext('2d');
    const g = rejilla.getContext('2d');
    info.textContent = `${cancion.pasos} pasos · ${duracionDeCancion(cancion).toFixed(1)} s`;
    if (!t || !g) return;
    const esBateria = pista().instrumento === 'bateria';
    // Las «teclas»: el nombre de cada fila
    t.font = '11px system-ui, sans-serif';
    t.textBaseline = 'middle';
    f.forEach((nota, i) => {
      const negra = !esBateria && [1, 3, 6, 8, 10].includes(nota % 12);
      t.fillStyle = negra ? '#20242f' : esBateria || nota % 12 === 0 ? '#3a4152' : '#2c3140';
      t.fillRect(0, i * ALTO_FILA, ANCHO_TECLAS, ALTO_FILA - 1);
      t.fillStyle = '#d7dce5';
      t.fillText(esBateria ? NOMBRES_TAMBORES[TAMBORES[nota]] : nombreDeNota(nota), 6, i * ALTO_FILA + ALTO_FILA / 2);
    });
    // La rejilla: filas, columnas (más marcadas cada pulso y cada compás)
    g.fillStyle = '#141824';
    g.fillRect(0, 0, ancho, alto);
    f.forEach((nota, i) => {
      if (!esBateria && nota % 12 === 0) {
        g.fillStyle = '#1b2130';
        g.fillRect(0, i * ALTO_FILA, ancho, ALTO_FILA);
      }
    });
    for (let p = 0; p <= cancion.pasos; p++) {
      g.fillStyle = p % (PASOS_POR_PULSO * 4) === 0 ? '#4a5368' : p % PASOS_POR_PULSO === 0 ? '#323a4c' : '#222838';
      g.fillRect(p * ANCHO_PASO, 0, 1, alto);
    }
    g.fillStyle = '#222838';
    for (let i = 1; i < f.length; i++) g.fillRect(0, i * ALTO_FILA, ancho, 1);
    // Las notas de las otras pistas (flojitas, para orientarse) y las de esta
    const dibujar = (n: NotaCancion, color: string, alfa: number) => {
      const fila = f.indexOf(n.nota);
      if (fila < 0) return;
      g.globalAlpha = alfa;
      g.fillStyle = color;
      g.fillRect(n.paso * ANCHO_PASO + 1, fila * ALTO_FILA + 1, Math.max(1, n.largo) * ANCHO_PASO - 2, ALTO_FILA - 2);
      g.globalAlpha = 1;
    };
    cancion.pistas.forEach((p, i) => {
      if (i === iPista || (p.instrumento === 'bateria') !== esBateria) return;
      for (const n of p.notas) dibujar(n, COLORES_PISTA[i % COLORES_PISTA.length], 0.22);
    });
    for (const n of pista().notas) dibujar(n, COLORES_PISTA[iPista % COLORES_PISTA.length], 1);
    // Las notas de esta pista que la escala esconde: se avisa (no se pierden)
    const escondidas = esBateria ? 0 : pista().notas.filter((n) => !f.includes(n.nota)).length;
    if (escondidas) info.textContent += ` · ${escondidas} nota${escondidas === 1 ? '' : 's'} fuera de esta escala (elige «Todas las notas» para verlas)`;
  }

  /** Vuelve a sonar (si estaba sonando) por donde iba, con los cambios. */
  function refrescarSonido(): void {
    if (!sonandoCancion) return;
    const por = porDondeVa() ?? 0;
    tocar(renderizarCancion(cancion), FRECUENCIA_MUSICA, { bucle: true, desde: por });
  }

  function pintarPistas(): void {
    barraPistas.replaceChildren(
      ...cancion.pistas.map((p, i) => {
        const instrumento = h('select', { class: 'campo', 'aria-label': `Instrumento de la pista ${i + 1}`, 'data-ruta': `cancion.pista${i}.instrumento` }, INSTRUMENTOS.map((x) => h('option', { value: x, selected: p.instrumento === x }, NOMBRES_INSTRUMENTOS[x])));
        instrumento.addEventListener('change', () => {
          const antes = p.instrumento;
          p.instrumento = instrumento.value as Instrumento;
          // De batería a notas (o al revés) las «notas» no significan lo mismo: se empieza de cero
          if ((antes === 'bateria') !== (p.instrumento === 'bateria')) p.notas = [];
          iPista = i;
          todo();
        });
        const volumen = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(p.volumen), title: 'Volumen de la pista', 'aria-label': `Volumen de la pista ${i + 1}` });
        volumen.addEventListener('change', () => {
          p.volumen = Number(volumen.value);
          refrescarSonido();
        });
        return h('div', { class: `pista-musica ${i === iPista ? 'activa' : ''}`, style: `--color-pista: ${COLORES_PISTA[i % COLORES_PISTA.length]}`, onclick: (ev: MouseEvent) => {
          if (ev.target instanceof HTMLSelectElement || ev.target instanceof HTMLInputElement || ev.target instanceof HTMLButtonElement) return;
          iPista = i;
          todo();
        } },
          h('span', { class: 'numero-pista' }, String(i + 1)),
          instrumento,
          volumen,
          cancion.pistas.length > 1 ? h('button', { class: 'boton-enlace', title: 'Quitar esta pista', 'aria-label': `Quitar la pista ${i + 1}`, onclick: () => {
            cancion.pistas.splice(i, 1);
            iPista = Math.min(iPista, cancion.pistas.length - 1);
            todo();
          } }, '✕') : null,
        );
      }),
      cancion.pistas.length < LIMITES_CANCION.pistas ? h('button', { class: 'boton', 'data-accion': 'nueva-pista', title: 'Otra pista, con otro instrumento', onclick: () => {
        const usados = cancion.pistas.map((p) => p.instrumento);
        cancion.pistas.push({ instrumento: (['bajo', 'bateria', 'chip', 'flauta'] as Instrumento[]).find((x) => !usados.includes(x)) ?? 'piano', volumen: 0.8, notas: [] });
        iPista = cancion.pistas.length - 1;
        todo();
      } }, '+ Pista') : '',
    );
  }

  function todo(): void {
    pintarPistas();
    pintar();
    refrescarSonido();
  }

  // ── Poner y quitar notas con el ratón ──
  let arrastre: { paso: number; nota: number } | null = null;
  const celda = (ev: MouseEvent) => {
    const r = rejilla.getBoundingClientRect();
    const f = filas();
    const paso = Math.floor(((ev.clientX - r.left) / r.width) * cancion.pasos);
    const fila = Math.floor(((ev.clientY - r.top) / r.height) * f.length);
    return fila >= 0 && fila < f.length && paso >= 0 && paso < cancion.pasos ? { paso, nota: f[fila] } : null;
  };
  /** Se oye la nota al ponerla. */
  const probar = (nota: number) => {
    if (sonandoCancion) return;
    const una: DefCancion = { tempo: 120, pasos: 4, bucle: false, pistas: [{ instrumento: pista().instrumento, volumen: pista().volumen, notas: [{ paso: 0, nota, largo: 2 }] }] };
    tocar(renderizarCancion(una), FRECUENCIA_MUSICA);
  };
  rejilla.addEventListener('mousedown', (ev) => {
    const c = celda(ev);
    if (!c) return;
    ev.preventDefault();
    if (quitarNota(pista(), c.paso, c.nota)) {
      pintar();
      refrescarSonido();
      return;
    }
    if (!ponerNota(cancion, pista(), c.paso, c.nota, 1)) {
      notificar(`Una pista puede tener ${LIMITES_CANCION.notasPorPista} notas como mucho.`, 'error');
      return;
    }
    arrastre = c;
    probar(c.nota);
    pintar();
  });
  const mover = (ev: MouseEvent) => {
    if (!arrastre || pista().instrumento === 'bateria') return;
    const r = rejilla.getBoundingClientRect();
    const paso = Math.max(arrastre.paso, Math.min(cancion.pasos - 1, Math.floor(((ev.clientX - r.left) / r.width) * cancion.pasos)));
    ponerNota(cancion, pista(), arrastre.paso, arrastre.nota, paso - arrastre.paso + 1);
    pintar();
  };
  const soltar = () => {
    if (!arrastre) return;
    arrastre = null;
    refrescarSonido();
  };
  window.addEventListener('mousemove', mover);
  window.addEventListener('mouseup', soltar);

  // ── La barra de arriba ──
  const tempo = h('input', { class: 'campo', type: 'number', min: String(LIMITES_CANCION.tempoMin), max: String(LIMITES_CANCION.tempoMax), value: String(cancion.tempo), 'aria-label': 'Tempo', 'data-ruta': 'cancion.tempo', title: 'Lo rápida que va: pulsos por minuto (120 es lo normal)' });
  tempo.addEventListener('change', () => {
    cancion.tempo = Math.max(LIMITES_CANCION.tempoMin, Math.min(LIMITES_CANCION.tempoMax, Math.round(Number(tempo.value) || 120)));
    tempo.value = String(cancion.tempo);
    todo();
  });
  const pasos = h('select', { class: 'campo', 'aria-label': 'Cuánto dura', 'data-ruta': 'cancion.pasos', title: 'Cuánto dura: 16 pasos son un compás' }, [16, 32, 48, 64, 96, 128].map((n) => h('option', { value: String(n), selected: cancion.pasos === n }, `${n / 16} ${n === 16 ? 'compás' : 'compases'}`)));
  if (![16, 32, 48, 64, 96, 128].includes(cancion.pasos)) pasos.append(h('option', { value: String(cancion.pasos), selected: true }, `${cancion.pasos} pasos`));
  pasos.addEventListener('change', () => {
    cambiarPasos(cancion, Number(pasos.value));
    todo();
  });
  const selectorEscala = h('select', { class: 'campo', 'aria-label': 'Escala', 'data-ruta': 'cancion.escala', title: 'Qué notas enseña la rejilla. Con «pentatónica» casi todo suena bien.' }, Object.keys(ESCALAS).map((e) => h('option', { value: e, selected: escala === e }, NOMBRES_ESCALAS[e])));
  selectorEscala.addEventListener('change', () => {
    escala = selectorEscala.value;
    pintar();
  });
  const bucle = h('input', { type: 'checkbox', checked: cancion.bucle !== false, 'data-ruta': 'cancion.bucle' });
  bucle.addEventListener('change', () => (cancion.bucle = bucle.checked));
  const botonTocar = h('button', { class: 'boton principal', 'data-accion': 'tocar', onclick: () => {
    if (sonandoCancion) {
      sonandoCancion = false;
      callar();
    } else {
      sonandoCancion = tocar(renderizarCancion(cancion), FRECUENCIA_MUSICA, { bucle: true });
      if (!sonandoCancion) notificar('Este navegador no puede reproducir sonido.', 'error');
    }
    botonTocar.textContent = sonandoCancion ? '■ Parar' : '▶ Escuchar';
  } }, '▶ Escuchar');
  const raya = h('div', { class: 'raya-musica' });
  zona.append(raya);

  // La raya que avanza mientras suena
  const animar = () => {
    if (!abierto || !zona.isConnected) return cerrar();
    const por = sonandoCancion ? porDondeVa() : null;
    raya.style.display = por === null ? 'none' : 'block';
    if (por !== null) raya.style.left = `${ANCHO_TECLAS + por * cancion.pasos * ANCHO_PASO}px`;
    requestAnimationFrame(animar);
  };
  const cerrar = () => {
    abierto = false;
    sonandoCancion = false;
    callar();
    window.removeEventListener('mousemove', mover);
    window.removeEventListener('mouseup', soltar);
  };

  const contenido = h('div', { class: 'editor-musica' },
    h('div', { class: 'barra-musica' },
      botonTocar,
      h('label', { class: 'campo-musica' }, 'Tempo', tempo),
      h('label', { class: 'campo-musica' }, 'Dura', pasos),
      h('label', { class: 'campo-musica' }, 'Escala', selectorEscala),
      h('label', { class: 'casilla-particula', title: 'Al acabar, vuelve a empezar (lo normal en la música de un juego)' }, bucle, ' Se repite'),
      h('button', { class: 'boton', 'data-accion': 'ejemplo', title: 'Una canción corta de ejemplo, para ver cómo se hace', onclick: () => {
        cancion = cancionDeEjemplo();
        iPista = 0;
        escala = escalaDe(cancion);
        selectorEscala.value = escala;
        tempo.value = String(cancion.tempo);
        pasos.value = String(cancion.pasos);
        todo();
      } }, 'Ejemplo'),
      h('button', { class: 'boton', 'data-accion': 'vaciar', title: 'Quita todas las notas de esta pista', onclick: () => {
        pista().notas = [];
        todo();
      } }, 'Vaciar pista'),
    ),
    barraPistas,
    zona,
    h('div', { class: 'pie-musica' },
      h('span', { class: 'fila-nombre' }, h('span', {}, 'Nombre:'), nombre),
      h('span', { class: 'nota' }, 'En el código: musica.reproducir("', codigo, '")'),
      info,
    ),
    h('p', { class: 'nota' }, 'Clic: poner una nota · arrastra a la derecha: alargarla · clic encima: quitarla. Cada pista es una capa: con musica.intensidad se suben y bajan mientras juegas.'),
  );
  todo();
  abrirDialogo(editar ? `Canción: ${editar}` : 'Nueva canción', contenido, [
    { texto: 'Cancelar', alPulsar: cerrar },
    {
      texto: 'Guardar',
      clase: 'principal',
      alPulsar: () => {
        if (!cancion.pistas.some((p) => p.notas.length)) {
          notificar('La canción no tiene ninguna nota. Haz clic en la rejilla para poner alguna (o pulsa «Ejemplo»).', 'error');
          return false;
        }
        const guardada = estado.guardarCancion(nombre.value, cancion, editar);
        if (!guardada) {
          notificar('El nombre tiene que tener alguna letra (como mucho 40).', 'error');
          return false;
        }
        cerrar();
        notificar(`Canción «${guardada}» guardada. En el código: musica.reproducir("${guardada}")`, 'ok');
        return true;
      },
    },
  ], 'dialogo-musica');
  // Que se vea la zona de en medio (ni lo más agudo ni lo más grave)
  zona.scrollTop = Math.max(0, (rejilla.height - zona.clientHeight) / 2);
  requestAnimationFrame(animar);
}
