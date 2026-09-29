/**
 * FUNCIONES BÁSICAS DEL LENGUAJE
 *
 * Son las que no necesitan el motor: mostrar, esperar, matemáticas, textos...
 * El intérprete las instala siempre al crearse, así que funcionan también en
 * los tests, sin juego ni escena.
 *
 * Los nombres se registran normalizados (sin tildes): `raíz` y `raiz` son lo mismo.
 */
import { argNumero, sinDemasiados } from './argumentos';
import { ErrorChispa } from '../errores/ErrorChispa';
import type { Posicion } from '../lexico/tokens';
import type { Interprete } from '../ejecucion/interprete';
import { FuncionNativa, PeticionEspera, Tabla, aTexto, nombreTipo, type Valor } from '../ejecucion/valores';
import { Vector2 } from '../../motor/Vector2';
import { normalizar } from '../../utilidades/texto';

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

  // ── Matemáticas ──
  funcion('aleatorio', (a, p) => {
    // aleatorio() → decimal entre 0 y 1.  aleatorio(1, 6) → entero entre 1 y 6 (los dos incluidos)
    if (a.length === 0) return Math.random();
    const min = Math.ceil(argNumero(a, 0, 'aleatorio', p, 'aleatorio(1, 6)'));
    const max = Math.floor(argNumero(a, 1, 'aleatorio', p, 'aleatorio(1, 6)'));
    if (max < min) throw new ErrorChispa(p, `en aleatorio(${min}, ${max}) el primer número es mayor que el segundo.`, 'Ejemplo: aleatorio(1, 6)');
    return Math.floor(Math.random() * (max - min + 1)) + min;
  });
  funcion('redondear', (a, p) => {
    const decimales = argNumero(a, 1, 'redondear', p, 'redondear(3.14159, 2)', 0);
    const f = 10 ** decimales;
    return Math.round(argNumero(a, 0, 'redondear', p, 'redondear(3.7)') * f) / f;
  });
  funcion('absoluto', (a, p) => Math.abs(argNumero(a, 0, 'absoluto', p, 'absoluto(-5)')));
  funcion('raíz', (a, p) => {
    const n = argNumero(a, 0, 'raíz', p, 'raiz(16)');
    if (n < 0) throw new ErrorChispa(p, 'no existe la raíz cuadrada de un número negativo.');
    return Math.sqrt(n);
  });
  funcion('mínimo', (a, p) => {
    if (a.length === 0) throw new ErrorChispa(p, "a 'minimo' le faltan números.", 'Ejemplo: minimo(3, 8)');
    return Math.min(...a.map((_, i) => argNumero(a, i, 'minimo', p, 'minimo(3, 8)')));
  });
  funcion('máximo', (a, p) => {
    if (a.length === 0) throw new ErrorChispa(p, "a 'maximo' le faltan números.", 'Ejemplo: maximo(3, 8)');
    return Math.max(...a.map((_, i) => argNumero(a, i, 'maximo', p, 'maximo(3, 8)')));
  });
  // Ángulos en grados, como en todo el motor
  funcion('seno', (a, p) => Math.sin((argNumero(a, 0, 'seno', p, 'seno(90)') * Math.PI) / 180));
  funcion('coseno', (a, p) => Math.cos((argNumero(a, 0, 'coseno', p, 'coseno(0)') * Math.PI) / 180));
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
  funcion('texto', (a) => aTexto(a[0] ?? null));
  funcion('número', (a, p) => {
    const v = a[0];
    if (typeof v === 'number') return v;
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN;
    if (Number.isNaN(n)) throw new ErrorChispa(p, `no puedo convertir ${v === undefined ? 'nada' : `"${aTexto(v)}"`} en un número.`);
    return n;
  });
}
