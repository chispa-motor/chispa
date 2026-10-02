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
 *
 * ── Recuperación de errores ("modo pánico") ──
 * Cuando una línea tiene un error, lo apuntamos y SINCRONIZAMOS: saltamos
 * hasta el final de esa línea y, si abría un bloque, también el bloque
 * entero. Luego seguimos leyendo. Así salen TODOS los errores a la vez, y un
 * ':' olvidado no provoca diez errores falsos en las líneas de debajo.
 */
import type { Bloque, EntradaTabla, Evento, Expresion, Nombre, Programa, Sentencia } from './ast';
import { ErrorChispa, ErrorCompilacion } from '../errores/ErrorChispa';
import { EQUIVALENCIAS_INGLES, PALABRAS_DE_INICIO, sugerir } from '../errores/sugerencias';
import { normalizar } from '../../utilidades/texto';
import { analizarLexico } from '../lexico/lexer';
import { SIGNIFICADO_PALABRA, posicionDe, type Posicion, type Token } from '../lexico/tokens';
import { sinPrototipo } from '../../utilidades/seguro';

const OPERADORES_ASIGNACION = ['=', '+=', '-=', '*=', '/='];
const COMPARACIONES = ['==', '!=', '<', '>', '<=', '>='];

/** Como mucho, cuántos errores de escritura se enseñan a la vez. */
export const MAXIMO_ERRORES = 10;

export interface ResultadoSintaxis {
  programa: Programa;
  /** Errores de escritura (ordenados, como mucho uno por línea). Vacío si todo está bien. */
  errores: ErrorChispa[];
}

/**
 * Analiza el código y devuelve el árbol y TODOS los errores de escritura
 * encontrados. No lanza excepciones: lo usa el editor para subrayar.
 */
export function analizarSintaxis(codigo: string, archivo: string): ResultadoSintaxis {
  const lineas = codigo.replace(/\r\n?/g, '\n').split('\n');
  const errores: ErrorChispa[] = [];
  const tokens = analizarLexico(codigo, errores);
  const sentencias = new Parser(tokens, lineas, errores).programa();

  // Como mucho un error por línea (el primero suele ser el de verdad; los demás, consecuencias)
  const porLinea = new Map<number, ErrorChispa>();
  for (const e of errores) if (!porLinea.has(e.linea)) porLinea.set(e.linea, e);
  const limpios = [...porLinea.values()].sort((a, b) => a.linea - b.linea || a.posicion.columna - b.posicion.columna).slice(0, MAXIMO_ERRORES);
  for (const e of limpios) e.conArchivo(archivo, lineas);
  return { programa: { sentencias, archivo, lineas }, errores: limpios };
}

/** Compila código Chispa a un Programa (AST). Si hay errores, lanza un ErrorCompilacion con todos. */
export function compilar(codigo: string, archivo: string): Programa {
  const { programa, errores } = analizarSintaxis(codigo, archivo);
  if (errores.length) throw new ErrorCompilacion(errores);
  return programa;
}

class Parser {
  private pos = 0;
  /** ¿Cuántos bucles hay abiertos? (para saber si 'romper' y 'continuar' están bien usados) */
  private bucles = 0;
  /** ¿Estamos dentro de un bloque? (los 'cuando' tienen que ir en el nivel principal) */
  private profundidad = 0;
  /** ¿Dentro de cuántas funciones o eventos estamos? (para saber si 'devolver' está bien usado) */
  private funciones = 0;

  constructor(
    private tokens: Token[],
    private lineas: string[],
    private errores: ErrorChispa[],
  ) {}

  /** Lee UNA expresión sola (lo que va dentro de un hueco {…} de un texto). */
  expresionSola(): Expresion {
    const e = this.expresion();
    if (!this.es('nuevaLinea') && !this.es('fin')) {
      this.error(`dentro de las llaves { } solo puede ir un valor, pero sobra ${this.describir(this.actual)}.`, 'Ejemplos: "Puntos: {juego.puntos}"   ·   "Vida: {yo.vida}"');
    }
    return e;
  }

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
    while (!this.es('fin') && this.errores.length < MAXIMO_ERRORES * 2) this.sentenciaSegura(sentencias);
    return sentencias;
  }

  /** Lee una sentencia; si falla, apunta el error y se recupera. */
  private sentenciaSegura(destino: Bloque): void {
    const inicio = this.pos;
    try {
      destino.push(this.sentencia());
    } catch (e) {
      if (!(e instanceof ErrorChispa)) throw e;
      this.errores.push(e);
      this.sincronizar();
      if (this.pos === inicio) this.avanzar(); // pase lo que pase, avanzamos (nunca un bucle infinito)
    }
  }

  /** Salta hasta el final de la línea con el error y, si abría un bloque, el bloque entero. */
  private sincronizar(): void {
    while (!this.es('fin')) {
      if (this.es('desindentar')) return; // el error estaba al final de un bloque: lo cierra quien lo abrió
      if (this.es('indentar')) {
        this.saltarBloque();
        return;
      }
      if (this.es('nuevaLinea')) {
        this.avanzar();
        if (this.es('indentar')) this.saltarBloque();
        return;
      }
      this.avanzar();
    }
  }

  /** Estamos en un INDENTAR: saltamos hasta su DESINDENTAR correspondiente. */
  private saltarBloque(): void {
    let nivel = 0;
    do {
      if (this.es('indentar')) nivel++;
      else if (this.es('desindentar')) nivel--;
      this.avanzar();
    } while (nivel > 0 && !this.es('fin'));
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
      const t = this.actual;
      const palabra = t.tipo === 'identificador' ? t.valor : '';
      let pista = "En Chispa, las líneas que abren un bloque (si, mientras, repetir, para cada, funcion, cuando) terminan en dos puntos ':'.";
      if (palabra === 'entonces' || palabra === 'hacer' || palabra === 'haz') {
        pista = `En Chispa no se escribe '${t.original}': la línea termina directamente en ':'. Ejemplo: si vida == 0:`;
      } else if (palabra === 'es' || palabra === 'igual' || palabra === 'vale') {
        pista = 'Para comparar se usa == (dos iguales). Ejemplo: si puntos == 10:';
      } else if (EQUIVALENCIAS_INGLES[normalizar(palabra)]) {
        pista = `'${t.original}' no es de Chispa: aquí se escribe '${EQUIVALENCIAS_INGLES[normalizar(palabra)]}'. Ejemplo: si vida > 0 y puntos > 10:`;
      } else if (que.startsWith('cuando') && t.tipo !== 'nuevaLinea') {
        pista = "Después del evento va ':' directamente, sin más palabras. Ejemplos: cuando empieza:   ·   cuando toco Moneda:";
      }
      this.error(`esperaba ':' al final de la línea (${que}), pero he encontrado ${this.describir(t)}.`, pista);
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
        "Las líneas que van DENTRO de un bloque tienen que empezar con 4 espacios más que la línea con ':'. (Si usas bloques: arrastra algún bloque dentro de este.)",
      );
    }
    this.avanzar();
    this.profundidad++;
    const sentencias: Bloque = [];
    try {
      while (!this.es('desindentar') && !this.es('fin')) this.sentenciaSegura(sentencias);
    } finally {
      this.profundidad--;
    }
    this.avanzar(); // desindentar
    return sentencias;
  }

  private finDeLinea(): void {
    if (this.es('nuevaLinea')) {
      this.avanzar();
      return;
    }
    if (this.es('fin')) return;
    // 3,5 → en Chispa los decimales van con punto
    const anterior = this.tokens[this.pos - 1];
    const siguiente = this.tokens[this.pos + 1];
    if (this.esSimbolo(',') && anterior?.tipo === 'numero' && siguiente?.tipo === 'numero' && siguiente.columna === this.actual.columna + 1) {
      this.error(
        'en Chispa los números con decimales se escriben con punto, no con coma.',
        `Escribe ${anterior.original}.${siguiente.original} en lugar de ${anterior.original},${siguiente.original}`,
      );
    }
    const extranjera = this.actual.tipo === 'identificador' ? EQUIVALENCIAS_INGLES[normalizar(this.actual.valor)] : undefined;
    this.error(
      `sobra algo al final de la línea: ${this.describir(this.actual)}.`,
      extranjera
        ? `'${this.actual.original}' no es de Chispa: aquí se escribe '${extranjera}'.`
        : 'Cada orden va en su propia línea. Revisa si te falta un operador (+, -, ==...) o una coma.',
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
          if (this.funciones === 0) {
            this.error(
              "'devolver' solo se puede usar dentro de una función (o de un 'cuando', para terminarlo antes).",
              'Si querías guardar un valor, usa una variable: variable resultado = ...',
            );
          }
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

    // ¿Una palabra clave mal escrita? ("mientas vida > 0:", "fucnion saltar():", "sin:")
    if (t.tipo === 'identificador') this.comprobarPalabraMalEscrita(t);

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

  /**
   * Una línea que empieza con un nombre seguido de otra cosa que no sea
   * =, (, . o [ no tiene sentido... salvo que el nombre sea una palabra clave
   * mal escrita: "mientas vida > 0:", "varible x = 3", "sin:", "elif x:".
   */
  private comprobarPalabraMalEscrita(t: Token): void {
    const sig = this.tokens[this.pos + 1];
    const sospechoso =
      sig.tipo === 'identificador' ||
      sig.tipo === 'numero' ||
      sig.tipo === 'texto' ||
      (sig.tipo === 'palabraClave' && !['y', 'o', 'en'].includes(sig.valor)) ||
      (sig.tipo === 'simbolo' && sig.valor === ':');
    if (!sospechoso) return;

    const ingles = EQUIVALENCIAS_INGLES[t.valor];
    if (ingles) {
      this.error(`has escrito '${t.original}', que es una palabra de otro lenguaje de programación.`, `En Chispa se escribe: ${ingles}`, t);
    }
    // "sin:" → lo más probable es 'sino' (lo único que va solo antes de ':')
    const candidatos = sig.valor === ':' ? ['sino', ...PALABRAS_DE_INICIO] : PALABRAS_DE_INICIO;
    const parecida = sugerir(t.original, candidatos);
    if (parecida) {
      this.error(`has escrito '${t.original}', que no es ninguna palabra de Chispa.`, `¿Querías decir '${parecida}'?`, t);
    }
    this.error(
      `no entiendo qué quieres hacer con '${t.original}' al principio de la línea.`,
      'Una línea puede empezar con una palabra de Chispa (si, mientras, variable...), con una variable a la que das valor (vida = 5) o con una llamada a una función (saltar()).',
      t,
    );
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
    if (this.esSimbolo('==')) {
      this.error("para crear una variable se usa un solo '='. El '==' sirve para comparar.", `Escribe: variable ${n.original} = ...`);
    }
    if (!this.esSimbolo('=')) {
      this.error(`falta el '=' y el valor inicial de la variable '${n.original}'.`, `Ejemplo: variable ${n.original} = 0`);
    }
    this.avanzar();
    const valor = this.expresion();
    this.finDeLinea();
    return { tipo: 'Variable', nombre: n.nombre, original: n.original, valor, pos: posicionDe(inicio), posNombre: n.pos };
  }

  private sentenciaSi(): Sentencia {
    const inicio = this.avanzar();
    if (this.esClave('no') && this.tokens[this.pos + 1]?.valor === ':') {
      this.error("'si no' se escribe todo junto: sino", "Ejemplo:\n    si vida > 0:\n        mostrar(\"Vivo\")\n    sino:\n        mostrar(\"Fin\")");
    }
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
    try {
      return this.bloque(que);
    } finally {
      this.bucles--;
    }
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
    this.funciones++;
    let cuerpo: Bloque;
    try {
      cuerpo = this.bloque(`funcion ${n.original}(...)`);
    } finally {
      this.bucles = buclesFuera;
      this.funciones--;
    }
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
    this.funciones++; // dentro de un 'cuando' se puede usar 'devolver' para terminar antes
    try {
      return { tipo: 'Cuando', evento, cuerpo: this.bloque('cuando ...'), pos: posicionDe(inicio) };
    } finally {
      this.funciones--;
    }
  }

  /** Reconoce el evento que va después de "cuando". */
  private evento(): Evento {
    const t = this.actual;
    const ayuda =
      'Los eventos que existen son:\n' +
      '    cuando empieza:\n    cuando cada fotograma:\n    cuando cada 2 segundos:\n    cuando pasen 3 segundos:\n' +
      '    cuando se pulsa "espacio":   (también "se mantiene" y "se suelta")\n' +
      '    cuando toco Enemigo:\n    cuando dejo de tocar Enemigo:\n    cuando hago clic:\n    cuando hago clic encima:\n    cuando cambia:   (un deslizador, una casilla, una lista...)\n    cuando termina la animacion:\n    cuando salgo de la pantalla:\n    cuando recibo "mensaje":';

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
    if (this.esPalabra('pasen') || this.esPalabra('pase')) {
      this.avanzar();
      const segundos = this.suma();
      if (!this.esPalabra('segundos') && !this.esPalabra('segundo')) {
        this.error("después de 'cuando pasen' va un número y la palabra 'segundos'.", 'Ejemplo: cuando pasen 3 segundos:');
      }
      this.avanzar();
      return { tipo: 'pasen', segundos };
    }
    if (this.esPalabra('se')) {
      this.avanzar();
      const modos: Record<string, 'pulsa' | 'mantiene' | 'suelta'> = sinPrototipo({ pulsa: 'pulsa', mantiene: 'mantiene', suelta: 'suelta' });
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
      if (!this.esPalabra('clic') && !this.esPalabra('click')) this.error("esperaba 'cuando hago clic:' o 'cuando hago clic encima:'.");
      this.avanzar();
      if (this.esPalabra('encima')) {
        this.avanzar();
        return { tipo: 'clic', encima: true };
      }
      return { tipo: 'clic', encima: false };
    }
    if (this.esPalabra('cambia') || this.esPalabra('cambio')) {
      this.avanzar();
      return { tipo: 'cambia' };
    }
    if (this.esPalabra('termina')) {
      this.avanzar();
      if (this.esPalabra('la')) this.avanzar();
      if (!this.esPalabra('animacion')) this.error("esperaba 'cuando termina la animacion:'.");
      this.avanzar();
      return { tipo: 'animacion' };
    }
    if (this.esPalabra('salgo') || this.esPalabra('sale')) {
      this.avanzar();
      if (this.esPalabra('de')) this.avanzar();
      if (this.esPalabra('la')) this.avanzar();
      if (!this.esPalabra('pantalla')) this.error("esperaba 'cuando salgo de la pantalla:'.");
      this.avanzar();
      return { tipo: 'pantalla' };
    }
    if (this.esPalabra('recibo')) {
      this.avanzar();
      // Con comillas o sin ellas: cuando recibo "abrir_puerta":  ·  cuando recibo abrir_puerta:
      const m = this.actual;
      if (m.tipo !== 'texto' && m.tipo !== 'identificador') {
        this.error('después de "recibo" va el nombre del mensaje.', 'Ejemplo: cuando recibo "abrir_puerta":   (y en otro script: enviar("abrir_puerta"))');
      }
      this.avanzar();
      const original = m.tipo === 'texto' ? m.valor : m.original;
      if (!original.trim()) this.error('el nombre del mensaje está vacío.', 'Ejemplo: cuando recibo "abrir_puerta":');
      return { tipo: 'recibo', mensaje: normalizar(original), original };
    }
    let dejar = false;
    if (this.esPalabra('dejo')) {
      this.avanzar();
      if (!this.esPalabra('de')) this.error("esperaba 'cuando dejo de tocar ...'.");
      this.avanzar();
      if (!this.esPalabra('tocar')) this.error("esperaba 'cuando dejo de tocar ...'.");
      dejar = true;
    } else if (!this.esPalabra('toco')) {
      // Formas naturales de decirlo que no son las de Chispa: explicamos cuál es
      const SINONIMOS: Record<string, string> = sinPrototipo({
        pulso: 'cuando se pulsa "espacio":', pulse: 'cuando se pulsa "espacio":', presiono: 'cuando se pulsa "espacio":', presione: 'cuando se pulsa "espacio":',
        aprieto: 'cuando se pulsa "espacio":', apriete: 'cuando se pulsa "espacio":', pulsa: 'cuando se pulsa "espacio":', presiona: 'cuando se pulsa "espacio":',
        suelto: 'cuando se suelta "espacio":', mantengo: 'cuando se mantiene "espacio":',
        choco: 'cuando toco Enemigo:', choque: 'cuando toco Enemigo:', toque: 'cuando toco Enemigo:', toca: 'cuando toco Enemigo:',
        tocar: 'cuando toco Enemigo:', colisiono: 'cuando toco Enemigo:', golpeo: 'cuando toco Enemigo:',
        clic: 'cuando hago clic:', click: 'cuando hago clic:', pincho: 'cuando hago clic:',
        empiece: 'cuando empieza:', inicia: 'cuando empieza:', comienza: 'cuando empieza:', arranca: 'cuando empieza:',
        salga: 'cuando salgo de la pantalla:', acaba: 'cuando termina la animacion:',
        recibe: 'cuando recibo "mensaje":', reciba: 'cuando recibo "mensaje":', llega: 'cuando recibo "mensaje":', escucho: 'cuando recibo "mensaje":', oigo: 'cuando recibo "mensaje":',
      });
      const forma = SINONIMOS[normalizar(t.original)];
      const parecido = sugerir(t.original, ['empieza', 'toco', 'hago', 'dejo', 'se', 'cada', 'pasen', 'termina', 'salgo', 'recibo', 'cambia']);
      this.error(
        `no conozco el evento 'cuando ${t.original}'.`,
        forma ? `En Chispa se escribe así: ${forma}\n${ayuda}` : parecido ? `¿Querías decir 'cuando ${parecido} ...'?\n${ayuda}` : ayuda,
      );
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
        return textoConHuecos(t, this.lineas);
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
    const anterior = this.tokens[this.pos - 1];
    const doble = (t.valor === '+' || t.valor === '-') && anterior?.valor === t.valor;
    this.error(
      `aquí esperaba un valor (un número, un texto, una variable...) pero he encontrado ${this.describir(t)}.`,
      t.valor === '='
        ? "Parece que sobra un '='. Para comparar usa '==' y para guardar un valor, un solo '='."
        : doble
          ? `En Chispa, para sumar o restar 1 se escribe: puntos ${t.valor}= 1`
          : undefined,
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

// ═════════════════════════ Textos con huecos ═════════════════════════

/**
 * "Puntos: {juego.puntos}" → partes: ["Puntos: ", <juego.puntos>].
 *
 * Los huecos se buscan en el texto TAL COMO SE ESCRIBIÓ (con sus \n y sus
 * comillas), para que los errores apunten a la columna exacta.
 * Para escribir una llave de verdad se ponen dos: "{{" y "}}".
 */
export function textoConHuecos(t: Token, lineas: string[] = []): Expresion {
  const pos = posicionDe(t);
  const original = t.original;
  if (!original.includes('{') && !original.includes('}')) return { tipo: 'Texto', valor: t.valor, pos };
  const partes: (string | Expresion)[] = [];
  let literal = '';
  // Quitamos la comilla de apertura y la de cierre
  const cuerpo = original.slice(1, original.length - 1);
  const errorEn = (i: number, largo: number, mensaje: string, pista?: string): never => {
    throw new ErrorChispa({ linea: t.linea, columna: t.columna + 1 + i, longitud: Math.max(1, largo) }, mensaje, pista);
  };
  for (let i = 0; i < cuerpo.length; i++) {
    const c = cuerpo[i];
    if (c === '\\' && i + 1 < cuerpo.length) {
      const sig = cuerpo[++i];
      literal += sig === 'n' ? '\n' : sig === 't' ? '\t' : sig;
      continue;
    }
    if (c === '{' && cuerpo[i + 1] === '{') {
      literal += '{';
      i++;
      continue;
    }
    if (c === '}' && cuerpo[i + 1] === '}') {
      literal += '}';
      i++;
      continue;
    }
    if (c === '}') errorEn(i, 1, "hay una llave '}' que cierra un hueco que nunca se abrió.", 'Los huecos se escriben así: "Puntos: {juego.puntos}". Para escribir una llave de verdad, pon dos: }}');
    if (c !== '{') {
      literal += c;
      continue;
    }
    const cierre = cuerpo.indexOf('}', i + 1);
    if (cierre < 0) errorEn(i, cuerpo.length - i, "hay un hueco '{' que no se cierra con '}'.", 'Los huecos se escriben así: "Puntos: {juego.puntos}". Para escribir una llave de verdad, pon dos: {{');
    const dentro = cuerpo.slice(i + 1, cierre);
    if (!dentro.trim()) errorEn(i, cierre - i + 1, 'hay un hueco { } vacío.', 'Dentro de las llaves va lo que quieres enseñar: "Puntos: {juego.puntos}"');
    if (literal) partes.push(literal);
    literal = '';
    partes.push(expresionDeHueco(dentro, t, i + 1, lineas));
    i = cierre;
  }
  if (literal) partes.push(literal);
  return { tipo: 'Texto', valor: t.valor, pos, partes };
}

/** Analiza lo que hay dentro de un hueco, con las posiciones corregidas para que apunten al sitio de verdad. */
function expresionDeHueco(fuente: string, t: Token, desplazamiento: number, lineas: string[]): Expresion {
  const espacios = fuente.length - fuente.trimStart().length;
  const limpio = fuente.trim();
  const columnaBase = t.columna + 1 + desplazamiento + espacios; // columna del primer carácter del hueco
  const errores: ErrorChispa[] = [];
  const tokens = analizarLexico(limpio, errores).filter((k) => k.tipo !== 'indentar' && k.tipo !== 'desindentar');
  const mover = (p: Posicion): Posicion => ({ linea: t.linea, columna: columnaBase + p.columna - 1, longitud: p.longitud });
  if (errores.length) throw new ErrorChispa(mover(errores[0].posicion), errores[0].mensajeCorto, errores[0].pista);
  for (const k of tokens) {
    k.columna = columnaBase + k.columna - 1;
    k.linea = t.linea;
  }
  try {
    return new Parser(tokens, lineas, []).expresionSola();
  } catch (e) {
    if (e instanceof ErrorChispa) throw new ErrorChispa({ ...e.posicion, linea: t.linea }, e.mensajeCorto, e.pista);
    throw e;
  }
}
