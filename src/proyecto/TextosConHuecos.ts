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
import { DOC_OBJETO } from '../chispa/api/documentacion';
import { NOMBRES_CONTROL } from '../chispa/api/controles';
import { normalizar } from '../utilidades/texto';

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
/** Lo que existe en cualquier objeto (yo.x, yo.color...), más lo de los controles (yo.valor...). */
const PROPIEDADES_DE_OBJETO = new Set([...DOC_OBJETO.map((d) => normalizar(d.nombre)), ...NOMBRES_CONTROL.map((n) => normalizar(n))]);

/** Los «yo.algo» que se leen en una expresión. */
function datosDeYo(e: Expresion, fuera: { nombre: string; original: string; pos: Expresion['pos'] }[] = []) {
  const ver = (x: Expresion) => datosDeYo(x, fuera);
  switch (e.tipo) {
    case 'Miembro':
      if (e.objeto.tipo === 'Identificador' && e.objeto.nombre === 'yo') fuera.push({ nombre: e.propiedad, original: e.original, pos: e.pos });
      else ver(e.objeto);
      break;
    case 'Texto':
      for (const p of e.partes ?? []) if (typeof p !== 'string') ver(p);
      break;
    case 'Lista':
      e.elementos.forEach(ver);
      break;
    case 'Binaria':
    case 'Logica':
      ver(e.izquierda);
      ver(e.derecha);
      break;
    case 'Unaria':
      ver(e.operando);
      break;
    case 'Llamada':
      // yo.cuantos("llave") es una llamada a algo de yo: lo comprueba quien ejecuta
      if (!(e.funcion.tipo === 'Miembro' && e.funcion.objeto.tipo === 'Identificador' && e.funcion.objeto.nombre === 'yo')) ver(e.funcion);
      e.argumentos.forEach(ver);
      break;
    case 'Indice':
      ver(e.objeto);
      ver(e.indice);
      break;
  }
  return fuera;
}

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
  // Los textos con huecos y los datos de los controles ("juego.vida": es como un texto con un solo hueco)
  const porRevisar: [string, DefObjeto, string | undefined, string][] = objetos.flatMap(([nombre, def]): [string, DefObjeto, string | undefined, string][] => [
    [nombre, def, def.sprite?.texto, `en el texto de '${nombre}'`],
    [nombre, def, def.control?.dato?.trim() ? `{${def.control.dato.trim()}}` : undefined, `en el dato de '${nombre}'`],
  ]);
  for (const [, def, texto, donde] of porRevisar) {
    if (!tieneHuecos(texto)) continue;
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
      // {Heroe.vida}: es el nombre de otro objeto → hay que buscarlo
      const objeto = objetos.find(([nombre]) => normalizar(nombre) === n.nombre)?.[0];
      const parecido = sugerir(n.original, [...propios, ...globales.nombresVisibles()]);
      res.push({
        gravedad: 'error',
        pos: n.pos,
        mensaje: `${donde}: '${n.original}' no existe.`,
        pista: objeto
          ? `'${objeto}' es otro objeto: para leer un dato suyo hay que buscarlo. Escribe: buscar("${objeto}").vida`
          : parecido ? `¿Querías decir '${parecido}'?` : 'Dentro de un hueco puede ir juego.algo, yo.algo, las variables del script del objeto o cualquier función: {redondear(tiempo.total)}',
      });
    }
    // {yo.vida} en un objeto sin script y sin esa propiedad: 'yo' es ESTE objeto (la barra, el texto), no el jugador
    if (!def.script) {
      for (const m of datosDeYo(plantilla)) {
        if (Object.keys(def.propiedades ?? {}).some((k) => normalizar(k) === m.nombre) || PROPIEDADES_DE_OBJETO.has(m.nombre)) continue;
        const dueno = objetos.find(([, o]) => o !== def && Object.keys(o.propiedades ?? {}).some((k) => normalizar(k) === m.nombre))?.[0];
        res.push({
          gravedad: 'error',
          pos: m.pos,
          mensaje: `${donde}: 'yo' es este mismo objeto, y no tiene ninguna propiedad '${m.original}'.`,
          pista: dueno
            ? `'${m.original}' es de '${dueno}'. Para leerla desde aquí: buscar("${dueno}").${m.original}`
            : `Si es de otro objeto (por ejemplo, del jugador): buscar("Jugador").${m.original}. Si es de este, créala en el inspector: Propiedades propias > + Nueva propiedad.`,
        });
      }
    }
  }
  return res;
}

