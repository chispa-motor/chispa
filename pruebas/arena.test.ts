/**
 * ARENA DE HABILIDADES: el juego de ejemplo grande (proyectos/arena-de-habilidades).
 * Se juega solo (un "bot" que se mueve y usa las habilidades) durante un buen
 * rato, y no puede salir ni un error. Si algo del motor o del lenguaje se
 * rompe, este test lo encuentra.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { juegoDePrueba } from './ayudantes';
import { migrarProyecto } from '../src/proyecto/formato';
import { revisarProyecto } from '../src/proyecto/Revision';
import { jugarUnRato } from './bot-arena';
import { Sprite } from '../src/objetos/componentes/Sprite';

const RUTA = 'proyectos/arena-de-habilidades/arena-de-habilidades.chispa.json';
const cargar = () => migrarProyecto(JSON.parse(readFileSync(RUTA, 'utf8')));

describe('Arena de Habilidades', () => {
  it('el proyecto no tiene ni errores ni avisos', () => {
    const r = revisarProyecto(cargar());
    expect(r.errores.map((e) => e.message)).toEqual([]);
    expect(r.avisos.map((a) => `${a.archivo}:${a.pos.linea} ${a.mensaje}`)).toEqual([]);
  });

  it('del menú a la arena, y se juega varias oleadas sin ningún error', () => {
    const j = juegoDePrueba({ proyecto: cargar() });
    j.avanzar(5);
    expect(j.juego.nombreEscena).toBe('Menu');
    j.pulsar('Enter');
    j.avanzar(1);
    j.soltar('Enter');
    j.avanzar(90);
    expect(j.juego.nombreEscena).toBe('Arena');
    jugarUnRato(j, 60 * 60);
    expect(j.errores.map((e) => e.error.message)).toEqual([]);
    expect(j.juego.datoDelJuego('oleada')).toBeGreaterThanOrEqual(2);
  }, 120000);

  it('el jefe: sus 3 fases con diálogos y ataques avisados, y la victoria', () => {
    const j = juegoDePrueba({ proyecto: cargar() });
    j.avanzar(5);
    j.juego.ejecutarOrden('escena.cambiar("Arena")');
    j.avanzar(90);
    j.juego.ejecutarOrden('buscar("Director").saltarA(10)');
    // Para que el bot aguante: mucha vida
    j.juego.ejecutarOrden('buscar("Jugador").vidaMax = 5000');
    j.juego.ejecutarOrden('buscar("Jugador").curar(5000)');
    const fases = new Set<number>();
    let avisos = 0;
    for (let s = 0; s < 240 && j.juego.nombreEscena === 'Arena'; s++) {
      jugarUnRato(j, 60);
      const jefe = j.juego.escena.buscar('Jefe');
      if (jefe) fases.add((jefe.propiedades.get('fase') as { valor: number }).valor);
      avisos += j.juego.escena.objetos.filter((o) => o.tipo === 'Aviso').length;
      // Ayuda para que no dure una eternidad: el jefe pierde vida poco a poco
      if (jefe && s % 2 === 0) j.juego.ejecutarOrden('buscar("Jefe").recibirDano(60, nulo, 0)');
    }
    expect(j.errores.map((e) => e.error.message)).toEqual([]);
    expect([...fases].sort()).toEqual([1, 2, 3]);
    expect(avisos).toBeGreaterThan(0);
    j.avanzar(200);
    expect(j.juego.nombreEscena).toBe('Victoria');
    expect(j.juego.datoDelJuego('resultado')).toBe('victoria');
  }, 180000);

  it('se juega con mando: start empieza, la palanca mueve, X lanza el orbe, start pausa', () => {
    const j = juegoDePrueba({ proyecto: cargar() });
    const e = j.juego.motor.entrada;
    const mando = (botones: string[], x = 0, y = 0) => {
      e.ponerMando(true, new Set(botones), x, y);
      j.avanzar(1);
    };
    j.avanzar(5);
    mando(['start']);
    mando([]);
    j.avanzar(90);
    expect(j.juego.nombreEscena).toBe('Arena');
    const jugador = j.buscar('Jugador');
    const x0 = jugador.posicion.x;
    for (let i = 0; i < 30; i++) mando([], 1, 0);
    expect(jugador.posicion.x).toBeGreaterThan(x0 + 100);
    mando(['x'], 1, 0);
    mando([], 1, 0);
    expect(j.juego.escena.objetos.some((o) => o.tipo === 'Orbe')).toBe(true);
    mando(['start']);
    mando([]);
    expect(j.juego.motor.tiempo.escala).toBe(0);
    mando(['start']);
    mando([]);
    expect(j.juego.motor.tiempo.escala).toBe(1);
    expect(j.errores).toEqual([]);
  });

  it('el récord se guarda al perder y el menú lo enseña', () => {
    const j = juegoDePrueba({ proyecto: cargar() });
    j.avanzar(5);
    j.juego.ejecutarOrden('escena.cambiar("Arena")');
    j.avanzar(90);
    j.juego.ejecutarOrden('buscar("Director").saltarA(3)');
    j.juego.ejecutarOrden('buscar("Jugador").recibirDano(9999, nulo, 0)');
    j.avanzar(400);
    expect(j.juego.nombreEscena).toBe('Derrota');
    expect(j.almacen.get('chispa:Arena de Habilidades:record')).toBe('3');
    j.juego.ejecutarOrden('escena.cambiar("Menu")');
    j.avanzar(3);
    expect(j.juego.escena.buscar('Record')?.obtener(Sprite)?.texto).toBe('Record: oleada 3');
  });
});
