/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * VISTA DE LA ESCENA: donde colocas los objetos con el ratón (como la vista
 * "Scene" de Unity o el editor 2D de Godot).
 *
 *   - Clic en un objeto: seleccionarlo.  Arrastrar: moverlo.
 *   - Ctrl+clic: añadir o quitar de la selección.  Arrastrar el fondo: un
 *     rectángulo que selecciona todo lo que toca (como en el escritorio).
 *   - Cuadradito de la esquina: cambiar el tamaño.
 *   - Rueda del ratón: acercar / alejar.  Botón derecho, botón central o
 *     espacio + arrastrar: mover la vista.
 *   - Pincel / goma: pintar casillas en el mapa seleccionado.
 *   - Arrastrar una plantilla o una imagen desde el panel izquierdo (o una
 *     imagen desde tu ordenador): la coloca en la escena.
 *
 * DECISIÓN: la vista DIBUJA CON EL MISMO CÓDIGO que el juego (los componentes
 * Sprite y MapaCasillas del motor). Así lo que ves al editar es exactamente lo
 * que verás al jugar, y no hay dos formas de dibujar que se puedan desincronizar.
 */
import { Renderizador } from '../../motor/Renderizador';
import { Recursos } from '../../motor/Recursos';
import { resolverColor } from '../../motor/Color';
import type { ObjetoJuego } from '../../objetos/ObjetoJuego';
import { Sprite } from '../../objetos/componentes/Sprite';
import { MapaCasillas } from '../../objetos/componentes/MapaCasillas';
import { crearObjetoDesdeDefinicion } from '../../proyecto/JuegoEnMarcha';
import type { DefObjeto } from '../../proyecto/formato';
import type { EstadoEditor, TipoNuevoObjeto } from '../estado/EstadoEditor';
import { iconoForma } from '../interfaz/iconosFormas';
import { abrirEditorPluma } from '../recursos/EditorPluma';
import { BIBLIOTECA } from '../biblioteca/biblioteca';
import { FORMAS_DIBUJO, type Forma } from '../../objetos/formas/figuras';
import { botonIcono, h, icono } from '../interfaz/dom';
import { notificar } from '../interfaz/dialogos';
import { importarArchivos, resumenImportar, tipoDeArchivo } from '../recursos/importar';
import { cargarLetra, olvidarLetras } from '../../motor/Letras';
import { TIPOS_CONTROL, type TipoControl } from '../../objetos/componentes/Control';
import { CONTROLES_NUEVOS } from '../interfaz/controlesNuevos';
import { tiene } from '../../utilidades/seguro';
import {
  ajustar,
  CamaraEditor,
  cajaDe,
  marcoDelJuego,
  objetoEn,
  ordenDeDibujo,
  pasoDeCuadricula,
  posicionEnEditor,
  posicionGuardada,
} from './geometria';

export type Herramienta = 'mover' | 'pincel' | 'goma';

/** Paso del imán (los objetos se colocan en múltiplos de 16 píxeles). */
const PASO_IMAN = 16;
const TAMANO_TIRADOR = 9;
/**
 * Por debajo de este tamaño en la pantalla (píxeles), un objeto no enseña el
 * tirador de cambiar el tamaño: si no, con la vista alejada el tirador tapa el
 * objeto entero y, al intentar moverlo, se deforma.
 */
const MINIMO_PARA_TIRADOR = TAMANO_TIRADOR * 3;

type Arrastre =
  | { tipo: 'mover'; dx: number; dy: number }
  | { tipo: 'moverVarios'; x0: number; y0: number; origenes: { indice: number; x: number; y: number }[] }
  | { tipo: 'marco'; x0: number; y0: number; x1: number; y1: number; sumar: boolean }
  | { tipo: 'tamano'; ancho0: number; alto0: number; x0: number; y0: number }
  | { tipo: 'vista'; px: number; py: number }
  | { tipo: 'pintar' }
  | { tipo: 'rectangulo'; c0: number; f0: number; c1: number; f1: number }
  | { tipo: 'punto'; indice: number };

export const OBJETOS_NUEVOS: { tipo: TipoNuevoObjeto; texto: string; icono: string; ayuda: string }[] = [
  { tipo: 'rectangulo', texto: 'Cuadrado', icono: 'objeto', ayuda: 'Un rectángulo de color con colisión' },
  { tipo: 'circulo', texto: 'Círculo', icono: 'circulo', ayuda: 'Un círculo de color con colisión' },
  { tipo: 'texto', texto: 'Texto', icono: 'texto', ayuda: 'Un texto (para títulos, puntos, vidas...)' },
  { tipo: 'boton', texto: 'Botón', icono: 'boton', ayuda: 'Un botón pegado a la pantalla (usa "cuando hago clic encima")' },
  { tipo: 'mapa', texto: 'Mapa de casillas', icono: 'mapa', ayuda: 'Una rejilla para pintar suelos y paredes' },
  { tipo: 'vacio', texto: 'Objeto vacío', icono: 'vacio', ayuda: 'Un objeto invisible (para scripts que controlan el juego)' },
];

export class VistaEscena {
  readonly elemento: HTMLElement;
  readonly camara = new CamaraEditor();
  readonly recursos = new Recursos();
  herramienta: Herramienta = 'mover';
  /** Tipo de casilla con el que pinta el pincel (lo elige el inspector). */
  tipoPincel: string | null = null;
  verCuadricula = true;
  iman = true;
  /** Avisa cuando cambia la herramienta (para que el inspector se actualice). */
  alCambiarHerramienta: () => void = () => {};

  private canvas: HTMLCanvasElement;
  private r: Renderizador;
  private barra: HTMLElement;
  private etiquetaZoom: HTMLElement;
  private etiquetaRaton: HTMLElement;
  private objetos: ObjetoJuego[] = [];
  /** El JSON de cada objeto la última vez que se construyó: solo se reconstruye lo que ha cambiado. */
  private construidos: string[] = [];
  private hayQueReconstruir = false;
  private imagenesCargadas = new Map<string, string>();
  private sucio = true;
  private tamanoDibujado = '';
  private idFotograma = 0;
  private arrastre: Arrastre | null = null;
  private espacioPulsado = false;
  private raton: { x: number; y: number } | null = null;
  private encuadrada = false;
  private escenaVista = '';
  private quitarOyente: () => void;

  constructor(private estado: EstadoEditor) {
    this.canvas = h('canvas', { class: 'lienzo-escena', tabindex: '0', 'aria-label': 'Vista de la escena' });
    const contenedorLienzo = h('div', { class: 'contenedor-lienzo' }, this.canvas);
    this.etiquetaZoom = h('span', { class: 'etiqueta-zoom', title: 'Cuánto se acerca la vista (rueda del ratón)' }, '100%');
    this.etiquetaRaton = h('span', { class: 'etiqueta-raton', title: 'Dónde está el ratón en el mundo del juego (la Y crece hacia arriba)' });
    this.barra = h('div', { class: 'barra-escena' });
    this.elemento = h('div', { class: 'vista-escena' }, this.barra, contenedorLienzo);
    this.r = new Renderizador(this.canvas, 1, 1, estado.proyecto.pixelArt ?? false, true);
    this.dibujarBarra();
    this.escuchar();
    this.reconstruir();
    this.quitarOyente = estado.alCambiar((c) => {
      if (c === 'seleccion' || c === 'historial') {
        this.comprobarHerramienta();
        return this.redibujar();
      }
      if (c === 'codigo' || c === 'archivos') return;
      // No reconstruimos YA: se hace una sola vez, justo antes de dibujar el siguiente fotograma
      // (al arrastrar llegan muchos cambios seguidos y solo importa el último)
      this.hayQueReconstruir = true;
      this.redibujar();
    });
    const bucle = () => {
      this.idFotograma = requestAnimationFrame(bucle);
      this.fotograma();
    };
    this.idFotograma = requestAnimationFrame(bucle);
  }

  destruir(): void {
    cancelAnimationFrame(this.idFotograma);
    this.quitarOyente();
    this.r.destruir();
  }

  redibujar(): void {
    this.sucio = true;
  }

  // ═════════════════════════ Barra de herramientas ═════════════════════════

  private dibujarBarra(): void {
    const herramienta = (h_: Herramienta, ic: string, ayuda: string) =>
      botonIcono(ic, ayuda, () => this.ponerHerramienta(h_), undefined, this.herramienta === h_ ? 'activo' : '');
    const interruptor = (ic: string, ayuda: string, activo: boolean, fn: () => void) => botonIcono(ic, ayuda, fn, undefined, activo ? 'activo' : '');
    this.barra.replaceChildren(
      h('div', { class: 'grupo' },
        herramienta('mover', 'mover', 'Mover y seleccionar (V)'),
        herramienta('pincel', 'pincel', 'Pintar casillas en el mapa seleccionado (B). Con Mayús, un rectángulo entero'),
        herramienta('goma', 'goma', 'Borrar casillas del mapa seleccionado (E)'),
      ),
      h('div', { class: 'grupo' },
        interruptor('cuadricula', 'Ver la cuadrícula', this.verCuadricula, () => {
          this.verCuadricula = !this.verCuadricula;
          this.dibujarBarra();
          this.redibujar();
        }),
        interruptor('iman', `Imán: coloca los objetos en múltiplos de ${PASO_IMAN} píxeles`, this.iman, () => {
          this.iman = !this.iman;
          this.dibujarBarra();
        }),
        botonIcono('centrar', 'Ver la pantalla del juego entera (F)', () => this.encuadrar()),
        this.etiquetaZoom,
      ),
      h('div', { class: 'grupo' }, this.etiquetaRaton),
      h('div', { class: 'grupo derecha' }, this.menuAnadir()),
    );
  }

  /** Botón "+ Añadir" con la lista de objetos que se pueden crear. */
  private menuAnadir(): HTMLElement {
    const menu = h('div', { class: 'menu-desplegable', hidden: true },
      OBJETOS_NUEVOS.map((o) =>
        h('button', { class: 'opcion-menu', title: o.ayuda, onclick: () => {
          menu.hidden = true;
          this.anadir(o.tipo);
        } }, icono(o.icono, 16), h('span', {}, o.texto)),
      ),
      h('button', { class: 'opcion-menu', title: 'Dibuja tu propia forma punto a punto (con curvas)', onclick: () => {
        menu.hidden = true;
        this.anadir('forma', 'camino');
        const ref = this.estado.seleccion;
        if (ref) abrirEditorPluma(this.estado, ref, { vacio: true });
      } }, h('span', { class: 'icono-pluma' }, '✒'), h('span', {}, 'Dibujar con la pluma')),
      h('div', { class: 'titulo-menu' }, 'Interfaz'),
      h('div', { class: 'rejilla-controles' },
        TIPOS_CONTROL.filter((t) => t !== 'boton').map((t) =>
          h('button', { class: 'opcion-menu', title: CONTROLES_NUEVOS[t].ayuda, 'data-control': t, onclick: () => {
            menu.hidden = true;
            this.anadirControl(t);
          } }, h('span', {}, CONTROLES_NUEVOS[t].texto)),
        ),
      ),
      h('div', { class: 'titulo-menu' }, 'Más formas'),
      h('div', { class: 'rejilla-formas' },
        FORMAS_DIBUJO.filter((f) => f.forma !== 'rectangulo' && f.forma !== 'circulo').map((f) =>
          h('button', { class: 'boton-forma', title: `${f.texto} (choca con su forma de verdad)`, 'aria-label': `Añadir: ${f.texto}`, 'data-forma': f.forma, onclick: () => {
            menu.hidden = true;
            this.anadir('forma', f.forma);
          } }, iconoForma(f.forma, 22)),
        ),
      ),
    );
    const boton = botonIcono('mas', 'Añadir un objeto a la escena', () => {
      menu.hidden = !menu.hidden;
    }, 'Añadir', 'boton-anadir');
    document.addEventListener('mousedown', (e) => {
      if (!menu.hidden && !menu.contains(e.target as Node) && !boton.contains(e.target as Node)) menu.hidden = true;
    });
    return h('div', { class: 'con-menu' }, boton, menu);
  }

  /** Crea un control de interfaz en el centro de la pantalla del juego (si hay algo justo ahí, un poco más abajo). */
  anadirControl(tipo: TipoControl): void {
    const m = this.marco();
    const x = Math.round(((m.derecha - m.izquierda) * m.zoom) / 2);
    let y = Math.round(((m.arriba - m.abajo) * m.zoom) / 2);
    const ocupado = (py: number) => this.estado.escena.objetos.some((o) => o.sprite?.fijo && o.x === x && o.y === py);
    for (let i = 0; i < 10 && ocupado(y); i++) y -= 40;
    this.estado.crearControl(tipo, x, y);
    this.canvas.focus();
  }

  /** Crea un objeto nuevo en el centro de lo que se ve. */
  anadir(tipo: TipoNuevoObjeto, forma?: Forma): void {
    const m = this.marco();
    const centro = { x: this.camara.x, y: this.camara.y };
    // Los botones son de interfaz: su posición es en la pantalla del juego
    // Los botones y textos son de interfaz: su posición es en la PANTALLA del juego
    const ancho = (m.derecha - m.izquierda) * m.zoom;
    const alto = (m.arriba - m.abajo) * m.zoom;
    const pos = tipo === 'boton' ? { x: ancho / 2, y: alto / 2 } : tipo === 'texto' ? { x: 32, y: alto - 40 } : centro;
    let x = this.iman ? ajustar(pos.x, PASO_IMAN) : Math.round(pos.x);
    const y = this.iman ? ajustar(pos.y, PASO_IMAN) : Math.round(pos.y);
    // Si ya hay algo justo ahí, lo ponemos un poco a la derecha (para que no queden uno encima del otro)
    const ocupado = (px: number) => this.estado.escena.objetos.some((o) => !o.mapa && o.x === px && o.y === y);
    for (let i = 0; i < 20 && ocupado(x); i++) x += 80;
    this.estado.crearObjeto(tipo, x, y, undefined, forma);
    if (tipo === 'mapa') this.ponerHerramienta('pincel');
    this.canvas.focus();
  }

  /** Pone un objeto de la biblioteca en el centro de lo que se ve. */
  anadirDeBiblioteca(id: string): void {
    const x = this.iman ? ajustar(this.camara.x, PASO_IMAN) : Math.round(this.camara.x);
    const y = this.iman ? ajustar(this.camara.y, PASO_IMAN) : Math.round(this.camara.y);
    this.ponerDeBiblioteca(id, x, y);
  }

  private ponerDeBiblioteca(id: string, x: number, y: number): void {
    const nuevos = this.estado.insertarDeBiblioteca(id, x, y);
    const el = BIBLIOTECA.find((b) => b.id === id);
    if (!nuevos.length && el?.plantillas) {
      const nombres = Object.keys(el.plantillas);
      notificar(`Plantilla ${nombres.map((n) => `«${n}»`).join(', ')} añadida (en Proyecto > Plantillas). Créala desde el código: crear("${nombres[0]}", x, y)`, 'ok');
    }
    this.canvas.focus();
  }

  ponerHerramienta(h_: Herramienta): void {
    if (h_ !== 'mover' && !this.estado.seleccionado?.mapa) {
      const mapa = this.estado.escena.objetos.findIndex((o) => o.mapa);
      if (mapa < 0) {
        notificar('Para pintar casillas, primero añade un "Mapa de casillas" (botón Añadir).');
        return;
      }
      this.estado.seleccionarIndice(mapa);
    }
    this.herramienta = h_;
    this.dibujarBarra();
    this.alCambiarHerramienta();
    this.redibujar();
  }

  // ═════════════════════════ Objetos que se dibujan ═════════════════════════

  private marco() {
    return marcoDelJuego(this.estado.proyecto, this.estado.escena);
  }

  /** Vuelve a crear los objetos del motor a partir del JSON (tras cualquier cambio). */
  private reconstruir(): void {
    this.hayQueReconstruir = false;
    this.sincronizarImagenes();
    this.sincronizarLetras();
    const p = this.estado.proyecto;
    // Un "falso" contenedor para que los sprites encuentren las imágenes
    const falsa = { motor: { recursos: this.recursos } } as unknown as ObjetoJuego['escena'];
    // Solo se vuelve a crear lo que ha cambiado (con 500 objetos, arrastrar uno solo rehace uno)
    const animaciones = JSON.stringify(p.animaciones);
    const anteriores = new Map(this.construidos.map((clave, i) => [clave, this.objetos[i]]));
    const claves: string[] = [];
    this.objetos = this.estado.escena.objetos.map((def, i) => {
      const clave = `${i}|${JSON.stringify(def)}|${def.animacion ? animaciones : ''}`;
      claves.push(clave);
      const ya = anteriores.get(clave);
      if (ya) return ya;
      const o = crearObjetoDesdeDefinicion(def, `objeto${i + 1}`, p);
      o.escena = falsa;
      const s = o.obtener(Sprite);
      const anim = def.animacion ? p.animaciones[def.animacion] : undefined;
      if (s && anim?.fotogramas[0]) s.imagen = anim.fotogramas[0];
      return o;
    });
    this.construidos = claves;
    this.comprobarHerramienta();
    if (this.escenaVista !== this.estado.escenaActual) {
      this.escenaVista = this.estado.escenaActual;
      this.encuadrada = false;
    }
    this.redibujar();
  }

  /** El pincel y la goma solo tienen sentido con un mapa seleccionado. */
  private comprobarHerramienta(): void {
    if (this.herramienta !== 'mover' && !this.estado.seleccionado?.mapa) {
      this.herramienta = 'mover';
      this.dibujarBarra();
      this.alCambiarHerramienta();
    }
  }

  /** Carga los tipos de letra nuevos del proyecto, para que los textos se vean en el editor como en el juego. */
  private letrasCargadas = '';
  private sincronizarLetras(): void {
    const letras = this.estado.proyecto.letras ?? {};
    const clave = Object.entries(letras).map(([n, d]) => `${n}:${d.length}`).join('|');
    if (clave === this.letrasCargadas) return;
    this.letrasCargadas = clave;
    olvidarLetras(Object.keys(letras));
    for (const [n, d] of Object.entries(letras)) void cargarLetra(n, d).then((ok) => ok && this.redibujar());
  }

  /** Carga las imágenes nuevas del proyecto (y olvida las borradas). */
  private sincronizarImagenes(): void {
    const imagenes = this.estado.proyecto.imagenes;
    for (const [nombre, url] of Object.entries(imagenes)) {
      if (this.imagenesCargadas.get(nombre) === url) continue;
      this.imagenesCargadas.set(nombre, url);
      const img = new Image();
      img.onload = () => {
        if (this.imagenesCargadas.get(nombre) !== url) return;
        this.recursos.registrar(nombre, img);
        this.redibujar();
      };
      img.src = url;
    }
    for (const nombre of [...this.imagenesCargadas.keys()]) {
      if (!(tiene(imagenes, nombre))) {
        this.imagenesCargadas.delete(nombre);
        this.recursos.quitar(nombre);
      }
    }
  }

  // ═════════════════════════ Dibujo ═════════════════════════

  private fotograma(): void {
    if (!this.canvas.isConnected) return;
    const tamano = `${this.r.ancho}x${this.r.alto}`;
    if (this.r.ancho <= 1 || this.r.alto <= 1) return;
    if (this.hayQueReconstruir) this.reconstruir();
    if (!this.sucio && tamano === this.tamanoDibujado) return;
    this.camara.ancho = this.r.ancho;
    this.camara.alto = this.r.alto;
    if (!this.encuadrada) {
      this.encuadrada = true;
      this.encuadrar(false);
    }
    this.sucio = false;
    this.tamanoDibujado = tamano;
    this.dibujar();
  }

  /** Coloca la vista para ver la pantalla del juego entera. */
  encuadrar(avisar = true): void {
    const m = this.marco();
    this.camara.encuadrar(m);
    if (avisar) this.redibujar();
  }

  private dibujar(): void {
    const { r, camara: cam } = this;
    const ctx = r.ctx;
    const escena = this.estado.escena;
    const marco = this.marco();
    this.etiquetaZoom.textContent = `${Math.round(cam.zoom * 100)}%`;

    // Fondo: fuera de la pantalla del juego, un poco más oscuro
    ctx.fillStyle = '#15171f';
    ctx.fillRect(0, 0, r.ancho, r.alto);
    const a = cam.aPantalla(marco.izquierda, marco.arriba);
    const b = cam.aPantalla(marco.derecha, marco.abajo);
    ctx.fillStyle = resolverColor(escena.colorFondo);
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);

    if (this.verCuadricula) this.dibujarCuadricula();

    // Los objetos, con la misma transformación que usa la Escena del motor
    const visible = { izquierda: cam.aMundo(0, 0).x, arriba: cam.aMundo(0, 0).y, derecha: cam.aMundo(r.ancho, r.alto).x, abajo: cam.aMundo(r.ancho, r.alto).y };
    const aLocal = (x: number, y: number) => ({ x: x - cam.x, y: cam.y - y });
    const orden = escena.objetos.map((_, i) => i).sort((i, j) => ordenDeDibujo(escena.objetos[i]) - ordenDeDibujo(escena.objetos[j]) || i - j);
    ctx.save();
    ctx.translate(r.ancho / 2, r.alto / 2);
    ctx.scale(cam.zoom, cam.zoom);
    for (const i of orden) {
      const def = escena.objetos[i];
      const o = this.objetos[i];
      if (!o) continue;
      try {
        const mapa = o.obtener(MapaCasillas);
        if (mapa) mapa.dibujarVisibles(r, visible, aLocal);
        const s = o.obtener(Sprite);
        const p = posicionEnEditor(def, marco);
        const l = aLocal(p.x, p.y);
        if (s) {
          ctx.save();
          ctx.translate(l.x, l.y);
          if (def.sprite?.fijo) ctx.scale(1 / marco.zoom, 1 / marco.zoom);
          s.dibujarEn(r, 0, 0);
          ctx.restore();
        } else if (!mapa) {
          this.dibujarVacio(l.x, l.y, def);
        }
      } catch {
        // La imagen aún no ha cargado (o no existe): un recuadro en su lugar
        const c = cajaDe(def, marco);
        const l = aLocal(c.izquierda, c.arriba);
        ctx.strokeStyle = '#ff6b6b';
        ctx.setLineDash([4 / cam.zoom, 4 / cam.zoom]);
        ctx.lineWidth = 1 / cam.zoom;
        ctx.strokeRect(l.x, l.y, c.derecha - c.izquierda, c.arriba - c.abajo);
        ctx.setLineDash([]);
      }
    }
    ctx.restore();

    // Marco de la pantalla del juego
    ctx.strokeStyle = '#ffffffb0';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5, Math.round(b.x - a.x), Math.round(b.y - a.y));
    ctx.setLineDash([]);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#ffffffb0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Pantalla del juego (${this.estado.proyecto.ancho}×${this.estado.proyecto.alto})`, a.x + 2, a.y - 4);

    this.dibujarSeleccion(marco);

    if (escena.objetos.length === 0) {
      ctx.font = '15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff99';
      ctx.fillText('Escena vacía: pulsa «Añadir» o arrastra aquí una imagen', r.ancho / 2, r.alto / 2);
    }
  }

  private dibujarCuadricula(): void {
    const { r, camara: cam } = this;
    const ctx = r.ctx;
    const mapa = this.estado.seleccionado?.mapa;
    const paso = mapa && this.herramienta !== 'mover' ? mapa.tamano : pasoDeCuadricula(32, cam.zoom);
    const origen = mapa && this.herramienta !== 'mover' ? { x: this.estado.seleccionado!.x ?? 0, y: this.estado.seleccionado!.y ?? 0 } : { x: 0, y: 0 };
    const izq = cam.aMundo(0, 0);
    const der = cam.aMundo(r.ancho, r.alto);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor((izq.x - origen.x) / paso) * paso + origen.x; x <= der.x; x += paso) {
      const px = Math.round(cam.aPantalla(x, 0).x) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, r.alto);
    }
    for (let y = Math.floor((der.y - origen.y) / paso) * paso + origen.y; y <= izq.y; y += paso) {
      const py = Math.round(cam.aPantalla(0, y).y) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(r.ancho, py);
    }
    ctx.strokeStyle = '#ffffff10';
    ctx.stroke();
    // Los ejes (x = 0 e y = 0) un poco más marcados
    const o = cam.aPantalla(0, 0);
    ctx.beginPath();
    ctx.moveTo(Math.round(o.x) + 0.5, 0);
    ctx.lineTo(Math.round(o.x) + 0.5, r.alto);
    ctx.moveTo(0, Math.round(o.y) + 0.5);
    ctx.lineTo(r.ancho, Math.round(o.y) + 0.5);
    ctx.strokeStyle = '#ffffff22';
    ctx.stroke();
  }

  /** Los objetos vacíos no se ven en el juego; en el editor, un círculo con una cruz. */
  private dibujarVacio(x: number, y: number, def: DefObjeto): void {
    const ctx = this.r.ctx;
    const z = this.camara.zoom;
    ctx.strokeStyle = '#c4cbe0';
    ctx.lineWidth = 1.5 / z;
    ctx.setLineDash(def.colision ? [5 / z, 3 / z] : []);
    ctx.beginPath();
    if (def.colision) {
      const w = def.colision.ancho ?? 64;
      const hh = def.colision.alto ?? 64;
      ctx.rect(x - w / 2, y - hh / 2, w, hh);
    } else {
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x, y + 6);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private dibujarSeleccion(marco: ReturnType<VistaEscena['marco']>): void {
    const ctx = this.r.ctx;
    const cam = this.camara;
    // El rectángulo de selección (arrastrando el fondo)
    const r0 = this.arrastre;
    if (r0?.tipo === 'marco') {
      ctx.fillStyle = '#4aa3ff22';
      ctx.strokeStyle = '#4aa3ff';
      ctx.lineWidth = 1;
      const x = Math.min(r0.x0, r0.x1);
      const y = Math.min(r0.y0, r0.y1);
      ctx.fillRect(x, y, Math.abs(r0.x1 - r0.x0), Math.abs(r0.y1 - r0.y0));
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(Math.abs(r0.x1 - r0.x0)), Math.round(Math.abs(r0.y1 - r0.y0)));
    }
    // Varios seleccionados: un borde en cada uno (sin tiradores)
    if (this.estado.variosSeleccionados) {
      ctx.strokeStyle = '#4aa3ff';
      ctx.lineWidth = 2;
      for (const i of this.estado.indicesSeleccionados()) {
        const d = this.estado.escena.objetos[i];
        if (!d) continue;
        const c = cajaDe(d, marco);
        const a = cam.aPantalla(c.izquierda, c.arriba);
        const b = cam.aPantalla(c.derecha, c.abajo);
        ctx.strokeRect(Math.round(a.x) - 1.5, Math.round(a.y) - 1.5, Math.round(b.x - a.x) + 3, Math.round(b.y - a.y) + 3);
      }
      return;
    }
    const def = this.estado.seleccion?.tipo === 'escena' ? this.estado.seleccionado : null;
    if (!def) return;
    const c = cajaDe(def, marco);
    const a = cam.aPantalla(c.izquierda, c.arriba);
    const b = cam.aPantalla(c.derecha, c.abajo);
    ctx.strokeStyle = '#4aa3ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(a.x) - 1.5, Math.round(a.y) - 1.5, Math.round(b.x - a.x) + 3, Math.round(b.y - a.y) + 3);

    // Caja de colisión (en verde) si no coincide con el dibujo
    if (def.colision && def.sprite && (def.colision.ancho || def.colision.alto || def.colision.desplazamientoX || def.colision.desplazamientoY)) {
      const p = posicionEnEditor(def, marco);
      const e = Math.abs(def.escala ?? 1);
      const w = (def.colision.ancho ?? def.sprite.ancho ?? 64) * e;
      const hh = (def.colision.alto ?? def.sprite.alto ?? 64) * e;
      const cx = p.x + (def.colision.desplazamientoX ?? 0);
      const cy = p.y + (def.colision.desplazamientoY ?? 0);
      const ca = cam.aPantalla(cx - w / 2, cy + hh / 2);
      ctx.strokeStyle = def.colision.solido === false ? '#ffcb6b' : '#5ad17a';
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(ca.x, ca.y, w * cam.zoom, hh * cam.zoom);
      ctx.setLineDash([]);
    }

    // Nombre encima
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const nombre = def.nombre ?? '';
    const ancho = ctx.measureText(nombre).width + 10;
    ctx.fillStyle = '#4aa3ff';
    ctx.fillRect(Math.round(a.x) - 2, Math.round(a.y) - 20, ancho, 17);
    ctx.fillStyle = '#fff';
    ctx.fillText(nombre, Math.round(a.x) + 3, Math.round(a.y) - 6);

    // Recorrido: el camino, dónde estará el objeto en cada punto, y los puntos para arrastrar
    if (def.recorrido && this.herramienta === 'mover') this.dibujarRecorrido(def, marco);

    // Tirador para cambiar el tamaño (solo objetos con dibujo, y si se ven lo bastante grandes)
    if (def.sprite && this.herramienta === 'mover' && Math.min(b.x - a.x, b.y - a.y) >= MINIMO_PARA_TIRADOR) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#4aa3ff';
      ctx.lineWidth = 2;
      ctx.fillRect(b.x - TAMANO_TIRADOR / 2 + 1, b.y - TAMANO_TIRADOR / 2 + 1, TAMANO_TIRADOR, TAMANO_TIRADOR);
      ctx.strokeRect(b.x - TAMANO_TIRADOR / 2 + 1, b.y - TAMANO_TIRADOR / 2 + 1, TAMANO_TIRADOR, TAMANO_TIRADOR);
    }

    // Mayús + arrastrar: el rectángulo que se va a pintar
    const r = this.arrastre;
    if (def.mapa && r?.tipo === 'rectangulo') {
      const t = def.mapa.tamano;
      const esq1 = cam.aPantalla((def.x ?? 0) + Math.min(r.c0, r.c1) * t, (def.y ?? 0) + (Math.max(r.f0, r.f1) + 1) * t);
      const esq2 = cam.aPantalla((def.x ?? 0) + (Math.max(r.c0, r.c1) + 1) * t, (def.y ?? 0) + Math.min(r.f0, r.f1) * t);
      ctx.fillStyle = this.herramienta === 'goma' ? '#ff6b6b33' : '#ffffff33';
      ctx.fillRect(esq1.x, esq1.y, esq2.x - esq1.x, esq2.y - esq1.y);
      ctx.strokeStyle = this.herramienta === 'goma' ? '#ff6b6b' : '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(esq1.x, esq1.y, esq2.x - esq1.x, esq2.y - esq1.y);
      return;
    }

    // Pincel: la casilla bajo el ratón
    if (def.mapa && this.herramienta !== 'mover' && this.raton) {
      const t = def.mapa.tamano;
      const m = cam.aMundo(this.raton.x, this.raton.y);
      const col = Math.floor((m.x - (def.x ?? 0)) / t);
      const fil = Math.floor((m.y - (def.y ?? 0)) / t);
      const esq = cam.aPantalla((def.x ?? 0) + col * t, (def.y ?? 0) + (fil + 1) * t);
      const tipo = this.tipoPincel ? def.mapa.tipos[this.tipoPincel] : undefined;
      if (this.herramienta === 'pincel' && tipo?.color) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = resolverColor(tipo.color);
        ctx.fillRect(esq.x, esq.y, t * cam.zoom, t * cam.zoom);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = this.herramienta === 'goma' ? '#ff6b6b' : '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(esq.x, esq.y, t * cam.zoom, t * cam.zoom);
    }
  }

  /** Los puntos del recorrido del objeto seleccionado, en la pantalla (el primero es el inicio). */
  private puntosRecorrido(def: DefObjeto, marco: ReturnType<VistaEscena['marco']>): { x: number; y: number }[] {
    const inicio = posicionEnEditor(def, marco);
    return [inicio, ...(def.recorrido?.puntos ?? []).map((p) => ({ x: inicio.x + p.x, y: inicio.y + p.y }))].map((p) => this.camara.aPantalla(p.x, p.y));
  }

  private dibujarRecorrido(def: DefObjeto, marco: ReturnType<VistaEscena['marco']>): void {
    const ctx = this.r.ctx;
    const pts = this.puntosRecorrido(def, marco);
    const caja = cajaDe(def, marco);
    const inicio = this.camara.aPantalla((caja.izquierda + caja.derecha) / 2, (caja.abajo + caja.arriba) / 2);
    const w = (caja.derecha - caja.izquierda) * this.camara.zoom;
    const hh = (caja.arriba - caja.abajo) * this.camara.zoom;
    const origen = pts[0];
    ctx.save();
    // El objeto "fantasma" en cada punto
    ctx.strokeStyle = '#ffcb6b88';
    ctx.setLineDash([4, 4]);
    for (const p of pts.slice(1)) ctx.strokeRect(p.x + (inicio.x - origen.x) - w / 2, p.y + (inicio.y - origen.y) - hh / 2, w, hh);
    // El camino
    ctx.strokeStyle = '#ffcb6b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    if (def.recorrido?.modo === 'bucle' && pts.length > 2) ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    // Los puntos (el 1 es el inicio: no se arrastra, se mueve el objeto)
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === 0 ? 5 : 8, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#ffcb6b' : '#1d212b';
      ctx.fill();
      ctx.strokeStyle = '#ffcb6b';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (i > 0) {
        ctx.fillStyle = '#ffcb6b';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), p.x, p.y + 0.5);
      }
    });
    ctx.restore();
  }

  /** ¿Hay un punto del recorrido bajo el ratón? Devuelve su índice en `recorrido.puntos`. */
  private puntoEn(px: number, py: number): number | null {
    if (this.estado.variosSeleccionados) return null;
    const def = this.estado.seleccion?.tipo === 'escena' ? this.estado.seleccionado : null;
    if (!def?.recorrido || this.herramienta !== 'mover') return null;
    const pts = this.puntosRecorrido(def, this.marco());
    for (let i = pts.length - 1; i >= 1; i--) if (Math.hypot(pts[i].x - px, pts[i].y - py) <= 10) return i - 1;
    return null;
  }

  // ═════════════════════════ Ratón y teclado ═════════════════════════

  private posRaton(e: MouseEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private enTirador(px: number, py: number): boolean {
    if (this.estado.variosSeleccionados) return false;
    const def = this.estado.seleccion?.tipo === 'escena' ? this.estado.seleccionado : null;
    if (!def?.sprite || this.herramienta !== 'mover') return false;
    const c = cajaDe(def, this.marco());
    const a = this.camara.aPantalla(c.izquierda, c.arriba);
    const b = this.camara.aPantalla(c.derecha, c.abajo);
    if (Math.min(b.x - a.x, b.y - a.y) < MINIMO_PARA_TIRADOR) return false;
    return Math.abs(px - b.x) <= TAMANO_TIRADOR && Math.abs(py - b.y) <= TAMANO_TIRADOR;
  }

  /** La casilla del mapa seleccionado que hay bajo un punto de la pantalla. */
  private casillaEn(px: number, py: number): { columna: number; fila: number } | null {
    const def = this.estado.seleccionado;
    if (!def?.mapa) return null;
    const m = this.camara.aMundo(px, py);
    return { columna: Math.floor((m.x - (def.x ?? 0)) / def.mapa.tamano), fila: Math.floor((m.y - (def.y ?? 0)) / def.mapa.tamano) };
  }

  /** Con qué tipo pinta ahora (null = borrar). */
  private tipoParaPintar(): string | null {
    const mapa = this.estado.seleccionado?.mapa;
    if (!mapa || this.herramienta === 'goma') return null;
    return this.tipoPincel && mapa.tipos[this.tipoPincel] ? this.tipoPincel : Object.keys(mapa.tipos)[0] ?? null;
  }

  private pintar(px: number, py: number): void {
    const ref = this.estado.seleccion;
    const c = this.casillaEn(px, py);
    if (!ref || !c) return;
    this.estado.pintarCasilla(ref, c.columna, c.fila, this.tipoParaPintar());
  }

  /** Selecciona todo lo que toca el rectángulo (menos los mapas, que ocupan mucho y casi nunca se quieren mover). */
  private seleccionarEnMarco(a: { x0: number; y0: number; x1: number; y1: number; sumar: boolean }): void {
    if (Math.abs(a.x1 - a.x0) < 4 && Math.abs(a.y1 - a.y0) < 4) return this.redibujar(); // era un clic
    const p = this.camara.aMundo(a.x0, a.y0);
    const q = this.camara.aMundo(a.x1, a.y1);
    const [izq, der] = [Math.min(p.x, q.x), Math.max(p.x, q.x)];
    const [abajo, arriba] = [Math.min(p.y, q.y), Math.max(p.y, q.y)];
    const marco = this.marco();
    const dentro = this.estado.escena.objetos.flatMap((d, i) => {
      if (d.mapa) return [];
      const c = cajaDe(d, marco);
      return c.derecha >= izq && c.izquierda <= der && c.arriba >= abajo && c.abajo <= arriba ? [i] : [];
    });
    const antes = a.sumar ? this.estado.indicesSeleccionados() : [];
    this.estado.seleccionarVarios([...antes, ...dentro]);
    this.redibujar();
  }

  private escuchar(): void {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    c.addEventListener('pointerdown', (e) => {
      c.focus();
      c.setPointerCapture(e.pointerId);
      const p = this.posRaton(e);
      // Mover la vista: botón central, botón derecho o espacio + clic
      if (e.button === 1 || e.button === 2 || this.espacioPulsado) {
        this.arrastre = { tipo: 'vista', px: p.x, py: p.y };
        return;
      }
      if (e.button !== 0) return;
      const marco = this.marco();
      const m = this.camara.aMundo(p.x, p.y);

      if (this.herramienta !== 'mover' && this.estado.seleccionado?.mapa) {
        if (e.shiftKey) {
          // Mayús + arrastrar: un rectángulo entero de casillas
          const c = this.casillaEn(p.x, p.y)!;
          this.arrastre = { tipo: 'rectangulo', c0: c.columna, f0: c.fila, c1: c.columna, f1: c.fila };
          this.redibujar();
          return;
        }
        this.estado.empezarCambioLargo();
        this.arrastre = { tipo: 'pintar' };
        this.pintar(p.x, p.y);
        return;
      }
      const punto = this.puntoEn(p.x, p.y);
      if (punto !== null) {
        this.estado.empezarCambioLargo();
        this.arrastre = { tipo: 'punto', indice: punto };
        return;
      }
      if (this.enTirador(p.x, p.y)) {
        const def = this.estado.seleccionado!;
        this.estado.empezarCambioLargo();
        this.arrastre = { tipo: 'tamano', ancho0: def.sprite?.ancho ?? 64, alto0: def.sprite?.alto ?? 64, x0: m.x, y0: m.y };
        return;
      }
      const i = objetoEn(this.estado.escena.objetos, marco, m.x, m.y, 3 / this.camara.zoom);
      const sumar = e.ctrlKey || e.metaKey;
      if (i === null) {
        // Fondo: rectángulo de selección (con Ctrl, se añade a lo que ya había)
        if (!sumar) this.estado.seleccionar(null);
        this.arrastre = { tipo: 'marco', x0: p.x, y0: p.y, x1: p.x, y1: p.y, sumar };
        return;
      }
      if (sumar) {
        this.estado.alternarSeleccion(i);
        return;
      }
      if (this.estado.variosSeleccionados && this.estado.estaSeleccionado(i)) {
        // Arrastrar uno de los seleccionados: se mueven todos
        const origenes = this.estado.indicesSeleccionados().map((k) => ({ indice: k, ...posicionEnEditor(this.estado.escena.objetos[k], marco) }));
        this.estado.empezarCambioLargo();
        this.arrastre = { tipo: 'moverVarios', x0: m.x, y0: m.y, origenes };
        return;
      }
      this.estado.seleccionarIndice(i);
      const def = this.estado.escena.objetos[i];
      const pos = posicionEnEditor(def, marco);
      this.estado.empezarCambioLargo();
      this.arrastre = { tipo: 'mover', dx: pos.x - m.x, dy: pos.y - m.y };
    });

    c.addEventListener('pointermove', (e) => {
      const p = this.posRaton(e);
      this.raton = p;
      const mundo = this.camara.aMundo(p.x, p.y);
      this.etiquetaRaton.textContent = `x: ${Math.round(mundo.x)}   y: ${Math.round(mundo.y)}`;
      const a = this.arrastre;
      if (!a) {
        c.style.cursor = this.espacioPulsado ? 'grab' : this.herramienta !== 'mover' ? 'crosshair' : this.puntoEn(p.x, p.y) !== null ? 'move' : this.enTirador(p.x, p.y) ? 'nwse-resize' : 'default';
        if (this.herramienta !== 'mover') this.redibujar();
        return;
      }
      if (a.tipo === 'vista') {
        this.camara.desplazar(p.x - a.px, p.y - a.py);
        a.px = p.x;
        a.py = p.y;
        c.style.cursor = 'grabbing';
        this.redibujar();
        return;
      }
      if (a.tipo === 'pintar') return this.pintar(p.x, p.y);
      if (a.tipo === 'marco') {
        a.x1 = p.x;
        a.y1 = p.y;
        this.redibujar();
        return;
      }
      if (a.tipo === 'moverVarios') {
        const m = this.camara.aMundo(p.x, p.y);
        let dx = m.x - a.x0;
        let dy = m.y - a.y0;
        if (this.iman !== e.altKey) [dx, dy] = [ajustar(dx, PASO_IMAN), ajustar(dy, PASO_IMAN)];
        const marco = this.marco();
        this.estado.colocarObjetos(a.origenes.map((o) => {
          const def = this.estado.escena.objetos[o.indice];
          return { indice: o.indice, ...posicionGuardada(def, marco, o.x + dx, o.y + dy) };
        }));
        return;
      }
      if (a.tipo === 'punto') {
        const ref = this.estado.seleccion;
        const def = this.estado.seleccionado;
        if (!ref || !def?.recorrido) return;
        const m = this.camara.aMundo(p.x, p.y);
        const inicio = posicionEnEditor(def, this.marco());
        let x = m.x - inicio.x;
        let y = m.y - inicio.y;
        if (this.iman !== e.altKey) [x, y] = [ajustar(x, PASO_IMAN), ajustar(y, PASO_IMAN)];
        const puntos = def.recorrido.puntos.map((q, k) => (k === a.indice ? { x: Math.round(x), y: Math.round(y) } : q));
        this.estado.cambiarPropiedad(ref, 'recorrido.puntos', puntos);
        return;
      }
      if (a.tipo === 'rectangulo') {
        const cas = this.casillaEn(p.x, p.y);
        if (cas) [a.c1, a.f1] = [cas.columna, cas.fila];
        this.redibujar();
        return;
      }
      const ref = this.estado.seleccion;
      const def = this.estado.seleccionado;
      if (!ref || !def) return;
      const m = this.camara.aMundo(p.x, p.y);
      if (a.tipo === 'mover') {
        const marco = this.marco();
        let x = m.x + a.dx;
        let y = m.y + a.dy;
        const iman = this.iman !== e.altKey; // Alt = al revés (para colocar fino sin quitar el imán)
        if (iman) {
          x = ajustar(x, PASO_IMAN / (def.sprite?.fijo ? marco.zoom : 1));
          y = ajustar(y, PASO_IMAN / (def.sprite?.fijo ? marco.zoom : 1));
        }
        const g = posicionGuardada(def, marco, x, y);
        if (g.x !== def.x || g.y !== def.y) this.estado.moverObjeto(ref, g.x, g.y);
      } else if (a.tipo === 'tamano') {
        const e_ = Math.abs(def.escala ?? 1) / (def.sprite?.fijo ? this.marco().zoom : 1);
        // Tiramos de la esquina de abajo a la derecha: el centro no se mueve, así que el cambio cuenta doble
        let ancho = Math.max(4, a.ancho0 + ((m.x - a.x0) * 2) / e_);
        let alto = Math.max(4, a.alto0 + ((a.y0 - m.y) * 2) / e_);
        if (e.shiftKey) {
          // Mayúsculas: sin deformar
          const f = Math.max(ancho / a.ancho0, alto / a.alto0);
          ancho = a.ancho0 * f;
          alto = a.alto0 * f;
        }
        if (this.iman !== e.altKey) {
          ancho = Math.max(PASO_IMAN / 2, ajustar(ancho, PASO_IMAN / 2));
          alto = Math.max(PASO_IMAN / 2, ajustar(alto, PASO_IMAN / 2));
        }
        this.estado.cambiarPropiedad(ref, 'sprite.ancho', Math.round(ancho));
        this.estado.cambiarPropiedad(ref, 'sprite.alto', Math.round(alto));
      }
    });

    const soltar = () => {
      const a = this.arrastre;
      if (a?.tipo === 'rectangulo' && this.estado.seleccion) {
        this.estado.pintarRectangulo(this.estado.seleccion, a.c0, a.f0, a.c1, a.f1, this.tipoParaPintar());
      } else if (a?.tipo === 'marco') {
        this.seleccionarEnMarco(a);
      } else if (a && a.tipo !== 'vista') this.estado.terminarCambioLargo();
      this.arrastre = null;
      c.style.cursor = 'default';
    };
    c.addEventListener('pointerup', soltar);
    c.addEventListener('pointercancel', soltar);
    c.addEventListener('pointerleave', () => {
      this.raton = null;
      this.etiquetaRaton.textContent = '';
      this.redibujar();
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this.posRaton(e);
      this.camara.zoomEn(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
      this.redibujar();
    }, { passive: false });

    // Doble clic en un objeto: abrir su script
    c.addEventListener('dblclick', (e) => {
      const p = this.posRaton(e);
      const m = this.camara.aMundo(p.x, p.y);
      const i = objetoEn(this.estado.escena.objetos, this.marco(), m.x, m.y);
      const def = i === null ? null : this.estado.escena.objetos[i];
      if (def?.script && def.script in this.estado.proyecto.scripts) this.estado.abrirScript(def.script);
    });

    c.addEventListener('keydown', (e) => this.tecla(e));
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.espacioPulsado = false;
    });

    // Soltar cosas encima: plantillas o imágenes del panel, o archivos de imagen del ordenador
    c.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    c.addEventListener('drop', (e) => {
      e.preventDefault();
      const p = this.posRaton(e);
      let m = this.camara.aMundo(p.x, p.y);
      if (this.iman) m = { x: ajustar(m.x, PASO_IMAN), y: ajustar(m.y, PASO_IMAN) };
      const dt = e.dataTransfer;
      if (!dt) return;
      const plantilla = dt.getData('chispa/plantilla');
      const imagen = dt.getData('chispa/imagen');
      const biblioteca = dt.getData('chispa/biblioteca');
      if (biblioteca) this.ponerDeBiblioteca(biblioteca, m.x, m.y);
      else if (plantilla) this.estado.colocarPlantilla(plantilla, m.x, m.y);
      else if (imagen) this.estado.crearObjeto('imagen', m.x, m.y, imagen);
      else {
        // Los sonidos soltados en la escena se importan (no se pueden «colocar»)
        const sonidos = [...dt.files].filter((f) => tipoDeArchivo(f) === 'sonido' || tipoDeArchivo(f) === 'letra');
        if (sonidos.length) {
          void importarArchivos(this.estado, sonidos).then((r) => {
            const m = resumenImportar(r);
            if (m) notificar(m.texto, m.tipo);
          });
        }
        for (const archivo of [...dt.files].filter((f) => tipoDeArchivo(f) === 'imagen')) {
          // Se importa como con el botón (comprobando que es de verdad una imagen) y luego se coloca
          void importarArchivos(this.estado, [archivo]).then((r) => {
            const nombre = r.imagenes[0];
            if (!nombre) {
              const m = resumenImportar(r);
              if (m) notificar(m.texto, m.tipo);
              return;
            }
            const datos = this.estado.proyecto.imagenes[nombre];
            this.estado.crearObjeto('imagen', m.x, m.y, nombre);
            // Tamaño real de la imagen (si no es enorme)
            const img = new Image();
            img.onload = () => {
              const ref = this.estado.seleccion;
              if (!ref) return;
              const f = Math.min(1, 256 / Math.max(img.width, img.height));
              this.estado.cambiarPropiedad(ref, 'sprite.ancho', Math.round(img.width * f));
              this.estado.cambiarPropiedad(ref, 'sprite.alto', Math.round(img.height * f));
            };
            img.src = datos;
          });
        }
      }
      c.focus();
    });
  }

  private tecla(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.espacioPulsado = true;
      e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'v') return this.ponerHerramienta('mover');
    if (k === 'b') return this.ponerHerramienta('pincel');
    if (k === 'e') return this.ponerHerramienta('goma');
    if (k === 'f') return this.encuadrar();
    const ref = this.estado.seleccion;
    const def = this.estado.seleccionado;
    if (!ref || !def) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.estado.borrarSeleccionado();
      return;
    }
    const paso = e.shiftKey ? 10 : 1;
    const mov: Record<string, [number, number]> = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, paso], ArrowDown: [0, -paso] };
    const d = mov[e.key];
    if (d) {
      e.preventDefault();
      if (this.estado.variosSeleccionados) this.estado.moverSeleccionados(d[0], d[1]);
      else this.estado.moverObjeto(ref, (def.x ?? 0) + d[0], (def.y ?? 0) + d[1]);
    }
  }

}

export function leerComoDataURL(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () => rechazar(new Error(`No he podido leer el archivo "${archivo.name}".`));
    lector.readAsDataURL(archivo);
  });
}
