/**
 * Escena: el "mundo" donde viven los objetos. Como el Workspace de Roblox.
 *
 * Orden de cada fotograma:
 *   1. Scripts y demás componentes (actualizar)
 *   2. Física (pasos fijos) + avisos de contacto
 *   3. Cámara
 *   4. Quitar los objetos destruidos
 *   5. Dibujar (ordenados por capa)
 *
 * ── DECISIÓN: destruir "más tarde" ──
 * Si un script destruye un objeto mientras recorremos la lista de objetos,
 * la lista cambia por debajo y nos saltaríamos alguno. Por eso destruir()
 * solo lo MARCA, y lo quitamos de verdad al final del fotograma.
 */
import type { Motor, EscenaActiva } from '../motor/Motor';
import type { Renderizador } from '../motor/Renderizador';
import { Vector2 } from '../motor/Vector2';
import { normalizar } from '../utilidades/texto';
import { Camara } from './Camara';
import { ObjetoJuego } from './ObjetoJuego';
import { SistemaFisico } from './SistemaFisico';
import { Sprite } from './componentes/Sprite';

export class Escena implements EscenaActiva {
  objetos: ObjetoJuego[] = [];
  readonly camara: Camara;
  iniciada = false;
  private porDestruir: ObjetoJuego[] = [];
  private fisica = new SistemaFisico();

  constructor(readonly motor: Motor) {
    this.camara = new Camara(motor.renderizador.ancho, motor.renderizador.alto);
  }

  /** Crea un objeto vacío (solo con Transformación) y lo añade. */
  crear(nombre: string, tipo = nombre): ObjetoJuego {
    return this.agregar(new ObjetoJuego(nombre, tipo));
  }

  agregar(objeto: ObjetoJuego): ObjetoJuego {
    objeto.escena = this;
    this.objetos.push(objeto);
    if (this.iniciada) for (const c of objeto.todosLosComponentes) c.iniciar?.();
    return objeto;
  }

  destruir(objeto: ObjetoJuego): void {
    if (objeto.destruido) return;
    objeto.destruido = true;
    this.porDestruir.push(objeto);
    for (const c of objeto.todosLosComponentes) c.alDestruir?.();
  }

  /** Busca el primer objeto cuyo nombre o tipo coincida (sin importar mayúsculas ni tildes). */
  buscar(nombre: string): ObjetoJuego | null {
    const n = normalizar(nombre);
    return (
      this.objetos.find((o) => !o.destruido && normalizar(o.nombre) === n) ??
      this.objetos.find((o) => !o.destruido && normalizar(o.tipo) === n) ??
      null
    );
  }

  buscarTodos(nombre: string): ObjetoJuego[] {
    const n = normalizar(nombre);
    return this.objetos.filter((o) => !o.destruido && (normalizar(o.nombre) === n || normalizar(o.tipo) === n));
  }

  /** Posición del ratón en el MUNDO (teniendo en cuenta la cámara). */
  ratonEnMundo(): Vector2 {
    return this.camara.pantallaAMundo(this.motor.entrada.posicionRaton);
  }

  /** Arranca todos los objetos que ya estaban en la escena. */
  iniciar(): void {
    this.iniciada = true;
    // Copiamos la lista con [...] porque al iniciar un objeto puede crear otros.
    for (const o of [...this.objetos]) {
      if (o.destruido) continue;
      for (const c of o.todosLosComponentes) c.iniciar?.();
    }
  }

  actualizar(dt: number): void {
    for (const o of [...this.objetos]) {
      if (o.destruido) continue;
      for (const c of o.todosLosComponentes) if (c.activo && !o.destruido) c.actualizar?.(dt);
    }
    this.fisica.actualizar(this, dt);
    this.camara.actualizar(dt);
    this.quitarDestruidos();
  }

  dibujar(r: Renderizador): void {
    const cam = this.camara;
    // Lista de sprites ordenada por capa (sort es "estable": a igual capa, se respeta el orden de creación)
    const sprites: Sprite[] = [];
    for (const o of this.objetos) {
      const s = o.obtener(Sprite);
      if (s && s.activo && s.visible && !o.destruido) sprites.push(s);
    }
    sprites.sort((a, b) => a.capa - b.capa);

    // Zona visible del mundo, para no dibujar lo que está fuera de la pantalla.
    const izq = cam.izquierda;
    const abajo = cam.abajo;
    const margen = 64;

    for (const s of sprites) {
      const p = s.objeto.posicion;
      if (s.fijo) {
        // Fijo = pegado a la pantalla. También con la Y hacia arriba: (0,0) es la esquina inferior izquierda.
        s.dibujarEn(r, p.x, r.alto - p.y);
        continue;
      }
      const radio = Math.max(s.anchoFinal, s.altoFinal);
      if (p.x + radio < izq - margen || p.x - radio > izq + r.ancho + margen) continue;
      if (p.y + radio < abajo - margen || p.y - radio > abajo + r.alto + margen) continue;

      // Mundo (Y arriba) → pantalla (Y abajo). La conversión vive en la cámara.
      const enPantalla = cam.mundoAPantalla(p.x, p.y);
      s.dibujarEn(r, enPantalla.x, enPantalla.y);
    }
  }

  /** Destruye todo (al parar o reiniciar el juego). */
  vaciar(): void {
    for (const o of this.objetos) if (!o.destruido) this.destruir(o);
    this.quitarDestruidos();
    this.fisica.reiniciar();
    this.camara.objetivo = null;
    this.camara.limites = null;
    this.iniciada = false;
  }

  private quitarDestruidos(): void {
    if (this.porDestruir.length === 0) return;
    const fuera = new Set(this.porDestruir);
    this.objetos = this.objetos.filter((o) => !fuera.has(o));
    for (const o of fuera) o.escena = null;
    this.porDestruir = [];
  }
}
