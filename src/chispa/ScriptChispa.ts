/**
 * ScriptChispa: el componente que ejecuta un script .chs en un objeto.
 *
 * Cuando el objeto entra en la escena:
 *   1. Ejecuta el código "suelto" del script (variables y funciones).
 *   2. Apunta todos los bloques `cuando ...` como eventos.
 *   3. Lanza los `cuando empieza`.
 * En cada fotograma comprueba qué eventos han ocurrido (teclas, tiempo,
 * clics) y los lanza. Los contactos llegan desde la física (alTocar).
 *
 * ── Hilos (como los de Roblox) ──
 * Cada evento que se lanza es un HILO: un generador del intérprete que puede
 * quedarse "dormido" en un esperar(). Guardamos los hilos dormidos y los
 * despertamos cuando llega su hora.
 *
 * DECISIÓN: los eventos que se repiten solos (cada fotograma, cada N
 * segundos, se mantiene) NO se lanzan otra vez si el anterior sigue dormido.
 * Si no, un `esperar(1)` dentro de `cuando cada fotograma` crearía 60 hilos
 * por segundo y el juego acabaría muy lento.
 *
 * ── Un error no para el juego entero ──
 * Si un evento de este objeto falla, el error se INFORMA (sale en la consola),
 * este script se DETIENE y el resto de objetos siguen funcionando. Solo los
 * errores internos del motor (fallos nuestros, no del juego) paran todo.
 */
import type { Bloque, Evento, Expresion, Programa } from './sintaxis/ast';
import type { Posicion } from './lexico/tokens';
import { Entorno } from './ejecucion/entorno';
import { ErrorChispa } from './errores/ErrorChispa';
import type { Ejecucion, Interprete } from './ejecucion/interprete';
import { referencia } from './api/objetos';
import { nombreTipo } from './ejecucion/valores';
import { Sprite } from '../objetos/componentes/Sprite';
import { ErrorMotor } from '../motor/Errores';
import { Componente } from '../objetos/Componente';
import type { ObjetoJuego } from '../objetos/ObjetoJuego';
import { normalizar } from '../utilidades/texto';

interface Hilo {
  generador: Ejecucion<unknown>;
  /** Si no es null, solo puede haber un hilo vivo con esta clave. */
  clave: string | null;
  despertarEn: number;
}

interface EventoRegistrado {
  evento: Evento;
  cuerpo: Bloque;
  pos: Posicion;
  clave: string;
  /** Para eventos de teclado: nombres de tecla ya comprobados. */
  teclas: string[];
  /** Para `cada N segundos`. */
  segundos: number;
  acumulado: number;
}

/** A quién avisar cuando un script falla. */
export type InformarError = (error: ErrorChispa, objeto: ObjetoJuego) => void;

export class ScriptChispa extends Componente {
  private entorno!: Entorno;
  private eventos: EventoRegistrado[] = [];
  private hilos: Hilo[] = [];
  /** Verdadero si el script se ha parado por un error. */
  detenido = false;

  constructor(
    private interprete: Interprete,
    readonly programa: Programa,
    /** Si no se da, los errores se lanzan (y paran el juego). */
    private informar?: InformarError,
  ) {
    super();
  }

  private get motor() {
    return this.objeto.escena!.motor;
  }

  // ───────────────────────── Arranque ─────────────────────────

  iniciar(): void {
    this.conArchivo(() => {
      this.entorno = new Entorno(this.interprete.globales);
      this.entorno.declarar('yo', referencia(this.objeto));

      // 1. Código suelto (todo lo que no es un "cuando")
      const sueltas = this.programa.sentencias.filter((s) => s.tipo !== 'Cuando');
      this.lanzar(this.interprete.ejecutarBloque(sueltas, this.entorno), null);

      // 2. Registrar eventos
      this.programa.sentencias.forEach((s, i) => {
        if (s.tipo !== 'Cuando') return;
        const reg: EventoRegistrado = {
          evento: s.evento,
          cuerpo: s.cuerpo,
          pos: s.pos,
          clave: `evento${i}`,
          teclas: [],
          segundos: 0,
          acumulado: 0,
        };
        if (s.evento.tipo === 'tecla') {
          reg.teclas = s.evento.teclas.map((expr) => {
            const v = this.evaluarYa(expr);
            if (typeof v !== 'string')
              throw new ErrorChispa(
                expr.pos,
                `el nombre de la tecla tiene que ir entre comillas, pero es ${nombreTipo(v)}.`,
                'Ejemplo: cuando se pulsa "espacio":',
              );
            try {
              return this.motor.entrada.validarTecla(v);
            } catch (e) {
              if (e instanceof ErrorMotor)
                throw new ErrorChispa(expr.pos, e.message.charAt(0).toLowerCase() + e.message.slice(1), e.pista);
              throw e;
            }
          });
        }
        if (s.evento.tipo === 'intervalo' || s.evento.tipo === 'pasen') {
          const segundos = s.evento.segundos;
          const v = this.evaluarYa(segundos);
          const ejemplo = s.evento.tipo === 'pasen' ? 'cuando pasen 3 segundos:' : 'cuando cada 2 segundos:';
          if (typeof v !== 'number' || v <= 0)
            throw new ErrorChispa(segundos.pos, `el número de segundos tiene que ser mayor que 0.`, `Ejemplo: ${ejemplo}`);
          reg.segundos = v;
        }
        this.eventos.push(reg);
      });

      // 3. Lanzar los "cuando empieza"
      for (const ev of this.eventos) if (ev.evento.tipo === 'empieza') this.lanzarEvento(ev);
    });
  }

  // ───────────────────────── Cada fotograma ─────────────────────────

  actualizar(dt: number): void {
    this.conArchivo(() => {
      this.despertarHilos();
      const entrada = this.motor.entrada;

      for (const ev of this.eventos) {
        if (this.objeto.destruido) return;
        const e = ev.evento;
        switch (e.tipo) {
          case 'fotograma':
            this.lanzarEvento(ev, undefined, ev.clave);
            break;
          case 'pasen':
            // Una sola vez: cuando el tiempo acumulado llega, se lanza y se "apaga" (segundos = Infinito)
            ev.acumulado += dt;
            if (ev.acumulado >= ev.segundos) {
              ev.segundos = Infinity;
              this.lanzarEvento(ev);
            }
            break;
          case 'intervalo':
            ev.acumulado += dt;
            if (ev.acumulado >= ev.segundos) {
              ev.acumulado -= ev.segundos;
              this.lanzarEvento(ev, undefined, ev.clave);
            }
            break;
          case 'tecla': {
            const ocurre =
              e.modo === 'pulsa'
                ? ev.teclas.some((t) => entrada.sePulso(t))
                : e.modo === 'suelta'
                  ? ev.teclas.some((t) => entrada.seSolto(t))
                  : ev.teclas.some((t) => entrada.estaPulsada(t));
            if (ocurre) this.lanzarEvento(ev, undefined, e.modo === 'mantiene' ? ev.clave : null);
            break;
          }
          case 'pantalla':
            // Se lanza al pasar de "dentro de lo que se ve" a "fuera". Un objeto que
            // aparece fuera (un enemigo que entra desde arriba) no cuenta hasta que entra.
            if (this.enPantalla()) ev.acumulado = 1;
            else if (ev.acumulado === 1) {
              ev.acumulado = 0;
              this.lanzarEvento(ev);
            }
            break;
          case 'clic':
            // "cuando hago clic encima" lo reparte la Escena (alHacerClic): aquí solo el clic en cualquier sitio
            if (!e.encima && entrada.ratonSePulso('izquierdo')) this.lanzarEvento(ev);
            break;
        }
      }
    });
  }

  alTocar(otro: ObjetoJuego, casilla?: string): void {
    this.avisarContacto(otro, false, casilla);
  }

  alDejarDeTocar(otro: ObjetoJuego, casilla?: string): void {
    this.avisarContacto(otro, true, casilla);
  }

  recibeClics(): boolean {
    return !this.detenido && this.eventos.some((ev) => ev.evento.tipo === 'clic' && ev.evento.encima);
  }

  alHacerClic(): void {
    this.conArchivo(() => {
      for (const ev of this.eventos) if (ev.evento.tipo === 'clic' && ev.evento.encima) this.lanzarEvento(ev);
    });
  }

  alTerminarAnimacion(): void {
    this.conArchivo(() => {
      for (const ev of this.eventos) if (ev.evento.tipo === 'animacion') this.lanzarEvento(ev);
    });
  }

  alDestruir(): void {
    this.hilos = []; // los hilos dormidos de un objeto destruido no vuelven a despertar
  }

  // ───────────────────────── Interno ─────────────────────────

  /**
   * "cuando toco X": X puede ser el nombre del otro objeto, su tipo o, si es
   * una casilla de un mapa, el tipo de casilla ("cuando toco pinchos:").
   */
  private avisarContacto(otro: ObjetoJuego, dejar: boolean, casilla?: string): void {
    this.conArchivo(() => {
      for (const ev of this.eventos) {
        const e = ev.evento;
        if (e.tipo !== 'toco' || e.dejar !== dejar) continue;
        if (e.con !== null && normalizar(otro.nombre) !== e.con && normalizar(otro.tipo) !== e.con && (casilla === undefined || normalizar(casilla) !== e.con)) continue;
        if (this.objeto.destruido) return;
        this.lanzarEvento(ev, otro, null, casilla ?? null);
      }
    });
  }

  private lanzarEvento(ev: EventoRegistrado, otro?: ObjetoJuego, clave: string | null = null, casilla: string | null = null): void {
    const interprete = this.interprete;
    const entorno = this.entorno;
    function* cuerpo(): Ejecucion<void> {
      const local = new Entorno(entorno);
      if (otro) {
        local.declarar('otro', referencia(otro));
        local.declarar('casilla', casilla);
      }
      yield* interprete.ejecutarBloque(ev.cuerpo, local);
    }
    this.lanzar(cuerpo(), clave);
  }

  /** Crea un hilo y lo ejecuta YA hasta que termine o se duerma en un esperar(). */
  private lanzar(generador: Ejecucion<unknown>, clave: string | null): void {
    if (clave && this.hilos.some((h) => h.clave === clave)) return;
    const hilo: Hilo = { generador, clave, despertarEn: 0 };
    if (this.avanzarHilo(hilo)) this.hilos.push(hilo);
  }

  /** Avanza un hilo. Devuelve verdadero si se ha quedado dormido (sigue vivo). */
  private avanzarHilo(hilo: Hilo): boolean {
    this.interprete.reiniciarContadorDeVueltas();
    const r = this.comoObjetoActual(() => hilo.generador.next());
    if (r.done || this.objeto.destruido) return false;
    hilo.despertarEn = this.motor.tiempo.total + r.value.segundos;
    return true;
  }

  /** Ejecuta algo sabiendo que "yo" es este objeto (y deja como estaba el anterior). */
  private comoObjetoActual<T>(fn: () => T): T {
    const anterior = this.interprete.objetoActual;
    this.interprete.objetoActual = this.objeto;
    try {
      return fn();
    } finally {
      this.interprete.objetoActual = anterior;
    }
  }

  private despertarHilos(): void {
    if (this.hilos.length === 0) return;
    const ahora = this.motor.tiempo.total;
    for (const hilo of [...this.hilos]) {
      if (hilo.despertarEn > ahora || !this.hilos.includes(hilo)) continue;
      if (!this.avanzarHilo(hilo)) this.hilos = this.hilos.filter((h) => h !== hilo);
      if (this.objeto.destruido) return;
    }
  }

  /** ¿Se ve alguna parte del objeto en la pantalla? (los objetos de interfaz, siempre) */
  private enPantalla(): boolean {
    const escena = this.objeto.escena;
    if (!escena || this.objeto.obtener(Sprite)?.fijo) return true;
    const p = this.objeto.posicion;
    const caja = escena.cajaDe(this.objeto) ?? { izquierda: p.x, derecha: p.x, abajo: p.y, arriba: p.y };
    const v = escena.camara.zonaVisible();
    return caja.derecha >= v.izquierda && caja.izquierda <= v.derecha && caja.arriba >= v.abajo && caja.abajo <= v.arriba;
  }

  /** Evalúa una expresión al momento (sin permitir esperar). */
  private evaluarYa(expr: Expresion) {
    const r = this.comoObjetoActual(() => this.interprete.evaluar(expr, this.entorno).next());
    if (!r.done) throw new ErrorChispa(expr.pos, 'aquí no se puede usar esperar().');
    return r.value;
  }

  /**
   * Ejecuta algo del script con "red de seguridad":
   *  - añade el archivo y la línea de código a los errores de Chispa;
   *  - si hay a quién informar, informa, detiene ESTE script y el juego sigue.
   */
  private conArchivo(fn: () => void): void {
    if (this.detenido) return;
    try {
      fn();
    } catch (e) {
      if (!(e instanceof ErrorChispa)) throw e; // error interno del motor: sí para todo
      e.conArchivo(this.programa.archivo, this.programa.lineas);
      if (!this.informar) throw e;
      this.detener();
      this.informar(e, this.objeto);
    }
  }

  /** Para este script: sin más eventos ni hilos. El objeto sigue en la escena. */
  detener(): void {
    this.detenido = true;
    this.hilos = [];
    this.activo = false;
  }
}
