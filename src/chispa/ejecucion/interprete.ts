/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * ════════════════════════════════════════════════════════════════════
 *  ETAPA 3 de 3 · EJECUCIÓN — El intérprete: recorre el árbol y lo ejecuta
 * ════════════════════════════════════════════════════════════════════
 *
 * ── Cómo funciona ──
 * Es un "tree-walking interpreter": para cada nodo del árbol hay un trozo de
 * código que sabe ejecutarlo. Para una Binaria("+", a, b) evalúa a, evalúa b
 * y los suma. Para un Si evalúa la condición y ejecuta el bloque que toca.
 *
 * ── DECISIÓN: no traducimos a JavaScript ──
 * Podríamos convertir Chispa en JavaScript y ejecutarlo con eval(), pero
 * perderíamos el control: los errores saldrían en inglés y en líneas que no
 * existen en tu código. Recorriendo el árbol nosotros mismos, sabemos SIEMPRE
 * qué línea se está ejecutando y qué está pasando.
 *
 * ── DECISIÓN: generadores (function*) para poder usar esperar() ──
 * `esperar(1)` tiene que pausar ESE evento durante 1 segundo sin congelar el
 * juego (como task.wait() en Roblox). Para eso cada función del intérprete es
 * un GENERADOR: una función que puede pararse a mitad (`yield`) y seguir más
 * tarde desde el mismo punto. Cuando el código llama a esperar(), el
 * generador hace `yield` y el planificador (ScriptChispa) lo retoma cuando
 * pasa el tiempo. `yield*` significa "ejecuta este otro generador y, si se
 * pausa, pausa también yo".
 */
import type { Bloque, Expresion, Sentencia } from '../sintaxis/ast';
import type { Posicion } from '../lexico/tokens';
import { Entorno } from './entorno';
import { ErrorChispa } from '../errores/ErrorChispa';
import { pistaNombreDesconocido, sugerir } from '../errores/sugerencias';
import {
  Anfitrion,
  FuncionChispa,
  FuncionNativa,
  Lugar,
  PeticionEspera,
  Tabla,
  aTexto,
  copiarSiVector,
  esVerdadero,
  formatearNumero,
  nombreTipo,
  sonIguales,
  tipoConValor,
  type Valor,
} from './valores';
import { instalarBasicas } from '../api/basicas';
import { PeticionParada, type Depurador, type HiloDepurable } from './depurador';
import { ErrorMotor } from '../../motor/Errores';
import { Vector2 } from '../../motor/Vector2';
import { sinPrototipo } from '../../utilidades/seguro';

/** Lo que devuelve un bloque: nada, o una orden de salir de un bucle o de una función. */
type Senal = { tipo: 'devolver'; valor: Valor } | { tipo: 'romper' } | { tipo: 'continuar' } | undefined;
/** Un cálculo que puede pausarse con esperar() (o pararse en una línea, con el depurador). */
export type Ejecucion<T> = Generator<PeticionEspera | PeticionParada, T, void>;

/**
 * Máximo de vueltas de bucle sin ninguna pausa. Si un `mientras verdadero:`
 * no tiene esperar(), el navegador se congelaría para siempre; así lo cortamos
 * con un error que explica qué ha pasado.
 */
export const LIMITE_VUELTAS = 1_000_000;

/**
 * LÍMITES DE SEGURIDAD (ver AUDITORIA_SEGURIDAD.md): un juego, aunque sea de
 * otra persona, no puede llenar la memoria ni congelar el navegador. Si se
 * pasa, sale un error de Chispa que explica qué ha pasado.
 */
/** Funciones dentro de funciones (una función que se llama a sí misma sin parar). */
export const LIMITE_PROFUNDIDAD = 1000;
/** Letras de un texto. */
export const LIMITE_LETRAS = 1_000_000;
/** Elementos de una lista (o claves de una tabla). */
export const LIMITE_ELEMENTOS = 1_000_000;

/** Error si un texto nuevo sería demasiado largo. */
export function comprobarLetras(longitud: number, pos: Posicion): void {
  if (longitud > LIMITE_LETRAS) {
    throw new ErrorChispa(
      pos,
      `este texto tendría ${Math.round(longitud).toLocaleString('es')} letras, y el máximo es un millón: llenaría la memoria del ordenador.`,
      '¿Hay un bucle que va juntando texto sin parar (t = t + t)? Revisa cuántas veces se repite.',
    );
  }
}

/** Error si una lista nueva sería demasiado larga. */
export function comprobarElementos(longitud: number, pos: Posicion): void {
  if (longitud > LIMITE_ELEMENTOS) {
    throw new ErrorChispa(
      pos,
      `esta lista tendría ${Math.round(longitud).toLocaleString('es')} elementos, y el máximo es un millón: llenaría la memoria del ordenador.`,
      '¿Hay un bucle que va añadiendo sin parar? Revisa cuántas veces se repite.',
    );
  }
}

/** El mensaje cuando una función se llama a sí misma sin parar. */
function errorProfundidad(nombre: string, pos: Posicion): ErrorChispa {
  return new ErrorChispa(
    pos,
    `la función '${nombre}' se ha metido demasiadas veces una dentro de otra (más de ${LIMITE_PROFUNDIDAD}): parece que se llama a sí misma sin parar.`,
    'Si una función se llama a sí misma, necesita un caso en el que NO lo haga (por ejemplo: si n <= 0: devolver 0).',
  );
}

/** ¿Es el error de JavaScript de "la pila se ha llenado"? (en cada navegador se escribe distinto) */
function esPilaLlena(error: unknown): boolean {
  return error instanceof RangeError && /call stack|too much recursion|stack/i.test(error.message);
}

export class Interprete {
  readonly globales = new Entorno();
  /** Qué hacer con mostrar(). Lo cambia quien usa el intérprete (la consola del motor, los tests...). */
  alMostrar: (texto: string) => void = (t) => console.log(t);
  /**
   * El objeto cuyo script se está ejecutando ahora mismo (lo pone ScriptChispa).
   * Sirve para que crear("Bala") o particulas("humo") sin posición salgan
   * donde está el objeto que los pide.
   */
  objetoActual: unknown = null;
  /** El script que se está ejecutando ahora (para situar los errores de los textos con huecos). */
  programaActual: { archivo: string; lineas: string[] } | null = null;
  /** Qué hacer si falla un texto con huecos mientras se dibuja (lo pone el juego). */
  alErrorVivo: ((e: ErrorChispa) => void) | null = null;

  /**
   * Un texto con huecos que se calcula de nuevo cada vez que se pide (para
   * los textos de la pantalla, que se actualizan solos). Si falla, avisa una
   * vez con alErrorVivo y devuelve null (y quien lo usa deja de pedirlo).
   */
  textoVivo(e: Expresion, entorno: () => Entorno, origen: { archivo: string; lineas: string[] } | null = this.programaActual): () => string | null {
    return () => {
      try {
        const r = this.conContadorPropio(() => this.evaluar(e, entorno()).next());
        if (!r.done) throw new ErrorChispa(e.pos, 'dentro de un texto con huecos no se puede usar esperar().');
        return aTexto(r.value);
      } catch (err) {
        if (!(err instanceof ErrorChispa)) throw err;
        if (origen) err.conArchivo(origen.archivo, origen.lineas);
        this.alErrorVivo?.(err);
        return null;
      }
    };
  }
  /** Nombres de los objetos de la escena (para dar mejores pistas en los errores). */
  nombresDeObjetos: () => string[] = () => [];

  private vueltas = 0;
  /** Funciones dentro de funciones cuando no hay hilo (tests, órdenes de la consola). */
  private profundidadSinHilo = 0;
  /** El depurador del editor (null al jugar fuera del editor: entonces no cuesta nada). */
  depurador: Depurador | null = null;
  /** El hilo que se está ejecutando ahora (lo pone ScriptChispa), para los pasos del depurador. */
  hiloActual: HiloDepurable | null = null;

  constructor() {
    // mostrar, esperar, matemáticas, textos... (las que no necesitan el motor)
    instalarBasicas(this);
  }

  /** Cuántos hilos se están ejecutando uno dentro de otro ahora mismo. */
  private anidamiento = 0;

  /**
   * El planificador ejecuta así cada hilo: el contador de vueltas (contra los
   * bucles infinitos) empieza de cero... salvo si este hilo empieza DENTRO de
   * otro (un aLaVez, o el «cuando empieza» de un objeto recién creado, dentro
   * de un bucle). Entonces sigue sumando en el mismo contador: si no, un
   * `mientras verdadero: aLaVez(f)` se saltaría la protección y congelaría el
   * navegador (ver AUDITORIA_SEGURIDAD.md).
   */
  conContadorPropio<T>(fn: () => T): T {
    if (this.anidamiento === 0) this.vueltas = 0;
    this.anidamiento++;
    try {
      return fn();
    } finally {
      this.anidamiento--;
    }
  }

  // ═════════════════════════ SENTENCIAS ═════════════════════════

  *ejecutarBloque(bloque: Bloque, entorno: Entorno): Ejecucion<Senal> {
    for (const s of bloque) {
      const senal = yield* this.ejecutar(s, entorno);
      if (senal) return senal;
    }
    return undefined;
  }

  private *ejecutar(s: Sentencia, ent: Entorno): Ejecucion<Senal> {
    // ¿Hay que pararse en esta línea? (punto de parada, o yendo paso a paso)
    const dep = this.depurador;
    if (dep?.activo && this.programaActual && s.tipo !== 'Funcion' && s.tipo !== 'Cuando') {
      if (dep.debeParar(this.programaActual.archivo, s.pos.linea, this.hiloActual)) yield new PeticionParada(this.programaActual.archivo, s.pos.linea, ent);
    }
    switch (s.tipo) {
      case 'Variable': {
        const valor = (sinLlamadas(s.valor) ? this.evaluarDirecto(s.valor, ent) : yield* this.evaluar(s.valor, ent));
        ent.declarar(s.nombre, copiarSiVector(valor), s.original);
        return;
      }

      case 'Asignacion':
        yield* this.asignar(s.objetivo, s.operador, s.valor, ent, s.pos);
        return;

      case 'Si':
        for (const rama of s.ramas) {
          if (esVerdadero((sinLlamadas(rama.condicion) ? this.evaluarDirecto(rama.condicion, ent) : yield* this.evaluar(rama.condicion, ent)))) {
            return yield* this.ejecutarBloque(rama.cuerpo, new Entorno(ent));
          }
        }
        if (s.sino) return yield* this.ejecutarBloque(s.sino, new Entorno(ent));
        return;

      case 'Mientras':
        while (esVerdadero((sinLlamadas(s.condicion) ? this.evaluarDirecto(s.condicion, ent) : yield* this.evaluar(s.condicion, ent)))) {
          this.contarVuelta(s.pos, 'mientras');
          const senal = yield* this.ejecutarBloque(s.cuerpo, new Entorno(ent));
          if (senal?.tipo === 'romper') break;
          if (senal?.tipo === 'devolver') return senal;
        }
        return;

      case 'Repetir': {
        const veces = (sinLlamadas(s.veces) ? this.evaluarDirecto(s.veces, ent) : yield* this.evaluar(s.veces, ent));
        if (typeof veces !== 'number' || veces < 0) {
          throw new ErrorChispa(
            s.veces.pos,
            `'repetir' necesita un número de veces (0 o más), pero ${this.describir(s.veces)} es ${nombreTipo(veces)}.`,
            'Ejemplo: repetir 5 veces:',
          );
        }
        for (let i = 0; i < Math.floor(veces); i++) {
          this.contarVuelta(s.pos, 'repetir');
          const senal = yield* this.ejecutarBloque(s.cuerpo, new Entorno(ent));
          if (senal?.tipo === 'romper') break;
          if (senal?.tipo === 'devolver') return senal;
        }
        return;
      }

      case 'ParaCada':
        return yield* this.paraCada(s, ent);

      case 'Funcion':
        ent.declarar(s.nombre, new FuncionChispa(s, ent, { programa: this.programaActual, objeto: this.objetoActual }), s.original);
        return;

      case 'Devolver':
        return { tipo: 'devolver', valor: s.valor ? (sinLlamadas(s.valor) ? this.evaluarDirecto(s.valor, ent) : yield* this.evaluar(s.valor, ent)) : null };

      case 'Romper':
        return { tipo: 'romper' };

      case 'Continuar':
        return { tipo: 'continuar' };

      case 'Cuando':
        // Los 'cuando' no se ejecutan aquí: ScriptChispa los registra como eventos.
        return;

      case 'ExpresionSuelta':
        (sinLlamadas(s.expresion) ? this.evaluarDirecto(s.expresion, ent) : yield* this.evaluar(s.expresion, ent));
        return;
    }
  }

  /** para cada x en lista / texto / tabla   ·   para cada clave, valor en tabla */
  private *paraCada(s: Extract<Sentencia, { tipo: 'ParaCada' }>, ent: Entorno): Ejecucion<Senal> {
    const coleccion = (sinLlamadas(s.coleccion) ? this.evaluarDirecto(s.coleccion, ent) : yield* this.evaluar(s.coleccion, ent));
    const dos = s.variables.length === 2;
    let pasos: Valor[][]; // cada paso: los valores de las variables del bucle

    if (coleccion instanceof Tabla) {
      // En el orden en que se añadieron las claves (lo garantiza Tabla)
      pasos = coleccion.pares().map(([k, v]) => (dos ? [k, v] : [k]));
    } else if (Array.isArray(coleccion) || typeof coleccion === 'string') {
      // Copia: si la lista cambia dentro del bucle, el recorrido no se lía. Los textos van letra a letra.
      // Con dos nombres, el primero es la posición (empieza en 1): para cada i, enemigo en enemigos:
      const elementos = Array.isArray(coleccion) ? [...coleccion] : Array.from(coleccion);
      pasos = elementos.map((v, i) => (dos ? [i + 1, v] : [v]));
    } else {
      throw new ErrorChispa(
        s.coleccion.pos,
        `'para cada' necesita una lista, un texto o una tabla, pero ${this.describir(s.coleccion)} es ${nombreTipo(coleccion)}.`,
        typeof coleccion === 'number'
          ? `Para contar del 1 al ${formatearNumero(coleccion)} usa: para cada i en rango(1, ${formatearNumero(coleccion)}):  ·  para repetir algo sin contar: repetir ${formatearNumero(coleccion)} veces:`
          : 'Ejemplo: para cada enemigo en buscarTodos("Enemigo"):',
      );
    }

    for (const valores of pasos) {
      this.contarVuelta(s.pos, 'para cada');
      const local = new Entorno(ent);
      s.variables.forEach((v, i) => local.declarar(v.nombre, copiarSiVector(valores[i]), v.original));
      const senal = yield* this.ejecutarBloque(s.cuerpo, local);
      if (senal?.tipo === 'romper') break;
      if (senal?.tipo === 'devolver') return senal;
    }
    return;
  }

  /** x = v,  yo.vida -= 1,  lista[2] = "hola",  tabla.nivel = 3 */
  private *asignar(objetivo: Expresion, operador: string, exprValor: Expresion, ent: Entorno, pos: Posicion): Ejecucion<void> {
    // yo.texto = "Puntos: {juego.puntos}" → el texto se queda "vivo" y se actualiza solo
    if (operador === '=' && objetivo.tipo === 'Miembro' && exprValor.tipo === 'Texto' && exprValor.partes) {
      const obj = yield* this.evaluarContenedor(objetivo.objeto, ent, `cambiar '${objetivo.original}'`);
      if (obj instanceof Anfitrion && obj.asignarVivo) {
        const calcular = this.textoVivo(exprValor, () => ent);
        const hecho = this.conErroresDelMotor(objetivo.pos, () => obj.asignarVivo!(objetivo.propiedad, calcular, objetivo.pos));
        if (hecho) {
          calcular(); // se calcula ya una vez: así, si algo está mal, el error sale aquí mismo
          return;
        }
      }
    }
    let valor = (sinLlamadas(exprValor) ? this.evaluarDirecto(exprValor, ent) : yield* this.evaluar(exprValor, ent));

    // Para += -= *= /= primero leemos el valor actual y operamos.
    if (operador !== '=') {
      const actual = (sinLlamadas(objetivo) ? this.evaluarDirecto(objetivo, ent) : yield* this.evaluar(objetivo, ent));
      valor = this.operar(operador[0], actual, valor, pos, objetivo, exprValor);
    }
    valor = copiarSiVector(valor);

    if (objetivo.tipo === 'Identificador') {
      if (!ent.asignar(objetivo.nombre, valor)) {
        throw new ErrorChispa(
          objetivo.pos,
          `la variable '${objetivo.original}' no existe todavía.`,
          this.pistaNombre(objetivo.original, ent, `Para crearla escribe: variable ${objetivo.original} = ...`),
        );
      }
      return;
    }

    if (objetivo.tipo === 'Miembro') {
      const obj = yield* this.evaluarContenedor(objetivo.objeto, ent, `cambiar '${objetivo.original}'`);
      const p = objetivo.pos;
      if (obj instanceof Tabla) {
        if (objetivo.propiedad === 'claves' || objetivo.propiedad === 'quitar') {
          throw new ErrorChispa(p, `'${objetivo.original}' es un nombre especial de las tablas y no se puede usar con punto para guardar.`, `Usa corchetes: ${this.describir(objetivo.objeto)}["${objetivo.original}"] = ...`);
        }
        obj.poner(objetivo.original, valor);
        return;
      }
      if (obj instanceof Anfitrion) {
        this.conErroresDelMotor(p, () => obj.asignar(objetivo.propiedad, valor, objetivo.original, p));
        return;
      }
      if (obj instanceof Vector2 && (objetivo.propiedad === 'x' || objetivo.propiedad === 'y')) {
        if (typeof valor !== 'number') throw new ErrorChispa(p, `la coordenada '${objetivo.original}' tiene que ser un número, pero le das ${nombreTipo(valor)}.`);
        obj[objetivo.propiedad] = valor;
        return;
      }
      throw new ErrorChispa(
        p,
        `no puedo cambiar '${objetivo.original}' de ${this.describir(objetivo.objeto)}, porque es ${nombreTipo(obj)}.`,
        'Solo se pueden cambiar claves de tablas (ficha.vida = 3), propiedades de objetos (yo.vida = 3) o coordenadas de vectores (yo.posicion.x = 100).',
      );
    }

    if (objetivo.tipo === 'Indice') {
      const cont = (sinLlamadas(objetivo.objeto) ? this.evaluarDirecto(objetivo.objeto, ent) : yield* this.evaluar(objetivo.objeto, ent));
      const indice = (sinLlamadas(objetivo.indice) ? this.evaluarDirecto(objetivo.indice, ent) : yield* this.evaluar(objetivo.indice, ent));
      if (Array.isArray(cont)) {
        cont[this.comprobarIndice(cont.length, indice, objetivo.indice.pos) - 1] = valor;
        return;
      }
      if (cont instanceof Tabla) {
        cont.poner(this.comprobarClave(indice, objetivo.indice.pos), valor);
        return;
      }
      throw new ErrorChispa(objetivo.pos, `solo se puede cambiar algo con [ ] en listas y tablas, y ${this.describir(objetivo.objeto)} es ${nombreTipo(cont)}.`);
    }
  }

  // ═════════════════════════ EXPRESIONES ═════════════════════════

  *evaluar(e: Expresion, ent: Entorno): Ejecucion<Valor> {
    // Sin llamadas dentro (yo.x + v * delta), nada puede esperar: se calcula de golpe, sin
    // generadores. Los generadores crean mucha basura: con 2000 objetos con script, la mitad
    // del tiempo se iba en recogerla.
    if (sinLlamadas(e)) return this.evaluarDirecto(e, ent);
    switch (e.tipo) {
      case 'Numero':
        return e.valor;
      case 'Texto': {
        if (!e.partes) return e.valor;
        // "Puntos: {juego.puntos}": cada hueco se calcula ahora y se une al resto
        let r = '';
        for (const p of e.partes) r += typeof p === 'string' ? p : aTexto((sinLlamadas(p) ? this.evaluarDirecto(p, ent) : yield* this.evaluar(p, ent)));
        comprobarLetras(r.length, e.pos);
        return r;
      }
      case 'Logico':
        return e.valor;
      case 'Nulo':
        return null;

      case 'Identificador': {
        const c = ent.buscar(e.nombre);
        if (!c) {
          throw new ErrorChispa(
            e.pos,
            `intentas usar '${e.original}', pero no existe ninguna variable con ese nombre.`,
            this.pistaNombre(e.original, ent),
          );
        }
        return c.valor;
      }

      case 'Lista': {
        const lista: Valor[] = [];
        for (const el of e.elementos) lista.push(copiarSiVector((sinLlamadas(el) ? this.evaluarDirecto(el, ent) : yield* this.evaluar(el, ent))));
        return lista;
      }

      case 'Tabla': {
        const t = new Tabla();
        for (const entrada of e.entradas) t.poner(entrada.clave, copiarSiVector((sinLlamadas(entrada.valor) ? this.evaluarDirecto(entrada.valor, ent) : yield* this.evaluar(entrada.valor, ent))));
        return t;
      }

      case 'Unaria': {
        const v = (sinLlamadas(e.operando) ? this.evaluarDirecto(e.operando, ent) : yield* this.evaluar(e.operando, ent));
        if (e.operador === 'no') return !esVerdadero(v);
        if (typeof v === 'number') return -v;
        if (v instanceof Vector2) return v.multiplicar(-1);
        throw new ErrorChispa(e.pos, `no puedo poner un signo menos delante de ${nombreTipo(v)}.`);
      }

      case 'Logica': {
        // "Cortocircuito": en `a y b`, si `a` es falso ni siquiera miramos `b`.
        // Así funciona: si enemigo != nulo y enemigo.vida > 0:
        const izq = esVerdadero((sinLlamadas(e.izquierda) ? this.evaluarDirecto(e.izquierda, ent) : yield* this.evaluar(e.izquierda, ent)));
        if (e.operador === 'y') return izq ? esVerdadero((sinLlamadas(e.derecha) ? this.evaluarDirecto(e.derecha, ent) : yield* this.evaluar(e.derecha, ent))) : false;
        return izq ? true : esVerdadero((sinLlamadas(e.derecha) ? this.evaluarDirecto(e.derecha, ent) : yield* this.evaluar(e.derecha, ent)));
      }

      case 'Binaria': {
        const a = (sinLlamadas(e.izquierda) ? this.evaluarDirecto(e.izquierda, ent) : yield* this.evaluar(e.izquierda, ent));
        const b = (sinLlamadas(e.derecha) ? this.evaluarDirecto(e.derecha, ent) : yield* this.evaluar(e.derecha, ent));
        if (e.operador === 'en') return this.contiene(b, a, e);
        return this.operar(e.operador, a, b, e.pos, e.izquierda, e.derecha);
      }

      case 'Miembro': {
        const obj = yield* this.evaluarContenedor(e.objeto, ent, `usar '${e.original}'`);
        return this.obtenerMiembro(obj, e);
      }

      case 'Indice': {
        const obj = (sinLlamadas(e.objeto) ? this.evaluarDirecto(e.objeto, ent) : yield* this.evaluar(e.objeto, ent));
        const indice = (sinLlamadas(e.indice) ? this.evaluarDirecto(e.indice, ent) : yield* this.evaluar(e.indice, ent));
        return this.leerIndice(obj, indice, e);
      }

      case 'Llamada': {
        const funcion = (sinLlamadas(e.funcion) ? this.evaluarDirecto(e.funcion, ent) : yield* this.evaluar(e.funcion, ent));
        const args: Valor[] = [];
        const conLugar = funcion instanceof FuncionNativa && funcion.recibeLugar && e.argumentos.length > 0;
        if (conLugar) args.push(yield* this.lugar(e.argumentos[0], ent, this.describir(e.funcion)));
        for (const a of e.argumentos.slice(conLugar ? 1 : 0)) args.push((sinLlamadas(a) ? this.evaluarDirecto(a, ent) : yield* this.evaluar(a, ent)));
        return yield* this.llamar(funcion, args, e.pos, this.describir(e.funcion));
      }
    }
  }

  /** Lo mismo que evaluar(), para expresiones sin llamadas (ver sinLlamadas): sin generadores. */
  private evaluarDirecto(e: Expresion, ent: Entorno): Valor {
    switch (e.tipo) {
      case 'Numero':
      case 'Logico':
        return e.valor;
      case 'Nulo':
        return null;
      case 'Texto': {
        if (!e.partes) return e.valor;
        let r = '';
        for (const p of e.partes) r += typeof p === 'string' ? p : aTexto(this.evaluarDirecto(p, ent));
        comprobarLetras(r.length, e.pos);
        return r;
      }
      case 'Identificador': {
        const c = ent.buscar(e.nombre);
        if (!c) throw new ErrorChispa(e.pos, `intentas usar '${e.original}', pero no existe ninguna variable con ese nombre.`, this.pistaNombre(e.original, ent));
        return c.valor;
      }
      case 'Lista':
        return e.elementos.map((el) => copiarSiVector(this.evaluarDirecto(el, ent)));
      case 'Tabla': {
        const t = new Tabla();
        for (const entrada of e.entradas) t.poner(entrada.clave, copiarSiVector(this.evaluarDirecto(entrada.valor, ent)));
        return t;
      }
      case 'Unaria': {
        const v = this.evaluarDirecto(e.operando, ent);
        if (e.operador === 'no') return !esVerdadero(v);
        if (typeof v === 'number') return -v;
        if (v instanceof Vector2) return v.multiplicar(-1);
        throw new ErrorChispa(e.pos, `no puedo poner un signo menos delante de ${nombreTipo(v)}.`);
      }
      case 'Logica': {
        const izq = esVerdadero(this.evaluarDirecto(e.izquierda, ent));
        if (e.operador === 'y') return izq ? esVerdadero(this.evaluarDirecto(e.derecha, ent)) : false;
        return izq ? true : esVerdadero(this.evaluarDirecto(e.derecha, ent));
      }
      case 'Binaria': {
        const a = this.evaluarDirecto(e.izquierda, ent);
        const b = this.evaluarDirecto(e.derecha, ent);
        if (e.operador === 'en') return this.contiene(b, a, e);
        return this.operar(e.operador, a, b, e.pos, e.izquierda, e.derecha);
      }
      case 'Miembro':
        return this.obtenerMiembro(this.contenedorDirecto(e.objeto, ent, `usar '${e.original}'`), e);
      case 'Indice': {
        const obj = this.evaluarDirecto(e.objeto, ent);
        const indice = this.evaluarDirecto(e.indice, ent);
        return this.leerIndice(obj, indice, e);
      }
      case 'Llamada':
        throw new Error('evaluarDirecto no sabe hacer llamadas');
    }
  }

  private contenedorDirecto(expr: Expresion, ent: Entorno, accion: string): Valor {
    if (expr.tipo === 'Identificador' && !ent.buscar(expr.nombre)) {
      throw new ErrorChispa(expr.pos, `intentas ${accion} de '${expr.original}', pero '${expr.original}' no existe.`, this.pistaNombre(expr.original, ent, '¿Lo has creado antes o está bien escrito el nombre?'));
    }
    const obj = this.evaluarDirecto(expr, ent);
    if (obj === null) {
      throw new ErrorChispa(expr.pos, `intentas ${accion} de '${this.describir(expr)}', pero '${this.describir(expr)}' está vacío (nulo).`, '¿Le has dado un valor antes? Si lo buscas con buscar("..."), ¿está bien escrito el nombre?');
    }
    return obj;
  }

  /** lista[3], texto[1], tabla["clave"] */
  private leerIndice(obj: Valor, indice: Valor, e: Extract<Expresion, { tipo: 'Indice' }>): Valor {
    if (Array.isArray(obj)) return obj[this.comprobarIndice(obj.length, indice, e.indice.pos) - 1];
    if (typeof obj === 'string') {
      const letras = Array.from(obj);
      return letras[this.comprobarIndice(letras.length, indice, e.indice.pos) - 1];
    }
    if (obj instanceof Tabla) return this.leerClave(obj, this.comprobarClave(indice, e.indice.pos), e.objeto, e.indice.pos);
    throw new ErrorChispa(e.pos, `solo se puede usar [ ] con listas, textos y tablas, pero ${this.describir(e.objeto)} es ${nombreTipo(obj)}.`);
  }

  /**
   * El SITIO al que apunta una expresión (yo.x, escena.camara.zoom, una variable),
   * para las funciones que necesitan ir cambiándolo (animar).
   */
  private *lugar(e: Expresion, ent: Entorno, funcion: string): Ejecucion<Lugar> {
    const idDe = (o: object) => {
      let id = this.idsDeLugares.get(o);
      if (id === undefined) this.idsDeLugares.set(o, (id = ++this.ultimoIdDeLugar));
      return id;
    };
    const ejemplo = `Ejemplo: ${funcion}(yo.x, 300, 1)`;
    if (e.tipo === 'Identificador') {
      const c = ent.buscar(e.nombre);
      if (!c) throw new ErrorChispa(e.pos, `'${e.original}' no existe.`, this.pistaNombre(e.original, ent));
      return new Lugar(e.original, `v${idDe(c)}`, () => c.valor, (v) => (c.valor = v));
    }
    if (e.tipo === 'Miembro') {
      const obj = yield* this.evaluarContenedor(e.objeto, ent, `usar '${e.original}'`);
      const nombre = `${this.describir(e.objeto)}.${e.original}`;
      if (obj instanceof Anfitrion) {
        const pos = e.pos;
        return new Lugar(
          nombre,
          `${idDe(obj)}.${e.propiedad}`,
          () => this.conErroresDelMotor(pos, () => obj.obtener(e.propiedad, e.original, pos)),
          (v) => this.conErroresDelMotor(pos, () => obj.asignar(e.propiedad, v, e.original, pos)),
          obj.objetoDelJuego?.() ?? null,
        );
      }
      if (obj instanceof Tabla) {
        return new Lugar(nombre, `${idDe(obj)}.${e.propiedad}`, () => this.leerClave(obj, e.original, e.objeto, e.pos), (v) => obj.poner(e.original, v));
      }
      if (obj instanceof Vector2 && (e.propiedad === 'x' || e.propiedad === 'y')) {
        const eje = e.propiedad;
        return new Lugar(nombre, `${idDe(obj)}.${eje}`, () => obj[eje], (v) => {
          if (typeof v === 'number') obj[eje] = v;
        });
      }
      throw new ErrorChispa(e.pos, `'${nombre}' no se puede cambiar poco a poco.`, ejemplo);
    }
    throw new ErrorChispa(
      e.pos,
      `'${funcion}' necesita saber QUÉ tiene que cambiar: un sitio como yo.x o yo.tamano, no un valor suelto.`,
      ejemplo,
    );
  }
  private idsDeLugares = new WeakMap<object, number>();
  private ultimoIdDeLugar = 0;

  /**
   * Ejecuta un trozo de código como si fuera de otro objeto (su «yo» y su
   * script), y deja todo como estaba al terminar. También si se duerme en un
   * esperar(): al despertar, sigue siendo del otro objeto.
   */
  private *comoDueno<T>(dueno: NonNullable<FuncionChispa['dueno']>, gen: Ejecucion<T>): Ejecucion<T> {
    const antes = { programa: this.programaActual, objeto: this.objetoActual };
    const poner = (p: typeof dueno.programa, o: unknown) => {
      this.programaActual = p;
      this.objetoActual = o;
    };
    // Las funciones de un script de funciones no son de ningún objeto (objeto: undefined): siguen con el «yo» de quien las llama
    const objeto = dueno.objeto === undefined ? antes.objeto : dueno.objeto;
    try {
      poner(dueno.programa, objeto);
      let r = gen.next();
      while (!r.done) {
        poner(antes.programa, antes.objeto);
        yield r.value;
        poner(dueno.programa, objeto);
        r = gen.next();
      }
      return r.value;
    } finally {
      poner(antes.programa, antes.objeto);
    }
  }

  /** Llama a una función (de Chispa o del motor). */
  *llamar(funcion: Valor, args: Valor[], pos: Posicion, descripcion = 'esa función'): Ejecucion<Valor> {
    if (funcion instanceof FuncionNativa) {
      const r = this.conErroresDelMotor(pos, () => funcion.ejecutar(args, pos));
      if (r instanceof PeticionEspera) {
        yield r; // ← aquí se pausa el hilo (esperar)
        return r.resultado ? r.resultado() : null;
      }
      return r;
    }

    if (funcion instanceof FuncionChispa) {
      const def = funcion.definicion;
      if (args.length !== def.parametros.length) {
        const nombres = def.parametros.map((p) => p.original).join(', ');
        const n = def.parametros.length;
        throw new ErrorChispa(
          pos,
          `la función '${def.original}' necesita ${n} valor${n === 1 ? '' : 'es'}${nombres ? ` (${nombres})` : ''}, pero le das ${args.length}.`,
          `Revisa los valores entre paréntesis: ${def.original}(${nombres})`,
        );
      }
      const local = new Entorno(funcion.entorno);
      def.parametros.forEach((p, i) => local.declarar(p.nombre, copiarSiVector(args[i]), p.original));
      // Para el depurador: «siguiente línea» no se mete dentro de las funciones
      const hilo = this.hiloActual;
      const profundidad = hilo ? ++hilo.profundidad : ++this.profundidadSinHilo;
      const dueno = funcion.dueno;
      const deOtro = !!dueno && (dueno.programa !== this.programaActual || (dueno.objeto !== undefined && dueno.objeto !== this.objetoActual));
      try {
        if (profundidad > LIMITE_PROFUNDIDAD) throw errorProfundidad(def.original, pos);
        const senal = deOtro ? yield* this.comoDueno(dueno!, this.ejecutarBloque(def.cuerpo, local)) : yield* this.ejecutarBloque(def.cuerpo, local);
        return senal?.tipo === 'devolver' ? senal.valor : null;
      } catch (e) {
        // La pila de JavaScript se llenó antes de llegar al límite (pasa en algunos navegadores)
        const error = esPilaLlena(e) ? errorProfundidad(def.original, pos) : e;
        if (error instanceof ErrorChispa) {
          // Un error dentro de la función de otro objeto: es de SU script
          if (deOtro && dueno!.programa) error.conArchivo(dueno!.programa.archivo, dueno!.programa.lineas);
          // El error "atraviesa" esta función: apuntamos desde dónde se la llamó (pila de llamadas)
          error.agregarLlamada(def.original, pos);
        }
        throw error;
      } finally {
        if (hilo) hilo.profundidad--;
        else this.profundidadSinHilo--;
      }
    }

    throw new ErrorChispa(
      pos,
      `'${descripcion}' no es una función, así que no se puede llamar con paréntesis ( ).`,
      funcion === null ? '¿Está bien escrito el nombre?' : `Es ${nombreTipo(funcion)}. Quita los paréntesis si solo querías su valor.`,
    );
  }

  // ═════════════════════════ OPERADORES ═════════════════════════

  /**
   * Hace la operación, o explica por qué no se puede, ENSEÑANDO LOS VALORES:
   *   "intentas restar un texto ("10hola") y un número (1)."
   * `ea` y `eb` son las expresiones de cada lado, para decir también su nombre si son variables.
   */
  private operar(op: string, a: Valor, b: Valor, pos: Posicion, ea?: Expresion, eb?: Expresion): Valor {
    switch (op) {
      case '+':
        if (typeof a === 'number' && typeof b === 'number') return a + b;
        // Si uno de los dos es texto, los unimos: "Puntos: " + 5 → "Puntos: 5"
        if (typeof a === 'string' || typeof b === 'string') {
          const ta = aTexto(a);
          const tb = aTexto(b);
          comprobarLetras(ta.length + tb.length, pos);
          return ta + tb;
        }
        if (a instanceof Vector2 && b instanceof Vector2) return a.sumar(b);
        if (Array.isArray(a) && Array.isArray(b)) {
          comprobarElementos(a.length + b.length, pos);
          return [...a, ...b];
        }
        break;
      case '-':
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        if (a instanceof Vector2 && b instanceof Vector2) return a.restar(b);
        break;
      case '*':
        if (typeof a === 'number' && typeof b === 'number') return a * b;
        if (a instanceof Vector2 && typeof b === 'number') return a.multiplicar(b);
        if (typeof a === 'number' && b instanceof Vector2) return b.multiplicar(a);
        break;
      case '/':
        if ((typeof a === 'number' || a instanceof Vector2) && typeof b === 'number') {
          if (b === 0) throw new ErrorChispa(pos, 'estás dividiendo entre cero, y eso no se puede.', 'Comprueba antes que el número de abajo no sea 0.');
          return typeof a === 'number' ? a / b : a.multiplicar(1 / b);
        }
        break;
      case '%':
        if (typeof a === 'number' && typeof b === 'number') {
          if (b === 0) throw new ErrorChispa(pos, 'no se puede calcular el resto de dividir entre cero.');
          return ((a % b) + b) % b; // siempre positivo: -1 % 3 = 2 (útil para dar vueltas en listas)
        }
        break;
      case '==':
        return sonIguales(a, b);
      case '!=':
        return !sonIguales(a, b);
      case '<':
      case '>':
      case '<=':
      case '>=':
        if ((typeof a === 'number' && typeof b === 'number') || (typeof a === 'string' && typeof b === 'string')) {
          return op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b;
        }
        throw new ErrorChispa(
          pos,
          `intentas comparar ${this.operando(a, ea)} con ${this.operando(b, eb)} usando '${op}', y solo se pueden comparar dos números o dos textos.`,
          this.pistaTipos(a, b, ea, eb),
        );
    }
    const verbos: Record<string, string> = { '+': 'sumar', '-': 'restar', '*': 'multiplicar', '/': 'dividir', '%': 'calcular el resto de' };
    throw new ErrorChispa(pos, `intentas ${verbos[op]} ${this.operando(a, ea)} y ${this.operando(b, eb)}.`, this.pistaTipos(a, b, ea, eb, op));
  }

  /** "un número (10)" o, si es una variable, "'vida', que es un número (10)," */
  private operando(v: Valor, e?: Expresion): string {
    const conNombre = e && (e.tipo === 'Identificador' || e.tipo === 'Miembro' || e.tipo === 'Indice' || e.tipo === 'Llamada');
    return conNombre ? `'${this.describir(e)}', que es ${tipoConValor(v)},` : tipoConValor(v);
  }

  /** La pista más útil según los tipos que se han mezclado. */
  private pistaTipos(a: Valor, b: Valor, ea?: Expresion, eb?: Expresion, op?: string): string | undefined {
    const nombre = (e?: Expresion, v?: Valor) => (e ? this.describir(e) : aTexto(v ?? null));
    if (a === null || b === null) {
      const e = a === null ? ea : eb;
      return `${e && e.tipo !== 'Nulo' ? `'${this.describir(e)}'` : 'Uno de los dos'} está vacío (nulo). ¿Le has dado un valor antes?`;
    }
    if (typeof a === 'string' && typeof b === 'number') return `Si el texto guarda un número, conviértelo antes: numero(${nombre(ea, a)})`;
    if (typeof a === 'number' && typeof b === 'string') return `Si el texto guarda un número, conviértelo antes: numero(${nombre(eb, b)})`;
    if (Array.isArray(a) && op === '+') return `Para añadir un elemento a una lista usa: ${nombre(ea, a)}.añadir(...)`;
    if (a instanceof Tabla || b instanceof Tabla) return 'Con las tablas no se puede operar directamente. Usa sus claves: tabla.clave';
    return undefined;
  }

  /** `a en b`: ¿está a dentro de b? (clave en tabla, elemento en lista, trozo en texto) */
  private contiene(b: Valor, a: Valor, e: Extract<Expresion, { tipo: 'Binaria' }>): boolean {
    if (b instanceof Tabla) {
      if (typeof a !== 'string') throw new ErrorChispa(e.izquierda.pos, `para buscar en una tabla hay que usar un texto (el nombre de la clave), pero es ${nombreTipo(a)}.`, 'Ejemplo: si "vida" en jugador:');
      return b.tiene(a);
    }
    if (Array.isArray(b)) return b.some((x) => sonIguales(x, a));
    if (typeof b === 'string') {
      if (typeof a !== 'string') throw new ErrorChispa(e.izquierda.pos, `para buscar dentro de un texto hay que usar otro texto, pero es ${nombreTipo(a)}.`, 'Ejemplo: si "ola" en saludo:');
      return b.includes(a);
    }
    throw new ErrorChispa(
      e.derecha.pos,
      `'en' sirve para buscar dentro de tablas, listas y textos, pero ${this.describir(e.derecha)} es ${nombreTipo(b)}.`,
      'Ejemplos: "vida" en jugador   ·   3 en [1, 2, 3]   ·   "ola" en "hola"',
    );
  }

  // ═════════════════════════ PROPIEDADES Y CLAVES ═════════════════════════

  /**
   * Evalúa lo que va a la izquierda del punto y comprueba que existe.
   * De aquí salen mensajes como:
   *   "intentas cambiar 'vida' de 'enemigo', pero 'enemigo' no existe."
   */
  private *evaluarContenedor(expr: Expresion, ent: Entorno, accion: string): Ejecucion<Valor> {
    if (expr.tipo === 'Identificador' && !ent.buscar(expr.nombre)) {
      throw new ErrorChispa(
        expr.pos,
        `intentas ${accion} de '${expr.original}', pero '${expr.original}' no existe.`,
        this.pistaNombre(expr.original, ent, '¿Lo has creado antes o está bien escrito el nombre?'),
      );
    }
    const obj = (sinLlamadas(expr) ? this.evaluarDirecto(expr, ent) : yield* this.evaluar(expr, ent));
    if (obj === null) {
      throw new ErrorChispa(
        expr.pos,
        `intentas ${accion} de '${this.describir(expr)}', pero '${this.describir(expr)}' está vacío (nulo).`,
        '¿Le has dado un valor antes? Si lo buscas con buscar("..."), ¿está bien escrito el nombre?',
      );
    }
    return obj;
  }

  private obtenerMiembro(obj: Valor, e: Extract<Expresion, { tipo: 'Miembro' }>): Valor {
    const p = e.propiedad;
    if (obj instanceof Anfitrion) return this.conErroresDelMotor(e.pos, () => obj.obtener(p, e.original, e.pos));

    if (obj instanceof Tabla) {
      if (p === 'claves') return obj.claves();
      if (p === 'quitar') {
        return new FuncionNativa('quitar', (args, pos) => {
          const k = this.comprobarClave(args[0] ?? null, pos);
          if (!obj.tiene(k)) throw new ErrorChispa(pos, `no puedo quitar la clave '${k}' porque no está en la tabla.`, `Las claves que hay son: ${obj.claves().join(', ') || '(ninguna)'}.`);
          return obj.quitar(k);
        });
      }
      return this.leerClave(obj, e.original, e.objeto, e.pos);
    }
    if (obj instanceof Vector2) {
      if (p === 'x') return obj.x;
      if (p === 'y') return obj.y;
      if (p === 'longitud') return obj.longitud();
      if (p === 'normalizado') return obj.normalizado();
    }
    if (Array.isArray(obj)) {
      if (p === 'longitud') return obj.length;
      if (p === 'primero') return obj[0] ?? null;
      if (p === 'ultimo') return obj[obj.length - 1] ?? null;
      const metodo = METODOS_LISTA[p];
      if (metodo) return new FuncionNativa(e.original, (args, pos) => metodo(obj, args, pos));
    }
    if (typeof obj === 'string') {
      if (p === 'longitud') return Array.from(obj).length;
      if (p === 'mayusculas') return obj.toUpperCase();
      if (p === 'minusculas') return obj.toLowerCase();
      const metodo = METODOS_TEXTO[p];
      if (metodo) return new FuncionNativa(e.original, (args, pos) => metodo(obj, args, pos));
    }

    const opciones: Record<string, string> = {
      vector: 'x, y, longitud, normalizado',
      lista: 'longitud, primero, ultimo, añadir, quitar, insertar, ordenar, mezclar, invertir, posicion, contiene, sublista, unir, vaciar',
      texto: 'longitud, mayusculas, minusculas, dividir, reemplazar, contiene, empiezaPor, terminaPor, recortar, trozo, posicion',
    };
    const clave = obj instanceof Vector2 ? 'vector' : Array.isArray(obj) ? 'lista' : typeof obj === 'string' ? 'texto' : null;
    throw new ErrorChispa(
      e.pos,
      `${this.describir(e.objeto)} es ${nombreTipo(obj)} y no tiene nada llamado '${e.original}'.`,
      clave ? `Lo que sí tiene: ${opciones[clave]}.` : 'Los números y los valores lógicos no tienen propiedades.',
    );
  }

  /** Lee una clave de una tabla; si no existe, error con sugerencia y cómo comprobarlo antes. */
  private leerClave(t: Tabla, clave: string, exprTabla: Expresion, pos: Posicion): Valor {
    const v = t.obtener(clave);
    if (v !== undefined) return v;
    const parecida = sugerir(clave, t.claves());
    const nombre = this.describir(exprTabla);
    throw new ErrorChispa(
      pos,
      `la tabla '${nombre}' no tiene ninguna clave llamada '${clave}'.`,
      parecida
        ? `¿Querías decir '${parecida}'?`
        : `Las claves que tiene son: ${t.claves().join(', ') || '(ninguna)'}. Para comprobar si existe antes de leerla: si "${clave}" en ${nombre}:`,
    );
  }

  // ═════════════════════════ AYUDAS ═════════════════════════

  /** Protección contra bucles infinitos. */
  private contarVuelta(pos: Posicion, bucle: string): void {
    if (++this.vueltas > LIMITE_VUELTAS) {
      throw new ErrorChispa(
        pos,
        `este bucle '${bucle}' ha dado más de un millón de vueltas sin parar: parece que no termina nunca y congelaría el juego.`,
        'Si es un bucle que debe repetirse siempre, añade dentro esperar() para que el juego pueda seguir. Si no, revisa la condición: ¿cambia alguna vez?',
      );
    }
  }

  /** Las listas en Chispa empiezan en 1: lista[1] es el primer elemento. */
  private comprobarIndice(longitud: number, indice: Valor, pos: Posicion): number {
    if (typeof indice !== 'number' || !Number.isInteger(indice)) {
      throw new ErrorChispa(pos, `la posición entre [ ] tiene que ser un número entero, pero es ${nombreTipo(indice)}.`);
    }
    if (indice < 1 || indice > longitud) {
      throw new ErrorChispa(
        pos,
        longitud === 0 ? `pides la posición ${indice}, pero está vacío.` : `pides la posición ${indice}, pero las posiciones van de 1 a ${longitud}.`,
        indice === 0 ? 'En Chispa las posiciones empiezan en 1: el primer elemento es [1].' : undefined,
      );
    }
    return indice;
  }

  private comprobarClave(clave: Valor, pos: Posicion): string {
    if (typeof clave !== 'string') {
      throw new ErrorChispa(pos, `las claves de una tabla son textos, pero aquí hay ${nombreTipo(clave)}.`, 'Ejemplo: ficha["vida"]');
    }
    return clave;
  }

  /** Convierte los errores del motor (ErrorMotor, sin posición) en errores de Chispa con posición. */
  private conErroresDelMotor<T>(pos: Posicion, fn: () => T): T {
    try {
      return fn();
    } catch (e) {
      if (e instanceof ErrorMotor && !(e instanceof ErrorChispa)) {
        throw new ErrorChispa(pos, e.message.charAt(0).toLowerCase() + e.message.slice(1), e.pista);
      }
      throw e;
    }
  }

  /** La pista para un nombre que no existe (ver pistaNombreDesconocido). */
  private pistaNombre(nombre: string, ent: Entorno, comoCrearla?: string): string {
    return pistaNombreDesconocido(
      nombre,
      { visibles: ent.nombresVisibles(), deUsuario: ent.nombresDeUsuario(this.globales), objetosEscena: this.nombresDeObjetos() },
      comoCrearla,
    );
  }

  /** Texto corto que describe una expresión: "yo.vida", "enemigo", "buscar(...)". */
  describir(e: Expresion): string {
    switch (e.tipo) {
      case 'Identificador':
        return e.original;
      case 'Miembro':
        return `${this.describir(e.objeto)}.${e.original}`;
      case 'Llamada':
        return `${this.describir(e.funcion)}(...)`;
      case 'Indice':
        return `${this.describir(e.objeto)}[...]`;
      case 'Texto':
        return `"${e.valor}"`;
      case 'Numero':
        return formatearNumero(e.valor);
      default:
        return 'eso';
    }
  }
}

/** Una posición de lista o texto (empiezan en 1) que tiene que estar entre 1 y `maximo`. */
function argPosicion(a: Valor[], i: number, maximo: number, metodo: string, pos: Posicion, ejemplo: string): number {
  const v = a[i];
  if (typeof v !== 'number' || !Number.isInteger(v)) {
    throw new ErrorChispa(pos, v === undefined ? `a '${metodo}' le falta una posición (un número entero).` : `en '${metodo}', la posición tiene que ser un número entero, pero es ${nombreTipo(v)}.`, `Ejemplo: ${ejemplo}`);
  }
  if (v < 1 || v > maximo) {
    throw new ErrorChispa(pos, `en '${metodo}', la posición ${v} no existe: van de 1 a ${maximo}.`, v === 0 ? 'En Chispa las posiciones empiezan en 1.' : `Ejemplo: ${ejemplo}`);
  }
  return v;
}

function argTextoMetodo(a: Valor[], i: number, metodo: string, pos: Posicion, ejemplo: string): string {
  const v = a[i];
  if (typeof v !== 'string') {
    throw new ErrorChispa(pos, v === undefined ? `a '${metodo}' le falta un texto entre comillas.` : `'${metodo}' necesita un texto entre comillas, pero le das ${nombreTipo(v)}.`, `Ejemplo: ${ejemplo}`);
  }
  return v;
}

/** Métodos de los textos: nombre.dividir(" "), frase.reemplazar("a", "e")... Los textos no cambian: devuelven uno nuevo. */
export const METODOS_TEXTO: Record<string, (t: string, args: Valor[], pos: Posicion) => Valor> = sinPrototipo({
  dividir: (t, a, pos) => {
    const sep = a[0] === undefined ? ' ' : argTextoMetodo(a, 0, 'dividir', pos, 'frase.dividir(" ")');
    return sep === '' ? Array.from(t) : t.split(sep);
  },
  reemplazar: (t, a, pos) => {
    const ej = 'frase.reemplazar("gato", "perro")';
    const buscar = argTextoMetodo(a, 0, 'reemplazar', pos, ej);
    if (a[1] === undefined) throw new ErrorChispa(pos, "a 'reemplazar' le falta por qué cambiarlo.", `Ejemplo: ${ej}`);
    if (buscar === '') return t;
    const por = aTexto(a[1]);
    // Antes de hacerlo, cuánto mediría (si no, un texto enorme llenaría la memoria)
    const veces = t.split(buscar).length - 1;
    comprobarLetras(t.length + veces * (por.length - buscar.length), pos);
    return t.split(buscar).join(por);
  },
  contiene: (t, a, pos) => t.includes(argTextoMetodo(a, 0, 'contiene', pos, 'si frase.contiene("hola"):')),
  empiezapor: (t, a, pos) => t.startsWith(argTextoMetodo(a, 0, 'empiezaPor', pos, 'si nombre.empiezaPor("Dr"):')),
  terminapor: (t, a, pos) => t.endsWith(argTextoMetodo(a, 0, 'terminaPor', pos, 'si archivo.terminaPor(".png"):')),
  recortar: (t) => t.trim(),
  trozo: (t, a, pos) => {
    // Posiciones de letras (empiezan en 1), las dos incluidas
    const letras = Array.from(t);
    if (!letras.length) return '';
    const ej = 'nombre.trozo(1, 3)';
    const desde = argPosicion(a, 0, letras.length, 'trozo', pos, ej);
    const hasta = a[1] === undefined ? letras.length : argPosicion(a, 1, letras.length, 'trozo', pos, ej);
    return letras.slice(desde - 1, Math.max(desde - 1, hasta)).join('');
  },
  posicion: (t, a, pos) => {
    const i = t.indexOf(argTextoMetodo(a, 0, 'posicion', pos, 'frase.posicion("hola")'));
    return i < 0 ? 0 : Array.from(t.slice(0, i)).length + 1;
  },
});

/** Ordena números o textos (sin mezclar). Los textos, sin importar mayúsculas ni tildes. */
function comparar(a: Valor, b: Valor, pos: Posicion): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'es', { sensitivity: 'base' });
  throw new ErrorChispa(pos, `no puedo ordenar esta lista: mezcla ${nombreTipo(a)} y ${nombreTipo(b)}.`, 'Solo se pueden ordenar listas de números o listas de textos.');
}

/** Métodos de las listas: lista.añadir(x), lista.quitar(1) */
export const METODOS_LISTA: Record<string, (lista: Valor[], args: Valor[], pos: Posicion) => Valor> = sinPrototipo({
  añadir: (l, a, pos) => (comprobarElementos(l.length + 1, pos), l.push(copiarSiVector(a[0] ?? null)), null),
  anadir: (l, a, pos) => (comprobarElementos(l.length + 1, pos), l.push(copiarSiVector(a[0] ?? null)), null),
  agregar: (l, a, pos) => (comprobarElementos(l.length + 1, pos), l.push(copiarSiVector(a[0] ?? null)), null),
  quitar: (l, a, pos) => {
    const i = a[0];
    if (typeof i !== 'number' || !Number.isInteger(i) || i < 1 || i > l.length) {
      throw new ErrorChispa(pos, `no puedo quitar la posición ${aTexto(i ?? null)}: la lista tiene ${l.length} elementos.`, 'Las posiciones empiezan en 1.');
    }
    return l.splice(i - 1, 1)[0];
  },
  insertar: (l, a, pos) => {
    // Se puede insertar en cualquier sitio, también justo después del último
    const i = argPosicion(a, 0, l.length + 1, 'insertar', pos, 'lista.insertar(1, "primero")');
    comprobarElementos(l.length + 1, pos);
    l.splice(i - 1, 0, copiarSiVector(a[1] ?? null));
    return null;
  },
  ordenar: (l, _a, pos) => (l.sort((x, y) => comparar(x, y, pos)), l),
  mezclar: (l) => {
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    return l;
  },
  invertir: (l) => l.reverse(),
  posicion: (l, a) => l.findIndex((x) => sonIguales(x, a[0] ?? null)) + 1,
  contiene: (l, a) => l.some((x) => sonIguales(x, a[0] ?? null)),
  sublista: (l, a, pos) => {
    if (!l.length) return [];
    const ej = 'lista.sublista(2, 4)';
    const desde = argPosicion(a, 0, l.length, 'sublista', pos, ej);
    const hasta = a[1] === undefined ? l.length : argPosicion(a, 1, l.length, 'sublista', pos, ej);
    return l.slice(desde - 1, Math.max(desde - 1, hasta));
  },
  unir: (l, a, pos) => {
    const r = l.map((x) => aTexto(x)).join(a[0] === undefined ? ', ' : argTextoMetodo(a, 0, 'unir', pos, 'lista.unir(", ")'));
    comprobarLetras(r.length, pos);
    return r;
  },
  vaciar: (l) => {
    l.length = 0;
    return null;
  },
});

/**
 * ¿Es una expresión sin ninguna llamada dentro? Entonces se puede calcular de
 * golpe (nada dentro puede esperar). Se apunta la respuesta de cada expresión.
 */
const sinLlamadasRecordado = new WeakMap<Expresion, boolean>();
function sinLlamadas(e: Expresion): boolean {
  let r = sinLlamadasRecordado.get(e);
  if (r !== undefined) return r;
  switch (e.tipo) {
    case 'Llamada':
      r = false;
      break;
    case 'Texto':
      r = !e.partes || e.partes.every((p) => typeof p === 'string' || sinLlamadas(p));
      break;
    case 'Lista':
      r = e.elementos.every(sinLlamadas);
      break;
    case 'Tabla':
      r = e.entradas.every((x) => sinLlamadas(x.valor));
      break;
    case 'Unaria':
      r = sinLlamadas(e.operando);
      break;
    case 'Binaria':
    case 'Logica':
      r = sinLlamadas(e.izquierda) && sinLlamadas(e.derecha);
      break;
    case 'Miembro':
      r = sinLlamadas(e.objeto);
      break;
    case 'Indice':
      r = sinLlamadas(e.objeto) && sinLlamadas(e.indice);
      break;
    default:
      r = true;
  }
  sinLlamadasRecordado.set(e, r);
  return r;
}
