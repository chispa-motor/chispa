/**
 * Script (en TypeScript): comportamiento escrito a mano con funciones.
 *
 * En la Fase 3 añadimos ScriptChispa, que hace lo mismo pero leyendo código
 * .chs en español. Este se queda para usos internos del motor y para la demo
 * de la Fase 2.
 */
import { Componente } from '../Componente';
import type { ObjetoJuego } from '../ObjetoJuego';

export interface FuncionesScript {
  alIniciar?(yo: ObjetoJuego): void;
  alActualizar?(yo: ObjetoJuego, dt: number): void;
  alTocar?(yo: ObjetoJuego, otro: ObjetoJuego): void;
  alDejarDeTocar?(yo: ObjetoJuego, otro: ObjetoJuego): void;
}

export class Script extends Componente {
  constructor(private funciones: FuncionesScript) {
    super();
  }
  iniciar(): void {
    this.funciones.alIniciar?.(this.objeto);
  }
  actualizar(dt: number): void {
    this.funciones.alActualizar?.(this.objeto, dt);
  }
  alTocar(otro: ObjetoJuego): void {
    this.funciones.alTocar?.(this.objeto, otro);
  }
  alDejarDeTocar(otro: ObjetoJuego): void {
    this.funciones.alDejarDeTocar?.(this.objeto, otro);
  }
}
