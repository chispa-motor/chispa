/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * ICONOS DE LAS FORMAS: cada icono se dibuja con la misma figura que usa el
 * motor (formas/figuras.ts), así el icono de la estrella ES la estrella.
 */
import { figuraDe, type DatosFigura, type Forma } from '../../objetos/formas/figuras';

/** Datos para que cada forma se vea bien en un icono de 20 × 20. */
const EN_ICONO: Partial<Record<Forma, Partial<DatosFigura>>> = {
  linea: { ancho: 18, alto: 14, grosor: 2.5 },
  capsula: { ancho: 20, alto: 10 },
  flecha: { ancho: 20, alto: 14 },
  elipse: { ancho: 20, alto: 13 },
  redondeado: { ancho: 20, alto: 14 },
  camino: { puntos: [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.2, y: 0.5, entrada: { x: 0.5, y: 0.2 } }, { x: -0.2, y: 0.5 }] },
};

/** El "d" de un <path> de SVG con la figura de una forma (en un cuadro de 24 × 24). */
export function trazoDeForma(forma: Forma, datos: Partial<DatosFigura> = {}): string {
  const f = figuraDe({ forma, ancho: 20, alto: 20, ...EN_ICONO[forma], ...datos });
  const punto = (p: { x: number; y: number }) => `${(12 + p.x).toFixed(2)} ${(12 - p.y).toFixed(2)}`;
  const partes = f.anillos.flatMap((pol) => pol.map((anillo) => `M${anillo.map(punto).join('L')}Z`));
  if (f.trazo) partes.push(`M${f.trazo.puntos.map(punto).join('L')}`);
  return partes.join('');
}

export function iconoForma(forma: Forma, tamano = 18): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(tamano));
  svg.setAttribute('height', String(tamano));
  svg.setAttribute('class', 'icono icono-forma');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', trazoDeForma(forma));
  path.setAttribute('fill', forma === 'linea' ? 'none' : 'currentColor');
  path.setAttribute('fill-rule', 'evenodd');
  path.setAttribute('fill-opacity', '0.35');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}
