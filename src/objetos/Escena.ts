/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Escena: el "mundo" donde viven los objetos. Como el Workspace de Roblox.
 *
 * Orden de cada fotograma:
 *   1. Clics encima de objetos (botones)
 *   2. Scripts y demás componentes (actualizar)
 *   3. Física (pasos fijos) + avisos de contacto
 *   4. Partículas y cámara
 *   5. Quitar los objetos destruidos
 *   6. Dibujar: primero el mundo (con cámara y zoom), luego la interfaz fija encima
 *
 * ── DECISIÓN: destruir "más tarde" ──
 * Si un script destruye un objeto mientras recorremos la lista de objetos,
 * la lista cambia por debajo y nos saltaríamos alguno. Por eso destruir()
 * solo lo MARCA, y lo quitamos de verdad al final del fotograma.
 */
import type { Motor, EscenaActiva } from '../motor/Motor';
import type { Renderizador } from '../motor/Renderizador';
import { Vector2 } from '../motor/Vector2';
import { normalizar } from '../utilidades/texto';
import { Camara, type Limites } from './Camara';
import { ObjetoJuego } from './ObjetoJuego';
import type { Particulas } from './Particulas';
import { Efectos } from './Efectos';
import { dibujarLuces } from './Luces';
import { Juntas } from './Juntas';
import { FILTROS_NORMALES, dibujarConFiltros, hayFiltros, type Filtros } from '../motor/Filtros';

/** Cómo se tapa la pantalla al cambiar de escena. */
export const TRANSICIONES = ['fundido', 'barrido', 'circulo', 'pixelado'] as const;
export type Transicion = (typeof TRANSICIONES)[number];
import { SistemaFisico } from './SistemaFisico';
import { Colision, type Caja } from './componentes/Colision';
import { GRAVEDAD_MUNDO } from './componentes/Fisica';
import { MapaCasillas } from './componentes/MapaCasillas';
import { Sprite } from './componentes/Sprite';
import { Fisica } from './componentes/Fisica';
import { AnimadorDeValores } from './AnimadorDeValores';
import { resolverColor } from '../motor/Color';
import type { CajaDialogo } from './Dialogo';

/** Algo dibujado con dibujar.linea(), dibujar.circulo()... Dura un fotograma. Coordenadas del mundo. */
export type DibujoDepuracion = (
  | { tipo: 'linea'; x1: number; y1: number; x2: number; y2: number; color: string; grosor: number }
  | { tipo: 'circulo'; x: number; y: number; radio: number; color: string; relleno: boolean }
  | { tipo: 'rectangulo'; x: number; y: number; ancho: number; alto: number; color: string; relleno: boolean }
  | { tipo: 'texto'; texto: string; x: number; y: number; color: string; tamano: number; letra?: string }
  /** (x, y) es el centro; ancho y alto, lo que mide entera. */
  | { tipo: 'elipse'; x: number; y: number; ancho: number; alto: number; color: string; relleno: boolean }
  /** Los puntos, en orden; se cierra sola (del último al primero). */
  | { tipo: 'poligono'; puntos: { x: number; y: number }[]; color: string; relleno: boolean; grosor: number }
  /** Ángulos en grados, como en matemáticas: 0 = derecha, 90 = arriba. */
  | { tipo: 'arco'; x: number; y: number; radio: number; desde: number; hasta: number; color: string; relleno: boolean; grosor: number }
) & {
  /** En la pantalla (como la interfaz), no en el mundo. */
  fijo?: boolean;
};

/** Cómo se reparte la pantalla dividida: en columnas (lado a lado) o en filas (una encima de otra). */
export const DIVISIONES = ['columnas', 'filas'] as const;
export type Division = (typeof DIVISIONES)[number];
/** Como mucho, estas cámaras (una por jugador). */
export const MAXIMO_CAMARAS = 4;

/** El trozo de pantalla de una cámara (en píxeles del juego, con la Y hacia abajo). */
export interface Vista {
  camara: Camara;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export class Escena implements EscenaActiva {
  objetos: ObjetoJuego[] = [];
  /** La cámara principal (la única, si la pantalla no está dividida). */
  readonly camara: Camara;
  /** Todas las cámaras: con la pantalla dividida hay una por trozo (la primera es la principal). */
  camaras: Camara[];
  division: Division = 'columnas';
  /** Las cuerdas, muelles y bisagras que unen objetos. */
  readonly juntas = new Juntas();
  /** Efectos especiales: partículas, emisores (fuego, lluvia...), rayos, ondas, destellos y números de daño. */
  readonly efectos = new Efectos();
  /** Las partículas de los efectos (particulas("explosion", x, y)). */
  get particulas(): Particulas {
    return this.efectos.particulas;
  }
  /** Gravedad de esta escena en píxeles/segundo² (0 = sin gravedad, para juegos vistos desde arriba). */
  gravedad = GRAVEDAD_MUNDO;
  iniciada = false;
  private porDestruir: ObjetoJuego[] = [];
  private fisica = new SistemaFisico();
  /** Valores que cambian poco a poco (animar(), yo.irA(), yo.parpadear()...). */
  readonly animaciones = new AnimadorDeValores();
  /** Lo que se dibuja con dibujar.xxx() en este fotograma. */
  dibujos: DibujoDepuracion[] = [];
  /**
   * Oscurecer la pantalla (fundido, y las transiciones entre escenas): de 0
   * (nada) a 1 (todo tapado). Sigue igual al cambiar de escena.
   */
  readonly fundido: { alfa: number; objetivo: number; velocidad: number; color: string; tipo: Transicion } = { alfa: 0, objetivo: 0, velocidad: 0, color: 'negro', tipo: 'fundido' };
  /** Oscuridad de 0 (nada: no hacen falta luces) a 1 (negro donde no hay luz), y su color (la luz ambiente). */
  oscuridad = 0;
  luzAmbiente = 'negro';
  /** Los filtros de pantalla (grises, pixelado, CRT...). Al cambiar de escena, los de la escena nueva. */
  filtros: Filtros = { ...FILTROS_NORMALES };
  /** Un destello de toda la pantalla (pantalla.flash): se apaga solo. */
  readonly flash = { alfa: 0, color: 'blanco', velocidad: 0 };
  /** Quien sabe hacer copias de objetos con sus scripts (el juego en marcha). Sin él, clonar() no funciona. */
  clonador: ((o: ObjetoJuego) => ObjetoJuego) | null = null;
  /** El objeto que se está arrastrando con el ratón (y dónde se cogió). */
  private arrastre: { objeto: ObjetoJuego; dx: number; dy: number } | null = null;
  /** Diálogos pedidos con dialogo(): se enseñan de uno en uno y, mientras, el juego se para. */
  dialogos: CajaDialogo[] = [];

  constructor(readonly motor: Motor) {
    this.camara = new Camara(motor.renderizador.ancho, motor.renderizador.alto);
    this.camaras = [this.camara];
  }

  // ───────────────────────── Pantalla dividida ─────────────────────────

  /**
   * Divide la pantalla en 1 a 4 trozos, cada uno con su cámara. Con 2, lado a
   * lado ("columnas") o una encima de otra ("filas"); con 3, dos arriba y una
   * abajo; con 4, una en cada esquina. Las cámaras nuevas empiezan como la principal.
   */
  dividir(cuantas: number, division: Division = 'columnas'): void {
    const n = Math.max(1, Math.min(MAXIMO_CAMARAS, Math.floor(cuantas)));
    this.division = division;
    while (this.camaras.length > n) this.camaras.pop();
    while (this.camaras.length < n) {
      const c = new Camara(this.camara.anchoPantalla, this.camara.altoPantalla);
      c.posicion = this.camara.posicion.copiar();
      c.suavizado = this.camara.suavizado;
      c.limites = this.camara.limites ? { ...this.camara.limites } : null;
      c.zoom = this.camara.zoom;
      this.camaras.push(c);
    }
    // Cada cámara sabe el tamaño de su trozo (para centrar y para no salirse de sus límites)
    for (const v of this.vistas()) {
      v.camara.anchoPantalla = v.ancho;
      v.camara.altoPantalla = v.alto;
      v.camara.zoom = v.camara.zoom; // vuelve a aplicar los límites con el tamaño nuevo
    }
  }

  /** El trozo de pantalla de cada cámara. */
  vistas(): Vista[] {
    const W = this.motor.renderizador.ancho;
    const H = this.motor.renderizador.alto;
    const c = this.camaras;
    if (c.length <= 1) return [{ camara: c[0], x: 0, y: 0, ancho: W, alto: H }];
    if (c.length === 2) {
      return this.division === 'filas'
        ? [{ camara: c[0], x: 0, y: 0, ancho: W, alto: H / 2 }, { camara: c[1], x: 0, y: H / 2, ancho: W, alto: H / 2 }]
        : [{ camara: c[0], x: 0, y: 0, ancho: W / 2, alto: H }, { camara: c[1], x: W / 2, y: 0, ancho: W / 2, alto: H }];
    }
    const vistas: Vista[] = [
      { camara: c[0], x: 0, y: 0, ancho: W / 2, alto: H / 2 },
      { camara: c[1], x: W / 2, y: 0, ancho: W / 2, alto: H / 2 },
      // Con 3, la de abajo ocupa todo el ancho
      { camara: c[2], x: 0, y: H / 2, ancho: c.length === 3 ? W : W / 2, alto: H / 2 },
    ];
    if (c.length > 3) vistas.push({ camara: c[3], x: W / 2, y: H / 2, ancho: W / 2, alto: H / 2 });
    return vistas;
  }

  /** La vista que hay debajo de un punto de la pantalla (la del ratón). */
  private vistaEn(p: { x: number; y: number }): Vista {
    const vistas = this.vistas();
    return vistas.find((v) => p.x >= v.x && p.x < v.x + v.ancho && p.y >= v.y && p.y < v.y + v.alto) ?? vistas[0];
  }

  /** Todo lo que se ve del mundo ahora mismo (con varias cámaras, la zona que las abarca a todas). */
  zonaVisible(): Caja {
    const z = this.camara.zonaVisible();
    for (const c of this.camaras.slice(1)) {
      const o = c.zonaVisible();
      z.izquierda = Math.min(z.izquierda, o.izquierda);
      z.derecha = Math.max(z.derecha, o.derecha);
      z.abajo = Math.min(z.abajo, o.abajo);
      z.arriba = Math.max(z.arriba, o.arriba);
    }
    return z;
  }

  /** Crea un objeto vacío (solo con Transformación) y lo añade. */
  crear(nombre: string, tipo = nombre): ObjetoJuego {
    return this.agregar(new ObjetoJuego(nombre, tipo));
  }

  agregar(objeto: ObjetoJuego): ObjetoJuego {
    objeto.escena = this;
    this.objetos.push(objeto);
    if (this.iniciada) for (const c of objeto.todosLosComponentes) c.iniciar?.();
    return objeto;
  }

  destruir(objeto: ObjetoJuego): void {
    if (objeto.destruido) return;
    objeto.destruido = true;
    this.porDestruir.push(objeto);
    for (const c of objeto.todosLosComponentes) c.alDestruir?.();
  }

  /** Busca el primer objeto cuyo nombre o tipo coincida (sin importar mayúsculas ni tildes). */
  buscar(nombre: string): ObjetoJuego | null {
    const n = normalizar(nombre);
    return (
      this.objetos.find((o) => !o.destruido && normalizar(o.nombre) === n) ??
      this.objetos.find((o) => !o.destruido && normalizar(o.tipo) === n) ??
      null
    );
  }

  buscarTodos(nombre: string): ObjetoJuego[] {
    const n = normalizar(nombre);
    return this.objetos.filter((o) => !o.destruido && (normalizar(o.nombre) === n || normalizar(o.tipo) === n));
  }

  /** Posición del ratón en el MUNDO (teniendo en cuenta la cámara y el zoom). */
  ratonEnMundo(): Vector2 {
    const p = this.motor.entrada.posicionRaton;
    if (this.camaras.length === 1) return this.camara.pantallaAMundo(p);
    // Con la pantalla dividida: el mundo que se ve en el trozo donde está el ratón
    const v = this.vistaEn(p);
    return v.camara.pantallaAMundo(new Vector2(p.x - v.x, p.y - v.y));
  }

  /** Posición del ratón en la PANTALLA, con la Y hacia arriba (para la interfaz fija). */
  ratonEnPantalla(): Vector2 {
    const p = this.motor.entrada.posicionRaton;
    return new Vector2(p.x, this.motor.renderizador.alto - p.y);
  }

  /** La caja que ocupa un objeto (su colisión o, si no tiene, su dibujo). */
  cajaDe(o: ObjetoJuego): Caja | null {
    const col = o.obtener(Colision);
    if (col) return col.caja();
    const s = o.obtener(Sprite);
    if (!s) return null;
    const { x, y } = o.posicion;
    return { izquierda: x - s.anchoFinal / 2, derecha: x + s.anchoFinal / 2, abajo: y - s.altoFinal / 2, arriba: y + s.altoFinal / 2 };
  }

  /** ¿Está el ratón encima de este objeto? (en la pantalla si es fijo; en el mundo si no) */
  ratonEncima(o: ObjetoJuego): boolean {
    const caja = this.cajaDe(o);
    if (!caja) return false;
    const s = o.obtener(Sprite);
    const p = s?.fijo ? this.ratonEnPantalla() : this.ratonEnMundo();
    // Una figura (corazón, estrella...): solo encima de lo que se ve, no de su caja
    if (s?.esFigura && s.visible) return s.contiene(p);
    return p.x >= caja.izquierda && p.x <= caja.derecha && p.y >= caja.abajo && p.y <= caja.arriba;
  }

  /** Arranca todos los objetos que ya estaban en la escena. */
  iniciar(): void {
    this.iniciada = true;
    // Copiamos la lista con [...] porque al iniciar un objeto puede crear otros.
    for (const o of [...this.objetos]) {
      if (o.destruido) continue;
      for (const c of o.todosLosComponentes) c.iniciar?.();
    }
  }

  actualizar(dt: number): void {
    // Con un diálogo abierto se siguen viendo los dibujos del último fotograma (la interfaz no desaparece)
    if (this.dialogos.length) return this.actualizarDialogo();
    this.dibujos = [];
    this.repartirClic();
    this.empezarArrastre();
    for (const o of [...this.objetos]) {
      if (o.destruido) continue;
      for (const c of o.todosLosComponentes) if (c.activo && !o.destruido) c.actualizar?.(dt);
    }
    this.fisica.actualizar(this, dt);
    this.juntas.actualizar(dt, (o) => this.arrastre?.objeto === o);
    this.animaciones.actualizar(dt);
    this.moverHijos();
    this.seguirArrastre();
    this.efectos.actualizar(dt, this.zonaVisible());
    for (const c of this.camaras) c.actualizar(dt);
    this.actualizarFundido(this.motor.tiempo.deltaReal);
    this.quitarDestruidos();
  }

  /** Con un diálogo abierto solo se mueve el diálogo (en tiempo real: da igual la cámara lenta). */
  private actualizarDialogo(): void {
    const d = this.dialogos[0];
    const p = this.motor.entrada.posicionRaton;
    d.actualizar(this.motor.tiempo.deltaReal, this.motor.entrada, { x: p.x, y: p.y });
    if (d.terminado) this.dialogos.shift();
    this.actualizarFundido(this.motor.tiempo.deltaReal);
  }

  /** ¿Está el juego parado por un diálogo? */
  get enDialogo(): boolean {
    return this.dialogos.length > 0;
  }

  // ───────────────────────── Padres e hijos ─────────────────────────

  /** Cada hijo se mueve lo mismo que se ha movido su padre (primero los padres, luego sus hijos). */
  private moverHijos(): void {
    const conPadre = this.objetos.filter((o) => o.padre && !o.destruido);
    if (!conPadre.length) return;
    const profundidad = (o: ObjetoJuego) => {
      let n = 0;
      for (let p = o.padre; p; p = p.padre) n++;
      return n;
    };
    conPadre.sort((a, b) => profundidad(a) - profundidad(b));
    for (const o of conPadre) {
      const padre = o.padre!;
      // Si se destruye el padre, sus hijos también (como en Roblox y en Godot)
      if (padre.destruido) {
        this.destruir(o);
        continue;
      }
      const antes = o.posicionPadre ?? padre.posicion.copiar();
      o.posicion.x += padre.posicion.x - antes.x;
      o.posicion.y += padre.posicion.y - antes.y;
      o.posicionPadre = padre.posicion.copiar();
    }
  }

  // ───────────────────────── Arrastrar con el ratón ─────────────────────────

  /** El objeto de más arriba que hay bajo el ratón (o null). La interfaz va por encima del mundo. */
  objetoBajoRaton(filtro: (o: ObjetoJuego) => boolean = () => true): ObjetoJuego | null {
    let elegido: ObjetoJuego | null = null;
    let mejor = -Infinity;
    for (const o of this.objetos) {
      if (o.destruido || o.obtener(MapaCasillas) || !filtro(o)) continue;
      const s = o.obtener(Sprite);
      if (s && !s.visible) continue;
      if (!this.ratonEncima(o)) continue;
      const orden = (s?.fijo ? 1_000_000 : 0) + (s?.capa ?? 0);
      if (orden >= mejor) {
        mejor = orden;
        elegido = o;
      }
    }
    return elegido;
  }

  private empezarArrastre(): void {
    const e = this.motor.entrada;
    if (this.arrastre && (!e.ratonPulsado('izquierdo') || this.arrastre.objeto.destruido)) this.arrastre = null;
    if (!e.ratonSePulso('izquierdo')) return;
    const o = this.objetoBajoRaton((x) => x.arrastrable);
    if (!o) return;
    const r = o.obtener(Sprite)?.fijo ? this.ratonEnPantalla() : this.ratonEnMundo();
    this.arrastre = { objeto: o, dx: o.posicion.x - r.x, dy: o.posicion.y - r.y };
  }

  private seguirArrastre(): void {
    const a = this.arrastre;
    if (!a) return;
    if (!a.objeto.arrastrable || a.objeto.destruido) {
      this.arrastre = null;
      return;
    }
    const r = a.objeto.obtener(Sprite)?.fijo ? this.ratonEnPantalla() : this.ratonEnMundo();
    a.objeto.posicion.x = r.x + a.dx;
    a.objeto.posicion.y = r.y + a.dy;
    // Mientras lo llevas en la mano, no cae
    const f = a.objeto.obtener(Fisica);
    if (f) f.velocidad.x = f.velocidad.y = 0;
  }

  /** ¿Se está arrastrando este objeto ahora mismo? */
  arrastrando(o: ObjetoJuego): boolean {
    return this.arrastre?.objeto === o;
  }

  // ───────────────────────── Fundidos ─────────────────────────

  /** Oscurece (hasta = 1) o aclara (hasta = 0) la pantalla en esos segundos, con esa transición. */
  fundir(hasta: number, segundos: number, color?: string, tipo?: Transicion): void {
    const f = this.fundido;
    if (color) f.color = color;
    if (tipo) f.tipo = tipo;
    f.objetivo = hasta;
    if (segundos <= 0) f.alfa = hasta;
    f.velocidad = segundos <= 0 ? 0 : Math.abs(hasta - f.alfa) / segundos;
  }

  /** Toda la pantalla de un color de golpe, que se apaga en esos segundos. */
  destellar(color: string, segundos: number): void {
    this.flash.color = color;
    this.flash.alfa = 1;
    this.flash.velocidad = segundos > 0 ? 1 / segundos : Infinity;
  }

  private actualizarFundido(dt: number): void {
    if (this.flash.alfa > 0) this.flash.alfa = Math.max(0, this.flash.alfa - this.flash.velocidad * dt);
    const f = this.fundido;
    if (f.alfa === f.objetivo) return;
    const paso = f.velocidad * dt;
    f.alfa = f.alfa < f.objetivo ? Math.min(f.objetivo, f.alfa + paso) : Math.max(f.objetivo, f.alfa - paso);
  }

  /**
   * Un clic se entrega al objeto de MÁS ARRIBA que esté bajo el ratón y que
   * escuche clics (la interfaz fija va por encima del mundo). Así, al pulsar
   * un botón, no se "pulsa" también lo que hay detrás.
   */
  private repartirClic(): void {
    if (!this.motor.entrada.ratonSePulso('izquierdo')) return;
    const candidatos = this.objetos.filter((o) => !o.destruido && o.todosLosComponentes.some((c) => c.activo && c.recibeClics?.()) && this.ratonEncima(o));
    if (!candidatos.length) return;
    const orden = (o: ObjetoJuego) => {
      const s = o.obtener(Sprite);
      return (s?.fijo ? 1_000_000 : 0) + (s?.capa ?? 0);
    };
    const elegido = candidatos.reduce((a, b) => (orden(b) >= orden(a) ? b : a));
    for (const c of elegido.todosLosComponentes) if (c.activo && c.recibeClics?.()) c.alHacerClic?.();
  }

  dibujar(r: Renderizador): void {
    // Los filtros (y la transición pixelada) se aplican al mundo y a la interfaz; el fundido y el diálogo, encima, nítidos
    const f = this.fundido;
    const pixeladoTransicion = f.tipo === 'pixelado' && f.alfa > 0 ? 1 + f.alfa * 28 : 1;
    const filtros = pixeladoTransicion > 1 ? { ...this.filtros, pixelado: Math.max(this.filtros.pixelado, pixeladoTransicion) } : this.filtros;
    if (hayFiltros(filtros)) {
      const principal = r.ctx;
      dibujarConFiltros(principal, filtros, r.fondo, (otro) => {
        r.ctx = otro;
        try {
          this.dibujarEscena(r);
        } finally {
          r.ctx = principal;
        }
      });
    } else this.dibujarEscena(r);
    this.dibujarTransicion(r);
    if (this.flash.alfa > 0) {
      r.ctx.save();
      r.ctx.globalAlpha = this.flash.alfa;
      r.ctx.fillStyle = resolverColor(this.flash.color);
      r.ctx.fillRect(0, 0, r.ancho, r.alto);
      r.ctx.restore();
    }
    // El diálogo, lo último (se tiene que leer aunque la pantalla esté oscura)
    this.dialogos[0]?.dibujar(r);
  }

  /** Lo que tapa la pantalla al cambiar de escena (fundido, barrido, círculo o pixelado) o con pantalla.oscurecer. */
  private dibujarTransicion(r: Renderizador): void {
    const f = this.fundido;
    if (f.alfa <= 0) return;
    const ctx = r.ctx;
    ctx.save();
    ctx.fillStyle = resolverColor(f.color);
    if (f.tipo === 'barrido') {
      // Se tapa de izquierda a derecha, y se destapa siguiendo hacia la derecha
      const ancho = r.ancho * f.alfa;
      ctx.fillRect(f.objetivo >= f.alfa ? 0 : r.ancho - ancho, 0, ancho, r.alto);
    } else if (f.tipo === 'circulo') {
      // Un círculo que se cierra hacia el centro (y se vuelve a abrir)
      const radio = Math.hypot(r.ancho, r.alto) / 2 * (1 - f.alfa);
      ctx.beginPath();
      ctx.rect(0, 0, r.ancho, r.alto);
      ctx.arc(r.ancho / 2, r.alto / 2, Math.max(0, radio), 0, Math.PI * 2, true);
      ctx.fill('evenodd');
    } else {
      // Fundido (y el final del pixelado, que se va apagando)
      ctx.globalAlpha = f.tipo === 'pixelado' ? f.alfa * f.alfa : f.alfa;
      ctx.fillRect(0, 0, r.ancho, r.alto);
    }
    ctx.restore();
  }

  /** El mundo (con cada cámara en su trozo de pantalla) y la interfaz. */
  private dibujarEscena(r: Renderizador): void {
    const ctx = r.ctx;
    const vistas = this.vistas();
    if (vistas.length === 1) this.dibujarMundo(r, this.camara);
    else {
      for (const v of vistas) {
        // Un «renderizador» del tamaño del trozo: todo lo demás (ctx, funciones) es el de verdad
        const trozo = Object.create(r) as Renderizador;
        trozo.ancho = v.ancho;
        trozo.alto = v.alto;
        ctx.save();
        ctx.beginPath();
        ctx.rect(v.x, v.y, v.ancho, v.alto);
        ctx.clip();
        ctx.translate(v.x, v.y);
        this.dibujarMundo(trozo, v.camara);
        ctx.restore();
      }
      // Las rayas que separan los trozos
      ctx.fillStyle = '#000000';
      for (const v of vistas) {
        if (v.x > 0) ctx.fillRect(v.x - 2, v.y, 4, v.alto);
        if (v.y > 0) ctx.fillRect(v.x, v.y - 2, v.ancho, 4);
      }
    }

    // 2. La interfaz, pegada a la pantalla: (0,0) es la esquina inferior izquierda
    //    Primero lo dibujado con dibujar.enPantalla (barras, iconos...) y encima los objetos
    //    de la interfaz: así un texto o un panel de pausa siempre se ven por encima.
    const interfaz: Sprite[] = [];
    for (const o of this.objetos) {
      const s = o.destruido ? undefined : o.obtener(Sprite);
      if (s?.fijo && s.activo && s.visible) interfaz.push(s);
    }
    this.dibujarDepuracion(r, (x, y) => ({ x, y: r.alto - y }), true);
    interfaz.sort((a, b) => a.capa - b.capa);
    for (const s of interfaz) s.dibujarEn(r, s.objeto.posicion.x, r.alto - s.objeto.posicion.y);
  }

  /** El mundo visto por una cámara. `r` mide lo que mide su trozo de pantalla. */
  private dibujarMundo(r: Renderizador, cam: Camara): void {
    const ctx = r.ctx;
    const visible = cam.zonaVisible();
    const margen = 64 / cam.zoom;
    const centro = cam.centroDibujo();

    // Qué se dibuja, ordenado por capa (sort es "estable": a igual capa, se respeta el orden de creación)
    const mundo: { capa: number; dibujar: () => void }[] = [];
    // Dentro de la transformación de la cámara, un punto del mundo se dibuja en (x - centroX, centroY - y)
    const aLocal = (x: number, y: number) => ({ x: x - centro.x, y: centro.y - y });

    for (const o of this.objetos) {
      if (o.destruido) continue;
      const mapa = o.obtener(MapaCasillas);
      if (mapa?.activo) mundo.push({ capa: mapa.capa, dibujar: () => mapa.dibujarVisibles(r, visible, aLocal) });
      const s = o.obtener(Sprite);
      if (!s || !s.activo || !s.visible || s.fijo) continue;
      const p = o.posicion;
      const radio = Math.max(s.anchoFinal, s.altoFinal);
      if (p.x + radio < visible.izquierda - margen || p.x - radio > visible.derecha + margen) continue;
      if (p.y + radio < visible.abajo - margen || p.y - radio > visible.arriba + margen) continue;
      mundo.push({ capa: s.capa, dibujar: () => {
        const l = aLocal(p.x, p.y);
        s.dibujarEn(r, l.x, l.y);
      } });
    }
    mundo.sort((a, b) => a.capa - b.capa);

    // 1. El mundo, con la cámara: centro de la pantalla + zoom (la Y se da la vuelta en aLocal)
    ctx.save();
    ctx.translate(r.ancho / 2, r.alto / 2);
    ctx.scale(cam.zoom, cam.zoom);
    for (const m of mundo) m.dibujar();
    this.juntas.dibujar(r, aLocal);
    const conLuces = this.oscuridad > 0;
    this.efectos.dibujar(r, aLocal, conLuces ? 'normal' : 'todo');
    if (!conLuces) this.dibujarDepuracion(r, aLocal, false);
    ctx.restore();

    // 1b. La oscuridad y las luces, encima del mundo. Lo que da luz (fuego, chispas, rayos) va encima de la oscuridad
    if (conLuces) {
      dibujarLuces(r, this, this.oscuridad, this.luzAmbiente, cam);
      ctx.save();
      ctx.translate(r.ancho / 2, r.alto / 2);
      ctx.scale(cam.zoom, cam.zoom);
      this.efectos.dibujar(r, aLocal, 'luz');
      this.dibujarDepuracion(r, aLocal, false);
      ctx.restore();
    }
  }

  /** Líneas, círculos, arcos... de dibujar.xxx(): los de este fotograma (se borran al empezar el siguiente). */
  private dibujarDepuracion(r: Renderizador, aLocal: (x: number, y: number) => { x: number; y: number }, fijos: boolean): void {
    if (!this.dibujos.length) return;
    for (const d of this.dibujos) {
      if (!!d.fijo !== fijos) continue;
      if (d.tipo === 'arco') {
        const c = aLocal(d.x, d.y);
        const ctx = r.ctx;
        ctx.beginPath();
        // En el lienzo la Y va hacia abajo: los ángulos se dan la vuelta
        if (d.relleno) ctx.moveTo(c.x, c.y);
        ctx.arc(c.x, c.y, Math.max(0, d.radio), (-d.desde * Math.PI) / 180, (-d.hasta * Math.PI) / 180, d.hasta > d.desde);
        if (d.relleno) {
          ctx.closePath();
          ctx.fillStyle = resolverColor(d.color);
          ctx.fill();
        } else {
          ctx.strokeStyle = resolverColor(d.color);
          ctx.lineWidth = d.grosor;
          ctx.stroke();
        }
      } else if (d.tipo === 'elipse' || d.tipo === 'poligono') {
        const ctx = r.ctx;
        ctx.beginPath();
        if (d.tipo === 'elipse') {
          const c = aLocal(d.x, d.y);
          ctx.ellipse(c.x, c.y, Math.abs(d.ancho) / 2, Math.abs(d.alto) / 2, 0, 0, Math.PI * 2);
        } else {
          d.puntos.forEach((p, i) => {
            const l = aLocal(p.x, p.y);
            if (i === 0) ctx.moveTo(l.x, l.y);
            else ctx.lineTo(l.x, l.y);
          });
          ctx.closePath();
        }
        if (d.relleno) {
          ctx.fillStyle = resolverColor(d.color);
          ctx.fill();
        } else {
          ctx.strokeStyle = resolverColor(d.color);
          ctx.lineWidth = d.tipo === 'poligono' ? d.grosor : 2;
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      } else if (d.tipo === 'linea') {
        const a = aLocal(d.x1, d.y1);
        const b = aLocal(d.x2, d.y2);
        r.linea(a.x, a.y, b.x, b.y, d.color, d.grosor);
      } else if (d.tipo === 'circulo') {
        const c = aLocal(d.x, d.y);
        r.circulo(c.x, c.y, d.radio, d.color, { relleno: d.relleno });
      } else if (d.tipo === 'rectangulo') {
        // (x, y) es el centro, como en los objetos
        const c = aLocal(d.x, d.y);
        r.rectangulo(c.x - d.ancho / 2, c.y - d.alto / 2, d.ancho, d.alto, d.color, { relleno: d.relleno });
      } else {
        const c = aLocal(d.x, d.y);
        r.texto(d.texto, c.x, c.y, { color: d.color, tamano: d.tamano, letra: d.letra });
      }
    }
  }

  /** La zona que ocupan todos los mapas de casillas (para que la cámara no salga de ellos). */
  limitesDeLosMapas(): Limites | null {
    let r: Limites | null = null;
    for (const o of this.objetos) {
      const l = o.destruido ? null : o.obtener(MapaCasillas)?.limites();
      if (!l) continue;
      r = r
        ? { izquierda: Math.min(r.izquierda, l.izquierda), abajo: Math.min(r.abajo, l.abajo), derecha: Math.max(r.derecha, l.derecha), arriba: Math.max(r.arriba, l.arriba) }
        : { ...l };
    }
    return r;
  }

  /** Destruye todo (al parar, reiniciar o cambiar de escena). */
  vaciar(): void {
    for (const o of this.objetos) if (!o.destruido) this.destruir(o);
    this.quitarDestruidos();
    this.fisica.reiniciar();
    this.efectos.vaciar();
    this.animaciones.vaciar();
    this.dibujos = [];
    this.arrastre = null;
    this.dialogos = [];
    this.juntas.vaciar();
    this.camaras = [this.camara];
    this.camara.anchoPantalla = this.motor.renderizador.ancho;
    this.camara.altoPantalla = this.motor.renderizador.alto;
    this.camara.objetivo = null;
    this.camara.limites = null;
    this.camara.zoom = 1;
    this.camara.posicion = new Vector2(this.motor.renderizador.ancho / 2, this.motor.renderizador.alto / 2);
    this.gravedad = GRAVEDAD_MUNDO;
    this.iniciada = false;
  }

  private quitarDestruidos(): void {
    if (this.porDestruir.length === 0) return;
    const fuera = new Set(this.porDestruir);
    this.objetos = this.objetos.filter((o) => !fuera.has(o));
    for (const o of fuera) {
      o.escena = null;
      this.efectos.olvidar(o);
    }
    this.porDestruir = [];
  }
}
