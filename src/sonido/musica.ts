/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * MÚSICA HECHA EN CHISPA: canciones escritas en una rejilla de notas (un
 * «secuenciador») y tocadas con instrumentos GENERADOS, sin archivos.
 *
 * Una canción tiene un tempo (pulsos por minuto), un número de pasos (cada
 * pulso son 4 pasos) y varias pistas. Cada pista tiene un instrumento y sus
 * notas: en qué paso empieza cada una, qué nota es y cuántos pasos dura.
 *
 * En el proyecto se guardan solo las notas (ocupa muy poco). Al cargar el
 * juego, cada pista se convierte en sonido (sus muestras) una sola vez; las
 * pistas suenan a la vez, cada una con su volumen, y por eso se pueden subir
 * y bajar mientras se juega (música adaptativa: musica.capa, musica.intensidad).
 *
 * Las notas son números «MIDI»: 60 es el Do central, 61 el Do sostenido,
 * 72 el Do de la octava de arriba. En la batería, la «nota» dice qué tambor.
 */

export const INSTRUMENTOS = ['piano', 'chip', 'sierra', 'flauta', 'organo', 'campana', 'bajo', 'bateria'] as const;
export type Instrumento = (typeof INSTRUMENTOS)[number];

/** Cómo se llama cada instrumento en el editor. */
export const NOMBRES_INSTRUMENTOS: Record<Instrumento, string> = {
  piano: 'Piano', chip: 'Chip (8 bits)', sierra: 'Sintetizador', flauta: 'Flauta', organo: 'Órgano', campana: 'Campana', bajo: 'Bajo', bateria: 'Batería',
};

/** Los tambores de la batería (su «nota» es su posición aquí). */
export const TAMBORES = ['bombo', 'caja', 'charles', 'plato', 'tom'] as const;

export interface NotaCancion {
  /** En qué paso empieza (el primero es el 0). */
  paso: number;
  /** Qué nota (MIDI: 60 = Do central) o, en la batería, qué tambor. */
  nota: number;
  /** Cuántos pasos dura. */
  largo: number;
}

export interface PistaCancion {
  instrumento: Instrumento;
  /** De 0 a 1. */
  volumen: number;
  notas: NotaCancion[];
}

export interface DefCancion {
  /** Pulsos por minuto. */
  tempo: number;
  /** Cuántos pasos dura (4 pasos = un pulso). */
  pasos: number;
  pistas: PistaCancion[];
  /** Si se repite al acabar (lo normal en la música de un juego). */
  bucle?: boolean;
}

export const LIMITES_CANCION = { tempoMin: 40, tempoMax: 240, pasosMin: 4, pasosMax: 256, pistas: 8, notasPorPista: 2000, notaMin: 24, notaMax: 96 };
export const PASOS_POR_PULSO = 4;
/** Muestras por segundo de la música generada (32000 suena bien y ocupa menos que 44100). */
export const FRECUENCIA_MUSICA = 32000;

export function cancionVacia(): DefCancion {
  return { tempo: 120, pasos: 32, bucle: true, pistas: [{ instrumento: 'piano', volumen: 0.8, notas: [] }] };
}

/** Segundos que dura un paso, y la canción entera. */
export const segundosPorPaso = (c: DefCancion) => 60 / c.tempo / PASOS_POR_PULSO;
export const duracionDeCancion = (c: DefCancion) => c.pasos * segundosPorPaso(c);

/** Nota MIDI → hercios (69 = La = 440). */
export const frecuenciaDeNota = (nota: number) => 440 * Math.pow(2, (nota - 69) / 12);

const NOMBRES_NOTAS = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
/** 60 → "Do4" (como se llama en España: Do Re Mi...). */
export const nombreDeNota = (nota: number) => `${NOMBRES_NOTAS[((nota % 12) + 12) % 12]}${Math.floor(nota / 12) - 1}`;

/** Escalas: qué notas de las 12 «suenan bien juntas». Con una escala puesta, es difícil que algo suene mal. */
export const ESCALAS: Record<string, number[]> = {
  mayor: [0, 2, 4, 5, 7, 9, 11],
  menor: [0, 2, 3, 5, 7, 8, 10],
  pentatonica: [0, 2, 4, 7, 9],
  todas: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

/** Las notas de una escala entre dos notas (de la más aguda a la más grave: así se pintan en la rejilla). */
export function notasDeEscala(escala: string, desde = 48, hasta = 84): number[] {
  const grados = ESCALAS[escala] ?? ESCALAS.todas;
  const r: number[] = [];
  for (let n = hasta; n >= desde; n--) if (grados.includes(n % 12)) r.push(n);
  return r;
}

// ───────────────────────── Los instrumentos ─────────────────────────

/** Quita el escalón de las ondas cuadradas y de sierra, para que los agudos no chirríen («PolyBLEP»). */
function suavizar(fase: number, paso: number): number {
  if (fase < paso) {
    const t = fase / paso;
    return t + t - t * t - 1;
  }
  if (fase > 1 - paso) {
    const t = (fase - 1) / paso;
    return t * t + t + t + 1;
  }
  return 0;
}

/** Cuánto sigue sonando una nota después de soltarla (segundos), según el instrumento. */
const COLA: Record<Instrumento, number> = { piano: 0.35, chip: 0.03, sierra: 0.12, flauta: 0.1, organo: 0.06, campana: 1.2, bajo: 0.08, bateria: 0 };

/**
 * Añade una nota a las muestras de una pista. `inicio` y `duracion` en
 * segundos. Si la nota se sale por el final y la canción va en bucle, lo que
 * sobra se suma al principio (así el bucle no tiene «costura»).
 */
function tocarNota(salida: Float32Array, frecuenciaMuestreo: number, instrumento: Instrumento, frecuencia: number, inicio: number, duracion: number, volumen: number, bucle: boolean): void {
  const cola = COLA[instrumento];
  const total = Math.ceil((duracion + cola) * frecuenciaMuestreo);
  const desde = Math.round(inicio * frecuenciaMuestreo);
  const paso = frecuencia / frecuenciaMuestreo;
  const dt = 1 / frecuenciaMuestreo;
  let fase = 0;
  let fase2 = 0;
  for (let i = 0; i < total; i++) {
    const t = i * dt;
    // Soltar la nota: baja hasta callarse en lo que dura su cola
    const soltar = t > duracion ? Math.max(0, 1 - (t - duracion) / Math.max(1e-4, cola)) : 1;
    let m: number;
    let env: number;
    switch (instrumento) {
      case 'piano': {
        // Varios armónicos que se apagan (los agudos, antes), con un ataque seco
        const a = Math.min(1, t / 0.004);
        const w = 2 * Math.PI * frecuencia * t;
        m = Math.sin(w) * Math.exp(-t * 2.2) + 0.5 * Math.sin(2 * w) * Math.exp(-t * 3.5) + 0.25 * Math.sin(3 * w) * Math.exp(-t * 5) + 0.12 * Math.sin(4 * w) * Math.exp(-t * 7);
        env = a * 0.6;
        break;
      }
      case 'chip': {
        // Onda cuadrada, como las consolas de 8 bits
        m = (fase < 0.5 ? 1 : -1) + suavizar(fase, paso) - suavizar((fase + 0.5) % 1, paso);
        env = Math.min(1, t / 0.002) * 0.32;
        break;
      }
      case 'sierra': {
        // Dos ondas de sierra un pelín desafinadas: suena «gordo»
        const s1 = 2 * fase - 1 - suavizar(fase, paso);
        const s2 = 2 * fase2 - 1 - suavizar(fase2, paso * 1.006);
        m = (s1 + s2) * 0.5;
        env = Math.min(1, t / 0.01) * (0.55 + 0.45 * Math.exp(-t * 3)) * 0.4;
        fase2 += paso * 1.006;
        if (fase2 >= 1) fase2 -= 1;
        break;
      }
      case 'flauta': {
        // Casi un seno, que entra despacio y tiembla un poco
        const vibra = 1 + 0.004 * Math.sin(2 * Math.PI * 5 * t) * Math.min(1, t / 0.25);
        const w = 2 * Math.PI * frecuencia * t * vibra;
        m = Math.sin(w) + 0.12 * Math.sin(2 * w) + 0.04 * Math.sin(3 * w);
        env = Math.min(1, t / 0.05) * 0.6;
        break;
      }
      case 'organo': {
        const w = 2 * Math.PI * frecuencia * t;
        m = Math.sin(w) + 0.5 * Math.sin(2 * w) + 0.3 * Math.sin(4 * w) + 0.15 * Math.sin(3 * w);
        env = Math.min(1, t / 0.012) * 0.38;
        break;
      }
      case 'campana': {
        // Un seno «movido» por otro (síntesis FM): el brillo metálico se apaga antes que la nota
        const w = 2 * Math.PI * frecuencia * t;
        m = Math.sin(w + 2.4 * Math.exp(-t * 3) * Math.sin(w * 3.5));
        env = Math.min(1, t / 0.002) * Math.exp(-t * 2.5) * 0.6;
        break;
      }
      default: {
        // Bajo: un triángulo con un poco de cuadrada, corto y seco
        const tri = fase < 0.5 ? fase * 4 - 1 : 3 - fase * 4;
        m = tri * 0.85 + ((fase < 0.5 ? 1 : -1) + suavizar(fase, paso) - suavizar((fase + 0.5) % 1, paso)) * 0.15;
        env = Math.min(1, t / 0.004) * (0.6 + 0.4 * Math.exp(-t * 6)) * 0.75;
      }
    }
    fase += paso;
    if (fase >= 1) fase -= 1;
    sumar(salida, desde + i, m * env * soltar * volumen, bucle);
  }
}

/** Suma un valor a una muestra; si se sale por el final y hay bucle, da la vuelta. */
function sumar(salida: Float32Array, i: number, v: number, bucle: boolean): void {
  if (i < salida.length) salida[i] += v;
  else if (bucle) salida[i % salida.length] += v;
}

/** Un golpe de batería. */
function tocarTambor(salida: Float32Array, frecuenciaMuestreo: number, tambor: number, inicio: number, volumen: number, bucle: boolean, azar: () => number): void {
  const desde = Math.round(inicio * frecuenciaMuestreo);
  const dt = 1 / frecuenciaMuestreo;
  const nombre = TAMBORES[tambor] ?? 'bombo';
  const dura = { bombo: 0.3, caja: 0.2, charles: 0.06, plato: 0.5, tom: 0.3 }[nombre];
  const total = Math.ceil(dura * frecuenciaMuestreo);
  let fase = 0;
  let previa = 0;
  let filtrada = 0;
  for (let i = 0; i < total; i++) {
    const t = i * dt;
    let m: number;
    if (nombre === 'bombo' || nombre === 'tom') {
      // Un seno que baja de tono muy deprisa
      const [f0, f1, k] = nombre === 'bombo' ? [160, 45, 28] : [260, 110, 14];
      fase += (f1 + (f0 - f1) * Math.exp(-t * k)) * dt;
      m = Math.sin(2 * Math.PI * fase) * Math.exp(-t * (nombre === 'bombo' ? 11 : 9)) * 0.95;
    } else {
      // Ruido, con los graves quitados (más cuanto más «metálico»)
      const ruido = azar() * 2 - 1;
      const a = nombre === 'caja' ? 0.55 : 0.12;
      filtrada = (1 - a) * (filtrada + ruido - previa);
      previa = ruido;
      const mezcla = nombre === 'caja' ? filtrada * 0.6 + ruido * 0.25 + Math.sin(2 * Math.PI * 190 * t) * 0.5 * Math.exp(-t * 30) : filtrada;
      m = mezcla * Math.exp(-t * { caja: 22, charles: 90, plato: 9 }[nombre as 'caja' | 'charles' | 'plato']) * (nombre === 'caja' ? 0.7 : 0.4);
    }
    sumar(salida, desde + i, m * volumen, bucle);
  }
}

/** Las muestras de UNA pista de la canción (a FRECUENCIA_MUSICA por segundo, de -1 a 1 más o menos). */
export function renderizarPista(c: DefCancion, pista: PistaCancion, frecuenciaMuestreo = FRECUENCIA_MUSICA): Float32Array {
  const salida = new Float32Array(Math.max(1, Math.round(duracionDeCancion(c) * frecuenciaMuestreo)));
  const paso = segundosPorPaso(c);
  const bucle = c.bucle !== false;
  // El ruido de la batería, siempre el mismo (para que la canción suene igual cada vez)
  let s = 12345;
  const azar = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (const n of pista.notas) {
    if (n.paso < 0 || n.paso >= c.pasos) continue;
    if (pista.instrumento === 'bateria') tocarTambor(salida, frecuenciaMuestreo, n.nota, n.paso * paso, pista.volumen, bucle, azar);
    else tocarNota(salida, frecuenciaMuestreo, pista.instrumento, frecuenciaDeNota(n.nota), n.paso * paso, Math.max(1, n.largo) * paso * 0.98, pista.volumen, bucle);
  }
  return salida;
}

/** Todas las pistas mezcladas (para escucharla en el editor o guardarla como un solo sonido). */
export function renderizarCancion(c: DefCancion, frecuenciaMuestreo = FRECUENCIA_MUSICA): Float32Array {
  const pistas = c.pistas.map((p) => renderizarPista(c, p, frecuenciaMuestreo));
  const salida = new Float32Array(pistas[0]?.length ?? 1);
  for (const p of pistas) for (let i = 0; i < salida.length; i++) salida[i] += p[i];
  // Varias pistas a la vez pueden pasarse de fuerte: se aplasta con suavidad
  for (let i = 0; i < salida.length; i++) salida[i] = Math.tanh(salida[i]);
  return salida;
}

// ───────────────────────── Escribir notas (lo usa el editor de música) ─────────────────────────

/** La nota de una pista que suena en ese paso y esa altura (o null). */
export function notaEn(pista: PistaCancion, paso: number, nota: number): NotaCancion | null {
  return pista.notas.find((n) => n.nota === nota && paso >= n.paso && paso < n.paso + Math.max(1, n.largo)) ?? null;
}

/**
 * Pone una nota (quitando lo que pisara a esa misma altura). Devuelve la
 * nota puesta, o null si no cabe (fuera de la canción o demasiadas notas).
 */
export function ponerNota(c: DefCancion, pista: PistaCancion, paso: number, nota: number, largo = 1): NotaCancion | null {
  if (paso < 0 || paso >= c.pasos) return null;
  const hasta = Math.min(c.pasos, paso + Math.max(1, Math.floor(largo)));
  pista.notas = pista.notas.filter((n) => n.nota !== nota || n.paso + Math.max(1, n.largo) <= paso || n.paso >= hasta);
  if (pista.notas.length >= LIMITES_CANCION.notasPorPista) return null;
  const nueva = { paso, nota, largo: pista.instrumento === 'bateria' ? 1 : hasta - paso };
  pista.notas.push(nueva);
  pista.notas.sort((a, b) => a.paso - b.paso || a.nota - b.nota);
  return nueva;
}

/** Quita la nota que suena en ese paso y esa altura. Devuelve si había una. */
export function quitarNota(pista: PistaCancion, paso: number, nota: number): boolean {
  const n = notaEn(pista, paso, nota);
  if (!n) return false;
  pista.notas = pista.notas.filter((x) => x !== n);
  return true;
}

/** Cambia los pasos que dura la canción (las notas que se quedan fuera se quitan; las que asoman se recortan). */
export function cambiarPasos(c: DefCancion, pasos: number): void {
  c.pasos = Math.max(LIMITES_CANCION.pasosMin, Math.min(LIMITES_CANCION.pasosMax, Math.floor(pasos)));
  for (const p of c.pistas) {
    p.notas = p.notas.filter((n) => n.paso < c.pasos);
    for (const n of p.notas) n.largo = Math.min(n.largo, c.pasos - n.paso);
  }
}

/** Una canción corta de ejemplo (melodía, bajo y batería), para ver cómo se hace una. */
export function cancionDeEjemplo(): DefCancion {
  const c: DefCancion = { tempo: 126, pasos: 32, bucle: true, pistas: [
    { instrumento: 'chip', volumen: 0.7, notas: [] },
    { instrumento: 'bajo', volumen: 0.8, notas: [] },
    { instrumento: 'bateria', volumen: 0.8, notas: [] },
  ] };
  // La melodía (en Do mayor pentatónica: suena alegre y no desafina)
  const melodia: [number, number, number][] = [[0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 76, 2], [8, 81, 3], [12, 79, 4], [16, 76, 2], [18, 74, 2], [20, 72, 2], [22, 74, 2], [24, 76, 3], [28, 72, 4]];
  for (const [paso, nota, largo] of melodia) ponerNota(c, c.pistas[0], paso, nota, largo);
  // El bajo: una nota larga cada dos pulsos
  [48, 48, 45, 45, 43, 43, 45, 45].forEach((nota, i) => ponerNota(c, c.pistas[1], i * 4, nota, 3));
  // La batería: bombo en los pulsos 1 y 3, caja en el 2 y el 4, charles todo el rato
  for (let paso = 0; paso < 32; paso += 2) ponerNota(c, c.pistas[2], paso, 2);
  for (let paso = 0; paso < 32; paso += 8) ponerNota(c, c.pistas[2], paso, 0);
  for (let paso = 4; paso < 32; paso += 8) ponerNota(c, c.pistas[2], paso, 1);
  return c;
}
