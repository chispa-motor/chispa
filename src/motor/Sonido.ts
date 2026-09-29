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
 * Si el navegador no tiene audio (por ejemplo, al ejecutar los tests), todo
 * funciona igual pero en silencio.
 */
import { ErrorMotor } from './Errores';

export class Sonido {
  /** Volumen general, de 0 a 1. */
  private _volumen = 1;
  private contexto: AudioContext | null = null;
  private salida: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  /** Nombres cargados (aunque no haya audio en este navegador, para que los errores sean los mismos). */
  private registrados = new Set<string>();
  /** Sonidos que están sonando ahora, para poder pararlos. */
  private sonando = new Map<string, Set<AudioBufferSourceNode>>();

  /** Registro de lo que se ha pedido (útil para los tests y para depurar). */
  readonly historial: string[] = [];

  private _volumenMusica = 0.6;
  private salidaMusica: GainNode | null = null;
  private fuenteMusica: AudioBufferSourceNode | null = null;
  /** Nombre de la música que suena ahora (o null). */
  musicaActual: string | null = null;
  /** Música en pausa: por dónde iba (segundos). null = no está en pausa. */
  private musicaPausadaEn: number | null = null;
  private musicaEmpezoEn = 0;
  /** Una ganancia propia de la música que suena, para los fundidos (sin tocar el volumen general de la música). */
  private gananciaMusica: GainNode | null = null;

  get volumenMusica(): number {
    return this._volumenMusica;
  }
  set volumenMusica(v: number) {
    this._volumenMusica = Math.min(1, Math.max(0, v));
    if (this.salidaMusica) this.salidaMusica.gain.value = this._volumenMusica;
  }

  /**
   * Pone una música en bucle. Si ya sonaba esa misma, no la reinicia.
   * `fundido`: segundos en los que sube desde silencio (0 = de golpe).
   */
  musica(nombre: string, fundido = 0): void {
    this.historial.push(`musica ${nombre}${fundido ? ` fundido ${fundido}` : ''}`);
    if (this.musicaActual === nombre && this.musicaPausadaEn === null) return;
    if (!this.registrados.has(nombre)) {
      const hay = [...this.registrados];
      throw new ErrorMotor(
        `Intentas poner la música "${nombre}", pero no está cargada.`,
        hay.length ? `Los sonidos cargados son: ${hay.join(', ')}.` : 'Todavía no se ha cargado ningún sonido.',
      );
    }
    this.pararMusica();
    this.musicaActual = nombre;
    this.empezarMusica(0, fundido);
  }

  /** Arranca la fuente de la música actual desde `desde` segundos. */
  private empezarMusica(desde: number, fundido: number): void {
    const ctx = this.obtenerContexto();
    const buffer = this.musicaActual ? this.buffers.get(this.musicaActual) : undefined;
    if (!ctx || !this.salidaMusica || !buffer) return;
    const ganancia = ctx.createGain();
    const t = ctx.currentTime;
    ganancia.gain.setValueAtTime(fundido > 0 ? 0 : 1, t);
    if (fundido > 0) ganancia.gain.linearRampToValueAtTime(1, t + fundido);
    ganancia.connect(this.salidaMusica);
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = true;
    fuente.connect(ganancia);
    fuente.start(0, desde % buffer.duration);
    this.fuenteMusica = fuente;
    this.gananciaMusica = ganancia;
    this.musicaEmpezoEn = t - desde;
  }

  /** Para la música. `fundido`: segundos en los que baja hasta el silencio. */
  pararMusica(fundido = 0): void {
    if (this.musicaActual) this.historial.push(`parar musica${fundido ? ` fundido ${fundido}` : ''}`);
    const fuente = this.fuenteMusica;
    const ganancia = this.gananciaMusica;
    const ctx = this.contexto;
    if (fuente && ganancia && ctx && fundido > 0) {
      const t = ctx.currentTime;
      ganancia.gain.setValueAtTime(ganancia.gain.value, t);
      ganancia.gain.linearRampToValueAtTime(0, t + fundido);
      fuente.stop(t + fundido);
    } else fuente?.stop();
    this.fuenteMusica = null;
    this.gananciaMusica = null;
    this.musicaActual = null;
    this.musicaPausadaEn = null;
  }

  /** Pone la música en pausa (recuerda por dónde iba). */
  pausarMusica(): void {
    if (!this.musicaActual || this.musicaPausadaEn !== null) return;
    this.historial.push('pausar musica');
    this.musicaPausadaEn = this.contexto ? this.contexto.currentTime - this.musicaEmpezoEn : 0;
    this.fuenteMusica?.stop();
    this.fuenteMusica = null;
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
  }

  /** ¿Hay un sonido cargado con este nombre? */
  tieneSonido(nombre: string): boolean {
    return this.buffers.has(nombre);
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
   * Reproduce un sonido cargado con cargar().
   * volumen: de 0 a 1 (sobre el general).  tono: 1 = normal, 2 = más agudo (y rápido), 0.5 = más grave.
   * bucle: se repite hasta pararlo.
   */
  reproducir(nombre: string, opciones: { volumen?: number; tono?: number; bucle?: boolean } = {}): void {
    const { volumen = 1, tono = 1, bucle = false } = opciones;
    this.historial.push(`${bucle ? 'bucle' : 'reproducir'} ${nombre}${volumen !== 1 ? ` volumen ${volumen}` : ''}${tono !== 1 ? ` tono ${tono}` : ''}`);
    const buffer = this.buffers.get(nombre);
    if (!this.registrados.has(nombre)) {
      const hay = [...this.registrados];
      throw new ErrorMotor(
        `Intentas reproducir el sonido "${nombre}", pero no está cargado.`,
        hay.length ? `Los sonidos cargados son: ${hay.join(', ')}.` : 'Todavía no se ha cargado ningún sonido. Para probar sin archivos usa sonido.tono(440, 0.2).',
      );
    }
    // Se apunta antes de mirar si hay audio: así sonando() dice lo mismo aunque el navegador no tenga sonido
    if (bucle) this.enBucle.add(nombre);
    const ctx = this.obtenerContexto();
    if (!ctx || !this.salida || !buffer) return;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = bucle;
    fuente.playbackRate.value = Math.max(0.05, tono);
    if (volumen !== 1) {
      const g = ctx.createGain();
      g.gain.value = Math.max(0, volumen);
      fuente.connect(g).connect(this.salida);
    } else fuente.connect(this.salida);
    const grupo = this.sonando.get(nombre) ?? new Set();
    grupo.add(fuente);
    this.sonando.set(nombre, grupo);
    fuente.onended = () => grupo.delete(fuente);
    fuente.start();
  }

  /** Para un sonido concreto, o todos si no se da nombre. */
  parar(nombre?: string): void {
    this.historial.push(`parar ${nombre ?? 'todo'}`);
    const grupos = nombre ? [this.sonando.get(nombre)] : [...this.sonando.values()];
    for (const g of grupos) {
      g?.forEach((f) => f.stop());
      g?.clear();
    }
    if (nombre) this.enBucle.delete(nombre);
    else this.enBucle.clear();
  }

  /** ¿Está sonando ahora este sonido? (sin audio en el navegador: si se ha puesto en bucle) */
  estaSonando(nombre: string): boolean {
    return (this.sonando.get(nombre)?.size ?? 0) > 0 || this.enBucle.has(nombre);
  }
  /** Sonidos puestos en bucle (se recuerdan aunque no haya audio, para que los tests y estaSonando funcionen). */
  private enBucle = new Set<string>();

  /** Carga un archivo de sonido y lo guarda con un nombre corto. */
  async cargar(nombre: string, ruta: string): Promise<void> {
    this.registrados.add(nombre);
    const ctx = this.obtenerContexto();
    if (!ctx) return;
    try {
      const datos = await (await fetch(ruta)).arrayBuffer();
      this.buffers.set(nombre, await ctx.decodeAudioData(datos));
    } catch {
      throw ruta.startsWith('data:')
        ? new ErrorMotor(`No he podido cargar el sonido "${nombre}".`, 'El archivo está dañado o no es un sonido que el navegador entienda (usa .mp3, .ogg o .wav). Bórralo y vuelve a importarlo (Proyecto > Sonidos).')
        : new ErrorMotor(`No he podido cargar el sonido "${ruta}".`, 'Comprueba que el archivo existe dentro de la carpeta "public" y que es .mp3, .ogg o .wav.');
    }
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
