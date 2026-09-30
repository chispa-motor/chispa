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
});
