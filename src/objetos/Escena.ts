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
import { Fisica } from './componentes/Fisica';
import { AnimadorDeValores } from './AnimadorDeValores';
import { resolverColor } from '../motor/Color';
import type { CajaDialogo } from './Dialogo';

/** Algo dibujado con dibujar.linea(), dibujar.circulo()... Dura un fotograma. Coordenadas del mundo. */
export type DibujoDepuracion = (
  | { tipo: 'linea'; x1: number; y1: number; x2: number; y2: number; color: string; grosor: number }
  | { tipo: 'circulo'; x: number; y: number; radio: number; color: string; relleno: boolean }
  | { tipo: 'rectangulo'; x: number; y: number; ancho: number; alto: number; color: string; relleno: boolean }
  | { tipo: 'texto'; texto: string; x: number; y: number; color: string; tamano: number }
  /** Ángulos en grados, como en matemáticas: 0 = derecha, 90 = arriba. */
  | { tipo: 'arco'; x: number; y: number; radio: number; desde: number; hasta: number; color: string; relleno: boolean; grosor: number }
) & {
  /** En la pantalla (como la interfaz), no en el mundo. */
  fijo?: boolean;
};

export class Escena implements EscenaActiva {
  objetos: ObjetoJuego[] = [];
  readonly camara: Camara;
  readonly particulas = new Particulas();
  /** Gravedad de esta escena en píxeles/segundo² (0 = sin gravedad, para juegos vistos desde arriba). */
  gravedad = GRAVEDAD_MUNDO;
  iniciada = false;
  private porDestruir: ObjetoJuego[] = [];
  private fisica = new SistemaFisico();
  /** Valores que cambian poco a poco (animar(), yo.irA(), yo.parpadear()...). */
  readonly animaciones = new AnimadorDeValores();
  /** Lo que se dibuja con dibujar.xxx() en este fotograma. */
  dibujos: DibujoDepuracion[] = [];
  /** Oscurecer la pantalla (fundido): de 0 (nada) a 1 (todo del color). Sigue igual al cambiar de escena. */
  readonly fundido = { alfa: 0, objetivo: 0, velocidad: 0, color: 'negro' };
  /** Quien sabe hacer copias de objetos con sus scripts (el juego en marcha). Sin él, clonar() no funciona. */
  clonador: ((o: ObjetoJuego) => ObjetoJuego) | null = null;
  /** El objeto que se está arrastrando con el ratón (y dónde se cogió). */
  private arrastre: { objeto: ObjetoJuego; dx: number; dy: number } | null = null;
  /** Diálogos pedidos con dialogo(): se enseñan de uno en uno y, mientras, el juego se para. */
  dialogos: CajaDialogo[] = [];

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
    // Con un diálogo abierto se siguen viendo los dibujos del último fotograma (la interfaz no desaparece)
    if (this.dialogos.length) return this.actualizarDialogo();
    this.dibujos = [];
    this.repartirClic();
    this.empezarArrastre();
    for (const o of [...this.objetos]) {
      if (o.destruido) continue;
      for (const c of o.todosLosComponentes) if (c.activo && !o.destruido) c.actualizar?.(dt);
    }
    this.fisica.actualizar(this, dt);
    this.animaciones.actualizar(dt);
    this.moverHijos();
    this.seguirArrastre();
    this.particulas.actualizar(dt);
    this.camara.actualizar(dt);
    this.actualizarFundido(this.motor.tiempo.deltaReal);
    this.quitarDestruidos();
  }

  /** Con un diálogo abierto solo se mueve el diálogo (en tiempo real: da igual la cámara lenta). */
  private actualizarDialogo(): void {
    const d = this.dialogos[0];
    const p = this.motor.entrada.posicionRaton;
    d.actualizar(this.motor.tiempo.deltaReal, this.motor.entrada, { x: p.x, y: p.y });
    if (d.terminado) this.dialogos.shift();
    this.actualizarFundido(this.motor.tiempo.deltaReal);
  }

  /** ¿Está el juego parado por un diálogo? */
  get enDialogo(): boolean {
    return this.dialogos.length > 0;
  }

  // ───────────────────────── Padres e hijos ─────────────────────────

  /** Cada hijo se mueve lo mismo que se ha movido su padre (primero los padres, luego sus hijos). */
  private moverHijos(): void {
    const conPadre = this.objetos.filter((o) => o.padre && !o.destruido);
    if (!conPadre.length) return;
    const profundidad = (o: ObjetoJuego) => {
      let n = 0;
      for (let p = o.padre; p; p = p.padre) n++;
      return n;
    };
    conPadre.sort((a, b) => profundidad(a) - profundidad(b));
    for (const o of conPadre) {
      const padre = o.padre!;
      // Si se destruye el padre, sus hijos también (como en Roblox y en Godot)
      if (padre.destruido) {
        this.destruir(o);
        continue;
      }
      const antes = o.posicionPadre ?? padre.posicion.copiar();
      o.posicion.x += padre.posicion.x - antes.x;
      o.posicion.y += padre.posicion.y - antes.y;
      o.posicionPadre = padre.posicion.copiar();
    }
  }

  // ───────────────────────── Arrastrar con el ratón ─────────────────────────

  /** El objeto de más arriba que hay bajo el ratón (o null). La interfaz va por encima del mundo. */
  objetoBajoRaton(filtro: (o: ObjetoJuego) => boolean = () => true): ObjetoJuego | null {
    let elegido: ObjetoJuego | null = null;
    let mejor = -Infinity;
    for (const o of this.objetos) {
      if (o.destruido || o.obtener(MapaCasillas) || !filtro(o)) continue;
      const s = o.obtener(Sprite);
      if (s && !s.visible) continue;
      if (!this.ratonEncima(o)) continue;
      const orden = (s?.fijo ? 1_000_000 : 0) + (s?.capa ?? 0);
      if (orden >= mejor) {
        mejor = orden;
        elegido = o;
      }
    }
    return elegido;
  }

  private empezarArrastre(): void {
    const e = this.motor.entrada;
    if (this.arrastre && (!e.ratonPulsado('izquierdo') || this.arrastre.objeto.destruido)) this.arrastre = null;
    if (!e.ratonSePulso('izquierdo')) return;
    const o = this.objetoBajoRaton((x) => x.arrastrable);
    if (!o) return;
    const r = o.obtener(Sprite)?.fijo ? this.ratonEnPantalla() : this.ratonEnMundo();
    this.arrastre = { objeto: o, dx: o.posicion.x - r.x, dy: o.posicion.y - r.y };
  }

  private seguirArrastre(): void {
    const a = this.arrastre;
    if (!a) return;
    if (!a.objeto.arrastrable || a.objeto.destruido) {
      this.arrastre = null;
      return;
    }
    const r = a.objeto.obtener(Sprite)?.fijo ? this.ratonEnPantalla() : this.ratonEnMundo();
    a.objeto.posicion.x = r.x + a.dx;
    a.objeto.posicion.y = r.y + a.dy;
    // Mientras lo llevas en la mano, no cae
    const f = a.objeto.obtener(Fisica);
    if (f) f.velocidad.x = f.velocidad.y = 0;
  }

  /** ¿Se está arrastrando este objeto ahora mismo? */
  arrastrando(o: ObjetoJuego): boolean {
    return this.arrastre?.objeto === o;
  }

  // ───────────────────────── Fundidos ─────────────────────────

  /** Oscurece (hasta = 1) o aclara (hasta = 0) la pantalla en esos segundos. */
  fundir(hasta: number, segundos: number, color?: string): void {
    const f = this.fundido;
    if (color) f.color = color;
    f.objetivo = hasta;
    if (segundos <= 0) f.alfa = hasta;
    f.velocidad = segundos <= 0 ? 0 : Math.abs(hasta - f.alfa) / segundos;
  }

  private actualizarFundido(dt: number): void {
    const f = this.fundido;
    if (f.alfa === f.objetivo) return;
    const paso = f.velocidad * dt;
    f.alfa = f.alfa < f.objetivo ? Math.min(f.objetivo, f.alfa + paso) : Math.max(f.objetivo, f.alfa - paso);
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
    this.dibujarDepuracion(r, aLocal, false);
    ctx.restore();

    // 2. La interfaz, pegada a la pantalla: (0,0) es la esquina inferior izquierda
    //    Primero lo dibujado con dibujar.enPantalla (barras, iconos...) y encima los objetos
    //    de la interfaz: así un texto o un panel de pausa siempre se ven por encima.
    this.dibujarDepuracion(r, (x, y) => ({ x, y: r.alto - y }), true);
    interfaz.sort((a, b) => a.capa - b.capa);
    for (const s of interfaz) s.dibujarEn(r, s.objeto.posicion.x, r.alto - s.objeto.posicion.y);

    // 3. El fundido, encima de todo
    if (this.fundido.alfa > 0) {
      ctx.save();
      ctx.globalAlpha = this.fundido.alfa;
      ctx.fillStyle = resolverColor(this.fundido.color);
      ctx.fillRect(0, 0, r.ancho, r.alto);
      ctx.restore();
    }
    // 4. El diálogo, lo último (se tiene que leer aunque la pantalla esté oscura)
    this.dialogos[0]?.dibujar(r);
  }

  /** Líneas, círculos, arcos... de dibujar.xxx(): los de este fotograma (se borran al empezar el siguiente). */
  private dibujarDepuracion(r: Renderizador, aLocal: (x: number, y: number) => { x: number; y: number }, fijos: boolean): void {
    if (!this.dibujos.length) return;
    for (const d of this.dibujos) {
      if (!!d.fijo !== fijos) continue;
      if (d.tipo === 'arco') {
        const c = aLocal(d.x, d.y);
        const ctx = r.ctx;
        ctx.beginPath();
        // En el lienzo la Y va hacia abajo: los ángulos se dan la vuelta
        if (d.relleno) ctx.moveTo(c.x, c.y);
        ctx.arc(c.x, c.y, Math.max(0, d.radio), (-d.desde * Math.PI) / 180, (-d.hasta * Math.PI) / 180, d.hasta > d.desde);
        if (d.relleno) {
          ctx.closePath();
          ctx.fillStyle = resolverColor(d.color);
          ctx.fill();
        } else {
          ctx.strokeStyle = resolverColor(d.color);
          ctx.lineWidth = d.grosor;
          ctx.stroke();
        }
      } else if (d.tipo === 'linea') {
        const a = aLocal(d.x1, d.y1);
        const b = aLocal(d.x2, d.y2);
        r.linea(a.x, a.y, b.x, b.y, d.color, d.grosor);
      } else if (d.tipo === 'circulo') {
        const c = aLocal(d.x, d.y);
        r.circulo(c.x, c.y, d.radio, d.color, { relleno: d.relleno });
      } else if (d.tipo === 'rectangulo') {
        // (x, y) es el centro, como en los objetos
        const c = aLocal(d.x, d.y);
        r.rectangulo(c.x - d.ancho / 2, c.y - d.alto / 2, d.ancho, d.alto, d.color, { relleno: d.relleno });
      } else {
        const c = aLocal(d.x, d.y);
        r.texto(d.texto, c.x, c.y, { color: d.color, tamano: d.tamano });
      }
    }
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
    this.animaciones.vaciar();
    this.dibujos = [];
    this.arrastre = null;
    this.dialogos = [];
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
