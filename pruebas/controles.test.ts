/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CONTROLES DE INTERFAZ (día 4, bloque 1): botón, barra, campo de texto,
 * deslizador, casilla, lista, menú, ventana, inventario, minimapa e icono
 * con contador. Se ponen en el editor y se manejan desde Chispa.
 */
import { describe, expect, it } from 'vitest';
import { Control, TIPOS_CONTROL, colorDeNombre, type TipoControl } from '../src/objetos/componentes/Control';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { MapaCasillas } from '../src/objetos/componentes/MapaCasillas';
import { texturaLisa } from '../src/objetos/Vista3D';
import { migrarProyecto, proyectoVacio, type DefControl, type DefObjeto } from '../src/proyecto/formato';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { Inspector } from '../src/editor/paneles/Inspector';
import type { VistaEscena } from '../src/editor/escena/VistaEscena';
import { CONTROLES_NUEVOS } from '../src/editor/interfaz/controlesNuevos';
import { aCodigo, desdeCodigo } from '../src/editor/bloques/modelo';
import { juegoDePrueba } from './ayudantes';

/** Un control en (300, 300), de 200×40, pegado a la pantalla, con su script. */
function conControl(control: DefControl, codigo = '', extra: Partial<DefObjeto> = {}, sprite: DefObjeto['sprite'] = {}) {
  return juegoDePrueba({
    scripts: { 'c.chs': codigo, 'otro.chs': '' },
    escena: [
      { nombre: 'Control', x: 300, y: 300, sprite: { ancho: 200, alto: 40, fijo: true, tamano: 20, ...sprite }, control, script: codigo ? 'c.chs' : undefined, ...extra },
      { nombre: 'Jugador', x: 500, y: 100, sprite: { ancho: 20, alto: 20 } },
    ],
  });
}
const control = (j: ReturnType<typeof conControl>) => j.buscar('Control').obtener(Control)!;

/** Un lienzo de mentira que apunta lo que se le pone y cuenta lo que se le pide. */
function lienzo() {
  const puesto: Record<string, unknown[]> = {};
  const cuenta: Record<string, number> = {};
  const llamadas: [string, unknown[]][] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => {
      if (k in t) return t[k];
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      return (...a: unknown[]) => {
        cuenta[k] = (cuenta[k] ?? 0) + 1;
        llamadas.push([k, a]);
      };
    },
    set: (t, k: string, v) => {
      t[k] = v;
      (puesto[k] ??= []).push(v);
      return true;
    },
  });
  const textos: string[] = [];
  const r = { ctx: ctx as unknown as CanvasRenderingContext2D, ancho: 960, alto: 540, fondo: 'negro', texto: (t: string) => textos.push(t), imagen: () => (cuenta.imagen = (cuenta.imagen ?? 0) + 1), rectangulo() {}, circulo() {}, figura() {}, linea() {} };
  return { r: r as never, puesto, cuenta, llamadas, textos };
}

describe('Todos los controles', () => {
  it('cada tipo se crea desde el editor, se guarda, se abre y se dibuja sin errores (en el editor y jugando)', () => {
    expect(TIPOS_CONTROL).toEqual(['boton', 'barra', 'campo', 'deslizador', 'casilla', 'lista', 'menu', 'ventana', 'inventario', 'minimapa', 'icono']);
    const e = new EstadoEditor();
    for (const tipo of TIPOS_CONTROL) {
      e.crearControl(tipo, 400, 300);
      expect(e.seleccionado?.control?.tipo).toBe(tipo);
      expect(e.seleccionado?.sprite?.fijo).toBe(true);
    }
    // Dos del mismo tipo: nombres distintos
    e.crearControl('barra', 0, 0);
    expect(e.escena.objetos.filter((o) => o.control?.tipo === 'barra').map((o) => o.nombre)).toEqual(['Barra', 'Barra2']);
    const proyecto = migrarProyecto(JSON.parse(JSON.stringify(e.proyecto)));
    const j = juegoDePrueba({ proyecto });
    j.avanzar(3);
    expect(j.errores).toEqual([]);
    const { r, textos } = lienzo();
    j.juego.escena.dibujar(r);
    expect(textos).toEqual(expect.arrayContaining(['Botón', 'Casilla', 'Jugar', 'Opciones', 'Salir', 'Uno', 'Ventana', 'Escribe aquí', '×0']));
    // En el editor (sin juego en marcha) también se dibujan: con una escena «de mentira» que solo tiene los recursos
    for (const o of j.juego.escena.objetos) {
      const s = o.obtener(Sprite);
      if (!s?.pintor) continue;
      const guardada = o.escena;
      o.escena = { motor: { recursos: j.motor.recursos } } as never;
      expect(() => s.dibujarEn(lienzo().r, 0, 0), o.nombre).not.toThrow();
      o.escena = guardada;
    }
  });

  it('un control sin Dibujo no es un control; uno de un tipo inventado no se abre', () => {
    const j = juegoDePrueba({ escena: [{ nombre: 'Nada', control: { tipo: 'barra' } }] });
    expect(j.buscar('Nada').obtener(Control)).toBeUndefined();
    const con = (c: object) => () => migrarProyecto({ ...proyectoVacio(), escenas: { Principal: { colorFondo: 'negro', objetos: [{ nombre: 'X', sprite: {}, control: c as DefControl }] } } });
    expect(con({ tipo: 'trompeta' })).toThrow(/tipo/);
    expect(con({})).toThrow(/qué tipo/);
    expect(con({ tipo: 'inventario', columnas: 20, filas: 20 })).toThrow(/100 casillas/);
    expect(con({ tipo: 'lista', opciones: Array.from({ length: 300 }, (_, i) => `o${i}`) })).toThrow(/opciones/);
    expect(con({ tipo: 'lista', opciones: ['a'], virus: 1 })().escenas.Principal.objetos[0].control).toEqual({ tipo: 'lista', opciones: ['a'] });
  });

  it('lo de los controles solo existe en los controles: en los demás objetos, esos nombres siguen libres', () => {
    const j = conControl({ tipo: 'barra' }, 'cuando empieza:\n    variable j = buscar("Jugador")\n    j.valor = "mío"\n    j.titulo = 3\n    mostrar(j.valor, j.titulo)\n    mostrar(j.maximo)');
    expect(j.salida).toEqual(['mío 3']);
    expect(j.errores[0]?.error.message).toMatch(/'maximo' es de los controles de interfaz.*'Jugador' no es un control/);
    expect(j.errores[0]?.error.pista).toMatch(/Añadir > Interfaz/);
    // Y un dato de otro tipo de control lo dice claro
    const otro = conControl({ tipo: 'casilla' }, 'cuando empieza:\n    yo.opciones = ["a"]');
    expect(otro.errores[0]?.error.message).toMatch(/'opciones' no vale para una casilla/);
    expect(otro.errores[0]?.error.pista).toMatch(/lista y menú/);
  });

  it('desactivado no atiende, y abrir y cerrar esconden también lo que lleva dentro', () => {
    const j = juegoDePrueba({
      scripts: { 'v.chs': 'cuando empieza:\n    buscar("Dentro").pegarA(yo)\n    buscar("MasDentro").pegarA(buscar("Dentro"))\n    yo.cerrar()' },
      escena: [
        { nombre: 'Ventana', x: 300, y: 300, sprite: { ancho: 300, alto: 200, fijo: true }, control: { tipo: 'ventana' }, script: 'v.chs' },
        { nombre: 'Dentro', x: 300, y: 300, sprite: { ancho: 100, alto: 30, fijo: true }, control: { tipo: 'casilla' } },
        { nombre: 'MasDentro', x: 300, y: 260, sprite: { ancho: 100, alto: 30, fijo: true } },
        { nombre: 'Fuera', x: 700, y: 300, sprite: { ancho: 100, alto: 30, fijo: true }, control: { tipo: 'casilla', activado: false } },
      ],
    });
    const visible = (n: string) => j.buscar(n).obtener(Sprite)!.visible;
    expect(['Ventana', 'Dentro', 'MasDentro', 'Fuera'].map(visible)).toEqual([false, false, false, true]);
    // Cerrada no atiende a los clics (ni ella ni lo de dentro)
    j.clic(300, 300);
    j.avanzar(1);
    expect(j.buscar('Dentro').obtener(Control)!.marcada).toBe(false);
    j.buscar('Ventana').obtener(Control)!.abrir();
    expect(['Ventana', 'Dentro', 'MasDentro'].map(visible)).toEqual([true, true, true]);
    j.clic(300, 300);
    j.avanzar(1);
    expect(j.buscar('Dentro').obtener(Control)!.marcada).toBe(true);
    // Una casilla desactivada no se marca
    j.clic(700, 300);
    j.avanzar(1);
    expect(j.buscar('Fuera').obtener(Control)!.marcada).toBe(false);
  });
});

describe('Botón, casilla y «cuando cambia»', () => {
  it('el botón avisa con «cuando hago clic encima», y se dibuja distinto con el ratón encima', () => {
    const j = conControl({ tipo: 'boton' }, 'cuando hago clic encima:\n    mostrar("pulsado")', {}, { texto: 'Jugar', color: '#3b82f6' });
    const pintar = () => {
      const l = lienzo();
      j.juego.escena.dibujar(l.r);
      return l;
    };
    const reposo = pintar();
    expect(reposo.textos).toEqual(['Jugar']);
    expect(reposo.puesto.fillStyle).toEqual(['#3b82f6']);
    j.raton.mover(300, 300);
    expect(pintar().puesto.fillStyle).toEqual(['#3b82f6', 'rgba(255,255,255,0.18)']);
    j.clic(300, 300);
    j.avanzar(1);
    expect(j.salida).toEqual(['pulsado']);
    j.clic(600, 300); // fuera
    j.avanzar(1);
    expect(j.salida).toEqual(['pulsado']);
    // Desactivado: ni avisa el control ni se ilumina
    control(j).activado = false;
    expect(pintar().puesto.fillStyle).toEqual(['#3b82f6']);
  });

  it('la casilla se marca y se desmarca, y «cuando cambia» recibe su valor', () => {
    const j = conControl({ tipo: 'casilla' }, 'cuando cambia:\n    mostrar(yo.valor)\n\ncuando se pulsa "espacio":\n    yo.valor = verdadero');
    j.clic(300, 300);
    j.avanzar(1);
    j.clic(300, 300);
    j.avanzar(1);
    expect(j.salida).toEqual(['verdadero', 'falso']);
    // Cambiarla desde el código no avisa (si no, sería un lío: el aviso es de lo que hace quien juega)
    j.pulsar('Space');
    j.avanzar(1);
    expect(control(j).marcada).toBe(true);
    expect(j.salida).toEqual(['verdadero', 'falso']);
    const malo = conControl({ tipo: 'casilla' }, 'cuando empieza:\n    yo.valor = "si"');
    expect(malo.errores[0]?.error.message).toMatch(/valor/);
  });

  it('«cuando cambia» se escribe, se lee en bloques y vuelve a ser el mismo código', () => {
    const codigo = 'cuando cambia:\n    mostrar(yo.valor)\n';
    const leido = desdeCodigo(codigo);
    if (!leido.ok) throw new Error(leido.motivo);
    expect(leido.bloques).toMatchObject([{ tipo: 'evento', clase: 'cambia' }]);
    expect(aCodigo(leido.bloques).codigo.trim()).toBe(codigo.trim());
    const raro = conControl({ tipo: 'casilla' }, 'cuando cambio:\n    mostrar(1)');
    expect(raro.errores).toEqual([]);
  });
});

describe('Barra, deslizador e icono', () => {
  it('la barra empieza llena, se queda entre sus límites y lee sola un dato', () => {
    const j = conControl({ tipo: 'barra', maximo: 50 }, 'cuando empieza:\n    mostrar(yo.valor, yo.minimo, yo.maximo)\n    yo.valor = 500\n    mostrar(yo.valor)\n    yo.valor = -3\n    mostrar(yo.valor)');
    expect(j.salida).toEqual(['50 0 50', '50', '0']);
    const viva = juegoDePrueba({
      datos: { vida: 80 },
      scripts: { 'a.chs': 'cuando se pulsa "espacio":\n    juego.vida -= 30' },
      escena: [{ nombre: 'Barra', x: 300, y: 300, sprite: { ancho: 200, alto: 20, fijo: true, color: 'rojo', texto: '{yo.valor} / {yo.maximo}' }, control: { tipo: 'barra', dato: 'juego.vida' }, script: 'a.chs' }],
    });
    viva.avanzar(1);
    expect(viva.errores).toEqual([]);
    expect(viva.buscar('Barra').obtener(Control)!.numero).toBe(80);
    viva.pulsar('Space');
    viva.avanzar(2);
    expect(viva.buscar('Barra').obtener(Control)!.numero).toBe(50);
    // Se dibuja: el fondo, el relleno (la mitad del ancho al final; antes va bajando suave) y el texto con sus datos
    viva.avanzar(120);
    const l = lienzo();
    viva.juego.escena.dibujar(l.r);
    // (cada caja redonda empieza con un moveTo y un lineTo en su borde de arriba: la segunda es el relleno;
    //  sus esquinas miden 8, así que mide lo que hay entre los dos puntos más 16)
    const cajas = l.llamadas.map(([k, a], i) => (k === 'moveTo' ? (l.llamadas[i + 1][1] as number[])[0] - (a as number[])[0] + 16 : null)).filter((x) => x !== null);
    expect(cajas[0]).toBeCloseTo(200, 0);
    expect(cajas[1]).toBeCloseTo(100, 0);
    // Y sin recortar (ctx.clip en cada fotograma es muy caro en un móvil)
    expect(l.cuenta.clip ?? 0).toBe(0);
    expect(l.textos).toEqual(['50 / 100']);
  });

  it('un dato mal escrito se dice antes de empezar, con su sitio', () => {
    const p = proyectoVacio();
    p.escenas.Principal.objetos = [{ nombre: 'BarraVida', sprite: { fijo: true }, control: { tipo: 'barra', dato: 'juego.vidda + ' } }];
    expect(() => juegoDePrueba({ proyecto: migrarProyecto(p) })).toThrow(/en el dato de 'BarraVida'/);
    p.escenas.Principal.objetos[0].control!.dato = 'vidas';
    expect(() => juegoDePrueba({ proyecto: migrarProyecto(p) })).toThrow(/'vidas' no existe/);
  });

  it('el deslizador: un clic lo lleva ahí, se arrastra, va de paso en paso y avisa', () => {
    const j = conControl({ tipo: 'deslizador', minimo: 0, maximo: 10, valor: 5, paso: 1 }, 'cuando cambia:\n    mostrar(yo.valor)', {}, { ancho: 224, alto: 24 });
    // El recorrido va de x = 200 a x = 400 (el ancho menos el pomo de cada lado)
    j.raton.bajar(260, 300);
    j.avanzar(1);
    expect(control(j).numero).toBe(3);
    j.raton.mover(341, 300);
    j.avanzar(1);
    expect(control(j).numero).toBe(7);
    j.raton.mover(9999, 0); // aunque se salga, mientras no se suelte sigue cogido
    j.avanzar(1);
    expect(control(j).numero).toBe(10);
    j.raton.soltar();
    j.avanzar(1);
    j.raton.mover(200, 300);
    j.avanzar(1);
    expect(control(j).numero).toBe(10);
    expect(j.salida).toEqual(['3', '7', '10']);
    // Desde el código también va de paso en paso y dentro de sus límites
    const c = conControl({ tipo: 'deslizador', minimo: 0, maximo: 1, paso: 0.25 }, 'cuando empieza:\n    yo.valor = 0.6\n    mostrar(yo.valor)\n    yo.maximo = 0.5\n    mostrar(yo.valor)\n    yo.maximo = -1');
    expect(c.salida).toEqual(['0.5', '0.5']);
    expect(c.errores[0]?.error.message).toMatch(/máximo.*no puede ser menor que el mínimo/);
  });

  it('el icono con contador no tiene tope, y enseña su imagen si la hay', () => {
    const j = juegoDePrueba({
      imagenes: { moneda: '' },
      datos: { monedas: 3 },
      scripts: { 'a.chs': 'cuando empieza:\n    juego.monedas = 12345' },
      escena: [{ nombre: 'Icono', x: 40, y: 500, sprite: { ancho: 32, alto: 32, fijo: true, imagen: 'moneda', texto: '×' }, control: { tipo: 'icono', dato: 'juego.monedas' }, script: 'a.chs' }],
    });
    j.avanzar(1);
    const l = lienzo();
    j.juego.escena.dibujar(l.r);
    expect(l.textos).toEqual(['×12345']);
    expect(l.cuenta.imagen).toBe(1);
  });
});

describe('Campo de texto', () => {
  it('se escribe al hacer clic en él; las teclas son letras y no órdenes; Intro o un clic fuera lo sueltan', () => {
    const j = conControl({ tipo: 'campo', largoMaximo: 6 }, 'cuando cambia:\n    mostrar("[" + yo.valor + "]")\n\ncuando se pulsa "a":\n    mostrar("orden a")');
    const teclear = (letra: string) => window.dispatchEvent(new KeyboardEvent('keydown', { code: `Key${letra.toUpperCase()}`, key: letra }));
    // Sin enfocar, la «a» es una orden
    teclear('a');
    j.avanzar(1);
    j.soltar('KeyA', 'a');
    expect(j.salida).toEqual(['orden a']);
    j.clic(300, 300);
    j.avanzar(1);
    expect(control(j).enfocado).toBe(true);
    for (const letra of ['A', 'n', 'a', 'ñ']) teclear(letra);
    j.avanzar(1);
    expect(j.buscar('Control').obtener(Sprite)!.texto).toBe('Anañ');
    expect(j.salida).toEqual(['orden a', '[Anañ]']);
    // Borrar, y no pasarse del largo
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backspace', key: 'Backspace' }));
    for (const letra of '12345') teclear(letra);
    j.avanzar(1);
    expect(control(j).valor).toBe('Ana123');
    // Intro lo suelta: las teclas vuelven a ser órdenes
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
    j.avanzar(1);
    expect(control(j).enfocado).toBe(false);
    teclear('a');
    j.avanzar(1);
    expect(j.salida[j.salida.length - 1]).toBe('orden a');
    expect(control(j).valor).toBe('Ana123');
    // Se enfoca desde el código, y un clic fuera lo suelta
    control(j).enfocar();
    j.avanzar(1);
    expect(j.entrada.escribiendo).toBe(true);
    j.clic(700, 100);
    j.avanzar(1);
    expect(control(j).enfocado).toBe(false);
    expect(j.entrada.escribiendo).toBe(false);
  });

  it('desde Chispa: yo.valor y yo.texto son lo escrito; la pista se ve cuando está vacío', () => {
    const j = conControl({ tipo: 'campo', pista: 'Tu nombre', largoMaximo: 5 }, 'cuando empieza:\n    mostrar("[" + yo.valor + "]")\n    yo.valor = "Rodrigo"\n    mostrar(yo.valor, yo.texto)');
    expect(j.salida).toEqual(['[]', 'Rodri Rodri']);
    const vacio = conControl({ tipo: 'campo', pista: 'Tu nombre' });
    const l = lienzo();
    vacio.juego.escena.dibujar(l.r);
    expect(l.textos).toEqual(['Tu nombre']);
  });

  it('si el campo desaparece mientras se escribe, el teclado vuelve al juego', () => {
    const j = conControl({ tipo: 'campo' });
    control(j).enfocar();
    j.avanzar(1);
    expect(j.entrada.escribiendo).toBe(true);
    j.juego.escena.destruir(j.buscar('Control'));
    j.avanzar(1);
    expect(j.entrada.escribiendo).toBe(false);
  });
});

describe('Lista y menú', () => {
  it('la lista: se elige con un clic, se mueve con la rueda si no cabe y avisa solo si cambia', () => {
    const opciones = Array.from({ length: 10 }, (_, i) => `Opción ${i + 1}`);
    // 128 de alto: caben 4 filas de 30 (letra de 20 × 1,5), con 4 de margen arriba y abajo
    const j = conControl({ tipo: 'lista', opciones, elegido: 1 }, 'cuando cambia:\n    mostrar(yo.elegido, yo.valor)', {}, { alto: 128 });
    const fila = (n: number) => 300 + 64 - 4 - 30 * n - 15;
    j.clic(300, fila(2));
    j.avanzar(1);
    j.clic(300, fila(2)); // la misma: no avisa otra vez
    j.avanzar(1);
    expect(j.salida).toEqual(['3 Opción 3']);
    // La rueda, con el ratón encima
    j.raton.mover(300, 300);
    j.entrada.rueda = 3;
    j.avanzar(1);
    j.clic(300, fila(0));
    j.avanzar(1);
    expect(j.salida).toEqual(['3 Opción 3', '4 Opción 4']);
    j.entrada.rueda = 99;
    j.avanzar(1);
    j.clic(300, fila(3));
    j.avanzar(1);
    expect(control(j).valor).toBe('Opción 10');
    // Solo se dibujan las que caben
    const l = lienzo();
    j.juego.escena.dibujar(l.r);
    expect(l.textos).toEqual(['Opción 7', 'Opción 8', 'Opción 9', 'Opción 10']);
  });

  it('desde Chispa: opciones, elegido (desde 1) y valor (por su texto)', () => {
    const j = conControl({ tipo: 'lista', opciones: ['a', 'b'] }, 'cuando empieza:\n    mostrar(yo.elegido, yo.valor)\n    yo.opciones = ["Fácil", "Normal", "Difícil"]\n    yo.valor = "Normal"\n    mostrar(yo.elegido, yo.opciones)\n    yo.opciones = ["Normal", "Imposible"]\n    mostrar(yo.elegido)\n    yo.elegido = 0\n    mostrar(yo.valor)');
    expect(j.errores).toEqual([]);
    expect(j.salida).toEqual(['0 nulo', '2 ["Fácil", "Normal", "Difícil"]', '1', 'nulo']);
    const error = (codigo: string) => conControl({ tipo: 'lista', opciones: ['a', 'b'] }, `cuando empieza:\n    ${codigo}`).errores[0]?.error;
    expect(error('yo.elegido = 3')?.message).toMatch(/va de 1 a 2/);
    expect(error('yo.valor = "z"')?.message).toMatch(/no hay ninguna opción "z"/);
    expect(error('yo.valor = "z"')?.pista).toMatch(/"a", "b"/);
    expect(error('yo.opciones = "a"')?.message).toMatch(/lista de textos/);
  });

  it('el menú: flechas e Intro, o el ratón; avisa cada vez que se pulsa una opción, y mide lo que ocupan sus opciones', () => {
    const j = conControl({ tipo: 'menu', opciones: ['Jugar', 'Opciones', 'Salir'], elegido: 1 }, 'cuando cambia:\n    mostrar(yo.valor)', {}, { alto: 10 });
    j.avanzar(1);
    // 3 opciones de 38 de alto (letra de 20 × 1,9): el objeto mide 114 aunque se pusiera 10
    expect(j.buscar('Control').obtener(Sprite)!.alto).toBeCloseTo(114);
    j.pulsar('ArrowDown', 'ArrowDown');
    j.avanzar(1);
    j.soltar('ArrowDown', 'ArrowDown');
    j.pulsar('Enter', 'Enter');
    j.avanzar(1);
    j.soltar('Enter', 'Enter');
    expect(j.salida).toEqual(['Opciones']);
    // Da la vuelta por arriba
    for (let i = 0; i < 2; i++) {
      j.pulsar('ArrowUp', 'ArrowUp');
      j.avanzar(1);
      j.soltar('ArrowUp', 'ArrowUp');
    }
    expect(control(j).valor).toBe('Salir');
    // El ratón quieto encima de una opción no pisa a las flechas
    j.raton.mover(300, 300 + 38);
    const pintar = () => j.juego.escena.dibujar(lienzo().r);
    pintar();
    expect(control(j).valor).toBe('Jugar'); // al moverse por encima, la marca
    j.pulsar('ArrowDown', 'ArrowDown');
    j.avanzar(1);
    j.soltar('ArrowDown', 'ArrowDown');
    pintar();
    pintar();
    expect(control(j).valor).toBe('Opciones');
    // Con el ratón: la de arriba, dos veces (avisa las dos)
    j.clic(300, 300 + 38);
    j.avanzar(1);
    j.clic(300, 300 + 38);
    j.avanzar(1);
    expect(j.salida).toEqual(['Opciones', 'Jugar', 'Jugar']);
  });
});

describe('Ventana', () => {
  it('se arrastra por su barra de título (con lo de dentro) y se cierra con su X', () => {
    const j = juegoDePrueba({
      scripts: { 'v.chs': 'cuando empieza:\n    buscar("Dentro").pegarA(yo)\n\ncuando cambia:\n    mostrar("cerrada")' },
      escena: [
        { nombre: 'Ventana', x: 400, y: 300, sprite: { ancho: 300, alto: 200, fijo: true, tamano: 20, capa: -1 }, control: { tipo: 'ventana', titulo: 'Tienda', arrastrable: true, conCerrar: true }, script: 'v.chs' },
        { nombre: 'Dentro', x: 400, y: 280, sprite: { ancho: 100, alto: 30, fijo: true } },
      ],
    });
    j.avanzar(1);
    const v = j.buscar('Ventana');
    // La barra de título: los 34 píxeles de arriba (la ventana va de y = 200 a 400)
    j.raton.bajar(380, 390);
    j.avanzar(1);
    j.raton.mover(430, 350);
    j.avanzar(1);
    expect([v.posicion.x, v.posicion.y]).toEqual([450, 260]);
    expect([j.buscar('Dentro').posicion.x, j.buscar('Dentro').posicion.y]).toEqual([450, 240]);
    j.raton.soltar();
    j.avanzar(1);
    // Por el cuerpo no se arrastra
    j.raton.bajar(450, 200);
    j.avanzar(1);
    j.raton.mover(500, 200);
    j.avanzar(1);
    j.raton.soltar();
    expect(v.posicion.x).toBe(450);
    // La X, arriba a la derecha
    j.clic(450 + 150 - 12, 260 + 100 - 12);
    j.avanzar(1);
    expect(v.obtener(Sprite)!.visible).toBe(false);
    expect(j.buscar('Dentro').obtener(Sprite)!.visible).toBe(false);
    expect(j.salida).toEqual(['cerrada']);
  });

  it('el título se cambia desde Chispa', () => {
    const j = conControl({ tipo: 'ventana', titulo: 'A' }, 'cuando empieza:\n    yo.titulo = "Mochila"\n    mostrar(yo.titulo)', {}, { alto: 200 });
    expect(j.salida).toEqual(['Mochila']);
    const l = lienzo();
    j.juego.escena.dibujar(l.r);
    expect(l.textos).toEqual(['Mochila']);
  });
});

describe('Inventario', () => {
  it('meter, sacar, cuántos y vaciar', () => {
    const j = conControl({ tipo: 'inventario', columnas: 2, filas: 1 }, [
      'cuando empieza:',
      '    mostrar(yo.meter("llave"), yo.meter("moneda", 5), yo.meter("moneda", 2))',
      '    mostrar(yo.cuantos("moneda"), yo.cuantos("llave"), yo.cuantos("espada"))',
      '    mostrar(yo.meter("espada"))',
      '    mostrar(yo.sacar("moneda", 3), yo.sacar("moneda", 99), yo.sacar("moneda"))',
      '    mostrar(yo.meter("espada"), yo.cuantos("espada"))',
      '    yo.vaciar()',
      '    mostrar(yo.cuantos("llave"))',
    ].join('\n'));
    expect(j.errores).toEqual([]);
    // Las monedas se suman en su casilla; la espada no cabe (2 casillas) hasta que se acaban las monedas
    expect(j.salida).toEqual(['verdadero verdadero verdadero', '7 1 0', 'falso', '3 4 0', 'verdadero 1', '0']);
    const error = (codigo: string) => conControl({ tipo: 'inventario' }, `cuando empieza:\n    ${codigo}`).errores[0]?.error.message;
    expect(error('yo.meter("llave", 0)')).toMatch(/más de 0/);
    expect(error('yo.valor = "llave"')).toMatch(/no tiene un valor que se pueda cambiar/);
    expect(conControl({ tipo: 'barra' }, 'cuando empieza:\n    yo.meter("llave")').errores[0]?.error.message).toMatch(/'meter' no vale para una barra/);
  });

  it('lo que tiene al empezar, elegir una casilla con un clic y dibujarse (con imagen, o con su inicial)', () => {
    const j = juegoDePrueba({
      imagenes: { llave: '' },
      scripts: { 'i.chs': 'cuando cambia:\n    mostrar(yo.elegido, yo.valor)' },
      escena: [{ nombre: 'Inv', x: 300, y: 300, sprite: { ancho: 200, alto: 100, fijo: true, tamano: 16 }, control: { tipo: 'inventario', columnas: 2, filas: 1, objetos: [{ nombre: 'llave', cantidad: 1 }, { nombre: 'moneda', cantidad: 12 }] }, script: 'i.chs' }],
    });
    j.clic(350, 300); // la segunda casilla
    j.avanzar(1);
    j.clic(350, 300); // otra vez: se deselige
    j.avanzar(1);
    j.clic(250, 300);
    j.avanzar(1);
    expect(j.salida).toEqual(['2 moneda', '0 nulo', '1 llave']);
    const l = lienzo();
    j.juego.escena.dibujar(l.r);
    expect(l.cuenta.imagen).toBe(1); // la llave tiene imagen
    expect(l.textos).toEqual(['M', '12']); // la moneda no: su inicial; y cuántas hay (un 1 no se escribe)
    expect(colorDeNombre('moneda')).toBe(colorDeNombre('moneda'));
    expect(colorDeNombre('moneda')).not.toBe(colorDeNombre('llave'));
  });
});

describe('Minimapa', () => {
  it('dibuja las casillas sólidas, los objetos como puntos y lo que ve la cámara', () => {
    const j = juegoDePrueba({
      escena: [
        { nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 50, tipos: { suelo: { color: '#00ff00', solida: true }, agua: { color: '#0000ff', solida: false } }, celdas: { '0,0': 'suelo', '1,0': 'suelo', '39,0': 'suelo', '0,19': 'suelo', '5,5': 'agua' } } },
        { nombre: 'Jugador', x: 1000, y: 500, sprite: { ancho: 40, alto: 40, color: '#ff0000' } },
        { nombre: 'Letrero', x: 500, y: 500, sprite: { forma: 'texto', texto: 'Hola' } },
        { nombre: 'Mini', x: 860, y: 460, sprite: { ancho: 206, alto: 106, fijo: true, color: '#f1c40f' }, control: { tipo: 'minimapa' } },
      ],
    });
    j.avanzar(1);
    const l = lienzo();
    j.juego.escena.dibujar(l.r);
    // El mundo (2000 × 1000) cabe en el minimapa (200 × 100 por dentro): 1 píxel cada 10
    const casillas = l.llamadas.filter(([k, a]) => k === 'fillRect' && Math.abs((a as number[])[2] - 5.5) < 0.01).map(([, a]) => (a as number[]).slice(0, 2).map(Math.round));
    // 3 sólidas abajo (izquierda, al lado y en la otra punta) y una arriba a la izquierda; el agua no sale
    expect(casillas).toEqual([[760, 125], [765, 125], [955, 125], [760, 30]]);
    // El jugador, un punto rojo en su sitio (el letrero no es un punto: es un texto)
    const puntos = l.llamadas.filter(([k, a]) => k === 'arc' && (a as number[])[2] <= 4).map(([, a]) => (a as number[]).slice(0, 2).map(Math.round));
    expect(puntos).toEqual([[860, 80]]);
    expect(l.puesto.fillStyle).toContain('#ff0000');
    // El marco de lo que ve la cámara: 960 × 540 del mundo → 96 × 54
    const marco = l.llamadas.find(([k]) => k === 'strokeRect')![1] as number[];
    expect(marco.map(Math.round)).toEqual([760, 76, 96, 54]);
  });

  it('con un objeto en el centro, enseña su alrededor (el alcance)', () => {
    const j = juegoDePrueba({
      escena: [
        { nombre: 'Jugador', x: 5000, y: 5000, sprite: { ancho: 40, alto: 40 } },
        { nombre: 'Cerca', x: 5500, y: 5000, sprite: { ancho: 40, alto: 40 } },
        { nombre: 'Mini', x: 860, y: 460, sprite: { ancho: 206, alto: 106, fijo: true }, control: { tipo: 'minimapa', seguir: 'Jugador', alcance: 2000 } },
      ],
    });
    j.avanzar(1);
    const l = lienzo();
    j.juego.escena.dibujar(l.r);
    const puntos = l.llamadas.filter(([k, a]) => k === 'arc' && (a as number[])[2] <= 4).map(([, a]) => (a as number[]).slice(0, 2).map(Math.round));
    // El jugador, en el centro; el otro, 500 píxeles a la derecha → casi 50 en el minimapa
    expect(puntos).toEqual([[860, 80], [909, 80]]);
  });
});

describe('El minimapa en primera persona (vista3d) y yo.enMinimapa', () => {
  const celdas: Record<string, string> = { '0,4': 'muro', '2,3': 'puerta', '0,0': 'muro', '90,90': 'muro' };
  function juego(codigo: string, conVista = true) {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: { 'j.chs': `cuando empieza:\n${conVista ? '    vista3d.ver(yo)\n' : ''}    yo.rotacion = 0\n${codigo}`, 'otro.chs': '' },
      escena: [
        { nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 40, tipos: { muro: { color: '#00ff00', solida: true }, puerta: { color: '#0000ff', solida: true, puerta: true } }, celdas } },
        { nombre: 'Jugador', x: 200, y: 200, sprite: { ancho: 20, alto: 20 }, script: 'j.chs' },
        { nombre: 'Uno', x: 250, y: 200, sprite: { ancho: 20, alto: 20, color: '#ff00ff' } },
        { nombre: 'Dos', x: 300, y: 200, sprite: { ancho: 20, alto: 20, color: '#ff00ff' } },
        { nombre: 'Mini', x: 860, y: 460, sprite: { ancho: 206, alto: 106, fijo: true }, control: { tipo: 'minimapa', seguir: 'Jugador', alcance: 400 } },
      ],
    });
    j.juego.escena.vista3d.leerImagen = () => texturaLisa(0xff0000ff);
    return j;
  }
  function pintar(j: ReturnType<typeof juego>) {
    j.avanzar(1);
    const l = lienzo();
    j.juego.escena.dibujar(l.r);
    return l;
  }
  const puntos = (l: ReturnType<typeof lienzo>) => l.llamadas.filter(([k, a]) => k === 'arc' && (a as number[])[2] <= 4).map(([, a]) => (a as number[]).slice(0, 2).map(Math.round));

  /** La punta de la flecha: donde empieza la única figura de cuatro lados que se cierra. */
  const flecha = (l: ReturnType<typeof lienzo>) => {
    const i = l.llamadas.findIndex(([k], n) => k === 'moveTo' && l.llamadas.slice(n + 1, n + 5).map(([q]) => q).join() === 'lineTo,lineTo,lineTo,closePath');
    return (l.llamadas[i][1] as number[]).map(Math.round);
  };

  it('en vez del marco de la cámara, una flecha dice dónde está quien mira y hacia dónde', () => {
    const j = juego('');
    const l = pintar(j);
    expect(l.cuenta.strokeRect ?? 0).toBe(0);
    // La punta de la flecha, 8 píxeles a la derecha del centro del minimapa (mira hacia la derecha)
    expect(flecha(l)).toEqual([868, 80]);
    // Quien mira no sale además como un punto: solo los otros dos (a 50 y 100 píxeles → 25 y 50 en el minimapa)
    expect(puntos(l)).toEqual([[884, 80], [909, 80]]);
    // Si mira hacia arriba, la flecha también
    j.buscar('Jugador').transformacion.rotacion = 90;
    expect(flecha(pintar(j))).toEqual([860, 72]);
    expect(j.errores).toEqual([]);
  });

  it('sin vista3d sigue saliendo el marco de lo que ve la cámara y quien va en el centro es un punto', () => {
    const l = pintar(juego('', false));
    expect(l.cuenta.strokeRect).toBe(1);
    expect(puntos(l)).toHaveLength(3);
  });

  it('yo.enMinimapa: falso esconde el punto de un objeto y un color lo cambia', () => {
    const j = juego('    buscar("Uno").enMinimapa = falso\n    buscar("Dos").enMinimapa = "#ff0000"\n    mostrar(buscar("Uno").enMinimapa)\n    mostrar(buscar("Dos").enMinimapa)\n    mostrar(yo.enMinimapa)');
    const l = pintar(j);
    expect(puntos(l)).toEqual([[909, 80]]);
    expect(l.puesto.fillStyle).toContain('#ff0000');
    expect(l.puesto.fillStyle).not.toContain('#ff00ff');
    expect(j.salida).toEqual(['falso', '#ff0000', 'verdadero']);
    expect(j.errores).toEqual([]);
  });

  it('enMinimapa explica lo que no vale, y una copia hecha con clonar sale igual que el original', () => {
    const j = juego('    buscar("Uno").enMinimapa = "rojo"\n    variable copia = buscar("Uno").clonar()\n    mostrar(copia.enMinimapa)\n    yo.enMinimapa = "rojizo"');
    j.avanzar(1);
    expect(j.salida).toEqual(['rojo']);
    expect(j.errores[0].error.message).toContain("'enMinimapa' quiere verdadero, falso o un color");
    expect(j.errores[0].error.message).toContain('"rojizo"');
  });

  it('una puerta abierta se pinta apagada, y las casillas que quedan fuera de lo que se enseña no se pintan', () => {
    const j = juego('');
    const casillas = (l: ReturnType<typeof lienzo>) => l.llamadas.filter(([k, a]) => k === 'fillRect' && Math.abs((a as number[])[2] - 19.9) < 0.1).length;
    const l = pintar(j);
    // El muro de (0,4) y la puerta; los muros de (0,0) y (90,90) quedan fuera
    expect(casillas(l)).toBe(2);
    expect((l.puesto.globalAlpha ?? []).filter((a) => a === 0.3)).toHaveLength(0);
    j.buscar('Mapa').obtener(MapaCasillas)!.moverPuerta(2, 3, 1);
    j.avanzar(120);
    expect((pintar(j).puesto.globalAlpha ?? []).filter((a) => a === 0.3)).toHaveLength(1);
  });
});

describe('El minimapa no se repinta entero en cada fotograma', () => {
  it('se pinta en un lienzo aparte cada 66 ms y entre medias solo se copia', () => {
    const j = juegoDePrueba({
      escena: [
        { nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 50, tipos: { suelo: { color: '#00ff00', solida: true } }, celdas: { '0,0': 'suelo', '1,0': 'suelo', '2,0': 'suelo' } } },
        { nombre: 'Jugador', x: 100, y: 100, sprite: { ancho: 40, alto: 40 } },
        { nombre: 'Mini', x: 860, y: 460, sprite: { ancho: 206, alto: 106, fijo: true }, control: { tipo: 'minimapa' } },
      ],
    });
    j.avanzar(1);
    const aparte = lienzo();
    const hechos: number[][] = [];
    const crear = Control.crearLienzo;
    const reloj = Control.reloj;
    let ahora = 1000;
    Control.crearLienzo = (ancho, alto) => (hechos.push([ancho, alto]), { lienzo: { width: ancho, height: alto } as HTMLCanvasElement, ctx: (aparte.r as { ctx: CanvasRenderingContext2D }).ctx });
    Control.reloj = () => ahora;
    try {
      const pantalla = lienzo();
      const pintar = () => j.juego.escena.dibujar(pantalla.r);
      pintar();
      // Un lienzo del tamaño del minimapa; las casillas se pintan en él, y a la pantalla solo va la copia
      expect(hechos).toEqual([[206, 106]]);
      expect(aparte.cuenta.fillRect).toBe(3);
      // (en la pantalla, los únicos fillRect son las tres casillas del propio mapa del mundo)
      expect(pantalla.cuenta.fillRect).toBe(3);
      expect(pantalla.llamadas.filter(([k]) => k === 'drawImage').map(([, a]) => (a as number[]).slice(1))).toEqual([[757, 27, 206, 106]]);
      // Los fotogramas siguientes (16 ms cada uno) no repintan: copian
      for (let i = 0; i < 3; i++) { ahora += 16; pintar(); }
      expect(aparte.cuenta.fillRect).toBe(3);
      expect(pantalla.cuenta.drawImage).toBe(4);
      // Pasados 66 ms, se repinta (con lo que haya cambiado)
      ahora += 40;
      pintar();
      expect(aparte.cuenta.fillRect).toBe(6);
      expect(hechos).toHaveLength(1);
    } finally {
      Control.crearLienzo = crear;
      Control.reloj = reloj;
    }
  });
});

describe('Un menú con el mando sin hacer de teclado (mando.comoTeclado = falso)', () => {
  it('la cruceta elige y el botón A acepta', () => {
    const j = conControl({ tipo: 'menu', opciones: ['Seguir', 'Ajustes', 'Salir'], elegido: 1 }, 'cuando empieza:\n    mando.comoTeclado = falso\n\ncuando cambia:\n    mostrar(yo.valor)');
    const pulsar = (...botones: string[]) => {
      j.entrada.ponerMando(true, new Set(botones), 0, 0);
      j.avanzar(1);
      j.entrada.ponerMando(true, new Set(), 0, 0);
      j.avanzar(1);
    };
    j.avanzar(2);
    pulsar('abajo');
    pulsar('abajo');
    pulsar('arriba');
    pulsar('a');
    expect(j.salida).toEqual(['Ajustes']);
    // Da la vuelta por arriba
    pulsar('arriba');
    pulsar('arriba');
    pulsar('a');
    expect(j.salida).toEqual(['Ajustes', 'Salir']);
    expect(j.errores).toEqual([]);
  });
});

describe('En el editor', () => {
  const vistaFalsa = () => ({ herramienta: 'mover', tipoPincel: null, alCambiarHerramienta: () => {}, ponerHerramienta() {} }) as unknown as VistaEscena;

  it('cada control tiene su sección en el inspector, con sus datos', () => {
    const e = new EstadoEditor();
    const insp = new Inspector(e, vistaFalsa());
    const campo = (ruta: string) => insp.elemento.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-ruta="${ruta}"]`);
    const cambiar = (ruta: string, valor: string) => {
      const c = campo(ruta)!;
      c.value = valor;
      c.dispatchEvent(new Event('change'));
    };
    e.crearControl('menu', 480, 270);
    expect(insp.elemento.textContent).toContain('Control: Menú');
    cambiar('control.opciones', 'Empezar\n\n  Récords  \nSalir\n');
    expect(e.seleccionado?.control?.opciones).toEqual(['Empezar', 'Récords', 'Salir']);
    e.crearControl('barra', 480, 270);
    cambiar('control.dato', ' juego.vida ');
    cambiar('control.maximo', '200');
    expect(e.seleccionado?.control).toMatchObject({ tipo: 'barra', dato: 'juego.vida', maximo: 200 });
    cambiar('control.dato', '');
    expect(e.seleccionado?.control?.dato).toBeUndefined();
    e.crearControl('ventana', 480, 270);
    expect(campo('control.titulo')!.value).toBe('Ventana');
    expect(campo('control.opciones')).toBeNull();
    e.crearControl('minimapa', 480, 270);
    cambiar('control.seguir', 'Jugador');
    expect(campo('control.alcance')).not.toBeNull();
    // Cada tipo tiene todo lo que hace falta para verse bien al crearlo
    for (const tipo of Object.keys(CONTROLES_NUEVOS) as TipoControl[]) {
      const { def, ayuda } = CONTROLES_NUEVOS[tipo];
      expect(def.control?.tipo).toBe(tipo);
      expect(def.sprite?.fijo).toBe(true);
      expect(ayuda.length).toBeGreaterThan(20);
    }
  });

  it('el botón de «Añadir > Botón» es un control (se ilumina y se hunde), y los botones viejos siguen funcionando', () => {
    const e = new EstadoEditor();
    e.crearObjeto('boton', 100, 100);
    expect(e.seleccionado?.control).toEqual({ tipo: 'boton' });
    // Un botón de un proyecto de antes (sin control): un rectángulo con texto, como siempre
    const j = juegoDePrueba({ scripts: { 'b.chs': 'cuando hago clic encima:\n    mostrar("ok")' }, escena: [{ nombre: 'B', x: 100, y: 100, sprite: { ancho: 100, alto: 40, fijo: true, texto: 'Viejo' }, script: 'b.chs' }] });
    j.clic(100, 100);
    j.avanzar(1);
    expect(j.salida).toEqual(['ok']);
  });
});
