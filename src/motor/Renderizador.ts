/**
 * Renderizador: todo lo que se dibuja en pantalla pasa por aquí.
 *
 * DECISIÓN 1 — Resolución lógica fija (por defecto 960×540).
 *   El juego SIEMPRE piensa que la pantalla mide 960×540, aunque la ventana
 *   sea más grande o más pequeña. Nosotros escalamos el dibujo para que
 *   quepa, dejando bandas negras si la proporción no coincide.
 *   Ventaja: un objeto en x=900 está en el mismo sitio en cualquier monitor.
 *
 * DECISIÓN 2 — Pantallas de alta densidad (devicePixelRatio).
 *   En portátiles "retina" un píxel CSS son 2 píxeles reales. Si no lo
 *   tenemos en cuenta, todo se ve borroso. Por eso el lienzo interno es más
 *   grande que su tamaño en pantalla.
 *
 * DECISIÓN 3 — Ejes: (0,0) arriba a la izquierda, la Y crece HACIA ABAJO.
 *   Es lo normal en Canvas, Godot o Phaser. Unity y Roblox usan Y hacia
 *   arriba, así que ojo: en nuestro motor "subir" es restar a la Y.
 *
 * Rotaciones en GRADOS (más intuitivo que radianes para principiantes).
 */
import { resolverColor } from './Color';
import { Vector2 } from './Vector2';

export interface EstiloForma {
  /** true = forma rellena (por defecto). false = solo el borde. */
  relleno?: boolean;
  /** Grosor del borde cuando relleno = false. */
  grosor?: number;
  /** Rotación en grados, alrededor del centro de la forma. */
  rotacion?: number;
}

export interface EstiloTexto {
  color?: string;
  tamano?: number;
  alinear?: 'izquierda' | 'centro' | 'derecha';
  negrita?: boolean;
  /** Sombra oscura debajo del texto, para que se lea sobre cualquier fondo. */
  sombra?: boolean;
}

export interface EstiloImagen {
  ancho?: number;
  alto?: number;
  rotacion?: number;
  /** Opacidad entre 0 (invisible) y 1 (opaca). */
  opacidad?: number;
  /** Voltear la imagen (útil para personajes que miran a izquierda/derecha). */
  voltearX?: boolean;
}

const GRADOS_A_RADIANES = Math.PI / 180;
const ALINEACIONES = { izquierda: 'left', centro: 'center', derecha: 'right' } as const;

export class Renderizador {
  readonly ctx: CanvasRenderingContext2D;
  private observador: ResizeObserver;

  constructor(
    readonly canvas: HTMLCanvasElement,
    /** Ancho lógico del juego. */
    readonly ancho: number,
    /** Alto lógico del juego. */
    readonly alto: number,
    /** true = píxeles nítidos (pixel art), false = imágenes suavizadas. */
    private pixelArt = false,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador no permite dibujar en Canvas 2D.');
    this.ctx = ctx;

    // Cada vez que cambia el tamaño del contenedor, recalculamos la escala.
    this.observador = new ResizeObserver(() => this.ajustarTamano());
    this.observador.observe(canvas.parentElement ?? document.body);
    this.ajustarTamano();
  }

  /** Recalcula el tamaño del lienzo para que quepa manteniendo la proporción. */
  ajustarTamano(): void {
    const contenedor = this.canvas.parentElement ?? document.body;
    const { width, height } = contenedor.getBoundingClientRect();

    // Escala que hace caber el juego sin deformarlo.
    const escalaCss = Math.max(0.01, Math.min(width / this.ancho, height / this.alto));
    const anchoCss = this.ancho * escalaCss;
    const altoCss = this.alto * escalaCss;
    this.canvas.style.width = `${anchoCss}px`;
    this.canvas.style.height = `${altoCss}px`;

    // Tamaño real en píxeles de la pantalla.
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(anchoCss * dpr);
    this.canvas.height = Math.round(altoCss * dpr);

    // Cambiar canvas.width reinicia el contexto, así que lo configuramos otra vez.
    // Esta transformación convierte coordenadas lógicas (960×540) a píxeles reales.
    this.ctx.setTransform(this.canvas.width / this.ancho, 0, 0, this.canvas.height / this.alto, 0, 0);
    this.ctx.imageSmoothingEnabled = !this.pixelArt;
  }

  /**
   * Convierte una posición de la ventana (la del ratón) a coordenadas del juego.
   * Sin esto, el ratón "no coincidiría" con lo dibujado al escalar la ventana.
   */
  aCoordenadasJuego(clientX: number, clientY: number): Vector2 {
    const r = this.canvas.getBoundingClientRect();
    return new Vector2(((clientX - r.left) / r.width) * this.ancho, ((clientY - r.top) / r.height) * this.alto);
  }

  // ───────────────────────── Dibujo ─────────────────────────

  /** Pinta toda la pantalla de un color. Se hace al principio de cada fotograma. */
  limpiar(color = 'negro'): void {
    this.ctx.fillStyle = resolverColor(color);
    this.ctx.fillRect(0, 0, this.ancho, this.alto);
  }

  /** Rectángulo. (x, y) es la esquina superior izquierda. */
  rectangulo(x: number, y: number, ancho: number, alto: number, color = 'blanco', estilo: EstiloForma = {}): void {
    const ctx = this.ctx;
    ctx.save();
    // Para rotar alrededor del centro: movemos el origen al centro, rotamos
    // y dibujamos desplazados medio tamaño hacia atrás.
    ctx.translate(x + ancho / 2, y + alto / 2);
    if (estilo.rotacion) ctx.rotate(estilo.rotacion * GRADOS_A_RADIANES);
    this.aplicarRellenoOBorde(-ancho / 2, -alto / 2, ancho, alto, color, estilo);
    ctx.restore();
  }

  /** Círculo. (x, y) es el centro. */
  circulo(x: number, y: number, radio: number, color = 'blanco', estilo: EstiloForma = {}): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, radio), 0, Math.PI * 2);
    if (estilo.relleno === false) {
      ctx.strokeStyle = resolverColor(color);
      ctx.lineWidth = estilo.grosor ?? 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = resolverColor(color);
      ctx.fill();
    }
  }

  linea(x1: number, y1: number, x2: number, y2: number, color = 'blanco', grosor = 2): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = resolverColor(color);
    ctx.lineWidth = grosor;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  /** Texto. (x, y) es la parte de arriba del texto. */
  texto(texto: string, x: number, y: number, estilo: EstiloTexto = {}): void {
    const ctx = this.ctx;
    const tamano = estilo.tamano ?? 18;
    ctx.font = `${estilo.negrita ? 'bold ' : ''}${tamano}px system-ui, "Segoe UI", sans-serif`;
    ctx.fillStyle = resolverColor(estilo.color ?? 'blanco');
    ctx.textAlign = ALINEACIONES[estilo.alinear ?? 'izquierda'];
    ctx.textBaseline = 'top';
    if (estilo.sombra) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(texto, x + 2, y + 2);
      ctx.restore();
    }
    ctx.fillText(texto, x, y);
  }

  /**
   * Imagen. (x, y) es el CENTRO de la imagen.
   * DECISIÓN: centro y no esquina, porque así rotar y voltear se ven bien
   * (el objeto gira sobre sí mismo). Así funcionarán los sprites en la Fase 2.
   */
  imagen(img: HTMLImageElement, x: number, y: number, estilo: EstiloImagen = {}): void {
    const ctx = this.ctx;
    const ancho = estilo.ancho ?? img.width;
    const alto = estilo.alto ?? img.height;
    ctx.save();
    ctx.globalAlpha = estilo.opacidad ?? 1;
    ctx.translate(x, y);
    if (estilo.rotacion) ctx.rotate(estilo.rotacion * GRADOS_A_RADIANES);
    if (estilo.voltearX) ctx.scale(-1, 1);
    ctx.drawImage(img, -ancho / 2, -alto / 2, ancho, alto);
    ctx.restore();
  }

  /** Deja de vigilar el tamaño de la ventana (se usará al parar el juego en el editor). */
  destruir(): void {
    this.observador.disconnect();
  }

  private aplicarRellenoOBorde(x: number, y: number, w: number, h: number, color: string, estilo: EstiloForma): void {
    const ctx = this.ctx;
    if (estilo.relleno === false) {
      ctx.strokeStyle = resolverColor(color);
      ctx.lineWidth = estilo.grosor ?? 2;
      ctx.strokeRect(x, y, w, h);
    } else {
      ctx.fillStyle = resolverColor(color);
      ctx.fillRect(x, y, w, h);
    }
  }
}
