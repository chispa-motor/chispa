/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * TEXTOS CON HUECOS puestos en el editor: "Puntos: {juego.puntos}".
 *
 * Un texto de un objeto (su letrero, su etiqueta) puede llevar huecos entre
 * llaves. En el juego, lo que va dentro se calcula en CADA FOTOGRAMA, así que
 * el texto se actualiza solo, sin escribir código.
 *
 * Dentro de un hueco puede ir cualquier valor de Chispa: juego.puntos,
 * yo.vida, redondear(tiempo.total), las variables del script del objeto...
 * Para escribir una llave de verdad se ponen dos: {{ y }}.
 */
import type { Diagnostico } from '../chispa/errores/ErrorChispa';
import { ErrorChispa } from '../chispa/errores/ErrorChispa';
import { sugerir } from '../chispa/errores/sugerencias';
import type { Entorno } from '../chispa/ejecucion/entorno';
import type { Expresion, Programa } from '../chispa/sintaxis/ast';
import { textoConHuecos } from '../chispa/sintaxis/parser';
import type { DefObjeto, DefProyecto } from './formato';

/** ¿Tiene huecos? (una llave sola; "{{" es una llave escrita a propósito) */
export function tieneHuecos(texto: string | undefined): boolean {
  return !!texto && /\{(?!\{)/.test(texto.replace(/\{\{|\}\}/g, ''));
}

/** El texto del editor escrito como un texto de Chispa, entre comillas (para situar los errores). */
export function fuenteDeTexto(texto: string): string {
  return '"' + texto.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
}

/** Convierte el texto del editor en una expresión de Chispa (lanza ErrorChispa si está mal escrito). */
export function plantillaDeTexto(texto: string): Expresion {
  const original = fuenteDeTexto(texto);
  return textoConHuecos({ tipo: 'texto', valor: texto, original, linea: 1, columna: 1 }, [original]);
}

/** Nombres que se usan sueltos en una expresión (para comprobar que existen). */
function nombresUsados(e: Expresion, fuera: { nombre: string; original: string; pos: Expresion['pos'] }[] = []) {
  switch (e.tipo) {
    case 'Identificador':
      fuera.push({ nombre: e.nombre, original: e.original, pos: e.pos });
      break;
    case 'Texto':
      for (const p of e.partes ?? []) if (typeof p !== 'string') nombresUsados(p, fuera);
      break;
    case 'Lista':
      e.elementos.forEach((x) => nombresUsados(x, fuera));
      break;
    case 'Tabla':
      e.entradas.forEach((x) => nombresUsados(x.valor, fuera));
      break;
    case 'Binaria':
    case 'Logica':
      nombresUsados(e.izquierda, fuera);
      nombresUsados(e.derecha, fuera);
      break;
    case 'Unaria':
      nombresUsados(e.operando, fuera);
      break;
    case 'Llamada':
      nombresUsados(e.funcion, fuera);
      e.argumentos.forEach((x) => nombresUsados(x, fuera));
      break;
    case 'Miembro':
      nombresUsados(e.objeto, fuera);
      break;
    case 'Indice':
      nombresUsados(e.objeto, fuera);
      nombresUsados(e.indice, fuera);
      break;
  }
  return fuera;
}

/** Nombres creados en el nivel principal de un script (variables y funciones). */
function nombresDelScript(p: Programa | undefined): string[] {
  if (!p) return [];
  return p.sentencias.flatMap((s) => (s.tipo === 'Variable' ? [s.nombre] : s.tipo === 'Funcion' ? [s.nombre] : []));
}

/**
 * Revisa los textos con huecos de todos los objetos y plantillas: que estén
 * bien escritos y que lo que usan exista (antes de pulsar Ejecutar).
 */
export function revisarTextos(proyecto: DefProyecto, globales: Entorno, programas: Map<string, Programa>): Diagnostico[] {
  const res: Diagnostico[] = [];
  const objetos: [string, DefObjeto][] = [
    ...Object.values(proyecto.escenas).flatMap((e) => e.objetos.map((o): [string, DefObjeto] => [o.nombre ?? 'objeto', o])),
    ...Object.entries(proyecto.plantillas),
  ];
  for (const [nombre, def] of objetos) {
    const texto = def.sprite?.texto;
    if (!tieneHuecos(texto)) continue;
    const donde = `en el texto de '${nombre}'`;
    let plantilla: Expresion;
    try {
      plantilla = plantillaDeTexto(texto!);
    } catch (e) {
      if (!(e instanceof ErrorChispa)) throw e;
      res.push({ gravedad: 'error', pos: e.posicion, mensaje: `${donde}: ${e.mensajeCorto}`, pista: e.pista });
      continue;
    }
    const propios = new Set(['yo', ...nombresDelScript(def.script ? programas.get(def.script) : undefined)]);
    for (const n of nombresUsados(plantilla)) {
      if (propios.has(n.nombre) || globales.buscar(n.nombre)) continue;
      const parecido = sugerir(n.original, [...propios, ...globales.nombresVisibles()]);
      res.push({
        gravedad: 'error',
        pos: n.pos,
        mensaje: `${donde}: '${n.original}' no existe.`,
        pista: parecido ? `¿Querías decir '${parecido}'?` : 'Dentro de un hueco puede ir juego.algo, yo.algo, las variables del script del objeto o cualquier función: {redondear(tiempo.total)}',
      });
    }
  }
  return res;
}

