/**
 * Sprite: CÓMO se ve el objeto.
 *
 * Puede ser una imagen o, si no tiene imagen, una forma simple (rectángulo,
 * círculo) o un texto. Las formas y las imágenes también pueden llevar un
 * texto encima (una "etiqueta"), que sirve para hacer botones.
 *
 * fijo = verdadero → se dibuja pegado a la PANTALLA, sin moverse con la
 * cámara. Es lo que se usa para la interfaz: vida, puntos, botones, menús.
 */
import { Componente } from '../Componente';
import type { Renderizador } from '../../motor/Renderizador';

export type FormaSprite = 'rectangulo' | 'circulo' | 'texto';

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
  dibujarEn(r: Renderizador, x: number, y: number): void {
    if (!this.visible || this.opacidad <= 0) return;
    const rotacion = -this.objeto.transformacion.rotacion;
    const w = this.anchoFinal;
    const h = this.altoFinal;

    if (this.imagen) {
      const img = this.objeto.escena!.motor.recursos.imagen(this.imagen);
      r.imagen(img, x, y, { ancho: w, alto: h, rotacion, opacidad: this.opacidad, voltearX: this.voltearX });
    } else if (this.forma !== 'texto') {
      r.ctx.globalAlpha = this.opacidad;
      if (this.forma === 'circulo') r.circulo(x, y, w / 2, this.color);
      else r.rectangulo(x - w / 2, y - h / 2, w, h, this.color, { rotacion });
      r.ctx.globalAlpha = 1;
    }

    // Texto: el de los objetos de texto, o la etiqueta de un botón
    if (this.texto !== '' || this.forma === 'texto') {
      const esTexto = this.forma === 'texto' && !this.imagen;
      // En un objeto de texto, la posición es el punto de anclaje: con alinear = "izquierda"
      // el texto EMPIEZA ahí; con "derecha", TERMINA ahí; con "centro", está centrado.
      r.ctx.globalAlpha = this.opacidad;
      r.texto(this.texto, x, y, {
        color: esTexto ? this.color : this.colorTexto,
        tamano: this.tamano,
        alinear: esTexto ? this.alinear : 'centro',
        negrita: true,
        sombra: true,
        vertical: 'medio',
      });
      r.ctx.globalAlpha = 1;
    }
  }
}
