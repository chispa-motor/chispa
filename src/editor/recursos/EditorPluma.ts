/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LA PLUMA: dibujar formas propias punto a punto.
 *
 *   - clic: un punto nuevo (al final del camino);
 *   - clic y ARRASTRAR: un punto con curva (lo que arrastras es su tirador);
 *   - clic en el primer punto: se cierra el camino (y se rellena);
 *   - arrastrar un punto o un tirador: moverlo (con Alt, el tirador se
 *     mueve solo, sin su pareja: una esquina con curva);
 *   - doble clic en un punto: de esquina a curva y al revés;
 *   - Supr: borra el punto elegido.
 *
 * El modelo (ModeloPluma) no sabe nada de la pantalla: así se prueba solo.
 * Las coordenadas son unidades del tamaño del objeto (de -0,5 a 0,5), con
 * la Y hacia arriba.
 */
import type { PuntoCamino, Punto } from '../../objetos/formas/figuras';
import { aplanarCamino, MAX_PUNTOS_CAMINO } from '../../objetos/formas/figuras';
import { resolverColor } from '../../motor/Color';
import type { EstadoEditor, RefObjeto } from '../estado/EstadoEditor';
import { abrirDialogo, notificar } from '../interfaz/dialogos';
import { botonIcono, h } from '../interfaz/dom';
import { caminoDeForma } from './operacionesFormas';

/** Qué hay debajo del ratón: un punto, uno de sus tiradores o nada. */
export type Agarre = { tipo: 'punto'; indice: number } | { tipo: 'entrada' | 'salida'; indice: number } | null;

export class ModeloPluma {
  puntos: PuntoCamino[];
  cerrado: boolean;
  elegido: number | null = null;
  /** Para deshacer dentro del editor (Ctrl+Z). */
  private historial: string[] = [];

  constructor(puntos: PuntoCamino[] = [], cerrado = false) {
    this.puntos = structuredClone(puntos);
    this.cerrado = cerrado && puntos.length >= 3;
  }

  private apuntar(): void {
    this.historial.push(JSON.stringify({ p: this.puntos, c: this.cerrado }));
    if (this.historial.length > 100) this.historial.shift();
  }

  deshacer(): boolean {
    const antes = this.historial.pop();
    if (!antes) return false;
    const { p, c } = JSON.parse(antes) as { p: PuntoCamino[]; c: boolean };
    this.puntos = p;
    this.cerrado = c;
    this.elegido = null;
    return true;
  }

  /** Lo que hay cerca de un punto (radio en unidades). Los tiradores del punto elegido van primero. */
  agarrar(p: Punto, radio: number): Agarre {
    const cerca = (q: Punto | undefined) => !!q && Math.hypot(q.x - p.x, q.y - p.y) <= radio;
    if (this.elegido !== null) {
      const e = this.puntos[this.elegido];
      if (cerca(e?.salida)) return { tipo: 'salida', indice: this.elegido };
      if (cerca(e?.entrada)) return { tipo: 'entrada', indice: this.elegido };
    }
    for (let i = this.puntos.length - 1; i >= 0; i--) if (cerca(this.puntos[i])) return { tipo: 'punto', indice: i };
    return null;
  }

  /** Clic en un sitio vacío: un punto nuevo al final. Clic en el primero (con 3 o más): se cierra. Devuelve el agarre para arrastrar. */
  pulsar(p: Punto, radio: number): Agarre {
    const a = this.agarrar(p, radio);
    if (a?.tipo === 'punto' && a.indice === 0 && !this.cerrado && this.puntos.length >= 3) {
      this.apuntar();
      this.cerrado = true;
      this.elegido = 0;
      return null;
    }
    if (a) {
      this.apuntar();
      if (a.tipo === 'punto') this.elegido = a.indice;
      return a;
    }
    if (this.cerrado || this.puntos.length >= MAX_PUNTOS_CAMINO) {
      this.elegido = null;
      return null;
    }
    this.apuntar();
    this.puntos.push({ x: p.x, y: p.y });
    this.elegido = this.puntos.length - 1;
    // Al arrastrar un punto recién puesto, se le sacan los tiradores de curva
    return { tipo: 'salida', indice: this.elegido };
  }

  /** Arrastrar lo agarrado hasta p. `soloUno` (Alt): un tirador se mueve sin su pareja. */
  arrastrar(a: Agarre, p: Punto, soloUno = false): void {
    if (!a) return;
    const q = this.puntos[a.indice];
    if (!q) return;
    if (a.tipo === 'punto') {
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      q.x = p.x;
      q.y = p.y;
      for (const t of [q.entrada, q.salida]) {
        if (t) {
          t.x += dx;
          t.y += dy;
        }
      }
      return;
    }
    q[a.tipo] = { x: p.x, y: p.y };
    const otro = a.tipo === 'salida' ? 'entrada' : 'salida';
    // Curva suave: el otro tirador, al otro lado (como un balancín)
    if (!soloUno) q[otro] = { x: 2 * q.x - p.x, y: 2 * q.y - p.y };
    // Si casi no se ha arrastrado, no es una curva: es una esquina
    if (Math.hypot(p.x - q.x, p.y - q.y) < 0.01) {
      delete q.entrada;
      delete q.salida;
    }
  }

  /** Doble clic: una esquina pasa a curva (tiradores hacia sus vecinos) y una curva a esquina. */
  alternarCurva(indice: number): void {
    const q = this.puntos[indice];
    if (!q) return;
    this.apuntar();
    if (q.entrada || q.salida) {
      delete q.entrada;
      delete q.salida;
      return;
    }
    const n = this.puntos.length;
    const antes = this.puntos[(indice - 1 + n) % n];
    const despues = this.puntos[(indice + 1) % n];
    const dx = (despues.x - antes.x) / 4;
    const dy = (despues.y - antes.y) / 4;
    q.entrada = { x: q.x - dx, y: q.y - dy };
    q.salida = { x: q.x + dx, y: q.y + dy };
  }

  borrarElegido(): void {
    if (this.elegido === null) return;
    this.apuntar();
    this.puntos.splice(this.elegido, 1);
    if (this.puntos.length < 3) this.cerrado = false;
    this.elegido = null;
  }

  alternarCerrado(): void {
    if (this.puntos.length < 3) return;
    this.apuntar();
    this.cerrado = !this.cerrado;
  }

  vaciar(): void {
    this.apuntar();
    this.puntos = [];
    this.cerrado = false;
    this.elegido = null;
  }
}

const TAM = 440;
/** Cuánto ocupa la caja del objeto (de -0,5 a 0,5) dentro del lienzo: deja sitio para salirse. */
const ESCALA = TAM * 0.62;
const aLienzo = (p: Punto) => ({ x: TAM / 2 + p.x * ESCALA, y: TAM / 2 - p.y * ESCALA });
const desdeLienzo = (x: number, y: number): Punto => ({ x: (x - TAM / 2) / ESCALA, y: (TAM / 2 - y) / ESCALA });

/** Abre la pluma para el objeto (que pasa a ser un camino al aceptar). */
export function abrirEditorPluma(estado: EstadoEditor, ref: RefObjeto, opciones: { vacio?: boolean } = {}): void {
  const def = estado.definicion(ref);
  if (!def?.sprite) return;
  const s = def.sprite;
  const vacio = opciones.vacio || !!s.imagen || s.forma === 'texto';
  const modelo = new ModeloPluma(vacio ? [] : caminoDeForma(s), s.forma === 'camino' ? s.cerrado ?? true : (s.forma ?? 'rectangulo') !== 'linea');
  const color = resolverColor(s.color ?? 'blanco');
  let iman = true;

  const lienzo = h('canvas', { class: 'lienzo-pluma', width: String(TAM), height: String(TAM), tabindex: '0', 'aria-label': 'Dibujo de la forma con la pluma' });
  const ayuda = h('p', { class: 'nota' });
  const botonCerrar = h('button', { class: 'boton', onclick: () => cambiar(() => modelo.alternarCerrado()) });

  function pintar(): void {
    const ctx = lienzo.getContext('2d');
    ayuda.textContent = modelo.puntos.length === 0
      ? 'Haz clic para poner el primer punto. Clic y arrastrar hace una curva.'
      : modelo.cerrado
        ? 'Forma cerrada. Arrastra los puntos o sus tiradores; doble clic cambia esquina ↔ curva; Supr borra el punto elegido.'
        : modelo.puntos.length >= 3
          ? 'Sigue poniendo puntos, o haz clic en el PRIMERO (el grande) para cerrar la forma.'
          : 'Sigue poniendo puntos (clic y arrastrar: curva).';
    botonCerrar.textContent = modelo.cerrado ? 'Abrir (línea)' : 'Cerrar (rellenar)';
    botonCerrar.disabled = modelo.puntos.length < 3;
    if (!ctx) return;
    ctx.clearRect(0, 0, TAM, TAM);
    // Cuadrícula y la caja del objeto
    ctx.strokeStyle = '#ffffff14';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 20; i++) {
      const v = (TAM / 20) * i + 0.5;
      ctx.beginPath();
      ctx.moveTo(v, 0);
      ctx.lineTo(v, TAM);
      ctx.moveTo(0, v);
      ctx.lineTo(TAM, v);
      ctx.stroke();
    }
    const c0 = aLienzo({ x: -0.5, y: 0.5 });
    ctx.strokeStyle = '#ffffff40';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(c0.x, c0.y, ESCALA, ESCALA);
    ctx.setLineDash([]);
    // La forma
    const plano = aplanarCamino(modelo.puntos, modelo.cerrado).map(aLienzo);
    if (plano.length > 1) {
      ctx.beginPath();
      plano.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (modelo.cerrado) {
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.75;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Puntos y tiradores
    modelo.puntos.forEach((p, i) => {
      const c = aLienzo(p);
      if (i === modelo.elegido) {
        for (const t of [p.entrada, p.salida]) {
          if (!t) continue;
          const ct = aLienzo(t);
          ctx.strokeStyle = '#7cc4ff';
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(ct.x, ct.y);
          ctx.stroke();
          ctx.fillStyle = '#7cc4ff';
          ctx.beginPath();
          ctx.arc(ct.x, ct.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = i === modelo.elegido ? '#ffd23f' : '#ffffff';
      ctx.strokeStyle = '#000';
      const r = i === 0 && !modelo.cerrado ? 7 : 5;
      ctx.beginPath();
      if (p.entrada || p.salida) ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      else ctx.rect(c.x - r, c.y - r, r * 2, r * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  function cambiar(fn: () => void): void {
    fn();
    pintar();
  }

  const posicion = (e: PointerEvent | MouseEvent): Punto => {
    const caja = lienzo.getBoundingClientRect();
    const x = ((e.clientX - caja.left) / (caja.width || TAM)) * TAM;
    const y = ((e.clientY - caja.top) / (caja.height || TAM)) * TAM;
    const p = desdeLienzo(x, y);
    // Imán: a la cuadrícula (de 1/20 del lienzo)
    if (iman && !e.shiftKey) {
      const paso = TAM / 20 / ESCALA;
      return { x: Math.round(p.x / paso) * paso, y: Math.round(p.y / paso) * paso };
    }
    return p;
  };
  const radio = () => 9 / ESCALA;

  lienzo.addEventListener('pointerdown', (e) => {
    lienzo.focus();
    lienzo.setPointerCapture?.(e.pointerId);
    const agarre = modelo.pulsar(posicion(e), radio());
    pintar();
    const mover = (ev: PointerEvent) => cambiar(() => modelo.arrastrar(agarre, posicion(ev), ev.altKey));
    const soltar = () => {
      lienzo.removeEventListener('pointermove', mover);
      lienzo.removeEventListener('pointerup', soltar);
    };
    lienzo.addEventListener('pointermove', mover);
    lienzo.addEventListener('pointerup', soltar);
  });
  lienzo.addEventListener('dblclick', (e) => {
    const a = modelo.agarrar(posicion(e), radio());
    if (a?.tipo === 'punto') cambiar(() => modelo.alternarCurva(a.indice));
  });
  lienzo.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') cambiar(() => modelo.borrarElegido());
    else if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) cambiar(() => modelo.deshacer());
    else return;
    e.preventDefault();
    e.stopPropagation();
  });

  const contenido = h('div', { class: 'editor-pluma' },
    lienzo,
    h('div', { class: 'barra-pluma' },
      botonCerrar,
      h('button', { class: 'boton', title: 'Borrar el punto elegido (Supr)', onclick: () => cambiar(() => modelo.borrarElegido()) }, 'Borrar punto'),
      botonIcono('deshacer', 'Deshacer (Ctrl+Z)', () => cambiar(() => modelo.deshacer())),
      h('button', { class: 'boton', title: 'Quitar todos los puntos y empezar otra vez', onclick: () => cambiar(() => modelo.vaciar()) }, 'Empezar de nuevo'),
      h('label', { class: 'casilla-pluma', title: 'Coloca los puntos en la cuadrícula (con Mayúsculas, libre)' },
        h('input', { type: 'checkbox', checked: true, onchange: (ev: Event) => (iman = (ev.target as HTMLInputElement).checked) }), ' Imán'),
    ),
    ayuda,
  );
  abrirDialogo(`Pluma: ${def.nombre ?? (ref.tipo === 'plantilla' ? ref.nombre : 'forma')}`, contenido, [
    { texto: 'Cancelar' },
    {
      texto: 'Aceptar',
      clase: 'principal',
      alPulsar: () => {
        if (modelo.puntos.length < 2) {
          notificar('Pon al menos 2 puntos (3 para una forma rellena).', 'error');
          return false;
        }
        estado.cambiarCamino(ref, modelo.puntos, modelo.cerrado);
        return true;
      },
    },
  ], 'dialogo-pluma');
  pintar();
}
