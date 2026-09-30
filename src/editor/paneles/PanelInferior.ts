/**
 * PANEL DE ABAJO, con tres pestañas:
 *
 *   - CONSOLA: lo que escribe mostrar(), los errores del juego en marcha y
 *     los avisos. Cada error lleva el archivo y la línea: al hacer clic, el
 *     editor salta allí. Si el mismo error pasa muchas veces (por ejemplo, en
 *     50 copias de una plantilla), sale UNA vez con "×50".
 *   - PROBLEMAS: los errores y avisos de TODOS los scripts, revisados
 *     mientras escribes (sin tener que pulsar Ejecutar).
 *   - GUÍA: toda la documentación de Chispa, con buscador.
 *   - DEPURAR: dónde está parado el juego y lo que valen las variables.
 */
import { DOC_ESPECIALES, DOC_EVENTOS, DOC_FUNCIONES, DOC_MODULOS, DOC_OBJETO, DOC_PALABRAS, DOC_VALORES, RECETAS, type Doc, type Receta } from '../../chispa/api/documentacion';
import { explicarPila, type Diagnostico } from '../../chispa/errores/ErrorChispa';
import { revisarProyecto } from '../../proyecto/Revision';
import { normalizar } from '../../utilidades/texto';
import type { EstadoEditor } from '../estado/EstadoEditor';
import { botonIcono, h, icono, rellenar } from '../interfaz/dom';
import { notificar } from '../interfaz/dialogos';

type Pestana = 'consola' | 'problemas' | 'guia' | 'depurar';
type IrA = (archivo: string, linea: number, columna: number) => void;

const MAXIMO_MENSAJES = 500;

interface Entrada {
  elemento: HTMLElement;
  contador?: HTMLElement;
  veces: number;
}

export class PanelInferior {
  readonly elemento: HTMLElement;
  private pestana: Pestana = 'consola';
  private pestanas = h('div', { class: 'pestanas-panel' });
  private consola = h('div', { class: 'consola-editor', role: 'log', 'aria-live': 'polite' });
  private problemas = h('div', { class: 'lista-problemas' });
  private guia = h('div', { class: 'guia' });
  private entradas = new Map<string, Entrada>();
  private numeroProblemas = { errores: 0, avisos: 0 };
  private temporizador = 0;
  private busqueda = '';
  /** Qué hacer con una orden escrita en la línea de abajo de la consola (la pone la aplicación). */
  alOrden: (codigo: string) => void = () => {};
  private ordenes: string[] = [];
  private posOrden = 0;
  private lineaOrden = h('input', {
    class: 'orden-consola',
    type: 'text',
    spellcheck: 'false',
    placeholder: '› Escribe una orden y pulsa Intro mientras juegas. Ejemplo: juego.vidas = 99',
    'aria-label': 'Orden para el juego en marcha',
    onkeydown: (e: KeyboardEvent) => this.teclaOrden(e),
  });
  /** Se llama cuando cambian los problemas (para desactivar Ejecutar si hay errores). */
  alCambiarProblemas: (errores: number) => void = () => {};

  /** ¿Está el juego parado en un punto de parada? (la pestaña Depurar se marca) */
  private parado = false;

  constructor(
    private estado: EstadoEditor,
    private irA: IrA,
    /** El contenido de la pestaña Depurar (el PanelDepurador). */
    private depurar: HTMLElement = h('div'),
  ) {
    this.elemento = h('div', { class: 'panel-inferior' }, this.pestanas, this.consola, this.lineaOrden, this.problemas, this.guia, this.depurar);
    estado.alCambiar((c) => {
      if (c === 'codigo' || c === 'scripts' || c === 'objetos' || c === 'proyecto' || c === 'recursos' || c === 'escena' || c === 'archivos') this.revisarLuego();
    });
    this.dibujarPestanas();
    this.dibujarGuia();
    this.revisar();
    this.info('¡Bienvenido a Chispa! Pulsa ▶ Ejecutar para probar el juego. Lo que escribas con mostrar() saldrá aquí.');
  }

  mostrarPestana(p: Pestana): void {
    this.pestana = p;
    this.dibujarPestanas();
    if (p === 'guia') this.guia.querySelector<HTMLInputElement>('input')?.focus();
  }

  private dibujarPestanas(): void {
    const { errores, avisos } = this.numeroProblemas;
    const pestana = (p: Pestana, ic: string, texto: string, contador?: HTMLElement | null) =>
      h('button', { class: `pestana-panel ${this.pestana === p ? 'activa' : ''}`, onclick: () => this.mostrarPestana(p) }, icono(ic, 15), texto, contador);
    rellenar(this.pestanas,
      pestana('consola', 'consola', 'Consola'),
      pestana('problemas', 'aviso', 'Problemas',
        errores || avisos ? h('span', { class: `contador ${errores ? 'error' : 'aviso'}` }, String(errores || avisos)) : null),
      pestana('guia', 'ayuda', 'Guía'),
      pestana('depurar', 'pausa', 'Depurar', this.parado ? h('span', { class: 'contador parado', title: 'El juego está parado en un punto de parada' }, '●') : null),
      h('span', { class: 'espacio' }),
      this.pestana === 'consola' ? botonIcono('basura', 'Limpiar la consola', () => this.limpiar(), undefined, 'pequeno') : null,
    );
    this.consola.hidden = this.pestana !== 'consola';
    this.lineaOrden.hidden = this.pestana !== 'consola';
    this.problemas.hidden = this.pestana !== 'problemas';
    this.guia.hidden = this.pestana !== 'guia';
    this.depurar.hidden = this.pestana !== 'depurar';
  }

  /** El juego se ha parado en un punto de parada (o ha seguido). */
  avisarParada(parado: boolean): void {
    this.parado = parado;
    if (parado) this.mostrarPestana('depurar');
    else this.dibujarPestanas();
  }

  // ═════════════════════════ Consola ═════════════════════════

  private agregar(el: HTMLElement): void {
    const abajo = this.consola.scrollHeight - this.consola.scrollTop - this.consola.clientHeight < 30;
    this.consola.append(el);
    while (this.consola.childElementCount > MAXIMO_MENSAJES) this.consola.firstElementChild?.remove();
    if (abajo) this.consola.scrollTop = this.consola.scrollHeight;
  }

  /** Lo que escribe mostrar(). */
  mostrar(texto: string): void {
    this.agregar(h('div', { class: 'mensaje normal' }, h('span', { class: 'prompt' }, '›'), h('span', { class: 'texto' }, texto)));
  }

  info(texto: string): void {
    this.agregar(h('div', { class: 'mensaje info' }, icono('info', 14), h('span', { class: 'texto' }, texto)));
  }

  /** Un error o aviso con su archivo y línea (clic = ir allí). `veces` > 1 actualiza el contador. */
  diagnostico(d: Diagnostico, veces = 1): void {
    const clave = `${d.gravedad}:${d.archivo}:${d.pos.linea}:${d.mensaje}`;
    const existente = this.entradas.get(clave);
    if (existente && this.consola.contains(existente.elemento) && veces > 1) {
      existente.veces = veces;
      if (existente.contador) existente.contador.textContent = `×${veces}`;
      existente.contador?.removeAttribute('hidden');
      return;
    }
    const el = this.tarjeta(d, true);
    const contador = el.querySelector<HTMLElement>('.veces') ?? undefined;
    this.entradas.set(clave, { elemento: el, contador, veces });
    this.agregar(el);
    if (d.gravedad === 'error' && this.pestana !== 'consola') this.mostrarPestana('consola');
  }

  /** La tarjeta de un error o aviso (en la consola y en Problemas). */
  private tarjeta(d: Diagnostico, conContador: boolean): HTMLElement {
    const codigo = d.archivo ? this.estado.proyecto.scripts[d.archivo]?.split('\n')[d.pos.linea - 1] : undefined;
    const ir = () => d.archivo && this.irA(d.archivo, d.pos.linea, d.pos.columna);
    return h('div', { class: `mensaje ${d.gravedad}`, role: 'button', tabindex: '0', title: d.archivo ? 'Clic para ir a esta línea' : undefined, onclick: ir, onkeydown: (e: KeyboardEvent) => e.key === 'Enter' && ir() },
      icono(d.gravedad === 'error' ? 'error' : 'aviso', 15),
      h('div', { class: 'contenido' },
        h('div', { class: 'donde' },
          h('strong', {}, d.gravedad === 'error' ? 'Error' : 'Aviso'),
          d.archivo ? h('span', { class: 'enlace' }, `${d.archivo} · línea ${d.pos.linea}`) : h('span', {}, `línea ${d.pos.linea}`),
          conContador ? h('span', { class: 'veces', hidden: true }, '×1') : null,
        ),
        codigo !== undefined && codigo.trim()
          ? h('pre', { class: 'codigo-error' }, h('span', { class: 'num' }, String(d.pos.linea)), ' ', codigo.trimEnd())
          : null,
        h('div', { class: 'explicacion' }, d.mensaje.charAt(0).toUpperCase() + d.mensaje.slice(1)),
        ...explicarPila(d.pila).map((f) => h('div', { class: 'pila' }, f)),
        d.pista ? h('div', { class: 'pista' }, '💡 ', d.pista) : null,
      ),
    );
  }

  /** Intro ejecuta la orden; las flechas arriba y abajo recorren las anteriores. */
  private teclaOrden(e: KeyboardEvent): void {
    const campo = this.lineaOrden;
    if (e.key === 'Enter' && campo.value.trim()) {
      const codigo = campo.value.trim();
      if (this.ordenes[this.ordenes.length - 1] !== codigo) this.ordenes.push(codigo);
      this.posOrden = this.ordenes.length;
      campo.value = '';
      this.agregar(h('div', { class: 'mensaje orden' }, h('span', { class: 'prompt' }, '»'), h('span', { class: 'texto' }, codigo)));
      this.alOrden(codigo);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.posOrden = Math.max(0, Math.min(this.ordenes.length, this.posOrden + (e.key === 'ArrowUp' ? -1 : 1)));
      campo.value = this.ordenes[this.posOrden] ?? '';
    }
  }

  limpiar(): void {
    this.consola.replaceChildren();
    this.entradas.clear();
  }

  // ═════════════════════════ Problemas (revisión en vivo) ═════════════════════════

  private revisarLuego(): void {
    clearTimeout(this.temporizador);
    this.temporizador = window.setTimeout(() => this.revisar(), 500);
  }

  /** Revisa todos los scripts. Devuelve el número de errores. */
  revisar(): number {
    const r = revisarProyecto(this.estado.proyecto);
    const todos = [...r.porArchivo.values()].flat();
    const errores = todos.filter((d) => d.gravedad === 'error');
    const avisos = todos.filter((d) => d.gravedad === 'aviso');
    this.numeroProblemas = { errores: errores.length, avisos: avisos.length };
    rellenar(this.problemas,
      todos.length
        ? [...errores, ...avisos].map((d) => this.tarjeta(d, false))
        : h('p', { class: 'nota todo-bien' }, icono('estrella', 15), ' Ningún problema en tus scripts.'),
    );
    this.dibujarPestanas();
    this.alCambiarProblemas(errores.length);
    return errores.length;
  }

  // ═════════════════════════ Guía ═════════════════════════

  private dibujarGuia(): void {
    const buscador = h('input', { type: 'search', class: 'campo buscador', placeholder: 'Buscar en la guía: mover, tecla, sonido, crear...', value: this.busqueda, spellcheck: 'false' });
    const resultados = h('div', { class: 'resultados-guia' });
    const pintar = () => {
      const q = normalizar(this.busqueda.trim());
      const coincide = (d: Doc) => !q || [d.nombre, d.firma, d.descripcion].some((t) => normalizar(t).includes(q));
      const grupos: [string, Doc[]][] = [
        ['Palabras del lenguaje', DOC_PALABRAS],
        ['Eventos (cuando…)', DOC_EVENTOS],
        ['Funciones', DOC_FUNCIONES],
        ['Variables especiales', DOC_ESPECIALES],
        ['Objetos (yo.…, otro.…)', DOC_OBJETO],
        ...DOC_MODULOS.map((m): [string, Doc[]] => [`${m.nombre} — ${m.descripcion}`, m.miembros]),
        ...DOC_VALORES.map((v): [string, Doc[]] => [`${v.tipo} — ${v.descripcion}`, v.miembros]),
      ];
      // Primero las recetas («¿cómo hago...?»): es lo que más se busca al empezar
      const recetas = RECETAS.filter((r) => !q || [r.titulo, r.descripcion, r.codigo].some((t) => normalizar(t).includes(q)));
      const bloqueRecetas = recetas.length ? h('section', { class: 'grupo-guia recetas' }, h('h3', {}, 'Recetas: ¿cómo hago...?'), recetas.map((r) => this.receta(r))) : null;
      const bloques = grupos
        .map(([titulo, docs]) => [titulo, docs.filter(coincide)] as const)
        .filter(([, docs]) => docs.length)
        .map(([titulo, docs]) => h('section', { class: 'grupo-guia' }, h('h3', {}, titulo), docs.map((d) => this.ficha(d))));
      const todo = [bloqueRecetas, ...bloques].filter((b): b is HTMLElement => !!b);
      rellenar(resultados, todo.length ? todo : h('p', { class: 'nota' }, `No encuentro "${this.busqueda}". Prueba con otra palabra.`));
    };
    buscador.addEventListener('input', () => {
      this.busqueda = buscador.value;
      pintar();
    });
    pintar();
    rellenar(this.guia, h('div', { class: 'cabecera-guia' }, icono('lupa', 16), buscador), resultados);
  }

  private receta(r: Receta): HTMLElement {
    return h('article', { class: 'ficha-guia receta' },
      h('strong', { class: 'titulo-receta' }, r.titulo),
      h('p', {}, r.descripcion),
      h('div', { class: 'ejemplo' },
        h('pre', {}, r.codigo),
        botonIcono('copiar', 'Copiar el código', () => {
          navigator.clipboard?.writeText(r.codigo).then(() => notificar('Código copiado: pégalo en tu script con Ctrl+V', 'ok'), () => notificar('No he podido copiar', 'error'));
        }, undefined, 'pequeno copiar-ejemplo'),
      ),
    );
  }

  private ficha(d: Doc): HTMLElement {
    return h('article', { class: 'ficha-guia' },
      h('code', { class: 'ficha-firma' }, d.firma),
      h('p', {}, d.descripcion),
      h('div', { class: 'ejemplo' },
        h('pre', {}, d.ejemplo),
        botonIcono('copiar', 'Copiar el ejemplo', () => {
          navigator.clipboard?.writeText(d.ejemplo).then(() => notificar('Ejemplo copiado', 'ok'), () => notificar('No he podido copiar', 'error'));
        }, undefined, 'pequeno copiar-ejemplo'),
      ),
    );
  }

  /** Busca algo en la guía y la abre (desde el botón Ayuda). */
  buscarEnGuia(texto: string): void {
    this.busqueda = texto;
    this.dibujarGuia();
    this.mostrarPestana('guia');
  }
}
