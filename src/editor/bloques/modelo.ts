/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * MODO BLOQUES: el mismo código Chispa, pero como piezas que se encajan (al estilo Scratch).
 *
 * DECISIÓN: el CÓDIGO es lo que se guarda, siempre. Los bloques son otra
 * forma de verlo y de editarlo:
 *     código  ──(leer)──▶  bloques   (desdeCodigo)
 *     bloques ──(escribir)──▶ código (aCodigo)
 * Así un juego hecho con bloques es un juego de Chispa normal: se puede
 * pasar a código en cualquier momento y seguir desde ahí.
 *
 * Las órdenes (si, repetir, mover...) son bloques. Los VALORES que van
 * dentro de los huecos (yo.x + 10, "hola", buscar("Jugador")) se escriben
 * como código pequeño: así no hace falta un bloque para cada operación y se
 * aprende la escritura poco a poco.
 */
import type { Bloque as BloqueAst, Evento, Expresion, Sentencia } from '../../chispa/sintaxis/ast';
import { analizarSintaxis } from '../../chispa/sintaxis/parser';

// ───────────────────────── Tipos de bloque ─────────────────────────

export type ClaseEvento =
  | 'empieza' | 'fotograma' | 'cada' | 'pasen' | 'pulsa' | 'mantiene' | 'suelta'
  | 'toco' | 'dejoDeTocar' | 'clic' | 'clicEncima' | 'animacion' | 'pantalla' | 'recibo';

export type Bloque = (
  /** cuando ...: (dato: la tecla, los segundos, con quién, el mensaje...) */
  | { tipo: 'evento'; clase: ClaseEvento; dato: string; cuerpo: Bloque[] }
  | { tipo: 'funcion'; nombre: string; parametros: string; cuerpo: Bloque[] }
  | { tipo: 'variable'; nombre: string; valor: string }
  | { tipo: 'asignar'; objetivo: string; operador: string; valor: string }
  | { tipo: 'si'; ramas: { condicion: string; cuerpo: Bloque[] }[]; sino: Bloque[] | null }
  | { tipo: 'mientras'; condicion: string; cuerpo: Bloque[] }
  | { tipo: 'repetir'; veces: string; cuerpo: Bloque[] }
  | { tipo: 'paraCada'; variables: string; coleccion: string; cuerpo: Bloque[] }
  | { tipo: 'devolver'; valor: string }
  | { tipo: 'romper' }
  | { tipo: 'continuar' }
  /** Una acción conocida (mostrar, esperar, crear...): `accion` dice cuál y `campos` lo que va en sus huecos. */
  | { tipo: 'accion'; accion: string; campos: string[] }
  /** Cualquier otra orden, escrita como código: yo.animar("correr") */
  | { tipo: 'hacer'; codigo: string }
  /** Un comentario (# ...) */
  | { tipo: 'nota'; texto: string }
) & {
  /** Para la vista (arrastrar, resaltar): no se guarda. */
  id?: number;
};

/** Las cabeceras de los eventos: lo que se ve en el bloque y cómo se escribe. */
export const EVENTOS: { clase: ClaseEvento; texto: string; dato?: { nombre: string; porDefecto: string } }[] = [
  { clase: 'empieza', texto: 'cuando empieza' },
  { clase: 'fotograma', texto: 'cuando cada fotograma' },
  { clase: 'pulsa', texto: 'cuando se pulsa', dato: { nombre: 'tecla', porDefecto: '"espacio"' } },
  { clase: 'mantiene', texto: 'cuando se mantiene', dato: { nombre: 'tecla', porDefecto: '"derecha"' } },
  { clase: 'suelta', texto: 'cuando se suelta', dato: { nombre: 'tecla', porDefecto: '"espacio"' } },
  { clase: 'toco', texto: 'cuando toco', dato: { nombre: 'con quién (vacío = cualquiera)', porDefecto: 'Moneda' } },
  { clase: 'dejoDeTocar', texto: 'cuando dejo de tocar', dato: { nombre: 'con quién', porDefecto: 'Agua' } },
  { clase: 'clic', texto: 'cuando hago clic' },
  { clase: 'clicEncima', texto: 'cuando hago clic encima' },
  { clase: 'cada', texto: 'cuando cada … segundos', dato: { nombre: 'segundos', porDefecto: '2' } },
  { clase: 'pasen', texto: 'cuando pasen … segundos', dato: { nombre: 'segundos', porDefecto: '3' } },
  { clase: 'recibo', texto: 'cuando recibo', dato: { nombre: 'mensaje', porDefecto: 'empezar' } },
  { clase: 'animacion', texto: 'cuando termina la animacion' },
  { clase: 'pantalla', texto: 'cuando salgo de la pantalla' },
];

/**
 * ACCIONES CONOCIDAS: las órdenes más usadas tienen su propio bloque, con
 * palabras en vez de paréntesis. `partes` mezcla texto fijo y huecos (números:
 * la posición del campo). Al leer código, una llamada que encaja con una
 * acción se convierte en su bloque; si no, en un bloque «hacer».
 */
export interface Accion {
  id: string;
  categoria: 'movimiento' | 'apariencia' | 'sonido' | 'objetos' | 'control';
  /** Texto y huecos: ['mostrar', 0] */
  partes: (string | number)[];
  /** Lo que se escribe: el nombre de la función (con su «yo.» si es de yo) */
  funcion: string;
  /** Valores con los que aparece en la paleta */
  porDefecto: string[];
}

export const ACCIONES: Accion[] = [
  { id: 'moverConFlechas', categoria: 'movimiento', partes: ['moverme con las flechas a', 0], funcion: 'yo.moverConFlechas', porDefecto: ['300'] },
  { id: 'mover', categoria: 'movimiento', partes: ['mover x', 0, 'y', 1], funcion: 'yo.mover', porDefecto: ['10', '0'] },
  { id: 'saltar', categoria: 'movimiento', partes: ['saltar con fuerza', 0], funcion: 'yo.saltar', porDefecto: ['600'] },
  { id: 'irA', categoria: 'movimiento', partes: ['ir suavemente a x', 0, 'y', 1, 'en', 2, 'segundos'], funcion: 'yo.irA', porDefecto: ['400', '300', '1'] },
  { id: 'irHacia', categoria: 'movimiento', partes: ['ir hacia', 0, 'a', 1, 'píxeles por segundo'], funcion: 'yo.irHacia', porDefecto: ['buscar("Jugador")', '120'] },
  { id: 'rotar', categoria: 'movimiento', partes: ['girar', 0, 'grados'], funcion: 'yo.rotar', porDefecto: ['15'] },
  { id: 'mirarA', categoria: 'movimiento', partes: ['mirar hacia', 0], funcion: 'yo.mirarA', porDefecto: ['raton.posicion'] },
  { id: 'mostrar', categoria: 'apariencia', partes: ['mostrar', 0], funcion: 'mostrar', porDefecto: ['"¡Hola!"'] },
  { id: 'animar', categoria: 'apariencia', partes: ['poner la animación', 0], funcion: 'yo.animar', porDefecto: ['"correr"'] },
  { id: 'parpadear', categoria: 'apariencia', partes: ['parpadear', 0, 'segundos'], funcion: 'yo.parpadear', porDefecto: ['1'] },
  { id: 'ocultar', categoria: 'apariencia', partes: ['esconderme'], funcion: 'yo.ocultar', porDefecto: [] },
  { id: 'aparecer', categoria: 'apariencia', partes: ['aparecer'], funcion: 'yo.aparecer', porDefecto: [] },
  { id: 'particulas', categoria: 'apariencia', partes: ['partículas de', 0], funcion: 'particulas', porDefecto: ['"explosion"'] },
  { id: 'dialogo', categoria: 'apariencia', partes: ['diálogo:', 0, 'dice', 1], funcion: 'dialogo', porDefecto: ['"Ana"', '"¡Hola!"'] },
  { id: 'temblar', categoria: 'apariencia', partes: ['temblar la pantalla', 0, 'durante', 1, 'segundos'], funcion: 'escena.camara.temblar', porDefecto: ['8', '0.3'] },
  { id: 'efecto', categoria: 'sonido', partes: ['sonido', 0], funcion: 'sonido.efecto', porDefecto: ['"moneda"'] },
  { id: 'reproducir', categoria: 'sonido', partes: ['reproducir el sonido', 0], funcion: 'sonido.reproducir', porDefecto: ['"salto"'] },
  { id: 'musica', categoria: 'sonido', partes: ['poner la música', 0], funcion: 'musica.reproducir', porDefecto: ['"tema"'] },
  { id: 'crear', categoria: 'objetos', partes: ['crear', 0, 'en x', 1, 'y', 2], funcion: 'crear', porDefecto: ['"Bala"', 'yo.x', 'yo.y'] },
  { id: 'destruir', categoria: 'objetos', partes: ['destruir', 0], funcion: 'destruir', porDefecto: ['otro'] },
  { id: 'enviar', categoria: 'objetos', partes: ['enviar el mensaje', 0], funcion: 'enviar', porDefecto: ['"empezar"'] },
  { id: 'esperar', categoria: 'control', partes: ['esperar', 0, 'segundos'], funcion: 'esperar', porDefecto: ['1'] },
  { id: 'cambiarEscena', categoria: 'control', partes: ['ir a la escena', 0], funcion: 'escena.cambiar', porDefecto: ['"Nivel2"'] },
  { id: 'reiniciar', categoria: 'control', partes: ['reiniciar la escena'], funcion: 'escena.reiniciar', porDefecto: [] },
];

export const accionPorId = (id: string) => ACCIONES.find((a) => a.id === id);

// ───────────────────────── Código → bloques ─────────────────────────

export type ResultadoLectura =
  | { ok: true; bloques: Bloque[]; perdidos: string[] }
  | { ok: false; motivo: string; lineas: number[] };

/**
 * Convierte un script en bloques. Si no se puede (tiene errores de
 * escritura), dice por qué. `perdidos` son cosas que existen en el código
 * pero no en los bloques (comentarios al final de una línea...): hay que avisar.
 */
export function desdeCodigo(codigo: string): ResultadoLectura {
  const { programa, errores } = analizarSintaxis(codigo, 'bloques');
  if (errores.length) {
    return {
      ok: false,
      motivo: `El código tiene ${errores.length === 1 ? 'un error' : `${errores.length} errores`} de escritura, y así no se puede pasar a bloques. Arréglalo primero en el código.`,
      lineas: errores.map((e) => e.ubicacion.linea ?? 0),
    };
  }
  const lineas = codigo.split('\n');
  const notas = leerNotas(lineas);
  const perdidos: string[] = [];
  lineas.forEach((l, i) => {
    if (comentarioAlFinal(l)) perdidos.push(`el comentario del final de la línea ${i + 1}`);
  });
  const bloques = convertirBloque(programa.sentencias, notas, 0);
  // Las notas que no han encontrado sitio (al final de un bloque) van al final, si estaban sin sangría; si no, se pierden
  for (const n of notas) {
    if (n.usada) continue;
    if (n.sangria === 0) bloques.push({ tipo: 'nota', texto: n.texto });
    else perdidos.push(`el comentario de la línea ${n.linea}`);
  }
  return { ok: true, bloques, perdidos };
}

interface Nota {
  linea: number;
  sangria: number;
  texto: string;
  usada: boolean;
}

/** Las líneas que son solo un comentario (# ...), con su sangría. */
function leerNotas(lineas: string[]): Nota[] {
  const r: Nota[] = [];
  lineas.forEach((l, i) => {
    const m = /^(\s*)#\s?(.*)$/.exec(l);
    if (m) r.push({ linea: i + 1, sangria: m[1].replace(/\t/g, '    ').length, texto: m[2], usada: false });
  });
  return r;
}

/** ¿Tiene la línea código y DESPUÉS un comentario? (el # dentro de un texto no cuenta) */
function comentarioAlFinal(linea: string): boolean {
  if (/^\s*#/.test(linea)) return false;
  let comillas: string | null = null;
  for (const c of linea) {
    if (comillas) {
      if (c === comillas) comillas = null;
    } else if (c === '"' || c === "'" || c === '“' || c === '”') comillas = c === '“' ? '”' : c;
    else if (c === '#') return true;
  }
  return false;
}

function convertirBloque(sentencias: BloqueAst, notas: Nota[], sangria: number): Bloque[] {
  const r: Bloque[] = [];
  for (const s of sentencias) {
    // Los comentarios de antes de esta orden, con su misma sangría, van delante como notas
    for (const n of notas) {
      if (!n.usada && n.linea < s.pos.linea && n.sangria === sangria) {
        n.usada = true;
        r.push({ tipo: 'nota', texto: n.texto });
      }
    }
    r.push(convertir(s, notas, sangria));
  }
  return r;
}

function convertir(s: Sentencia, notas: Nota[], sangria: number): Bloque {
  const cuerpo = (b: BloqueAst) => convertirBloque(b, notas, sangria + 4);
  switch (s.tipo) {
    case 'Cuando': {
      const { clase, dato } = leerEvento(s.evento);
      return { tipo: 'evento', clase, dato, cuerpo: cuerpo(s.cuerpo) };
    }
    case 'Funcion':
      return { tipo: 'funcion', nombre: s.original, parametros: s.parametros.map((p) => p.original).join(', '), cuerpo: cuerpo(s.cuerpo) };
    case 'Variable':
      return { tipo: 'variable', nombre: s.original, valor: escribir(s.valor) };
    case 'Asignacion':
      return { tipo: 'asignar', objetivo: escribir(s.objetivo), operador: s.operador, valor: escribir(s.valor) };
    case 'Si':
      return { tipo: 'si', ramas: s.ramas.map((r) => ({ condicion: escribir(r.condicion), cuerpo: cuerpo(r.cuerpo) })), sino: s.sino ? cuerpo(s.sino) : null };
    case 'Mientras':
      return { tipo: 'mientras', condicion: escribir(s.condicion), cuerpo: cuerpo(s.cuerpo) };
    case 'Repetir':
      return { tipo: 'repetir', veces: escribir(s.veces), cuerpo: cuerpo(s.cuerpo) };
    case 'ParaCada':
      return { tipo: 'paraCada', variables: s.variables.map((v) => v.original).join(', '), coleccion: escribir(s.coleccion), cuerpo: cuerpo(s.cuerpo) };
    case 'Devolver':
      return { tipo: 'devolver', valor: s.valor ? escribir(s.valor) : '' };
    case 'Romper':
      return { tipo: 'romper' };
    case 'Continuar':
      return { tipo: 'continuar' };
    case 'ExpresionSuelta':
      return reconocerAccion(s.expresion) ?? { tipo: 'hacer', codigo: escribir(s.expresion) };
  }
}

/** Si la llamada es una acción conocida con el número de valores justo, su bloque. */
function reconocerAccion(e: Expresion): Bloque | null {
  if (e.tipo !== 'Llamada') return null;
  const nombre = escribir(e.funcion);
  const accion = ACCIONES.find((a) => a.funcion.toLowerCase() === nombre.toLowerCase() && a.porDefecto.length === e.argumentos.length);
  return accion ? { tipo: 'accion', accion: accion.id, campos: e.argumentos.map(escribir) } : null;
}

function leerEvento(ev: Evento): { clase: ClaseEvento; dato: string } {
  switch (ev.tipo) {
    case 'empieza':
    case 'fotograma':
    case 'animacion':
    case 'pantalla':
      return { clase: ev.tipo, dato: '' };
    case 'intervalo':
      return { clase: 'cada', dato: escribir(ev.segundos) };
    case 'pasen':
      return { clase: 'pasen', dato: escribir(ev.segundos) };
    case 'tecla':
      return { clase: ev.modo, dato: ev.teclas.map(escribir).join(', ') };
    case 'toco':
      return { clase: ev.dejar ? 'dejoDeTocar' : 'toco', dato: ev.original ?? '' };
    case 'clic':
      return { clase: ev.encima ? 'clicEncima' : 'clic', dato: '' };
    case 'recibo':
      return { clase: 'recibo', dato: ev.original };
  }
}

// ───────────────────────── Escribir expresiones ─────────────────────────

/** Fuerza de cada operador (más alto = se agrupa antes), como en el parser. */
const FUERZA: Record<string, number> = { o: 1, y: 2, no: 3, '==': 4, '!=': 4, '<': 4, '>': 4, '<=': 4, '>=': 4, en: 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };

function fuerzaDe(e: Expresion): number {
  if (e.tipo === 'Binaria' || e.tipo === 'Logica') return FUERZA[e.operador];
  if (e.tipo === 'Unaria') return e.operador === 'no' ? 3 : 7;
  return 9;
}

/** Escribe una expresión como código Chispa (con paréntesis solo donde hacen falta). */
export function escribir(e: Expresion): string {
  const conFuerza = (hijo: Expresion, minima: number) => (fuerzaDe(hijo) < minima ? `(${escribir(hijo)})` : escribir(hijo));
  switch (e.tipo) {
    case 'Numero':
      return String(e.valor);
    case 'Texto':
      return `"${(e.partes ?? [e.valor]).map((p) => (typeof p === 'string' ? escaparTexto(p, !!e.partes) : `{${escribir(p)}}`)).join('')}"`;
    case 'Logico':
      return e.valor ? 'verdadero' : 'falso';
    case 'Nulo':
      return 'nulo';
    case 'Identificador':
      return e.original;
    case 'Lista':
      return `[${e.elementos.map(escribir).join(', ')}]`;
    case 'Tabla':
      return `{${e.entradas.map((x) => `${/^[\p{L}_][\p{L}\p{N}_]*$/u.test(x.original) ? x.original : JSON.stringify(x.original)}: ${escribir(x.valor)}`).join(', ')}}`;
    case 'Binaria':
    case 'Logica': {
      const f = FUERZA[e.operador];
      // El de la derecha con la misma fuerza necesita paréntesis: a - (b - c)
      return `${conFuerza(e.izquierda, f)} ${e.operador} ${conFuerza(e.derecha, f + 1)}`;
    }
    case 'Unaria':
      return e.operador === 'no' ? `no ${conFuerza(e.operando, 3)}` : `-${conFuerza(e.operando, 7)}`;
    case 'Llamada':
      return `${conFuerza(e.funcion, 9)}(${e.argumentos.map(escribir).join(', ')})`;
    case 'Miembro':
      return `${conFuerza(e.objeto, 9)}.${e.original}`;
    case 'Indice':
      return `${conFuerza(e.objeto, 9)}[${escribir(e.indice)}]`;
  }
}

function escaparTexto(t: string, conHuecos: boolean): string {
  let r = t.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  if (conHuecos) r = r.replace(/\{/g, '{{').replace(/\}/g, '}}');
  return r;
}

// ───────────────────────── Bloques → código ─────────────────────────

export interface CodigoGenerado {
  codigo: string;
  /** En qué línea (empezando en 1) empieza cada bloque, por su id: para resaltar el bloque de un error. */
  lineaDe: Map<number, number>;
}

/** Escribe los bloques como código Chispa (sangría de 4 espacios, una línea en blanco entre los de arriba). */
export function aCodigo(bloques: Bloque[]): CodigoGenerado {
  const lineas: string[] = [];
  const lineaDe = new Map<number, number>();
  const escribirBloque = (b: Bloque, sangria: string): void => {
    if (b.id !== undefined) lineaDe.set(b.id, lineas.length + 1);
    const l = (t: string): void => void lineas.push(sangria + t);
    switch (b.tipo) {
      case 'evento':
        l(`${cabeceraEvento(b.clase, b.dato)}:`);
        return cuerpoONada(b.cuerpo, sangria);
      case 'funcion':
        l(`funcion ${b.nombre}(${b.parametros}):`);
        return cuerpoONada(b.cuerpo, sangria);
      case 'variable':
        return l(`variable ${b.nombre} = ${b.valor}`);
      case 'asignar':
        return l(`${b.objetivo} ${b.operador} ${b.valor}`);
      case 'si':
        b.ramas.forEach((r, i) => {
          l(`${i === 0 ? 'si' : 'sino si'} ${r.condicion}:`);
          cuerpoONada(r.cuerpo, sangria);
        });
        if (b.sino) {
          l('sino:');
          cuerpoONada(b.sino, sangria);
        }
        return;
      case 'mientras':
        l(`mientras ${b.condicion}:`);
        return cuerpoONada(b.cuerpo, sangria);
      case 'repetir':
        l(`repetir ${b.veces} veces:`);
        return cuerpoONada(b.cuerpo, sangria);
      case 'paraCada':
        l(`para cada ${b.variables} en ${b.coleccion}:`);
        return cuerpoONada(b.cuerpo, sangria);
      case 'devolver':
        return l(b.valor ? `devolver ${b.valor}` : 'devolver');
      case 'romper':
        return l('romper');
      case 'continuar':
        return l('continuar');
      case 'accion': {
        const a = accionPorId(b.accion)!;
        return l(`${a.funcion}(${b.campos.join(', ')})`);
      }
      case 'hacer':
        return l(b.codigo);
      case 'nota':
        return l(`# ${b.texto}`);
    }
  };
  // Un «si» o un «repetir» sin nada dentro no está terminado: en el código queda un bloque vacío
  // (que el código marca como error, igual que si se escribiera a mano) con una nota que lo explica
  const cuerpoONada = (bs: Bloque[], sangria: string) => {
    for (const b of bs) escribirBloque(b, sangria + '    ');
    if (!bs.some((b) => b.tipo !== 'nota')) lineas.push(`${sangria}    # (vacío: falta lo que tiene que hacer)`);
  };
  bloques.forEach((b, i) => {
    if (i > 0 && (esDeArriba(b) || esDeArriba(bloques[i - 1]))) lineas.push('');
    escribirBloque(b, '');
  });
  return { codigo: lineas.join('\n') + '\n', lineaDe };
}

const esDeArriba = (b: Bloque) => b.tipo === 'evento' || b.tipo === 'funcion';

/** La línea del «cuando» (sin los dos puntos). */
export function cabeceraEvento(clase: ClaseEvento, dato: string): string {
  switch (clase) {
    case 'empieza':
      return 'cuando empieza';
    case 'fotograma':
      return 'cuando cada fotograma';
    case 'cada':
      return `cuando cada ${dato || '1'} segundos`;
    case 'pasen':
      return `cuando pasen ${dato || '1'} segundos`;
    case 'pulsa':
    case 'mantiene':
    case 'suelta':
      return `cuando se ${clase} ${dato || '"espacio"'}`;
    case 'toco':
      return dato.trim() ? `cuando toco ${dato.trim()}` : 'cuando toco';
    case 'dejoDeTocar':
      return `cuando dejo de tocar ${dato.trim() || 'Nombre'}`;
    case 'clic':
      return 'cuando hago clic';
    case 'clicEncima':
      return 'cuando hago clic encima';
    case 'animacion':
      return 'cuando termina la animacion';
    case 'pantalla':
      return 'cuando salgo de la pantalla';
    case 'recibo':
      return `cuando recibo "${dato.replace(/"/g, '')}"`;
  }
}
