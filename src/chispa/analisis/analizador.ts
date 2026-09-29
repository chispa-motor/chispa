/**
 * ════════════════════════════════════════════════════════════════════
 *  ANÁLISIS — Revisar el programa ANTES de ejecutarlo
 * ════════════════════════════════════════════════════════════════════
 *
 * Entre la sintaxis (el árbol) y la ejecución hay un paso extra: recorremos
 * el árbol SIN ejecutarlo, llevando la cuenta de qué nombres existen en cada
 * sitio (los "ámbitos"), y buscamos problemas que seguro darían error:
 *
 *   ERRORES (impiden pulsar Ejecutar):
 *     - usar una variable que no existe          (mostrar(puntoss))
 *     - 'otro' fuera de un "cuando toco"
 *     - un miembro de la API que no existe       (teclado.pulsado, yo.velocidda)
 *     - teclas, plantillas o colores que no existen ("espaico", crear("Bal"))
 *
 *   AVISOS (en amarillo; el programa se puede ejecutar igual):
 *     - variables que se crean y no se usan nunca
 *     - código después de un devolver/romper/continuar (nunca se ejecuta)
 *
 * Así el editor puede subrayar en rojo MIENTRAS escribes, y no hace falta
 * esperar a que el juego llegue a esa línea para descubrir el fallo.
 *
 * ── Cómo se sabe qué nombres existen ──
 * Igual que al ejecutar: cada bloque tiene su ámbito. Hay un detalle: el
 * cuerpo de las funciones y de los "cuando" se revisa AL FINAL del bloque
 * donde están, porque se ejecutan DESPUÉS y pueden usar variables que se
 * crean más abajo.
 */
import type { Bloque, Expresion, Programa, Sentencia } from '../sintaxis/ast';
import type { Posicion } from '../lexico/tokens';
import type { Diagnostico } from '../errores/ErrorChispa';
import { enumerar, pistaNombreDesconocido, sugerir } from '../errores/sugerencias';
import type { Entorno } from '../ejecucion/entorno';
import { Anfitrion } from '../ejecucion/valores';
import { esMiembroDelMotor, propiedadMalEscrita } from '../api/objetos';
import { comprobarNombreTecla, NOMBRES_TECLAS } from '../../motor/Entrada';
import { ErrorMotor } from '../../motor/Errores';
import { NOMBRES_COLORES, esColorValido } from '../../motor/Color';
import { normalizar } from '../../utilidades/texto';
import { TIPOS_PARTICULAS } from '../../objetos/Particulas';

/** Lo que el análisis necesita saber del proyecto. Todo es opcional salvo las globales. */
export interface ContextoAnalisis {
  /** Las variables globales del intérprete (API): mostrar, teclado, crear... */
  globales: Entorno;
  /** ¿Es el script de un objeto? (entonces existe 'yo') */
  esScript?: boolean;
  /** Nombres de recursos del proyecto, para comprobar textos como crear("Bala"). */
  plantillas?: string[];
  escenas?: string[];
  imagenes?: string[];
  sonidos?: string[];
  animaciones?: string[];
  objetosEscena?: string[];
}

interface Simbolo {
  original: string;
  pos: Posicion;
  tipo: 'variable' | 'funcion' | 'parametro' | 'bucle' | 'especial';
  usado: boolean;
}

class Ambito {
  readonly simbolos = new Map<string, Simbolo>();
  constructor(readonly padre: Ambito | null) {}

  buscar(nombre: string): Simbolo | undefined {
    for (let a: Ambito | null = this; a; a = a.padre) {
      const s = a.simbolos.get(nombre);
      if (s) return s;
    }
    return undefined;
  }

  /** Nombres creados por quien programa (para enumerarlos en los errores). */
  nombresDeUsuario(): string[] {
    const n: string[] = [];
    for (let a: Ambito | null = this; a; a = a.padre) for (const s of a.simbolos.values()) if (s.tipo !== 'especial') n.push(s.original);
    return n;
  }
}

/**
 * Llamadas cuyo primer valor es el NOMBRE de un recurso del proyecto.
 * Si el nombre está escrito tal cual (entre comillas), se comprueba que existe.
 */
const RECURSOS_EN_LLAMADAS: Record<string, { lista: keyof ContextoAnalisis; que: string }> = {
  crear: { lista: 'plantillas', que: 'plantilla' },
  'escena.cambiar': { lista: 'escenas', que: 'escena' },
  'sonido.reproducir': { lista: 'sonidos', que: 'sonido' },
  'musica.reproducir': { lista: 'sonidos', que: 'sonido' },
  'yo.animar': { lista: 'animaciones', que: 'animación' },
};

export function analizar(programa: Programa, ctx: ContextoAnalisis): Diagnostico[] {
  return new Analizador(ctx, programa.archivo).programa(programa.sentencias);
}

class Analizador {
  private diagnosticos: Diagnostico[] = [];
  private claves = new Set<string>();

  constructor(
    private ctx: ContextoAnalisis,
    private archivo: string,
  ) {}

  programa(sentencias: Bloque): Diagnostico[] {
    const raiz = new Ambito(null);
    if (this.ctx.esScript) raiz.simbolos.set('yo', { original: 'yo', pos: { linea: 1, columna: 1, longitud: 1 }, tipo: 'especial', usado: true });
    this.bloque(sentencias, raiz);
    return this.diagnosticos.sort((a, b) => a.pos.linea - b.pos.linea || a.pos.columna - b.pos.columna);
  }

  // ───────────────────────── Diagnósticos ─────────────────────────

  private error(pos: Posicion, mensaje: string, pista?: string) {
    this.agregar({ gravedad: 'error', archivo: this.archivo, pos, mensaje, pista });
  }
  private aviso(pos: Posicion, mensaje: string, pista?: string) {
    this.agregar({ gravedad: 'aviso', archivo: this.archivo, pos, mensaje, pista });
  }
  private agregar(d: Diagnostico) {
    const clave = `${d.pos.linea}:${d.pos.columna}:${d.mensaje}`;
    if (this.claves.has(clave)) return;
    this.claves.add(clave);
    this.diagnosticos.push(d);
  }

  // ───────────────────────── Bloques y sentencias ─────────────────────────

  /** Revisa un bloque. Los cuerpos de funciones y eventos se dejan para el final (ver arriba). */
  private bloque(sentencias: Bloque, ambito: Ambito): void {
    const pendientes: (() => void)[] = [];
    let terminadoPor: string | null = null;
    let avisadoInalcanzable = false;
    for (const s of sentencias) {
      if (terminadoPor && !avisadoInalcanzable) {
        this.aviso(s.pos, `este código nunca se ejecutará, porque va después de un '${terminadoPor}'.`, 'Bórralo, o muévelo antes del ' + terminadoPor + '.');
        avisadoInalcanzable = true;
      }
      this.sentencia(s, ambito, pendientes);
      if (s.tipo === 'Devolver') terminadoPor = 'devolver';
      else if (s.tipo === 'Romper') terminadoPor = 'romper';
      else if (s.tipo === 'Continuar') terminadoPor = 'continuar';
    }
    for (const p of pendientes) p();
    this.avisarNoUsadas(ambito);
  }

  private sentencia(s: Sentencia, amb: Ambito, pendientes: (() => void)[]): void {
    switch (s.tipo) {
      case 'Variable':
        this.expr(s.valor, amb); // primero el valor: en "variable x = x + 1" la x de la derecha aún no existe
        amb.simbolos.set(s.nombre, { original: s.original, pos: s.posNombre, tipo: 'variable', usado: false });
        return;

      case 'Asignacion':
        this.asignacion(s.objetivo, s.operador, amb);
        this.expr(s.valor, amb);
        this.comprobarValorAsignado(s.objetivo, s.valor);
        return;

      case 'Si':
        for (const r of s.ramas) {
          this.expr(r.condicion, amb);
          this.bloque(r.cuerpo, new Ambito(amb));
        }
        if (s.sino) this.bloque(s.sino, new Ambito(amb));
        return;

      case 'Mientras':
        this.expr(s.condicion, amb);
        this.bloque(s.cuerpo, new Ambito(amb));
        return;

      case 'Repetir':
        this.expr(s.veces, amb);
        this.bloque(s.cuerpo, new Ambito(amb));
        return;

      case 'ParaCada': {
        this.expr(s.coleccion, amb);
        const a = new Ambito(amb);
        for (const v of s.variables) a.simbolos.set(v.nombre, { original: v.original, pos: v.pos, tipo: 'bucle', usado: true });
        this.bloque(s.cuerpo, a);
        return;
      }

      case 'Funcion':
        amb.simbolos.set(s.nombre, { original: s.original, pos: s.pos, tipo: 'funcion', usado: true });
        pendientes.push(() => {
          const a = new Ambito(amb);
          for (const p of s.parametros) a.simbolos.set(p.nombre, { original: p.original, pos: p.pos, tipo: 'parametro', usado: true });
          this.bloque(s.cuerpo, a);
        });
        return;

      case 'Devolver':
        if (s.valor) this.expr(s.valor, amb);
        return;

      case 'Cuando': {
        const ev = s.evento;
        if (ev.tipo === 'tecla') {
          for (const t of ev.teclas) {
            if (t.tipo === 'Texto') this.comprobarTecla(t.valor, t.pos);
            else this.expr(t, amb);
          }
        }
        if (ev.tipo === 'intervalo' || ev.tipo === 'pasen') this.expr(ev.segundos, amb);
        pendientes.push(() => {
          const a = new Ambito(amb);
          if (ev.tipo === 'toco') {
            a.simbolos.set('otro', { original: 'otro', pos: s.pos, tipo: 'especial', usado: true });
            a.simbolos.set('casilla', { original: 'casilla', pos: s.pos, tipo: 'especial', usado: true });
          }
          this.bloque(s.cuerpo, a);
        });
        return;
      }

      case 'ExpresionSuelta':
        this.expr(s.expresion, amb);
        return;

      case 'Romper':
      case 'Continuar':
        return;
    }
  }

  /** Lo que va a la izquierda del = */
  private asignacion(objetivo: Expresion, operador: string, amb: Ambito): void {
    if (objetivo.tipo === 'Identificador') {
      const s = amb.buscar(objetivo.nombre);
      if (s) {
        if (operador !== '=') s.usado = true; // "x += 1" también LEE x
        return;
      }
      if (this.ctx.globales.buscar(objetivo.nombre)) return; // (cambiar una global da su propio error al ejecutar)
      this.error(
        objetivo.pos,
        `la variable '${objetivo.original}' no existe todavía.`,
        this.pistaNombre(objetivo.original, amb, `Para crearla escribe: variable ${objetivo.original} = ...`),
      );
      return;
    }
    if (objetivo.tipo === 'Miembro') {
      this.miembro(objetivo, amb, 'cambiar');
      return;
    }
    this.expr(objetivo, amb);
  }

  // ───────────────────────── Expresiones ─────────────────────────

  private expr(e: Expresion, amb: Ambito): void {
    switch (e.tipo) {
      case 'Identificador':
        this.identificador(e, amb);
        return;
      case 'Lista':
        e.elementos.forEach((x) => this.expr(x, amb));
        return;
      case 'Tabla':
        e.entradas.forEach((x) => this.expr(x.valor, amb));
        return;
      case 'Binaria':
      case 'Logica':
        this.expr(e.izquierda, amb);
        this.expr(e.derecha, amb);
        return;
      case 'Unaria':
        this.expr(e.operando, amb);
        return;
      case 'Miembro':
        this.miembro(e, amb, 'usar');
        return;
      case 'Indice':
        this.expr(e.objeto, amb);
        this.expr(e.indice, amb);
        return;
      case 'Llamada':
        this.expr(e.funcion, amb);
        e.argumentos.forEach((x) => this.expr(x, amb));
        this.comprobarLlamada(e, amb);
        return;
    }
  }

  private identificador(e: Extract<Expresion, { tipo: 'Identificador' }>, amb: Ambito): void {
    const s = amb.buscar(e.nombre);
    if (s) {
      s.usado = true;
      return;
    }
    if (this.ctx.globales.buscar(e.nombre)) return;
    if (e.nombre === 'otro') {
      this.error(e.pos, "'otro' solo existe dentro de un 'cuando toco ...:' (es el objeto que has tocado).", 'Úsalo dentro de un bloque como: cuando toco Enemigo:');
      return;
    }
    if (e.nombre === 'yo') {
      this.error(e.pos, "'yo' solo existe en el script de un objeto (es el propio objeto).");
      return;
    }
    this.error(e.pos, `intentas usar '${e.original}', pero no existe ninguna variable con ese nombre.`, this.pistaNombre(e.original, amb));
  }

  /** objeto.miembro — comprueba lo que se puede saber sin ejecutar. */
  private miembro(e: Extract<Expresion, { tipo: 'Miembro' }>, amb: Ambito, accion: 'usar' | 'cambiar'): void {
    const base = e.objeto;
    // "enemigo.vida" con 'enemigo' sin crear: el mismo mensaje que al ejecutar
    if (base.tipo === 'Identificador' && !amb.buscar(base.nombre) && !this.ctx.globales.buscar(base.nombre) && base.nombre !== 'otro' && base.nombre !== 'yo') {
      this.error(
        base.pos,
        `intentas ${accion} '${e.original}' de '${base.original}', pero '${base.original}' no existe.`,
        this.pistaNombre(base.original, amb, '¿Lo has creado antes o está bien escrito el nombre?'),
      );
      return;
    }
    this.expr(base, amb);

    // yo.xxx / otro.xxx: propiedades del motor mal escritas (yo.velocidda)
    if (base.tipo === 'Identificador' && (base.nombre === 'yo' || base.nombre === 'otro') && amb.buscar(base.nombre)?.tipo === 'especial') {
      if (!esMiembroDelMotor(e.propiedad)) {
        const parecido = propiedadMalEscrita(e.original);
        if (parecido) {
          this.error(
            e.pos,
            `has escrito '${base.original}.${e.original}', que se parece mucho a '${parecido}', una propiedad del motor.`,
            `¿Querías decir '${parecido}'?`,
          );
        }
      }
      return;
    }

    // Módulos de la API (teclado, escena.camara...): sus miembros se conocen de antemano
    const modulo = this.moduloEstatico(base, amb);
    if (modulo && modulo.tieneMiembro(e.propiedad) === false) {
      const nombre = modulo.describir().replace(/'/g, '');
      const parecido = sugerir(e.original, modulo.propiedadesConocidas());
      this.error(
        e.pos,
        `'${nombre}' no tiene nada llamado '${e.original}'.`,
        parecido ? `¿Querías decir '${nombre}.${parecido}'?` : `Lo que tiene ${nombre}: ${enumerar(modulo.propiedadesConocidas(), 20)}.`,
      );
    }
  }

  /** Si la expresión es un módulo de la API conocido de antemano (teclado, escena.camara), lo devuelve. */
  private moduloEstatico(e: Expresion, amb: Ambito): Anfitrion | null {
    if (e.tipo === 'Identificador') {
      if (amb.buscar(e.nombre)) return null; // alguien ha llamado igual a una variable suya
      const v = this.ctx.globales.buscar(e.nombre)?.valor;
      return v instanceof Anfitrion ? v : null;
    }
    if (e.tipo === 'Miembro') return this.moduloEstatico(e.objeto, amb)?.submodulo(e.propiedad) ?? null;
    return null;
  }

  // ───────────────────────── Comprobaciones de valores concretos ─────────────────────────

  /** crear("Bal"), escena.cambiar("Nivl2")... si el nombre va escrito tal cual, ¿existe? */
  private comprobarLlamada(e: Extract<Expresion, { tipo: 'Llamada' }>, amb: Ambito): void {
    const primero = e.argumentos[0];
    if (!primero || primero.tipo !== 'Texto') return;
    const nombre = this.nombreDeLlamada(e.funcion, amb);
    if (!nombre) return;

    if (nombre === 'teclado.pulsada' || nombre === 'teclado.sepulso' || nombre === 'teclado.sesolto') {
      this.comprobarTecla(primero.valor, primero.pos);
      return;
    }
    if (nombre === 'particulas') {
      const tipos = Object.keys(TIPOS_PARTICULAS);
      if (!tipos.includes(normalizar(primero.valor))) {
        const parecido = sugerir(primero.valor, tipos);
        this.error(primero.pos, `no hay ningún tipo de partículas llamado "${primero.valor}".`, parecido ? `¿Querías decir "${parecido}"?` : `Los tipos son: ${enumerar(tipos)}.`);
      }
      return;
    }
    const recurso = RECURSOS_EN_LLAMADAS[nombre];
    const lista = recurso ? (this.ctx[recurso.lista] as string[] | undefined) : undefined;
    if (!recurso || !lista) return;
    if (lista.some((x) => normalizar(x) === normalizar(primero.valor))) return;
    const parecido = sugerir(primero.valor, lista);
    this.error(
      primero.pos,
      `no existe ninguna ${recurso.que} llamada "${primero.valor}".`,
      parecido ? `¿Querías decir "${parecido}"?` : lista.length ? `Las que hay son: ${enumerar(lista, 12)}.` : `Este proyecto todavía no tiene ninguna ${recurso.que}.`,
    );
  }

  /** "crear", "escena.cambiar", "yo.animar"... (solo si son los de la API, no variables tuyas) */
  private nombreDeLlamada(f: Expresion, amb: Ambito): string | null {
    if (f.tipo === 'Identificador') return amb.buscar(f.nombre) ? null : f.nombre;
    if (f.tipo === 'Miembro' && f.objeto.tipo === 'Identificador') {
      const s = amb.buscar(f.objeto.nombre);
      if (s && s.tipo !== 'especial') return null;
      return `${f.objeto.nombre}.${f.propiedad}`;
    }
    return null;
  }

  /** yo.color = "rojoo", yo.imagen = "jugadr"... */
  private comprobarValorAsignado(objetivo: Expresion, valor: Expresion): void {
    if (objetivo.tipo !== 'Miembro' || valor.tipo !== 'Texto') return;
    if (objetivo.propiedad === 'color' && !esColorValido(valor.valor)) {
      const parecido = sugerir(valor.valor, NOMBRES_COLORES);
      this.error(
        valor.pos,
        `no conozco el color "${valor.valor}".`,
        (parecido ? `¿Querías decir "${parecido}"? ` : '') + `Los colores con nombre son: ${enumerar(NOMBRES_COLORES, 20)}. También vale un código como "#ff8800".`,
      );
    }
    if (objetivo.propiedad === 'imagen' && this.ctx.imagenes && !this.ctx.imagenes.some((x) => normalizar(x) === normalizar(valor.valor))) {
      const parecido = sugerir(valor.valor, this.ctx.imagenes);
      this.error(
        valor.pos,
        `no existe ninguna imagen llamada "${valor.valor}".`,
        parecido ? `¿Querías decir "${parecido}"?` : this.ctx.imagenes.length ? `Las imágenes del proyecto son: ${enumerar(this.ctx.imagenes, 12)}.` : 'Este proyecto todavía no tiene imágenes.',
      );
    }
  }

  private comprobarTecla(nombre: string, pos: Posicion): void {
    try {
      comprobarNombreTecla(nombre);
    } catch (e) {
      if (!(e instanceof ErrorMotor)) throw e;
      this.error(pos, e.message.charAt(0).toLowerCase() + e.message.slice(1), e.pista);
    }
  }

  // ───────────────────────── Avisos ─────────────────────────

  private avisarNoUsadas(amb: Ambito): void {
    for (const s of amb.simbolos.values()) {
      if (s.tipo !== 'variable' || s.usado || s.original.startsWith('_')) continue;
      this.aviso(s.pos, `has creado la variable '${s.original}', pero no la usas en ningún sitio.`, 'Si no la necesitas, puedes borrarla.');
    }
  }

  private pistaNombre(nombre: string, amb: Ambito, comoCrearla?: string): string {
    return pistaNombreDesconocido(
      nombre,
      {
        visibles: [...amb.nombresDeUsuario(), ...this.ctx.globales.nombresVisibles()],
        deUsuario: amb.nombresDeUsuario(),
        objetosEscena: this.ctx.objetosEscena,
        textos: [
          ...NOMBRES_TECLAS, ...NOMBRES_COLORES, ...Object.keys(TIPOS_PARTICULAS),
          ...(this.ctx.plantillas ?? []), ...(this.ctx.escenas ?? []), ...(this.ctx.sonidos ?? []), ...(this.ctx.animaciones ?? []), ...(this.ctx.imagenes ?? []),
        ],
      },
      comoCrearla,
    );
  }
}
