/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Transformación: DÓNDE está el objeto, cuánto está girado y de qué tamaño es.
 * Todos los objetos la tienen (igual que en Unity).
 *
 * La posición es el CENTRO del objeto. Así rotar y escalar funcionan "sobre sí mismo".
 * Coordenadas del MUNDO: la Y crece hacia ARRIBA (subir = sumar a la Y).
 */
import { Componente } from '../Componente';
import { Vector2 } from '../../motor/Vector2';

export class Transformacion extends Componente {
  posicion = new Vector2(0, 0);
  /** En grados. Positivo = sentido CONTRARIO a las agujas del reloj, como en matemáticas. */
  rotacion = 0;
  /** 1 = tamaño normal, 2 = el doble... */
  escala = new Vector2(1, 1);
}
