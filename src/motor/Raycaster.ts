/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * RAYCASTER: el «3D simulado» de los primeros juegos en primera persona.
 *
 * El mundo sigue siendo PLANO (una rejilla de casillas vista desde arriba),
 * pero se pinta como si estuvieras dentro: por cada columna de la pantalla se
 * lanza un rayo desde el ojo; cuanto antes choca con una pared, más alta se
 * pinta esa columna. No hay triángulos ni tarjeta gráfica: solo cuentas.
 *
 *   1. PAREDES: un rayo por columna, que avanza de casilla en casilla (DDA)
 *      hasta dar con una pared o con una puerta.
 *   2. SUELO Y TECHO: por filas. Todos los puntos de una fila de la pantalla
 *      están a la misma distancia, así que se recorren con una suma por píxel.
 *   3. SPRITES: dibujos que siempre miran al ojo, del más lejano al más
 *      cercano, y solo en las columnas donde no los tapa una pared.
 *
 * Este archivo NO sabe nada del navegador ni del resto del motor: recibe
 * números y texturas ya en memoria y escribe colores en una lista. Así se
 * puede probar entero sin pantalla. Quien lo une con la escena es
 * objetos/Vista3D.ts.
 *
 * Unidades: todo en CASILLAS (una casilla mide 1 de lado y las paredes 1 de
 * alto). La Y crece hacia arriba, como en el resto de Chispa. Los ángulos, en
 * radianes: 0 = derecha, π/2 = arriba.
 */

/** Una imagen en memoria: un número por píxel (0xAABBGGRR), de arriba abajo. */
export interface Textura {
  ancho: number;
  alto: number;
  pix: Uint32Array;
}

/** El mapa ya «preparado» para lanzar rayos deprisa. */
export interface Rejilla {
  columnas: number;
  filas: number;
  /** Por casilla: 0 = se pasa; n = pared con la textura n - 1. */
  paredes: Uint8Array;
  /** Por casilla: 0 = el suelo de siempre; n = suelo con la textura n - 1. */
  suelos: Uint8Array;
  /** Por casilla: 0 = no es puerta; 1 = puerta que va de izquierda a derecha; 2 = de abajo arriba. */
  puertas: Uint8Array;
  /** Por casilla: cuánto está abierta su puerta, de 0 a 1. */
  aperturas: Float32Array;
}

export interface Ojo {
  x: number;
  y: number;
  angulo: number;
  /** Cuánto se ve a lo ancho, en radianes. */
  campo: number;
  /** A qué altura están los ojos: de 0 (el suelo) a 1 (el techo). */
  altura: number;
  /** Mirar arriba (positivo) o abajo (negativo): de -1 a 1. */
  inclinacion: number;
}

export interface Ambiente {
  suelo: Textura | null;
  colorSuelo: number;
  techo: Textura | null;
  colorTecho: number;
  /** Si hay cielo, se pinta en vez del techo (y no le afecta la niebla). */
  cielo: Textura | null;
  /** La niebla: su color, y entre qué distancias (en casillas) va de nada a todo. null = sin niebla. */
  niebla: { color: number; desde: number; hasta: number } | null;
  /** 1 = normal. Más = todo más claro (un destello); menos = más oscuro. */
  brillo: number;
}

export interface Sprite3D {
  x: number;
  y: number;
  /** Lo que mide, en casillas. */
  ancho: number;
  alto: number;
  /** A qué altura está su parte de abajo (0 = en el suelo). */
  elevacion: number;
  textura: Textura;
  opacidad: number;
  voltear: boolean;
  /** Un color que lo tiñe (para un «flash» al recibir un golpe) y cuánto, de 0 a 1. */
  tinte: number;
  cuantoTinte: number;
  /** Cualquier cosa de quien lo usa (el objeto del juego). */
  dato?: unknown;
  /** Lo rellena el raycaster: a qué distancia ha quedado (para ordenar). */
  profundidad?: number;
}

/** Lo que oscurece las paredes que miran arriba o abajo, para que se note el volumen. */
const SOMBRA_DE_LADO = 0.78;
/** Lo más cerca que puede estar algo del ojo (más cerca se divide por casi cero). */
const CERCA = 0.05;
/** Cuántas casillas avanza un rayo como mucho. */
export const MAXIMO_PASOS = 256;

export const empaquetar = (r: number, g: number, b: number, a = 255): number => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;

export class Raycaster {
  ancho = 0;
  alto = 0;
  /** Los colores de la pantalla (0xAABBGGRR), fila a fila. */
  pantalla = new Uint32Array(0);
  /** Por columna: a qué distancia está la pared (para tapar los sprites). */
  profundidad = new Float32Array(0);
  /** Por columna: dónde empieza y dónde acaba la pared (entre medias no hay ni suelo ni techo). */
  private arriba = new Int32Array(0);
  private abajo = new Int32Array(0);

  // Lo del último fotograma pintado (para proyectar puntos después: vista3d.enPantalla)
  private ojo: Ojo = { x: 0, y: 0, angulo: 0, campo: 1, altura: 0.5, inclinacion: 0 };
  private focal = 1;
  private horizonte = 0;
  private tangente = 1;

  redimensionar(ancho: number, alto: number): void {
    ancho = Math.max(16, Math.floor(ancho));
    alto = Math.max(16, Math.floor(alto));
    if (ancho === this.ancho && alto === this.alto) return;
    this.ancho = ancho;
    this.alto = alto;
    this.pantalla = new Uint32Array(ancho * alto);
    this.profundidad = new Float32Array(ancho);
    this.arriba = new Int32Array(ancho);
    this.abajo = new Int32Array(ancho);
  }

  /** Pinta un fotograma entero. `sprites` se ordena (del más lejano al más cercano). */
  pintar(rejilla: Rejilla, texturas: Textura[], ojo: Ojo, ambiente: Ambiente, sprites: Sprite3D[]): void {
    const W = this.ancho;
    const H = this.alto;
    if (!W || !H) return;
    this.ojo = ojo;
    const tangente = Math.tan(Math.min(Math.max(ojo.campo, 0.2), 2.6) / 2);
    this.tangente = tangente;
    const focal = W / 2 / tangente;
    this.focal = focal;
    const horizonte = Math.round(H / 2 + ojo.inclinacion * H * 0.5);
    this.horizonte = horizonte;

    this.pintarParedes(rejilla, texturas, ojo, ambiente);
    this.pintarSueloYTecho(rejilla, texturas, ojo, ambiente);
    this.pintarSprites(ojo, ambiente, sprites);
  }

  // ───────────────────────── La niebla y la luz ─────────────────────────

  /** Cuánto se ve de algo a esa distancia: 256 = entero, 0 = solo niebla. */
  private nitidez(ambiente: Ambiente, distancia: number): number {
    const n = ambiente.niebla;
    if (!n || distancia <= n.desde) return 256;
    if (distancia >= n.hasta) return 0;
    return Math.round(256 * (1 - (distancia - n.desde) / (n.hasta - n.desde)));
  }

  // ───────────────────────── 1. Paredes ─────────────────────────

  private pintarParedes(rejilla: Rejilla, texturas: Textura[], ojo: Ojo, ambiente: Ambiente): void {
    const W = this.ancho;
    const H = this.alto;
    const pantalla = this.pantalla;
    const { columnas, filas, paredes, puertas, aperturas } = rejilla;
    const dirX = Math.cos(ojo.angulo);
    const dirY = Math.sin(ojo.angulo);
    // El «plano» de la pantalla: hacia la derecha de donde se mira
    const planoX = dirY * this.tangente;
    const planoY = -dirX * this.tangente;
    const focal = this.focal;
    const horizonte = this.horizonte;
    const altura = Math.min(Math.max(ojo.altura, 0.02), 0.98);
    const niebla = ambiente.niebla;
    const nr = niebla ? niebla.color & 255 : 0;
    const ng = niebla ? (niebla.color >>> 8) & 255 : 0;
    const nb = niebla ? (niebla.color >>> 16) & 255 : 0;
    const brillo = Math.max(0, ambiente.brillo);

    for (let x = 0; x < W; x++) {
      const camara = (2 * (x + 0.5)) / W - 1;
      const rx = dirX + planoX * camara;
      const ry = dirY + planoY * camara;
      let cx = Math.floor(ojo.x);
      let cy = Math.floor(ojo.y);
      const deltaX = rx === 0 ? 1e30 : Math.abs(1 / rx);
      const deltaY = ry === 0 ? 1e30 : Math.abs(1 / ry);
      const pasoX = rx < 0 ? -1 : 1;
      const pasoY = ry < 0 ? -1 : 1;
      let ladoX = rx < 0 ? (ojo.x - cx) * deltaX : (cx + 1 - ojo.x) * deltaX;
      let ladoY = ry < 0 ? (ojo.y - cy) * deltaY : (cy + 1 - ojo.y) * deltaY;
      let distancia = 0;
      let textura = -1;
      let u = 0;
      let deLado = false;
      // Hasta dónde se ha llegado al entrar en la casilla actual
      let entrada = 0;

      for (let pasos = 0; pasos < MAXIMO_PASOS; pasos++) {
        if (cx >= 0 && cy >= 0 && cx < columnas && cy < filas) {
          const i = cy * columnas + cx;
          const puerta = puertas[i];
          if (puerta) {
            // Una puerta es una pared FINA en mitad de la casilla, que se aparta hacia un lado al abrirse
            const abre = aperturas[i];
            if (abre < 0.999) {
              let t: number;
              let donde: number;
              if (puerta === 1) {
                t = ry === 0 ? -1 : (cy + 0.5 - ojo.y) / ry;
                donde = ojo.x + t * rx - cx;
              } else {
                t = rx === 0 ? -1 : (cx + 0.5 - ojo.x) / rx;
                donde = ojo.y + t * ry - cy;
              }
              if (t > 0 && donde >= abre && donde <= 1 && t >= entrada - 1e-6) {
                distancia = t;
                textura = paredes[i] - 1;
                u = donde - abre;
                deLado = puerta === 1;
                break;
              }
            }
          } else if (paredes[i] && pasos > 0) {
            distancia = entrada;
            textura = paredes[i] - 1;
            // En qué punto de la pared se ha dado (de 0 a 1), mirándola de frente de izquierda a derecha
            if (deLado) {
              u = ojo.x + distancia * rx;
              u -= Math.floor(u);
              if (ry < 0) u = 1 - u;
            } else {
              u = ojo.y + distancia * ry;
              u -= Math.floor(u);
              if (rx > 0) u = 1 - u;
            }
            break;
          }
        } else if (pasos > 0 && ((cx < 0 && pasoX < 0) || (cy < 0 && pasoY < 0) || (cx >= columnas && pasoX > 0) || (cy >= filas && pasoY > 0))) break;
        // A la casilla siguiente
        if (ladoX < ladoY) {
          entrada = ladoX;
          ladoX += deltaX;
          cx += pasoX;
          deLado = false;
        } else {
          entrada = ladoY;
          ladoY += deltaY;
          cy += pasoY;
          deLado = true;
        }
      }

      if (textura < 0 || distancia <= 0) {
        // Nada delante: sin pared en esta columna (se ve el horizonte)
        this.profundidad[x] = Infinity;
        this.arriba[x] = horizonte;
        this.abajo[x] = horizonte;
        continue;
      }
      if (distancia < CERCA) distancia = CERCA;
      this.profundidad[x] = distancia;
      const escala = focal / distancia;
      const yArriba = horizonte - escala * (1 - altura);
      const yAbajo = horizonte + escala * altura;
      const y0 = Math.max(0, Math.ceil(yArriba));
      const y1 = Math.min(H, Math.ceil(yAbajo));
      this.arriba[x] = Math.min(H, y0);
      this.abajo[x] = Math.max(0, y1);
      if (y1 <= y0) continue;

      const tex = texturas[textura];
      const nitidez = this.nitidez(ambiente, distancia);
      if (!tex || nitidez === 0) {
        const color = niebla ? niebla.color | 0xff000000 : 0xff000000;
        for (let y = y0, p = y0 * W + x; y < y1; y++, p += W) pantalla[p] = color;
        continue;
      }
      const luz = brillo * (deLado ? SOMBRA_DE_LADO : 1);
      const m = Math.round(nitidez * luz);
      const falta = 256 - nitidez;
      const ar = (nr * falta) >> 8;
      const ag = (ng * falta) >> 8;
      const ab = (nb * falta) >> 8;
      const tw = tex.ancho;
      const th = tex.alto;
      const pix = tex.pix;
      let tx = Math.floor(u * tw);
      if (tx < 0) tx = 0;
      else if (tx >= tw) tx = tw - 1;
      const paso = th / (yAbajo - yArriba);
      let ty = (y0 - yArriba) * paso;
      const tope = th - 1;
      if (m === 256 && falta === 0) {
        for (let y = y0, p = y0 * W + x; y < y1; y++, p += W) {
          const fy = ty | 0;
          pantalla[p] = pix[(fy > tope ? tope : fy) * tw + tx] | 0xff000000;
          ty += paso;
        }
      } else {
        for (let y = y0, p = y0 * W + x; y < y1; y++, p += W) {
          const fy = ty | 0;
          const c = pix[(fy > tope ? tope : fy) * tw + tx];
          let r = (((c & 255) * m) >> 8) + ar;
          let g = ((((c >>> 8) & 255) * m) >> 8) + ag;
          let b = ((((c >>> 16) & 255) * m) >> 8) + ab;
          if (r > 255) r = 255;
          if (g > 255) g = 255;
          if (b > 255) b = 255;
          pantalla[p] = 0xff000000 | (b << 16) | (g << 8) | r;
          ty += paso;
        }
      }
    }
  }

  // ───────────────────────── 2. Suelo y techo ─────────────────────────

  private pintarSueloYTecho(rejilla: Rejilla, texturas: Textura[], ojo: Ojo, ambiente: Ambiente): void {
    const W = this.ancho;
    const H = this.alto;
    const pantalla = this.pantalla;
    const arriba = this.arriba;
    const abajo = this.abajo;
    const { columnas, filas, suelos } = rejilla;
    const dirX = Math.cos(ojo.angulo);
    const dirY = Math.sin(ojo.angulo);
    const planoX = dirY * this.tangente;
    const planoY = -dirX * this.tangente;
    const focal = this.focal;
    const horizonte = this.horizonte;
    const altura = Math.min(Math.max(ojo.altura, 0.02), 0.98);
    const niebla = ambiente.niebla;
    const nr = niebla ? niebla.color & 255 : 0;
    const ng = niebla ? (niebla.color >>> 8) & 255 : 0;
    const nb = niebla ? (niebla.color >>> 16) & 255 : 0;
    const colorNiebla = niebla ? niebla.color | 0xff000000 : 0xff000000;
    const brillo = Math.max(0, ambiente.brillo);
    const cielo = ambiente.cielo;

    // Qué filas hacen falta: de la pared más alta a la más baja
    let primera = H;
    let ultima = 0;
    for (let x = 0; x < W; x++) {
      if (arriba[x] > ultima) ultima = arriba[x];
      if (abajo[x] < primera) primera = abajo[x];
    }

    // El cielo (si lo hay): una imagen que da la vuelta entera y no se acerca nunca
    if (cielo) {
      const sw = cielo.ancho;
      const sh = cielo.alto;
      for (let x = 0; x < W; x++) {
        const fin = arriba[x] < horizonte ? arriba[x] : Math.min(arriba[x], H);
        if (fin <= 0) continue;
        const camara = (2 * (x + 0.5)) / W - 1;
        let vuelta = (ojo.angulo - Math.atan(camara * this.tangente)) / (Math.PI * 2);
        vuelta -= Math.floor(vuelta);
        // (al girar a la izquierda, el cielo se va hacia la derecha)
        const tx = Math.min(sw - 1, Math.floor((1 - vuelta) * sw));
        for (let y = 0, p = x; y < fin; y++, p += W) {
          let v = 1 - (horizonte - y) / H;
          if (v < 0) v = 0;
          else if (v > 1) v = 1;
          pantalla[p] = cielo.pix[Math.min(sh - 1, Math.floor(v * sh)) * sw + tx] | 0xff000000;
        }
      }
    }

    for (let y = 0; y < H; y++) {
      const esSuelo = y >= horizonte;
      if (esSuelo ? y < primera : y >= ultima) continue;
      if (!esSuelo && cielo) continue;
      // A qué distancia están los puntos de esta fila
      const desnivel = esSuelo ? y - horizonte + 0.5 : horizonte - y - 0.5;
      if (desnivel <= 0) continue;
      const distancia = ((esSuelo ? altura : 1 - altura) * focal) / desnivel;
      const nitidez = this.nitidez(ambiente, distancia);
      const fila = y * W;
      if (nitidez === 0) {
        if (esSuelo) {
          for (let x = 0; x < W; x++) if (y >= abajo[x]) pantalla[fila + x] = colorNiebla;
        } else {
          for (let x = 0; x < W; x++) if (y < arriba[x]) pantalla[fila + x] = colorNiebla;
        }
        continue;
      }
      const m = Math.round(nitidez * brillo);
      const falta = 256 - nitidez;
      const ar = (nr * falta) >> 8;
      const ag = (ng * falta) >> 8;
      const ab = (nb * falta) >> 8;
      // El punto del mundo del primer píxel de la fila, y lo que se avanza por píxel
      const pasoX = (distancia * planoX * 2) / W;
      const pasoY = (distancia * planoY * 2) / W;
      let mx = ojo.x + distancia * (dirX - planoX) + pasoX * 0.5;
      let my = ojo.y + distancia * (dirY - planoY) + pasoY * 0.5;
      const fija = esSuelo ? ambiente.suelo : ambiente.techo;
      const liso = esSuelo ? ambiente.colorSuelo : ambiente.colorTecho;
      // El color liso de esta fila, ya con su niebla
      let lr = (((liso & 255) * m) >> 8) + ar;
      let lg = ((((liso >>> 8) & 255) * m) >> 8) + ag;
      let lb = ((((liso >>> 16) & 255) * m) >> 8) + ab;
      if (lr > 255) lr = 255;
      if (lg > 255) lg = 255;
      if (lb > 255) lb = 255;
      const colorLiso = 0xff000000 | (lb << 16) | (lg << 8) | lr;
      const directo = m === 256 && falta === 0;

      for (let x = 0; x < W; x++, mx += pasoX, my += pasoY) {
        if (esSuelo ? y < abajo[x] : y >= arriba[x]) continue;
        let tex = fija;
        const cx = Math.floor(mx);
        const cy = Math.floor(my);
        if (esSuelo && cx >= 0 && cy >= 0 && cx < columnas && cy < filas) {
          const s = suelos[cy * columnas + cx];
          if (s) tex = texturas[s - 1] ?? fija;
        }
        if (!tex) {
          pantalla[fila + x] = colorLiso;
          continue;
        }
        const tw = tex.ancho;
        const th = tex.alto;
        let tx = ((mx - cx) * tw) | 0;
        // (la Y del mundo va hacia arriba y la de la imagen hacia abajo)
        let ty = ((1 - (my - cy)) * th) | 0;
        if (tx >= tw) tx = tw - 1;
        if (ty >= th) ty = th - 1;
        else if (ty < 0) ty = 0;
        const c = tex.pix[ty * tw + tx];
        if (directo) {
          pantalla[fila + x] = c | 0xff000000;
          continue;
        }
        let r = (((c & 255) * m) >> 8) + ar;
        let g = ((((c >>> 8) & 255) * m) >> 8) + ag;
        let b = ((((c >>> 16) & 255) * m) >> 8) + ab;
        if (r > 255) r = 255;
        if (g > 255) g = 255;
        if (b > 255) b = 255;
        pantalla[fila + x] = 0xff000000 | (b << 16) | (g << 8) | r;
      }
    }
  }

  // ───────────────────────── 3. Sprites ─────────────────────────

  private pintarSprites(ojo: Ojo, ambiente: Ambiente, sprites: Sprite3D[]): void {
    if (!sprites.length) return;
    const W = this.ancho;
    const H = this.alto;
    const pantalla = this.pantalla;
    const profundidad = this.profundidad;
    const dirX = Math.cos(ojo.angulo);
    const dirY = Math.sin(ojo.angulo);
    const focal = this.focal;
    const horizonte = this.horizonte;
    const altura = Math.min(Math.max(ojo.altura, 0.02), 0.98);
    const niebla = ambiente.niebla;
    const nr = niebla ? niebla.color & 255 : 0;
    const ng = niebla ? (niebla.color >>> 8) & 255 : 0;
    const nb = niebla ? (niebla.color >>> 16) & 255 : 0;
    const brillo = Math.max(0, ambiente.brillo);

    for (const s of sprites) s.profundidad = (s.x - ojo.x) * dirX + (s.y - ojo.y) * dirY;
    // Del más lejano al más cercano: el de delante se pinta encima
    sprites.sort((a, b) => b.profundidad! - a.profundidad!);

    for (const s of sprites) {
      const fondo = s.profundidad!;
      if (fondo < CERCA * 2 || s.opacidad <= 0.01) continue;
      const nitidez = this.nitidez(ambiente, fondo);
      if (nitidez === 0) continue;
      // Cuánto queda a la derecha del centro de la mirada
      const lado = (s.x - ojo.x) * dirY - (s.y - ojo.y) * dirX;
      const escala = focal / fondo;
      const centro = W / 2 + lado * escala;
      const anchoPx = s.ancho * escala;
      const altoPx = s.alto * escala;
      if (anchoPx < 0.5 || altoPx < 0.5) continue;
      const izquierda = centro - anchoPx / 2;
      const yAbajo = horizonte + (altura - s.elevacion) * escala;
      const yArriba = yAbajo - altoPx;
      const x0 = Math.max(0, Math.ceil(izquierda));
      const x1 = Math.min(W, Math.ceil(izquierda + anchoPx));
      const y0 = Math.max(0, Math.ceil(yArriba));
      const y1 = Math.min(H, Math.ceil(yAbajo));
      if (x1 <= x0 || y1 <= y0) continue;

      const tex = s.textura;
      const tw = tex.ancho;
      const th = tex.alto;
      const pix = tex.pix;
      const pasoX = tw / anchoPx;
      const pasoY = th / altoPx;
      const m = Math.round(nitidez * brillo);
      const falta = 256 - nitidez;
      // El tinte (un «flash»): el color del dibujo se acerca al del tinte
      const tinte = Math.min(1, Math.max(0, s.cuantoTinte));
      const k = Math.round(256 * (1 - tinte));
      const tr = Math.round((s.tinte & 255) * tinte);
      const tg = Math.round(((s.tinte >>> 8) & 255) * tinte);
      const tb = Math.round(((s.tinte >>> 16) & 255) * tinte);
      const ar = (nr * falta) >> 8;
      const ag = (ng * falta) >> 8;
      const ab = (nb * falta) >> 8;
      const opaco = s.opacidad >= 0.99;
      const alfa = Math.round(Math.min(1, s.opacidad) * 256);

      for (let x = x0; x < x1; x++) {
        if (fondo >= profundidad[x]) continue;
        let tx = ((x - izquierda) * pasoX) | 0;
        if (tx >= tw) tx = tw - 1;
        if (s.voltear) tx = tw - 1 - tx;
        let ty = (y0 - yArriba) * pasoY;
        for (let y = y0, p = y0 * W + x; y < y1; y++, p += W, ty += pasoY) {
          const fy = ty | 0;
          const c = pix[(fy >= th ? th - 1 : fy) * tw + tx];
          const a = c >>> 24;
          if (a < 128) continue;
          let r = ((((((c & 255) * k) >> 8) + tr) * m) >> 8) + ar;
          let g = (((((((c >>> 8) & 255) * k) >> 8) + tg) * m) >> 8) + ag;
          let b = (((((((c >>> 16) & 255) * k) >> 8) + tb) * m) >> 8) + ab;
          if (r > 255) r = 255;
          if (g > 255) g = 255;
          if (b > 255) b = 255;
          if (!opaco) {
            const d = pantalla[p];
            r = (r * alfa + (d & 255) * (256 - alfa)) >> 8;
            g = (g * alfa + ((d >>> 8) & 255) * (256 - alfa)) >> 8;
            b = (b * alfa + ((d >>> 16) & 255) * (256 - alfa)) >> 8;
          }
          pantalla[p] = 0xff000000 | (b << 16) | (g << 8) | r;
        }
      }
    }
  }

  // ───────────────────────── Dónde cae un punto del mundo ─────────────────────────

  /**
   * Dónde se ve en la pantalla un punto del mundo (x, y en casillas; `z` = su altura, de 0 a 1),
   * con el último fotograma pintado. Devuelve el píxel (de 0 a ancho y de 0 a alto, con la Y hacia
   * abajo), a qué distancia está y si lo tapa una pared; o null si queda detrás del ojo.
   */
  proyectar(x: number, y: number, z = 0.5): { x: number; y: number; distancia: number; tapado: boolean; escala: number } | null {
    const ojo = this.ojo;
    const dirX = Math.cos(ojo.angulo);
    const dirY = Math.sin(ojo.angulo);
    const fondo = (x - ojo.x) * dirX + (y - ojo.y) * dirY;
    if (fondo < CERCA) return null;
    const lado = (x - ojo.x) * dirY - (y - ojo.y) * dirX;
    const escala = this.focal / fondo;
    const px = this.ancho / 2 + lado * escala;
    const py = this.horizonte + (ojo.altura - z) * escala;
    const columna = Math.floor(px);
    const tapado = columna >= 0 && columna < this.ancho ? fondo >= this.profundidad[columna] : false;
    // (escala: cuántos píxeles mide a esa distancia algo de una casilla de grande)
    return { x: px, y: py, distancia: fondo, tapado, escala };
  }
}
