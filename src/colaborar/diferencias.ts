/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * DIFERENCIAS ENTRE DOS PROYECTOS (para programar juntos).
 *
 * El editor cambia el proyecto «a lo bruto» (es un objeto normal de JavaScript). Para mandar a los
 * demás solo LO QUE HA CAMBIADO, aquí se comparan dos versiones y sale una lista de cambios pequeños:
 * «pon x = 120 en el objeto Moneda de la escena Principal», «quita el script bala.chs»...
 *
 * Los objetos de una escena se buscan POR SU NOMBRE, no por su posición en la lista: si mientras
 * tú mueves la Moneda otra persona añade un objeto delante, tu cambio sigue yendo a la Moneda.
 */

/** Un paso de una ruta: una clave, una posición en una lista o «el elemento de la lista que se llama así». */
export type Paso = string | number | { nombre: string };
export type Ruta = Paso[];

export type Cambio =
  /** Poner un valor (en un objeto, o reemplazar un elemento de una lista). */
  | { tipo: 'poner'; ruta: Ruta; valor: unknown }
  /** Quitar una clave de un objeto. */
  | { tipo: 'quitar'; ruta: Ruta }
  /** En una lista: quitar `borrar` elementos desde `desde` y meter otros. */
  | { tipo: 'empalmar'; ruta: Ruta; desde: number; borrar: number; meter: unknown[] }
  /** En una lista con nombres: quitar el elemento que se llama así. */
  | { tipo: 'quitarNombre'; ruta: Ruta; nombre: string }
  /** En una lista con nombres: meter un elemento justo después del que se llama `despuesDe` (null = al principio). */
  | { tipo: 'meterNombre'; ruta: Ruta; despuesDe: string | null; valor: unknown };

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v);

/** ¿Son iguales (por dentro)? */
export function iguales(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!iguales(a[i], b[i])) return false;
    return true;
  }
  if (esObjeto(a)) {
    if (!esObjeto(b)) return false;
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!Object.hasOwn(b, k) || !iguales(a[k], b[k])) return false;
    return true;
  }
  return false;
}

export function clonar<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

/** Si todos los elementos de la lista son objetos con un `nombre` distinto, la lista de nombres. Si no, null. */
function nombresDe(lista: unknown[]): string[] | null {
  if (!lista.length) return [];
  const nombres: string[] = [];
  const vistos = new Set<string>();
  for (const e of lista) {
    if (!esObjeto(e) || typeof e.nombre !== 'string' || !e.nombre || vistos.has(e.nombre)) return null;
    vistos.add(e.nombre);
    nombres.push(e.nombre);
  }
  return nombres;
}

/** La lista de cambios que convierte `a` en `b`. */
export function diferencias(a: unknown, b: unknown, ruta: Ruta = [], cambios: Cambio[] = []): Cambio[] {
  if (a === b) return cambios;
  if (esObjeto(a) && esObjeto(b)) {
    for (const k of Object.keys(a)) if (a[k] !== undefined && (!Object.hasOwn(b, k) || b[k] === undefined)) cambios.push({ tipo: 'quitar', ruta: [...ruta, k] });
    for (const k of Object.keys(b)) {
      if (b[k] === undefined) continue;
      if (!Object.hasOwn(a, k) || a[k] === undefined) cambios.push({ tipo: 'poner', ruta: [...ruta, k], valor: b[k] });
      else diferencias(a[k], b[k], [...ruta, k], cambios);
    }
    return cambios;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const na = nombresDe(a);
    const nb = nombresDe(b);
    if (na && nb && (na.length || nb.length)) return diferenciasConNombres(a as Objeto[], b as Objeto[], na, nb, ruta, cambios);
    if (a.length === b.length) {
      for (let i = 0; i < a.length; i++) diferencias(a[i], b[i], [...ruta, i], cambios);
      return cambios;
    }
    // Distinto largo: lo igual del principio y del final se queda; lo del medio se cambia
    let p = 0;
    const min = Math.min(a.length, b.length);
    while (p < min && iguales(a[p], b[p])) p++;
    let s = 0;
    while (s < min - p && iguales(a[a.length - 1 - s], b[b.length - 1 - s])) s++;
    cambios.push({ tipo: 'empalmar', ruta, desde: p, borrar: a.length - p - s, meter: b.slice(p, b.length - s) });
    return cambios;
  }
  if (!iguales(a, b)) cambios.push({ tipo: 'poner', ruta, valor: b });
  return cambios;
}

function diferenciasConNombres(a: Objeto[], b: Objeto[], na: string[], nb: string[], ruta: Ruta, cambios: Cambio[]): Cambio[] {
  const enB = new Set(nb);
  const enA = new Set(na);
  // Si los que siguen estando han cambiado de orden (subir al frente...), se cambia la lista entera
  const comunesA = na.filter((n) => enB.has(n));
  const comunesB = nb.filter((n) => enA.has(n));
  if (comunesA.some((n, i) => n !== comunesB[i])) {
    cambios.push({ tipo: 'poner', ruta, valor: b });
    return cambios;
  }
  for (const n of na) if (!enB.has(n)) cambios.push({ tipo: 'quitarNombre', ruta, nombre: n });
  for (let i = 0; i < nb.length; i++) {
    const n = nb[i];
    if (!enA.has(n)) cambios.push({ tipo: 'meterNombre', ruta, despuesDe: i ? nb[i - 1] : null, valor: b[i] });
    else diferencias(a[na.indexOf(n)], b[i], [...ruta, { nombre: n }], cambios);
  }
  return cambios;
}

// ───────────────────────── Aplicar cambios a un objeto normal ─────────────────────────

/** Dónde está, en una lista, el elemento que se llama así (-1 si no está). */
export function posicionDeNombre(lista: unknown[], nombre: string): number {
  return lista.findIndex((e) => esObjeto(e) && e.nombre === nombre);
}

function paso(actual: unknown, p: Paso): unknown {
  if (actual === null || typeof actual !== 'object') return undefined;
  if (typeof p === 'object') return Array.isArray(actual) ? actual[posicionDeNombre(actual, p.nombre)] : undefined;
  return (actual as Record<string | number, unknown>)[p];
}

function navegar(raiz: unknown, ruta: Ruta): unknown {
  let actual = raiz;
  for (const p of ruta) {
    actual = paso(actual, p);
    if (actual === undefined) return undefined;
  }
  return actual;
}

/**
 * Aplica los cambios a un objeto (lo cambia, sin copiarlo: así lo que no cambia sigue siendo el mismo
 * objeto). Un cambio que ya no tiene sitio (porque otra persona borró ese objeto) se salta.
 * Devuelve cuántos se han podido aplicar.
 */
export function aplicar(raiz: unknown, cambios: Cambio[]): number {
  let hechos = 0;
  for (const c of cambios) {
    if (c.tipo === 'empalmar' || c.tipo === 'quitarNombre' || c.tipo === 'meterNombre') {
      const lista = navegar(raiz, c.ruta);
      if (!Array.isArray(lista)) continue;
      if (c.tipo === 'empalmar') {
        if (c.desde > lista.length) continue;
        lista.splice(c.desde, c.borrar, ...clonar(c.meter));
      } else if (c.tipo === 'quitarNombre') {
        const i = posicionDeNombre(lista, c.nombre);
        if (i < 0) continue;
        lista.splice(i, 1);
      } else {
        if (posicionDeNombre(lista, (c.valor as Objeto).nombre as string) >= 0) continue;
        const despues = c.despuesDe === null ? -1 : posicionDeNombre(lista, c.despuesDe);
        lista.splice(c.despuesDe === null ? 0 : despues < 0 ? lista.length : despues + 1, 0, clonar(c.valor));
      }
      hechos++;
      continue;
    }
    if (!c.ruta.length) continue;
    const padre = navegar(raiz, c.ruta.slice(0, -1));
    const ultimo = c.ruta[c.ruta.length - 1];
    if (padre === null || typeof padre !== 'object') continue;
    if (Array.isArray(padre)) {
      const i = typeof ultimo === 'object' ? posicionDeNombre(padre, ultimo.nombre) : typeof ultimo === 'number' ? ultimo : -1;
      if (i < 0 || i >= padre.length) continue;
      if (c.tipo === 'poner') padre[i] = clonar(c.valor);
      else padre.splice(i, 1);
    } else {
      if (typeof ultimo !== 'string') continue;
      if (c.tipo === 'poner') (padre as Objeto)[ultimo] = clonar(c.valor);
      else delete (padre as Objeto)[ultimo];
    }
    hechos++;
  }
  return hechos;
}

// ───────────────────────── Textos ─────────────────────────

/** El cambio más pequeño que convierte un texto en otro: lo igual del principio y del final se queda. */
export function cambioDeTexto(viejo: string, nuevo: string): { desde: number; hasta: number; meter: string } | null {
  if (viejo === nuevo) return null;
  let p = 0;
  const min = Math.min(viejo.length, nuevo.length);
  while (p < min && viejo.charCodeAt(p) === nuevo.charCodeAt(p)) p++;
  // (no se parte un emoji ni una letra de dos mitades por la mitad)
  if (p > 0 && p < min && isLow(viejo.charCodeAt(p))) p--;
  let s = 0;
  while (s < min - p && viejo.charCodeAt(viejo.length - 1 - s) === nuevo.charCodeAt(nuevo.length - 1 - s)) s++;
  if (s > 0 && s < min - p && isLow(viejo.charCodeAt(viejo.length - s))) s--;
  return { desde: p, hasta: viejo.length - s, meter: nuevo.slice(p, nuevo.length - s) };
}
function isLow(c: number): boolean {
  return c >= 0xdc00 && c <= 0xdfff;
}
