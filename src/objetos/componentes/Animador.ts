/**
 * Animador: cambia la imagen del Sprite cada cierto tiempo para animar
 * (correr, saltar, explotar...).
 *
 * DECISIÓN: una animación es una LISTA DE IMÁGENES (un fotograma = una
 * imagen), más una velocidad y si se repite. No usamos "hojas de sprites"
 * (una imagen grande con todos los fotogramas) porque hay que explicar
 * filas, columnas y recortes; con imágenes sueltas se entiende a la primera.
 */
import { Componente } from '../Componente';
import { Sprite } from './Sprite';

export interface DefAnimacion {
  /** Nombres de las imágenes, en orden. */
  fotogramas: string[];
  /** Fotogramas por segundo. */
  velocidad: number;
  /** ¿Vuelve a empezar al terminar? */
  repetir: boolean;
}

export class Animador extends Componente {
  /** Todas las animaciones del proyecto (nombre → definición). */
  animaciones: Record<string, DefAnimacion> = {};
  /** La que suena ahora, o null. */
  actual: string | null = null;
  private tiempo = 0;
  private fotograma = 0;
  private terminada = false;

  /** Empieza una animación. Si ya estaba sonando, no la reinicia (así se puede llamar en cada fotograma). */
  reproducir(nombre: string): void {
    if (this.actual === nombre && !this.terminada) return;
    this.actual = nombre;
    this.tiempo = 0;
    this.fotograma = 0;
    this.terminada = false;
    this.ponerImagen();
  }

  parar(): void {
    this.actual = null;
  }

  actualizar(dt: number): void {
    const anim = this.actual ? this.animaciones[this.actual] : undefined;
    if (!anim || this.terminada || anim.fotogramas.length === 0) return;
    this.tiempo += dt;
    const duracion = 1 / Math.max(0.01, anim.velocidad);
    // (la tolerancia evita que 6 × 1/60 = 0,0999999… "no llegue" a 0,1 por el redondeo de los decimales)
    while (this.tiempo >= duracion - 1e-9 && !this.terminada) {
      this.tiempo -= duracion;
      this.fotograma++;
      if (this.fotograma >= anim.fotogramas.length) {
        if (anim.repetir) this.fotograma = 0;
        else {
          this.fotograma = anim.fotogramas.length - 1;
          this.terminada = true;
          // Avisamos a los demás componentes (el script: "cuando termina la animacion")
          const nombre = this.actual!;
          for (const c of this.objeto.todosLosComponentes) if (c.activo) c.alTerminarAnimacion?.(nombre);
        }
      }
      this.ponerImagen();
    }
  }

  private ponerImagen(): void {
    const anim = this.actual ? this.animaciones[this.actual] : undefined;
    const sprite = this.objeto.obtener(Sprite);
    if (anim && sprite && anim.fotogramas.length) sprite.imagen = anim.fotogramas[this.fotograma];
  }
}
