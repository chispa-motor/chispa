/**
 * API DE CHISPA: todo lo que el motor presta al lenguaje.
 *
 *   yo / otro       → objetos del juego (RefObjeto)
 *   teclado, raton, camara, escena, tiempo, pantalla, juego → módulos
 *   crear(), destruir(), esperar(), aleatorio()...        → funciones globales
 *
 * Todos los nombres se buscan NORMALIZADOS (minúsculas, sin tildes), así que
 * `yo.posición`, `Yo.Posicion` y `yo.posicion` son lo mismo.
 */
import { Entorno } from './entorno';
import { ErrorChispa, sugerir } from './errores';
import type { Interprete } from './interprete';
import { Anfitrion, FuncionNativa, PeticionEspera, aTexto, copiarSiVector, nombreTipo, type Valor } from './valores';
import type { Motor } from '../motor/Motor';
import type { BotonRaton } from '../motor/Entrada';
import { Vector2 } from '../motor/Vector2';
import type { Escena } from '../objetos/Escena';
import type { ObjetoJuego } from '../objetos/ObjetoJuego';
import { Colision } from '../objetos/componentes/Colision';
import { Fisica } from '../objetos/componentes/Fisica';
import { Sprite } from '../objetos/componentes/Sprite';
import { normalizar } from '../utilidades/texto';

/** Lo que la API necesita del juego en marcha (lo implementa JuegoEnMarcha). */
export interface ContextoJuego {
  motor: Motor;
  escena: Escena;
  crearDesdePlantilla(nombre: string, x: number | null, y: number | null): ObjetoJuego;
  pedirReinicio(): void;
}

// ═════════════════════════ Comprobación de argumentos ═════════════════════════

function argNumero(args: Valor[], i: number, funcion: string, linea: number, ejemplo: string, porDefecto?: number): number {
  const v = args[i];
  if (v === undefined && porDefecto !== undefined) return porDefecto;
  if (typeof v !== 'number') {
    throw new ErrorChispa(
      linea,
      v === undefined
        ? `a '${funcion}' le falta un número (el valor ${i + 1}).`
        : `'${funcion}' necesita un número como valor ${i + 1}, pero le das ${nombreTipo(v)}.`,
      `Ejemplo: ${ejemplo}`,
    );
  }
  return v;
}

function argTexto(args: Valor[], i: number, funcion: string, linea: number, ejemplo: string): string {
  const v = args[i];
  if (typeof v !== 'string') {
    throw new ErrorChispa(
      linea,
      v === undefined
        ? `a '${funcion}' le falta un texto entre comillas.`
        : `'${funcion}' necesita un texto entre comillas, pero le das ${nombreTipo(v)}.`,
      `Ejemplo: ${ejemplo}`,
    );
  }
  return v;
}

function argObjeto(args: Valor[], i: number, funcion: string, linea: number, ejemplo: string): ObjetoJuego {
  const v = args[i];
  if (!(v instanceof RefObjeto)) {
    throw new ErrorChispa(
      linea,
      v === null
        ? `a '${funcion}' le has dado un objeto vacío (nulo): ese objeto no existe.`
        : `'${funcion}' necesita un objeto del juego, pero le das ${v === undefined ? 'nada' : nombreTipo(v)}.`,
      `Ejemplo: ${ejemplo}`,
    );
  }
  return v.objeto;
}

function sinTodos(args: Valor[], cuantos: number, funcion: string, linea: number, ejemplo: string): void {
  if (args.length > cuantos) {
    throw new ErrorChispa(
      linea,
      `a '${funcion}' le das demasiados valores (${args.length}; como mucho ${cuantos}).`,
      `Ejemplo: ${ejemplo}`,
    );
  }
}

// ═════════════════════════ Módulo genérico ═════════════════════════

interface Propiedad {
  obtener: () => Valor;
  asignar?: (v: Valor, linea: number) => void;
}
type Metodo = (args: Valor[], linea: number) => Valor | PeticionEspera;

/** Un objeto del motor con propiedades y métodos: teclado, camara, tiempo... */
class Modulo extends Anfitrion {
  constructor(
    private nombre: string,
    private props: Record<string, Propiedad>,
    private metodos: Record<string, Metodo> = {},
  ) {
    super();
  }
  describir() {
    return `'${this.nombre}'`;
  }
  propiedadesConocidas() {
    return [...Object.keys(this.props), ...Object.keys(this.metodos)];
  }
  obtener(p: string, original: string, linea: number): Valor {
    if (this.props[p]) return this.props[p].obtener();
    if (this.metodos[p]) return new FuncionNativa(`${this.nombre}.${original}`, this.metodos[p]);
    const s = sugerir(p, this.propiedadesConocidas());
    throw new ErrorChispa(
      linea,
      `'${this.nombre}' no tiene nada llamado '${original}'.`,
      s ? `¿Querías decir '${this.nombre}.${s}'?` : `Lo que tiene ${this.nombre}: ${this.propiedadesConocidas().join(', ')}.`,
    );
  }
  asignar(p: string, v: Valor, original: string, linea: number): void {
    const prop = this.props[p];
    if (prop?.asignar) return prop.asignar(v, linea);
    throw new ErrorChispa(linea, `'${this.nombre}.${original}' no se puede cambiar${prop ? ', solo leer' : ' (no existe)'}.`);
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
  obtener(p: string, original: string, linea: number): Valor {
    const d = this.datos.get(p);
    if (d) return d.valor;
    const s = sugerir(
      p,
      [...this.datos.values()].map((x) => x.original),
    );
    throw new ErrorChispa(
      linea,
      `todavía no hay nada guardado en 'juego.${original}'.`,
      s ? `¿Querías decir 'juego.${s}'?` : `Guarda primero un valor, por ejemplo en "cuando empieza": juego.${original} = 0`,
    );
  }
  asignar(p: string, v: Valor, original: string): void {
    this.datos.set(p, { valor: copiarSiVector(v), original });
  }
}

// ═════════════════════════ Objetos del juego (yo, otro...) ═════════════════════════

/** Una sola RefObjeto por objeto, para que `otro == jugador` funcione (mismo objeto = misma referencia). */
const referencias = new WeakMap<ObjetoJuego, RefObjeto>();
export function referencia(o: ObjetoJuego): RefObjeto {
  let r = referencias.get(o);
  if (!r) referencias.set(o, (r = new RefObjeto(o)));
  return r;
}

function necesitaFisica(o: ObjetoJuego, prop: string, linea: number): Fisica {
  const f = o.obtener(Fisica);
  if (!f) {
    throw new ErrorChispa(
      linea,
      `el objeto '${o.nombre}' no tiene física, así que no tiene '${prop}'.`,
      'Añádele física en el proyecto (fisica: {}) para que pueda moverse con velocidad y gravedad.',
    );
  }
  return f;
}
function necesitaSprite(o: ObjetoJuego, prop: string, linea: number): Sprite {
  const s = o.obtener(Sprite);
  if (!s) throw new ErrorChispa(linea, `el objeto '${o.nombre}' no tiene sprite (aspecto), así que no tiene '${prop}'.`);
  return s;
}
function comoNumero(v: Valor, prop: string, linea: number): number {
  if (typeof v !== 'number') throw new ErrorChispa(linea, `'${prop}' tiene que ser un número, pero le das ${nombreTipo(v)}.`);
  return v;
}
function comoLogico(v: Valor, prop: string, linea: number): boolean {
  if (typeof v !== 'boolean')
    throw new ErrorChispa(linea, `'${prop}' tiene que ser verdadero o falso, pero le das ${nombreTipo(v)}.`);
  return v;
}
function comoVector(v: Valor, prop: string, linea: number): Vector2 {
  if (!(v instanceof Vector2)) {
    throw new ErrorChispa(
      linea,
      `'${prop}' tiene que ser un vector, pero le das ${nombreTipo(v)}.`,
      `Crea uno con vector(x, y). Ejemplo: yo.${prop} = vector(0, 0)`,
    );
  }
  return v;
}

interface PropiedadObjeto {
  obtener: (o: ObjetoJuego, linea: number) => Valor;
  asignar?: (o: ObjetoJuego, v: Valor, linea: number) => void;
}

/** Propiedades de cualquier objeto. Clave normalizada → cómo leerla y escribirla. */
const PROPIEDADES_OBJETO: Record<string, PropiedadObjeto> = {
  nombre: { obtener: (o) => o.nombre, asignar: (o, v) => (o.nombre = aTexto(v)) },
  tipo: { obtener: (o) => o.tipo },
  x: { obtener: (o) => o.posicion.x, asignar: (o, v, l) => (o.posicion.x = comoNumero(v, 'x', l)) },
  y: { obtener: (o) => o.posicion.y, asignar: (o, v, l) => (o.posicion.y = comoNumero(v, 'y', l)) },
  // Devolvemos el vector "vivo": así yo.posicion.x = 5 mueve el objeto de verdad.
  posicion: {
    obtener: (o) => o.posicion,
    asignar: (o, v, l) => {
      const p = comoVector(v, 'posicion', l);
      o.posicion.x = p.x;
      o.posicion.y = p.y;
    },
  },
  rotacion: {
    obtener: (o) => o.transformacion.rotacion,
    asignar: (o, v, l) => (o.transformacion.rotacion = comoNumero(v, 'rotacion', l)),
  },
  escala: {
    obtener: (o) => o.transformacion.escala,
    asignar: (o, v, l) => {
      // yo.escala = 2 (igual en los dos ejes) o yo.escala = vector(2, 1)
      const e = typeof v === 'number' ? new Vector2(v, v) : comoVector(v, 'escala', l);
      o.transformacion.escala.x = e.x;
      o.transformacion.escala.y = e.y;
    },
  },
  velocidad: {
    obtener: (o, l) => necesitaFisica(o, 'velocidad', l).velocidad,
    asignar: (o, v, l) => {
      const f = necesitaFisica(o, 'velocidad', l);
      const nv = comoVector(v, 'velocidad', l);
      f.velocidad.x = nv.x;
      f.velocidad.y = nv.y;
    },
  },
  gravedad: {
    obtener: (o, l) => necesitaFisica(o, 'gravedad', l).gravedad,
    asignar: (o, v, l) => (necesitaFisica(o, 'gravedad', l).gravedad = comoNumero(v, 'gravedad', l)),
  },
  ensuelo: { obtener: (o, l) => necesitaFisica(o, 'enSuelo', l).enSuelo },
  tocapared: { obtener: (o, l) => necesitaFisica(o, 'tocaPared', l).tocaPared },
  tocatecho: { obtener: (o, l) => necesitaFisica(o, 'tocaTecho', l).tocaTecho },
  color: {
    obtener: (o, l) => necesitaSprite(o, 'color', l).color,
    asignar: (o, v, l) => (necesitaSprite(o, 'color', l).color = aTexto(v)),
  },
  visible: {
    obtener: (o, l) => necesitaSprite(o, 'visible', l).visible,
    asignar: (o, v, l) => (necesitaSprite(o, 'visible', l).visible = comoLogico(v, 'visible', l)),
  },
  ancho: {
    obtener: (o, l) => necesitaSprite(o, 'ancho', l).ancho,
    asignar: (o, v, l) => (necesitaSprite(o, 'ancho', l).ancho = comoNumero(v, 'ancho', l)),
  },
  alto: {
    obtener: (o, l) => necesitaSprite(o, 'alto', l).alto,
    asignar: (o, v, l) => (necesitaSprite(o, 'alto', l).alto = comoNumero(v, 'alto', l)),
  },
  texto: {
    obtener: (o, l) => necesitaSprite(o, 'texto', l).texto,
    asignar: (o, v, l) => (necesitaSprite(o, 'texto', l).texto = aTexto(v)),
  },
  tamano: {
    obtener: (o, l) => necesitaSprite(o, 'tamaño', l).tamano,
    asignar: (o, v, l) => (necesitaSprite(o, 'tamaño', l).tamano = comoNumero(v, 'tamaño', l)),
  },
  imagen: {
    obtener: (o, l) => necesitaSprite(o, 'imagen', l).imagen,
    asignar: (o, v, l) => {
      const s = necesitaSprite(o, 'imagen', l);
      if (v === null) s.imagen = null;
      else {
        const nombre = aTexto(v);
        o.escena?.motor.recursos.imagen(nombre); // comprueba que existe (da error amable si no)
        s.imagen = nombre;
      }
    },
  },
  opacidad: {
    obtener: (o, l) => necesitaSprite(o, 'opacidad', l).opacidad,
    asignar: (o, v, l) => (necesitaSprite(o, 'opacidad', l).opacidad = Math.min(1, Math.max(0, comoNumero(v, 'opacidad', l)))),
  },
  voltear: {
    obtener: (o, l) => necesitaSprite(o, 'voltear', l).voltearX,
    asignar: (o, v, l) => (necesitaSprite(o, 'voltear', l).voltearX = comoLogico(v, 'voltear', l)),
  },
  capa: {
    obtener: (o, l) => necesitaSprite(o, 'capa', l).capa,
    asignar: (o, v, l) => (necesitaSprite(o, 'capa', l).capa = comoNumero(v, 'capa', l)),
  },
  solido: {
    obtener: (o) => o.obtener(Colision)?.solido ?? false,
    asignar: (o, v, l) => {
      const c = o.obtener(Colision);
      if (!c) throw new ErrorChispa(l, `el objeto '${o.nombre}' no tiene colisión.`);
      c.solido = comoLogico(v, 'solido', l);
    },
  },
  destruido: { obtener: (o) => o.destruido },
};

/** Métodos de cualquier objeto: yo.saltar(), yo.mover(10, 0)... */
const METODOS_OBJETO: Record<string, (o: ObjetoJuego, args: Valor[], linea: number) => Valor> = {
  saltar: (o, a, l) => {
    // Solo salta si está en el suelo. Devuelve verdadero si ha saltado.
    const f = necesitaFisica(o, 'saltar', l);
    const fuerza = argNumero(a, 0, 'saltar', l, 'yo.saltar(600)', 600);
    if (!f.enSuelo) return false;
    f.velocidad.y = -Math.abs(fuerza); // negativo = hacia arriba (la Y crece hacia abajo)
    f.enSuelo = false;
    return true;
  },
  mover: (o, a, l) => {
    o.posicion.x += argNumero(a, 0, 'mover', l, 'yo.mover(10, 0)');
    o.posicion.y += argNumero(a, 1, 'mover', l, 'yo.mover(10, 0)', 0);
    return null;
  },
  rotar: (o, a, l) => {
    o.transformacion.rotacion += argNumero(a, 0, 'rotar', l, 'yo.rotar(90)');
    return null;
  },
  destruir: (o) => {
    o.destruir();
    return null;
  },
  distanciaa: (o, a, l) => o.posicion.distancia(argObjeto(a, 0, 'distanciaA', l, 'yo.distanciaA(otro)').posicion),
};

export class RefObjeto extends Anfitrion {
  constructor(readonly objeto: ObjetoJuego) {
    super();
  }
  describir() {
    return `el objeto '${this.objeto.nombre}'`;
  }
  propiedadesConocidas(): string[] {
    const propias = [...this.objeto.propiedades.keys()];
    return [
      'nombre',
      'tipo',
      'x',
      'y',
      'posicion',
      'rotacion',
      'escala',
      'velocidad',
      'gravedad',
      'enSuelo',
      'tocaPared',
      'tocaTecho',
      'color',
      'visible',
      'ancho',
      'alto',
      'texto',
      'tamaño',
      'imagen',
      'opacidad',
      'voltear',
      'capa',
      'solido',
      'destruido',
      'saltar',
      'mover',
      'rotar',
      'destruir',
      'distanciaA',
      ...propias,
    ];
  }
  obtener(p: string, original: string, linea: number): Valor {
    const o = this.objeto;
    if (PROPIEDADES_OBJETO[p]) return PROPIEDADES_OBJETO[p].obtener(o, linea);
    if (METODOS_OBJETO[p]) return new FuncionNativa(original, (args, l) => METODOS_OBJETO[p](o, args, l));
    // Propiedades inventadas (yo.vida, yo.puntos...)
    const propia = o.propiedades.get(p) as { valor: Valor } | undefined;
    if (propia) return propia.valor;
    const s = sugerir(
      original,
      this.propiedadesConocidas().concat([...o.propiedades.values()].map((x) => (x as { original: string }).original)),
    );
    throw new ErrorChispa(
      linea,
      `el objeto '${o.nombre}' no tiene nada llamado '${original}'.`,
      s
        ? `¿Querías decir '${s}'?`
        : `Si es una propiedad tuya, dale un valor antes, por ejemplo en "cuando empieza": yo.${original} = 0`,
    );
  }
  asignar(p: string, v: Valor, original: string, linea: number): void {
    const prop = PROPIEDADES_OBJETO[p];
    if (prop) {
      if (!prop.asignar)
        throw new ErrorChispa(
          linea,
          `'${original}' solo se puede leer, no cambiar${p.startsWith('toca') || p === 'ensuelo' ? ': lo calcula la física' : ''}.`,
        );
      return prop.asignar(this.objeto, v, linea);
    }
    if (METODOS_OBJETO[p])
      throw new ErrorChispa(
        linea,
        `'${original}' es una acción del objeto (se usa con paréntesis), no se le puede dar un valor.`,
        `Ejemplo: yo.${original}(...)`,
      );
    this.objeto.propiedades.set(p, { valor: copiarSiVector(v), original });
  }
}

// ═════════════════════════ Crear la API ═════════════════════════

const BOTONES: Record<string, BotonRaton> = {
  izquierdo: 'izquierdo',
  izquierda: 'izquierdo',
  derecho: 'derecho',
  derecha: 'derecho',
  medio: 'medio',
  central: 'medio',
};

function argBoton(args: Valor[], funcion: string, linea: number): BotonRaton {
  if (args[0] === undefined) return 'izquierdo';
  const b = BOTONES[normalizar(argTexto(args, 0, funcion, linea, `raton.${funcion}("izquierdo")`))];
  if (!b)
    throw new ErrorChispa(
      linea,
      `no conozco el botón del ratón "${aTexto(args[0])}".`,
      'Los botones son: "izquierdo", "derecho" y "medio".',
    );
  return b;
}

/** Rellena las variables globales del intérprete con toda la API. */
export function instalarAPI(interprete: Interprete, ctx: ContextoJuego, datos: DatosJuego): void {
  const g: Entorno = interprete.globales;
  const { motor } = ctx;
  const entrada = motor.entrada;
  const funcion = (nombre: string, fn: Metodo, ...alias: string[]) => {
    for (const n of [nombre, ...alias]) g.declarar(normalizar(n), new FuncionNativa(nombre, fn), n);
  };

  // ── Tiempo ──
  funcion('esperar', (a, l) => {
    const s = argNumero(a, 0, 'esperar', l, 'esperar(1)', 0);
    if (s < 0) throw new ErrorChispa(l, 'no se puede esperar un tiempo negativo.');
    return new PeticionEspera(s);
  });

  // ── Objetos ──
  funcion('crear', (a, l) => {
    const nombre = argTexto(a, 0, 'crear', l, 'crear("Bala", yo.x, yo.y)');
    const x = a[1] === undefined ? null : argNumero(a, 1, 'crear', l, 'crear("Bala", 100, 200)');
    const y = a[2] === undefined ? null : argNumero(a, 2, 'crear', l, 'crear("Bala", 100, 200)');
    return referencia(ctx.crearDesdePlantilla(nombre, x, y));
  });
  funcion('destruir', (a, l) => {
    argObjeto(a, 0, 'destruir', l, 'destruir(otro)').destruir();
    return null;
  });
  funcion('buscar', (a, l) => {
    const o = ctx.escena.buscar(argTexto(a, 0, 'buscar', l, 'buscar("Jugador")'));
    return o ? referencia(o) : null;
  });
  funcion('buscarTodos', (a, l) =>
    ctx.escena.buscarTodos(argTexto(a, 0, 'buscarTodos', l, 'buscarTodos("Enemigo")')).map(referencia),
  );

  // ── Matemáticas ──
  funcion('aleatorio', (a, l) => {
    // aleatorio() → decimal entre 0 y 1.  aleatorio(1, 6) → entero entre 1 y 6 (incluidos)
    if (a.length === 0) return Math.random();
    const min = argNumero(a, 0, 'aleatorio', l, 'aleatorio(1, 6)');
    const max = argNumero(a, 1, 'aleatorio', l, 'aleatorio(1, 6)');
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
  });
  funcion('redondear', (a, l) => {
    const d = argNumero(a, 1, 'redondear', l, 'redondear(3.14159, 2)', 0);
    const f = 10 ** d;
    return Math.round(argNumero(a, 0, 'redondear', l, 'redondear(3.7)') * f) / f;
  });
  funcion('absoluto', (a, l) => Math.abs(argNumero(a, 0, 'absoluto', l, 'absoluto(-5)')));
  funcion(
    'raiz',
    (a, l) => {
      const n = argNumero(a, 0, 'raiz', l, 'raiz(16)');
      if (n < 0) throw new ErrorChispa(l, 'no existe la raíz cuadrada de un número negativo.');
      return Math.sqrt(n);
    },
    'raíz',
  );
  funcion('minimo', (a, l) => Math.min(...a.map((_, i) => argNumero(a, i, 'minimo', l, 'minimo(3, 8)'))), 'mínimo');
  funcion('maximo', (a, l) => Math.max(...a.map((_, i) => argNumero(a, i, 'maximo', l, 'maximo(3, 8)'))), 'máximo');
  // Grados (no radianes), como en el resto del motor
  funcion('seno', (a, l) => Math.sin((argNumero(a, 0, 'seno', l, 'seno(90)') * Math.PI) / 180));
  funcion('coseno', (a, l) => Math.cos((argNumero(a, 0, 'coseno', l, 'coseno(0)') * Math.PI) / 180));
  funcion('vector', (a, l) => {
    sinTodos(a, 2, 'vector', l, 'vector(10, 20)');
    return new Vector2(argNumero(a, 0, 'vector', l, 'vector(10, 20)', 0), argNumero(a, 1, 'vector', l, 'vector(10, 20)', 0));
  });
  funcion('distancia', (a, l) => {
    const punto = (v: Valor) => (v instanceof RefObjeto ? v.objeto.posicion : v instanceof Vector2 ? v : null);
    const p1 = punto(a[0] ?? null);
    const p2 = punto(a[1] ?? null);
    if (!p1 || !p2) throw new ErrorChispa(l, "'distancia' necesita dos objetos o dos vectores.", 'Ejemplo: distancia(yo, otro)');
    return p1.distancia(p2);
  });

  // ── Textos y listas ──
  funcion('longitud', (a, l) => {
    const v = a[0];
    if (typeof v === 'string') return Array.from(v).length;
    if (Array.isArray(v)) return v.length;
    throw new ErrorChispa(
      l,
      `'longitud' funciona con textos y listas, pero le das ${v === undefined ? 'nada' : nombreTipo(v)}.`,
      'Ejemplo: longitud("hola") da 4',
    );
  });
  funcion('texto', (a) => aTexto(a[0] ?? null));
  funcion(
    'numero',
    (a, l) => {
      const v = a[0];
      if (typeof v === 'number') return v;
      const n = typeof v === 'string' ? Number(v.replace(',', '.')) : NaN;
      if (Number.isNaN(n)) throw new ErrorChispa(l, `no puedo convertir ${v === undefined ? 'nada' : aTexto(v)} en un número.`);
      return n;
    },
    'número',
  );

  // ── Módulos ──
  g.declarar(
    'teclado',
    new Modulo(
      'teclado',
      {},
      {
        pulsada: (a, l) => entrada.estaPulsada(argTexto(a, 0, 'teclado.pulsada', l, 'teclado.pulsada("izquierda")')),
        sepulso: (a, l) => entrada.sePulso(argTexto(a, 0, 'teclado.sePulso', l, 'teclado.sePulso("espacio")')),
        sesolto: (a, l) => entrada.seSolto(argTexto(a, 0, 'teclado.seSolto', l, 'teclado.seSolto("espacio")')),
      },
    ),
  );
  g.declarar(
    'raton',
    new Modulo(
      'raton',
      {
        x: { obtener: () => ctx.escena.ratonEnMundo().x },
        y: { obtener: () => ctx.escena.ratonEnMundo().y },
        posicion: { obtener: () => ctx.escena.ratonEnMundo() },
        rueda: { obtener: () => entrada.rueda },
      },
      {
        pulsado: (a, l) => entrada.ratonPulsado(argBoton(a, 'pulsado', l)),
        sepulso: (a, l) => entrada.ratonSePulso(argBoton(a, 'sePulso', l)),
      },
    ),
    'raton',
  );
  const cam = () => ctx.escena.camara;
  g.declarar(
    'camara',
    new Modulo(
      'camara',
      {
        x: { obtener: () => cam().posicion.x, asignar: (v, l) => (cam().posicion.x = comoNumero(v, 'x', l)) },
        y: { obtener: () => cam().posicion.y, asignar: (v, l) => (cam().posicion.y = comoNumero(v, 'y', l)) },
        suavizado: { obtener: () => cam().suavizado, asignar: (v, l) => (cam().suavizado = comoNumero(v, 'suavizado', l)) },
      },
      {
        seguir: (a, l) => {
          cam().seguir(a[0] === null ? null : argObjeto(a, 0, 'camara.seguir', l, 'camara.seguir(yo)'));
          return null;
        },
        limites: (a, l) => {
          const ej = 'camara.limites(0, 0, 3000, 540)';
          cam().limites = {
            izquierda: argNumero(a, 0, 'camara.limites', l, ej),
            arriba: argNumero(a, 1, 'camara.limites', l, ej),
            derecha: argNumero(a, 2, 'camara.limites', l, ej),
            abajo: argNumero(a, 3, 'camara.limites', l, ej),
          };
          return null;
        },
      },
    ),
  );
  g.declarar(
    'escena',
    new Modulo(
      'escena',
      { objetos: { obtener: () => ctx.escena.objetos.filter((o) => !o.destruido).length } },
      {
        reiniciar: () => {
          ctx.pedirReinicio();
          return null;
        },
      },
    ),
  );
  g.declarar(
    'tiempo',
    new Modulo('tiempo', {
      total: { obtener: () => motor.tiempo.total },
      delta: { obtener: () => motor.tiempo.delta },
      escala: {
        obtener: () => motor.tiempo.escala,
        asignar: (v, l) => (motor.tiempo.escala = Math.max(0, comoNumero(v, 'escala', l))),
      },
    }),
  );
  g.declarar(
    'pantalla',
    new Modulo('pantalla', {
      ancho: { obtener: () => motor.renderizador.ancho },
      alto: { obtener: () => motor.renderizador.alto },
    }),
  );
  g.declarar('juego', datos);
  g.declarar('delta', 0);
}
