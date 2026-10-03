/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * GUARDAR Y ABRIR PROYECTOS.
 *
 * Hay dos formas, y usamos las dos:
 *   1. Guardado AUTOMÁTICO en el navegador (IndexedDB): cada pocos segundos,
 *      sin hacer nada. Si cierras la pestaña sin querer, al volver está todo.
 *   2. ARCHIVO .chispa.json (botón Guardar): para tener una copia, llevarla a
 *      otro ordenador o compartirla. Es el proyecto entero en un solo archivo.
 *
 * DECISIÓN: IndexedDB y no localStorage, porque localStorage solo admite unos
 * 5 MB y las imágenes y sonidos importados pueden ocupar más.
 *
 *   3. MIS PROYECTOS (1.2): además del último, el navegador guarda una copia de
 *      cada proyecto en el que se ha trabajado (por su identificador). En un
 *      móvil, descargar y volver a abrir archivos es incómodo: así se puede
 *      tener varios juegos a medias y pasar de uno a otro sin tocar archivos.
 *   4. COMPARTIR (1.2): en móviles y tabletas, el archivo se puede mandar por
 *      el menú de compartir del aparato (guardarlo en Archivos o en Drive,
 *      enviarlo por mensaje...), que es como se mueven allí los archivos.
 */

const BASE = 'chispa-editor';
const ALMACEN = 'proyectos';
const CLAVE_AUTO = 'ultimo';

function abrirBase(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    if (typeof indexedDB === 'undefined') return rechazar(new Error('Este navegador no permite guardar proyectos.'));
    const peticion = indexedDB.open(BASE, 1);
    peticion.onupgradeneeded = () => peticion.result.createObjectStore(ALMACEN);
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

async function operar<T>(modo: IDBTransactionMode, fn: (almacen: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const base = await abrirBase();
  try {
    return await new Promise<T>((resolver, rechazar) => {
      const tx = base.transaction(ALMACEN, modo);
      const peticion = fn(tx.objectStore(ALMACEN));
      tx.oncomplete = () => resolver(peticion.result);
      tx.onerror = () => rechazar(tx.error);
      tx.onabort = () => rechazar(tx.error);
    });
  } finally {
    base.close();
  }
}

/** Guarda el proyecto en el navegador (en silencio). */
export async function guardarAutomatico(json: string): Promise<void> {
  await operar('readwrite', (a) => a.put({ json, fecha: Date.now() }, CLAVE_AUTO));
}

/** El último proyecto guardado automáticamente (o null). */
export async function cargarAutomatico(): Promise<{ json: string; fecha: number } | null> {
  try {
    return ((await operar('readonly', (a) => a.get(CLAVE_AUTO))) as { json: string; fecha: number } | undefined) ?? null;
  } catch {
    return null;
  }
}

// ───────────────────────── Mis proyectos ─────────────────────────

/** Como mucho, estos proyectos guardados en el navegador (al pasar, se quita el que hace más que no se toca). */
export const MAXIMO_PROYECTOS_GUARDADOS = 30;
const PREFIJO = 'p:';

export interface ProyectoGuardado {
  id: string;
  nombre: string;
  fecha: number;
  /** Lo que ocupa, en letras (más o menos, bytes). */
  tamano: number;
}

/** De un proyecto en JSON, su identificador y su nombre (o null si no es un proyecto). */
export function fichaDeProyecto(json: string): { id: string; nombre: string } | null {
  try {
    const p = JSON.parse(json) as { id?: unknown; nombre?: unknown };
    return typeof p.id === 'string' && p.id && p.id.length <= 80 ? { id: p.id, nombre: nombreSeguro(p.nombre) } : null;
  } catch {
    return null;
  }
}

/** El nombre que se enseña en la lista: siempre un texto, y corto (lo guardado en el navegador puede estar roto). */
export function nombreSeguro(nombre: unknown): string {
  return typeof nombre === 'string' && nombre.trim() ? [...nombre.trim()].slice(0, 80).join('') : 'Sin nombre';
}

/** Cuáles hay que quitar para que no pasen de `maximo` (los que hace más que no se tocan). */
export function proyectosQueSobran(lista: ProyectoGuardado[], maximo = MAXIMO_PROYECTOS_GUARDADOS): string[] {
  return [...lista].sort((a, b) => b.fecha - a.fecha).slice(maximo).map((p) => p.id);
}

/** Guarda (o actualiza) la copia de este proyecto en «Mis proyectos». */
export async function guardarEnMisProyectos(json: string): Promise<void> {
  const ficha = fichaDeProyecto(json);
  if (!ficha) return;
  await operar('readwrite', (a) => a.put({ json, fecha: Date.now(), nombre: ficha.nombre }, PREFIJO + ficha.id));
  const sobran = proyectosQueSobran(await misProyectos());
  for (const id of sobran) await borrarDeMisProyectos(id);
}

/** Los proyectos guardados en este navegador, el más reciente primero. */
export async function misProyectos(): Promise<ProyectoGuardado[]> {
  try {
    const base = await abrirBase();
    try {
      return await new Promise<ProyectoGuardado[]>((resolver, rechazar) => {
        const lista: ProyectoGuardado[] = [];
        const tx = base.transaction(ALMACEN, 'readonly');
        const cursor = tx.objectStore(ALMACEN).openCursor();
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (!c) return;
          const clave = String(c.key);
          const v = c.value as { json?: string; fecha?: number; nombre?: string } | undefined;
          if (clave.startsWith(PREFIJO) && typeof v?.json === 'string') lista.push({ id: clave.slice(PREFIJO.length), nombre: nombreSeguro(v.nombre), fecha: typeof v.fecha === 'number' && Number.isFinite(v.fecha) ? v.fecha : 0, tamano: v.json.length });
          c.continue();
        };
        tx.oncomplete = () => resolver(lista.sort((a, b) => b.fecha - a.fecha));
        tx.onerror = () => rechazar(tx.error);
      });
    } finally {
      base.close();
    }
  } catch {
    return [];
  }
}

/** El JSON de uno de «Mis proyectos» (o null si ya no está). */
export async function cargarDeMisProyectos(id: string): Promise<string | null> {
  try {
    return ((await operar('readonly', (a) => a.get(PREFIJO + id))) as { json: string } | undefined)?.json ?? null;
  } catch {
    return null;
  }
}

export async function borrarDeMisProyectos(id: string): Promise<void> {
  await operar('readwrite', (a) => a.delete(PREFIJO + id));
}

/**
 * Pide al navegador que NO borre lo guardado cuando le falte sitio (los móviles lo hacen con las
 * webs que se usan poco). Puede decir que no; entonces todo sigue igual que antes.
 */
export async function pedirQueNoSeBorre(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// ───────────────────────── Archivos ─────────────────────────

/** Un nombre de archivo sin caracteres raros: "Mi juego!" → "Mi_juego". */
export function nombreDeArchivo(nombre: string, extension: string): string {
  const limpio = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
  return `${limpio || 'mi_juego'}${extension}`;
}

/** Descarga un texto (o unos bytes, como un .zip) como archivo. */
export function descargar(nombreArchivo: string, contenido: string | Uint8Array, tipo = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([contenido as BlobPart], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** ¿Se puede mandar un archivo por el menú de compartir del aparato? (móviles y tabletas; casi ningún ordenador) */
export function sePuedeCompartir(nombreArchivo = 'juego.chispa.json', tipo = 'application/json'): boolean {
  try {
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File(['{}'], nombreArchivo, { type: tipo })] });
  } catch {
    return false;
  }
}

/**
 * Manda un archivo por el menú de compartir del aparato. Devuelve 'compartido', 'cancelado'
 * (la persona ha cerrado el menú) o 'no' (no se puede: entonces, mejor descargarlo).
 */
export async function compartir(nombreArchivo: string, contenido: string | Uint8Array, tipo = 'application/json', titulo = nombreArchivo): Promise<'compartido' | 'cancelado' | 'no'> {
  try {
    const archivo = new File([contenido as BlobPart], nombreArchivo, { type: tipo });
    if (typeof navigator.share !== 'function' || !navigator.canShare?.({ files: [archivo] })) return 'no';
    await navigator.share({ files: [archivo], title: titulo });
    return 'compartido';
  } catch (e) {
    return (e as { name?: string } | null)?.name === 'AbortError' ? 'cancelado' : 'no';
  }
}

/**
 * Un selector de archivos del sistema. El campo se pone en la página (invisible) mientras
 * está abierto: en Safari de iPhone, uno que no esté en la página puede no avisar al elegir.
 */
export function elegirArchivos(tipos: string, varios = false): Promise<File[]> {
  return new Promise((resolver) => {
    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = tipos;
    entrada.multiple = varios;
    entrada.className = 'selector-de-archivos';
    Object.assign(entrada.style, { position: 'fixed', left: '-9999px', top: '0', opacity: '0' });
    const terminar = (archivos: File[]) => {
      entrada.remove();
      resolver(archivos);
    };
    entrada.addEventListener('change', () => terminar([...(entrada.files ?? [])]));
    entrada.addEventListener('cancel', () => terminar([]));
    document.body.append(entrada);
    entrada.click();
  });
}

/** Abre el selector de archivos y devuelve el texto del archivo elegido (o null). */
export async function elegirArchivo(tipos = '.json,.chispa.json,application/json,text/plain'): Promise<string | null> {
  const [archivo] = await elegirArchivos(tipos);
  return archivo ? await archivo.text() : null;
}
