/**
 * CAMINOS: cómo ir de un sitio a otro sin atravesar las paredes de un mapa de casillas.
 *
 * Se usa el algoritmo A* ("A estrella"): se van probando casillas empezando
 * por las que parecen más cerca del destino, hasta llegar. Da el camino más
 * corto. Se puede ir en diagonal, pero sin cortar esquinas (si no, el objeto
 * se engancharía en ellas).
 *
 * Después se "estira" el camino: si desde un punto se ve directamente otro
 * más lejano sin tocar paredes, se va recto hasta él. Así el objeto no va en
 * zigzag de casilla en casilla.
 *
 * DECISIÓN: solo cuentan las casillas SÓLIDAS del mapa (las plataformas
 * «solo desde arriba» se atraviesan). Los objetos sólidos sueltos no se
 * esquivan: para un laberinto, las paredes se pintan con casillas.
 */
import { Vector2 } from '../motor/Vector2';
import type { Escena } from './Escena';
import { MapaCasillas } from './componentes/MapaCasillas';

/** Casillas que se miran como mucho (para que un destino imposible no congele el juego). */
const MAXIMO_CASILLAS = 20000;
const MARGEN = 3;

/** El mapa con paredes de la escena (el primero que tenga alguna casilla sólida). */
export function mapaConParedes(escena: Escena): MapaCasillas | null {
  for (const o of escena.objetos) {
    const m = o.destruido ? null : o.obtener(MapaCasillas);
    if (!m) continue;
    for (const tipo of m.celdas.values()) if (esPared(m, tipo)) return m;
  }
  return null;
}

function esPared(m: MapaCasillas, tipo: string): boolean {
  const t = m.tipos[tipo];
  return (t?.solida ?? true) && !t?.soloDesdeArriba;
}

/** ¿Se puede pasar por esta casilla? */
export function casillaLibre(m: MapaCasillas, columna: number, fila: number): boolean {
  const tipo = m.obtener(columna, fila);
  return !tipo || !esPared(m, tipo);
}

/**
 * El camino de `desde` a `hasta` (sin contar `desde`), o null si no se puede llegar.
 * `radio`: la mitad del tamaño del objeto, para que no roce las paredes al ir recto.
 */
export function buscarCamino(m: MapaCasillas, desde: Vector2, hasta: Vector2, radio = 0): Vector2[] | null {
  const inicio = { c: m.columnaEn(desde.x), f: m.filaEn(desde.y) };
  let fin: { c: number; f: number } | null = { c: m.columnaEn(hasta.x), f: m.filaEn(hasta.y) };
  const finExacto = casillaLibre(m, fin.c, fin.f);
  if (!finExacto) fin = libreMasCercana(m, fin.c, fin.f);
  if (!fin) return null;
  if (inicio.c === fin.c && inicio.f === fin.f) return [finExacto ? hasta.copiar() : centro(m, fin.c, fin.f)];

  // Zona de búsqueda: el mapa, un poco más grande, y que incluya el inicio y el final
  const l = m.limites()!;
  const c0 = Math.min(m.columnaEn(l.izquierda), inicio.c, fin.c) - MARGEN;
  const c1 = Math.max(m.columnaEn(l.derecha - 1), inicio.c, fin.c) + MARGEN;
  const f0 = Math.min(m.filaEn(l.abajo), inicio.f, fin.f) - MARGEN;
  const f1 = Math.max(m.filaEn(l.arriba - 1), inicio.f, fin.f) + MARGEN;
  const ancho = c1 - c0 + 1;
  const indice = (c: number, f: number) => (f - f0) * ancho + (c - c0);
  const dentro = (c: number, f: number) => c >= c0 && c <= c1 && f >= f0 && f <= f1;

  const coste = new Map<number, number>();
  const venida = new Map<number, number>();
  const abiertos = new Monticulo();
  const estimar = (c: number, f: number) => {
    const dx = Math.abs(c - fin!.c);
    const dy = Math.abs(f - fin!.f);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const a = indice(inicio.c, inicio.f);
  const b = indice(fin.c, fin.f);
  coste.set(a, 0);
  abiertos.meter(a, estimar(inicio.c, inicio.f));
  let mirados = 0;
  while (abiertos.tamano && mirados++ < MAXIMO_CASILLAS) {
    const actual = abiertos.sacar();
    if (actual === b) break;
    const c = (actual % ancho) + c0;
    const f = Math.floor(actual / ancho) + f0;
    const g = coste.get(actual)!;
    for (let dc = -1; dc <= 1; dc++) {
      for (let df = -1; df <= 1; df++) {
        if (!dc && !df) continue;
        const nc = c + dc;
        const nf = f + df;
        if (!dentro(nc, nf) || !casillaLibre(m, nc, nf)) continue;
        // En diagonal, solo si las dos casillas de al lado están libres (no se cortan esquinas)
        if (dc && df && (!casillaLibre(m, c + dc, f) || !casillaLibre(m, c, f + df))) continue;
        const n = indice(nc, nf);
        const nuevo = g + (dc && df ? Math.SQRT2 : 1);
        if (nuevo >= (coste.get(n) ?? Infinity)) continue;
        coste.set(n, nuevo);
        venida.set(n, actual);
        abiertos.meter(n, nuevo + estimar(nc, nf));
      }
    }
  }
  if (!venida.has(b)) return null;

  // De atrás adelante: del final al inicio siguiendo "de dónde vino"
  const casillas: Vector2[] = [];
  for (let n = b; n !== a; n = venida.get(n)!) casillas.push(centro(m, (n % ancho) + c0, Math.floor(n / ancho) + f0));
  casillas.reverse();
  if (finExacto) casillas[casillas.length - 1] = hasta.copiar();
  return estirar(m, desde, casillas, radio);
}

/** Quita los puntos intermedios que no hacen falta (si se puede ir recto, se va recto). */
function estirar(m: MapaCasillas, desde: Vector2, puntos: Vector2[], radio: number): Vector2[] {
  const r: Vector2[] = [];
  let origen = desde;
  let i = 0;
  while (i < puntos.length) {
    let j = puntos.length - 1;
    while (j > i && !lineaLibre(m, origen, puntos[j], radio)) j--;
    r.push(puntos[j]);
    origen = puntos[j];
    i = j + 1;
  }
  return r;
}

/** ¿Se puede ir en línea recta de a a b sin tocar una pared (con el grosor del objeto)? */
export function lineaLibre(m: MapaCasillas, a: Vector2, b: Vector2, radio = 0): boolean {
  const largo = b.restar(a).longitud();
  const pasos = Math.max(1, Math.ceil(largo / (m.tamano / 4)));
  const r = Math.min(radio, m.tamano * 0.45);
  for (let k = 0; k <= pasos; k++) {
    const x = a.x + ((b.x - a.x) * k) / pasos;
    const y = a.y + ((b.y - a.y) * k) / pasos;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      if (!casillaLibre(m, m.columnaEn(x + ox), m.filaEn(y + oy))) return false;
    }
  }
  return true;
}

function centro(m: MapaCasillas, c: number, f: number): Vector2 {
  const p = m.centroDe(c, f);
  return new Vector2(p.x, p.y);
}

/** Si el destino es una pared, la casilla libre más cercana (hasta 3 casillas alrededor). */
function libreMasCercana(m: MapaCasillas, c: number, f: number): { c: number; f: number } | null {
  for (let d = 1; d <= 3; d++) {
    let mejor: { c: number; f: number; dist: number } | null = null;
    for (let dc = -d; dc <= d; dc++) {
      for (let df = -d; df <= d; df++) {
        if (Math.max(Math.abs(dc), Math.abs(df)) !== d || !casillaLibre(m, c + dc, f + df)) continue;
        const dist = dc * dc + df * df;
        if (!mejor || dist < mejor.dist) mejor = { c: c + dc, f: f + df, dist };
      }
    }
    if (mejor) return mejor;
  }
  return null;
}

/** Una cola que siempre da primero el de menor prioridad (para A*). */
class Monticulo {
  private elementos: number[] = [];
  private prioridades: number[] = [];
  get tamano(): number {
    return this.elementos.length;
  }
  meter(elemento: number, prioridad: number): void {
    const e = this.elementos;
    const p = this.prioridades;
    let i = e.length;
    e.push(elemento);
    p.push(prioridad);
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (p[padre] <= p[i]) break;
      [e[padre], e[i]] = [e[i], e[padre]];
      [p[padre], p[i]] = [p[i], p[padre]];
      i = padre;
    }
  }
  sacar(): number {
    const e = this.elementos;
    const p = this.prioridades;
    const primero = e[0];
    const ultimoE = e.pop()!;
    const ultimoP = p.pop()!;
    if (e.length) {
      e[0] = ultimoE;
      p[0] = ultimoP;
      let i = 0;
      for (;;) {
        const iz = 2 * i + 1;
        const de = iz + 1;
        let menor = i;
        if (iz < e.length && p[iz] < p[menor]) menor = iz;
        if (de < e.length && p[de] < p[menor]) menor = de;
        if (menor === i) break;
        [e[menor], e[i]] = [e[i], e[menor]];
        [p[menor], p[i]] = [p[i], p[menor]];
        i = menor;
      }
    }
    return primero;
  }
}
