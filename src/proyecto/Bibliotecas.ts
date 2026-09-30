/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * SCRIPTS DE FUNCIONES (bibliotecas): un script que no es de ningún objeto.
 *
 * Sus FUNCIONES se pueden usar desde cualquier script del proyecto, como si
 * fueran del motor. Así el código que necesitan varios objetos (el daño, los
 * efectos de estado, los números que flotan...) se escribe una sola vez:
 *
 *     # estados.chs (no se pone en ningún objeto)
 *     funcion quemar(quien, segundos):
 *         quien.quemado = segundos
 *
 *     # enemigo.chs
 *     cuando toco Fuego:
 *         quemar(yo, 3)
 *
 * DECISIÓN: sin «importar». Basta con crear el script, escribir solo
 * funciones (y variables) y no ponerlo en ningún objeto. Sus variables son
 * solo suyas (las comparten sus funciones), y dentro no hay `yo` (no es de
 * nadie): el objeto se pasa como un valor más.
 * Un script con algún `cuando` es de un objeto: si no está en ninguno, no es
 * una biblioteca; es un script que se ha quedado sin objeto, y se avisa.
 */
import type { Diagnostico } from '../chispa/errores/ErrorChispa';
import { Entorno } from '../chispa/ejecucion/entorno';
import { FuncionChispa } from '../chispa/ejecucion/valores';
import type { Programa, SentenciaFuncion } from '../chispa/sintaxis/ast';
import type { DefObjeto, DefProyecto } from './formato';

/** Los scripts que usa algún objeto (de cualquier escena) o alguna plantilla. */
export function scriptsDeObjetos(proyecto: DefProyecto): Set<string> {
  const usados = new Set<string>();
  const mirar = (o: DefObjeto) => o.script && usados.add(o.script);
  for (const e of Object.values(proyecto.escenas)) e.objetos.forEach(mirar);
  Object.values(proyecto.plantillas).forEach(mirar);
  return usados;
}

/** ¿Tiene el código algún «cuando» (en el nivel principal)? Entonces es el script de un objeto. */
export const tieneEventos = (codigo: string) => /^cuando\b/im.test(codigo);

/** Los scripts que no están en ningún objeto ni plantilla. */
export function scriptsSinObjeto(proyecto: DefProyecto): string[] {
  const usados = scriptsDeObjetos(proyecto);
  return Object.keys(proyecto.scripts).filter((a) => !usados.has(a));
}

/** Los archivos que son scripts de funciones: sin objeto y sin ningún «cuando». */
export function bibliotecasDe(proyecto: DefProyecto): string[] {
  return scriptsSinObjeto(proyecto).filter((a) => !tieneEventos(proyecto.scripts[a]));
}

/** Las funciones escritas en el nivel principal de un programa. */
export function funcionesDe(programa: Programa): SentenciaFuncion[] {
  return programa.sentencias.filter((s): s is SentenciaFuncion => s.tipo === 'Funcion');
}

/**
 * Un entorno con las globales del motor MÁS las funciones de las bibliotecas
 * (para el análisis: así `quemar(yo, 3)` no da "no existe"), y los avisos y
 * errores propios de las bibliotecas (nombres repetidos, órdenes sueltas que no se ejecutan).
 */
export function entornoConBibliotecas(bibliotecas: Programa[], globales: Entorno): { entorno: Entorno; diagnosticos: Diagnostico[] } {
  const entorno = new Entorno(globales);
  const diagnosticos: Diagnostico[] = [];
  const deQuien = new Map<string, string>();
  for (const p of bibliotecas) {
    for (const s of p.sentencias) {
      if (s.tipo === 'Funcion') {
        if (globales.buscar(s.nombre)) {
          diagnosticos.push({ gravedad: 'error', archivo: p.archivo, pos: s.pos, mensaje: `ya hay una función del motor que se llama '${s.original}'.`, pista: 'Ponle otro nombre a tu función (las de un script de funciones se pueden usar desde todos los scripts).' });
          continue;
        }
        const otra = deQuien.get(s.nombre);
        if (otra) {
          diagnosticos.push({ gravedad: 'error', archivo: p.archivo, pos: s.pos, mensaje: `la función '${s.original}' ya está en el script de funciones ${otra}.`, pista: 'Dos scripts de funciones no pueden tener una función con el mismo nombre: cambia uno de los dos.' });
          continue;
        }
        deQuien.set(s.nombre, p.archivo);
        entorno.declarar(s.nombre, new FuncionChispa(s, entorno, { programa: p, objeto: undefined }), s.original);
      } else if (s.tipo !== 'Variable') {
        diagnosticos.push({ gravedad: 'aviso', archivo: p.archivo, pos: s.pos, mensaje: 'en un script de funciones esto no se ejecuta: solo cuentan las funciones y las variables.', pista: 'Mételo dentro de una función, o pon el script en un objeto.' });
      }
    }
  }
  return { entorno, diagnosticos };
}
