/**
 * API DEL MOTOR: todo lo que el motor presta a Chispa (sección 8 de la especificación).
 *
 *   crear(), destruir(), buscar(), buscarTodos(), distancia()     → funciones globales
 *   teclado, raton, escena (+ escena.camara), sonido, tiempo,
 *   pantalla, juego, delta                                         → módulos
 *
 * Todos los nombres se buscan NORMALIZADOS (sin tildes ni mayúsculas):
 * `escena.cámara` y `escena.camara` son lo mismo.
 */
import { argNumero, argTexto, comoNumero } from './argumentos';
import { argObjeto, referencia, RefObjeto } from './objetos';
import { ErrorChispa } from '../errores/ErrorChispa';
import { sugerir } from '../errores/sugerencias';
import type { Posicion } from '../lexico/tokens';
import type { Interprete } from '../ejecucion/interprete';
import { Anfitrion, FuncionNativa, PeticionEspera, aTexto, copiarSiVector, type Valor } from '../ejecucion/valores';
import type { BotonRaton } from '../../motor/Entrada';
import type { Motor } from '../../motor/Motor';
import { Vector2 } from '../../motor/Vector2';
import type { Escena } from '../../objetos/Escena';
import type { ObjetoJuego } from '../../objetos/ObjetoJuego';
import { normalizar } from '../../utilidades/texto';

/** Lo que la API necesita del juego en marcha (lo implementa JuegoEnMarcha). */
export interface ContextoJuego {
  motor: Motor;
  escena: Escena;
  crearDesdePlantilla(nombre: string, x: number | null, y: number | null): ObjetoJuego;
  pedirReinicio(): void;
}

// ═════════════════════════ Módulo genérico ═════════════════════════

interface Propiedad {
  obtener: () => Valor;
  asignar?: (v: Valor, pos: Posicion) => void;
}
type Metodo = (args: Valor[], pos: Posicion) => Valor | PeticionEspera;

/** Un objeto del motor con propiedades y métodos: teclado, sonido, tiempo... */
class Modulo extends Anfitrion {
  constructor(
    private nombre: string,
    private props: Record<string, Propiedad>,
    private metodos: Record<string, Metodo> = {},
    /** Cómo se escribe cada nombre "bonito" (con mayúsculas) para las sugerencias. */
    private nombresBonitos: string[] = [],
  ) {
    super();
  }
  /** Módulos dentro de este módulo (escena.camara). */
  private submodulos: Record<string, Modulo> = {};

  describir() {
    return `'${this.nombre}'`;
  }
  propiedadesConocidas() {
    return this.nombresBonitos.length ? this.nombresBonitos : [...Object.keys(this.props), ...Object.keys(this.metodos)];
  }
  tieneMiembro(nombre: string): boolean {
    return nombre in this.props || nombre in this.metodos || nombre in this.submodulos;
  }
  submodulo(nombre: string): Anfitrion | null {
    return this.submodulos[nombre] ?? null;
  }
  /** Añade un módulo dentro de este (escena.camara). */
  agregarSubmodulo(nombre: string, modulo: Modulo): this {
    this.submodulos[nombre] = modulo;
    return this;
  }
  obtener(p: string, original: string, pos: Posicion): Valor {
    if (this.submodulos[p]) return this.submodulos[p];
    if (this.props[p]) return this.props[p].obtener();
    if (this.metodos[p]) return new FuncionNativa(`${this.nombre}.${original}`, this.metodos[p]);
    const s = sugerir(original, this.propiedadesConocidas());
    throw new ErrorChispa(
      pos,
      `'${this.nombre}' no tiene nada llamado '${original}'.`,
      s ? `¿Querías decir '${this.nombre}.${s}'?` : `Lo que tiene ${this.nombre}: ${this.propiedadesConocidas().join(', ')}.`,
    );
  }
  asignar(p: string, v: Valor, original: string, pos: Posicion): void {
    const prop = this.props[p];
    if (prop?.asignar) return prop.asignar(v, pos);
    throw new ErrorChispa(pos, `'${this.nombre}.${original}' no se puede cambiar${prop ? ', solo leer' : ' (no existe)'}.`);
  }
}

/**
 * `juego`: un sitio para guardar datos COMPARTIDOS entre todos los scripts
 * (puntos, vidas, nivel...). Como una carpeta de valores en ReplicatedStorage.
 */
export class DatosJuego extends Anfitrion {
  private datos = new Map<string, { valor: Valor; original: string }>();
  describir() {
    return "'juego'";
  }
  limpiar() {
    this.datos.clear();
  }
  obtener(p: string, original: string, pos: Posicion): Valor {
    const d = this.datos.get(p);
    if (d) return d.valor;
    const s = sugerir(original, [...this.datos.values()].map((x) => x.original));
    throw new ErrorChispa(
      pos,
      `todavía no hay nada guardado en 'juego.${original}'.`,
      s ? `¿Querías decir 'juego.${s}'?` : `Guarda primero un valor, por ejemplo en "cuando empieza": juego.${original} = 0`,
    );
  }
  asignar(p: string, v: Valor, original: string): void {
    this.datos.set(p, { valor: copiarSiVector(v), original });
  }
}

// ═════════════════════════ Instalar la API ═════════════════════════

const BOTONES: Record<string, BotonRaton> = { izquierdo: 'izquierdo', izquierda: 'izquierdo', derecho: 'derecho', derecha: 'derecho', medio: 'medio', central: 'medio' };

function argBoton(args: Valor[], funcion: string, pos: Posicion): BotonRaton {
  if (args[0] === undefined) return 'izquierdo';
  const b = BOTONES[normalizar(argTexto(args, 0, funcion, pos, `raton.${funcion}("izquierdo")`))];
  if (!b) throw new ErrorChispa(pos, `no conozco el botón del ratón "${aTexto(args[0])}".`, 'Los botones son: "izquierdo", "derecho" y "medio".');
  return b;
}

/** Añade al intérprete todo lo que depende del motor. */
export function instalarAPIMotor(interprete: Interprete, ctx: ContextoJuego, datos: DatosJuego): void {
  const g = interprete.globales;
  // OJO: no tocamos ctx.motor hasta que se USA una función. Así la API se puede
  // instalar sin juego en marcha (el editor la necesita para revisar el código).
  const funcion = (nombre: string, fn: Metodo) => g.declarar(normalizar(nombre), new FuncionNativa(nombre, fn), nombre);

  // ── Objetos ──
  funcion('crear', (a, p) => {
    const ej = 'crear("Bala", yo.x, yo.y)';
    const nombre = argTexto(a, 0, 'crear', p, ej);
    const x = a[1] === undefined ? null : argNumero(a, 1, 'crear', p, ej);
    const y = a[2] === undefined ? null : argNumero(a, 2, 'crear', p, ej);
    return referencia(ctx.crearDesdePlantilla(nombre, x, y));
  });
  funcion('destruir', (a, p) => {
    argObjeto(a, 0, 'destruir', p, 'destruir(otro)').destruir();
    return null;
  });
  funcion('buscar', (a, p) => {
    const o = ctx.escena.buscar(argTexto(a, 0, 'buscar', p, 'buscar("Jugador")'));
    return o ? referencia(o) : null;
  });
  funcion('buscarTodos', (a, p) => ctx.escena.buscarTodos(argTexto(a, 0, 'buscarTodos', p, 'buscarTodos("Enemigo")')).map(referencia));
  funcion('distancia', (a, p) => {
    const punto = (v: Valor | undefined) => (v instanceof RefObjeto ? v.objeto.posicion : v instanceof Vector2 ? v : null);
    const p1 = punto(a[0]);
    const p2 = punto(a[1]);
    if (!p1 || !p2) throw new ErrorChispa(p, "'distancia' necesita dos objetos o dos vectores.", 'Ejemplo: distancia(yo, otro)');
    return p1.distancia(p2);
  });

  // ── teclado ──
  g.declarar(
    'teclado',
    new Modulo('teclado', {}, {
      pulsada: (a, p) => ctx.motor.entrada.estaPulsada(argTexto(a, 0, 'teclado.pulsada', p, 'teclado.pulsada("izquierda")')),
      sepulso: (a, p) => ctx.motor.entrada.sePulso(argTexto(a, 0, 'teclado.sePulso', p, 'teclado.sePulso("espacio")')),
      sesolto: (a, p) => ctx.motor.entrada.seSolto(argTexto(a, 0, 'teclado.seSolto', p, 'teclado.seSolto("espacio")')),
    }, ['pulsada', 'sePulso', 'seSolto']),
  );

  // ── raton (coordenadas del mundo, con la Y hacia arriba) ──
  g.declarar(
    'raton',
    new Modulo(
      'raton',
      {
        x: { obtener: () => ctx.escena.ratonEnMundo().x },
        y: { obtener: () => ctx.escena.ratonEnMundo().y },
        posicion: { obtener: () => ctx.escena.ratonEnMundo() },
        rueda: { obtener: () => ctx.motor.entrada.rueda },
      },
      {
        pulsado: (a, p) => ctx.motor.entrada.ratonPulsado(argBoton(a, 'pulsado', p)),
        sepulso: (a, p) => ctx.motor.entrada.ratonSePulso(argBoton(a, 'sePulso', p)),
      },
      ['x', 'y', 'posicion', 'rueda', 'pulsado', 'sePulso'],
    ),
  );

  // ── escena (+ escena.camara) ──
  const cam = () => ctx.escena.camara;
  const camara = new Modulo(
    'escena.camara',
    {
      x: { obtener: () => cam().posicion.x, asignar: (v, p) => (cam().posicion.x = comoNumero(v, 'x', p)) },
      y: { obtener: () => cam().posicion.y, asignar: (v, p) => (cam().posicion.y = comoNumero(v, 'y', p)) },
      suavizado: { obtener: () => cam().suavizado, asignar: (v, p) => (cam().suavizado = comoNumero(v, 'suavizado', p)) },
    },
    {
      seguir: (a, p) => {
        cam().seguir(a[0] === null ? null : argObjeto(a, 0, 'escena.camara.seguir', p, 'escena.camara.seguir(yo)'));
        return null;
      },
      limites: (a, p) => {
        const ej = 'escena.camara.limites(0, 0, 3000, 540)';
        const n = (i: number) => argNumero(a, i, 'escena.camara.limites', p, ej);
        cam().limites = { izquierda: n(0), abajo: n(1), derecha: n(2), arriba: n(3) };
        return null;
      },
    },
    ['x', 'y', 'suavizado', 'seguir', 'limites'],
  );
  g.declarar(
    'escena',
    new Modulo(
      'escena',
      {
        objetos: { obtener: () => ctx.escena.objetos.filter((o) => !o.destruido).map(referencia) },
      },
      {
        reiniciar: () => {
          ctx.pedirReinicio();
          return null;
        },
      },
      ['objetos', 'camara', 'reiniciar'],
    ).agregarSubmodulo('camara', camara),
  );

  // ── sonido ──
  g.declarar(
    'sonido',
    new Modulo(
      'sonido',
      { volumen: { obtener: () => ctx.motor.sonido.volumen, asignar: (v, p) => (ctx.motor.sonido.volumen = comoNumero(v, 'volumen', p)) } },
      {
        reproducir: (a, p) => {
          ctx.motor.sonido.reproducir(argTexto(a, 0, 'ctx.motor.sonido.reproducir', p, 'ctx.motor.sonido.reproducir("salto")'));
          return null;
        },
        parar: (a, p) => {
          ctx.motor.sonido.parar(a[0] === undefined ? undefined : argTexto(a, 0, 'ctx.motor.sonido.parar', p, 'ctx.motor.sonido.parar("musica")'));
          return null;
        },
        tono: (a, p) => {
          const ej = 'ctx.motor.sonido.tono(440, 0.2)';
          const f = argNumero(a, 0, 'ctx.motor.sonido.tono', p, ej);
          const s = argNumero(a, 1, 'ctx.motor.sonido.tono', p, ej, 0.2);
          if (f <= 0 || s <= 0) throw new ErrorChispa(p, 'la frecuencia y la duración del tono tienen que ser mayores que 0.', ej);
          ctx.motor.sonido.tono(f, s);
          return null;
        },
      },
      ['volumen', 'reproducir', 'parar', 'tono'],
    ),
  );

  // ── tiempo, pantalla, juego, delta ──
  g.declarar(
    'tiempo',
    new Modulo('tiempo', {
      total: { obtener: () => ctx.motor.tiempo.total },
      delta: { obtener: () => ctx.motor.tiempo.delta },
      escala: { obtener: () => ctx.motor.tiempo.escala, asignar: (v, p) => (ctx.motor.tiempo.escala = Math.max(0, comoNumero(v, 'escala', p))) },
    }),
  );
  g.declarar(
    'pantalla',
    new Modulo('pantalla', {
      ancho: { obtener: () => ctx.motor.renderizador.ancho },
      alto: { obtener: () => ctx.motor.renderizador.alto },
    }),
  );
  g.declarar('juego', datos);
  g.declarar('delta', 0);
}
