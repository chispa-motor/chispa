/**
 * JUEGO EN MARCHA: convierte un proyecto (JSON) en un juego funcionando.
 *
 *   1. Revisa TODOS los scripts (si hay errores, no empieza y los enseña todos).
 *   2. Monta la escena inicial: crea los objetos con sus componentes.
 *   3. En cada fotograma, antes de nada, atiende los cambios pedidos por los
 *      scripts (reiniciar la escena, cambiar a otra).
 *
 * DECISIÓN: los datos de `juego` (puntos, vidas...) se CONSERVAN al cambiar
 * de escena y al reiniciar. Así "pasar al nivel 2" no pierde los puntos. Para
 * empezar de cero, un script les da su valor inicial en "cuando empieza".
 */
import { DatosJuego, instalarAPIMotor, type ContextoJuego } from '../chispa/api/motor';
import { Interprete } from '../chispa/ejecucion/interprete';
import { ScriptChispa } from '../chispa/ScriptChispa';
import { formatearDiagnostico, type Diagnostico, type ErrorChispa } from '../chispa/errores/ErrorChispa';
import { sugerir } from '../chispa/errores/sugerencias';
import type { Programa } from '../chispa/sintaxis/ast';
import { ErrorMotor } from '../motor/Errores';
import { escribirEnConsola, limpiarConsola } from '../motor/Consola';
import type { Motor } from '../motor/Motor';
import { Vector2 } from '../motor/Vector2';
import { Escena } from '../objetos/Escena';
import { ObjetoJuego } from '../objetos/ObjetoJuego';
import { Animador, type DefAnimacion } from '../objetos/componentes/Animador';
import { Colision } from '../objetos/componentes/Colision';
import { Fisica, GRAVEDAD_MUNDO } from '../objetos/componentes/Fisica';
import { MapaCasillas } from '../objetos/componentes/MapaCasillas';
import { Recorrido } from '../objetos/componentes/Recorrido';
import { Sprite } from '../objetos/componentes/Sprite';
import { normalizar } from '../utilidades/texto';
import { migrarProyecto, tipoPorNombre, type DefObjeto, type DefProyecto } from './formato';
import { comprobarRevision, revisarProyecto } from './Revision';
import { fuenteDeTexto, plantillaDeTexto, tieneHuecos } from './TextosConHuecos';
import { Entorno } from '../chispa/ejecucion/entorno';
import type { Valor } from '../chispa/ejecucion/valores';
import { referencia } from '../chispa/api/objetos';
import type { Depurador } from '../chispa/ejecucion/depurador';

export interface OpcionesJuego {
  /** Qué hacer con mostrar(). Por defecto, la consola de la página. */
  alMostrar?: (texto: string) => void;
  /**
   * Qué hacer cuando un script falla mientras el juego funciona. El script se
   * para y el juego sigue. `veces` cuenta cuántas veces ha pasado el MISMO
   * error (por ejemplo, en 50 copias de una plantilla), para enseñarlo una vez con "×50".
   */
  alError?: (error: ErrorChispa, veces: number) => void;
  /** Avisos encontrados al revisar el código antes de empezar. */
  alAviso?: (avisos: Diagnostico[]) => void;
  /** Dónde se guardan los datos del jugador (guardar/cargar). Por defecto, el localStorage del navegador. */
  almacen?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  /** El depurador del editor (puntos de parada, paso a paso). Fuera del editor no hay. */
  depurador?: Depurador;
}

/** Lo que hay que hacer al empezar el siguiente fotograma. `espera`: segundos que faltan (mientras se oscurece la pantalla). */
type Pendiente = { tipo: 'reiniciar' } | { tipo: 'cambiar'; escena: string; espera?: number; fundido?: number } | null;

export class JuegoEnMarcha implements ContextoJuego {
  readonly escena: Escena;
  readonly interprete = new Interprete();
  readonly proyecto: DefProyecto;
  /** Nombre de la escena que se está jugando. */
  nombreEscena: string;
  private datos = new DatosJuego();
  /** Un dato de `juego` (juego.puntos...), para verlo desde el editor. */
  datoDelJuego(nombre: string): unknown {
    return this.datos.leer(nombre);
  }
  private programas = new Map<string, Programa>();
  private pendiente: Pendiente = null;
  /** Mensajes enviados con enviar(): se reparten al empezar el siguiente fotograma. */
  private buzon: { mensaje: string; dato: Valor }[] = [];
  private erroresVistos = new Map<string, number>();

  private constructor(
    readonly motor: Motor,
    proyecto: DefProyecto,
    private opciones: OpcionesJuego,
  ) {
    this.proyecto = proyecto;
    this.nombreEscena = proyecto.escenaInicial;
    this.escena = new Escena(motor);
    this.escena.clonador = (o) => this.clonar(o);
    this.interprete.alMostrar = opciones.alMostrar ?? ((t) => escribirEnConsola(t));
    this.interprete.nombresDeObjetos = () => [...new Set(this.escena.objetos.map((o) => o.nombre))];
    instalarAPIMotor(this.interprete, this, this.datos);
    // Los «Datos del juego» del editor: están antes de que empiece ningún script
    for (const [nombre, valor] of Object.entries(proyecto.datos ?? {})) this.datos.asignar(normalizar(nombre), valor, nombre);
    this.interprete.alErrorVivo = (e) => this.informarError(e);
    this.interprete.depurador = opciones.depurador ?? null;
  }

  /** Carga las imágenes y sonidos del proyecto (rutas o "data URL"). */
  static async cargarRecursos(motor: Motor, datos: unknown): Promise<void> {
    const p = migrarProyecto(datos);
    await motor.recursos.cargarImagenes(p.imagenes);
    await Promise.all(Object.entries(p.sonidos).map(([n, r]) => motor.sonido.cargar(n, r)));
  }

  /** Carga los recursos, revisa el código, monta la escena inicial y arranca el bucle. */
  static async arrancar(motor: Motor, datos: unknown, opciones: OpcionesJuego = {}): Promise<JuegoEnMarcha> {
    await JuegoEnMarcha.cargarRecursos(motor, datos);
    const juego = JuegoEnMarcha.preparar(motor, datos, opciones);
    motor.iniciar();
    return juego;
  }

  /**
   * Monta el juego SIN cargar archivos ni arrancar el bucle.
   * Lo usan los tests (que avanzan los fotogramas a mano) y el editor.
   */
  static preparar(motor: Motor, datos: unknown, opciones: OpcionesJuego = {}): JuegoEnMarcha {
    const proyecto = migrarProyecto(datos);
    const juego = new JuegoEnMarcha(motor, proyecto, opciones);
    // Revisamos TODOS los scripts al principio: así los errores salen todos
    // a la vez nada más pulsar Ejecutar, y no a los 5 minutos de partida.
    const revision = revisarProyecto(proyecto, juego.interprete.globales);
    comprobarRevision(revision);
    if (revision.avisos.length) (opciones.alAviso ?? avisosEnConsola)(revision.avisos);
    juego.programas = revision.programas;
    motor.escena = juego.escena;
    motor.alActualizar((dt) => juego.antesDelFotograma(dt));
    if (!opciones.alMostrar) limpiarConsola();
    juego.construir(proyecto.escenaInicial);
    return juego;
  }

  /** Para el juego: vacía la escena y para los sonidos (al pulsar Parar en el editor). */
  detener(): void {
    this.escena.vaciar();
    this.motor.sonido.pararTodo();
  }

  // ───────────────────────── Escenas ─────────────────────────

  /** Crea los objetos de una escena desde cero. */
  private construir(nombre: string): void {
    const def = this.proyecto.escenas[nombre];
    this.nombreEscena = nombre;
    this.escena.vaciar();
    this.escena.gravedad = def.gravedad ?? GRAVEDAD_MUNDO;
    this.motor.colorFondo = def.colorFondo;

    // La cámara empieza siempre como diga ESTA escena (nada se queda de la anterior)
    const cam = this.escena.camara;
    cam.zoom = def.camara?.zoom ?? 1;
    cam.limites = def.camara?.limites ? { ...def.camara.limites } : null;
    cam.posicion = new Vector2(def.camara?.x ?? cam.anchoPantalla / 2, def.camara?.y ?? cam.altoPantalla / 2);

    // Primero creamos todos y DESPUÉS los iniciamos: así en "cuando empieza"
    // cualquier script puede buscar("...") a otro objeto de la escena.
    for (const o of def.objetos) this.instanciar(o, o.nombre ?? o.tipo ?? 'Objeto');
    if (def.camara?.limitarAlMapa) cam.limites = this.escena.limitesDeLosMapas();
    if (def.camara?.seguir) {
      const objetivo = this.escena.buscar(def.camara.seguir);
      if (objetivo) cam.seguir(objetivo);
    }
    this.escena.iniciar();
  }

  private antesDelFotograma(dt: number): void {
    this.interprete.globales.declarar('delta', dt);
    this.repartirMensajes();
    const p = this.pendiente;
    if (!p) return;
    // Cambio con fundido: primero se oscurece la pantalla (en tiempo real, aunque el juego esté en pausa)
    if (p.tipo === 'cambiar' && p.espera !== undefined && p.espera > 0) {
      p.espera -= this.motor.tiempo.deltaReal;
      if (p.espera > 0) return;
    }
    this.pendiente = null;
    this.construir(p.tipo === 'cambiar' ? p.escena : this.nombreEscena);
    if (p.tipo === 'cambiar' && p.fundido) this.escena.fundir(0, p.fundido / 2);
  }

  pedirReinicio(): void {
    // No reiniciamos en mitad de un script: lo hacemos al principio del siguiente fotograma.
    this.pendiente = { tipo: 'reiniciar' };
  }

  enviarMensaje(mensaje: string, _original: string, dato: Valor): void {
    this.buzon.push({ mensaje, dato });
  }

  /**
   * Reparte los mensajes que se enviaron en el fotograma anterior a todos los
   * objetos que los escuchan. Los que se envíen mientras tanto (un «cuando
   * recibo» que envía otro mensaje) llegarán en el siguiente: así dos objetos
   * que se contestan no se quedan contestándose para siempre en un fotograma.
   */
  private repartirMensajes(): void {
    if (!this.buzon.length) return;
    const mensajes = this.buzon;
    this.buzon = [];
    for (const { mensaje, dato } of mensajes) {
      for (const o of [...this.escena.objetos]) {
        if (!o.destruido) o.obtener(ScriptChispa)?.recibirMensaje(mensaje, dato);
      }
    }
  }

  /** Cambia de escena. Con `fundido` (segundos), la pantalla se oscurece, cambia y se vuelve a aclarar. */
  cambiarEscena(nombre: string, fundido = 0): void {
    const n = normalizar(nombre);
    const clave = Object.keys(this.proyecto.escenas).find((k) => normalizar(k) === n);
    if (!clave) {
      const hay = Object.keys(this.proyecto.escenas);
      const parecida = sugerir(nombre, hay);
      throw new ErrorMotor(`No existe ninguna escena llamada "${nombre}".`, parecida ? `¿Querías decir "${parecida}"?` : `Las escenas que hay son: ${hay.join(', ')}.`);
    }
    if (fundido > 0) {
      this.escena.fundir(1, fundido / 2);
      this.pendiente = { tipo: 'cambiar', escena: clave, espera: fundido / 2, fundido };
    } else this.pendiente = { tipo: 'cambiar', escena: clave };
  }

  /**
   * Una copia de un objeto, con su script (que empieza de nuevo con "cuando empieza").
   * Se copia como está AHORA: sitio, giro, tamaño, color, propiedades propias...
   */
  clonar(o: ObjetoJuego): ObjetoJuego {
    const def = o.definicion as DefObjeto | null;
    if (!def) throw new ErrorMotor(`No se puede clonar '${o.nombre}'.`, 'Solo se pueden clonar los objetos del juego (los de la escena y los creados con crear).');
    const copia = crearObjetoDesdeDefinicion({ ...def, nombre: o.nombre, tipo: o.tipo, x: o.posicion.x, y: o.posicion.y }, o.nombre, this.proyecto);
    copia.transformacion.rotacion = o.transformacion.rotacion;
    copia.transformacion.escala.x = o.transformacion.escala.x;
    copia.transformacion.escala.y = o.transformacion.escala.y;
    const s = o.obtener(Sprite);
    const sc = copia.obtener(Sprite);
    if (s && sc) {
      for (const k of ['imagen', 'forma', 'color', 'ancho', 'alto', 'visible', 'opacidad', 'voltearX', 'voltearY', 'capa', 'tamano', 'colorTexto', 'alinear'] as const) (sc as unknown as Record<string, unknown>)[k] = s[k];
      if (!s.textoVivo) sc.texto = s.texto;
    }
    for (const [k, v] of o.propiedades) copia.propiedades.set(k, typeof v === 'object' && v ? { ...(v as object) } : v);
    for (const [k, v] of o.etiquetas) copia.etiquetas.set(k, v);
    copia.arrastrable = o.arrastrable;
    copia.definicion = def;
    return this.agregarConScript(copia, def);
  }

  animaciones(): Record<string, DefAnimacion> {
    return this.proyecto.animaciones;
  }

  // ───────────────────────── Datos del jugador (guardar / cargar) ─────────────────────────

  private get almacen() {
    return this.opciones.almacen ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  }
  private claveGuardado(clave: string): string {
    return `chispa:${this.proyecto.nombre}:${normalizar(clave)}`;
  }
  guardarDato(clave: string, texto: string): void {
    try {
      this.almacen?.setItem(this.claveGuardado(clave), texto);
    } catch {
      throw new ErrorMotor('No se ha podido guardar: el navegador no deja guardar datos (¿modo incógnito o sin espacio?).');
    }
  }
  cargarDato(clave: string): string | null {
    try {
      return this.almacen?.getItem(this.claveGuardado(clave)) ?? null;
    } catch {
      return null;
    }
  }
  borrarDato(clave: string): void {
    try {
      this.almacen?.removeItem(this.claveGuardado(clave));
    } catch {
      /* si el navegador no deja, no hay nada que borrar */
    }
  }

  // ───────────────────────── Objetos ─────────────────────────

  crearDesdePlantilla(nombre: string, x: number | null, y: number | null): ObjetoJuego {
    const n = normalizar(nombre);
    const clave = Object.keys(this.proyecto.plantillas).find((k) => normalizar(k) === n);
    if (!clave) {
      const hay = Object.keys(this.proyecto.plantillas);
      const parecida = sugerir(nombre, hay);
      throw new ErrorMotor(
        `No existe ninguna plantilla llamada "${nombre}".`,
        parecida ? `¿Querías decir "${parecida}"?` : hay.length ? `Las plantillas que hay son: ${hay.join(', ')}.` : 'Este proyecto no tiene plantillas todavía.',
      );
    }
    const def = this.proyecto.plantillas[clave];
    // La posición se pasa ANTES de meterlo en la escena, para que su
    // "cuando empieza" ya vea el objeto en su sitio.
    return this.instanciar({ ...def, x: x ?? def.x, y: y ?? def.y }, clave);
  }

  /** Convierte una definición JSON en un ObjetoJuego con sus componentes. */
  private instanciar(def: DefObjeto, nombrePorDefecto: string): ObjetoJuego {
    const o = crearObjetoDesdeDefinicion(def, nombrePorDefecto, this.proyecto);
    o.definicion = def;
    return this.agregarConScript(o, def);
  }

  /** Le pone su script (si tiene) y su texto con huecos, y lo mete en la escena. */
  private agregarConScript(o: ObjetoJuego, def: DefObjeto): ObjetoJuego {
    if (def.script) {
      const programa = this.programas.get(def.script);
      if (!programa) {
        throw new ErrorMotor(
          `El objeto "${o.nombre}" usa el script "${def.script}", pero ese script no existe en el proyecto.`,
          `Los scripts que hay son: ${Object.keys(this.proyecto.scripts).join(', ') || 'ninguno'}.`,
        );
      }
      o.agregar(new ScriptChispa(this.interprete, programa, (e) => this.informarError(e)));
    }
    this.textoConHuecos(o, def);
    // agregar() a la escena al final: si la escena ya está en marcha, esto
    // arranca el script (y lanza su "cuando empieza") con todo ya montado.
    return this.escena.agregar(o);
  }

  /**
   * Si el texto del objeto tiene huecos ("Puntos: {juego.puntos}"), se
   * recalcula solo. Dentro se pueden usar las variables del script del objeto.
   */
  private textoConHuecos(o: ObjetoJuego, def: DefObjeto): void {
    const s = o.obtener(Sprite);
    if (!s || !tieneHuecos(def.sprite?.texto)) return;
    const plantilla = plantillaDeTexto(def.sprite!.texto!); // ya revisada antes de empezar
    let propio: Entorno | null = null;
    const entorno = () => {
      const delScript = o.obtener(ScriptChispa)?.entornoDelScript;
      if (delScript) return delScript;
      if (!propio) {
        propio = new Entorno(this.interprete.globales);
        propio.declarar('yo', referencia(o));
      }
      return propio;
    };
    s.textoVivo = this.interprete.textoVivo(plantilla, entorno, { archivo: `texto de ${o.nombre}`, lineas: [fuenteDeTexto(def.sprite!.texto!)] });
  }

  /** Un script ha fallado (y ya se ha parado): se cuenta y se informa. */
  private informarError(e: ErrorChispa): void {
    const clave = `${e.ubicacion.archivo}:${e.linea}:${e.mensajeCorto}`;
    const veces = (this.erroresVistos.get(clave) ?? 0) + 1;
    this.erroresVistos.set(clave, veces);
    if (this.opciones.alError) this.opciones.alError(e, veces);
    else if (veces === 1) escribirEnConsola(formatearDiagnostico(e.diagnostico(), this.programas.get(e.ubicacion.archivo ?? '')?.lineas), 'error');
  }
}

/**
 * Crea un ObjetoJuego con sus componentes a partir de su definición (sin script).
 * También lo usa el editor para dibujar la escena mientras la editas.
 */
export function crearObjetoDesdeDefinicion(def: DefObjeto, nombrePorDefecto: string, proyecto: DefProyecto): ObjetoJuego {
  const o = new ObjetoJuego(def.nombre ?? nombrePorDefecto, def.tipo ?? tipoPorNombre(def.nombre ?? nombrePorDefecto));
  o.en(def.x ?? 0, def.y ?? 0);
  o.transformacion.rotacion = def.rotacion ?? 0;
  if (def.escala !== undefined) o.transformacion.escala.x = o.transformacion.escala.y = def.escala;

  if (def.sprite) {
    const s = o.agregar(new Sprite());
    const { voltear, imagen, ...resto } = def.sprite;
    Object.assign(s, resto, { imagen: imagen ?? null, voltearX: voltear ?? false });
  }
  if (def.colision) {
    const c = o.agregar(new Colision());
    c.ancho = def.colision.ancho ?? null;
    c.alto = def.colision.alto ?? null;
    c.solido = def.colision.solido ?? true;
    c.desplazamiento.x = def.colision.desplazamientoX ?? 0;
    c.desplazamiento.y = def.colision.desplazamientoY ?? 0;
    c.soloDesdeArriba = def.colision.soloDesdeArriba ?? false;
  }
  if (def.recorrido && def.recorrido.puntos.length) {
    const r = o.agregar(new Recorrido());
    r.puntos = def.recorrido.puntos.map((p) => new Vector2(p.x, p.y));
    r.rapidez = def.recorrido.rapidez ?? 100;
    r.modo = def.recorrido.modo ?? 'idaYVuelta';
    r.pausa = def.recorrido.pausa ?? 0.5;
  }
  if (def.fisica) {
    const f = o.agregar(new Fisica());
    f.gravedad = def.fisica.gravedad ?? 1;
    f.estatico = def.fisica.estatico ?? false;
    f.rozamiento = def.fisica.rozamiento ?? f.rozamiento;
    f.rebote = def.fisica.rebote ?? 0;
    f.masa = def.fisica.masa ?? 1;
  }
  if (def.mapa) {
    const m = o.agregar(new MapaCasillas());
    m.tamano = def.mapa.tamano;
    m.capa = def.mapa.capa ?? -1;
    m.tipos = def.mapa.tipos;
    for (const [clave, tipo] of Object.entries(def.mapa.celdas)) m.celdas.set(clave, tipo);
  }
  if (def.sprite && (def.animacion || Object.keys(proyecto.animaciones).length)) {
    const a = o.agregar(new Animador());
    a.animaciones = proyecto.animaciones;
    if (def.animacion) a.reproducir(def.animacion);
  }
  for (const [nombre, valor] of Object.entries(def.propiedades ?? {})) {
    o.propiedades.set(normalizar(nombre), { valor, original: nombre });
  }
  return o;
}

/** Por defecto, los avisos se escriben en la consola de la página. */
function avisosEnConsola(avisos: Diagnostico[]): void {
  for (const a of avisos) escribirEnConsola(formatearDiagnostico(a), 'aviso');
}
