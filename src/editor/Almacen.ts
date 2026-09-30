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

/** Abre el selector de archivos y devuelve el texto del archivo elegido (o null). */
export function elegirArchivo(tipos = '.json,.chispa.json,application/json'): Promise<string | null> {
  return new Promise((resolver) => {
    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = tipos;
    entrada.addEventListener('change', async () => {
      const archivo = entrada.files?.[0];
      resolver(archivo ? await archivo.text() : null);
    });
    entrada.addEventListener('cancel', () => resolver(null));
    entrada.click();
  });
}
