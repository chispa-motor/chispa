/**
 * SistemaFisico: mueve los objetos con Física, los hace chocar con los
 * sólidos y avisa de quién toca a quién.
 *
 * ── DECISIÓN 1: paso fijo (fixed timestep) ──
 * Los scripts van a los FPS del monitor (dt variable), pero la física avanza
 * SIEMPRE en pasos de 1/120 s. Si en un fotograma han pasado 1/60 s, hacemos
 * 2 pasos; si han pasado 1/240 s, a lo mejor ninguno (y se acumula para el
 * siguiente). Así un salto llega exactamente a la misma altura en cualquier
 * ordenador. Es la idea de FixedUpdate en Unity.
 * (Versión simple: no interpolamos entre pasos. Con pasos de 1/120 s apenas se nota.)
 *
 * ── DECISIÓN 2: mover primero en X y luego en Y ──
 * Si moviéramos en diagonal y chocáramos, no sabríamos si hemos chocado con
 * una pared o con el suelo. Moviendo un eje cada vez, la respuesta es obvia:
 * si al mover en X chocamos → pared. Si al mover en Y hacia abajo → suelo.
 *
 * Recuerda: en el mundo la Y crece hacia ARRIBA. Caer = velocidad.y negativa.
 *
 * ── DECISIÓN 3: los objetos con física no se empujan entre sí ──
 * Solo chocan con los sólidos SIN física (suelos, paredes). Entre ellos
 * (jugador y enemigo) solo se avisan con "tocar". Mucho más simple y es lo
 * que quieres en un juego de plataformas.
 */
import type { Escena } from './Escena';
import type { ObjetoJuego } from './ObjetoJuego';
import { Colision, seSolapan, type Caja } from './componentes/Colision';
import { Fisica, GRAVEDAD_MUNDO } from './componentes/Fisica';

const PASO = 1 / 120;
const MAX_PASOS = 12;
/** Tolerancia para errores de redondeo (0,1 + 0,2 no es exactamente 0,3 en un ordenador). */
const EPSILON = 0.01;

interface Cuerpo {
  objeto: ObjetoJuego;
  fisica: Fisica;
  colision: Colision | undefined;
}

export class SistemaFisico {
  private acumulador = 0;
  /** Contactos activos: "idA-idB" → [a, b]. Sirve para saber cuándo EMPIEZA y ACABA un contacto. */
  private contactos = new Map<string, [ObjetoJuego, ObjetoJuego]>();

  actualizar(escena: Escena, dt: number): void {
    const { cuerpos, solidos, colisionadores } = this.clasificar(escena);

    this.acumulador += dt;
    let pasos = 0;
    while (this.acumulador >= PASO && pasos < MAX_PASOS) {
      for (const c of cuerpos) this.paso(c, solidos);
      this.acumulador -= PASO;
      pasos++;
    }
    if (pasos === MAX_PASOS) this.acumulador = 0; // el ordenador va muy lento: no intentamos recuperar

    this.detectarContactos(cuerpos, colisionadores);
  }

  /** Olvida todos los contactos (al reiniciar la escena). */
  reiniciar(): void {
    this.contactos.clear();
    this.acumulador = 0;
  }

  private clasificar(escena: Escena) {
    const cuerpos: Cuerpo[] = [];
    const solidos: { objeto: ObjetoJuego; colision: Colision }[] = [];
    const colisionadores: { objeto: ObjetoJuego; colision: Colision }[] = [];
    for (const objeto of escena.objetos) {
      if (objeto.destruido) continue;
      const fisica = objeto.obtener(Fisica);
      const colision = objeto.obtener(Colision);
      const tieneColision = colision && colision.activo;
      if (fisica && fisica.activo && !fisica.estatico)
        cuerpos.push({ objeto, fisica, colision: tieneColision ? colision : undefined });
      else if (tieneColision && colision.solido) solidos.push({ objeto, colision });
      if (tieneColision) colisionadores.push({ objeto, colision });
    }
    return { cuerpos, solidos, colisionadores };
  }

  /** Un paso de física para un cuerpo. */
  private paso(c: Cuerpo, solidos: { objeto: ObjetoJuego; colision: Colision }[]): void {
    const f = c.fisica;
    const pos = c.objeto.transformacion.posicion;
    f.enSuelo = f.tocaTecho = f.tocaPared = false;

    // Gravedad: cambia la velocidad (aceleración), no la posición directamente.
    // La gravedad tira hacia abajo: RESTA a la velocidad vertical (la Y crece hacia arriba).
    f.velocidad.y = Math.max(f.velocidad.y - GRAVEDAD_MUNDO * f.gravedad * PASO, -f.velocidadMaximaCaida);

    const choca = c.colision?.solido;

    // ── Eje X ──
    pos.x += f.velocidad.x * PASO;
    if (choca) {
      for (const s of solidos) {
        const a = c.colision!.caja();
        const b = s.colision.caja();
        if (!solapanDeVerdad(a, b)) continue;
        // Si vamos hacia la derecha, nos colocamos a la izquierda del sólido, y al revés.
        const haciaDerecha = f.velocidad.x > 0 || (f.velocidad.x === 0 && centroX(a) < centroX(b));
        pos.x += haciaDerecha ? b.izquierda - a.derecha : b.derecha - a.izquierda;
        f.velocidad.x = 0;
        f.tocaPared = true;
      }
    }

    // ── Eje Y ──
    pos.y += f.velocidad.y * PASO;
    if (choca) {
      for (const s of solidos) {
        const a = c.colision!.caja();
        const b = s.colision.caja();
        if (!solapanDeVerdad(a, b)) continue;
        const haciaAbajo = f.velocidad.y < 0 || (f.velocidad.y === 0 && centroY(a) > centroY(b));
        if (haciaAbajo) {
          pos.y += b.arriba - a.abajo;
          f.enSuelo = true;
        } else {
          pos.y += b.abajo - a.arriba;
          f.tocaTecho = true;
        }
        f.velocidad.y = 0;
      }
    }
  }

  /**
   * Busca qué pares de objetos se tocan y avisa de los contactos NUEVOS y
   * de los que se han TERMINADO. Solo miramos pares donde al menos uno se
   * mueve (dos suelos quietos no nos interesan): así es mucho más rápido.
   */
  private detectarContactos(cuerpos: Cuerpo[], colisionadores: { objeto: ObjetoJuego; colision: Colision }[]): void {
    const nuevos = new Map<string, [ObjetoJuego, ObjetoJuego]>();
    for (const c of cuerpos) {
      if (!c.colision) continue;
      const a = c.colision.caja();
      for (const otro of colisionadores) {
        if (otro.objeto === c.objeto) continue;
        const clave = claveContacto(c.objeto, otro.objeto);
        if (nuevos.has(clave)) continue;
        // margen 1: si estás apoyado en el suelo, lo sigues "tocando" aunque no te hundas en él.
        if (seSolapan(a, otro.colision.caja(), 1)) nuevos.set(clave, [c.objeto, otro.objeto]);
      }
    }

    const anteriores = this.contactos;
    this.contactos = nuevos;

    for (const [clave, [a, b]] of nuevos) {
      if (anteriores.has(clave)) continue;
      avisar(a, b, 'alTocar');
      avisar(b, a, 'alTocar');
    }
    for (const [clave, [a, b]] of anteriores) {
      if (nuevos.has(clave)) continue;
      avisar(a, b, 'alDejarDeTocar');
      avisar(b, a, 'alDejarDeTocar');
    }
  }
}

function avisar(a: ObjetoJuego, b: ObjetoJuego, evento: 'alTocar' | 'alDejarDeTocar'): void {
  if (a.destruido || b.destruido) return;
  for (const comp of a.todosLosComponentes) if (comp.activo) comp[evento]?.(b);
}

function claveContacto(a: ObjetoJuego, b: ObjetoJuego): string {
  return a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
}

function solapanDeVerdad(a: Caja, b: Caja): boolean {
  return (
    a.izquierda < b.derecha - EPSILON &&
    a.derecha > b.izquierda + EPSILON &&
    a.abajo < b.arriba - EPSILON &&
    a.arriba > b.abajo + EPSILON
  );
}

const centroX = (c: Caja) => (c.izquierda + c.derecha) / 2;
const centroY = (c: Caja) => (c.arriba + c.abajo) / 2;
