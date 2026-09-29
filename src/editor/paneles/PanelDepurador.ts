/**
 * PANEL «DEPURAR» (abajo): cuando el juego se para en un punto de parada,
 * enseña dónde está parado, los botones para seguir y las variables con sus
 * valores. Si no está parado, explica cómo poner un punto de parada.
 */
import type { Depurador, VariableVista } from '../../chispa/ejecucion/depurador';
import type { Entorno } from '../../chispa/ejecucion/entorno';
import { botonIcono, h, icono, rellenar } from '../interfaz/dom';

export class PanelDepurador {
  readonly elemento = h('div', { class: 'panel-depurador' });

  constructor(
    private depurador: Depurador,
    /** Las variables globales del juego en marcha (para no enseñarlas: son las del motor). */
    private globales: () => Entorno | null,
    /** Ir a una línea de un script (al hacer clic en un punto de parada de la lista). */
    private irA: (archivo: string, linea: number) => void,
  ) {
    this.dibujar();
  }

  dibujar(): void {
    const d = this.depurador;
    const p = d.parada;
    const g = this.globales();
    const botones = h('div', { class: 'botones-depuracion' },
      botonIcono('reproducir', 'Continuar hasta el siguiente punto de parada (F8)', () => d.continuar(), 'Continuar', 'principal'),
      botonIcono('abajo', 'Ejecutar esta línea y parar en la siguiente (F10)', () => d.siguienteLinea(), 'Siguiente línea'),
      botonIcono('entrar', 'Si esta línea llama a una función tuya, entrar en ella y parar en su primera línea (F11)', () => d.entrar(), 'Entrar en función'),
    );
    for (const b of botones.querySelectorAll('button')) b.disabled = !p;

    const estado = p
      ? h('div', { class: 'estado-depuracion parado' }, icono('pausa', 16),
          h('span', {}, 'Parado en ', h('strong', {}, `${p.archivo} · línea ${p.linea}`), ` (el objeto ${p.objeto}). La línea resaltada en amarillo es la siguiente que se va a ejecutar.`))
      : h('div', { class: 'estado-depuracion' }, icono('info', 16),
          h('span', {}, 'Para parar el juego en una línea, haz clic en su ', h('strong', {}, 'número'), ' en el código: sale un punto rojo. Al pulsar Ejecutar, el juego se para justo antes de esa línea y aquí verás lo que valen las variables.'));

    rellenar(this.elemento,
      estado,
      botones,
      p && g ? this.tablaVariables(d.variables(g)) : null,
      this.listaPuntos(),
    );
  }

  private tablaVariables(filas: VariableVista[]): HTMLElement {
    if (!filas.length) return h('p', { class: 'nota' }, 'No hay variables que ver en esta línea.');
    const grupos = [...new Set(filas.map((f) => f.grupo))];
    const titulos: Record<string, string> = { 'Aquí': 'Variables de aquí', 'Más fuera': 'Variables de los bloques de fuera', 'Del script': 'Variables del script', yo: 'El objeto (yo)', juego: 'Datos del juego (juego)' };
    return h('div', { class: 'variables-depuracion' },
      grupos.map((grupo) =>
        h('section', {},
          h('h4', {}, titulos[grupo] ?? grupo),
          h('table', {}, filas.filter((f) => f.grupo === grupo).map((f) => h('tr', {}, h('td', { class: 'nombre' }, f.nombre), h('td', { class: 'valor' }, f.valor)))),
        ),
      ),
    );
  }

  private listaPuntos(): HTMLElement | null {
    const todos = this.depurador.todosLosPuntos();
    if (!todos.length) return null;
    return h('div', { class: 'lista-puntos-parada' },
      h('h4', {}, 'Puntos de parada'),
      todos.map(({ archivo, linea }) =>
        h('div', { class: 'fila-punto' },
          h('span', { class: 'punto-parada' }),
          h('button', { class: 'boton-enlace', onclick: () => this.irA(archivo, linea) }, `${archivo} · línea ${linea}`),
        ),
      ),
    );
  }
}
