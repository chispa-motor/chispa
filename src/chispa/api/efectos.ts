/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL MÓDULO `efecto` DE CHISPA: efectos especiales listos con un comando.
 *
 *     efecto.explosion(yo)            efecto.fuego(yo)           efecto.lluvia()
 *     efecto.rayo(yo, enemigo)        efecto.golpe(otro, 25)     efecto.parar("fuego", yo)
 *
 * El sitio de un efecto se escribe como en el resto de Chispa: un objeto (el
 * efecto lo sigue), un vector, dos números (x, y) o nada (donde está el
 * objeto de este script).
 */
import { argNumero, argTexto, comoLogico } from './argumentos';
import { RefObjeto } from './objetos';
import { ErrorChispa } from '../errores/ErrorChispa';
import { enumerar, sugerir } from '../errores/sugerencias';
import type { Posicion } from '../lexico/tokens';
import { aTexto, nombreTipo, type Valor } from '../ejecucion/valores';
import { Vector2 } from '../../motor/Vector2';
import { esColorValido } from '../../motor/Color';
import type { ObjetoJuego } from '../../objetos/ObjetoJuego';
import { CLIMAS, RECETAS, type Efectos, type Sitio } from '../../objetos/Efectos';
import type { ConfigParticulas } from '../../objetos/Particulas';
import { normalizar } from '../../utilidades/texto';
import { propio } from '../../utilidades/seguro';
import { Modulo, type Metodo } from './motor';

/** Lo que el módulo necesita del juego. */
export interface ContextoEfectos {
  efectos(): Efectos;
  /** Dónde está el objeto que ejecuta el código ahora. */
  aqui(): Vector2 | null;
  /** Los efectos hechos con el editor de partículas (proyecto.efectos). */
  propios(): Record<string, ConfigParticulas>;
}

/** Los nombres de lo que tiene `efecto`, tal como se escriben. */
export const NOMBRES_EFECTO = [
  'explosion', 'fuego', 'humo', 'chispas', 'rayo', 'estela', 'onda', 'destello', 'lluvia', 'nieve', 'hojas',
  'burbujas', 'confeti', 'sangre', 'tinta', 'polvo', 'golpe', 'texto', 'usar', 'parar', 'suave',
];

/**
 * El sitio de un efecto, a partir del argumento i: un objeto, un vector, dos
 * números o nada (donde está quien lo pide). Devuelve también cuántos
 * argumentos ha usado, para leer los que vienen detrás.
 */
function sitioDe(a: Valor[], i: number, funcion: string, p: Posicion, ejemplo: string, aqui: () => Vector2 | null): { sitio: Sitio; usados: number } {
  const v = a[i];
  if (v instanceof RefObjeto) return { sitio: v.objeto, usados: 1 };
  if (v instanceof Vector2) return { sitio: { x: v.x, y: v.y }, usados: 1 };
  if (typeof v === 'number') return { sitio: { x: v, y: argNumero(a, i + 1, funcion, p, ejemplo) }, usados: 2 };
  if (v === undefined) {
    const yo = aqui();
    if (yo) return { sitio: { x: yo.x, y: yo.y }, usados: 0 };
  }
  throw new ErrorChispa(
    p,
    v === null ? `a '${funcion}' le das un objeto vacío (nulo): ese objeto no existe.` : `'${funcion}' necesita un sitio: un objeto, un vector o dos números (x, y), y le das ${v === undefined ? 'nada' : nombreTipo(v)}.`,
    `Ejemplo: ${ejemplo}`,
  );
}

/** El sitio de un efecto como punto (si es un objeto, donde está ahora). */
const punto = (s: Sitio) => ('transformacion' in s ? s.transformacion.posicion : s);

export function crearModuloEfecto(ctx: ContextoEfectos): Modulo {
  const e = () => ctx.efectos();
  const sitio = (a: Valor[], i: number, f: string, p: Posicion, ej: string) => sitioDe(a, i, `efecto.${f}`, p, ej, ctx.aqui);
  const segundos = (a: Valor[], i: number, f: string, p: Posicion, ej: string) => {
    if (a[i] === undefined) return Infinity;
    const s = argNumero(a, i, `efecto.${f}`, p, ej);
    if (s <= 0) throw new ErrorChispa(p, `los segundos que dura el efecto tienen que ser más de 0, y le das ${s}.`, `Ejemplo: ${ej}`);
    return s;
  };
  const objeto = (a: Valor[], f: string, p: Posicion, ej: string): ObjetoJuego => {
    if (a[0] instanceof RefObjeto) return a[0].objeto;
    throw new ErrorChispa(p, `'efecto.${f}' necesita un objeto, y le das ${a[0] === undefined ? 'nada' : a[0] === null ? 'un objeto vacío (nulo)' : nombreTipo(a[0])}.`, `Ejemplo: ${ej}`);
  };
  /** Un efecto que dura (fuego, humo, burbujas...): en un sitio o pegado a un objeto. */
  const continuo = (nombre: string): Metodo => (a, p) => {
    const ej = `efecto.${nombre}(yo, 3)`;
    const { sitio: s, usados } = sitio(a, 0, nombre, p, ej);
    e().empezar(nombre, RECETAS[nombre], s, segundos(a, usados, nombre, p, ej));
    return null;
  };
  /** Un efecto de golpe (chispas, confeti...). */
  const deGolpe = (nombre: string, lanzar?: (s: Sitio) => void): Metodo => (a, p) => {
    const { sitio: s } = sitio(a, 0, nombre, p, `efecto.${nombre}(yo)`);
    if (lanzar) lanzar(s);
    else {
      const q = punto(s);
      e().lanzar(RECETAS[nombre], q.x, q.y);
    }
    return null;
  };
  /** El clima (lluvia, nieve, hojas): por toda la pantalla. Intensidad 0 lo para. */
  const clima = (nombre: string): Metodo => (a, p) => {
    const intensidad = argNumero(a, 0, `efecto.${nombre}`, p, `efecto.${nombre}(2)`, 1);
    if (intensidad < 0 || intensidad > 10) throw new ErrorChispa(p, `la intensidad va de 0 (nada) a 10 (muchísima), y le das ${intensidad}.`, `Ejemplo: efecto.${nombre}(2)`);
    if (intensidad === 0) e().parar(nombre, undefined, true);
    else e().empezar(nombre, RECETAS[nombre], 'pantalla', Infinity, intensidad);
    return null;
  };

  return new Modulo(
    'efecto',
    {
      suave: {
        obtener: () => e().suave,
        asignar: (v, p) => (e().suave = comoLogico(v, 'efecto.suave', p)),
      },
    },
    {
      explosion: (a, p) => {
        const ej = 'efecto.explosion(yo, 2)';
        const { sitio: s, usados } = sitio(a, 0, 'explosion', p, ej);
        const q = punto(s);
        const tamano = argNumero(a, usados, 'efecto.explosion', p, ej, 1);
        if (tamano <= 0) throw new ErrorChispa(p, `el tamaño de la explosión tiene que ser más de 0, y le das ${tamano}.`, `Ejemplo: ${ej}`);
        e().explosion(q.x, q.y, tamano);
        return null;
      },
      fuego: continuo('fuego'),
      humo: continuo('humo'),
      burbujas: continuo('burbujas'),
      estela: (a, p) => {
        const ej = 'efecto.estela(yo)';
        e().empezar('estela', RECETAS.estela, objeto(a, 'estela', p, ej), segundos(a, 1, 'estela', p, 'efecto.estela(yo, 2)'));
        return null;
      },
      chispas: deGolpe('chispas'),
      confeti: deGolpe('confeti'),
      sangre: deGolpe('sangre', (s) => {
        const q = punto(s);
        e().sangre(q.x, q.y);
      }),
      tinta: deGolpe('tinta'),
      destello: (a, p) => {
        const ej = 'efecto.destello(yo, 150)';
        const { sitio: s, usados } = sitio(a, 0, 'destello', p, ej);
        const q = punto(s);
        e().destello(q.x, q.y, Math.max(1, argNumero(a, usados, 'efecto.destello', p, ej, 120)));
        return null;
      },
      onda: (a, p) => {
        const ej = 'efecto.onda(yo, 200)';
        const { sitio: s, usados } = sitio(a, 0, 'onda', p, ej);
        const q = punto(s);
        e().onda(q.x, q.y, Math.max(1, argNumero(a, usados, 'efecto.onda', p, ej, 150)));
        return null;
      },
      rayo: (a, p) => {
        const ej = 'efecto.rayo(yo, buscar("Enemigo"))';
        const desde = sitio(a, 0, 'rayo', p, ej);
        if (a[desde.usados] === undefined) throw new ErrorChispa(p, "'efecto.rayo' necesita dos sitios: de dónde sale y adónde va.", `Ejemplo: ${ej}`);
        const hasta = sitio(a, desde.usados, 'rayo', p, ej);
        const i = desde.usados + hasta.usados;
        const color = a[i] === undefined ? undefined : argTexto(a, i, 'efecto.rayo', p, 'efecto.rayo(yo, otro, "amarillo")');
        if (color !== undefined && !esColorValido(color)) throw new ErrorChispa(p, `"${color}" no es un color.`, 'Ejemplo: efecto.rayo(yo, otro, "amarillo")');
        e().rayo(desde.sitio, hasta.sitio, color);
        return null;
      },
      lluvia: clima('lluvia'),
      nieve: clima('nieve'),
      hojas: clima('hojas'),
      polvo: (a, p) => {
        e().polvo(objeto(a, 'polvo', p, 'efecto.polvo(yo)'));
        return null;
      },
      golpe: (a, p) => {
        const o = objeto(a, 'golpe', p, 'efecto.golpe(otro, 25)');
        const d = a[1];
        // Un número de daño sale como "-25"; un texto, tal cual ("¡Crítico!")
        e().golpe(o, d === undefined || d === null ? null : typeof d === 'number' ? (d > 0 ? `-${d}` : `+${-d}`) : aTexto(d));
        return null;
      },
      texto: (a, p) => {
        const ej = 'efecto.texto("+1", yo, "amarillo")';
        // Un texto que sube y se va: con 200 letras sobra (uno larguísimo costaría mucho de pintar)
        const texto = aTexto(a[0] ?? null).slice(0, 200);
        if (a[0] === undefined) throw new ErrorChispa(p, "'efecto.texto' necesita el texto que sale.", `Ejemplo: ${ej}`);
        const { sitio: s, usados } = sitio(a, 1, 'texto', p, ej);
        const color = a[1 + usados] === undefined ? 'blanco' : argTexto(a, 1 + usados, 'efecto.texto', p, ej);
        if (!esColorValido(color)) throw new ErrorChispa(p, `"${color}" no es un color.`, `Ejemplo: ${ej}`);
        const q = punto(s);
        e().texto(texto, q.x, q.y, color);
        return null;
      },
      usar: (a, p) => {
        // Un efecto hecho con el editor de partículas (o uno de los listos, por su nombre)
        const ej = 'efecto.usar("magia", yo)';
        const nombre = argTexto(a, 0, 'efecto.usar', p, ej);
        const propios = ctx.propios();
        const config = propio(propios, nombre) ?? propio(RECETAS, normalizar(nombre));
        if (!config) {
          const hay = [...Object.keys(propios), ...Object.keys(RECETAS)];
          const parecido = sugerir(nombre, hay);
          throw new ErrorChispa(p, `no hay ningún efecto llamado "${nombre}".`, parecido ? `¿Querías decir "${parecido}"?` : Object.keys(propios).length ? `Tus efectos: ${enumerar(Object.keys(propios))}.` : 'Los efectos propios se hacen en el editor: Proyecto > Efectos > Nuevo.');
        }
        const { sitio: s, usados } = sitio(a, 1, 'usar', p, ej);
        if ((config.porSegundo ?? 0) > 0) e().empezar(nombre, config, s, segundos(a, 1 + usados, 'usar', p, 'efecto.usar("magia", yo, 3)'));
        else {
          const q = punto(s);
          e().lanzar(config, q.x, q.y);
        }
        return null;
      },
      parar: (a, p) => {
        // efecto.parar() → todos; efecto.parar("fuego") → todos los fuegos; efecto.parar("fuego", yo) → el de este objeto
        if (a[0] === undefined) {
          e().parar();
          return null;
        }
        const nombre = argTexto(a, 0, 'efecto.parar', p, 'efecto.parar("fuego", yo)');
        const n = normalizar(nombre);
        const conocidos = [...Object.keys(RECETAS), ...Object.keys(ctx.propios())];
        const real = conocidos.find((k) => normalizar(k) === n);
        if (!real) {
          const parecido = sugerir(nombre, conocidos);
          throw new ErrorChispa(p, `no hay ningún efecto llamado "${nombre}" que parar.`, parecido ? `¿Querías decir "${parecido}"?` : 'Ejemplo: efecto.parar("fuego", yo)');
        }
        if (a[1] === undefined) e().parar(real, undefined, (CLIMAS as readonly string[]).includes(real));
        else e().parar(real, sitio(a, 1, 'parar', p, 'efecto.parar("fuego", yo)').sitio);
        return null;
      },
    },
    NOMBRES_EFECTO,
  );
}
