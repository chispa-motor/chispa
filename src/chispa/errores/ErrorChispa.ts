/**
 * ERRORES DE CHISPA
 *
 * Regla de oro: cada error dice (1) dónde está (línea y columna), (2) qué
 * pasa, con palabras normales, y (3) cómo arreglarlo. Nada de
 * "unexpected token" ni "undefined".
 *
 * Todos los errores de las tres etapas (léxico, sintaxis y ejecución) son
 * ErrorChispa. Como hereda de ErrorMotor, el motor sabe mostrarlos.
 */
import { ErrorMotor } from '../../motor/Errores';
import type { Posicion } from '../lexico/tokens';

export class ErrorChispa extends ErrorMotor {
  constructor(
    readonly posicion: Posicion,
    mensaje: string,
    pista?: string,
  ) {
    super(`Línea ${posicion.linea}: ${mensaje}`, pista, {
      linea: posicion.linea,
      columna: posicion.columna,
      longitud: posicion.longitud,
    });
    this.name = 'ErrorChispa';
  }

  get linea(): number {
    return this.posicion.linea;
  }

  /** Añade el archivo y el texto de la línea (lo sabe quien tiene el código fuente). */
  conArchivo(archivo: string, lineasCodigo: string[]): this {
    if (!this.ubicacion.archivo) {
      this.ubicacion.archivo = archivo;
      this.ubicacion.codigo = lineasCodigo[this.linea - 1];
    }
    return this;
  }
}
