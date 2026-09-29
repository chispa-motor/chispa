/**
 * GUARDAR Y CARGAR DATOS DEL JUGADOR (récords, niveles desbloqueados, opciones...)
 *
 *     guardar("record", 1500)
 *     variable r = cargar("record", 0)     # 0 si todavía no se había guardado nada
 *
 * Los datos se guardan en el navegador (localStorage), por proyecto: dos
 * juegos distintos no se pisan los datos aunque usen la misma clave.
 *
 * Se pueden guardar números, textos, lógicos, nulo, vectores, listas y tablas
 * (con todo lo que tengan dentro). Los OBJETOS del juego no, porque dejan de
 * existir al cerrar el juego.
 */
import { ErrorChispa } from '../errores/ErrorChispa';
import type { Posicion } from '../lexico/tokens';
import { Tabla, nombreTipo, type Valor } from '../ejecucion/valores';
import { Vector2 } from '../../motor/Vector2';

/** Valor de Chispa → texto JSON. */
export function serializar(v: Valor, pos: Posicion): string {
  return JSON.stringify(aJSON(v, pos));
}

function aJSON(v: Valor, pos: Posicion): unknown {
  if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map((e) => aJSON(e, pos));
  if (v instanceof Vector2) return { __vector: [v.x, v.y] };
  // Las tablas se guardan como lista de pares para conservar el ORDEN de las claves
  if (v instanceof Tabla) return { __tabla: v.pares().map(([k, e]) => [k, aJSON(e, pos)]) };
  throw new ErrorChispa(
    pos,
    `no se puede guardar ${nombreTipo(v)}: solo números, textos, verdadero/falso, listas, tablas y vectores.`,
    'Los objetos del juego no se pueden guardar porque desaparecen al cerrarlo. Guarda sus datos (por ejemplo, su vida o su posición).',
  );
}

/** Texto JSON → valor de Chispa. */
export function deserializar(texto: string): Valor {
  return desdeJSON(JSON.parse(texto));
}

function desdeJSON(d: unknown): Valor {
  if (d === null || typeof d === 'number' || typeof d === 'string' || typeof d === 'boolean') return d;
  if (Array.isArray(d)) return d.map(desdeJSON);
  const o = d as { __vector?: [number, number]; __tabla?: [string, unknown][] };
  if (o.__vector) return new Vector2(o.__vector[0], o.__vector[1]);
  if (o.__tabla) {
    const t = new Tabla();
    for (const [k, e] of o.__tabla) t.poner(k, desdeJSON(e));
    return t;
  }
  return null;
}
