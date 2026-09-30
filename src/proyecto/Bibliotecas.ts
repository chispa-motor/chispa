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
 * DECISIÓN: sin «importar». Basta con crear el script y no ponerlo en ningún
 * objeto. Sus variables son solo suyas (las comparten sus funciones), y dentro
 * no hay `yo` (no es de nadie): el objeto se pasa como un valor más.
 * Los `cuando` de un script de funciones no se ejecutan nunca, y se avisa.
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

/** Los archivos que son scripts de funciones. */
export function bibliotecasDe(proyecto: DefProyecto): string[] {
  const usados = scriptsDeObjetos(proyecto);
  return Object.keys(proyecto.scripts).filter((a) => !usados.has(a));
}

/** Las funciones escritas en el nivel principal de un programa. */
export function funcionesDe(programa: Programa): SentenciaFuncion[] {
  return programa.sentencias.filter((s): s is SentenciaFuncion => s.tipo === 'Funcion');
}

/**
 * Un entorno con las globales del motor MÁS las funciones de las bibliotecas
 * (para el análisis: así `quemar(yo, 3)` no da "no existe"), y los avisos y
 * errores propios de las bibliotecas (nombres repetidos, `cuando` que no se ejecutan).
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
      } else if (s.tipo === 'Cuando') {
        diagnosticos.push({
          gravedad: 'aviso',
          archivo: p.archivo,
          pos: s.pos,
          mensaje: 'este script no es de ningún objeto, así que sus «cuando» no se ejecutan nunca.',
          pista: 'Ponlo en un objeto (inspector > Script) o, si es un script de funciones, deja solo funciones y variables.',
        });
      } else if (s.tipo !== 'Variable') {
        diagnosticos.push({ gravedad: 'aviso', archivo: p.archivo, pos: s.pos, mensaje: 'en un script de funciones esto no se ejecuta: solo cuentan las funciones y las variables.', pista: 'Mételo dentro de una función, o pon el script en un objeto.' });
      }
    }
  }
  return { entorno, diagnosticos };
}
