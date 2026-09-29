/**
 * PARSER (analizador sintáctico): lista de tokens → árbol (AST).
 *
 * Usamos la técnica "descenso recursivo": una función por cada regla del
 * lenguaje, que se llaman unas a otras. Es la forma más fácil de escribir
 * un parser a mano y la que da mejores mensajes de error.
 *
 * ── Precedencia de operadores (de menos a más fuerte) ──
 *     o  →  y  →  no  →  == != < > <= >=  →  + -  →  * / %  →  -x  →  llamadas . []
 * Por eso "2 + 3 * 4" es 14: la multiplicación está "más abajo" y se agrupa antes.
 */
import type { Bloque, Evento, Expresion, Programa, Sentencia } from './ast';
import { ErrorChispa } from './errores';
import { analizarLexico } from './lexer';
import { SIGNIFICADO_PALABRA, type Token } from './tokens';

const OPERADORES_ASIGNACION = ['=', '+=', '-=', '*=', '/='];
const COMPARACIONES = ['==', '!=', '<', '>', '<=', '>='];

/** Compila código Chispa a un Programa (AST). Lanza ErrorChispa si hay errores. */
export function compilar(codigo: string, archivo: string): Programa {
  const lineas = codigo.replace(/\r\n?/g, '\n').split('\n');
  try {
    const tokens = analizarLexico(codigo);
    const sentencias = new Parser(tokens).programa();
    return { sentencias, archivo, lineas };
  } catch (e) {
    if (e instanceof ErrorChispa) e.conArchivo(archivo, lineas);
    throw e;
  }
}

class Parser {
  private pos = 0;
  /** ¿Cuántos bucles hay abiertos? (para saber si 'salir' está bien usado) */
  private bucles = 0;
  /** ¿Estamos dentro de un bloque? (para exigir que 'cuando' vaya al nivel principal) */
  private profundidad = 0;

  constructor(private tokens: Token[]) {}

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
  private esSimbolo(v: string) {
    return this.es('simbolo', v);
  }
  private esClave(v: string) {
    return this.es('palabraClave', v);
  }
  /** Palabras contextuales ("cada", "veces", "empieza"...) son identificadores normales. */
  private esPalabra(v: string, t = this.actual) {
    return this.es('identificador', v, t);
  }
  private error(mensaje: string, pista?: string, t = this.actual): never {
    throw new ErrorChispa(t.linea, mensaje, pista);
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
        "Un solo '=' sirve para GUARDAR un valor. Ejemplo: si vida == 0:",
      );
    }
    if (!this.esSimbolo(':')) {
      this.error(
        `falta ':' al final de la línea (${que}). En su lugar he encontrado ${this.describir(this.actual)}.`,
        `Las líneas que abren un bloque terminan con dos puntos. Ejemplo:\n    ${que}:`,
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
        case 'devolver': {
          this.avanzar();
          const valor = this.es('nuevaLinea') || this.es('fin') ? null : this.expresion();
          this.finDeLinea();
          return { tipo: 'Devolver', valor, linea: t.linea };
        }
        case 'salir':
          this.avanzar();
          if (this.bucles === 0)
            this.error("'salir' solo se puede usar dentro de un bucle (mientras, repetir o para cada).", undefined, t);
          this.finDeLinea();
          return { tipo: 'Salir', linea: t.linea };
        case 'mostrar': {
          this.avanzar();
          const valores = [this.expresion()];
          while (this.esSimbolo(',')) {
            this.avanzar();
            valores.push(this.expresion());
          }
          this.finDeLinea();
          return { tipo: 'Mostrar', valores, linea: t.linea };
        }
        case 'cuando':
          return this.sentenciaCuando();
      }
    }

    // Si no empieza por palabra clave: es una asignación (x = 5) o una llamada (yo.saltar())
    const expr = this.expresion();
    if (this.es('simbolo') && OPERADORES_ASIGNACION.includes(this.actual.valor)) {
      const operador = this.avanzar().valor;
      if (expr.tipo !== 'Identificador' && expr.tipo !== 'Miembro' && expr.tipo !== 'Indice') {
        this.error(
          'lo que hay a la izquierda del = no es algo donde se pueda guardar un valor.',
          'A la izquierda del = tiene que ir una variable (puntos = 5) o una propiedad (yo.vida = 5).',
          t,
        );
      }
      const valor = this.expresion();
      this.finDeLinea();
      return { tipo: 'Asignacion', objetivo: expr, operador, valor, linea: t.linea };
    }
    this.finDeLinea();
    return { tipo: 'ExpresionSuelta', expresion: expr, linea: t.linea };
  }

  private nombreNuevo(para: string): Token {
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
    return this.avanzar();
  }

  private sentenciaVariable(): Sentencia {
    const inicio = this.avanzar();
    const nombre = this.nombreNuevo('variable');
    if (!this.esSimbolo('=')) {
      this.error(
        `falta el '=' y el valor inicial de la variable '${nombre.original}'.`,
        `Ejemplo: variable ${nombre.original} = 0`,
      );
    }
    this.avanzar();
    const valor = this.expresion();
    this.finDeLinea();
    return { tipo: 'Variable', nombre: nombre.valor, original: nombre.original, valor, linea: inicio.linea };
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
    return { tipo: 'Si', ramas, sino, linea: inicio.linea };
  }

  private sentenciaMientras(): Sentencia {
    const inicio = this.avanzar();
    const condicion = this.expresion();
    this.bucles++;
    const cuerpo = this.bloque('mientras ...');
    this.bucles--;
    return { tipo: 'Mientras', condicion, cuerpo, linea: inicio.linea };
  }

  private sentenciaRepetir(): Sentencia {
    const inicio = this.avanzar();
    if (this.esSimbolo(':')) {
      this.error('falta decir cuántas veces hay que repetir.', 'Ejemplo: repetir 3 veces:');
    }
    const veces = this.expresion();
    if (this.esPalabra('veces') || this.esPalabra('vez')) this.avanzar();
    this.bucles++;
    const cuerpo = this.bloque('repetir N veces');
    this.bucles--;
    return { tipo: 'Repetir', veces, cuerpo, linea: inicio.linea };
  }

  private sentenciaParaCada(): Sentencia {
    const inicio = this.avanzar();
    if (!this.esPalabra('cada')) this.error("después de 'para' tiene que ir 'cada'.", 'Ejemplo: para cada enemigo en enemigos:');
    this.avanzar();
    const nombre = this.nombreNuevo('variable');
    if (!this.esClave('en')) {
      this.error(`falta la palabra 'en' después de '${nombre.original}'.`, `Ejemplo: para cada ${nombre.original} en lista:`);
    }
    this.avanzar();
    const lista = this.expresion();
    this.bucles++;
    const cuerpo = this.bloque(`para cada ${nombre.original} en ...`);
    this.bucles--;
    return { tipo: 'ParaCada', variable: nombre.valor, original: nombre.original, lista, cuerpo, linea: inicio.linea };
  }

  private sentenciaFuncion(): Sentencia {
    const inicio = this.avanzar();
    const nombre = this.nombreNuevo('función');
    const parametros: { nombre: string; original: string }[] = [];
    if (this.esSimbolo('(')) {
      this.avanzar();
      while (!this.esSimbolo(')')) {
        const p = this.nombreNuevo('parámetro');
        parametros.push({ nombre: p.valor, original: p.original });
        if (this.esSimbolo(',')) this.avanzar();
        else if (!this.esSimbolo(')'))
          this.error('los parámetros de una función se separan con comas.', `Ejemplo: funcion ${nombre.original}(a, b):`);
      }
      this.avanzar();
    }
    // Los bucles de fuera no cuentan dentro de la función
    const buclesFuera = this.bucles;
    this.bucles = 0;
    const cuerpo = this.bloque(`funcion ${nombre.original}(...)`);
    this.bucles = buclesFuera;
    return { tipo: 'Funcion', nombre: nombre.valor, original: nombre.original, parametros, cuerpo, linea: inicio.linea };
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
    const cuerpo = this.bloque('cuando ...');
    return { tipo: 'Cuando', evento, cuerpo, linea: inicio.linea };
  }

  /** Reconoce el evento que va después de "cuando". */
  private evento(): Evento {
    const t = this.actual;
    if (this.esPalabra('empieza') || this.esPalabra('empiece') || this.esPalabra('comienza')) {
      this.avanzar();
      return { tipo: 'empieza' };
    }
    if (this.esPalabra('cada')) {
      this.avanzar();
      if (this.esPalabra('fotograma')) {
        this.avanzar();
        return { tipo: 'fotograma' };
      }
      const segundos = this.expresion();
      if (this.esPalabra('segundos') || this.esPalabra('segundo')) {
        this.avanzar();
        return { tipo: 'intervalo', segundos };
      }
      this.error(
        "después de 'cuando cada' esperaba 'fotograma' o 'N segundos'.",
        'Ejemplos:\n    cuando cada fotograma:\n    cuando cada 2 segundos:',
      );
    }
    if (this.esPalabra('se')) {
      this.avanzar();
      const modos: Record<string, 'pulsa' | 'mantiene' | 'suelta'> = { pulsa: 'pulsa', mantiene: 'mantiene', suelta: 'suelta' };
      const modo = modos[this.actual.valor];
      if (this.actual.tipo !== 'identificador' || !modo) {
        this.error("después de 'cuando se' esperaba 'pulsa', 'mantiene' o 'suelta'.", 'Ejemplo: cuando se pulsa "espacio":');
      }
      this.avanzar();
      // Usamos suma() y no expresion() para que la 'o' de "espacio" o "arriba" no se lea como 'o' lógico.
      const teclas = [this.suma()];
      while (this.esSimbolo(',') || this.esClave('o')) {
        this.avanzar();
        teclas.push(this.suma());
      }
      return { tipo: 'tecla', modo, teclas };
    }
    let dejar = false;
    if (this.esPalabra('dejo')) {
      this.avanzar();
      if (!this.esPalabra('de')) this.error("esperaba 'cuando dejo de tocar ...'.");
      this.avanzar();
      if (!this.esPalabra('tocar')) this.error("esperaba 'cuando dejo de tocar ...'.");
      dejar = true;
    } else if (!this.esPalabra('toco')) {
      if (this.esPalabra('hago')) {
        this.avanzar();
        if (!this.esPalabra('clic') && !this.esPalabra('click')) this.error("esperaba 'cuando hago clic:'.");
        this.avanzar();
        return { tipo: 'clic' };
      }
      this.error(
        `no conozco el evento 'cuando ${t.original}'.`,
        'Los eventos que existen son:\n' +
          '    cuando empieza:\n    cuando cada fotograma:\n    cuando cada 2 segundos:\n' +
          '    cuando se pulsa "espacio":   (también "se mantiene" y "se suelta")\n' +
          '    cuando toco Enemigo:\n    cuando dejo de tocar Enemigo:\n    cuando hago clic:',
      );
    }
    this.avanzar(); // "toco" o "tocar"
    // "cuando toco:" sin nombre = cualquier objeto
    if (this.esSimbolo(':')) return { tipo: 'toco', con: null, original: null, dejar };
    const n = this.actual;
    if (n.tipo !== 'identificador' && n.tipo !== 'texto') {
      this.error('después de "toco" va el nombre o el tipo del objeto.', 'Ejemplo: cuando toco Moneda:');
    }
    this.avanzar();
    return {
      tipo: 'toco',
      con: n.tipo === 'texto' ? n.valor.toLowerCase() : n.valor,
      original: n.tipo === 'texto' ? n.valor : n.original,
      dejar,
    };
  }

  // ───────────────────────── Expresiones ─────────────────────────

  private expresion(): Expresion {
    return this.o();
  }

  private o(): Expresion {
    let izq = this.y();
    while (this.esClave('o')) {
      const t = this.avanzar();
      izq = { tipo: 'Logica', operador: 'o', izquierda: izq, derecha: this.y(), linea: t.linea };
    }
    return izq;
  }

  private y(): Expresion {
    let izq = this.no();
    while (this.esClave('y')) {
      const t = this.avanzar();
      izq = { tipo: 'Logica', operador: 'y', izquierda: izq, derecha: this.no(), linea: t.linea };
    }
    return izq;
  }

  private no(): Expresion {
    if (this.esClave('no')) {
      const t = this.avanzar();
      return { tipo: 'Unaria', operador: 'no', operando: this.no(), linea: t.linea };
    }
    return this.comparacion();
  }

  private comparacion(): Expresion {
    let izq = this.suma();
    while (this.es('simbolo') && COMPARACIONES.includes(this.actual.valor)) {
      const t = this.avanzar();
      izq = { tipo: 'Binaria', operador: t.valor, izquierda: izq, derecha: this.suma(), linea: t.linea };
    }
    return izq;
  }

  private suma(): Expresion {
    let izq = this.multiplicacion();
    while (this.esSimbolo('+') || this.esSimbolo('-')) {
      const t = this.avanzar();
      izq = { tipo: 'Binaria', operador: t.valor, izquierda: izq, derecha: this.multiplicacion(), linea: t.linea };
    }
    return izq;
  }

  private multiplicacion(): Expresion {
    let izq = this.unaria();
    while (this.esSimbolo('*') || this.esSimbolo('/') || this.esSimbolo('%')) {
      const t = this.avanzar();
      izq = { tipo: 'Binaria', operador: t.valor, izquierda: izq, derecha: this.unaria(), linea: t.linea };
    }
    return izq;
  }

  private unaria(): Expresion {
    if (this.esSimbolo('-')) {
      const t = this.avanzar();
      return { tipo: 'Unaria', operador: '-', operando: this.unaria(), linea: t.linea };
    }
    return this.postfijo();
  }

  /** Llamadas f(x), propiedades a.b e índices a[1], que se pueden encadenar: a.b(1)[2] */
  private postfijo(): Expresion {
    let expr = this.primario();
    for (;;) {
      if (this.esSimbolo('(')) {
        const t = this.avanzar();
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
        expr = { tipo: 'Llamada', funcion: expr, argumentos, linea: t.linea };
      } else if (this.esSimbolo('.')) {
        const t = this.avanzar();
        const p = this.actual;
        // Después de un punto se permiten también palabras reservadas: posicion.y, yo.no...
        if (p.tipo !== 'identificador' && p.tipo !== 'palabraClave') {
          this.error('después de un punto tiene que ir el nombre de una propiedad.', 'Ejemplo: yo.vida');
        }
        this.avanzar();
        expr = { tipo: 'Miembro', objeto: expr, propiedad: p.valor, original: p.original, linea: t.linea };
      } else if (this.esSimbolo('[')) {
        const t = this.avanzar();
        const indice = this.expresion();
        if (!this.esSimbolo(']')) this.error("falta cerrar el corchete con ']'.");
        this.avanzar();
        expr = { tipo: 'Indice', objeto: expr, indice, linea: t.linea };
      } else {
        return expr;
      }
    }
  }

  private primario(): Expresion {
    const t = this.actual;
    switch (t.tipo) {
      case 'numero':
        this.avanzar();
        return { tipo: 'Numero', valor: t.numero!, linea: t.linea };
      case 'texto':
        this.avanzar();
        return { tipo: 'Texto', valor: t.valor, linea: t.linea };
      case 'identificador':
        this.avanzar();
        return { tipo: 'Identificador', nombre: t.valor, original: t.original, linea: t.linea };
      case 'palabraClave':
        if (t.valor === 'verdadero' || t.valor === 'falso') {
          this.avanzar();
          return { tipo: 'Logico', valor: t.valor === 'verdadero', linea: t.linea };
        }
        if (t.valor === 'nulo') {
          this.avanzar();
          return { tipo: 'Nulo', linea: t.linea };
        }
        break;
      case 'simbolo':
        if (t.valor === '(') {
          this.avanzar();
          const e = this.expresion();
          if (!this.esSimbolo(')')) this.error("falta cerrar el paréntesis con ')'.");
          this.avanzar();
          return e;
        }
        if (t.valor === '[') {
          this.avanzar();
          const elementos: Expresion[] = [];
          while (!this.esSimbolo(']')) {
            elementos.push(this.expresion());
            if (this.esSimbolo(',')) this.avanzar();
            else if (!this.esSimbolo(']')) this.error('los elementos de una lista se separan con comas.', 'Ejemplo: [1, 2, 3]');
          }
          this.avanzar();
          return { tipo: 'Lista', elementos, linea: t.linea };
        }
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
      this.error(
        'la línea se ha acabado antes de tiempo: falta un valor al final.',
        'Revisa si has dejado un operador (+, -, =, y, o...) sin nada detrás.',
      );
    }
    this.error(
      `aquí esperaba un valor (un número, un texto, una variable...) pero he encontrado ${this.describir(t)}.`,
      t.valor === '=' ? "Parece que sobra un '='. Para comparar usa '==' y para guardar un valor, un solo '='." : undefined,
    );
  }
}
