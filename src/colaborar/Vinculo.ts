/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL VÍNCULO ENTRE EL EDITOR Y LA SALA (programar juntos).
 *
 * El editor sigue funcionando como siempre: su proyecto es un objeto normal (EstadoEditor). El vínculo
 * lo mantiene igual que el de la sala, que vive dentro de Yjs:
 *
 *   SUBIR  (tú cambias algo):  se compara el proyecto con cómo estaba (diferencias.ts) y los cambios
 *          se meten en Yjs. Yjs se los manda a los demás.
 *   BAJAR  (otro cambia algo): se lee el proyecto de Yjs, SE COMPRUEBA ENTERO (validar.ts: viene de otro
 *          ordenador y podría venir roto o con trampas) y se aplican al editor solo las diferencias.
 *
 * El código de los scripts va aparte, como textos de Yjs: así dos personas pueden escribir en el mismo
 * script a la vez y se ven los cursores (eso lo hace el editor de código con y-codemirror).
 *
 * Mientras arrastras un objeto o escribes en una casilla de Propiedades, lo que llega de los demás
 * espera un momento (si no, se te movería la casilla mientras escribes).
 *
 * DESHACER: con la sala, deshacer deshace SOLO LO TUYO (Y.UndoManager), sin tocar lo de los demás.
 */
import * as Y from 'yjs';
import type { EstadoEditor } from '../editor/estado/EstadoEditor';
import { migrarProyecto, type DefProyecto } from '../proyecto/formato';
import { LIMITES_PROYECTO } from '../proyecto/validar';
import { aplicar, cambioDeTexto, clonar, diferencias } from './diferencias';
import { aY, aplicarEnY } from './yjson';

/** El «quién» de los cambios hechos por este editor (para que Yjs sepa cuáles son tuyos). */
export const ORIGEN_LOCAL = { origen: 'chispa-local' } as const;

/** Lo que es de cada uno y no se comparte: `scripts` va aparte y `bloques` es solo cómo ve cada uno sus scripts. */
const NO_COMPARTIDO = new Set(['scripts', 'bloques']);

type Objeto = Record<string, unknown>;

function compartido(p: DefProyecto): Objeto {
  const r: Objeto = {};
  for (const [k, v] of Object.entries(p)) if (!NO_COMPARTIDO.has(k) && v !== undefined) r[k] = v;
  return r;
}

/** Mete un proyecto en un documento de Yjs vacío (al crear una sala). */
export function llenarDoc(doc: Y.Doc, p: DefProyecto): void {
  const mapa = doc.getMap<unknown>('proyecto');
  const scripts = doc.getMap<Y.Text>('scripts');
  doc.transact(() => {
    for (const [k, v] of Object.entries(compartido(p))) mapa.set(k, aY(v));
    for (const [nombre, codigo] of Object.entries(p.scripts)) scripts.set(nombre, new Y.Text(codigo));
  }, ORIGEN_LOCAL);
}

/** El proyecto (sin comprobar) que hay en un documento de Yjs. */
export function proyectoDeDoc(doc: Y.Doc): Objeto {
  const scripts: Record<string, string> = {};
  for (const [nombre, t] of doc.getMap<Y.Text>('scripts')) scripts[nombre] = t.toString();
  return { ...doc.getMap<unknown>('proyecto').toJSON(), scripts };
}

export interface OpcionesVinculo {
  /** ¿Hay que esperar para aplicar lo de los demás? (arrastrando, escribiendo en una casilla...) */
  ocupado?: () => boolean;
  /** Algo de los demás no se ha podido aplicar (por ejemplo, venía roto). */
  alProblema?: (texto: string) => void;
}

export class Vinculo {
  readonly proyecto: Y.Map<unknown>;
  readonly scripts: Y.Map<Y.Text>;
  readonly deshacer: Y.UndoManager;
  /** Cómo está el proyecto en Yjs (sin lo que ha llegado y todavía no se ha aplicado al editor). */
  private ultimo: Objeto;
  /** El código de cada script la última vez que el editor y Yjs estaban iguales. */
  private ultimoCodigo: Record<string, string> = {};
  private bajando = false;
  private proyectoSucio = false;
  private scriptsSucios = new Set<string>();
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private quitarOyente: () => void;
  private destruido = false;
  private problemaAvisado = false;

  constructor(
    readonly doc: Y.Doc,
    readonly estado: EstadoEditor,
    private opciones: OpcionesVinculo = {},
  ) {
    this.proyecto = doc.getMap<unknown>('proyecto');
    this.scripts = doc.getMap<Y.Text>('scripts');
    this.ultimo = clonar(this.proyecto.toJSON()) as Objeto;
    for (const [nombre, t] of this.scripts) this.ultimoCodigo[nombre] = t.toString();

    // SUBIR: después de cada cambio del editor
    this.quitarOyente = estado.alCambiar((c) => {
      if (c === 'seleccion' || c === 'historial' || c === 'archivos') return;
      this.subir(c === 'codigo');
    });

    // BAJAR: cuando cambia Yjs por algo que no es nuestro
    this.proyecto.observeDeep((_eventos, tr) => {
      if (tr.origin === ORIGEN_LOCAL) return;
      this.proyectoSucio = true;
      this.programarBajada(tr.origin === this.deshacer);
    });
    this.scripts.observeDeep((eventos, tr) => {
      if (tr.origin === ORIGEN_LOCAL) return;
      for (const ev of eventos) {
        if (ev.target === this.scripts) {
          // Scripts nuevos o borrados: es un cambio de la forma del proyecto (se comprueba entero)
          this.proyectoSucio = true;
        } else if (ev.target instanceof Y.Text) {
          const nombre = [...this.scripts.entries()].find(([, t]) => t === ev.target)?.[0];
          if (nombre) this.scriptsSucios.add(nombre);
        }
      }
      this.programarBajada(tr.origin === this.deshacer);
    });

    // DESHACER solo lo tuyo
    this.deshacer = new Y.UndoManager([this.proyecto, this.scripts], { trackedOrigins: new Set([ORIGEN_LOCAL]), captureTimeout: 600 });
    const avisarHistorial = () => this.estado.refrescarHistorial();
    this.deshacer.on('stack-item-added', avisarHistorial);
    this.deshacer.on('stack-item-popped', avisarHistorial);
    this.deshacer.on('stack-cleared', avisarHistorial);
    estado.deshacerExterno = {
      deshacer: () => {
        this.subir(false);
        this.deshacer.undo();
        this.bajar(true);
      },
      rehacer: () => {
        this.subir(false);
        this.deshacer.redo();
        this.bajar(true);
      },
      puedeDeshacer: () => this.deshacer.canUndo(),
      puedeRehacer: () => this.deshacer.canRedo(),
      cortar: () => this.deshacer.stopCapturing(),
    };
    estado.refrescarHistorial();
  }

  /** El texto de Yjs de un script (para el editor de código). */
  texto(archivo: string): Y.Text | null {
    return this.scripts.get(archivo) ?? null;
  }

  // ───────────────────────── Subir ─────────────────────────

  /** Manda a Yjs lo que ha cambiado en el editor. `soloCodigo`: solo se mira el código (al escribir). */
  subir(soloCodigo = false): void {
    if (this.bajando || this.destruido) return;
    const p = this.estado.proyecto;
    const cambios = soloCodigo ? [] : diferencias(this.ultimo, compartido(p));
    this.doc.transact(() => {
      if (cambios.length) aplicarEnY(this.proyecto, cambios);
      // Scripts: solo lo que ha cambiado AQUÍ desde la última vez (lo que difiere porque ha llegado
      // de otro y aún no se ha aplicado no se toca)
      const antes = this.ultimoCodigo;
      for (const nombre of Object.keys(antes)) {
        if (Object.hasOwn(p.scripts, nombre)) continue;
        this.scripts.delete(nombre);
        delete antes[nombre];
      }
      for (const [nombre, codigo] of Object.entries(p.scripts)) {
        if (antes[nombre] === codigo) continue;
        const t = this.scripts.get(nombre);
        if (!t) this.scripts.set(nombre, new Y.Text(codigo));
        else {
          const c = cambioDeTexto(t.toString(), codigo);
          if (c) {
            if (c.hasta > c.desde) t.delete(c.desde, c.hasta - c.desde);
            if (c.meter) t.insert(c.desde, c.meter);
          }
        }
        antes[nombre] = codigo;
      }
    }, ORIGEN_LOCAL);
    if (cambios.length) aplicar(this.ultimo, cambios);
  }

  // ───────────────────────── Bajar ─────────────────────────

  private programarBajada(ya = false): void {
    if (ya) return void this.bajar(true);
    if (this.temporizador !== null) return;
    // El código se aplica en seguida; lo demás, como mucho unas 12 veces por segundo
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      this.bajar();
    }, this.proyectoSucio ? 80 : 0);
  }

  /** Aplica al editor lo que ha llegado de los demás. */
  bajar(forzar = false): void {
    if (this.destruido || (!this.proyectoSucio && !this.scriptsSucios.size)) return;
    if (!forzar && (this.estado.enCambioLargo || this.opciones.ocupado?.())) {
      if (this.temporizador === null) this.temporizador = setTimeout(() => {
        this.temporizador = null;
        this.bajar();
      }, 250);
      return;
    }
    // Lo tuyo que aún no se haya subido, primero (si no, se perdería)
    this.subir(!this.proyectoSucio);
    if (this.proyectoSucio) this.bajarProyecto();
    else this.bajarCodigo();
  }

  private bajarProyecto(): void {
    const crudo = this.proyecto.toJSON() as Objeto;
    const scripts: Record<string, string> = {};
    for (const [nombre, t] of this.scripts) scripts[nombre] = t.toString();
    const local = this.estado.proyecto;
    let valido: DefProyecto;
    try {
      // Viene de otro ordenador: se comprueba ENTERO antes de usar nada (lo mismo que al abrir un archivo)
      valido = migrarProyecto({ ...crudo, scripts, ...(local.bloques ? { bloques: local.bloques.filter((b) => Object.hasOwn(scripts, b)) } : {}) });
    } catch (err) {
      this.proyectoSucio = false;
      this.scriptsSucios.clear();
      if (!this.problemaAvisado) {
        this.problemaAvisado = true;
        this.opciones.alProblema?.(`Ha llegado un cambio de la sala que no es válido y no se ha aplicado. ${err instanceof Error ? err.message : ''}`);
      }
      return;
    }
    this.proyectoSucio = false;
    this.scriptsSucios.clear();
    const cambios = diferencias(local, valido);
    this.ultimo = clonar(crudo);
    this.ultimoCodigo = { ...scripts };
    if (!cambios.length) return;
    this.bajando = true;
    try {
      this.estado.cambiosDeFuera(() => aplicar(local, cambios), false);
    } finally {
      this.bajando = false;
    }
  }

  private bajarCodigo(): void {
    const scripts = this.estado.proyecto.scripts;
    const cambiados: string[] = [];
    for (const nombre of this.scriptsSucios) {
      const t = this.scripts.get(nombre);
      if (!t || !Object.hasOwn(scripts, nombre)) continue;
      const codigo = t.toString();
      if (codigo.length > LIMITES_PROYECTO.letrasPorScript) continue;
      if (scripts[nombre] !== codigo) cambiados.push(nombre);
    }
    for (const nombre of this.scriptsSucios) {
      const t = this.scripts.get(nombre);
      if (t && Object.hasOwn(scripts, nombre) && Object.hasOwn(this.ultimoCodigo, nombre)) this.ultimoCodigo[nombre] = t.toString();
    }
    this.scriptsSucios.clear();
    if (!cambiados.length) return;
    this.bajando = true;
    try {
      this.estado.cambiosDeFuera(() => {
        for (const nombre of cambiados) scripts[nombre] = this.scripts.get(nombre)!.toString();
      }, true);
    } finally {
      this.bajando = false;
    }
  }

  /** Deja de estar vinculado (el proyecto se queda en el editor, como un proyecto normal). */
  destruir(): void {
    if (this.destruido) return;
    this.bajar(true);
    this.destruido = true;
    if (this.temporizador !== null) clearTimeout(this.temporizador);
    this.quitarOyente();
    this.deshacer.destroy();
    this.estado.deshacerExterno = null;
    this.estado.refrescarHistorial();
  }
}
