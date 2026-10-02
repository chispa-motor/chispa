/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LOS CONTROLES DE INTERFAZ DESDE CHISPA: lo que tiene de más un objeto que
 * es un botón, una barra, un deslizador, una casilla, un campo de texto, una
 * lista, un menú, una ventana, un inventario, un minimapa o un icono.
 *
 *   yo.valor       lo que vale (un número, verdadero/falso, un texto, la opción elegida...)
 *   yo.minimo  yo.maximo          entre qué valores (barra y deslizador)
 *   yo.opciones    yo.elegido     lo que ofrece una lista o un menú, y cuál está elegida (1 = la primera)
 *   yo.activado    yo.titulo
 *   yo.abrir()  yo.cerrar()       enseñar y esconder (con todo lo que lleva dentro)
 *   yo.meter("llave", 1)  yo.sacar("llave")  yo.cuantos("llave")  yo.vaciar()     el inventario
 *   yo.enfocar()                  empezar a escribir en un campo de texto
 *
 * Solo existen en los objetos que son un control: en los demás, esos nombres
 * siguen libres para las propiedades y funciones de quien programa.
 */
import { ErrorChispa } from '../errores/ErrorChispa';
import { enumerar } from '../errores/sugerencias';
import type { Posicion } from '../lexico/tokens';
import { aTexto, nombreTipo, type Valor } from '../ejecucion/valores';
import type { ObjetoJuego } from '../../objetos/ObjetoJuego';
import { Control, MAXIMO_OPCIONES, NOMBRES_CONTROLES, type TipoControl } from '../../objetos/componentes/Control';
import { Sprite } from '../../objetos/componentes/Sprite';
import { argNumero, argTexto, comoLogico, comoNumero } from './argumentos';

interface Propiedad {
  obtener: (c: Control, o: ObjetoJuego, pos: Posicion) => Valor;
  asignar?: (c: Control, v: Valor, pos: Posicion, o: ObjetoJuego) => void;
}

/** Un control que no es del tipo que hace falta: se dice cuál es y cuáles valen. */
function soloEn(c: Control, tipos: TipoControl[], que: string, pos: Posicion): void {
  if (tipos.includes(c.tipo)) return;
  throw new ErrorChispa(
    pos,
    `'${que}' no vale para ${articulo(c.tipo)}.`,
    `'${que}' es de: ${enumerar(tipos.map((t) => NOMBRES_CONTROLES[t].toLowerCase()))}.`,
  );
}
const articulo = (t: TipoControl) => `${['barra', 'casilla', 'lista', 'ventana'].includes(t) ? 'una' : 'un'} ${t === 'boton' ? 'botón' : t === 'menu' ? 'menú' : t === 'campo' ? 'campo de texto' : t}`;

const CON_OPCIONES: TipoControl[] = ['lista', 'menu'];

export const PROPIEDADES_CONTROL: Record<string, Propiedad> = Object.assign(Object.create(null), {
  valor: {
    obtener: (c) => c.valor,
    asignar: (c, v, p, o) => {
      switch (c.tipo) {
        case 'barra': case 'deslizador': case 'icono':
          c.ponerNumero(comoNumero(v, 'valor', p));
          break;
        case 'casilla':
          c.marcada = comoLogico(v, 'valor', p);
          break;
        case 'campo': {
          const s = o.obtener(Sprite)!;
          s.texto = [...aTexto(v)].slice(0, c.largoMaximo).join('');
          s.textoVivo = null;
          break;
        }
        case 'lista': case 'menu': {
          // Se elige por su texto (o nulo para no elegir ninguna)
          if (v === null) {
            c.elegir(-1);
            break;
          }
          const i = c.opciones.indexOf(aTexto(v));
          if (i < 0) throw new ErrorChispa(p, `no hay ninguna opción "${aTexto(v)}".`, c.opciones.length ? `Las opciones son: ${c.opciones.slice(0, 12).map((x) => `"${x}"`).join(', ')}.` : 'Todavía no tiene opciones: yo.opciones = ["Jugar", "Salir"]');
          c.elegir(i);
          break;
        }
        default:
          throw new ErrorChispa(p, `${articulo(c.tipo)} no tiene un valor que se pueda cambiar.`, c.tipo === 'inventario' ? 'Para meter y sacar cosas: yo.meter("llave") y yo.sacar("llave"). Para elegir una casilla: yo.elegido = 1' : undefined);
      }
    },
  },
  minimo: {
    obtener: (c) => c.minimo,
    asignar: (c, v, p) => {
      soloEn(c, ['barra', 'deslizador'], 'minimo', p);
      c.minimo = comoNumero(v, 'minimo', p);
      c.ponerNumero(c.numero);
    },
  },
  maximo: {
    obtener: (c) => c.maximo,
    asignar: (c, v, p) => {
      soloEn(c, ['barra', 'deslizador'], 'maximo', p);
      const n = comoNumero(v, 'maximo', p);
      if (n < c.minimo) throw new ErrorChispa(p, `el máximo (${n}) no puede ser menor que el mínimo (${c.minimo}).`, 'Ejemplo: yo.maximo = 100');
      c.maximo = n;
      c.ponerNumero(c.numero);
    },
  },
  opciones: {
    obtener: (c) => [...c.opciones],
    asignar: (c, v, p) => {
      soloEn(c, CON_OPCIONES, 'opciones', p);
      if (!Array.isArray(v)) throw new ErrorChispa(p, `las opciones son una lista de textos, y le das ${nombreTipo(v)}.`, 'Ejemplo: yo.opciones = ["Jugar", "Opciones", "Salir"]');
      if (v.length > MAXIMO_OPCIONES) throw new ErrorChispa(p, `como mucho caben ${MAXIMO_OPCIONES} opciones, y le das ${v.length}.`);
      const elegida = c.valor;
      c.opciones = v.map((x) => aTexto(x));
      // Si la opción elegida sigue estando, sigue elegida
      c.elegido = typeof elegida === 'string' ? c.opciones.indexOf(elegida) : -1;
    },
  },
  elegido: {
    // En Chispa se cuenta desde 1 (0 = ninguna)
    obtener: (c) => c.elegido + 1,
    asignar: (c, v, p) => {
      soloEn(c, [...CON_OPCIONES, 'inventario'], 'elegido', p);
      const n = comoNumero(v, 'elegido', p);
      const cuantas = c.tipo === 'inventario' ? c.columnas * c.filas : c.opciones.length;
      if (!Number.isInteger(n) || n < 0 || n > cuantas) throw new ErrorChispa(p, `'elegido' va de 1 a ${cuantas} (o 0 para ninguna), y le das ${n}.`, 'La primera es la 1.');
      c.elegir(n - 1);
    },
  },
  activado: {
    obtener: (c) => c.activado,
    asignar: (c, v, p) => {
      c.activado = comoLogico(v, 'activado', p);
    },
  },
  titulo: {
    obtener: (c) => c.titulo,
    asignar: (c, v, p) => {
      soloEn(c, ['ventana'], 'titulo', p);
      c.titulo = aTexto(v).slice(0, 200);
    },
  },
} satisfies Record<string, Propiedad>);

export const METODOS_CONTROL: Record<string, (c: Control, args: Valor[], pos: Posicion) => Valor> = Object.assign(Object.create(null), {
  abrir: (c: Control) => {
    c.abrir();
    return null;
  },
  cerrar: (c: Control) => {
    c.cerrar();
    return null;
  },
  enfocar: (c: Control, _a: Valor[], p: Posicion) => {
    soloEn(c, ['campo'], 'enfocar', p);
    c.enfocar();
    return null;
  },
  meter: (c: Control, a: Valor[], p: Posicion) => {
    // yo.meter("llave", 2): devuelve falso si no cabe (todas las casillas ocupadas)
    const ej = 'yo.meter("llave", 1)';
    soloEn(c, ['inventario'], 'meter', p);
    const cantidad = argNumero(a, 1, 'meter', p, ej, 1);
    if (!(cantidad > 0)) throw new ErrorChispa(p, `la cantidad tiene que ser más de 0, y le das ${cantidad}.`, `Para quitar cosas: yo.sacar("llave", 1). Ejemplo: ${ej}`);
    return c.meter(argTexto(a, 0, 'meter', p, ej), cantidad);
  },
  sacar: (c: Control, a: Valor[], p: Posicion) => {
    // yo.sacar("llave", 2): devuelve cuántas ha sacado de verdad
    const ej = 'yo.sacar("llave", 1)';
    soloEn(c, ['inventario'], 'sacar', p);
    const cantidad = argNumero(a, 1, 'sacar', p, ej, 1);
    if (!(cantidad > 0)) throw new ErrorChispa(p, `la cantidad tiene que ser más de 0, y le das ${cantidad}.`, `Ejemplo: ${ej}`);
    return c.sacar(argTexto(a, 0, 'sacar', p, ej), cantidad);
  },
  cuantos: (c: Control, a: Valor[], p: Posicion) => {
    soloEn(c, ['inventario'], 'cuantos', p);
    return c.cuantos(argTexto(a, 0, 'cuantos', p, 'yo.cuantos("llave")'));
  },
  vaciar: (c: Control, _a: Valor[], p: Posicion) => {
    soloEn(c, ['inventario'], 'vaciar', p);
    c.vaciar();
    return null;
  },
});

/** Los nombres, como se escriben (para las sugerencias). */
export const NOMBRES_CONTROL = ['valor', 'minimo', 'maximo', 'opciones', 'elegido', 'activado', 'titulo', 'abrir', 'cerrar', 'enfocar', 'meter', 'sacar', 'cuantos', 'vaciar'];

/** ¿Es un nombre de los controles? (normalizado) */
export function esDeControl(nombre: string): boolean {
  return nombre in PROPIEDADES_CONTROL || nombre in METODOS_CONTROL;
}

/** El control de un objeto (o null si no es un control). */
export const controlDe = (o: ObjetoJuego): Control | null => o.obtener(Control) ?? null;
