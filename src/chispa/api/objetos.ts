/**
 * OBJETOS DEL JUEGO VISTOS DESDE CHISPA: yo, otro, y lo que devuelven crear() y buscar().
 *
 * RefObjeto es un "anfitrión" que envuelve un ObjetoJuego del motor y traduce
 * nombres en español a sus componentes:
 *     yo.velocidad  → componente Física
 *     yo.color      → componente Sprite
 *     yo.x          → Transformación
 *     yo.vida       → propiedad inventada por quien programa (como un Attribute de Roblox)
 */
import { argNumero, comoLogico, comoNumero, comoVector } from './argumentos';
import { ErrorChispa } from '../errores/ErrorChispa';
import { sugerir } from '../errores/sugerencias';
import type { Posicion } from '../lexico/tokens';
import { Anfitrion, FuncionNativa, aTexto, copiarSiVector, nombreTipo, type Valor } from '../ejecucion/valores';
import { Vector2 } from '../../motor/Vector2';
import type { ObjetoJuego } from '../../objetos/ObjetoJuego';
import { Colision } from '../../objetos/componentes/Colision';
import { Fisica } from '../../objetos/componentes/Fisica';
import { Sprite } from '../../objetos/componentes/Sprite';
import { Animador } from '../../objetos/componentes/Animador';
import { MapaCasillas } from '../../objetos/componentes/MapaCasillas';
import { argTexto } from './argumentos';
import { enumerar } from '../errores/sugerencias';
import { normalizar } from '../../utilidades/texto';

/** Una sola RefObjeto por objeto: así `otro == jugador` funciona (mismo objeto = misma referencia). */
const referencias = new WeakMap<ObjetoJuego, RefObjeto>();
export function referencia(o: ObjetoJuego): RefObjeto {
  let r = referencias.get(o);
  if (!r) referencias.set(o, (r = new RefObjeto(o)));
  return r;
}

/** Comprueba que un argumento es un objeto del juego. */
export function argObjeto(args: Valor[], i: number, funcion: string, pos: Posicion, ejemplo: string): ObjetoJuego {
  const v = args[i];
  if (!(v instanceof RefObjeto)) {
    throw new ErrorChispa(
      pos,
      v === null
        ? `a '${funcion}' le has dado un objeto vacío (nulo): ese objeto no existe.`
        : `'${funcion}' necesita un objeto del juego, pero le das ${v === undefined ? 'nada' : nombreTipo(v)}.`,
      `Ejemplo: ${ejemplo}`,
    );
  }
  return v.objeto;
}

function necesitaFisica(o: ObjetoJuego, prop: string, pos: Posicion): Fisica {
  const f = o.obtener(Fisica);
  if (!f) {
    throw new ErrorChispa(pos, `el objeto '${o.nombre}' no tiene física, así que no tiene '${prop}'.`, 'Activa la física de este objeto para que pueda moverse con velocidad y gravedad.');
  }
  return f;
}

function necesitaColision(o: ObjetoJuego, prop: string, pos: Posicion): Colision {
  const c = o.obtener(Colision);
  if (!c) throw new ErrorChispa(pos, `el objeto '${o.nombre}' no tiene colisión, así que no tiene '${prop}'.`, 'Activa la colisión de este objeto en el editor.');
  return c;
}

function necesitaMapa(o: ObjetoJuego, accion: string, pos: Posicion): MapaCasillas {
  const m = o.obtener(MapaCasillas);
  if (!m) throw new ErrorChispa(pos, `'${accion}' solo funciona con mapas de casillas, y '${o.nombre}' no es un mapa.`, 'Busca el mapa primero, por ejemplo: variable mapa = buscar("Mapa")');
  return m;
}

/** Comprueba que un tipo de casilla existe en el mapa (con sugerencia si no). */
function tipoDeCasilla(m: MapaCasillas, tipo: string, pos: Posicion): string {
  const t = m.tipoExistente(tipo);
  if (t) return t;
  const hay = Object.keys(m.tipos);
  const parecido = sugerir(tipo, hay);
  throw new ErrorChispa(pos, `el mapa no tiene ningún tipo de casilla llamado "${tipo}".`, parecido ? `¿Querías decir "${parecido}"?` : `Los tipos de casilla son: ${enumerar(hay) || '(ninguno)'}.`);
}

/** Un destino puede ser otro objeto o un vector (una posición). */
function destino(v: Valor | undefined, funcion: string, pos: Posicion): Vector2 {
  if (v instanceof RefObjeto) return v.objeto.posicion;
  if (v instanceof Vector2) return v;
  throw new ErrorChispa(pos, `'${funcion}' necesita un objeto o una posición (vector), pero le das ${v === undefined ? 'nada' : nombreTipo(v)}.`, `Ejemplo: yo.${funcion}(buscar("Jugador"), 100)`);
}

function necesitaAnimador(o: ObjetoJuego, nombre: string, pos: Posicion): Animador {
  const a = o.obtener(Animador);
  const hay = a ? Object.keys(a.animaciones) : [];
  if (!a || !hay.length) {
    throw new ErrorChispa(pos, `no existe ninguna animación llamada "${nombre}".`, 'Este proyecto todavía no tiene animaciones. Créalas en el panel "Animaciones" del editor.');
  }
  return a;
}

function necesitaSprite(o: ObjetoJuego, prop: string, pos: Posicion): Sprite {
  const s = o.obtener(Sprite);
  if (!s) throw new ErrorChispa(pos, `el objeto '${o.nombre}' no tiene aspecto (sprite), así que no tiene '${prop}'.`);
  return s;
}

interface PropiedadObjeto {
  obtener: (o: ObjetoJuego, pos: Posicion) => Valor;
  asignar?: (o: ObjetoJuego, v: Valor, pos: Posicion) => void;
}

/** Propiedades de cualquier objeto. Clave normalizada → cómo leerla y cómo escribirla. */
const PROPIEDADES: Record<string, PropiedadObjeto> = {
  nombre: { obtener: (o) => o.nombre, asignar: (o, v) => (o.nombre = aTexto(v)) },
  tipo: { obtener: (o) => o.tipo },
  x: { obtener: (o) => o.posicion.x, asignar: (o, v, p) => (o.posicion.x = comoNumero(v, 'x', p)) },
  y: { obtener: (o) => o.posicion.y, asignar: (o, v, p) => (o.posicion.y = comoNumero(v, 'y', p)) },
  // Devolvemos el vector "vivo": así yo.posicion.x = 5 mueve el objeto de verdad.
  posicion: {
    obtener: (o) => o.posicion,
    asignar: (o, v, p) => {
      const nuevo = comoVector(v, 'posicion', p);
      o.posicion.x = nuevo.x;
      o.posicion.y = nuevo.y;
    },
  },
  rotacion: { obtener: (o) => o.transformacion.rotacion, asignar: (o, v, p) => (o.transformacion.rotacion = comoNumero(v, 'rotacion', p)) },
  escala: {
    obtener: (o) => o.transformacion.escala,
    asignar: (o, v, p) => {
      // yo.escala = 2 (igual en los dos ejes) o yo.escala = vector(2, 1)
      const e = typeof v === 'number' ? new Vector2(v, v) : comoVector(v, 'escala', p);
      o.transformacion.escala.x = e.x;
      o.transformacion.escala.y = e.y;
    },
  },
  velocidad: {
    obtener: (o, p) => necesitaFisica(o, 'velocidad', p).velocidad,
    asignar: (o, v, p) => {
      const f = necesitaFisica(o, 'velocidad', p);
      const nv = comoVector(v, 'velocidad', p);
      f.velocidad.x = nv.x;
      f.velocidad.y = nv.y;
    },
  },
  gravedad: {
    obtener: (o, p) => necesitaFisica(o, 'gravedad', p).gravedad,
    asignar: (o, v, p) => (necesitaFisica(o, 'gravedad', p).gravedad = comoNumero(v, 'gravedad', p)),
  },
  ensuelo: { obtener: (o, p) => necesitaFisica(o, 'enSuelo', p).enSuelo },
  tocapared: { obtener: (o, p) => necesitaFisica(o, 'tocaPared', p).tocaPared },
  tocatecho: { obtener: (o, p) => necesitaFisica(o, 'tocaTecho', p).tocaTecho },
  color: { obtener: (o, p) => necesitaSprite(o, 'color', p).color, asignar: (o, v, p) => (necesitaSprite(o, 'color', p).color = aTexto(v)) },
  visible: {
    obtener: (o, p) => necesitaSprite(o, 'visible', p).visible,
    asignar: (o, v, p) => (necesitaSprite(o, 'visible', p).visible = comoLogico(v, 'visible', p)),
  },
  ancho: { obtener: (o, p) => necesitaSprite(o, 'ancho', p).ancho, asignar: (o, v, p) => (necesitaSprite(o, 'ancho', p).ancho = comoNumero(v, 'ancho', p)) },
  alto: { obtener: (o, p) => necesitaSprite(o, 'alto', p).alto, asignar: (o, v, p) => (necesitaSprite(o, 'alto', p).alto = comoNumero(v, 'alto', p)) },
  texto: { obtener: (o, p) => necesitaSprite(o, 'texto', p).texto, asignar: (o, v, p) => (necesitaSprite(o, 'texto', p).texto = aTexto(v)) },
  tamaño: {
    obtener: (o, p) => necesitaSprite(o, 'tamaño', p).tamano,
    asignar: (o, v, p) => (necesitaSprite(o, 'tamaño', p).tamano = comoNumero(v, 'tamaño', p)),
  },
  imagen: {
    obtener: (o, p) => necesitaSprite(o, 'imagen', p).imagen,
    asignar: (o, v, p) => {
      const s = necesitaSprite(o, 'imagen', p);
      if (v === null) {
        s.imagen = null;
        return;
      }
      const nombre = aTexto(v);
      o.escena?.motor.recursos.imagen(nombre); // comprueba que existe (da un error amable si no)
      s.imagen = nombre;
    },
  },
  opacidad: {
    obtener: (o, p) => necesitaSprite(o, 'opacidad', p).opacidad,
    asignar: (o, v, p) => (necesitaSprite(o, 'opacidad', p).opacidad = Math.min(1, Math.max(0, comoNumero(v, 'opacidad', p)))),
  },
  voltear: {
    obtener: (o, p) => necesitaSprite(o, 'voltear', p).voltearX,
    asignar: (o, v, p) => (necesitaSprite(o, 'voltear', p).voltearX = comoLogico(v, 'voltear', p)),
  },
  capa: { obtener: (o, p) => necesitaSprite(o, 'capa', p).capa, asignar: (o, v, p) => (necesitaSprite(o, 'capa', p).capa = comoNumero(v, 'capa', p)) },
  solido: {
    obtener: (o) => o.obtener(Colision)?.solido ?? false,
    asignar: (o, v, p) => (necesitaColision(o, 'solido', p).solido = comoLogico(v, 'solido', p)),
  },
  // fantasma = lo contrario de sólido: se atraviesa, pero avisa con "cuando toco"
  fantasma: {
    obtener: (o) => !(o.obtener(Colision)?.solido ?? true),
    asignar: (o, v, p) => (necesitaColision(o, 'fantasma', p).solido = !comoLogico(v, 'fantasma', p)),
  },
  rozamiento: {
    obtener: (o, p) => necesitaFisica(o, 'rozamiento', p).rozamiento,
    asignar: (o, v, p) => (necesitaFisica(o, 'rozamiento', p).rozamiento = Math.min(1, Math.max(0, comoNumero(v, 'rozamiento', p)))),
  },
  rebote: {
    obtener: (o, p) => necesitaFisica(o, 'rebote', p).rebote,
    asignar: (o, v, p) => (necesitaFisica(o, 'rebote', p).rebote = Math.min(1, Math.max(0, comoNumero(v, 'rebote', p)))),
  },
  masa: {
    obtener: (o, p) => necesitaFisica(o, 'masa', p).masa,
    asignar: (o, v, p) => {
      const m = comoNumero(v, 'masa', p);
      if (m <= 0) throw new ErrorChispa(p, 'la masa tiene que ser mayor que 0.', 'Para un objeto que no se mueve nunca usa: yo.estatico = verdadero');
      necesitaFisica(o, 'masa', p).masa = m;
    },
  },
  estatico: {
    obtener: (o, p) => necesitaFisica(o, 'estatico', p).estatico,
    asignar: (o, v, p) => (necesitaFisica(o, 'estatico', p).estatico = comoLogico(v, 'estatico', p)),
  },
  fijo: {
    obtener: (o, p) => necesitaSprite(o, 'fijo', p).fijo,
    asignar: (o, v, p) => (necesitaSprite(o, 'fijo', p).fijo = comoLogico(v, 'fijo', p)),
  },
  colortexto: {
    obtener: (o, p) => necesitaSprite(o, 'colorTexto', p).colorTexto,
    asignar: (o, v, p) => (necesitaSprite(o, 'colorTexto', p).colorTexto = aTexto(v)),
  },
  animacion: {
    obtener: (o) => o.obtener(Animador)?.actual ?? null,
    asignar: (o, v, p) => {
      if (v === null) o.obtener(Animador)?.parar();
      else METODOS.animar(o, [v], p);
    },
  },
  ratonencima: { obtener: (o) => o.escena?.ratonEncima(o) ?? false },
  destruido: { obtener: (o) => o.destruido },
};

/** Acciones de cualquier objeto: yo.saltar(), yo.mover(10, 0)... */
const METODOS: Record<string, (o: ObjetoJuego, args: Valor[], pos: Posicion) => Valor> = {
  saltar: (o, a, p) => {
    // Solo salta si está en el suelo. Devuelve verdadero si ha saltado.
    const f = necesitaFisica(o, 'saltar', p);
    const fuerza = argNumero(a, 0, 'saltar', p, 'yo.saltar(600)', 600);
    if (!f.enSuelo) return false;
    f.velocidad.y = Math.abs(fuerza); // positivo = hacia ARRIBA
    f.enSuelo = false;
    return true;
  },
  mover: (o, a, p) => {
    o.posicion.x += argNumero(a, 0, 'mover', p, 'yo.mover(10, 0)');
    o.posicion.y += argNumero(a, 1, 'mover', p, 'yo.mover(10, 0)', 0);
    return null;
  },
  rotar: (o, a, p) => {
    o.transformacion.rotacion += argNumero(a, 0, 'rotar', p, 'yo.rotar(90)');
    return null;
  },
  destruir: (o) => {
    o.destruir();
    return null;
  },
  distanciaa: (o, a, p) => o.posicion.distancia(argObjeto(a, 0, 'distanciaA', p, 'yo.distanciaA(otro)').posicion),
  empujar: (o, a, p) => {
    // Un golpe: los objetos con más masa se mueven menos
    necesitaFisica(o, 'empujar', p).empujar(argNumero(a, 0, 'empujar', p, 'yo.empujar(300, 0)'), argNumero(a, 1, 'empujar', p, 'yo.empujar(300, 0)', 0));
    return null;
  },
  animar: (o, a, p) => {
    const nombre = argTexto(a, 0, 'animar', p, 'yo.animar("correr")');
    const anim = necesitaAnimador(o, nombre, p);
    const real = Object.keys(anim.animaciones).find((k) => normalizar(k) === normalizar(nombre));
    if (!real) {
      const hay = Object.keys(anim.animaciones);
      const parecida = sugerir(nombre, hay);
      throw new ErrorChispa(p, `no existe ninguna animación llamada "${nombre}".`, parecida ? `¿Querías decir "${parecida}"?` : `Las animaciones son: ${enumerar(hay)}.`);
    }
    anim.reproducir(real);
    return null;
  },
  pararanimacion: (o) => {
    o.obtener(Animador)?.parar();
    return null;
  },
  moverhacia: (o, a, p) => {
    // Avanza hacia el destino a esa rapidez (píxeles/segundo) sin pasarse. Devuelve verdadero al llegar.
    const d = destino(a[0], 'moverHacia', p);
    const rapidez = argNumero(a, 1, 'moverHacia', p, 'yo.moverHacia(jugador, 100)');
    const paso = rapidez * (o.escena?.motor.tiempo.delta ?? 0);
    const falta = d.restar(o.posicion);
    if (falta.longitud() <= paso) {
      o.posicion.x = d.x;
      o.posicion.y = d.y;
      return true;
    }
    const mover = falta.normalizado().multiplicar(paso);
    o.posicion.x += mover.x;
    o.posicion.y += mover.y;
    return false;
  },
  mirara: (o, a, p) => {
    // Gira el objeto para que "mire" (su lado derecho) hacia el destino
    const falta = destino(a[0], 'mirarA', p).restar(o.posicion);
    if (falta.longitud() > 0) o.transformacion.rotacion = (Math.atan2(falta.y, falta.x) * 180) / Math.PI;
    return null;
  },
  direcciona: (o, a, p) => destino(a[0], 'direccionA', p).restar(o.posicion).normalizado(),

  // ── Mapas de casillas ──
  casilla: (o, a, p) => {
    const ej = 'mapa.casilla(3, 0)';
    return necesitaMapa(o, 'casilla', p).obtener(argNumero(a, 0, 'casilla', p, ej), argNumero(a, 1, 'casilla', p, ej));
  },
  ponercasilla: (o, a, p) => {
    const ej = 'mapa.ponerCasilla(3, 0, "suelo")';
    const m = necesitaMapa(o, 'ponerCasilla', p);
    m.poner(argNumero(a, 0, 'ponerCasilla', p, ej), argNumero(a, 1, 'ponerCasilla', p, ej), tipoDeCasilla(m, argTexto(a, 2, 'ponerCasilla', p, ej), p));
    return null;
  },
  quitarcasilla: (o, a, p) => {
    const ej = 'mapa.quitarCasilla(3, 0)';
    necesitaMapa(o, 'quitarCasilla', p).quitar(argNumero(a, 0, 'quitarCasilla', p, ej), argNumero(a, 1, 'quitarCasilla', p, ej));
    return null;
  },
  casillaen: (o, a, p) => {
    const ej = 'mapa.casillaEn(yo.x, yo.y)';
    const m = necesitaMapa(o, 'casillaEn', p);
    const x = argNumero(a, 0, 'casillaEn', p, ej);
    const y = argNumero(a, 1, 'casillaEn', p, ej);
    return m.obtener(m.columnaEn(x), m.filaEn(y));
  },
  columnaen: (o, a, p) => necesitaMapa(o, 'columnaEn', p).columnaEn(argNumero(a, 0, 'columnaEn', p, 'mapa.columnaEn(yo.x)')),
  filaen: (o, a, p) => necesitaMapa(o, 'filaEn', p).filaEn(argNumero(a, 0, 'filaEn', p, 'mapa.filaEn(yo.y)')),
  centrodecasilla: (o, a, p) => {
    const ej = 'mapa.centroDeCasilla(3, 0)';
    const c = necesitaMapa(o, 'centroDeCasilla', p).centroDe(argNumero(a, 0, 'centroDeCasilla', p, ej), argNumero(a, 1, 'centroDeCasilla', p, ej));
    return new Vector2(c.x, c.y);
  },
};

const NOMBRES_BONITOS = [
  'nombre', 'tipo', 'x', 'y', 'posicion', 'rotacion', 'escala', 'velocidad', 'gravedad', 'enSuelo', 'tocaPared', 'tocaTecho',
  'color', 'visible', 'ancho', 'alto', 'texto', 'tamaño', 'colorTexto', 'imagen', 'opacidad', 'voltear', 'capa', 'fijo',
  'solido', 'fantasma', 'rozamiento', 'rebote', 'masa', 'estatico', 'animacion', 'ratonEncima', 'destruido',
  'saltar', 'mover', 'rotar', 'destruir', 'distanciaA', 'empujar', 'animar', 'pararAnimacion', 'moverHacia', 'mirarA', 'direccionA',
  'casilla', 'ponerCasilla', 'quitarCasilla', 'casillaEn', 'columnaEn', 'filaEn', 'centroDeCasilla',
];

interface PropiedadPropia {
  valor: Valor;
  original: string;
}

// "tamano" (sin ñ) también vale, para teclados sin ñ
PROPIEDADES.tamano = PROPIEDADES['tamaño'];

/** Nombres de las propiedades y acciones del motor, tal como se escriben oficialmente. */
export const NOMBRES_PROPIEDADES_OBJETO = NOMBRES_BONITOS;

export class RefObjeto extends Anfitrion {
  constructor(readonly objeto: ObjetoJuego) {
    super();
  }

  describir() {
    return `el objeto '${this.objeto.nombre}'`;
  }

  private propias(): Map<string, PropiedadPropia> {
    return this.objeto.propiedades as Map<string, PropiedadPropia>;
  }

  propiedadesConocidas(): string[] {
    return [...NOMBRES_BONITOS, ...[...this.propias().values()].map((x) => x.original)];
  }

  obtener(p: string, original: string, pos: Posicion): Valor {
    const o = this.objeto;
    if (PROPIEDADES[p]) return PROPIEDADES[p].obtener(o, pos);
    if (METODOS[p]) return new FuncionNativa(original, (args, pos2) => METODOS[p](o, args, pos2));
    const propia = this.propias().get(p);
    if (propia) return propia.valor;
    const s = sugerir(original, this.propiedadesConocidas());
    throw new ErrorChispa(
      pos,
      `el objeto '${o.nombre}' no tiene nada llamado '${original}'.`,
      s ? `¿Querías decir '${s}'?` : `Si es una propiedad tuya, dale un valor antes, por ejemplo en "cuando empieza": yo.${original} = 0`,
    );
  }

  asignar(p: string, v: Valor, original: string, pos: Posicion): void {
    const prop = PROPIEDADES[p];
    if (prop) {
      if (!prop.asignar) {
        throw new ErrorChispa(pos, `'${original}' solo se puede leer, no cambiar${p.startsWith('toca') || p === 'ensuelo' ? ': lo calcula la física' : ''}.`);
      }
      return prop.asignar(this.objeto, v, pos);
    }
    if (METODOS[p]) {
      throw new ErrorChispa(pos, `'${original}' es una acción del objeto (se usa con paréntesis), no se le puede dar un valor.`, `Ejemplo: yo.${original}(...)`);
    }
    // ¿Un nombre casi igual a uno del motor? Seguramente está mal escrito (yo.velocidda → velocidad)
    const parecido = this.propias().has(p) ? null : propiedadMalEscrita(original);
    if (parecido) {
      throw new ErrorChispa(
        pos,
        `has escrito 'yo.${original}', que se parece mucho a '${parecido}', una propiedad del motor.`,
        `¿Querías decir '${parecido}'? Si de verdad quieres una propiedad tuya con este nombre, elige uno que no se parezca tanto a los del motor.`,
      );
    }
    this.propias().set(p, { valor: copiarSiVector(v), original });
  }
}

/** Si `nombre` se parece mucho a una propiedad del motor (pero no es igual), devuelve la del motor. */
export function propiedadMalEscrita(nombre: string): string | null {
  // Con nombres cortos (xp, hp...) habría demasiados falsos avisos: solo comprobamos desde 4 letras.
  if (nombre.length < 4) return null;
  return sugerir(nombre, NOMBRES_BONITOS);
}

/** ¿Es una propiedad o acción del motor? (nombre normalizado) */
export function esMiembroDelMotor(nombre: string): boolean {
  return nombre in PROPIEDADES || nombre in METODOS;
}
