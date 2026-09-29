/**
 * ════════════════════════════════════════════════════════════════════
 *  ETAPA 2 de 3 · SINTAXIS — El parser: lista de tokens → árbol (AST)
 * ════════════════════════════════════════════════════════════════════
 *
 * Técnica: DESCENSO RECURSIVO. Hay una función por cada regla del lenguaje
 * y se llaman unas a otras. Por ejemplo, sentenciaSi() lee "si", luego llama
 * a expresion() para la condición y a bloque() para el cuerpo. Es la forma
 * más fácil de escribir un parser a mano y la que da mejores errores.
 *
 * ── Precedencia de operadores (de menos a más fuerte) ──
 *     o  →  y  →  no  →  == != < > <= >= en  →  + -  →  * / %  →  -x  →  llamadas . [ ]
 * Cada nivel llama al siguiente para leer sus "trozos". Por eso en
 * "2 + 3 * 4" la multiplicación se agrupa antes y el resultado es 14.
 */
import type { Bloque, EntradaTabla, Evento, Expresion, Nombre, Programa, Sentencia } from './ast';
import { ErrorChispa } from '../errores/ErrorChispa';
import { analizarLexico } from '../lexico/lexer';
import { SIGNIFICADO_PALABRA, posicionDe, type Posicion, type Token } from '../lexico/tokens';

const OPERADORES_ASIGNACION = ['=', '+=', '-=', '*=', '/='];
const COMPARACIONES = ['==', '!=', '<', '>', '<=', '>='];

/** Compila código Chispa a un Programa (AST). Lanza ErrorChispa si hay errores. */
export function compilar(codigo: string, archivo: string): Programa {
  const lineas = codigo.replace(/\r\n?/g, '\n').split('\n');
  try {
    const tokens = analizarLexico(codigo);
    const sentencias = new Parser(tokens, lineas).programa();
    return { sentencias, archivo, lineas };
  } catch (e) {
    if (e instanceof ErrorChispa) e.conArchivo(archivo, lineas);
    throw e;
  }
}

class Parser {
  private pos = 0;
  /** ¿Cuántos bucles hay abiertos? (para saber si 'romper' y 'continuar' están bien usados) */
  private bucles = 0;
  /** ¿Estamos dentro de un bloque? (los 'cuando' tienen que ir en el nivel principal) */
  private profundidad = 0;

  constructor(
    private tokens: Token[],
    private lineas: string[],
  ) {}

  // ───────────────────────── Utilidades ─────────────────────────

  private get actual(): Token {
    return this.tokens[this.pos];
  }
  private avanzar(): Token {
    const t = this.tokens[this.pos];
    if (t.tipo !== 'fin') this.pos++;
    return t;
  }
  private es(tipo: Token['tipo'], valor?: string, t = this.actual): boolean {
    return t.tipo === tipo && (valor === undefined || t.valor === valor);
  }
  private esSimbolo(v: string, t = this.actual) {
    return this.es('simbolo', v, t);
  }
  private esClave(v: string, t = this.actual) {
    return this.es('palabraClave', v, t);
  }
  /** Palabras contextuales ("veces", "empieza", "toco"...) son identificadores normales. */
  private esPalabra(v: string, t = this.actual) {
    return this.es('identificador', v, t);
  }
  private error(mensaje: string, pista?: string, t: Token | Posicion = this.actual): never {
    const p = 'tipo' in t ? this.posicionToken(t) : t;
    throw new ErrorChispa(p, mensaje, pista);
  }
  /** Posición de un token; para "fin de línea" subrayamos el último carácter de la línea. */
  private posicionToken(t: Token): Posicion {
    if (t.tipo === 'nuevaLinea' || t.tipo === 'fin') {
      const texto = this.lineas[t.linea - 1] ?? '';
      return { linea: t.linea, columna: Math.max(1, texto.trimEnd().length), longitud: 1 };
    }
    return posicionDe(t);
  }
  /** Describe un token para los mensajes: "el final de la línea", "'mientras'"... */
  private describir(t: Token): string {
    if (t.tipo === 'nuevaLinea' || t.tipo === 'fin') return 'el final de la línea';
    if (t.tipo === 'indentar' || t.tipo === 'desindentar') return 'un cambio de sangría';
    if (t.tipo === 'texto') return `el texto ${t.original}`;
    return `'${t.original}'`;
  }

  // ───────────────────────── Programa y bloques ─────────────────────────

  programa(): Bloque {
    const sentencias: Bloque = [];
    while (!this.es('fin')) sentencias.push(this.sentencia());
    return sentencias;
  }

  /** Lee ":" + salto de línea + bloque con sangría. `que` describe la línea para los errores. */
  private bloque(que: string): Bloque {
    if (this.esSimbolo('=')) {
      this.error(
        "para comparar si dos cosas son iguales hay que usar '==' (dos iguales).",
        'Un solo = sirve para GUARDAR un valor. Ejemplo: si vida == 0:',
      );
    }
    if (!this.esSimbolo(':')) {
      this.error(
        `esperaba ':' al final de la línea (${que}), pero he encontrado ${this.describir(this.actual)}.`,
        "En Chispa, las líneas que abren un bloque (si, mientras, repetir, para cada, funcion, cuando) terminan en dos puntos ':'.",
      );
    }
    this.avanzar();
    if (!this.es('nuevaLinea')) {
      this.error(
        "después de ':' tienes que pasar a la línea siguiente.",
        'Escribe lo que va dentro en las líneas de abajo, con 4 espacios más de sangría.',
      );
    }
    this.avanzar();
    if (!this.es('indentar')) {
      this.error(
        `el bloque de "${que}" está vacío o le falta sangría.`,
        "Las líneas que van DENTRO de un bloque tienen que empezar con 4 espacios más que la línea con ':'.",
      );
    }
    this.avanzar();
    this.profundidad++;
    const sentencias: Bloque = [];
    while (!this.es('desindentar') && !this.es('fin')) sentencias.push(this.sentencia());
    this.profundidad--;
    this.avanzar(); // desindentar
    return sentencias;
  }

  private finDeLinea(): void {
    if (this.es('nuevaLinea')) {
      this.avanzar();
      return;
    }
    if (this.es('fin')) return;
    this.error(
      `sobra algo al final de la línea: ${this.describir(this.actual)}.`,
      'Cada orden va en su propia línea. Revisa si te falta un operador (+, -, ==...) o una coma.',
    );
  }

  // ───────────────────────── Sentencias ─────────────────────────

  private sentencia(): Sentencia {
    const t = this.actual;
    if (t.tipo === 'indentar') {
      this.error(
        'esta línea tiene sangría (espacios al principio) pero la línea de arriba no termina en ":".',
        "Quita los espacios del principio, o termina la línea de arriba con ':' si querías abrir un bloque.",
      );
    }

    if (t.tipo === 'palabraClave') {
      switch (t.valor) {
        case 'variable':
          return this.sentenciaVariable();
        case 'si':
          return this.sentenciaSi();
        case 'sino':
          this.error("'sino' tiene que ir justo después del bloque de un 'si', con la misma sangría que el 'si'.");
        case 'mientras':
          return this.sentenciaMientras();
        case 'repetir':
          return this.sentenciaRepetir();
        case 'para':
          return this.sentenciaParaCada();
        case 'funcion':
          return this.sentenciaFuncion();
        case 'cuando':
          return this.sentenciaCuando();
        case 'devolver': {
          this.avanzar();
          const valor = this.es('nuevaLinea') || this.es('fin') ? null : this.expresion();
          this.finDeLinea();
          return { tipo: 'Devolver', valor, pos: posicionDe(t) };
        }
        case 'romper':
        case 'continuar': {
          this.avanzar();
          if (this.bucles === 0) {
            this.error(`'${t.original}' solo se puede usar dentro de un bucle (mientras, repetir o para cada).`, undefined, t);
          }
          this.finDeLinea();
          return { tipo: t.valor === 'romper' ? 'Romper' : 'Continuar', pos: posicionDe(t) };
        }
      }
    }

    // Si no empieza por palabra clave: es una asignación (x = 5) o una llamada (yo.saltar())
    const expr = this.expresion();
    if (this.es('simbolo') && OPERADORES_ASIGNACION.includes(this.actual.valor)) {
      const op = this.avanzar();
      if (expr.tipo !== 'Identificador' && expr.tipo !== 'Miembro' && expr.tipo !== 'Indice') {
        this.error(
          'lo que hay a la izquierda del = no es algo donde se pueda guardar un valor.',
          'A la izquierda del = tiene que ir una variable (puntos = 5), una propiedad (yo.vida = 5) o una posición (lista[1] = 5).',
          expr.pos,
        );
      }
      const valor = this.expresion();
      this.finDeLinea();
      return { tipo: 'Asignacion', objetivo: expr, operador: op.valor, valor, pos: posicionDe(op) };
    }
    this.finDeLinea();
    return { tipo: 'ExpresionSuelta', expresion: expr, pos: expr.pos };
  }

  /** Lee un nombre nuevo (variable, parámetro, función) y da un buen error si es una palabra reservada. */
  private nombreNuevo(para: string): Nombre {
    const t = this.actual;
    if (t.tipo === 'palabraClave') {
      const significado = SIGNIFICADO_PALABRA[t.valor];
      this.error(
        `'${t.original}' es una palabra reservada de Chispa${significado ? ` (${significado})` : ''}, así que no puedes usarla como nombre de ${para}.`,
        `Prueba con otro nombre${t.valor === 'y' ? ", por ejemplo 'posY'" : t.valor === 'o' ? ", por ejemplo 'opcion'" : ''}.`,
      );
    }
    if (t.tipo !== 'identificador') {
      this.error(
        `aquí esperaba el nombre de ${para}, pero he encontrado ${this.describir(t)}.`,
        'Los nombres empiezan por una letra y pueden llevar letras, números y _. Ejemplo: vidaMaxima',
      );
    }
    this.avanzar();
    return { nombre: t.valor, original: t.original, pos: posicionDe(t) };
  }

  private sentenciaVariable(): Sentencia {
    const inicio = this.avanzar();
    const n = this.nombreNuevo('variable');
    if (!this.esSimbolo('=')) {
      this.error(`falta el '=' y el valor inicial de la variable '${n.original}'.`, `Ejemplo: variable ${n.original} = 0`);
    }
    this.avanzar();
    const valor = this.expresion();
    this.finDeLinea();
    return { tipo: 'Variable', nombre: n.nombre, original: n.original, valor, pos: posicionDe(inicio) };
  }

  private sentenciaSi(): Sentencia {
    const inicio = this.avanzar();
    const ramas = [{ condicion: this.expresion(), cuerpo: this.bloque('si ...') }];
    let sino: Bloque | null = null;
    while (this.esClave('sino')) {
      this.avanzar();
      if (this.esClave('si')) {
        this.avanzar();
        ramas.push({ condicion: this.expresion(), cuerpo: this.bloque('sino si ...') });
      } else {
        sino = this.bloque('sino');
        break;
      }
    }
    return { tipo: 'Si', ramas, sino, pos: posicionDe(inicio) };
  }

  private cuerpoDeBucle(que: string): Bloque {
    this.bucles++;
    const cuerpo = this.bloque(que);
    this.bucles--;
    return cuerpo;
  }

  private sentenciaMientras(): Sentencia {
    const inicio = this.avanzar();
    const condicion = this.expresion();
    return { tipo: 'Mientras', condicion, cuerpo: this.cuerpoDeBucle('mientras ...'), pos: posicionDe(inicio) };
  }

  private sentenciaRepetir(): Sentencia {
    const inicio = this.avanzar();
    if (this.esSimbolo(':')) this.error('falta decir cuántas veces hay que repetir.', 'Ejemplo: repetir 3 veces:');
    const veces = this.expresion();
    if (this.esPalabra('veces') || this.esPalabra('vez')) this.avanzar();
    return { tipo: 'Repetir', veces, cuerpo: this.cuerpoDeBucle('repetir N veces'), pos: posicionDe(inicio) };
  }

  private sentenciaParaCada(): Sentencia {
    const inicio = this.avanzar();
    if (!this.esClave('cada')) this.error("después de 'para' tiene que ir 'cada'.", 'Ejemplo: para cada enemigo en enemigos:');
    this.avanzar();
    const variables = [this.nombreNuevo('variable')];
    if (this.esSimbolo(',')) {
      this.avanzar();
      variables.push(this.nombreNuevo('variable'));
    }
    if (!this.esClave('en')) {
      const nombres = variables.map((v) => v.original).join(', ');
      this.error(`falta la palabra 'en' después de '${nombres}'.`, `Ejemplo: para cada ${nombres} en lista:`);
    }
    this.avanzar();
    const coleccion = this.expresion();
    const cuerpo = this.cuerpoDeBucle(`para cada ... en ...`);
    return { tipo: 'ParaCada', variables, coleccion, cuerpo, pos: posicionDe(inicio) };
  }

  private sentenciaFuncion(): Sentencia {
    const inicio = this.avanzar();
    const n = this.nombreNuevo('función');
    const parametros: Nombre[] = [];
    if (!this.esSimbolo('(')) {
      this.error(`después del nombre de la función van los paréntesis, aunque estén vacíos.`, `Ejemplo: funcion ${n.original}():`);
    }
    this.avanzar();
    while (!this.esSimbolo(')')) {
      parametros.push(this.nombreNuevo('parámetro'));
      if (this.esSimbolo(',')) this.avanzar();
      else if (!this.esSimbolo(')')) this.error('los parámetros de una función se separan con comas.', `Ejemplo: funcion ${n.original}(a, b):`);
    }
    this.avanzar();
    // Los bucles de fuera no cuentan dentro de la función ('romper' no puede salir de ella)
    const buclesFuera = this.bucles;
    this.bucles = 0;
    const cuerpo = this.bloque(`funcion ${n.original}(...)`);
    this.bucles = buclesFuera;
    return { tipo: 'Funcion', nombre: n.nombre, original: n.original, parametros, cuerpo, pos: posicionDe(inicio) };
  }

  private sentenciaCuando(): Sentencia {
    const inicio = this.avanzar();
    if (this.profundidad > 0) {
      this.error(
        "los bloques 'cuando' tienen que ir en el nivel principal del script, sin sangría.",
        "Saca este 'cuando' fuera del bloque en el que está.",
        inicio,
      );
    }
    const evento = this.evento();
    return { tipo: 'Cuando', evento, cuerpo: this.bloque('cuando ...'), pos: posicionDe(inicio) };
  }

  /** Reconoce el evento que va después de "cuando". */
  private evento(): Evento {
    const t = this.actual;
    const ayuda =
      'Los eventos que existen son:\n' +
      '    cuando empieza:\n    cuando cada fotograma:\n    cuando cada 2 segundos:\n' +
      '    cuando se pulsa "espacio":   (también "se mantiene" y "se suelta")\n' +
      '    cuando toco Enemigo:\n    cuando dejo de tocar Enemigo:\n    cuando hago clic:';

    if (this.esPalabra('empieza') || this.esPalabra('empiece') || this.esPalabra('comienza')) {
      this.avanzar();
      return { tipo: 'empieza' };
    }
    if (this.esClave('cada')) {
      this.avanzar();
      if (this.esPalabra('fotograma')) {
        this.avanzar();
        return { tipo: 'fotograma' };
      }
      const segundos = this.suma();
      if (this.esPalabra('segundos') || this.esPalabra('segundo')) {
        this.avanzar();
        return { tipo: 'intervalo', segundos };
      }
      this.error("después de 'cuando cada' esperaba 'fotograma' o 'N segundos'.", 'Ejemplos:\n    cuando cada fotograma:\n    cuando cada 2 segundos:');
    }
    if (this.esPalabra('se')) {
      this.avanzar();
      const modos: Record<string, 'pulsa' | 'mantiene' | 'suelta'> = { pulsa: 'pulsa', mantiene: 'mantiene', suelta: 'suelta' };
      const modo = this.actual.tipo === 'identificador' ? modos[this.actual.valor] : undefined;
      if (!modo) this.error("después de 'cuando se' esperaba 'pulsa', 'mantiene' o 'suelta'.", 'Ejemplo: cuando se pulsa "espacio":');
      this.avanzar();
      // suma() y no expresion(): así la 'o' de   "espacio" o "arriba"   no se lee como 'o' lógico.
      const teclas = [this.suma()];
      while (this.esSimbolo(',') || this.esClave('o')) {
        this.avanzar();
        teclas.push(this.suma());
      }
      return { tipo: 'tecla', modo, teclas };
    }
    if (this.esPalabra('hago')) {
      this.avanzar();
      if (!this.esPalabra('clic') && !this.esPalabra('click')) this.error("esperaba 'cuando hago clic:'.");
      this.avanzar();
      return { tipo: 'clic' };
    }
    let dejar = false;
    if (this.esPalabra('dejo')) {
      this.avanzar();
      if (!this.esPalabra('de')) this.error("esperaba 'cuando dejo de tocar ...'.");
      this.avanzar();
      if (!this.esPalabra('tocar')) this.error("esperaba 'cuando dejo de tocar ...'.");
      dejar = true;
    } else if (!this.esPalabra('toco')) {
      this.error(`no conozco el evento 'cuando ${t.original}'.`, ayuda);
    }
    this.avanzar(); // "toco" o "tocar"
    if (this.esSimbolo(':')) return { tipo: 'toco', con: null, original: null, dejar }; // cualquier objeto
    const n = this.actual;
    if (n.tipo !== 'identificador' && n.tipo !== 'texto') {
      this.error('después de "toco" va el nombre o el tipo del objeto.', 'Ejemplo: cuando toco Moneda:');
    }
    this.avanzar();
    return n.tipo === 'texto'
      ? { tipo: 'toco', con: n.valor.toLowerCase(), original: n.valor, dejar }
      : { tipo: 'toco', con: n.valor, original: n.original, dejar };
  }

  // ───────────────────────── Expresiones ─────────────────────────

  private expresion(): Expresion {
    return this.o();
  }

  private o(): Expresion {
    let izq = this.y();
    while (this.esClave('o')) {
      const t = this.avanzar();
      izq = { tipo: 'Logica', operador: 'o', izquierda: izq, derecha: this.y(), pos: posicionDe(t) };
    }
    return izq;
  }

  private y(): Expresion {
    let izq = this.no();
    while (this.esClave('y')) {
      const t = this.avanzar();
      izq = { tipo: 'Logica', operador: 'y', izquierda: izq, derecha: this.no(), pos: posicionDe(t) };
    }
    return izq;
  }

  private no(): Expresion {
    if (this.esClave('no')) {
      const t = this.avanzar();
      return { tipo: 'Unaria', operador: 'no', operando: this.no(), pos: posicionDe(t) };
    }
    return this.comparacion();
  }

  private comparacion(): Expresion {
    let izq = this.suma();
    while ((this.es('simbolo') && COMPARACIONES.includes(this.actual.valor)) || this.esClave('en')) {
      const t = this.avanzar();
      izq = { tipo: 'Binaria', operador: t.valor, izquierda: izq, derecha: this.suma(), pos: posicionDe(t) };
    }
    return izq;
  }

  private suma(): Expresion {
    let izq = this.multiplicacion();
    while (this.esSimbolo('+') || this.esSimbolo('-')) {
      const t = this.avanzar();
      izq = { tipo: 'Binaria', operador: t.valor, izquierda: izq, derecha: this.multiplicacion(), pos: posicionDe(t) };
    }
    return izq;
  }

  private multiplicacion(): Expresion {
    let izq = this.unaria();
    while (this.esSimbolo('*') || this.esSimbolo('/') || this.esSimbolo('%')) {
      const t = this.avanzar();
      izq = { tipo: 'Binaria', operador: t.valor, izquierda: izq, derecha: this.unaria(), pos: posicionDe(t) };
    }
    return izq;
  }

  private unaria(): Expresion {
    if (this.esSimbolo('-')) {
      const t = this.avanzar();
      return { tipo: 'Unaria', operador: '-', operando: this.unaria(), pos: posicionDe(t) };
    }
    return this.postfijo();
  }

  /** Llamadas f(x), propiedades a.b e índices a[1]. Se pueden encadenar: a.b(1)[2] */
  private postfijo(): Expresion {
    let expr = this.primario();
    for (;;) {
      if (this.esSimbolo('(')) {
        this.avanzar();
        const argumentos: Expresion[] = [];
        while (!this.esSimbolo(')')) {
          argumentos.push(this.expresion());
          if (this.esSimbolo(',')) this.avanzar();
          else if (!this.esSimbolo(')'))
            this.error(
              `dentro de los paréntesis esperaba una coma o ')', pero he encontrado ${this.describir(this.actual)}.`,
              'Los valores que le pasas a una función se separan con comas. Ejemplo: crear("Bala", 100, 200)',
            );
        }
        this.avanzar();
        expr = { tipo: 'Llamada', funcion: expr, argumentos, pos: expr.pos };
      } else if (this.esSimbolo('.')) {
        this.avanzar();
        const p = this.actual;
        // Después de un punto se permiten también palabras reservadas: posicion.y, tabla.en...
        if (p.tipo !== 'identificador' && p.tipo !== 'palabraClave') {
          this.error('después de un punto tiene que ir el nombre de una propiedad.', 'Ejemplo: yo.vida');
        }
        this.avanzar();
        expr = { tipo: 'Miembro', objeto: expr, propiedad: p.valor, original: p.original, pos: posicionDe(p) };
      } else if (this.esSimbolo('[')) {
        const t = this.avanzar();
        const indice = this.expresion();
        if (!this.esSimbolo(']')) this.error("falta cerrar el corchete con ']'.");
        this.avanzar();
        expr = { tipo: 'Indice', objeto: expr, indice, pos: posicionDe(t) };
      } else {
        return expr;
      }
    }
  }

  private primario(): Expresion {
    const t = this.actual;
    const pos = posicionDe(t);
    switch (t.tipo) {
      case 'numero':
        this.avanzar();
        return { tipo: 'Numero', valor: t.numero!, pos };
      case 'texto':
        this.avanzar();
        return { tipo: 'Texto', valor: t.valor, pos };
      case 'identificador':
        this.avanzar();
        return { tipo: 'Identificador', nombre: t.valor, original: t.original, pos };
      case 'palabraClave':
        if (t.valor === 'verdadero' || t.valor === 'falso') {
          this.avanzar();
          return { tipo: 'Logico', valor: t.valor === 'verdadero', pos };
        }
        if (t.valor === 'nulo') {
          this.avanzar();
          return { tipo: 'Nulo', pos };
        }
        if (t.valor === 'mostrar') return this.mostrar();
        break;
      case 'simbolo':
        if (t.valor === '(') {
          this.avanzar();
          const e = this.expresion();
          if (!this.esSimbolo(')')) this.error("falta cerrar el paréntesis con ')'.");
          this.avanzar();
          return e;
        }
        if (t.valor === '[') return this.lista();
        if (t.valor === '{') return this.tabla();
        break;
    }

    // Nada encaja: error con la mejor pista posible
    if (t.tipo === 'palabraClave') {
      const significado = SIGNIFICADO_PALABRA[t.valor];
      this.error(
        `aquí esperaba un valor, pero '${t.original}' es una palabra reservada de Chispa${significado ? ` (${significado})` : ''}.`,
        `Si querías usar una variable, ponle otro nombre${t.valor === 'y' ? " (por ejemplo 'posY'). Para la coordenada de un objeto usa yo.y" : ''}.`,
      );
    }
    if (t.tipo === 'nuevaLinea' || t.tipo === 'fin') {
      this.error('la línea se ha acabado antes de tiempo: falta un valor al final.', 'Revisa si has dejado un operador (+, -, =, y, o...) sin nada detrás.');
    }
    this.error(
      `aquí esperaba un valor (un número, un texto, una variable...) pero he encontrado ${this.describir(t)}.`,
      t.valor === '=' ? "Parece que sobra un '='. Para comparar usa '==' y para guardar un valor, un solo '='." : undefined,
    );
  }

  /**
   * `mostrar` es una función normal, pero su nombre está reservado para poder
   * dar este error tan concreto cuando alguien se olvida de los paréntesis.
   */
  private mostrar(): Expresion {
    const t = this.avanzar();
    if (!this.esSimbolo('(')) {
      const linea = this.lineas[t.linea - 1] ?? '';
      const resto = linea
        .slice(t.columna - 1 + t.original.length)
        .replace(/\s+#.*$/, '')
        .trim();
      this.error(
        "'mostrar' es una función, y las funciones siempre llevan paréntesis.",
        `Escribe: mostrar(${resto || '"hola"'})`,
        t,
      );
    }
    return { tipo: 'Identificador', nombre: 'mostrar', original: t.original, pos: posicionDe(t) };
  }

  private lista(): Expresion {
    const inicio = this.avanzar();
    const elementos: Expresion[] = [];
    while (!this.esSimbolo(']')) {
      elementos.push(this.expresion());
      if (this.esSimbolo(',')) this.avanzar();
      else if (!this.esSimbolo(']')) this.error('los elementos de una lista se separan con comas.', 'Ejemplo: [1, 2, 3]');
    }
    this.avanzar();
    return { tipo: 'Lista', elementos, pos: posicionDe(inicio) };
  }

  /** Tabla: {nombre: "Ana", "vida": 3} — las claves pueden ser nombres o textos. */
  private tabla(): Expresion {
    const inicio = this.avanzar();
    const entradas: EntradaTabla[] = [];
    const vistas = new Set<string>();
    const ejemplo = 'Ejemplo: {nombre: "Ana", vida: 3}';
    while (!this.esSimbolo('}')) {
      const k = this.actual;
      if (k.tipo !== 'identificador' && k.tipo !== 'palabraClave' && k.tipo !== 'texto') {
        this.error(`la clave de una tabla tiene que ser un nombre o un texto, pero he encontrado ${this.describir(k)}.`, ejemplo);
      }
      this.avanzar();
      const clave = k.tipo === 'texto' ? k.valor : k.original;
      if (vistas.has(clave.toLowerCase())) this.error(`la clave '${clave}' está repetida en esta tabla.`, 'Cada clave solo puede aparecer una vez.', k);
      vistas.add(clave.toLowerCase());
      if (!this.esSimbolo(':')) this.error(`después de la clave '${clave}' van dos puntos ':' y su valor.`, ejemplo);
      this.avanzar();
      entradas.push({ clave, original: clave, valor: this.expresion(), pos: posicionDe(k) });
      if (this.esSimbolo(',')) this.avanzar();
      else if (!this.esSimbolo('}')) this.error('las entradas de una tabla se separan con comas.', ejemplo);
    }
    this.avanzar();
    return { tipo: 'Tabla', entradas, pos: posicionDe(inicio) };
  }
}
