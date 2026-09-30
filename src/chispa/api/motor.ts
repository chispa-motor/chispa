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
import { argNumero, argTexto, comoLogico, comoNumero } from './argumentos';
import { argObjeto, referencia, RefObjeto } from './objetos';
import { ErrorChispa } from '../errores/ErrorChispa';
import { sugerir } from '../errores/sugerencias';
import type { Posicion } from '../lexico/tokens';
import type { Interprete } from '../ejecucion/interprete';
import { Anfitrion, FuncionNativa, Lugar, PeticionEspera, aTexto, copiarSiVector, nombreTipo, type Valor } from '../ejecucion/valores';
import { NOMBRES_SUAVIZADOS, SUAVIZADOS, mezclar, type ValorAnimable } from '../../objetos/AnimadorDeValores';
import type { DibujoDepuracion } from '../../objetos/Escena';
import { esColorValido } from '../../motor/Color';
import { BOTONES_MANDO, type BotonRaton } from '../../motor/Entrada';
import type { Motor } from '../../motor/Motor';
import { Vector2 } from '../../motor/Vector2';
import type { Escena } from '../../objetos/Escena';
import type { ObjetoJuego } from '../../objetos/ObjetoJuego';
import { normalizar } from '../../utilidades/texto';
import { MapaCasillas } from '../../objetos/componentes/MapaCasillas';
import { TIPOS_PARTICULAS, type ConfigParticulas } from '../../objetos/Particulas';
import { deserializar, serializar } from './guardado';
import { Tabla } from '../ejecucion/valores';
import { lanzarRayo } from '../../objetos/Rayos';
import { CajaDialogo } from '../../objetos/Dialogo';

/** Lo que la API necesita del juego en marcha (lo implementa JuegoEnMarcha). */
export interface ContextoJuego {
  motor: Motor;
  escena: Escena;
  /** Nombre de la escena que se está jugando. */
  nombreEscena: string;
  crearDesdePlantilla(nombre: string, x: number | null, y: number | null): ObjetoJuego;
  pedirReinicio(): void;
  cambiarEscena(nombre: string, fundido?: number): void;
  /** enviar("mensaje", dato): llega a todos los «cuando recibo» al empezar el siguiente fotograma. */
  enviarMensaje(mensaje: string, original: string, dato: Valor): void;
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
  /** Para el depurador: todo lo guardado en juego, con los nombres como se escribieron. */
  resumenParaDepurar(): [string, Valor][] {
    return [...this.datos.values()].map((d) => [d.original, d.valor]);
  }
  /** Lee un dato desde fuera del lenguaje (el editor, el tutorial). `undefined` si no hay nada guardado. */
  leer(nombre: string): Valor | undefined {
    const d = this.datos.get(nombre) ?? [...this.datos.values()].find((x) => x.original === nombre);
    return d?.valor;
  }
}

/**
 * Un cronómetro: cuenta los segundos de juego desde que se crea (o se reinicia).
 * Se para con el juego (tiempo.pausar) y con cronometro.pausar().
 */
export class Cronometro extends Anfitrion {
  private acumulado = 0;
  private desde: number | null;
  constructor(private ahora: () => number) {
    super();
    this.desde = ahora();
  }
  describir() {
    return 'un cronómetro';
  }
  propiedadesConocidas() {
    return ['segundos', 'pausado', 'reiniciar', 'pausar', 'seguir'];
  }
  tieneMiembro(n: string) {
    return ['segundos', 'pausado', 'reiniciar', 'pausar', 'seguir'].includes(n);
  }
  get segundos(): number {
    return this.acumulado + (this.desde === null ? 0 : this.ahora() - this.desde);
  }
  obtener(p: string, original: string, pos: Posicion): Valor {
    if (p === 'segundos') return this.segundos;
    if (p === 'pausado') return this.desde === null;
    if (p === 'reiniciar') return new FuncionNativa('reiniciar', () => ((this.acumulado = 0), (this.desde = this.ahora()), null));
    if (p === 'pausar') return new FuncionNativa('pausar', () => ((this.acumulado = this.segundos), (this.desde = null), null));
    if (p === 'seguir') return new FuncionNativa('seguir', () => (this.desde === null && (this.desde = this.ahora()), null));
    const s = sugerir(original, this.propiedadesConocidas());
    throw new ErrorChispa(pos, `un cronómetro no tiene nada llamado '${original}'.`, s ? `¿Querías decir '${s}'?` : `Lo que tiene: ${this.propiedadesConocidas().join(', ')}.`);
  }
  asignar(_p: string, _v: Valor, original: string, pos: Posicion): void {
    throw new ErrorChispa(pos, `'${original}' de un cronómetro no se puede cambiar.`, 'Para empezar de cero: crono.reiniciar()');
  }
}

/** El valor de destino de animar() tiene que ser del mismo tipo que lo que se anima. */
function comprobarAnimable(lugar: Lugar, desde: Valor, hasta: Valor, pos: Posicion): void {
  const ej = 'animar(yo.x, 300, 1)';
  const esAnimable = (v: Valor) => typeof v === 'number' || v instanceof Vector2 || typeof v === 'string';
  if (!esAnimable(desde)) throw new ErrorChispa(pos, `${lugar.describir()} es ${nombreTipo(desde)}, y eso no se puede animar.`, 'Se pueden animar números (x, y, rotacion, tamano, opacidad...), posiciones y colores.');
  if (hasta === undefined) throw new ErrorChispa(pos, `a 'animar' le falta hasta dónde tiene que llegar ${lugar.describir()}.`, `Ejemplo: ${ej}`);
  if (typeof desde === 'string' && typeof hasta === 'string' && !esColorValido(hasta)) {
    throw new ErrorChispa(pos, `no conozco el color "${hasta}".`, 'Ejemplo: animar(yo.color, "rojo", 1)');
  }
  if (mezclar(desde as ValorAnimable, hasta as ValorAnimable, 0) === null) {
    throw new ErrorChispa(pos, `no puedo animar ${lugar.describir()} (que es ${nombreTipo(desde)}) hasta ${nombreTipo(hasta)}.`, typeof desde === 'string' ? 'Los textos solo se animan si son colores con nombre o como "#ff8800".' : `Ejemplo: ${ej}`);
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

/** El tono de un sonido: 1 = normal. Tiene que ser mayor que 0. */
function tonoValido(tono: number, p: Posicion): number {
  if (tono <= 0) throw new ErrorChispa(p, 'el tono tiene que ser mayor que 0.', '1 = normal, 2 = más agudo, 0.5 = más grave.');
  return tono;
}

/** Añade al intérprete todo lo que depende del motor. */
export function instalarAPIMotor(interprete: Interprete, ctx: ContextoJuego, datos: DatosJuego): void {
  /** El lienzo del juego (si hay: en los tests no). */
  const lienzo = (): HTMLCanvasElement | null => (ctx.motor.renderizador as { canvas?: HTMLCanvasElement }).canvas ?? null;
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

  funcion('enviar', (a, p) => {
    const ej = 'enviar("abrir_puerta")';
    const mensaje = argTexto(a, 0, 'enviar', p, ej).trim();
    if (!mensaje) throw new ErrorChispa(p, 'el nombre del mensaje está vacío.', `Ejemplo: ${ej}`);
    ctx.enviarMensaje(normalizar(mensaje), mensaje, copiarSiVector(a[1] ?? null));
    return null;
  });
  funcion('contar', (a, p) => ctx.escena.buscarTodos(argTexto(a, 0, 'contar', p, 'contar("Enemigo")')).length);
  funcion('clonar', (a, p) => {
    const o = argObjeto(a, 0, 'clonar', p, 'clonar(yo)');
    if (!ctx.escena.clonador) throw new ErrorChispa(p, 'no se puede clonar fuera del juego.');
    return referencia(ctx.escena.clonador(o));
  });
  funcion('buscarConEtiqueta', (a, p) => {
    const e = normalizar(argTexto(a, 0, 'buscarConEtiqueta', p, 'buscarConEtiqueta("enemigo")'));
    return ctx.escena.objetos.filter((o) => !o.destruido && o.etiquetas.has(e)).map(referencia);
  });
  funcion('angulo', (a, p) => {
    // El ángulo (en grados) de la flecha que va de un sitio a otro: 0 = derecha, 90 = arriba
    const punto = (v: Valor | undefined) => (v instanceof RefObjeto ? v.objeto.posicion : v instanceof Vector2 ? v : null);
    const p1 = punto(a[0]);
    const p2 = punto(a[1]);
    if (!p1 || !p2) throw new ErrorChispa(p, "'angulo' necesita dos objetos o dos posiciones.", 'Ejemplo: angulo(yo, buscar("Jugador"))');
    return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  });
  funcion('cronometro', () => new Cronometro(() => ctx.motor.tiempo.total));
  funcion('dialogo', (a, p) => {
    // dialogo("texto") · dialogo("Ana", "texto") · dialogo("Ana", "¿Vienes?", ["Si", "No"]) → la opción elegida
    const ej = 'dialogo("Ana", "¿Me ayudas?", ["Si", "No"])';
    const textos = a.filter((v) => typeof v === 'string') as string[];
    const opciones = a.find((v) => Array.isArray(v)) as Valor[] | undefined;
    const raros = a.filter((v) => typeof v !== 'string' && !Array.isArray(v));
    if (!textos.length || textos.length > 2 || raros.length || (opciones && a.indexOf(opciones) !== a.length - 1)) {
      throw new ErrorChispa(p, "'dialogo' necesita el texto (y, si quieres, antes quién habla y después una lista de opciones).", `Ejemplos: dialogo("Hola")  ·  ${ej}`);
    }
    if (opciones && (!opciones.length || opciones.some((o) => typeof o !== 'string'))) {
      throw new ErrorChispa(p, 'las opciones del diálogo tienen que ser una lista de textos (al menos uno).', `Ejemplo: ${ej}`);
    }
    const caja = new CajaDialogo(textos[textos.length - 1], textos.length === 2 ? textos[0] : null, (opciones as string[] | undefined) ?? []);
    ctx.escena.dialogos.push(caja);
    return new PeticionEspera(0, () => caja.terminado, () => caja.elegida);
  });
  funcion('rayo', (a, p) => {
    // rayo(yo, 0, 500): lo primero que toca una línea que sale de yo hacia la derecha, hasta 500 píxeles
    const ej = 'rayo(yo, buscar("Jugador"), 400)';
    const desde = a[0];
    const origen = desde instanceof RefObjeto ? desde.objeto.posicion : desde instanceof Vector2 ? desde : null;
    if (!origen) throw new ErrorChispa(p, "'rayo' necesita saber de dónde sale: un objeto o una posición (vector).", `Ejemplo: ${ej}`);
    const d = a[1];
    let direccion: Vector2 | null = null;
    if (typeof d === 'number') direccion = new Vector2(Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180));
    else if (d instanceof Vector2) direccion = d.normalizado();
    else if (d instanceof RefObjeto) direccion = d.objeto.posicion.restar(origen).normalizado();
    if (!direccion) throw new ErrorChispa(p, "'rayo' necesita una dirección: un ángulo (0 = derecha, 90 = arriba), un vector o un objeto hacia el que mirar.", `Ejemplo: ${ej}`);
    if (direccion.longitud() === 0) throw new ErrorChispa(p, 'el rayo no tiene dirección: el vector es (0, 0) o el objetivo está justo en el mismo sitio.', `Ejemplo: ${ej}`);
    const largo = argNumero(a, 2, 'rayo', p, ej, 1000);
    if (largo <= 0) throw new ErrorChispa(p, 'el largo del rayo tiene que ser mayor que 0.', `Ejemplo: ${ej}`);
    const i = lanzarRayo(ctx.escena, origen, direccion, largo, desde instanceof RefObjeto ? desde.objeto : null);
    if (!i) return null;
    const r = new Tabla();
    r.poner('objeto', referencia(i.objeto));
    r.poner('punto', i.punto);
    r.poner('distancia', i.distancia);
    r.poner('casilla', i.casilla);
    return r;
  });
  // animar(yo.tamano, 2, 0.5, "rebote"): recibe el SITIO (yo.tamano), no su valor
  g.declarar(
    'animar',
    new FuncionNativa(
      'animar',
      (a, p) => {
        const lugar = a[0];
        if (!(lugar instanceof Lugar)) throw new ErrorChispa(p, "a 'animar' le falta qué tiene que cambiar.", 'Ejemplo: animar(yo.x, 300, 1)');
        const desde = copiarSiVector(lugar.leer());
        const hasta = a[1];
        comprobarAnimable(lugar, desde, hasta, p);
        const segundos = argNumero(a, 2, 'animar', p, 'animar(yo.x, 300, 1)', 0.5);
        if (segundos < 0) throw new ErrorChispa(p, 'el tiempo de una animación no puede ser negativo.');
        const nombreSuave = a[3] === undefined ? 'suave' : normalizar(argTexto(a, 3, 'animar', p, 'animar(yo.x, 300, 1, "rebote")'));
        const suavizado = SUAVIZADOS[nombreSuave];
        if (!suavizado) {
          const s = sugerir(nombreSuave, NOMBRES_SUAVIZADOS);
          throw new ErrorChispa(p, `no conozco el suavizado "${aTexto(a[3] ?? null)}".`, (s ? `¿Querías decir "${s}"? ` : '') + `Los que hay son: ${NOMBRES_SUAVIZADOS.join(', ')}.`);
        }
        const final = copiarSiVector(hasta as Valor);
        // Se escribe ya una vez: si no se puede cambiar (por ejemplo, un objeto sin dibujo), el error sale aquí, en su línea
        lugar.escribir(desde);
        ctx.escena.animaciones.agregar({
          clave: lugar.clave,
          dueno: lugar.dueno ?? undefined,
          duracion: segundos,
          transcurrido: 0,
          suavizado,
          paso: (t) => {
            try {
              lugar.escribir(t >= 1 ? copiarSiVector(final) : (mezclar(desde as ValorAnimable, final as ValorAnimable, t) as Valor));
            } catch {
              ctx.escena.animaciones.cancelar(lugar.clave); // el objeto ha cambiado (ya no tiene dibujo...): se deja de animar
            }
          },
        });
        return null;
      },
      true,
    ),
    'animar',
  );

  // ── teclado ──
  g.declarar(
    'teclado',
    new Modulo('teclado', {
      ultima: { obtener: () => ctx.motor.entrada.ultimaTecla },
      pulsadas: { obtener: () => ctx.motor.entrada.teclasPulsadas() },
    }, {
      pulsada: (a, p) => ctx.motor.entrada.estaPulsada(argTexto(a, 0, 'teclado.pulsada', p, 'teclado.pulsada("izquierda")')),
      sepulso: (a, p) => ctx.motor.entrada.sePulso(argTexto(a, 0, 'teclado.sePulso', p, 'teclado.sePulso("espacio")')),
      sesolto: (a, p) => ctx.motor.entrada.seSolto(argTexto(a, 0, 'teclado.seSolto', p, 'teclado.seSolto("espacio")')),
      algunasepulso: () => ctx.motor.entrada.algunaSePulso(),
    }, ['pulsada', 'sePulso', 'seSolto', 'algunaSePulso', 'ultima', 'pulsadas']),
  );

  // ── mando (el primer mando conectado; además hace de teclado: ver Entrada) ──
  const botonMando = (a: Valor[], p: Posicion, funcion: string): string => {
    const b = normalizar(argTexto(a, 0, funcion, p, `${funcion}("a")`));
    if (!BOTONES_MANDO.includes(b)) {
      const s = sugerir(b, BOTONES_MANDO);
      throw new ErrorChispa(p, `el mando no tiene ningún botón llamado "${b}".`, (s ? `¿Querías decir "${s}"? ` : '') + `Los botones son: ${BOTONES_MANDO.join(', ')}.`);
    }
    return b;
  };
  const mando = () => ctx.motor.entrada.mando;
  g.declarar(
    'mando',
    new Modulo('mando', {
      conectado: { obtener: () => mando().conectado },
      ejex: { obtener: () => mando().ejeX },
      ejey: { obtener: () => mando().ejeY },
      ejederechox: { obtener: () => mando().ejeDerechoX },
      ejederechoy: { obtener: () => mando().ejeDerechoY },
    }, {
      pulsado: (a, p) => mando().botones.has(botonMando(a, p, 'mando.pulsado')),
      sepulso: (a, p) => mando().pulsados.has(botonMando(a, p, 'mando.sePulso')),
      vibrar: (a, p) => {
        ctx.motor.entrada.vibrar(argNumero(a, 0, 'mando.vibrar', p, 'mando.vibrar(0.3)', 0.3), argNumero(a, 1, 'mando.vibrar', p, 'mando.vibrar(0.3, 0.5)', 1));
        return null;
      },
    }, ['conectado', 'ejeX', 'ejeY', 'ejeDerechoX', 'ejeDerechoY', 'pulsado', 'sePulso', 'vibrar']),
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
        objeto: {
          obtener: () => {
            const o = ctx.escena.objetoBajoRaton();
            return o ? referencia(o) : null;
          },
        },
        visible: {
          obtener: () => lienzo()?.style.cursor !== 'none',
          asignar: (v, p) => {
            const l = lienzo();
            if (l) l.style.cursor = comoLogico(v, 'visible', p) ? '' : 'none';
          },
        },
      },
      {
        pulsado: (a, p) => ctx.motor.entrada.ratonPulsado(argBoton(a, 'pulsado', p)),
        sepulso: (a, p) => ctx.motor.entrada.ratonSePulso(argBoton(a, 'sePulso', p)),
        sesolto: (a, p) => ctx.motor.entrada.ratonSeSolto(argBoton(a, 'seSolto', p)),
      },
      ['x', 'y', 'posicion', 'rueda', 'objeto', 'visible', 'pulsado', 'sePulso', 'seSolto'],
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
        colorfondo: {
          obtener: () => ctx.motor.colorFondo,
          asignar: (v, p) => {
            const c = aTexto(v);
            if (!esColorValido(c)) throw new ErrorChispa(p, `no conozco el color "${c}".`, 'Ejemplo: escena.colorFondo = "azul"');
            ctx.motor.colorFondo = c;
          },
        },
      },
      {
        reiniciar: () => {
          ctx.pedirReinicio();
          return null;
        },
        cambiar: (a, p) => {
          const ej = 'escena.cambiar("Nivel2", 1)';
          ctx.cambiarEscena(argTexto(a, 0, 'escena.cambiar', p, ej), Math.max(0, argNumero(a, 1, 'escena.cambiar', p, ej, 0)));
          return null;
        },
      },
      ['objetos', 'nombre', 'gravedad', 'colorFondo', 'camara', 'reiniciar', 'cambiar'],
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
          const ej = 'sonido.reproducir("salto", 0.5, 1.2)';
          ctx.motor.sonido.reproducir(argTexto(a, 0, 'sonido.reproducir', p, ej), { volumen: argNumero(a, 1, 'sonido.reproducir', p, ej, 1), tono: tonoValido(argNumero(a, 2, 'sonido.reproducir', p, ej, 1), p) });
          return null;
        },
        bucle: (a, p) => {
          const ej = 'sonido.bucle("motor", 0.5)';
          ctx.motor.sonido.reproducir(argTexto(a, 0, 'sonido.bucle', p, ej), { volumen: argNumero(a, 1, 'sonido.bucle', p, ej, 1), tono: tonoValido(argNumero(a, 2, 'sonido.bucle', p, ej, 1), p), bucle: true });
          return null;
        },
        sonando: (a, p) => ctx.motor.sonido.estaSonando(argTexto(a, 0, 'sonido.sonando', p, 'si no sonido.sonando("motor"):')),
        pausar: () => {
          ctx.motor.sonido.pausar();
          return null;
        },
        seguir: () => {
          ctx.motor.sonido.reanudar();
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
      ['volumen', 'reproducir', 'bucle', 'parar', 'sonando', 'pausar', 'seguir', 'tono'],
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
          const ej = 'musica.reproducir("tema", 2)';
          ctx.motor.sonido.musica(argTexto(a, 0, 'musica.reproducir', p, ej), Math.max(0, argNumero(a, 1, 'musica.reproducir', p, ej, 0)));
          return null;
        },
        parar: (a, p) => {
          ctx.motor.sonido.pararMusica(Math.max(0, argNumero(a, 0, 'musica.parar', p, 'musica.parar(2)', 0)));
          return null;
        },
        pausar: () => {
          ctx.motor.sonido.pausarMusica();
          return null;
        },
        seguir: () => {
          ctx.motor.sonido.seguirMusica();
          return null;
        },
      },
      ['volumen', 'actual', 'reproducir', 'parar', 'pausar', 'seguir'],
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
  // Pausa y cámara lenta: se recuerda la velocidad de antes para volver a ella
  let escalaAntesDePausa = 1;
  let lentaQueda = 0;
  let vigilandoLenta = false;
  const t = () => ctx.motor.tiempo;
  g.declarar(
    'tiempo',
    new Modulo(
      'tiempo',
      {
        total: { obtener: () => t().total },
        delta: { obtener: () => t().delta },
        escala: { obtener: () => t().escala, asignar: (v, p) => (t().escala = Math.max(0, comoNumero(v, 'escala', p))) },
        pausado: { obtener: () => t().escala === 0 },
        fps: { obtener: () => t().fps },
      },
      {
        pausar: () => {
          if (t().escala !== 0) escalaAntesDePausa = t().escala;
          t().escala = 0;
          return null;
        },
        seguir: () => {
          if (t().escala === 0) t().escala = escalaAntesDePausa || 1;
          return null;
        },
        camaralenta: (a, p) => {
          // tiempo.camaraLenta(0.3, 2): durante 2 segundos (de verdad) todo va a 0,3 de su velocidad
          const ej = 'tiempo.camaraLenta(0.3, 2)';
          const escala = argNumero(a, 0, 'tiempo.camaraLenta', p, ej, 0.3);
          const segundos = argNumero(a, 1, 'tiempo.camaraLenta', p, ej, 1);
          if (escala <= 0) throw new ErrorChispa(p, 'la velocidad de la cámara lenta tiene que ser mayor que 0.', 'Para parar del todo usa tiempo.pausar()');
          t().escala = escala;
          lentaQueda = segundos;
          if (!vigilandoLenta) {
            vigilandoLenta = true;
            ctx.motor.alActualizar(() => {
              if (lentaQueda <= 0) return;
              lentaQueda -= t().deltaReal;
              if (lentaQueda <= 0) t().escala = 1;
            });
          }
          return null;
        },
      },
      ['total', 'delta', 'escala', 'pausado', 'fps', 'pausar', 'seguir', 'camaraLenta'],
    ),
  );
  g.declarar(
    'pantalla',
    new Modulo(
      'pantalla',
      {
        ancho: { obtener: () => ctx.motor.renderizador.ancho },
        alto: { obtener: () => ctx.motor.renderizador.alto },
        completa: {
          obtener: () => typeof document !== 'undefined' && !!document.fullscreenElement,
          asignar: (v, p) => {
            const quiere = comoLogico(v, 'completa', p);
            const l = lienzo();
            if (!l || typeof document === 'undefined') return;
            // El navegador solo lo deja hacer justo después de pulsar una tecla o hacer clic
            if (quiere && !document.fullscreenElement) void (l.parentElement ?? l).requestFullscreen?.().catch(() => {});
            else if (!quiere && document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
          },
        },
      },
      {
        oscurecer: (a, p) => {
          const ej = 'pantalla.oscurecer(1, "negro")';
          const segundos = Math.max(0, argNumero(a, 0, 'pantalla.oscurecer', p, ej, 1));
          const color = a[1] === undefined ? undefined : argTexto(a, 1, 'pantalla.oscurecer', p, ej);
          if (color !== undefined && !esColorValido(color)) throw new ErrorChispa(p, `no conozco el color "${color}".`, `Ejemplo: ${ej}`);
          ctx.escena.fundir(1, segundos, color);
          return null;
        },
        aclarar: (a, p) => {
          ctx.escena.fundir(0, Math.max(0, argNumero(a, 0, 'pantalla.aclarar', p, 'pantalla.aclarar(1)', 1)));
          return null;
        },
      },
      ['ancho', 'alto', 'completa', 'oscurecer', 'aclarar'],
    ),
  );

  // ── dibujar (para ver cosas mientras programas: líneas, círculos...). Coordenadas del mundo; duran un fotograma. ──
  const dibujo = (d: DibujoDepuracion) => {
    ctx.escena.dibujos.push(d);
    return null;
  };
  const colorDe = (a: Valor[], i: number, funcion: string, p: Posicion, ej: string) => {
    if (a[i] === undefined) return 'rojo';
    const c = argTexto(a, i, funcion, p, ej);
    if (!esColorValido(c)) throw new ErrorChispa(p, `no conozco el color "${c}".`, `Ejemplo: ${ej}`);
    return c;
  };
  g.declarar(
    'dibujar',
    new Modulo(
      'dibujar',
      {},
      {
        linea: (a, p) => {
          const ej = 'dibujar.linea(yo.x, yo.y, raton.x, raton.y, "rojo")';
          const n = (i: number) => argNumero(a, i, 'dibujar.linea', p, ej);
          return dibujo({ tipo: 'linea', x1: n(0), y1: n(1), x2: n(2), y2: n(3), color: colorDe(a, 4, 'dibujar.linea', p, ej), grosor: argNumero(a, 5, 'dibujar.linea', p, ej, 2) });
        },
        circulo: (a, p) => {
          const ej = 'dibujar.circulo(yo.x, yo.y, 100, "verde")';
          const n = (i: number) => argNumero(a, i, 'dibujar.circulo', p, ej);
          return dibujo({ tipo: 'circulo', x: n(0), y: n(1), radio: n(2), color: colorDe(a, 3, 'dibujar.circulo', p, ej), relleno: a[4] === true });
        },
        rectangulo: (a, p) => {
          const ej = 'dibujar.rectangulo(yo.x, yo.y, 64, 64, "azul")';
          const n = (i: number) => argNumero(a, i, 'dibujar.rectangulo', p, ej);
          return dibujo({ tipo: 'rectangulo', x: n(0), y: n(1), ancho: n(2), alto: n(3), color: colorDe(a, 4, 'dibujar.rectangulo', p, ej), relleno: a[5] === true });
        },
        texto: (a, p) => {
          const ej = 'dibujar.texto("aqui", yo.x, yo.y + 40, "blanco")';
          const n = (i: number) => argNumero(a, i, 'dibujar.texto', p, ej);
          return dibujo({ tipo: 'texto', texto: aTexto(a[0] ?? null), x: n(1), y: n(2), color: colorDe(a, 3, 'dibujar.texto', p, ej), tamano: argNumero(a, 4, 'dibujar.texto', p, ej, 16) });
        },
      },
      ['linea', 'circulo', 'rectangulo', 'texto'],
    ),
  );

  // ── sistema ──
  g.declarar(
    'sistema',
    new Modulo(
      'sistema',
      {
        movil: { obtener: () => typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || /Android|iPhone|iPad/i.test(navigator.userAgent)) },
      },
      {
        abrirweb: (a, p) => {
          const url = argTexto(a, 0, 'sistema.abrirWeb', p, 'sistema.abrirWeb("https://itch.io")');
          if (!/^https?:\/\//i.test(url)) throw new ErrorChispa(p, 'la dirección tiene que empezar por https:// (o http://).', 'Ejemplo: sistema.abrirWeb("https://itch.io")');
          if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
          return null;
        },
      },
      ['movil', 'abrirWeb'],
    ),
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
