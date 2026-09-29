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
import { MapaCasillas } from '../../objetos/componentes/MapaCasillas';
import { TIPOS_PARTICULAS, type ConfigParticulas } from '../../objetos/Particulas';
import { deserializar, serializar } from './guardado';
import { Tabla } from '../ejecucion/valores';

/** Lo que la API necesita del juego en marcha (lo implementa JuegoEnMarcha). */
export interface ContextoJuego {
  motor: Motor;
  escena: Escena;
  /** Nombre de la escena que se está jugando. */
  nombreEscena: string;
  crearDesdePlantilla(nombre: string, x: number | null, y: number | null): ObjetoJuego;
  pedirReinicio(): void;
  cambiarEscena(nombre: string): void;
  /** Datos del jugador (texto JSON), guardados en el navegador. */
  guardarDato(clave: string, texto: string): void;
  cargarDato(clave: string): string | null;
  borrarDato(clave: string): void;
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
  /** Lee un dato desde fuera del lenguaje (el editor, el tutorial). `undefined` si no hay nada guardado. */
  leer(nombre: string): Valor | undefined {
    const d = this.datos.get(nombre) ?? [...this.datos.values()].find((x) => x.original === nombre);
    return d?.valor;
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
  /** Dónde está el objeto que ejecuta el código ahora (para crear() y particulas() sin posición). */
  const aqui = (): Vector2 | null => (interprete.objetoActual as ObjetoJuego | null)?.posicion ?? null;

  // ── Objetos ──
  funcion('crear', (a, p) => {
    const ej = 'crear("Bala", yo.x, yo.y)';
    const nombre = argTexto(a, 0, 'crear', p, ej);
    // Sin posición: donde está el objeto que lo crea (la bala sale de la nave)
    const x = a[1] === undefined ? aqui()?.x ?? null : argNumero(a, 1, 'crear', p, ej);
    const y = a[2] === undefined ? aqui()?.y ?? null : argNumero(a, 2, 'crear', p, ej);
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
        sesolto: (a, p) => ctx.motor.entrada.ratonSeSolto(argBoton(a, 'seSolto', p)),
      },
      ['x', 'y', 'posicion', 'rueda', 'pulsado', 'sePulso', 'seSolto'],
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
      zoom: {
        obtener: () => cam().zoom,
        asignar: (v, p) => {
          const z = comoNumero(v, 'zoom', p);
          if (z <= 0) throw new ErrorChispa(p, 'el zoom tiene que ser mayor que 0.', '1 = normal, 2 = más cerca (el doble de grande), 0.5 = más lejos.');
          cam().zoom = z;
        },
      },
    },
    {
      seguir: (a, p) => {
        cam().seguir(a[0] === null ? null : argObjeto(a, 0, 'escena.camara.seguir', p, 'escena.camara.seguir(yo)'));
        return null;
      },
      limites: (a, p) => {
        // Con un objeto: la zona que ocupa (un mapa de casillas, o su caja). Sin nada: quita los límites.
        if (a.length === 0 || a[0] === null) {
          cam().limites = null;
          return null;
        }
        if (a.length === 1 && a[0] instanceof RefObjeto) {
          const o = argObjeto(a, 0, 'escena.camara.limites', p, 'escena.camara.limites(buscar("Mapa"))');
          const l = o.obtener(MapaCasillas)?.limites() ?? ctx.escena.cajaDe(o);
          if (!l) throw new ErrorChispa(p, `'${o.nombre}' no ocupa ninguna zona (no tiene casillas pintadas ni tamaño).`, 'Pinta casillas en el mapa, o usa números: escena.camara.limites(0, 0, 3000, 540)');
          cam().limites = { ...l };
          return null;
        }
        const ej = 'escena.camara.limites(0, 0, 3000, 540)';
        const n = (i: number) => argNumero(a, i, 'escena.camara.limites', p, ej);
        cam().limites = { izquierda: n(0), abajo: n(1), derecha: n(2), arriba: n(3) };
        return null;
      },
      temblar: (a, p) => {
        const ej = 'escena.camara.temblar(8, 0.3)';
        cam().temblar(argNumero(a, 0, 'escena.camara.temblar', p, ej, 8), argNumero(a, 1, 'escena.camara.temblar', p, ej, 0.3));
        return null;
      },
    },
    ['x', 'y', 'zoom', 'suavizado', 'seguir', 'limites', 'temblar'],
  );
  g.declarar(
    'escena',
    new Modulo(
      'escena',
      {
        objetos: { obtener: () => ctx.escena.objetos.filter((o) => !o.destruido).map(referencia) },
        nombre: { obtener: () => ctx.nombreEscena },
        gravedad: { obtener: () => ctx.escena.gravedad, asignar: (v, p) => (ctx.escena.gravedad = comoNumero(v, 'gravedad', p)) },
      },
      {
        reiniciar: () => {
          ctx.pedirReinicio();
          return null;
        },
        cambiar: (a, p) => {
          ctx.cambiarEscena(argTexto(a, 0, 'escena.cambiar', p, 'escena.cambiar("Nivel2")'));
          return null;
        },
      },
      ['objetos', 'nombre', 'gravedad', 'camara', 'reiniciar', 'cambiar'],
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
          ctx.motor.sonido.reproducir(argTexto(a, 0, 'sonido.reproducir', p, 'sonido.reproducir("salto")'));
          return null;
        },
        parar: (a, p) => {
          ctx.motor.sonido.parar(a[0] === undefined ? undefined : argTexto(a, 0, 'sonido.parar', p, 'sonido.parar("salto")'));
          return null;
        },
        tono: (a, p) => {
          const ej = 'sonido.tono(440, 0.2)';
          const f = argNumero(a, 0, 'sonido.tono', p, ej);
          const s = argNumero(a, 1, 'sonido.tono', p, ej, 0.2);
          if (f <= 0 || s <= 0) throw new ErrorChispa(p, 'la frecuencia y la duración del tono tienen que ser mayores que 0.', ej);
          ctx.motor.sonido.tono(f, s);
          return null;
        },
      },
      ['volumen', 'reproducir', 'parar', 'tono'],
    ),
  );

  // ── musica (en bucle; solo una a la vez) ──
  g.declarar(
    'musica',
    new Modulo(
      'musica',
      {
        volumen: { obtener: () => ctx.motor.sonido.volumenMusica, asignar: (v, p) => (ctx.motor.sonido.volumenMusica = comoNumero(v, 'volumen', p)) },
        actual: { obtener: () => ctx.motor.sonido.musicaActual },
      },
      {
        reproducir: (a, p) => {
          ctx.motor.sonido.musica(argTexto(a, 0, 'musica.reproducir', p, 'musica.reproducir("tema")'));
          return null;
        },
        parar: () => {
          ctx.motor.sonido.pararMusica();
          return null;
        },
      },
      ['volumen', 'actual', 'reproducir', 'parar'],
    ),
  );

  // ── partículas ──
  funcion('particulas', (a, p) => {
    const ej = 'particulas("explosion", yo.x, yo.y)';
    const config = configParticulas(a[0], p);
    // Sin posición: donde está el objeto que las pide
    const x = a[1] === undefined && aqui() ? aqui()!.x : argNumero(a, 1, 'particulas', p, ej);
    const y = a[2] === undefined && aqui() ? aqui()!.y : argNumero(a, 2, 'particulas', p, ej);
    ctx.escena.particulas.emitir(config, x, y);
    return null;
  });

  // ── guardar y cargar datos del jugador ──
  funcion('guardar', (a, p) => {
    const clave = argTexto(a, 0, 'guardar', p, 'guardar("record", puntos)');
    if (a.length < 2) throw new ErrorChispa(p, `falta el valor que quieres guardar en "${clave}".`, `Ejemplo: guardar("${clave}", puntos)`);
    ctx.guardarDato(clave, serializar(a[1], p));
    return null;
  });
  funcion('cargar', (a, p) => {
    const texto = ctx.cargarDato(argTexto(a, 0, 'cargar', p, 'cargar("record", 0)'));
    if (texto === null) return a[1] ?? null; // nunca se había guardado: el valor por defecto
    try {
      return deserializar(texto);
    } catch {
      return a[1] ?? null;
    }
  });
  funcion('borrarGuardado', (a, p) => {
    ctx.borrarDato(argTexto(a, 0, 'borrarGuardado', p, 'borrarGuardado("record")'));
    return null;
  });

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

/**
 * Convierte el primer valor de particulas(...) en una configuración:
 *   - un texto con un tipo preparado: "explosion", "humo", "chispas", "polvo", "confeti", "estrellas"
 *   - una tabla con lo que quieras cambiar: {tipo: "humo", color: "verde", cantidad: 50}
 */
function configParticulas(v: Valor | undefined, p: Posicion): ConfigParticulas {
  const tipos = Object.keys(TIPOS_PARTICULAS);
  const porTipo = (nombre: string): ConfigParticulas => {
    const t = TIPOS_PARTICULAS[normalizar(nombre)];
    if (t) return { ...t };
    const parecido = sugerir(nombre, tipos);
    throw new ErrorChispa(p, `no hay ningún tipo de partículas llamado "${nombre}".`, parecido ? `¿Querías decir "${parecido}"?` : `Los tipos son: ${tipos.join(', ')}.`);
  };
  if (typeof v === 'string') return porTipo(v);
  if (!(v instanceof Tabla)) {
    throw new ErrorChispa(p, "'particulas' necesita un tipo (un texto) o una tabla con la configuración.", `Ejemplos: particulas("explosion", yo.x, yo.y)   ·   particulas({tipo: "humo", color: "verde"}, yo.x, yo.y)`);
  }
  const base = v.tiene('tipo') ? porTipo(String(v.obtener('tipo'))) : { ...TIPOS_PARTICULAS.explosion };
  const numero = (clave: string, campo: keyof ConfigParticulas) => {
    if (!v.tiene(clave)) return;
    const n = v.obtener(clave);
    if (typeof n !== 'number') throw new ErrorChispa(p, `en las partículas, '${clave}' tiene que ser un número.`);
    (base[campo] as number) = n;
  };
  numero('cantidad', 'cantidad');
  numero('velocidad', 'velocidad');
  numero('vida', 'vida');
  numero('tamaño', 'tamano');
  numero('tamano', 'tamano');
  numero('gravedad', 'gravedad');
  numero('dispersion', 'dispersion');
  numero('direccion', 'direccion');
  if (v.tiene('color')) base.colores = [aTexto(v.obtener('color') ?? null)];
  if (v.tiene('colores')) {
    const c = v.obtener('colores');
    base.colores = Array.isArray(c) ? c.map((x) => aTexto(x)) : [aTexto(c ?? null)];
  }
  if (v.tiene('encoger')) base.encoger = v.obtener('encoger') === true;
  const validas = ['tipo', 'cantidad', 'velocidad', 'vida', 'tamaño', 'tamano', 'gravedad', 'dispersion', 'direccion', 'color', 'colores', 'encoger'];
  for (const k of v.claves()) {
    if (!validas.includes(normalizar(k))) {
      const parecida = sugerir(k, validas);
      throw new ErrorChispa(p, `las partículas no tienen ninguna opción llamada '${k}'.`, parecida ? `¿Querías decir '${parecida}'?` : `Las opciones son: ${validas.join(', ')}.`);
    }
  }
  return base;
}
