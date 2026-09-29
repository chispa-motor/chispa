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
 */
import type { Bloque, Evento, Programa } from './ast';
import { Entorno } from './entorno';
import { ErrorChispa } from './errores';
import type { Ejecucion, Interprete } from './interprete';
import { referencia } from './api';
import { nombreTipo } from './valores';
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
  linea: number;
  clave: string;
  /** Para eventos de teclado: nombres de tecla ya comprobados. */
  teclas: string[];
  /** Para `cada N segundos`. */
  segundos: number;
  acumulado: number;
}

export class ScriptChispa extends Componente {
  private entorno!: Entorno;
  private eventos: EventoRegistrado[] = [];
  private hilos: Hilo[] = [];

  constructor(
    private interprete: Interprete,
    readonly programa: Programa,
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
          linea: s.linea,
          clave: `evento${i}`,
          teclas: [],
          segundos: 0,
          acumulado: 0,
        };
        if (s.evento.tipo === 'tecla') {
          reg.teclas = s.evento.teclas.map((expr) => {
            const v = this.evaluarYa(expr, s.linea);
            if (typeof v !== 'string')
              throw new ErrorChispa(
                s.linea,
                `el nombre de la tecla tiene que ir entre comillas, pero es ${nombreTipo(v)}.`,
                'Ejemplo: cuando se pulsa "espacio":',
              );
            try {
              return this.motor.entrada.validarTecla(v);
            } catch (e) {
              if (e instanceof ErrorMotor)
                throw new ErrorChispa(s.linea, e.message.charAt(0).toLowerCase() + e.message.slice(1), e.pista);
              throw e;
            }
          });
        }
        if (s.evento.tipo === 'intervalo') {
          const v = this.evaluarYa(s.evento.segundos, s.linea);
          if (typeof v !== 'number' || v <= 0)
            throw new ErrorChispa(
              s.linea,
              "en 'cuando cada N segundos', N tiene que ser un número mayor que 0.",
              'Ejemplo: cuando cada 2 segundos:',
            );
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
          case 'clic':
            if (entrada.ratonSePulso('izquierdo')) this.lanzarEvento(ev);
            break;
        }
      }
    });
  }

  alTocar(otro: ObjetoJuego): void {
    this.avisarContacto(otro, false);
  }

  alDejarDeTocar(otro: ObjetoJuego): void {
    this.avisarContacto(otro, true);
  }

  alDestruir(): void {
    this.hilos = []; // los hilos dormidos de un objeto destruido no vuelven a despertar
  }

  // ───────────────────────── Interno ─────────────────────────

  private avisarContacto(otro: ObjetoJuego, dejar: boolean): void {
    this.conArchivo(() => {
      for (const ev of this.eventos) {
        const e = ev.evento;
        if (e.tipo !== 'toco' || e.dejar !== dejar) continue;
        if (e.con !== null && normalizar(otro.nombre) !== e.con && normalizar(otro.tipo) !== e.con) continue;
        if (this.objeto.destruido) return;
        this.lanzarEvento(ev, otro);
      }
    });
  }

  private lanzarEvento(ev: EventoRegistrado, otro?: ObjetoJuego, clave: string | null = null): void {
    const interprete = this.interprete;
    const entorno = this.entorno;
    function* cuerpo(): Ejecucion<void> {
      const local = new Entorno(entorno);
      if (otro) local.declarar('otro', referencia(otro));
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
    const r = hilo.generador.next();
    if (r.done || this.objeto.destruido) return false;
    hilo.despertarEn = this.motor.tiempo.total + r.value.segundos;
    return true;
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

  /** Evalúa una expresión al momento (sin permitir esperar). */
  private evaluarYa(expr: Parameters<Interprete['evaluar']>[0], linea: number) {
    const r = this.interprete.evaluar(expr, this.entorno).next();
    if (!r.done) throw new ErrorChispa(linea, 'aquí no se puede usar esperar().');
    return r.value;
  }

  /** Si hay un error de Chispa, le añade el nombre del archivo y la línea de código. */
  private conArchivo(fn: () => void): void {
    try {
      fn();
    } catch (e) {
      if (e instanceof ErrorChispa) e.conArchivo(this.programa.archivo, this.programa.lineas);
      throw e;
    }
  }
}
