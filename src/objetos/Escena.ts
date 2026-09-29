/**
 * Escena: el "mundo" donde viven los objetos. Como el Workspace de Roblox.
 *
 * Orden de cada fotograma:
 *   1. Clics encima de objetos (botones)
 *   2. Scripts y demás componentes (actualizar)
 *   3. Física (pasos fijos) + avisos de contacto
 *   4. Partículas y cámara
 *   5. Quitar los objetos destruidos
 *   6. Dibujar: primero el mundo (con cámara y zoom), luego la interfaz fija encima
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
import { Camara, type Limites } from './Camara';
import { ObjetoJuego } from './ObjetoJuego';
import { Particulas } from './Particulas';
import { SistemaFisico } from './SistemaFisico';
import { Colision, type Caja } from './componentes/Colision';
import { GRAVEDAD_MUNDO } from './componentes/Fisica';
import { MapaCasillas } from './componentes/MapaCasillas';
import { Sprite } from './componentes/Sprite';

export class Escena implements EscenaActiva {
  objetos: ObjetoJuego[] = [];
  readonly camara: Camara;
  readonly particulas = new Particulas();
  /** Gravedad de esta escena en píxeles/segundo² (0 = sin gravedad, para juegos vistos desde arriba). */
  gravedad = GRAVEDAD_MUNDO;
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

  /** Posición del ratón en el MUNDO (teniendo en cuenta la cámara y el zoom). */
  ratonEnMundo(): Vector2 {
    return this.camara.pantallaAMundo(this.motor.entrada.posicionRaton);
  }

  /** Posición del ratón en la PANTALLA, con la Y hacia arriba (para la interfaz fija). */
  ratonEnPantalla(): Vector2 {
    const p = this.motor.entrada.posicionRaton;
    return new Vector2(p.x, this.motor.renderizador.alto - p.y);
  }

  /** La caja que ocupa un objeto (su colisión o, si no tiene, su dibujo). */
  cajaDe(o: ObjetoJuego): Caja | null {
    const col = o.obtener(Colision);
    if (col) return col.caja();
    const s = o.obtener(Sprite);
    if (!s) return null;
    const { x, y } = o.posicion;
    return { izquierda: x - s.anchoFinal / 2, derecha: x + s.anchoFinal / 2, abajo: y - s.altoFinal / 2, arriba: y + s.altoFinal / 2 };
  }

  /** ¿Está el ratón encima de este objeto? (en la pantalla si es fijo; en el mundo si no) */
  ratonEncima(o: ObjetoJuego): boolean {
    const caja = this.cajaDe(o);
    if (!caja) return false;
    const p = o.obtener(Sprite)?.fijo ? this.ratonEnPantalla() : this.ratonEnMundo();
    return p.x >= caja.izquierda && p.x <= caja.derecha && p.y >= caja.abajo && p.y <= caja.arriba;
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
    this.repartirClic();
    for (const o of [...this.objetos]) {
      if (o.destruido) continue;
      for (const c of o.todosLosComponentes) if (c.activo && !o.destruido) c.actualizar?.(dt);
    }
    this.fisica.actualizar(this, dt);
    this.particulas.actualizar(dt);
    this.camara.actualizar(dt);
    this.quitarDestruidos();
  }

  /**
   * Un clic se entrega al objeto de MÁS ARRIBA que esté bajo el ratón y que
   * escuche clics (la interfaz fija va por encima del mundo). Así, al pulsar
   * un botón, no se "pulsa" también lo que hay detrás.
   */
  private repartirClic(): void {
    if (!this.motor.entrada.ratonSePulso('izquierdo')) return;
    const candidatos = this.objetos.filter((o) => !o.destruido && o.todosLosComponentes.some((c) => c.activo && c.recibeClics?.()) && this.ratonEncima(o));
    if (!candidatos.length) return;
    const orden = (o: ObjetoJuego) => {
      const s = o.obtener(Sprite);
      return (s?.fijo ? 1_000_000 : 0) + (s?.capa ?? 0);
    };
    const elegido = candidatos.reduce((a, b) => (orden(b) >= orden(a) ? b : a));
    for (const c of elegido.todosLosComponentes) if (c.activo && c.recibeClics?.()) c.alHacerClic?.();
  }

  dibujar(r: Renderizador): void {
    const cam = this.camara;
    const ctx = r.ctx;
    const visible = cam.zonaVisible();
    const margen = 64 / cam.zoom;
    const centro = cam.centroDibujo();

    // Qué se dibuja, ordenado por capa (sort es "estable": a igual capa, se respeta el orden de creación)
    const mundo: { capa: number; dibujar: () => void }[] = [];
    const interfaz: Sprite[] = [];
    // Dentro de la transformación de la cámara, un punto del mundo se dibuja en (x - centroX, centroY - y)
    const aLocal = (x: number, y: number) => ({ x: x - centro.x, y: centro.y - y });

    for (const o of this.objetos) {
      if (o.destruido) continue;
      const mapa = o.obtener(MapaCasillas);
      if (mapa?.activo) mundo.push({ capa: mapa.capa, dibujar: () => mapa.dibujarVisibles(r, visible, aLocal) });
      const s = o.obtener(Sprite);
      if (!s || !s.activo || !s.visible) continue;
      if (s.fijo) {
        interfaz.push(s);
        continue;
      }
      const p = o.posicion;
      const radio = Math.max(s.anchoFinal, s.altoFinal);
      if (p.x + radio < visible.izquierda - margen || p.x - radio > visible.derecha + margen) continue;
      if (p.y + radio < visible.abajo - margen || p.y - radio > visible.arriba + margen) continue;
      mundo.push({ capa: s.capa, dibujar: () => {
        const l = aLocal(p.x, p.y);
        s.dibujarEn(r, l.x, l.y);
      } });
    }
    mundo.sort((a, b) => a.capa - b.capa);

    // 1. El mundo, con la cámara: centro de la pantalla + zoom (la Y se da la vuelta en aLocal)
    ctx.save();
    ctx.translate(r.ancho / 2, r.alto / 2);
    ctx.scale(cam.zoom, cam.zoom);
    for (const m of mundo) m.dibujar();
    this.particulas.dibujar(r, aLocal);
    ctx.restore();

    // 2. La interfaz, pegada a la pantalla: (0,0) es la esquina inferior izquierda
    interfaz.sort((a, b) => a.capa - b.capa);
    for (const s of interfaz) s.dibujarEn(r, s.objeto.posicion.x, r.alto - s.objeto.posicion.y);
  }

  /** La zona que ocupan todos los mapas de casillas (para que la cámara no salga de ellos). */
  limitesDeLosMapas(): Limites | null {
    let r: Limites | null = null;
    for (const o of this.objetos) {
      const l = o.destruido ? null : o.obtener(MapaCasillas)?.limites();
      if (!l) continue;
      r = r
        ? { izquierda: Math.min(r.izquierda, l.izquierda), abajo: Math.min(r.abajo, l.abajo), derecha: Math.max(r.derecha, l.derecha), arriba: Math.max(r.arriba, l.arriba) }
        : { ...l };
    }
    return r;
  }

  /** Destruye todo (al parar, reiniciar o cambiar de escena). */
  vaciar(): void {
    for (const o of this.objetos) if (!o.destruido) this.destruir(o);
    this.quitarDestruidos();
    this.fisica.reiniciar();
    this.particulas.vaciar();
    this.camara.objetivo = null;
    this.camara.limites = null;
    this.camara.zoom = 1;
    this.camara.posicion = new Vector2(this.motor.renderizador.ancho / 2, this.motor.renderizador.alto / 2);
    this.gravedad = GRAVEDAD_MUNDO;
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
