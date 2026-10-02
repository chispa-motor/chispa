/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/** Ayudas para escribir las plantillas de proyecto: sus recursos, sus mapas y sus textos. */
import { imagenDeDibujo } from '../recursos/dibujos';
import { CANCIONES_LISTAS, SONIDOS_LISTOS } from '../recursos/sonidos';
import type { DefObjeto, DefProyecto, DefSprite } from '../proyecto/formato';
import type { TipoCasilla } from '../objetos/componentes/MapaCasillas';

/** Lo grande que se ve un dibujo de 16×16 en las plantillas (el triple). */
export const LADO = 48;

/** Los recursos de Chispa que usa una plantilla, ya metidos como van en el proyecto. */
export function recursos(dibujos: string[], sonidos: string[] = [], canciones: string[] = []): Pick<DefProyecto, 'imagenes' | 'sonidosHechos' | 'canciones'> {
  const falta = (que: string, nombre: string): never => {
    throw new Error(`La plantilla pide ${que} «${nombre}», que no está entre los recursos de Chispa.`);
  };
  return {
    imagenes: Object.fromEntries(dibujos.map((n) => [n, imagenDeDibujo(n) ?? falta('el dibujo', n)])),
    // Sin sonidos o sin canciones, ese apartado no se escribe (igual que al guardar un proyecto)
    ...(sonidos.length ? { sonidosHechos: Object.fromEntries(sonidos.map((n) => [n, structuredClone(SONIDOS_LISTOS.find((s) => s.nombre === n)?.sonido ?? falta('el sonido', n))])) } : {}),
    ...(canciones.length ? { canciones: Object.fromEntries(canciones.map((n) => [n, structuredClone(CANCIONES_LISTAS.find((c) => c.nombre === n)?.cancion ?? falta('la canción', n))])) } : {}),
  };
}

/**
 * Un mapa de casillas escrito como se ve: una línea de texto por fila (la
 * primera es la de ARRIBA) y una letra por casilla. `leyenda` dice qué tipo
 * de casilla es cada letra; las letras que no están (el punto, el espacio)
 * son huecos (o, si se da `suelo`, casillas de ese tipo: para los juegos
 * vistos desde arriba, donde debajo de cada cosa hay suelo).
 */
export function celdasDeTexto(filas: string[], leyenda: Record<string, string>, suelo?: string): Record<string, string> {
  if (filas.some((f) => f.length !== filas[0].length)) throw new Error('Todas las filas del mapa tienen que ser igual de largas.');
  const celdas: Record<string, string> = {};
  filas.forEach((fila, i) => {
    [...fila].forEach((letra, columna) => {
      const tipo = Object.prototype.hasOwnProperty.call(leyenda, letra) ? leyenda[letra] : suelo;
      if (tipo) celdas[`${columna},${filas.length - 1 - i}`] = tipo;
    });
  });
  return celdas;
}

/** Dónde están en ese mismo texto las letras que NO son casillas (el jugador, las monedas...): el centro de su casilla. */
export function sitiosDeTexto(filas: string[], letra: string, x0 = 0, y0 = 0, lado = LADO): { x: number; y: number }[] {
  const sitios: { x: number; y: number }[] = [];
  filas.forEach((fila, i) => {
    [...fila].forEach((l, columna) => {
      if (l === letra) sitios.push({ x: x0 + columna * lado + lado / 2, y: y0 + (filas.length - 1 - i) * lado + lado / 2 });
    });
  });
  return sitios;
}

/** El objeto «Mapa» de una plantilla. */
export function mapa(filas: string[], leyenda: Record<string, string>, tipos: Record<string, TipoCasilla>, capa = 0, suelo?: string, x = 0, y = 0): DefObjeto {
  return { nombre: 'Mapa', x, y, mapa: { tamano: LADO, capa, tipos, celdas: celdasDeTexto(filas, leyenda, suelo) } };
}

/** Un objeto con uno de los dibujos (de 48×48 si no se dice otra cosa). */
export function figura(nombre: string, imagen: string, x: number, y: number, extra: Partial<DefObjeto> = {}, sprite: Partial<DefSprite> = {}): DefObjeto {
  return { nombre, x, y, sprite: { imagen, ancho: LADO, alto: LADO, capa: 2, ...sprite }, ...extra };
}

/** Un texto pegado a la pantalla (marcadores, instrucciones). */
export function letrero(nombre: string, x: number, y: number, texto: string, tamano = 22, extra: Partial<DefSprite> = {}): DefObjeto {
  return { nombre, x, y, sprite: { forma: 'texto', texto, tamano, color: 'blanco', letra: 'pixel', fijo: true, capa: 20, ...extra } };
}

/** Lo que tienen todas las plantillas. */
export function proyectoBase(nombre: string): Pick<DefProyecto, 'formato' | 'version' | 'nombre' | 'ancho' | 'alto' | 'pixelArt' | 'sonidos' | 'animaciones' | 'plantillas'> {
  return { formato: 'chispa-proyecto', version: 3, nombre, ancho: 960, alto: 540, pixelArt: true, sonidos: {}, animaciones: {}, plantillas: {} };
}
