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
import { Anfitrion, FuncionNativa, aTexto, copiarSiVector, nombreTipo, type FuncionChispa, type Valor } from '../ejecucion/valores';
import { Vector2 } from '../../motor/Vector2';
import type { ObjetoJuego } from '../../objetos/ObjetoJuego';
import { Colision } from '../../objetos/componentes/Colision';
import { Fisica } from '../../objetos/componentes/Fisica';
import { Sprite } from '../../objetos/componentes/Sprite';
import { Animador } from '../../objetos/componentes/Animador';
import { MapaCasillas } from '../../objetos/componentes/MapaCasillas';
import { Recorrido } from '../../objetos/componentes/Recorrido';
import { Comportamiento } from '../../objetos/componentes/Comportamiento';
import { SUAVIZADOS } from '../../objetos/AnimadorDeValores';
import { argTexto } from './argumentos';
import { enumerar } from '../errores/sugerencias';
import { normalizar } from '../../utilidades/texto';

/** Lo que RefObjeto necesita del script de un objeto (ScriptChispa lo cumple). */
interface ScriptDeObjeto {
  funcionDelScript(nombre: string): FuncionChispa | null;
  nombresDeFunciones(): string[];
  tieneVariable(nombre: string): boolean;
}

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

/**
 * Un destino escrito de cualquiera de las dos formas: (otro) / (vector(x, y)) o (x, y).
 * Devuelve el punto y cuántos valores ha usado (para leer los que vienen detrás).
 */
function destinoOPunto(a: Valor[], funcion: string, pos: Posicion, ejemplo: string): { punto: Vector2; usados: number } {
  if (typeof a[0] === 'number') return { punto: new Vector2(a[0], argNumero(a, 1, funcion, pos, ejemplo)), usados: 2 };
  if (a[0] instanceof RefObjeto || a[0] instanceof Vector2) return { punto: destino(a[0], funcion, pos).copiar(), usados: 1 };
  throw new ErrorChispa(pos, `'${funcion}' necesita un sitio: un objeto, una posición (vector) o dos números (x, y).`, `Ejemplo: ${ejemplo}`);
}

/** Los objetos (menos este) que ocupan algo de sitio y se llaman o son del tipo `nombre` (o todos si es null). */
function candidatos(o: ObjetoJuego, nombre: string | null): ObjetoJuego[] {
  const escena = o.escena;
  if (!escena) return [];
  const n = nombre === null ? null : normalizar(nombre);
  return escena.objetos.filter((x) => x !== o && !x.destruido && (n === null || normalizar(x.nombre) === n || normalizar(x.tipo) === n || x.etiquetas.has(n)));
}

/** ¿Es un objeto de texto? (entonces yo.tamano es el tamaño de la letra) */
function esTexto(o: ObjetoJuego): boolean {
  return o.obtener(Sprite)?.forma === 'texto';
}

/** La etiqueta que se pasa a ponerEtiqueta, tieneEtiqueta...: un texto sin espacios de más. */
function argEtiqueta(a: Valor[], funcion: string, pos: Posicion): string {
  const e = argTexto(a, 0, funcion, pos, `yo.${funcion}("enemigo")`).trim();
  if (!e) throw new ErrorChispa(pos, 'la etiqueta está vacía.', `Ejemplo: yo.${funcion}("enemigo")`);
  return e;
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
  texto: {
    obtener: (o, p) => {
      const s = necesitaSprite(o, 'texto', p);
      s.actualizarTexto(); // si tiene huecos, el valor de ahora mismo
      return s.texto;
    },
    asignar: (o, v, p) => {
      const s = necesitaSprite(o, 'texto', p);
      s.textoVivo = null; // un texto normal sustituye al que tenía huecos
      s.texto = aTexto(v);
    },
  },
  // yo.tamano: en un TEXTO, el tamaño de la letra; en todo lo demás, lo grande que es (1 = normal, 2 = el doble)
  tamaño: {
    obtener: (o, p) => (esTexto(o) ? necesitaSprite(o, 'tamaño', p).tamano : o.transformacion.escala.x),
    asignar: (o, v, p) => {
      const n = comoNumero(v, 'tamaño', p);
      if (esTexto(o)) necesitaSprite(o, 'tamaño', p).tamano = n;
      else o.transformacion.escala.x = o.transformacion.escala.y = n;
    },
  },
  tamanoletra: {
    obtener: (o, p) => necesitaSprite(o, 'tamanoLetra', p).tamano,
    asignar: (o, v, p) => (necesitaSprite(o, 'tamanoLetra', p).tamano = comoNumero(v, 'tamanoLetra', p)),
  },
  transparencia: {
    obtener: (o, p) => 1 - necesitaSprite(o, 'transparencia', p).opacidad,
    asignar: (o, v, p) => (necesitaSprite(o, 'transparencia', p).opacidad = 1 - Math.min(1, Math.max(0, comoNumero(v, 'transparencia', p)))),
  },
  voltearvertical: {
    obtener: (o, p) => necesitaSprite(o, 'voltearVertical', p).voltearY,
    asignar: (o, v, p) => (necesitaSprite(o, 'voltearVertical', p).voltearY = comoLogico(v, 'voltearVertical', p)),
  },
  etiquetas: { obtener: (o) => [...o.etiquetas.values()] },
  padre: { obtener: (o) => (o.padre && !o.padre.destruido ? referencia(o.padre) : null) },
  hijos: { obtener: (o) => o.hijos.map(referencia) },
  arrastrable: { obtener: (o) => o.arrastrable, asignar: (o, v, p) => (o.arrastrable = comoLogico(v, 'arrastrable', p)) },
  arrastrando: { obtener: (o) => o.escena?.arrastrando(o) ?? false },
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
  moviendo: {
    obtener: (o, p) => necesitaRecorrido(o, p).moviendo,
    asignar: (o, v, p) => (necesitaRecorrido(o, p).moviendo = comoLogico(v, 'moviendo', p)),
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
  yendo: { obtener: (o) => o.obtener(Comportamiento)?.yendo ?? false },
};

/** yo.moviendo solo existe si el objeto tiene un recorrido (se pone en el editor). */
function necesitaRecorrido(o: ObjetoJuego, pos: Posicion): Recorrido {
  const r = o.obtener(Recorrido);
  if (!r) throw new ErrorChispa(pos, `el objeto '${o.nombre}' no tiene recorrido, así que no tiene 'moviendo'.`, 'El recorrido se pone en el editor: Propiedades > Recorrido (para plataformas que se mueven solas).');
  return r;
}

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
  distanciaa: (o, a, p) => o.posicion.distancia(destinoOPunto(a, 'distanciaA', p, 'yo.distanciaA(otro)').punto),
  teletransportar: (o, a, p) => {
    // De golpe a otro sitio (y sin la velocidad que llevaba, para que no salga disparado)
    const { punto } = destinoOPunto(a, 'teletransportar', p, 'yo.teletransportar(100, 200)');
    o.escena?.animaciones.cancelar(`${o.id}.ira`);
    o.posicion.x = punto.x;
    o.posicion.y = punto.y;
    const f = o.obtener(Fisica);
    if (f) f.velocidad.x = f.velocidad.y = 0;
    return null;
  },
  ira: (o, a, p) => {
    // Va hasta el sitio en esos segundos, suavemente: yo.irA(400, 300, 2)  ·  yo.irA(buscar("Meta"), 1)
    const ej = 'yo.irA(400, 300, 2)';
    const { punto, usados } = destinoOPunto(a, 'irA', p, ej);
    const segundos = argNumero(a, usados, 'irA', p, ej, 1);
    if (segundos < 0) throw new ErrorChispa(p, 'el tiempo no puede ser negativo.', `Ejemplo: ${ej}`);
    const desde = o.posicion.copiar();
    const escena = o.escena;
    if (!escena) return null;
    escena.animaciones.agregar({
      clave: `${o.id}.ira`,
      dueno: o,
      duracion: segundos,
      transcurrido: 0,
      suavizado: SUAVIZADOS.suave,
      paso: (t) => {
        o.posicion.x = desde.x + (punto.x - desde.x) * t;
        o.posicion.y = desde.y + (punto.y - desde.y) * t;
        const f = o.obtener(Fisica);
        if (f) f.velocidad.x = f.velocidad.y = 0;
      },
    });
    return null;
  },
  anguloa: (o, a, p) => {
    const d = destinoOPunto(a, 'anguloA', p, 'yo.anguloA(buscar("Jugador"))').punto.restar(o.posicion);
    return (Math.atan2(d.y, d.x) * 180) / Math.PI;
  },
  rotarhacia: (o, a, p) => {
    // Gira poco a poco hasta mirar hacia el destino. Devuelve verdadero cuando ya lo mira.
    const ej = 'yo.rotarHacia(raton.posicion, 180)';
    const { punto, usados } = destinoOPunto(a, 'rotarHacia', p, ej);
    const velocidad = argNumero(a, usados, 'rotarHacia', p, ej, 180);
    const d = punto.restar(o.posicion);
    if (d.longitud() === 0) return true;
    const objetivo = (Math.atan2(d.y, d.x) * 180) / Math.PI;
    const actual = o.transformacion.rotacion;
    const diferencia = ((((objetivo - actual) % 360) + 540) % 360) - 180; // el camino más corto, entre -180 y 180
    const paso = velocidad * (o.escena?.motor.tiempo.delta ?? 0);
    if (Math.abs(diferencia) <= paso) {
      o.transformacion.rotacion = actual + diferencia;
      return true;
    }
    o.transformacion.rotacion = actual + Math.sign(diferencia) * paso;
    return false;
  },
  avanzar: (o, a, p) => {
    // Hacia donde mira (su rotación), como "mover 10 pasos" de Scratch
    const pasos = argNumero(a, 0, 'avanzar', p, 'yo.avanzar(10)');
    const r = (o.transformacion.rotacion * Math.PI) / 180;
    o.posicion.x += Math.cos(r) * pasos;
    o.posicion.y += Math.sin(r) * pasos;
    return null;
  },
  ocultar: (o, _a, p) => {
    necesitaSprite(o, 'ocultar', p).visible = false;
    return null;
  },
  aparecer: (o, _a, p) => {
    necesitaSprite(o, 'aparecer', p).visible = true;
    return null;
  },
  parpadear: (o, a, p) => {
    // Se enciende y se apaga durante un rato (por ejemplo, al recibir un golpe) y al final se queda visible
    const ej = 'yo.parpadear(1)';
    const s = necesitaSprite(o, 'parpadear', p);
    const segundos = argNumero(a, 0, 'parpadear', p, ej, 1);
    const porSegundo = argNumero(a, 1, 'parpadear', p, 'yo.parpadear(1, 10)', 8);
    o.escena?.animaciones.agregar({
      clave: `${o.id}.parpadeo`,
      dueno: o,
      duracion: segundos,
      transcurrido: 0,
      suavizado: (t) => t,
      paso: (t) => (s.visible = t >= 1 || Math.floor(t * segundos * porSegundo * 2) % 2 === 0),
      alTerminar: () => (s.visible = true),
    });
    return null;
  },
  ponerdelante: (o, _a, p) => {
    const s = necesitaSprite(o, 'ponerDelante', p);
    const capas = candidatos(o, null).map((x) => x.obtener(Sprite)?.capa ?? 0);
    s.capa = Math.max(s.capa, ...capas.map((c) => c + 1));
    return null;
  },
  ponerdetras: (o, _a, p) => {
    const s = necesitaSprite(o, 'ponerDetras', p);
    const capas = candidatos(o, null).map((x) => x.obtener(Sprite)?.capa ?? 0);
    s.capa = Math.min(s.capa, ...capas.map((c) => c - 1));
    return null;
  },
  tocando: (o, a, p) => {
    // ¿Está tocando AHORA algo (o algo con ese nombre, tipo, etiqueta o tipo de casilla)?
    const nombre = a[0] === undefined ? null : argTexto(a, 0, 'tocando', p, 'si yo.tocando("Lava"):');
    const escena = o.escena;
    const caja = escena?.cajaDe(o);
    if (!escena || !caja) return false;
    const toca = (b: { izquierda: number; derecha: number; abajo: number; arriba: number }) =>
      caja.izquierda <= b.derecha + 1 && caja.derecha >= b.izquierda - 1 && caja.abajo <= b.arriba + 1 && caja.arriba >= b.abajo - 1;
    for (const x of candidatos(o, null)) {
      const m = x.obtener(MapaCasillas);
      if (m) {
        const n = nombre === null ? null : normalizar(nombre);
        if (m.casillasEn(caja, 1).some((c) => toca(c.caja) && (n === null || normalizar(c.tipo) === n || normalizar(x.nombre) === n))) return true;
        continue;
      }
      if (nombre !== null && !candidatos(o, nombre).includes(x)) continue;
      const b = escena.cajaDe(x);
      if (b && x.obtener(Colision) && toca(b)) return true;
    }
    return false;
  },
  cercanos: (o, a, p) => {
    // Los objetos a menos de `radio` píxeles, del más cercano al más lejano
    const ej = 'yo.cercanos(200, "Enemigo")';
    const radio = argNumero(a, 0, 'cercanos', p, ej);
    const nombre = a[1] === undefined ? null : argTexto(a, 1, 'cercanos', p, ej);
    return candidatos(o, nombre)
      .filter((x) => !x.obtener(MapaCasillas) && x.posicion.distancia(o.posicion) <= radio)
      .sort((x, y) => x.posicion.distancia(o.posicion) - y.posicion.distancia(o.posicion))
      .map(referencia);
  },
  mascercano: (o, a, p) => {
    // El objeto más cercano (de ese tipo). nulo si no hay ninguno (o ninguno a menos de `radio`)
    const ej = 'yo.masCercano("Enemigo")';
    const nombre = a[0] === undefined || a[0] === null ? null : argTexto(a, 0, 'masCercano', p, ej);
    const radio = argNumero(a, 1, 'masCercano', p, 'yo.masCercano("Enemigo", 300)', Infinity);
    let mejor: ObjetoJuego | null = null;
    for (const x of candidatos(o, nombre)) {
      if (x.obtener(MapaCasillas)) continue;
      const d = x.posicion.distancia(o.posicion);
      if (d <= radio && (!mejor || d < mejor.posicion.distancia(o.posicion))) mejor = x;
    }
    return mejor ? referencia(mejor) : null;
  },
  clonar: (o, _a, p) => {
    if (!o.escena?.clonador) throw new ErrorChispa(p, 'no se puede clonar fuera del juego.');
    return referencia(o.escena.clonador(o));
  },
  poneretiqueta: (o, a, p) => {
    const e = argEtiqueta(a, 'ponerEtiqueta', p);
    o.etiquetas.set(normalizar(e), e);
    return null;
  },
  quitaretiqueta: (o, a, p) => {
    o.etiquetas.delete(normalizar(argEtiqueta(a, 'quitarEtiqueta', p)));
    return null;
  },
  tieneetiqueta: (o, a, p) => o.etiquetas.has(normalizar(argEtiqueta(a, 'tieneEtiqueta', p))),
  pegara: (o, a, p) => {
    const padre = argObjeto(a, 0, 'pegarA', p, 'espada.pegarA(buscar("Jugador"))');
    if (padre === o) throw new ErrorChispa(p, 'un objeto no se puede pegar a sí mismo.');
    try {
      o.pegarA(padre);
    } catch {
      throw new ErrorChispa(p, `'${o.nombre}' no se puede pegar a '${padre.nombre}', porque '${padre.nombre}' ya va pegado a '${o.nombre}'.`, 'Suelta antes uno de los dos con .soltar()');
    }
    return null;
  },
  soltar: (o) => {
    o.pegarA(null);
    return null;
  },
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
  moverconflechas: (o, a, p) => {
    // Lo más fácil para empezar: flechas (o W A S D) y ya se mueve.
    //  - Si el objeto CAE (tiene física y hay gravedad): solo izquierda y derecha (para saltar, yo.saltar()).
    //  - Si no (juegos vistos desde arriba, naves...): en las cuatro direcciones.
    // Con física cambia la velocidad (así choca bien con las paredes); sin física, la posición.
    const rapidez = argNumero(a, 0, 'moverConFlechas', p, 'yo.moverConFlechas(300)', 300);
    const escena = o.escena;
    if (!escena) return false;
    const pulsada = (...teclas: string[]) => teclas.some((t) => escena.motor.entrada.estaPulsada(t));
    let dx = (pulsada('derecha', 'd') ? 1 : 0) - (pulsada('izquierda', 'a') ? 1 : 0);
    let dy = (pulsada('arriba', 'w') ? 1 : 0) - (pulsada('abajo', 's') ? 1 : 0);
    const f = o.obtener(Fisica);
    const conFisica = !!f && f.activo && !f.estatico;
    const cae = conFisica && f!.gravedad !== 0 && escena.gravedad !== 0;
    if (cae) dy = 0;
    if (dx !== 0 && dy !== 0) {
      // En diagonal, no más rápido que en recto
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    if (conFisica) {
      f!.velocidad.x = dx * rapidez;
      if (!cae) f!.velocidad.y = dy * rapidez;
    } else {
      const dt = escena.motor.tiempo.delta;
      o.posicion.x += dx * rapidez * dt;
      o.posicion.y += dy * rapidez * dt;
    }
    // Mira hacia donde anda (las imágenes se dan la vuelta al ir a la izquierda)
    const s = o.obtener(Sprite);
    if (s && dx !== 0) s.voltearX = dx < 0;
    return dx !== 0 || dy !== 0;
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
  irhacia: (o, a, p) => {
    // Va hasta un sitio (o detrás de un objeto) rodeando las paredes del mapa: yo.irHacia(buscar("Jugador"), 120)
    const ej = 'yo.irHacia(buscar("Jugador"), 120)';
    let objetivo: ObjetoJuego | Vector2;
    let usados = 1;
    if (a[0] instanceof RefObjeto) objetivo = a[0].objeto;
    else {
      const d = destinoOPunto(a, 'irHacia', p, ej);
      objetivo = d.punto;
      usados = d.usados;
    }
    if (objetivo === o) throw new ErrorChispa(p, 'un objeto no puede ir hacia sí mismo.', `Ejemplo: ${ej}`);
    const rapidez = argNumero(a, usados, 'irHacia', p, ej, 150);
    if (rapidez <= 0) throw new ErrorChispa(p, 'la rapidez tiene que ser mayor que 0.', `Ejemplo: ${ej}`);
    o.escena?.animaciones.cancelar(`${o.id}.ira`);
    return (o.obtener(Comportamiento) ?? o.agregar(new Comportamiento())).irHacia(objetivo, rapidez);
  },
  parar: (o) => {
    // Deja de ir a donde iba (irHacia, irA) y se queda quieto
    o.obtener(Comportamiento)?.parar();
    o.escena?.animaciones.cancelar(`${o.id}.ira`);
    const f = o.obtener(Fisica);
    if (f) f.velocidad.x = f.velocidad.y = 0;
    return null;
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
  'solido', 'fantasma', 'rozamiento', 'rebote', 'masa', 'estatico', 'moviendo', 'animacion', 'ratonEncima', 'destruido',
  'saltar', 'mover', 'rotar', 'destruir', 'distanciaA', 'empujar', 'animar', 'pararAnimacion', 'moverHacia', 'mirarA', 'direccionA',
  'moverConFlechas', 'casilla', 'ponerCasilla', 'quitarCasilla', 'casillaEn', 'columnaEn', 'filaEn', 'centroDeCasilla',
  'tamanoLetra', 'transparencia', 'voltearVertical', 'etiquetas', 'padre', 'hijos', 'arrastrable', 'arrastrando',
  'teletransportar', 'irA', 'anguloA', 'rotarHacia', 'avanzar', 'ocultar', 'aparecer', 'parpadear', 'ponerDelante', 'ponerDetras',
  'tocando', 'cercanos', 'masCercano', 'clonar', 'ponerEtiqueta', 'quitarEtiqueta', 'tieneEtiqueta', 'pegarA', 'soltar',
  'irHacia', 'parar', 'yendo',
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

  objetoDelJuego() {
    return this.objeto;
  }

  resumenParaDepurar(): [string, Valor][] {
    const o = this.objeto;
    const filas: [string, Valor][] = [['nombre', o.nombre], ['x', o.posicion.x], ['y', o.posicion.y]];
    const f = o.obtener(Fisica);
    if (f) filas.push(['velocidad', f.velocidad.copiar()]);
    for (const p of this.propias().values()) filas.push([p.original, p.valor]);
    return filas;
  }

  private propias(): Map<string, PropiedadPropia> {
    return this.objeto.propiedades as Map<string, PropiedadPropia>;
  }

  propiedadesConocidas(): string[] {
    return [...NOMBRES_BONITOS, ...[...this.propias().values()].map((x) => x.original), ...(this.script()?.nombresDeFunciones() ?? [])];
  }

  /** Su script (si tiene): para llamar a sus funciones desde otros objetos. */
  private script(): ScriptDeObjeto | null {
    return (this.objeto.todosLosComponentes.find((c) => 'funcionDelScript' in c) as unknown as ScriptDeObjeto | undefined) ?? null;
  }

  obtener(p: string, original: string, pos: Posicion): Valor {
    const o = this.objeto;
    if (PROPIEDADES[p]) return PROPIEDADES[p].obtener(o, pos);
    if (METODOS[p]) return new FuncionNativa(original, (args, pos2) => METODOS[p](o, args, pos2));
    const propia = this.propias().get(p);
    if (propia) return propia.valor;
    // Una función de su script: buscar("Puerta").abrir()
    const script = this.script();
    const funcion = script?.funcionDelScript(p);
    if (funcion) return funcion;
    const s = sugerir(original, this.propiedadesConocidas());
    if (!s && script?.tieneVariable(p)) {
      throw new ErrorChispa(
        pos,
        `'${original}' es una variable del script de '${o.nombre}', y las variables de un script solo se ven dentro de él.`,
        `Para que otros objetos la lean, guárdala como propiedad del objeto: en su script, yo.${original} = ... (y desde fuera: ${o.nombre.toLowerCase()}.${original}). O hazle una función que la devuelva.`,
      );
    }
    throw new ErrorChispa(
      pos,
      `el objeto '${o.nombre}' no tiene nada llamado '${original}'.`,
      s ? `¿Querías decir '${s}'?` : `Si es una propiedad tuya, dale un valor antes, por ejemplo en "cuando empieza": yo.${original} = 0. Si es una función, tiene que estar escrita en el script de '${o.nombre}': funcion ${original}():`,
    );
  }

  /** yo.texto = "Puntos: {juego.puntos}": el letrero se actualiza solo. */
  asignarVivo(p: string, calcular: () => string | null, pos: Posicion): boolean {
    if (p !== 'texto') return false;
    necesitaSprite(this.objeto, 'texto', pos).textoVivo = calcular;
    return true;
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
