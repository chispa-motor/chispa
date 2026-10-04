/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
import { tocanDeVerdad } from '../../objetos/SistemaFisico';
import { Fisica } from '../../objetos/componentes/Fisica';
import { Sprite } from '../../objetos/componentes/Sprite';
import { Animador } from '../../objetos/componentes/Animador';
import { MapaCasillas, SEGUNDOS_PUERTA } from '../../objetos/componentes/MapaCasillas';
import { Recorrido } from '../../objetos/componentes/Recorrido';
import { Comportamiento } from '../../objetos/componentes/Comportamiento';
import { SUAVIZADOS } from '../../objetos/AnimadorDeValores';
import { argTexto } from './argumentos';
import { enumerar } from '../errores/sugerencias';
import { normalizar } from '../../utilidades/texto';
import { sinPrototipo } from '../../utilidades/seguro';
import { NOMBRES_MEZCLAS, PATRONES, TIPOS_RELLENO } from '../../motor/Estilo';
import { EFECTOS_CONTINUOS, RECETAS } from '../../objetos/Efectos';
import { Luz } from '../../objetos/Luces';
import { letrasDisponibles } from '../../motor/Letras';
import { moverConEjes } from '../../objetos/moverConEjes';
import { numeroDeJugador } from './jugadores';
import { METODOS_CONTROL, NOMBRES_CONTROL, PROPIEDADES_CONTROL, controlDe, esDeControl } from './controles';
import { NOMBRES_COLORES, esColorValido } from '../../motor/Color';
import { FORMAS, MAX_LADOS, MAX_PUNTOS_CAMINO, POR_DEFECTO } from '../../objetos/formas/figuras';

/** Lo que RefObjeto necesita del script de un objeto (ScriptChispa lo cumple). */
interface ScriptDeObjeto {
  funcionDelScript(nombre: string): FuncionChispa | null;
  nombresDeFunciones(): string[];
  tieneVariable(nombre: string): boolean;
}

/** Una sola RefObjeto por objeto: así `otro == jugador` funciona (mismo objeto = misma referencia). */
/**
 * Un número de aspecto (un borde, un desenfoque), dentro de los mismos topes que al abrir un archivo:
 * un valor disparatado (un resplandor de un millón) dejaría el juego parado al pintarlo.
 */
const acotado = (n: number, min: number, max: number): number => (n >= min ? Math.min(max, n) : min);

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
      // Con el nombre entre comillas no basta: el objeto hay que buscarlo
      typeof v === 'string' ? `Si "${v}" es el nombre del objeto, búscalo: buscar("${v}"). Ejemplo: ${ejemplo}` : `Ejemplo: ${ejemplo}`,
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

/** mapa.abrirPuerta(columna, fila, segundos) y mapa.cerrarPuerta: la casilla tiene que ser de un tipo marcado como puerta. */
function moverPuerta(o: ObjetoJuego, a: Valor[], p: Posicion, accion: string, hacia: 0 | 1): null {
  const ej = `mapa.${accion}(5, 3)`;
  const m = necesitaMapa(o, accion, p);
  const c = Math.floor(argNumero(a, 0, accion, p, ej));
  const f = Math.floor(argNumero(a, 1, accion, p, ej));
  const segundos = argNumero(a, 2, accion, p, ej, SEGUNDOS_PUERTA);
  if (!(segundos >= 0 && segundos <= 60)) throw new ErrorChispa(p, `una puerta tarda de 0 a 60 segundos en moverse, y le das ${segundos}.`, `Ejemplo: mapa.${accion}(5, 3, 0.5)`);
  if (!m.esPuerta(c, f)) {
    const tipo = m.obtener(c, f);
    const puertas = Object.entries(m.tipos).filter(([, t]) => t.puerta).map(([n]) => `"${n}"`);
    throw new ErrorChispa(
      p,
      tipo ? `la casilla (${c}, ${f}) es de tipo "${tipo}", que no es una puerta.` : `en la casilla (${c}, ${f}) no hay nada: no hay puerta que ${hacia ? 'abrir' : 'cerrar'}.`,
      puertas.length ? `Los tipos que son puerta en este mapa: ${puertas.join(', ')}. Para saber la casilla de un sitio: mapa.columnaEn(x) y mapa.filaEn(y).` : 'Ningún tipo de este mapa es una puerta. En el editor: selecciona el mapa > en el tipo de casilla, marca «es una puerta».',
    );
  }
  m.moverPuerta(c, f, hacia, segundos);
  return null;
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
const PROPIEDADES: Record<string, PropiedadObjeto> = sinPrototipo({
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
  // En primera persona (vista3d): cuánto está levantado del suelo, en píxeles (lo que flota o vuela)
  elevacion: {
    obtener: (o) => o.elevacion,
    asignar: (o, v, p) => {
      const n = comoNumero(v, 'elevacion', p);
      if (!(n >= -10000 && n <= 10000)) throw new ErrorChispa(p, `'elevacion' son los píxeles que el objeto está levantado del suelo, y le das ${n}.`, 'Ejemplo: yo.elevacion = 20');
      o.elevacion = n;
    },
  },
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
  letra: {
    obtener: (o, p) => necesitaSprite(o, 'letra', p).letra,
    asignar: (o, v, p) => {
      const s = necesitaSprite(o, 'letra', p);
      const pedida = aTexto(v);
      const hay = letrasDisponibles();
      const letra = hay.find((l) => normalizar(l) === normalizar(pedida));
      if (!letra) {
        const parecida = sugerir(pedida, hay);
        throw new ErrorChispa(p, `no hay ningún tipo de letra llamado "${pedida}".`, parecida ? `¿Querías decir "${parecida}"?` : `Las letras son: ${hay.join(', ')}. Las tuyas se importan en Proyecto > Letras.`);
      }
      s.letra = letra;
    },
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

  polvo: {
    obtener: (o, p) => necesitaFisica(o, 'polvo', p).polvo,
    asignar: (o, v, p) => (necesitaFisica(o, 'polvo', p).polvo = comoLogico(v, 'polvo', p)),
  },
  efecto: {
    obtener: (o) => o.escena?.efectos.nombreEn(o) ?? null,
    asignar: (o, v, p) => {
      const escena = o.escena;
      if (!escena) return;
      if (v === null || v === false) return escena.efectos.parar(undefined, o);
      const nombre = normalizar(aTexto(v));
      const ok = (EFECTOS_CONTINUOS as readonly string[]).includes(nombre);
      if (!ok) {
        const parecido = sugerir(aTexto(v), [...EFECTOS_CONTINUOS]);
        throw new ErrorChispa(p, `'efecto' de un objeto es uno que dura: ${enumerar([...EFECTOS_CONTINUOS])}, y le das "${aTexto(v)}".`, parecido ? `¿Querías decir "${parecido}"?` : 'Para un efecto de golpe usa efecto.explosion(yo), efecto.chispas(yo)...');
      }
      escena.efectos.parar(undefined, o);
      escena.efectos.empezar(nombre, RECETAS[nombre], o);
    },
  },

  // ── Luz (objetos/Luces.ts): yo.luz = verdadero la enciende, con sus datos ──
  luz: {
    obtener: (o) => o.obtener(Luz)?.activo ?? false,
    asignar: (o, v, p) => {
      // yo.luz = 200: se quería decir lo grande que es
      if (typeof v === 'number') throw new ErrorChispa(p, "'luz' enciende o apaga la luz: tiene que ser verdadero o falso, pero le das un número.", `Para encenderla: yo.luz = verdadero. Lo grande que es se dice aparte: yo.radioLuz = ${v}`);
      const encender = comoLogico(v, 'luz', p);
      const l = o.obtener(Luz);
      if (l) l.activo = encender;
      else if (encender) o.agregar(new Luz());
    },
  },
  tipoluz: datoDeLuz('tipoLuz', (l) => l.tipo, (l, v, p) => (l.tipo = unaOpcion(v, ['punto', 'foco'] as const, 'tipoLuz', p, 'yo.tipoLuz = "foco"'))),
  colorluz: datoDeLuz('colorLuz', (l) => l.color, (l, v, p) => (l.color = unColor(v, 'colorLuz', p))),
  radioluz: datoDeLuz('radioLuz', (l) => l.radio, (l, v, p) => (l.radio = Math.max(0, comoNumero(v, 'radioLuz', p)))),
  intensidadluz: datoDeLuz('intensidadLuz', (l) => l.intensidad, (l, v, p) => {
    const n = comoNumero(v, 'intensidadLuz', p);
    if (!(n >= 0 && n <= 10)) throw new ErrorChispa(p, `la intensidad de la luz va de 0 (apagada) a 10, y le das ${n}.`, 'Ejemplo: yo.intensidadLuz = 0.8');
    l.intensidad = n;
  }),
  anguloluz: datoDeLuz('anguloLuz', (l) => l.angulo, (l, v, p) => (l.angulo = Math.min(360, Math.max(1, comoNumero(v, 'anguloLuz', p))))),
  luzconsombras: datoDeLuz('luzConSombras', (l) => l.sombras, (l, v, p) => (l.sombras = comoLogico(v, 'luzConSombras', p))),
  parpadeoluz: datoDeLuz('parpadeoLuz', (l) => l.parpadeo, (l, v, p) => (l.parpadeo = entre0y1(v, 'parpadeoLuz', p, 'yo.parpadeoLuz = 0.5'))),

  contorno: {
    obtener: (o, p) => necesitaSprite(o, 'contorno', p).contorno,
    asignar: (o, v, p) => (necesitaSprite(o, 'contorno', p).contorno = colorOApagado(v, 'contorno', 'blanco', p)),
  },
  grosorcontorno: {
    obtener: (o, p) => necesitaSprite(o, 'grosorContorno', p).grosorContorno,
    asignar: (o, v, p) => (necesitaSprite(o, 'grosorContorno', p).grosorContorno = acotado(comoNumero(v, 'grosorContorno', p), 0, 1000)),
  },
  brillo: {
    obtener: (o, p) => necesitaSprite(o, 'brillo', p).brillo,
    asignar: (o, v, p) => {
      const n = comoNumero(v, 'brillo', p);
      if (n < 0) throw new ErrorChispa(p, `el brillo no puede ser negativo (0 = negro, 1 = normal, 2 = el doble de claro), y le das ${n}.`, 'Ejemplo: yo.brillo = 1.5');
      necesitaSprite(o, 'brillo', p).brillo = acotado(n, 0, 100);
    },
  },
  grises: {
    obtener: (o, p) => necesitaSprite(o, 'grises', p).grises,
    asignar: (o, v, p) => (necesitaSprite(o, 'grises', p).grises = entre0y1(v, 'grises', p, 'yo.grises = 1')),
  },
  desenfoque: {
    obtener: (o, p) => necesitaSprite(o, 'desenfoque', p).desenfoque,
    asignar: (o, v, p) => (necesitaSprite(o, 'desenfoque', p).desenfoque = acotado(comoNumero(v, 'desenfoque', p), 0, 1000)),
  },

  // ── Estilo (ver motor/Estilo.ts) ──
  relleno: {
    obtener: (o, p) => necesitaSprite(o, 'relleno', p).relleno,
    asignar: (o, v, p) => (necesitaSprite(o, 'relleno', p).relleno = unaOpcion(v, TIPOS_RELLENO, 'relleno', p, 'yo.relleno = "degradado"')),
  },
  color2: {
    obtener: (o, p) => necesitaSprite(o, 'color2', p).color2,
    asignar: (o, v, p) => (necesitaSprite(o, 'color2', p).color2 = unColor(v, 'color2', p)),
  },
  angulodegradado: {
    obtener: (o, p) => necesitaSprite(o, 'anguloDegradado', p).anguloDegradado,
    asignar: (o, v, p) => (necesitaSprite(o, 'anguloDegradado', p).anguloDegradado = comoNumero(v, 'anguloDegradado', p)),
  },
  patron: {
    obtener: (o, p) => necesitaSprite(o, 'patron', p).patron,
    asignar: (o, v, p) => (necesitaSprite(o, 'patron', p).patron = unaOpcion(v, PATRONES, 'patron', p, 'yo.patron = "rayas"')),
  },
  imagenrelleno: {
    obtener: (o, p) => necesitaSprite(o, 'imagenRelleno', p).imagenRelleno,
    asignar: (o, v, p) => {
      const s = necesitaSprite(o, 'imagenRelleno', p);
      if (v === null) return void (s.imagenRelleno = null);
      const nombre = aTexto(v);
      o.escena?.motor.recursos.imagen(nombre); // comprueba que existe (da un error amable si no)
      s.imagenRelleno = nombre;
    },
  },
  borde: {
    obtener: (o, p) => necesitaSprite(o, 'borde', p).borde,
    asignar: (o, v, p) => (necesitaSprite(o, 'borde', p).borde = acotado(comoNumero(v, 'borde', p), 0, 1000)),
  },
  colorborde: {
    obtener: (o, p) => necesitaSprite(o, 'colorBorde', p).colorBorde,
    asignar: (o, v, p) => (necesitaSprite(o, 'colorBorde', p).colorBorde = unColor(v, 'colorBorde', p)),
  },
  bordediscontinuo: {
    obtener: (o, p) => necesitaSprite(o, 'bordeDiscontinuo', p).bordeDiscontinuo,
    asignar: (o, v, p) => (necesitaSprite(o, 'bordeDiscontinuo', p).bordeDiscontinuo = comoLogico(v, 'bordeDiscontinuo', p)),
  },
  sombra: {
    obtener: (o, p) => necesitaSprite(o, 'sombra', p).sombra,
    asignar: (o, v, p) => (necesitaSprite(o, 'sombra', p).sombra = colorOApagado(v, 'sombra', '#00000088', p)),
  },
  sombrax: {
    obtener: (o, p) => necesitaSprite(o, 'sombraX', p).sombraX,
    asignar: (o, v, p) => (necesitaSprite(o, 'sombraX', p).sombraX = acotado(comoNumero(v, 'sombraX', p), -10_000, 10_000)),
  },
  sombray: {
    obtener: (o, p) => necesitaSprite(o, 'sombraY', p).sombraY,
    asignar: (o, v, p) => (necesitaSprite(o, 'sombraY', p).sombraY = acotado(comoNumero(v, 'sombraY', p), -10_000, 10_000)),
  },
  desenfoquesombra: {
    obtener: (o, p) => necesitaSprite(o, 'desenfoqueSombra', p).desenfoqueSombra,
    asignar: (o, v, p) => (necesitaSprite(o, 'desenfoqueSombra', p).desenfoqueSombra = acotado(comoNumero(v, 'desenfoqueSombra', p), 0, 1000)),
  },
  resplandor: {
    obtener: (o, p) => necesitaSprite(o, 'resplandor', p).resplandor,
    asignar: (o, v, p) => (necesitaSprite(o, 'resplandor', p).resplandor = colorOApagado(v, 'resplandor', 'amarillo', p)),
  },
  tamanoresplandor: {
    obtener: (o, p) => necesitaSprite(o, 'tamanoResplandor', p).tamanoResplandor,
    asignar: (o, v, p) => (necesitaSprite(o, 'tamanoResplandor', p).tamanoResplandor = acotado(comoNumero(v, 'tamanoResplandor', p), 0, 1000)),
  },
  mezcla: {
    obtener: (o, p) => necesitaSprite(o, 'mezcla', p).mezcla,
    asignar: (o, v, p) => (necesitaSprite(o, 'mezcla', p).mezcla = unaOpcion(v, NOMBRES_MEZCLAS, 'mezcla', p, 'yo.mezcla = "sumar"')),
  },

  // ── Formas (ver objetos/formas/figuras.ts) ──
  forma: {
    obtener: (o, p) => necesitaSprite(o, 'forma', p).forma,
    asignar: (o, v, p) => {
      const s = necesitaSprite(o, 'forma', p);
      const nombre = normalizar(aTexto(v));
      const forma = FORMAS.find((f) => f === nombre);
      if (!forma) {
        const parecida = sugerir(aTexto(v), [...FORMAS]);
        throw new ErrorChispa(p, `no hay ninguna forma llamada "${aTexto(v)}".`, parecida ? `¿Querías decir "${parecida}"?` : `Las formas son: ${enumerar([...FORMAS])}.`);
      }
      s.forma = forma;
      s.imagen = null; // una forma se ve como forma, no con su imagen
    },
  },
  lados: {
    obtener: (o, p) => necesitaSprite(o, 'lados', p).lados ?? (necesitaSprite(o, 'lados', p).forma === 'estrella' ? POR_DEFECTO.puntas : POR_DEFECTO.lados),
    asignar: (o, v, p) => {
      const n = comoNumero(v, 'lados', p);
      if (!(n >= 3 && n <= MAX_LADOS)) throw new ErrorChispa(p, `una forma tiene de 3 a ${MAX_LADOS} lados (o puntas), y le das ${n}.`, 'Ejemplo: yo.lados = 6 (un hexágono)');
      necesitaSprite(o, 'lados', p).lados = Math.round(n);
    },
  },
  radiointerior: {
    obtener: (o, p) => necesitaSprite(o, 'radioInterior', p).radioInterior ?? (necesitaSprite(o, 'radioInterior', p).forma === 'estrella' ? POR_DEFECTO.radioInteriorEstrella : POR_DEFECTO.radioInteriorAnillo),
    asignar: (o, v, p) => (necesitaSprite(o, 'radioInterior', p).radioInterior = entre0y1(v, 'radioInterior', p, 'yo.radioInterior = 0.4')),
  },
  radioesquina: {
    obtener: (o, p) => necesitaSprite(o, 'radioEsquina', p).radioEsquina ?? Math.min(necesitaSprite(o, 'radioEsquina', p).ancho, necesitaSprite(o, 'radioEsquina', p).alto) * 0.2,
    asignar: (o, v, p) => (necesitaSprite(o, 'radioEsquina', p).radioEsquina = Math.max(0, comoNumero(v, 'radioEsquina', p))),
  },
  inicioarco: {
    obtener: (o, p) => necesitaSprite(o, 'inicioArco', p).inicioArco ?? POR_DEFECTO.desde,
    asignar: (o, v, p) => (necesitaSprite(o, 'inicioArco', p).inicioArco = comoNumero(v, 'inicioArco', p)),
  },
  finarco: {
    obtener: (o, p) => necesitaSprite(o, 'finArco', p).finArco ?? POR_DEFECTO.hasta,
    asignar: (o, v, p) => (necesitaSprite(o, 'finArco', p).finArco = comoNumero(v, 'finArco', p)),
  },
  grosor: {
    obtener: (o, p) => necesitaSprite(o, 'grosor', p).grosor ?? POR_DEFECTO.grosor,
    asignar: (o, v, p) => (necesitaSprite(o, 'grosor', p).grosor = Math.max(1, comoNumero(v, 'grosor', p))),
  },
  formacolision: {
    obtener: (o, p) => necesitaColision(o, 'formaColision', p).forma,
    asignar: (o, v, p) => {
      const t = normalizar(aTexto(v));
      if (t !== 'auto' && t !== 'caja' && t !== 'figura') throw new ErrorChispa(p, `la forma de la colisión es "auto", "caja" o "figura", y le das "${aTexto(v)}".`, 'Ejemplo: yo.formaColision = "caja" (choca como un rectángulo, aunque se vea como una estrella)');
      necesitaColision(o, 'formaColision', p).forma = t;
    },
  },
  destruido: { obtener: (o) => o.destruido },
  yendo: { obtener: (o) => o.obtener(Comportamiento)?.yendo ?? false },
});

/** Un texto que tiene que ser una de estas opciones (con sugerencia si se parece a una). */
function unaOpcion<T extends string>(v: Valor, opciones: readonly T[], nombre: string, p: Posicion, ejemplo: string): T {
  const t = normalizar(aTexto(v));
  const ok = opciones.find((x) => normalizar(x) === t);
  if (ok) return ok;
  const parecida = sugerir(aTexto(v), [...opciones]);
  throw new ErrorChispa(p, `'${nombre}' no puede ser "${aTexto(v)}".`, parecida ? `¿Querías decir "${parecida}"? (por ejemplo: ${ejemplo})` : `Puede ser: ${enumerar([...opciones])}. Ejemplo: ${ejemplo}`);
}

/** Un color de verdad ("rojo", "#ff8800"...). */
export function unColor(v: Valor, nombre: string, p: Posicion): string {
  const c = aTexto(v);
  if (typeof v !== 'string' || !esColorValido(c)) {
    // "blanquito" → "blanco": por parecido, o porque empieza igual
    const parecido = sugerir(c, NOMBRES_COLORES) ?? NOMBRES_COLORES.find((n) => normalizar(c).startsWith(n.slice(0, 4)));
    throw new ErrorChispa(p, `'${nombre}' tiene que ser un color, y "${c}" no lo es.`, parecido ? `¿Querías decir "${parecido}"?` : `Un nombre (${NOMBRES_COLORES.slice(0, 6).join(', ')}...) o un código como "#ff8800".`);
  }
  return c;
}

/** Un color, o nulo/falso para quitarlo (verdadero = el color de siempre). */
function colorOApagado(v: Valor, nombre: string, porDefecto: string, p: Posicion): string | null {
  if (v === null || v === false) return null;
  if (v === true) return porDefecto;
  return unColor(v, nombre, p);
}

/** Un dato de la luz del objeto: si no tiene luz, se le pone una al cambiarlo (leerlo sin luz es un error claro). */
function datoDeLuz(nombre: string, leer: (l: Luz) => Valor, escribir: (l: Luz, v: Valor, p: Posicion) => void): PropiedadObjeto {
  return {
    obtener: (o, p) => {
      const l = o.obtener(Luz);
      if (!l) throw new ErrorChispa(p, `el objeto '${o.nombre}' no tiene luz, así que no tiene '${nombre}'.`, 'Enciéndela primero: yo.luz = verdadero (o en el editor, la sección Luz).');
      return leer(l);
    },
    asignar: (o, v, p) => escribir(o.obtener(Luz) ?? o.agregar(new Luz()), v, p),
  };
}

/** Un número de 0 a 1 (da un error claro si no). */
function entre0y1(v: Valor, nombre: string, p: Posicion, ejemplo: string): number {
  const n = comoNumero(v, nombre, p);
  if (!(n >= 0 && n <= 1)) throw new ErrorChispa(p, `'${nombre}' va de 0 a 1, y le das ${n}.`, `Ejemplo: ${ejemplo}`);
  return n;
}

/** yo.moviendo solo existe si el objeto tiene un recorrido (se pone en el editor). */
function necesitaRecorrido(o: ObjetoJuego, pos: Posicion): Recorrido {
  const r = o.obtener(Recorrido);
  if (!r) throw new ErrorChispa(pos, `el objeto '${o.nombre}' no tiene recorrido, así que no tiene 'moviendo'.`, 'El recorrido se pone en el editor: Propiedades > Recorrido (para plataformas que se mueven solas).');
  return r;
}

/** Acciones de cualquier objeto: yo.saltar(), yo.mover(10, 0)... */
const METODOS: Record<string, (o: ObjetoJuego, args: Valor[], pos: Posicion) => Valor> = sinPrototipo({
  saltar: (o, a, p) => {
    // Solo salta si está en el suelo. Devuelve verdadero si ha saltado.
    const f = necesitaFisica(o, 'saltar', p);
    const fuerza = argNumero(a, 0, 'saltar', p, 'yo.saltar(600)', 600);
    if (!f.enSuelo) return false;
    f.velocidad.y = Math.abs(fuerza); // positivo = hacia ARRIBA
    f.enSuelo = false;
    if (f.polvo) o.escena?.efectos.polvo(o);
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
      const mia = o.obtener(Colision);
      const suya = x.obtener(Colision);
      if (b && suya && toca(b) && (!mia || tocanDeVerdad(mia, suya))) return true;
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
    // Lo más fácil para empezar: flechas (o W A S D) y ya se mueve (ver moverConEjes.ts).
    //  - Si el objeto CAE (tiene física y hay gravedad): solo izquierda y derecha (para saltar, yo.saltar()).
    //  - Si no (juegos vistos desde arriba, naves...): en las cuatro direcciones.
    const rapidez = argNumero(a, 0, 'moverConFlechas', p, 'yo.moverConFlechas(300)', 300);
    const escena = o.escena;
    if (!escena) return false;
    const pulsada = (...teclas: string[]) => teclas.some((t) => escena.motor.entrada.estaPulsada(t));
    let dx = (pulsada('derecha', 'd') ? 1 : 0) - (pulsada('izquierda', 'a') ? 1 : 0);
    let dy = (pulsada('arriba', 'w') ? 1 : 0) - (pulsada('abajo', 's') ? 1 : 0);
    // Con la palanca del mando, poco inclinada = despacio (más fino que las flechas)
    const m = escena.motor.entrada.mando;
    if (m.conectado && (m.ejeX !== 0 || m.ejeY !== 0)) [dx, dy] = [m.ejeX, m.ejeY];
    // Y lo mismo con la palanca de la pantalla (tactil.joystick()), para jugar con el dedo
    const t = escena.motor.entrada.tactil;
    if (t && (t.x !== 0 || t.y !== 0)) [dx, dy] = [t.x, t.y];
    return moverConEjes(o, dx, dy, rapidez);
  },
  moverconjugador: (o, a, p) => {
    // Como moverConFlechas, pero con los controles de UN jugador (su trozo del teclado o su mando)
    const ej = 'yo.moverConJugador(2, 300)';
    const n = numeroDeJugador(a[0], 'moverConJugador', p);
    const rapidez = argNumero(a, 1, 'moverConJugador', p, ej, 300);
    if (!o.escena) return false;
    const ejes = o.escena.jugadores.ejes(n);
    return moverConEjes(o, ejes.x, ejes.y, rapidez);
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
  atravesar: (o, a, p) => {
    // yo.atravesar("enemigo"): no choca con ellos (pero sí con las paredes, y sigue avisando con «cuando toco»)
    o.atraviesa.add(normalizar(argEtiqueta(a, 'atravesar', p)));
    return null;
  },
  dejardeatravesar: (o, a, p) => {
    o.atraviesa.delete(normalizar(argEtiqueta(a, 'dejarDeAtravesar', p)));
    return null;
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

  flash: (o, a, p) => {
    // yo.flash(): el objeto entero de un color un momento (al recibir un golpe)
    const ej = 'yo.flash("blanco", 0.1)';
    const s = necesitaSprite(o, 'flash', p);
    const color = a[0] === undefined ? 'blanco' : unColor(a[0], 'flash', p);
    const segundos = argNumero(a, 1, 'flash', p, ej, 0.1);
    if (segundos < 0) throw new ErrorChispa(p, 'los segundos no pueden ser negativos.', `Ejemplo: ${ej}`);
    s.flash(color, segundos);
    return null;
  },
  ponercamino: (o, a, p) => {
    // Una forma libre con estos puntos (relativos al centro del objeto, en píxeles)
    const ej = 'yo.ponerCamino([vector(-50, -30), vector(0, 40), vector(50, -30)])';
    const s = necesitaSprite(o, 'ponerCamino', p);
    const lista = a[0];
    if (!Array.isArray(lista) || lista.length < 2) throw new ErrorChispa(p, 'ponerCamino necesita una lista de al menos 2 puntos (vectores).', `Ejemplo: ${ej}`);
    if (lista.length > MAX_PUNTOS_CAMINO) throw new ErrorChispa(p, `un camino puede tener como mucho ${MAX_PUNTOS_CAMINO} puntos, y le das ${lista.length}.`);
    const puntos = lista.map((v, i) => {
      if (!(v instanceof Vector2)) throw new ErrorChispa(p, `el punto ${i + 1} del camino no es un vector, es ${nombreTipo(v)}.`, `Ejemplo: ${ej}`);
      return v;
    });
    const cerrado = a[1] === undefined ? true : comoLogico(a[1], 'ponerCamino', p);
    // El tamaño del objeto pasa a ser lo que ocupa el camino; los puntos se guardan en unidades de ese tamaño
    const xs = puntos.map((v) => v.x);
    const ys = puntos.map((v) => v.y);
    const ancho = Math.max(1, Math.max(...xs.map(Math.abs)) * 2);
    const alto = Math.max(1, Math.max(...ys.map(Math.abs)) * 2);
    s.forma = 'camino';
    s.imagen = null;
    s.figuras = undefined;
    s.cerrado = cerrado;
    s.ancho = ancho;
    s.alto = alto;
    s.puntos = puntos.map((v) => ({ x: v.x / ancho, y: v.y / alto }));
    return null;
  },

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
  abrirpuerta: (o, a, p) => moverPuerta(o, a, p, 'abrirPuerta', 1),
  cerrarpuerta: (o, a, p) => moverPuerta(o, a, p, 'cerrarPuerta', 0),
  puertaabierta: (o, a, p) => {
    const ej = 'si mapa.puertaAbierta(5, 3):';
    return necesitaMapa(o, 'puertaAbierta', p).abierta(argNumero(a, 0, 'puertaAbierta', p, ej), argNumero(a, 1, 'puertaAbierta', p, ej));
  },
  espuerta: (o, a, p) => {
    const ej = 'si mapa.esPuerta(5, 3):';
    return necesitaMapa(o, 'esPuerta', p).esPuerta(argNumero(a, 0, 'esPuerta', p, ej), argNumero(a, 1, 'esPuerta', p, ej));
  },
  centrodecasilla: (o, a, p) => {
    const ej = 'mapa.centroDeCasilla(3, 0)';
    const c = necesitaMapa(o, 'centroDeCasilla', p).centroDe(argNumero(a, 0, 'centroDeCasilla', p, ej), argNumero(a, 1, 'centroDeCasilla', p, ej));
    return new Vector2(c.x, c.y);
  },
});

const NOMBRES_BONITOS = [
  'nombre', 'tipo', 'x', 'y', 'posicion', 'rotacion', 'escala', 'velocidad', 'gravedad', 'enSuelo', 'tocaPared', 'tocaTecho',
  'color', 'visible', 'ancho', 'alto', 'texto', 'tamaño', 'colorTexto', 'letra', 'imagen', 'opacidad', 'voltear', 'capa', 'fijo',
  'solido', 'fantasma', 'rozamiento', 'rebote', 'masa', 'estatico', 'moviendo', 'animacion', 'ratonEncima', 'destruido',
  'saltar', 'mover', 'rotar', 'destruir', 'distanciaA', 'empujar', 'animar', 'pararAnimacion', 'moverHacia', 'mirarA', 'direccionA',
  'moverConFlechas', 'moverConJugador', 'casilla', 'ponerCasilla', 'quitarCasilla', 'casillaEn', 'columnaEn', 'filaEn', 'centroDeCasilla', 'abrirPuerta', 'cerrarPuerta', 'puertaAbierta', 'esPuerta', 'elevacion',
  'tamanoLetra', 'transparencia', 'voltearVertical', 'etiquetas', 'padre', 'hijos', 'arrastrable', 'arrastrando',
  'teletransportar', 'irA', 'anguloA', 'rotarHacia', 'avanzar', 'ocultar', 'aparecer', 'parpadear', 'ponerDelante', 'ponerDetras',
  'tocando', 'cercanos', 'masCercano', 'clonar', 'ponerEtiqueta', 'quitarEtiqueta', 'tieneEtiqueta', 'pegarA', 'soltar',
  'irHacia', 'parar', 'yendo', 'atravesar', 'dejarDeAtravesar',
  'luz', 'tipoLuz', 'colorLuz', 'radioLuz', 'intensidadLuz', 'anguloLuz', 'luzConSombras', 'parpadeoLuz',
  'polvo', 'efecto', 'contorno', 'grosorContorno', 'brillo', 'grises', 'desenfoque', 'flash', 'relleno', 'color2', 'anguloDegradado', 'patron', 'imagenRelleno', 'borde', 'colorBorde', 'bordeDiscontinuo',
  'sombra', 'sombraX', 'sombraY', 'desenfoqueSombra', 'resplandor', 'tamanoResplandor', 'mezcla',
  'forma', 'lados', 'radioInterior', 'radioEsquina', 'inicioArco', 'finArco', 'grosor', 'formaColision', 'ponerCamino',
];

interface PropiedadPropia {
  valor: Valor;
  original: string;
}

// "tamano" (sin ñ) también vale, para teclados sin ñ
PROPIEDADES.tamano = PROPIEDADES['tamaño'];

/** Nombres de las propiedades y acciones del motor, tal como se escriben oficialmente. */
/** Todo lo que tiene un objeto: lo de siempre y lo de los controles de interfaz. */
export const NOMBRES_PROPIEDADES_OBJETO = [...NOMBRES_BONITOS, ...NOMBRES_CONTROL];

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
    return [...NOMBRES_BONITOS, ...(controlDe(this.objeto) ? NOMBRES_CONTROL : []), ...[...this.propias().values()].map((x) => x.original), ...(this.script()?.nombresDeFunciones() ?? [])];
  }

  /** Su script (si tiene): para llamar a sus funciones desde otros objetos. */
  private script(): ScriptDeObjeto | null {
    return (this.objeto.todosLosComponentes.find((c) => 'funcionDelScript' in c) as unknown as ScriptDeObjeto | undefined) ?? null;
  }

  obtener(p: string, original: string, pos: Posicion): Valor {
    const o = this.objeto;
    // Lo de los controles de interfaz (yo.valor, yo.abrir()...) solo existe si el objeto es un control
    const control = esDeControl(p) ? controlDe(o) : null;
    if (control) {
      if (PROPIEDADES_CONTROL[p]) return PROPIEDADES_CONTROL[p].obtener(control, o, pos);
      return new FuncionNativa(original, (args, pos2) => METODOS_CONTROL[p](control, args, pos2));
    }
    if (PROPIEDADES[p]) return PROPIEDADES[p].obtener(o, pos);
    if (METODOS[p]) return new FuncionNativa(original, (args, pos2) => METODOS[p](o, args, pos2));
    const propia = this.propias().get(p);
    if (propia) return propia.valor;
    // Una función de su script: buscar("Puerta").abrir()
    const script = this.script();
    const funcion = script?.funcionDelScript(p);
    if (funcion) return funcion;
    if (esDeControl(p)) {
      throw new ErrorChispa(pos, `'${original}' es de los controles de interfaz (barra, deslizador, lista, ventana...), y '${o.nombre}' no es un control.`, `En el editor: Añadir > Interfaz. Si es una propiedad tuya, dale un valor antes: yo.${original} = 0`);
    }
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
    const control = esDeControl(p) ? controlDe(this.objeto) : null;
    if (control) {
      const deControl = PROPIEDADES_CONTROL[p];
      if (!deControl) throw new ErrorChispa(pos, `'${original}' es una acción del control (se usa con paréntesis), no se le puede dar un valor.`, `Ejemplo: yo.${original}(...)`);
      if (!deControl.asignar) throw new ErrorChispa(pos, `'${original}' solo se puede leer, no cambiar.`);
      return deControl.asignar(control, v, pos, this.objeto);
    }
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
    const parecido = this.propias().has(p) || esDeControl(p) ? null : propiedadMalEscrita(original);
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
  return nombre in PROPIEDADES || nombre in METODOS || esDeControl(nombre);
}
