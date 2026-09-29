/**
 * Transformación: DÓNDE está el objeto, cuánto está girado y de qué tamaño es.
 * Todos los objetos la tienen (igual que en Unity).
 *
 * La posición es el CENTRO del objeto. Así rotar y escalar funcionan "sobre sí mismo".
 */
import { Componente } from '../Componente';
import { Vector2 } from '../../motor/Vector2';

export class Transformacion extends Componente {
  posicion = new Vector2(0, 0);
  /** En grados. Positivo = sentido de las agujas del reloj (porque la Y va hacia abajo). */
  rotacion = 0;
  /** 1 = tamaño normal, 2 = el doble... */
  escala = new Vector2(1, 1);
}
