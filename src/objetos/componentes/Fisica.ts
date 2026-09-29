/**
 * Física: hace que el objeto se mueva solo (velocidad) y caiga (gravedad).
 * Si además tiene Colisión, choca con los objetos sólidos.
 *
 * Es como un "cuerpo" en Unity (Rigidbody2D), pero mucho más simple:
 * sin rebotes ni rotación física. Pensado para plataformas y juegos top-down.
 */
import { Componente } from '../Componente';
import { Vector2 } from '../../motor/Vector2';

/** Gravedad del mundo en píxeles/segundo². */
export const GRAVEDAD_MUNDO = 1500;

export class Fisica extends Componente {
  /** Píxeles por segundo. */
  velocidad = new Vector2(0, 0);
  /** Multiplicador de la gravedad: 1 = normal, 0 = flota (vista desde arriba), 0.5 = luna. */
  gravedad = 1;
  /** Velocidad máxima de caída, para que no atraviese el suelo al caer desde muy alto. */
  velocidadMaximaCaida = 1100;
  /** Un objeto estático no se mueve nunca (una plataforma con física, pero quieta). */
  estatico = false;

  // Estas las rellena el sistema de física en cada paso. Solo se leen.
  enSuelo = false;
  tocaTecho = false;
  tocaPared = false;
}
