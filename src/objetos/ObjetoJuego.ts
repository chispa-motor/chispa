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

  private componentes: Componente[] = [];

  constructor(nombre: string, tipo = nombre) {
    this.nombre = nombre;
    this.tipo = tipo;
    this.transformacion = this.agregar(new Transformacion());
  }

  /** Añade un componente y lo devuelve (para poder configurarlo en la misma línea). */
  agregar<T extends Componente>(componente: T): T {
    componente.objeto = this;
    this.componentes.push(componente);
    // Si el objeto ya está en una escena en marcha, el componente arranca ya.
    if (this.escena?.iniciada) componente.iniciar?.();
    return componente;
  }

  /** Devuelve el componente de esa clase, o undefined si no lo tiene. Ej: obj.obtener(Fisica) */
  obtener<T extends Componente>(clase: ClaseComponente<T>): T | undefined {
    return this.componentes.find((c) => c instanceof clase) as T | undefined;
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
}
