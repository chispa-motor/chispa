/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * TESTS DEL EDITOR (sesión 3, bloque 3): selección múltiple, copias enlazadas
 * de plantillas y deshacer / rehacer para TODO lo que cambia el proyecto.
 */
import { describe, expect, it } from 'vitest';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { imagenPrueba, sonidoPrueba } from './ayudantes';

function conTres(): EstadoEditor {
  const e = new EstadoEditor();
  e.crearObjeto('rectangulo', 0, 0);
  e.crearObjeto('circulo', 100, 0);
  e.crearObjeto('texto', 200, 0);
  return e;
}

describe('Selección múltiple', () => {
  it('Ctrl+clic añade y quita de la selección', () => {
    const e = conTres();
    e.seleccionarIndice(0);
    e.alternarSeleccion(2);
    expect(e.indicesSeleccionados()).toEqual([0, 2]);
    expect(e.variosSeleccionados).toBe(true);
    expect(e.seleccionado?.nombre).toBe('Texto'); // el último elegido
    e.alternarSeleccion(0);
    expect(e.indicesSeleccionados()).toEqual([2]);
    expect(e.variosSeleccionados).toBe(false);
    e.alternarSeleccion(2);
    expect(e.seleccion).toBeNull();
  });

  it('seleccionar uno (clic normal) quita los demás; cambiar de escena también', () => {
    const e = conTres();
    e.seleccionarVarios([0, 1, 2]);
    e.seleccionarIndice(1);
    expect(e.indicesSeleccionados()).toEqual([1]);
    e.seleccionarVarios([0, 1]);
    e.crearEscena('Otra');
    e.cambiarEscenaActual('Otra');
    expect(e.indicesSeleccionados()).toEqual([]);
  });

  it('mover varios a la vez (flechas y arrastrando) se deshace de una vez', () => {
    const e = conTres();
    e.seleccionarVarios([0, 1]);
    e.moverSeleccionados(10, -5);
    expect(e.escena.objetos.map((o) => [o.x, o.y])).toEqual([[10, -5], [110, -5], [200, 0]]);
    e.empezarCambioLargo();
    e.colocarObjetos([{ indice: 0, x: 50, y: 50 }, { indice: 1, x: 150, y: 50 }]);
    e.colocarObjetos([{ indice: 0, x: 60, y: 60 }, { indice: 1, x: 160, y: 60 }]);
    e.terminarCambioLargo();
    expect(e.escena.objetos[1]).toMatchObject({ x: 160, y: 60 });
    e.deshacer();
    expect(e.escena.objetos.map((o) => [o.x, o.y])).toEqual([[10, -5], [110, -5], [200, 0]]);
  });

  it('borrar varios', () => {
    const e = conTres();
    e.seleccionarVarios([0, 2]);
    e.borrarSeleccionado();
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(['Circulo']);
    expect(e.seleccion).toBeNull();
    e.deshacer();
    expect(e.escena.objetos).toHaveLength(3);
  });

  it('duplicar varios: las copias quedan seleccionadas, con nombres sin repetir', () => {
    const e = conTres();
    e.seleccionarVarios([0, 1]);
    e.duplicarSeleccionado();
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(['Cuadrado', 'Circulo', 'Texto', 'Cuadrado2', 'Circulo2']);
    expect(e.indicesSeleccionados()).toEqual([3, 4]);
    expect(e.escena.objetos[3]).toMatchObject({ x: 24, y: -24 });
  });

  it('copiar varios y pegarlos en otra escena conserva su forma', () => {
    const e = conTres();
    e.seleccionarVarios([0, 1]);
    expect(e.copiarSeleccionado()).toBe(true);
    e.crearEscena('Nivel2');
    e.cambiarEscenaActual('Nivel2');
    e.pegar();
    expect(e.escena.objetos.map((o) => [o.nombre, o.x, o.y])).toEqual([['Cuadrado', 0, 0], ['Circulo', 100, 0]]);
    expect(e.indicesSeleccionados()).toEqual([0, 1]);
    // Pegar otra vez en el mismo sitio: todo el grupo se desplaza igual
    e.pegar();
    expect(e.escena.objetos.slice(2).map((o) => [o.nombre, o.x, o.y])).toEqual([['Cuadrado2', 24, -24], ['Circulo2', 124, -24]]);
  });

  it('Ctrl+A selecciona todo menos los mapas', () => {
    const e = conTres();
    e.crearObjeto('mapa', 0, 0);
    e.seleccionarTodo();
    expect(e.indicesSeleccionados()).toEqual([0, 1, 2]);
  });

  it('deshacer quita de la selección lo que ya no existe', () => {
    const e = conTres();
    e.crearObjeto('rectangulo', 0, 0);
    e.seleccionarVarios([1, 3]);
    e.deshacer(); // deshace la creación del cuarto
    expect(e.indicesSeleccionados()).not.toContain(3);
  });
});

describe('Copias enlazadas de una plantilla', () => {
  function conMonedas(): EstadoEditor {
    const e = new EstadoEditor();
    e.crearPlantillaVacia('Moneda');
    e.colocarPlantilla('Moneda', 0, 0);
    e.colocarPlantilla('Moneda', 100, 0);
    e.colocarPlantilla('Moneda', 200, 50);
    return e;
  }
  const ref = (indice: number) => ({ tipo: 'escena' as const, escena: 'Principal', indice });

  it('las copias colocadas quedan enlazadas a su plantilla', () => {
    const e = conMonedas();
    e.cambiarEscenaActual(e.escenaActual);
    expect(e.escena.objetos.map((o) => [o.nombre, o.plantilla])).toEqual([['Moneda', 'Moneda'], ['Moneda2', 'Moneda'], ['Moneda3', 'Moneda']]);
    expect(e.copiasDe('Moneda')).toHaveLength(3);
  });

  it('cambiar una copia cambia la plantilla y todas las copias, menos el nombre y el sitio, en un solo deshacer', () => {
    const e = conMonedas();
    const r = { ...ref(1), escena: e.escenaActual };
    e.cambiarPropiedad(r, 'sprite.color', 'amarillo');
    e.activarComponente(r, 'fisica', true);
    e.cambiarPropiedadPropia(r, 'valor', 5);
    for (const o of [...e.escena.objetos, e.proyecto.plantillas.Moneda]) {
      expect(o.sprite?.color).toBe('amarillo');
      expect(o.fisica).toEqual({});
      expect(o.propiedades).toEqual({ valor: 5 });
    }
    expect(e.escena.objetos.map((o) => [o.nombre, o.x, o.y])).toEqual([['Moneda', 0, 0], ['Moneda2', 100, 0], ['Moneda3', 200, 50]]);
    // Mover una copia NO mueve las demás
    e.moverObjeto(r, 500, 500);
    expect(e.escena.objetos[0]).toMatchObject({ x: 0, y: 0 });
    e.deshacer(); // mover
    e.deshacer(); // propiedad propia
    expect(e.escena.objetos.every((o) => o.propiedades === undefined)).toBe(true);
    expect(e.proyecto.plantillas.Moneda.propiedades).toBeUndefined();
  });

  it('cambiar la plantilla cambia las copias de todas las escenas', () => {
    const e = conMonedas();
    e.duplicarEscena(e.escenaActual);
    e.cambiarPropiedad({ tipo: 'plantilla', nombre: 'Moneda' }, 'sprite.ancho', 16);
    const todas = Object.values(e.proyecto.escenas).flatMap((s) => s.objetos);
    expect(todas).toHaveLength(6);
    expect(todas.every((o) => o.sprite?.ancho === 16)).toBe(true);
  });

  it('un script creado desde una copia es el de todas', () => {
    const e = conMonedas();
    const archivo = e.crearScriptPara({ ...ref(0), escena: e.escenaActual });
    expect(e.escena.objetos.every((o) => o.script === archivo)).toBe(true);
    expect(e.proyecto.plantillas.Moneda.script).toBe(archivo);
  });

  it('desvincular: esa copia deja de cambiar con las demás', () => {
    const e = conMonedas();
    const r0 = { ...ref(0), escena: e.escenaActual };
    e.desvincular(r0);
    expect(e.plantillaDe(r0)).toBeNull();
    e.cambiarPropiedad({ ...ref(1), escena: e.escenaActual }, 'sprite.color', 'verde');
    expect(e.escena.objetos[0].sprite?.color).not.toBe('verde');
    expect(e.escena.objetos[2].sprite?.color).toBe('verde');
    // Sigue siendo del mismo tipo (para "cuando toco Moneda")
    expect(e.escena.objetos[0].tipo).toBe('Moneda');
    // Lo que cambia en ella tampoco llega a las demás
    e.cambiarPropiedad(r0, 'sprite.color', 'rojo');
    expect(e.escena.objetos[1].sprite?.color).toBe('verde');
  });

  it('renombrar la plantilla mantiene el enlace; borrarla desvincula las copias', () => {
    const e = conMonedas();
    e.renombrar({ tipo: 'plantilla', nombre: 'Moneda' }, 'Gema');
    expect(e.escena.objetos.every((o) => o.plantilla === 'Gema' && o.tipo === 'Gema')).toBe(true);
    e.cambiarPropiedad({ ...ref(0), escena: e.escenaActual }, 'sprite.color', 'morado');
    expect(e.proyecto.plantillas.Gema.sprite?.color).toBe('morado');
    e.seleccionar({ tipo: 'plantilla', nombre: 'Gema' });
    e.borrarSeleccionado();
    expect(e.escena.objetos).toHaveLength(3);
    expect(e.escena.objetos.every((o) => o.plantilla === undefined)).toBe(true);
  });

  it('pintar en un mapa enlazado pinta en todas sus copias', () => {
    const e = new EstadoEditor();
    e.crearObjeto('mapa', 0, 0);
    const n = e.convertirEnPlantilla(e.seleccion!)!;
    e.colocarPlantilla(n, 0, 0);
    e.colocarPlantilla(n, 1000, 0);
    e.pintarCasilla({ tipo: 'escena', escena: e.escenaActual, indice: 0 }, 2, 3, 'suelo');
    expect(e.escena.objetos[1].mapa?.celdas['2,3']).toBe('suelo');
  });

  it('duplicar una copia enlazada da otra copia enlazada; pegarla donde no está la plantilla, no', () => {
    const e = conMonedas();
    e.seleccionarIndice(0);
    e.duplicarSeleccionado();
    expect(e.seleccionado?.plantilla).toBe('Moneda');
    e.copiarSeleccionado();
    e.seleccionar({ tipo: 'plantilla', nombre: 'Moneda' });
    e.borrarSeleccionado();
    e.pegar();
    expect(e.seleccionado?.plantilla).toBeUndefined();
  });
});

describe('Deshacer y rehacer: TODO lo que cambia el proyecto', () => {
  /** Un proyecto con un poco de todo. */
  function completo(): EstadoEditor {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    e.crearScriptPara(e.seleccion!);
    e.crearObjeto('mapa', 0, 0);
    e.ponerTipoCasilla(e.seleccion!, 'hielo', { color: 'azul', solida: false });
    e.crearObjeto('circulo', 50, 50);
    e.crearPlantillaVacia('Bala');
    e.colocarPlantilla('Bala', 10, 10);
    e.agregarImagen('foto.png', imagenPrueba('AAAA'));
    e.agregarSonido('pum.wav', sonidoPrueba('AAAA'));
    e.crearAnimacion('andar', ['foto']);
    e.crearEscena('Nivel2');
    e.cambiarEscenaActual('Principal');
    e.seleccionarVarios([0, 2]);
    e.copiarSeleccionado();
    e.seleccionarIndice(0);
    return e;
  }
  const obj = (i: number) => ({ tipo: 'escena' as const, escena: 'Principal', indice: i });

  // Cada cambio posible del editor. Si añades uno nuevo al estado, añádelo aquí (el último test lo comprueba).
  const cambios: Record<string, (e: EstadoEditor) => void> = {
    renombrarProyecto: (e) => e.renombrarProyecto('Otro'),
    cambiarAjusteProyecto: (e) => e.cambiarAjusteProyecto('ancho', 640),
    cambiarDatoJuego: (e) => e.cambiarDatoJuego('vidas', 3),
    crearObjeto: (e) => e.crearObjeto('texto', 0, 0),
    borrarSeleccionado: (e) => e.borrarSeleccionado(),
    duplicarSeleccionado: (e) => e.duplicarSeleccionado(),
    pegar: (e) => e.pegar(),
    moverSeleccionados: (e) => e.moverSeleccionados(5, 5),
    colocarObjetos: (e) => e.colocarObjetos([{ indice: 0, x: 9, y: 9 }]),
    moverEnLista: (e) => e.moverEnLista(0, 2),
    renombrar: (e) => e.renombrar(obj(0), 'Jugador'),
    moverObjeto: (e) => e.moverObjeto(obj(0), 3, 3),
    cambiarPropiedad: (e) => e.cambiarPropiedad(obj(0), 'sprite.color', 'rojo'),
    activarComponente: (e) => e.activarComponente(obj(0), 'recorrido', true),
    cambiarPropiedadPropia: (e) => e.cambiarPropiedadPropia(obj(0), 'vida', 3),
    crearScriptPara: (e) => e.crearScriptPara(obj(2)),
    crearScriptSuelto: (e) => e.crearScriptSuelto('reglas'),
    asignarScript: (e) => e.asignarScript(obj(2), 'cuadrado.chs'),
    renombrarScript: (e) => e.renombrarScript('cuadrado.chs', 'jugador.chs'),
    borrarScript: (e) => e.borrarScript('cuadrado.chs'),
    crearEscena: (e) => e.crearEscena('Menu'),
    duplicarEscena: (e) => e.duplicarEscena('Principal'),
    renombrarEscena: (e) => e.renombrarEscena('Nivel2', 'Final'),
    borrarEscena: (e) => e.borrarEscena('Nivel2'),
    ponerEscenaInicial: (e) => e.ponerEscenaInicial('Nivel2'),
    cambiarEscenaPropiedad: (e) => e.cambiarEscenaPropiedad('gravedad', 500),
    convertirEnPlantilla: (e) => e.convertirEnPlantilla(obj(2)),
    colocarPlantilla: (e) => e.colocarPlantilla('Bala', 0, 0),
    crearPlantillaVacia: (e) => e.crearPlantillaVacia('Enemigo'),
    desvincular: (e) => e.desvincular(obj(3)),
    agregarImagen: (e) => e.agregarImagen('otra.png', imagenPrueba('BBBB')),
    borrarImagen: (e) => e.borrarImagen('foto'),
    agregarSonido: (e) => e.agregarSonido('otro.wav', sonidoPrueba('BBBB')),
    borrarSonido: (e) => e.borrarSonido('pum'),
    crearAnimacion: (e) => e.crearAnimacion('saltar'),
    cambiarAnimacion: (e) => e.cambiarAnimacion('andar', { velocidad: 3 }),
    borrarAnimacion: (e) => e.borrarAnimacion('andar'),
    pintarCasilla: (e) => e.pintarCasilla(obj(1), 0, 0, 'suelo'),
    pintarRectangulo: (e) => e.pintarRectangulo(obj(1), 0, 0, 3, 3, 'suelo'),
    ponerTipoCasilla: (e) => e.ponerTipoCasilla(obj(1), 'lava', { color: 'azul', solida: true }),
    borrarTipoCasilla: (e) => e.borrarTipoCasilla(obj(1), 'hielo'),
    cambiarImagen: (e) => e.cambiarImagen('foto', imagenPrueba('CCCC')),
    renombrarRecurso: (e) => e.renombrarRecurso('imagen', 'foto', 'retrato'),
    guardarDibujo: (e) => e.guardarDibujo('Gato', [imagenPrueba('a'), imagenPrueba('b')]),
    ponerMisColores: (e) => e.ponerMisColores(['#ff8800', 'rojo']),
    combinarFormas: (e) => {
      e.seleccionarVarios([0, 2]);
      e.combinarFormas('unir');
    },
    cambiarCamino: (e) => e.cambiarCamino(obj(0), [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], true),
    convertirEnImagen: (e) => e.convertirEnImagen(obj(2), imagenPrueba('forma')),
  };

  for (const [nombre, cambio] of Object.entries(cambios)) {
    it(`${nombre} se deshace y se rehace`, () => {
      const e = completo();
      const antes = JSON.stringify(e.proyecto);
      cambio(e);
      const despues = JSON.stringify(e.proyecto);
      expect(despues, 'el cambio no ha hecho nada').not.toBe(antes);
      e.deshacer();
      expect(JSON.stringify(e.proyecto)).toBe(antes);
      while (e.puedeRehacer) e.rehacer();
      expect(JSON.stringify(e.proyecto)).toBe(despues);
    });
  }

  it('todos los métodos que cambian el proyecto están en esta lista', () => {
    // Los que NO cambian el proyecto (o tienen su propio deshacer, como el código)
    const sinDeshacer = new Set([
      'constructor', 'alCambiar', 'cambiar', 'empezarCambioLargo', 'terminarCambioLargo', 'deshacer', 'rehacer',
      'abrir', 'aJSON', 'marcarGuardado', 'seleccionar', 'seleccionarIndice', 'seleccionarVarios', 'seleccionarTodo',
      'alternarSeleccion', 'indicesSeleccionados', 'estaSeleccionado', 'definicion', 'nombreLibre', 'copiarSeleccionado',
      'cambiarCodigo', 'abrirScript', 'cerrarPestana', 'activarPestana', 'todosLosObjetos', 'cambiarEscenaActual',
      'copiasDe', 'plantillaDe', 'usosDe', 'enBloques', 'ponerEnBloques',
    ]);
    const metodos = Object.getOwnPropertyNames(EstadoEditor.prototype).filter((m) => {
      const d = Object.getOwnPropertyDescriptor(EstadoEditor.prototype, m);
      return typeof d?.value === 'function';
    });
    const privados = new Set(['avisar', 'apuntar', 'restaurar', 'cambiarObjeto', 'propagar', 'objetosConSitio']);
    const sinProbar = metodos.filter((m) => !sinDeshacer.has(m) && !privados.has(m) && !(m in cambios));
    expect(sinProbar).toEqual([]);
  });
});
