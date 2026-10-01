/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * REVISIÓN DEL PROYECTO: compila y analiza TODOS los scripts sin ejecutar nada.
 *
 * Devuelve todos los errores y avisos de todos los archivos a la vez. La usan:
 *   - JuegoEnMarcha, antes de empezar (si hay errores, no se ejecuta);
 *   - el editor, mientras escribes (para subrayar en rojo y en amarillo).
 */
import { analizar } from '../chispa/analisis/analizador';
import { DatosJuego, instalarAPIMotor, type ContextoJuego } from '../chispa/api/motor';
import { ErrorChispa, ErrorCompilacion, type Diagnostico } from '../chispa/errores/ErrorChispa';
import type { Entorno } from '../chispa/ejecucion/entorno';
import { Interprete } from '../chispa/ejecucion/interprete';
import type { Programa } from '../chispa/sintaxis/ast';
import { analizarSintaxis } from '../chispa/sintaxis/parser';
import { nombresDeObjetos, type DefProyecto } from './formato';
import { revisarTextos } from './TextosConHuecos';
import { recorrerExpresiones } from '../chispa/sintaxis/recorrer';
import { sugerir } from '../chispa/errores/sugerencias';
import { normalizar } from '../utilidades/texto';
import { bibliotecasDe, entornoConBibliotecas, scriptsSinObjeto, tieneEventos } from './Bibliotecas';

export interface ResultadoRevision {
  /** Árbol de cada script que se ha podido leer (aunque tenga errores de análisis). */
  programas: Map<string, Programa>;
  /** Todos los diagnósticos (errores y avisos) de cada archivo. */
  porArchivo: Map<string, Diagnostico[]>;
  /** Solo los errores, como ErrorChispa (con archivo y código). */
  errores: ErrorChispa[];
  /** Solo los avisos. */
  avisos: Diagnostico[];
}

let globalesCacheadas: Entorno | null = null;

/**
 * Las globales de la API (mostrar, teclado, crear...) sin necesidad de un
 * juego en marcha. La API no toca el motor hasta que se USA una función.
 */
export function globalesDelMotor(): Entorno {
  if (!globalesCacheadas) {
    const interprete = new Interprete();
    instalarAPIMotor(interprete, {} as ContextoJuego, new DatosJuego());
    globalesCacheadas = interprete.globales;
  }
  return globalesCacheadas;
}

/** Las propiedades propias del proyecto: las del inspector y las que algún script asigna a otro objeto (bala.rebotes = ...). */
export function propiedadesPropias(proyecto: DefProyecto): Set<string> {
  const r = new Set<string>();
  const mirar = (o: { propiedades?: Record<string, unknown> }) => Object.keys(o.propiedades ?? {}).forEach((n) => r.add(normalizar(n)));
  for (const e of Object.values(proyecto.escenas)) e.objetos.forEach(mirar);
  Object.values(proyecto.plantillas).forEach(mirar);
  for (const codigo of Object.values(proyecto.scripts)) {
    // bala.rebotes = 3 cuenta; yo.rebotes = 3 no (podría ser yo.rebote mal escrito: para eso está el inspector)
    for (const m of codigo.matchAll(/([\p{L}_][\p{L}\p{N}_]*)\s*\.\s*([\p{L}_][\p{L}\p{N}_]*)\s*[-+*/%]?=(?!=)/gu)) {
      if (!['yo', 'otro'].includes(normalizar(m[1]))) r.add(normalizar(m[2]));
    }
  }
  return r;
}

function contextoDe(proyecto: DefProyecto, globales: Entorno) {
  return {
    propiedadesPropias: propiedadesPropias(proyecto),
    globales,
    esScript: true,
    plantillas: Object.keys(proyecto.plantillas),
    imagenes: Object.keys(proyecto.imagenes),
    sonidos: Object.keys(proyecto.sonidos ?? {}),
    escenas: Object.keys(proyecto.escenas),
    animaciones: Object.keys(proyecto.animaciones),
    efectos: Object.keys(proyecto.efectos ?? {}),
    objetosEscena: nombresDeObjetos(proyecto),
  };
}

/** Un script con «cuando» que no está en ningún objeto no se ejecuta: se avisa en su primer «cuando». */
function avisoSinObjeto(proyecto: DefProyecto, archivo: string, programa: Programa): Diagnostico[] {
  const primero = programa.sentencias.find((s) => s.tipo === 'Cuando');
  if (!primero || !scriptsSinObjeto(proyecto).includes(archivo)) return [];
  return [{
    gravedad: 'aviso',
    archivo,
    pos: primero.pos,
    mensaje: 'este script no está puesto en ningún objeto, así que no se ejecuta.',
    pista: 'Ponlo en un objeto: selecciónalo en la escena y elige este script en Propiedades > Script. (Un script sin ningún «cuando», solo con funciones, es un script de funciones: sus funciones se pueden usar desde todos.)',
  }];
}

/** Los scripts de funciones del proyecto ya leídos (los que tienen errores de escritura no cuentan). */
function leerBibliotecas(proyecto: DefProyecto, cambiado?: { archivo: string; programa: Programa }): Programa[] {
  return bibliotecasDe(proyecto).flatMap((a) => {
    if (cambiado && a === cambiado.archivo) return [cambiado.programa];
    const r = analizarSintaxis(proyecto.scripts[a], a);
    return r.errores.length ? [] : [r.programa];
  });
}

/** Revisa UN script (lo usa el editor mientras escribes). */
export function revisarScript(archivo: string, codigo: string, proyecto: DefProyecto, globales: Entorno = globalesDelMotor()): Diagnostico[] {
  const { programa, errores } = analizarSintaxis(codigo, archivo);
  if (errores.length) return errores.map((e) => e.diagnostico());
  const bib = entornoConBibliotecas(leerBibliotecas(proyecto, { archivo, programa }), globales);
  const esBiblioteca = !tieneEventos(codigo) && scriptsSinObjeto(proyecto).includes(archivo);
  return [
    ...bib.diagnosticos.filter((d) => d.archivo === archivo),
    ...avisoSinObjeto(proyecto, archivo, programa),
    ...analizar(programa, { ...contextoDe(proyecto, bib.entorno), esScript: !esBiblioteca }),
    ...avisosDeMensajes(programa, mensajesRecibidos(proyecto)),
    ...avisosDeJuego(programa, datosGuardadosEnJuego(proyecto)),
  ];
}

/**
 * Los datos de `juego` que se guardan en algún sitio: los del editor
 * («Datos del juego») y los que algún script asigna (juego.puntos = 0).
 * Normalizados → como se escribieron.
 */
export function datosGuardadosEnJuego(proyecto: DefProyecto): Map<string, string> {
  const r = new Map<string, string>();
  for (const n of Object.keys(proyecto.datos ?? {})) r.set(normalizar(n), n);
  for (const codigo of Object.values(proyecto.scripts)) {
    for (const m of codigo.matchAll(/\bjuego\s*\.\s*([\p{L}_][\p{L}\p{N}_]*)\s*(?:[-+*/%]?=)(?!=)/gu)) r.set(normalizar(m[1]), m[1]);
  }
  return r;
}

/** Se lee juego.vidas, pero NINGÚN script le da valor: fallaría al llegar ahí. */
function avisosDeJuego(programa: Programa, guardados: Map<string, string>): Diagnostico[] {
  const avisos: Diagnostico[] = [];
  const vistos = new Set<string>();
  recorrerExpresiones(programa.sentencias, (e) => {
    if (e.tipo !== 'Miembro' || e.objeto.tipo !== 'Identificador' || e.objeto.nombre !== 'juego') return;
    if (guardados.has(e.propiedad) || vistos.has(e.propiedad)) return;
    vistos.add(e.propiedad);
    const parecido = sugerir(e.original, [...guardados.values()]);
    avisos.push({
      gravedad: 'aviso',
      archivo: programa.archivo,
      pos: e.pos,
      mensaje: `ningún script guarda nada en 'juego.${e.original}', así que al leerlo el juego se parará.`,
      pista: parecido
        ? `¿Querías decir 'juego.${parecido}'?`
        : `Dale un valor al empezar (juego.${e.original} = 0) o ponlo en «Datos del juego», en el inspector de la escena.`,
    });
  });
  return avisos;
}

/**
 * Los mensajes que escucha algún script del proyecto («cuando recibo "x":»),
 * normalizados → como se escribieron. Se buscan con una expresión regular
 * (sin analizar cada script entero) porque se usa mientras se escribe.
 */
export function mensajesRecibidos(proyecto: DefProyecto): Map<string, string> {
  const r = new Map<string, string>();
  for (const codigo of Object.values(proyecto.scripts)) {
    for (const m of codigo.matchAll(/^\s*cuando\s+recibo\s+(?:"([^"\n]*)"|([^\s:"]+))\s*:/gim)) {
      const original = (m[1] ?? m[2]).trim();
      if (original) r.set(normalizar(original), original);
    }
  }
  return r;
}

/** enviar("abrir_puera") y nadie escucha ese mensaje: casi siempre es una letra cambiada. */
function avisosDeMensajes(programa: Programa, recibidos: Map<string, string>): Diagnostico[] {
  const avisos: Diagnostico[] = [];
  recorrerExpresiones(programa.sentencias, (e) => {
    if (e.tipo !== 'Llamada' || e.funcion.tipo !== 'Identificador' || e.funcion.nombre !== 'enviar') return;
    const m = e.argumentos[0];
    if (!m || m.tipo !== 'Texto' || m.partes || recibidos.has(normalizar(m.valor))) return;
    const parecido = sugerir(m.valor, [...recibidos.values()]);
    avisos.push({
      gravedad: 'aviso',
      archivo: programa.archivo,
      pos: m.pos,
      mensaje: `nadie recibe el mensaje "${m.valor}": ningún script tiene 'cuando recibo "${m.valor}":'.`,
      pista: parecido ? `¿Querías decir "${parecido}"?` : `En el script que tenga que responder, añade:\ncuando recibo "${m.valor}":`,
    });
  });
  return avisos;
}

export function revisarProyecto(proyecto: DefProyecto, globales: Entorno = globalesDelMotor()): ResultadoRevision {
  const r: ResultadoRevision = { programas: new Map(), porArchivo: new Map(), errores: [], avisos: [] };
  const bib = entornoConBibliotecas(leerBibliotecas(proyecto), globales);
  const bibliotecas = new Set(bibliotecasDe(proyecto));
  const contexto = contextoDe(proyecto, bib.entorno);
  const recibidos = mensajesRecibidos(proyecto);
  const guardados = datosGuardadosEnJuego(proyecto);

  for (const [archivo, codigo] of Object.entries(proyecto.scripts)) {
    const { programa, errores } = analizarSintaxis(codigo, archivo);
    const diagnosticos: Diagnostico[] = errores.map((e) => e.diagnostico());
    r.errores.push(...errores);
    // Solo analizamos si se ha podido leer entero (si no, saldrían errores falsos)
    if (errores.length === 0) {
      r.programas.set(archivo, programa);
      const propios = [...bib.diagnosticos.filter((d) => d.archivo === archivo), ...avisoSinObjeto(proyecto, archivo, programa)];
      const analisis = analizar(programa, { ...contexto, esScript: !bibliotecas.has(archivo) });
      for (const d of [...propios, ...analisis, ...avisosDeMensajes(programa, recibidos), ...avisosDeJuego(programa, guardados)]) {
        diagnosticos.push(d);
        if (d.gravedad === 'aviso') r.avisos.push(d);
        else r.errores.push(new ErrorChispa(d.pos, d.mensaje, d.pista).conArchivo(archivo, programa.lineas));
      }
    }
    r.porArchivo.set(archivo, diagnosticos);
  }
  // Los textos con huecos de los objetos ("Puntos: {juego.puntos}")
  const textos = revisarTextos(proyecto, bib.entorno, r.programas);
  if (textos.length) {
    r.porArchivo.set('', textos);
    for (const d of textos) r.errores.push(new ErrorChispa(d.pos, d.mensaje, d.pista));
  }
  return r;
}

/** Lanza un ErrorCompilacion con todos los errores, si los hay. */
export function comprobarRevision(r: ResultadoRevision): void {
  if (r.errores.length) throw new ErrorCompilacion(r.errores);
}
