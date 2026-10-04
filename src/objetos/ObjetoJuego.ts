/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * ObjetoJuego: cualquier "cosa" del juego (jugador, moneda, suelo, marcador...).
 * Por sí solo no hace nada: lo que hace depende de sus componentes.
 *
 * nombre → identifica a ESTE objeto ("Jugador", "Moneda3").
 * tipo   → la "clase" de objeto, normalmente la plantilla de la que salió ("Moneda").
 *          Sirve para cosas como `cuando toco Moneda:` en Chispa.
 */
import type { Componente } from './Componente';
import type { Escena } from './Escena';
import { Transformacion } from './componentes/Transformacion';
import { Vector2 } from '../motor/Vector2';
import { normalizar } from '../utilidades/texto';

let siguienteId = 1;

/** Tipo auxiliar: "una clase que crea componentes del tipo T". */
type ClaseComponente<T extends Componente> = abstract new (...args: never[]) => T;

export class ObjetoJuego {
  /** Número único; útil para distinguir dos objetos con el mismo nombre. */
  readonly id = siguienteId++;
  nombre: string;
  tipo: string;
  readonly transformacion: Transformacion;
  escena: Escena | null = null;
  destruido = false;
  /**
   * Propiedades inventadas por el programador del juego (yo.vida, yo.puntos...).
   * Es parecido a los Attributes de Roblox.
   */
  readonly propiedades = new Map<string, unknown>();
  /** Etiquetas (yo.ponerEtiqueta("enemigo")): normalizada → como se escribió. */
  readonly etiquetas = new Map<string, string>();
  /**
   * PADRE: si tiene uno, se mueve con él (una espada que va con el jugador).
   * Guardamos dónde estaba el padre el fotograma anterior: el hijo se mueve lo
   * mismo que él, y así puede moverse también por su cuenta.
   */
  padre: ObjetoJuego | null = null;
  posicionPadre: Vector2 | null = null;
  /** Cuánto está levantado del suelo, en píxeles (yo.elevacion): en la vista en primera persona, lo que flota o vuela. */
  elevacion = 0;
  /** A qué altura está el suelo que pisa (píxeles), si es un cuerpo que choca en un mapa con suelos a distintas alturas (lo pone la física); si no, null. */
  alturaSuelo: number | null = null;
  /** Cómo sale en un minimapa (yo.enMinimapa): '' = un punto del color de su dibujo, 'no' = no sale, o un color. */
  enMinimapa = '';
  /** Se puede coger y mover con el ratón (yo.arrastrable = verdadero). */
  arrastrable = false;
  /** La definición de la que salió (para clonar()). */
  definicion: unknown = null;
  /**
   * Lo que este objeto atraviesa sin chocar (nombres, tipos o etiquetas, normalizados):
   * yo.atravesar("enemigo"). Sigue avisando con «cuando toco», y sigue chocando con las paredes.
   */
  readonly atraviesa = new Set<string>();

  /** ¿Es este objeto de ese nombre, tipo o etiqueta? (normalizado) */
  es(n: string): boolean {
    return normalizar(this.nombre) === n || normalizar(this.tipo) === n || this.etiquetas.has(n);
  }

  /** ¿Se atraviesan estos dos objetos? (basta con que uno atraviese al otro) */
  atraviesaA(otro: ObjetoJuego): boolean {
    if (this.atraviesa.size) for (const n of this.atraviesa) if (otro.es(n)) return true;
    if (otro.atraviesa.size) for (const n of otro.atraviesa) if (this.es(n)) return true;
    return false;
  }

  private componentes: Componente[] = [];
  /** Recuerda qué componente es de cada clase: obtener() se usa miles de veces por fotograma. */
  private porClase = new Map<Function, Componente | undefined>();

  constructor(nombre: string, tipo = nombre) {
    this.nombre = nombre;
    this.tipo = tipo;
    this.transformacion = this.agregar(new Transformacion());
  }

  /** Añade un componente y lo devuelve (para poder configurarlo en la misma línea). */
  agregar<T extends Componente>(componente: T): T {
    componente.objeto = this;
    this.componentes.push(componente);
    this.porClase.clear();
    // Si el objeto ya está en una escena en marcha, el componente arranca ya.
    if (this.escena?.iniciada) componente.iniciar?.();
    return componente;
  }

  /** Devuelve el componente de esa clase, o undefined si no lo tiene. Ej: obj.obtener(Fisica) */
  obtener<T extends Componente>(clase: ClaseComponente<T>): T | undefined {
    if (this.porClase.has(clase)) return this.porClase.get(clase) as T | undefined;
    const c = this.componentes.find((x) => x instanceof clase) as T | undefined;
    this.porClase.set(clase, c);
    return c;
  }

  get todosLosComponentes(): readonly Componente[] {
    return this.componentes;
  }

  get posicion(): Vector2 {
    return this.transformacion.posicion;
  }

  /** Atajo: coloca el objeto en (x, y) y lo devuelve. */
  en(x: number, y: number): this {
    this.transformacion.posicion.x = x;
    this.transformacion.posicion.y = y;
    return this;
  }

  destruir(): void {
    this.escena?.destruir(this);
  }

  /** Se pega a otro objeto: a partir de ahora se mueve con él. null = se suelta. */
  pegarA(padre: ObjetoJuego | null): void {
    // Un objeto no puede ser padre de sí mismo, ni de su propio padre (daría vueltas sin fin)
    for (let p = padre; p; p = p.padre) if (p === this) throw new Error('bucle de padres');
    this.padre = padre;
    this.posicionPadre = padre ? padre.posicion.copiar() : null;
  }

  /** Los objetos pegados a este (que siguen existiendo). */
  get hijos(): ObjetoJuego[] {
    return this.escena ? this.escena.objetos.filter((o) => o.padre === this && !o.destruido) : [];
  }
}
