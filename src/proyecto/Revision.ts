/**
 * REVISIÓN DEL PROYECTO: compila y analiza TODOS los scripts sin ejecutar nada.
 *
 * Devuelve todos los errores y avisos de todos los archivos a la vez. La usan:
 *   - JuegoEnMarcha, antes de empezar (si hay errores, no se ejecuta);
 *   - el editor, mientras escribes (para subrayar en rojo y en amarillo).
 */
import { analizar } from '../chispa/analisis/analizador';
import { DatosJuego, instalarAPIMotor, type ContextoJuego } from '../chispa/api/motor';
import { ErrorChispa, ErrorCompilacion, type Diagnostico } from '../chispa/errores/ErrorChispa';
import type { Entorno } from '../chispa/ejecucion/entorno';
import { Interprete } from '../chispa/ejecucion/interprete';
import type { Programa } from '../chispa/sintaxis/ast';
import { analizarSintaxis } from '../chispa/sintaxis/parser';
import { nombresDeObjetos, type DefProyecto } from './formato';

export interface ResultadoRevision {
  /** Árbol de cada script que se ha podido leer (aunque tenga errores de análisis). */
  programas: Map<string, Programa>;
  /** Todos los diagnósticos (errores y avisos) de cada archivo. */
  porArchivo: Map<string, Diagnostico[]>;
  /** Solo los errores, como ErrorChispa (con archivo y código). */
  errores: ErrorChispa[];
  /** Solo los avisos. */
  avisos: Diagnostico[];
}

let globalesCacheadas: Entorno | null = null;

/**
 * Las globales de la API (mostrar, teclado, crear...) sin necesidad de un
 * juego en marcha. La API no toca el motor hasta que se USA una función.
 */
export function globalesDelMotor(): Entorno {
  if (!globalesCacheadas) {
    const interprete = new Interprete();
    instalarAPIMotor(interprete, {} as ContextoJuego, new DatosJuego());
    globalesCacheadas = interprete.globales;
  }
  return globalesCacheadas;
}

export function revisarProyecto(proyecto: DefProyecto, globales: Entorno = globalesDelMotor()): ResultadoRevision {
  const r: ResultadoRevision = { programas: new Map(), porArchivo: new Map(), errores: [], avisos: [] };
  const contexto = {
    globales,
    esScript: true,
    plantillas: Object.keys(proyecto.plantillas),
    imagenes: Object.keys(proyecto.imagenes),
    sonidos: Object.keys(proyecto.sonidos ?? {}),
    escenas: Object.keys(proyecto.escenas),
    animaciones: Object.keys(proyecto.animaciones),
    objetosEscena: nombresDeObjetos(proyecto),
  };

  for (const [archivo, codigo] of Object.entries(proyecto.scripts)) {
    const { programa, errores } = analizarSintaxis(codigo, archivo);
    const diagnosticos: Diagnostico[] = errores.map((e) => e.diagnostico());
    r.errores.push(...errores);
    // Solo analizamos si se ha podido leer entero (si no, saldrían errores falsos)
    if (errores.length === 0) {
      r.programas.set(archivo, programa);
      for (const d of analizar(programa, contexto)) {
        diagnosticos.push(d);
        if (d.gravedad === 'aviso') r.avisos.push(d);
        else r.errores.push(new ErrorChispa(d.pos, d.mensaje, d.pista).conArchivo(archivo, programa.lineas));
      }
    }
    r.porArchivo.set(archivo, diagnosticos);
  }
  return r;
}

/** Lanza un ErrorCompilacion con todos los errores, si los hay. */
export function comprobarRevision(r: ResultadoRevision): void {
  if (r.errores.length) throw new ErrorCompilacion(r.errores);
}
