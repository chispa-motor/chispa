/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EDITOR DE BLOQUES: la vista al estilo Scratch de un script.
 *
 * A la izquierda, la paleta (por colores, como en Scratch). En el centro, los
 * bloques: se arrastran desde la paleta, se mueven arrastrando su cabecera,
 * se meten dentro de otros («si», «repetir», los eventos...) y se borran
 * arrastrándolos a la paleta o con su ✕. Los huecos blancos se escriben.
 *
 * Cada cambio vuelve a escribir el código del script (modelo.ts): el código
 * es lo que se guarda y lo que se ejecuta. «Ver el código» lo enseña al lado.
 */
import { h, icono, rellenar } from '../interfaz/dom';
import { analizarSintaxis } from '../../chispa/sintaxis/parser';
import { ACCIONES, DATOS_CON_BLOQUE, EVENTOS, accionPorId, aCodigo, datoPorObjetivo, type Accion, type Bloque, type ClaseEvento } from './modelo';

type Categoria = 'eventos' | 'control' | 'movimiento' | 'apariencia' | 'efectos' | 'sonido' | 'objetos' | 'variables' | 'funciones';

const CATEGORIAS: { id: Categoria; nombre: string; color: string }[] = [
  { id: 'eventos', nombre: 'Eventos', color: '#e6a817' },
  { id: 'control', nombre: 'Control', color: '#e08a1e' },
  { id: 'movimiento', nombre: 'Movimiento', color: '#4c8bf5' },
  { id: 'apariencia', nombre: 'Apariencia', color: '#9966ff' },
  { id: 'efectos', nombre: 'Efectos', color: '#e8590c' },
  { id: 'sonido', nombre: 'Sonido', color: '#cf63cf' },
  { id: 'objetos', nombre: 'Objetos', color: '#2eb872' },
  { id: 'variables', nombre: 'Variables', color: '#ff8c1a' },
  { id: 'funciones', nombre: 'Funciones', color: '#e6556b' },
];

/** De qué categoría (y color) es cada bloque. */
function categoriaDe(b: Bloque): Categoria {
  switch (b.tipo) {
    case 'evento':
      return 'eventos';
    case 'si':
    case 'mientras':
    case 'repetir':
    case 'paraCada':
    case 'romper':
    case 'continuar':
      return 'control';
    case 'accion':
      return accionPorId(b.accion)?.categoria ?? 'control';
    case 'funcion':
    case 'devolver':
      return 'funciones';
    case 'asignar':
      return datoPorObjetivo(b.objetivo)?.categoria ?? 'variables';
    default:
      return 'variables';
  }
}

/** Los bloques de la paleta de cada categoría (lo que se crea al arrastrarlos). */
function paleta(c: Categoria): Bloque[] {
  const acciones = (cat: Accion['categoria']): Bloque[] => ACCIONES.filter((a) => a.categoria === cat).map((a) => ({ tipo: 'accion', accion: a.id, campos: [...a.porDefecto] }));
  switch (c) {
    case 'eventos':
      return EVENTOS.map((e) => ({ tipo: 'evento', clase: e.clase, dato: e.dato?.porDefecto ?? '', cuerpo: [] }));
    case 'control':
      return [
        { tipo: 'si', ramas: [{ condicion: 'yo.x > 500', cuerpo: [] }], sino: null },
        { tipo: 'si', ramas: [{ condicion: 'juego.vidas > 0', cuerpo: [] }], sino: [] },
        { tipo: 'repetir', veces: '10', cuerpo: [] },
        { tipo: 'mientras', condicion: 'yo.y < 500', cuerpo: [] },
        { tipo: 'paraCada', variables: 'enemigo', coleccion: 'buscarTodos("Enemigo")', cuerpo: [] },
        ...acciones('control'),
        { tipo: 'romper' },
        { tipo: 'continuar' },
      ];
    case 'variables':
      return [
        { tipo: 'variable', nombre: 'puntos', valor: '0' },
        { tipo: 'asignar', objetivo: 'juego.puntos', operador: '+=', valor: '1' },
        { tipo: 'asignar', objetivo: 'yo.color', operador: '=', valor: '"rojo"' },
        { tipo: 'hacer', codigo: 'yo.ponerEtiqueta("enemigo")' },
        { tipo: 'nota', texto: 'Aquí explico lo que hace esto' },
      ];
    case 'funciones':
      return [
        { tipo: 'funcion', nombre: 'curar', parametros: 'cantidad', cuerpo: [] },
        { tipo: 'devolver', valor: 'yo.vida' },
        { tipo: 'hacer', codigo: 'curar(10)' },
      ];
    default:
      return [...acciones(c), ...DATOS_CON_BLOQUE.filter((d) => d.categoria === c).map((d): Bloque => ({ tipo: 'asignar', objetivo: d.objetivo, operador: '=', valor: d.valor }))];
  }
}

/** ¿Tiene cuerpos donde meter otros bloques? */
function cuerpos(b: Bloque): Bloque[][] {
  switch (b.tipo) {
    case 'evento':
    case 'funcion':
    case 'mientras':
    case 'repetir':
    case 'paraCada':
      return [b.cuerpo];
    case 'si':
      return [...b.ramas.map((r) => r.cuerpo), ...(b.sino ? [b.sino] : [])];
    default:
      return [];
  }
}

const OPERADORES: [string, string][] = [['=', '= (pasa a valer)'], ['+=', '+= (sumar)'], ['-=', '-= (restar)'], ['*=', '*= (multiplicar)'], ['/=', '/= (dividir)']];

type Arrastre = { tipo: 'nuevo'; bloque: Bloque } | { tipo: 'mover'; id: number };

export class EditorBloques {
  readonly elemento: HTMLElement;
  private bloques: Bloque[] = [];
  private siguienteId = 1;
  private categoria: Categoria = 'eventos';
  private paletaEl = h('div', { class: 'paleta-bloques' });
  private area = h('div', { class: 'area-bloques' });
  private codigoEl = h('pre', { class: 'codigo-de-bloques', hidden: true });
  /** Las listas que se ven (para saber dónde se suelta algo): el número va en data-lista. */
  private listas: Bloque[][] = [];
  private arrastre: Arrastre | null = null;
  private hueco = h('div', { class: 'hueco-soltar' });
  private pasado: string[] = [];
  private futuro: string[] = [];
  private temporizador = 0;
  private resaltado: number | null = null;
  private ultimaLineaDe = new Map<number, number>();

  constructor(private alCambiar: (codigo: string) => void) {
    const verCodigo = h('button', { class: 'boton-icono', title: 'Ver al lado el código que escriben los bloques', onclick: () => {
      this.codigoEl.hidden = !this.codigoEl.hidden;
      verCodigo.classList.toggle('activo', !this.codigoEl.hidden);
    } }, 'Ver el código');
    this.elemento = h('div', { class: 'editor-bloques', tabindex: '-1', onkeydown: (e: KeyboardEvent) => this.teclas(e) },
      this.paletaEl,
      h('div', { class: 'centro-bloques' },
        h('div', { class: 'barra-bloques' },
          h('span', { class: 'nota', title: 'Arrastra bloques desde la izquierda. Para borrar uno, arrástralo a la paleta (o usa su ✕). Ctrl+Z deshace.' }, 'Arrastra desde la izquierda · para borrar, a la paleta · Ctrl+Z deshace'),
          h('span', { class: 'espacio' }),
          verCodigo,
        ),
        this.area,
      ),
      this.codigoEl,
    );
    this.paletaEl.addEventListener('dragover', (e) => this.arrastre?.tipo === 'mover' && e.preventDefault());
    this.paletaEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const a = this.arrastre;
      if (a?.tipo === 'mover') this.cambiar(() => this.quitar(a.id));
      this.terminarArrastre();
    });
    this.dibujarPaleta();
  }

  /** Pone unos bloques (al abrir el script o si el código cambia desde fuera). */
  cargar(bloques: Bloque[]): void {
    this.bloques = bloques;
    this.numerar(this.bloques);
    this.pasado = [];
    this.futuro = [];
    this.dibujar();
  }

  /** Resalta el bloque de una línea del código (un error, el depurador). null = ninguno. */
  resaltarLinea(linea: number | null): void {
    this.resaltado = null;
    if (linea !== null) {
      let mejor = -1;
      for (const [id, l] of this.ultimaLineaDe) if (l <= linea && l > mejor) [mejor, this.resaltado] = [l, id];
    }
    this.area.querySelectorAll('.bloque.resaltado').forEach((el) => el.classList.remove('resaltado'));
    const el = this.resaltado !== null ? this.area.querySelector<HTMLElement>(`.bloque[data-id="${this.resaltado}"]`) : null;
    el?.classList.add('resaltado');
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  private numerar(bs: Bloque[]): void {
    for (const b of bs) {
      b.id = this.siguienteId++;
      cuerpos(b).forEach((c) => this.numerar(c));
    }
  }

  // ───────────────────────── Cambios ─────────────────────────

  /** Hace un cambio en los bloques, lo apunta para deshacer y reescribe el código. */
  private cambiar(fn: () => void, redibujar = true): void {
    this.pasado.push(JSON.stringify(this.bloques));
    if (this.pasado.length > 100) this.pasado.shift();
    this.futuro = [];
    fn();
    this.publicar();
    if (redibujar) this.dibujar();
  }

  private publicar(): void {
    const { codigo, lineaDe } = aCodigo(this.bloques);
    this.ultimaLineaDe = lineaDe;
    this.codigoEl.textContent = codigo;
    this.alCambiar(codigo);
  }

  /** Ctrl+Z / Ctrl+Y dentro de los bloques. */
  private teclas(e: KeyboardEvent): void {
    if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    const de = k === 'z' && !e.shiftKey ? this.pasado : k === 'y' || (k === 'z' && e.shiftKey) ? this.futuro : null;
    const a = de === this.pasado ? this.futuro : this.pasado;
    const foto = de?.pop();
    if (!foto) return;
    e.preventDefault();
    a.push(JSON.stringify(this.bloques));
    this.bloques = JSON.parse(foto);
    this.publicar();
    this.dibujar();
  }

  /** Busca un bloque por su id: la lista donde está y su posición. */
  private buscar(id: number, bs: Bloque[] = this.bloques): { lista: Bloque[]; i: number } | null {
    for (let i = 0; i < bs.length; i++) {
      if (bs[i].id === id) return { lista: bs, i };
      for (const c of cuerpos(bs[i])) {
        const r = this.buscar(id, c);
        if (r) return r;
      }
    }
    return null;
  }

  private quitar(id: number): Bloque | null {
    const r = this.buscar(id);
    return r ? r.lista.splice(r.i, 1)[0] : null;
  }

  /** ¿Está `lista` dentro del bloque `b`? (no se puede meter un bloque dentro de sí mismo) */
  private contiene(b: Bloque, lista: Bloque[]): boolean {
    return cuerpos(b).some((c) => c === lista || c.some((x) => this.contiene(x, lista)));
  }

  private soltar(lista: Bloque[], posicion: number): void {
    const a = this.arrastre;
    if (!a) return;
    this.cambiar(() => {
      if (a.tipo === 'nuevo') {
        const nuevo = structuredClone(a.bloque);
        this.numerar([nuevo]);
        lista.splice(posicion, 0, nuevo);
        return;
      }
      const donde = this.buscar(a.id);
      if (!donde) return;
      const b = donde.lista[donde.i];
      if (this.contiene(b, lista)) return;
      // Quitarlo de donde estaba (si es la misma lista y estaba antes, la posición se corre una)
      donde.lista.splice(donde.i, 1);
      if (donde.lista === lista && donde.i < posicion) posicion--;
      lista.splice(posicion, 0, b);
    });
  }

  private terminarArrastre(): void {
    this.arrastre = null;
    this.hueco.remove();
    this.elemento.classList.remove('arrastrando');
  }

  // ───────────────────────── Dibujo ─────────────────────────

  private dibujarPaleta(): void {
    const cat = CATEGORIAS.find((c) => c.id === this.categoria)!;
    rellenar(this.paletaEl,
      h('div', { class: 'categorias-bloques' },
        CATEGORIAS.map((c) =>
          h('button', { class: `categoria-bloques ${c.id === this.categoria ? 'activa' : ''}`, style: `--color: ${c.color}`, onclick: () => {
            this.categoria = c.id;
            this.dibujarPaleta();
          } }, h('span', { class: 'punto' }), c.nombre)),
      ),
      h('div', { class: 'lista-paleta', style: `--color: ${cat.color}` },
        paleta(this.categoria).map((b) => {
          const el = h('div', { class: `bloque-paleta tipo-${b.tipo}`, draggable: 'true', style: `--color: ${CATEGORIAS.find((c) => c.id === categoriaDe(b))!.color}`, title: 'Arrástralo a tu código' }, this.textoDe(b));
          el.addEventListener('dragstart', (e) => this.empezarArrastre(e, { tipo: 'nuevo', bloque: b }));
          el.addEventListener('dragend', () => this.terminarArrastre());
          return el;
        }),
      ),
    );
  }

  /** Cómo se ve un bloque en la paleta (sin huecos que escribir). */
  private textoDe(b: Bloque): string {
    switch (b.tipo) {
      case 'evento':
        return EVENTOS.find((e) => e.clase === b.clase)!.texto + (b.dato ? ` ${b.dato}` : '');
      case 'si':
        return b.sino ? 'si … / sino' : 'si …';
      case 'repetir':
        return 'repetir … veces';
      case 'mientras':
        return 'mientras …';
      case 'paraCada':
        return 'para cada … en …';
      case 'accion':
        return accionPorId(b.accion)!.partes.map((p) => (typeof p === 'number' ? b.campos[p] : p)).join(' ');
      case 'variable':
        return `crear variable ${b.nombre}`;
      case 'asignar':
        return `${b.objetivo} ${b.operador} ${b.valor}`;
      case 'funcion':
        return `función ${b.nombre}(${b.parametros})`;
      case 'devolver':
        return 'devolver …';
      case 'hacer':
        return `hacer: ${b.codigo}`;
      case 'nota':
        return '# nota';
      default:
        return b.tipo;
    }
  }

  private empezarArrastre(e: DragEvent, a: Arrastre): void {
    this.arrastre = a;
    e.dataTransfer?.setData('text/plain', '');
    if (e.dataTransfer) e.dataTransfer.effectAllowed = a.tipo === 'nuevo' ? 'copy' : 'move';
    this.elemento.classList.add('arrastrando');
    e.stopPropagation();
  }

  dibujar(): void {
    this.listas = [];
    const { lineaDe, codigo } = aCodigo(this.bloques);
    this.ultimaLineaDe = lineaDe;
    this.codigoEl.textContent = codigo;
    rellenar(this.area, this.lista(this.bloques, true));
    if (!this.bloques.length) this.area.append(h('p', { class: 'nota vacio-bloques' }, 'Todavía no hay bloques. Empieza arrastrando «cuando empieza» desde Eventos.'));
  }

  /** Una lista de bloques donde se pueden soltar otros. */
  private lista(bs: Bloque[], arriba = false): HTMLElement {
    const n = this.listas.push(bs) - 1;
    const el = h('div', { class: `lista-bloques ${arriba ? 'arriba' : ''}`, 'data-lista': String(n) }, bs.map((b) => this.bloque(b)));
    el.addEventListener('dragover', (e) => {
      if (!this.arrastre) return;
      e.preventDefault();
      e.stopPropagation();
      el.insertBefore(this.hueco, this.hijoDespues(el, e.clientY));
    });
    el.addEventListener('drop', (e) => {
      if (!this.arrastre) return;
      e.preventDefault();
      e.stopPropagation();
      const despues = this.hijoDespues(el, e.clientY);
      const hijos = [...el.children].filter((c) => c.classList.contains('bloque'));
      const posicion = despues ? hijos.indexOf(despues) : hijos.length;
      this.soltar(this.listas[n], posicion === -1 ? hijos.length : posicion);
      this.terminarArrastre();
    });
    return el;
  }

  /** El bloque de la lista que queda justo debajo del ratón (para poner el hueco antes que él). */
  private hijoDespues(lista: HTMLElement, y: number): Element | null {
    for (const c of lista.children) {
      if (!c.classList.contains('bloque')) continue;
      const r = c.getBoundingClientRect();
      if (y < r.top + Math.min(r.height, 36) / 2) return c;
    }
    return null;
  }

  private bloque(b: Bloque): HTMLElement {
    const color = CATEGORIAS.find((c) => c.id === categoriaDe(b))!.color;
    const quitar = h('button', { class: 'quitar-bloque', title: 'Quitar este bloque', onclick: () => this.cambiar(() => this.quitar(b.id!)) }, icono('cerrar', 12));
    const cabeza = h('div', { class: 'cabeza-bloque', draggable: 'true' }, this.contenidoCabeza(b), quitar);
    cabeza.addEventListener('dragstart', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      this.empezarArrastre(e, { tipo: 'mover', id: b.id! });
    });
    cabeza.addEventListener('dragend', () => this.terminarArrastre());
    const el = h('div', { class: `bloque tipo-${b.tipo}`, 'data-id': String(b.id), style: `--color: ${color}` }, cabeza);
    if (b.tipo === 'si') {
      b.ramas.forEach((r, i) => {
        if (i > 0) el.append(h('div', { class: 'cabeza-bloque intermedia' }, 'sino si', this.campo(r.condicion, (v) => (r.condicion = v), 'expresion'), this.botonMenos(() => b.ramas.splice(i, 1))));
        el.append(this.boca(r.cuerpo));
      });
      if (b.sino) {
        el.append(h('div', { class: 'cabeza-bloque intermedia' }, 'sino', this.botonMenos(() => (b.sino = null))));
        el.append(this.boca(b.sino));
      }
      el.append(h('div', { class: 'pie-bloque' },
        h('button', { class: 'boton-enlace', onclick: () => this.cambiar(() => b.ramas.push({ condicion: 'verdadero', cuerpo: [] })) }, '+ sino si'),
        b.sino ? null : h('button', { class: 'boton-enlace', onclick: () => this.cambiar(() => (b.sino = [])) }, '+ sino'),
      ));
    } else {
      for (const c of cuerpos(b)) el.append(this.boca(c), h('div', { class: 'pie-bloque' }));
    }
    if (b.id === this.resaltado) el.classList.add('resaltado');
    return el;
  }

  private botonMenos(fn: () => void): HTMLElement {
    return h('button', { class: 'quitar-rama', title: 'Quitar esta parte', onclick: () => this.cambiar(fn) }, '−');
  }

  /** El hueco en forma de C donde van los bloques de dentro. */
  private boca(cuerpo: Bloque[]): HTMLElement {
    const l = this.lista(cuerpo);
    if (!cuerpo.some((b) => b.tipo !== 'nota')) l.append(h('div', { class: 'boca-vacia' }, 'Arrastra aquí lo que tiene que hacer'));
    return h('div', { class: 'boca-bloque' }, l);
  }

  /** Lo que se ve en la cabecera: palabras y huecos para escribir. */
  private contenidoCabeza(b: Bloque): (HTMLElement | string)[] {
    switch (b.tipo) {
      case 'evento': {
        const ev = EVENTOS.find((e) => e.clase === b.clase)!;
        const lista = h('select', { class: 'campo-bloque', title: 'Cuándo se ejecuta', onchange: () => this.cambiar(() => {
          b.clase = lista.value as ClaseEvento;
          b.dato = EVENTOS.find((e) => e.clase === b.clase)!.dato?.porDefecto ?? '';
        }) }, EVENTOS.map((e) => h('option', { value: e.clase, selected: e.clase === b.clase }, e.texto)));
        return [lista, ev.dato ? this.campo(b.dato, (v) => (b.dato = v), b.clase === 'pulsa' || b.clase === 'mantiene' || b.clase === 'suelta' || b.clase === 'cada' || b.clase === 'pasen' ? 'expresion' : 'nombre', ev.dato.nombre) : ''];
      }
      case 'funcion':
        return ['función', this.campo(b.nombre, (v) => (b.nombre = v), 'nombre'), '(', this.campo(b.parametros, (v) => (b.parametros = v), 'parametros', 'valores que recibe'), ')'];
      case 'variable':
        return ['crear variable', this.campo(b.nombre, (v) => (b.nombre = v), 'nombre'), '=', this.campo(b.valor, (v) => (b.valor = v), 'expresion')];
      case 'asignar': {
        const op = h('select', { class: 'campo-bloque', onchange: () => this.cambiar(() => (b.operador = op.value), false) }, OPERADORES.map(([v, t]) => h('option', { value: v, selected: v === b.operador }, t)));
        return [this.campo(b.objetivo, (v) => (b.objetivo = v), 'objetivo'), op, this.campo(b.valor, (v) => (b.valor = v), 'expresion')];
      }
      case 'si':
        return ['si', this.campo(b.ramas[0].condicion, (v) => (b.ramas[0].condicion = v), 'expresion')];
      case 'mientras':
        return ['mientras', this.campo(b.condicion, (v) => (b.condicion = v), 'expresion')];
      case 'repetir':
        return ['repetir', this.campo(b.veces, (v) => (b.veces = v), 'expresion'), 'veces'];
      case 'paraCada':
        return ['para cada', this.campo(b.variables, (v) => (b.variables = v), 'parametros'), 'en', this.campo(b.coleccion, (v) => (b.coleccion = v), 'expresion')];
      case 'devolver':
        return ['devolver', this.campo(b.valor, (v) => (b.valor = v), 'expresionOpcional')];
      case 'romper':
        return ['romper (salir del bucle)'];
      case 'continuar':
        return ['continuar (siguiente vuelta)'];
      case 'accion': {
        const a = accionPorId(b.accion)!;
        return a.partes.map((p) => (typeof p === 'number' ? this.campo(b.campos[p], (v) => (b.campos[p] = v), 'expresion') : p));
      }
      case 'hacer':
        return ['hacer', this.campo(b.codigo, (v) => (b.codigo = v), 'orden')];
      case 'nota':
        return ['#', this.campo(b.texto, (v) => (b.texto = v), 'texto')];
    }
  }

  /**
   * Un hueco para escribir. Mientras se escribe se comprueba que tenga
   * sentido (si no, se pone rojo y dice por qué), y un momento después se
   * reescribe el código (sin redibujar: así no se pierde lo que se escribe).
   */
  private campo(valor: string, poner: (v: string) => void, clase: 'expresion' | 'expresionOpcional' | 'objetivo' | 'nombre' | 'parametros' | 'orden' | 'texto', ayuda = ''): HTMLInputElement {
    const entrada = h('input', { class: 'campo-bloque', value: valor, spellcheck: 'false', placeholder: ayuda, title: ayuda });
    const ancho = () => (entrada.style.width = `calc(${Math.max(3, entrada.value.length + 1)}ch + 16px)`);
    const comprobar = () => {
      const problema = problemaDeCampo(entrada.value, clase);
      entrada.classList.toggle('mal', !!problema);
      entrada.title = problema ?? ayuda;
    };
    ancho();
    comprobar();
    let apuntado = false;
    entrada.addEventListener('input', () => {
      ancho();
      comprobar();
      // Un solo paso de deshacer por hueco, aunque se escriban muchas letras
      if (!apuntado) {
        this.pasado.push(JSON.stringify(this.bloques));
        this.futuro = [];
        apuntado = true;
      }
      poner(entrada.value);
      clearTimeout(this.temporizador);
      this.temporizador = window.setTimeout(() => this.publicar(), 250);
    });
    entrada.addEventListener('change', () => {
      apuntado = false;
      clearTimeout(this.temporizador);
      this.publicar();
    });
    // Arrastrar desde un hueco sería seleccionar texto, no mover el bloque
    entrada.addEventListener('mousedown', (e) => e.stopPropagation());
    entrada.draggable = false;
    return entrada;
  }
}

/** ¿Qué le pasa a lo escrito en un hueco? (null = está bien) */
export function problemaDeCampo(texto: string, clase: 'expresion' | 'expresionOpcional' | 'objetivo' | 'nombre' | 'parametros' | 'orden' | 'texto'): string | null {
  const t = texto.trim();
  if (clase === 'texto') return null;
  if (clase === 'expresionOpcional' && !t) return null;
  if (!t && clase !== 'parametros') return 'Este hueco está vacío.';
  if (clase === 'nombre') return /^[\p{L}_][\p{L}\p{N}_]*$/u.test(t) ? null : 'Un nombre empieza por una letra y solo lleva letras, números y _ (sin espacios).';
  if (clase === 'parametros') return t === '' || /^[\p{L}_][\p{L}\p{N}_]*(\s*,\s*[\p{L}_][\p{L}\p{N}_]*)*$/u.test(t) ? null : 'Nombres separados por comas, por ejemplo: cantidad, quien';
  const codigo = clase === 'objetivo' ? `${t} = 1` : clase === 'orden' ? t : `variable __ = ${t}`;
  const { errores } = analizarSintaxis(codigo, 'hueco');
  return errores.length ? errores[0].mensajeCorto.charAt(0).toUpperCase() + errores[0].mensajeCorto.slice(1) : null;
}
