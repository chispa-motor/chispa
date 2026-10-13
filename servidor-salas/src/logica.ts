/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LO QUE HACE UNA SALA DE «PROGRAMAR JUNTOS» (sin nada de Cloudflare, para poder probarlo con tests).
 *
 * Una sala es un proyecto de Chispa compartido entre varios editores. Cada editor tiene su copia y
 * manda sus cambios; la sala los junta (con Yjs, que sabe mezclar cambios hechos a la vez sin que se
 * pisen) y se los pasa a los demás. La sala también guarda su copia para quien entre más tarde.
 *
 * Habla el mismo idioma que el cliente y-websocket (mensajes 0 = sincronizar, 1 = quién está y dónde
 * tiene el cursor, 3 = pregúntame quién está) y añade dos mensajes propios:
 *
 *   60 ÓRDENES DEL DUEÑO (editor → sala). Solo las acepta de quien creó la sala:
 *        1 echar a alguien (su número de Yjs) · 2 bloquear o desbloquear la sala (0/1) · 3 cerrarla y borrarla
 *   61 AVISO DE LA SALA (sala → editor): si está bloqueada y si quien lo recibe es el dueño.
 *
 * SEGURIDAD (las salas las usan chavales): no hay chat, no hay cuentas, no hay lista de salas. Se
 * entra solo con el código, que es largo y al azar. No se guarda nada de las personas: ni nombres
 * (los nombres son de animales y los elige el editor), ni direcciones. Los límites de abajo evitan
 * que alguien llene la sala de basura o la tumbe.
 */
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as awarenessProtocol from 'y-protocols/awareness';

export const MENSAJE = { sincronizar: 0, presencia: 1, preguntarPresencia: 3, orden: 60, aviso: 61 } as const;
/** Los tres tipos de mensaje de sincronizar (y-protocols/sync). */
const SYNC = { paso1: 0, paso2: 1, cambio: 2 } as const;
export const ORDEN = { echar: 1, bloquear: 2, cerrar: 3 } as const;

/** Por qué se cierra una conexión. Del 4400 al 4499: el editor NO vuelve a intentarlo solo. */
export const CIERRE = {
  codigoMalo: 4400,
  echado: 4401,
  cerrada: 4402,
  prohibido: 4403,
  noExiste: 4404,
  llena: 4405,
  bloqueada: 4406,
  demasiadoGrande: 4409,
  mensajeRaro: 4410,
} as const;

export const LIMITES = {
  /** Un mensaje (un cambio de golpe: por ejemplo, al crear la sala con un proyecto con imágenes). */
  mensaje: 16 * 1024 * 1024,
  /** Lo que ocupa el proyecto de la sala entero. */
  documento: 24 * 1024 * 1024,
  /** El aviso de «quién soy y dónde tengo el cursor» (es pequeño: un nombre de animal, un color, una posición). */
  presencia: 8 * 1024,
  /** Gente a la vez en una sala (una clase entera cabe, pero no se puede llenar de conexiones). */
  conexiones: 12,
  /** Aparatos echados que se recuerdan. */
  echados: 200,
} as const;

/** Una persona conectada (un editor abierto). */
export interface Conexion {
  readonly id: string;
  /** Si entró con la clave del dueño. */
  readonly dueno: boolean;
  /** Un número al azar que guarda cada navegador (para que a quien se echa no pueda volver a entrar). */
  readonly aparato: string;
  /** Los números de Yjs de este editor (normalmente uno). */
  readonly clientes: Set<number>;
  enviar(datos: Uint8Array): void;
  cerrar(codigo: number, motivo: string): void;
}

export const MOTIVOS: Record<number, string> = {
  [CIERRE.codigoMalo]: 'Ese código de sala no es válido.',
  [CIERRE.echado]: 'El dueño de la sala te ha sacado.',
  [CIERRE.cerrada]: 'El dueño ha cerrado la sala.',
  [CIERRE.prohibido]: 'No tienes permiso para entrar así en esta sala.',
  [CIERRE.noExiste]: 'No hay ninguna sala con ese código.',
  [CIERRE.llena]: 'La sala está llena.',
  [CIERRE.bloqueada]: 'La sala está cerrada con candado: el dueño no deja entrar a nadie más.',
  [CIERRE.demasiadoGrande]: 'El proyecto es demasiado grande para programar juntos.',
  [CIERRE.mensajeRaro]: 'El editor ha mandado algo que la sala no entiende.',
};

function mensajeSync(tipo: number, datos: Uint8Array): Uint8Array {
  const e = encoding.createEncoder();
  encoding.writeVarUint(e, MENSAJE.sincronizar);
  encoding.writeVarUint(e, tipo);
  encoding.writeVarUint8Array(e, datos);
  return encoding.toUint8Array(e);
}

export class LogicaSala {
  readonly doc = new Y.Doc();
  readonly presencia: awarenessProtocol.Awareness;
  readonly conexiones = new Map<string, Conexion>();
  bloqueada = false;
  readonly echados = new Set<string>();
  /** Hay cambios sin guardar. */
  sucio = false;
  cerrada = false;
  /** Lo que ocupa (más o menos) el proyecto: se mide de verdad cuando se acerca al límite. */
  private tamano: number;
  /** Avisos para quien guarda la sala (index.ts): algo ha cambiado y hay que guardarlo; la sala se ha cerrado. */
  alCambiar: () => void = () => {};
  alCerrar: () => void = () => {};
  /** Ha cambiado lo que hay que recordar de una conexión (sus números de Yjs). */
  alCambiarConexion: (c: Conexion) => void = () => {};

  constructor(guardado?: Uint8Array | null) {
    if (guardado?.length) Y.applyUpdate(this.doc, guardado, 'guardado');
    this.tamano = guardado?.length ?? 0;
    this.presencia = new awarenessProtocol.Awareness(this.doc);
    // La sala no tiene presencia propia, y su reloj interno no hace falta (y no dejaría dormir a la sala)
    this.presencia.setLocalState(null);
    clearInterval((this.presencia as unknown as { _checkInterval: ReturnType<typeof setInterval> })._checkInterval);

    this.doc.on('update', (cambio: Uint8Array, origen: unknown) => {
      this.sucio = true;
      const datos = mensajeSync(SYNC.cambio, cambio);
      for (const c of this.conexiones.values()) if (c !== origen) c.enviar(datos);
      this.alCambiar();
    });
    this.presencia.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origen: unknown) => {
      const conexion = origen && typeof origen === 'object' && 'clientes' in origen ? (origen as Conexion) : null;
      if (conexion) {
        const antes = conexion.clientes.size;
        for (const id of added) conexion.clientes.add(id);
        for (const id of removed) conexion.clientes.delete(id);
        if (conexion.clientes.size !== antes) this.alCambiarConexion(conexion);
      }
      const cambiados = [...added, ...updated, ...removed];
      const e = encoding.createEncoder();
      encoding.writeVarUint(e, MENSAJE.presencia);
      encoding.writeVarUint8Array(e, awarenessProtocol.encodeAwarenessUpdate(this.presencia, cambiados));
      const datos = encoding.toUint8Array(e);
      // A todos, también a quien lo ha mandado: así su editor sabe que la sala sigue viva
      for (const c of this.conexiones.values()) c.enviar(datos);
    });
  }

  /** Alguien llega. Devuelve el código de cierre si no puede entrar (y entonces no entra). */
  entrar(c: Conexion): number | null {
    const no = this.puedeEntrar(c);
    if (no !== null) return no;
    this.conexiones.set(c.id, c);
    this.saludar(c);
    return null;
  }

  /** ¿Puede entrar? (null = sí; si no, el código de cierre que explica por qué). */
  puedeEntrar(c: Pick<Conexion, 'dueno' | 'aparato'>): number | null {
    if (this.cerrada) return CIERRE.cerrada;
    if (this.echados.has(c.aparato) && !c.dueno) return CIERRE.echado;
    if (this.bloqueada && !c.dueno) return CIERRE.bloqueada;
    if (this.conexiones.size >= LIMITES.conexiones) return CIERRE.llena;
    return null;
  }

  /** Lo primero que recibe quien entra: lo que tiene la sala, quién está y cómo está la sala. */
  saludar(c: Conexion): void {
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, MENSAJE.sincronizar);
    encoding.writeVarUint(e, SYNC.paso1);
    encoding.writeVarUint8Array(e, Y.encodeStateVector(this.doc));
    c.enviar(encoding.toUint8Array(e));
    const estados = [...this.presencia.getStates().keys()];
    if (estados.length) c.enviar(this.mensajePresencia(estados));
    c.enviar(this.aviso(c));
  }

  /** Para volver a montar la sala tras dormirse (Cloudflare la duerme cuando nadie escribe). */
  recordar(c: Conexion): void {
    this.conexiones.set(c.id, c);
  }

  private mensajePresencia(ids: number[]): Uint8Array {
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, MENSAJE.presencia);
    encoding.writeVarUint8Array(e, awarenessProtocol.encodeAwarenessUpdate(this.presencia, ids));
    return encoding.toUint8Array(e);
  }

  aviso(c: Conexion): Uint8Array {
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, MENSAJE.aviso);
    encoding.writeVarUint(e, this.bloqueada ? 1 : 0);
    encoding.writeVarUint(e, c.dueno ? 1 : 0);
    return encoding.toUint8Array(e);
  }

  /** Llega un mensaje de alguien. */
  recibir(c: Conexion, datos: Uint8Array): void {
    if (!this.conexiones.has(c.id)) return;
    if (datos.byteLength > LIMITES.mensaje) return this.expulsar(c, CIERRE.demasiadoGrande);
    try {
      const d = decoding.createDecoder(datos);
      const tipo = decoding.readVarUint(d);
      if (tipo === MENSAJE.sincronizar) this.sincronizar(c, d);
      else if (tipo === MENSAJE.presencia) {
        const cambio = decoding.readVarUint8Array(d);
        if (cambio.byteLength > LIMITES.presencia) return this.expulsar(c, CIERRE.mensajeRaro);
        awarenessProtocol.applyAwarenessUpdate(this.presencia, cambio, c);
      } else if (tipo === MENSAJE.preguntarPresencia) {
        c.enviar(this.mensajePresencia([...this.presencia.getStates().keys()]));
      } else if (tipo === MENSAJE.orden) this.orden(c, d);
      // (otros tipos: se ignoran, como hace y-websocket)
    } catch {
      this.expulsar(c, CIERRE.mensajeRaro);
    }
  }

  private sincronizar(c: Conexion, d: decoding.Decoder): void {
    const tipo = decoding.readVarUint(d);
    if (tipo === SYNC.paso1) {
      const suVector = decoding.readVarUint8Array(d);
      c.enviar(mensajeSync(SYNC.paso2, Y.encodeStateAsUpdate(this.doc, suVector)));
    } else if (tipo === SYNC.paso2 || tipo === SYNC.cambio) {
      const cambio = decoding.readVarUint8Array(d);
      if (this.tamano + cambio.byteLength > LIMITES.documento) {
        // Antes de decir que no, se mide de verdad (lo que se borra no cuenta)
        this.tamano = Y.encodeStateAsUpdate(this.doc).byteLength;
        if (this.tamano + cambio.byteLength > LIMITES.documento) return this.expulsar(c, CIERRE.demasiadoGrande);
      }
      Y.applyUpdate(this.doc, cambio, c);
      this.tamano += cambio.byteLength;
    } else throw new Error('tipo de sincronizar desconocido');
  }

  private orden(c: Conexion, d: decoding.Decoder): void {
    if (!c.dueno) return;
    const orden = decoding.readVarUint(d);
    if (orden === ORDEN.echar) this.echar(decoding.readVarUint(d));
    else if (orden === ORDEN.bloquear) {
      this.bloqueada = decoding.readVarUint(d) === 1;
      for (const otra of this.conexiones.values()) otra.enviar(this.aviso(otra));
      this.alCambiar();
    } else if (orden === ORDEN.cerrar) this.cerrar();
  }

  /** Saca a quien tenga ese número de Yjs (y no le deja volver). Al dueño no se le puede echar. */
  echar(cliente: number): boolean {
    for (const c of this.conexiones.values()) {
      if (!c.clientes.has(cliente) || c.dueno) continue;
      if (this.echados.size >= LIMITES.echados) this.echados.delete(this.echados.values().next().value!);
      this.echados.add(c.aparato);
      this.expulsar(c, CIERRE.echado);
      this.alCambiar();
      return true;
    }
    return false;
  }

  /** Cierra la sala: todos fuera y se olvida todo. */
  cerrar(): void {
    this.cerrada = true;
    for (const c of [...this.conexiones.values()]) this.expulsar(c, CIERRE.cerrada);
    this.alCerrar();
  }

  private expulsar(c: Conexion, codigo: number): void {
    this.salir(c);
    c.cerrar(codigo, MOTIVOS[codigo] ?? '');
  }

  /** Alguien se va (o se le cae la conexión). */
  salir(c: Conexion): void {
    if (!this.conexiones.delete(c.id)) return;
    if (c.clientes.size) awarenessProtocol.removeAwarenessStates(this.presencia, [...c.clientes], null);
  }

  /** Todo el proyecto de la sala, para guardarlo. */
  estado(): Uint8Array {
    this.sucio = false;
    const e = Y.encodeStateAsUpdate(this.doc);
    this.tamano = e.byteLength;
    return e;
  }
}

/** El código de una sala: 9 letras y números que no se confunden (sin 0/O, 1/I/L). */
export const ALFABETO_CODIGO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const LARGO_CODIGO = 9;
export function codigoValido(codigo: string): boolean {
  return codigo.length === LARGO_CODIGO && [...codigo].every((c) => ALFABETO_CODIGO.includes(c));
}
/** El número de aparato: letras y números al azar (lo inventa el navegador). */
export function aparatoValido(aparato: string): boolean {
  return /^[a-z0-9]{16,40}$/.test(aparato);
}
/** La clave del dueño: también al azar (la guarda solo el editor de quien crea la sala). */
export function claveValida(clave: string): boolean {
  return /^[A-Za-z0-9_-]{32,64}$/.test(clave);
}
