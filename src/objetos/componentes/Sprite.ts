/**
 * Sprite: CÓMO se ve el objeto.
 *
 * Puede ser una imagen, o si no tiene imagen, una forma simple
 * (rectángulo, círculo) o un texto. El texto nos sirve para marcadores y menús.
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
  /**
   * fijo = verdadero → se dibuja en la pantalla, sin moverse con la cámara.
   * Ideal para marcadores de puntos, vidas, menús...
   */
  fijo = false;

  // Solo para forma "texto"
  texto = '';
  tamano = 24;
  alinear: 'izquierda' | 'centro' | 'derecha' = 'izquierda';

  /** Tamaño real en pantalla (incluyendo la escala de la Transformación). */
  get anchoFinal(): number {
    return this.ancho * Math.abs(this.objeto.transformacion.escala.x);
  }
  get altoFinal(): number {
    return this.alto * Math.abs(this.objeto.transformacion.escala.y);
  }

  dibujar(r: Renderizador): void {
    if (!this.visible || this.opacidad <= 0) return;
    const t = this.objeto.transformacion;
    const { x, y } = t.posicion;
    const w = this.anchoFinal;
    const h = this.altoFinal;

    if (this.imagen) {
      const img = this.objeto.escena!.motor.recursos.imagen(this.imagen);
      r.imagen(img, x, y, { ancho: w, alto: h, rotacion: t.rotacion, opacidad: this.opacidad, voltearX: this.voltearX });
      return;
    }

    r.ctx.globalAlpha = this.opacidad;
    if (this.forma === 'circulo') r.circulo(x, y, w / 2, this.color);
    else if (this.forma === 'texto')
      r.texto(this.texto, x, y, { color: this.color, tamano: this.tamano, alinear: this.alinear, negrita: true, sombra: true });
    else r.rectangulo(x - w / 2, y - h / 2, w, h, this.color, { rotacion: t.rotacion });
    r.ctx.globalAlpha = 1;
  }
}
