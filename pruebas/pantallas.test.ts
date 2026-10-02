/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PANTALLAS LISTAS (día 4, bloque 2): menú principal, opciones, créditos,
 * tabla de puntuaciones, fin del juego y pausa. Se añaden desde el editor y
 * aquí se JUEGAN de verdad: que cada botón lleve a donde dice.
 */
import { describe, expect, it } from 'vitest';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { INFO_PANTALLAS, PANTALLAS, planDePantallas } from '../src/editor/pantallas/pantallas';
import { Control } from '../src/objetos/componentes/Control';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { migrarProyecto, proyectoVacio } from '../src/proyecto/formato';
import { revisarProyecto } from '../src/proyecto/Revision';
import { leerPuntuaciones } from '../src/chispa/api/puntuaciones';
import { juegoDePrueba } from './ayudantes';

/** Un proyecto con una escena de juego y todas las pantallas. */
function conTodas(codigoJugador = '') {
  const e = new EstadoEditor();
  e.proyecto.nombre = 'Mi Aventura';
  e.crearObjeto('rectangulo', 100, 100);
  e.renombrar(e.seleccion!, 'Jugador');
  const archivo = e.crearScriptPara(e.seleccion!)!;
  e.cambiarCodigo(archivo, codigoJugador || 'cuando se pulsa "m":\n    juego.puntos += 100\n\ncuando se pulsa "f":\n    escena.cambiar("Fin")\n');
  const plan = e.anadirPantallas(PANTALLAS, { empezarPorMenu: true });
  return { e, plan };
}

function jugar(e: EstadoEditor, almacen = new Map<string, string>()) {
  const j = juegoDePrueba({ proyecto: migrarProyecto(JSON.parse(JSON.stringify(e.proyecto))), almacen });
  /** Pulsa y suelta una tecla, un fotograma. */
  const tecla = (codigo: string, letra = codigo) => {
    j.pulsar(codigo, letra);
    j.avanzar(1);
    j.soltar(codigo, letra);
    j.avanzar(1);
  };
  /** Hace clic en un objeto de la interfaz (por su nombre). */
  const clicEn = (nombre: string, dx = 0) => {
    const o = j.buscar(nombre);
    j.clic(o.posicion.x + dx, o.posicion.y);
    j.avanzar(1);
  };
  /** Avanza hasta que acabe el cambio de escena. */
  const esperarEscena = (nombre: string) => {
    for (let i = 0; i < 120 && j.juego.nombreEscena !== nombre; i++) j.avanzar(1);
    j.avanzar(40);
    expect(j.juego.nombreEscena).toBe(nombre);
  };
  /** Lo que pone un texto ahora (los textos con huecos se calculan al dibujarse). */
  const textoDe = (nombre: string) => {
    const s = j.buscar(nombre).obtener(Sprite)!;
    s.actualizarTexto();
    return s.texto;
  };
  return { ...j, tecla, clicEn, esperarEscena, textoDe };
}

describe('El plan: qué se añade', () => {
  it('cada pantalla es una escena con su nombre (la pausa, objetos en la del juego); todo el código está bien escrito', () => {
    const { e, plan } = conTodas();
    expect(Object.keys(plan.escenas)).toEqual(['Menu', 'Opciones', 'Creditos', 'Records', 'Fin']);
    expect(plan.enElJuego.map((o) => o.nombre)).toEqual(['VentanaPausa', 'MenuPausa']);
    expect(e.proyecto.escenaInicial).toBe('Menu');
    expect(e.proyecto.datos?.puntos).toBe(0);
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(expect.arrayContaining(['Jugador', 'VentanaPausa', 'MenuPausa']));
    // El proyecto entero pasa la revisión (lo mismo que al pulsar Ejecutar): ni errores ni avisos
    const r = revisarProyecto(migrarProyecto(JSON.parse(JSON.stringify(e.proyecto))));
    expect(r.errores.map((x) => x.message)).toEqual([]);
    expect(r.avisos.map((x) => x.mensaje)).toEqual([]);
    // Cada script nuevo empieza explicando qué hace, o es de dos líneas
    for (const [archivo, codigo] of Object.entries(plan.scripts)) expect(codigo.startsWith('#') || codigo.split('\n').length <= 8, archivo).toBe(true);
    // El código, sin tildes (la forma oficial de Chispa); en los textos que se ven, con ellas
    for (const codigo of Object.values(plan.scripts)) expect(codigo.replace(/"[^"\n]*"/g, '')).not.toMatch(/[áéíóúÁÉÍÓÚ]/);
    expect(plan.escenas.Opciones.objetos.find((o) => o.nombre === 'TextoMusica')?.sprite?.texto).toBe('Música');
    // Un solo deshacer lo quita todo
    e.deshacer();
    expect(Object.keys(e.proyecto.escenas)).toEqual(['Principal']);
    expect(e.proyecto.escenaInicial).toBe('Principal');
    expect(e.escena.objetos.map((o) => o.nombre)).not.toContain('VentanaPausa');
    expect(Object.keys(e.proyecto.scripts)).toEqual(['jugador.chs']);
  });

  it('el menú solo ofrece las pantallas que hay; añadir otra vez no pisa nada', () => {
    const p = proyectoVacio();
    const solo = planDePantallas(p, ['menu'], 'Principal');
    expect(solo.escenas.Menu.objetos.find((o) => o.control)?.control?.opciones).toEqual(['Jugar']);
    expect(solo.necesitaPuntos).toBe(false);
    // Con Opciones ya en el proyecto, el menú nuevo la ofrece (y no la vuelve a crear)
    p.escenas.Opciones = { colorFondo: 'negro', objetos: [] };
    p.scripts['menu.chs'] = '# el mío';
    const dos = planDePantallas(p, ['menu', 'creditos'], 'Principal');
    expect(Object.keys(dos.escenas)).toEqual(['Menu', 'Creditos']);
    expect(dos.escenas.Menu.objetos.find((o) => o.control)?.control?.opciones).toEqual(['Jugar', 'Opciones', 'Créditos']);
    expect(Object.keys(dos.scripts)).toContain('menu2.chs');
    expect(dos.scripts['menu.chs']).toBeUndefined();
    // Si ya hay una escena «Menu», la nueva es «Menu2» y todo apunta a ella
    p.escenas.Menu = { colorFondo: 'negro', objetos: [] };
    const tres = planDePantallas(p, ['menu', 'fin'], 'Principal');
    expect(Object.keys(tres.escenas)).toEqual(['Menu2', 'Fin']);
    expect(Object.values(tres.scripts).join('\n')).toContain('escena.cambiar("Menu2"');
    expect(Object.keys(INFO_PANTALLAS)).toEqual([...PANTALLAS]);
  });

  it('sin menú, «Volver» y el fin del juego llevan al juego; la pausa no ofrece salir al menú', () => {
    const e = new EstadoEditor();
    const plan = e.anadirPantallas(['creditos', 'fin', 'pausa']);
    expect(Object.values(plan.scripts).join('\n')).not.toContain('"Menu"');
    expect(plan.enElJuego[1].control?.opciones).toEqual(['Seguir', 'Reiniciar']);
    expect(plan.escenas.Fin.objetos.map((o) => o.nombre)).toEqual(['Titulo', 'Puntos', 'BotonOtraVez']);
    expect(e.proyecto.escenaInicial).toBe('Principal');
    expect(revisarProyecto(migrarProyecto(JSON.parse(JSON.stringify(e.proyecto)))).errores).toEqual([]);
  });
});

describe('Jugando de verdad', () => {
  it('del menú al juego con el teclado, y a cada pantalla y vuelta con el ratón', () => {
    const { e } = conTodas();
    const j = jugar(e);
    expect(j.juego.nombreEscena).toBe('Menu');
    expect(j.buscar('Titulo').obtener(Sprite)!.texto).toBe('Mi Aventura');
    // Abajo, abajo → Puntuaciones; Intro
    j.tecla('ArrowDown');
    j.tecla('ArrowDown');
    j.tecla('Enter');
    j.esperarEscena('Records');
    expect(j.buscar('Tabla').obtener(Sprite)!.texto).toMatch(/Todavia no hay puntuaciones/);
    j.clicEn('BotonVolver');
    j.esperarEscena('Menu');
    // Con el ratón: la cuarta opción (Créditos); cada opción mide 28 × 1,9 de alto
    const menu = j.buscar('MenuPrincipal');
    j.clic(menu.posicion.x, menu.posicion.y - 1.5 * 28 * 1.9);
    j.avanzar(1);
    j.esperarEscena('Creditos');
    const antes = j.buscar('Creditos').posicion.y;
    j.avanzar(30);
    expect(j.buscar('Creditos').posicion.y).toBeGreaterThan(antes + 15); // el texto sube
    j.tecla('Escape'); // también se vuelve con Escape
    j.esperarEscena('Menu');
    j.tecla('Enter'); // Jugar (la primera)
    j.esperarEscena('Principal');
    expect(j.errores).toEqual([]);
  });

  it('opciones: el volumen se cambia, se oye y se recuerda en la siguiente partida', () => {
    const { e } = conTodas();
    const almacen = new Map<string, string>();
    const j = jugar(e, almacen);
    j.tecla('ArrowDown');
    j.tecla('Enter');
    j.esperarEscena('Opciones');
    const deslizador = j.buscar('VolumenSonido');
    expect(deslizador.obtener(Control)!.numero).toBe(100);
    // Un clic en el medio del deslizador: la mitad (de 5 en 5)
    j.clic(deslizador.posicion.x, deslizador.posicion.y);
    j.avanzar(1);
    expect(deslizador.obtener(Control)!.numero).toBe(50);
    expect(j.motor.sonido.volumen).toBe(0.5);
    expect(j.motor.sonido.historial).toContain('efecto moneda');
    const musica = j.buscar('VolumenMusica');
    j.clic(musica.posicion.x - 140 + 13 + 0.25 * 254, musica.posicion.y); // un cuarto del recorrido
    j.avanzar(1);
    expect(j.motor.sonido.volumenMusica).toBe(0.25);
    expect(j.errores).toEqual([]);
    // Otra partida, en el mismo «navegador»: el menú pone el volumen guardado, y Opciones lo enseña
    const otra = jugar(e, almacen);
    expect(otra.motor.sonido.volumen).toBe(0.5);
    expect(otra.motor.sonido.volumenMusica).toBe(0.25);
    otra.tecla('ArrowDown');
    otra.tecla('Enter');
    otra.esperarEscena('Opciones');
    expect(otra.buscar('VolumenSonido').obtener(Control)!.numero).toBe(50);
    expect(otra.buscar('VolumenMusica').obtener(Control)!.numero).toBe(25);
  });

  it('fin del juego: los puntos, escribir el nombre, guardarlo y verlo en la tabla; con pocos puntos no se pide el nombre', () => {
    const { e } = conTodas();
    const almacen = new Map<string, string>();
    const partida = (puntos: number, nombre: string | null) => {
      const j = jugar(e, almacen);
      j.tecla('Enter');
      j.esperarEscena('Principal');
      for (let i = 0; i < puntos / 100; i++) j.tecla('KeyM', 'm');
      j.tecla('KeyF', 'f');
      j.esperarEscena('Fin');
      expect(j.textoDe('Puntos')).toBe(`Puntos: ${puntos}`);
      if (nombre === null) return j;
      // El campo ya está enfocado: se escribe sin hacer clic
      expect(j.buscar('CampoNombre').obtener(Control)!.enfocado).toBe(true);
      for (const letra of nombre) window.dispatchEvent(new KeyboardEvent('keydown', { code: `Key${letra.toUpperCase()}`, key: letra }));
      j.avanzar(1);
      j.clicEn('BotonGuardar');
      j.esperarEscena('Records');
      expect(j.errores).toEqual([]);
      return j;
    };
    partida(300, 'Ana');
    const segunda = partida(500, 'Rodrigo');
    expect(segunda.buscar('Tabla').obtener(Sprite)!.texto).toBe('1. Rodrigo  500\n2. Ana  300\n');
    // Sin escribir nada: «Anonimo»
    const tercera = partida(100, '');
    expect(tercera.buscar('Tabla').obtener(Sprite)!.texto).toContain('3. Anonimo  100');
    // Con la tabla llena de puntuaciones mejores, no se pide el nombre
    for (let i = 0; i < 10; i++) partida(900, `J${i}`);
    const mala = partida(100, null);
    expect(mala.buscar('BotonGuardar').obtener(Sprite)!.visible).toBe(false);
    expect(mala.buscar('CampoNombre').obtener(Sprite)!.visible).toBe(false);
    // «Jugar otra vez» empieza de cero
    mala.clicEn('BotonOtraVez');
    mala.esperarEscena('Principal');
    mala.tecla('KeyF', 'f');
    mala.esperarEscena('Fin');
    expect(mala.textoDe('Puntos')).toBe('Puntos: 0');
    mala.clicEn('BotonMenu');
    mala.esperarEscena('Menu');
    expect(mala.errores).toEqual([]);
  });

  it('pausa: Escape para el juego y saca el menú; Seguir, Reiniciar y Salir hacen lo suyo', () => {
    const { e } = conTodas('variable vueltas = 0\ncuando cada fotograma:\n    yo.x += 60 * delta\n');
    const j = jugar(e);
    j.tecla('Enter');
    j.esperarEscena('Principal');
    const ventana = () => j.buscar('VentanaPausa').obtener(Sprite)!;
    const menu = () => j.buscar('MenuPausa').obtener(Sprite)!;
    expect([ventana().visible, menu().visible]).toEqual([false, false]);
    j.tecla('Escape');
    expect([ventana().visible, menu().visible]).toEqual([true, true]);
    expect(j.motor.tiempo.escala).toBe(0);
    const x = j.buscar('Jugador').posicion.x;
    j.avanzar(30);
    expect(j.buscar('Jugador').posicion.x).toBe(x); // parado de verdad
    // Seguir (la primera opción) con Intro
    j.tecla('Enter');
    expect(ventana().visible).toBe(false);
    expect(j.motor.tiempo.escala).toBe(1);
    j.avanzar(30);
    expect(j.buscar('Jugador').posicion.x).toBeGreaterThan(x + 20);
    // P también pausa, y otra vez P sigue
    j.tecla('KeyP', 'p');
    expect(j.motor.tiempo.escala).toBe(0);
    j.tecla('KeyP', 'p');
    expect([j.motor.tiempo.escala, ventana().visible]).toEqual([1, false]);
    // Reiniciar: el jugador vuelve a su sitio y el tiempo sigue
    j.tecla('Escape');
    j.tecla('ArrowDown');
    j.tecla('Enter');
    j.avanzar(3);
    expect(j.buscar('Jugador').posicion.x).toBeLessThan(110);
    expect(j.motor.tiempo.escala).toBe(1);
    // Salir al menú
    j.tecla('Escape');
    j.tecla('ArrowUp');
    j.tecla('Enter');
    j.esperarEscena('Menu');
    expect(j.motor.tiempo.escala).toBe(1);
    expect(j.errores).toEqual([]);
  });
});

describe('puntuaciones', () => {
  const con = (codigo: string, almacen = new Map<string, string>()) => juegoDePrueba({ scripts: { 'a.chs': codigo }, escena: [{ nombre: 'A', script: 'a.chs' }], almacen });

  it('guarda las 10 mejores, de mayor a menor, y dice el puesto', () => {
    const almacen = new Map<string, string>();
    const j = con([
      'cuando empieza:',
      '    mostrar(puntuaciones.lista(), puntuaciones.entra(0))',
      '    mostrar(puntuaciones.guardar("Ana", 50), puntuaciones.guardar("Luis", 80), puntuaciones.guardar("Eva", 50))',
      '    para cada n en rango(1, 12):',
      '        puntuaciones.guardar("J{n}", n * 100)',
      '    variable t = puntuaciones.lista()',
      '    mostrar(longitud(t), t[1].nombre, t[1].puntos, t[10].nombre)',
      '    mostrar(puntuaciones.entra(300), puntuaciones.entra(301), puntuaciones.guardar("Poco", 10))',
    ].join('\n'), almacen);
    expect(j.errores).toEqual([]);
    // Con los mismos puntos, Eva va detrás de Ana (llegó después)
    expect(j.salida).toEqual(['[] verdadero', '1 1 3', '10 J12 1200 J3', 'falso verdadero 0']);
    // Se queda guardado para otra partida, y se puede borrar
    const otra = con('cuando empieza:\n    mostrar(puntuaciones.lista()[1].nombre)\n    puntuaciones.borrar()\n    mostrar(longitud(puntuaciones.lista()))', almacen);
    expect(otra.salida).toEqual(['J12', '0']);
  });

  it('los nombres se recortan, y lo guardado roto o manipulado no rompe el juego', () => {
    const almacen = new Map<string, string>();
    const j = con('cuando empieza:\n    puntuaciones.guardar("  Un   nombre larguísimo de verdad  ", 5)\n    puntuaciones.guardar("", 3)\n    mostrar(puntuaciones.lista()[1].nombre, puntuaciones.lista()[2].nombre)', almacen);
    expect(j.salida).toEqual(['Un nombre larguí ???']);
    const guardado = { cargarDato: (k: string) => almacen.get(k) ?? null, guardarDato() {}, borrarDato() {} };
    const clave = [...almacen.keys()].find((k) => k.includes('puntuaciones'))!;
    for (const roto of ['no es json', '{"a":1}', '[1, "x", null, {"nombre": 5, "puntos": 1}, {"nombre": "ok", "puntos": "muchos"}]']) {
      almacen.set(clave, roto);
      expect(leerPuntuaciones({ ...guardado, cargarDato: () => roto })).toEqual([]);
    }
    almacen.set(clave, JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ nombre: 'x'.repeat(999), puntos: i }))));
    const leidas = leerPuntuaciones({ ...guardado, cargarDato: () => almacen.get(clave)! });
    expect(leidas).toHaveLength(10);
    expect(leidas[0]).toEqual({ nombre: 'x'.repeat(16), puntos: 499 });
    const error = (codigo: string) => con(`cuando empieza:\n    ${codigo}`).errores[0]?.error.message;
    expect(error('puntuaciones.guardar()')).toMatch(/falta el nombre/);
    expect(error('puntuaciones.guardar("Ana")')).toMatch(/puntuaciones.guardar/);
    expect(error('puntuaciones.entra("muchos")')).toMatch(/puntuaciones.entra/);
  });
});
