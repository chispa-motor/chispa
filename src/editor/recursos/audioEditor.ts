/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL ALTAVOZ DEL EDITOR: para escuchar los sonidos y las canciones mientras
 * se hacen (el generador de efectos y el editor de música). Es aparte del
 * sonido del juego: se puede escuchar sin tener el juego en marcha.
 */

let contexto: AudioContext | null = null;
let sonando: { fuente: AudioBufferSourceNode; empezo: number; dura: number; bucle: boolean } | null = null;

function obtener(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  contexto ??= new AudioContext();
  if (contexto.state === 'suspended') void contexto.resume();
  return contexto;
}

/** Calla lo que esté sonando en el editor. */
export function callar(): void {
  try {
    sonando?.fuente.stop();
  } catch {
    // ya había acabado
  }
  sonando = null;
}

/** Toca unas muestras (callando lo anterior). Devuelve falso si este navegador no tiene sonido. */
export function tocar(muestras: Float32Array, frecuenciaMuestreo: number, opciones: { bucle?: boolean; volumen?: number; alAcabar?: () => void; desde?: number } = {}): boolean {
  callar();
  const ctx = obtener();
  if (!ctx || !muestras.length) return false;
  const buffer = ctx.createBuffer(1, muestras.length, frecuenciaMuestreo);
  buffer.getChannelData(0).set(muestras);
  const fuente = ctx.createBufferSource();
  fuente.buffer = buffer;
  fuente.loop = !!opciones.bucle;
  const g = ctx.createGain();
  g.gain.value = opciones.volumen ?? 0.8;
  fuente.connect(g).connect(ctx.destination);
  // `desde`: por dónde empieza, de 0 a 1 (para seguir por donde iba al cambiar una nota)
  const salto = Math.max(0, Math.min(0.999, opciones.desde ?? 0)) * buffer.duration;
  const esta = { fuente, empezo: ctx.currentTime - salto, dura: buffer.duration, bucle: !!opciones.bucle };
  fuente.onended = () => {
    if (sonando === esta) sonando = null;
    opciones.alAcabar?.();
  };
  fuente.start(0, salto);
  sonando = esta;
  return true;
}

/** Por dónde va lo que suena, de 0 a 1 (o null si no suena nada). Para la raya que avanza en el editor de música. */
export function porDondeVa(): number | null {
  if (!sonando || !contexto) return null;
  const t = contexto.currentTime - sonando.empezo;
  if (!sonando.bucle && t > sonando.dura) return null;
  return (t % sonando.dura) / sonando.dura;
}
