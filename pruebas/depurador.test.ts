/**
 * DEPURADOR (noche, bloque 1): puntos de parada, continuar, siguiente línea,
 * entrar en una función y ver las variables.
 */
import { describe, expect, it } from 'vitest';
import { juegoDePrueba } from './ayudantes';
import { Depurador, type Parada } from '../src/chispa/ejecucion/depurador';

const CODIGO = [
  'variable vueltas = 0', //                1
  'funcion doble(n):', //                   2
  '    variable r = n * 2', //              3
  '    devolver r', //                      4
  'cuando se pulsa "espacio":', //          5
  '    vueltas += 1', //                    6
  '    variable a = doble(vueltas)', //     7
  '    mostrar("a vale", a)', //            8
  '    mostrar("fin")', //                  9
].join('\n');

function preparar(puntos: number[]) {
  const d = new Depurador();
  d.ponerPuntos('p.chs', puntos);
  const paradas: Parada[] = [];
  d.alParar = (p) => paradas.push(p);
  const j = juegoDePrueba({ scripts: { 'p.chs': CODIGO }, escena: [{ nombre: 'Jugador', script: 'p.chs', propiedades: { vida: 3 } }], depurador: d });
  const pulsar = () => {
    j.pulsar('Space');
    j.avanzar(1);
    j.soltar('Space');
  };
  return { d, j, paradas, pulsar };
}

describe('Depurador', () => {
  it('para en un punto de parada, antes de ejecutar esa línea', () => {
    const { d, j, paradas, pulsar } = preparar([8]);
    pulsar();
    expect(paradas.map((p) => p.linea)).toEqual([8]);
    expect(paradas[0].objeto).toBe('Jugador');
    expect(j.salida).toEqual([]); // la línea 8 todavía no se ha ejecutado
    // Mientras está parado, el hilo no avanza aunque pasen fotogramas
    j.avanzar(5);
    expect(j.salida).toEqual([]);
    d.continuar();
    j.avanzar(1);
    expect(j.salida).toEqual(['a vale 2', 'fin']);
  });

  it('enseña las variables que se ven desde la línea parada, con sus valores', () => {
    const { d, j, pulsar } = preparar([8]);
    pulsar();
    const v = d.variables(j.juego.interprete.globales);
    const ver = (n: string) => v.find((x) => x.nombre === n);
    expect(ver('a')).toMatchObject({ grupo: 'Aquí', valor: '2' });
    expect(ver('vueltas')).toMatchObject({ grupo: 'Del script', valor: '1' });
    expect(ver('yo')?.valor).toBe("el objeto 'Jugador'");
    expect(ver('yo.vida')).toMatchObject({ grupo: 'yo', valor: '3' });
    expect(ver('doble')).toBeUndefined(); // las funciones no son variables que mirar
  });

  it('«siguiente línea» va línea a línea sin meterse en las funciones', () => {
    const { d, paradas, pulsar, j } = preparar([6]);
    pulsar();
    d.siguienteLinea();
    j.avanzar(1);
    d.siguienteLinea();
    j.avanzar(1);
    d.siguienteLinea();
    j.avanzar(1);
    expect(paradas.map((p) => p.linea)).toEqual([6, 7, 8, 9]);
    d.siguienteLinea(); // la última: el evento se acaba y ya no se para más
    j.avanzar(1);
    pulsar();
    expect(paradas.map((p) => p.linea)).toEqual([6, 7, 8, 9, 6]);
  });

  it('«entrar» se mete dentro de la función que se llama', () => {
    const { d, paradas, pulsar, j } = preparar([7]);
    pulsar();
    d.entrar();
    j.avanzar(1);
    d.entrar();
    j.avanzar(1);
    d.siguienteLinea();
    j.avanzar(1);
    expect(paradas.map((p) => p.linea)).toEqual([7, 3, 4, 8]);
  });

  it('un punto de parada en la línea del «cuando» para en su primera línea', () => {
    const { paradas, pulsar } = preparar([5]);
    pulsar();
    expect(paradas.map((p) => p.linea)).toEqual([6]);
  });

  it('sin puntos de parada no hace nada (y los puntos se ponen y se quitan)', () => {
    const d = new Depurador();
    expect(d.activo).toBe(false);
    expect(d.alternarPunto('a.chs', 3)).toBe(true);
    expect(d.lineasCon('a.chs')).toEqual([3]);
    expect(d.alternarPunto('a.chs', 3)).toBe(false);
    expect(d.activo).toBe(false);
    const { j, pulsar, paradas } = preparar([]);
    pulsar();
    expect(paradas).toEqual([]);
    expect(j.salida).toEqual(['a vale 2', 'fin']);
  });

  it('olvidar (al parar el juego) deja de estar parado', () => {
    const { d, pulsar } = preparar([8]);
    pulsar();
    expect(d.parada).not.toBeNull();
    d.olvidar();
    expect(d.parada).toBeNull();
  });
});
