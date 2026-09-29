/**
 * Rejilla espacial: para encontrar rápido qué objetos están CERCA de otro.
 *
 * Sin ella, para saber con qué choca cada objeto habría que compararlo con
 * TODOS los demás: con 500 objetos, 250.000 comparaciones por fotograma.
 * Con la rejilla dividimos el mundo en celdas (como un tablero) y cada
 * objeto se apunta en las celdas que ocupa. Luego solo comparamos con los
 * que están en las mismas celdas.
 */
import type { Caja } from './componentes/Colision';

export class RejillaEspacial<T> {
  private celdas = new Map<string, T[]>();

  constructor(private tamano = 128) {}

  insertar(caja: Caja, dato: T): void {
    this.recorrer(caja, (clave) => {
      let lista = this.celdas.get(clave);
      if (!lista) this.celdas.set(clave, (lista = []));
      lista.push(dato);
    });
  }

  /** Todo lo que hay en las celdas que toca la caja (puede incluir cosas que no se solapan: hay que comprobarlo después). */
  consultar(caja: Caja): Set<T> {
    const res = new Set<T>();
    this.recorrer(caja, (clave) => this.celdas.get(clave)?.forEach((d) => res.add(d)));
    return res;
  }

  private recorrer(caja: Caja, fn: (clave: string) => void): void {
    const t = this.tamano;
    const c0 = Math.floor(caja.izquierda / t);
    const c1 = Math.floor(caja.derecha / t);
    const f0 = Math.floor(caja.abajo / t);
    const f1 = Math.floor(caja.arriba / t);
    // Objetos enormes: evitamos recorrer millones de celdas
    if ((c1 - c0 + 1) * (f1 - f0 + 1) > 4096) {
      fn('grande');
      return;
    }
    for (let c = c0; c <= c1; c++) for (let f = f0; f <= f1; f++) fn(`${c},${f}`);
  }

  /** Las cosas enormes se apuntan en una celda especial que se mira siempre. */
  consultarConGrandes(caja: Caja): Set<T> {
    const res = this.consultar(caja);
    this.celdas.get('grande')?.forEach((d) => res.add(d));
    return res;
  }
}
