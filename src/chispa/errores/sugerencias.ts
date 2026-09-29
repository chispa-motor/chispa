/**
 * SUGERENCIAS: "¿Querías decir 'vida'?"
 *
 * Usamos la DISTANCIA DE LEVENSHTEIN: el número mínimo de letras que hay que
 * añadir, quitar o cambiar para pasar de una palabra a otra.
 *     vidda → vida      = 1 (quitar una d)
 *     mientas → mientras = 1 (añadir una r)
 * Si la palabra más parecida está lo bastante cerca, la sugerimos.
 */
import { normalizar } from '../../utilidades/texto';

export function distancia(a: string, b: string): number {
  // Programación dinámica: `fila[j]` = distancia entre a[0..i] y b[0..j]
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const arriba = fila[j];
      fila[j] = Math.min(
        fila[j] + 1, // quitar
        fila[j - 1] + 1, // añadir
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1), // cambiar (o nada si son iguales)
      );
      diagonal = arriba;
    }
  }
  return fila[b.length];
}

/** Devuelve la opción más parecida si se parece lo suficiente, o null. */
export function sugerir(nombre: string, opciones: Iterable<string>): string | null {
  const n = normalizar(nombre);
  let mejor: string | null = null;
  let mejorDistancia = Infinity;
  for (const opcion of opciones) {
    const d = distancia(n, normalizar(opcion));
    if (d < mejorDistancia) {
      mejorDistancia = d;
      mejor = opcion;
    }
  }
  // Palabras cortas: 1 error como mucho. Largas: 1 de cada 3 letras.
  const limite = Math.max(1, Math.floor(n.length / 3));
  return mejor !== null && mejorDistancia > 0 && mejorDistancia <= limite ? mejor : null;
}
