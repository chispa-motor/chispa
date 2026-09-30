/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * VALIDAR UN PROYECTO antes de abrirlo.
 *
 * Un .chispa.json puede venir de cualquier sitio: te lo pasa un amigo, lo
 * descargas de internet... Antes de usarlo comprobamos TODA su estructura:
 *   - cada cosa tiene el tipo que toca (un número es un número, un nombre es
 *     un texto corto...),
 *   - las imágenes y los sonidos van dentro del archivo y son de verdad
 *     imágenes y sonidos (ver archivos.ts),
 *   - los colores son colores (y no trucos para colar otra cosa),
 *   - nada es tan grande que congele el navegador.
 * Lo que no encaja se RECHAZA con un error que dice dónde está el problema.
 * Lo que no conocemos (campos de más) se ignora y no llega al editor.
 *
 * El resultado es un proyecto NUEVO, construido campo a campo: nada del
 * archivo original pasa "tal cual".
 */
import { ErrorMotor } from '../motor/Errores';
import { esColorValido } from '../motor/Color';
import { esNombreProhibido } from '../utilidades/seguro';
import { problemaDataURL } from './archivos';
import type { DatoInicial, DefCamara, DefColision, DefComportamiento, DefEscena, DefFisica, DefMapa, DefObjeto, DefProyecto, DefRecorrido, DefSprite } from './formato';
import type { DefAnimacion } from '../objetos/componentes/Animador';
import type { TipoCasilla } from '../objetos/componentes/MapaCasillas';

/** Cuánto puede tener un proyecto como mucho. Mucho más de lo que usa cualquier juego. */
export const LIMITES_PROYECTO = {
  /** Tamaño del archivo .chispa.json (en letras). */
  archivo: 200 * 1024 * 1024,
  escenas: 500,
  objetosPorEscena: 20_000,
  plantillas: 5_000,
  scripts: 2_000,
  letrasPorScript: 1_000_000,
  imagenes: 5_000,
  sonidos: 2_000,
  animaciones: 2_000,
  fotogramas: 2_000,
  casillas: 1_000_000,
  tiposDeCasilla: 1_000,
  puntosDeRecorrido: 1_000,
  propiedades: 500,
  datos: 1_000,
  letrasNombre: 200,
  letrasTexto: 20_000,
  anchoAlto: 8_192,
} as const;

type Ruta = (string | number)[];

class ProyectoNoValido extends ErrorMotor {}

function fallo(ruta: Ruta, problema: string): never {
  const donde = ruta.length ? ruta.map(String).join(' → ') : 'el archivo';
  throw new ProyectoNoValido(
    `Este proyecto tiene algo que no está bien, y por seguridad no se abre. En «${donde}»: ${problema}.`,
    'Puede que el archivo esté dañado o que lo haya cambiado otro programa. Si te lo ha pasado otra persona, pídele que lo guarde otra vez desde Chispa.',
  );
}

// ───────────────────────── Piezas pequeñas ─────────────────────────

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function objeto(v: unknown, ruta: Ruta): Record<string, unknown> {
  if (!esObjeto(v)) fallo(ruta, `tendría que ser un grupo de datos { }, pero es ${describir(v)}`);
  return v;
}

function describir(v: unknown): string {
  if (v === null) return 'nulo';
  if (Array.isArray(v)) return 'una lista';
  if (typeof v === 'string') return `un texto («${v.slice(0, 30)}${v.length > 30 ? '…' : ''}»)`;
  if (typeof v === 'number') return `un número (${v})`;
  if (typeof v === 'boolean') return 'verdadero o falso';
  return 'otra cosa';
}

/** Letras invisibles de control (menos salto de línea y tabulador): no pintan nada en un nombre. */
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/;

function texto(v: unknown, ruta: Ruta, maximo: number = LIMITES_PROYECTO.letrasNombre, lineas = false): string {
  if (typeof v !== 'string') fallo(ruta, `tendría que ser un texto, pero es ${describir(v)}`);
  if (v.length > maximo) fallo(ruta, `es un texto demasiado largo (${v.length} letras; el máximo es ${maximo})`);
  if (CONTROL.test(v) || (!lineas && /[\n\r\t]/.test(v))) fallo(ruta, 'tiene letras invisibles o saltos de línea que no pueden ir ahí');
  return v;
}

function numero(v: unknown, ruta: Ruta, min = -1e9, max = 1e9): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fallo(ruta, `tendría que ser un número, pero es ${describir(v)}`);
  if (v < min || v > max) fallo(ruta, `el número ${v} se sale de lo permitido (de ${min} a ${max})`);
  return v;
}

function logico(v: unknown, ruta: Ruta): boolean {
  if (typeof v !== 'boolean') fallo(ruta, `tendría que ser verdadero o falso, pero es ${describir(v)}`);
  return v;
}

function unoDe<T extends string>(v: unknown, ruta: Ruta, opciones: readonly T[]): T {
  if (typeof v !== 'string' || !opciones.includes(v as T)) fallo(ruta, `tendría que ser uno de estos: ${opciones.join(', ')}; pero es ${describir(v)}`);
  return v as T;
}

function color(v: unknown, ruta: Ruta): string {
  const c = texto(v, ruta, 60);
  if (!esColorValido(c)) fallo(ruta, `«${c}» no es un color (por ejemplo: "rojo" o "#ff8800")`);
  return c;
}

function lista<T>(v: unknown, ruta: Ruta, maximo: number, cada: (x: unknown, ruta: Ruta) => T): T[] {
  if (!Array.isArray(v)) fallo(ruta, `tendría que ser una lista [ ], pero es ${describir(v)}`);
  if (v.length > maximo) fallo(ruta, `tiene demasiados elementos (${v.length}; el máximo es ${maximo})`);
  return v.map((x, i) => cada(x, [...ruta, i + 1]));
}

/** Nombre → algo. Las claves también se comprueban (y "__proto__", que es peligrosa, se rechaza). */
function registro<T>(v: unknown, ruta: Ruta, maximo: number, cada: (x: unknown, ruta: Ruta) => T, clave: (k: string, ruta: Ruta) => void = (k, r) => void texto(k, r)): Record<string, T> {
  const o = objeto(v, ruta);
  const claves = Object.keys(o);
  if (claves.length > maximo) fallo(ruta, `tiene demasiadas cosas (${claves.length}; el máximo es ${maximo})`);
  const r: Record<string, T> = {};
  for (const k of claves) {
    if (esNombreProhibido(k)) fallo([...ruta, k], 'ese nombre está reservado y no se puede usar');
    clave(k, [...ruta, k]);
    Object.defineProperty(r, k, { value: cada(o[k], [...ruta, k]), enumerable: true, writable: true, configurable: true });
  }
  return r;
}

/**
 * Copia los campos que conocemos, comprobando cada uno. Los que no están (o
 * son null) no se copian; los que no conocemos se ignoran.
 */
function campos<T>(o: Record<string, unknown>, ruta: Ruta, reglas: { [K in keyof T]-?: (v: unknown, ruta: Ruta) => T[K] }): T {
  const r: Partial<T> = {};
  for (const k of Object.keys(reglas) as (keyof T & string)[]) {
    const v = o[k];
    if (v === undefined || v === null) continue;
    r[k] = reglas[k](v, [...ruta, k]);
  }
  return r as T;
}

const dato = (v: unknown, ruta: Ruta): DatoInicial => {
  if (typeof v === 'string') return texto(v, ruta, LIMITES_PROYECTO.letrasTexto, true);
  if (typeof v === 'number') return numero(v, ruta, -Number.MAX_VALUE, Number.MAX_VALUE);
  if (typeof v === 'boolean') return v;
  fallo(ruta, `tendría que ser un número, un texto o verdadero/falso, pero es ${describir(v)}`);
};

const nombre = (v: unknown, r: Ruta) => texto(v, r);

// ───────────────────────── Partes del proyecto ─────────────────────────

function sprite(v: unknown, ruta: Ruta): DefSprite {
  return campos<DefSprite>(objeto(v, ruta), ruta, {
    imagen: nombre,
    forma: (x, r) => unoDe(x, r, ['rectangulo', 'circulo', 'texto'] as const),
    color,
    ancho: (x, r) => numero(x, r, -1e6, 1e6),
    alto: (x, r) => numero(x, r, -1e6, 1e6),
    capa: numero,
    visible: logico,
    opacidad: numero,
    voltear: logico,
    fijo: logico,
    texto: (x, r) => texto(x, r, LIMITES_PROYECTO.letrasTexto, true),
    tamano: (x, r) => numero(x, r, 0, 10_000),
    colorTexto: color,
    alinear: (x, r) => unoDe(x, r, ['izquierda', 'centro', 'derecha'] as const),
  });
}

function colision(v: unknown, ruta: Ruta): DefColision {
  return campos<DefColision>(objeto(v, ruta), ruta, {
    ancho: numero,
    alto: numero,
    solido: logico,
    desplazamientoX: numero,
    desplazamientoY: numero,
    soloDesdeArriba: logico,
  });
}

function fisica(v: unknown, ruta: Ruta): DefFisica {
  return campos<DefFisica>(objeto(v, ruta), ruta, { gravedad: numero, estatico: logico, rozamiento: numero, rebote: numero, masa: numero });
}

function tipoCasilla(v: unknown, ruta: Ruta): TipoCasilla {
  return campos<TipoCasilla>(objeto(v, ruta), ruta, { imagen: nombre, color, solida: logico, soloDesdeArriba: logico });
}

function mapa(v: unknown, ruta: Ruta): DefMapa {
  const o = objeto(v, ruta);
  const m = campos<DefMapa>(o, ruta, {
    tamano: (x, r) => numero(x, r, 1, 4096),
    capa: numero,
    tipos: (x, r) => registro(x, r, LIMITES_PROYECTO.tiposDeCasilla, tipoCasilla),
    celdas: (x, r) =>
      registro(x, r, LIMITES_PROYECTO.casillas, nombre, (k, rk) => {
        if (!/^-?\d{1,7},-?\d{1,7}$/.test(k)) fallo(rk, 'una casilla se escribe "columna,fila" (por ejemplo "3,-2")');
      }),
  });
  if (m.tamano === undefined) fallo([...ruta, 'tamano'], 'falta el tamaño de las casillas');
  return { ...m, tipos: m.tipos ?? {}, celdas: m.celdas ?? {} };
}

function recorrido(v: unknown, ruta: Ruta): DefRecorrido {
  const r = campos<DefRecorrido>(objeto(v, ruta), ruta, {
    puntos: (x, rr) => lista(x, rr, LIMITES_PROYECTO.puntosDeRecorrido, (p, rp) => {
      const o = objeto(p, rp);
      return { x: numero(o.x, [...rp, 'x']), y: numero(o.y, [...rp, 'y']) };
    }),
    rapidez: numero,
    modo: (x, rr) => unoDe(x, rr, ['idaYVuelta', 'bucle'] as const),
    pausa: numero,
  });
  return { ...r, puntos: r.puntos ?? [] };
}

function comportamiento(v: unknown, ruta: Ruta): DefComportamiento {
  const c = campos<DefComportamiento>(objeto(v, ruta), ruta, {
    tipo: (x, r) => unoDe(x, r, ['seguir', 'perseguir', 'huir'] as const),
    objetivo: nombre,
    rapidez: numero,
    distancia: numero,
  });
  if (!c.tipo) fallo([...ruta, 'tipo'], 'falta qué hace (seguir, perseguir o huir)');
  return { ...c, objetivo: c.objetivo ?? '' };
}

function objetoJuego(v: unknown, ruta: Ruta): DefObjeto {
  return campos<DefObjeto>(objeto(v, ruta), ruta, {
    nombre,
    tipo: nombre,
    plantilla: nombre,
    x: numero,
    y: numero,
    rotacion: numero,
    escala: numero,
    sprite,
    colision,
    fisica,
    mapa,
    recorrido,
    comportamiento,
    animacion: nombre,
    script: nombre,
    propiedades: (x, r) => registro(x, r, LIMITES_PROYECTO.propiedades, dato),
  });
}

function camara(v: unknown, ruta: Ruta): DefCamara {
  return campos<DefCamara>(objeto(v, ruta), ruta, {
    x: numero,
    y: numero,
    zoom: (x, r) => numero(x, r, 0.001, 1000),
    seguir: nombre,
    limites: (x, r) => {
      const o = objeto(x, r);
      return { izquierda: numero(o.izquierda, [...r, 'izquierda']), abajo: numero(o.abajo, [...r, 'abajo']), derecha: numero(o.derecha, [...r, 'derecha']), arriba: numero(o.arriba, [...r, 'arriba']) };
    },
    limitarAlMapa: logico,
  });
}

function escena(v: unknown, ruta: Ruta): DefEscena {
  const e = campos<DefEscena>(objeto(v, ruta), ruta, {
    colorFondo: color,
    gravedad: numero,
    camara,
    objetos: (x, r) => lista(x, r, LIMITES_PROYECTO.objetosPorEscena, objetoJuego),
  });
  return { ...e, colorFondo: e.colorFondo ?? '#1e2233', objetos: e.objetos ?? [] };
}

function animacion(v: unknown, ruta: Ruta): DefAnimacion {
  const o = objeto(v, ruta);
  return {
    fotogramas: lista(o.fotogramas ?? [], [...ruta, 'fotogramas'], LIMITES_PROYECTO.fotogramas, nombre),
    velocidad: o.velocidad === undefined ? 8 : numero(o.velocidad, [...ruta, 'velocidad'], 0, 1000),
    repetir: o.repetir === undefined ? true : logico(o.repetir, [...ruta, 'repetir']),
  };
}

const recurso = (tipo: 'imagen' | 'sonido') => (v: unknown, ruta: Ruta): string => {
  if (typeof v !== 'string') fallo(ruta, `tendría que ser ${tipo === 'imagen' ? 'una imagen' : 'un sonido'}, pero es ${describir(v)}`);
  const problema = problemaDataURL(v, tipo);
  if (problema) fallo(ruta, problema);
  return v;
};

// ───────────────────────── El proyecto entero ─────────────────────────

/**
 * Comprueba un proyecto (ya en la versión actual, sin completar) y devuelve
 * una copia limpia. Lanza un ErrorMotor con el sitio exacto del problema.
 */
export function validarProyecto(datos: unknown): Partial<DefProyecto> {
  const o = objeto(datos, []);
  const L = LIMITES_PROYECTO;
  return campos<Partial<DefProyecto>>(o, [], {
    formato: (x, r) => unoDe(x, r, ['chispa-proyecto'] as const),
    version: (x, r) => numero(x, r, 1, 1000),
    id: (x, r) => {
      const id = texto(x, r, 64);
      if (!/^[a-z0-9-]{8,64}$/i.test(id)) fallo(r, 'no es un identificador de proyecto');
      return id;
    },
    nombre: (x, r) => texto(x, r, 100),
    ancho: (x, r) => numero(x, r, 16, L.anchoAlto),
    alto: (x, r) => numero(x, r, 16, L.anchoAlto),
    pixelArt: logico,
    controlesTactiles: logico,
    imagenes: (x, r) => registro(x, r, L.imagenes, recurso('imagen')),
    sonidos: (x, r) => registro(x, r, L.sonidos, recurso('sonido')),
    animaciones: (x, r) => registro(x, r, L.animaciones, animacion),
    scripts: (x, r) => registro(x, r, L.scripts, (c, rc) => texto(c, rc, L.letrasPorScript, true)),
    plantillas: (x, r) => registro(x, r, L.plantillas, objetoJuego),
    escenas: (x, r) => registro(x, r, L.escenas, escena),
    escenaInicial: nombre,
    bloques: (x, r) => lista(x, r, L.scripts, nombre),
    datos: (x, r) => registro(x, r, L.datos, dato),
  });
}
