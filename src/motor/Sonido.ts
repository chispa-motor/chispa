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

  get volumenMusica(): number {
    return this._volumenMusica;
  }
  set volumenMusica(v: number) {
    this._volumenMusica = Math.min(1, Math.max(0, v));
    if (this.salidaMusica) this.salidaMusica.gain.value = this._volumenMusica;
  }

  /** Pone una música en bucle. Si ya sonaba esa misma, no la reinicia. */
  musica(nombre: string): void {
    this.historial.push(`musica ${nombre}`);
    if (this.musicaActual === nombre) return;
    const buffer = this.buffers.get(nombre);
    if (!this.registrados.has(nombre)) {
      const hay = [...this.registrados];
      throw new ErrorMotor(
        `Intentas poner la música "${nombre}", pero no está cargada.`,
        hay.length ? `Los sonidos cargados son: ${hay.join(', ')}.` : 'Todavía no se ha cargado ningún sonido.',
      );
    }
    this.pararMusica();
    this.musicaActual = nombre;
    const ctx = this.obtenerContexto();
    if (!ctx || !this.salidaMusica || !buffer) return;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = true;
    fuente.connect(this.salidaMusica);
    fuente.start();
    this.fuenteMusica = fuente;
  }

  pararMusica(): void {
    if (this.musicaActual) this.historial.push('parar musica');
    this.fuenteMusica?.stop();
    this.fuenteMusica = null;
    this.musicaActual = null;
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

  /** Reproduce un sonido cargado con cargar(). */
  reproducir(nombre: string): void {
    this.historial.push(`reproducir ${nombre}`);
    const buffer = this.buffers.get(nombre);
    if (!this.registrados.has(nombre)) {
      const hay = [...this.registrados];
      throw new ErrorMotor(
        `Intentas reproducir el sonido "${nombre}", pero no está cargado.`,
        hay.length ? `Los sonidos cargados son: ${hay.join(', ')}.` : 'Todavía no se ha cargado ningún sonido. Para probar sin archivos usa sonido.tono(440, 0.2).',
      );
    }
    const ctx = this.obtenerContexto();
    if (!ctx || !this.salida || !buffer) return;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.connect(this.salida);
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
  }

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
