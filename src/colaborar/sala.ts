/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LAS SALAS DE «PROGRAMAR JUNTOS»: los códigos, los nombres de animal y lo que se guarda en este navegador.
 *
 * SEGURIDAD (lo usan chavales):
 *   - Se entra solo con el código de la sala: 9 letras y números al azar (más de 26 billones de
 *     combinaciones). No hay ninguna lista de salas: si no te pasan el código, no la encuentras.
 *   - Nadie escribe su nombre: cada uno es un animal de un color («Zorro naranja»), elegido al azar. Lo
 *     que llega de los demás se comprueba: si un nombre no es de la lista, sale «Invitado».
 *   - No hay chat.
 */

/** Las letras de los códigos: sin las que se confunden (0 y O, 1, I y L). */
export const ALFABETO_CODIGO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const LARGO_CODIGO = 9;

function azar(n: number, alfabeto: string): string {
  const bytes = new Uint8Array(n * 2);
  crypto.getRandomValues(bytes);
  let r = '';
  for (let i = 0; r.length < n; i++) {
    if (i >= bytes.length) {
      crypto.getRandomValues(bytes);
      i = 0;
    }
    // (se descartan los números que harían que unas letras salgan más que otras)
    const b = bytes[i];
    if (b < 256 - (256 % alfabeto.length)) r += alfabeto[b % alfabeto.length];
  }
  return r;
}

export function nuevoCodigo(): string {
  return azar(LARGO_CODIGO, ALFABETO_CODIGO);
}

/** La clave del dueño de la sala (solo la tiene su editor; con ella puede echar a gente y cerrar la sala). */
export function nuevaClave(): string {
  return azar(40, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
}

/** Lo que escribe la persona → el código (sin guiones ni espacios, en mayúsculas). null si no vale. */
export function leerCodigo(texto: string): string | null {
  const limpio = texto.toUpperCase().replace(/[\s\-_.]/g, '');
  if (limpio.length !== LARGO_CODIGO) return null;
  return [...limpio].every((c) => ALFABETO_CODIGO.includes(c)) ? limpio : null;
}

/** K7QMX4P2R → K7Q-MX4-P2R (más fácil de leer en voz alta en clase). */
export function mostrarCodigo(codigo: string): string {
  return codigo.match(/.{1,3}/g)?.join('-') ?? codigo;
}

// ───────────────────────── Nombres de animal ─────────────────────────

export const ANIMALES = ['Zorro', 'Gato', 'Perro', 'Búho', 'Pulpo', 'Panda', 'Tigre', 'León', 'Koala', 'Delfín', 'Pingüino', 'Lobo', 'Oso', 'Conejo', 'Erizo', 'Tortuga', 'Ardilla', 'Loro', 'Mapache', 'Ballena', 'Dragón', 'Gallo', 'Rana', 'Foca'];
/** Colores que valen igual para «el Zorro» y «la Rana» (sin -o/-a). */
export const COLORES: { nombre: string; color: string }[] = [
  { nombre: 'naranja', color: '#ff9f45' },
  { nombre: 'azul', color: '#4aa3ff' },
  { nombre: 'verde', color: '#5ad17a' },
  { nombre: 'violeta', color: '#b57cff' },
  { nombre: 'escarlata', color: '#ff6b6b' },
  { nombre: 'turquesa', color: '#3ad6c9' },
  { nombre: 'rosa', color: '#ff7eb6' },
];

export interface Yo {
  nombre: string;
  color: string;
}

export function nombreAlAzar(): Yo {
  const b = new Uint8Array(2);
  crypto.getRandomValues(b);
  const c = COLORES[b[1] % COLORES.length];
  return { nombre: `${ANIMALES[b[0] % ANIMALES.length]} ${c.nombre}`, color: c.color };
}

const NOMBRES_VALIDOS = new Set(ANIMALES.flatMap((a) => COLORES.map((c) => `${a} ${c.nombre}`)));
const COLORES_VALIDOS = new Set(COLORES.map((c) => c.color));

/** Lo que llega de otro editor se comprueba: solo nombres y colores de la lista. */
export function nombreSeguro(n: unknown): string {
  return typeof n === 'string' && NOMBRES_VALIDOS.has(n) ? n : 'Invitado';
}
export function colorSeguro(c: unknown): string {
  return typeof c === 'string' && COLORES_VALIDOS.has(c) ? c : '#9aa3b3';
}

// ───────────────────────── Lo que se guarda en este navegador ─────────────────────────

const CLAVE_APARATO = 'chispa-juntos:aparato';
const CLAVE_SALAS = 'chispa-juntos:salas';
const CLAVE_YO = 'chispa-juntos:yo';

/** Un número al azar de este navegador (si te echan de una sala, no puedes volver a entrar desde aquí). */
export function aparato(): string {
  try {
    const guardado = localStorage.getItem(CLAVE_APARATO);
    if (guardado && /^[a-z0-9]{24}$/.test(guardado)) return guardado;
    const nuevo = azar(24, 'abcdefghijklmnopqrstuvwxyz0123456789');
    localStorage.setItem(CLAVE_APARATO, nuevo);
    return nuevo;
  } catch {
    return azar(24, 'abcdefghijklmnopqrstuvwxyz0123456789');
  }
}

/** Tu animal (se recuerda para que en clase siempre seas el mismo). */
export function cargarYo(): Yo {
  try {
    const y = JSON.parse(localStorage.getItem(CLAVE_YO) ?? 'null') as Yo | null;
    if (y && NOMBRES_VALIDOS.has(y.nombre) && COLORES_VALIDOS.has(y.color)) return y;
  } catch {
    /* nada guardado */
  }
  const y = nombreAlAzar();
  guardarYo(y);
  return y;
}
export function guardarYo(y: Yo): void {
  try {
    localStorage.setItem(CLAVE_YO, JSON.stringify(y));
  } catch {
    /* el navegador no deja guardar: da igual */
  }
}

/** Las salas que has creado tú (su clave de dueño), para volver a entrar como dueño. Como mucho 20. */
export function claveDeSala(codigo: string): string | null {
  try {
    const salas = JSON.parse(localStorage.getItem(CLAVE_SALAS) ?? '{}') as Record<string, string>;
    const c = salas[codigo];
    return typeof c === 'string' && /^[A-Za-z0-9]{40}$/.test(c) ? c : null;
  } catch {
    return null;
  }
}
export function guardarClaveDeSala(codigo: string, clave: string | null): void {
  try {
    const salas = JSON.parse(localStorage.getItem(CLAVE_SALAS) ?? '{}') as Record<string, string>;
    delete salas[codigo];
    if (clave) salas[codigo] = clave;
    const lista = Object.entries(salas).slice(-20);
    localStorage.setItem(CLAVE_SALAS, JSON.stringify(Object.fromEntries(lista)));
  } catch {
    /* el navegador no deja guardar: al volver no serás el dueño */
  }
}

// ───────────────────────── Lo que dice la sala ─────────────────────────

/** Los mismos números que el servidor (servidor-salas/src/logica.ts; un test comprueba que coinciden). */
export const CIERRE = {
  codigoMalo: 4400,
  echado: 4401,
  cerrada: 4402,
  prohibido: 4403,
  noExiste: 4404,
  llena: 4405,
  bloqueada: 4406,
  demasiadoGrande: 4409,
  mensajeRaro: 4410,
} as const;
export const MENSAJE = { orden: 60, aviso: 61 } as const;
export const ORDEN = { echar: 1, bloquear: 2, cerrar: 3 } as const;

export const MOTIVOS: Record<number, string> = {
  [CIERRE.codigoMalo]: 'Ese código de sala no es válido.',
  [CIERRE.echado]: 'El dueño de la sala te ha sacado.',
  [CIERRE.cerrada]: 'El dueño ha cerrado la sala.',
  [CIERRE.prohibido]: 'No tienes permiso para entrar así en esta sala.',
  [CIERRE.noExiste]: 'No hay ninguna sala con ese código. Comprueba que está bien escrito.',
  [CIERRE.llena]: 'La sala está llena (como mucho entran 12).',
  [CIERRE.bloqueada]: 'La sala tiene puesto el candado: el dueño no deja entrar a nadie más.',
  [CIERRE.demasiadoGrande]: 'El proyecto es demasiado grande para programar juntos (como mucho, unos 20 MB: suelen ser las imágenes y los sonidos).',
  [CIERRE.mensajeRaro]: 'Algo ha ido mal con la conexión a la sala.',
};

/** Lo que puede ocupar un proyecto para crear una sala con él. */
export const MAXIMO_PROYECTO_SALA = 20 * 1024 * 1024;
