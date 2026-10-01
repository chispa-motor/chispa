/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Sprite: CÓMO se ve el objeto.
 *
 * Puede ser una imagen o, si no tiene imagen, una forma (rectángulo, círculo,
 * estrella, corazón, un camino hecho con la pluma... ver formas/figuras.ts)
 * o un texto. Las formas y las imágenes también pueden llevar un
 * texto encima (una "etiqueta"), que sirve para hacer botones.
 *
 * fijo = verdadero → se dibuja pegado a la PANTALLA, sin moverse con la
 * cámara. Es lo que se usa para la interfaz: vida, puntos, botones, menús.
 */
import { Componente } from '../Componente';
import type { Renderizador } from '../../motor/Renderizador';
import { ESTILO_POR_DEFECTO, MEZCLAS, esSencillo, pintarConEstilo, type Estilo, type Mezcla, type Patron, type TipoRelleno } from '../../motor/Estilo';
import { resolverColor } from '../../motor/Color';
import { siluetaDe } from '../../motor/Filtros';
import { aLocal, figuraDe, puntoEnFigura, type Figura, type Forma, type Punto, type PuntoCamino } from '../formas/figuras';

export type FormaSprite = Forma;

export class Sprite extends Componente {
  /** Nombre de una imagen cargada en Recursos. Si hay imagen, se ignora la forma. */
  imagen: string | null = null;
  forma: FormaSprite = 'rectangulo';
  color = 'blanco';
  ancho = 32;
  alto = 32;
  visible = true;
  opacidad = 1;
  voltearX = false;
  /** Boca abajo (como en un espejo, pero de arriba abajo). */
  voltearY = false;
  /** Datos de algunas formas (ver DatosFigura en formas/figuras.ts). */
  lados: number | undefined = undefined;
  radioInterior: number | undefined = undefined;
  radioEsquina: number | undefined = undefined;
  inicioArco: number | undefined = undefined;
  finArco: number | undefined = undefined;
  grosor: number | undefined = undefined;
  puntos: PuntoCamino[] | undefined = undefined;
  cerrado: boolean | undefined = undefined;
  figuras: Punto[][][] | undefined = undefined;
  /** Estilo (ver motor/Estilo.ts): relleno, borde, sombra, resplandor y mezcla. */
  relleno: TipoRelleno = 'color';
  color2 = ESTILO_POR_DEFECTO.color2;
  anguloDegradado = ESTILO_POR_DEFECTO.anguloDegradado;
  patron: Patron = 'rayas';
  /** Nombre de una imagen del proyecto para rellenar la forma (repetida). */
  imagenRelleno: string | null = null;
  borde = 0;
  colorBorde = ESTILO_POR_DEFECTO.colorBorde;
  bordeDiscontinuo = false;
  sombra: string | null = null;
  sombraX = ESTILO_POR_DEFECTO.sombraX;
  sombraY = ESTILO_POR_DEFECTO.sombraY;
  desenfoqueSombra = ESTILO_POR_DEFECTO.desenfoqueSombra;
  resplandor: string | null = null;
  tamanoResplandor = ESTILO_POR_DEFECTO.tamanoResplandor;
  mezcla: Mezcla = 'normal';
  /** Contorno: una línea de color alrededor de todo el dibujo. */
  contorno: string | null = null;
  grosorContorno = ESTILO_POR_DEFECTO.grosorContorno;
  /** Filtros del objeto: brillo (1 = normal), grises (0 a 1) y desenfoque (píxeles). */
  brillo = 1;
  grises = 0;
  desenfoque = 0;
  /** Flash (yo.flash): el objeto entero de un color, un momento (al recibir un golpe). */
  private flashColor = 'blanco';
  private flashQueda = 0;
  /** Orden de dibujo: capas más altas se dibujan encima. */
  capa = 0;
  /** Pegado a la pantalla (interfaz): no se mueve con la cámara ni con el zoom. */
  fijo = false;

  /** Texto: el contenido de un objeto de texto, o la etiqueta de un botón (forma o imagen con texto). */
  texto = '';
  /** Tamaño de la letra. */
  tamano = 24;
  /** Color de la letra de las etiquetas (en los objetos de texto se usa `color`). */
  colorTexto = 'blanco';
  alinear: 'izquierda' | 'centro' | 'derecha' = 'centro';
  /**
   * Texto con huecos ("Puntos: {juego.puntos}"): se recalcula cada vez que se
   * dibuja. Si devuelve null (ha fallado), se deja de recalcular.
   */
  textoVivo: (() => string | null) | null = null;

  /** Recalcula el texto con huecos, si lo tiene. */
  actualizarTexto(): void {
    if (!this.textoVivo) return;
    const t = this.textoVivo();
    if (t === null) this.textoVivo = null;
    else this.texto = t;
  }

  private ultimaFigura: Figura | null = null;
  private claveFigura = { forma: '', ancho: 0, alto: 0, lados: 0 as number | undefined, radioInterior: 0 as number | undefined, radioEsquina: 0 as number | undefined, inicioArco: 0 as number | undefined, finArco: 0 as number | undefined, grosor: 0 as number | undefined, puntos: undefined as unknown, cerrado: undefined as boolean | undefined, figuras: undefined as unknown };

  /**
   * La figura de su forma con ese tamaño. Si nada ha cambiado, la misma de
   * antes, sin recalcular (se pide muchas veces por fotograma: dibujar, chocar...).
   */
  figura(ancho = this.anchoFinal, alto = this.altoFinal): Figura {
    const k = this.claveFigura;
    if (
      this.ultimaFigura && k.forma === this.forma && k.ancho === ancho && k.alto === alto && k.lados === this.lados && k.radioInterior === this.radioInterior &&
      k.radioEsquina === this.radioEsquina && k.inicioArco === this.inicioArco && k.finArco === this.finArco && k.grosor === this.grosor &&
      k.puntos === this.puntos && k.cerrado === this.cerrado && k.figuras === this.figuras
    ) {
      return this.ultimaFigura;
    }
    Object.assign(k, { forma: this.forma, ancho, alto, lados: this.lados, radioInterior: this.radioInterior, radioEsquina: this.radioEsquina, inicioArco: this.inicioArco, finArco: this.finArco, grosor: this.grosor, puntos: this.puntos, cerrado: this.cerrado, figuras: this.figuras });
    this.ultimaFigura = figuraDe({
      forma: this.forma, ancho, alto, lados: this.lados, radioInterior: this.radioInterior, radioEsquina: this.radioEsquina,
      inicioArco: this.inicioArco, finArco: this.finArco, grosor: this.grosor, puntos: this.puntos, cerrado: this.cerrado, figuras: this.figuras,
    });
    return this.ultimaFigura;
  }

  /** ¿Se dibuja con una figura (y no como un rectángulo, una imagen o un texto)? */
  get esFigura(): boolean {
    return !this.imagen && this.forma !== 'rectangulo' && this.forma !== 'texto';
  }

  /** ¿Está ese punto (del mundo, o de la pantalla si es fijo) dentro de lo que se ve? Solo para figuras. */
  contiene(p: Punto): boolean {
    const t = this.objeto.transformacion;
    const local = aLocal(p, t.posicion.x, t.posicion.y, t.rotacion, this.voltearX !== t.escala.x < 0, this.voltearY !== t.escala.y < 0);
    return puntoEnFigura(this.figura(), local);
  }

  /** Tamaño real (incluyendo la escala de la Transformación). */
  get anchoFinal(): number {
    return this.ancho * Math.abs(this.objeto.transformacion.escala.x);
  }
  get altoFinal(): number {
    return this.alto * Math.abs(this.objeto.transformacion.escala.y);
  }

  /**
   * Dibuja el sprite con su centro en (x, y) del sistema de dibujo actual.
   * La Escena ya ha convertido la posición del mundo (Y hacia arriba) a la
   * pantalla (Y hacia abajo). Por el mismo motivo la rotación cambia de
   * signo: en el mundo, positivo = contrario a las agujas del reloj; en el
   * Canvas, positivo = a favor.
   */
  /** El objeto entero de un color durante unos segundos (yo.flash). */
  flash(color: string, segundos: number): void {
    this.flashColor = color;
    this.flashQueda = Math.max(0, segundos);
  }

  actualizar(dt: number): void {
    if (this.flashQueda > 0) this.flashQueda = Math.max(0, this.flashQueda - (this.objeto.escena?.motor.tiempo.deltaReal ?? dt));
  }

  dibujarEn(r: Renderizador, x: number, y: number): void {
    this.actualizarTexto();
    if (!this.visible || this.opacidad <= 0) return;
    // Filtros del objeto (brillo, grises, desenfoque): se ponen al lienzo mientras se dibuja
    const filtro = this.brillo !== 1 || this.grises > 0 || this.desenfoque > 0;
    if (filtro) {
      const antes = r.ctx.filter;
      const k = Math.hypot(r.ctx.getTransform().a, r.ctx.getTransform().b) || 1;
      r.ctx.filter = [this.brillo !== 1 ? `brightness(${Math.max(0, this.brillo)})` : '', this.grises > 0 ? `grayscale(${Math.min(1, this.grises)})` : '', this.desenfoque > 0 ? `blur(${this.desenfoque * k}px)` : ''].filter(Boolean).join(' ');
      try {
        this.dibujarSinFiltro(r, x, y);
      } finally {
        r.ctx.filter = antes || 'none';
      }
    } else this.dibujarSinFiltro(r, x, y);
  }

  private dibujarSinFiltro(r: Renderizador, x: number, y: number): void {
    const rotacion = -this.objeto.transformacion.rotacion;
    const w = this.anchoFinal;
    const h = this.altoFinal;

    if ((!esSencillo(this) || this.flashQueda > 0) && this.forma !== 'texto') {
      this.dibujarConEstilo(r, x, y, rotacion, w, h);
    } else if (this.imagen) {
      const img = this.objeto.escena!.motor.recursos.imagen(this.imagen);
      r.imagen(img, x, y, { ancho: w, alto: h, rotacion, opacidad: this.opacidad, voltearX: this.voltearX, voltearY: this.voltearY });
    } else if (this.forma !== 'texto') {
      r.ctx.globalAlpha = this.opacidad;
      if (this.forma === 'circulo' && w === h) r.circulo(x, y, w / 2, this.color);
      else if (this.forma === 'rectangulo') r.rectangulo(x - w / 2, y - h / 2, w, h, this.color, { rotacion });
      else r.figura(this.figura(w, h), x, y, rotacion, this.color, { voltearX: this.voltearX, voltearY: this.voltearY });
      r.ctx.globalAlpha = 1;
    }

    // Texto: el de los objetos de texto, o la etiqueta de un botón
    if (this.texto !== '' || this.forma === 'texto') {
      const esTexto = this.forma === 'texto' && !this.imagen;
      // En un objeto de texto, la posición es el punto de anclaje: con alinear = "izquierda"
      // el texto EMPIEZA ahí; con "derecha", TERMINA ahí; con "centro", está centrado.
      r.ctx.globalAlpha = this.opacidad;
      // La escala también agranda la letra (así se puede animar un texto que "salta"),
      // y cada salto de línea ("\n") es una línea nueva, centradas todas en (x, y)
      const tamano = this.tamano * Math.abs(this.objeto.transformacion.escala.y);
      const lineas = this.texto.split('\n');
      const alto = tamano * 1.25;
      // Un texto también puede brillar y mezclarse (sus colores de relleno son para las formas)
      const conEstilo = this.mezcla !== 'normal' || (this.resplandor && esTexto);
      if (conEstilo) {
        r.ctx.save();
        r.ctx.globalCompositeOperation = MEZCLAS[this.mezcla] ?? 'source-over';
      }
      if (this.resplandor && esTexto) {
        r.ctx.shadowColor = resolverColor(this.resplandor);
        r.ctx.shadowBlur = this.tamanoResplandor * Math.hypot(r.ctx.getTransform().a, r.ctx.getTransform().b);
      }
      lineas.forEach((linea, i) =>
        r.texto(linea, x, y + (i - (lineas.length - 1) / 2) * alto, {
          color: esTexto ? this.color : this.colorTexto,
          tamano,
          alinear: esTexto ? this.alinear : 'centro',
          negrita: true,
          sombra: true,
          vertical: 'medio',
        }),
      );
      if (conEstilo) r.ctx.restore();
      r.ctx.globalAlpha = 1;
    }
  }

  /** El estilo para pintar (relleno, borde, sombra...), con la imagen de relleno ya cargada. */
  estilo(): Estilo {
    let imagenRelleno: CanvasImageSource | null = null;
    if (this.relleno === 'imagen' && this.imagenRelleno) {
      try {
        imagenRelleno = this.objeto.escena?.motor.recursos.imagen(this.imagenRelleno) ?? null;
      } catch {
        imagenRelleno = null; // una imagen que ya no está: se rellena con el color
      }
    }
    return {
      color: this.color, relleno: this.relleno, color2: this.color2, anguloDegradado: this.anguloDegradado, patron: this.patron, imagenRelleno,
      borde: this.borde, colorBorde: this.colorBorde, bordeDiscontinuo: this.bordeDiscontinuo,
      sombra: this.sombra, sombraX: this.sombraX, sombraY: this.sombraY, desenfoqueSombra: this.desenfoqueSombra,
      resplandor: this.resplandor, tamanoResplandor: this.tamanoResplandor, mezcla: this.mezcla,
      contorno: this.contorno, grosorContorno: this.grosorContorno,
      // Con flash, todo del color del flash (sin degradados ni patrones)
      ...(this.flashQueda > 0 ? { relleno: 'color' as const, color: this.flashColor, colorBorde: this.flashColor } : {}),
    };
  }

  /** Dibujo con relleno especial, borde, sombra, resplandor o mezcla (el camino lento, pero completo). */
  private dibujarConEstilo(r: Renderizador, x: number, y: number, rotacion: number, w: number, h: number): void {
    const ctx = r.ctx;
    const figura = this.esFigura ? this.figura(w, h) : null;
    const img = this.imagen ? this.objeto.escena!.motor.recursos.imagen(this.imagen) : null;
    ctx.save();
    ctx.globalAlpha = this.opacidad;
    ctx.translate(x, y);
    if (rotacion) ctx.rotate((rotacion * Math.PI) / 180);
    ctx.scale(this.voltearX ? -1 : 1, this.voltearY ? 1 : -1); // la Y hacia arriba, como el mundo
    const trazar = () => {
      ctx.beginPath();
      if (img || this.forma === 'rectangulo') ctx.rect(-w / 2, -h / 2, w, h);
      else if (figura?.trazo) figura.trazo.puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      else if (figura) {
        for (const pol of figura.anillos) {
          for (const anillo of pol) {
            anillo.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
            ctx.closePath();
          }
        }
      }
    };
    const flash = this.flashQueda > 0;
    pintarConEstilo(ctx, this.estilo(), w, h, trazar, {
      linea: figura?.trazo ? figura.trazo.grosor : undefined,
      imagen: img
        ? (c) => {
            c.save();
            c.scale(1, -1); // las imágenes van con la Y hacia abajo
            // Con flash, la imagen entera de un color (su silueta)
            c.drawImage((flash && siluetaDe(img, this.flashColor)) || img, -w / 2, -h / 2, w, h);
            c.restore();
          }
        : undefined,
      contornoImagen: img
        ? (c, color, grosor) => {
            // El contorno de una imagen: su silueta, un poco movida hacia los 8 lados
            const silueta = siluetaDe(img, color);
            if (!silueta) return;
            c.save();
            c.scale(1, -1);
            for (let i = 0; i < 8; i++) {
              const a = (Math.PI * i) / 4;
              c.drawImage(silueta, -w / 2 + Math.cos(a) * grosor, -h / 2 + Math.sin(a) * grosor, w, h);
            }
            c.restore();
          }
        : undefined,
    });
    ctx.restore();
  }
}
