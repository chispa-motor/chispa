/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * SistemaFisico: mueve los objetos con Física, los hace chocar y avisa de
 * quién toca a quién.
 *
 * ── DECISIÓN 1: paso fijo (fixed timestep) ──
 * Los scripts van a los FPS del monitor (dt variable), pero la física avanza
 * SIEMPRE en pasos de 1/120 s. Así un salto llega exactamente a la misma
 * altura en cualquier ordenador. Es la idea de FixedUpdate en Unity.
 *
 * ── DECISIÓN 2: mover primero en X y luego en Y (contra paredes y suelos) ──
 * Si moviéramos en diagonal y chocáramos, no sabríamos si hemos chocado con
 * una pared o con el suelo. Moviendo un eje cada vez, la respuesta es obvia.
 *
 * ── DECISIÓN 3: entre objetos con física, separar por el lado más corto ──
 * Cuando dos objetos con física se meten uno dentro del otro, los separamos
 * por el lado donde se solapan menos (como sacar una caja de otra por el
 * camino más corto). El que pesa más (masa) se mueve menos y empuja al otro.
 *
 * Tipos de cosas:
 *   - Cuerpos: con Física y no estáticos. Se mueven y caen.
 *   - Sólidos: con Colisión sólida y sin física (o estáticos). No se mueven: paredes, suelos.
 *   - Fantasmas: con Colisión NO sólida. No se choca con ellos, pero avisan con "cuando toco".
 *   - Casillas de mapas: sólidas o fantasma según su tipo.
 *
 * ── DECISIÓN 4: las figuras (círculos, triángulos, estrellas...) chocan con su forma ──
 * Entre cajas se usa lo de arriba (eje a eje). Si una de las dos es una
 * figura, el choque se calcula con su forma real (formas/sat.ts) y se separa
 * por donde menos se meten. Una rampa (triángulo, línea) que hace de SUELO
 * empuja hacia arriba, no en diagonal: así un personaje no resbala cuesta
 * abajo al estar quieto (salvo que rebote: una pelota sí rueda).
 *
 * Recuerda: en el mundo la Y crece hacia ARRIBA. Caer = velocidad.y negativa.
 */
import type { Escena } from './Escena';
import type { ObjetoJuego } from './ObjetoJuego';
import { RejillaEspacial } from './RejillaEspacial';
import { Colision, seSolapan, type Caja } from './componentes/Colision';
import { Fisica } from './componentes/Fisica';
import { MapaCasillas } from './componentes/MapaCasillas';
import { Recorrido } from './componentes/Recorrido';
import { propio } from '../utilidades/seguro';
import type { Poligono } from './formas/figuras';
import { cajaComoPieza, choqueFiguras, seTocanFiguras } from './formas/sat';

const PASO = 1 / 120;
/**
 * Como mucho, estos pasos por fotograma (1/30 de segundo de física). Si el
 * ordenador va tan lento que haría falta más, el juego va un poco más lento
 * en vez de intentar recuperar: recuperar hace cada fotograma todavía más
 * lento, y el juego se acaba congelando (con 2000 cajas amontonadas pasaba).
 */
const MAX_PASOS = 4;
/** Tolerancia para errores de redondeo (0,1 + 0,2 no es exactamente 0,3 en un ordenador). */
const EPSILON = 0.01;
/** Por debajo de esta velocidad, un rebote se considera "ya ha parado" (si no, rebotaría para siempre con saltitos). */
const REBOTE_MINIMO = 40;
/** Iteraciones para separar objetos con física apilados. */
const ITERACIONES = 4;

interface Cuerpo {
  objeto: ObjetoJuego;
  fisica: Fisica;
  colision: Colision | undefined;
  /** ¿Estaba en el suelo en el paso anterior? (para el rozamiento) */
  apoyado: boolean;
  /** Medio ancho, medio alto y desplazamiento de su caja (se calculan una vez por paso, para ir rápido). */
  medio?: { x: number; y: number; dx: number; dy: number };
}

/** La caja de un cuerpo a partir de su posición y su "medio" (sin crear objetos nuevos si se le pasa uno). */
function cajaRapida(c: Cuerpo, r: Caja): Caja {
  const p = c.objeto.transformacion.posicion;
  const m = c.medio!;
  const cx = p.x + m.dx;
  const cy = p.y + m.dy;
  r.izquierda = cx - m.x;
  r.derecha = cx + m.x;
  r.abajo = cy - m.y;
  r.arriba = cy + m.y;
  return r;
}
const cajaA: Caja = { izquierda: 0, derecha: 0, abajo: 0, arriba: 0 };
const cajaB: Caja = { izquierda: 0, derecha: 0, abajo: 0, arriba: 0 };

interface Colisionador {
  objeto: ObjetoJuego;
  colision: Colision;
}

/** Una caja sólida cerca de un cuerpo: de qué objeto es (para ir montado encima) y si solo para desde arriba. */
interface SolidoCercano {
  caja: Caja;
  objeto: ObjetoJuego;
  soloArriba: boolean;
  /** Si choca con su figura: sus piezas en el mundo. */
  piezas?: Poligono[];
}

/** Una normal más vertical que esto (hacia arriba) es un suelo; hacia abajo, un techo. */
const NORMAL_SUELO = 0.6;
/** Vueltas para sacar un cuerpo de las figuras en las que se ha metido. */
const VUELTAS_FIGURAS = 4;

/** Margen para las plataformas que se atraviesan desde abajo: si los pies estaban a esta distancia de la superficie, cuenta como "encima". */
const MARGEN_ENCIMA = 4;

interface Contacto {
  a: ObjetoJuego;
  b: ObjetoJuego;
  /** Si b es un mapa: el tipo de casilla tocada. */
  casilla?: string;
}

export class SistemaFisico {
  private acumulador = 0;
  private contactos = new Map<number | string, Contacto>();
  private apoyados = new WeakMap<ObjetoJuego, boolean>();
  /** Sobre qué está apoyado cada cuerpo (para moverse con él si se mueve: plataformas). */
  private soportes = new WeakMap<ObjetoJuego, ObjetoJuego>();
  /** Dónde estaba cada soporte en el paso anterior. */
  private previas = new Map<ObjetoJuego, { x: number; y: number }>();

  actualizar(escena: Escena, dt: number): void {
    const { cuerpos, solidos, moviles, recorridos, colisionadores, mapas } = this.clasificar(escena);

    // Rejilla con los sólidos quietos (se consulta en cada paso). Los que tienen
    // recorrido se mueven durante los pasos: van aparte y se miran siempre.
    const rejillaSolidos = new RejillaEspacial<Colisionador>();
    for (const s of solidos) rejillaSolidos.insertar(s.colision.caja(), s);
    const cerca = { rejilla: rejillaSolidos, moviles, mapas };

    this.acumulador += dt;
    let pasos = 0;
    while (this.acumulador >= PASO && pasos < MAX_PASOS) {
      for (const r of recorridos) r.avanzar(PASO);
      this.llevarEncima(cuerpos);
      for (const c of cuerpos) this.moverCuerpo(c, escena.gravedad, cerca);
      this.separarCuerpos(cuerpos, cerca);
      this.acumulador -= PASO;
      pasos++;
    }
    if (pasos === MAX_PASOS) this.acumulador = 0; // el ordenador va muy lento: no intentamos recuperar
    for (const c of cuerpos) this.apoyados.set(c.objeto, c.fisica.enSuelo);

    this.detectarContactos(colisionadores, mapas);
  }

  /**
   * Plataformas que se mueven: lo que está encima se mueve lo mismo que ellas
   * (tanto si van con recorrido como si las mueve un script).
   */
  private llevarEncima(cuerpos: Cuerpo[]): void {
    const actuales = new Map<ObjetoJuego, { x: number; y: number }>();
    for (const c of cuerpos) {
      const s = this.soportes.get(c.objeto);
      if (!s || s.destruido || !c.apoyado) continue;
      const p = s.transformacion.posicion;
      const antes = this.previas.get(s);
      if (antes) {
        c.objeto.transformacion.posicion.x += p.x - antes.x;
        c.objeto.transformacion.posicion.y += p.y - antes.y;
      }
      actuales.set(s, { x: p.x, y: p.y });
    }
    this.previas = actuales;
  }

  /** Olvida todos los contactos (al reiniciar o cambiar de escena). */
  reiniciar(): void {
    this.contactos.clear();
    this.previas.clear();
    this.acumulador = 0;
  }

  private clasificar(escena: Escena) {
    const cuerpos: Cuerpo[] = [];
    const solidos: Colisionador[] = [];
    const moviles: Colisionador[] = [];
    const recorridos: Recorrido[] = [];
    const colisionadores: Colisionador[] = [];
    const mapas: MapaCasillas[] = [];
    for (const objeto of escena.objetos) {
      if (objeto.destruido) continue;
      const mapa = objeto.obtener(MapaCasillas);
      if (mapa?.activo) mapas.push(mapa);
      const recorrido = objeto.obtener(Recorrido);
      const conRecorrido = recorrido !== undefined && recorrido.activo;
      if (conRecorrido) recorridos.push(recorrido);
      const fisica = objeto.obtener(Fisica);
      const colision = objeto.obtener(Colision);
      const tieneColision = colision !== undefined && colision.activo;
      // Un objeto con recorrido lo mueve su recorrido, no la física: es como una pared que se mueve
      const dinamico = fisica !== undefined && fisica.activo && !fisica.estatico && !conRecorrido;
      if (dinamico) cuerpos.push({ objeto, fisica, colision: tieneColision ? colision : undefined, apoyado: this.apoyados.get(objeto) ?? false });
      else if (tieneColision && colision.solido) (conRecorrido ? moviles : solidos).push({ objeto, colision });
      if (tieneColision) colisionadores.push({ objeto, colision });
    }
    return { cuerpos, solidos, moviles, recorridos, colisionadores, mapas };
  }

  // ───────────────────────── Movimiento de un cuerpo ─────────────────────────

  private moverCuerpo(c: Cuerpo, gravedadMundo: number, cerca: Cerca): void {
    const f = c.fisica;
    const pos = c.objeto.transformacion.posicion;
    f.enSuelo = f.tocaTecho = f.tocaPared = false;

    // 1. Gravedad: cambia la velocidad (aceleración). RESTA porque la Y crece hacia arriba.
    f.velocidad.y = Math.max(f.velocidad.y - gravedadMundo * f.gravedad * PASO, -f.velocidadMaximaCaida);

    // 2. Rozamiento: frena en el suelo (o siempre, si no hay gravedad: juegos vistos desde arriba)
    if (f.rozamiento > 0) {
      const frenado = f.rozamiento >= 1 ? 0 : Math.exp(-f.rozamiento * 12 * PASO);
      if (f.gravedad === 0 || gravedadMundo === 0) {
        f.velocidad.x *= frenado;
        f.velocidad.y *= frenado;
      } else if (c.apoyado) {
        f.velocidad.x *= frenado;
      }
    }

    const choca = c.colision?.solido;
    const exacto = !!choca && c.colision!.usaFigura();

    // 3. Si algo que se mueve (una plataforma, un ascensor) se ha metido en el
    //    cuerpo antes de que este se mueva, lo sacamos por el lado más corto.
    //    (Si no, el paso del eje X lo confundiría con una pared.)
    this.soportes.delete(c.objeto); // se vuelve a apuntar si sigue apoyado en algo
    if (choca) this.apartarDeLoQueSeMueve(c, cerca);

    // Los sólidos que puede tocar en este paso (se buscan una vez para los dos ejes)
    const cercanos = choca ? this.solidosCerca(c, cerca, (Math.abs(f.velocidad.x) + Math.abs(f.velocidad.y)) * PASO + 2) : [];

    // 4. Eje X: mover y, si nos metemos en un sólido, salir por el lado por el que entramos
    pos.x += f.velocidad.x * PASO;
    if (choca) {
      for (const { caja: b, soloArriba, piezas } of cercanos) {
        if (soloArriba || piezas || exacto) continue; // las plataformas de "solo desde arriba" no son paredes; las figuras, después
        const a = c.colision!.caja();
        if (!solapanDeVerdad(a, b)) continue;
        const haciaDerecha = f.velocidad.x > 0 || (f.velocidad.x === 0 && centroX(a) < centroX(b));
        pos.x += haciaDerecha ? b.izquierda - a.derecha : b.derecha - a.izquierda;
        f.velocidad.x = rebotar(f.velocidad.x, f.rebote);
        f.tocaPared = true;
      }
    }

    // 5. Eje Y
    const piesAntes = choca ? c.colision!.caja().abajo : 0;
    pos.y += f.velocidad.y * PASO;
    if (choca) {
      for (const { caja: b, objeto: soporte, soloArriba, piezas } of cercanos) {
        if (piezas || exacto) continue;
        const a = c.colision!.caja();
        if (!solapanDeVerdad(a, b)) continue;
        const haciaAbajo = f.velocidad.y < 0 || (f.velocidad.y === 0 && centroY(a) > centroY(b));
        // Plataforma que se atraviesa desde abajo: solo para si cae y los pies ya estaban encima
        if (soloArriba && (f.velocidad.y > 0 || piesAntes < b.arriba - MARGEN_ENCIMA)) continue;
        if (haciaAbajo) {
          pos.y += b.arriba - a.abajo;
          f.enSuelo = true;
          this.apoyarEn(c.objeto, soporte);
        } else {
          pos.y += b.abajo - a.arriba;
          f.tocaTecho = true;
        }
        f.velocidad.y = rebotar(f.velocidad.y, f.rebote);
      }
      // 6. Figuras: con su forma de verdad
      this.chocarFiguras(c, exacto ? cercanos : cercanos.filter((s) => s.piezas), piesAntes);
    }
    c.apoyado = f.enSuelo;
  }

  /**
   * Saca al cuerpo de las figuras en las que se ha metido (o, si el cuerpo es
   * una figura, de todo), por donde menos se mete, y quita la velocidad que
   * lleva contra ellas.
   */
  private chocarFiguras(c: Cuerpo, solidos: SolidoCercano[], piesAntes: number): void {
    if (!solidos.length) return;
    const f = c.fisica;
    const pos = c.objeto.transformacion.posicion;
    for (let vuelta = 0; vuelta < VUELTAS_FIGURAS; vuelta++) {
      const mias = c.colision!.piezas();
      let peor: { s: SolidoCercano; profundidad: number; nx: number; ny: number } | null = null;
      for (const s of solidos) {
        const ch = choqueFiguras(mias, s.piezas ?? [cajaComoPieza(s.caja)]);
        if (!ch || ch.profundidad <= EPSILON) continue;
        // Plataforma de "solo desde arriba": solo si cae sobre ella y los pies estaban encima
        if (s.soloArriba && (ch.ny < NORMAL_SUELO || f.velocidad.y > 0 || piesAntes < s.caja.arriba - MARGEN_ENCIMA)) continue;
        if (!peor || ch.profundidad > peor.profundidad) peor = { s, ...ch };
      }
      if (!peor) return;
      const { nx, ny, profundidad } = peor;
      const suelo = ny > NORMAL_SUELO;
      if (suelo && f.rebote === 0) pos.y += profundidad / ny; // en una rampa, hacia arriba (no resbala)
      else {
        pos.x += nx * profundidad;
        pos.y += ny * profundidad;
      }
      if (suelo) {
        f.enSuelo = true;
        this.apoyarEn(c.objeto, peor.s.objeto);
      } else if (ny < -NORMAL_SUELO) f.tocaTecho = true;
      else f.tocaPared = true;
      // La velocidad que va CONTRA la figura se quita (o rebota)
      const contra = f.velocidad.x * nx + f.velocidad.y * ny;
      if (contra < 0) {
        if (suelo && f.rebote === 0) f.velocidad.y = Math.max(0, f.velocidad.y);
        else {
          const r = Math.abs(contra) * f.rebote < REBOTE_MINIMO ? 1 : 1 + f.rebote;
          f.velocidad.x -= r * contra * nx;
          f.velocidad.y -= r * contra * ny;
        }
      }
    }
  }

  /** Apunta sobre qué está apoyado un cuerpo, y dónde está eso ahora (para llevarlo si se mueve). */
  private apoyarEn(cuerpo: ObjetoJuego, soporte: ObjetoJuego): void {
    this.soportes.set(cuerpo, soporte);
    if (!this.previas.has(soporte)) {
      const p = soporte.transformacion.posicion;
      this.previas.set(soporte, { x: p.x, y: p.y });
    }
  }

  /** Saca al cuerpo de los sólidos con recorrido que se le han metido dentro (por el lado más corto). */
  private apartarDeLoQueSeMueve(c: Cuerpo, cerca: Cerca): void {
    if (cerca.moviles.length === 0) return;
    for (const s of cerca.moviles) {
      if (s.objeto === c.objeto || s.colision.soloDesdeArriba || c.objeto.atraviesaA(s.objeto)) continue;
      const a = c.colision!.caja();
      const b = s.colision.caja();
      if (!solapanDeVerdad(a, b)) continue;
      const pos = c.objeto.transformacion.posicion;
      const opciones = [b.izquierda - a.derecha, b.derecha - a.izquierda, b.abajo - a.arriba, b.arriba - a.abajo];
      const mejor = opciones.reduce((m, v) => (Math.abs(v) < Math.abs(m) ? v : m));
      if (mejor === opciones[0] || mejor === opciones[1]) pos.x += mejor;
      else {
        pos.y += mejor;
        if (mejor === opciones[3]) {
          // Lo ha empujado hacia arriba: está encima (y se irá con él)
          c.fisica.enSuelo = true;
          c.apoyado = true;
          c.fisica.velocidad.y = Math.max(0, c.fisica.velocidad.y);
          this.apoyarEn(c.objeto, s.objeto);
        }
      }
    }
  }

  /** Cajas sólidas cerca de un cuerpo: objetos sólidos (quietos y con recorrido) y casillas sólidas de los mapas. */
  private solidosCerca(c: Cuerpo, cerca: Cerca, margen = 0): SolidoCercano[] {
    const k = c.colision!.caja();
    const caja = margen ? { izquierda: k.izquierda - margen, derecha: k.derecha + margen, abajo: k.abajo - margen, arriba: k.arriba + margen } : k;
    const res: SolidoCercano[] = [];
    const meter = (s: Colisionador) => {
      if (s.objeto === c.objeto || c.objeto.atraviesaA(s.objeto)) return;
      const figura = s.colision.usaFigura();
      res.push({ caja: s.colision.caja(), objeto: s.objeto, soloArriba: s.colision.soloDesdeArriba, piezas: figura ? s.colision.piezas() : undefined });
    };
    for (const s of cerca.rejilla.consultarConGrandes(caja)) meter(s);
    for (const s of cerca.moviles) meter(s);
    for (const m of cerca.mapas) {
      for (const casilla of m.casillasEn(caja)) {
        if (m.esSolida(casilla.tipo)) res.push({ caja: casilla.caja, objeto: m.objeto, soloArriba: propio(m.tipos, casilla.tipo)?.soloDesdeArriba ?? false });
      }
    }
    return res;
  }

  // ───────────────────────── Choques entre cuerpos ─────────────────────────

  /**
   * Separa los cuerpos con física que se han metido uno dentro de otro, y
   * reparte el golpe según la masa (el más pesado se mueve menos).
   */
  private separarCuerpos(cuerpos: Cuerpo[], cerca: Cerca): void {
    const solidosFisicos = cuerpos.filter((c) => c.colision?.solido);
    if (solidosFisicos.length < 2) return;
    const cajas = solidosFisicos.map((c) => c.colision!.caja());
    solidosFisicos.forEach((c, i) => {
      const k = cajas[i];
      const p = c.objeto.transformacion.posicion;
      c.medio = { x: (k.derecha - k.izquierda) / 2, y: (k.arriba - k.abajo) / 2, dx: (k.izquierda + k.derecha) / 2 - p.x, dy: (k.abajo + k.arriba) / 2 - p.y };
    });
    // 1. Qué parejas están cerca (una sola vez por paso: es lo que más cuesta).
    //    "Barrido": se ordenan por su borde izquierdo y cada una solo se compara con
    //    las que empiezan antes de que ella acabe. Sin crear listas por el camino.
    const orden = solidosFisicos.map((_, i) => i).sort((i, j) => cajas[i].izquierda - cajas[j].izquierda);
    const parejas: [Cuerpo, Cuerpo][] = [];
    for (let x = 0; x < orden.length; x++) {
      const ca = cajas[orden[x]];
      for (let y = x + 1; y < orden.length; y++) {
        const cb = cajas[orden[y]];
        if (cb.izquierda > ca.derecha + 2) break;
        if (cb.abajo > ca.arriba + 2 || cb.arriba < ca.abajo - 2) continue;
        const a = solidosFisicos[orden[x]];
        const b = solidosFisicos[orden[y]];
        if (!a.objeto.atraviesaA(b.objeto)) parejas.push([a, b]);
      }
    }
    // 2. Separarlas (varias vueltas: al empujar a uno se puede meter en otro)
    for (let it = 0; it < ITERACIONES; it++) {
      let algo = false;
      for (const [a, b] of parejas) if (this.resolverPareja(a, b)) algo = true;
      if (!algo) break;
    }
    // Si al empujar hemos metido a alguien en una pared, lo sacamos
    for (const c of solidosFisicos) this.sacarDeSolidos(c, cerca);
  }

  private resolverPareja(a: Cuerpo, b: Cuerpo): boolean {
    if (a.colision!.usaFigura() || b.colision!.usaFigura()) return this.resolverParejaFiguras(a, b);
    const ca = cajaRapida(a, cajaA);
    const cb = cajaRapida(b, cajaB);
    if (!solapanDeVerdad(ca, cb)) return false;
    const solapeX = Math.min(ca.derecha - cb.izquierda, cb.derecha - ca.izquierda);
    const solapeY = Math.min(ca.arriba - cb.abajo, cb.arriba - ca.abajo);
    const invA = 1 / Math.max(0.001, a.fisica.masa);
    const invB = 1 / Math.max(0.001, b.fisica.masa);
    const suma = invA + invB;
    const e = Math.max(a.fisica.rebote, b.fisica.rebote);

    if (solapeX < solapeY) {
      const signo = centroX(ca) < centroX(cb) ? 1 : -1; // hacia dónde está b
      a.objeto.posicion.x -= signo * solapeX * (invA / suma);
      b.objeto.posicion.x += signo * solapeX * (invB / suma);
      const relativa = (b.fisica.velocidad.x - a.fisica.velocidad.x) * signo;
      if (relativa < 0) {
        const j = (-(1 + e) * relativa) / suma;
        a.fisica.velocidad.x -= j * invA * signo;
        b.fisica.velocidad.x += j * invB * signo;
      }
      a.fisica.tocaPared = b.fisica.tocaPared = true;
    } else {
      const signo = centroY(ca) < centroY(cb) ? 1 : -1; // 1 = b está encima de a
      a.objeto.posicion.y -= signo * solapeY * (invA / suma);
      b.objeto.posicion.y += signo * solapeY * (invB / suma);
      const relativa = (b.fisica.velocidad.y - a.fisica.velocidad.y) * signo;
      if (relativa < 0) {
        const j = (-(1 + e) * relativa) / suma;
        a.fisica.velocidad.y -= j * invA * signo;
        b.fisica.velocidad.y += j * invB * signo;
      }
      // El de arriba está "en el suelo" (apoyado sobre el otro)
      const arriba = signo === 1 ? b : a;
      const abajo = signo === 1 ? a : b;
      arriba.fisica.enSuelo = true;
      arriba.apoyado = true;
      abajo.fisica.tocaTecho = true;
    }
    return true;
  }

  /** Dos cuerpos con física que se meten uno en otro, y al menos uno es una figura. */
  private resolverParejaFiguras(a: Cuerpo, b: Cuerpo): boolean {
    const ch = choqueFiguras(a.colision!.piezas(), b.colision!.piezas());
    if (!ch || ch.profundidad <= EPSILON) return false;
    const invA = 1 / Math.max(0.001, a.fisica.masa);
    const invB = 1 / Math.max(0.001, b.fisica.masa);
    const suma = invA + invB;
    const { nx, ny, profundidad } = ch; // hacia dónde sale a
    a.objeto.posicion.x += nx * profundidad * (invA / suma);
    a.objeto.posicion.y += ny * profundidad * (invA / suma);
    b.objeto.posicion.x -= nx * profundidad * (invB / suma);
    b.objeto.posicion.y -= ny * profundidad * (invB / suma);
    const relativa = (a.fisica.velocidad.x - b.fisica.velocidad.x) * nx + (a.fisica.velocidad.y - b.fisica.velocidad.y) * ny;
    if (relativa < 0) {
      const e = Math.max(a.fisica.rebote, b.fisica.rebote);
      const j = (-(1 + e) * relativa) / suma;
      a.fisica.velocidad.x += j * invA * nx;
      a.fisica.velocidad.y += j * invA * ny;
      b.fisica.velocidad.x -= j * invB * nx;
      b.fisica.velocidad.y -= j * invB * ny;
    }
    if (ny > NORMAL_SUELO) {
      a.fisica.enSuelo = a.apoyado = true;
      b.fisica.tocaTecho = true;
    } else if (ny < -NORMAL_SUELO) {
      b.fisica.enSuelo = b.apoyado = true;
      a.fisica.tocaTecho = true;
    } else a.fisica.tocaPared = b.fisica.tocaPared = true;
    return true;
  }

  /** Saca un cuerpo de las paredes por el lado más corto (sin rebotes). */
  private sacarDeSolidos(c: Cuerpo, cerca: Cerca): void {
    const cercanos = this.solidosCerca(c, cerca);
    if (c.colision!.usaFigura() || cercanos.some((s) => s.piezas)) {
      // Con figuras, como al moverse (sin rebotar)
      const rebote = c.fisica.rebote;
      c.fisica.rebote = 0;
      this.chocarFiguras(c, c.colision!.usaFigura() ? cercanos.filter((s) => !s.soloArriba) : cercanos.filter((s) => s.piezas && !s.soloArriba), -Infinity);
      c.fisica.rebote = rebote;
      if (c.colision!.usaFigura()) return;
    }
    for (const { caja: b, soloArriba, piezas } of cercanos) {
      if (soloArriba || piezas) continue;
      const a = c.colision!.caja();
      if (!solapanDeVerdad(a, b)) continue;
      const izq = b.izquierda - a.derecha;
      const der = b.derecha - a.izquierda;
      const aba = b.abajo - a.arriba;
      const arr = b.arriba - a.abajo;
      const opciones = [izq, der, aba, arr];
      const mejor = opciones.reduce((m, v) => (Math.abs(v) < Math.abs(m) ? v : m));
      if (mejor === izq || mejor === der) {
        c.objeto.posicion.x += mejor;
        c.fisica.velocidad.x = 0;
      } else {
        c.objeto.posicion.y += mejor;
        if (mejor === arr) c.fisica.enSuelo = true;
        c.fisica.velocidad.y = 0;
      }
    }
  }

  // ───────────────────────── Contactos ("cuando toco") ─────────────────────────

  /**
   * Busca qué pares de cosas se tocan y avisa de los contactos NUEVOS y de los
   * que se han TERMINADO. Solo se comprueba desde los objetos que se mueven o
   * que escuchan contactos (tienen un script): dos paredes que se tocan no
   * le interesan a nadie.
   */
  private detectarContactos(colisionadores: Colisionador[], mapas: MapaCasillas[]): void {
    const cajas = colisionadores.map((c) => c.colision.caja());
    const rejilla = new RejillaEspacial<Colisionador>(tamanoDeCelda(cajas));
    colisionadores.forEach((c, i) => rejilla.insertar(cajas[i], c));

    const nuevos = new Map<number | string, Contacto>();
    for (const a of colisionadores) {
      // Solo se buscan los contactos desde quien los escucha (un script con «cuando toco»...):
      // con 2000 cajas con física amontonadas, buscarlos todos era la mitad del tiempo del juego
      if (!escuchaContactos(a.objeto)) continue;
      const cajaA = a.colision.caja();
      // Con otros objetos
      for (const b of rejilla.consultarConGrandes(cajaA)) {
        if (b.objeto === a.objeto) continue;
        const clave = claveContacto(a.objeto, b.objeto);
        if (nuevos.has(clave)) continue;
        // margen 1: si estás apoyado en el suelo, lo sigues "tocando" aunque no te hundas en él
        if (seSolapan(cajaA, b.colision.caja(), 1) && tocanDeVerdad(a.colision, b.colision)) nuevos.set(clave, { a: a.objeto, b: b.objeto });
      }
      // Con casillas de mapas (un contacto por cada TIPO de casilla)
      for (const m of mapas) {
        if (m.objeto === a.objeto) continue;
        for (const casilla of m.casillasEn(cajaA, 1)) {
          if (!seSolapan(cajaA, casilla.caja, 1)) continue;
          if (a.colision.usaFigura() && !seTocanFiguras(a.colision.piezas(), [cajaComoPieza(casilla.caja)], 1)) continue;
          const clave = `${a.objeto.id}-m${m.objeto.id}:${casilla.tipo}`;
          if (!nuevos.has(clave)) nuevos.set(clave, { a: a.objeto, b: m.objeto, casilla: casilla.tipo });
        }
      }
    }

    const anteriores = this.contactos;
    this.contactos = nuevos;
    for (const [clave, c] of nuevos) {
      if (anteriores.has(clave)) continue;
      avisar(c.a, c.b, 'alTocar', c.casilla);
      avisar(c.b, c.a, 'alTocar', c.casilla);
    }
    for (const [clave, c] of anteriores) {
      if (nuevos.has(clave)) continue;
      avisar(c.a, c.b, 'alDejarDeTocar', c.casilla);
      avisar(c.b, c.a, 'alDejarDeTocar', c.casilla);
    }
  }
}

/** Si alguno de los dos es una figura, ¿se tocan de verdad? (sus cajas ya se tocan) */
export function tocanDeVerdad(a: Colision, b: Colision, margen = 1): boolean {
  if (!a.usaFigura() && !b.usaFigura()) return true;
  return seTocanFiguras(a.piezas(), b.piezas(), margen);
}

/** ¿Tiene este objeto quien escuche sus contactos? (si ninguno de los dos escucha, a nadie le importa que se toquen) */
function escuchaContactos(o: ObjetoJuego): boolean {
  return o.todosLosComponentes.some((c) => c.activo && (c.alTocar || c.alDejarDeTocar) && (c.escuchaContactos?.() ?? true));
}

function avisar(a: ObjetoJuego, b: ObjetoJuego, evento: 'alTocar' | 'alDejarDeTocar', casilla?: string): void {
  if (a.destruido || b.destruido) return;
  for (const comp of a.todosLosComponentes) if (comp.activo) comp[evento]?.(b, casilla);
}

/** Una clave numérica por pareja (crear un texto por pareja en cada fotograma costaba mucho). */
function claveContacto(a: ObjetoJuego, b: ObjetoJuego): number {
  return a.id < b.id ? a.id * 4_194_304 + b.id : b.id * 4_194_304 + a.id;
}

/**
 * Tamaño de las celdas de la rejilla según lo grandes que son los objetos:
 * unas dos veces su tamaño medio. Con celdas muy grandes, cada celda tiene
 * demasiados objetos; con celdas muy pequeñas, cada objeto ocupa muchas.
 */
function tamanoDeCelda(cajas: Caja[]): number {
  if (cajas.length === 0) return 128;
  let suma = 0;
  for (const c of cajas) suma += Math.max(c.derecha - c.izquierda, c.arriba - c.abajo);
  return Math.min(256, Math.max(32, (2 * suma) / cajas.length));
}

function rebotar(v: number, rebote: number): number {
  const r = -v * rebote;
  return Math.abs(r) < REBOTE_MINIMO ? 0 : r;
}

function solapanDeVerdad(a: Caja, b: Caja): boolean {
  return a.izquierda < b.derecha - EPSILON && a.derecha > b.izquierda + EPSILON && a.abajo < b.arriba - EPSILON && a.arriba > b.abajo + EPSILON;
}

/** Lo que hace falta para buscar sólidos cerca de un cuerpo. */
interface Cerca {
  rejilla: RejillaEspacial<Colisionador>;
  moviles: Colisionador[];
  mapas: MapaCasillas[];
}

const centroX = (c: Caja) => (c.izquierda + c.derecha) / 2;
const centroY = (c: Caja) => (c.arriba + c.abajo) / 2;
