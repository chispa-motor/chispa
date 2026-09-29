/**
 * INTÉRPRETE: recorre el árbol (AST) y lo ejecuta.
 *
 * ── DECISIÓN: no traducimos a JavaScript ──
 * Podríamos convertir Chispa en JavaScript y ejecutarlo con eval(), pero
 * perderíamos el control: los errores saldrían en inglés y en líneas que no
 * existen en tu código. Recorriendo el árbol nosotros mismos, sabemos
 * SIEMPRE qué línea se está ejecutando y qué está pasando.
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
import type { Bloque, Expresion, Sentencia } from './ast';
import { Entorno } from './entorno';
import { ErrorChispa, sugerir } from './errores';
import {
  Anfitrion,
  FuncionChispa,
  FuncionNativa,
  PeticionEspera,
  aTexto,
  copiarSiVector,
  esVerdadero,
  formatearNumero,
  nombreTipo,
  sonIguales,
  type Valor,
} from './valores';
import { ErrorMotor } from '../motor/Errores';
import { Vector2 } from '../motor/Vector2';

/** Lo que devuelve un bloque: nada, o una orden de salir/devolver. */
type Senal = { tipo: 'devolver'; valor: Valor } | { tipo: 'salir' } | undefined;
/** Un cálculo que puede pausarse con esperar(). */
export type Ejecucion<T> = Generator<PeticionEspera, T, void>;

/**
 * Máximo de vueltas de bucle sin ninguna pausa. Si un `mientras verdadero:`
 * no tiene esperar(), el navegador se congelaría para siempre; así lo cortamos
 * con un error que explica qué ha pasado.
 */
const LIMITE_VUELTAS = 1_000_000;

export class Interprete {
  readonly globales = new Entorno();
  /** Qué hacer con `mostrar`. */
  alMostrar: (texto: string) => void = (t) => console.log(t);
  /** Nombres de los objetos de la escena (para dar mejores pistas en los errores). */
  nombresDeObjetos: () => string[] = () => [];

  private vueltas = 0;

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
        yield* this.asignar(s.objetivo, s.operador, s.valor, ent, s.linea);
        return;

      case 'Si': {
        for (const rama of s.ramas) {
          if (esVerdadero(yield* this.evaluar(rama.condicion, ent))) {
            return yield* this.ejecutarBloque(rama.cuerpo, new Entorno(ent));
          }
        }
        if (s.sino) return yield* this.ejecutarBloque(s.sino, new Entorno(ent));
        return;
      }

      case 'Mientras': {
        while (esVerdadero(yield* this.evaluar(s.condicion, ent))) {
          this.contarVuelta(s.linea, 'mientras');
          const senal = yield* this.ejecutarBloque(s.cuerpo, new Entorno(ent));
          if (senal?.tipo === 'salir') break;
          if (senal) return senal;
        }
        return;
      }

      case 'Repetir': {
        const veces = yield* this.evaluar(s.veces, ent);
        if (typeof veces !== 'number' || veces < 0) {
          throw new ErrorChispa(
            s.linea,
            `'repetir' necesita un número de veces (0 o más), pero le he dado ${nombreTipo(veces)}.`,
            'Ejemplo: repetir 5 veces:',
          );
        }
        for (let i = 0; i < Math.floor(veces); i++) {
          this.contarVuelta(s.linea, 'repetir');
          const senal = yield* this.ejecutarBloque(s.cuerpo, new Entorno(ent));
          if (senal?.tipo === 'salir') break;
          if (senal) return senal;
        }
        return;
      }

      case 'ParaCada': {
        const coleccion = yield* this.evaluar(s.lista, ent);
        let elementos: Valor[];
        if (Array.isArray(coleccion))
          elementos = [...coleccion]; // copia: si la lista cambia dentro del bucle, no nos liamos
        else if (typeof coleccion === 'string')
          elementos = Array.from(coleccion); // letra a letra
        else {
          throw new ErrorChispa(
            s.linea,
            `'para cada' necesita una lista o un texto, pero ${this.describir(s.lista)} es ${nombreTipo(coleccion)}.`,
            typeof coleccion === 'number'
              ? `Para repetir algo un número de veces usa: repetir ${formatearNumero(coleccion)} veces:`
              : 'Ejemplo: para cada enemigo en buscarTodos("Enemigo"):',
          );
        }
        for (const el of elementos) {
          this.contarVuelta(s.linea, 'para cada');
          const e2 = new Entorno(ent);
          e2.declarar(s.variable, copiarSiVector(el), s.original);
          const senal = yield* this.ejecutarBloque(s.cuerpo, e2);
          if (senal?.tipo === 'salir') break;
          if (senal) return senal;
        }
        return;
      }

      case 'Funcion':
        ent.declarar(s.nombre, new FuncionChispa(s, ent), s.original);
        return;

      case 'Devolver':
        return { tipo: 'devolver', valor: s.valor ? yield* this.evaluar(s.valor, ent) : null };

      case 'Salir':
        return { tipo: 'salir' };

      case 'Mostrar': {
        const partes: string[] = [];
        for (const v of s.valores) partes.push(aTexto(yield* this.evaluar(v, ent)));
        this.alMostrar(partes.join(' '));
        return;
      }

      case 'Cuando':
        // Los 'cuando' no se ejecutan aquí: ScriptChispa los registra como eventos.
        return;

      case 'ExpresionSuelta':
        yield* this.evaluar(s.expresion, ent);
        return;
    }
  }

  /** x = v,  yo.vida -= 1,  lista[2] = "hola" */
  private *asignar(objetivo: Expresion, operador: string, exprValor: Expresion, ent: Entorno, linea: number): Ejecucion<void> {
    let valor = yield* this.evaluar(exprValor, ent);

    // Para += -= *= /= primero leemos el valor actual y operamos.
    if (operador !== '=') {
      const actual = yield* this.evaluar(objetivo, ent);
      valor = this.operar(operador[0], actual, valor, linea);
    }
    valor = copiarSiVector(valor);

    if (objetivo.tipo === 'Identificador') {
      if (!ent.asignar(objetivo.nombre, valor)) {
        throw new ErrorChispa(
          linea,
          `la variable '${objetivo.original}' no existe todavía.`,
          this.pistaNombre(objetivo.original, ent) ?? `Para crearla escribe: variable ${objetivo.original} = ...`,
        );
      }
      return;
    }

    if (objetivo.tipo === 'Miembro') {
      const obj = yield* this.evaluarContenedor(objetivo.objeto, ent, `cambiar '${objetivo.original}'`, linea);
      if (obj instanceof Anfitrion) {
        this.conErroresDelMotor(linea, () => obj.asignar(objetivo.propiedad, valor, objetivo.original, linea));
        return;
      }
      if (obj instanceof Vector2 && (objetivo.propiedad === 'x' || objetivo.propiedad === 'y')) {
        if (typeof valor !== 'number') {
          throw new ErrorChispa(
            linea,
            `la coordenada '${objetivo.original}' tiene que ser un número, pero le das ${nombreTipo(valor)}.`,
          );
        }
        obj[objetivo.propiedad] = valor;
        return;
      }
      throw new ErrorChispa(
        linea,
        `no puedo cambiar '${objetivo.original}' de ${this.describir(objetivo.objeto)}, porque es ${nombreTipo(obj)}.`,
        'Solo se pueden cambiar propiedades de objetos (yo.vida = 3) o las coordenadas de un vector (yo.posicion.x = 100).',
      );
    }

    if (objetivo.tipo === 'Indice') {
      const lista = yield* this.evaluar(objetivo.objeto, ent);
      const indice = yield* this.evaluar(objetivo.indice, ent);
      if (!Array.isArray(lista)) {
        throw new ErrorChispa(
          linea,
          `solo se puede cambiar un elemento con [ ] en una lista, y ${this.describir(objetivo.objeto)} es ${nombreTipo(lista)}.`,
        );
      }
      lista[this.comprobarIndice(lista.length, indice, linea) - 1] = valor;
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
            e.linea,
            `no conozco nada llamado '${e.original}'.`,
            this.pistaNombre(e.original, ent) ?? `Si es una variable nueva, créala antes con: variable ${e.original} = ...`,
          );
        }
        return c.valor;
      }

      case 'Lista': {
        const lista: Valor[] = [];
        for (const el of e.elementos) lista.push(copiarSiVector(yield* this.evaluar(el, ent)));
        return lista;
      }

      case 'Unaria': {
        const v = yield* this.evaluar(e.operando, ent);
        if (e.operador === 'no') return !esVerdadero(v);
        if (typeof v === 'number') return -v;
        if (v instanceof Vector2) return v.multiplicar(-1);
        throw new ErrorChispa(e.linea, `no puedo poner un signo menos delante de ${nombreTipo(v)}.`);
      }

      case 'Logica': {
        // "Cortocircuito": en `a y b`, si `a` es falso ni siquiera miramos `b`.
        // Así puedes escribir: si enemigo != nulo y enemigo.vida > 0:
        const izq = esVerdadero(yield* this.evaluar(e.izquierda, ent));
        if (e.operador === 'y') return izq ? esVerdadero(yield* this.evaluar(e.derecha, ent)) : false;
        return izq ? true : esVerdadero(yield* this.evaluar(e.derecha, ent));
      }

      case 'Binaria': {
        const a = yield* this.evaluar(e.izquierda, ent);
        const b = yield* this.evaluar(e.derecha, ent);
        return this.operar(e.operador, a, b, e.linea);
      }

      case 'Miembro': {
        const obj = yield* this.evaluarContenedor(e.objeto, ent, `usar '${e.original}'`, e.linea);
        return this.obtenerMiembro(obj, e, e.linea);
      }

      case 'Indice': {
        const obj = yield* this.evaluar(e.objeto, ent);
        const indice = yield* this.evaluar(e.indice, ent);
        if (Array.isArray(obj)) return obj[this.comprobarIndice(obj.length, indice, e.linea) - 1];
        if (typeof obj === 'string') {
          const letras = Array.from(obj);
          return letras[this.comprobarIndice(letras.length, indice, e.linea) - 1];
        }
        throw new ErrorChispa(
          e.linea,
          `solo se puede usar [ ] con listas y textos, pero ${this.describir(e.objeto)} es ${nombreTipo(obj)}.`,
        );
      }

      case 'Llamada': {
        const funcion = yield* this.evaluar(e.funcion, ent);
        const args: Valor[] = [];
        for (const a of e.argumentos) args.push(yield* this.evaluar(a, ent));
        return yield* this.llamar(funcion, args, e.linea, this.describir(e.funcion));
      }
    }
  }

  /** Llama a una función (de Chispa o del motor). */
  *llamar(funcion: Valor, args: Valor[], linea: number, descripcion = 'esa función'): Ejecucion<Valor> {
    if (funcion instanceof FuncionNativa) {
      const r = this.conErroresDelMotor(linea, () => funcion.ejecutar(args, linea));
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
        throw new ErrorChispa(
          linea,
          `la función '${def.original}' necesita ${def.parametros.length} valor${def.parametros.length === 1 ? '' : 'es'}${nombres ? ` (${nombres})` : ''}, pero le das ${args.length}.`,
          `Revisa los valores entre paréntesis: ${def.original}(${nombres})`,
        );
      }
      const local = new Entorno(funcion.entorno);
      def.parametros.forEach((p, i) => local.declarar(p.nombre, copiarSiVector(args[i]), p.original));
      const senal = yield* this.ejecutarBloque(def.cuerpo, local);
      return senal?.tipo === 'devolver' ? senal.valor : null;
    }

    throw new ErrorChispa(
      linea,
      `'${descripcion}' no es una función, así que no se puede llamar con paréntesis ( ).`,
      funcion === null
        ? '¿Está bien escrito el nombre?'
        : `Es ${nombreTipo(funcion)}. Quita los paréntesis si solo querías su valor.`,
    );
  }

  // ═════════════════════════ OPERADORES ═════════════════════════

  private operar(op: string, a: Valor, b: Valor, linea: number): Valor {
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
          if (b === 0)
            throw new ErrorChispa(
              linea,
              'estás dividiendo entre cero, y eso no se puede.',
              'Comprueba antes que el número de abajo no sea 0.',
            );
          return typeof a === 'number' ? a / b : a.multiplicar(1 / b);
        }
        break;
      case '%':
        if (typeof a === 'number' && typeof b === 'number') {
          if (b === 0) throw new ErrorChispa(linea, 'no se puede calcular el resto de dividir entre cero.');
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
          linea,
          `no puedo comparar ${nombreTipo(a)} con ${nombreTipo(b)} usando '${op}'.`,
          typeof a === 'string' || typeof b === 'string'
            ? '¿Uno de los dos es un número escrito como texto? Conviértelo con numero(...).'
            : a === null || b === null
              ? 'Uno de los dos está vacío (nulo). ¿Le has dado un valor antes?'
              : undefined,
        );
    }
    const verbos: Record<string, string> = {
      '+': 'sumar',
      '-': 'restar',
      '*': 'multiplicar',
      '/': 'dividir',
      '%': 'calcular el resto de',
    };
    throw new ErrorChispa(
      linea,
      `no puedo ${verbos[op]} ${nombreTipo(a)} y ${nombreTipo(b)}.`,
      a === null || b === null
        ? 'Uno de los dos está vacío (nulo). ¿Le has dado un valor antes?'
        : (typeof a === 'string' && typeof b === 'number') || (typeof a === 'number' && typeof b === 'string')
          ? 'Si es un número guardado como texto, conviértelo con numero(...).'
          : undefined,
    );
  }

  // ═════════════════════════ PROPIEDADES ═════════════════════════

  /**
   * Evalúa lo que va a la izquierda del punto y comprueba que existe.
   * Es donde nacen mensajes como:
   *   "intentas cambiar 'vida' de 'enemigo', pero 'enemigo' no existe."
   */
  private *evaluarContenedor(expr: Expresion, ent: Entorno, accion: string, linea: number): Ejecucion<Valor> {
    if (expr.tipo === 'Identificador' && !ent.buscar(expr.nombre)) {
      throw new ErrorChispa(
        linea,
        `intentas ${accion} de '${expr.original}', pero '${expr.original}' no existe.`,
        this.pistaNombre(expr.original, ent) ?? '¿Lo has creado antes o está bien escrito el nombre?',
      );
    }
    const obj = yield* this.evaluar(expr, ent);
    if (obj === null) {
      throw new ErrorChispa(
        linea,
        `intentas ${accion} de '${this.describir(expr)}', pero '${this.describir(expr)}' está vacío (nulo): ese objeto no existe.`,
        '¿Lo has creado antes? Si lo buscas con buscar("..."), ¿está bien escrito el nombre?',
      );
    }
    return obj;
  }

  private obtenerMiembro(obj: Valor, e: Extract<Expresion, { tipo: 'Miembro' }>, linea: number): Valor {
    const p = e.propiedad;
    if (obj instanceof Anfitrion) return this.conErroresDelMotor(linea, () => obj.obtener(p, e.original, linea));

    if (obj instanceof Vector2) {
      if (p === 'x') return obj.x;
      if (p === 'y') return obj.y;
      if (p === 'longitud') return obj.longitud();
      if (p === 'normalizado') return obj.normalizado();
    }
    if (Array.isArray(obj)) {
      if (p === 'longitud') return obj.length;
      const metodo = METODOS_LISTA[p];
      if (metodo) return new FuncionNativa(e.original, (args, l) => metodo(obj, args, l));
    }
    if (typeof obj === 'string') {
      if (p === 'longitud') return Array.from(obj).length;
      if (p === 'mayusculas') return obj.toUpperCase();
      if (p === 'minusculas') return obj.toLowerCase();
    }

    const opciones: Record<string, string> = {
      vector: 'x, y, longitud, normalizado',
      lista: 'longitud, añadir(valor), quitar(posicion), contiene(valor)',
      texto: 'longitud, mayusculas, minusculas',
    };
    const clave = obj instanceof Vector2 ? 'vector' : Array.isArray(obj) ? 'lista' : typeof obj === 'string' ? 'texto' : null;
    throw new ErrorChispa(
      linea,
      `${this.describir(e.objeto)} es ${nombreTipo(obj)} y no tiene nada llamado '${e.original}'.`,
      clave ? `Lo que sí tiene: ${opciones[clave]}.` : 'Los números y los valores lógicos no tienen propiedades.',
    );
  }

  // ═════════════════════════ AYUDAS ═════════════════════════

  /** Protección contra bucles infinitos. */
  private contarVuelta(linea: number, bucle: string): void {
    if (++this.vueltas > LIMITE_VUELTAS) {
      throw new ErrorChispa(
        linea,
        `este bucle '${bucle}' ha dado más de un millón de vueltas sin parar: parece que no termina nunca y congelaría el juego.`,
        'Si es un bucle que debe repetirse siempre, añade dentro esperar() para que el juego pueda seguir. Si no, revisa la condición: ¿cambia alguna vez?',
      );
    }
  }

  /** Las listas en Chispa empiezan en 1: lista[1] es el primer elemento. */
  private comprobarIndice(longitud: number, indice: Valor, linea: number): number {
    if (typeof indice !== 'number' || !Number.isInteger(indice)) {
      throw new ErrorChispa(linea, `la posición entre [ ] tiene que ser un número entero, pero es ${nombreTipo(indice)}.`);
    }
    if (indice < 1 || indice > longitud) {
      throw new ErrorChispa(
        linea,
        longitud === 0
          ? `pides la posición ${indice}, pero está vacío.`
          : `pides la posición ${indice}, pero solo hay ${longitud} elemento${longitud === 1 ? '' : 's'}.`,
        indice === 0
          ? 'En Chispa las posiciones empiezan en 1: el primer elemento es [1].'
          : `Las posiciones válidas van de 1 a ${longitud}.`,
      );
    }
    return indice;
  }

  /** Convierte los errores del motor (ErrorMotor sin línea) en errores de Chispa con línea. */
  private conErroresDelMotor<T>(linea: number, fn: () => T): T {
    try {
      return fn();
    } catch (e) {
      if (e instanceof ErrorMotor && !(e instanceof ErrorChispa))
        throw new ErrorChispa(linea, primeraMinuscula(e.message), e.pista);
      throw e;
    }
  }

  /** "¿Querías decir 'vida'?" o "Si es el objeto de la escena, búscalo con buscar(...)". */
  private pistaNombre(nombre: string, ent: Entorno): string | null {
    const parecido = sugerir(nombre, ent.nombresVisibles());
    if (parecido) return `¿Querías decir '${parecido}'?`;
    const objeto = this.nombresDeObjetos().find((n) => n.toLowerCase() === nombre.toLowerCase());
    if (objeto) {
      return `Hay un objeto llamado '${objeto}' en la escena, pero para usarlo primero hay que buscarlo: variable ${nombre.toLowerCase()} = buscar("${objeto}"). Dentro de "cuando toco ${objeto}:" lo tienes en 'otro'.`;
    }
    return null;
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

function primeraMinuscula(t: string): string {
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/** Métodos de las listas: lista.añadir(x), lista.quitar(1), lista.contiene(x) */
const METODOS_LISTA: Record<string, (lista: Valor[], args: Valor[], linea: number) => Valor> = {
  añadir: (l, a) => (l.push(copiarSiVector(a[0] ?? null)), null),
  anadir: (l, a) => (l.push(copiarSiVector(a[0] ?? null)), null),
  agregar: (l, a) => (l.push(copiarSiVector(a[0] ?? null)), null),
  quitar: (l, a, linea) => {
    const i = a[0];
    if (typeof i !== 'number' || i < 1 || i > l.length || !Number.isInteger(i)) {
      throw new ErrorChispa(
        linea,
        `no puedo quitar la posición ${aTexto(i ?? null)}: la lista tiene ${l.length} elementos.`,
        'Las posiciones empiezan en 1.',
      );
    }
    return l.splice(i - 1, 1)[0];
  },
  contiene: (l, a) => l.some((x) => sonIguales(x, a[0] ?? null)),
};
