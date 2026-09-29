/**
 * ANIMAR VALORES SUAVEMENTE ("tweens"): cambiar un número, una posición o un
 * color poco a poco durante un tiempo, en vez de golpe.
 *
 *     animar(yo.tamano, 2, 0.5)          → crece hasta el doble en medio segundo
 *     animar(yo.color, "rojo", 1, "rebote")
 *
 * Es lo que en Roblox hace TweenService y en Godot, Tween. Sirve también para
 * yo.irA(), yo.parpadear() y los fundidos de la pantalla.
 *
 * DECISIÓN: el valor se lee al EMPEZAR (desde lo que valga en ese momento) y
 * se escribe en cada fotograma a través de las mismas funciones que usa el
 * código (yo.x = ...). Así se puede animar cualquier cosa que se pueda
 * cambiar desde Chispa, sin casos especiales.
 */
import { Vector2 } from '../motor/Vector2';
import { colorAComponentes, componentesAColor } from '../motor/Color';

/** Cómo avanza la animación: t va de 0 a 1 y devuelve cuánto se ha recorrido. */
export const SUAVIZADOS: Record<string, (t: number) => number> = {
  lineal: (t) => t,
  suave: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  entrada: (t) => t * t * t,
  salida: (t) => 1 - (1 - t) ** 3,
  rebote: (t) => {
    const n = 7.5625;
    const d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
  elastico: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1),
  atras: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
};
export const NOMBRES_SUAVIZADOS = Object.keys(SUAVIZADOS);

/** Un valor que se puede animar: número, vector (posición, escala) o color (texto). */
export type ValorAnimable = number | Vector2 | string;

export interface Animacion {
  /** Para no animar dos veces lo mismo a la vez: la nueva sustituye a la vieja. */
  clave: string;
  /** Si este objeto se destruye, la animación se acaba sola. */
  dueno?: { destruido: boolean };
  duracion: number;
  transcurrido: number;
  /** Se llama en cada fotograma con el progreso (0 a 1, ya suavizado). */
  paso: (t: number) => void;
  suavizado: (t: number) => number;
  alTerminar?: () => void;
}

/** Calcula el valor intermedio entre `desde` y `hasta` (t de 0 a 1). Null si no se pueden mezclar. */
export function mezclar(desde: ValorAnimable, hasta: ValorAnimable, t: number): ValorAnimable | null {
  if (typeof desde === 'number' && typeof hasta === 'number') return desde + (hasta - desde) * t;
  if (desde instanceof Vector2 && hasta instanceof Vector2) return new Vector2(desde.x + (hasta.x - desde.x) * t, desde.y + (hasta.y - desde.y) * t);
  // Escala: yo.escala (vector) hasta un número (2) → los dos ejes
  if (desde instanceof Vector2 && typeof hasta === 'number') return mezclar(desde, new Vector2(hasta, hasta), t);
  if (typeof desde === 'string' && typeof hasta === 'string') {
    const a = colorAComponentes(desde);
    const b = colorAComponentes(hasta);
    if (!a || !b) return null;
    return componentesAColor([0, 1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t) as [number, number, number, number]);
  }
  return null;
}

export class AnimadorDeValores {
  private activas: Animacion[] = [];

  /** Empieza una animación (si ya había otra con la misma clave, la sustituye). */
  agregar(a: Animacion): void {
    this.activas = this.activas.filter((x) => x.clave !== a.clave);
    this.activas.push(a);
    if (a.duracion <= 0) this.actualizar(0);
  }

  /** ¿Hay alguna animación con esta clave en marcha? */
  animando(clave: string): boolean {
    return this.activas.some((a) => a.clave === clave);
  }

  cancelar(clave: string): void {
    this.activas = this.activas.filter((a) => a.clave !== clave);
  }

  actualizar(dt: number): void {
    if (!this.activas.length) return;
    const terminadas: Animacion[] = [];
    for (const a of [...this.activas]) {
      if (a.dueno?.destruido) {
        terminadas.push(a);
        continue;
      }
      a.transcurrido += dt;
      const t = a.duracion <= 0 ? 1 : Math.min(1, a.transcurrido / a.duracion);
      a.paso(t >= 1 ? 1 : a.suavizado(t));
      if (t >= 1) terminadas.push(a);
    }
    if (!terminadas.length) return;
    this.activas = this.activas.filter((a) => !terminadas.includes(a));
    for (const a of terminadas) if (!a.dueno?.destruido) a.alTerminar?.();
  }

  vaciar(): void {
    this.activas = [];
  }

  get cuantas(): number {
    return this.activas.length;
  }
}
