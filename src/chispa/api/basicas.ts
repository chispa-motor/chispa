/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * FUNCIONES BÁSICAS DEL LENGUAJE
 *
 * Son las que no necesitan el motor: mostrar, esperar, matemáticas, textos...
 * El intérprete las instala siempre al crearse, así que funcionan también en
 * los tests, sin juego ni escena.
 *
 * Los nombres oficiales son SIN TILDES (raiz, minimo, numero). Si alguien los
 * escribe con tilde también funcionan, porque se normalizan.
 */
import { argNumero, argTexto, sinDemasiados } from './argumentos';
import { NOMBRES_PALETAS, PALETAS, mezclarColores } from '../../motor/Estilo';
import { enumerar, sugerir } from '../errores/sugerencias';
import { propio } from '../../utilidades/seguro';
import { ErrorChispa } from '../errores/ErrorChispa';
import type { Posicion } from '../lexico/tokens';
import type { Interprete } from '../ejecucion/interprete';
import { FuncionNativa, PeticionEspera, Tabla, aTexto, nombreTipo, type Valor } from '../ejecucion/valores';
import { Vector2 } from '../../motor/Vector2';
import { normalizar } from '../../utilidades/texto';
import { azar, ponerSemilla } from '../../utilidades/azar';

type Nativa = (args: Valor[], pos: Posicion) => Valor | PeticionEspera;

export function instalarBasicas(interprete: Interprete): void {
  const g = interprete.globales;
  const funcion = (nombre: string, fn: Nativa) => g.declarar(normalizar(nombre), new FuncionNativa(nombre, fn), nombre);

  // ── Consola y tiempo ──
  funcion('mostrar', (a) => {
    interprete.alMostrar(a.map(aTexto).join(' '));
    return null;
  });
  funcion('esperar', (a, p) => {
    sinDemasiados(a, 1, 'esperar', p, 'esperar(1)');
    const s = argNumero(a, 0, 'esperar', p, 'esperar(1)', 0);
    if (s < 0) throw new ErrorChispa(p, 'no se puede esperar un tiempo negativo.');
    return new PeticionEspera(s);
  });

  // ── Azar con semilla ──
  funcion('semilla', (a, p) => {
    // semilla(1234): desde ahora el azar se repite (los mismos números, en el mismo orden). semilla() vuelve al azar de verdad
    if (a[0] === undefined || a[0] === null) {
      ponerSemilla(null);
      return null;
    }
    const n = argNumero(a, 0, 'semilla', p, 'semilla(1234)');
    if (!Number.isFinite(n)) throw new ErrorChispa(p, 'la semilla tiene que ser un número normal.', 'Ejemplo: semilla(1234)');
    ponerSemilla(n);
    return null;
  });

  // ── Colores ──
  funcion('paleta', (a, p) => {
    // paleta("pastel") → sus 8 colores; paleta("pastel", 3) → el tercero
    const ej = 'paleta("pastel", 3)';
    const nombre = normalizar(argTexto(a, 0, 'paleta', p, ej));
    const colores = propio(PALETAS, nombre);
    if (!colores) {
      const parecida = sugerir(nombre, NOMBRES_PALETAS);
      throw new ErrorChispa(p, `no hay ninguna paleta llamada "${aTexto(a[0])}".`, parecida ? `¿Querías decir "${parecida}"?` : `Las paletas son: ${enumerar(NOMBRES_PALETAS)}.`);
    }
    if (a[1] === undefined) return [...colores];
    const n = argNumero(a, 1, 'paleta', p, ej);
    if (!Number.isInteger(n) || n < 1 || n > colores.length) throw new ErrorChispa(p, `la paleta "${nombre}" tiene ${colores.length} colores, del 1 al ${colores.length}, y pides el ${n}.`, `Ejemplo: ${ej}`);
    return colores[n - 1];
  });
  funcion('mezclarColores', (a, p) => {
    // mezclarColores("rojo", "azul", 0.5) → el color de en medio
    const ej = 'mezclarColores("rojo", "amarillo", 0.5)';
    const c1 = argTexto(a, 0, 'mezclarColores', p, ej);
    const c2 = argTexto(a, 1, 'mezclarColores', p, ej);
    const t = argNumero(a, 2, 'mezclarColores', p, ej, 0.5);
    const r = mezclarColores(c1, c2, t);
    if (r === null) {
      const malo = mezclarColores(c1, c1, 0) === null ? c1 : c2;
      throw new ErrorChispa(p, `"${malo}" no es un color que se pueda mezclar.`, 'Usa un nombre (rojo, azul...) o un código como "#ff8800".');
    }
    return r;
  });

  // ── Matemáticas ──
  funcion('aleatorio', (a, p) => {
    // aleatorio() → decimal entre 0 y 1.  aleatorio(1, 6) → entero entre 1 y 6 (los dos incluidos)
    if (a.length === 0) return azar();
    const min = Math.ceil(argNumero(a, 0, 'aleatorio', p, 'aleatorio(1, 6)'));
    const max = Math.floor(argNumero(a, 1, 'aleatorio', p, 'aleatorio(1, 6)'));
    if (max < min) throw new ErrorChispa(p, `en aleatorio(${min}, ${max}) el primer número es mayor que el segundo.`, 'Ejemplo: aleatorio(1, 6)');
    return Math.floor(azar() * (max - min + 1)) + min;
  });
  funcion('elegir', (a, p) => {
    // elegir(["rojo", "verde", "azul"]) → uno al azar
    const lista = a[0];
    if (!Array.isArray(lista)) throw new ErrorChispa(p, `'elegir' necesita una lista, pero le das ${lista === undefined ? 'nada' : nombreTipo(lista)}.`, 'Ejemplo: elegir(["rojo", "verde", "azul"])');
    if (lista.length === 0) throw new ErrorChispa(p, "no se puede elegir nada de una lista vacía.");
    return lista[Math.floor(azar() * lista.length)];
  });
  funcion('probabilidad', (a, p) => {
    // probabilidad(30) → verdadero 30 de cada 100 veces
    const porcentaje = argNumero(a, 0, 'probabilidad', p, 'si probabilidad(30):');
    return azar() * 100 < porcentaje;
  });
  funcion('redondear', (a, p) => {
    const decimales = argNumero(a, 1, 'redondear', p, 'redondear(3.14159, 2)', 0);
    const f = 10 ** decimales;
    return Math.round(argNumero(a, 0, 'redondear', p, 'redondear(3.7)') * f) / f;
  });
  funcion('absoluto', (a, p) => Math.abs(argNumero(a, 0, 'absoluto', p, 'absoluto(-5)')));
  funcion('raiz', (a, p) => {
    const n = argNumero(a, 0, 'raiz', p, 'raiz(16)');
    if (n < 0) throw new ErrorChispa(p, 'no existe la raíz cuadrada de un número negativo.');
    return Math.sqrt(n);
  });
  funcion('minimo', (a, p) => {
    if (a.length === 0) throw new ErrorChispa(p, "a 'minimo' le faltan números.", 'Ejemplo: minimo(3, 8)');
    return Math.min(...a.map((_, i) => argNumero(a, i, 'minimo', p, 'minimo(3, 8)')));
  });
  funcion('maximo', (a, p) => {
    if (a.length === 0) throw new ErrorChispa(p, "a 'maximo' le faltan números.", 'Ejemplo: maximo(3, 8)');
    return Math.max(...a.map((_, i) => argNumero(a, i, 'maximo', p, 'maximo(3, 8)')));
  });
  // Ángulos en grados, como en todo el motor
  funcion('seno', (a, p) => Math.sin((argNumero(a, 0, 'seno', p, 'seno(90)') * Math.PI) / 180));
  funcion('coseno', (a, p) => Math.cos((argNumero(a, 0, 'coseno', p, 'coseno(0)') * Math.PI) / 180));
  funcion('tangente', (a, p) => Math.tan((argNumero(a, 0, 'tangente', p, 'tangente(45)') * Math.PI) / 180));
  funcion('aleatorioDecimal', (a, p) => {
    // Un número con decimales entre min y max: aleatorioDecimal(0.5, 1.5)
    const ej = 'aleatorioDecimal(0.5, 1.5)';
    const min = argNumero(a, 0, 'aleatorioDecimal', p, ej, 0);
    const max = argNumero(a, 1, 'aleatorioDecimal', p, ej, 1);
    if (max < min) throw new ErrorChispa(p, `en aleatorioDecimal(${min}, ${max}) el primer número es mayor que el segundo.`, `Ejemplo: ${ej}`);
    return min + azar() * (max - min);
  });
  funcion('limitar', (a, p) => {
    // limitar(vida, 0, 100): si se pasa de 100 da 100; si baja de 0 da 0
    const ej = 'yo.vida = limitar(yo.vida, 0, 100)';
    const v = argNumero(a, 0, 'limitar', p, ej);
    const min = argNumero(a, 1, 'limitar', p, ej);
    const max = argNumero(a, 2, 'limitar', p, ej);
    if (max < min) throw new ErrorChispa(p, `en 'limitar' el mínimo (${min}) es mayor que el máximo (${max}).`, `Ejemplo: ${ej}`);
    return Math.min(max, Math.max(min, v));
  });
  funcion('interpolar', (a, p) => {
    // A mitad de camino entre dos valores: interpolar(0, 100, 0.5) = 50. También con vectores.
    const ej = 'interpolar(0, 100, 0.25)';
    const t = argNumero(a, 2, 'interpolar', p, ej);
    const [x, y] = a;
    if (typeof x === 'number' && typeof y === 'number') return x + (y - x) * t;
    if (x instanceof Vector2 && y instanceof Vector2) return new Vector2(x.x + (y.x - x.x) * t, x.y + (y.y - x.y) * t);
    throw new ErrorChispa(p, "'interpolar' necesita dos números (o dos vectores) y cuánto avanzar de uno a otro (de 0 a 1).", `Ejemplo: ${ej}`);
  });
  funcion('redondearAbajo', (a, p) => Math.floor(argNumero(a, 0, 'redondearAbajo', p, 'redondearAbajo(3.9)')));
  funcion('redondearArriba', (a, p) => Math.ceil(argNumero(a, 0, 'redondearArriba', p, 'redondearArriba(3.1)')));
  funcion('signo', (a, p) => Math.sign(argNumero(a, 0, 'signo', p, 'signo(-5)')));
  funcion('potencia', (a, p) => argNumero(a, 0, 'potencia', p, 'potencia(2, 3)') ** argNumero(a, 1, 'potencia', p, 'potencia(2, 3)'));
  funcion('ruido', (a, p) => {
    // Números al azar pero "suaves": ruido(x) cambia poco a poco al cambiar x (nubes, terreno, temblores)
    const x = argNumero(a, 0, 'ruido', p, 'ruido(tiempo.total)');
    const y = argNumero(a, 1, 'ruido', p, 'ruido(x, y)', 0);
    return ruido(x, y);
  });
  g.declarar('pi', Math.PI, 'pi');
  funcion('vector', (a, p) => {
    sinDemasiados(a, 2, 'vector', p, 'vector(10, 20)');
    return new Vector2(argNumero(a, 0, 'vector', p, 'vector(10, 20)', 0), argNumero(a, 1, 'vector', p, 'vector(10, 20)', 0));
  });

  // ── Textos, listas y tablas ──
  funcion('longitud', (a, p) => {
    const v = a[0];
    if (typeof v === 'string') return Array.from(v).length;
    if (Array.isArray(v)) return v.length;
    if (v instanceof Tabla) return v.tamano;
    throw new ErrorChispa(p, `'longitud' funciona con textos, listas y tablas, pero le das ${v === undefined ? 'nada' : nombreTipo(v)}.`, 'Ejemplo: longitud("hola") da 4');
  });
  funcion('texto', (a, p) => {
    // texto(3.14159, 2) → "3.14" (con esos decimales, siempre, aunque sean ceros: "2.50")
    if (a[1] === undefined) return aTexto(a[0] ?? null);
    const n = argNumero(a, 0, 'texto', p, 'texto(3.14159, 2)');
    const decimales = argNumero(a, 1, 'texto', p, 'texto(3.14159, 2)');
    return n.toFixed(Math.max(0, Math.min(10, Math.round(decimales))));
  });
  funcion('rango', (a, p) => {
    // rango(1, 5) → [1, 2, 3, 4, 5]  ·  rango(0, 10, 5) → [0, 5, 10]  ·  rango(5, 1) → [5, 4, 3, 2, 1]
    const ej = 'para cada i en rango(1, 10):';
    const desde = argNumero(a, 0, 'rango', p, ej);
    const hasta = argNumero(a, 1, 'rango', p, ej);
    const paso = Math.abs(argNumero(a, 2, 'rango', p, ej, 1));
    if (paso === 0) throw new ErrorChispa(p, 'el paso del rango no puede ser 0 (no avanzaría nunca).', 'Ejemplo: rango(0, 100, 10)');
    const cuantos = Math.floor(Math.abs(hasta - desde) / paso) + 1;
    if (cuantos > 1000000) throw new ErrorChispa(p, `ese rango tendría ${cuantos} números: demasiados.`, 'Usa un rango más pequeño o un paso más grande.');
    const signo = hasta >= desde ? 1 : -1;
    return Array.from({ length: cuantos }, (_, i) => Math.round((desde + signo * i * paso) * 1e9) / 1e9);
  });
  funcion('unir', (a, p) => {
    const lista = a[0];
    if (!Array.isArray(lista)) throw new ErrorChispa(p, `'unir' necesita una lista, pero le das ${lista === undefined ? 'nada' : nombreTipo(lista)}.`, 'Ejemplo: unir(["a", "b", "c"], ", ")');
    const sep = a[1] === undefined ? ', ' : aTexto(a[1]);
    return lista.map((x) => aTexto(x)).join(sep);
  });
  funcion('numero', (a, p) => {
    const v = a[0];
    if (typeof v === 'number') return v;
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN;
    if (Number.isNaN(n)) throw new ErrorChispa(p, `no puedo convertir ${v === undefined ? 'nada' : `"${aTexto(v)}"`} en un número.`);
    return n;
  });
}

// ── Ruido suave (el que usa ruido(x, y)): "ruido de gradiente", como el Perlin de LÖVE ──

/** Un número "al azar" pero siempre el mismo para la misma esquina de la rejilla. */
function azarFijo(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** De 0 a 1, y cambia poco a poco: ruido(1.0) y ruido(1.1) se parecen. */
export function ruido(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const suave = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const gradiente = (cx: number, cy: number) => {
    const angulo = azarFijo(cx, cy) * Math.PI * 2;
    return (x - cx) * Math.cos(angulo) + (y - cy) * Math.sin(angulo);
  };
  const u = suave(x - x0);
  const v = suave(y - y0);
  const a = gradiente(x0, y0) + (gradiente(x0 + 1, y0) - gradiente(x0, y0)) * u;
  const b = gradiente(x0, y0 + 1) + (gradiente(x0 + 1, y0 + 1) - gradiente(x0, y0 + 1)) * u;
  // El gradiente da entre -0,71 y 0,71: lo pasamos a 0..1
  return Math.min(1, Math.max(0, (a + (b - a) * v) / 1.42 + 0.5));
}
