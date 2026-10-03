/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CHISPA 1.2, BLOQUE 1: el editor en móviles y tabletas (ver DISPOSITIVOS.md).
 * Aquí, las piezas sueltas (qué disposición toca, los gestos, la ayuda al
 * tocar, el menú, el teclado de pantalla). Con toques de verdad en un
 * navegador: pruebas-navegador/moviles.mjs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALTO_MINIMO_TECLADO, disposicionPara, hayTeclado, vigilarDispositivo } from '../src/editor/interfaz/dispositivo';
import { ESPERA_PULSACION_LARGA, Gestos, HOLGURA_DEDO } from '../src/editor/escena/gestos';
import { DURACION_AYUDA, ESPERA_AYUDA, activarAyudaAlTocar, ayudaDe, quitarAyuda, sePulsa } from '../src/editor/interfaz/ayudaAlTocar';
import { abrirMenu, cerrarMenu } from '../src/editor/interfaz/menu';
import { AJUSTES_POR_DEFECTO, leerAjustes } from '../src/editor/ajustes';
import { Entrada } from '../src/motor/Entrada';
import { Vector2 } from '../src/motor/Vector2';
import { juegoDePrueba } from './ayudantes';

describe('Qué disposición toca en cada aparato', () => {
  it('móvil, tablet o escritorio según el tamaño y si se maneja con el dedo', () => {
    // Móviles, de pie y tumbados
    expect(disposicionPara(360, 640, true)).toBe('movil');
    expect(disposicionPara(430, 932, true)).toBe('movil');
    expect(disposicionPara(800, 360, true)).toBe('movil');
    expect(disposicionPara(932, 430, true)).toBe('movil');
    // Tabletas (un iPad grande tumbado mide 1366)
    expect(disposicionPara(820, 1180, true)).toBe('tablet');
    expect(disposicionPara(1180, 820, true)).toBe('tablet');
    expect(disposicionPara(1366, 1024, true)).toBe('tablet');
    // Portátiles pequeños y Chromebooks (con ratón o panel táctil): el escritorio de siempre
    expect(disposicionPara(1366, 768, false)).toBe('escritorio');
    expect(disposicionPara(1280, 720, false)).toBe('escritorio');
    expect(disposicionPara(1440, 860, false)).toBe('escritorio');
    // Una pantalla táctil grande
    expect(disposicionPara(1920, 1080, true)).toBe('escritorio');
    // Una ventana de ordenador estrechada: pasa a cajones, y más estrecha, a móvil
    expect(disposicionPara(880, 800, false)).toBe('tablet');
    expect(disposicionPara(500, 800, false)).toBe('movil');
  });

  it('el teclado de pantalla se nota de las dos maneras (Safari: se ve menos; Android: la ventana se encoge)', () => {
    const m = { ancho: 390, alto: 800, altoVisible: 800, arribaVisible: 0 };
    expect(hayTeclado(m, 800, true)).toBe(false);
    // Safari: la ventana mide lo mismo, pero se ve menos
    expect(hayTeclado({ ...m, altoVisible: 480 }, 800, true)).toBe(true);
    // Android: la ventana entera es más baja que antes
    expect(hayTeclado({ ...m, alto: 460, altoVisible: 460 }, 800, true)).toBe(true);
    // Sin estar escribiendo no es el teclado (será la barra de direcciones, o que se ha girado)
    expect(hayTeclado({ ...m, altoVisible: 480 }, 800, false)).toBe(false);
    // Una diferencia pequeña (la barra de direcciones que se esconde) no es el teclado
    expect(hayTeclado({ ...m, altoVisible: 800 - ALTO_MINIMO_TECLADO + 10 }, 800, true)).toBe(false);
  });

  it('se ponen las clases en el editor y se avisa al cambiar de tamaño', () => {
    const raiz = document.createElement('div');
    const cambios: string[] = [];
    const ancho = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
    const alto = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    let tactil: boolean | null = true;
    const v = vigilarDispositivo(raiz, (e) => cambios.push(`${e.disposicion}${e.tactil ? ' tactil' : ''}${e.tumbado ? ' tumbado' : ''}`), () => tactil);
    expect(v.estado().disposicion).toBe('movil');
    expect([...raiz.classList].sort()).toEqual(['compacto', 'movil', 'tactil']);
    expect(document.documentElement.classList.contains('movil')).toBe(true);
    // Se gira
    ancho.mockReturnValue(800);
    alto.mockReturnValue(390);
    window.dispatchEvent(new Event('resize'));
    expect(raiz.classList.contains('tumbado')).toBe(true);
    // Una ventana grande con ratón
    ancho.mockReturnValue(1440);
    alto.mockReturnValue(860);
    tactil = false;
    window.dispatchEvent(new Event('resize'));
    expect([...raiz.classList].sort()).toEqual(['escritorio', 'tumbado']);
    expect(document.documentElement.classList.contains('compacto')).toBe(false);
    expect(cambios).toEqual(['movil tactil', 'movil tactil tumbado', 'escritorio tumbado']);
    // Sin cambios no se avisa otra vez
    window.dispatchEvent(new Event('resize'));
    expect(cambios.length).toBe(3);
    v.parar();
    ancho.mockReturnValue(390);
    window.dispatchEvent(new Event('resize'));
    expect(cambios.length).toBe(3);
    vi.restoreAllMocks();
  });

  it('«Botones grandes» se guarda en los ajustes (y lo que no vale se arregla)', () => {
    expect(AJUSTES_POR_DEFECTO.botonesGrandes).toBe('auto');
    expect(leerAjustes('{"botonesGrandes":"si"}').botonesGrandes).toBe('si');
    expect(leerAjustes('{"botonesGrandes":"no"}').botonesGrandes).toBe('no');
    expect(leerAjustes('{"botonesGrandes":"enormes"}').botonesGrandes).toBe('auto');
  });
});

describe('Gestos con los dedos en la escena', () => {
  const avisos = () => {
    const lista: string[] = [];
    const g = new Gestos({
      pulsacionLarga: (x, y) => lista.push(`larga ${x},${y}`),
      empiezanDosDedos: () => lista.push('dos'),
      dosDedos: (dx, dy, f, cx, cy) => lista.push(`vista ${dx},${dy} x${f.toFixed(2)} en ${cx},${cy}`),
    });
    return { g, lista };
  };
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it('un dedo es como el ratón; quieto un rato, pulsación larga', () => {
    const { g, lista } = avisos();
    expect(g.bajar(1, 100, 100)).toBe('uno');
    expect(g.mover(1, 103, 102)).toBe('uno');
    vi.advanceTimersByTime(ESPERA_PULSACION_LARGA + 10);
    expect(lista).toEqual(['larga 103,102']);
    // Lo que haga el dedo hasta levantarlo ya no cuenta
    expect(g.ignorarUno).toBe(true);
    expect(g.mover(1, 200, 200)).toBe('nada');
    g.subir(1);
    // El siguiente toque empieza de cero
    expect(g.bajar(2, 10, 10)).toBe('uno');
    expect(g.ignorarUno).toBe(false);
  });

  it('si el dedo se mueve o se levanta antes, no hay pulsación larga', () => {
    const { g, lista } = avisos();
    g.bajar(1, 100, 100);
    g.mover(1, 100 + HOLGURA_DEDO + 5, 100);
    vi.advanceTimersByTime(ESPERA_PULSACION_LARGA * 2);
    expect(lista).toEqual([]);
    expect(g.seHaMovido(1)).toBe(true);
    g.subir(1);
    g.bajar(2, 50, 50);
    expect(g.seHaMovido(2)).toBe(false);
    g.subir(2);
    vi.advanceTimersByTime(ESPERA_PULSACION_LARGA * 2);
    expect(lista).toEqual([]);
  });

  it('dos dedos: mover los dos mueve la vista; separarlos la acerca alrededor de su centro', () => {
    const { g, lista } = avisos();
    g.bajar(1, 100, 100);
    expect(g.bajar(2, 200, 100)).toBe('dos');
    expect(lista).toEqual(['dos']);
    // Se separan (de 100 a 200 de distancia): el doble de cerca, y el centro no se mueve
    expect(g.mover(1, 50, 100)).toBe('dos');
    expect(g.mover(2, 250, 100)).toBe('dos');
    expect(lista.slice(1)).toEqual(['vista -25,0 x1.50 en 125,100', 'vista 25,0 x1.33 en 150,100']);
    // Los dos hacia abajo: se mueve, sin acercar
    lista.length = 0;
    g.mover(1, 50, 140);
    g.mover(2, 250, 140);
    expect(lista.map((t) => t.split(' ')[2])).toEqual(['x1.02', 'x0.98']);
    // Nunca salta la pulsación larga con dos dedos
    vi.advanceTimersByTime(ESPERA_PULSACION_LARGA * 2);
    expect(lista.some((t) => t.startsWith('larga'))).toBe(false);
    // Al levantar uno, el que queda no arrastra nada
    g.subir(2);
    expect(g.ignorarUno).toBe(true);
    expect(g.mover(1, 300, 300)).toBe('nada');
  });

  it('un tercer dedo sobra, y con los dedos casi juntos no se dispara el zoom', () => {
    const { g, lista } = avisos();
    g.bajar(1, 100, 100);
    g.bajar(2, 105, 100);
    expect(g.bajar(3, 300, 300)).toBe('sobra');
    expect(g.cuantos).toBe(2);
    lista.length = 0;
    g.mover(2, 400, 100);
    expect(lista[0]).toContain('x1.00');
    g.soltarTodo();
    expect(g.cuantos).toBe(0);
  });
});

describe('La ayuda sale al tocar', () => {
  const toque = (tipo: string, objetivo: Element, x = 10, y = 10, puntero = 'touch') => {
    const ev = new Event(tipo, { bubbles: true, cancelable: true }) as Event & Record<string, unknown>;
    Object.assign(ev, { pointerType: puntero, pointerId: 1, clientX: x, clientY: y });
    objetivo.dispatchEvent(ev);
    return ev;
  };
  let quitar = () => {};
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<button id="b" title="Ver la cuadrícula">#</button><span id="e" title="Cuánto se acerca la vista">100%</span><span id="n">nada</span>';
    quitar = activarAyudaAlTocar();
  });
  afterEach(() => {
    quitar();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });
  const bocadillo = () => document.querySelector('.bocadillo-ayuda')?.textContent ?? null;

  it('qué tiene ayuda y qué se pulsa', () => {
    expect(ayudaDe(document.getElementById('b'))?.texto).toBe('Ver la cuadrícula');
    expect(ayudaDe(document.getElementById('n'))).toBeNull();
    expect(sePulsa(document.getElementById('b')!)).toBe(true);
    expect(sePulsa(document.getElementById('e')!)).toBe(false);
  });

  it('dejar el dedo sobre un botón enseña su ayuda, y el clic de después no lo pulsa', () => {
    const b = document.getElementById('b')!;
    let pulsado = 0;
    b.addEventListener('click', () => pulsado++);
    toque('pointerdown', b);
    expect(bocadillo()).toBeNull();
    vi.advanceTimersByTime(ESPERA_AYUDA + 10);
    expect(bocadillo()).toBe('Ver la cuadrícula');
    toque('pointerup', b);
    b.click();
    expect(pulsado).toBe(0);
    // El siguiente toque normal sí
    toque('pointerdown', b);
    toque('pointerup', b);
    b.click();
    expect(pulsado).toBe(1);
    // ... y el bocadillo se quita al tocar otra cosa
    expect(bocadillo()).toBeNull();
  });

  it('un toque corto en un botón no enseña nada; si el dedo se mueve (desplazar), tampoco', () => {
    const b = document.getElementById('b')!;
    toque('pointerdown', b);
    vi.advanceTimersByTime(100);
    toque('pointerup', b);
    vi.advanceTimersByTime(ESPERA_AYUDA * 2);
    expect(bocadillo()).toBeNull();
    toque('pointerdown', b, 10, 10);
    toque('pointermove', b, 10, 60);
    vi.advanceTimersByTime(ESPERA_AYUDA * 2);
    expect(bocadillo()).toBeNull();
  });

  it('lo que no se pulsa (una etiqueta) enseña su ayuda con un toque, y se quita sola al rato', () => {
    const e = document.getElementById('e')!;
    toque('pointerdown', e);
    toque('pointerup', e);
    expect(bocadillo()).toBe('Cuánto se acerca la vista');
    vi.advanceTimersByTime(DURACION_AYUDA + 10);
    expect(bocadillo()).toBeNull();
  });

  it('con el ratón no hace nada (el navegador ya enseña la ayuda al pasar por encima)', () => {
    const b = document.getElementById('b')!;
    toque('pointerdown', b, 10, 10, 'mouse');
    vi.advanceTimersByTime(ESPERA_AYUDA * 2);
    expect(bocadillo()).toBeNull();
    const e = document.getElementById('e')!;
    toque('pointerdown', e, 10, 10, 'mouse');
    toque('pointerup', e, 10, 10, 'mouse');
    expect(bocadillo()).toBeNull();
    quitarAyuda();
  });
});

describe('Menú flotante', () => {
  afterEach(() => cerrarMenu());

  it('enseña las opciones, llama a la elegida y se cierra', () => {
    const elegidas: string[] = [];
    abrirMenu(10, 10, [
      { texto: 'Duplicar', alPulsar: () => elegidas.push('duplicar') },
      null,
      { texto: 'Borrar', peligro: true, alPulsar: () => elegidas.push('borrar') },
      { texto: 'No se puede', desactivada: true, alPulsar: () => elegidas.push('no') },
    ], 'Jugador');
    const menu = document.querySelector('.menu-flotante')!;
    expect(menu.querySelector('.titulo-menu')!.textContent).toBe('Jugador');
    const botones = [...menu.querySelectorAll<HTMLButtonElement>('.opcion-menu')];
    expect(botones.map((b) => b.textContent)).toEqual(['Duplicar', 'Borrar', 'No se puede']);
    expect(botones[1].classList.contains('peligro')).toBe(true);
    expect(botones[2].disabled).toBe(true);
    botones[1].click();
    expect(elegidas).toEqual(['borrar']);
    expect(document.querySelector('.menu-flotante')).toBeNull();
  });

  it('solo hay uno a la vez, y Escape lo cierra', () => {
    abrirMenu(0, 0, [{ texto: 'A', alPulsar: () => {} }]);
    abrirMenu(0, 0, [{ texto: 'B', alPulsar: () => {} }]);
    expect(document.querySelectorAll('.menu-flotante').length).toBe(1);
    expect(document.querySelector('.menu-flotante')!.textContent).toBe('B');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.menu-flotante')).toBeNull();
  });
});

describe('Teclado de pantalla en los campos de texto del juego', () => {
  const toque = (lienzo: HTMLCanvasElement, tipo: string, puntero = 'touch') => {
    const ev = new Event(tipo, { bubbles: true, cancelable: true }) as Event & Record<string, unknown>;
    Object.assign(ev, { pointerType: puntero, pointerId: 1, clientX: 50, clientY: 60, button: 0 });
    lienzo.dispatchEvent(ev);
  };
  const escribir = (t: HTMLInputElement, valor: string) => {
    t.value = valor;
    t.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('al tocar con el dedo una zona de texto se enfoca un campo de verdad; con el ratón, no', () => {
    const lienzo = document.createElement('canvas');
    document.body.append(lienzo);
    const entrada = new Entrada(lienzo, (x, y) => new Vector2(x, y));
    let encima = false;
    entrada.zonasDeTexto.add(() => (encima ? 'Ana' : null));
    // Fuera del campo: nada
    toque(lienzo, 'pointerdown');
    expect(entrada.tecladoAbierto).toBe(false);
    // Con el ratón encima del campo: tampoco (hay teclado de verdad)
    encima = true;
    toque(lienzo, 'pointerdown', 'mouse');
    expect(entrada.tecladoAbierto).toBe(false);
    // Con el dedo: sí, y con el texto que ya tenía el campo
    toque(lienzo, 'pointerdown');
    expect(entrada.tecladoAbierto).toBe(true);
    const t = document.activeElement as HTMLInputElement;
    expect(t.className).toBe('teclado-chispa');
    expect(t.value).toBe('Ana');
    expect(t.style.fontSize).toBe('16px');
    entrada.cerrarTeclado();
    expect(entrada.tecladoAbierto).toBe(false);
    entrada.destruir();
    expect(document.querySelector('.teclado-chispa')).toBeNull();
    lienzo.remove();
  });

  it('lo que cambia en el campo de verdad llega como letras y borrados (también la palabra entera del texto predictivo)', () => {
    const lienzo = document.createElement('canvas');
    document.body.append(lienzo);
    const entrada = new Entrada(lienzo, (x, y) => new Vector2(x, y));
    entrada.abrirTeclado('Ana');
    const t = document.activeElement as HTMLInputElement;
    escribir(t, 'Anas');
    expect(entrada.textoEscrito).toEqual(['s']);
    entrada.finDeFotograma();
    escribir(t, 'Ana');
    expect(entrada.textoEscrito).toEqual(['\b']);
    entrada.finDeFotograma();
    // El teclado cambia «Ana» por «Analía» de golpe
    escribir(t, 'Analía');
    expect(entrada.textoEscrito).toEqual(['l', 'í', 'a']);
    entrada.finDeFotograma();
    // ... o corrige la palabra entera
    escribir(t, 'Hola 👋');
    expect(entrada.textoEscrito).toEqual(['\b', '\b', '\b', '\b', '\b', '\b', 'H', 'o', 'l', 'a', ' ', '👋']);
    entrada.finDeFotograma();
    // Intro
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(entrada.textoEscrito).toEqual(['\n']);
    entrada.finDeFotograma();
    // El campo del juego ha recortado el texto: el de verdad se pone igual
    entrada.sincronizarTeclado('Hol');
    expect(t.value).toBe('Hol');
    escribir(t, 'Ho');
    expect(entrada.textoEscrito).toEqual(['\b']);
    entrada.destruir();
    lienzo.remove();
  });

  it('en un juego: tocar el campo saca el teclado, lo escrito cambia el campo, e Intro lo quita', () => {
    const j = juegoDePrueba({
      scripts: { 'c.chs': 'cuando cambia:\n    juego.nombre = yo.valor' }, gravedad: 0,
      escena: [{ nombre: 'Campo', x: 480, y: 270, script: 'c.chs', sprite: { color: 'azul', ancho: 240, alto: 40, fijo: true }, control: { tipo: 'campo', largoMaximo: 5 } }] as never,
    });
    j.avanzar(1);
    const entrada = j.entrada;
    expect(entrada.zonasDeTexto.size).toBe(1);
    document.body.append(j.canvas);
    /** Un toque con el dedo en ese punto del juego (como clic() de los ayudantes, pero con el dedo). */
    const tocar = (x: number, y: number) => {
      for (const [tipo, donde] of [['pointermove', j.canvas], ['pointerdown', j.canvas], ['pointerup', window]] as const) {
        const ev = new Event(tipo, { bubbles: true }) as Event & Record<string, unknown>;
        Object.assign(ev, { pointerType: 'touch', pointerId: 1, clientX: x, clientY: 540 - y, button: 0 });
        donde.dispatchEvent(ev);
      }
    };
    // Fuera del campo: no sale el teclado
    tocar(50, 50);
    j.avanzar(1);
    expect(entrada.tecladoAbierto).toBe(false);
    // En el campo: sale EN EL MISMO TOQUE (sin esperar al fotograma siguiente: si no, el navegador no lo saca)
    tocar(480, 270);
    expect(entrada.tecladoAbierto).toBe(true);
    j.avanzar(1);
    const t = document.activeElement as HTMLInputElement;
    const escribir = (valor: string) => {
      t.value = valor;
      t.dispatchEvent(new Event('input', { bubbles: true }));
      j.avanzar(1);
    };
    escribir('A');
    escribir('Ana');
    expect(j.juego.datoDelJuego('nombre')).toBe('Ana');
    // El campo solo admite 5 letras: lo que sobra no entra, y el campo de verdad se queda igual que el del juego
    escribir('Anabel');
    expect(j.juego.datoDelJuego('nombre')).toBe('Anabe');
    j.avanzar(1);
    expect(t.value).toBe('Anabe');
    escribir('Anab');
    expect(j.juego.datoDelJuego('nombre')).toBe('Anab');
    // Intro termina y quita el teclado
    t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    j.avanzar(2);
    expect(entrada.tecladoAbierto).toBe(false);
    expect(entrada.escribiendo).toBe(false);
    // Al borrar el campo del juego, deja de preguntarse por él
    j.juego.escena.destruir(j.buscar('Campo')!);
    j.avanzar(2);
    expect(entrada.zonasDeTexto.size).toBe(0);
    j.canvas.remove();
  });
});
