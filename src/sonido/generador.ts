/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * GENERADOR DE EFECTOS DE SONIDO: hace sonidos de videojuego (saltos,
 * monedas, explosiones, disparos...) a partir de unos pocos números, sin
 * micrófono ni archivos. Es la misma idea que el programa «sfxr» de Tomas
 * Pettersson (un oscilador + una envolvente + unos cuantos trucos), escrita
 * de cero para Chispa y con los datos en unidades que se entienden:
 * segundos, hercios y semitonos.
 *
 * Cómo se hace un sonido, muestra a muestra:
 *   1. Un OSCILADOR da la onda (cuadrada, sierra, seno, triángulo o ruido)
 *      a una frecuencia que puede deslizarse, vibrar, dar un salto (como el
 *      «tilín» de una moneda) y volver a empezar cada cierto tiempo.
 *   2. Dos FILTROS quitan agudos o graves (una explosión es ruido sin agudos).
 *   3. Un ECO muy corto la mezcla con ella misma un poco retrasada (suena a láser).
 *   4. La ENVOLVENTE da el volumen en cada momento: sube (ataque), se mantiene
 *      (sostenido, con un «golpe» de fuerza al principio) y se apaga (caída).
 *
 * Con los mismos números sale SIEMPRE el mismo sonido (el ruido usa su propia
 * semilla): lo que se oye en el editor es lo que se guarda.
 */

export const ONDAS = ['cuadrada', 'sierra', 'seno', 'triangulo', 'ruido'] as const;
export type Onda = (typeof ONDAS)[number];

export interface ParamsSonido {
  onda: Onda;
  /** Segundos que tarda en subir el volumen. */
  ataque: number;
  /** Segundos que se mantiene. */
  sostenido: number;
  /** Fuerza extra al principio del sostenido, de 0 a 1 (un golpe seco). */
  golpe: number;
  /** Segundos que tarda en apagarse. */
  caida: number;
  /** La nota: hercios (440 = La). */
  frecuencia: number;
  /** Si la frecuencia baja de aquí, el sonido se corta (0 = no se corta). */
  frecuenciaMinima: number;
  /** Cuánto sube (+) o baja (-) la nota: octavas por segundo. */
  deslizar: number;
  /** Cuánto cambia ese deslizar: octavas por segundo, cada segundo. */
  acelerar: number;
  /** Vibrato: cuánto tiembla la nota (semitonos) y cuántas veces por segundo. */
  vibrato: number;
  velocidadVibrato: number;
  /** Un salto de nota (semitonos) al pasar estos segundos (0 = sin salto). */
  salto: number;
  cuandoSalta: number;
  /** Solo en la onda cuadrada: su ancho (0.5 = cuadrada del todo) y cuánto cambia por segundo. */
  ancho: number;
  cambioAncho: number;
  /** Cada cuántos segundos vuelve a empezar la nota (0 = no se repite). */
  repetir: number;
  /** Eco muy corto (milisegundos) y cuánto cambia por segundo: suena a láser o a avión. */
  eco: number;
  cambioEco: number;
  /** Quitar agudos: por encima de estos hercios se apaga (20000 = no quita nada). Y cuánto se mueve: octavas por segundo. */
  quitarAgudos: number;
  cambioAgudos: number;
  /** Cuánto «silba» el filtro en su frecuencia, de 0 a 1. */
  resonancia: number;
  /** Quitar graves: por debajo de estos hercios se apaga (0 = no quita nada). Y cuánto se mueve. */
  quitarGraves: number;
  cambioGraves: number;
  /** De 0 a 1. */
  volumen: number;
  /** La semilla del ruido (para que el mismo sonido suene siempre igual). */
  semilla: number;
}

/** Entre qué valores puede estar cada dato (para los deslizadores, para validar y para mutar). */
export const LIMITES_SONIDO: Record<Exclude<keyof ParamsSonido, 'onda'>, [number, number]> = {
  ataque: [0, 1],
  sostenido: [0, 1.5],
  golpe: [0, 1],
  caida: [0, 2],
  frecuencia: [30, 4000],
  frecuenciaMinima: [0, 2000],
  deslizar: [-8, 8],
  acelerar: [-16, 16],
  vibrato: [0, 12],
  velocidadVibrato: [0, 40],
  salto: [-24, 24],
  cuandoSalta: [0, 1],
  ancho: [0.05, 0.95],
  cambioAncho: [-2, 2],
  repetir: [0, 1],
  eco: [0, 20],
  cambioEco: [-40, 40],
  quitarAgudos: [100, 20000],
  cambioAgudos: [-8, 8],
  resonancia: [0, 0.95],
  quitarGraves: [0, 8000],
  cambioGraves: [-8, 8],
  volumen: [0, 1],
  semilla: [0, 0xffffffff],
};

/** Un sonido «neutro»: un pitido corto. Lo que no diga un sonido, sale de aquí. */
export const SONIDO_BASE: ParamsSonido = {
  onda: 'cuadrada',
  ataque: 0, sostenido: 0.1, golpe: 0, caida: 0.2,
  frecuencia: 440, frecuenciaMinima: 0, deslizar: 0, acelerar: 0,
  vibrato: 0, velocidadVibrato: 0,
  salto: 0, cuandoSalta: 0,
  ancho: 0.5, cambioAncho: 0,
  repetir: 0,
  eco: 0, cambioEco: 0,
  quitarAgudos: 20000, cambioAgudos: 0, resonancia: 0,
  quitarGraves: 0, cambioGraves: 0,
  volumen: 0.5,
  semilla: 1,
};

/** Muestras por segundo de los sonidos generados. */
export const FRECUENCIA_MUESTREO = 44100;
/** Lo más que puede durar un sonido generado (segundos). */
export const DURACION_MAXIMA = 4;

const entre = (v: number, min: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);

/** Deja cada dato dentro de sus límites (y pone los que falten). */
export function completarSonido(p: Partial<ParamsSonido>): ParamsSonido {
  const r = { ...SONIDO_BASE };
  if (p.onda && (ONDAS as readonly string[]).includes(p.onda)) r.onda = p.onda;
  for (const k of Object.keys(LIMITES_SONIDO) as (keyof typeof LIMITES_SONIDO)[]) {
    const v = p[k];
    if (typeof v === 'number') r[k] = entre(v, LIMITES_SONIDO[k][0], LIMITES_SONIDO[k][1]);
  }
  return r;
}

/** Cuánto dura un sonido (segundos). */
export function duracionDe(p: ParamsSonido): number {
  return Math.min(DURACION_MAXIMA, Math.max(0.02, p.ataque + p.sostenido + p.caida));
}

/** Un generador de números al azar con semilla (para el ruido). */
function azarCon(semilla: number): () => number {
  let s = semilla | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hace el sonido: sus muestras, de -1 a 1, a FRECUENCIA_MUESTREO por segundo.
 * Por dentro se calcula al cuádruple de muestras y se promedia, para que los
 * agudos no «chirríen» (el aliasing de las ondas cuadradas y de sierra).
 */
export function generarSonido(datos: Partial<ParamsSonido>, frecuenciaMuestreo = FRECUENCIA_MUESTREO): Float32Array {
  const p = completarSonido(datos);
  const SOBRE = 4;
  const dt = 1 / (frecuenciaMuestreo * SOBRE);
  const total = Math.max(1, Math.round(duracionDe(p) * frecuenciaMuestreo));
  const salida = new Float32Array(total);
  const azar = azarCon(p.semilla);

  // El oscilador
  let fase = 0;
  let frecuencia = p.frecuencia;
  let deslizar = p.deslizar;
  let ancho = p.ancho;
  let tiempoNota = 0; // desde que empezó (o se repitió) la nota
  let saltado = false;
  // El ruido: 32 valores que se cambian en cada vuelta de la onda (así el ruido también tiene «nota»)
  const ruido = new Float32Array(32);
  const nuevoRuido = () => {
    for (let i = 0; i < 32; i++) ruido[i] = azar() * 2 - 1;
  };
  nuevoRuido();

  // Los filtros (de «variable de estado»: baratos y estables)
  let grave = 0;
  let banda = 0;
  let corteAgudos = p.quitarAgudos;
  let corteGraves = p.quitarGraves;
  let previaAgudos = 0;
  let salidaAgudos = 0;

  // El eco: una memoria de las últimas muestras
  const memoria = new Float32Array(2048);
  let iMemoria = 0;
  let eco = p.eco;

  let cortado = false;
  for (let i = 0; i < total && !cortado; i++) {
    const t = i / frecuenciaMuestreo;
    // 4. La envolvente
    let volumen: number;
    if (t < p.ataque) volumen = t / p.ataque;
    else if (t < p.ataque + p.sostenido) volumen = 1 + p.golpe * (1 - (t - p.ataque) / p.sostenido);
    else volumen = Math.max(0, 1 - (t - p.ataque - p.sostenido) / Math.max(1e-4, p.caida));

    let suma = 0;
    for (let s = 0; s < SOBRE; s++) {
      // 1. La nota: se repite, se desliza, salta y vibra
      tiempoNota += dt;
      if (p.repetir > 0 && tiempoNota >= p.repetir) {
        tiempoNota = 0;
        frecuencia = p.frecuencia;
        deslizar = p.deslizar;
        ancho = p.ancho;
        saltado = false;
      }
      deslizar += p.acelerar * dt;
      frecuencia *= Math.pow(2, deslizar * dt);
      if (!saltado && p.cuandoSalta > 0 && p.salto !== 0 && tiempoNota >= p.cuandoSalta) {
        saltado = true;
        frecuencia *= Math.pow(2, p.salto / 12);
      }
      if (frecuencia > 20000) frecuencia = 20000;
      if (p.frecuenciaMinima > 0 && frecuencia < p.frecuenciaMinima) {
        cortado = true;
        break;
      }
      if (frecuencia < 5) frecuencia = 5;
      let f = frecuencia;
      if (p.vibrato > 0 && p.velocidadVibrato > 0) f *= Math.pow(2, (p.vibrato / 12) * Math.sin(2 * Math.PI * p.velocidadVibrato * (t + s * dt)));
      ancho = entre(ancho + p.cambioAncho * dt, 0.02, 0.98);

      fase += f * dt;
      if (fase >= 1) {
        fase -= Math.floor(fase);
        if (p.onda === 'ruido') nuevoRuido();
      }
      let muestra: number;
      switch (p.onda) {
        case 'cuadrada': muestra = fase < ancho ? 0.5 : -0.5; break;
        case 'sierra': muestra = 1 - fase * 2; break;
        case 'seno': muestra = Math.sin(fase * 2 * Math.PI); break;
        case 'triangulo': muestra = fase < 0.5 ? fase * 4 - 1 : 3 - fase * 4; break;
        default: muestra = ruido[Math.floor(fase * 32) & 31];
      }

      // 2. Los filtros
      if (p.quitarAgudos < 19999 || p.cambioAgudos !== 0) {
        corteAgudos = entre(corteAgudos * Math.pow(2, p.cambioAgudos * dt), 20, 20000);
        const k = Math.min(0.99, 2 * Math.sin((Math.PI * Math.min(corteAgudos, 1 / dt / 6)) * dt));
        const q = 1 - p.resonancia * 0.98;
        grave += k * banda;
        banda += k * (muestra - grave - q * banda);
        muestra = grave;
      }
      if (p.quitarGraves > 0 || p.cambioGraves !== 0) {
        corteGraves = entre(corteGraves * Math.pow(2, p.cambioGraves * dt), 1, 16000);
        const a = 1 / (1 + 2 * Math.PI * corteGraves * dt);
        salidaAgudos = a * (salidaAgudos + muestra - previaAgudos);
        previaAgudos = muestra;
        muestra = salidaAgudos;
      }

      // 3. El eco
      if (p.eco > 0 || p.cambioEco !== 0) {
        eco = entre(eco + p.cambioEco * dt, 0, 20);
        memoria[iMemoria & 2047] = muestra;
        const atras = Math.min(2047, Math.round((eco / 1000) / dt));
        muestra += memoria[(iMemoria - atras + 2048) & 2047];
        iMemoria++;
      }
      suma += muestra;
    }
    // Si se pasa de fuerte, se aplasta con suavidad (tanh) en vez de recortarse en seco
    salida[i] = Math.tanh((suma / SOBRE) * volumen * p.volumen * 1.8);
  }
  // Un final suave (5 milésimas): que no haga «clic» al cortarse
  const fin = Math.min(total, Math.round(frecuenciaMuestreo * 0.005));
  for (let i = 0; i < fin; i++) salida[total - 1 - i] *= i / fin;
  return salida;
}

// ───────────────────────── Guardarlo como archivo WAV ─────────────────────────

/** Las muestras como un archivo WAV (16 bits, un canal). */
export function aWAV(muestras: Float32Array, frecuenciaMuestreo = FRECUENCIA_MUESTREO): Uint8Array {
  const bytes = new Uint8Array(44 + muestras.length * 2);
  const v = new DataView(bytes.buffer);
  const texto = (en: number, t: string) => [...t].forEach((c, i) => v.setUint8(en + i, c.charCodeAt(0)));
  texto(0, 'RIFF');
  v.setUint32(4, 36 + muestras.length * 2, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  v.setUint32(16, 16, true); // tamaño del bloque de formato
  v.setUint16(20, 1, true); // sin comprimir (PCM)
  v.setUint16(22, 1, true); // un canal
  v.setUint32(24, frecuenciaMuestreo, true);
  v.setUint32(28, frecuenciaMuestreo * 2, true); // bytes por segundo
  v.setUint16(32, 2, true); // bytes por muestra
  v.setUint16(34, 16, true); // bits por muestra
  texto(36, 'data');
  v.setUint32(40, muestras.length * 2, true);
  for (let i = 0; i < muestras.length; i++) v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, muestras[i])) * 32767), true);
  return bytes;
}

/** Bytes → "data:audio/wav;base64,..." (como van los sonidos en un proyecto). */
export function aDataURL(bytes: Uint8Array, tipo = 'audio/wav'): string {
  let binario = '';
  const TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TROZO) binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  return `data:${tipo};base64,${btoa(binario)}`;
}

// ───────────────────────── Sonidos listos ─────────────────────────

export const TIPOS_DE_SONIDO = ['salto', 'moneda', 'explosion', 'disparo', 'golpe', 'powerup', 'menu', 'aleatorio'] as const;
export type TipoDeSonido = (typeof TIPOS_DE_SONIDO)[number];

/** Cómo se llama cada uno en los botones. */
export const NOMBRES_TIPOS_SONIDO: Record<TipoDeSonido, string> = {
  salto: 'Salto', moneda: 'Moneda', explosion: 'Explosión', disparo: 'Disparo', golpe: 'Golpe', powerup: 'Power-up', menu: 'Menú', aleatorio: 'Aleatorio',
};

/**
 * Un sonido nuevo de ese tipo. Cada vez sale uno distinto (con el azar que se
 * le da): se pulsa el botón hasta que sale uno que gusta.
 */
export function sonidoDeTipo(tipo: TipoDeSonido, azar: () => number = Math.random): ParamsSonido {
  const r = (min: number, max: number) => min + azar() * (max - min);
  const elegir = <T>(...opciones: T[]): T => opciones[Math.floor(azar() * opciones.length) % opciones.length];
  const si = (probabilidad: number) => azar() < probabilidad;
  const semilla = Math.floor(azar() * 0xffffffff);
  const p: Partial<ParamsSonido> = { semilla };
  switch (tipo) {
    case 'salto':
      Object.assign(p, { onda: elegir<Onda>('cuadrada', 'cuadrada', 'triangulo'), ancho: r(0.3, 0.6), frecuencia: r(220, 480), deslizar: r(2.5, 6), sostenido: r(0.08, 0.22), caida: r(0.08, 0.2) });
      if (si(0.4)) p.quitarGraves = r(100, 500);
      if (si(0.3)) p.acelerar = r(-6, 0);
      break;
    case 'moneda':
      Object.assign(p, { onda: elegir<Onda>('cuadrada', 'cuadrada', 'seno'), ancho: 0.5, frecuencia: r(700, 1500), sostenido: r(0.04, 0.1), golpe: r(0.3, 0.6), caida: r(0.15, 0.4), salto: elegir(4, 5, 7, 12), cuandoSalta: r(0.04, 0.09) });
      break;
    case 'explosion':
      Object.assign(p, { onda: 'ruido', frecuencia: r(60, 500), deslizar: r(-2.5, 0.2), sostenido: r(0.1, 0.35), golpe: r(0.2, 0.7), caida: r(0.3, 0.9), quitarAgudos: r(1500, 9000), cambioAgudos: r(-4, -0.5), volumen: 0.7 });
      if (si(0.4)) Object.assign(p, { eco: r(2, 12), cambioEco: r(-10, 10) });
      if (si(0.3)) Object.assign(p, { vibrato: r(1, 6), velocidadVibrato: r(5, 25) });
      if (si(0.3)) p.repetir = r(0.05, 0.3);
      break;
    case 'disparo':
      Object.assign(p, { onda: elegir<Onda>('cuadrada', 'sierra', 'cuadrada'), ancho: r(0.2, 0.6), cambioAncho: r(-1.5, 0.3), frecuencia: r(500, 1800), frecuenciaMinima: r(60, 250), deslizar: r(-7, -3), sostenido: r(0.05, 0.18), caida: r(0.05, 0.25) });
      if (si(0.4)) Object.assign(p, { eco: r(1, 6), cambioEco: r(-15, 0) });
      if (si(0.5)) p.quitarGraves = r(100, 1200);
      break;
    case 'golpe':
      Object.assign(p, { onda: elegir<Onda>('ruido', 'ruido', 'sierra', 'cuadrada'), frecuencia: r(200, 800), deslizar: r(-6, -2.5), sostenido: r(0.01, 0.06), golpe: r(0.2, 0.6), caida: r(0.06, 0.2), volumen: 0.6 });
      if (si(0.5)) p.quitarGraves = r(50, 600);
      break;
    case 'powerup':
      Object.assign(p, { onda: elegir<Onda>('cuadrada', 'sierra', 'triangulo'), ancho: r(0.3, 0.6), frecuencia: r(250, 600), deslizar: r(0.8, 3), sostenido: r(0.2, 0.45), caida: r(0.2, 0.5) });
      if (si(0.6)) p.repetir = r(0.06, 0.16);
      else Object.assign(p, { vibrato: r(1, 5), velocidadVibrato: r(6, 16) });
      break;
    case 'menu':
      Object.assign(p, { onda: elegir<Onda>('cuadrada', 'seno', 'triangulo'), ancho: r(0.3, 0.6), frecuencia: r(400, 1100), sostenido: r(0.02, 0.06), caida: r(0.03, 0.1), quitarGraves: 100, volumen: 0.4 });
      if (si(0.4)) Object.assign(p, { salto: elegir(-5, 5, 7, 12), cuandoSalta: r(0.02, 0.04) });
      break;
    default:
      // Todo al azar (pero que se oiga y no dure demasiado)
      Object.assign(p, {
        onda: elegir<Onda>(...ONDAS), ancho: r(0.1, 0.9), cambioAncho: si(0.3) ? r(-1.5, 1.5) : 0,
        frecuencia: 60 * Math.pow(2, r(0, 5)), deslizar: si(0.7) ? r(-5, 5) : 0, acelerar: si(0.3) ? r(-8, 8) : 0,
        ataque: si(0.25) ? r(0, 0.2) : 0, sostenido: r(0.03, 0.4), golpe: si(0.4) ? r(0, 0.7) : 0, caida: r(0.05, 0.6),
        vibrato: si(0.3) ? r(0.5, 8) : 0, velocidadVibrato: r(3, 30),
        salto: si(0.3) ? elegir(-12, -7, -5, 4, 5, 7, 12) : 0, cuandoSalta: r(0.03, 0.2),
        repetir: si(0.25) ? r(0.04, 0.4) : 0,
        eco: si(0.25) ? r(0.5, 12) : 0, cambioEco: si(0.25) ? r(-20, 20) : 0,
        quitarAgudos: si(0.3) ? r(800, 10000) : 20000, cambioAgudos: si(0.3) ? r(-4, 2) : 0, resonancia: si(0.2) ? r(0, 0.7) : 0,
        quitarGraves: si(0.3) ? r(50, 1500) : 0,
      });
  }
  return completarSonido(p);
}

/** El mismo sonido, cambiado un poquito (para buscar variaciones de uno que casi gusta). */
export function mutarSonido(p: ParamsSonido, azar: () => number = Math.random, cuanto = 0.08): ParamsSonido {
  const r = { ...p };
  for (const k of Object.keys(LIMITES_SONIDO) as (keyof typeof LIMITES_SONIDO)[]) {
    if (k === 'semilla' || k === 'volumen') continue;
    if (azar() > 0.5) continue;
    const [min, max] = LIMITES_SONIDO[k];
    // Lo que está apagado (a cero) se queda apagado: mutar no inventa efectos nuevos
    if (p[k] === 0 && min <= 0 && k !== 'deslizar') continue;
    if (k === 'quitarAgudos' && p[k] >= 19999) continue;
    // Las frecuencias cambian en proporción (un 8 % es lo mismo arriba que abajo); el resto, un trozo de su recorrido
    const esFrecuencia = k === 'frecuencia' || k === 'quitarAgudos' || k === 'quitarGraves' || k === 'frecuenciaMinima';
    r[k] = esFrecuencia ? p[k] * Math.pow(2, (azar() * 2 - 1) * cuanto * 6) : p[k] + (azar() * 2 - 1) * cuanto * (max - min);
  }
  return completarSonido(r);
}
