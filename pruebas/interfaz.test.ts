/**
 * TESTS DE LA INTERFAZ DEL EDITOR (3D y Fase 4) Y DE LA EXPORTACIÓN (Fase 5).
 *
 * El dibujo en el lienzo no se puede probar sin un navegador de verdad (eso
 * se comprueba a mano y con Playwright), pero sí toda la lógica: la
 * geometría de la vista de la escena, los paneles (se construyen con
 * happy-dom), el autocompletado, la ayuda y la página exportada.
 */
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { ajustar, CamaraEditor, cajaDe, marcoDelJuego, objetoEn, pasoDeCuadricula, posicionEnEditor, posicionGuardada } from '../src/editor/escena/geometria';
import { aHex } from '../src/editor/paneles/campos';
import { Inspector } from '../src/editor/paneles/Inspector';
import { PanelInferior } from '../src/editor/paneles/PanelInferior';
import { PanelIzquierdo } from '../src/editor/paneles/PanelIzquierdo';
import type { VistaEscena } from '../src/editor/escena/VistaEscena';
import { fuenteAutocompletado } from '../src/editor/codigo/autocompletado';
import { eventoDeLinea, rutaEn } from '../src/editor/codigo/ayudaYErrores';
import { proyectoVacio, type DefProyecto } from '../src/proyecto/formato';
import { proyectoMinimo } from '../src/ejemplos/minimo/proyecto';

/** Una vista de escena "de mentira" (el inspector solo necesita esto). */
function vistaFalsa(): VistaEscena {
  return { tipoPincel: null, herramienta: 'mover', ponerHerramienta() {}, alCambiarHerramienta() {} } as unknown as VistaEscena;
}

// ═════════════════════════ Geometría de la vista de la escena ═════════════════════════

describe('Vista de la escena: geometría', () => {
  it('la cámara del editor convierte mundo ↔ pantalla con la Y hacia arriba', () => {
    const c = new CamaraEditor();
    Object.assign(c, { x: 100, y: 100, zoom: 2, ancho: 400, alto: 300 });
    expect(c.aPantalla(100, 100)).toEqual({ x: 200, y: 150 });
    expect(c.aPantalla(110, 110)).toEqual({ x: 220, y: 130 }); // más arriba en el mundo = más arriba en la pantalla
    const m = c.aMundo(220, 130);
    expect(m.x).toBeCloseTo(110);
    expect(m.y).toBeCloseTo(110);
  });

  it('el zoom con la rueda deja quieto el punto que hay bajo el ratón', () => {
    const c = new CamaraEditor();
    Object.assign(c, { ancho: 800, alto: 600 });
    const antes = c.aMundo(123, 456);
    c.zoomEn(123, 456, 1.7);
    const despues = c.aMundo(123, 456);
    expect(despues.x).toBeCloseTo(antes.x);
    expect(despues.y).toBeCloseTo(antes.y);
    expect(c.zoom).toBeCloseTo(1.7);
  });

  it('el marco del juego sigue a la cámara de la escena (posición y zoom)', () => {
    const p = proyectoVacio();
    expect(marcoDelJuego(p, p.escenas.Principal)).toMatchObject({ izquierda: 0, derecha: 960, abajo: 0, arriba: 540, zoom: 1 });
    const m = marcoDelJuego(p, { colorFondo: 'negro', objetos: [], camara: { x: 1000, y: 500, zoom: 2 } });
    expect(m).toMatchObject({ izquierda: 760, derecha: 1240, abajo: 365, arriba: 635 });
  });

  it('los objetos de interfaz (fijo) se enseñan dentro del marco y se guardan en coordenadas de pantalla', () => {
    const marco = { izquierda: 760, derecha: 1240, abajo: 365, arriba: 635, zoom: 2 };
    const def = { x: 100, y: 50, sprite: { fijo: true, ancho: 40, alto: 20 } };
    expect(posicionEnEditor(def, marco)).toEqual({ x: 810, y: 390 });
    expect(posicionGuardada(def, marco, 810, 390)).toEqual({ x: 100, y: 50 });
    // Y su tamaño se ve más pequeño porque la cámara del juego hace zoom sobre el mundo, no sobre la interfaz
    expect(cajaDe(def, marco)).toEqual({ izquierda: 800, derecha: 820, abajo: 385, arriba: 395 });
  });

  it('caja de cada tipo de objeto: sprite con escala, texto alineado, mapa y vacío', () => {
    const marco = { izquierda: 0, derecha: 960, abajo: 0, arriba: 540, zoom: 1 };
    expect(cajaDe({ x: 100, y: 100, escala: 2, sprite: { ancho: 10, alto: 20 } }, marco)).toEqual({ izquierda: 90, derecha: 110, abajo: 80, arriba: 120 });
    expect(cajaDe({ x: 0, y: 0, sprite: { forma: 'texto', alinear: 'izquierda', ancho: 100, alto: 20 } }, marco).izquierda).toBe(0);
    expect(cajaDe({ x: 10, y: 10, mapa: { tamano: 32, tipos: {}, celdas: { '0,0': 'a', '2,1': 'a' } } }, marco)).toEqual({ izquierda: 10, derecha: 106, abajo: 10, arriba: 74 });
    expect(cajaDe({ x: 0, y: 0 }, marco).derecha - cajaDe({ x: 0, y: 0 }, marco).izquierda).toBe(28);
  });

  it('objetoEn elige el que se dibuja más arriba, y los mapas solo por sus casillas', () => {
    const marco = { izquierda: 0, derecha: 960, abajo: 0, arriba: 540, zoom: 1 };
    const objetos = [
      { nombre: 'Mapa', x: 0, y: 0, mapa: { tamano: 50, tipos: {}, celdas: { '0,0': 'suelo', '1,0': 'suelo' } } },
      { nombre: 'Detras', x: 50, y: 25, sprite: { ancho: 40, alto: 40, capa: -5 } },
      { nombre: 'Delante', x: 50, y: 25, sprite: { ancho: 40, alto: 40 } },
      { nombre: 'Boton', x: 500, y: 300, sprite: { ancho: 40, alto: 40, fijo: true, capa: -100 } },
    ];
    expect(objetoEn(objetos, marco, 50, 25)).toBe(2);
    expect(objetoEn(objetos, marco, 90, 10)).toBe(0); // casilla pintada, sin nada encima
    expect(objetoEn(objetos, marco, 300, 300)).toBeNull(); // casilla sin pintar: no es del mapa
    expect(objetoEn([...objetos, { nombre: 'Encima', x: 500, y: 300, sprite: { ancho: 40, alto: 40, capa: 50 } }], marco, 500, 300)).toBe(3); // la interfaz siempre encima
  });

  it('imán y cuadrícula', () => {
    expect(ajustar(23, 16)).toBe(16);
    expect(ajustar(25, 16)).toBe(32);
    expect(ajustar(25.4, 0)).toBe(25);
    expect(pasoDeCuadricula(32, 1)).toBe(32);
    expect(pasoDeCuadricula(32, 0.1)).toBe(128); // alejado: rayas más separadas
    expect(pasoDeCuadricula(32, 8)).toBe(8); // muy cerca: rayas más juntas
  });
});

// ═════════════════════════ Paneles ═════════════════════════

describe('Paneles del editor', () => {
  it('el panel izquierdo lista los objetos de la escena con sus scripts', () => {
    const e = new EstadoEditor(proyectoMinimo);
    const panel = new PanelIzquierdo(e, vistaFalsa());
    const texto = panel.elemento.textContent ?? '';
    expect(texto).toContain('Cuadrado');
    expect(texto).toContain('cuadrado.chs');
    e.crearObjeto('circulo', 0, 0);
    expect(panel.elemento.querySelectorAll('.nodo:not(.hijo)').length).toBe(2);
    expect(panel.elemento.querySelector('.nodo.seleccionado')?.textContent).toContain('Circulo');
    // Clic en el script: se abre en una pestaña
    panel.elemento.querySelector<HTMLElement>('.nodo.hijo')!.click();
    expect(e.pestanaActiva).toBe('cuadrado.chs');
  });

  it('el inspector enseña las propiedades del objeto y las cambia', () => {
    const e = new EstadoEditor();
    const insp = new Inspector(e, vistaFalsa());
    expect(insp.elemento.textContent).toContain('Escena: Principal'); // sin selección: ajustes de la escena
    e.crearObjeto('rectangulo', 100, 200);
    const x = insp.elemento.querySelector<HTMLInputElement>('[data-ruta="x"]')!;
    expect(x.value).toBe('100');
    x.value = '321';
    x.dispatchEvent(new Event('change'));
    expect(e.seleccionado?.x).toBe(321);
    const color = insp.elemento.querySelector<HTMLInputElement>('[data-ruta="sprite.color"]')!;
    color.value = 'rojo';
    color.dispatchEvent(new Event('change'));
    expect(e.seleccionado?.sprite?.color).toBe('rojo');
    // Poner física desde su interruptor (y la colisión viene con ella)
    e.activarComponente(e.seleccion!, 'colision', false);
    const secciones = [...insp.elemento.querySelectorAll('details.seccion')];
    const fisica = secciones.find((s) => s.textContent?.startsWith('Física'))!;
    const interruptor = fisica.querySelector<HTMLInputElement>('.interruptor')!;
    interruptor.checked = true;
    interruptor.dispatchEvent(new Event('change'));
    expect(e.seleccionado?.fisica).toEqual({});
    expect(e.seleccionado?.colision).toEqual({});
  });

  it('el inspector de un mapa enseña sus tipos de casilla y elige el pincel', () => {
    const e = new EstadoEditor();
    const vista = vistaFalsa();
    const insp = new Inspector(e, vista);
    e.crearObjeto('mapa', 0, 0);
    expect(insp.elemento.textContent).toContain('suelo');
    expect(vista.tipoPincel).toBe('suelo');
  });

  it('la consola junta el mismo error repetido en una sola línea con ×N y salta a su línea al hacer clic', () => {
    const e = new EstadoEditor(proyectoMinimo);
    const saltos: [string, number][] = [];
    const panel = new PanelInferior(e, (archivo, linea) => saltos.push([archivo, linea]));
    const d = { gravedad: 'error' as const, archivo: 'cuadrado.chs', pos: { linea: 4, columna: 1, longitud: 4 }, mensaje: 'algo ha fallado', pista: 'una pista' };
    panel.diagnostico(d, 1);
    panel.diagnostico(d, 2);
    panel.diagnostico(d, 50);
    const errores = panel.elemento.querySelectorAll('.consola-editor .mensaje.error');
    expect(errores.length).toBe(1);
    expect(errores[0].querySelector('.veces')?.textContent).toBe('×50');
    expect(errores[0].textContent).toContain('variable rapidez = 250'); // enseña la línea de código
    (errores[0] as HTMLElement).click();
    expect(saltos).toEqual([['cuadrado.chs', 4]]);
  });

  it('la pestaña Problemas revisa los scripts sin ejecutar y avisa del número de errores', () => {
    const e = new EstadoEditor(proyectoMinimo);
    const panel = new PanelInferior(e, () => {});
    let errores = -1;
    panel.alCambiarProblemas = (n) => (errores = n);
    expect(panel.revisar()).toBe(0);
    e.cambiarCodigo('cuadrado.chs', 'cuando empieza:\n    mostar("hola")\n');
    expect(panel.revisar()).toBe(1);
    expect(errores).toBe(1);
    expect(panel.elemento.querySelector('.lista-problemas')?.textContent).toContain('mostrar');
  });

  it('la guía busca en toda la documentación', () => {
    const panel = new PanelInferior(new EstadoEditor(), () => {});
    panel.buscarEnGuia('zoom');
    const fichas = [...panel.elemento.querySelectorAll('.ficha-guia .ficha-firma')].map((f) => f.textContent);
    expect(fichas).toContain('escena.camara.zoom');
  });

  it('colores: cualquier color se convierte a #rrggbb para el selector', () => {
    expect(aHex('rojo')).toBe('#e74c3c');
    expect(aHex('#ABC')).toBe('#aabbcc');
    expect(aHex('rgb(255, 0, 16)')).toBe('#ff0010');
    expect(aHex('cualquier cosa')).toBe('#ffffff');
  });
});

// ═════════════════════════ Estado: ajustes nuevos ═════════════════════════

describe('Ajustes del proyecto y de la escena', () => {
  it('tamaño de pantalla con límites razonables, pixel art y cámara', () => {
    const e = new EstadoEditor();
    e.cambiarAjusteProyecto('ancho', 1280);
    e.cambiarAjusteProyecto('alto', 10);
    e.cambiarAjusteProyecto('pixelArt', true);
    expect([e.proyecto.ancho, e.proyecto.alto, e.proyecto.pixelArt]).toEqual([1280, 64, true]);
    e.cambiarEscenaPropiedad('camara.x', 100);
    e.cambiarEscenaPropiedad('camara.seguir', 'Jugador');
    e.cambiarEscenaPropiedad('gravedad', 0);
    expect(e.escena.camara).toEqual({ x: 100, seguir: 'Jugador' });
    expect(e.escena.gravedad).toBe(0);
    e.cambiarEscenaPropiedad('camara.seguir', undefined);
    e.cambiarEscenaPropiedad('gravedad', undefined);
    expect(e.escena.camara).toEqual({ x: 100 });
    expect('gravedad' in e.escena).toBe(false);
    e.deshacer();
    expect(e.escena.gravedad).toBe(0);
  });
});

// ═════════════════════════ Autocompletado y ayuda ═════════════════════════

function sugerencias(proyecto: DefProyecto, texto: string): string[] {
  const estado = EditorState.create({ doc: texto });
  const r = fuenteAutocompletado(() => proyecto)(new CompletionContext(estado, texto.length, true));
  return r && 'options' in r ? r.options.map((o) => o.label) : [];
}

describe('Autocompletado de la Zona de Programación', () => {
  const p: DefProyecto = { ...proyectoVacio(), plantillas: { Bala: {} }, sonidos: { salto: 'x' } };
  it('después de un punto sugiere los miembros del módulo', () => {
    expect(sugerencias(p, 'si teclado.')).toEqual(expect.arrayContaining(['pulsada', 'sePulso']));
    expect(sugerencias(p, 'escena.camara.')).toContain('zoom');
    expect(sugerencias(p, 'yo.')).toEqual(expect.arrayContaining(['x', 'velocidad', 'destruir']));
  });
  it('dentro de un texto sugiere lo que ese sitio espera', () => {
    expect(sugerencias(p, 'crear("')).toEqual(['Bala']);
    expect(sugerencias(p, 'sonido.reproducir("')).toEqual(['salto']);
    expect(sugerencias(p, 'si teclado.pulsada("')).toContain('espacio');
    expect(sugerencias(p, 'yo.color = "')).toContain('rojo');
  });
  it('después de "cuando " sugiere los eventos, y todo sin tildes', () => {
    const eventos = sugerencias(p, 'cuando ');
    expect(eventos).toEqual(expect.arrayContaining(['empieza', 'cada fotograma', 'termina la animacion']));
    const todo = [...eventos, ...sugerencias(p, 'mo'), ...sugerencias(p, 'yo.')];
    expect(todo.filter((s) => /[áéíóú]/i.test(s))).toEqual([]);
  });
  it('sugiere las variables y funciones del propio script', () => {
    expect(sugerencias(p, 'variable puntos = 0\nfuncion saltar(fuerza):\n    pu')).toEqual(expect.arrayContaining(['puntos', 'saltar', 'fuerza']));
  });
  it('la ayuda al pasar el ratón encuentra la ruta completa y el evento de la línea', () => {
    const t = 'si escena.camara.zoom > 1:';
    expect(rutaEn(t, t.indexOf('zoom') + 1)?.ruta).toBe('escena.camara.zoom');
    expect(rutaEn(t, 0)?.ruta).toBe('si');
    expect(eventoDeLinea('cuando dejo de tocar Enemigo:')?.nombre).toBe('cuando dejo de tocar');
    expect(eventoDeLinea('cuando cada 2 segundos:')?.nombre).toBe('cuando cada N segundos');
  });
});

