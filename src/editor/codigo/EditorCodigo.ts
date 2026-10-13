/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EDITOR DE CÓDIGO: una pestaña por script, con colores, números de línea,
 * autocompletado, errores subrayados mientras escribes y ayuda al pasar el ratón.
 *
 * Por dentro usa CodeMirror 6 (un editor de código de código abierto). Cada
 * script abierto tiene su propia "vista" de CodeMirror, que se esconde o se
 * enseña al cambiar de pestaña: así cada script conserva su deshacer y la
 * posición del cursor.
 */
import { tipoDe } from '../../proyecto/formato';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  rectangularSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, indentUnit } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { forceLinting, lintGutter, lintKeymap } from '@codemirror/lint';
import type { EstadoEditor } from '../estado/EstadoEditor';
import { coloresChispa, lenguajeChispa, sangriaChispa, sangriaEscritaAMano } from './lenguajeChispa';
import { fuenteAutocompletado } from './autocompletado';
import { ayudaAlPasar, ayudaAlTocarCodigo, posicionEnDocumento, revisionEnVivo } from './ayudaYErrores';
import { marcarParada, puntosDeParada } from './puntosDeParada';
import { barraDeAtajos } from './barraAtajos';
import type { Depurador } from '../../chispa/ejecucion/depurador';
import { EditorBloques } from '../bloques/EditorBloques';
import { desdeCodigo } from '../bloques/modelo';
import { h, rellenar } from '../interfaz/dom';
import { avisar, confirmar } from '../interfaz/dialogos';
import * as Y from 'yjs';
import { yCollab, ySyncAnnotation, yUndoManagerKeymap } from 'y-codemirror.next';
import type { Awareness } from 'y-protocols/awareness';
import { cambioDeTexto } from '../../colaborar/diferencias';

/** PROGRAMAR JUNTOS: de dónde saca el editor de código los textos compartidos y los cursores de los demás. */
export interface CodigoJuntos {
  texto(archivo: string): Y.Text | null;
  presencia: Awareness;
}

/** Los textos de CodeMirror, en español. */
const FRASES = EditorState.phrases.of({
  Find: 'Buscar',
  Replace: 'Reemplazar',
  next: 'siguiente',
  previous: 'anterior',
  all: 'todas',
  'match case': 'mayúsculas',
  regexp: 'expresión regular',
  'by word': 'palabra completa',
  replace: 'reemplazar',
  'replace all': 'reemplazar todas',
  close: 'cerrar',
  'current match': 'coincidencia actual',
  'replaced match on line $': 'reemplazado en la línea $',
  'replaced $ matches': '$ reemplazos',
  'on line': 'en la línea',
  'Go to line': 'Ir a la línea',
  go: 'ir',
  Diagnostics: 'Problemas',
  'No diagnostics': 'Sin problemas',
  'Folded lines': 'Líneas plegadas',
  'Unfolded lines': 'Líneas desplegadas',
  'Control character': 'Carácter de control',
  Completions: 'Sugerencias',
});

/** Tema oscuro del editor (a juego con el resto de la Zona de Programación). */
const TEMA = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'var(--fondo-codigo)', color: 'var(--texto-codigo)', fontSize: 'var(--tamano-codigo, 15px)' },
    '.cm-scroller': { fontFamily: 'var(--letra-codigo)', lineHeight: '1.55' },
    '.cm-content': { caretColor: 'var(--cursor-codigo)', padding: '8px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--cursor-codigo)', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--seleccion-codigo) !important' },
    '.cm-gutters': { backgroundColor: 'var(--fondo-codigo)', color: 'var(--numeros-codigo)', border: 'none' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--texto)' },
    '.cm-activeLine': { backgroundColor: 'var(--linea-activa)' },
    '.cm-selectionMatch': { backgroundColor: '#ffffff14' },
    '.cm-matchingBracket': { backgroundColor: '#ffffff1f', outline: '1px solid #ffffff40' },
    '.cm-tooltip': { backgroundColor: 'var(--fondo-elevado)', color: 'var(--texto)', border: '1px solid var(--borde-fuerte)', borderRadius: '8px', boxShadow: '0 10px 30px #0008' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#2d4a7a', color: '#fff' },
    '.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--letra-codigo)', maxHeight: '18em' },
    '.cm-completionDetail': { color: '#8b95ad', fontStyle: 'normal', marginLeft: '1em' },
    '.cm-diagnostic': { whiteSpace: 'pre-wrap', padding: '6px 10px', fontFamily: 'var(--letra-interfaz)', fontSize: '13.5px', lineHeight: '1.45' },
    '.cm-diagnostic-error': { borderLeft: '4px solid #ff6b6b' },
    '.cm-diagnostic-warning': { borderLeft: '4px solid #ffcb6b' },
    '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy #ff6b6b', textUnderlineOffset: '3px' },
    '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy #ffcb6b', textUnderlineOffset: '3px' },
    '.cm-panels': { backgroundColor: 'var(--fondo-elevado)', color: 'var(--texto)' },
    '.cm-panels input, .cm-panels button': { fontFamily: 'var(--letra-interfaz)' },
    '.cm-searchMatch': { backgroundColor: '#ffcb6b40' },
    '.cm-gutter-puntos': { width: '14px', cursor: 'pointer' },
    '.cm-lineNumbers .cm-gutterElement': { cursor: 'pointer' },
    '.cm-linea-parada': { backgroundColor: '#ffcb6b33', boxShadow: 'inset 3px 0 0 #ffcb6b' },
  },
  { dark: true },
);

interface Pestana {
  vista: EditorView;
  /** Nombre del archivo (puede cambiar si se renombra el script). */
  archivo: { nombre: string };
  /** Lo que se ve: la barra de arriba (Código / Bloques) y debajo el código o los bloques. */
  caja: HTMLElement;
  barra: HTMLElement;
  cajaCodigo: HTMLElement;
  /** La barra de atajos para escribir con el dedo. */
  atajos: HTMLElement;
  /** El editor de bloques (se crea la primera vez que se pasa a bloques). */
  bloques: EditorBloques | null;
  /** Programar juntos: el texto compartido al que está unida la vista (null = sin sala). */
  texto: Y.Text | null;
}

export class EditorCodigo {
  private pestanas = new Map<string, Pestana>();
  private escribiendo = false;
  /** El código lo están cambiando los bloques (no hay que volver a leerlos). */
  private desdeBloques = false;
  /** Programar juntos (null = sin sala). */
  private juntos: CodigoJuntos | null = null;

  constructor(
    private contenedor: HTMLElement,
    private estado: EstadoEditor,
    /** Donde se guardan los puntos de parada (los usa el juego al ejecutarse). */
    private depurador: Depurador | null = null,
  ) {}

  private extensiones(archivo: { nombre: string }, texto: Y.Text | null): Extension[] {
    const proyecto = () => this.estado.proyecto;
    const dep = this.depurador;
    // En una sala, el deshacer y la sincronización los lleva Yjs (deshace solo lo que escribes tú, y se ven los cursores de los demás)
    const juntos = texto && this.juntos ? yCollab(texto, this.juntos.presencia, { undoManager: new Y.UndoManager(texto) }) : null;
    return [
      // Los números de línea (y a su izquierda, los puntos de parada: clic para ponerlos)
      puntosDeParada(dep?.lineasCon(archivo.nombre) ?? [], (lineas) => dep?.ponerPuntos(archivo.nombre, lineas)),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      juntos ?? history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion({ override: [fuenteAutocompletado(proyecto)], icons: true, activateOnTyping: true }),
      highlightActiveLine(),
      highlightSelectionMatches(),
      rectangularSelection(),
      crosshairCursor(),
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...(juntos ? yUndoManagerKeymap : historyKeymap), ...completionKeymap, ...lintKeymap, indentWithTab]),
      indentUnit.of('    '),
      EditorState.tabSize.of(4),
      lenguajeChispa,
      coloresChispa,
      sangriaChispa,
      sangriaEscritaAMano,
      lintGutter(),
      revisionEnVivo(() => archivo.nombre, proyecto),
      ayudaAlPasar,
      ayudaAlTocarCodigo,
      FRASES,
      TEMA,
      EditorView.contentAttributes.of({ spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off', 'aria-label': 'Código Chispa' }),
      // Cada cambio se guarda en el proyecto (sin entrar en el deshacer general)
      EditorView.updateListener.of((u) => {
        if (!u.docChanged || this.desdeBloques) return;
        this.escribiendo = true;
        this.estado.cambiarCodigo(archivo.nombre, u.state.doc.toString());
        this.escribiendo = false;
        // Programar juntos: si otra persona cambia este script mientras tú lo ves en bloques, los bloques se vuelven a leer
        if (u.transactions.some((t) => t.annotation(ySyncAnnotation) !== undefined) && this.estado.enBloques(archivo.nombre)) this.releerBloques(archivo.nombre);
      }),
    ];
  }

  /**
   * Resalta la línea donde está parado el juego (y la enseña). null = ya no está parado:
   * se quita el resaltado de todos los scripts.
   */
  mostrarParada(archivo: string | null, linea = 0): void {
    for (const [nombre, p] of this.pestanas) {
      const aqui = nombre === archivo;
      p.vista.dispatch({ effects: marcarParada.of(aqui ? linea : null) });
      p.bloques?.resaltarLinea(aqui ? linea : null);
    }
    if (archivo) this.irA(archivo, linea, 1);
  }

  /** Enseña un script (creando su pestaña si hace falta). */
  mostrar(archivo: string): void {
    let p = this.pestanas.get(archivo);
    if (!p) {
      const nombre = { nombre: archivo };
      const caja = h('div', { class: 'caja-script' });
      const barra = h('div', { class: 'modo-script', role: 'tablist' });
      // (CodeMirror se pone siempre visible con !important: para esconderlo se esconde su caja)
      const cajaCodigo = h('div', { class: 'caja-codigo' });
      caja.append(barra, cajaCodigo);
      this.contenedor.append(caja);
      const texto = this.juntos?.texto(archivo) ?? null;
      const vista = this.nuevaVista(nombre, texto, cajaCodigo);
      // La barra de atajos para escribir con el dedo (solo se ve en móvil y tablet), justo debajo del código: encima del teclado
      const atajos = barraDeAtajos(() => p!.vista);
      caja.append(atajos);
      p = { vista, archivo: nombre, caja, barra, cajaCodigo, atajos, bloques: null, texto };
      this.pestanas.set(archivo, p);
      // Si se guardó en modo bloques, se abre en bloques (si todavía se puede)
      if (this.estado.enBloques(archivo) && !this.aBloques(p)) this.estado.ponerEnBloques(archivo, false);
      this.dibujarModo(p);
    }
    for (const [nombre, otra] of this.pestanas) otra.caja.style.display = nombre === archivo ? '' : 'none';
    p.vista.requestMeasure();
  }

  private nuevaVista(archivo: { nombre: string }, texto: Y.Text | null, padre: HTMLElement): EditorView {
    return new EditorView({
      state: EditorState.create({ doc: texto ? texto.toString() : (this.estado.proyecto.scripts[archivo.nombre] ?? ''), extensions: this.extensiones(archivo, texto) }),
      parent: padre,
    });
  }

  /** Vuelve a crear la vista de un script (al entrar o salir de una sala, o si su texto compartido ha cambiado). */
  private rehacerVista(p: Pestana): void {
    const cursor = Math.min(p.vista.state.selection.main.head, (p.texto?.length ?? this.estado.proyecto.scripts[p.archivo.nombre]?.length ?? 0));
    const conFoco = p.vista.hasFocus;
    p.vista.destroy();
    p.texto = this.juntos?.texto(p.archivo.nombre) ?? null;
    p.vista = this.nuevaVista(p.archivo, p.texto, p.cajaCodigo);
    const max = p.vista.state.doc.length;
    p.vista.dispatch({ selection: { anchor: Math.min(cursor, max) } });
    if (conFoco) p.vista.focus();
  }

  /**
   * PROGRAMAR JUNTOS: con sala, cada script se une a su texto compartido (se ven los cursores de los
   * demás y lo que escriben); sin sala (null), vuelve a ser un editor normal.
   */
  usarJuntos(juntos: CodigoJuntos | null): void {
    this.juntos = juntos;
    for (const p of this.pestanas.values()) this.rehacerVista(p);
  }

  /** Cambia el código de una vista tocando solo lo que cambia (así no se pierde el cursor, ni el de los demás). */
  private ponerCodigo(vista: EditorView, codigo: string): void {
    const c = cambioDeTexto(vista.state.doc.toString(), codigo);
    if (c) vista.dispatch({ changes: { from: c.desde, to: c.hasta, insert: c.meter } });
  }

  // ───────────────────────── Código o bloques ─────────────────────────

  private dibujarModo(p: Pestana): void {
    const enBloques = this.estado.enBloques(p.archivo.nombre) && !!p.bloques;
    const boton = (bloques: boolean, texto: string, ayuda: string) =>
      h('button', { class: `modo ${enBloques === bloques ? 'activo' : ''}`, role: 'tab', 'aria-selected': String(enBloques === bloques), title: ayuda, onclick: () => this.cambiarModo(p, bloques) }, texto);
    rellenar(p.barra,
      boton(false, 'Código', 'Escribir el script como texto'),
      boton(true, 'Bloques', 'Ver y editar el script con bloques, como en Scratch (el código se escribe solo)'),
    );
    p.cajaCodigo.style.display = enBloques ? 'none' : '';
    p.atajos.hidden = enBloques;
    if (p.bloques) p.bloques.elemento.style.display = enBloques ? '' : 'none';
  }

  /** Ctrl+B: de código a bloques o al revés, en el script que se ve. */
  alternarModo(archivo: string): void {
    const p = this.pestanas.get(archivo);
    if (p) void this.cambiarModo(p, !(this.estado.enBloques(archivo) && p.bloques));
  }

  private async cambiarModo(p: Pestana, bloques: boolean): Promise<void> {
    if (bloques === this.estado.enBloques(p.archivo.nombre) && (!bloques || p.bloques)) return;
    if (bloques && !(await this.aBloquesPreguntando(p))) return;
    this.estado.ponerEnBloques(p.archivo.nombre, bloques);
    this.dibujarModo(p);
    if (!bloques) p.vista.requestMeasure();
  }

  /** Pasa a bloques. Si no se puede, lo explica; si se pierde algo (comentarios al final de una línea), lo pregunta. */
  private async aBloquesPreguntando(p: Pestana): Promise<boolean> {
    const lectura = desdeCodigo(this.estado.proyecto.scripts[p.archivo.nombre] ?? '');
    if (!lectura.ok) {
      avisar('No se puede pasar a bloques', h('div', {},
        h('p', {}, lectura.motivo),
        h('p', {}, `Mira ${lectura.lineas.length === 1 ? 'la línea' : 'las líneas'} ${lectura.lineas.join(', ')} (salen en rojo, y en la pestaña Problemas).`),
      ));
      return false;
    }
    if (lectura.perdidos.length && !(await confirmar('Pasar a bloques', `En bloques no se puede guardar ${lectura.perdidos.join(', ')}. Si sigues, se perderá${lectura.perdidos.length > 1 ? 'n' : ''} al cambiar algo con los bloques. (Los comentarios en su propia línea sí se conservan, como notas.)`, 'Pasar a bloques igualmente'))) return false;
    return this.aBloques(p);
  }

  private releyendo = new Set<string>();
  /**
   * Vuelve a leer los bloques (un momento después, por si la otra persona sigue escribiendo). Si el
   * código está a medio escribir y no se puede leer, se dejan los bloques como estaban.
   */
  private releerBloques(archivo: string): void {
    if (this.releyendo.has(archivo)) return;
    this.releyendo.add(archivo);
    setTimeout(() => {
      this.releyendo.delete(archivo);
      const p = this.pestanas.get(archivo);
      if (p?.bloques && this.estado.enBloques(archivo)) this.aBloques(p);
    }, 400);
  }

  /** Crea (o actualiza) los bloques a partir del código. Devuelve si ha podido. */
  private aBloques(p: Pestana): boolean {
    const lectura = desdeCodigo(this.estado.proyecto.scripts[p.archivo.nombre] ?? '');
    if (!lectura.ok) return false;
    if (!p.bloques) {
      p.bloques = new EditorBloques((codigo) => this.codigoDesdeBloques(p, codigo));
      // Los bloques de la paleta salen con nombres que hay en el proyecto (sus sonidos, sus plantillas, sus objetos...)
      p.bloques.nombres = () => {
        const pr = this.estado.proyecto;
        const canciones = Object.keys(pr.canciones ?? {});
        const sonidos = [...Object.keys(pr.sonidosHechos ?? {}), ...Object.keys(pr.sonidos)];
        return {
          sonidos,
          musicas: canciones.length ? canciones : sonidos,
          plantillas: Object.keys(pr.plantillas),
          escenas: Object.keys(pr.escenas).filter((e) => e !== this.estado.escenaActual),
          animaciones: Object.keys(pr.animaciones),
          // Los demás objetos de la escena, por su tipo (Moneda2 → Moneda), sin los de interfaz ni el de este script
          objetos: [...new Set(this.estado.escena.objetos.filter((o) => o.script !== p.archivo.nombre && !o.sprite?.fijo && !o.mapa && o.nombre).map((o) => tipoDe(o)))],
        };
      };
      p.bloques.pintarPaleta();
      p.caja.append(p.bloques.elemento);
    }
    p.bloques.cargar(lectura.bloques);
    return true;
  }

  /** Los bloques han cambiado: el código se reescribe (en el proyecto y en la vista de código). */
  private codigoDesdeBloques(p: Pestana, codigo: string): void {
    this.desdeBloques = true;
    this.escribiendo = true;
    try {
      this.ponerCodigo(p.vista, codigo);
      this.estado.cambiarCodigo(p.archivo.nombre, codigo);
    } finally {
      this.desdeBloques = false;
      this.escribiendo = false;
    }
  }

  /** Deja a la vista la línea del cursor (al salir el teclado de pantalla, lo que se ve es mucho más bajo). */
  verCursor(archivo: string): void {
    const p = this.pestanas.get(archivo);
    if (!p || (p.bloques && this.estado.enBloques(archivo))) return;
    p.vista.requestMeasure();
    p.vista.dispatch({ effects: EditorView.scrollIntoView(p.vista.state.selection.main.head, { y: 'nearest', yMargin: 24 }) });
  }

  enfocar(archivo: string): void {
    const p = this.pestanas.get(archivo);
    if (p?.bloques && this.estado.enBloques(archivo)) p.bloques.elemento.focus();
    else p?.vista.focus();
  }

  /** Ajusta las pestañas a lo que dice el estado (tras deshacer, renombrar, borrar...). */
  sincronizar(): void {
    if (this.escribiendo) return;
    // Renombrados: si una pestaña ya no existe pero su código sí, con otro nombre, la conservamos
    for (const [nombre, p] of [...this.pestanas]) {
      if (nombre in this.estado.proyecto.scripts && this.estado.pestanas.includes(nombre)) continue;
      const nuevoNombre = this.estado.pestanas.find((x) => !this.pestanas.has(x) && this.estado.proyecto.scripts[x] === p.vista.state.doc.toString());
      if (nuevoNombre) {
        this.pestanas.delete(nombre);
        p.archivo.nombre = nuevoNombre;
        this.pestanas.set(nuevoNombre, p);
      } else {
        p.vista.destroy();
        // Su caja se quita de la página (si no, se quedaba debajo, con sus bloques, al abrir otro proyecto)
        p.caja.remove();
        this.pestanas.delete(nombre);
      }
    }
    // Código cambiado desde fuera (deshacer general, abrir otro proyecto...)
    for (const [nombre, p] of this.pestanas) {
      // En una sala, si el script tiene otro texto compartido (lo han renombrado o vuelto a crear), se vuelve a unir
      if (this.juntos && p.texto !== this.juntos.texto(nombre)) this.rehacerVista(p);
      const codigo = this.estado.proyecto.scripts[nombre] ?? '';
      if (p.vista.state.doc.toString() !== codigo) {
        this.ponerCodigo(p.vista, codigo);
        // En bloques, se vuelven a leer (y si ya no se puede, se pasa a código)
        if (this.estado.enBloques(nombre) && p.bloques && !this.aBloques(p)) this.estado.ponerEnBloques(nombre, false);
      }
      this.dibujarModo(p);
    }
  }

  /** Salta a una línea y columna (al hacer clic en un error de la consola). */
  irA(archivo: string, linea: number, columna = 1): void {
    this.mostrar(archivo);
    const p = this.pestanas.get(archivo)!;
    if (p.bloques && this.estado.enBloques(archivo)) return p.bloques.resaltarLinea(linea);
    const vista = p.vista;
    const pos = posicionEnDocumento(vista.state.doc, linea, columna);
    vista.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
    vista.focus();
  }

  /** Vuelve a revisar los errores (por ejemplo, al crear una plantilla que el código ya usaba). */
  revisarTodo(): void {
    for (const p of this.pestanas.values()) forceLinting(p.vista);
  }
}
