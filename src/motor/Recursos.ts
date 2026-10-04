/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Recursos: carga y guarda las imágenes del juego.
 *
 * DECISIÓN: cargar las imágenes ANTES de empezar el juego.
 * Cargar una imagen en el navegador es asíncrono (tarda un rato y no sabemos
 * cuánto). Si intentáramos dibujarla antes de que llegue, no se vería nada.
 * Por eso cargamos todo primero (con Promesas) y luego arrancamos el bucle.
 * Es la misma idea que ContentProvider:PreloadAsync en Roblox.
 */
import { ErrorMotor } from './Errores';

export class Recursos {
  private imagenes = new Map<string, HTMLImageElement>();

  /** Carga una imagen y la guarda con un nombre corto para usarla después. */
  cargarImagen(nombre: string, ruta: string): Promise<HTMLImageElement> {
    return new Promise((resolver, rechazar) => {
      const img = new Image();
      img.onload = () => {
        this.imagenes.set(nombre, img);
        resolver(img);
      };
      img.onerror = () =>
        rechazar(
          ruta.startsWith('data:')
            ? new ErrorMotor(`No he podido cargar la imagen "${nombre}".`, 'El archivo está dañado o no es una imagen. Bórrala y vuelve a importarla (Proyecto > Imágenes).')
            : new ErrorMotor(
                `No he podido cargar la imagen "${ruta}".`,
                'Comprueba que el archivo existe dentro de la carpeta "public" y que el nombre está bien escrito ' +
                  '(las mayúsculas y minúsculas cuentan: "Estrella.svg" no es lo mismo que "estrella.svg").',
              ),
        );
      img.src = ruta;
    });
  }

  /** Carga varias imágenes a la vez. Ejemplo: { estrella: 'imagenes/estrella.svg' } */
  async cargarImagenes(lista: Record<string, string>): Promise<void> {
    await Promise.all(Object.entries(lista).map(([n, r]) => this.cargarImagen(n, r)));
  }

  /** Guarda una imagen que ya está cargada (la usa el editor al importar imágenes). */
  registrar(nombre: string, img: HTMLImageElement): void {
    this.imagenes.set(nombre, img);
  }

  /** Los nombres de las imágenes cargadas. */
  nombres(): string[] {
    return [...this.imagenes.keys()];
  }

  /** ¿Hay una imagen cargada con este nombre? */
  tiene(nombre: string): boolean {
    return this.imagenes.has(nombre);
  }

  /** Olvida una imagen (al borrarla del proyecto en el editor). */
  quitar(nombre: string): void {
    this.imagenes.delete(nombre);
  }

  /** La imagen con ese nombre, o null si no hay (para lo que es opcional: los objetos de un inventario). */
  imagenSiExiste(nombre: string): HTMLImageElement | null {
    return this.imagenes.get(nombre) ?? null;
  }

  /** Devuelve una imagen ya cargada. Si no existe, da un error claro. */
  imagen(nombre: string): HTMLImageElement {
    const img = this.imagenes.get(nombre);
    if (!img) {
      const disponibles = [...this.imagenes.keys()];
      throw new ErrorMotor(
        `Intentas usar la imagen "${nombre}", pero no está cargada.`,
        disponibles.length
          ? `Las imágenes cargadas son: ${disponibles.join(', ')}. ¿Está bien escrito el nombre?`
          : 'Todavía no se ha cargado ninguna imagen. Cárgala antes de empezar el juego.',
      );
    }
    return img;
  }
}
