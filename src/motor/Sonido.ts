/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Sonido: reproduce sonidos con la Web Audio API del navegador.
 *
 * Tres formas de hacer ruido:
 *   - tono(frecuencia, segundos): un pitido GENERADO al momento. No necesita
 *     archivos, así que sirve para probar cosas rápido.
 *   - reproducir(nombre): un efecto de sonido cargado antes desde un archivo (.mp3, .ogg, .wav).
 *   - musica(nombre): una canción que suena EN BUCLE, con su propio volumen.
 *     Solo suena una música a la vez: poner otra para la anterior.
 *
 * DECISIÓN: el AudioContext se crea la PRIMERA vez que suena algo.
 * Los navegadores no dejan sonar nada hasta que la persona interactúa con la
 * página (un clic o una tecla). Crearlo "tarde" evita avisos y bloqueos.
 *
 * Además (Chispa 1.1):
 *   - Sonidos HECHOS en el editor (generador de efectos) y canciones del editor
 *     de música: llegan como muestras ya calculadas (registrarMuestras, registrarCancion).
 *   - Sonido con SITIO: suena más flojo cuanto más lejos del oyente, y por el
 *     altavoz del lado donde está (panorama).
 *   - Cambios EN VIVO de lo que ya suena: volumen, tono (velocidad) y panorama.
 *   - Música ADAPTATIVA: las pistas de una canción son capas que se suben y se
 *     bajan mientras suena; y se puede pasar de una música a otra cruzándolas.
 *
 * Si el navegador no tiene audio (por ejemplo, al ejecutar los tests), todo
 * funciona igual pero en silencio.
 */
import { ErrorMotor } from './Errores';
import { normalizar } from '../utilidades/texto';
import { sugerir } from '../chispa/errores/sugerencias';
import { sinPrototipo } from '../utilidades/seguro';

/** Efectos generados: forma de la onda, frecuencia al empezar y al acabar (Hz), duración y volumen. */
interface Efecto {
  onda: OscillatorType | 'ruido';
  desde: number;
  hasta: number;
  segundos: number;
  volumen: number;
}
export const EFECTOS: Record<string, Efecto> = sinPrototipo({
  disparo: { onda: 'square', desde: 900, hasta: 200, segundos: 0.15, volumen: 0.25 },
  laser: { onda: 'sawtooth', desde: 1400, hasta: 300, segundos: 0.2, volumen: 0.2 },
  explosion: { onda: 'ruido', desde: 3000, hasta: 60, segundos: 0.6, volumen: 0.6 },
  golpe: { onda: 'ruido', desde: 1800, hasta: 200, segundos: 0.12, volumen: 0.5 },
  salto: { onda: 'square', desde: 300, hasta: 800, segundos: 0.18, volumen: 0.25 },
  moneda: { onda: 'square', desde: 980, hasta: 1960, segundos: 0.12, volumen: 0.2 },
  poder: { onda: 'triangle', desde: 200, hasta: 1200, segundos: 0.5, volumen: 0.35 },
  dash: { onda: 'ruido', desde: 6000, hasta: 800, segundos: 0.2, volumen: 0.35 },
  escudo: { onda: 'sine', desde: 400, hasta: 900, segundos: 0.35, volumen: 0.35 },
  hielo: { onda: 'triangle', desde: 2400, hasta: 1200, segundos: 0.3, volumen: 0.3 },
  fuego: { onda: 'ruido', desde: 1200, hasta: 300, segundos: 0.4, volumen: 0.4 },
  rayo: { onda: 'sawtooth', desde: 120, hasta: 40, segundos: 0.4, volumen: 0.45 },
  subir: { onda: 'triangle', desde: 440, hasta: 1760, segundos: 0.6, volumen: 0.35 },
  perder: { onda: 'sawtooth', desde: 400, hasta: 60, segundos: 0.9, volumen: 0.35 },
  clic: { onda: 'square', desde: 1200, hasta: 1000, segundos: 0.05, volumen: 0.2 },
  alarma: { onda: 'square', desde: 700, hasta: 500, segundos: 0.3, volumen: 0.25 },
  dano: { onda: 'square', desde: 220, hasta: 90, segundos: 0.2, volumen: 0.35 },
});

/** Dónde suena algo: un punto del mundo, o un objeto (el sonido va con él). */
export type SitioSonido = { x: number; y: number } | { posicion: { x: number; y: number }; destruido: boolean };

/** Hasta dónde se oye un sonido con sitio si no se dice (píxeles). */
export const ALCANCE_NORMAL = 800;

/**
 * Cómo se oye un sonido que está en un sitio: su volumen (1 al lado, 0 a
 * `alcance` píxeles o más) y por qué lado (-1 izquierda, 1 derecha).
 * `medioAncho`: la mitad de lo que se ve a lo ancho (a esa distancia hacia un lado, suena solo por ese altavoz... casi).
 */
export function oirDesde(oyente: { x: number; y: number }, sitio: { x: number; y: number }, alcance: number, medioAncho: number): { volumen: number; pan: number } {
  const dx = sitio.x - oyente.x;
  const dy = sitio.y - oyente.y;
  const cerca = Math.max(0, 1 - Math.hypot(dx, dy) / Math.max(1, alcance));
  // Al cuadrado: baja deprisa al alejarse un poco y despacio al final, como se oye de verdad
  return { volumen: cerca * cerca, pan: Math.max(-1, Math.min(1, dx / Math.max(1, medioAncho))) * 0.85 };
}

/** Algo que está sonando (o, sin audio en el navegador, un bucle apuntado). */
interface Voz {
  nombre: string;
  fuente: AudioBufferSourceNode | null;
  ganancia: GainNode | null;
  panorama: StereoPannerNode | null;
  bucle: boolean;
  /** Lo pedido (de 0 a 1, 1 = normal, de -1 a 1). */
  volumen: number;
  tono: number;
  pan: number;
  /** Si suena en un sitio: dónde y hasta dónde se oye. */
  sitio: SitioSonido | null;
  alcance: number;
  /** Lo que le toca por estar donde está (se multiplica por su volumen). */
  volumenSitio: number;
}

/** Una canción del editor de música: cada pista es una capa. */
interface Cancion {
  capas: (AudioBuffer | null)[];
  cuantas: number;
  bucle: boolean;
}

export class Sonido {
  /** Volumen general, de 0 a 1. */
  private _volumen = 1;
  private contexto: AudioContext | null = null;
  private salida: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  /** Nombres cargados (aunque no haya audio en este navegador, para que los errores sean los mismos). */
  private registrados = new Set<string>();
  /** Lo que está sonando ahora, por nombre, para poder pararlo y cambiarlo. */
  private voces = new Map<string, Set<Voz>>();
  /** Las canciones del editor de música (con sus capas). */
  private canciones = new Map<string, Cancion>();

  /** Registro de lo que se ha pedido (útil para los tests y para depurar). */
  readonly historial: string[] = [];

  private _volumenMusica = 0.6;
  private salidaMusica: GainNode | null = null;
  /** Las fuentes de la música que suena (una por capa) y la ganancia de cada capa. */
  private fuentesMusica: AudioBufferSourceNode[] = [];
  private gananciasCapas: GainNode[] = [];
  /** Nombre de la música que suena ahora (o null). */
  musicaActual: string | null = null;
  /** Música en pausa: por dónde iba (segundos). null = no está en pausa. */
  private musicaPausadaEn: number | null = null;
  private musicaEmpezoEn = 0;
  /** Una ganancia propia de la música que suena, para los fundidos (sin tocar el volumen general de la música). */
  private gananciaMusica: GainNode | null = null;
  /** La velocidad (y el tono) de la música: 1 = normal. */
  private _tonoMusica = 1;
  /** El volumen de cada capa de la música que suena (de 0 a 1). */
  private volumenCapas: number[] = [];

  get volumenMusica(): number {
    return this._volumenMusica;
  }
  set volumenMusica(v: number) {
    this._volumenMusica = Math.min(1, Math.max(0, v));
    if (this.salidaMusica) this.salidaMusica.gain.value = this._volumenMusica;
  }

  private comprobarMusica(nombre: string): void {
    if (this.registrados.has(nombre)) return;
    const hay = [...this.registrados];
    throw new ErrorMotor(
      `Intentas poner la música "${nombre}", pero no está cargada.`,
      hay.length ? `Los sonidos cargados son: ${hay.join(', ')}.` : 'Todavía no se ha cargado ningún sonido.',
    );
  }

  /**
   * Pone una música en bucle. Si ya sonaba esa misma, no la reinicia.
   * `fundido`: segundos en los que sube desde silencio (0 = de golpe).
   */
  musica(nombre: string, fundido = 0): void {
    this.historial.push(`musica ${nombre}${fundido ? ` fundido ${fundido}` : ''}`);
    if (this.musicaActual === nombre && this.musicaPausadaEn === null) return;
    this.comprobarMusica(nombre);
    this.pararMusica();
    this.musicaActual = nombre;
    this.volumenCapas = this.capasSegunIntensidad(nombre);
    this.empezarMusica(0, fundido);
  }

  /**
   * Pasa de la música que suena a otra CRUZÁNDOLAS: una baja mientras la otra
   * sube, en esos segundos. Si no sonaba ninguna, la nueva entra poco a poco.
   */
  cruzarMusica(nombre: string, segundos = 2): void {
    if (this.musicaActual === nombre && this.musicaPausadaEn === null) return;
    this.comprobarMusica(nombre);
    // La de antes se apaga sola (pararMusica con fundido la deja sonando mientras baja)
    this.pararMusica(this.musicaActual !== null ? segundos : 0);
    this.historial.push(`cruzar musica ${nombre} ${segundos}`);
    this.musicaActual = nombre;
    this.volumenCapas = this.capasSegunIntensidad(nombre);
    this.empezarMusica(0, segundos);
  }

  /** Arranca la música actual (todas sus capas a la vez) desde `desde` segundos. */
  private empezarMusica(desde: number, fundido: number): void {
    const ctx = this.obtenerContexto();
    const nombre = this.musicaActual;
    if (!ctx || !this.salidaMusica || !nombre) return;
    const cancion = this.canciones.get(nombre);
    const capas = cancion ? cancion.capas : [this.buffers.get(nombre) ?? null];
    if (!capas.some(Boolean)) return;
    const ganancia = ctx.createGain();
    const t = ctx.currentTime;
    ganancia.gain.setValueAtTime(fundido > 0 ? 0 : 1, t);
    if (fundido > 0) ganancia.gain.linearRampToValueAtTime(1, t + fundido);
    ganancia.connect(this.salidaMusica);
    this.fuentesMusica = [];
    this.gananciasCapas = [];
    capas.forEach((buffer, i) => {
      const g = ctx.createGain();
      g.gain.value = this.volumenCapas[i] ?? 1;
      g.connect(ganancia);
      this.gananciasCapas.push(g);
      if (!buffer) return;
      const fuente = ctx.createBufferSource();
      fuente.buffer = buffer;
      fuente.loop = cancion ? cancion.bucle : true;
      fuente.playbackRate.value = this._tonoMusica;
      fuente.connect(g);
      fuente.start(t, desde % buffer.duration);
      this.fuentesMusica.push(fuente);
    });
    this.gananciaMusica = ganancia;
    this.musicaEmpezoEn = t - desde / this._tonoMusica;
  }

  /** Para la música. `fundido`: segundos en los que baja hasta el silencio. */
  pararMusica(fundido = 0): void {
    if (this.musicaActual) this.historial.push(`parar musica${fundido ? ` fundido ${fundido}` : ''}`);
    const fuentes = this.fuentesMusica;
    const ganancia = this.gananciaMusica;
    const ctx = this.contexto;
    if (fuentes.length && ganancia && ctx && fundido > 0) {
      const t = ctx.currentTime;
      ganancia.gain.cancelScheduledValues(t);
      ganancia.gain.setValueAtTime(ganancia.gain.value, t);
      ganancia.gain.linearRampToValueAtTime(0, t + fundido);
      for (const f of fuentes) f.stop(t + fundido);
    } else for (const f of fuentes) f.stop();
    this.fuentesMusica = [];
    this.gananciasCapas = [];
    this.gananciaMusica = null;
    this.musicaActual = null;
    this.musicaPausadaEn = null;
    this.volumenCapas = [];
  }

  /** Pone la música en pausa (recuerda por dónde iba). */
  pausarMusica(): void {
    if (!this.musicaActual || this.musicaPausadaEn !== null) return;
    this.historial.push('pausar musica');
    this.musicaPausadaEn = this.contexto ? (this.contexto.currentTime - this.musicaEmpezoEn) * this._tonoMusica : 0;
    for (const f of this.fuentesMusica) f.stop();
    this.fuentesMusica = [];
  }

  /** Sigue la música por donde iba. */
  seguirMusica(): void {
    if (this.musicaPausadaEn === null) return;
    this.historial.push('seguir musica');
    const desde = this.musicaPausadaEn;
    this.musicaPausadaEn = null;
    this.empezarMusica(desde, 0);
  }

  get musicaEnPausa(): boolean {
    return this.musicaPausadaEn !== null;
  }

  /** La velocidad de la música (y con ella su tono): 1 = normal, 1.2 = más rápida y aguda, 0.8 = más lenta y grave. */
  get tonoMusica(): number {
    return this._tonoMusica;
  }
  set tonoMusica(v: number) {
    const nuevo = Math.min(4, Math.max(0.25, v));
    const ctx = this.contexto;
    if (ctx && this.fuentesMusica.length) {
      // Por dónde va no cambia: solo lo deprisa que sigue
      const posicion = (ctx.currentTime - this.musicaEmpezoEn) * this._tonoMusica;
      this.musicaEmpezoEn = ctx.currentTime - posicion / nuevo;
      for (const f of this.fuentesMusica) f.playbackRate.setTargetAtTime(nuevo, ctx.currentTime, 0.05);
    }
    this._tonoMusica = nuevo;
  }

  /** Cuántas capas tiene la música que suena (1 si es un archivo; las pistas, si es una canción del editor). 0 si no suena nada. */
  get capasMusica(): number {
    return this.musicaActual ? this.volumenCapas.length : 0;
  }

  /** El volumen de una capa (la primera es la 1). */
  volumenDeCapa(capa: number): number {
    return this.volumenCapas[capa - 1] ?? 0;
  }

  /** Sube o baja una capa de la música que suena, poco a poco en esos segundos. Sin música, no hace nada. */
  capaMusica(capa: number, volumen: number, segundos = 0): void {
    if (!this.musicaActual) return;
    const n = this.volumenCapas.length;
    if (!Number.isInteger(capa) || capa < 1 || capa > n) {
      throw new ErrorMotor(
        `La música "${this.musicaActual}" no tiene capa ${capa}: ${n === 1 ? 'solo tiene una' : `tiene ${n} (de la 1 a la ${n})`}.`,
        n === 1 && !this.canciones.has(this.musicaActual) ? 'Las capas son las pistas de una canción hecha en el editor de música. Un archivo de música importado es una sola capa.' : 'Cada pista de la canción es una capa, en el mismo orden que en el editor de música.',
      );
    }
    const v = Math.min(1, Math.max(0, volumen));
    this.historial.push(`capa ${capa} ${v}${segundos ? ` en ${segundos}` : ''}`);
    this.volumenCapas[capa - 1] = v;
    const g = this.gananciasCapas[capa - 1];
    const ctx = this.contexto;
    if (g && ctx) rampa(g.gain, v, ctx.currentTime, Math.max(0.01, segundos));
  }

  /** El volumen de cada capa de una música para la intensidad de ahora: la primera siempre suena; las demás van entrando una a una. */
  private capasSegunIntensidad(nombre: string): number[] {
    const n = this.canciones.get(nombre)?.cuantas ?? 1;
    return Array.from({ length: n }, (_, i) => (i === 0 ? 1 : Math.min(1, Math.max(0, this._intensidad * (n - 1) - (i - 1)))));
  }

  private _intensidad = 1;
  /**
   * Música adaptativa en un solo número, de 0 (tranquila: solo la primera capa)
   * a 1 (todas las capas). En medio, las capas van entrando una a una. Se
   * recuerda: la siguiente música empieza con esa intensidad.
   */
  get intensidad(): number {
    return this._intensidad;
  }
  ponerIntensidad(intensidad: number, segundos = 1): void {
    this._intensidad = Math.min(1, Math.max(0, intensidad));
    if (!this.musicaActual) return;
    this.capasSegunIntensidad(this.musicaActual).forEach((v, i) => {
      if (this.volumenCapas[i] !== v) this.capaMusica(i + 1, v, segundos);
    });
  }

  /** Congela todo el audio (al pulsar Pausa en el editor) sin perder por dónde iba. */
  pausar(): void {
    if (this.contexto?.state === 'running') void this.contexto.suspend();
  }

  reanudar(): void {
    if (this.contexto?.state === 'suspended') void this.contexto.resume();
  }

  /** Suelta el audio del navegador (al destruir el motor). */
  cerrar(): void {
    this.pararTodo();
    void this.contexto?.close().catch(() => {});
    this.contexto = null;
    this.salida = null;
    this.salidaMusica = null;
  }

  /** Para todo (al pulsar Parar en el editor). */
  pararTodo(): void {
    this.parar();
    this.pararMusica();
    this._tonoMusica = 1;
    this._intensidad = 1;
  }

  /** ¿Puede sonar algo en este navegador? (en los tests, no) */
  get hayAudio(): boolean {
    return typeof AudioContext !== 'undefined';
  }

  /** ¿Hay un sonido cargado con este nombre? */
  tieneSonido(nombre: string): boolean {
    return this.buffers.has(nombre);
  }

  /** ¿Se conoce este nombre? (cargado, hecho en el editor o una canción) */
  conoce(nombre: string): boolean {
    return this.registrados.has(nombre);
  }

  get volumen(): number {
    return this._volumen;
  }
  set volumen(v: number) {
    this._volumen = Math.min(1, Math.max(0, v));
    if (this.salida) this.salida.gain.value = this._volumen;
  }

  /** Un pitido generado. Frecuencia en hercios (440 = nota La). */
  tono(frecuencia: number, segundos = 0.2): void {
    this.historial.push(`tono ${frecuencia} ${segundos}`);
    const ctx = this.obtenerContexto();
    if (!ctx || !this.salida) return;
    const osc = ctx.createOscillator();
    const envolvente = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = frecuencia;
    // Subida y bajada rápidas del volumen para que no haga "clic" al empezar y terminar
    const t = ctx.currentTime;
    envolvente.gain.setValueAtTime(0, t);
    envolvente.gain.linearRampToValueAtTime(0.25, t + 0.01);
    envolvente.gain.linearRampToValueAtTime(0, t + segundos);
    osc.connect(envolvente).connect(this.salida);
    osc.start(t);
    osc.stop(t + segundos + 0.02);
  }

  /**
   * Un efecto de sonido GENERADO (sin archivos), de una lista de efectos típicos
   * de juego: "disparo", "explosion", "golpe"... `tono` lo hace más agudo (2) o grave (0.5).
   */
  efecto(nombre: string, volumen = 1, tono = 1): void {
    nombre = normalizar(nombre);
    const e = EFECTOS[nombre];
    if (!e) {
      const hay = Object.keys(EFECTOS);
      const parecido = sugerir(nombre, hay);
      throw new ErrorMotor(`No hay ningún efecto de sonido llamado "${nombre}".`, (parecido ? `¿Querías decir "${parecido}"? ` : '') + `Los efectos que hay son: ${hay.join(', ')}.`);
    }
    this.historial.push(`efecto ${nombre}`);
    const ctx = this.obtenerContexto();
    if (!ctx || !this.salida) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(e.volumen * Math.min(1, Math.max(0, volumen)), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + e.segundos);
    let fuente: AudioScheduledSourceNode;
    if (e.onda === 'ruido') {
      // Ruido blanco (explosiones, golpes) pasado por un filtro que se va cerrando
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * e.segundos), ctx.sampleRate);
      const datos = buffer.getChannelData(0);
      for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
      const ruido = ctx.createBufferSource();
      ruido.buffer = buffer;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.setValueAtTime(e.desde * tono, t);
      filtro.frequency.exponentialRampToValueAtTime(Math.max(20, e.hasta * tono), t + e.segundos);
      ruido.connect(filtro).connect(g);
      fuente = ruido;
    } else {
      const osc = ctx.createOscillator();
      osc.type = e.onda;
      osc.frequency.setValueAtTime(e.desde * tono, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, e.hasta * tono), t + e.segundos);
      osc.connect(g);
      fuente = osc;
    }
    g.connect(this.salida);
    fuente.start(t);
    fuente.stop(t + e.segundos + 0.02);
  }

  private comprobar(nombre: string, que = 'reproducir'): void {
    if (this.registrados.has(nombre)) return;
    const hay = [...this.registrados];
    throw new ErrorMotor(
      `Intentas ${que} el sonido "${nombre}", pero no está cargado.`,
      hay.length ? `Los sonidos cargados son: ${hay.join(', ')}.` : 'Todavía no se ha cargado ningún sonido. Para probar sin archivos usa sonido.tono(440, 0.2).',
    );
  }

  /**
   * Reproduce un sonido cargado con cargar().
   * volumen: de 0 a 1 (sobre el general).  tono: 1 = normal, 2 = más agudo (y rápido), 0.5 = más grave.
   * bucle: se repite hasta pararlo.  pan: de -1 (izquierda) a 1 (derecha).
   * sitio y alcance: suena en ese sitio del mundo (ver actualizarSitios).
   */
  reproducir(nombre: string, opciones: { volumen?: number; tono?: number; bucle?: boolean; pan?: number; sitio?: SitioSonido; alcance?: number } = {}): void {
    const { volumen = 1, tono = 1, bucle = false, pan = 0, sitio = null, alcance = ALCANCE_NORMAL } = opciones;
    this.historial.push(`${bucle ? 'bucle' : 'reproducir'} ${nombre}${volumen !== 1 ? ` volumen ${volumen}` : ''}${tono !== 1 ? ` tono ${tono}` : ''}${pan ? ` pan ${pan}` : ''}${sitio ? ` en sitio (alcance ${alcance})` : ''}`);
    this.comprobar(nombre);
    const buffer = this.buffers.get(nombre) ?? this.mezclaDeCancion(nombre);
    const ctx = this.obtenerContexto();
    const conAudio = !!(ctx && this.salida && buffer);
    // Sin audio (tests), los bucles se apuntan igualmente: así sonando() y los cambios en vivo dicen lo mismo
    if (!conAudio && !bucle) return;
    const voz: Voz = { nombre, fuente: null, ganancia: null, panorama: null, bucle, volumen: Math.max(0, volumen), tono: Math.max(0.05, tono), pan: Math.max(-1, Math.min(1, pan)), sitio, alcance, volumenSitio: 1 };
    const grupo = this.voces.get(nombre) ?? new Set();
    // El mismo bucle pedido otra vez en el mismo sitio no se amontona
    if (bucle) for (const v of grupo) if (v.bucle && v.sitio === sitio) this.pararVoz(v, grupo);
    grupo.add(voz);
    this.voces.set(nombre, grupo);
    if (sitio && this.oyente) this.colocar(voz, this.oyente, this.medioAncho);
    if (!conAudio) return;
    const fuente = ctx!.createBufferSource();
    fuente.buffer = buffer!;
    fuente.loop = bucle;
    fuente.playbackRate.value = voz.tono;
    const g = ctx!.createGain();
    g.gain.value = voz.volumen * voz.volumenSitio;
    let ultimo: AudioNode = g;
    // El panorama solo se monta si hace falta (casi ningún sonido lo usa)
    if ((voz.pan !== 0 || sitio) && typeof ctx!.createStereoPanner === 'function') {
      voz.panorama = ctx!.createStereoPanner();
      voz.panorama.pan.value = voz.pan;
      g.connect(voz.panorama);
      ultimo = voz.panorama;
    }
    fuente.connect(g);
    ultimo.connect(this.salida!);
    voz.fuente = fuente;
    voz.ganancia = g;
    fuente.onended = () => grupo.delete(voz);
    fuente.start();
  }

  /** Una canción del editor usada como sonido suelto (sonido.reproducir): se toca su primera capa con sonido. */
  private mezclaDeCancion(nombre: string): AudioBuffer | undefined {
    return this.canciones.get(nombre)?.capas.find(Boolean) ?? undefined;
  }

  private pararVoz(v: Voz, grupo: Set<Voz>): void {
    try {
      v.fuente?.stop();
    } catch {
      // ya había acabado
    }
    grupo.delete(v);
  }

  /** Para un sonido concreto, o todos si no se da nombre. */
  parar(nombre?: string): void {
    this.historial.push(`parar ${nombre ?? 'todo'}`);
    const grupos = nombre ? [this.voces.get(nombre)] : [...this.voces.values()];
    for (const g of grupos) if (g) for (const v of [...g]) this.pararVoz(v, g);
  }

  /** ¿Está sonando ahora este sonido? (sin audio en el navegador: si se ha puesto en bucle) */
  estaSonando(nombre: string): boolean {
    return (this.voces.get(nombre)?.size ?? 0) > 0;
  }

  /**
   * Cambia EN VIVO lo que ya está sonando con ese nombre: su volumen, su tono
   * (velocidad) o su panorama, poco a poco en esos segundos. Devuelve cuántos
   * sonidos ha cambiado (0 si ahora no suena).
   */
  ajustar(nombre: string, cambios: { volumen?: number; tono?: number; pan?: number }, segundos = 0): number {
    this.comprobar(nombre, 'cambiar');
    this.historial.push(`ajustar ${nombre}${cambios.volumen !== undefined ? ` volumen ${cambios.volumen}` : ''}${cambios.tono !== undefined ? ` tono ${cambios.tono}` : ''}${cambios.pan !== undefined ? ` pan ${cambios.pan}` : ''}${segundos ? ` en ${segundos}` : ''}`);
    const grupo = this.voces.get(nombre);
    if (!grupo) return 0;
    const ctx = this.contexto;
    const t = ctx?.currentTime ?? 0;
    const dura = Math.max(0.01, segundos);
    for (const v of grupo) {
      if (cambios.volumen !== undefined) {
        v.volumen = Math.max(0, cambios.volumen);
        if (v.ganancia && ctx) rampa(v.ganancia.gain, v.volumen * v.volumenSitio, t, dura);
      }
      if (cambios.tono !== undefined) {
        v.tono = Math.max(0.05, cambios.tono);
        if (v.fuente && ctx) rampa(v.fuente.playbackRate, v.tono, t, dura);
      }
      if (cambios.pan !== undefined) {
        v.pan = Math.max(-1, Math.min(1, cambios.pan));
        // Un sonido con sitio se coloca solo: su panorama lo pone actualizarSitios
        if (v.sitio) continue;
        if (!v.panorama && v.ganancia && ctx && this.salida && typeof ctx.createStereoPanner === 'function') {
          // No tenía panorama: se le pone ahora, en medio del camino
          v.panorama = ctx.createStereoPanner();
          v.ganancia.disconnect();
          v.ganancia.connect(v.panorama);
          v.panorama.connect(this.salida);
        }
        if (v.panorama && ctx) rampa(v.panorama.pan, v.pan, t, dura);
      }
    }
    return grupo.size;
  }

  /** Lo que se le ha pedido a un sonido que está sonando (para leerlo desde Chispa y en los tests). */
  estadoDe(nombre: string): { volumen: number; tono: number; pan: number; volumenSitio: number } | null {
    const v = [...(this.voces.get(nombre) ?? [])].pop();
    return v ? { volumen: v.volumen, tono: v.tono, pan: v.pan, volumenSitio: v.volumenSitio } : null;
  }

  // ───────────────────────── Sonido con sitio ─────────────────────────

  private oyente: { x: number; y: number } | null = null;
  private medioAncho = 480;

  /**
   * Se llama en cada fotograma: dónde está quien escucha (el centro de la
   * cámara, o el objeto elegido) y cuánto se ve a lo ancho. Los sonidos con
   * sitio suenan más flojos cuanto más lejos y por el lado donde están; los
   * bucles de un objeto destruido se paran.
   */
  actualizarSitios(oyente: { x: number; y: number }, medioAncho: number): void {
    this.oyente = { x: oyente.x, y: oyente.y };
    this.medioAncho = medioAncho;
    for (const grupo of this.voces.values()) {
      for (const v of [...grupo]) {
        if (!v.sitio) continue;
        if ('destruido' in v.sitio && v.sitio.destruido) {
          // Un bucle se va con su objeto; un sonido suelto acaba donde estaba
          if (v.bucle) this.pararVoz(v, grupo);
          else v.sitio = { x: v.sitio.posicion.x, y: v.sitio.posicion.y };
          continue;
        }
        this.colocar(v, oyente, medioAncho);
      }
    }
  }

  private colocar(v: Voz, oyente: { x: number; y: number }, medioAncho: number): void {
    const s = v.sitio!;
    const { volumen, pan } = oirDesde(oyente, 'posicion' in s ? s.posicion : s, v.alcance, medioAncho);
    v.volumenSitio = volumen;
    v.pan = pan;
    const ctx = this.contexto;
    if (!ctx) return;
    // Un pelín suavizado, para que no haga «escalones» al moverse
    v.ganancia?.gain.setTargetAtTime(v.volumen * volumen, ctx.currentTime, 0.03);
    v.panorama?.pan.setTargetAtTime(pan, ctx.currentTime, 0.03);
  }

  // ───────────────────────── Cargar ─────────────────────────

  /** Carga un archivo de sonido y lo guarda con un nombre corto. */
  async cargar(nombre: string, ruta: string): Promise<void> {
    this.registrados.add(nombre);
    const ctx = this.obtenerContexto();
    if (!ctx) return;
    try {
      // Los sonidos de un proyecto van dentro (data URL): se leen sin pedir nada a
      // ninguna red, así el juego exportado funciona con la política de seguridad más estricta
      const datos = ruta.startsWith('data:') ? bytesDeDataURL(ruta) : await (await fetch(ruta)).arrayBuffer();
      this.buffers.set(nombre, await ctx.decodeAudioData(datos));
    } catch {
      throw ruta.startsWith('data:')
        ? new ErrorMotor(`No he podido cargar el sonido "${nombre}".`, 'El archivo está dañado o no es un sonido que el navegador entienda (usa .mp3, .ogg o .wav). Bórralo y vuelve a importarlo (Proyecto > Sonidos).')
        : new ErrorMotor(`No he podido cargar el sonido "${ruta}".`, 'Comprueba que el archivo existe dentro de la carpeta "public" y que es .mp3, .ogg o .wav.');
    }
  }

  private bufferDe(muestras: Float32Array, frecuenciaMuestreo: number): AudioBuffer | null {
    const ctx = this.obtenerContexto();
    if (!ctx || !muestras.length) return null;
    const buffer = ctx.createBuffer(1, muestras.length, frecuenciaMuestreo);
    buffer.getChannelData(0).set(muestras);
    return buffer;
  }

  /** Un sonido hecho con el generador de efectos: llega ya calculado (sus muestras). */
  registrarMuestras(nombre: string, muestras: Float32Array, frecuenciaMuestreo: number): void {
    this.registrados.add(nombre);
    const buffer = this.bufferDe(muestras, frecuenciaMuestreo);
    if (buffer) this.buffers.set(nombre, buffer);
  }

  /** Una canción del editor de música: una capa por pista (sus muestras). */
  registrarCancion(nombre: string, capas: Float32Array[], frecuenciaMuestreo: number, bucle = true): void {
    this.registrados.add(nombre);
    this.canciones.set(nombre, { capas: capas.map((c) => this.bufferDe(c, frecuenciaMuestreo)), cuantas: Math.max(1, capas.length), bucle });
  }

  private obtenerContexto(): AudioContext | null {
    if (this.contexto) {
      // El navegador deja el audio en pausa hasta que la persona pulsa algo: lo reactivamos
      if (this.contexto.state === 'suspended') void this.contexto.resume();
      return this.contexto;
    }
    if (typeof AudioContext === 'undefined') return null; // sin audio (tests)
    this.contexto = new AudioContext();
    this.salida = this.contexto.createGain();
    this.salida.gain.value = this._volumen;
    this.salida.connect(this.contexto.destination);
    this.salidaMusica = this.contexto.createGain();
    this.salidaMusica.gain.value = this._volumenMusica;
    this.salidaMusica.connect(this.contexto.destination);
    return this.contexto;
  }
}

/** Lleva un valor del audio a otro poco a poco (sin saltos, que hacen «clic»). */
function rampa(p: AudioParam, valor: number, ahora: number, segundos: number): void {
  p.cancelScheduledValues(ahora);
  p.setValueAtTime(p.value, ahora);
  p.linearRampToValueAtTime(valor, ahora + segundos);
}

/** "data:audio/wav;base64,UklGR..." → los bytes del archivo. */
export function bytesDeDataURL(url: string): ArrayBuffer {
  const coma = url.indexOf(',');
  const binario = atob(url.slice(coma + 1));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}
