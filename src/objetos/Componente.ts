/**
 * Componente: una pieza de comportamiento que se "engancha" a un ObjetoJuego.
 *
 * ── ¿Por qué componentes y no herencia? ──
 * Con herencia harías: Objeto → Personaje → Enemigo → EnemigoVolador...
 * y en cuanto quieres un "cofre que vuela" el árbol se rompe.
 * Con componentes, un objeto es una CAJA a la que añades piezas:
 *     Moneda  = Transformación + Sprite + Colisión
 *     Jugador = Transformación + Sprite + Colisión + Física + Script
 * Es lo que hace Unity (GameObject + Components). En Roblox es parecido a
 * meter un Script, un Attachment o un BodyVelocity dentro de una Part.
 *
 * Todos los métodos son opcionales: cada componente implementa solo los que necesita.
 */
import type { ObjetoJuego } from './ObjetoJuego';
import type { Renderizador } from '../motor/Renderizador';

export abstract class Componente {
  /** El objeto al que pertenece. Lo rellena ObjetoJuego.agregar(). */
  objeto!: ObjetoJuego;
  /** Si es falso, el componente no se actualiza ni se dibuja. */
  activo = true;

  /** Se llama una vez, cuando el objeto entra en una escena que ya está en marcha. */
  iniciar?(): void;
  /** Se llama en cada fotograma. */
  actualizar?(dt: number): void;
  /** Se llama en cada fotograma para dibujar. */
  dibujar?(r: Renderizador): void;
  /** Se llama cuando este objeto EMPIEZA a tocar a otro. */
  alTocar?(otro: ObjetoJuego): void;
  /** Se llama cuando este objeto DEJA de tocar a otro. */
  alDejarDeTocar?(otro: ObjetoJuego): void;
  /** Se llama cuando el objeto se destruye. */
  alDestruir?(): void;
}
