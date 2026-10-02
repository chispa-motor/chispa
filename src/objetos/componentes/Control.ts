/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CONTROLES DE INTERFAZ: lo que hace que un objeto sea un botón de verdad,
 * una barra de vida, un campo donde se escribe, un deslizador, una casilla
 * para marcar, una lista, un menú, una ventana, un inventario, un minimapa o
 * un icono con contador.
 *
 * Un control va siempre con un Dibujo (Sprite), que le da el tamaño, el color
 * principal, el color y el tipo de letra, la capa y si está pegado a la
 * pantalla. El control se encarga de dibujarse (cada tipo a su manera) y de
 * atender al ratón y al teclado. Cuando cambia lo que vale (se mueve el
 * deslizador, se marca la casilla, se elige en la lista...), avisa a los
 * scripts del objeto: «cuando cambia:».
 *
 * Todos comparten `valor`, que es lo que «vale» el control:
 *   barra, deslizador, icono → un número        casilla → verdadero o falso
 *   campo → el texto escrito                    lista, menú → la opción elegida
 *   inventario → lo que hay en la casilla elegida
 */
import { Componente } from '../Componente';
import type { Renderizador } from '../../motor/Renderizador';
import { colorAComponentes, resolverColor } from '../../motor/Color';
import type { ObjetoJuego } from '../ObjetoJuego';
import { MapaCasillas } from './MapaCasillas';
import { Sprite } from './Sprite';
import { propio } from '../../utilidades/seguro';

export const TIPOS_CONTROL = ['boton', 'barra', 'campo', 'deslizador', 'casilla', 'lista', 'menu', 'ventana', 'inventario', 'minimapa', 'icono'] as const;
export type TipoControl = (typeof TIPOS_CONTROL)[number];

/** Cómo se llama cada control en el editor. */
export const NOMBRES_CONTROLES: Record<TipoControl, string> = {
  boton: 'Botón', barra: 'Barra (vida, energía)', campo: 'Campo de texto', deslizador: 'Deslizador', casilla: 'Casilla', lista: 'Lista',
  menu: 'Menú', ventana: 'Ventana', inventario: 'Inventario', minimapa: 'Minimapa', icono: 'Icono con contador',
};

/** Lo que hay en una casilla del inventario. */
export interface ObjetoInventario {
  nombre: string;
  cantidad: number;
}

/** Como mucho, estas opciones en una lista o un menú, y estas casillas en un inventario. */
export const MAXIMO_OPCIONES = 200;
export const MAXIMO_CASILLAS = 100;
/** Como mucho, estos puntos (objetos) y estas casillas en un minimapa. */
const MAXIMO_PUNTOS_MINIMAPA = 400;
const MAXIMO_CASILLAS_MINIMAPA = 6000;

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export class Control extends Componente {
  tipo: TipoControl = 'boton';
  /** Si no está activado, se ve apagado y no atiende al ratón ni al teclado. */
  activado = true;

  // ── Barra, deslizador e icono: un número ──
  numero = 0;
  minimo = 0;
  maximo = 100;
  /** De cuánto en cuánto se mueve el deslizador. */
  paso = 1;
  /** Un dato que se lee solo en cada fotograma ("juego.vida"): lo pone el juego al empezar. */
  dato = '';
  leerDato: (() => number | null) | null = null;
  /** Lo que se ve de la barra: persigue al número de verdad, para que no dé saltos. */
  private mostrado: number | null = null;

  // ── Casilla ──
  marcada = false;

  // ── Campo de texto ──
  /** Lo que se ve, en gris, cuando está vacío. */
  pista = '';
  largoMaximo = 20;
  enfocado = false;

  // ── Lista y menú ──
  opciones: string[] = [];
  /** La opción elegida (la primera es la 0; -1 = ninguna). */
  elegido = -1;
  /** Por dónde va la lista si no cabe entera. */
  private desplazado = 0;

  // ── Ventana ──
  titulo = '';
  /** Se puede mover arrastrando su barra de título. */
  arrastrable = false;
  /** Tiene un botón (X) para cerrarla. */
  conCerrar = false;

  // ── Inventario ──
  columnas = 4;
  filas = 2;
  /** Lo que hay en cada casilla (null = vacía). */
  casillas: (ObjetoInventario | null)[] = [];

  // ── Minimapa ──
  /** El objeto que va en el centro (su nombre). Vacío = se ve el mundo entero. */
  seguir = '';
  /** Cuántos píxeles del mundo caben a lo ancho (solo si sigue a alguien). */
  alcance = 2000;

  /** El color de fondo (lo de detrás: la barra vacía, el fondo de la lista, de la ventana...). */
  colorFondo = '#1b2130';

  /** Por dónde se cogió (al arrastrar el deslizador o la ventana). */
  private arrastre: { dx: number; dy: number } | null = null;
  /** El reloj del cursor del campo de texto (parpadea). */
  private reloj = 0;

  // ───────────────────────── Lo que vale ─────────────────────────

  /** Lo que «vale» el control (ver arriba). */
  get valor(): number | boolean | string | null {
    switch (this.tipo) {
      case 'barra': case 'deslizador': case 'icono': return this.numero;
      case 'casilla': return this.marcada;
      case 'campo': return this.sprite?.texto ?? '';
      case 'lista': case 'menu': return this.opciones[this.elegido] ?? null;
      case 'inventario': return this.casillas[this.elegido]?.nombre ?? null;
      default: return null;
    }
  }

  private get sprite(): Sprite | undefined {
    return this.objeto.obtener(Sprite);
  }

  /** Pone el número (dentro de sus límites y, en el deslizador, de paso en paso). Devuelve si ha cambiado. */
  ponerNumero(n: number, avisar = false): boolean {
    let v = entre(Number.isFinite(n) ? n : this.minimo, this.minimo, Math.max(this.minimo, this.maximo));
    if (this.tipo === 'deslizador' && this.paso > 0) v = entre(this.minimo + Math.round((v - this.minimo) / this.paso) * this.paso, this.minimo, this.maximo);
    if (this.tipo === 'icono') v = Number.isFinite(n) ? n : 0; // un contador no tiene tope
    if (v === this.numero) return false;
    this.numero = v;
    if (avisar) this.avisarCambio();
    return true;
  }

  /** Elige una opción (o una casilla del inventario). Devuelve si ha cambiado. */
  elegir(indice: number, avisar = false): boolean {
    const cuantas = this.tipo === 'inventario' ? this.columnas * this.filas : this.opciones.length;
    const i = Number.isInteger(indice) && indice >= 0 && indice < cuantas ? indice : -1;
    if (i === this.elegido) return false;
    this.elegido = i;
    this.verElegido();
    if (avisar) this.avisarCambio();
    return true;
  }

  /** Avisa a los scripts del objeto: «cuando cambia:». */
  private avisarCambio(): void {
    for (const c of this.objeto.todosLosComponentes) if (c !== this && c.activo) c.alCambiar?.();
  }

  // ───────────────────────── Ventanas: abrir y cerrar ─────────────────────────

  /** Enseña el control y todo lo que lleva dentro (sus hijos). */
  abrir(): void {
    this.verConHijos(this.objeto, true);
  }

  /** Lo esconde, con todo lo que lleva dentro. */
  cerrar(): void {
    this.verConHijos(this.objeto, false);
    this.enfocado = false;
    this.arrastre = null;
  }

  get abierto(): boolean {
    return this.sprite?.visible ?? false;
  }

  private verConHijos(o: ObjetoJuego, visible: boolean, vistos = new Set<ObjetoJuego>()): void {
    if (vistos.has(o)) return;
    vistos.add(o);
    const s = o.obtener(Sprite);
    if (s) s.visible = visible;
    for (const otro of o.escena?.objetos ?? []) if (otro.padre === o && !otro.destruido) this.verConHijos(otro, visible, vistos);
  }

  // ───────────────────────── Inventario ─────────────────────────

  /** Mete objetos: se suman a los que ya hay de ese nombre o, si no hay, en la primera casilla vacía. Devuelve falso si no caben. */
  meter(nombre: string, cantidad = 1): boolean {
    const total = Math.min(MAXIMO_CASILLAS, this.columnas * this.filas);
    const hay = this.casillas.findIndex((c) => c?.nombre === nombre);
    if (hay >= 0 && hay < total) {
      this.casillas[hay]!.cantidad += cantidad;
      return true;
    }
    for (let i = 0; i < total; i++) {
      if (!this.casillas[i]) {
        this.casillas[i] = { nombre, cantidad };
        return true;
      }
    }
    return false;
  }

  /** Saca objetos. Devuelve cuántos ha sacado de verdad (puede haber menos de los pedidos). */
  sacar(nombre: string, cantidad = 1): number {
    const i = this.casillas.findIndex((c) => c?.nombre === nombre);
    if (i < 0) return 0;
    const c = this.casillas[i]!;
    const sacados = Math.min(c.cantidad, cantidad);
    c.cantidad -= sacados;
    if (c.cantidad <= 0) this.casillas[i] = null;
    return sacados;
  }

  /** Cuántos hay de un objeto. */
  cuantos(nombre: string): number {
    return this.casillas.find((c) => c?.nombre === nombre)?.cantidad ?? 0;
  }

  vaciar(): void {
    this.casillas = [];
    this.elegido = -1;
  }

  // ───────────────────────── Medidas ─────────────────────────

  private get ancho(): number {
    return this.sprite?.anchoFinal ?? 0;
  }
  private get alto(): number {
    return this.sprite?.altoFinal ?? 0;
  }
  /** El tamaño de la letra (con la escala del objeto). */
  private get letra(): number {
    const s = this.sprite;
    return (s?.tamano ?? 20) * Math.abs(this.objeto.transformacion.escala.y);
  }
  /** Lo que mide de alto cada fila de una lista o un menú. */
  private get altoFila(): number {
    return this.tipo === 'menu' ? Math.max(this.letra * 1.9, 24) : Math.max(this.letra * 1.5, 16);
  }
  /** El alto de la barra de título de una ventana. */
  get altoTitulo(): number {
    return Math.max(this.letra * 1.7, 22);
  }
  /** Cuántas filas de la lista caben. */
  private get filasVisibles(): number {
    return Math.max(1, Math.floor((this.alto - 8) / this.altoFila));
  }

  /** El ratón respecto al centro del control, con la Y hacia ABAJO (como se dibuja). null si no hay escena. */
  private raton(): { x: number; y: number } | null {
    const e = this.objeto.escena;
    const s = this.sprite;
    if (!e || !s) return null;
    const p = s.fijo ? e.ratonEnPantalla() : e.ratonEnMundo();
    return { x: p.x - this.objeto.posicion.x, y: this.objeto.posicion.y - p.y };
  }

  /** La fila de la lista (o del menú) que hay bajo el ratón, o -1. */
  private filaEn(m: { x: number; y: number }): number {
    const arriba = this.tipo === 'menu' ? -(this.opciones.length * this.altoFila) / 2 : -this.alto / 2 + 4;
    const fila = Math.floor((m.y - arriba) / this.altoFila);
    if (Math.abs(m.x) > this.ancho / 2 || fila < 0) return -1;
    const indice = fila + (this.tipo === 'lista' ? this.desplazado : 0);
    if (this.tipo === 'lista' && fila >= this.filasVisibles) return -1;
    return indice < this.opciones.length ? indice : -1;
  }

  /** La casilla del inventario que hay bajo el ratón, o -1. */
  private casillaEn(m: { x: number; y: number }): number {
    const c = Math.floor(((m.x + this.ancho / 2) / this.ancho) * this.columnas);
    const f = Math.floor(((m.y + this.alto / 2) / this.alto) * this.filas);
    return c >= 0 && c < this.columnas && f >= 0 && f < this.filas ? f * this.columnas + c : -1;
  }

  /** Que la opción elegida se vea (si la lista no cabe entera). */
  private verElegido(): void {
    if (this.tipo !== 'lista' || this.elegido < 0) return;
    if (this.elegido < this.desplazado) this.desplazado = this.elegido;
    if (this.elegido >= this.desplazado + this.filasVisibles) this.desplazado = this.elegido - this.filasVisibles + 1;
  }

  /** Un menú mide de alto lo que ocupan sus opciones (así el ratón acierta en todas). */
  private ajustarMenu(): void {
    const s = this.sprite;
    if (this.tipo !== 'menu' || !s) return;
    const alto = Math.max(1, this.opciones.length) * this.altoFila;
    const escala = Math.abs(this.objeto.transformacion.escala.y) || 1;
    if (Math.abs(s.alto * escala - alto) > 0.5) s.alto = alto / escala;
  }

  // ───────────────────────── Ratón y teclado ─────────────────────────

  private get atiende(): boolean {
    return this.activo && this.activado && !!this.sprite?.visible;
  }

  recibeClics(): boolean {
    // La barra, el icono y el minimapa solo enseñan; lo demás se puede pulsar
    return this.atiende && !['barra', 'icono', 'minimapa'].includes(this.tipo);
  }

  alHacerClic(): void {
    const m = this.raton();
    if (!m || !this.atiende) return;
    switch (this.tipo) {
      case 'casilla':
        this.marcada = !this.marcada;
        this.avisarCambio();
        break;
      case 'campo':
        this.enfocar();
        break;
      case 'deslizador':
        this.arrastre = { dx: 0, dy: 0 };
        this.moverDeslizador(m);
        break;
      case 'lista': {
        const fila = this.filaEn(m);
        if (fila >= 0) this.elegir(fila, true);
        break;
      }
      case 'menu': {
        const fila = this.filaEn(m);
        if (fila < 0) break;
        this.elegido = fila;
        // En un menú, elegir es «pulsar»: avisa aunque ya estuviera en esa opción
        this.avisarCambio();
        break;
      }
      case 'inventario': {
        const casilla = this.casillaEn(m);
        if (casilla >= 0) this.elegir(casilla === this.elegido ? -1 : casilla, true);
        break;
      }
      case 'ventana': {
        const enTitulo = m.y < -this.alto / 2 + this.altoTitulo;
        if (!enTitulo) break;
        if (this.conCerrar && m.x > this.ancho / 2 - this.altoTitulo) {
          this.cerrar();
          this.avisarCambio();
        } else if (this.arrastrable) this.arrastre = { dx: m.x, dy: m.y };
        break;
      }
    }
  }

  /** Empieza a escribir en el campo (como hacer clic en él). */
  enfocar(): void {
    if (this.tipo !== 'campo' || !this.atiende) return;
    // Solo se escribe en uno a la vez
    for (const o of this.objeto.escena?.objetos ?? []) {
      const otro = o.obtener(Control);
      if (otro && otro !== this) otro.enfocado = false;
    }
    this.enfocado = true;
    this.reloj = 0;
  }

  private moverDeslizador(m: { x: number; y: number }): void {
    const margen = Math.min(this.alto, 24) / 2;
    const recorrido = Math.max(1, this.ancho - margen * 2);
    const t = entre((m.x + this.ancho / 2 - margen) / recorrido, 0, 1);
    this.ponerNumero(this.minimo + t * (this.maximo - this.minimo), true);
  }

  actualizar(dt: number): void {
    const escena = this.objeto.escena;
    const s = this.sprite;
    if (!escena || !s) return;
    this.ajustarMenu();
    const entrada = escena.motor.entrada;

    // El dato que se lee solo ("juego.vida")
    if (this.leerDato) {
      const n = this.leerDato();
      if (n === null) this.leerDato = null;
      else if (this.tipo === 'casilla') this.marcada = n !== 0;
      else this.ponerNumero(n);
    }
    // La barra se mueve suavemente hacia su valor
    if (this.tipo === 'barra') {
      if (this.mostrado === null) this.mostrado = this.numero;
      else this.mostrado += (this.numero - this.mostrado) * (1 - Math.exp(-12 * dt));
    }
    if (!this.atiende) {
      this.enfocado = false;
      this.arrastre = null;
      entrada.escribiendo &&= !this.eraElQueEscribia();
      return;
    }
    const m = this.raton();

    // Arrastrar: el deslizador o la ventana
    if (this.arrastre) {
      if (!entrada.ratonPulsado('izquierdo')) this.arrastre = null;
      else if (m && this.tipo === 'deslizador') this.moverDeslizador(m);
      else if (m && this.tipo === 'ventana') {
        this.objeto.posicion.x += m.x - this.arrastre.dx;
        this.objeto.posicion.y -= m.y - this.arrastre.dy;
      }
    }

    // La rueda del ratón mueve la lista
    if (this.tipo === 'lista' && entrada.rueda !== 0 && escena.ratonEncima(this.objeto)) {
      this.desplazado = entre(this.desplazado + entrada.rueda, 0, Math.max(0, this.opciones.length - this.filasVisibles));
    }

    // El menú: con el ratón por encima o con las flechas, y se elige con Intro o espacio
    if (this.tipo === 'menu' && this.opciones.length) {
      if (entrada.sePulso('abajo')) this.elegido = (this.elegido + 1) % this.opciones.length;
      if (entrada.sePulso('arriba')) this.elegido = (this.elegido - 1 + this.opciones.length) % this.opciones.length;
      if (this.elegido >= 0 && (entrada.sePulso('enter') || entrada.sePulso('espacio'))) this.avisarCambio();
    }

    // El campo de texto
    if (this.tipo === 'campo') {
      this.reloj += escena.motor.tiempo?.deltaReal ?? dt;
      // Un clic fuera lo suelta
      if (this.enfocado && entrada.ratonSePulso('izquierdo') && !escena.ratonEncima(this.objeto)) this.enfocado = false;
      if (this.enfocado) {
        entrada.escribiendo = true;
        Control.escribe = this;
        let texto = s.texto;
        for (const letra of entrada.textoEscrito) {
          if (letra === '\b') texto = [...texto].slice(0, -1).join('');
          else if (letra === '\n' || letra === '\x1b') this.enfocado = false;
          else if ([...texto].length < this.largoMaximo) texto += letra;
        }
        if (texto !== s.texto) {
          s.texto = texto;
          s.textoVivo = null;
          this.reloj = 0;
          this.avisarCambio();
        }
      }
      if (!this.enfocado && this.eraElQueEscribia()) {
        entrada.escribiendo = false;
        Control.escribe = null;
      }
    }
  }

  /** El campo en el que se está escribiendo (solo uno a la vez). */
  private static escribe: Control | null = null;
  private eraElQueEscribia(): boolean {
    return Control.escribe === this;
  }

  alDestruir(): void {
    if (this.eraElQueEscribia()) {
      Control.escribe = null;
      const entrada = this.objeto.escena?.motor.entrada;
      if (entrada) entrada.escribiendo = false;
    }
  }

  // ───────────────────────── Dibujar ─────────────────────────

  /**
   * Dibuja el control con su centro en (x, y) (coordenadas de dibujo: la Y
   * hacia abajo). Lo llama el Dibujo (Sprite) del objeto en vez de pintarse él.
   */
  dibujar(r: Renderizador, x: number, y: number): void {
    const s = this.sprite;
    if (!s) return;
    const ctx = r.ctx;
    this.ajustarMenu();
    const w = this.ancho;
    const h = this.alto;
    const escena = this.objeto.escena;
    // En el editor no hay ratón del juego: el control se ve «en reposo»
    const encima = !!escena?.iniciada && this.atiende && escena.ratonEncima(this.objeto);
    const pulsado = encima && !!escena?.motor.entrada.ratonPulsado('izquierdo');
    const m = encima ? this.raton() : null;
    const principal = resolverColor(s.color);
    const fondo = resolverColor(this.colorFondo);
    const colorTexto = resolverColor(s.colorTexto);
    const tamano = this.letra;
    const texto = (t: string, tx: number, ty: number, alinear: 'izquierda' | 'centro' | 'derecha' = 'centro', color = colorTexto, tam = tamano) =>
      r.texto(t, tx, ty, { color, tamano: tam, alinear, vertical: 'medio', letra: s.letra, negrita: s.letra !== 'titulo' && s.letra !== 'pixel' });

    ctx.save();
    ctx.globalAlpha = s.opacidad * (this.activado ? 1 : 0.45);
    const radio = Math.min(10, w / 4, h / 4);

    switch (this.tipo) {
      case 'boton': {
        const baja = pulsado ? 2 : 0;
        caja(ctx, x - w / 2, y - h / 2 + baja, w, h, radio, principal);
        if (encima) caja(ctx, x - w / 2, y - h / 2 + baja, w, h, radio, pulsado ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.18)');
        if (s.texto) texto(s.texto, x, y + baja);
        break;
      }
      case 'barra': {
        const rango = Math.max(1e-9, this.maximo - this.minimo);
        const parte = entre(((this.mostrado ?? this.numero) - this.minimo) / rango, 0, 1);
        const rb = Math.min(h / 2, 8);
        caja(ctx, x - w / 2, y - h / 2, w, h, rb, fondo);
        if (parte > 0) {
          // Se recorta al hueco de la barra: así el relleno tiene las mismas esquinas redondas
          ctx.save();
          trazarCaja(ctx, x - w / 2, y - h / 2, w, h, rb);
          ctx.clip();
          ctx.fillStyle = principal;
          ctx.fillRect(x - w / 2, y - h / 2, w * parte, h);
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(x - w / 2, y - h / 2, w * parte, h * 0.4);
          ctx.restore();
        }
        if (s.texto) texto(s.texto, x, y, 'centro', colorTexto, Math.min(tamano, h * 0.8));
        break;
      }
      case 'deslizador': {
        const pomo = Math.min(h, 24) / 2;
        const rango = Math.max(1e-9, this.maximo - this.minimo);
        const parte = entre((this.numero - this.minimo) / rango, 0, 1);
        const izquierda = x - w / 2 + pomo;
        const largo = Math.max(1, w - pomo * 2);
        caja(ctx, izquierda, y - 3, largo, 6, 3, fondo);
        caja(ctx, izquierda, y - 3, largo * parte, 6, 3, principal);
        ctx.beginPath();
        ctx.arc(izquierda + largo * parte, y, pomo * (encima || this.arrastre ? 1 : 0.85), 0, Math.PI * 2);
        ctx.fillStyle = colorTexto;
        ctx.fill();
        break;
      }
      case 'casilla': {
        const lado = Math.min(h, 28);
        const cx = x - w / 2;
        caja(ctx, cx, y - lado / 2, lado, lado, 5, this.marcada ? principal : fondo);
        ctx.strokeStyle = encima ? colorTexto : principal;
        ctx.lineWidth = 2;
        trazarCaja(ctx, cx + 1, y - lado / 2 + 1, lado - 2, lado - 2, 4);
        ctx.stroke();
        if (this.marcada) {
          ctx.strokeStyle = colorTexto;
          ctx.lineWidth = Math.max(2, lado / 8);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(cx + lado * 0.24, y + lado * 0.02);
          ctx.lineTo(cx + lado * 0.43, y + lado * 0.22);
          ctx.lineTo(cx + lado * 0.78, y - lado * 0.2);
          ctx.stroke();
        }
        if (s.texto) texto(s.texto, cx + lado + 8, y, 'izquierda');
        break;
      }
      case 'campo': {
        caja(ctx, x - w / 2, y - h / 2, w, h, 6, fondo);
        ctx.strokeStyle = this.enfocado ? principal : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = this.enfocado ? 2.5 : 1.5;
        trazarCaja(ctx, x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2, 5);
        ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - w / 2 + 6, y - h / 2, w - 12, h);
        ctx.clip();
        const vacio = s.texto === '';
        const cursor = this.enfocado && this.reloj % 1 < 0.55 ? '|' : '';
        if (vacio && !this.enfocado) texto(this.pista, x - w / 2 + 10, y, 'izquierda', 'rgba(255,255,255,0.4)');
        else texto(s.texto + cursor, x - w / 2 + 10, y, 'izquierda');
        ctx.restore();
        break;
      }
      case 'lista': {
        caja(ctx, x - w / 2, y - h / 2, w, h, 6, fondo);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1.5;
        trazarCaja(ctx, x - w / 2 + 0.75, y - h / 2 + 0.75, w - 1.5, h - 1.5, 5.5);
        ctx.stroke();
        const sobre = m ? this.filaEn(m) : -1;
        const caben = this.filasVisibles;
        for (let i = 0; i < caben && i + this.desplazado < this.opciones.length; i++) {
          const indice = i + this.desplazado;
          const fy = y - h / 2 + 4 + i * this.altoFila;
          if (indice === this.elegido) caja(ctx, x - w / 2 + 4, fy, w - 8, this.altoFila, 4, principal);
          else if (indice === sobre) caja(ctx, x - w / 2 + 4, fy, w - 8, this.altoFila, 4, 'rgba(255,255,255,0.1)');
          ctx.save();
          ctx.beginPath();
          ctx.rect(x - w / 2 + 4, fy, w - 8, this.altoFila);
          ctx.clip();
          texto(this.opciones[indice], x - w / 2 + 12, fy + this.altoFila / 2, 'izquierda');
          ctx.restore();
        }
        // Si hay más de las que caben: una barrita a la derecha que dice por dónde va
        if (this.opciones.length > caben) {
          const largo = Math.max(12, ((h - 8) * caben) / this.opciones.length);
          const recorrido = h - 8 - largo;
          caja(ctx, x + w / 2 - 6, y - h / 2 + 4 + (recorrido * this.desplazado) / (this.opciones.length - caben), 3, largo, 1.5, 'rgba(255,255,255,0.4)');
        }
        break;
      }
      case 'menu': {
        const n = this.opciones.length;
        const arriba = y - (n * this.altoFila) / 2;
        const sobre = m ? this.filaEn(m) : -1;
        // El ratón por encima mueve la opción marcada (así ratón y teclado van juntos)
        if (sobre >= 0 && escena?.iniciada) this.elegido = sobre;
        this.opciones.forEach((opcion, i) => {
          const fy = arriba + i * this.altoFila;
          const marcada = i === this.elegido;
          caja(ctx, x - w / 2, fy + 2, w, this.altoFila - 4, 8, marcada ? principal : fondo);
          if (marcada && pulsado) caja(ctx, x - w / 2, fy + 2, w, this.altoFila - 4, 8, 'rgba(0,0,0,0.2)');
          texto(opcion, x, fy + this.altoFila / 2);
        });
        break;
      }
      case 'ventana': {
        const at = this.altoTitulo;
        caja(ctx, x - w / 2, y - h / 2, w, h, 10, fondo);
        ctx.save();
        trazarCaja(ctx, x - w / 2, y - h / 2, w, h, 10);
        ctx.clip();
        ctx.fillStyle = principal;
        ctx.fillRect(x - w / 2, y - h / 2, w, at);
        ctx.restore();
        ctx.strokeStyle = principal;
        ctx.lineWidth = 2;
        trazarCaja(ctx, x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2, 9);
        ctx.stroke();
        if (this.titulo) texto(this.titulo, x - w / 2 + 12, y - h / 2 + at / 2, 'izquierda');
        if (this.conCerrar) {
          const cx = x + w / 2 - at / 2;
          const cy = y - h / 2 + at / 2;
          const sobreX = !!m && m.y < -h / 2 + at && m.x > w / 2 - at;
          if (sobreX) caja(ctx, cx - at / 2 + 3, cy - at / 2 + 3, at - 6, at - 6, 5, 'rgba(0,0,0,0.25)');
          ctx.strokeStyle = colorTexto;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          const d = at * 0.18;
          ctx.beginPath();
          ctx.moveTo(cx - d, cy - d);
          ctx.lineTo(cx + d, cy + d);
          ctx.moveTo(cx + d, cy - d);
          ctx.lineTo(cx - d, cy + d);
          ctx.stroke();
        }
        break;
      }
      case 'inventario': {
        const cw = w / this.columnas;
        const ch = h / this.filas;
        const sobre = m ? this.casillaEn(m) : -1;
        for (let i = 0; i < this.columnas * this.filas; i++) {
          const cx = x - w / 2 + (i % this.columnas) * cw;
          const cy = y - h / 2 + Math.floor(i / this.columnas) * ch;
          caja(ctx, cx + 2, cy + 2, cw - 4, ch - 4, 6, fondo);
          ctx.strokeStyle = 'rgba(255,255,255,0.22)';
          ctx.lineWidth = 1.5;
          trazarCaja(ctx, cx + 2.75, cy + 2.75, cw - 5.5, ch - 5.5, 5.5);
          ctx.stroke();
          if (i === sobre) caja(ctx, cx + 2, cy + 2, cw - 4, ch - 4, 6, 'rgba(255,255,255,0.1)');
          if (i === this.elegido) {
            ctx.strokeStyle = principal;
            ctx.lineWidth = 3;
            trazarCaja(ctx, cx + 3, cy + 3, cw - 6, ch - 6, 5);
            ctx.stroke();
          }
          const cosa = this.casillas[i];
          if (!cosa) continue;
          const lado = Math.min(cw, ch) - 14;
          const imagen = escena?.motor.recursos.imagenSiExiste?.(cosa.nombre) ?? null;
          if (imagen) r.imagen(imagen, cx + cw / 2, cy + ch / 2, { ancho: lado, alto: lado });
          else {
            // Sin imagen con ese nombre: un círculo de un color que sale del nombre, con su inicial
            ctx.beginPath();
            ctx.arc(cx + cw / 2, cy + ch / 2, lado / 2.4, 0, Math.PI * 2);
            ctx.fillStyle = colorDeNombre(cosa.nombre);
            ctx.fill();
            texto([...cosa.nombre][0]?.toUpperCase() ?? '?', cx + cw / 2, cy + ch / 2, 'centro', '#ffffff', lado * 0.5);
          }
          if (cosa.cantidad !== 1) {
            r.texto(String(cosa.cantidad), cx + cw - 7, cy + ch - 6 - Math.min(tamano, ch * 0.3), { color: colorTexto, tamano: Math.min(tamano, ch * 0.3), alinear: 'derecha', sombra: true, negrita: true, letra: s.letra });
          }
        }
        break;
      }
      case 'minimapa':
        this.dibujarMinimapa(r, x, y, w, h, fondo, principal);
        break;
      case 'icono': {
        const imagen = s.imagen ? escena?.motor.recursos.imagenSiExiste?.(s.imagen) ?? null : null;
        if (imagen) r.imagen(imagen, x, y, { ancho: w, alto: h });
        else {
          ctx.beginPath();
          ctx.arc(x, y, Math.min(w, h) / 2, 0, Math.PI * 2);
          ctx.fillStyle = principal;
          ctx.fill();
        }
        r.texto(`${s.texto}${Math.round(this.numero)}`, x + w / 2 + 6, y - tamano / 2, { color: colorTexto, tamano, sombra: true, negrita: true, letra: s.letra });
        break;
      }
    }
    ctx.restore();
  }

  /** El mundo en pequeño: las casillas sólidas de los mapas, los objetos como puntos y lo que ve la cámara. */
  private dibujarMinimapa(r: Renderizador, x: number, y: number, w: number, h: number, fondo: string, principal: string): void {
    const ctx = r.ctx;
    const escena = this.objeto.escena;
    caja(ctx, x - w / 2, y - h / 2, w, h, 6, fondo);
    // En el editor (sin juego en marcha) solo se ve su marco
    if (!escena?.iniciada) {
      ctx.strokeStyle = principal;
      ctx.lineWidth = 2;
      trazarCaja(ctx, x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2, 5);
      ctx.stroke();
      r.texto('Minimapa', x, y, { color: principal, tamano: Math.min(16, h / 3), alinear: 'centro', vertical: 'medio' });
      return;
    }
    // Qué trozo del mundo se enseña: alrededor de un objeto, o el mundo entero (los mapas; si no hay, lo que ve la cámara ×3)
    const centro = this.seguir ? escena.buscar(this.seguir) : null;
    const vista = escena.camara.zonaVisible();
    let zona = escena.limitesDeLosMapas() ?? {
      izquierda: vista.izquierda - (vista.derecha - vista.izquierda), derecha: vista.derecha + (vista.derecha - vista.izquierda),
      abajo: vista.abajo - (vista.arriba - vista.abajo), arriba: vista.arriba + (vista.arriba - vista.abajo),
    };
    if (centro) {
      const medio = Math.max(50, this.alcance) / 2;
      const medioAlto = (medio * h) / Math.max(1, w);
      zona = { izquierda: centro.posicion.x - medio, derecha: centro.posicion.x + medio, abajo: centro.posicion.y - medioAlto, arriba: centro.posicion.y + medioAlto };
    }
    const k = Math.min((w - 6) / Math.max(1, zona.derecha - zona.izquierda), (h - 6) / Math.max(1, zona.arriba - zona.abajo));
    const cx = (zona.izquierda + zona.derecha) / 2;
    const cy = (zona.abajo + zona.arriba) / 2;
    const aMapa = (mx: number, my: number) => ({ x: x + (mx - cx) * k, y: y - (my - cy) * k });
    ctx.save();
    trazarCaja(ctx, x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4, 5);
    ctx.clip();
    let casillas = 0;
    let puntos = 0;
    for (const o of escena.objetos) {
      if (o.destruido || o === this.objeto) continue;
      const mapa = o.obtener(MapaCasillas);
      if (mapa?.activo) {
        const lado = Math.max(1, mapa.tamano * k);
        for (const [clave, tipo] of mapa.celdas) {
          if (casillas >= MAXIMO_CASILLAS_MINIMAPA) break;
          const def = propio(mapa.tipos, tipo);
          if (!def?.solida) continue;
          const coma = clave.indexOf(',');
          const sitio = mapa.cajaDe(Number(clave.slice(0, coma)), Number(clave.slice(coma + 1)));
          const p = aMapa(sitio.izquierda, sitio.arriba);
          ctx.fillStyle = resolverColor(def.color ?? '#8892a6');
          ctx.fillRect(p.x, p.y, lado + 0.5, lado + 0.5);
          casillas++;
        }
        continue;
      }
      const s = o.obtener(Sprite);
      if (!s || !s.visible || s.fijo || s.forma === 'texto' || puntos >= MAXIMO_PUNTOS_MINIMAPA) continue;
      const p = aMapa(o.posicion.x, o.posicion.y);
      const esCentro = o === centro;
      ctx.beginPath();
      ctx.arc(p.x, p.y, esCentro ? 4 : Math.max(2, Math.min(4, (Math.max(s.anchoFinal, s.altoFinal) * k) / 2)), 0, Math.PI * 2);
      ctx.fillStyle = esCentro ? '#ffffff' : resolverColor(s.color);
      ctx.fill();
      puntos++;
    }
    // Lo que se ve ahora en la pantalla
    const a = aMapa(vista.izquierda, vista.arriba);
    ctx.strokeStyle = principal;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(a.x, a.y, (vista.derecha - vista.izquierda) * k, (vista.arriba - vista.abajo) * k);
    ctx.restore();
    ctx.strokeStyle = principal;
    ctx.lineWidth = 2;
    trazarCaja(ctx, x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2, 5);
    ctx.stroke();
  }
}

/** El camino de un rectángulo con las esquinas redondas. */
function trazarCaja(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radio: number): void {
  const r = Math.max(0, Math.min(radio, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Un rectángulo relleno con las esquinas redondas. */
function caja(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radio: number, color: string): void {
  if (w <= 0 || h <= 0) return;
  trazarCaja(ctx, x, y, w, h, radio);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Un color que sale del nombre (siempre el mismo para el mismo nombre). */
export function colorDeNombre(nombre: string): string {
  let h = 0;
  for (const c of nombre) h = (Math.imul(h, 31) + c.codePointAt(0)!) | 0;
  return `hsl(${((h % 360) + 360) % 360}, 60%, 45%)`;
}

/** ¿Es este color oscuro? (para elegir letra clara u oscura encima) */
export function esOscuro(color: string): boolean {
  const c = colorAComponentes(color);
  return !c || c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 < 140;
}
