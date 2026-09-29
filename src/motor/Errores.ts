/**
 * Errores del motor, en español y con pista para arreglarlos.
 *
 * Todo error "nuestro" es un ErrorMotor con:
 *   - mensaje:  qué ha pasado.
 *   - pista:    cómo arreglarlo.
 *   - ubicación (opcional): archivo, línea y el código de esa línea.
 *     Los errores del lenguaje Chispa (Fase 3) la rellenan.
 */
export interface Ubicacion {
  archivo?: string;
  linea?: number;
  /** El texto de la línea donde está el error, para enseñarlo. */
  codigo?: string;
}

export class ErrorMotor extends Error {
  constructor(
    mensaje: string,
    public pista?: string,
    public ubicacion: Ubicacion = {},
  ) {
    super(mensaje);
    this.name = 'ErrorMotor';
  }
}

/**
 * Muestra un error en un panel encima del juego.
 * Si el error NO es nuestro (un fallo interno de JavaScript), lo explicamos
 * igualmente en español y dejamos el detalle técnico en la consola (F12).
 */
export function mostrarError(error: unknown): void {
  const panel = document.getElementById('panel-error');
  console.error(error);
  if (!panel) return;

  let titulo = '¡Vaya! Algo ha fallado';
  let mensaje: string;
  let pista: string | undefined;
  let ubicacion: Ubicacion = {};

  if (error instanceof ErrorMotor) {
    mensaje = error.message;
    pista = error.pista;
    ubicacion = error.ubicacion;
    if (ubicacion.archivo) titulo = `Error en tu código · ${ubicacion.archivo}`;
  } else {
    titulo = 'Error interno del motor';
    mensaje = 'Ha ocurrido un error inesperado dentro del propio motor (no es culpa de tu juego).';
    pista = 'Abre la consola del navegador (tecla F12) para ver el detalle técnico.';
  }

  // Usamos textContent (y no innerHTML) para que ningún texto se interprete como HTML.
  panel.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = titulo;
  panel.append(h);
  if (ubicacion.codigo !== undefined && ubicacion.linea !== undefined) {
    const pre = document.createElement('pre');
    pre.textContent = `${ubicacion.linea} │ ${ubicacion.codigo}`;
    panel.append(pre);
  }
  const p = document.createElement('p');
  p.textContent = mensaje;
  panel.append(p);
  if (pista) {
    const pp = document.createElement('p');
    pp.className = 'pista';
    pp.textContent = '💡 ' + pista;
    panel.append(pp);
  }
  panel.hidden = false;
}

export function ocultarError(): void {
  const panel = document.getElementById('panel-error');
  if (panel) panel.hidden = true;
}
