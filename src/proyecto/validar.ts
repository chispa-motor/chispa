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
import { problemaDataURL, problemaLetra } from './archivos';
import { MAXIMO_CASILLAS, MAXIMO_OPCIONES, TIPOS_CONTROL } from '../objetos/componentes/Control';
import { LIMITES_SONIDO, ONDAS, completarSonido, type ParamsSonido } from '../sonido/generador';
import { INSTRUMENTOS, LIMITES_CANCION, type DefCancion, type NotaCancion, type PistaCancion } from '../sonido/musica';
import type { DefControl, DefLuz } from './formato';
import type { DatoInicial, DefCamara, DefColision, DefComportamiento, DefEscena, DefFisica, DefMapa, DefObjeto, DefProyecto, DefRecorrido, DefSprite } from './formato';
import type { DefAnimacion } from '../objetos/componentes/Animador';
import type { TipoCasilla } from '../objetos/componentes/MapaCasillas';
import { NOMBRES_MEZCLAS, PATRONES, TIPOS_RELLENO } from '../motor/Estilo';
import { CLIMAS, type Clima } from '../objetos/Efectos';
import type { Filtros } from '../motor/Filtros';
import { FORMAS_PARTICULA, MAXIMO_PARTICULAS, type ConfigParticulas } from '../objetos/Particulas';
import { FORMAS, MAX_LADOS, MAX_PUNTOS_CAMINO, type PuntoCamino } from '../objetos/formas/figuras';

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
    forma: (x, r) => unoDe(x, r, FORMAS),
    lados: (x, r) => numero(x, r, 3, MAX_LADOS),
    radioInterior: (x, r) => numero(x, r, 0, 1),
    radioEsquina: (x, r) => numero(x, r, 0, 1e6),
    inicioArco: (x, r) => numero(x, r, -100_000, 100_000),
    finArco: (x, r) => numero(x, r, -100_000, 100_000),
    grosor: (x, r) => numero(x, r, 0, 10_000),
    puntos: (x, r) => lista(x, r, MAX_PUNTOS_CAMINO, puntoCamino),
    cerrado: logico,
    figuras: (x, r) => lista(x, r, 200, (pol, rp) => lista(pol, rp, 200, (anillo, ra) => lista(anillo, ra, 5_000, punto))),
    color,
    relleno: (x, r) => unoDe(x, r, TIPOS_RELLENO),
    color2: color,
    anguloDegradado: (x, r) => numero(x, r, -100_000, 100_000),
    patron: (x, r) => unoDe(x, r, PATRONES),
    imagenRelleno: nombre,
    borde: (x, r) => numero(x, r, 0, 1000),
    colorBorde: color,
    bordeDiscontinuo: logico,
    sombra: color,
    sombraX: (x, r) => numero(x, r, -10_000, 10_000),
    sombraY: (x, r) => numero(x, r, -10_000, 10_000),
    desenfoqueSombra: (x, r) => numero(x, r, 0, 1000),
    resplandor: color,
    tamanoResplandor: (x, r) => numero(x, r, 0, 1000),
    mezcla: (x, r) => unoDe(x, r, NOMBRES_MEZCLAS),
    contorno: color,
    grosorContorno: (x, r) => numero(x, r, 0, 1000),
    brillo: (x, r) => numero(x, r, 0, 100),
    grises: (x, r) => numero(x, r, 0, 1),
    desenfoque: (x, r) => numero(x, r, 0, 1000),
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
    letra: (x, r) => texto(x, r, 60),
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
    forma: (x, r) => unoDe(x, r, ['auto', 'caja', 'figura'] as const),
  });
}

/** Un punto de un camino: unidades del tamaño (de -0,5 a 0,5, aunque puede salirse un poco). */
function punto(v: unknown, ruta: Ruta): { x: number; y: number } {
  const o = objeto(v, ruta);
  return { x: numero(o.x, [...ruta, 'x'], -100, 100), y: numero(o.y, [...ruta, 'y'], -100, 100) };
}

function puntoCamino(v: unknown, ruta: Ruta): PuntoCamino {
  const o = objeto(v, ruta);
  const p: PuntoCamino = punto(o, ruta);
  if (o.entrada !== undefined) p.entrada = punto(o.entrada, [...ruta, 'entrada']);
  if (o.salida !== undefined) p.salida = punto(o.salida, [...ruta, 'salida']);
  for (const k of Object.keys(o)) if (!['x', 'y', 'entrada', 'salida'].includes(k)) fallo([...ruta, k], 'no es un dato de un punto');
  return p;
}

function fisica(v: unknown, ruta: Ruta): DefFisica {
  return campos<DefFisica>(objeto(v, ruta), ruta, { gravedad: numero, estatico: logico, rozamiento: numero, rebote: numero, masa: numero, polvo: logico });
}

function tipoCasilla(v: unknown, ruta: Ruta): TipoCasilla {
  return campos<TipoCasilla>(objeto(v, ruta), ruta, { imagen: nombre, color, solida: logico, soloDesdeArriba: logico, puerta: logico });
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
    tipo: (x, r) => unoDe(x, r, ['seguir', 'perseguir', 'huir', 'jugador'] as const),
    objetivo: nombre,
    jugador: (x, r) => numero(x, r, 1, 4),
    salto: (x, r) => numero(x, r, 0, 100_000),
    rapidez: numero,
    distancia: numero,
  });
  if (!c.tipo) fallo([...ruta, 'tipo'], 'falta qué hace (seguir, perseguir, huir o jugador)');
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
    efecto: nombre,
    control: (x, r) => {
      const c = campos<Partial<DefControl>>(objeto(x, r), r, {
        tipo: (t, rt) => unoDe(t, rt, TIPOS_CONTROL),
        activado: logico,
        valor: numero,
        minimo: numero,
        maximo: numero,
        paso: (n, rn) => numero(n, rn, 0, 1e9),
        dato: (t, rt) => texto(t, rt, 200),
        marcada: logico,
        pista: (t, rt) => texto(t, rt, 200),
        largoMaximo: (n, rn) => numero(n, rn, 1, 500),
        opciones: (l, rl) => lista(l, rl, MAXIMO_OPCIONES, (t, rt) => texto(t, rt, 200)),
        elegido: (n, rn) => numero(n, rn, 0, MAXIMO_OPCIONES),
        titulo: (t, rt) => texto(t, rt, 200),
        arrastrable: logico,
        conCerrar: logico,
        columnas: (n, rn) => numero(n, rn, 1, 20),
        filas: (n, rn) => numero(n, rn, 1, 20),
        objetos: (l, rl) => lista(l, rl, MAXIMO_CASILLAS, (o, ro) => {
          const d = campos<{ nombre?: string; cantidad?: number }>(objeto(o, ro), ro, { nombre, cantidad: (n, rn) => numero(n, rn, 0, 1e9) });
          return { nombre: d.nombre ?? '', cantidad: d.cantidad ?? 1 };
        }),
        seguir: nombre,
        alcance: (n, rn) => numero(n, rn, 50, 1e6),
        colorFondo: color,
      });
      if (!c.tipo) fallo(r, 'al control le falta decir de qué tipo es');
      if ((c.columnas ?? 4) * (c.filas ?? 2) > MAXIMO_CASILLAS) fallo(r, `un inventario puede tener ${MAXIMO_CASILLAS} casillas como mucho`);
      return c as DefControl;
    },
    luz: (x, r) => campos<DefLuz>(objeto(x, r), r, {
      tipo: (t, rt) => unoDe(t, rt, ['punto', 'foco'] as const),
      color,
      radio: (n, rn) => numero(n, rn, 0, 100_000),
      intensidad: (n, rn) => numero(n, rn, 0, 10),
      angulo: (n, rn) => numero(n, rn, 0, 360),
      sombras: logico,
      parpadeo: (n, rn) => numero(n, rn, 0, 1),
    }),
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
    jugadores: (x, r) => {
      const j = campos<Partial<NonNullable<DefCamara['jugadores']>>>(objeto(x, r), r, {
        modo: (m, rm) => unoDe(m, rm, ['dividida', 'compartida'] as const),
        seguir: (l, rl) => lista(l, rl, 4, nombre),
        division: (d, rd) => unoDe(d, rd, ['columnas', 'filas'] as const),
      });
      if (!j.modo) fallo(r, 'falta decir si la pantalla es dividida o compartida');
      return { modo: j.modo, seguir: j.seguir ?? [], ...(j.division ? { division: j.division } : {}) };
    },
  });
}

function escena(v: unknown, ruta: Ruta): DefEscena {
  const e = campos<DefEscena>(objeto(v, ruta), ruta, {
    colorFondo: color,
    gravedad: numero,
    camara,
    clima: (x, r) => {
      const c = campos<{ tipo?: Clima; intensidad?: number }>(objeto(x, r), r, { tipo: (t, rt) => unoDe(t, rt, CLIMAS), intensidad: (n, rn) => numero(n, rn, 0, 10) });
      if (!c.tipo) fallo([...r, 'tipo'], 'falta qué clima es (lluvia, nieve u hojas)');
      return { tipo: c.tipo, ...(c.intensidad !== undefined ? { intensidad: c.intensidad } : {}) };
    },
    oscuridad: (x, r) => numero(x, r, 0, 1),
    luzAmbiente: color,
    filtros: (x, r) => campos<Partial<Filtros>>(objeto(x, r), r, {
      grises: (n, rn) => numero(n, rn, 0, 1),
      desenfoque: (n, rn) => numero(n, rn, 0, 100),
      pixelado: (n, rn) => numero(n, rn, 1, 100),
      brillo: (n, rn) => numero(n, rn, 0, 10),
      vineta: (n, rn) => numero(n, rn, 0, 1),
      aberracion: (n, rn) => numero(n, rn, 0, 100),
      crt: logico,
      bloom: (n, rn) => numero(n, rn, 0, 1),
    }),
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

/** Un efecto del editor de partículas: los números, con límites (para no congelar el navegador). */
function efecto(v: unknown, ruta: Ruta): ConfigParticulas {
  const n = (min: number, max: number) => (x: unknown, r: Ruta) => numero(x, r, min, max);
  const c = campos<Partial<ConfigParticulas>>(objeto(v, ruta), ruta, {
    cantidad: n(0, MAXIMO_PARTICULAS),
    porSegundo: n(0, 1000),
    colores: (x, r) => lista(x, r, 20, color),
    colorFinal: color,
    velocidad: n(-10_000, 10_000),
    vida: n(0.01, 60),
    tamano: n(0, 1000),
    tamanoFinal: n(0, 50),
    gravedad: n(-50, 50),
    dispersion: n(0, 360),
    direccion: n(-100_000, 100_000),
    encoger: logico,
    forma: (x, r) => unoDe(x, r, FORMAS_PARTICULA),
    giro: n(-100_000, 100_000),
    vaiven: n(0, 1000),
    rozamiento: n(0, 50),
    mezcla: (x, r) => unoDe(x, r, ['normal', 'sumar'] as const),
    area: n(0, 10_000),
    opacidad: n(0, 1),
  });
  return { cantidad: 0, colores: ['blanco'], velocidad: 100, vida: 1, tamano: 8, gravedad: 0, dispersion: 360, direccion: 90, encoger: false, ...c };
}

const recurso = (tipo: 'imagen' | 'sonido') => (v: unknown, ruta: Ruta): string => {
  if (typeof v !== 'string') fallo(ruta, `tendría que ser ${tipo === 'imagen' ? 'una imagen' : 'un sonido'}, pero es ${describir(v)}`);
  const problema = problemaDataURL(v, tipo);
  if (problema) fallo(ruta, problema);
  return v;
};

/** Un sonido del generador de efectos: cada número, dentro de sus límites. */
function sonidoHecho(v: unknown, ruta: Ruta): ParamsSonido {
  const o = objeto(v, ruta);
  const reglas = Object.fromEntries(Object.entries(LIMITES_SONIDO).map(([k, [min, max]]) => [k, (x: unknown, r: Ruta) => numero(x, r, min, max)])) as { [K in keyof Omit<ParamsSonido, 'onda'>]: (x: unknown, r: Ruta) => number };
  return completarSonido(campos<Partial<ParamsSonido>>(o, ruta, { onda: (x, r) => unoDe(x, r, ONDAS), ...reglas }));
}

/** Una canción del editor de música. */
function cancion(v: unknown, ruta: Ruta): DefCancion {
  const L = LIMITES_CANCION;
  const c = campos<Partial<DefCancion>>(objeto(v, ruta), ruta, {
    tempo: (x, r) => numero(x, r, L.tempoMin, L.tempoMax),
    pasos: (x, r) => numero(x, r, L.pasosMin, L.pasosMax),
    bucle: logico,
    pistas: (x, r) => lista(x, r, L.pistas, (p, rp) => {
      const pista = campos<Partial<PistaCancion>>(objeto(p, rp), rp, {
        instrumento: (i, ri) => unoDe(i, ri, INSTRUMENTOS),
        volumen: (n, rn) => numero(n, rn, 0, 1),
        notas: (n, rn) => lista(n, rn, L.notasPorPista, (nota, rnota) => {
          const d = campos<Partial<NotaCancion>>(objeto(nota, rnota), rnota, {
            paso: (a, ra) => numero(a, ra, 0, L.pasosMax),
            nota: (a, ra) => numero(a, ra, 0, L.notaMax),
            largo: (a, ra) => numero(a, ra, 1, L.pasosMax),
          });
          return { paso: Math.floor(d.paso ?? 0), nota: Math.floor(d.nota ?? 60), largo: Math.floor(d.largo ?? 1) };
        }),
      });
      return { instrumento: pista.instrumento ?? 'piano', volumen: pista.volumen ?? 0.8, notas: pista.notas ?? [] };
    }),
  });
  if (c.tempo === undefined || c.pasos === undefined || !c.pistas) fallo(ruta, 'a la canción le falta el tempo, los pasos o las pistas');
  return { tempo: c.tempo, pasos: Math.floor(c.pasos), pistas: c.pistas, ...(c.bucle !== undefined ? { bucle: c.bucle } : {}) };
}

const letra = (v: unknown, ruta: Ruta): string => {
  if (typeof v !== 'string') fallo(ruta, `tendría que ser un tipo de letra, pero es ${describir(v)}`);
  const problema = problemaLetra(v);
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
    orientacion: (x, r) => unoDe(x, r, ['horizontal', 'vertical'] as const),
    calidad: (x, r) => unoDe(x, r, ['auto', 'alta', 'media', 'baja'] as const),
    maximoFps: (x, r) => numero(x, r, 15, 240),
    icono: nombre,
    pantallaDeCarga: logico,
    imagenes: (x, r) => registro(x, r, L.imagenes, recurso('imagen')),
    sonidos: (x, r) => registro(x, r, L.sonidos, recurso('sonido')),
    animaciones: (x, r) => registro(x, r, L.animaciones, animacion),
    scripts: (x, r) => registro(x, r, L.scripts, (c, rc) => texto(c, rc, L.letrasPorScript, true)),
    plantillas: (x, r) => registro(x, r, L.plantillas, objetoJuego),
    escenas: (x, r) => registro(x, r, L.escenas, escena),
    escenaInicial: nombre,
    bloques: (x, r) => lista(x, r, L.scripts, nombre),
    datos: (x, r) => registro(x, r, L.datos, dato),
    colores: (x, r) => lista(x, r, 200, color),
    efectos: (x, r) => registro(x, r, 500, efecto),
    letras: (x, r) => registro(x, r, 20, letra),
    sonidosHechos: (x, r) => registro(x, r, L.sonidos, sonidoHecho),
    canciones: (x, r) => registro(x, r, 200, cancion),
  });
}
