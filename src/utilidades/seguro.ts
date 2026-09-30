/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * SEGURO: ayudas para que ningún nombre escrito por el usuario llegue a las
 * "tripas" de JavaScript.
 *
 * En JavaScript, TODOS los objetos {} heredan cosas ocultas: constructor,
 * toString, __proto__, hasOwnProperty... Si buscamos TABLA[nombre] con un
 * nombre que viene de un script o de un proyecto ("constructor"), en vez de
 * "no existe" nos devuelve una función de JavaScript. Por ahí se podría
 * intentar salir del intérprete (ver AUDITORIA_SEGURIDAD.md).
 *
 *  - sinPrototipo({...}): una tabla que NO hereda nada. Para las tablas fijas
 *    del motor (colores, teclas, propiedades de los objetos...).
 *  - propio(tabla, nombre): lee solo lo que la tabla tiene de verdad. Para
 *    datos que vienen del proyecto (escenas, plantillas, animaciones...).
 */
export function sinPrototipo<T extends object>(o: T): T {
  return Object.assign(Object.create(null) as T, o);
}

export function propio<T>(tabla: Readonly<Record<string, T>> | null | undefined, clave: string): T | undefined {
  return tabla && Object.prototype.hasOwnProperty.call(tabla, clave) ? tabla[clave] : undefined;
}

/** ¿La tabla tiene DE VERDAD esa clave? (a diferencia de `clave in tabla`, no cuenta lo heredado, como "constructor"). */
export function tiene(tabla: object | null | undefined, clave: string): boolean {
  return !!tabla && Object.prototype.hasOwnProperty.call(tabla, clave);
}

/**
 * El único nombre que no puede ser la clave de nada: "__proto__". Al copiar
 * una tabla con obj[clave] = valor, esa clave cambiaría la "familia" del
 * objeto en vez de guardar un dato.
 */
export function esNombreProhibido(nombre: string): boolean {
  return nombre.trim().toLowerCase() === '__proto__';
}
