/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EN QUÉ APARATO ESTAMOS: móvil, tableta u ordenador (ver DISPOSITIVOS.md).
 *
 * El editor tiene tres disposiciones:
 *  - escritorio: los tres paneles a la vez, como siempre.
 *  - tablet: la escena o el código ocupan todo, y los paneles son CAJONES
 *    que se abren por los lados con la barra de abajo.
 *  - movil: lo mismo, pero cada cajón ocupa la pantalla entera.
 *
 * Aquí no se dibuja nada: se mira el tamaño de la ventana y si se usa con el
 * dedo, y se ponen unas clases en el editor. Todo lo demás es CSS.
 *
 * También se vigila el TECLADO DE PANTALLA: cuando sale, el editor se encoge
 * a lo que queda a la vista, para que el teclado no tape lo que se escribe.
 */

export type Disposicion = 'movil' | 'tablet' | 'escritorio';

/** Por debajo de este ancho (o de ALTO_MOVIL de alto) es un móvil. */
export const ANCHO_MOVIL = 700;
export const ALTO_MOVIL = 500;
/** Hasta este ancho, con ratón, los paneles van en cajones. */
export const ANCHO_CAJONES = 900;
/** Con el dedo los paneles necesitan más sitio: van en cajones hasta este ancho (un iPad grande tumbado mide 1366). */
export const ANCHO_CAJONES_TACTIL = 1400;
/** Si lo que se ve mide esto menos que la ventana, es que ha salido el teclado de pantalla. */
export const ALTO_MINIMO_TECLADO = 120;

/** La disposición que toca para una ventana de ese tamaño. `tactil`: se maneja con el dedo. */
export function disposicionPara(ancho: number, alto: number, tactil: boolean): Disposicion {
  if (ancho < ANCHO_MOVIL || alto < ALTO_MOVIL) return 'movil';
  if (ancho <= (tactil ? ANCHO_CAJONES_TACTIL : ANCHO_CAJONES)) return 'tablet';
  return 'escritorio';
}

/** ¿Se maneja con el dedo? (el puntero principal es «gordo»: un móvil o una tableta sin ratón) */
export function esTactil(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export interface EstadoDispositivo {
  disposicion: Disposicion;
  tactil: boolean;
  /** Más ancho que alto. */
  tumbado: boolean;
  /** El teclado de pantalla está fuera. */
  teclado: boolean;
}

/** Lo que mide la ventana y lo que de verdad se ve (sin el teclado de pantalla). */
export interface Medidas {
  ancho: number;
  alto: number;
  altoVisible: number;
  arribaVisible: number;
}

function medir(): Medidas {
  const vv = window.visualViewport;
  return {
    ancho: window.innerWidth,
    alto: window.innerHeight,
    altoVisible: vv ? vv.height : window.innerHeight,
    arribaVisible: vv ? vv.offsetTop : 0,
  };
}

/**
 * ¿Ha salido el teclado? Hay dos maneras de saberlo, según el navegador:
 *  - Safari (iPhone, iPad): la ventana mide lo mismo, pero se ve menos (altoVisible < alto).
 *  - Chrome (Android): la ventana entera se encoge; se compara con lo más alto que ha medido
 *    con ese mismo ancho (si cambia el ancho es que se ha girado, no que haya teclado).
 */
export function hayTeclado(m: Medidas, altoMaximo: number, escribiendo: boolean): boolean {
  if (!escribiendo) return false;
  return m.alto - m.altoVisible > ALTO_MINIMO_TECLADO || altoMaximo - m.altoVisible > ALTO_MINIMO_TECLADO;
}

const esParaEscribir = (el: Element | null): boolean =>
  !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(range|checkbox|radio|button|color|file)$/.test((el as HTMLInputElement).type)) || (el as HTMLElement).isContentEditable);

/**
 * Vigila el aparato y pone en `raiz` las clases `movil` / `tablet` / `escritorio`, `compacto`
 * (móvil o tablet), `tactil`, `tumbado` y `con-teclado`, y la variable --alto-visible.
 * `forzarTactil`: lo que diga Ajustes (null = lo que detecte el navegador).
 * Devuelve cómo leer el estado y cómo dejar de vigilar.
 */
export function vigilarDispositivo(raiz: HTMLElement, alCambiar: (e: EstadoDispositivo) => void, forzarTactil: () => boolean | null = () => null): { estado: () => EstadoDispositivo; revisar: () => void; parar: () => void } {
  /** Lo más alto que ha medido la ventana con cada ancho (para notar el teclado en Android). */
  const maximos = new Map<number, number>();
  let estado: EstadoDispositivo = { disposicion: 'escritorio', tactil: false, tumbado: true, teclado: false };
  let primera = true;
  const revisar = () => {
    const m = medir();
    const maximo = Math.max(maximos.get(m.ancho) ?? 0, m.alto);
    maximos.set(m.ancho, maximo);
    const tactil = forzarTactil() ?? esTactil();
    const teclado = hayTeclado(m, maximo, esParaEscribir(document.activeElement));
    // Con el teclado fuera la ventana es bajita, pero sigue siendo el mismo aparato: se mira el alto sin teclado
    const nuevo: EstadoDispositivo = { disposicion: disposicionPara(m.ancho, teclado ? maximo : m.alto, tactil), tactil, tumbado: m.ancho > (teclado ? maximo : m.alto), teclado };
    // (en <html>: también las ventanas y los menús, que van fuera del editor, tienen que caber en lo que se ve)
    document.documentElement.style.setProperty('--alto-visible', `${Math.round(m.altoVisible)}px`);
    document.documentElement.style.setProperty('--arriba-visible', `${Math.round(m.arribaVisible)}px`);
    const cambia = primera || (Object.keys(nuevo) as (keyof EstadoDispositivo)[]).some((k) => nuevo[k] !== estado[k]);
    estado = nuevo;
    if (!cambia) return;
    primera = false;
    for (const d of ['movil', 'tablet', 'escritorio'] as const) raiz.classList.toggle(d, nuevo.disposicion === d);
    raiz.classList.toggle('compacto', nuevo.disposicion !== 'escritorio');
    raiz.classList.toggle('tactil', nuevo.tactil);
    raiz.classList.toggle('tumbado', nuevo.tumbado);
    raiz.classList.toggle('con-teclado', nuevo.teclado);
    // Los diálogos y los avisos van fuera del editor: también tienen que saberlo
    document.documentElement.classList.toggle('tactil', nuevo.tactil);
    document.documentElement.classList.toggle('compacto', nuevo.disposicion !== 'escritorio');
    document.documentElement.classList.toggle('movil', nuevo.disposicion === 'movil');
    alCambiar(nuevo);
  };
  const fin = new AbortController();
  const o = { signal: fin.signal };
  window.addEventListener('resize', revisar, o);
  window.addEventListener('orientationchange', revisar, o);
  window.visualViewport?.addEventListener('resize', revisar, o);
  window.visualViewport?.addEventListener('scroll', revisar, o);
  document.addEventListener('focusin', revisar, o);
  document.addEventListener('focusout', () => setTimeout(revisar, 50), o);
  try {
    matchMedia('(pointer: coarse)').addEventListener('change', revisar, o);
  } catch {
    /* navegador antiguo: se revisa igualmente al cambiar el tamaño */
  }
  revisar();
  return { estado: () => estado, revisar, parar: () => fin.abort() };
}
