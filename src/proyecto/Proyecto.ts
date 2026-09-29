/**
 * PROYECTO: la descripción completa de un juego en un objeto JSON.
 *
 * DECISIÓN: todo el juego (escena, plantillas, imágenes y el CÓDIGO de los
 * scripts) cabe en un solo JSON. Así:
 *   - El editor de la Fase 4 podrá guardarlo y cargarlo tal cual.
 *   - Exportar el juego (Fase 5) será meter este JSON dentro de una página.
 *
 * "plantillas" son como los Prefabs de Unity o los modelos de ReplicatedStorage
 * en Roblox: objetos que no están en la escena pero que se pueden clonar con
 * crear("Nombre").
 */
import { compilar } from '../chispa/sintaxis/parser';
import { DatosJuego, instalarAPIMotor, type ContextoJuego } from '../chispa/api/motor';
import { Interprete } from '../chispa/ejecucion/interprete';
import { ScriptChispa } from '../chispa/ScriptChispa';
import type { Programa } from '../chispa/sintaxis/ast';
import { ErrorMotor } from '../motor/Errores';
import { escribirEnConsola, limpiarConsola } from '../motor/Consola';
import type { Motor } from '../motor/Motor';
import { Escena } from '../objetos/Escena';
import { ObjetoJuego } from '../objetos/ObjetoJuego';
import { Colision } from '../objetos/componentes/Colision';
import { Fisica } from '../objetos/componentes/Fisica';
import { Sprite, type FormaSprite } from '../objetos/componentes/Sprite';
import { normalizar } from '../utilidades/texto';

// ───────────────────────── Formato ─────────────────────────

export interface DefSprite {
  imagen?: string;
  forma?: FormaSprite;
  color?: string;
  ancho?: number;
  alto?: number;
  capa?: number;
  visible?: boolean;
  opacidad?: number;
  fijo?: boolean;
  texto?: string;
  tamano?: number;
  alinear?: 'izquierda' | 'centro' | 'derecha';
}

export interface DefColision {
  ancho?: number;
  alto?: number;
  solido?: boolean;
  desplazamientoX?: number;
  desplazamientoY?: number;
}

export interface DefFisica {
  gravedad?: number;
  estatico?: boolean;
}

export interface DefObjeto {
  nombre?: string;
  tipo?: string;
  x?: number;
  y?: number;
  rotacion?: number;
  escala?: number;
  sprite?: DefSprite;
  colision?: DefColision;
  fisica?: DefFisica;
  /** Nombre de un script de `proyecto.scripts`. */
  script?: string;
}

export interface DefProyecto {
  formato: 'chispa-proyecto';
  version: 1;
  nombre: string;
  ancho: number;
  alto: number;
  colorFondo: string;
  pixelArt?: boolean;
  /** nombre corto → ruta del archivo */
  imagenes: Record<string, string>;
  /** nombre corto → ruta del archivo de sonido (.mp3, .ogg, .wav) */
  sonidos?: Record<string, string>;
  /** nombre del archivo (.chs) → código */
  scripts: Record<string, string>;
  plantillas: Record<string, DefObjeto>;
  /** Objetos que hay en la escena al empezar. */
  escena: DefObjeto[];
}

// ───────────────────────── Juego en marcha ─────────────────────────

export interface OpcionesJuego {
  /** Qué hacer con mostrar(). Por defecto, la consola de la página. */
  alMostrar?: (texto: string) => void;
}

export class JuegoEnMarcha implements ContextoJuego {
  readonly escena: Escena;
  readonly interprete = new Interprete();
  private datos = new DatosJuego();
  private programas = new Map<string, Programa>();
  private reinicioPendiente = false;

  private constructor(
    readonly motor: Motor,
    readonly proyecto: DefProyecto,
    opciones: OpcionesJuego = {},
  ) {
    this.escena = new Escena(motor);
    this.interprete.alMostrar = opciones.alMostrar ?? escribirEnConsola;
    this.interprete.nombresDeObjetos = () => [...new Set(this.escena.objetos.map((o) => o.nombre))];
    instalarAPIMotor(this.interprete, this, this.datos);
  }

  /** Carga imágenes, comprueba TODOS los scripts, monta la escena y arranca. */
  static async arrancar(motor: Motor, proyecto: DefProyecto): Promise<JuegoEnMarcha> {
    await motor.recursos.cargarImagenes(proyecto.imagenes);
    for (const [nombre, ruta] of Object.entries(proyecto.sonidos ?? {})) await motor.sonido.cargar(nombre, ruta);
    const juego = JuegoEnMarcha.preparar(motor, proyecto);
    motor.iniciar();
    return juego;
  }

  /**
   * Monta el juego SIN cargar archivos ni arrancar el bucle.
   * Lo usan los tests (que avanzan los fotogramas a mano) y lo usará el editor.
   */
  static preparar(motor: Motor, proyecto: DefProyecto, opciones: OpcionesJuego = {}): JuegoEnMarcha {
    const juego = new JuegoEnMarcha(motor, proyecto, opciones);
    // Compilamos todos los scripts al principio: así un error de escritura
    // sale nada más pulsar Ejecutar, y no a los 5 minutos de partida.
    for (const [archivo, codigo] of Object.entries(proyecto.scripts)) juego.programas.set(archivo, compilar(codigo, archivo));
    motor.colorFondo = proyecto.colorFondo;
    motor.escena = juego.escena;
    motor.alActualizar((dt) => juego.antesDelFotograma(dt));
    juego.construir();
    return juego;
  }

  /** Crea los objetos de la escena desde cero. */
  private construir(): void {
    this.escena.vaciar();
    this.datos.limpiar();
    limpiarConsola();
    // Primero creamos todos y DESPUÉS los iniciamos: así en "cuando empieza"
    // cualquier script puede buscar("...") a otro objeto de la escena.
    for (const def of this.proyecto.escena) this.instanciar(def, def.nombre ?? def.tipo ?? 'Objeto');
    this.escena.iniciar();
  }

  private antesDelFotograma(dt: number): void {
    this.interprete.globales.declarar('delta', dt);
    if (this.reinicioPendiente) {
      this.reinicioPendiente = false;
      this.construir();
    }
  }

  pedirReinicio(): void {
    // No reiniciamos en mitad de un script: lo hacemos al principio del siguiente fotograma.
    this.reinicioPendiente = true;
  }

  crearDesdePlantilla(nombre: string, x: number | null, y: number | null): ObjetoJuego {
    const n = normalizar(nombre);
    const clave = Object.keys(this.proyecto.plantillas).find((k) => normalizar(k) === n);
    if (!clave) {
      const hay = Object.keys(this.proyecto.plantillas);
      throw new ErrorMotor(
        `No existe ninguna plantilla llamada "${nombre}".`,
        hay.length ? `Las plantillas que hay son: ${hay.join(', ')}.` : 'Este proyecto no tiene plantillas todavía.',
      );
    }
    const def = this.proyecto.plantillas[clave];
    // La posición se pasa ANTES de meterlo en la escena, para que su
    // "cuando empieza" ya vea el objeto en su sitio.
    return this.instanciar({ ...def, x: x ?? def.x, y: y ?? def.y }, clave);
  }

  /** Convierte una definición JSON en un ObjetoJuego con sus componentes. */
  private instanciar(def: DefObjeto, nombrePorDefecto: string): ObjetoJuego {
    const o = new ObjetoJuego(def.nombre ?? nombrePorDefecto, def.tipo ?? nombrePorDefecto);
    o.en(def.x ?? 0, def.y ?? 0);
    o.transformacion.rotacion = def.rotacion ?? 0;
    if (def.escala !== undefined) o.transformacion.escala.x = o.transformacion.escala.y = def.escala;

    if (def.sprite) {
      const s = o.agregar(new Sprite());
      Object.assign(s, { ...def.sprite, imagen: def.sprite.imagen ?? null });
      if (s.imagen) this.motor.recursos.imagen(s.imagen); // comprueba que existe
    }
    if (def.colision) {
      const c = o.agregar(new Colision());
      c.ancho = def.colision.ancho ?? null;
      c.alto = def.colision.alto ?? null;
      c.solido = def.colision.solido ?? true;
      c.desplazamiento.x = def.colision.desplazamientoX ?? 0;
      c.desplazamiento.y = def.colision.desplazamientoY ?? 0;
    }
    if (def.fisica) {
      const f = o.agregar(new Fisica());
      f.gravedad = def.fisica.gravedad ?? 1;
      f.estatico = def.fisica.estatico ?? false;
    }
    if (def.script) {
      const programa = this.programas.get(def.script);
      if (!programa) {
        throw new ErrorMotor(
          `El objeto "${o.nombre}" usa el script "${def.script}", pero ese script no existe en el proyecto.`,
          `Los scripts que hay son: ${Object.keys(this.proyecto.scripts).join(', ') || 'ninguno'}.`,
        );
      }
      o.agregar(new ScriptChispa(this.interprete, programa));
    }
    // agregar() a la escena al final: si la escena ya está en marcha, esto
    // arranca el script (y lanza su "cuando empieza") con todo ya montado.
    return this.escena.agregar(o);
  }
}
