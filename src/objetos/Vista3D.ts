/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * VISTA 3D: ver una escena «desde arriba» en PRIMERA PERSONA.
 *
 * La idea: el juego sigue siendo el de siempre. Un mapa de casillas pintado
 * en el editor, objetos con su dibujo, física sin gravedad, `yo.irHacia`,
 * `rayo(...)`, sonidos con sitio... Lo único que cambia es CÓMO SE MIRA:
 * con `vista3d.ver(yo)` el mundo se pinta desde los ojos de ese objeto.
 *
 *   - Las casillas SÓLIDAS del mapa son paredes, con la imagen de su tipo.
 *   - Las que NO son sólidas son baldosas del suelo (con su imagen).
 *   - Las casillas que son PUERTA se pintan finas y se apartan al abrirse.
 *   - Cada objeto con dibujo es un «sprite» que siempre mira al que ve,
 *     más pequeño cuanto más lejos, tapado por las paredes y por los
 *     sprites de delante. Su animación es la de siempre.
 *
 * Las cuentas las hace motor/Raycaster.ts (que no sabe nada del navegador).
 * Aquí se prepara lo que necesita: el mapa convertido en rejilla, las
 * imágenes convertidas en texturas y la lista de sprites.
 */
import { Raycaster, empaquetar, type Ambiente, type Rejilla, type Sprite3D, type Textura } from '../motor/Raycaster';
import { calidad } from '../motor/Calidad';
import { colorAComponentes } from '../motor/Color';
import type { Renderizador } from '../motor/Renderizador';
import { Vector2 } from '../motor/Vector2';
import { propio } from '../utilidades/seguro';
import { MapaCasillas } from './componentes/MapaCasillas';
import { Sprite } from './componentes/Sprite';
import type { Escena } from './Escena';
import type { ObjetoJuego } from './ObjetoJuego';

/** Lo más grande que puede ser una textura de pared o de suelo, y la de un sprite (se encogen al prepararlas). */
export const LADO_TEXTURA = 128;
export const LADO_SPRITE = 256;
/** Lo más grande que puede ser el mapa en primera persona, en casillas por lado. */
export const LADO_MAXIMO_MAPA = 512;
/** Cuántas texturas de pared y suelo distintas caben (una por tipo de casilla). */
export const MAXIMO_TEXTURAS = 255;
/** Como mucho, estos sprites a la vez (los más cercanos). */
export const MAXIMO_SPRITES = 400;
export const CAMPO_MINIMO = 30;
export const CAMPO_MAXIMO = 120;

const aColor = (color: string, porDefecto: number): number => {
  const c = colorAComponentes(color);
  return c ? empaquetar(c[0], c[1], c[2]) : porDefecto;
};

/** Una textura de un solo color. */
export const texturaLisa = (color: number): Textura => ({ ancho: 1, alto: 1, pix: new Uint32Array([color | 0xff000000]) });

export class Vista3D {
  /** Desde qué objeto se mira (null = la vista normal, desde arriba). */
  observador: ObjetoJuego | null = null;
  /** El mapa cuyas casillas son las paredes (null = el primero de la escena que tenga casillas sólidas). */
  mapaElegido: ObjetoJuego | null = null;
  /** Cuánto se ve a lo ancho, en grados. */
  campo = 66;
  /** A qué altura están los ojos: de 0 (el suelo) a 1 (el techo). */
  altura = 0.5;
  /** Mirar arriba (positivo) o abajo: de -1 a 1. */
  inclinacion = 0;
  /** 1 = normal; más = más claro (un destello). */
  brillo = 1;
  /** Columnas de la pantalla 3D: 0 = las que diga la calidad (pantalla.calidad). */
  columnas = 0;
  suelo: { imagen: string | null; color: string } = { imagen: null, color: '#3a3a3a' };
  techo: { imagen: string | null; color: string } = { imagen: null, color: '#1c1c1c' };
  cielo: string | null = null;
  /** La niebla: su color y entre qué distancias (en píxeles del mundo) va de nada a todo. */
  niebla: { color: string; desde: number; hasta: number } | null = null;
  /** La imagen de cada tipo de casilla, si no es la del mapa: tipo (normalizado) → imagen. */
  readonly imagenDeTipo = new Map<string, string>();

  readonly raycaster = new Raycaster();
  /** Cuánto ha tardado en pintarse el último fotograma, en milisegundos (para medir). */
  milisegundos = 0;
  /** Cuántos sprites se han pintado en el último fotograma. */
  spritesPintados = 0;

  /** Cómo se convierte una imagen del juego en textura. En las pruebas (sin lienzo) se cambia por otra. */
  leerImagen: (nombre: string, lado: number, escena: Escena) => Textura | null = leerImagenDelNavegador;
  /** Cómo se convierte en textura un sprite que no es una imagen (una forma con su color). */
  leerForma: (sprite: Sprite, escena: Escena) => Textura | null = leerFormaDelNavegador;

  private texturas = new Map<string, Textura | null>();
  private rejilla: Rejilla | null = null;
  private lista: Textura[] = [];
  /** De qué mapa y de qué versión es la rejilla preparada. */
  private preparado: { mapa: MapaCasillas; version: number; firma: string; c0: number; f0: number; puertas: number[] } | null = null;
  private lienzo: HTMLCanvasElement | null = null;
  private imagen: ImageData | null = null;
  private sprites: Sprite3D[] = [];
  /** Dónde se pintó la última vez (para enPantalla). */
  private zona = { ancho: 1, alto: 1 };

  get activa(): boolean {
    return this.observador !== null && !this.observador.destruido;
  }

  /** Olvida las texturas preparadas (al cambiar una imagen del proyecto). */
  olvidar(): void {
    this.texturas.clear();
    this.preparado = null;
  }

  /** El mapa de las paredes. */
  mapa(escena: Escena): MapaCasillas | null {
    if (this.mapaElegido && !this.mapaElegido.destruido) return this.mapaElegido.obtener(MapaCasillas) ?? null;
    let primero: MapaCasillas | null = null;
    for (const o of escena.objetos) {
      const m = o.destruido ? undefined : o.obtener(MapaCasillas);
      if (!m?.activo) continue;
      primero ??= m;
      for (const tipo of m.celdas.values()) if (m.esSolida(tipo)) return m;
    }
    return primero;
  }

  // ───────────────────────── Texturas ─────────────────────────

  private textura(nombre: string, lado: number, escena: Escena): Textura | null {
    const clave = `${lado}:${nombre}`;
    let t = this.texturas.get(clave);
    if (t === undefined) {
      t = escena.motor.recursos.tiene(nombre) ? this.leerImagen(nombre, lado, escena) : null;
      this.texturas.set(clave, t);
    }
    return t;
  }

  private texturaDeSprite(s: Sprite, escena: Escena): Textura | null {
    if (s.imagen) return this.textura(s.imagen, LADO_SPRITE, escena);
    if (s.forma === 'texto') return null;
    const clave = `forma:${s.forma}:${s.color}:${Math.round(s.ancho)}x${Math.round(s.alto)}:${s.lados ?? ''}:${s.borde}:${s.colorBorde}`;
    let t = this.texturas.get(clave);
    if (t === undefined) {
      t = this.leerForma(s, escena);
      // (sin lienzo, como en las pruebas: un cuadrado de su color)
      t ??= texturaLisa(aColor(s.color, 0xffffffff));
      this.texturas.set(clave, t);
    }
    return t;
  }

  // ───────────────────────── El mapa, preparado ─────────────────────────

  private preparar(m: MapaCasillas, escena: Escena): Rejilla {
    const firma = Object.entries(m.tipos).map(([n, t]) => `${n}:${t.imagen ?? ''}:${t.color ?? ''}:${t.solida ? 1 : 0}:${t.puerta ? 1 : 0}`).join('|') + '#' + [...this.imagenDeTipo].join(',');
    const p = this.preparado;
    if (p && p.mapa === m && p.firma === firma && this.rejilla) {
      if (p.version !== m.version) {
        // Solo se han movido puertas o han cambiado pocas casillas: si el tamaño sirve, se rellena otra vez (es rápido)
        if (!this.rellenar(m, escena, p.c0, p.f0, this.rejilla)) return this.hacer(m, escena, firma);
        p.version = m.version;
      }
      this.ponerAperturas(m);
      return this.rejilla;
    }
    return this.hacer(m, escena, firma);
  }

  private hacer(m: MapaCasillas, escena: Escena, firma: string): Rejilla {
    let c0 = Infinity, c1 = -Infinity, f0 = Infinity, f1 = -Infinity;
    for (const clave of m.celdas.keys()) {
      const coma = clave.indexOf(',');
      const c = Number(clave.slice(0, coma));
      const f = Number(clave.slice(coma + 1));
      if (c < c0) c0 = c;
      if (c > c1) c1 = c;
      if (f < f0) f0 = f;
      if (f > f1) f1 = f;
    }
    if (!Number.isFinite(c0)) c0 = c1 = f0 = f1 = 0;
    // (un mapa enorme: se queda con el trozo de alrededor del principio, que es lo que cabe)
    const columnas = Math.min(LADO_MAXIMO_MAPA, c1 - c0 + 1);
    const filas = Math.min(LADO_MAXIMO_MAPA, f1 - f0 + 1);
    const n = columnas * filas;
    const rejilla: Rejilla = { columnas, filas, paredes: new Uint8Array(n), suelos: new Uint8Array(n), puertas: new Uint8Array(n), aperturas: new Float32Array(n) };
    this.rejilla = rejilla;
    this.preparado = { mapa: m, version: m.version, firma, c0, f0, puertas: [] };
    this.rellenar(m, escena, c0, f0, rejilla);
    this.ponerAperturas(m);
    return rejilla;
  }

  /** Rellena la rejilla con las casillas del mapa. Devuelve falso si alguna queda fuera (hay que hacerla más grande). */
  private rellenar(m: MapaCasillas, escena: Escena, c0: number, f0: number, rejilla: Rejilla): boolean {
    const { columnas, filas, paredes, suelos, puertas } = rejilla;
    paredes.fill(0);
    suelos.fill(0);
    puertas.fill(0);
    // Una textura por tipo de casilla
    const indice = new Map<string, number>();
    const lista: Textura[] = [];
    const texturaDeTipo = (tipo: string): number => {
      let i = indice.get(tipo);
      if (i !== undefined) return i;
      const def = propio(m.tipos, tipo);
      const imagen = this.imagenDeTipo.get(tipo.toLowerCase()) ?? def?.imagen;
      const t = (imagen ? this.textura(imagen, LADO_TEXTURA, escena) : null) ?? texturaLisa(aColor(def?.color ?? 'gris', 0xff808080));
      i = lista.length < MAXIMO_TEXTURAS ? lista.push(t) : lista.length;
      indice.set(tipo, i);
      return i;
    };
    let caben = true;
    const lasPuertas: number[] = [];
    for (const [clave, tipo] of m.celdas) {
      const coma = clave.indexOf(',');
      const c = Number(clave.slice(0, coma)) - c0;
      const f = Number(clave.slice(coma + 1)) - f0;
      if (c < 0 || f < 0 || c >= columnas || f >= filas) {
        if (c < LADO_MAXIMO_MAPA && f < LADO_MAXIMO_MAPA) caben = false;
        continue;
      }
      const def = propio(m.tipos, tipo);
      const i = f * columnas + c;
      if ((def?.solida ?? true) && !def?.soloDesdeArriba) {
        paredes[i] = texturaDeTipo(tipo);
        if (def?.puerta) {
          puertas[i] = 1;
          lasPuertas.push(i);
        }
      } else suelos[i] = texturaDeTipo(tipo);
    }
    // Hacia dónde va cada puerta: entre las dos paredes que tiene a los lados
    for (const i of lasPuertas) {
      const c = i % columnas;
      const izquierda = c > 0 && paredes[i - 1] !== 0 && puertas[i - 1] === 0;
      const derecha = c < columnas - 1 && paredes[i + 1] !== 0 && puertas[i + 1] === 0;
      puertas[i] = izquierda || derecha ? 1 : 2;
    }
    this.lista = lista;
    if (this.preparado) this.preparado.puertas = lasPuertas;
    return caben;
  }

  private ponerAperturas(m: MapaCasillas): void {
    const p = this.preparado;
    const rejilla = this.rejilla;
    if (!p || !rejilla) return;
    for (const i of p.puertas) rejilla.aperturas[i] = m.apertura((i % rejilla.columnas) + p.c0, Math.floor(i / rejilla.columnas) + p.f0);
  }

  // ───────────────────────── Pintar ─────────────────────────

  /** Calcula el fotograma (sin tocar la pantalla). Devuelve falso si no hay nada que ver (sin observador o sin mapa). */
  calcular(escena: Escena, ancho: number, alto: number): boolean {
    const yo = this.observador;
    if (!yo || yo.destruido) return false;
    const m = this.mapa(escena);
    if (!m) return false;
    const t = m.tamano;
    const rejilla = this.preparar(m, escena);
    const p = this.preparado!;
    const origenX = m.objeto.posicion.x + p.c0 * t;
    const origenY = m.objeto.posicion.y + p.f0 * t;

    // El tamaño de la pantalla 3D: las columnas que diga la calidad, con la misma forma que el juego
    const columnas = Math.min(this.columnas > 0 ? this.columnas : calidad.ajustes.columnas3d, Math.max(64, Math.round(ancho)));
    this.raycaster.redimensionar(columnas, Math.round((columnas * alto) / ancho));
    this.zona = { ancho, alto };

    const ojo = {
      x: (yo.posicion.x - origenX) / t,
      y: (yo.posicion.y - origenY) / t,
      angulo: (yo.transformacion.rotacion * Math.PI) / 180,
      campo: (Math.min(CAMPO_MAXIMO, Math.max(CAMPO_MINIMO, this.campo)) * Math.PI) / 180,
      altura: Math.min(0.95, Math.max(0.05, this.altura)),
      inclinacion: Math.min(1, Math.max(-1, this.inclinacion)),
    };
    const niebla = this.niebla;
    const ambiente: Ambiente = {
      suelo: this.suelo.imagen ? this.textura(this.suelo.imagen, LADO_TEXTURA, escena) : null,
      colorSuelo: aColor(this.suelo.color, 0xff3a3a3a),
      techo: this.techo.imagen ? this.textura(this.techo.imagen, LADO_TEXTURA, escena) : null,
      colorTecho: aColor(this.techo.color, 0xff1c1c1c),
      cielo: this.cielo ? this.textura(this.cielo, 1024, escena) : null,
      niebla: niebla && niebla.hasta > 0 ? { color: aColor(niebla.color, 0xff000000), desde: niebla.desde / t, hasta: Math.max(niebla.desde + 1, niebla.hasta) / t } : null,
      brillo: this.brillo,
    };

    // Los sprites: todo lo que tiene dibujo, menos quien mira (y lo que lleva encima), la interfaz y los mapas
    const sprites = this.sprites;
    sprites.length = 0;
    const lejos = ambiente.niebla ? ambiente.niebla.hasta : Infinity;
    for (const o of escena.objetos) {
      if (o.destruido || o === yo) continue;
      const s = o.obtener(Sprite);
      if (!s || !s.activo || !s.visible || s.fijo || s.opacidad <= 0.01 || o.obtener(MapaCasillas)) continue;
      if (esDe(o, yo)) continue;
      const x = (o.posicion.x - origenX) / t;
      const y = (o.posicion.y - origenY) / t;
      // (lo que queda más allá de la niebla no se ve: no hace falta ni prepararlo)
      if (Math.abs(x - ojo.x) > lejos + 2 || Math.abs(y - ojo.y) > lejos + 2) continue;
      const textura = this.texturaDeSprite(s, escena);
      if (!textura) continue;
      const flash = s.flashActual;
      sprites.push({ x, y, ancho: s.anchoFinal / t, alto: s.altoFinal / t, elevacion: o.elevacion / t, textura, opacidad: s.opacidad, voltear: s.voltearX, tinte: flash ? aColor(flash, 0xffffffff) : 0, cuantoTinte: flash ? 0.85 : 0, dato: o });
    }
    if (sprites.length > MAXIMO_SPRITES) {
      sprites.sort((a, b) => Math.hypot(a.x - ojo.x, a.y - ojo.y) - Math.hypot(b.x - ojo.x, b.y - ojo.y));
      sprites.length = MAXIMO_SPRITES;
    }
    this.spritesPintados = sprites.length;
    this.raycaster.pintar(rejilla, this.lista, ojo, ambiente, sprites);
    return true;
  }

  /** Pinta la vista en la pantalla del juego. Devuelve falso si no había nada que pintar. */
  dibujar(r: Renderizador, escena: Escena): boolean {
    const antes = typeof performance !== 'undefined' ? performance.now() : 0;
    if (!this.calcular(escena, r.ancho, r.alto)) return false;
    const rc = this.raycaster;
    if (typeof document !== 'undefined') {
      this.lienzo ??= document.createElement('canvas');
      const lienzo = this.lienzo;
      const ctx = lienzo.getContext?.('2d');
      if (ctx) {
        if (lienzo.width !== rc.ancho || lienzo.height !== rc.alto || !this.imagen) {
          lienzo.width = rc.ancho;
          lienzo.height = rc.alto;
          this.imagen = ctx.createImageData(rc.ancho, rc.alto);
        }
        // (los colores ya están en el orden de la pantalla: se copian tal cual)
        new Uint32Array(this.imagen.data.buffer).set(rc.pantalla);
        ctx.putImageData(this.imagen, 0, 0);
        r.ctx.drawImage(lienzo, 0, 0, r.ancho, r.alto);
      }
    }
    if (typeof performance !== 'undefined') this.milisegundos = performance.now() - antes;
    return true;
  }

  /**
   * Dónde se ve en la pantalla del juego un punto del mundo (en píxeles del mundo; `z` = a qué altura, en píxeles).
   * Devuelve x, y (de la pantalla del juego, con la Y hacia ARRIBA como en la interfaz), la distancia en píxeles
   * y si lo tapa una pared. null si queda detrás o si la vista no está puesta.
   */
  enPantalla(x: number, y: number, z: number): { x: number; y: number; distancia: number; tapado: boolean } | null {
    const p = this.preparado;
    if (!p || !this.activa || !this.raycaster.ancho) return null;
    const t = p.mapa.tamano;
    const origenX = p.mapa.objeto.posicion.x + p.c0 * t;
    const origenY = p.mapa.objeto.posicion.y + p.f0 * t;
    const q = this.raycaster.proyectar((x - origenX) / t, (y - origenY) / t, z / t);
    if (!q) return null;
    const k = this.zona.ancho / this.raycaster.ancho;
    return { x: q.x * k, y: this.zona.alto - q.y * k, distancia: q.distancia * t, tapado: q.tapado };
  }
}

function esDe(o: ObjetoJuego, antepasado: ObjetoJuego): boolean {
  for (let p = o.padre; p; p = p.padre) if (p === antepasado) return true;
  return false;
}

// ───────────────────────── Leer imágenes (solo en el navegador) ─────────────────────────

let lienzoDeLeer: HTMLCanvasElement | null = null;

function leerLienzo(ancho: number, alto: number, pintar: (ctx: CanvasRenderingContext2D) => void): Textura | null {
  if (typeof document === 'undefined') return null;
  lienzoDeLeer ??= document.createElement('canvas');
  const lienzo = lienzoDeLeer;
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext?.('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.clearRect(0, 0, ancho, alto);
    pintar(ctx);
    const datos = ctx.getImageData(0, 0, ancho, alto);
    return { ancho, alto, pix: new Uint32Array(datos.data.buffer.slice(0)) };
  } catch {
    return null;
  }
}

function leerImagenDelNavegador(nombre: string, lado: number, escena: Escena): Textura | null {
  const img = escena.motor.recursos.imagenSiExiste(nombre);
  if (!img) return null;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;
  const k = Math.min(1, lado / Math.max(w, h));
  const ancho = Math.max(1, Math.round(w * k));
  const alto = Math.max(1, Math.round(h * k));
  return leerLienzo(ancho, alto, (ctx) => {
    ctx.imageSmoothingEnabled = k < 1;
    ctx.drawImage(img, 0, 0, ancho, alto);
  });
}

function leerFormaDelNavegador(s: Sprite, escena: Escena): Textura | null {
  const r = escena.motor.renderizador;
  const ancho = Math.min(LADO_SPRITE, Math.max(2, Math.round(s.ancho)));
  const alto = Math.min(LADO_SPRITE, Math.max(2, Math.round(s.alto)));
  const t = s.objeto.transformacion;
  const giro = t.rotacion;
  const escala = t.escala;
  return leerLienzo(ancho, alto, (ctx) => {
    // Se pinta como en la vista normal, pero derecho, a su tamaño y en un lienzo aparte
    const otro = Object.create(r) as Renderizador;
    otro.ctx = ctx;
    const opacidad = s.opacidad;
    try {
      t.rotacion = 0;
      t.escala = new Vector2(1, 1);
      s.opacidad = 1;
      ctx.save();
      ctx.scale(ancho / s.ancho, alto / s.alto);
      s.dibujarEn(otro, s.ancho / 2, s.alto / 2);
      ctx.restore();
    } finally {
      t.rotacion = giro;
      t.escala = escala;
      s.opacidad = opacidad;
    }
  });
}
