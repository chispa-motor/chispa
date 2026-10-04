/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CHISPA 1.2, BLOQUE 3: los juegos en el móvil. La palanca y los botones en
 * pantalla, los gestos, la calidad adaptable, el límite de fotogramas y el
 * juego como app instalable. Con toques de verdad en un navegador:
 * pruebas-navegador/moviles.mjs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENCOGE_MINIMO, GESTOS, MAXIMO_BOTONES, MS_LARGO, Tactil, encogeParaAncho, UMBRAL_FLECHA, ZONA_MUERTA, gestoAlLevantar, inclinacion } from '../src/motor/Tactil';
import { AJUSTES_CALIDAD, Calidad, VENTANAS_PARA_SUBIR, VENTANA_CALIDAD, calidad } from '../src/motor/Calidad';
import { Particulas, TIPOS_PARTICULAS } from '../src/objetos/Particulas';
import { ESTILOS_TACTILES, ponerControlesTactiles, teclasDelJuego } from '../src/reproductor/ControlesTactiles';
import { generarPaginaJuego, politicaDeSeguridad } from '../src/exportar/exportar';
import { ARCHIVO_MANIFIESTO, ARCHIVO_SERVICIO, archivosDeApp, colorDeLaApp, huellaCorta, iconoPorDefecto, manifiestoDelEditor, manifiestoDelJuego, servicioDelJuego, servicioSinInternet } from '../src/exportar/pwa';
import { comoInstalar, instalar, prepararApp, queNavegador, sePuedeInstalarConBoton } from '../src/editor/interfaz/instalar';
import { prepararPublicacion } from '../src/exportar/publicar';
import { migrarProyecto, proyectoVacio } from '../src/proyecto/formato';
import { Sonido } from '../src/motor/Sonido';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { juegoDePrueba } from './ayudantes';

/** Una entrada de mentira que apunta las teclas que se «pulsan». */
function teclas() {
  const abajo = new Map<string, string>();
  return {
    abajo,
    pulsadas: () => [...new Set(abajo.values())].sort(),
    pulsarVirtual: (id: string, tecla: string) => void abajo.set(id, tecla),
    soltarVirtual: (id: string) => void abajo.delete(id),
  };
}

/** Un lienzo dentro de una caja de la página, y su módulo táctil. */
function conLienzo() {
  const caja = document.createElement('div');
  const lienzo = document.createElement('canvas');
  caja.append(lienzo);
  document.body.append(caja);
  const e = teclas();
  const t = new Tactil(e, lienzo);
  return { caja, lienzo, e, t, quitar: () => (t.destruir(), caja.remove()) };
}

const dedo = (donde: EventTarget, tipo: string, x = 0, y = 0, id = 1, puntero = 'touch') => {
  const ev = new Event(tipo, { bubbles: true, cancelable: true }) as Event & Record<string, unknown>;
  Object.assign(ev, { pointerType: puntero, pointerId: id, clientX: x, clientY: y, button: 0 });
  donde.dispatchEvent(ev);
};

afterEach(() => {
  calidad.reiniciar();
  document.body.innerHTML = '';
});

describe('La palanca (joystick) y los botones en pantalla', () => {
  it('la inclinación va de -1 a 1, con la Y hacia arriba y una zona muerta en el centro', () => {
    expect(inclinacion(0, 0, 60)).toEqual({ x: 0, y: 0 });
    expect(inclinacion(60 * ZONA_MUERTA * 0.9, 0, 60)).toEqual({ x: 0, y: 0 });
    expect(inclinacion(60, 0, 60)).toEqual({ x: 1, y: -0 });
    expect(inclinacion(0, -30, 60)).toEqual({ x: 0, y: 0.5 });
    // Más lejos que el borde: no pasa de 1
    const lejos = inclinacion(300, 400, 60);
    expect(Math.hypot(lejos.x, lejos.y)).toBeCloseTo(1);
    expect(lejos.y).toBeLessThan(0);
  });

  it('la palanca pulsa las flechas (lo que mira moverConFlechas) y además dice cuánto está inclinada', () => {
    const { t, e, caja, quitar } = conLienzo();
    t.joystick();
    expect(caja.querySelector('.palanca-tactil')).not.toBeNull();
    t.ponerPalanca(0.9, 0);
    expect(e.pulsadas()).toEqual(['derecha']);
    expect(t.x).toBe(0.9);
    // Poco inclinada: se lee, pero no llega a «pulsar» la flecha
    t.ponerPalanca(UMBRAL_FLECHA - 0.1, 0);
    expect(e.pulsadas()).toEqual([]);
    expect(t.x).toBeCloseTo(UMBRAL_FLECHA - 0.1);
    // En diagonal: dos flechas
    t.ponerPalanca(-0.8, 0.8);
    expect(e.pulsadas()).toEqual(['arriba', 'izquierda']);
    t.ponerPalanca(0, 0);
    expect(e.pulsadas()).toEqual([]);
    // Con flechas = falso solo se lee
    t.joystick('derecha', false);
    expect(caja.querySelectorAll('.palanca-tactil').length).toBe(1);
    t.ponerPalanca(1, 0);
    expect(e.pulsadas()).toEqual([]);
    expect(t.x).toBe(1);
    quitar();
  });

  it('en un juego: la palanca mueve con moverConFlechas, y poco inclinada va despacio', () => {
    const j = juegoDePrueba({ scripts: { 'j.chs': 'cuando empieza:\n    tactil.joystick()\ncuando cada fotograma:\n    yo.moverConFlechas(300)' }, gravedad: 0, escena: [{ nombre: 'J', x: 100, y: 100, sprite: { ancho: 20, alto: 20 }, script: 'j.chs' }] });
    j.avanzar(2);
    const o = j.buscar('J')!;
    j.entrada.tactil.ponerPalanca(1, 0);
    j.avanzar(60);
    const rapido = o.posicion.x - 100;
    expect(rapido).toBeGreaterThan(280);
    j.entrada.tactil.ponerPalanca(0.5, 0);
    const antes = o.posicion.x;
    j.avanzar(60);
    expect(o.posicion.x - antes).toBeGreaterThan(rapido * 0.4);
    expect(o.posicion.x - antes).toBeLessThan(rapido * 0.6);
    j.entrada.tactil.ponerPalanca(0, 0);
    const quieto = o.posicion.x;
    j.avanzar(10);
    expect(o.posicion.x).toBe(quieto);
    expect(j.errores).toEqual([]);
  });

  it('un botón pulsa su tecla: «cuando se pulsa "espacio"» salta igual que con el teclado', () => {
    const j = juegoDePrueba({ scripts: { 'j.chs': 'cuando empieza:\n    tactil.boton("Saltar", "espacio")\n    tactil.boton("Fuego")\ncuando se pulsa "espacio":\n    mostrar("salto")\ncuando cada fotograma:\n    si tactil.sePulso("Fuego"):\n        mostrar("pum")\n    si tactil.seSolto("Fuego"):\n        mostrar("fin")\n    si tactil.pulsado("Fuego"):\n        juego.cargando += 1' }, datos: { cargando: 0 }, escena: [{ nombre: 'J', script: 'j.chs' }] });
    j.avanzar(1);
    const t = j.entrada.tactil;
    expect(t.nombres).toEqual(['Saltar', 'Fuego']);
    t.pulsar('Saltar', true);
    j.avanzar(1);
    t.pulsar('Saltar', false);
    j.avanzar(2);
    expect(j.salida).toEqual(['salto']);
    t.pulsar('fuego', true);
    j.avanzar(3);
    t.pulsar('fuego', false);
    j.avanzar(2);
    expect(j.salida).toEqual(['salto', 'pum', 'fin']);
    expect(j.juego.datoDelJuego('cargando')).toBe(3);
    expect(j.errores).toEqual([]);
  });

  it('con los dedos de verdad: tocar un botón lo pulsa, y se pueden tocar dos a la vez', () => {
    const { t, e, caja, quitar } = conLienzo();
    t.boton('Saltar', ['espacio']);
    t.boton('Fuego', ['x']);
    const [saltar, fuego] = [...caja.querySelectorAll<HTMLElement>('.boton-tactil')];
    expect(saltar.textContent).toBe('Saltar');
    dedo(saltar, 'pointerdown', 0, 0, 1);
    dedo(fuego, 'pointerdown', 0, 0, 2);
    expect(e.pulsadas()).toEqual(['espacio', 'x']);
    expect(saltar.classList.contains('pulsado')).toBe(true);
    dedo(saltar, 'pointerup', 0, 0, 1);
    expect(e.pulsadas()).toEqual(['x']);
    dedo(fuego, 'pointercancel', 0, 0, 2);
    expect(e.pulsadas()).toEqual([]);
    quitar();
  });

  it(`caben ${MAXIMO_BOTONES} botones; poner otra vez uno con el mismo nombre lo cambia, no lo repite`, () => {
    const { t, caja, quitar } = conLienzo();
    for (let i = 0; i < MAXIMO_BOTONES; i++) expect(t.boton(`B${i}`)).toBe(true);
    expect(t.boton('Otro')).toBe(false);
    expect(t.boton('B0', ['espacio'])).toBe(true);
    expect(caja.querySelectorAll('.boton-tactil').length).toBe(MAXIMO_BOTONES);
    t.quitar('B0');
    expect(t.existe('B0')).toBe(false);
    t.quitar();
    expect(caja.querySelectorAll('.boton-tactil, .palanca-tactil').length).toBe(0);
    quitar();
  });

  it('mover pone un control en un tanto por ciento de la pantalla', () => {
    const { t, caja, quitar } = conLienzo();
    t.joystick();
    t.boton('Saltar', ['espacio']);
    expect(t.mover('Saltar', 85, 20)).toBe(true);
    const b = caja.querySelector<HTMLElement>('.boton-tactil')!;
    expect(b.style.getPropertyValue('--x')).toContain('85');
    expect(b.style.getPropertyValue('--y')).toContain('20');
    expect(t.mover('joystick', 10, 30)).toBe(true);
    expect(t.mover('NoExiste', 1, 1)).toBe(false);
    quitar();
  });
});

describe('Solo salen cuando tocan (móvil o PC)', () => {
  it('con el teclado se esconden; al tocar la pantalla, salen; "siempre" y "nunca" mandan', () => {
    const { t, caja, quitar } = conLienzo();
    t.boton('Saltar', ['espacio']);
    const capa = caja.querySelector<HTMLElement>('.controles-tactiles')!;
    // En las pruebas el aparato no es táctil: escondidos
    expect(t.visibles).toBe(false);
    expect(capa.hidden).toBe(true);
    expect(t.hay).toBe(false);
    // Alguien toca la pantalla (un ordenador con pantalla táctil): salen
    dedo(window, 'pointerdown');
    expect(t.visibles).toBe(true);
    expect(capa.hidden).toBe(false);
    expect(t.hay).toBe(true);
    // Coge el teclado: se esconden y se suelta lo que estuviera pulsado
    t.pulsar('Saltar', true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(t.visibles).toBe(false);
    expect(t.pulsado('Saltar')).toBe(false);
    // Un toque con el ratón no cuenta como dedo
    dedo(window, 'pointerdown', 0, 0, 1, 'mouse');
    expect(t.visibles).toBe(false);
    t.mostrar = 'siempre';
    expect(capa.hidden).toBe(false);
    t.mostrar = 'nunca';
    dedo(window, 'pointerdown');
    expect(capa.classList.contains('sin-controles')).toBe(true);
    quitar();
  });

  it('los botones que pone Chispa solo (por las teclas del juego) se quitan si el juego pone los suyos', () => {
    const proyecto = migrarProyecto({ ...proyectoVacio('x'), scripts: { 'j.chs': 'cuando cada fotograma:\n    yo.moverConFlechas(300)\ncuando se pulsa "espacio":\n    yo.saltar(600)\n' } });
    expect(teclasDelJuego(proyecto).acciones).toEqual(['espacio']);
    const j = juegoDePrueba({ scripts: proyecto.scripts, escena: [{ nombre: 'J', script: 'j.chs' }] });
    const t = j.entrada.tactil;
    expect(ponerControlesTactiles(j.entrada, proyecto)).toBe(5);
    expect(t.nombres.sort()).toEqual(['abajo', 'arriba', 'derecha', 'espacio', 'izquierda']);
    expect(t.conControlesPropios).toBe(false);
    // El botón automático pulsa su tecla
    t.pulsar('derecha', true);
    expect(j.entrada.estaPulsada('derecha')).toBe(true);
    t.pulsar('derecha', false);
    // El juego pone una palanca: los automáticos sobran
    t.joystick();
    expect(t.nombres).toEqual([]);
    expect(t.conControlesPropios).toBe(true);
    // ... y ya no se vuelven a poner
    expect(ponerControlesTactiles(j.entrada, proyecto)).toBe(0);
  });
});

describe('Gestos y arrastrar para mirar', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it('qué gesto es al levantar el dedo', () => {
    expect(gestoAlLevantar(0, 0, 100)).toBe('toque');
    expect(gestoAlLevantar(3, -4, 100)).toBe('toque');
    expect(gestoAlLevantar(0, 0, 900)).toBe('');
    expect(gestoAlLevantar(80, 10, 200)).toBe('derecha');
    expect(gestoAlLevantar(-80, 10, 200)).toBe('izquierda');
    // (en la ventana la Y crece hacia abajo: mover el dedo hacia arriba es dy negativo)
    expect(gestoAlLevantar(5, -90, 200)).toBe('arriba');
    expect(gestoAlLevantar(5, 90, 200)).toBe('abajo');
    expect(gestoAlLevantar(20, 20, 200)).toBe('');
    expect(GESTOS).toEqual(['toque', 'doble', 'largo', 'arriba', 'abajo', 'izquierda', 'derecha']);
  });

  it('toque, dos toques, dedo quieto y deslizar: cada gesto dura un fotograma', () => {
    const { t, lienzo, quitar } = conLienzo();
    dedo(lienzo, 'pointerdown', 100, 100);
    vi.advanceTimersByTime(80);
    dedo(window, 'pointerup', 100, 100);
    expect(t.gesto).toBe('toque');
    t.finDeFotograma();
    expect(t.gesto).toBe('');
    // Otro toque enseguida: doble
    vi.advanceTimersByTime(100);
    dedo(lienzo, 'pointerdown', 102, 99);
    vi.advanceTimersByTime(60);
    dedo(window, 'pointerup', 102, 99);
    expect(t.gesto).toBe('doble');
    t.finDeFotograma();
    // Dedo quieto
    vi.advanceTimersByTime(1000);
    dedo(lienzo, 'pointerdown', 50, 50);
    vi.advanceTimersByTime(MS_LARGO + 20);
    expect(t.gesto).toBe('largo');
    t.finDeFotograma();
    dedo(window, 'pointerup', 50, 50);
    expect(t.gesto).toBe(''); // al levantarlo no cuenta además como toque
    // Deslizar hacia arriba
    dedo(lienzo, 'pointerdown', 200, 300);
    dedo(window, 'pointermove', 205, 220);
    vi.advanceTimersByTime(120);
    dedo(window, 'pointerup', 205, 200);
    expect(t.gesto).toBe('arriba');
    // El ratón no hace gestos
    t.finDeFotograma();
    dedo(lienzo, 'pointerdown', 10, 10, 1, 'mouse');
    dedo(window, 'pointerup', 10, 10, 1, 'mouse');
    expect(t.gesto).toBe('');
    quitar();
  });

  it('pellizcar con dos dedos, cuántos dedos hay y dónde están', () => {
    const { t, lienzo, quitar } = conLienzo();
    dedo(lienzo, 'pointerdown', 100, 100, 1);
    dedo(lienzo, 'pointerdown', 200, 100, 2);
    expect(t.toques.length).toBe(2);
    dedo(window, 'pointermove', 50, 100, 1);
    dedo(window, 'pointermove', 250, 100, 2);
    expect(t.pellizco).toBeCloseTo(2);
    t.finDeFotograma();
    expect(t.pellizco).toBe(1);
    expect(t.toques).toEqual([{ x: 50, y: 100 }, { x: 250, y: 100 }]);
    dedo(window, 'pointerup', 0, 0, 1);
    dedo(window, 'pointerup', 0, 0, 2);
    expect(t.toques).toEqual([]);
    // Dos dedos no son un toque
    expect(t.gesto).toBe('');
    quitar();
  });

  it('arrastrar para mirar: lo que se mueve el dedo en cada fotograma, con la Y hacia arriba; apagado, nada', () => {
    const { t, lienzo, quitar } = conLienzo();
    t.escalaJuego = () => 2; // el juego se ve a la mitad de su tamaño: un píxel de la ventana son dos del juego
    dedo(lienzo, 'pointerdown', 100, 100);
    dedo(window, 'pointermove', 110, 95);
    expect([t.miraX, t.miraY]).toEqual([0, 0]);
    t.mirar();
    dedo(window, 'pointermove', 120, 85);
    dedo(window, 'pointermove', 125, 85);
    expect([t.miraX, t.miraY]).toEqual([30, 20]);
    t.finDeFotograma();
    expect([t.miraX, t.miraY]).toEqual([0, 0]);
    dedo(window, 'pointerup', 125, 85);
    t.mirar(false);
    quitar();
  });
});

describe('Que quien juega coloque los controles a su gusto', () => {
  it('en el modo colocar se arrastran (sin pulsarse), se guarda dónde quedan y se recuerda la próxima vez', () => {
    let guardado: string | null = null;
    const almacen = { leer: () => guardado, guardar: (texto: string) => void (guardado = texto) };
    const uno = conLienzo();
    uno.t.almacen = almacen;
    uno.t.joystick();
    uno.t.boton('Saltar', ['espacio']);
    uno.t.colocar();
    const capa = uno.caja.querySelector<HTMLElement>('.controles-tactiles')!;
    expect(capa.classList.contains('colocando')).toBe(true);
    expect(capa.querySelector('.barra-colocar')!.textContent).toContain('Arrastra');
    // Arrastrar el botón no pulsa su tecla
    const boton = capa.querySelector<HTMLElement>('.boton-tactil')!;
    capa.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200, right: 400, bottom: 200, x: 0, y: 0, toJSON: () => ({}) });
    dedo(boton, 'pointerdown', 300, 150);
    dedo(boton, 'pointermove', 100, 50);
    dedo(boton, 'pointerup', 100, 50);
    expect(uno.e.pulsadas()).toEqual([]);
    expect(uno.t.colocadoEn('Saltar')).toEqual({ x: 0.25, y: 0.75 });
    expect(JSON.parse(guardado!)).toEqual({ saltar: { x: 0.25, y: 0.75 } });
    // «Listo» cierra el modo colocar
    [...capa.querySelectorAll<HTMLButtonElement>('.barra-colocar button')].find((b) => b.textContent === 'Listo')!.click();
    expect(uno.t.colocandoAhora).toBe(false);
    uno.quitar();
    // Otra partida: el botón sale donde se dejó, aunque el juego diga otro sitio
    const dos = conLienzo();
    dos.t.almacen = almacen;
    dos.t.boton('Saltar', ['espacio']);
    dos.t.mover('Saltar', 90, 10);
    expect(dos.caja.querySelector<HTMLElement>('.boton-tactil')!.style.getPropertyValue('--x')).toContain('25');
    // «Como estaban» lo olvida
    dos.t.colocar();
    [...dos.caja.querySelectorAll<HTMLButtonElement>('.barra-colocar button')].find((b) => b.textContent === 'Como estaban')!.click();
    expect(dos.t.colocadoEn('Saltar')).toBeNull();
    expect(dos.caja.querySelector<HTMLElement>('.boton-tactil')!.style.getPropertyValue('--x')).toContain('90');
    expect(guardado).toBe('{}');
    dos.quitar();
  });

  it('lo guardado se lee con cuidado: solo sitios de 0 a 1, y nada raro', () => {
    const { t, quitar } = conLienzo();
    t.almacen = { leer: () => '{"saltar":{"x":0.5,"y":0.5},"malo":{"x":5,"y":0},"texto":"hola","__proto__":{"x":0.1,"y":0.1},"otro":{"x":"0.2","y":0.2}}', guardar: () => {} };
    t.leerColocados();
    expect(t.colocadoEn('saltar')).toEqual({ x: 0.5, y: 0.5 });
    expect(t.colocadoEn('malo')).toBeNull();
    expect(t.colocadoEn('texto')).toBeNull();
    expect(t.colocadoEn('otro')).toBeNull();
    expect(t.colocadoEn('toString')).toBeNull();
    t.almacen = { leer: () => 'esto no es json', guardar: () => {} };
    expect(() => t.leerColocados()).not.toThrow();
    quitar();
  });
});

describe('Aviso de «gira el móvil» y vibración', () => {
  it('si el juego pide horizontal y el aparato táctil está de pie, sale el aviso; en un ordenador, nunca', () => {
    const ancho = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(400);
    const alto = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    const { t, caja, quitar } = conLienzo();
    t.orientacion = 'horizontal';
    // Con teclado y ratón no se avisa (un ordenador no se gira)
    expect(t.malGirado).toBe(false);
    expect(caja.querySelector('.aviso-girar')).toBeNull();
    // Con el dedo, sí
    t.usandoDedo(true);
    expect(t.malGirado).toBe(true);
    expect(caja.querySelector('.aviso-girar')!.textContent).toContain('tumbado');
    expect(caja.querySelector<HTMLElement>('.controles-tactiles')!.hidden).toBe(false);
    // Se gira: se quita
    ancho.mockReturnValue(800);
    alto.mockReturnValue(400);
    window.dispatchEvent(new Event('resize'));
    expect(caja.querySelector('.aviso-girar')).toBeNull();
    // Al revés: un juego de pie con el móvil tumbado
    t.orientacion = 'vertical';
    expect(caja.querySelector('.aviso-girar')!.textContent).toContain('de pie');
    t.orientacion = 'cualquiera';
    expect(caja.querySelector('.aviso-girar')).toBeNull();
    quitar();
    vi.restoreAllMocks();
  });

  it('vibrar llama al aparato si sabe (en milisegundos, 5 segundos como mucho) y no falla si no sabe', () => {
    const { t, quitar } = conLienzo();
    expect(t.vibrar(0.2)).toBe(false);
    const vibrado: number[] = [];
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (ms: number) => (vibrado.push(ms), true) });
    expect(t.vibrar(0.2)).toBe(true);
    t.vibrar(99);
    expect(vibrado).toEqual([200, 5000]);
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined });
    quitar();
  });
});

describe('Los comandos de tactil: errores claros', () => {
  const error = (codigo: string): string => {
    const j = juegoDePrueba({ scripts: { 'j.chs': codigo }, escena: [{ nombre: 'J', script: 'j.chs' }] });
    j.avanzar(2);
    return j.errores[0]?.error.message ?? '';
  };
  const pista = (codigo: string): string => {
    const j = juegoDePrueba({ scripts: { 'j.chs': codigo }, escena: [{ nombre: 'J', script: 'j.chs' }] });
    j.avanzar(2);
    return j.errores[0]?.error.pista ?? '';
  };

  it('cada error dice qué pasa y cómo se arregla', () => {
    expect(error('cuando empieza:\n    tactil.joystick("abajo")')).toMatch(/"izquierda" o a la "derecha"/);
    expect(error('cuando empieza:\n    tactil.boton()')).toMatch(/le falta el nombre del botón/);
    expect(error('cuando empieza:\n    tactil.boton("Un nombre larguísimo")')).toMatch(/12 letras como mucho/);
    expect(error('cuando empieza:\n    tactil.boton("Saltar", "espasio")')).toMatch(/no puede pulsar la tecla "espasio"/);
    expect(pista('cuando empieza:\n    tactil.boton("Saltar", "espasio")')).toMatch(/"espacio"/);
    expect(error('cuando empieza:\n    tactil.boton("joystick")')).toMatch(/ese nombre es de la palanca/);
    expect(error('cuando empieza:\n    tactil.boton("Saltar")\n    mostrar(tactil.pulsado("Salta"))')).toMatch(/no hay ningún botón en pantalla llamado "Salta"/);
    expect(pista('cuando empieza:\n    tactil.boton("Saltar")\n    mostrar(tactil.pulsado("Salta"))')).toMatch(/¿Querías decir "Saltar"\?/);
    expect(pista('cuando empieza:\n    mostrar(tactil.pulsado("Fuego"))')).toMatch(/tactil\.boton\("Saltar", "espacio"\)/);
    expect(error('cuando empieza:\n    tactil.mover("joystick", 10, 10)')).toMatch(/no hay ninguno puesto/);
    expect(error('cuando empieza:\n    tactil.boton("A")\n    tactil.mover("A", 800, 400)')).toMatch(/va de 0 a 100/);
    expect(error('cuando empieza:\n    tactil.boton("A")\n    tactil.mover("A")')).toMatch(/necesita el nombre del control y dónde va/);
    expect(error('cuando empieza:\n    tactil.mostrar = "aveces"')).toMatch(/"auto".*"siempre" o "nunca"/);
    expect(error('cuando empieza:\n    tactil.tamano = 9')).toMatch(/va de 0.5 \(la mitad\) a 2/);
    expect(error('cuando empieza:\n    tactil.opacidad = 0')).toMatch(/va de 0.1/);
    expect(error('cuando empieza:\n    tactil.vibrar(60)')).toMatch(/de 0 a 5 segundos/);
    expect(error('cuando empieza:\n    pantalla.calidad = "bajo"')).toMatch(/"auto".*"alta", "media" o "baja"/);
    expect(pista('cuando empieza:\n    pantalla.calidad = "bajo"')).toMatch(/"baja"/);
    expect(error('cuando empieza:\n    pantalla.maximoFps = 5')).toMatch(/va de 15 a 240/);
    expect(error('cuando empieza:\n    pantalla.orientacion = "tumbado"')).toMatch(/"horizontal".*"vertical".*"cualquiera"/);
  });

  it(`poner botones sin parar (en cada fotograma) no llena la pantalla: da un error que lo explica`, () => {
    const j = juegoDePrueba({ scripts: { 'j.chs': 'variable n = 0\ncuando cada fotograma:\n    n += 1\n    tactil.boton("B" + texto(n))' }, escena: [{ nombre: 'J', script: 'j.chs' }] });
    j.avanzar(40);
    expect(j.entrada.tactil.nombres.length).toBe(MAXIMO_BOTONES);
    expect(j.errores[0].error.message).toMatch(/caben 12 botones como mucho/);
    expect(j.errores[0].error.pista).toMatch(/cuando empieza/);
  });

  it('lo que solo se lee no se puede cambiar, y los gestos y los dedos se leen desde el juego', () => {
    expect(error('cuando empieza:\n    tactil.x = 1')).not.toBe('');
    expect(error('cuando empieza:\n    tactil.gesto = "toque"')).not.toBe('');
    const j = juegoDePrueba({ scripts: { 'j.chs': 'cuando cada fotograma:\n    si tactil.gesto != "":\n        mostrar(tactil.gesto)\n    juego.dedos = tactil.dedos\n    juego.zoom = juego.zoom * tactil.pellizco' }, datos: { dedos: 0, zoom: 1 }, escena: [{ nombre: 'J', script: 'j.chs' }] });
    j.avanzar(1);
    j.entrada.tactil.hacerGesto('arriba');
    j.avanzar(1);
    j.entrada.tactil.hacerGesto('doble');
    j.avanzar(2);
    expect(j.salida).toEqual(['arriba', 'doble']);
    expect(j.errores).toEqual([]);
  });
});

describe('Calidad adaptable y límite de fotogramas', () => {
  /** Hace pasar `segundos` de juego a `fps` fotogramas por segundo. */
  const jugar = (c: Calidad, fps: number, segundos: number) => {
    for (let i = 0; i < Math.round(fps * segundos); i++) c.medir(1 / fps);
  };

  it('cada nivel gasta menos que el anterior', () => {
    const { alta, media, baja } = AJUSTES_CALIDAD;
    expect(alta.resolucion).toBeGreaterThan(media.resolucion);
    expect(media.resolucion).toBeGreaterThan(baja.resolucion);
    expect(alta.particulas).toBe(1);
    expect(media.particulas).toBeGreaterThan(baja.particulas);
    expect(baja.sombrasDeLuz || baja.filtrosCaros).toBe(false);
  });

  it('en automático: si va a trompicones baja, y si va sobrado un buen rato vuelve a subir', () => {
    const c = new Calidad();
    const cambios: string[] = [];
    c.alCambiar = (n) => cambios.push(n);
    c.modo = 'auto';
    expect(c.nivel).toBe('alta');
    // Va a 30 cuando debería ir a 60: baja a media y, si sigue igual, a baja
    jugar(c, 30, VENTANA_CALIDAD + 0.1);
    expect(c.nivel).toBe('media');
    jugar(c, 30, VENTANA_CALIDAD + 0.1);
    expect(c.nivel).toBe('baja');
    // En baja ya no puede bajar más
    jugar(c, 20, VENTANA_CALIDAD * 3);
    expect(c.nivel).toBe('baja');
    // Va a 60 clavados un buen rato: sube un nivel (no enseguida)
    jugar(c, 60, VENTANA_CALIDAD * (VENTANAS_PARA_SUBIR - 1) + 0.1);
    expect(c.nivel).toBe('baja');
    jugar(c, 60, VENTANA_CALIDAD * 2);
    expect(c.nivel).toBe('media');
    expect(cambios).toEqual(['media', 'baja', 'media']);
  });

  it('si al subir vuelve a ir mal, a ese nivel ya no se sube (no se está cambiando todo el rato)', () => {
    const c = new Calidad();
    c.modo = 'auto';
    jugar(c, 30, VENTANA_CALIDAD + 0.1);
    expect(c.nivel).toBe('media');
    // En media va bien; sube a alta, va mal y vuelve a media
    jugar(c, 60, VENTANA_CALIDAD * (VENTANAS_PARA_SUBIR + 1));
    expect(c.nivel).toBe('alta');
    jugar(c, 30, VENTANA_CALIDAD + 0.1);
    expect(c.nivel).toBe('media');
    // Aunque luego vaya sobrado mucho rato, se queda en media
    jugar(c, 60, VENTANA_CALIDAD * VENTANAS_PARA_SUBIR * 4);
    expect(c.nivel).toBe('media');
  });

  it('un parón (cambiar de pestaña) no cuenta como ir lento; con calidad fija no se mide nada', () => {
    const c = new Calidad();
    c.modo = 'auto';
    for (let i = 0; i < 20; i++) c.medir(2);
    expect(c.nivel).toBe('alta');
    c.modo = 'baja';
    jugar(c, 60, 30);
    expect(c.nivel).toBe('baja');
    c.modo = 'alta';
    jugar(c, 10, 30);
    expect(c.nivel).toBe('alta');
  });

  it('el límite de 30 fotogramas: en una pantalla de 60 se pinta uno de cada dos, y la calidad automática cuenta con ello', () => {
    const c = new Calidad();
    c.maximoFps = 30;
    // Los fotogramas del navegador llegan cada 16,7 ms: el primero se salta, el segundo se pinta
    expect(c.saltar(16.7)).toBe(true);
    expect(c.saltar(33.3)).toBe(false);
    // En una pantalla de 90: se pinta al tercero
    expect(c.saltar(11.1)).toBe(true);
    expect(c.saltar(22.2)).toBe(true);
    expect(c.saltar(33.3)).toBe(false);
    // Sin límite no se salta nada
    c.maximoFps = 0;
    expect(c.saltar(1)).toBe(false);
    // Con límite de 30, ir a 30 es ir bien: no se baja la calidad
    c.maximoFps = 30;
    c.modo = 'auto';
    jugar(c, 30, VENTANA_CALIDAD * 4);
    expect(c.nivel).toBe('alta');
    jugar(c, 18, VENTANA_CALIDAD + 0.2);
    expect(c.nivel).toBe('media');
  });

  it('con menos calidad salen menos partículas (pero una explosión sigue teniendo chispas)', () => {
    const lanzar = () => {
      const s = new Particulas();
      s.emitir(TIPOS_PARTICULAS.explosion, 0, 0);
      return s.cantidad;
    };
    calidad.modo = 'alta';
    const todas = lanzar();
    calidad.modo = 'media';
    const medias = lanzar();
    calidad.modo = 'baja';
    const pocas = lanzar();
    expect(todas).toBe(TIPOS_PARTICULAS.explosion.cantidad);
    expect(medias).toBe(Math.round(todas * AJUSTES_CALIDAD.media.particulas));
    expect(pocas).toBe(Math.round(todas * AJUSTES_CALIDAD.baja.particulas));
    expect(pocas).toBeGreaterThan(5);
    // Una partícula suelta se lanza siempre
    const s = new Particulas();
    s.emitir(TIPOS_PARTICULAS.explosion, 0, 0, 1);
    expect(s.cantidad).toBe(1);
  });

  it('desde el juego y desde el proyecto: pantalla.calidad, pantalla.maximoFps y el inspector', () => {
    const j = juegoDePrueba({ scripts: { 'j.chs': 'cuando empieza:\n    mostrar(pantalla.calidad, pantalla.nivelCalidad, pantalla.maximoFps, pantalla.orientacion)\n    pantalla.calidad = "baja"\n    pantalla.maximoFps = 30\n    pantalla.orientacion = "horizontal"\n    mostrar(pantalla.calidad, pantalla.nivelCalidad, pantalla.maximoFps, pantalla.orientacion)' }, escena: [{ nombre: 'J', script: 'j.chs' }] });
    j.avanzar(1);
    expect(j.errores).toEqual([]);
    // Si el proyecto no dice nada: calidad automática (empieza en alta), sin límite y de cualquier manera
    expect(j.salida).toEqual(['auto alta 0 cualquiera', 'baja baja 30 horizontal']);
    expect(calidad.ajustes.sombrasDeLuz).toBe(false);
    // En el proyecto solo se apunta lo que se cambia
    const e = new EstadoEditor();
    e.cambiarAjusteMovil('calidad', 'media');
    e.cambiarAjusteMovil('maximoFps', 30);
    e.cambiarAjusteMovil('orientacion', 'vertical');
    expect([e.proyecto.calidad, e.proyecto.maximoFps, e.proyecto.orientacion]).toEqual(['media', 30, 'vertical']);
    const guardado = migrarProyecto(JSON.parse(e.aJSON()));
    expect([guardado.calidad, guardado.maximoFps, guardado.orientacion]).toEqual(['media', 30, 'vertical']);
    e.cambiarAjusteMovil('calidad', 'auto');
    e.cambiarAjusteMovil('maximoFps', 0);
    e.cambiarAjusteMovil('orientacion', '');
    expect('calidad' in e.proyecto || 'maximoFps' in e.proyecto || 'orientacion' in e.proyecto).toBe(false);
    // Y un archivo con valores inventados no se abre
    for (const malo of [{ calidad: 'ultra' }, { maximoFps: 1000 }, { orientacion: 'diagonal' }]) {
      expect(() => migrarProyecto({ ...JSON.parse(JSON.stringify(proyectoVacio('x'))), ...malo }), JSON.stringify(malo)).toThrow(/por seguridad no se abre/);
    }
  });
});

describe('El juego como app del móvil (PWA)', () => {
  const proyecto = () => migrarProyecto({ ...proyectoVacio('Mi juego <genial> & "raro"'), orientacion: 'horizontal' });
  const REPRODUCTOR = 'console.log("reproductor")';

  it('la ficha de la app: nombre, colores, iconos, pantalla completa y cómo se sujeta el móvil', () => {
    const m = JSON.parse(manifiestoDelJuego(proyecto()));
    expect(m.name).toBe('Mi juego <genial> & "raro"');
    expect([...m.short_name].length).toBeLessThanOrEqual(12);
    expect(m.start_url).toBe('./');
    expect(m.scope).toBe('./');
    expect(m.display).toBe('fullscreen');
    expect(m.orientation).toBe('landscape');
    expect(m.icons.map((i: { src: string; sizes: string }) => `${i.src} ${i.sizes}`)).toEqual(['icono-192.png 192x192', 'icono-512.png 512x512']);
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(JSON.parse(manifiestoDelJuego(migrarProyecto(proyectoVacio('x')))).orientation).toBe('any');
    expect(JSON.parse(manifiestoDelJuego(migrarProyecto({ ...proyectoVacio('x'), orientacion: 'vertical' }))).orientation).toBe('portrait');
    // El color sale del fondo de la escena, y si no es un color normal, el de Chispa
    expect(colorDeLaApp(proyecto())).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('el zip para el móvil lleva la página, la ficha, el service worker y los dos iconos', () => {
    const p = prepararPublicacion(proyecto(), REPRODUCTOR, 'movil');
    expect(p.descarga.nombre).toBe('mi-juego-genial-raro-movil.zip');
    expect(p.descarga.tipo).toBe('application/zip');
    const zip = new TextDecoder('latin1').decode(p.descarga.contenido as Uint8Array);
    for (const archivo of ['index.html', ARCHIVO_MANIFIESTO, ARCHIVO_SERVICIO, 'icono-192.png', 'icono-512.png']) expect(zip, archivo).toContain(archivo);
    expect(p.pasos.join(' ')).toMatch(/Instalar aplicación/);
    expect(p.pasos.join(' ')).toMatch(/Añadir a pantalla de inicio/);
    expect(p.pasos.join(' ')).toMatch(/sin internet/);
  });

  it('el icono por defecto es un PNG de verdad, del tamaño pedido', () => {
    const png = iconoPorDefecto(192);
    expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const v = new DataView(png.buffer, png.byteOffset);
    expect([v.getUint32(16), v.getUint32(20)]).toEqual([192, 192]);
  });

  it('la página de la app enlaza su ficha y su icono; la página normal (un solo archivo), no', () => {
    const app = generarPaginaJuego(proyecto(), REPRODUCTOR, true);
    expect(app).toContain('<link rel="manifest" href="manifest.webmanifest">');
    expect(app).toContain('<link rel="apple-touch-icon" href="icono-192.png">');
    const normal = generarPaginaJuego(proyecto(), REPRODUCTOR);
    expect(normal).not.toContain('rel="manifest"');
    // Las dos: zona segura (notch), sin acercar la página con los dedos, y pensadas para la pantalla de inicio del iPhone
    for (const pagina of [app, normal]) {
      expect(pagina).toContain('viewport-fit=cover');
      expect(pagina).toContain('env(safe-area-inset-top)');
      expect(pagina).toContain('touch-action:none');
      expect(pagina).toContain('apple-mobile-web-app-capable');
      expect(pagina).toContain('name="theme-color"');
    }
  });

  it('el service worker cambia de versión cuando cambia el juego, y solo guarda la lista de archivos del juego', () => {
    const a = archivosDeApp(proyecto(), 'pagina uno');
    const b = archivosDeApp(proyecto(), 'pagina dos');
    const sw = (lista: typeof a) => String(lista.find((x) => x.nombre === ARCHIVO_SERVICIO)!.contenido);
    expect(sw(a)).not.toBe(sw(b));
    expect(sw(a)).toBe(sw(archivosDeApp(proyecto(), 'pagina uno')));
    expect(sw(a)).toContain('["./","./index.html","./manifest.webmanifest","./icono-192.png","./icono-512.png"]');
    expect(huellaCorta('a', 'b')).not.toBe(huellaCorta('ab', ''));
    expect(huellaCorta('a')).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('El sonido en el móvil', () => {
  it('despertar el audio no falla sin audio (pruebas) ni si ya está sonando', () => {
    const s = new Sonido();
    expect(() => s.despertar()).not.toThrow();
  });
});

describe('El editor como app (instalar y usar sin internet)', () => {
  it('su ficha es la de una app normal, con todo dentro de su carpeta', () => {
    const m = JSON.parse(manifiestoDelEditor());
    expect(m.short_name).toBe('Chispa');
    expect(m.start_url).toBe('./');
    expect(m.scope).toBe('./');
    expect(m.display).toBe('standalone');
    expect(m.orientation).toBe('any');
    expect(m.icons.map((i: { src: string }) => i.src)).toEqual(['icono-192.png', 'icono-512.png']);
  });

  it('su service worker espera a que se cierre la versión vieja; el de un juego, no', () => {
    const editor = servicioSinInternet({ version: 'abc', archivos: ['index.html', 'assets/a.js'], prefijo: 'chispa-editor', enSeguida: false });
    expect(editor).not.toContain('skipWaiting');
    expect(editor).toContain("'chispa-editor:'");
    expect(editor).toContain('["./","./index.html","./assets/a.js"]');
    expect(servicioDelJuego('abc', ['index.html'])).toContain('skipWaiting');
    expect(servicioDelJuego('abc', ['index.html'])).toContain("'chispa-juego:'");
    expect(() => servicioSinInternet({ version: 'abc', archivos: [], prefijo: "x'+alert(1)+'", enSeguida: true })).toThrow();
  });

  it('una versión rara no puede colar código en el service worker', () => {
    const sw = servicioSinInternet({ version: '*/ alert(1) /*"\n', archivos: ['a"b.js'], prefijo: 'chispa-editor', enSeguida: false });
    expect(sw.split('\n')[0]).not.toContain('alert(1) /*');
    expect(sw.split('\n')[0].match(/\*\//g)).toHaveLength(1);
    expect(() => new Function('self', 'caches', sw)).not.toThrow();
    expect(sw).toContain('"./a\\"b.js"');
  });

  it('explica cómo instalar en cada aparato', () => {
    expect(queNavegador('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe('safari-movil');
    expect(queNavegador('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('safari-movil');
    expect(queNavegador('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('otro');
    expect(queNavegador('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5)).toBe('android');
    expect(comoInstalar('safari-movil')).toContain('Añadir a pantalla de inicio');
    expect(comoInstalar('android')).toContain('Instalar app');
    expect(comoInstalar('otro')).toContain('barra de direcciones');
  });

  it('sin aviso del navegador no hay botón de instalar; con él, sí, y se gasta al usarlo', async () => {
    prepararApp(false);
    expect(sePuedeInstalarConBoton()).toBe(false);
    expect(await instalar()).toBe(false);
    const aviso = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: vi.fn(async () => ({})) });
    window.dispatchEvent(aviso);
    expect(aviso.defaultPrevented).toBe(true);
    expect(sePuedeInstalarConBoton()).toBe(true);
    expect(await instalar()).toBe(true);
    expect(aviso.prompt).toHaveBeenCalledTimes(1);
    expect(sePuedeInstalarConBoton()).toBe(false);
  });
});

// (La política de seguridad de la app y lo que el service worker NO hace están en seguridad.test.ts)
void politicaDeSeguridad;
void servicioDelJuego;

describe('Mandos y controles de pantalla', () => {
  it('al usar un mando se esconden los controles de la pantalla; al tocarla, vuelven', () => {
    const j = juegoDePrueba({ scripts: { 'j.chs': 'cuando empieza:\n    tactil.joystick()\n    tactil.boton("Saltar", "espacio")\n' }, escena: [{ nombre: 'J', script: 'j.chs' }] });
    j.avanzar(2);
    const motor = { entrada: j.entrada };
    const t = motor.entrada.tactil;
    t.usandoDedo(true);
    expect(t.visibles).toBe(true);
    motor.entrada.ponerMando(true, new Set(['a']), 0, 0);
    expect(t.visibles).toBe(false);
    t.usandoDedo(true);
    expect(t.visibles).toBe(true);
    // Un mando que sigue como estaba (el botón aún apretado, sin nada nuevo) no los esconde
    motor.entrada.ponerMando(true, new Set(['a']), 0, 0);
    expect(t.visibles).toBe(true);
  });
});

describe('Pantallas estrechas', () => {
  it('los controles se encogen para caber, pero nunca por debajo de 44 px', () => {
    expect(encogeParaAncho(0)).toBe(1);
    expect(encogeParaAncho(1180)).toBe(1);
    expect(encogeParaAncho(400)).toBe(1);
    expect(encogeParaAncho(320)).toBe(0.8);
    expect(encogeParaAncho(100)).toBe(ENCOGE_MINIMO);
    // Un botón mide 72 px a tamaño normal
    expect(72 * ENCOGE_MINIMO).toBeGreaterThanOrEqual(44);
    expect(encogeParaAncho(Number.NaN)).toBe(1);
  });
});

describe('Un control nunca se sale de la pantalla', () => {
  it('tactil.mover a una esquina lo deja, como poco, a medio control del borde', () => {
    const { caja, t, quitar } = conLienzo();
    t.joystick('izquierda', true);
    t.boton('Pausa', []);
    t.mover('Pausa', 100, 100);
    t.mover('joystick', 0, 0);
    const pausa = caja.querySelector<HTMLElement>('.boton-tactil')!;
    expect(pausa.style.getPropertyValue('--x')).toBe('100.00%');
    expect(pausa.style.getPropertyValue('--y')).toBe('100.00%');
    // Los estilos son los que no dejan que se salga: left y bottom van entre «medio control» y «el borde menos medio control»
    expect(ESTILOS_TACTILES).toContain('left:clamp(var(--medio),calc(var(--x,50%) + var(--dx,0px)*var(--t)),calc(100% - var(--medio)))');
    expect(ESTILOS_TACTILES).toContain('bottom:clamp(var(--medio),calc(var(--y,50%) + var(--dy,0px)*var(--t)),calc(100% - var(--medio)))');
    // Cada control sabe cuánto mide la mitad (lo dicen los estilos)
    expect(ESTILOS_TACTILES).toMatch(/\.boton-tactil\{--medio:/);
    expect(ESTILOS_TACTILES).toMatch(/\.palanca-tactil\{--medio:/);
    quitar();
  });
});
