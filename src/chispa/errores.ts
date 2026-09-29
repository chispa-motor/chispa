/**
 * Errores del lenguaje Chispa.
 *
 * Regla de oro: cada error dice (1) en qué línea, (2) qué pasa con palabras
 * normales y (3) cómo arreglarlo. Nada de "unexpected token" ni "undefined".
 */
import { ErrorMotor } from '../motor/Errores';

export class ErrorChispa extends ErrorMotor {
  constructor(
    readonly linea: number,
    mensaje: string,
    pista?: string,
  ) {
    super(`Línea ${linea}: ${mensaje}`, pista, { linea });
    this.name = 'ErrorChispa';
  }

  /** Añade el archivo y el texto de la línea (lo sabe quien tiene el código fuente). */
  conArchivo(archivo: string, lineasCodigo: string[]): this {
    if (!this.ubicacion.archivo) {
      this.ubicacion.archivo = archivo;
      this.ubicacion.codigo = lineasCodigo[this.linea - 1]?.trim();
    }
    return this;
  }
}

/**
 * Distancia de Levenshtein: cuántas letras hay que cambiar para pasar de una
 * palabra a otra. La usamos para sugerir "¿Querías decir 'vida'?" cuando
 * alguien escribe "vidda".
 */
function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = temp;
    }
  }
  return fila[b.length];
}

/** Devuelve la opción más parecida si se parece lo suficiente, o null. */
export function sugerir(nombre: string, opciones: Iterable<string>): string | null {
  let mejor: string | null = null;
  let mejorDist = Infinity;
  const n = nombre.toLowerCase();
  for (const o of opciones) {
    const d = distancia(n, o.toLowerCase());
    if (d < mejorDist) {
      mejorDist = d;
      mejor = o;
    }
  }
  const limite = Math.max(1, Math.floor(nombre.length / 3));
  return mejor !== null && mejorDist <= limite && mejorDist > 0 ? mejor : null;
}
