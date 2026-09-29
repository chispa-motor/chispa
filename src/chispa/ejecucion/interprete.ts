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
import { ErrorMotor } from '../../motor/Errores';
import { Vector2 } from '../../motor/Vector2';

/** Lo que devuelve un bloque: nada, o una orden de salir de un bucle o de una función. */
type Senal = { tipo: 'devolver'; valor: Valor } | { tipo: 'romper' } | { tipo: 'continuar' } | undefined;
/** Un cálculo que puede pausarse con esperar(). */
export type Ejecucion<T> = Generator<PeticionEspera, T, void>;

/**
 * Máximo de vueltas de bucle sin ninguna pausa. Si un `mientras verdadero:`
 * no tiene esperar(), el navegador se congelaría para siempre; así lo cortamos
 * con un error que explica qué ha pasado.
 */
export const LIMITE_VUELTAS = 1_000_000;

export class Interprete {
  readonly globales = new Entorno();
  /** Qué hacer con mostrar(). Lo cambia quien usa el intérprete (la consola del motor, los tests...). */
  alMostrar: (texto: string) => void = (t) => console.log(t);
  /** Nombres de los objetos de la escena (para dar mejores pistas en los errores). */
  nombresDeObjetos: () => string[] = () => [];

  private vueltas = 0;

  constructor() {
    // mostrar, esperar, matemáticas, textos... (las que no necesitan el motor)
    instalarBasicas(this);
  }

  /** El planificador lo llama cada vez que reanuda un hilo. */
  reiniciarContadorDeVueltas(): void {
    this.vueltas = 0;
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
    switch (s.tipo) {
      case 'Variable': {
        const valor = yield* this.evaluar(s.valor, ent);
        ent.declarar(s.nombre, copiarSiVector(valor), s.original);
        return;
      }

      case 'Asignacion':
        yield* this.asignar(s.objetivo, s.operador, s.valor, ent, s.pos);
        return;

      case 'Si':
        for (const rama of s.ramas) {
          if (esVerdadero(yield* this.evaluar(rama.condicion, ent))) {
            return yield* this.ejecutarBloque(rama.cuerpo, new Entorno(ent));
          }
        }
        if (s.sino) return yield* this.ejecutarBloque(s.sino, new Entorno(ent));
        return;

      case 'Mientras':
        while (esVerdadero(yield* this.evaluar(s.condicion, ent))) {
          this.contarVuelta(s.pos, 'mientras');
          const senal = yield* this.ejecutarBloque(s.cuerpo, new Entorno(ent));
          if (senal?.tipo === 'romper') break;
          if (senal?.tipo === 'devolver') return senal;
        }
        return;

      case 'Repetir': {
        const veces = yield* this.evaluar(s.veces, ent);
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
        ent.declarar(s.nombre, new FuncionChispa(s, ent), s.original);
        return;

      case 'Devolver':
        return { tipo: 'devolver', valor: s.valor ? yield* this.evaluar(s.valor, ent) : null };

      case 'Romper':
        return { tipo: 'romper' };

      case 'Continuar':
        return { tipo: 'continuar' };

      case 'Cuando':
        // Los 'cuando' no se ejecutan aquí: ScriptChispa los registra como eventos.
        return;

      case 'ExpresionSuelta':
        yield* this.evaluar(s.expresion, ent);
        return;
    }
  }

  /** para cada x en lista / texto / tabla   ·   para cada clave, valor en tabla */
  private *paraCada(s: Extract<Sentencia, { tipo: 'ParaCada' }>, ent: Entorno): Ejecucion<Senal> {
    const coleccion = yield* this.evaluar(s.coleccion, ent);
    const dos = s.variables.length === 2;
    let pasos: Valor[][]; // cada paso: los valores de las variables del bucle

    if (coleccion instanceof Tabla) {
      // En el orden en que se añadieron las claves (lo garantiza Tabla)
      pasos = coleccion.pares().map(([k, v]) => (dos ? [k, v] : [k]));
    } else if (Array.isArray(coleccion) || typeof coleccion === 'string') {
      if (dos) {
        throw new ErrorChispa(
          s.variables[1].pos,
          `con dos nombres ('${s.variables[0].original}, ${s.variables[1].original}') solo se pueden recorrer tablas, y ${this.describir(s.coleccion)} es ${nombreTipo(coleccion)}.`,
          `Para una lista usa un solo nombre: para cada ${s.variables[0].original} en ${this.describir(s.coleccion)}:`,
        );
      }
      // Copia: si la lista cambia dentro del bucle, el recorrido no se lía. Los textos van letra a letra.
      pasos = (Array.isArray(coleccion) ? [...coleccion] : Array.from(coleccion)).map((v) => [v]);
    } else {
      throw new ErrorChispa(
        s.coleccion.pos,
        `'para cada' necesita una lista, un texto o una tabla, pero ${this.describir(s.coleccion)} es ${nombreTipo(coleccion)}.`,
        typeof coleccion === 'number'
          ? `Para repetir algo un número de veces usa: repetir ${formatearNumero(coleccion)} veces:`
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
    let valor = yield* this.evaluar(exprValor, ent);

    // Para += -= *= /= primero leemos el valor actual y operamos.
    if (operador !== '=') {
      const actual = yield* this.evaluar(objetivo, ent);
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
      const cont = yield* this.evaluar(objetivo.objeto, ent);
      const indice = yield* this.evaluar(objetivo.indice, ent);
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
    switch (e.tipo) {
      case 'Numero':
      case 'Texto':
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
        for (const el of e.elementos) lista.push(copiarSiVector(yield* this.evaluar(el, ent)));
        return lista;
      }

      case 'Tabla': {
        const t = new Tabla();
        for (const entrada of e.entradas) t.poner(entrada.clave, copiarSiVector(yield* this.evaluar(entrada.valor, ent)));
        return t;
      }

      case 'Unaria': {
        const v = yield* this.evaluar(e.operando, ent);
        if (e.operador === 'no') return !esVerdadero(v);
        if (typeof v === 'number') return -v;
        if (v instanceof Vector2) return v.multiplicar(-1);
        throw new ErrorChispa(e.pos, `no puedo poner un signo menos delante de ${nombreTipo(v)}.`);
      }

      case 'Logica': {
        // "Cortocircuito": en `a y b`, si `a` es falso ni siquiera miramos `b`.
        // Así funciona: si enemigo != nulo y enemigo.vida > 0:
        const izq = esVerdadero(yield* this.evaluar(e.izquierda, ent));
        if (e.operador === 'y') return izq ? esVerdadero(yield* this.evaluar(e.derecha, ent)) : false;
        return izq ? true : esVerdadero(yield* this.evaluar(e.derecha, ent));
      }

      case 'Binaria': {
        const a = yield* this.evaluar(e.izquierda, ent);
        const b = yield* this.evaluar(e.derecha, ent);
        if (e.operador === 'en') return this.contiene(b, a, e);
        return this.operar(e.operador, a, b, e.pos, e.izquierda, e.derecha);
      }

      case 'Miembro': {
        const obj = yield* this.evaluarContenedor(e.objeto, ent, `usar '${e.original}'`);
        return this.obtenerMiembro(obj, e);
      }

      case 'Indice': {
        const obj = yield* this.evaluar(e.objeto, ent);
        const indice = yield* this.evaluar(e.indice, ent);
        if (Array.isArray(obj)) return obj[this.comprobarIndice(obj.length, indice, e.indice.pos) - 1];
        if (typeof obj === 'string') {
          const letras = Array.from(obj);
          return letras[this.comprobarIndice(letras.length, indice, e.indice.pos) - 1];
        }
        if (obj instanceof Tabla) return this.leerClave(obj, this.comprobarClave(indice, e.indice.pos), e.objeto, e.indice.pos);
        throw new ErrorChispa(e.pos, `solo se puede usar [ ] con listas, textos y tablas, pero ${this.describir(e.objeto)} es ${nombreTipo(obj)}.`);
      }

      case 'Llamada': {
        const funcion = yield* this.evaluar(e.funcion, ent);
        const args: Valor[] = [];
        for (const a of e.argumentos) args.push(yield* this.evaluar(a, ent));
        return yield* this.llamar(funcion, args, e.pos, this.describir(e.funcion));
      }
    }
  }

  /** Llama a una función (de Chispa o del motor). */
  *llamar(funcion: Valor, args: Valor[], pos: Posicion, descripcion = 'esa función'): Ejecucion<Valor> {
    if (funcion instanceof FuncionNativa) {
      const r = this.conErroresDelMotor(pos, () => funcion.ejecutar(args, pos));
      if (r instanceof PeticionEspera) {
        yield r; // ← aquí se pausa el hilo (esperar)
        return null;
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
      try {
        const senal = yield* this.ejecutarBloque(def.cuerpo, local);
        return senal?.tipo === 'devolver' ? senal.valor : null;
      } catch (error) {
        // El error "atraviesa" esta función: apuntamos desde dónde se la llamó (pila de llamadas)
        if (error instanceof ErrorChispa) error.agregarLlamada(def.original, pos);
        throw error;
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
        if (typeof a === 'string' || typeof b === 'string') return aTexto(a) + aTexto(b);
        if (a instanceof Vector2 && b instanceof Vector2) return a.sumar(b);
        if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
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
    const obj = yield* this.evaluar(expr, ent);
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
      const metodo = METODOS_LISTA[p];
      if (metodo) return new FuncionNativa(e.original, (args, pos) => metodo(obj, args, pos));
    }
    if (typeof obj === 'string') {
      if (p === 'longitud') return Array.from(obj).length;
      if (p === 'mayusculas') return obj.toUpperCase();
      if (p === 'minusculas') return obj.toLowerCase();
    }

    const opciones: Record<string, string> = {
      vector: 'x, y, longitud, normalizado',
      lista: 'longitud, añadir(valor), quitar(posicion)',
      texto: 'longitud, mayusculas, minusculas',
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

/** Métodos de las listas: lista.añadir(x), lista.quitar(1) */
const METODOS_LISTA: Record<string, (lista: Valor[], args: Valor[], pos: Posicion) => Valor> = {
  añadir: (l, a) => (l.push(copiarSiVector(a[0] ?? null)), null),
  anadir: (l, a) => (l.push(copiarSiVector(a[0] ?? null)), null),
  agregar: (l, a) => (l.push(copiarSiVector(a[0] ?? null)), null),
  quitar: (l, a, pos) => {
    const i = a[0];
    if (typeof i !== 'number' || !Number.isInteger(i) || i < 1 || i > l.length) {
      throw new ErrorChispa(pos, `no puedo quitar la posición ${aTexto(i ?? null)}: la lista tiene ${l.length} elementos.`, 'Las posiciones empiezan en 1.');
    }
    return l.splice(i - 1, 1)[0];
  },
};
