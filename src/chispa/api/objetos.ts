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
  tamano: {
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
    asignar: (o, v, p) => {
      const c = o.obtener(Colision);
      if (!c) throw new ErrorChispa(p, `el objeto '${o.nombre}' no tiene colisión.`);
      c.solido = comoLogico(v, 'solido', p);
    },
  },
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
};

const NOMBRES_BONITOS = [
  'nombre', 'tipo', 'x', 'y', 'posicion', 'rotacion', 'escala', 'velocidad', 'gravedad', 'enSuelo', 'tocaPared', 'tocaTecho',
  'color', 'visible', 'ancho', 'alto', 'texto', 'tamaño', 'imagen', 'opacidad', 'voltear', 'capa', 'solido', 'destruido',
  'saltar', 'mover', 'rotar', 'destruir', 'distanciaA',
];

interface PropiedadPropia {
  valor: Valor;
  original: string;
}

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
    this.propias().set(p, { valor: copiarSiVector(v), original });
  }
}
